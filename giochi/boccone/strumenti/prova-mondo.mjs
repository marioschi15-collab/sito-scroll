#!/usr/bin/env node
/* Prova del "mondo" di Boccone (la logica di gioco) senza disegno e senza browser.
   Carica in una scatola chiusa (node:vm) nucleo, cast, progressi (se c'è: altrimenti un sostituto minimo), una comparsa
   finta per ogni voce del cast (disegna vuoto) e poi 50-mondo, 51-livelli, 52-giganti. Fa giocare due piloti automatici
   a passo fisso di 1/30 di secondo e stampa i risultati, livello per livello.

   Uso (dalla radice del repository):
     node giochi/boccone/strumenti/prova-mondo.mjs --livelli 1,2,6,13,25,40 --giri 4
     node giochi/boccone/strumenti/prova-mondo.mjs --fumo            tutti i livelli per 30 s, prove mirate, controlli
   Opzioni:
     --livelli a,b,c | a-b   livelli da giocare (predefinito 1,2,6,13,25,40)
     --giri n                partite per pilota e per livello (predefinito 4)
     --secondi n             durata massima simulata di una partita (predefinito 900)
     --piloti a,b            attento, distratto (predefinito tutti e due)
     --seme n | caso         seme dei numeri casuali: a parità di seme i risultati si ripetono (predefinito 1)
     --effetti '{...}'       effetti in più, come quelli di B.progressi.effetti() (es. '{"velocita":1.18,"cuori":1}')
     --negozio               prova con i potenziamenti del negozio a metà strada (vedi NEGOZIO qui sotto)
     --freccia               il pilota va dritto sull'obiettivo quando può mangiarlo (come chi segue la freccia)
     --sopravvivenza         gioca la sopravvivenza al posto dei livelli
     --sottoinsieme          registra solo una parte dei contenuti (per provare che il gioco regge lo stesso)
     --colpi                 stampa anche da chi sono arrivati i colpi
   Esce con codice 1 se trova errori. Il pilota è poco furbo: una persona gioca meglio. */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(radice, 'src', 'js');
const PASSO = 1 / 30;
const PILOTI = { attento: { cautela: 150, errore: 0.25 }, distratto: { cautela: 90, errore: 0.6 } };
/* Potenziamenti "a metà strada": più o meno ciò che si compra con le perle di una decina di livelli. */
const NEGOZIO = { velocita: 1.12, ricaricaScatto: 0.76, risucchio: 1.6, bolle: 1.3, cuori: 1 };
const EVENTI = ['partita:inizio', 'partita:fine', 'mangiato', 'pesciolini', 'visto', 'cresciuto', 'colpito', 'aiuto', 'perle',
  'frenesia', 'gigante:morso', 'scatto', 'annuncio', 'vibra'];

// ---------------------------------------------------------------- argomenti
function argomenti(argv) {
  const a = { livelli: [1, 2, 6, 13, 25, 40], giri: 4, secondi: 900, piloti: Object.keys(PILOTI), seme: 1, effetti: null,
    fumo: false, sopravvivenza: false, sottoinsieme: false, colpi: false, freccia: false };
  for (let i = 2; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--livelli') a.livelli = elencoLivelli(argv[++i]);
    else if (v === '--giri') a.giri = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (v === '--secondi') a.secondi = Math.max(1, parseFloat(argv[++i]) || 900);
    else if (v === '--piloti') a.piloti = argv[++i].split(',').map(s => s.trim()).filter(s => PILOTI[s]);
    else if (v === '--seme') { const s = argv[++i]; a.seme = s === 'caso' ? (Date.now() % 1e6) + 1 : parseInt(s, 10) || 1; }
    else if (v === '--effetti') a.effetti = Object.assign(a.effetti || {}, JSON.parse(argv[++i]));
    else if (v === '--negozio') a.effetti = Object.assign(a.effetti || {}, NEGOZIO);
    else if (v === '--fumo') a.fumo = true;
    else if (v === '--sopravvivenza') a.sopravvivenza = true;
    else if (v === '--sottoinsieme') a.sottoinsieme = true;
    else if (v === '--colpi') a.colpi = true;
    else if (v === '--freccia') a.freccia = true;
    else { console.error('Opzione sconosciuta: ' + v); process.exit(2); }
  }
  if (!a.piloti.length) a.piloti = Object.keys(PILOTI);
  return a;
}
function elencoLivelli(testo) {
  const lista = [];
  for (const pezzo of String(testo).split(',')) {
    const [da, a] = pezzo.split('-').map(n => parseInt(n, 10));
    if (!(da >= 1)) continue;
    for (let n = da; n <= (a >= da ? a : da); n++) lista.push(n);
  }
  return lista.length ? lista : [1];
}

