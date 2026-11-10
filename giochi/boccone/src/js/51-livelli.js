/* Boccone — i livelli (B.livelli): costruisce, dal cast e da ciò che è registrato in questo momento, tutto quello che
   serve al mondo (50-mondo.js) per creare una partita. Solo dati: nessun disegno e nessuno stato.
   I campi della configurazione sono descritti in ARCHITETTURA.md §8. */
(() => {
'use strict';
const B = window.B;
const { limita } = B.util;

// ---------------------------------------------------------------- taratura
// I numeri di questa sezione vengono dalla versione precedente (già provata): non cambiarli senza una prova con
// strumenti/prova-mondo.mjs che lo giustifichi.
const PER_AMBIENTE = B.cast.livelliPerAmbiente || 5;
const TOTALE = B.cast.ambienti.length * PER_AMBIENTE;
const POTENZA_BASE = 18;          // potenza minima della taglia 1
const PASSO_TAGLIA = 6;           // ogni taglia è 6 volte più forte della precedente
const LARGHEZZA_FASCIA = 2.6;     // dal più debole al più forte della stessa taglia
const QUANTI = [10, 9, 8, 7, 6];  // esemplari per taglia in un mondo di 2600 × 2600
const AREA_BASE = 2600 * 2600;
const VALORE_PESCIOLINO = [1, 1, 2, 6, 25, 100];   // quanto vale un pesciolino secondo la fascia dell'eroe
const BANCHI_BASE = 16, PESCI_PER_BANCO = 70, BANCHI_MAX = 24;
const RAGGIO_CAPO = 120, RAGGIO_CAPO_PASSO = 8;    // capobranco: 120, 128, 136, 144 (il gigante è più grosso)
const MORSI_GIGANTE = 3;
const RAGGI_PERICOLO = { medusa: 24, medusa_criniera: 34, riccio: 26, mina: 32, amo: 20, sfiatatoio: 38, stalattite: 26 };
const RAGGIO_PERICOLO = 26;

/* Difficoltà: 0 al primo livello, sale di uno a livello fino al tredicesimo (come nella versione precedente),
   poi molto più piano: i livelli alti si affrontano con i potenziamenti del negozio. */
function difficolta(n) { return n <= 13 ? n - 1 : 12 + (n - 13) * 0.2; }

// ---------------------------------------------------------------- particolarità dei livelli
const PARTICOLARITA = {
  corrente: { tipo: 'corrente', nome: 'Corrente forte', descrizione: 'L\'acqua ti spinge: nuota controcorrente.' },
  buio:     { tipo: 'buio',     nome: 'Acque buie',     descrizione: 'Si vede poco: tieni gli occhi aperti.' },
  branchi:  { tipo: 'branchi',  nome: 'Mare pescoso',   descrizione: 'Tanti banchi di pesciolini da mangiare.' },
  sciame:   { tipo: 'sciame',   nome: 'Sciame',         descrizione: 'Attento: ce ne sono molte più del solito.' },
  dorato:   { tipo: 'dorato',   nome: 'Banco dorato',   descrizione: 'I pesciolini dorati passano spesso: valgono molto.' },
};
/* Per ogni ambiente (in ordine) la particolarità dei suoi cinque livelli. Il primo livello di ogni ambiente e quello
   del gigante non ne hanno: lì la novità è l'ambiente, o il gigante. */
const CALENDARIO = [
  [null, 'branchi', null, 'dorato', null],
  [null, 'corrente', 'dorato', 'sciame', null],
  [null, 'buio', 'branchi', 'sciame', null],
  [null, 'corrente', 'dorato', 'branchi', null],
  [null, 'sciame', 'corrente', 'dorato', null],
  [null, 'branchi', 'buio', 'corrente', null],
  [null, 'sciame', 'dorato', 'buio', null],
  [null, 'buio', 'sciame', 'corrente', null],
];

// ---------------------------------------------------------------- ambiente e specie
function schedaAmbiente(ordine) {
  const a = B.cast.ambienti;
  return a.find(v => v.ordine === ordine) || a[(ordine - 1) % a.length];
}

/* L'ambiente di ordine dato: quello registrato; se manca, un altro registrato; se non ce n'è nessuno, la scheda del
   cast (senza disegno: il mondo funziona lo stesso, la scena resta vuota). */
function ambienteDiOrdine(ordine) {
  const registrati = B.ambienti.inOrdine();
  const scheda = schedaAmbiente(ordine);
  return registrati.find(a => a.id === scheda.id)
    || registrati[(ordine - 1) % Math.max(1, registrati.length)]
    || Object.assign({ colori: {}, banchi: [], pericoli: [] }, scheda);
}

function ordineDi(n) { return Math.ceil(limita(Math.round(n) || 1, 1, TOTALE) / PER_AMBIENTE); }
function ambienteDi(n) { return ambienteDiOrdine(ordineDi(n)); }

const postoNelCast = id => { const i = B.cast.specie.findIndex(s => s.id === id); return i < 0 ? 9999 : i; };

/* I pesci registrati, nell'ordine del cast (l'ordine di registrazione dipende dai file: così il livello è sempre uguale). */
function pesciRegistrati() { return B.specie.diTipo('pesce').sort((a, b) => postoNelCast(a.id) - postoNelCast(b.id)); }

/* Le specie candidate per una taglia in un ambiente: quelle dell'ambiente (prima quelle "di casa"); se non ce ne sono,
   quelle della stessa taglia di altri ambienti; se non ce ne sono proprio, quelle della taglia più vicina. */
function candidati(pesci, idAmbiente, taglia) {
  const diCasa = pesci.filter(s => s.taglia === taglia && s.ambienti.includes(idAmbiente));
  if (diCasa.length) return diCasa.sort((a, b) => (a.ambienti[0] === idAmbiente ? 0 : 1) - (b.ambienti[0] === idAmbiente ? 0 : 1));
  for (let scarto = 0; scarto < 5; scarto++) {
    const vicine = pesci.filter(s => Math.abs(s.taglia - taglia) === scarto);
    if (vicine.length) return vicine;
  }
  return [];
}

/* Dalle candidate ne sceglie due, a rotazione secondo il livello; la prima compare il doppio della seconda, così i
   livelli dello stesso ambiente non si somigliano troppo. */
function specieDellaFascia(lista, giro) {
  if (lista.length < 2) return lista.slice();
  const a = lista[giro % lista.length], b = lista[(giro + 1) % lista.length];
  return [a, a, b];
}

// ---------------------------------------------------------------- pezzi della configurazione
function creaFasce(amb, K, d, densita, giro, veloce = 0) {
  const pesci = pesciRegistrati(), fasce = [];
  for (let k = 0; k < K; k++) {
    const min = POTENZA_BASE * Math.pow(PASSO_TAGLIA, k);
    const specie = specieDellaFascia(candidati(pesci, amb.id, k + 1), giro);
    fasce.push({
      k, taglia: k + 1, min, max: Math.round(min * LARGHEZZA_FASCIA), r: B.cast.raggi[k],
      quanti: specie.length ? Math.round((QUANTI[k] + (d > 3 ? 1 : 0)) * densita) : 0,
      vel: 135 + k * 10 + d * 3 + veloce, senso: 160 + k * 30 + d * 4,
      specie,
    });
  }
  return fasce;
}

/* L'obiettivo del livello: il gigante dell'ambiente (ultimo livello dell'ambiente) oppure il capobranco, un esemplare
   enorme con la corona di una specie di taglia 5 (di preferenza una che non sia timida). */
function creaObiettivo(amb, K, d, posto, giro) {
  const potenza = Math.round(POTENZA_BASE * Math.pow(PASSO_TAGLIA, K) * 2.5 / 1000) * 1000;
  const comune = { k: K, potenza, vel: 126 + d * 4, senso: 470 };
  if (posto === PER_AMBIENTE) {
    const giganti = B.specie.diTipo('gigante').sort((a, b) => postoNelCast(a.id) - postoNelCast(b.id));
    const def = giganti.find(g => g.id === amb.gigante) || giganti[giro % Math.max(1, giganti.length)];
    if (def) return Object.assign(comune, { tipo: 'gigante', def, nome: def.nome, r: B.cast.raggioGigante, morsi: MORSI_GIGANTE, attacchi: (def.attacchi || ['carica']).slice() });
  }
  const grossi = candidati(pesciRegistrati(), amb.id, 5);
  const decisi = grossi.filter(s => s.indole !== 'timido');
  const scelta = decisi.length ? decisi : grossi;
  const def = scelta.length ? scelta[giro % scelta.length] : null;
  return Object.assign(comune, {
    tipo: 'capobranco', def, nome: def ? def.nome + ' capobranco' : 'Capobranco',
    r: RAGGIO_CAPO + RAGGIO_CAPO_PASSO * Math.min(posto - 1, 3), morsi: 1, attacchi: ['carica'],
  });
}

function raggioPericolo(def) { return def.raggio || RAGGI_PERICOLO[def.id] || RAGGIO_PERICOLO; }

/* I pericoli dell'ambiente, fra quelli registrati: il primo dell'elenco è il più numeroso. */
function creaPericoli(amb, quanti, sciame) {
  const def = (amb.pericoli || []).map(id => B.specie.prendi(id)).filter(s => s && s.tipo === 'pericolo');
  if (!def.length || quanti <= 0) return [];
  const parti = def.length === 1 ? [quanti] : [Math.ceil(quanti * 0.6), Math.floor(quanti * 0.4)];
  return def.slice(0, 2).map((s, i) => {
    const comportamento = s.comportamento || 'fermo';
    return { def: s, comportamento, r: raggioPericolo(s), quanti: Math.round(parti[i] * (sciame && comportamento === 'deriva' ? 1.8 : 1)) };
  }).filter(p => p.quanti > 0);
}

function creaBanchi(amb, densita, tanti) {
  const specie = (amb.banchi || []).map(id => B.specie.prendi(id)).filter(s => s && s.tipo === 'banco');
  const dorato = B.specie.prendi('dorato');
  return {
    specie, perBanco: PESCI_PER_BANCO,
    quanti: specie.length ? Math.min(BANCHI_MAX, Math.round(BANCHI_BASE * densita * (tanti ? 1.4 : 1))) : 0,
    dorato: dorato && dorato.tipo === 'banco' ? dorato : null,
  };
}

const densitaDi = amb => limita(amb.mondo.w * amb.mondo.h / AREA_BASE, 0.9, 1.35);

// ---------------------------------------------------------------- B.livelli
/* Tutto ciò che serve per creare il livello n dell'avventura (1..40). Usa solo ciò che è registrato adesso. */
function config(n) {
  n = limita(Math.round(n) || 1, 1, TOTALE);
  const ordine = ordineDi(n), posto = n - (ordine - 1) * PER_AMBIENTE, giro = posto - 1;
  const amb = ambienteDiOrdine(ordine), d = difficolta(n), K = n === 1 ? 4 : 5, densita = densitaDi(amb);
  const nomePart = (CALENDARIO[(ordine - 1) % CALENDARIO.length] || [])[giro] || null;
  const particolarita = nomePart ? PARTICOLARITA[nomePart] : null;
  const tipo = particolarita ? particolarita.tipo : '';
  const obiettivo = creaObiettivo(amb, K, d, posto, giro);
  const quantiPericoli = n === 1 ? 0 : Math.round((Math.min(1 + n, 8) + Math.min(4, Math.floor((n - 1) / 10))) * densita);
  return {
    n, modalita: 'avventura', ordine, posto, ambiente: amb, K, difficolta: d, seme: n,
    fasce: creaFasce(amb, K, d, densita, giro),
    obiettivo,
    banchi: creaBanchi(amb, densita, tipo === 'branchi'),
    pericoli: creaPericoli(amb, quantiPericoli, tipo === 'sciame'),
    pericoliMax: 0, pericoloOgni: 0,
    particolarita,
    valorePesciolino: VALORE_PESCIOLINO,
    conchiglie: Math.round(9 * amb.mondo.w / 2600),
    tempoStella: K === 4 ? 200 : obiettivo.tipo === 'gigante' ? 360 : 300,
  };
}

/* La sopravvivenza: stesso ambiente e stesse specie, nessun obiettivo; il mondo sposta le fasce verso l'alto quando
   l'eroe cresce (vedi "ottava" in 50-mondo.js) e aggiunge un pericolo ogni tanto.
   idAmbiente è facoltativo: senza, si pesca a caso fra gli ambienti registrati. */
function configSopravvivenza(idAmbiente) {
  const registrati = B.ambienti.inOrdine();
  const amb = (idAmbiente && (B.ambienti.prendi(idAmbiente) || ambienteDiOrdine((B.cast.ambienti.find(a => a.id === idAmbiente) || {}).ordine || 1)))
    || (registrati.length ? registrati[Math.floor(Math.random() * registrati.length)] : ambienteDiOrdine(1));
  const d = 3, K = 5, densita = densitaDi(amb), giro = Math.floor(Math.random() * 5);
  return {
    n: 0, modalita: 'sopravvivenza', ordine: amb.ordine || 1, posto: 0, ambiente: amb, K, difficolta: d, seme: 1000 + (amb.ordine || 1),
    fasce: creaFasce(amb, K, d, densita, giro),
    obiettivo: null,
    banchi: creaBanchi(amb, densita, false),
    pericoli: creaPericoli(amb, Math.round(3 * densita), false),
    pericoliMax: 14, pericoloOgni: 40,
    particolarita: null,
    valorePesciolino: VALORE_PESCIOLINO,
    conchiglie: Math.round(9 * amb.mondo.w / 2600),
    tempoStella: 0,
    // a ogni salto di ottava: potenze × PASSO_TAGLIA, pesci un po' più grossi e più svelti (come cresce l'eroe)
    ottava: { potenza: PASSO_TAGLIA, raggio: 9.8, vel: 13, senso: 12 },
  };
}

B.livelli = {
  totale: TOTALE,
  perAmbiente: PER_AMBIENTE,
  ambienteDi,
  config,
  configSopravvivenza,
  difficolta,
  raggioPericolo,
  PARTICOLARITA,
};
})();
