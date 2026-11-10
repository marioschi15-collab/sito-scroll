/* Boccone — progressi: l'unica porta verso il salvataggio (vedi ARCHITETTURA.md §6).
   Tiene perle, potenziamenti, eroi, livelli e stelle, acquario, statistiche, traguardi, regalo del giorno e impostazioni.
   Ascolta gli eventi del gioco e aggiorna da solo statistiche, acquario e traguardi.

   Che cosa c'è nel salvataggio (B.progressi.stato, chiave "boccone-salvataggio-3"):
     versione        3
     perle           quante perle ho adesso
     potenziamenti   { id: livello }
     eroe, eroi      l'eroe scelto e { id: true } per quelli comprati
     livelloMax      il livello più avanti che si può giocare (totale + 1 quando l'avventura è finita)
     stelle          { numeroLivello: 1..3 }
     record          { potenza, tempo } della sopravvivenza (i due massimi, anche di partite diverse)
     acquario        { idSpecie: { visti, mangiati } }
     statistiche     i contatori elencati in statistichePredefinite()
     traguardi       { id: { fatto, riscosso } } (solo quelli raggiunti)
     regalo          { ultimo: 'AAAA-MM-GG', serie }
     impostazioni    { suoni, musica, vibrazione, qualita, mano }
     tutorial        true quando i consigli della prima partita sono stati visti
     importatoV2     true quando i dati della versione precedente sono già stati presi (o non c'erano)

   Il file si può caricare anche senza pagina (niente document, niente localStorage): in quel caso resta tutto in memoria. */