// ---------------------------------------------------------------- la scatola con il gioco dentro
const SEME = `(() => { let s = 1;
  window.__seme = n => { s = (n >>> 0) || 1; };
  Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
})();`;

/* Una definizione finta per ogni voce del cast: specie, eroi e ambienti con le quattro passate vuote. */
const COMPARSE = `(() => { 'use strict';
  const B = window.B, vuoto = () => {}, salta = window.__salta || { has: () => false };
  for (const s of B.cast.specie) if (!salta.has(s.id)) B.specie.registra({ id: s.id, descrizione: 'Comparsa di prova.', disegna: vuoto });
  for (const e of B.cast.eroi) if (!salta.has(e.id)) B.eroi.registra({ id: e.id, descrizione: 'Comparsa di prova.', disegna: vuoto });
  for (const a of B.cast.ambienti) if (!salta.has(a.id)) B.ambienti.registra({ id: a.id, descrizione: 'Comparsa di prova.', crea: () => ({}), sfondo: vuoto, dietro: vuoto, davanti: vuoto, velo: vuoto });
})();`;

/* Il minimo di B.progressi che serve al mondo, se 05-progressi.js non c'è ancora. */
const PROGRESSI_FINTI = `(() => { 'use strict';
  const B = window.B; let perle = 0;
  B.progressi = {
    sostituto: true,
    perle: () => perle,
    guadagna(n, motivo) { perle += n; B.eventi.emetti('perle', { quante: n, motivo }); },
    eroeScelto: () => 'pallino',
    effetti: () => ({ velocita: 1, ricaricaScatto: 1, durataScatto: 1, risucchio: 1, bolle: 1, perle: 1, morso: 1, cuori: 0, durataCalamita: 0, durataFrenesia: 0, invulnerabile: 0, scudoIniziale: false }),
  };
})();`;

function creaScatola(opzioni = {}) {
  const errori = [], avvisi = [], magazzino = new Map();
  const testo = a => a.map(v => v instanceof Error ? (v.stack || v.message) : typeof v === 'string' ? v : (() => { try { return JSON.stringify(v); } catch (e) { return String(v); } })()).join(' ');
  const finestra = {
    console: { log() {}, info() {}, debug() {}, warn: (...a) => avvisi.push(testo(a)), error: (...a) => errori.push(testo(a)) },
    localStorage: { getItem: k => magazzino.has(k) ? magazzino.get(k) : null, setItem: (k, v) => { magazzino.set(k, String(v)); }, removeItem: k => { magazzino.delete(k); } },
    navigator: {}, performance: { now: () => 0 },
    document: { hidden: false, addEventListener() {}, removeEventListener() {}, createElement() { throw new Error('la prova del mondo non ha tele né pagina'); } },
    addEventListener() {}, removeEventListener() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  };
  finestra.window = finestra;
  const scatola = vm.createContext(finestra);
  const esegui = (codice, nome) => vm.runInContext(codice, scatola, { filename: nome });
  const carica = nome => esegui(readFileSync(join(src, nome), 'utf8'), 'src/js/' + nome);
  esegui(SEME, 'seme');
  carica('00-nucleo.js'); carica('01-cast.js');
  const B = finestra.B;
  const progressiVeri = existsSync(join(src, '05-progressi.js'));
  if (progressiVeri) carica('05-progressi.js'); else esegui(PROGRESSI_FINTI, 'progressi-finti');
  if (opzioni.salta) finestra.__salta = opzioni.salta;
  esegui(COMPARSE, 'comparse');
  for (const nome of ['50-mondo.js', '51-livelli.js', '52-giganti.js']) carica(nome);
  B.prova = { pilota: null, effetti: opzioni.effetti || null };
  return { B, errori, avvisi, progressiVeri, seme: n => finestra.__seme(n), casuale: () => finestra.Math.random() };
}

// ---------------------------------------------------------------- i piloti
/* Gli stessi di anteprime/riferimento-pilota.js, adattati al nuovo mondo: scappa da chi fa male se è vicino, altrimenti
   punta la preda più vicina (o un banco di pesciolini). Unica differenza: non divide mai per zero quando un pesce
   grosso gli è già addosso. Non usa lo scatto, non cerca le bolle né le conchiglie. */
