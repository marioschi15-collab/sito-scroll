#!/usr/bin/env node
/* Prove del modulo dei progressi (src/js/05-progressi.js).
   Uso:
     node giochi/boccone/strumenti/prova-progressi.mjs                 tutte le prove
     node giochi/boccone/strumenti/prova-progressi.mjs --solo regalo   solo quelle con "regalo" nel nome
   Carica 00-nucleo, 01-cast e 05-progressi in un contesto node:vm con una finestra e un archivio (localStorage) finti:
   niente browser. Ogni prova apre uno o più "mondi" puliti; riaprire un mondo con lo stesso archivio equivale a
   chiudere e riaprire il gioco. Se una prova fallisce il comando esce con codice 1. */
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = ['00-nucleo.js', '01-cast.js', '05-progressi.js'].map(nome =>
  new vm.Script(readFileSync(join(radice, 'src', 'js', nome), 'utf8'), { filename: 'src/js/' + nome }));
/* Le prove valgono per il gioco intero: si aprono tutti gli ambienti, anche quelli che nel gioco pubblicato sono ancora
   "in arrivo" (B.cast.aperti). Con --pubblicato si prova l'elenco così com'è. */
if (!process.argv.includes('--pubblicato')) SCRIPT.splice(2, 0, new vm.Script('B.cast.aperti = B.cast.ambienti.map(a => a.id);', { filename: 'tutti-aperti' }));
const CHIAVE = 'boccone-salvataggio-3', CHIAVE_V2 = 'boccone-salvataggio';
const EVENTI_SEGUITI = ['progressi', 'traguardo', 'perle', 'impostazioni', 'scoperta'];

// ---------------------------------------------------------------- il mondo finto
function archivioFinto(iniziale = {}) {
  const dati = new Map();
  const a = {
    scritture: 0, pieno: false,
    getItem: k => dati.has(k) ? dati.get(k) : null,
    setItem(k, v) { if (a.pieno) throw new Error('spazio finito'); a.scritture++; dati.set(k, String(v)); },
    removeItem(k) { dati.delete(k); },
    metti(k, v) { dati.set(k, typeof v === 'string' ? v : JSON.stringify(v)); return a; },
    letto: k => dati.has(k) ? JSON.parse(dati.get(k)) : null,
    ha: k => dati.has(k),
  };
  for (const k of Object.keys(iniziale)) a.metti(k, iniziale[k]);
  return a;
}

const mondiAperti = [];
/* opzioni: archivio, oggi ('AAAA-MM-GG'), pagina (document e window.addEventListener finti), senzaArchivio,
   archivioVietato (leggere window.localStorage lancia un errore), senzaSveglie (niente setTimeout). */
function mondo({ archivio = archivioFinto(), oggi = '2026-03-01', pagina = false, senzaArchivio = false, archivioVietato = false, senzaSveglie = false } = {}) {
  const avvisi = [], errori = [], sveglie = [], suDocumento = {}, suFinestra = {};
  const sandbox = {
    console: { log() {}, info() {}, warn: (...a) => avvisi.push(a.map(String).join(' ')), error: (...a) => errori.push(a.map(x => x && x.stack ? x.stack : String(x)).join(' ')) },
  };
  if (!senzaSveglie) {
    sandbox.setTimeout = (fn, ms) => { const s = { fn, ms, attiva: true }; sveglie.push(s); return s; };
    sandbox.clearTimeout = s => { if (s) s.attiva = false; };
  }
  sandbox.window = sandbox;
  if (archivioVietato) Object.defineProperty(sandbox, 'localStorage', { get() { throw new Error('accesso vietato'); } });
  else if (!senzaArchivio) sandbox.localStorage = archivio;
  if (pagina) {
    sandbox.document = { visibilityState: 'visible', addEventListener(nome, fn) { (suDocumento[nome] = suDocumento[nome] || []).push(fn); } };
    sandbox.addEventListener = (nome, fn) => { (suFinestra[nome] = suFinestra[nome] || []).push(fn); };
  }
  vm.createContext(sandbox);
  for (const s of SCRIPT) s.runInContext(sandbox);
  const B = sandbox.B, P = B.progressi;
  const oggiVero = P._oggi();
  const orologio = { ms: 1e13, giorno: oggi };
  P._adesso = () => orologio.ms;
  P._oggi = () => orologio.giorno;
  const eventi = [];
  for (const nome of EVENTI_SEGUITI) B.eventi.su(nome, dati => eventi.push({ nome, dati }));
  const m = {
    B, P, archivio, orologio, avvisi, errori, sveglie, eventi, oggiVero, documento: sandbox.document,
    emetti: (nome, dati) => B.eventi.emetti(nome, dati),
    visti: nome => eventi.filter(e => e.nome === nome).map(e => e.dati),
    dimentica() { eventi.length = 0; },
    salvato: () => archivio.letto(CHIAVE),
    sveglieAttive: () => sveglie.filter(s => s.attiva).length,
    /* Fa scattare le sveglie in attesa (come se fosse passato il tempo). */
    suona() { for (const s of sveglie.filter(x => x.attiva)) { s.attiva = false; s.fn(); } },
    nascondi() { sandbox.document.visibilityState = 'hidden'; for (const fn of suDocumento.visibilitychange || []) fn(); },
    mostra() { sandbox.document.visibilityState = 'visible'; for (const fn of suDocumento.visibilitychange || []) fn(); },
    chiudi() { for (const fn of suFinestra.pagehide || []) fn(); },
    suDocumento, suFinestra,
  };
  mondiAperti.push(m);
  return m;
}
const riapri = (m, opzioni = {}) => mondo(Object.assign({ archivio: m.archivio, oggi: m.orologio.giorno }, opzioni));

/* Una partita intera, dall'inizio alla fine. */
function gioca(m, livello, { esito = 'vinto', stelle = 3, colpi = 0, tempo = 120, potenza = 400000, modalita = 'avventura', dentro = null } = {}) {
  const ambiente = modalita === 'avventura' ? m.B.cast.aperti[Math.ceil(livello / m.B.cast.livelliPerAmbiente) - 1] : 'laguna';
  m.emetti('partita:inizio', { livello, modalita, ambiente, eroe: m.P.eroeScelto() });
  if (dentro) dentro(ambiente);
  m.emetti('partita:fine', { esito, livello, modalita, ambiente, tempo, potenza, colpi, perle: 0, stelle: esito === 'vinto' ? stelle : 0, mangiati: {} });
}
/* Dà le perle che servono e compra un potenziamento fino al livello voluto. */
function porta(m, id, livello) {
  while (m.P.livelloPotenziamento(id) < livello) {
    m.P.guadagna(m.P.costoPotenziamento(id), 'prova');
    if (!m.P.compraPotenziamento(id)) throw new Error('non riesco a comprare ' + id);
  }
}

// ---------------------------------------------------------------- controlli
const testo = v => v === undefined ? 'undefined' : JSON.stringify(v);
function uguale(ottenuto, atteso, cosa = 'valore') {
  if (testo(ottenuto) !== testo(atteso)) throw new Error(cosa + ': atteso ' + testo(atteso) + ', ottenuto ' + testo(ottenuto));
}
function vero(condizione, cosa = 'condizione') { if (!condizione) throw new Error('non è vero: ' + cosa); }
function circa(ottenuto, atteso, cosa = 'valore') {
  if (typeof ottenuto !== 'number' || Math.abs(ottenuto - atteso) > 1e-6) throw new Error(cosa + ': atteso circa ' + atteso + ', ottenuto ' + testo(ottenuto));
}

const prove = [];
function prova(nome, fn) { prove.push({ nome, fn }); }

// ================================================================ le prove

prova('valori predefiniti: partenza da zero', () => {
  const m = mondo(), P = m.P, cast = m.B.cast;
  uguale(P.perle(), 0, 'perle');
  uguale(P.stato.versione, 3, 'versione');
  uguale(P.eroeScelto(), 'pallino', 'eroe scelto');
  vero(P.eroePosseduto('pallino'), 'pallino è posseduto dall\'inizio');
  for (const e of cast.eroi) if (e.id !== 'pallino') vero(!P.eroePosseduto(e.id), e.id + ' non è posseduto');
  for (const p of P.POTENZIAMENTI) uguale(P.livelloPotenziamento(p.id), 0, 'livello di ' + p.id);
  uguale(P.totaleLivelli, cast.aperti.length * cast.livelliPerAmbiente, 'livelli in tutto (gli ambienti aperti × 5)');
  uguale(P.totaleLivelli, 40, 'livelli in tutto (8 ambienti × 5)');
  uguale(P.livelloMax(), 1, 'livello massimo');
  vero(P.livelloSbloccato(1), 'il livello 1 è aperto');
  for (const n of [0, 2, 40, 41, -1, 1.5, '1', null, undefined]) vero(!P.livelloSbloccato(n), 'livello ' + testo(n) + ' chiuso');
  uguale([P.stelle(1), P.stelleTotali(), P.livelliSuperati()], [0, 0, 0], 'stelle e livelli superati');
  vero(!P.sopravvivenzaSbloccata(), 'sopravvivenza chiusa');
  uguale(P.recordSopravvivenza(), { potenza: 0, tempo: 0 }, 'record');
  uguale(P.acquario('ghiozzo'), { visti: 0, mangiati: 0 }, 'acquario vuoto');
  uguale(P.acquario('toString'), { visti: 0, mangiati: 0 }, 'acquario: un id che non c\'è');
  uguale(P.scoperte(), 0, 'scoperte');
  uguale(P.totaleSpecie(), cast.specie.filter(s => s.tipo === 'pesce' || s.tipo === 'gigante').length, 'specie dell\'acquario');
  uguale([P.impostazione('suoni'), P.impostazione('musica'), P.impostazione('vibrazione'), P.impostazione('qualita'), P.impostazione('mano')],
    [true, true, true, 'auto', 'destra'], 'impostazioni');
  uguale(P.impostazione('boh'), undefined, 'impostazione sconosciuta');
  vero(!P.tutorialFatto(), 'tutorial non fatto');
  const r = P.regalo();
  uguale([r.disponibile, r.serie, r.perle, r.giorno], [true, 0, 20, 1], 'regalo del primo giorno');
  uguale(r.premi, [20, 30, 40, 50, 60, 80, 120], 'tabella dei regali');
  uguale(P.daRiscuotere(), 0, 'premi da ritirare');
  for (const t of P.TRAGUARDI) uguale(P.traguardo(t.id), { valore: 0, fatto: false, riscosso: false }, 'traguardo ' + t.id);
  uguale(m.archivio.scritture, 0, 'niente scritture al caricamento');
  vero(!m.archivio.ha(CHIAVE), 'nessun salvataggio creato solo per aver aperto il gioco');
  const d = new Date(), due = n => String(n).padStart(2, '0');
  uguale(m.oggiVero, d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate()), '_oggi() dà la data locale AAAA-MM-GG');
});

prova('potenziamenti: id, nomi e costi come da incarico', () => {
  const P = mondo().P;
  const attesi = [
    ['pinne', 'Pinne veloci', [40, 90, 160, 260, 400]], ['scatto', 'Scatto pronto', [40, 90, 160, 260, 400]],
    ['boccone', 'Boccone largo', [50, 110, 190, 300, 450]], ['generoso', 'Mare generoso', [60, 130, 220]],
    ['cuori', 'Cuore in più', [200, 500]], ['calamita', 'Calamita potente', [80, 170, 300]],
    ['frenesia', 'Frenesia lunga', [100, 220, 380]], ['fiuto', 'Fiuto per le perle', [120, 260, 480]], ['scudo', 'Scudo di partenza', [350]],
  ];
  uguale(P.POTENZIAMENTI.map(p => [p.id, p.nome, p.costi]), attesi, 'elenco dei potenziamenti');
  for (const p of P.POTENZIAMENTI) {
    vero(typeof p.descrizione === 'string' && p.descrizione.length > 5 && p.descrizione.length < 60, 'descrizione breve di ' + p.id);
    vero(typeof p.beneficio(1) === 'string' && p.beneficio(1).length > 0, 'beneficio di ' + p.id);
  }
  uguale([P.POTENZIAMENTI[0].beneficio(2), P.POTENZIAMENTI[1].beneficio(2), P.POTENZIAMENTI[4].beneficio(2), P.POTENZIAMENTI[6].beneficio(1)],
    ['+12%', '−24%', '+2', '+1,5 s'], 'scritte dei benefici');
});

