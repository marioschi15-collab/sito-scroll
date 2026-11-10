/* Boccone — i livelli (B.livelli): costruisce, dal cast e da ciò che è registrato in questo momento, tutto quello che
   serve al mondo (50-mondo.js) per creare una partita. Solo dati: nessun disegno e nessuno stato.
   I campi della configurazione sono descritti in ARCHITETTURA.md §8. */
(() => {
'use strict';
const B = window.B;
const { limita } = B.util;

// ---------------------------------------------------------------- taratura
// Le regole di base (potenze, taglie, quanti pesci, banchi) vengono dalla versione precedente; il resto è tarato con
// strumenti/prova-mondo.mjs (tabella in ARCHITETTURA §8): non cambiare i numeri senza rifare quella prova.
const PER_AMBIENTE = B.cast.livelliPerAmbiente || 5;
/* Gli ambienti giocabili, in ordine: quelli di B.cast.aperti che esistono nel cast (se l'elenco manca, tutti). */
const APERTI = (Array.isArray(B.cast.aperti) && B.cast.aperti.length ? B.cast.aperti : B.cast.ambienti.map(a => a.id))
  .map(id => B.cast.ambienti.find(a => a.id === id)).filter(Boolean);
const TOTALE = Math.max(1, APERTI.length) * PER_AMBIENTE;
const POTENZA_BASE = 18;          // potenza minima della taglia 1
const PASSO_TAGLIA = 6;           // ogni taglia è 6 volte più forte della precedente
const LARGHEZZA_FASCIA = 2.6;     // dal più debole al più forte della stessa taglia
const QUANTI = [10, 9, 8, 7, 6];  // esemplari per taglia in un mondo di 2600 × 2600
const GENTILE = 0.85;             // al primo livello i pesci sono un po' meno
/* Quanti pesci in più o in meno per ambiente (1 = come da QUANTI). Gli ambienti con le specie più tranquille (timide,
   pigre, da agguato) ne hanno di più, quelli pieni di inseguitori di meno: così la difficoltà cresce con i livelli e
   non a salti secondo chi ci abita. Numeri trovati con prova-mondo.mjs: da rivedere se cambia il cast. */
const AFFOLLAMENTO = { laguna: 1.2, mare_aperto: 1.2, ghiacci: 0.9, rovine: 1.1, vulcano: 1.15, abisso: 0.9 };
const AREA_BASE = 2600 * 2600;
const VALORE_PESCIOLINO = [1, 1, 2, 6, 25, 100];   // quanto vale un pesciolino secondo la fascia dell'eroe
const BANCHI_BASE = 16, PESCI_PER_BANCO = 70, BANCHI_MAX = 24;
const RAGGIO_CAPO = 120, RAGGIO_CAPO_PASSO = 8;    // capobranco: 120, 128, 136, 144 (il gigante è più grosso)
const MORSI_GIGANTE = 3, POTENZA_GIGANTE = 0.8;   // potenza del gigante rispetto a quella di un capobranco
const RAGGI_PERICOLO = { medusa: 24, medusa_criniera: 34, riccio: 26, mina: 32, amo: 20, sfiatatoio: 38, stalattite: 26 };
const RAGGIO_PERICOLO = 26;
const SCIAME = 1.5, PERICOLI_MAX = 14;   // particolarità "sciame": meduse × 1,5; in tutto mai più di 14 pericoli

/* Difficoltà (decide velocità e vista dei pesci, e la velocità di capobranco e gigante): 0 al primo livello, 4 al
   secondo, sale in fretta fino al decimo (9,6) e poi piano fino a 12,6 all'ultimo. Nella versione precedente saliva
   di uno a livello fino a 12; qui i livelli sono quaranta e gli ambienti più avanti hanno già abitanti e pericoli più
   insidiosi: i livelli alti si affrontano con i potenziamenti del negozio. */
function difficolta(n) { return n <= 1 ? 0 : n <= 10 ? 4 + (n - 2) * 0.7 : 9.6 + (n - 10) * 0.1; }

// ---------------------------------------------------------------- particolarità dei livelli
const PARTICOLARITA = {
  corrente: { tipo: 'corrente', nome: 'Corrente forte', descrizione: 'L\'acqua ti spinge: nuota controcorrente.' },
  buio:     { tipo: 'buio',     nome: 'Acque buie',     descrizione: 'Si vede poco: tieni gli occhi aperti.' },
  branchi:  { tipo: 'branchi',  nome: 'Mare pescoso',   descrizione: 'Tanti banchi di pesciolini da mangiare.' },
  sciame:   { tipo: 'sciame',   nome: 'Sciame',         descrizione: 'Attento: ce ne sono molte più del solito.' },
  dorato:   { tipo: 'dorato',   nome: 'Banco dorato',   descrizione: 'I pesciolini dorati passano spesso: valgono molto.' },
};
/* Per ogni ambiente (in ordine) la particolarità dei suoi cinque livelli. Il primo livello di ogni ambiente e quello
   del gigante non ne hanno: lì la novità è l'ambiente, o il gigante. Nemmeno il secondo livello del gioco ne ha. */
const CALENDARIO = [
  [null, null, 'dorato', 'sciame', null],
  [null, 'corrente', 'dorato', 'sciame', null],
  [null, 'buio', 'branchi', 'sciame', null],
  [null, 'corrente', 'dorato', 'branchi', null],
  [null, 'sciame', 'corrente', 'dorato', null],
  [null, 'branchi', 'buio', 'corrente', null],
  [null, 'sciame', 'dorato', 'buio', null],
  [null, 'buio', 'sciame', 'corrente', null],
];

// ---------------------------------------------------------------- ambiente e specie
/* La scheda del cast dell'ambiente che occupa il posto dato (1, 2, 3…) fra quelli aperti. */
function schedaAmbiente(ordine) {
  const a = APERTI.length ? APERTI : B.cast.ambienti;
  return a[(ordine - 1) % a.length];
}

/* L'ambiente al posto dato: quello registrato; se manca, un altro registrato; se non ce n'è nessuno, la scheda del
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

/* Dalle candidate ne sceglie fino a tre, a rotazione secondo il livello; la prima compare il doppio delle altre, così
   i livelli dello stesso ambiente non si somigliano troppo. Una specie timida non è mai quella che compare il doppio
   (se ce n'è un'altra): altrimenti certi livelli sarebbero una passeggiata. */
function specieDellaFascia(lista, giro) {
  if (lista.length < 2) return lista.slice();
  const n = lista.length, scelte = [];
  for (let i = 0; i < Math.min(3, n); i++) scelte.push(lista[(giro + i) % n]);
  const decisa = scelte.findIndex(s => s.indole !== 'timido');
  if (decisa > 0) scelte.unshift(scelte.splice(decisa, 1)[0]);
  return [scelte[0], ...scelte];
}

// ---------------------------------------------------------------- pezzi della configurazione
function creaFasce(amb, K, d, densita, giro, folla = 1) {
  const pesci = pesciRegistrati(), fasce = [];
  for (let k = 0; k < K; k++) {
    const min = POTENZA_BASE * Math.pow(PASSO_TAGLIA, k);
    const specie = specieDellaFascia(candidati(pesci, amb.id, k + 1), giro);
    fasce.push({
      k, taglia: k + 1, min, max: Math.round(min * LARGHEZZA_FASCIA), r: B.cast.raggi[k],
      quanti: specie.length ? Math.round(QUANTI[k] * densita * folla) : 0,
      // con la difficoltà i pesci grossi si fanno più svelti e ci vedono più lontano; i piccoli meno, perché
      // l'inizio di ogni livello resti abbordabile (nella versione precedente: + d × 3 e + d × 4 per tutti)
      vel: 135 + k * 10 + d * (2 + 0.5 * k), senso: 160 + k * 30 + d * (2.5 + 1.25 * k),
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
    // il gigante parte un po' meno forte del capobranco, perché a ogni morso cresce: così il livello non dura il doppio
    if (def) return Object.assign(comune, { tipo: 'gigante', def, nome: def.nome, r: B.cast.raggioGigante, morsi: MORSI_GIGANTE,
      potenza: Math.round(potenza * POTENZA_GIGANTE / 1000) * 1000, attacchi: (def.attacchi || ['carica']).slice() });
  }
  const grossi = candidati(pesciRegistrati(), amb.id, 5);
  const decisi = grossi.filter(s => s.indole !== 'timido');
  const scelta = decisi.length ? decisi : grossi;
  const def = scelta.length ? scelta[giro % scelta.length] : null;
  // il capobranco carica un po' meno spesso di un gigante; al primo livello molto meno, e si accorge dell'eroe più tardi
  return Object.assign(comune, {
    tipo: 'capobranco', def, nome: def ? def.nome + ' capobranco' : 'Capobranco',
    r: RAGGIO_CAPO + RAGGIO_CAPO_PASSO * Math.min(posto - 1, 3), morsi: 1, attacchi: ['carica'],
    pausa: d < 1 ? [8.5, 11.5] : [4.5, 6.5], degna: d < 1 ? 12 : 40,
  });
}

function raggioPericolo(def) { return def.raggio || RAGGI_PERICOLO[def.id] || RAGGIO_PERICOLO; }

/* I pericoli dell'ambiente, fra quelli registrati: il primo dell'elenco è il più numeroso. */
function creaPericoli(amb, quanti, sciame) {
  const def = (amb.pericoli || []).map(id => B.specie.prendi(id)).filter(s => s && s.tipo === 'pericolo');
  if (!def.length || quanti <= 0) return [];
  const parti = def.length === 1 ? [quanti] : [Math.ceil(quanti * 0.6), Math.floor(quanti * 0.4)];
  const gruppi = def.slice(0, 2).map((s, i) => {
    const comportamento = s.comportamento || 'fermo';
    return { def: s, comportamento, r: raggioPericolo(s), quanti: Math.round(parti[i] * (sciame && comportamento === 'deriva' ? SCIAME : 1)) };
  });
  const totale = gruppi.reduce((q, g) => q + g.quanti, 0);
  if (totale > PERICOLI_MAX) for (const g of gruppi) g.quanti = Math.round(g.quanti * PERICOLI_MAX / totale);
  return gruppi.filter(p => p.quanti > 0);
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
  const nomePart = (CALENDARIO[((amb.ordine || ordine) - 1) % CALENDARIO.length] || [])[giro] || null;
  const particolarita = nomePart ? PARTICOLARITA[nomePart] : null;
  const tipo = particolarita ? particolarita.tipo : '';
  const obiettivo = creaObiettivo(amb, K, d, posto, giro);
  // pericoli: nessuno al primo livello, 5 al secondo, 7 dal quarto, poi uno in più ogni dodici livelli (fino a 10)
  const quantiPericoli = n === 1 ? 0 : Math.round((Math.min(3 + n, 7) + Math.min(3, Math.floor((n - 1) / 12))) * densita);
  return {
    n, modalita: 'avventura', ordine, posto, ambiente: amb, K, difficolta: d, seme: n,
    fasce: creaFasce(amb, K, d, densita, giro, n === 1 ? GENTILE : AFFOLLAMENTO[amb.id] || 1),
    obiettivo,
    banchi: creaBanchi(amb, densita, tipo === 'branchi'),
    pericoli: creaPericoli(amb, quantiPericoli, tipo === 'sciame'),
    pericoliMax: 0, pericoloOgni: 0,
    particolarita,
    valorePesciolino: VALORE_PESCIOLINO,
    conchiglie: Math.round(9 * amb.mondo.w / 2600),
    tempoStella: K === 4 ? 200 : obiettivo.tipo === 'gigante' ? 420 : 300,
  };
}

/* La sopravvivenza: stesso ambiente e stesse specie, nessun obiettivo; il mondo sposta le fasce verso l'alto quando
   l'eroe cresce (vedi "ottava" in 50-mondo.js) e aggiunge un pericolo ogni tanto.
   idAmbiente è facoltativo: senza, si pesca a caso fra gli ambienti aperti. */
function configSopravvivenza(idAmbiente) {
  const posto = APERTI.findIndex(a => a.id === idAmbiente);
  const amb = ambienteDiOrdine(posto >= 0 ? posto + 1 : 1 + Math.floor(Math.random() * Math.max(1, APERTI.length)));
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
    // a ogni salto di ottava: potenze × PASSO_TAGLIA, pesci più svelti e con la vista più lunga (le grandezze restano)
    ottava: { potenza: PASSO_TAGLIA, raggio: 0, vel: 8, senso: 10 },
  };
}

/* Il primo livello di un ambiente (per la mappa e per l'acquario dietro al menu); 0 se l'ambiente non è aperto. */
function primoLivelloDi(idAmbiente) { const i = APERTI.findIndex(a => a.id === idAmbiente); return i < 0 ? 0 : i * PER_AMBIENTE + 1; }

B.livelli = {
  totale: TOTALE,
  perAmbiente: PER_AMBIENTE,
  aperti: APERTI.map(a => a.id),
  primoLivelloDi,
  ambienteDi,
  config,
  configSopravvivenza,
  difficolta,
  raggioPericolo,
  PARTICOLARITA,
};
})();