function creaPilota({ cautela, errore }, casuale, freccia) {
  let rx = 0, ry = 0, quando = 0;
  const mossa = { x: 0, y: 0 };
  return M => {
    const h = M.eroe;
    let fx = 0, fy = 0, pericolo = false;
    for (const e of M.predatori) {
      if (!e.minaccia) continue;
      const d = Math.hypot(e.x - h.x, e.y - h.y) - e.r - h.r;
      if (d < (e.vAtt > 100 ? cautela : cautela * 0.8)) { const q = Math.max(5, d + 30); fx += (h.x - e.x) / q; fy += (h.y - e.y) / q; pericolo = true; }
    }
    for (const m of M.pericoli) {
      const d = Math.hypot(m.x - h.x, m.y - h.y) || 1;
      if (d < cautela * 0.6 + h.r + Math.max(0, m.r - 24)) { fx += (h.x - m.x) / d * 3; fy += (h.y - m.y) / d * 3; pericolo = true; }
    }
    if (!pericolo) {
      let meta = null, vicino = 1e9;
      const ob = M.obiettivo;
      if (freccia && ob && ob.mangiabile && !ob.via && !(ob.intoccabile > 0)) meta = ob;
      if (!meta) for (const e of M.predatori) {
        if (!e.mangiabile || e.via || e.intoccabile > 0) continue;
        const d = Math.hypot(e.x - h.x, e.y - h.y);
        if (d < vicino && d < 900) { vicino = d; meta = e; }
      }
      if (!meta) for (const b of M.banchi) { const d = Math.hypot(b.x - h.x, b.y - h.y); if (d < vicino) { vicino = d; meta = b; } }
      if (meta) { fx = meta.x - h.x; fy = meta.y - h.y; }
    }
    let m = Math.hypot(fx, fy) || 1;
    fx /= m; fy /= m;
    if (pericolo) { if (h.x < 250) fx += 1; if (h.x > M.largo - 250) fx -= 1; if (h.y < 250) fy += 1; if (h.y > M.alto - 250) fy -= 1; }
    m = Math.hypot(fx, fy) || 1;
    if (M.t > quando) { quando = M.t + 0.6; rx = (casuale() - 0.5) * 2 * errore; ry = (casuale() - 0.5) * 2 * errore; }
    mossa.x = fx / m + rx; mossa.y = fy / m + ry;
    return mossa;
  };
}

// ---------------------------------------------------------------- una partita
function gioca(scatola, o) {
  const { B } = scatola;
  scatola.seme(o.seme);
  B.prova.pilota = creaPilota(PILOTI[o.pilota], scatola.casuale, o.freccia);
  const colpi = {};
  const via = B.eventi.su('colpito', d => { colpi[d.da] = (colpi[d.da] || 0) + 1; });
  B.partita.avvia({ livello: o.livello, modalita: o.modalita });
  const limite = Math.round(o.secondi / PASSO), inizio = process.hrtime.bigint();
  let passi = 0;
  while (B.partita.stato === 'gioco' && passi < limite) { B.partita.aggiorna(PASSO); passi++; }
  const ms = Number(process.hrtime.bigint() - inizio) / 1e6;
  via();
  const M = B.partita.mondo, stato = B.partita.stato;
  const esito = { esito: stato === 'gioco' ? 'tempo' : stato, tempo: M.tempo, potenza: M.eroe ? M.eroe.p : 0, colpi: M.colpi, perle: M.perle,
    cuori: M.cuori, ottava: M.ottava, daChi: colpi, passi, ms };
  if (stato === 'gioco') B.partita.abbandona();
  return esito;
}

// ---------------------------------------------------------------- tabelle
const media = lista => lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : NaN;
const minuti = s => s === s ? Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0') : '  —';
const tondo = n => n === n ? (n >= 1e6 ? (n / 1e6).toFixed(1) + ' mln' : String(Math.round(n))) : '—';
function riga(celle, larghezze) { return celle.map((c, i) => i === 0 ? String(c).padEnd(larghezze[i]) : String(c).padStart(larghezze[i])).join('  '); }