prova('traguardi: almeno 30, ben fatti, con premi da 10 a 400', () => {
  const m = mondo(), P = m.P, T = P.TRAGUARDI;
  vero(T.length >= 30, 'almeno 30 traguardi (sono ' + T.length + ')');
  uguale(new Set(T.map(t => t.id)).size, T.length, 'id tutti diversi');
  uguale(new Set(T.map(t => t.nome)).size, T.length, 'nomi tutti diversi');
  const gergo = /\b(boss|power.?up|sprite|token|prompt|api|bonus|level|score|achievement|upgrade|skin|xp|hp)\b/i;
  for (const t of T) {
    vero(/^[a-z][a-z0-9_]*$/.test(t.id), 'id valido: ' + t.id);
    vero(typeof t.nome === 'string' && t.nome.length >= 3 && t.nome.length <= 32, 'nome di ' + t.id);
    vero(typeof t.descrizione === 'string' && t.descrizione.length >= 10 && t.descrizione.length <= 80, 'descrizione di ' + t.id);
    vero(/[.!…]$/.test(t.descrizione), 'la descrizione di ' + t.id + ' finisce con un punto');
    vero(!gergo.test(t.nome + ' ' + t.descrizione), 'niente gergo in ' + t.id);
    vero(Number.isInteger(t.obiettivo) && t.obiettivo >= 1, 'obiettivo numerico di ' + t.id + ': ' + t.obiettivo);
    vero(Number.isInteger(t.premio) && t.premio >= 10 && t.premio <= 400, 'premio di ' + t.id + ': ' + t.premio);
    vero(typeof t.gruppo === 'string' && t.gruppo.length > 0, 'gruppo di ' + t.id);
  }
  vero(T.filter(t => t.premio <= 20).length >= 8, 'ci sono traguardi per i primi minuti');
  vero(T.filter(t => t.premio >= 200).length >= 6, 'ci sono traguardi per il lungo periodo');
  uguale(Math.min(...T.map(t => t.premio)), 10, 'premio più piccolo');
  uguale(Math.max(...T.map(t => t.premio)), 400, 'premio più grande');
  // obiettivi che dipendono dal cast
  uguale(P.TRAGUARDI.find(t => t.id === 're_degli_oceani').obiettivo, 40, 'tutti i livelli');
  uguale(P.TRAGUARDI.find(t => t.id === 'firmamento').obiettivo, 120, 'tutte le stelle');
  uguale(P.TRAGUARDI.find(t => t.id === 'il_piu_grosso').obiettivo, 8, 'tutti i giganti');
  uguale(P.TRAGUARDI.find(t => t.id === 'enciclopedia_del_mare').obiettivo, 70, 'tutte le specie');
  uguale(P.TRAGUARDI.find(t => t.id === 'tutta_la_banda').obiettivo, 5, 'tutti gli eroi da sbloccare (quello di partenza c\'è già: da zero il traguardo segna 0)');
  uguale(P.TRAGUARDI.find(t => t.id === 'abitanti_laguna').obiettivo, 11, 'abitanti della laguna (10 pesci e il gigante)');
  for (const a of m.B.cast.ambienti) vero(T.some(t => t.id === 'abitanti_' + a.id), 'un traguardo per ' + a.id);
});

prova('economia: premi, regali e costi stanno insieme', () => {
  const m = mondo(), P = m.P;
  const costiPotenziamenti = P.POTENZIAMENTI.reduce((s, p) => s + p.costi.reduce((a, b) => a + b, 0), 0);
  const costiEroi = m.B.cast.eroi.reduce((s, e) => s + e.costo, 0);
  const premi = P.TRAGUARDI.reduce((s, t) => s + t.premio, 0);
  const settimana = P.regalo().premi.reduce((a, b) => a + b, 0);
  const avventura = P.totaleLivelli * 90;            // un livello frutta in media 60–120 perle
  uguale(costiPotenziamenti, 6570, 'costo di tutti i potenziamenti');
  uguale(settimana, 400, 'una settimana di regali');
  vero(premi >= 4500 && premi <= 7000, 'i premi dei traguardi in tutto (' + premi + ') valgono più o meno quanto l\'avventura (' + avventura + ')');
  vero(premi < costiPotenziamenti + costiEroi, 'i traguardi da soli non comprano tutto il negozio');
  vero(avventura + premi > 0.8 * (costiPotenziamenti + costiEroi), 'chi finisce tutto arriva a comprare quasi tutto');
  vero(settimana >= 3 * 60 && settimana <= 6 * 120, 'una settimana di regali vale qualche livello');
  const primo = Math.min(...P.POTENZIAMENTI.map(p => p.costi[0]));
  vero(primo <= 60, 'il primo acquisto arriva dopo un livello');
});

prova('importazione dalla versione precedente', () => {
  const v2 = { livelloMax: 7, perle: 345, pot: { vel: 2, scatto: 1, cal: 0, cuori: 1, bolle: 3 }, vestito: 1, vestiti: [true, true, false, false, false],
    stelle: { 1: 3, 2: 2, 3: 1, 6: 3 }, record: 420000, muto: true, visto: true };
  const m = mondo({ archivio: archivioFinto({ [CHIAVE_V2]: v2 }) }), P = m.P;
  uguale(P.perle(), 345 + 120, 'perle (più il rimborso del vestito comprato)');
  uguale(P.livelloMax(), 7, 'livello massimo');
  vero(P.livelloSbloccato(7) && !P.livelloSbloccato(8), 'livelli aperti fino al 7');
  uguale([1, 2, 3, 4, 6].map(n => P.stelle(n)), [3, 2, 1, 0, 3], 'stelle');
  uguale(P.stelleTotali(), 9, 'stelle in tutto');
  uguale(P.livelliSuperati(), 6, 'livelli superati');
  vero(P.sopravvivenzaSbloccata(), 'sopravvivenza aperta (livello 5 superato)');
  uguale(['pinne', 'scatto', 'boccone', 'generoso', 'cuori'].map(id => P.livelloPotenziamento(id)), [2, 1, 0, 3, 1], 'potenziamenti già comprati');
  uguale(P.stato.statistiche.potenzaMassima, 420000, 'il vecchio massimo');
  uguale(P.recordSopravvivenza(), { potenza: 0, tempo: 0 }, 'il record di sopravvivenza resta da fare');
  uguale([P.impostazione('suoni'), P.impostazione('musica')], [false, false], 'chi aveva tolto i suoni li ritrova tolti');
  uguale(P.stato.importatoV2, true, 'segnato come importato');
  vero(m.archivio.scritture >= 1 && m.salvato().perle === 465, 'scritto subito nel nuovo salvataggio');
  vero(m.archivio.ha(CHIAVE_V2), 'il vecchio salvataggio non viene toccato');
  // i traguardi già meritati si trovano pronti da ritirare, senza annunci
  vero(P.traguardo('si_parte').fatto && !P.traguardo('si_parte').riscosso, 'traguardo "primo livello" pronto da ritirare');
  vero(P.daRiscuotere() >= 2, 'ci sono premi da ritirare');
  m.emetti('scatto', {});
  uguale(m.visti('traguardo').length, 0, 'nessun annuncio per i traguardi arrivati con l\'importazione');

  // la forma minima descritta nel contratto
  const n = mondo({ archivio: archivioFinto({ [CHIAVE_V2]: { livelloMax: 3, perle: 100, stelle: { 1: 3, 2: 2 }, record: 5000 } }) }).P;
  uguale([n.perle(), n.livelloMax(), n.stelle(1), n.stelle(2), n.stelleTotali(), n.stato.statistiche.potenzaMassima], [100, 3, 3, 2, 5, 5000], 'forma minima');
  vero(!n.sopravvivenzaSbloccata(), 'sopravvivenza ancora chiusa');

  // dati esagerati o rovinati nella versione precedente
  const e = mondo({ archivio: archivioFinto({ [CHIAVE_V2]: { livelloMax: 999, perle: -5, stelle: { 2: 9, 77: 3, x: 1 }, record: 'tanto', pot: { vel: 50 } } }) }).P;
  uguale([e.perle(), e.livelloMax(), e.livelliSuperati(), e.stelle(2), e.stelleTotali(), e.livelloPotenziamento('pinne')], [0, 40, 40, 3, 3, 5], 'valori riportati nei limiti');
  const r = mondo({ archivio: archivioFinto({ [CHIAVE_V2]: '{{{ rotto' }) });
  uguale([r.P.perle(), r.P.livelloMax()], [0, 1], 'vecchio salvataggio illeggibile: si parte da zero');
  uguale(r.archivio.scritture, 0, 'e non si scrive niente');
});

prova('importazione: una volta sola', () => {
  const m = mondo({ archivio: archivioFinto({ [CHIAVE_V2]: { livelloMax: 3, perle: 100, stelle: { 1: 3 }, record: 5000 } }) });
  uguale(m.P.perle(), 100, 'importate');
  vero(m.P.spendi(30), 'spendo 30 perle');
  m.archivio.metti(CHIAVE_V2, { livelloMax: 30, perle: 9999, stelle: {}, record: 1 });
  const m2 = riapri(m);
  uguale([m2.P.perle(), m2.P.livelloMax()], [70, 3], 'alla riapertura non si importa di nuovo');

  m2.P.azzera();
  uguale([m2.P.perle(), m2.P.livelloMax()], [0, 1], 'azzerato');
  vero(!m2.archivio.ha(CHIAVE_V2), 'azzerando sparisce anche il vecchio salvataggio');
  m2.archivio.metti(CHIAVE_V2, { livelloMax: 30, perle: 9999 });
  const m3 = riapri(m2);
  uguale([m3.P.perle(), m3.P.livelloMax()], [0, 1], 'dopo "azzera" i vecchi dati non tornano');

  // chi comincia senza dati vecchi non li importa nemmeno se compaiono più tardi
  const n = mondo();
  n.P.guadagna(5, 'prova');
  n.archivio.metti(CHIAVE_V2, { livelloMax: 9, perle: 500 });
  const n2 = riapri(n);
  uguale([n2.P.perle(), n2.P.livelloMax()], [5, 1], 'nessuna importazione tardiva');
});

prova('acquisti: potenziamenti, perle insufficienti, livello massimo', () => {
  const m = mondo(), P = m.P;
  vero(!P.compraPotenziamento('pinne'), 'senza perle non si compra');
  uguale([P.perle(), P.livelloPotenziamento('pinne'), P.costoPotenziamento('pinne')], [0, 0, 40], 'niente è cambiato');
  P.guadagna(39, 'prova');
  vero(!P.compraPotenziamento('pinne'), 'con 39 perle non basta');
  uguale(P.perle(), 39, 'le perle restano');
  P.guadagna(1, 'prova');
  const scritture = m.archivio.scritture; m.dimentica();
  vero(P.compraPotenziamento('pinne'), 'con 40 perle si compra');
  uguale([P.perle(), P.livelloPotenziamento('pinne'), P.costoPotenziamento('pinne')], [0, 1, 90], 'dopo l\'acquisto');
  vero(m.archivio.scritture > scritture && m.salvato().potenziamenti.pinne === 1, 'l\'acquisto si scrive subito');
  uguale(m.visti('progressi').map(d => d.motivo).includes('acquisto'), true, 'evento progressi con motivo "acquisto"');
  vero(!P.compraPotenziamento('turbo') && !P.compraPotenziamento() && !P.compraPotenziamento('toString'), 'potenziamento che non esiste');
  uguale(P.livelloPotenziamento('turbo'), 0, 'livello di un potenziamento che non esiste');
  uguale(P.costoPotenziamento('turbo'), null, 'costo di un potenziamento che non esiste');

  P.guadagna(90 + 160 + 260 + 400, 'prova');
  for (let i = 0; i < 4; i++) vero(P.compraPotenziamento('pinne'), 'livello ' + (i + 2));
  uguale([P.perle(), P.livelloPotenziamento('pinne'), P.costoPotenziamento('pinne')], [0, 5, null], 'al massimo, pagato il giusto');
  P.guadagna(5000, 'prova');
  vero(!P.compraPotenziamento('pinne'), 'oltre il massimo non si compra');
  uguale(P.perle(), 5000, 'e non si paga');
  uguale(P.stato.statistiche.perleSpese, 950, 'perle spese');

  // spendi()
  vero(P.spendi(1000) && P.perle() === 4000, 'spendi 1000');
  vero(!P.spendi(4001) && P.perle() === 4000, 'non si va sotto zero');
  for (const n of [-1, NaN, Infinity, '10', null, undefined, {}]) vero(!P.spendi(n) && P.perle() === 4000, 'spendi(' + String(n) + ') rifiutato');
  vero(P.spendi(0) && P.perle() === 4000, 'spendere zero non costa niente');
  vero(P.spendi(4000) && P.perle() === 0, 'si può spendere tutto');

  const m2 = riapri(m);
  uguale([m2.P.livelloPotenziamento('pinne'), m2.P.perle()], [5, 0], 'tutto ritrovato alla riapertura');
});