(() => {
'use strict';
const B = window.B;

// ---------------------------------------------------------------- costanti
const CHIAVE = 'boccone-salvataggio-3', CHIAVE_V2 = 'boccone-salvataggio', VERSIONE = 3;
const PAUSA_SCRITTURA = 2000;            // millisecondi: durante la partita non si scrive più spesso di così
const PERLE_MAX = 99999999;
const ACQUARIO_MAX = 400;                // tetto alle voci dell'acquario (le specie vere sono meno di cento)
const LIVELLO_SOPRAVVIVENZA = 5;         // superato questo livello si apre la sopravvivenza
const PREMI_REGALO = [20, 30, 40, 50, 60, 80, 120];
const TIPI_AIUTO = ['x2', 'x5', 'calamita', 'scudo', 'perla', 'cuore'];
const TIPI_SPECIE = ['pesce', 'gigante', 'banco', 'pericolo'];
const ID_VALIDO = /^[a-z][a-z0-9_]{0,39}$/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

const cast = B.cast || {};
const AMBIENTI = (cast.ambienti || []).slice().sort((a, b) => (a.ordine || 99) - (b.ordine || 99));
const EROI = cast.eroi || [];
/* I livelli dell'avventura sono quelli degli ambienti giocabili (B.cast.aperti); se l'elenco manca, di tutti. */
const APERTI = Array.isArray(cast.aperti) && cast.aperti.length ? cast.aperti.filter(id => AMBIENTI.some(a => a.id === id)) : AMBIENTI.map(a => a.id);
const TOTALE_LIVELLI = Math.max(1, APERTI.length * (cast.livelliPerAmbiente || 5));
const EROE_BASE = (EROI.find(e => e.id === 'pallino') || EROI.find(e => !(e.costo > 0)) || { id: 'pallino' }).id;

// ---------------------------------------------------------------- piccoli attrezzi
const ha = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const eOggetto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
/* Intero non negativo: tutto ciò che non è un numero sensato diventa 0. */
const conta = (v, massimo = Number.MAX_SAFE_INTEGER) => typeof v === 'number' && v > 0 ? Math.min(Math.floor(v), massimo) : 0;
/* Misura non negativa, anche con la virgola (tempi, potenze). */
const misura = v => typeof v === 'number' && v > 0 && v < Infinity ? v : 0;
const pulito = x => Math.round(x * 10000) / 10000;
/* Somma che non esce mai dai numeri interi sicuri: così ciò che si salva si rilegge sempre uguale. */
const somma = (a, b) => Math.min(Number.MAX_SAFE_INTEGER, a + b);

function dataValida(s) {
  const m = typeof s === 'string' ? DATA.exec(s) : null;
  return !!m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31;
}
/* Giorni di calendario da una data all'altra (stringhe AAAA-MM-GG); null se una delle due non è una data. */
function giorniTra(da, a) {
  if (!dataValida(da) || !dataValida(a)) return null;
  const x = DATA.exec(da), y = DATA.exec(a);
  return Math.round((Date.UTC(+y[1], +y[2] - 1, +y[3]) - Date.UTC(+x[1], +x[2] - 1, +x[3])) / 86400000);
}

// ---------------------------------------------------------------- potenziamenti
const percento = passo => liv => (passo < 0 ? '−' : '+') + Math.round(Math.abs(passo) * liv * 100) + '%';
const secondi = passo => liv => '+' + String(Math.round(passo * liv * 10) / 10).replace('.', ',') + ' s';
/* effetto: il campo di effetti() che cambia; passo: di quanto, a ogni livello; beneficio(liv): la scritta per il negozio. */
const POTENZIAMENTI = [
  { id: 'pinne',    nome: 'Pinne veloci',       descrizione: 'Nuoti più in fretta.',                  costi: [40, 90, 160, 260, 400],  effetto: 'velocita',       passo: 0.06,  beneficio: percento(0.06) },
  { id: 'scatto',   nome: 'Scatto pronto',      descrizione: 'Lo scatto si ricarica prima.',          costi: [40, 90, 160, 260, 400],  effetto: 'ricaricaScatto', passo: -0.12, beneficio: percento(-0.12) },
  { id: 'boccone',  nome: 'Boccone largo',      descrizione: 'Risucchi i pesciolini da più lontano.', costi: [50, 110, 190, 300, 450], effetto: 'risucchio',      passo: 0.30,  beneficio: percento(0.30) },
  { id: 'generoso', nome: 'Mare generoso',      descrizione: 'Compaiono più bolle con gli aiuti.',    costi: [60, 130, 220],           effetto: 'bolle',          passo: 0.17,  beneficio: percento(0.17) },
  { id: 'cuori',    nome: 'Cuore in più',       descrizione: 'Parti con un cuore in più.',            costi: [200, 500],               effetto: 'cuori',          passo: 1,     beneficio: liv => '+' + liv },
  { id: 'calamita', nome: 'Calamita potente',   descrizione: 'La calamita dura di più.',              costi: [80, 170, 300],           effetto: 'durataCalamita', passo: 2,     beneficio: secondi(2) },
  { id: 'frenesia', nome: 'Frenesia lunga',     descrizione: 'La frenesia dura di più.',              costi: [100, 220, 380],          effetto: 'durataFrenesia', passo: 1.5,   beneficio: secondi(1.5) },
  { id: 'fiuto',    nome: 'Fiuto per le perle', descrizione: 'Trovi più perle.',                      costi: [120, 260, 480],          effetto: 'perle',          passo: 0.15,  beneficio: percento(0.15) },
  { id: 'scudo',    nome: 'Scudo di partenza',  descrizione: 'Cominci ogni partita con lo scudo.',    costi: [350],                    effetto: 'scudoIniziale',  passo: 1,     beneficio: liv => liv > 0 ? 'pronto' : '' },
];
const POT = {};
for (const p of POTENZIAMENTI) POT[p.id] = p;

const MOLTIPLICATORI = ['velocita', 'ricaricaScatto', 'durataScatto', 'risucchio', 'bolle', 'perle', 'morso'];
const AGGIUNTE = ['cuori', 'durataCalamita', 'durataFrenesia', 'invulnerabile'];

// ---------------------------------------------------------------- impostazioni
const scelta = (predefinito, ammessi) => ({ predefinito, valido: v => ammessi.includes(v) });
const IMPOSTAZIONI = {
  suoni: scelta(true, [true, false]),
  musica: scelta(true, [true, false]),
  vibrazione: scelta(true, [true, false]),
  qualita: scelta('auto', ['auto', 'alta', 'media', 'bassa']),
  mano: scelta('destra', ['destra', 'sinistra']),
};

// ---------------------------------------------------------------- lo stato e i suoi valori predefiniti
const S = {};                            // sempre lo stesso oggetto, anche dopo azzera(): chi se lo tiene da parte non resta indietro
let P = null;                            // B.progressi (definito più sotto)

function statistichePredefinite() {
  return {
    partite: 0, partiteSopravvivenza: 0, vittorie: 0, sconfitte: 0, vittorieSenzaColpi: 0,
    pesciMangiati: 0, pesciolini: 0, dorati: 0,
    perleTotali: 0, perleSpese: 0,
    colpiPresi: 0, frenesie: 0, scatti: 0, crescite: 0,
    aiuti: { x2: 0, x5: 0, calamita: 0, scudo: 0, perla: 0, cuore: 0, altro: 0 },
    gigantiSconfitti: 0, morsiGiganti: 0,
    potenzaMassima: 0, tempoGioco: 0, stelle: 0,
    regali: 0, serieMassima: 0,
  };
}

function predefinito() {
  const potenziamenti = {}, eroi = {}, impostazioni = {};
  for (const p of POTENZIAMENTI) potenziamenti[p.id] = 0;
  eroi[EROE_BASE] = true;
  for (const k of Object.keys(IMPOSTAZIONI)) impostazioni[k] = IMPOSTAZIONI[k].predefinito;
  return {
    versione: VERSIONE, perle: 0, potenziamenti, eroe: EROE_BASE, eroi,
    livelloMax: 1, stelle: {}, record: { potenza: 0, tempo: 0 },
    acquario: {}, statistiche: statistichePredefinite(), traguardi: {},
    regalo: { ultimo: '', serie: 0 }, impostazioni, tutorial: false, importatoV2: false,
  };
}

const schedaEroe = id => EROI.find(e => e.id === id) || null;
function possiede(stato, id) {
  const e = schedaEroe(id);
  return !!e && (id === EROE_BASE || !(e.costo > 0) || (ha(stato.eroi, id) && stato.eroi[id] === true));
}
function sommaStelle(stato) { let n = 0; for (const k of Object.keys(stato.stelle)) n += stato.stelle[k]; return n; }
function livelloValido(n) { return Number.isInteger(n) && n >= 1 && n <= TOTALE_LIVELLI; }

/* Da ciò che si è letto (qualunque cosa sia) a uno stato sano: i campi rovinati tornano ai valori predefiniti,
   quelli buoni restano, quelli che questa versione non conosce si conservano così come sono. */
function ripulisci(letto) {
  const s = predefinito();
  if (!eOggetto(letto)) return s;
  for (const k of Object.keys(letto)) if (!ha(s, k)) s[k] = letto[k];
  s.perle = conta(letto.perle, PERLE_MAX);

  if (eOggetto(letto.potenziamenti)) for (const k of Object.keys(letto.potenziamenti)) {
    const v = conta(letto.potenziamenti[k], 99);
    if (ha(POT, k)) s.potenziamenti[k] = Math.min(v, POT[k].costi.length); else if (ID_VALIDO.test(k)) s.potenziamenti[k] = v;
  }

  if (eOggetto(letto.eroi)) for (const k of Object.keys(letto.eroi)) if (ID_VALIDO.test(k) && letto.eroi[k] === true) s.eroi[k] = true;
  if (typeof letto.eroe === 'string' && possiede(s, letto.eroe)) s.eroe = letto.eroe;

  if (eOggetto(letto.stelle)) for (const k of Object.keys(letto.stelle)) {
    const n = Number(k), v = conta(letto.stelle[k], 3);
    if (livelloValido(n) && v > 0) s.stelle[n] = v;
  }
  s.livelloMax = Math.min(conta(letto.livelloMax) || 1, TOTALE_LIVELLI + 1);
  for (const k of Object.keys(s.stelle)) s.livelloMax = Math.max(s.livelloMax, Number(k) + 1);   // un livello con le stelle è superato

  if (eOggetto(letto.record)) s.record = { potenza: Math.round(misura(letto.record.potenza)), tempo: pulito(misura(letto.record.tempo)) };
  else if (typeof letto.record === 'number') s.record.potenza = Math.round(misura(letto.record));

  if (eOggetto(letto.acquario)) {
    let voci = 0;
    for (const k of Object.keys(letto.acquario)) {
      const v = letto.acquario[k];
      if (voci >= ACQUARIO_MAX || !ID_VALIDO.test(k) || !eOggetto(v)) continue;
      const visti = conta(v.visti), mangiati = conta(v.mangiati);
      if (!visti && !mangiati) continue;
      s.acquario[k] = { visti: Math.max(visti, 1), mangiati }; voci++;
    }
  }

  if (eOggetto(letto.statistiche)) {
    const da = letto.statistiche, a = s.statistiche;
    for (const k of Object.keys(da)) {
      if (k === 'aiuti') { if (eOggetto(da.aiuti)) for (const t of Object.keys(da.aiuti)) if (ha(a.aiuti, t)) a.aiuti[t] = conta(da.aiuti[t]); }
      else if (!ha(a, k)) a[k] = da[k];
      else if (k === 'tempoGioco') a[k] = pulito(misura(da[k]));
      else a[k] = conta(da[k]);
    }
  }
  s.statistiche.stelle = sommaStelle(s);

  if (eOggetto(letto.traguardi)) for (const k of Object.keys(letto.traguardi)) {
    const v = letto.traguardi[k];
    if (ID_VALIDO.test(k) && eOggetto(v) && (v.fatto === true || v.riscosso === true)) s.traguardi[k] = { fatto: true, riscosso: v.riscosso === true };
  }

  if (eOggetto(letto.regalo) && dataValida(letto.regalo.ultimo)) s.regalo = { ultimo: letto.regalo.ultimo, serie: Math.max(1, conta(letto.regalo.serie, 99999)) };

  if (eOggetto(letto.impostazioni)) for (const k of Object.keys(letto.impostazioni)) {
    const v = letto.impostazioni[k];
    if (!ha(IMPOSTAZIONI, k)) s.impostazioni[k] = v; else if (IMPOSTAZIONI[k].valido(v)) s.impostazioni[k] = v;
  }
  s.tutorial = letto.tutorial === true;
  s.importatoV2 = letto.importatoV2 === true;
  return s;
}

function sostituisci(nuovo) { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, nuovo); }

// ---------------------------------------------------------------- lettura e scrittura
function archivio() { try { return window.localStorage || null; } catch (e) { return null; } }
function leggi(chiave) {
  try {
    const a = archivio(); if (!a) return null;
    const testo = a.getItem(chiave);
    if (typeof testo !== 'string' || !testo) return null;
    const v = JSON.parse(testo);
    return eOggetto(v) ? v : null;
  } catch (e) { return null; }
}

let sporco = false, ultimaScrittura = -Infinity, sveglia = null;

function scrivi() {
  if (sveglia !== null) { try { if (typeof clearTimeout === 'function') clearTimeout(sveglia); } catch (e) {} sveglia = null; }
  sporco = false; ultimaScrittura = P._adesso();
  try { const a = archivio(); if (!a) return false; a.setItem(CHIAVE, JSON.stringify(S)); return true; } catch (e) { return false; }
}
function scriviSeServe() { if (sporco) scrivi(); }
/* subito: scrive ora. Altrimenti scrive al massimo una volta ogni PAUSA_SCRITTURA (e l'ultima modifica non va persa). */
function daScrivere(subito) {
  sporco = true;
  if (subito) { scrivi(); return; }
  const attesa = PAUSA_SCRITTURA - (P._adesso() - ultimaScrittura);
  /* attesa più lunga della pausa vuol dire che l'orologio è tornato indietro: si scrive, e si riparte da adesso. */
  if (!(attesa > 0) || attesa > PAUSA_SCRITTURA) { scrivi(); return; }
  if (sveglia === null && typeof setTimeout === 'function') {
    try { sveglia = setTimeout(() => { sveglia = null; scriviSeServe(); }, attesa); } catch (e) { sveglia = null; }
  }
}

// ---------------------------------------------------------------- catalogo delle specie e conti derivati
/* Il catalogo dice quali specie esistono in questa costruzione del gioco: quelle registrate in B.specie (se ce n'è
   almeno una), altrimenti quelle del cast. Così i traguardi "tutte le specie" restano raggiungibili anche con una parte
   sola dei contenuti. "acquario" sono pesci e giganti: le specie che hanno una scheda con la descrizione. */
let cat = null, der = null;
function catalogo() {
  if (cat) return cat;
  let schede = cast.specie || [];
  try { const registrate = B.specie && typeof B.specie.tutte === 'function' ? B.specie.tutte() : []; if (registrate.length) schede = registrate; } catch (e) {}
  const c = { schede: Object.create(null), pesce: [], gigante: [], banco: [], pericolo: [], acquario: [], perAmbiente: Object.create(null) };
  for (const a of AMBIENTI) c.perAmbiente[a.id] = [];
  for (const s of schede) {
    if (!s || typeof s.id !== 'string' || c.schede[s.id]) continue;
    const tipo = TIPI_SPECIE.includes(s.tipo) ? s.tipo : 'pesce';
    c.schede[s.id] = { id: s.id, nome: s.nome || s.id, tipo };
    const abitante = tipo === 'pesce' || tipo === 'gigante';
    /* Pesci e giganti che vivono solo in ambienti ancora "in arrivo" non si contano: non si possono incontrare. */
    if (abitante && Array.isArray(s.ambienti) && s.ambienti.length && !s.ambienti.some(a => APERTI.includes(a))) continue;
    c[tipo].push(s.id);
    if (!abitante) continue;
    c.acquario.push(s.id);
    for (const a of s.ambienti || []) if (c.perAmbiente[a]) c.perAmbiente[a].push(s.id);
  }
  return cat = c;
}
function tipoDi(id) { const s = typeof id === 'string' ? catalogo().schede[id] : null; return s ? s.tipo : null; }
function elenco(gruppo) {
  const c = catalogo();
  if (gruppo === undefined || gruppo === null || gruppo === 'acquario') return c.acquario;
  if (gruppo === 'tutti') return [...c.pesce, ...c.gigante, ...c.banco, ...c.pericolo];
  if (TIPI_SPECIE.includes(gruppo)) return c[gruppo];
  return typeof gruppo === 'string' && c.perAmbiente[gruppo] ? c.perAmbiente[gruppo] : [];
}
const vista = id => ha(S.acquario, id) && (S.acquario[id].visti > 0 || S.acquario[id].mangiati > 0);
const assaggiata = id => ha(S.acquario, id) && S.acquario[id].mangiati > 0;
function quante(ids, prova) { let n = 0; for (const id of ids) if (prova(id)) n++; return n; }

/* Conti che servono ai traguardi: si rifanno solo quando cambia qualcosa che li tocca (una specie nuova, una stella). */
function derivati() {
  if (der) return der;
  const c = catalogo(), d = { scoperte: quante(c.acquario, vista), assaggiate: quante(c.acquario, assaggiata), giganti: quante(c.gigante, assaggiata), ambienti: Object.create(null), treStelle: 0 };
  for (const a of AMBIENTI) d.ambienti[a.id] = quante(c.perAmbiente[a.id], vista);
  for (const k of Object.keys(S.stelle)) if (S.stelle[k] >= 3) d.treStelle++;
  return der = d;
}

// ---------------------------------------------------------------- traguardi
const TRAGUARDI = [], misure = new Map(), perId = new Map();
/* obiettivo può essere un numero o una funzione (quando dipende da quante specie o giganti ci sono nel gioco). */
function nuovoTraguardo(gruppo, id, nome, descrizione, obiettivo, premio, valore) {
  const t = { id, gruppo, nome, descrizione, premio };
  if (typeof obiettivo === 'function') Object.defineProperty(t, 'obiettivo', { enumerable: true, get: () => Math.max(1, obiettivo()) });
  else t.obiettivo = obiettivo;
  TRAGUARDI.push(t); misure.set(id, valore); perId.set(id, t);
}
const stat = () => S.statistiche;
const superati = () => Math.min(TOTALE_LIVELLI, S.livelloMax - 1);
const aiutiPresi = () => { const a = stat().aiuti; let n = a.altro || 0; for (const k of TIPI_AIUTO) n += a[k]; return n; };
const aiutiProvati = () => { const a = stat().aiuti; let n = 0; for (const k of TIPI_AIUTO) if (a[k] > 0) n++; return n; };
const livelliComprati = () => { let n = 0; for (const p of POTENZIAMENTI) n += S.potenziamenti[p.id]; return n; };
const alMassimo = () => { let n = 0; for (const p of POTENZIAMENTI) if (S.potenziamenti[p.id] >= p.costi.length) n++; return n; };
/* Gli eroi da sbloccare sono quelli che costano: quello di partenza non conta (così da zero i traguardi segnano 0). */
const EROI_DA_SBLOCCARE = EROI.filter(e => e.id !== EROE_BASE && e.costo > 0);
const eroiSbloccati = () => { let n = 0; for (const e of EROI_DA_SBLOCCARE) if (possiede(S, e.id)) n++; return n; };
const fino = n => Math.min(n, TOTALE_LIVELLI), finoStelle = n => Math.min(n, TOTALE_LIVELLI * 3);

(() => {
  const T = nuovoTraguardo;
  let g = 'Primi passi';
  T(g, 'primo_boccone', 'Primo boccone', 'Mangia il tuo primo pesce.', 1, 10, () => stat().pesciMangiati);
  T(g, 'spuntino', 'Spuntino', 'Mangia 100 pesciolini dei banchi.', 100, 10, () => stat().pesciolini);
  T(g, 'colpo_di_coda', 'Colpo di coda', 'Usa lo scatto 10 volte.', 10, 10, () => stat().scatti);
  T(g, 'bolla_fortunata', 'Bolla fortunata', 'Prendi 5 bolle con gli aiuti.', 5, 10, aiutiPresi);
  T(g, 'fame_da_lupi', 'Fame da lupi', 'Fai partire la frenesia per la prima volta.', 1, 15, () => stat().frenesie);
  T(g, 'cresciutello', 'Cresciutello', 'Arriva a una potenza di 1.000 in una partita.', 1000, 10, () => stat().potenzaMassima);
  T(g, 'si_parte', 'Si parte!', 'Supera il primo livello.', 1, 15, superati);
  T(g, 'buongiorno_mare', 'Buongiorno, mare!', 'Ritira il tuo primo regalo del giorno.', 1, 10, () => stat().regali);

  g = 'Grandi mangiate';
  T(g, 'buona_forchetta', 'Buona forchetta', 'Mangia 100 pesci.', 100, 20, () => stat().pesciMangiati);
  T(g, 'pozzo_senza_fondo', 'Pozzo senza fondo', 'Mangia 1.000 pesci.', 1000, 80, () => stat().pesciMangiati);
  T(g, 'terrore_dei_mari', 'Terrore dei sette mari', 'Mangia 5.000 pesci.', 5000, 250, () => stat().pesciMangiati);
  T(g, 'aspirapolvere', 'Aspirapolvere', 'Mangia 2.000 pesciolini dei banchi.', 2000, 25, () => stat().pesciolini);
  T(g, 'fame_da_balena', 'Fame da balena', 'Mangia 20.000 pesciolini dei banchi.', 20000, 120, () => stat().pesciolini);
  T(g, 'cio_che_luccica', 'Tutto ciò che luccica', 'Mangia 10 pesciolini dorati.', 10, 25, () => stat().dorati);
  T(g, 'pancia_doro', "Pancia d'oro", 'Mangia 150 pesciolini dorati.', 150, 120, () => stat().dorati);

  g = 'Avventura';
  T(g, 'vento_in_poppa', 'Vento in poppa', 'Supera ' + fino(10) + ' livelli.', fino(10), 50, superati);
  T(g, 'giro_di_boa', 'Giro di boa', 'Supera ' + fino(20) + ' livelli.', fino(20), 100, superati);
  T(g, 're_degli_oceani', 'Re degli oceani', "Supera tutti i livelli dell'avventura.", TOTALE_LIVELLI, 400, superati);
  T(g, 'piccolo_ma_tosto', 'Piccolo ma tosto', 'Sconfiggi il tuo primo gigante.', 1, 30, () => stat().gigantiSconfitti);
  T(g, 'domatore_di_giganti', 'Domatore di giganti', 'Sconfiggi 4 giganti diversi.', 4, 80, () => derivati().giganti);
  T(g, 'il_piu_grosso', 'Il più grosso sei tu', 'Sconfiggi tutti i giganti.', () => catalogo().gigante.length, 250, () => derivati().giganti);
  T(g, 'mordi_e_fuggi', 'Mordi e fuggi', 'Dai 30 morsi ai giganti.', 30, 60, () => stat().morsiGiganti);

  g = 'Stelle';
  T(g, 'da_manuale', 'Da manuale', 'Prendi 3 stelle in un livello.', 1, 20, () => derivati().treStelle);
  T(g, 'perfezionista', 'Perfezionista', 'Prendi 3 stelle in ' + fino(10) + ' livelli.', fino(10), 100, () => derivati().treStelle);
  T(g, 'stella_marina', 'Stella marina', 'Raccogli ' + finoStelle(10) + ' stelle.', finoStelle(10), 25, () => stat().stelle);
  T(g, 'costellazione', 'Costellazione', 'Raccogli ' + finoStelle(40) + ' stelle.', finoStelle(40), 80, () => stat().stelle);
  T(g, 'cielo_stellato', 'Cielo stellato', 'Raccogli ' + finoStelle(80) + ' stelle.', finoStelle(80), 160, () => stat().stelle);
  T(g, 'firmamento', 'Firmamento', "Raccogli tutte le stelle dell'avventura.", TOTALE_LIVELLI * 3, 400, () => stat().stelle);

  g = 'Bravura';
  T(g, 'nemmeno_un_graffio', 'Nemmeno un graffio', 'Vinci un livello senza perdere cuori.', 1, 20, () => stat().vittorieSenzaColpi);
  T(g, 'come_un_anguilla', "Sgusciante come un'anguilla", 'Vinci 15 livelli senza perdere cuori.', 15, 120, () => stat().vittorieSenzaColpi);
  T(g, 'sempre_affamato', 'Sempre affamato', 'Fai partire la frenesia 25 volte.', 25, 40, () => stat().frenesie);
  T(g, 'buco_nello_stomaco', 'Buco nello stomaco', 'Fai partire la frenesia 150 volte.', 150, 120, () => stat().frenesie);
  T(g, 'centometrista', 'Centometrista', 'Usa lo scatto 200 volte.', 200, 40, () => stat().scatti);
  T(g, 'peso_massimo', 'Peso massimo', 'Arriva a una potenza di 100.000 in una partita.', 100000, 50, () => stat().potenzaMassima);
  T(g, 'leviatano', 'Leviatano', 'Arriva a una potenza di 1.000.000 in una partita.', 1000000, 150, () => stat().potenzaMassima);
  T(g, 'osso_duro', 'Osso duro', 'Resisti 3 minuti in sopravvivenza.', 3, 50, () => Math.floor(S.record.tempo / 60));
  T(g, 'irriducibile', 'Irriducibile', 'Resisti 10 minuti in sopravvivenza.', 10, 150, () => Math.floor(S.record.tempo / 60));
  T(g, 'testa_dura', 'Testa dura', 'Prendi 50 colpi… e continua a nuotare.', 50, 25, () => stat().colpiPresi);

  g = 'Bolle';
  T(g, 'bollicine', 'Bollicine', 'Prendi 100 bolle con gli aiuti.', 100, 50, aiutiPresi);
  T(g, 'di_tutto_un_po', "Di tutto un po'", 'Prova tutti e sei gli aiuti delle bolle.', TIPI_AIUTO.length, 25, aiutiProvati);
  T(g, 'polo_di_attrazione', "Polo d'attrazione", 'Prendi 25 calamite.', 25, 30, () => stat().aiuti.calamita);
  T(g, 'a_prova_di_morso', 'A prova di morso', 'Prendi 20 scudi.', 20, 30, () => stat().aiuti.scudo);
  T(g, 'tabellina_del_cinque', 'Tabellina del cinque', 'Prendi 15 bolle ×5.', 15, 30, () => stat().aiuti.x5);

  g = 'Perle e negozio';
  T(g, 'primo_gruzzolo', 'Primo gruzzolo', 'Guadagna 100 perle in tutto.', 100, 15, () => stat().perleTotali);
  T(g, 'forziere_pieno', 'Forziere pieno', 'Guadagna 1.500 perle in tutto.', 1500, 80, () => stat().perleTotali);
  T(g, 'tesoro_sommerso', 'Tesoro sommerso', 'Guadagna 6.000 perle in tutto.', 6000, 250, () => stat().perleTotali);
  T(g, 'primo_acquisto', 'Primo acquisto', 'Compra un potenziamento nel negozio.', 1, 15, livelliComprati);
  T(g, 'ben_attrezzato', 'Ben attrezzato', 'Compra 10 livelli di potenziamenti.', 10, 60, livelliComprati);
  T(g, 'tirato_a_lucido', 'Tirato a lucido', 'Porta un potenziamento al massimo.', 1, 50, alMassimo);
  T(g, 'non_ti_manca_niente', 'Non ti manca niente', 'Porta tutti i potenziamenti al massimo.', POTENZIAMENTI.length, 300, alMassimo);
  T(g, 'un_nuovo_amico', 'Un nuovo amico', 'Sblocca un altro eroe.', 1, 30, eroiSbloccati);
  T(g, 'tutta_la_banda', 'Tutta la banda', 'Sblocca tutti gli eroi.', Math.max(1, EROI_DA_SBLOCCARE.length), 250, eroiSbloccati);

  g = 'Acquario';
  T(g, 'curiosone', 'Curiosone', 'Scopri 10 specie.', 10, 20, () => derivati().scoperte);
  T(g, 'naturalista', 'Naturalista', 'Scopri 30 specie.', 30, 60, () => derivati().scoperte);
  T(g, 'enciclopedia_del_mare', 'Enciclopedia del mare', "Scopri tutte le specie dell'acquario.", () => catalogo().acquario.length, 300, () => derivati().scoperte);
  T(g, 'buongustaio', 'Buongustaio', 'Assaggia 25 specie diverse.', 25, 50, () => derivati().assaggiate);
  T(g, 'mangiatutto', 'Mangiatutto', "Assaggia tutte le specie dell'acquario.", () => catalogo().acquario.length, 250, () => derivati().assaggiate);
  const nomi = { laguna: 'Di casa in laguna', alghe: 'Pollice verde', relitto: 'Cacciatore di relitti', mare_aperto: 'Al largo',
    ghiacci: 'Sangue freddo', rovine: 'Archeologo subacqueo', vulcano: 'Testa calda', abisso: 'Occhi nel buio' };
  const premi = [30, 30, 40, 40, 40, 50, 50, 60];
  AMBIENTI.forEach((a, i) => { if (APERTI.includes(a.id)) T(g, 'abitanti_' + a.id, nomi[a.id] || 'Di casa: ' + a.nome, a.nome + ': scopri tutte le specie che ci vivono.',
    () => catalogo().perAmbiente[a.id].length, premi[i] || 50, () => derivati().ambienti[a.id] || 0); });

  g = 'Costanza';
  T(g, 'ci_ho_preso_gusto', 'Ci ho preso gusto', 'Gioca 10 partite.', 10, 15, () => stat().partite);
  T(g, 'mai_sazio', 'Mai sazio', 'Gioca 100 partite.', 100, 120, () => stat().partite);
  T(g, 'chi_ben_comincia', 'Chi ben comincia', 'Ritira il regalo del giorno 3 giorni di fila.', 3, 25, () => stat().serieMassima);
  T(g, 'sette_su_sette', 'Sette su sette', 'Ritira il regalo del giorno 7 giorni di fila.', 7, 80, () => stat().serieMassima);
  T(g, 'ora_sott_acqua', "Un'ora sott'acqua", "Gioca per un'ora in tutto.", 60, 50, () => Math.floor(stat().tempoGioco / 60));
  T(g, 'spuntano_le_branchie', 'Ti spuntano le branchie', 'Gioca per 5 ore in tutto.', 300, 150, () => Math.floor(stat().tempoGioco / 60));
})();

let aperti = [];                         // i traguardi non ancora raggiunti: solo questi si ricontrollano
function valoreDi(t) { const v = misure.get(t.id)(); return typeof v === 'number' && v > 0 ? v : 0; }
const segnato = id => ha(S.traguardi, id) && S.traguardi[id].fatto === true;
function ricomincia() { cat = null; der = null; aperti = TRAGUARDI.filter(t => !segnato(t.id)); }

/* Segna i traguardi appena raggiunti e (se non è silenzioso) li annuncia con l'evento 'traguardo'. */
function verifica(silenzioso) {
  let nuovi = null;
  for (let i = aperti.length - 1; i >= 0; i--) {
    const t = aperti[i];
    if (valoreDi(t) < t.obiettivo) continue;
    S.traguardi[t.id] = { fatto: true, riscosso: false };
    aperti.splice(i, 1);
    (nuovi || (nuovi = [])).push(t);
  }
  if (!nuovi) return 0;
  sporco = true;
  if (!silenzioso) {
    for (let i = nuovi.length - 1; i >= 0; i--) B.eventi.emetti('traguardo', { id: nuovi[i].id, nome: nuovi[i].nome, premio: nuovi[i].premio });
    B.eventi.emetti('progressi', { motivo: 'traguardo' });
  }
  return nuovi.length;
}

/* Ogni modifica passa di qui: controlla i traguardi, avvisa le schermate, mette in conto la scrittura. */
function modificato(motivo, subito) {
  verifica(false);
  B.eventi.emetti('progressi', { motivo });
  daScrivere(subito === true);
}

// ---------------------------------------------------------------- perle
let mieEmissioni = 0;                    // > 0 mentre sono io a emettere 'perle' o 'impostazioni'
let inPartita = false;
let motoreUsaGuadagna = false;           // vero dopo la prima guadagna() chiamata durante una partita

/* Perle intere e sensate: arrotonda, e scarta tutto ciò che non è un numero finito e positivo. */
const perleValide = n => typeof n === 'number' && n > 0 && n < Infinity ? Math.min(Math.round(n), PERLE_MAX) : 0;

function accredita(n, motivo) {
  n = perleValide(n);
  if (!n) return 0;
  S.perle = Math.min(PERLE_MAX, S.perle + n);
  stat().perleTotali += n;
  mieEmissioni++;
  try { B.eventi.emetti('perle', { quante: n, motivo: typeof motivo === 'string' ? motivo : '' }); } finally { mieEmissioni--; }
  return n;
}
function paga(n) {
  if (S.perle < n) return false;
  S.perle -= n; stat().perleSpese += n;
  return true;
}

// ---------------------------------------------------------------- acquario
function voceAcquario(id) {
  if (typeof id !== 'string' || !ID_VALIDO.test(id)) return null;
  if (ha(S.acquario, id)) return S.acquario[id];
  if (Object.keys(S.acquario).length >= ACQUARIO_MAX) return null;
  return S.acquario[id] = { visti: 0, mangiati: 0 };
}
function scoperta(id) {
  der = null;
  const s = catalogo().schede[id];
  B.eventi.emetti('scoperta', { id, nome: s ? s.nome : id, tipo: s ? s.tipo : null });
}
function segnaVisto(id) {
  const v = voceAcquario(id); if (!v) return false;
  v.visti = somma(v.visti, 1);
  if (v.visti === 1 && v.mangiati === 0) scoperta(id);
  return true;
}
function segnaMangiato(id, quanti) {
  const v = voceAcquario(id); if (!v || !(quanti > 0)) return false;
  const nuova = v.visti === 0 && v.mangiati === 0;
  if (v.mangiati === 0) der = null;
  v.mangiati = somma(v.mangiati, quanti);
  if (v.visti === 0) v.visti = 1;
  if (nuova) scoperta(id);
  return true;
}

/* La sconfitta di un gigante può arrivare con due segnali: 'mangiato' (tipo gigante) e 'gigante:morso' con rimasti 0.
   Conta il primo che arriva; l'altro, se arriva, è la stessa sconfitta. */
const sconfitte = new Map();
function nuovaSconfitta(id, segnale) {
  const chiave = typeof id === 'string' ? id : '?', prima = sconfitte.get(chiave);
  if (prima && prima !== segnale) { sconfitte.delete(chiave); return false; }
  sconfitte.set(chiave, segnale);
  return true;
}
function giganteSconfitto(id) { stat().gigantiSconfitti++; segnaMangiato(id, 1); }

// ---------------------------------------------------------------- gli eventi del gioco
let colpiPartita = 0;
function ascolta(nome, fn) { B.eventi.su(nome, dati => fn(eOggetto(dati) ? dati : {})); }

ascolta('partita:inizio', d => {
  inPartita = true; colpiPartita = 0; sconfitte.clear();
  cat = null; der = null;                // a questo punto tutti i contenuti sono registrati: il catalogo si rifà da capo
  stat().partite++;
  if (d.modalita === 'sopravvivenza') stat().partiteSopravvivenza++;
  modificato('partita');
});

ascolta('partita:fine', d => {
  const st = stat();
  st.tempoGioco = pulito(st.tempoGioco + Math.min(misura(d.tempo), 6 * 3600));
  const potenza = Math.round(misura(d.potenza));
  if (potenza > st.potenzaMassima) st.potenzaMassima = potenza;
  if (d.modalita === 'sopravvivenza') {
    if (potenza > S.record.potenza) S.record.potenza = potenza;
    const tempo = pulito(misura(d.tempo));
    if (tempo > S.record.tempo) S.record.tempo = tempo;
  } else if (d.esito === 'vinto') {
    st.vittorie++;
    if ((typeof d.colpi === 'number' ? d.colpi : colpiPartita) <= 0) st.vittorieSenzaColpi++;
    if (livelloValido(d.livello)) {
      const n = d.livello, stelle = Math.max(1, conta(d.stelle, 3));
      if (!(S.stelle[n] >= stelle)) { S.stelle[n] = stelle; st.stelle = sommaStelle(S); der = null; }
      if (n + 1 > S.livelloMax) S.livelloMax = n + 1;
    }
  } else if (d.esito === 'perso') st.sconfitte++;
  inPartita = false;
  modificato('partita', true);
});

ascolta('mangiato', d => {
  if (d.tipo === 'gigante' || tipoDi(d.id) === 'gigante') { if (nuovaSconfitta(d.id, 'mangiato')) giganteSconfitto(d.id); }
  else { stat().pesciMangiati++; segnaMangiato(d.id, 1); }
  modificato('acquario');
});

/* quanti è il totale dei pesciolini mangiati (dorati compresi); se c'è anche id (la specie del banco) finiscono nell'acquario. */
ascolta('pesciolini', d => {
  const dorati = conta(d.dorati), quanti = Math.max(conta(d.quanti), dorati);
  if (!quanti) return;
  const st = stat();
  st.pesciolini = somma(st.pesciolini, quanti); st.dorati = somma(st.dorati, dorati);
  if (dorati) segnaMangiato('dorato', dorati);
  if (quanti > dorati && d.id !== 'dorato') segnaMangiato(d.id, quanti - dorati);
  modificato('statistiche');
});

ascolta('visto', d => { if (segnaVisto(d.id)) modificato('acquario'); });
ascolta('cresciuto', () => { stat().crescite++; modificato('statistiche'); });
ascolta('colpito', () => { stat().colpiPresi++; colpiPartita++; modificato('statistiche'); });
ascolta('aiuto', d => { const a = stat().aiuti; a[TIPI_AIUTO.includes(d.tipo) ? d.tipo : 'altro']++; modificato('statistiche'); });
ascolta('frenesia', () => { stat().frenesie++; modificato('statistiche'); });
ascolta('scatto', () => { stat().scatti++; modificato('statistiche'); });

ascolta('gigante:morso', d => {
  stat().morsiGiganti++;
  if (typeof d.rimasti === 'number' && d.rimasti <= 0) { if (nuovaSconfitta(d.id, 'morso')) giganteSconfitto(d.id); }
  else sconfitte.delete(typeof d.id === 'string' ? d.id : '?');
  modificato('statistiche');
});

/* Le perle si accreditano con guadagna(), che emette lei l'evento 'perle'. Rete di sicurezza: se il motore non la chiama
   mai e si limita a emettere 'perle', le perle arrivano lo stesso da qui (e mai due volte). */
ascolta('perle', d => {
  if (mieEmissioni || motoreUsaGuadagna) return;
  const n = perleValide(d.quante);
  if (!n) return;
  S.perle = Math.min(PERLE_MAX, S.perle + n);
  stat().perleTotali += n;
  modificato('perle', !inPartita);
});

/* Lo stesso per le impostazioni: chi emette 'impostazioni' senza passare da imposta() viene ascoltato comunque. */
ascolta('impostazioni', d => {
  if (mieEmissioni || !ha(IMPOSTAZIONI, d.chiave) || !IMPOSTAZIONI[d.chiave].valido(d.valore) || S.impostazioni[d.chiave] === d.valore) return;
  S.impostazioni[d.chiave] = d.valore;
  modificato('impostazioni', true);
});

// ---------------------------------------------------------------- versione precedente
const POT_V2 = { vel: 'pinne', scatto: 'scatto', cal: 'boccone', bolle: 'generoso', cuori: 'cuori' };
const VESTITI_V2 = [0, 120, 200, 300, 450];   // i vestiti non ci sono più: le perle spese tornano indietro

/* Prende, una volta sola, i progressi della versione precedente e li somma a quelli che ci sono. */
function importaV2() {
  S.importatoV2 = true;
  const v = leggi(CHIAVE_V2);
  if (!v) return false;
  const st = stat();
  let perle = conta(v.perle, PERLE_MAX), spese = 0;
  if (Array.isArray(v.vestiti)) v.vestiti.forEach((preso, i) => { if (preso === true && VESTITI_V2[i]) perle += VESTITI_V2[i]; });
  S.perle = Math.min(PERLE_MAX, S.perle + perle);

  if (eOggetto(v.pot)) for (const k of Object.keys(POT_V2)) {
    const p = POT[POT_V2[k]], liv = Math.min(conta(v.pot[k]), p.costi.length);
    if (liv <= S.potenziamenti[p.id]) continue;
    for (let i = S.potenziamenti[p.id]; i < liv; i++) spese += p.costi[i];
    S.potenziamenti[p.id] = liv;
  }

  S.livelloMax = Math.max(S.livelloMax, Math.min(conta(v.livelloMax) || 1, TOTALE_LIVELLI + 1));
  if (eOggetto(v.stelle)) for (const k of Object.keys(v.stelle)) {
    const n = Number(k), s = conta(v.stelle[k], 3);
    if (!livelloValido(n) || !s) continue;
    if (!(S.stelle[n] >= s)) S.stelle[n] = s;
    S.livelloMax = Math.max(S.livelloMax, n + 1);
  }

  const superatiPrima = Math.min(TOTALE_LIVELLI, S.livelloMax - 1);
  st.stelle = sommaStelle(S);
  st.potenzaMassima = Math.max(st.potenzaMassima, Math.round(misura(v.record)));
  st.perleTotali += perle + spese; st.perleSpese += spese;
  st.vittorie = Math.max(st.vittorie, superatiPrima);
  st.partite = Math.max(st.partite, st.vittorie);
  st.gigantiSconfitti = Math.max(st.gigantiSconfitti, superatiPrima);   // nella versione precedente ogni livello finiva con un gigante
  if (v.muto === true) { S.impostazioni.suoni = false; S.impostazioni.musica = false; }
  return true;
}

function carica() {
  sostituisci(ripulisci(leggi(CHIAVE)));
  const importato = !S.importatoV2 && importaV2();
  ricomincia();
  verifica(true);                        // ciò che risulta già raggiunto si segna in silenzio: resta solo da ritirare il premio
  cat = null; der = null; sporco = false;
  if (importato) scrivi();
}

// ---------------------------------------------------------------- regalo del giorno
/* serie: giorni di fila già ritirati (compreso oggi, se è già stato ritirato); perle: quanto vale il prossimo regalo. */
function statoRegalo() {
  const oggi = P._oggi(), r = S.regalo;
  let serie = r.ultimo ? r.serie : 0, disponibile = dataValida(oggi);
  if (disponibile && r.ultimo) {
    const giorni = giorniTra(r.ultimo, oggi);
    if (giorni === null || giorni > 1 || giorni < -2) serie = 0;   // un giorno saltato (o una data impossibile): la serie riparte
    else if (giorni <= 0) disponibile = false;                     // già ritirato oggi (o l'orologio è tornato poco indietro: si aspetta)
  }
  return { disponibile, serie, perle: PREMI_REGALO[serie % PREMI_REGALO.length], giorno: serie % PREMI_REGALO.length + 1, oggi };
}

// ---------------------------------------------------------------- B.progressi
function statoTraguardo(t) {
  const salvato = ha(S.traguardi, t.id) ? S.traguardi[t.id] : null, obiettivo = t.obiettivo, valore = valoreDi(t);
  const fatto = !!(salvato && salvato.fatto) || valore >= obiettivo;
  return { valore: fatto ? obiettivo : Math.floor(valore), fatto, riscosso: !!(salvato && salvato.riscosso) };
}
function conModello(id) {
  const r = B.eroi;
  try { return !r || typeof r.ha !== 'function' || typeof r.tutte !== 'function' || r.ha(id) || r.tutte().length === 0; } catch (e) { return true; }
}

P = B.progressi = {
  stato: S,
  POTENZIAMENTI, TRAGUARDI,
  totaleLivelli: TOTALE_LIVELLI,

  /* Orologio e calendario passano di qui, così le prove possono sostituirli. */
  _adesso: () => Date.now(),
  _oggi() { const d = new Date(), due = n => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate()); },

  salva: () => scrivi(),
  /* Cancella i progressi (le impostazioni restano, a meno di azzera({ tutto: true })). I dati della versione precedente
     non vengono ripresi una seconda volta. */
  azzera(opzioni) {
    const prima = S.impostazioni, nuovo = predefinito();
    nuovo.importatoV2 = true;
    if (!(opzioni && opzioni.tutto === true) && eOggetto(prima)) nuovo.impostazioni = prima;
    sostituisci(nuovo);
    try { const a = archivio(); if (a) a.removeItem(CHIAVE_V2); } catch (e) {}
    inPartita = false; sconfitte.clear(); colpiPartita = 0;
    ricomincia();
    if (nuovo.impostazioni !== prima) for (const k of Object.keys(IMPOSTAZIONI)) if (!eOggetto(prima) || prima[k] !== S.impostazioni[k]) {
      mieEmissioni++;
      try { B.eventi.emetti('impostazioni', { chiave: k, valore: S.impostazioni[k] }); } finally { mieEmissioni--; }
    }
    modificato('azzera', true);
  },

  // ----- perle
  perle: () => S.perle,
  /* Accredita n perle ed emette 'perle' { quante, motivo }. Non applica moltiplicatori: quelli li mette il motore. */
  guadagna(n, motivo) {
    if (inPartita) motoreUsaGuadagna = true;
    const q = accredita(n, motivo);
    if (q) modificato('perle', !inPartita);
    return q;
  },
  spendi(n) {
    if (n === 0) return true;
    n = typeof n === 'number' && n > 0 && n < Infinity ? Math.ceil(n) : 0;
    if (!n || !paga(n)) return false;
    modificato('perle', true);
    return true;
  },

  // ----- potenziamenti
  livelloPotenziamento: id => ha(POT, id) ? S.potenziamenti[id] : 0,
  /* Quanto costa il prossimo livello; null se è già al massimo (o se non esiste). */
  costoPotenziamento(id) { const p = ha(POT, id) ? POT[id] : null; return p && S.potenziamenti[id] < p.costi.length ? p.costi[S.potenziamenti[id]] : null; },
  compraPotenziamento(id) {
    const costo = P.costoPotenziamento(id);
    if (costo === null || !paga(costo)) return false;
    S.potenziamenti[id]++;
    modificato('acquisto', true);
    return true;
  },

  // ----- eroi
  /* L'eroe scelto. Se per qualche motivo non ha (ancora) un modello registrato, vale il primo posseduto che ce l'ha. */
  eroeScelto() {
    const id = possiede(S, S.eroe) ? S.eroe : EROE_BASE;
    if (conModello(id)) return id;
    if (conModello(EROE_BASE)) return EROE_BASE;
    const altro = EROI.find(e => possiede(S, e.id) && conModello(e.id));
    return altro ? altro.id : id;
  },
  eroePosseduto: id => possiede(S, id),
  /* Compra l'eroe e lo sceglie subito. */
  compraEroe(id) {
    const e = schedaEroe(id);
    if (!e || possiede(S, id) || !paga(conta(e.costo))) return false;
    S.eroi[id] = true; S.eroe = id;
    modificato('eroe', true);
    return true;
  },
  scegliEroe(id) {
    if (!possiede(S, id)) return false;
    if (S.eroe !== id) { S.eroe = id; modificato('eroe', true); }
    return true;
  },

  /* Potenziamenti più vantaggio dell'eroe scelto. I moltiplicatori valgono 1 da neutri, le aggiunte 0. */
  effetti() {
    const e = { velocita: 1, ricaricaScatto: 1, durataScatto: 1, risucchio: 1, bolle: 1, perle: 1, morso: 1,
      cuori: 0, durataCalamita: 0, durataFrenesia: 0, invulnerabile: 0, scudoIniziale: false };
    for (const p of POTENZIAMENTI) {
      const liv = S.potenziamenti[p.id];
      if (!liv) continue;
      if (p.effetto === 'scudoIniziale') e.scudoIniziale = true; else e[p.effetto] += p.passo * liv;
    }
    const eroe = schedaEroe(P.eroeScelto()), suoi = eroe && eOggetto(eroe.effetti) ? eroe.effetti : {};
    for (const k of Object.keys(suoi)) {
      const v = suoi[k], numero = typeof v === 'number' && v > -Infinity && v < Infinity;
      if (k === 'scudoIniziale') e.scudoIniziale = e.scudoIniziale || v === true;
      else if (numero && MOLTIPLICATORI.includes(k)) { if (v > 0) e[k] *= v; }
      else if (numero && AGGIUNTE.includes(k)) e[k] += v;
    }
    for (const k of MOLTIPLICATORI) e[k] = pulito(Math.max(0.2, e[k]));
    for (const k of AGGIUNTE) e[k] = pulito(Math.max(0, e[k]));
    return e;
  },

  // ----- livelli
  livelloSbloccato: n => livelloValido(n) && n <= S.livelloMax,
  /* Il livello più avanti che si può giocare. */
  livelloMax: () => Math.min(S.livelloMax, TOTALE_LIVELLI),
  livelliSuperati: superati,
  stelle: n => livelloValido(n) && ha(S.stelle, n) ? S.stelle[n] : 0,
  stelleTotali: () => sommaStelle(S),
  sopravvivenzaSbloccata: () => S.livelloMax > Math.min(LIVELLO_SOPRAVVIVENZA, TOTALE_LIVELLI),
  recordSopravvivenza: () => ({ potenza: S.record.potenza, tempo: S.record.tempo }),

  // ----- acquario
  acquario: id => ha(S.acquario, id) ? { visti: S.acquario[id].visti, mangiati: S.acquario[id].mangiati } : { visti: 0, mangiati: 0 },
  /* Quante specie ho visto. Senza argomento: pesci e giganti (le specie dell'acquario). Con un argomento: 'pesce',
     'gigante', 'banco', 'pericolo', 'tutti', oppure l'id di un ambiente. */
  scoperte: gruppo => gruppo === undefined ? derivati().scoperte : quante(elenco(gruppo), vista),
  /* Quante ce ne sono da scoprire, con lo stesso argomento di scoperte(). */
  totaleSpecie: gruppo => elenco(gruppo).length,

  // ----- traguardi
  traguardo(id) { const t = perId.get(id); return t ? statoTraguardo(t) : { valore: 0, fatto: false, riscosso: false }; },
  /* Ritira il premio di un traguardo raggiunto: restituisce le perle incassate (0 se non c'è niente da ritirare). */
  riscuoti(id) {
    const t = perId.get(id); if (!t) return 0;
    verifica(false);
    if (!segnato(id) || S.traguardi[id].riscosso) return 0;
    S.traguardi[id].riscosso = true;
    accredita(t.premio, 'traguardo');
    modificato('traguardo', true);
    return t.premio;
  },
  riscuotiTutti() { let perle = 0; for (const t of TRAGUARDI) perle += P.riscuoti(t.id); return perle; },
  daRiscuotere() { let n = 0; for (const t of TRAGUARDI) { const s = statoTraguardo(t); if (s.fatto && !s.riscosso) n++; } return n; },

  // ----- regalo del giorno
  regalo() { const r = statoRegalo(); return { disponibile: r.disponibile, serie: r.serie, perle: r.perle, giorno: r.giorno, premi: PREMI_REGALO.slice() }; },
  riscuotiRegalo() {
    const r = statoRegalo();
    if (!r.disponibile) return null;
    S.regalo = { ultimo: r.oggi, serie: r.serie + 1 };
    const st = stat();
    st.regali++; if (S.regalo.serie > st.serieMassima) st.serieMassima = S.regalo.serie;
    accredita(r.perle, 'regalo');
    modificato('regalo', true);
    return { perle: r.perle, serie: S.regalo.serie };
  },

  // ----- impostazioni
  impostazione: chiave => ha(S.impostazioni, chiave) ? S.impostazioni[chiave] : undefined,
  imposta(chiave, valore) {
    if (!ha(IMPOSTAZIONI, chiave) || !IMPOSTAZIONI[chiave].valido(valore)) return false;
    if (S.impostazioni[chiave] === valore) return true;
    S.impostazioni[chiave] = valore;
    mieEmissioni++;
    try { B.eventi.emetti('impostazioni', { chiave, valore }); } finally { mieEmissioni--; }
    modificato('impostazioni', true);
    return true;
  },

  tutorialFatto: () => S.tutorial === true,
  segnaTutorial() { if (S.tutorial !== true) { S.tutorial = true; modificato('tutorial', true); } },
};

// ---------------------------------------------------------------- avvio
carica();

/* Quando la pagina va in secondo piano (o si chiude) ciò che è in sospeso si scrive subito. */
try {
  if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function')
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') scriviSeServe(); });
  if (typeof window.addEventListener === 'function') window.addEventListener('pagehide', scriviSeServe);
} catch (e) {}
})();