function tabella(scatola, a) {
  const { B } = scatola, larghezze = [34, 10, 7, 13, 13, 6, 11, 9];
  console.log(riga(['livello', 'pilota', 'vinte', 'tempo vinte', 'tempo perse', 'colpi', 'potenza', 'perle*'], larghezze));
  const riepilogo = [];
  for (const n of a.livelli) {
    const cfg = a.sopravvivenza ? null : B.livelli.config(n);
    const nome = a.sopravvivenza ? 'sopravvivenza' : n + ' ' + cfg.ambiente.nome + (cfg.obiettivo.tipo === 'gigante' ? ' ♛' : '') + (cfg.particolarita ? ' [' + cfg.particolarita.tipo + ']' : '');
    for (const pilota of a.piloti) {
      const esiti = [];
      for (let g = 0; g < a.giri; g++) esiti.push(gioca(scatola, { livello: n, modalita: a.sopravvivenza ? 'sopravvivenza' : 'avventura', pilota, secondi: a.secondi, freccia: a.freccia,
        seme: a.seme * 100003 + n * 1009 + g * 31 + (pilota === 'attento' ? 0 : 7) }));
      const vinte = esiti.filter(e => e.esito === 'vinto'), perse = esiti.filter(e => e.esito !== 'vinto');
      const perleVinte = vinte.length ? vinte.map(e => e.perle) : esiti.map(e => e.perle);
      console.log(riga([nome, pilota, vinte.length + '/' + esiti.length, minuti(media(vinte.map(e => e.tempo))), minuti(media(perse.map(e => e.tempo))),
        media(esiti.map(e => e.colpi)).toFixed(1), tondo(media(esiti.map(e => e.potenza))), tondo(media(perleVinte)) + (vinte.length ? '' : '°')], larghezze));
      if (a.colpi) {
        const somma = {};
        for (const e of esiti) for (const [chi, q] of Object.entries(e.daChi)) somma[chi] = (somma[chi] || 0) + q;
        const elenco = Object.entries(somma).sort((x, y) => y[1] - x[1]).map(([chi, q]) => chi + ' ' + q).join(', ');
        if (elenco) console.log('    colpi da: ' + elenco);
        if (a.sopravvivenza) console.log('    ottave raggiunte: ' + esiti.map(e => e.ottava).join(', '));
      }
      riepilogo.push({ n, pilota, vinte: vinte.length, giri: esiti.length, ms: media(esiti.map(e => e.ms / Math.max(1, e.passi))) });
    }
  }
  console.log('* perle medie delle partite vinte (° = nessuna vinta: media di tutte).  Costo medio di un passo: '
    + (media(riepilogo.map(r => r.ms)) * 1000).toFixed(0) + ' µs');
  return riepilogo;
}

// ---------------------------------------------------------------- prova del fumo
function finito(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }

/* Controlli di salute sul mondo: numeri veri, tutti dentro al mondo, liste sotto il tetto, dati del cruscotto sensati. */
function controlla(B, dove, problemi) {
  const M = B.partita.mondo, d = B.partita.dati, guai = t => { if (problemi.length < 40) problemi.push(dove + ': ' + t); };
  const h = M.eroe;
  if (h) {
    for (const k of ['x', 'y', 'vx', 'vy', 'ang', 'r', 'p', 'bocca', 'attesa', 'pulsa', 'invul']) if (!finito(h[k])) guai('eroe.' + k + ' = ' + h[k]);
    if (h.x < 0 || h.x > M.largo || h.y < 0 || h.y > M.alto) guai('eroe fuori dal mondo');
    if (![0, 1, 2].includes(h.stadio)) guai('eroe.stadio = ' + h.stadio);
    if (!['normale', 'felice', 'spaventato', 'colpito'].includes(h.espressione)) guai('eroe.espressione = ' + h.espressione);
  }
  for (const e of M.predatori) {
    for (const k of ['x', 'y', 'ang', 'r', 'p', 'fase', 'bocca', 'nasce', 'vAtt', 'avviso', 'carica', 'stordito']) if (!finito(e[k])) guai(e.def.id + '.' + k + ' = ' + e[k]);
    if (e.fase < 0 || e.fase >= 1) guai(e.def.id + '.fase fuori da 0..1: ' + e.fase);
    if (e.x < 0 || e.x > M.largo || e.y < 0 || e.y > M.alto) guai(e.def.id + ' fuori dal mondo');
    if (!['calmo', 'caccia', 'fuga', 'avviso', 'carica', 'stordito', 'sconfitto'].includes(e.stato)) guai(e.def.id + '.stato = ' + e.stato);
    if (e.neutro && e.minaccia) guai(e.def.id + ' è neutro ma minaccia');
  }
  for (let i = 0; i < M.pesciolini.length; i += 7) { const f = M.pesciolini[i]; if (!finito(f.x) || !finito(f.y) || !finito(f.ang) || !(f.fase >= 0 && f.fase < 1)) { guai('pesciolino ' + i + ' con numeri rotti'); break; } }
  for (const p of M.pericoli) {
    if (!finito(p.x) || !finito(p.y) || !finito(p.r) || !(p.fase >= 0 && p.fase < 1) || !(p.attivo >= 0 && p.attivo <= 1)) guai('pericolo ' + p.def.id + ' con numeri rotti');
    if (p.x < 0 || p.x > M.largo || p.y < 0 || p.y > M.alto) guai('pericolo ' + p.def.id + ' fuori dal mondo');
  }
  for (const k of ['x', 'y', 'z']) if (!finito(M.cam[k])) guai('cam.' + k + ' = ' + M.cam[k]);
  if (M.particelle.length > 260 || M.testi.length > 44 || M.nuvole.length > 8 || M.bolle.length > 12 || M.rinascite.length > 40) guai('una lista ha superato il tetto');
  if (M.predatori.length > 120) guai('troppi pesci: ' + M.predatori.length);
  for (const k of ['avanzamento', 'frenesia', 'scatto']) if (!(d[k] >= 0 && d[k] <= 1)) guai('dati.' + k + ' = ' + d[k]);
  for (const k of ['potenza', 'cuori', 'cuoriMax', 'perle', 'tempo', 'molt', 'moltT', 'calamitaT', 'frenesiaT', 'fascia']) if (!finito(d[k])) guai('dati.' + k + ' = ' + d[k]);
}