prova('acquisti: eroi', () => {
  const m = mondo(), P = m.P;
  vero(!P.compraEroe('saetta'), 'senza perle niente eroe');
  vero(!P.scegliEroe('saetta') && P.eroeScelto() === 'pallino', 'non si sceglie un eroe che non si ha');
  P.guadagna(249, 'prova');
  vero(!P.compraEroe('saetta') && P.perle() === 249 && !P.eroePosseduto('saetta'), 'con 249 perle non basta');
  P.guadagna(1, 'prova');
  vero(P.compraEroe('saetta'), 'con 250 sì');
  uguale([P.perle(), P.eroePosseduto('saetta'), P.eroeScelto()], [0, true, 'saetta'], 'comprato e scelto subito');
  P.guadagna(1000, 'prova');
  vero(!P.compraEroe('saetta') && P.perle() === 1000, 'non si compra due volte');
  vero(!P.compraEroe('pallino') && !P.compraEroe('squalo_bianco') && !P.compraEroe(), 'eroi gratis o inesistenti');
  vero(P.scegliEroe('pallino') && P.eroeScelto() === 'pallino', 'si torna a Pallino');
  vero(P.scegliEroe('saetta') && P.eroeScelto() === 'saetta', 'e di nuovo a Saetta');
  vero(!P.scegliEroe('zanna') && P.eroeScelto() === 'saetta', 'Zanna non è ancora nostro');
  uguale(P.traguardo('un_nuovo_amico').fatto, true, 'traguardo "un nuovo amico"');
  const m2 = riapri(m);
  uguale([m2.P.eroeScelto(), m2.P.eroePosseduto('saetta'), m2.P.eroePosseduto('zanna'), m2.P.perle()], ['saetta', true, false, 1000], 'ritrovato alla riapertura');

  // se l'eroe scelto non ha un modello registrato, vale Pallino finché il modello non arriva
  const disegna = () => {};
  m2.B.eroi.registra({ id: 'pallino', disegna });
  uguale(m2.P.eroeScelto(), 'pallino', 'senza il modello di Saetta si usa Pallino');
  m2.B.eroi.registra({ id: 'saetta', disegna });
  uguale(m2.P.eroeScelto(), 'saetta', 'col modello registrato torna Saetta');
});

prova('effetti(): potenziamenti ed eroe scelto', () => {
  const m = mondo(), P = m.P;
  const neutro = { velocita: 1, ricaricaScatto: 1, durataScatto: 1, risucchio: 1, bolle: 1, perle: 1, morso: 1, cuori: 0, durataCalamita: 0, durataFrenesia: 0, invulnerabile: 0, scudoIniziale: false };
  uguale(P.effetti(), neutro, 'da zero è tutto neutro');
  const e0 = P.effetti(); e0.velocita = 99;
  uguale(P.effetti().velocita, 1, 'ogni chiamata dà un oggetto nuovo');

  porta(m, 'pinne', 1); circa(P.effetti().velocita, 1.06, 'pinne 1');
  porta(m, 'pinne', 3); circa(P.effetti().velocita, 1.18, 'pinne 3');
  porta(m, 'scatto', 1); circa(P.effetti().ricaricaScatto, 0.88, 'scatto 1');
  porta(m, 'scatto', 5); circa(P.effetti().ricaricaScatto, 0.4, 'scatto 5');
  porta(m, 'boccone', 2); circa(P.effetti().risucchio, 1.6, 'boccone 2');
  porta(m, 'generoso', 3); circa(P.effetti().bolle, 1.51, 'generoso 3');
  porta(m, 'cuori', 2); uguale(P.effetti().cuori, 2, 'cuori 2');
  porta(m, 'calamita', 3); uguale(P.effetti().durataCalamita, 6, 'calamita 3');
  porta(m, 'frenesia', 1); uguale(P.effetti().durataFrenesia, 1.5, 'frenesia 1');
  porta(m, 'frenesia', 3); uguale(P.effetti().durataFrenesia, 4.5, 'frenesia 3');
  porta(m, 'fiuto', 3); circa(P.effetti().perle, 1.45, 'fiuto 3');
  uguale(P.effetti().scudoIniziale, false, 'senza scudo');
  porta(m, 'scudo', 1); uguale(P.effetti().scudoIniziale, true, 'con lo scudo');
  uguale([P.effetti().durataScatto, P.effetti().morso, P.effetti().invulnerabile], [1, 1, 0], 'ciò che i potenziamenti non toccano');

  const con = id => { P.guadagna(m.B.cast.eroi.find(e => e.id === id).costo, 'prova'); vero(P.compraEroe(id), 'compro ' + id); return P.effetti(); };
  let e = con('saetta');
  circa(e.velocita, 1.18 * 1.12, 'Saetta: velocità'); circa(e.durataScatto, 1.5, 'Saetta: durata dello scatto');
  e = con('arlecchino');
  circa(e.bolle, 1.51 * 1.3, 'Arlecchino: bolle'); circa(e.perle, 1.45 * 1.25, 'Arlecchino: perle'); circa(e.velocita, 1.18, 'Arlecchino: velocità normale');
  e = con('bolla');
  circa(e.invulnerabile, 1.5, 'Bolla: al sicuro più a lungo'); circa(e.risucchio, 1.6 * 1.15, 'Bolla: risucchio');
  e = con('scoglio');
  uguale(e.cuori, 3, 'Scoglio: un cuore in più'); circa(e.velocita, 1.18 * 0.95, 'Scoglio: un po\' più lento');
  e = con('zanna');
  circa(e.morso, 1.15, 'Zanna: morso'); uguale(e.cuori, 2, 'Zanna: cuori dei soli potenziamenti');
  vero(P.scegliEroe('pallino'), 'torno a Pallino');
  circa(P.effetti().velocita, 1.18, 'Pallino: solo i potenziamenti');
  uguale(Object.keys(P.effetti()).sort(), Object.keys(neutro).sort(), 'tutti i campi previsti');
  // al massimo: scatto, generoso, cuori, calamita, frenesia, fiuto, scudo (pinne è a 3 su 5, boccone a 2 su 5)
  uguale(P.traguardo('non_ti_manca_niente').valore, 7, 'potenziamenti al massimo: 7 su 9');
});

prova('eventi → statistiche', () => {
  const m = mondo(), P = m.P, st = () => P.stato.statistiche;
  m.emetti('partita:inizio', { livello: 1, modalita: 'avventura', ambiente: 'laguna', eroe: 'pallino' });
  for (const id of ['ghiozzo', 'ghiozzo', 'pesce_farfalla']) m.emetti('mangiato', { id, tipo: 'pesce', taglia: 1, potenza: 20, guadagno: 6 });
  m.emetti('pesciolini', { quanti: 12, dorati: 2 });
  m.emetti('pesciolini', { quanti: 5, dorati: 0 });
  m.emetti('pesciolini', { quanti: 0, dorati: 0 });
  m.emetti('colpito', { da: 'murena', cuori: 2 }); m.emetti('colpito', { da: 'medusa', cuori: 2 });
  m.emetti('frenesia', {});
  for (const tipo of ['x2', 'x5', 'calamita', 'scudo', 'perla', 'cuore', 'x2', 'mistero']) m.emetti('aiuto', { tipo });
  for (let i = 0; i < 4; i++) m.emetti('scatto', {});
  m.emetti('cresciuto', { fascia: 1 }); m.emetti('cresciuto', { fascia: 2 });
  m.emetti('gigante:morso', { id: 'don_cernia', rimasti: 2 }); m.emetti('gigante:morso', { id: 'don_cernia', rimasti: 1 });
  m.emetti('gigante:morso', { id: 'don_cernia', rimasti: 0 });
  m.emetti('mangiato', { id: 'don_cernia', tipo: 'gigante', potenza: 300000, guadagno: 1000 });
  P.guadagna(33, 'conchiglia');
  m.emetti('partita:fine', { esito: 'vinto', livello: 1, modalita: 'avventura', ambiente: 'laguna', tempo: 150.5, potenza: 31000.4, colpi: 2, perle: 33, stelle: 2, mangiati: { ghiozzo: 2 } });
  uguale([st().partite, st().vittorie, st().sconfitte, st().vittorieSenzaColpi], [1, 1, 0, 0], 'partite e vittorie');
  uguale([st().pesciMangiati, st().pesciolini, st().dorati], [3, 17, 2], 'pesci, pesciolini, dorati');
  uguale([st().colpiPresi, st().frenesie, st().scatti, st().crescite], [2, 1, 4, 2], 'colpi, frenesie, scatti, crescite');
  uguale(st().aiuti, { x2: 2, x5: 1, calamita: 1, scudo: 1, perla: 1, cuore: 1, altro: 1 }, 'aiuti per tipo');
  uguale([st().gigantiSconfitti, st().morsiGiganti], [1, 3], 'giganti');
  uguale([st().potenzaMassima, st().tempoGioco, st().stelle, st().perleTotali], [31000, 150.5, 2, 33], 'potenza, tempo, stelle, perle');

  gioca(m, 2, { colpi: 0, tempo: 100, potenza: 500, stelle: 3 });
  uguale([st().partite, st().vittorie, st().vittorieSenzaColpi, st().potenzaMassima, st().tempoGioco, st().stelle], [2, 2, 1, 31000, 250.5, 5], 'seconda partita, senza colpi');
  gioca(m, 3, { esito: 'perso', tempo: 30, potenza: 90000 });
  uguale([st().partite, st().vittorie, st().sconfitte, st().potenzaMassima, st().tempoGioco], [3, 2, 1, 90000, 280.5], 'una sconfitta conta per tempo e potenza');
  gioca(m, 3, { esito: 'abbandonato', tempo: 10, potenza: 5 });
  uguale([st().partite, st().vittorie, st().sconfitte], [4, 2, 1], 'una partita abbandonata');

  // se il motore non dice i colpi, valgono quelli contati dagli eventi
  m.emetti('partita:inizio', { livello: 3, modalita: 'avventura' });
  m.emetti('colpito', { da: 'murena', cuori: 2 });
  m.emetti('partita:fine', { esito: 'vinto', livello: 3, modalita: 'avventura', tempo: 50, potenza: 10, stelle: 1 });
  uguale(st().vittorieSenzaColpi, 1, 'vittoria con un colpo: non conta come "senza colpi"');
  m.emetti('partita:inizio', { livello: 3, modalita: 'avventura' });
  m.emetti('partita:fine', { esito: 'vinto', livello: 3, modalita: 'avventura', tempo: 50, potenza: 10, stelle: 1 });
  uguale(st().vittorieSenzaColpi, 2, 'vittoria senza eventi "colpito"');

  const m2 = riapri(m);
  uguale(m2.P.stato.statistiche, P.stato.statistiche, 'statistiche ritrovate alla riapertura');
});

prova('eventi → acquario e specie scoperte', () => {
  const m = mondo(), P = m.P;
  m.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  m.emetti('visto', { id: 'ghiozzo' });
  uguale(P.acquario('ghiozzo'), { visti: 1, mangiati: 0 }, 'visto una volta');
  uguale(m.visti('scoperta'), [{ id: 'ghiozzo', nome: 'Ghiozzo', tipo: 'pesce' }], 'evento "scoperta" alla prima volta');
  m.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  m.emetti('visto', { id: 'ghiozzo' });
  uguale(P.acquario('ghiozzo'), { visti: 2, mangiati: 0 }, 'visto in due partite');
  uguale(m.visti('scoperta').length, 1, 'la scoperta si annuncia una volta sola');
  m.emetti('mangiato', { id: 'murena', tipo: 'pesce', taglia: 4 });
  uguale(P.acquario('murena'), { visti: 1, mangiati: 1 }, 'mangiato senza averlo "visto": vale anche come visto');
  uguale(m.visti('scoperta').length, 2, 'scoperta anche mangiando');
  for (let i = 0; i < 3; i++) m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce', taglia: 1 });
  uguale(P.acquario('ghiozzo'), { visti: 2, mangiati: 3 }, 'mangiato tre volte');
  uguale([P.scoperte(), P.scoperte('pesce'), P.scoperte('gigante'), P.scoperte('laguna'), P.scoperte('alghe')], [2, 2, 0, 2, 0], 'scoperte');
  uguale([P.totaleSpecie('pesce'), P.totaleSpecie('gigante'), P.totaleSpecie('banco'), P.totaleSpecie('pericolo'), P.totaleSpecie('laguna'), P.totaleSpecie('boh')], [62, 8, 6, 7, 11, 0], 'quante specie ci sono');
  uguale(P.totaleSpecie('tutti'), m.B.cast.specie.length, 'tutte le voci del cast');

  // banchi e pericoli si ricordano, ma non contano tra le specie dell'acquario
  m.emetti('visto', { id: 'sardina' }); m.emetti('visto', { id: 'medusa' });
  uguale([P.scoperte(), P.scoperte('banco'), P.scoperte('pericolo'), P.scoperte('tutti')], [2, 1, 1, 4], 'banchi e pericoli a parte');
  m.emetti('pesciolini', { quanti: 10, dorati: 3, id: 'sardina' });
  uguale([P.acquario('sardina'), P.acquario('dorato')], [{ visti: 1, mangiati: 7 }, { visti: 1, mangiati: 3 }], 'pesciolini nell\'acquario (con l\'id del banco)');
  m.emetti('pesciolini', { quanti: 4, dorati: 0 });
  uguale(P.acquario('sardina').mangiati, 7, 'senza id i pesciolini contano solo nelle statistiche');

  // id strani: niente errori, niente voci
  const prima = Object.keys(P.stato.acquario).length;
  for (const id of ['__proto__', 'Ghiozzo', 'pesce farfalla', '', 42, null, undefined, {}, 'x'.repeat(60)]) { m.emetti('visto', { id }); m.emetti('mangiato', { id }); }
  uguale(Object.keys(P.stato.acquario).length, prima, 'nessuna voce per gli id non validi');
  uguale(({}).visti, undefined, 'nessun danno agli oggetti');

  m.suona();   // in partita le modifiche aspettano la sveglia (o la chiusura della pagina): qui passa il tempo
  const m2 = riapri(m);
  uguale([m2.P.acquario('ghiozzo'), m2.P.acquario('murena'), m2.P.scoperte()], [{ visti: 2, mangiati: 3 }, { visti: 1, mangiati: 1 }, 2], 'acquario ritrovato alla riapertura');
});

prova('giganti: il danno dei morsi (il più forte, il totale) e i traguardi da milioni', () => {
  let m = mondo(), P = m.P;
  const st = () => P.stato.statistiche, morso = (danno, vitaRimasta, altro) => m.emetti('gigante:morso', Object.assign({ id: 'don_cernia', danno, vitaRimasta, vitaTotale: 3e6 }, altro));
  const fatti = () => ['morso_da_un_milione', 'morso_da_dieci_milioni', 'cento_milioni'].map(id => P.traguardo(id).fatto);
  uguale([st().morsoMassimo, st().danniGiganti], [0, 0], 'si parte da zero');
  for (const id of ['morso_da_un_milione', 'morso_da_dieci_milioni', 'cento_milioni']) vero(P.TRAGUARDI.some(t => t.id === id && t.premio > 0 && t.gruppo === 'Avventura'), 'c\'è il traguardo ' + id);
  m.emetti('partita:inizio', { livello: 5, modalita: 'avventura' });
  morso(400000, 2600000, { rimasti: 6 }); morso(850000, 1750000, { rimasti: 3 });
  uguale([st().morsiGiganti, st().morsoMassimo, st().danniGiganti], [2, 850000, 1250000], 'due morsi: il più forte e la somma');
  uguale([P.traguardo('morso_da_un_milione').valore, ...fatti()], [850000, false, false, false], 'sotto il milione nessun traguardo');
  morso(600000, 1150000, { rimasti: 2 });
  uguale([st().morsoMassimo, st().danniGiganti], [850000, 1850000], 'un morso più debole non abbassa il massimo');
  morso(1200000.4, 0, { rimasti: 0 });
  uguale([st().morsoMassimo, st().danniGiganti, st().gigantiSconfitti], [1200000, 3050000, 1], 'il morso che lo finisce conta, e il gigante è sconfitto');
  uguale(fatti(), [true, false, false], 'morso da un milione');
  uguale(m.visti('traguardo').filter(d => d.id === 'morso_da_un_milione').length, 1, 'annunciato una volta');
  m.emetti('mangiato', { id: 'don_cernia', tipo: 'gigante', potenza: 0, guadagno: 900000 });
  uguale([st().gigantiSconfitti, P.acquario('don_cernia').mangiati], [1, 1], 'morso finale e "mangiato": una sconfitta sola');
  // senza "rimasti" la sconfitta si riconosce dalla vita rimasta a zero
  m.emetti('partita:inizio', { livello: 10, modalita: 'avventura' });
  m.emetti('gigante:morso', { id: 'piovra', danno: 2e6, vitaRimasta: 3e6, vitaTotale: 5e6 });
  uguale(st().gigantiSconfitti, 1, 'con la vita che resta non è sconfitto');
  m.emetti('gigante:morso', { id: 'piovra', danno: 3e6, vitaRimasta: 0, vitaTotale: 5e6 }); m.emetti('mangiato', { id: 'piovra', tipo: 'gigante' });
  uguale([st().gigantiSconfitti, P.acquario('piovra').mangiati, st().morsoMassimo, st().danniGiganti], [2, 1, 3000000, 8050000], 'vita a zero: sconfitto una volta');
  // danni rovinati non contano (ma il morso sì), e i morsi di una volta (senza danno) funzionano ancora
  const errori = m.errori.length;
  for (const danno of [NaN, -5, 'tanto', Infinity, null, undefined, {}]) morso(danno, 1e6, { rimasti: 1 });
  m.emetti('gigante:morso', { id: 'don_cernia', rimasti: 2 }); m.emetti('gigante:morso', null);
  uguale([st().morsiGiganti, st().morsoMassimo, st().danniGiganti, m.errori.length - errori], [15, 3000000, 8050000, 0], 'danni rovinati ignorati senza errori');
  // dieci milioni in un morso, cento milioni in tutto
  morso(12.5e6, 5e6, { rimasti: 1 });
  uguale([st().morsoMassimo, ...fatti()], [12500000, true, true, false], 'morso da dieci milioni');
  for (let i = 0; i < 8; i++) morso(1e7, 1e6, { rimasti: 1 });
  uguale([st().danniGiganti, ...fatti()], [100550000, true, true, true], 'cento milioni di danni');
  morso(Number.MAX_SAFE_INTEGER * 4, 1, { rimasti: 1 });
  vero(st().morsoMassimo <= Number.MAX_SAFE_INTEGER && st().danniGiganti <= Number.MAX_SAFE_INTEGER, 'i numeri enormi restano interi sicuri');
  const premi = ['morso_da_un_milione', 'morso_da_dieci_milioni', 'cento_milioni'].map(id => P.riscuoti(id));
  vero(premi.every(n => n > 0) && premi[0] < premi[1] && premi[1] < premi[2], 'premi crescenti: ' + premi.join(', '));
  // alla riapertura si ritrova tutto; un salvataggio di prima (senza i due contatori) riparte da zero senza perdere il resto
  m.emetti('partita:fine', { esito: 'vinto', livello: 10, modalita: 'avventura', stelle: 2, tempo: 200, potenza: 3e6 });
  const m2 = riapri(m);
  uguale([m2.P.traguardo('cento_milioni').riscosso, m2.P.stato.statistiche.morsoMassimo > 1e7, m2.P.stato.statistiche.danniGiganti > 1e8], [true, true, true], 'salvato e ritrovato');
  const vecchio = JSON.parse(JSON.stringify(m.salvato()));
  delete vecchio.statistiche.morsoMassimo; delete vecchio.statistiche.danniGiganti; delete vecchio.traguardi.morso_da_un_milione;
  const m3 = mondo({ archivio: archivioFinto({ 'boccone-salvataggio-3': JSON.stringify(vecchio) }) });
  uguale([m3.P.stato.statistiche.morsoMassimo, m3.P.stato.statistiche.danniGiganti, m3.P.stato.statistiche.morsiGiganti, m3.P.traguardo('morso_da_un_milione').fatto],
    [0, 0, st().morsiGiganti, false], 'salvataggio di prima: contatori nuovi a zero');
});

prova('giganti: la sconfitta si conta una volta sola', () => {
  const quanti = P => [P.stato.statistiche.gigantiSconfitti, P.acquario('piovra').mangiati, P.stato.statistiche.pesciMangiati];
  let m = mondo();
  m.emetti('partita:inizio', {}); m.emetti('mangiato', { id: 'piovra', tipo: 'gigante' });
  uguale(quanti(m.P), [1, 1, 0], 'solo "mangiato"');
  m = mondo();
  m.emetti('partita:inizio', {}); m.emetti('gigante:morso', { id: 'piovra', rimasti: 1 }); m.emetti('gigante:morso', { id: 'piovra', rimasti: 0 });
  uguale(quanti(m.P), [1, 1, 0], 'solo l\'ultimo morso');
  m = mondo();
  m.emetti('partita:inizio', {}); m.emetti('gigante:morso', { id: 'piovra', rimasti: 0 }); m.emetti('mangiato', { id: 'piovra', tipo: 'gigante' });
  uguale(quanti(m.P), [1, 1, 0], 'morso e poi mangiato');
  m = mondo();
  m.emetti('partita:inizio', {}); m.emetti('mangiato', { id: 'piovra', tipo: 'gigante' }); m.emetti('gigante:morso', { id: 'piovra', rimasti: 0 });
  uguale(quanti(m.P), [1, 1, 0], 'mangiato e poi morso');
  m = mondo();
  for (let i = 0; i < 2; i++) {
    m.emetti('partita:inizio', {});
    for (const rimasti of [2, 1, 0]) m.emetti('gigante:morso', { id: 'piovra', rimasti });
    m.emetti('mangiato', { id: 'piovra', tipo: 'gigante' });
    m.emetti('partita:fine', { esito: 'vinto', livello: 10, modalita: 'avventura', stelle: 1, tempo: 60, potenza: 9 });
  }
  uguale(quanti(m.P), [2, 2, 0], 'due partite, due sconfitte');
  uguale(m.P.stato.statistiche.morsiGiganti, 6, 'sei morsi');
  m = mondo();
  m.emetti('partita:inizio', {}); m.emetti('mangiato', { id: 'piovra' });
  uguale(quanti(m.P), [1, 1, 0], 'senza "tipo" il gigante si riconosce dal cast');
  m.emetti('mangiato', { id: 'piovra' });
  uguale(quanti(m.P), [2, 2, 0], 'due volte nella stessa partita (solo "mangiato")');
  uguale(m.P.traguardo('piccolo_ma_tosto').fatto, true, 'traguardo del primo gigante');
});

prova('livelli, stelle e sblocchi', () => {
  const m = mondo(), P = m.P;
  gioca(m, 1, { stelle: 2 });
  uguale([P.stelle(1), P.livelloMax(), P.livelloSbloccato(2), P.livelloSbloccato(3), P.livelliSuperati()], [2, 2, true, false, 1], 'vinto il livello 1 con 2 stelle');
  uguale(m.salvato().stelle, { 1: 2 }, 'scritto subito a fine partita');
  gioca(m, 1, { stelle: 1 });
  uguale([P.stelle(1), P.livelloMax()], [2, 2], 'rigiocato peggio: restano le stelle migliori');
  gioca(m, 1, { stelle: 3 });
  uguale([P.stelle(1), P.stelleTotali()], [3, 3], 'rigiocato meglio');
  gioca(m, 2, { esito: 'perso' });
  uguale([P.stelle(2), P.livelloMax()], [0, 2], 'una sconfitta non sblocca niente');
  gioca(m, 2, { esito: 'abbandonato' });
  uguale([P.stelle(2), P.livelloMax()], [0, 2], 'nemmeno una partita abbandonata');
  gioca(m, 2, { stelle: 7 });
  uguale(P.stelle(2), 3, 'mai più di tre stelle');
  m.emetti('partita:fine', { esito: 'vinto', livello: 3, modalita: 'avventura', tempo: 60, potenza: 100, colpi: 1 });
  uguale([P.stelle(3), P.livelloMax()], [1, 4], 'vittoria senza il numero di stelle: almeno una');
  for (const livello of [0, 41, 2.5, '4', null]) m.emetti('partita:fine', { esito: 'vinto', livello, modalita: 'avventura', tempo: 1, potenza: 1, colpi: 1, stelle: 3 });
  uguale([P.livelloMax(), P.stelleTotali()], [4, 7], 'livelli impossibili ignorati');

  vero(!P.sopravvivenzaSbloccata(), 'sopravvivenza chiusa prima del livello 5');
  gioca(m, 4, { stelle: 1 });
  vero(!P.sopravvivenzaSbloccata(), 'ancora chiusa dopo il livello 4');
  gioca(m, 5, { stelle: 1 });
  vero(P.sopravvivenzaSbloccata(), 'aperta dopo il livello 5');
  uguale(P.livelloMax(), 6, 'livello 6 aperto');

  for (let n = 6; n <= 40; n++) gioca(m, n, { stelle: 3 });
  uguale([P.livelloMax(), P.livelliSuperati(), P.livelloSbloccato(40), P.livelloSbloccato(41), P.stelle(40)], [40, 40, true, false, 3], 'avventura finita');
  uguale(P.traguardo('re_degli_oceani').fatto, true, 'traguardo "tutti i livelli"');
  const m2 = riapri(m);
  uguale([m2.P.livelloMax(), m2.P.livelliSuperati(), m2.P.stelleTotali(), m2.P.sopravvivenzaSbloccata()], [40, 40, P.stelleTotali(), true], 'ritrovato alla riapertura');
});