function avanza(B, secondi, problemi, dove, ogniTanto) {
  const passi = Math.round(secondi / PASSO);
  for (let i = 0; i < passi; i++) {
    B.partita.aggiorna(PASSO);
    if (ogniTanto) ogniTanto(i);
    if (i % 30 === 0) controlla(B, dove, problemi);
  }
}

/* Mette l'eroe addosso a un abitante, senza che nessun altro si metta in mezzo. */
function addosso(B, e) {
  const M = B.partita.mondo, h = M.eroe;
  e.nasce = 0; e.intoccabile = 0;
  h.x = e.x; h.y = e.y; h.vx = 0; h.vy = 0;
  B.partita.aggiorna(PASSO);
}
function soloLui(B, e) { const M = B.partita.mondo; for (const o of M.predatori) if (o !== e) { o.x = o.r + 5; o.y = o.r + 5; o.riposo = 99; } M.pericoli.length = 0; }

/* Prove mirate: le regole che un pilota potrebbe non incontrare mai. Ogni voce risponde un testo se qualcosa non va. */
function proveMirate(scatola) {
  const { B } = scatola, esiti = [];
  const prova = (nome, fn) => { let guasto = null; try { guasto = fn() || null; } catch (e) { guasto = e.stack || String(e); } esiti.push({ nome, guasto }); };
  const fermo = () => { B.prova.pilota = () => ({ x: 0, y: 0 }); };
  const trova = (M, filtro) => M.predatori.find(e => e.indole && !e.via && filtro(e));

  prova('gigante: tre morsi, a ogni morso si infuria, poi la vittoria', () => {
    scatola.seme(11); fermo();
    const morsi = [], fine = [];
    const via1 = B.eventi.su('gigante:morso', d => morsi.push(d.rimasti)), via2 = B.eventi.su('partita:fine', d => fine.push(d));
    B.partita.avvia({ livello: 5 });
    const M = B.partita.mondo, g = M.obiettivo;
    if (!g || !g.gigante) return 'al livello 5 non c\'è un gigante';
    soloLui(B, g);
    const potenze = [g.p];
    M.eroe.p = g.p - 10; addosso(B, g);
    if (M.cuori !== M.cuoriMax - 1) return 'il gigante più forte non ha tolto un cuore';
    for (let i = 0; i < 3 && B.partita.stato === 'gioco'; i++) {
      M.eroe.invul = 0; M.eroe.p = g.p * 1.5; addosso(B, g); potenze.push(g.p);
      if (i < 2 && g.stato !== 'stordito') return 'dopo il morso ' + (i + 1) + ' il gigante non è stordito (' + g.stato + ')';
    }
    if (g.stato !== 'sconfitto') return 'dopo tre morsi il gigante non è sconfitto (' + g.stato + ')';
    for (let i = 0; i < 90 && B.partita.stato === 'gioco'; i++) B.partita.aggiorna(PASSO);
    via1(); via2();
    if (morsi.join() !== '2,1,0') return 'morsi rimasti: ' + morsi.join() + ' (attesi 2,1,0)';
    if (!(potenze[1] > potenze[0] && potenze[2] > potenze[1])) return 'il gigante non diventa più forte a ogni morso: ' + potenze.join(' → ');
    if (B.partita.stato !== 'vinto') return 'la partita non è vinta (' + B.partita.stato + ')';
    if (!fine.length || fine[0].esito !== 'vinto' || !(fine[0].stelle >= 1 && fine[0].stelle <= 3)) return 'partita:fine sbagliato: ' + JSON.stringify(fine[0]);
    if (!(fine[0].mangiati[g.def.id] === 1)) return 'il gigante non è fra i mangiati';
  });

  prova('capobranco: un morso solo', () => {
    scatola.seme(12); fermo();
    B.partita.avvia({ livello: 2 });
    const M = B.partita.mondo, c = M.obiettivo;
    if (!c || !c.capo || c.gigante) return 'al livello 2 non c\'è un capobranco';
    soloLui(B, c);
    M.eroe.p = c.p + 5; addosso(B, c);
    if (B.partita.stato !== 'vinto') return 'mangiato il capobranco la partita non è vinta (' + B.partita.stato + ')';
    if (!(M.perle >= 30)) return 'poche perle alla vittoria: ' + M.perle;
  });

  prova('timido: non fa male anche se è più grosso; chi è più forte sì', () => {
    scatola.seme(13); fermo();
    B.partita.avvia({ livello: 1 });
    const M = B.partita.mondo, t = trova(M, e => e.neutro), f = trova(M, e => !e.neutro && !e.speciale);
    if (!t || !f) return 'manca un timido o un pesce normale al livello 1';
    M.eroe.invul = 0; M.pericoli.length = 0;
    addosso(B, t);
    if (M.cuori !== M.cuoriMax) return 'il timido ha tolto un cuore';
    if (t.minaccia) return 'il timido risulta una minaccia';
    M.eroe.invul = 0; addosso(B, f);
    if (M.cuori !== M.cuoriMax - 1) return 'un pesce più forte non ha tolto un cuore';
    M.eroe.invul = 0; M.eroe.p = t.p + 1; addosso(B, t);
    if (!t.via) return 'il timido più debole non è stato mangiato';
  });

  prova('veleno: fa male finché non sei forte il doppio; corazza: ci rimbalzi finché non sei forte una volta e mezza', () => {
    scatola.seme(14); fermo();
    for (const n of [6, 7, 8, 9]) {
      B.partita.avvia({ livello: n });
      const M = B.partita.mondo, v = trova(M, e => e.def.speciale === 'veleno'), c = trova(M, e => e.def.speciale === 'corazza' && !e.neutro);
      if (!v || !c) { B.partita.abbandona(); continue; }
      M.pericoli.length = 0;
      M.eroe.invul = 0; M.eroe.p = Math.round(c.p * 1.3); addosso(B, c);
      if (c.via) return 'corazza mangiata con forza 1,3';
      if (M.cuori !== M.cuoriMax) return 'la corazza ha tolto un cuore';
      M.eroe.p = Math.round(c.p * 1.6); addosso(B, c);
      if (!c.via) return 'corazza non mangiata con forza 1,6';
      M.eroe.invul = 0; M.eroe.kx = 0; M.eroe.ky = 0; M.eroe.p = Math.round(v.p * 1.7); addosso(B, v);
      if (v.via) return 'veleno mangiato con forza 1,7';
      if (M.cuori !== M.cuoriMax - 1) return 'il veleno non ha tolto un cuore';
      M.eroe.invul = 0; M.eroe.p = Math.round(v.p * 2.2); addosso(B, v);
      if (!v.via) return 'veleno non mangiato con forza 2,2';
      B.partita.abbandona();
      return null;
    }
    return 'nessun livello fra 6 e 9 ha insieme una specie velenosa e una corazzata';
  });

  prova('aiuti: ogni bolla fa il suo effetto', () => {
    scatola.seme(15); fermo();
    B.partita.avvia({ livello: 3 });
    const M = B.partita.mondo, h = M.eroe, visti = [];
    const via = B.eventi.su('aiuto', d => visti.push(d.tipo));
    for (const o of M.predatori) { o.x = o.r + 5; o.y = o.r + 5; } M.pericoli.length = 0;
    M.cuori = M.cuoriMax - 1;
    for (const tipo of ['x2', 'x5', 'calamita', 'scudo', 'perla', 'cuore', 'cuore']) { M.bolle.length = 0; M.bolle.push({ tipo, x: h.x, y: h.y, f: 0 }); B.partita.aggiorna(PASSO); }
    via();
    if (visti.join() !== 'x2,x5,calamita,scudo,perla,cuore,cuore') return 'eventi aiuto: ' + visti.join();
    const a = M.aiuti;
    if (a.molt !== 5 || !(a.moltT > 7) || !(a.calamitaT > 8) || !a.scudo) return 'aiuti non attivi: ' + JSON.stringify(a);
    if (M.cuori !== M.cuoriMax) return 'il cuore non è tornato';
    if (!(M.perle >= 13)) return 'perle dalle bolle: ' + M.perle;
  });

  prova('scatto, pausa, abbandono', () => {
    scatola.seme(16); fermo();
    const fine = [];
    const via = B.eventi.su('partita:fine', d => fine.push(d.esito));
    B.partita.avvia({ livello: 4 });
    if (!B.partita.scatta()) return 'lo scatto non parte';
    if (B.partita.scatta()) return 'lo scatto riparte senza ricarica';
    if (!(B.partita.dati.scatto < 0.1)) return 'dati.scatto non scende dopo lo scatto';
    B.partita.pausa();
    const t = B.partita.mondo.t; B.partita.aggiorna(PASSO);
    if (B.partita.stato !== 'pausa' || B.partita.mondo.t !== t) return 'in pausa il mondo va avanti';
    B.partita.riprendi();
    if (B.partita.stato !== 'gioco') return 'non riprende';
    B.partita.abbandona(); via();
    if (B.partita.stato !== 'ferma' || fine.join() !== 'abbandonato') return 'abbandono: stato ' + B.partita.stato + ', eventi ' + fine.join();
    B.partita.aggiorna(PASSO);
  });

  prova('sopravvivenza: il mare cresce con l\'eroe e finisce con i cuori', () => {
    scatola.seme(17); fermo();
    const fine = [];
    const via = B.eventi.su('partita:fine', d => fine.push(d));
    B.partita.avvia({ modalita: 'sopravvivenza' });
    const M = B.partita.mondo;
    if (M.cfg.obiettivo || M.obiettivo) return 'in sopravvivenza c\'è un obiettivo';
    const cima = M.cfg.fasce[M.cfg.fasce.length - 1].min;
    const preda = trova(M, e => !e.speciale);
    M.pericoli.length = 0; M.eroe.invul = 0; M.eroe.p = cima * 3; addosso(B, preda);
    if (M.ottava !== 1) return 'superata l\'ultima fascia il mare non è cresciuto (ottava ' + M.ottava + ')';
    if (!(M.cfg.fasce[M.cfg.fasce.length - 1].min > cima)) return 'le fasce non sono salite';
    const forte = trova(M, e => !e.neutro && e.p > M.eroe.p);
    if (!forte) return 'dopo la crescita nessuno è più forte dell\'eroe';
    for (let i = 0; i < 6 && B.partita.stato === 'gioco'; i++) { M.eroe.invul = 0; M.aiuti.scudo = false; forte.stordito = 0; addosso(B, forte); }
    via();
    if (B.partita.stato !== 'perso') return 'finiti i cuori la partita non è persa (' + B.partita.stato + ')';
    if (!fine.length || fine[0].esito !== 'perso' || fine[0].modalita !== 'sopravvivenza' || !(fine[0].potenza > 0)) return 'partita:fine sbagliato: ' + JSON.stringify(fine[0]);
  });

  prova('stadio ed espressione dell\'eroe', () => {
    scatola.seme(18); fermo();
    B.partita.avvia({ livello: 3 });
    const M = B.partita.mondo, h = M.eroe, fasce = M.cfg.fasce, stadi = [];
    for (const o of M.predatori) { o.x = o.r + 5; o.y = o.r + 5; } M.pericoli.length = 0;
    const banco = M.banchi[0];
    for (let k = 0; k <= fasce.length; k++) {
      h.p = k === 0 ? 1 : fasce[k - 1].min + 1;
      const f = M.pesciolini.find(q => q.morto === 0 && !q.dorato);
      f.x = h.x; f.y = h.y; B.partita.aggiorna(PASSO);
      stadi.push(h.stadio);
    }
    if (stadi.join('') !== '001122') return 'stadi per fascia: ' + stadi.join('') + ' (attesi 001122); banco ' + !!banco;
    const forte = M.predatori.find(e => e.indole && !e.neutro && e.p > h.p * 2 && e.p < h.p * 6);
    if (forte) {
      h.invul = 0; addosso(B, forte);
      if (h.espressione !== 'colpito') return 'dopo un colpo l\'espressione è ' + h.espressione;
    }
  });

  return esiti;
}