prova('sopravvivenza: record', () => {
  const m = mondo(), P = m.P;
  gioca(m, 1, { modalita: 'sopravvivenza', esito: 'perso', potenza: 5000.7, tempo: 200.26 });
  uguale(P.recordSopravvivenza(), { potenza: 5001, tempo: 200.26 }, 'primo record');
  gioca(m, 1, { modalita: 'sopravvivenza', esito: 'perso', potenza: 3000, tempo: 400 });
  uguale(P.recordSopravvivenza(), { potenza: 5001, tempo: 400 }, 'i due massimi, anche di partite diverse');
  gioca(m, 1, { modalita: 'sopravvivenza', esito: 'abbandonato', potenza: 9000, tempo: 10 });
  uguale(P.recordSopravvivenza(), { potenza: 9000, tempo: 400 }, 'vale anche una partita abbandonata');
  gioca(m, 1, { modalita: 'avventura', esito: 'perso', potenza: 999999, tempo: 999 });
  uguale(P.recordSopravvivenza(), { potenza: 9000, tempo: 400 }, 'l\'avventura non tocca il record');
  gioca(m, 3, { modalita: 'sopravvivenza', esito: 'vinto', potenza: 1, tempo: 1, stelle: 3 });
  uguale([P.livelloMax(), P.stelleTotali(), P.stato.statistiche.vittorie], [1, 0, 0], 'la sopravvivenza non sblocca livelli e non dà stelle');
  uguale([P.stato.statistiche.partite, P.stato.statistiche.partiteSopravvivenza], [5, 4], 'partite contate');
  uguale([P.traguardo('osso_duro').fatto, P.traguardo('osso_duro').valore, P.traguardo('irriducibile').valore], [true, 3, 6], 'traguardi a tempo (in minuti)');
  const copia = P.recordSopravvivenza(); copia.potenza = 0;
  uguale(P.recordSopravvivenza().potenza, 9000, 'il record restituito è una copia');
  uguale(riapri(m).P.recordSopravvivenza(), { potenza: 9000, tempo: 400 }, 'ritrovato alla riapertura');
});

prova('traguardi: annuncio, avanzamento e riscossione del premio', () => {
  const m = mondo(), P = m.P;
  m.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' });
  uguale(m.visti('traguardo'), [{ id: 'primo_boccone', nome: 'Primo boccone', premio: 10 }], 'evento "traguardo"');
  vero(m.visti('progressi').some(d => d.motivo === 'traguardo'), 'evento progressi con motivo "traguardo"');
  uguale(P.traguardo('primo_boccone'), { valore: 1, fatto: true, riscosso: false }, 'fatto, da ritirare');
  uguale(P.daRiscuotere(), 1, 'un premio da ritirare');
  m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' });
  uguale(m.visti('traguardo').length, 1, 'lo stesso traguardo non si annuncia due volte');
  uguale(P.traguardo('buona_forchetta'), { valore: 2, fatto: false, riscosso: false }, 'avanzamento di un traguardo più lungo');
  uguale(P.riscuoti('buona_forchetta'), 0, 'niente premio se non è fatto');
  uguale([P.riscuoti('boh'), P.riscuoti(), P.traguardo('boh')], [0, 0, { valore: 0, fatto: false, riscosso: false }], 'traguardo che non esiste');

  m.dimentica();
  uguale(P.riscuoti('primo_boccone'), 10, 'premio incassato');
  uguale([P.perle(), P.daRiscuotere()], [10, 0], 'perle in tasca');
  uguale(P.traguardo('primo_boccone'), { valore: 1, fatto: true, riscosso: true }, 'ritirato');
  uguale(m.visti('perle'), [{ quante: 10, motivo: 'traguardo' }], 'evento "perle" con motivo "traguardo"');
  uguale(P.riscuoti('primo_boccone'), 0, 'il premio si ritira una volta sola');
  uguale(P.perle(), 10, 'e le perle non cambiano');
  uguale(m.salvato().traguardi.primo_boccone, { fatto: true, riscosso: true }, 'scritto subito');

  // più traguardi insieme, e "ritira tutto"
  for (let i = 0; i < 10; i++) m.emetti('scatto', {});
  for (let i = 0; i < 5; i++) m.emetti('aiuto', { tipo: 'x2' });
  m.emetti('frenesia', {});
  uguale(m.visti('traguardo').map(d => d.id), ['colpo_di_coda', 'bolla_fortunata', 'fame_da_lupi'], 'tre traguardi in fila');
  uguale(P.daRiscuotere(), 3, 'tre premi da ritirare');
  uguale(P.riscuotiTutti(), 10 + 10 + 15, 'ritira tutto');
  uguale([P.perle(), P.daRiscuotere(), P.riscuotiTutti()], [45, 0, 0], 'tutto ritirato');

  const m2 = riapri(m);
  uguale([m2.P.traguardo('primo_boccone'), m2.P.traguardo('colpo_di_coda').riscosso, m2.P.perle()], [{ valore: 1, fatto: true, riscosso: true }, true, 45], 'ritrovato alla riapertura');
  m2.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' });
  uguale(m2.visti('traguardo').length, 0, 'niente annunci ripetuti dopo la riapertura');

  // un premio ritirato può far scattare un altro traguardo (le perle guadagnate in tutto)
  const n = mondo();
  n.P.guadagna(90, 'prova');
  n.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' });
  uguale(n.P.traguardo('primo_gruzzolo').fatto, false, '90 perle non bastano per il primo gruzzolo');
  n.P.riscuoti('primo_boccone');
  uguale([n.P.stato.statistiche.perleTotali, n.P.traguardo('primo_gruzzolo').fatto], [100, true], 'con il premio si arriva a 100');
});

prova('traguardi: quelli già meritati al caricamento si segnano in silenzio', () => {
  const archivio = archivioFinto({ [CHIAVE]: { perle: 3, statistiche: { pesciMangiati: 150, scatti: 3 } } });
  const m = mondo({ archivio }), P = m.P;
  uguale([P.traguardo('primo_boccone').fatto, P.traguardo('buona_forchetta').fatto, P.traguardo('buona_forchetta').riscosso], [true, true, false], 'fatti, da ritirare');
  uguale(P.daRiscuotere(), 2, 'due premi pronti');
  m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' });
  uguale(m.visti('traguardo').length, 0, 'nessun annuncio in ritardo');
  uguale(P.riscuoti('buona_forchetta'), 20, 'il premio si può ritirare');
});

prova('traguardi dell\'acquario: per ambiente, e con una parte sola dei contenuti', () => {
  const m = mondo(), P = m.P, cast = m.B.cast;
  const laguna = cast.specie.filter(s => (s.tipo === 'pesce' || s.tipo === 'gigante') && s.ambienti.includes('laguna')).map(s => s.id);
  uguale(laguna.length, 11, 'abitanti della laguna nel cast');
  m.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  for (const id of laguna.slice(0, 10)) m.emetti('visto', { id });
  uguale([P.traguardo('abitanti_laguna').valore, P.traguardo('abitanti_laguna').fatto, P.traguardo('curiosone').fatto], [10, false, true], 'dieci su undici');
  m.emetti('visto', { id: laguna[10] });
  uguale(P.traguardo('abitanti_laguna').fatto, true, 'tutti gli abitanti della laguna');
  uguale(m.visti('traguardo').map(d => d.id), ['curiosone', 'abitanti_laguna'], 'annunciati');
  // ghiozzo, pesce chirurgo, pesce balestra e murena vivono anche tra le rovine
  uguale(P.traguardo('abitanti_rovine').valore, 4, 'le specie che vivono in più ambienti contano in ognuno');
  uguale([P.traguardo('buongustaio').valore, P.traguardo('enciclopedia_del_mare').valore], [0, 11], 'visti non vuol dire assaggiati');

  // con pochi modelli registrati i traguardi "tutte le specie" si misurano su quelli
  const n = mondo(), disegna = () => {};
  for (const id of ['ghiozzo', 'murena', 'don_cernia', 'sardina']) n.B.specie.registra({ id, disegna });
  n.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  uguale([n.P.totaleSpecie(), n.P.totaleSpecie('gigante'), n.P.totaleSpecie('banco'), n.P.totaleSpecie('laguna')], [3, 1, 1, 3], 'catalogo ridotto ai modelli presenti');
  uguale([n.P.TRAGUARDI.find(t => t.id === 'enciclopedia_del_mare').obiettivo, n.P.TRAGUARDI.find(t => t.id === 'abitanti_laguna').obiettivo], [3, 3], 'obiettivi adattati');
  for (const id of ['ghiozzo', 'murena']) n.emetti('mangiato', { id, tipo: 'pesce' });
  n.emetti('mangiato', { id: 'don_cernia', tipo: 'gigante' });
  uguale(['enciclopedia_del_mare', 'mangiatutto', 'abitanti_laguna', 'il_piu_grosso'].map(id => n.P.traguardo(id).fatto), [true, true, true, true], 'raggiungibili anche così');
  vero(Number.isInteger(n.P.TRAGUARDI.find(t => t.id === 'abitanti_abisso').obiettivo) && !n.P.traguardo('abitanti_abisso').fatto, 'un ambiente senza specie non risulta completato');
});

prova('regalo del giorno: serie, salti e ricominci', () => {
  const m = mondo({ oggi: '2026-03-01' }), P = m.P;
  let r = P.regalo();
  uguale([r.disponibile, r.serie, r.perle, r.giorno], [true, 0, 20, 1], 'primo giorno');
  uguale(P.riscuotiRegalo(), { perle: 20, serie: 1 }, 'ritirato');
  uguale(m.visti('perle'), [{ quante: 20, motivo: 'regalo' }], 'evento "perle" con motivo "regalo"');
  r = P.regalo();
  uguale([r.disponibile, r.serie, r.perle, r.giorno], [false, 1, 30, 2], 'lo stesso giorno: già ritirato, domani 30');
  uguale(P.riscuotiRegalo(), null, 'non si ritira due volte nello stesso giorno');
  uguale(P.perle(), 20, 'perle del primo giorno');

  const attesi = [30, 40, 50, 60, 80, 120];
  for (let i = 0; i < attesi.length; i++) {
    m.orologio.giorno = '2026-03-0' + (i + 2);
    vero(P.regalo().disponibile, 'giorno ' + (i + 2) + ' disponibile');
    uguale(P.riscuotiRegalo(), { perle: attesi[i], serie: i + 2 }, 'giorno ' + (i + 2));
  }
  uguale(P.perle(), 400, 'una settimana intera');
  uguale([P.traguardo('buongiorno_mare').fatto, P.traguardo('chi_ben_comincia').fatto, P.traguardo('sette_su_sette').fatto], [true, true, true], 'traguardi della costanza');
  m.orologio.giorno = '2026-03-08';
  uguale(P.riscuotiRegalo(), { perle: 20, serie: 8 }, 'l\'ottavo giorno i premi ricominciano, la serie continua');
  m.orologio.giorno = '2026-03-09';
  uguale(P.riscuotiRegalo(), { perle: 30, serie: 9 }, 'nono giorno');

  m.orologio.giorno = '2026-03-11';                       // saltato il 10
  r = P.regalo();
  uguale([r.disponibile, r.serie, r.perle, r.giorno], [true, 0, 20, 1], 'saltato un giorno: la serie riparte');
  uguale(P.riscuotiRegalo(), { perle: 20, serie: 1 }, 'si ricomincia da 20');
  m.orologio.giorno = '2026-03-12';
  uguale(P.riscuotiRegalo(), { perle: 30, serie: 2 }, 'e poi 30');
  uguale([P.stato.statistiche.regali, P.stato.statistiche.serieMassima], [11, 9], 'regali ritirati e serie più lunga');

  // riaprendo il gioco il giorno dopo la serie continua; lo stesso giorno il regalo resta ritirato
  let m2 = riapri(m);
  uguale([m2.P.regalo().disponibile, m2.P.riscuotiRegalo()], [false, null], 'riaperto lo stesso giorno');
  m2 = riapri(m, { oggi: '2026-03-13' });
  uguale(m2.P.riscuotiRegalo(), { perle: 40, serie: 3 }, 'riaperto il giorno dopo');

  // fine mese, fine anno, anno bisestile
  const giro = (giorni, perle) => { const w = mondo({ oggi: giorni[0] }); const presi = giorni.map(g => { w.orologio.giorno = g; const x = w.P.riscuotiRegalo(); return x && x.perle; }); uguale(presi, perle, giorni.join(' → ')); };
  giro(['2026-03-31', '2026-04-01', '2026-04-02'], [20, 30, 40]);
  giro(['2026-12-31', '2027-01-01'], [20, 30]);
  giro(['2028-02-28', '2028-02-29', '2028-03-01'], [20, 30, 40]);
  giro(['2027-02-28', '2027-03-01'], [20, 30]);
  giro(['2026-10-24', '2026-10-25', '2026-10-26'], [20, 30, 40]);          // cambio dell'ora: i giorni restano giorni
  giro(['2026-05-01', '2026-05-03'], [20, 20]);

  // orologio spostato
  const o = mondo({ oggi: '2026-06-10' });
  o.P.riscuotiRegalo(); o.orologio.giorno = '2026-06-11'; o.P.riscuotiRegalo();
  o.orologio.giorno = '2026-06-10';
  uguale([o.P.regalo().disponibile, o.P.regalo().serie, o.P.riscuotiRegalo()], [false, 2, null], 'orologio indietro di un giorno: si aspetta, la serie resta');
  o.orologio.giorno = '2026-06-12';
  uguale(o.P.riscuotiRegalo(), { perle: 40, serie: 3 }, 'e poi continua');
  o.orologio.giorno = '2026-01-01';
  uguale(o.P.riscuotiRegalo(), { perle: 20, serie: 1 }, 'orologio molto indietro: si riparte');
  for (const strano of ['boh', '', null, undefined, 20260301, '2026-13-01', '2026-3-1']) {
    o.orologio.giorno = strano;
    uguale([o.P.regalo().disponibile, o.P.riscuotiRegalo()], [false, null], 'data di oggi non valida (' + String(strano) + ')');
  }
});

prova('impostazioni', () => {
  const m = mondo(), P = m.P;
  vero(P.imposta('suoni', false), 'tolgo i suoni');
  uguale(P.impostazione('suoni'), false, 'suoni spenti');
  uguale(m.visti('impostazioni'), [{ chiave: 'suoni', valore: false }], 'evento "impostazioni"');
  vero(m.visti('progressi').some(d => d.motivo === 'impostazioni'), 'evento "progressi"');
  uguale(m.salvato().impostazioni.suoni, false, 'scritto subito');
  m.dimentica();
  vero(P.imposta('suoni', false), 'lo stesso valore va bene');
  uguale(m.eventi.length, 0, 'ma non fa rumore');
  for (const [chiave, valore] of [['suoni', 'no'], ['suoni', 0], ['musica', null], ['vibrazione', 'true'], ['qualita', 'ultra'], ['qualita', true], ['mano', 'centro'], ['boh', true], ['toString', 'x'], [undefined, 1]])
    vero(!P.imposta(chiave, valore), 'rifiutato: ' + String(chiave) + ' = ' + String(valore));
  uguale(m.eventi.length, 0, 'i valori rifiutati non emettono eventi');
  for (const q of ['alta', 'media', 'bassa', 'auto']) { vero(P.imposta('qualita', q), 'qualità ' + q); uguale(P.impostazione('qualita'), q, 'qualità'); }
  vero(P.imposta('mano', 'sinistra') && P.imposta('musica', false) && P.imposta('vibrazione', false) && P.imposta('qualita', 'bassa'), 'cambio le altre');

  // chi emette l'evento senza passare da imposta() viene ascoltato lo stesso
  m.emetti('impostazioni', { chiave: 'musica', valore: true });
  uguale(P.impostazione('musica'), true, 'evento emesso da fuori');
  m.emetti('impostazioni', { chiave: 'musica', valore: 'forte' }); m.emetti('impostazioni', { chiave: 'boh', valore: 1 }); m.emetti('impostazioni', null);
  uguale(P.impostazione('musica'), true, 'valori non validi ignorati');

  const m2 = riapri(m);
  uguale(['suoni', 'musica', 'vibrazione', 'qualita', 'mano'].map(k => m2.P.impostazione(k)), [false, true, false, 'bassa', 'sinistra'], 'ritrovate alla riapertura');
  vero(!m2.P.tutorialFatto(), 'tutorial da fare');
  m2.P.segnaTutorial();
  vero(m2.P.tutorialFatto() && riapri(m2).P.tutorialFatto(), 'tutorial segnato e ritrovato');
});

prova('dati corrotti o mancanti → valori predefiniti', () => {
  const sano = P => {
    uguale([P.perle(), P.livelloMax(), P.eroeScelto(), P.stelleTotali(), P.scoperte(), P.daRiscuotere()], [0, 1, 'pallino', 0, 0, 0], 'stato di partenza');
    uguale(P.impostazione('qualita'), 'auto', 'impostazioni predefinite');
  };
  for (const grezzo of ['questo non è json {{{', '', 'null', '42', '"ciao"', '[1,2,3]', 'true', '{"perle":', '{}']) {
    const m = mondo({ archivio: archivioFinto({ [CHIAVE]: grezzo }) });
    sano(m.P);
    m.P.guadagna(7, 'prova');
    uguale(m.salvato().perle, 7, 'dopo "' + grezzo + '" si salva normalmente');
  }

  const rovinato = {
    versione: 'tre', perle: -50, potenziamenti: 'tanti', eroe: 'squalo_bianco', eroi: ['saetta'], livelloMax: 'dieci',
    stelle: { 1: 9, 2: -1, 3: 'tre', 99: 3, abc: 2 }, record: 'alto',
    acquario: { ghiozzo: { visti: 'molti', mangiati: 4 }, '<b>': { visti: 1 }, murena: null, triglia: { visti: 0, mangiati: 0 }, tonno: { visti: 2.9 } },
    statistiche: { partite: -3, aiuti: 7, pesciMangiati: 12.7, tempoGioco: 'un po\'', scatti: null },
    traguardi: [1, 2], regalo: { ultimo: '31/12/2026', serie: 5 }, impostazioni: { suoni: 'forte', qualita: 'bassa', mano: 7 }, tutorial: 'sì', importatoV2: true,
  };
  const m = mondo({ archivio: archivioFinto({ [CHIAVE]: rovinato }) }), P = m.P;
  uguale([P.perle(), P.eroeScelto(), P.eroePosseduto('saetta'), P.stato.versione], [0, 'pallino', false, 3], 'perle, eroe, versione');
  for (const p of P.POTENZIAMENTI) uguale(P.livelloPotenziamento(p.id), 0, 'potenziamento ' + p.id);
  uguale([P.stelle(1), P.stelle(2), P.stelle(3), P.stelleTotali(), P.livelloMax()], [3, 0, 0, 3, 2], 'stelle riportate nei limiti (e il livello dopo aperto)');
  uguale(P.recordSopravvivenza(), { potenza: 0, tempo: 0 }, 'record');
  uguale([P.acquario('ghiozzo'), P.acquario('murena'), P.acquario('triglia'), P.acquario('tonno')], [{ visti: 1, mangiati: 4 }, { visti: 0, mangiati: 0 }, { visti: 0, mangiati: 0 }, { visti: 2, mangiati: 0 }], 'acquario');
  uguale(Object.keys(P.stato.acquario).sort(), ['ghiozzo', 'tonno'], 'voci dell\'acquario');
  const st = P.stato.statistiche;
  uguale([st.partite, st.pesciMangiati, st.tempoGioco, st.scatti, st.aiuti.x2, st.stelle], [0, 12, 0, 0, 0, 3], 'statistiche');
  uguale([P.regalo().disponibile, P.regalo().serie], [true, 0], 'regalo');
  uguale([P.impostazione('suoni'), P.impostazione('qualita'), P.impostazione('mano')], [true, 'bassa', 'destra'], 'impostazioni: buone tenute, rovinate rifatte');
  vero(!P.tutorialFatto(), 'tutorial');
  for (const n of [st.partite, st.perleTotali, st.colpiPresi, st.aiuti.altro, P.perle()]) vero(Number.isFinite(n) && n >= 0, 'numeri sani');
  gioca(m, 2, { stelle: 2 }); m.emetti('mangiato', { id: 'murena', tipo: 'pesce' }); P.guadagna(10, 'prova');
  uguale([P.stelle(2), P.acquario('murena').mangiati, P.perle()], [2, 1, 10], 'dopo la pulizia il gioco funziona');
  vero(JSON.stringify(m.salvato()).length > 100, 'e si salva');

  // valori fuori misura
  const f = mondo({ archivio: archivioFinto({ [CHIAVE]: '{"perle":1e999,"potenziamenti":{"pinne":99,"scudo":5,"cuori":2.9,"fiuto":-2},"livelloMax":1000,"record":{"potenza":-5,"tempo":1e999},"regalo":{"ultimo":"2026-02-28","serie":-4}}' }) }).P;
  uguale([f.perle(), f.livelloPotenziamento('pinne'), f.livelloPotenziamento('scudo'), f.livelloPotenziamento('cuori'), f.livelloPotenziamento('fiuto')], [99999999, 5, 1, 2, 0], 'tetti rispettati');
  uguale([f.livelloMax(), f.livelliSuperati(), f.recordSopravvivenza()], [40, 40, { potenza: 0, tempo: 0 }], 'livelli e record');
  uguale([f.regalo().disponibile, f.regalo().serie, f.regalo().perle], [true, 1, 30], 'regalo di ieri con serie rovinata: vale 1');

  // eroe scelto ma non posseduto, e posseduto davvero
  uguale(mondo({ archivio: archivioFinto({ [CHIAVE]: { eroe: 'zanna' } }) }).P.eroeScelto(), 'pallino', 'eroe scelto senza averlo');
  uguale(mondo({ archivio: archivioFinto({ [CHIAVE]: { eroe: 'zanna', eroi: { zanna: true } } }) }).P.eroeScelto(), 'zanna', 'eroe scelto e posseduto');
  uguale(mondo({ archivio: archivioFinto({ [CHIAVE]: { eroi: { pallino: false } } }) }).P.eroePosseduto('pallino'), true, 'Pallino non si perde mai');
});