function fumo(a) {
  const problemi = [], conta = {};
  const scatola = creaScatola({ effetti: a.effetti, salta: a.salta });
  const { B } = scatola;
  for (const nome of EVENTI) B.eventi.su(nome, () => { conta[nome] = (conta[nome] || 0) + 1; });
  const inizio = Date.now();
  // 1. ogni livello per almeno 30 secondi simulati (se il pilota perde, si ricomincia)
  for (let n = 1; n <= B.livelli.totale; n++) {
    let fatti = 0, giro = 0;
    try {
      while (fatti < 30) {
        scatola.seme(a.seme * 7919 + n * 131 + giro++);
        B.prova.pilota = creaPilota(PILOTI.attento, scatola.casuale, true);
        B.partita.avvia({ livello: n });
        const M = B.partita.mondo, da = M.tempo;
        const passi = Math.round((30 - fatti) / PASSO);
        for (let i = 0; i < passi && B.partita.stato === 'gioco'; i++) {
          B.partita.aggiorna(PASSO);
          if (i % 90 === 45) B.partita.scatta();
          if (i % 30 === 0) controlla(B, 'livello ' + n, problemi);
        }
        avanza(B, 0.5, problemi, 'livello ' + n + ' (dopo la fine)');      // il mondo vive anche a partita finita
        fatti += Math.max(0.5, M.tempo - da);
      }
      B.partita.abbandona();
    } catch (e) { problemi.push('livello ' + n + ': ' + (e.stack || e)); }
  }
  // 2. l'acquario dietro al menu, per ogni ambiente
  for (const amb of B.cast.ambienti) {
    try { B.partita.sfondoMenu(amb.id); avanza(B, 5, problemi, 'menu ' + amb.id); if (B.partita.stato !== 'ferma') problemi.push('menu ' + amb.id + ': stato ' + B.partita.stato); }
    catch (e) { problemi.push('menu ' + amb.id + ': ' + (e.stack || e)); }
  }
  // 3. la sopravvivenza, due minuti per ambiente
  for (const amb of B.cast.ambienti) {
    try {
      let fatti = 0, giro = 0;
      while (fatti < 120) {
        scatola.seme(a.seme * 104729 + amb.ordine * 17 + giro++);
        B.prova.pilota = creaPilota(PILOTI.attento, scatola.casuale, false);
        B.partita.avvia({ modalita: 'sopravvivenza', ambiente: amb.id });
        const M = B.partita.mondo, passi = Math.round((120 - fatti) / PASSO);
        for (let i = 0; i < passi && B.partita.stato === 'gioco'; i++) { B.partita.aggiorna(PASSO); if (i % 30 === 0) controlla(B, 'sopravvivenza ' + amb.id, problemi); }
        fatti += Math.max(0.5, M.tempo);
      }
      B.partita.abbandona();
    } catch (e) { problemi.push('sopravvivenza ' + amb.id + ': ' + (e.stack || e)); }
  }
  // 4. le prove mirate
  const mirate = a.sottoinsieme ? [] : proveMirate(scatola);
  for (const m of mirate) if (m.guasto) problemi.push('prova "' + m.nome + '": ' + m.guasto);
  // 5. la configurazione di tutti i livelli
  const righe = [];
  for (let n = 1; n <= B.livelli.totale; n++) {
    const c = B.livelli.config(n);
    if (!c.fasce.length || !c.obiettivo) problemi.push('config ' + n + ': mancano fasce o obiettivo');
    righe.push(c);
  }
  const mancanti = EVENTI.filter(n => !conta[n]);
  console.log('Prova del fumo' + (a.sottoinsieme ? ' con una parte sola dei contenuti' : '') + ': ' + B.livelli.totale + ' livelli × 30 s, ' + B.cast.ambienti.length + ' menu, '
    + B.cast.ambienti.length + ' sopravvivenze × 120 s, ' + mirate.length + ' prove mirate — ' + ((Date.now() - inizio) / 1000).toFixed(1) + ' s');
  console.log('B.progressi: ' + (scatola.progressiVeri ? 'quello vero (05-progressi.js)' : 'sostituto minimo dello strumento'));
  console.log('Eventi emessi: ' + EVENTI.map(n => n + ' ' + (conta[n] || 0)).join(', '));
  for (const m of mirate) console.log('  ' + (m.guasto ? 'NO ' : 'sì ') + m.nome);
  if (mancanti.length && !a.sottoinsieme) problemi.push('eventi mai emessi: ' + mancanti.join(', '));
  for (const e of scatola.errori) problemi.push('console.error: ' + e);
  const avvisi = [...new Set(scatola.avvisi)];
  if (avvisi.length) console.log('Avvisi (' + avvisi.length + '): ' + avvisi.slice(0, 5).join(' | '));
  return problemi;
}