prova('campi nuovi aggiunti senza perdere i vecchi', () => {
  // un salvataggio "vecchio", con pochi campi: i mancanti prendono i valori predefiniti
  const m = mondo({ archivio: archivioFinto({ [CHIAVE]: { perle: 50, potenziamenti: { pinne: 2 }, statistiche: { partite: 4 }, impostazioni: { mano: 'sinistra' } } }) }), P = m.P;
  uguale([P.perle(), P.livelloPotenziamento('pinne'), P.livelloPotenziamento('fiuto'), P.stato.statistiche.partite, P.stato.statistiche.frenesie], [50, 2, 0, 4, 0], 'vecchi tenuti, nuovi a zero');
  uguale([P.impostazione('mano'), P.impostazione('suoni'), P.impostazione('qualita')], ['sinistra', true, 'auto'], 'impostazioni completate');
  uguale(Object.keys(P.stato.statistiche.aiuti).sort(), ['altro', 'calamita', 'cuore', 'perla', 'scudo', 'x2', 'x5'], 'statistiche complete');
  uguale(Object.keys(P.stato).sort(), ['acquario', 'eroe', 'eroi', 'importatoV2', 'impostazioni', 'livelloMax', 'perle', 'potenziamenti', 'record', 'regalo', 'statistiche', 'stelle', 'traguardi', 'tutorial', 'versione'], 'tutti i campi dello stato');

  // un salvataggio "più nuovo", con campi che questa versione non conosce: restano dove sono
  const n = mondo({ archivio: archivioFinto({ [CHIAVE]: { perle: 5, futuro: { a: [1, 2] }, impostazioni: { suoni: false, lingua: 'it' }, statistiche: { partite: 3, salti: 9 }, potenziamenti: { turbo: 2, pinne: 1 }, eroi: { delfino: true }, traguardi: { di_domani: { fatto: true, riscosso: true } } } }) });
  n.P.guadagna(1, 'prova'); n.P.salva();
  const s = n.salvato();
  uguale([s.perle, s.futuro, s.impostazioni.lingua, s.impostazioni.suoni, s.statistiche.salti, s.statistiche.partite, s.potenziamenti.turbo, s.potenziamenti.pinne, s.eroi.delfino, s.traguardi.di_domani],
    [6, { a: [1, 2] }, 'it', false, 9, 3, 2, 1, true, { fatto: true, riscosso: true }], 'campi sconosciuti conservati');
  vero(!n.P.eroePosseduto('delfino') && n.P.livelloPotenziamento('turbo') === 0, 'ma non hanno effetto in questa versione');
  uguale(n.P.traguardo('non_ti_manca_niente').valore, 0, 'e non confondono i traguardi');
});

prova('scritture: al massimo ogni 2 secondi in partita, subito quando conta', () => {
  const m = mondo({ pagina: true }), P = m.P, A = m.archivio;
  m.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  uguale(A.scritture, 1, 'la prima modifica si scrive');
  for (let i = 0; i < 10; i++) m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' });
  P.guadagna(5, 'conchiglia');
  uguale([A.scritture, m.sveglieAttive()], [1, 1], 'poi si aspetta, con una sola sveglia');
  uguale(m.salvato().statistiche.pesciMangiati, 0, 'il salvataggio è ancora quello di prima');
  m.orologio.ms += 1999; m.emetti('scatto', {});
  uguale(A.scritture, 1, 'dopo 1999 millisecondi ancora niente');
  m.orologio.ms += 1; m.emetti('scatto', {});
  uguale([A.scritture, m.sveglieAttive()], [2, 0], 'dopo 2 secondi si scrive (e la sveglia si spegne)');
  uguale([m.salvato().statistiche.pesciMangiati, m.salvato().perle], [10, 5], 'con tutto dentro');
  m.emetti('frenesia', {});
  uguale([A.scritture, m.sveglieAttive()], [2, 1], 'di nuovo in attesa');
  m.orologio.ms += 2000; m.suona();
  uguale([A.scritture, m.salvato().statistiche.frenesie], [3, 1], 'la sveglia scrive l\'ultima modifica');
  m.suona();
  uguale(A.scritture, 3, 'niente scritture a vuoto');

  // una partita di un minuto con dieci eventi al secondo
  const prima = A.scritture;
  for (let i = 0; i < 600; i++) { m.orologio.ms += 100; m.emetti('pesciolini', { quanti: 3, dorati: 0 }); }
  vero(A.scritture - prima <= 30, 'in 60 secondi al massimo 30 scritture (sono ' + (A.scritture - prima) + ')');
  vero(A.scritture - prima >= 25, 'ma il salvataggio resta aggiornato (sono ' + (A.scritture - prima) + ')');

  // subito: acquisti, fine partita, pagina in secondo piano
  let n = A.scritture;
  P.guadagna(40, 'prova'); uguale(A.scritture, n, 'guadagnare perle in partita aspetta');
  vero(P.compraPotenziamento('pinne'), 'compro in partita'); uguale(A.scritture, ++n, 'l\'acquisto si scrive subito');
  m.emetti('scatto', {}); uguale(A.scritture, n, 'in attesa');
  m.nascondi(); uguale(A.scritture, ++n, 'pagina in secondo piano: si scrive subito');
  m.nascondi(); uguale(A.scritture, n, 'se non c\'è niente di nuovo non si scrive');
  m.mostra(); m.emetti('scatto', {}); uguale(A.scritture, n, 'tornati in primo piano, in attesa');
  m.chiudi(); uguale(A.scritture, ++n, 'pagina che si chiude: si scrive subito');
  m.emetti('scatto', {});
  m.emetti('partita:fine', { esito: 'vinto', livello: 1, modalita: 'avventura', tempo: 61, potenza: 30000, colpi: 0, stelle: 3 });
  uguale(A.scritture, ++n, 'fine partita: si scrive subito');
  uguale([m.salvato().stelle, m.salvato().statistiche.vittorie], [{ 1: 3 }, 1], 'con il risultato dentro');
  uguale(m.sveglieAttive(), 0, 'nessuna sveglia rimasta accesa');

  // fuori dalla partita le azioni del giocatore si scrivono subito
  P.guadagna(3, 'prova'); uguale(A.scritture, ++n, 'perle fuori dalla partita');
  P.imposta('mano', 'sinistra'); uguale(A.scritture, ++n, 'impostazioni');
  P.riscuotiRegalo(); uguale(A.scritture, ++n, 'regalo');
  P.segnaTutorial(); uguale(A.scritture, ++n, 'tutorial');
  vero(P.salva() === true && A.scritture === ++n, 'salva() scrive sempre');
  vero(typeof m.suDocumento.visibilitychange[0] === 'function' && typeof m.suFinestra.pagehide[0] === 'function', 'ascolta la pagina');

  // senza sveglie (niente setTimeout) funziona lo stesso
  const s = mondo({ senzaSveglie: true });
  s.emetti('partita:inizio', {}); s.emetti('scatto', {}); s.orologio.ms += 2500; s.emetti('scatto', {});
  uguale([s.archivio.scritture, s.salvato().statistiche.scatti], [2, 2], 'senza setTimeout');
  // orologio che torna indietro: non si resta bloccati
  s.orologio.ms -= 1e9; s.emetti('scatto', {}); s.orologio.ms += 2000; s.emetti('scatto', {});
  uguale(s.salvato().statistiche.scatti, 4, 'orologio tornato indietro');
});

prova('senza pagina, senza archivio, con l\'archivio vietato o pieno', () => {
  for (const opzioni of [{ senzaArchivio: true }, { archivioVietato: true }, { senzaArchivio: true, senzaSveglie: true }]) {
    const m = mondo(opzioni), P = m.P, nome = JSON.stringify(opzioni);
    uguale([P.perle(), P.livelloMax()], [0, 1], 'si parte da zero ' + nome);
    P.guadagna(100, 'prova'); vero(P.compraPotenziamento('pinne'), 'compro ' + nome);
    gioca(m, 1, { stelle: 3, dentro: () => { m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' }); m.emetti('scatto', {}); } });
    P.imposta('suoni', false); P.riscuotiRegalo(); P.segnaTutorial(); P.riscuotiTutti();
    uguale([P.livelloPotenziamento('pinne'), P.stelle(1), P.livelloMax(), P.impostazione('suoni'), P.tutorialFatto()], [1, 3, 2, false, true], 'tutto funziona in memoria ' + nome);
    uguale(P.salva(), false, 'salva() dice che non ha scritto ' + nome);
    P.azzera();
    uguale([P.perle(), P.livelloMax()], [0, 1], 'azzera ' + nome);
  }
  const m = mondo(), P = m.P;
  P.guadagna(10, 'prova');
  m.archivio.pieno = true;
  P.guadagna(10, 'prova'); gioca(m, 1); vero(!P.compraPotenziamento('pinne'), 'non bastano le perle');
  uguale([P.perle(), P.livelloMax(), P.salva()], [20, 2, false], 'archivio pieno: il gioco continua');
  m.archivio.pieno = false;
  uguale([P.salva(), m.salvato().perle], [true, 20], 'appena torna lo spazio si salva');
  vero(mondo({ pagina: true }).P.perle() === 0, 'con la pagina finta si carica');
});

prova('azzera i progressi', () => {
  const m = mondo(), P = m.P;
  P.guadagna(2000, 'prova'); porta(m, 'pinne', 2); vero(P.compraEroe('saetta'), 'compro Saetta');
  for (let n = 1; n <= 6; n++) gioca(m, n, { stelle: 3, dentro: () => { m.emetti('visto', { id: 'ghiozzo' }); m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' }); } });
  gioca(m, 1, { modalita: 'sopravvivenza', esito: 'perso', potenza: 777, tempo: 77 });
  P.riscuotiRegalo(); P.segnaTutorial(); P.imposta('suoni', false); P.imposta('mano', 'sinistra'); P.riscuoti('primo_boccone');
  vero(P.perle() > 0 && P.livelloMax() === 7 && P.sopravvivenzaSbloccata() && P.scoperte() === 1 && P.eroeScelto() === 'saetta', 'c\'è qualcosa da cancellare');

  const stesso = P.stato; m.dimentica();
  P.azzera();
  vero(P.stato === stesso, 'B.progressi.stato resta lo stesso oggetto');
  uguale([P.perle(), P.livelloMax(), P.stelleTotali(), P.livelloPotenziamento('pinne'), P.eroeScelto(), P.eroePosseduto('saetta')], [0, 1, 0, 0, 'pallino', false], 'progressi cancellati');
  uguale([P.sopravvivenzaSbloccata(), P.recordSopravvivenza(), P.scoperte(), P.acquario('ghiozzo'), P.daRiscuotere(), P.tutorialFatto()], [false, { potenza: 0, tempo: 0 }, 0, { visti: 0, mangiati: 0 }, 0, false], 'acquario, record, traguardi, tutorial');
  uguale([P.regalo().disponibile, P.regalo().serie], [true, 0], 'regalo');
  uguale(P.stato.statistiche.partite, 0, 'statistiche');
  for (const t of P.TRAGUARDI) uguale(P.traguardo(t.id), { valore: 0, fatto: false, riscosso: false }, 'traguardo ' + t.id);
  uguale([P.impostazione('suoni'), P.impostazione('mano')], [false, 'sinistra'], 'le impostazioni restano');
  vero(m.visti('progressi').some(d => d.motivo === 'azzera'), 'evento progressi con motivo "azzera"');
  uguale(m.visti('impostazioni').length, 0, 'nessun cambio di impostazioni');
  uguale([m.salvato().perle, m.salvato().livelloMax, m.salvato().importatoV2], [0, 1, true], 'scritto subito');
  const m2 = riapri(m);
  uguale([m2.P.perle(), m2.P.livelloMax(), m2.P.impostazione('suoni')], [0, 1, false], 'azzerato anche alla riapertura');

  // dopo l'azzeramento si ricomincia davvero: i traguardi tornano da raggiungere
  m.dimentica();
  m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' });
  uguale(m.visti('traguardo').map(d => d.id), ['primo_boccone'], 'il primo boccone si rifà');
  uguale(P.riscuoti('primo_boccone'), 10, 'e il premio si ritira di nuovo');

  // azzera({ tutto: true }) rimette anche le impostazioni
  m.dimentica();
  P.azzera({ tutto: true });
  uguale([P.impostazione('suoni'), P.impostazione('mano'), P.perle()], [true, 'destra', 0], 'impostazioni predefinite');
  uguale(m.visti('impostazioni'), [{ chiave: 'suoni', valore: true }, { chiave: 'mano', valore: 'destra' }], 'eventi per le impostazioni cambiate');
});

prova('perle: guadagna, eventi e rete di sicurezza', () => {
  const m = mondo(), P = m.P;
  uguale(P.guadagna(25, 'conchiglia'), 25, 'guadagna restituisce le perle accreditate');
  uguale([P.perle(), P.stato.statistiche.perleTotali], [25, 25], 'perle e totale');
  uguale(m.visti('perle'), [{ quante: 25, motivo: 'conchiglia' }], 'evento "perle"');
  uguale(m.visti('progressi'), [{ motivo: 'perle' }], 'evento "progressi"');
  for (const n of [0, -5, NaN, Infinity, -Infinity, '10', null, undefined, {}, [], 0.4]) uguale(P.guadagna(n, 'prova'), 0, 'guadagna(' + String(n) + ') non dà niente');
  uguale(P.perle(), 25, 'perle invariate');
  uguale(P.guadagna(2.6), 3, 'le mezze perle si arrotondano');
  uguale(m.visti('perle')[1], { quante: 3, motivo: '' }, 'senza motivo');
  P.guadagna(1e12, 'prova');
  uguale(P.perle(), 99999999, 'c\'è un tetto');
  vero(m.eventi.every(e => e.nome !== 'progressi' || (typeof e.dati.motivo === 'string' && e.dati.motivo.length > 0)), 'ogni evento "progressi" ha il suo motivo');

  // un motore che NON chiama guadagna() e si limita a emettere 'perle': le perle arrivano lo stesso
  const a = mondo();
  a.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  a.emetti('perle', { quante: 7, motivo: 'bolla' }); a.emetti('perle', { quante: 5, motivo: 'pesce' });
  a.emetti('perle', { quante: -3 }); a.emetti('perle', {}); a.emetti('perle', null);
  uguale([a.P.perle(), a.P.stato.statistiche.perleTotali], [12, 12], 'accreditate dall\'evento');
  a.emetti('partita:fine', { esito: 'perso', livello: 1, modalita: 'avventura', tempo: 5, potenza: 5 });
  uguale(riapri(a).P.perle(), 12, 'e salvate');

  // un motore che chiama guadagna() e in più emette 'perle' per conto suo: non si conta due volte
  const b = mondo();
  b.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  b.P.guadagna(7, 'bolla'); b.emetti('perle', { quante: 7, motivo: 'bolla' });
  b.P.guadagna(5, 'pesce'); b.emetti('perle', { quante: 5, motivo: 'pesce' });
  uguale([b.P.perle(), b.P.stato.statistiche.perleTotali], [12, 12], 'contate una volta sola');

  // e il caso normale: solo guadagna()
  const c = mondo();
  c.emetti('partita:inizio', { livello: 1, modalita: 'avventura' });
  c.P.guadagna(7, 'bolla'); c.P.guadagna(5, 'pesce');
  uguale([c.P.perle(), c.visti('perle').length], [12, 2], 'solo guadagna()');
});

prova('eventi malformati: nessun errore, stato sempre sano', () => {
  const m = mondo({ pagina: true }), P = m.P;
  const nomi = ['partita:inizio', 'partita:fine', 'mangiato', 'pesciolini', 'visto', 'cresciuto', 'colpito', 'aiuto', 'perle', 'frenesia', 'gigante:morso', 'scatto', 'impostazioni', 'progressi', 'traguardo', 'scoperta'];
  const robaccia = [undefined, null, 42, 'ciao', [], [1, 2], {}, { id: null }, { id: {}, tipo: [], taglia: 'x', potenza: NaN, guadagno: -1 },
    { quanti: -5, dorati: 'tre' }, { quanti: Infinity, dorati: NaN }, { quanti: 1e400 }, { tipo: 'constructor' }, { tipo: '__proto__' }, { id: '__proto__', rimasti: -1 }, { id: 'hasOwnProperty' },
    { esito: 'vinto', livello: 1e9, stelle: -3, tempo: -1, potenza: -1, colpi: 'tanti' }, { esito: 'boh', modalita: 7, livello: {}, tempo: Infinity, potenza: Infinity },
    { esito: 'vinto', modalita: 'sopravvivenza', tempo: NaN, potenza: 'x' }, { chiave: 'qualita', valore: {} }, { quante: 'molte', motivo: 5 }, { rimasti: 'zero' }];
  for (let giro = 0; giro < 2; giro++) for (const nome of nomi) for (const dati of robaccia) m.emetti(nome, dati);
  uguale(m.errori, [], 'nessun errore negli ascoltatori');
  const st = P.stato.statistiche;
  const visita = (o, percorso) => { for (const k of Object.keys(o)) { const v = o[k]; if (v && typeof v === 'object') visita(v, percorso + k + '.'); else if (typeof v === 'number') vero(Number.isFinite(v) && v >= 0, 'numero sano in ' + percorso + k + ' (' + v + ')'); } };
  visita(P.stato, '');
  vero(st.tempoGioco <= 6 * 3600 * 100, 'il tempo di gioco non esplode');
  uguale(P.stelleTotali(), 0, 'nessuna stella regalata');
  uguale(P.recordSopravvivenza().tempo, 0, 'nessun record di tempo impossibile');
  vero(P.salva(), 'si salva');
  const copia = riapri(m).P.stato;
  uguale(copia, JSON.parse(JSON.stringify(P.stato)), 'ciò che si rilegge è uguale a ciò che c\'era');
  uguale(Object.keys(({})).length, 0, 'gli oggetti normali sono rimasti normali');
});

prova('una carriera intera: tutti i traguardi si possono raggiungere', () => {
  const m = mondo({ oggi: '2026-01-01' }), P = m.P, cast = m.B.cast, st = () => P.stato.statistiche;
  const perAmbiente = id => cast.specie.filter(s => s.tipo === 'pesce' && s.ambienti.includes(id)).map(s => s.id);
  let guadagnate = 0;
  const paga = n => { guadagnate += n; P.guadagna(n, 'partita'); };

  // sette giorni di regali
  for (let g = 1; g <= 7; g++) { m.orologio.giorno = '2026-01-0' + g; vero(P.riscuotiRegalo(), 'regalo del giorno ' + g); }

  // l'avventura: 40 livelli, 90 perle l'uno
  for (let n = 1; n <= P.totaleLivelli; n++) {
    vero(P.livelloSbloccato(n), 'livello ' + n + ' aperto');
    const ambiente = cast.ambienti.find(a => a.id === cast.aperti[Math.ceil(n / cast.livelliPerAmbiente) - 1]), ultimo = n % cast.livelliPerAmbiente === 0;
    gioca(m, n, { stelle: 3, colpi: n % 4 === 0 ? 1 : 0, tempo: 240, potenza: 400000 + n * 20000, dentro: () => {
      for (const id of perAmbiente(ambiente.id)) { m.emetti('visto', { id }); for (let i = 0; i < 6; i++) m.emetti('mangiato', { id, tipo: 'pesce' }); }
      for (const id of ambiente.banchi) m.emetti('visto', { id });
      for (let i = 0; i < 40; i++) m.emetti('pesciolini', { quanti: 10, dorati: i === 0 && n % 5 === 2 ? 5 : 0, id: ambiente.banchi[0] });
      for (let i = 0; i < 12; i++) m.emetti('scatto', {});
      for (let i = 0; i < 5; i++) m.emetti('frenesia', {});
      for (const tipo of ['x2', 'x5', 'calamita', 'scudo', 'perla', 'cuore', 'x2', 'calamita']) m.emetti('aiuto', { tipo });
      for (let i = 0; i < 4; i++) m.emetti('cresciuto', { fascia: i + 1 });
      if (n % 4 === 0) m.emetti('colpito', { da: 'medusa', cuori: 2 });
      if (ultimo) {
        m.emetti('visto', { id: ambiente.gigante });
        // lo scontro: sei morsi che tolgono tutta la vita (3, 5, 8… 50 milioni secondo l'ambiente); l'ultimo è il più forte
        const vita = [3, 5, 8, 12, 18, 25, 35, 50][n / cast.livelliPerAmbiente - 1] * 1e6, parti = [0.08, 0.1, 0.14, 0.18, 0.22, 0.28];
        let resta = vita;
        parti.forEach((parte, i) => { resta = i === parti.length - 1 ? 0 : resta - vita * parte; m.emetti('gigante:morso', { id: ambiente.gigante, rimasti: parti.length - 1 - i, danno: vita * parte, vitaRimasta: resta, vitaTotale: vita }); });
        m.emetti('mangiato', { id: ambiente.gigante, tipo: 'gigante' });
      }
      paga(90);
    } });
  }
  uguale([P.livelliSuperati(), P.stelleTotali(), st().gigantiSconfitti, P.scoperte(), P.totaleSpecie()], [40, 120, 8, 70, 70], 'avventura finita, acquario completo');
  uguale([st().morsiGiganti, st().morsoMassimo, st().danniGiganti], [48, 14e6, 156e6], 'otto giganti: 48 morsi, il più forte da 14 milioni, 156 milioni di danni');
  uguale(['morso_da_un_milione', 'morso_da_dieci_milioni', 'cento_milioni'].map(id => P.traguardo(id).fatto), [true, true, true], 'i traguardi da milioni arrivano con l\'avventura');
  const fattiDopoAvventura = P.TRAGUARDI.filter(t => P.traguardo(t.id).fatto), premiDopoAvventura = fattiDopoAvventura.reduce((s, t) => s + t.premio, 0);
  const costi = P.POTENZIAMENTI.reduce((s, p) => s + p.costi.reduce((a, b) => a + b, 0), 0) + cast.eroi.reduce((s, e) => s + e.costo, 0);
  vero(fattiDopoAvventura.length >= 30, 'finita l\'avventura sono fatti almeno 30 traguardi (sono ' + fattiDopoAvventura.length + ')');
  vero(fattiDopoAvventura.length < P.TRAGUARDI.length, 'e ne restano per dopo');
  const portafoglio = guadagnate + premiDopoAvventura + 400;
  vero(portafoglio > 0.55 * costi && portafoglio < 0.95 * costi, 'finita l\'avventura si è comprato buona parte del negozio, non tutto (' + portafoglio + ' perle su ' + costi + ')');

  // il lungo periodo: sopravvivenza, tante partite, tutto il negozio
  for (let i = 0; i < 60; i++) gioca(m, 1, { modalita: 'sopravvivenza', esito: 'perso', tempo: 620, potenza: 1200000, dentro: () => {
    for (let k = 0; k < 60; k++) m.emetti('mangiato', { id: 'ghiozzo', tipo: 'pesce' });
    for (let k = 0; k < 30; k++) m.emetti('pesciolini', { quanti: 10, dorati: k < 3 ? 1 : 0 });
    m.emetti('colpito', { da: 'murena', cuori: 0 });
    for (let k = 0; k < 3; k++) m.emetti('gigante:morso', { id: 'kraken', rimasti: 2 - k });
    paga(60);
  } });
  P.guadagna(20000, 'prova');
  for (const p of P.POTENZIAMENTI) porta(m, p.id, p.costi.length);
  for (const e of cast.eroi) if (e.costo > 0) vero(P.compraEroe(e.id), 'compro ' + e.id);

  const mancanti = P.TRAGUARDI.filter(t => !P.traguardo(t.id).fatto).map(t => t.id + ' (' + P.traguardo(t.id).valore + '/' + t.obiettivo + ')');
  uguale(mancanti, [], 'traguardi rimasti da fare');
  const annunciati = m.visti('traguardo').map(d => d.id);
  uguale(annunciati.length, P.TRAGUARDI.length, 'ognuno annunciato');
  uguale(new Set(annunciati).size, P.TRAGUARDI.length, 'una volta sola');
  const prima = P.perle(), premi = P.TRAGUARDI.reduce((s, t) => s + t.premio, 0);
  uguale(P.daRiscuotere(), P.TRAGUARDI.length, 'tutti da ritirare');
  uguale(P.riscuotiTutti(), premi, 'ritirati tutti i premi');
  uguale([P.perle() - prima, P.daRiscuotere()], [premi, 0], 'perle incassate');
  uguale(m.errori, [], 'nessun errore');
  const m2 = riapri(m);
  uguale(m2.P.TRAGUARDI.filter(t => !m2.P.traguardo(t.id).riscosso).length, 0, 'tutto ritrovato alla riapertura');
  uguale(m2.P.stato, JSON.parse(JSON.stringify(P.stato)), 'stato identico alla riapertura');
  vero(JSON.stringify(m.salvato()).length < 20000, 'il salvataggio resta piccolo (' + JSON.stringify(m.salvato()).length + ' caratteri)');
});

// ================================================================ esecuzione
const i = process.argv.indexOf('--solo'), solo = i > 0 ? String(process.argv[i + 1] || '').toLowerCase() : '';
const scelte = prove.filter(p => !solo || p.nome.toLowerCase().includes(solo));
let fallite = 0;
console.log('Prove dei progressi (' + scelte.length + ')');
for (const p of scelte) {
  mondiAperti.length = 0;
  try {
    p.fn();
    for (const m of mondiAperti) if (m.errori.length) throw new Error('errori sulla console: ' + m.errori.join(' | '));
    console.log('  ✓ ' + p.nome);
  } catch (e) {
    fallite++;
    console.log('  ✗ ' + p.nome + '\n      ' + String(e && e.message || e).split('\n').join('\n      '));
    if (process.argv.includes('--dettagli') && e && e.stack) console.log(e.stack);
  }
}
console.log(fallite ? '\n' + fallite + ' prove fallite su ' + scelte.length + '.' : '\nTutte le ' + scelte.length + ' prove passano.');
process.exit(fallite ? 1 : 0);