/* Per --sottoinsieme: toglie a caso (ma in modo ripetibile) buona parte dei contenuti. */
function daSaltare(seme) {
  const scatola = creaScatola(), cast = scatola.B.cast, salta = new Set();
  scatola.seme(seme);
  for (const s of cast.specie) if (scatola.casuale() < (s.tipo === 'gigante' ? 0.6 : s.tipo === 'pesce' ? 0.7 : 0.5)) salta.add(s.id);
  for (const a of cast.ambienti) if (scatola.casuale() < 0.6) salta.add(a.id);
  for (const e of cast.eroi) if (e.id !== 'pallino' && scatola.casuale() < 0.5) salta.add(e.id);
  return salta;
}

// ---------------------------------------------------------------- avvio
const a = argomenti(process.argv);
if (a.sottoinsieme) a.salta = daSaltare(a.seme);
let problemi = [];
if (a.fumo) {
  problemi = fumo(a);
} else {
  const scatola = creaScatola({ effetti: a.effetti, salta: a.salta });
  console.log('Boccone, prova del mondo — ' + a.giri + ' partite per pilota, seme ' + a.seme + (a.effetti ? ', effetti ' + JSON.stringify(a.effetti) : '')
    + (a.freccia ? ', il pilota segue la freccia' : '') + ' — B.progressi: ' + (scatola.progressiVeri ? 'vero' : 'sostituto'));
  tabella(scatola, a);
  problemi = scatola.errori.map(e => 'console.error: ' + e);
}
if (problemi.length) {
  console.log('\nPROBLEMI (' + problemi.length + '):');
  for (const p of problemi.slice(0, 40)) console.log('  - ' + p);
  process.exit(1);
}
console.log(a.fumo ? 'Nessun problema.' : '');
