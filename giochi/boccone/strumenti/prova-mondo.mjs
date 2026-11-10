#!/usr/bin/env node
/* Prova del "mondo" di Boccone (la logica di gioco) senza disegno e senza browser.
   Carica in una scatola chiusa (node:vm) nucleo, cast, progressi (se c'è: altrimenti un sostituto minimo), una comparsa
   finta per ogni voce del cast (disegna vuoto) e poi 50-mondo, 51-livelli, 52-giganti. Fa giocare due piloti automatici
   a passo fisso di 1/30 di secondo e stampa i risultati, livello per livello.

   Uso (dalla radice del repository):
     node giochi/boccone/strumenti/prova-mondo.mjs --livelli 1,2,6,13,25,40 --giri 4
     node giochi/boccone/strumenti/prova-mondo.mjs --fumo            tutti i livelli per 30 s, prove mirate, controlli
   Opzioni:
     --livelli a,b,c | a-b | tutti   livelli da giocare (predefinito 1,2,6,13,25,40)
     --giri n                partite per pilota e per livello (predefinito 4)
     --secondi n             durata massima simulata di una partita (predefinito 900)
     --piloti a,b            attento, distratto (predefinito tutti e due)
     --seme n | caso         seme dei numeri casuali: a parità di seme i risultati si ripetono (predefinito 1)
     --effetti '{...}'       effetti in più, come quelli di B.progressi.effetti() (es. '{"velocita":1.18,"cuori":1}')
     --negozio               prova con i potenziamenti del negozio a metà strada (vedi NEGOZIO qui sotto)
     --freccia               il pilota va dritto sull'obiettivo quando può mangiarlo (come chi segue la freccia)
     --sopravvivenza         gioca la sopravvivenza al posto dei livelli
     --sottoinsieme          registra solo una parte dei contenuti (per provare che il gioco regge lo stesso)
     --colpi                 stampa anche da chi sono arrivati i colpi e da dove le perle
     --diario                stampa, partita per partita, quando è arrivato ogni colpo e da chi
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
    fumo: false, sopravvivenza: false, sottoinsieme: false, colpi: false, freccia: false, diario: false };
  for (let i = 2; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--livelli') a.livelli = argv[i + 1] === 'tutti' ? (i++, 'tutti') : elencoLivelli(argv[++i]);
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
    else if (v === '--diario') a.diario = true;
    else if (v === '--freccia') a.freccia = true;
    else if (v === '--pubblicato') a.pubblicato = true;
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
  window.__casuale = () => Math.random();   // il Math della scatola non si vede da fuori: il pilota passa di qui
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

const GLOBALI = 'window, Math, Object, Array, Number, JSON, console';
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
  /* Dentro node:vm ogni nome globale (Math, window…) costa caro, perché passa dalla scatola: i file del gioco si
     avvolgono in una funzione che li riceve come parametri. Il codice non cambia, la prova va cinque volte più svelta. */
  const carica = nome => esegui('(function (' + GLOBALI + ') { ' + readFileSync(join(src, nome), 'utf8') + '\n})(' + GLOBALI + ');', 'src/js/' + nome);
  esegui(SEME, 'seme');
  carica('00-nucleo.js'); carica('01-cast.js');
  const B = finestra.B;
  /* Le prove valgono per il gioco intero: si aprono tutti gli ambienti, anche quelli ancora "in arrivo" nel gioco
     pubblicato (B.cast.aperti). Con --pubblicato si prova l'elenco così com'è. */
  if (!process.argv.includes('--pubblicato')) B.cast.aperti = B.cast.ambienti.map(a => a.id);
  const progressiVeri = existsSync(join(src, '05-progressi.js'));
  if (progressiVeri) carica('05-progressi.js'); else esegui(PROGRESSI_FINTI, 'progressi-finti');
  if (opzioni.salta) finestra.__salta = opzioni.salta;
  esegui(COMPARSE, 'comparse');
  for (const nome of ['50-mondo.js', '51-livelli.js', '52-giganti.js']) carica(nome);
  B.prova = { pilota: null, effetti: opzioni.effetti || null };
  return { B, errori, avvisi, progressiVeri, seme: n => finestra.__seme(n), casuale: () => finestra.__casuale() };
}

// ---------------------------------------------------------------- i piloti
/* Gli stessi di anteprime/riferimento-pilota.js, adattati al nuovo mondo: scappa da chi fa male se è vicino, altrimenti
   punta la preda più vicina (o un banco di pesciolini). Non divide mai per zero quando un pesce grosso gli è già
   addosso, e sa le poche cose che una persona vede a colpo d'occhio: si allontana di più da chi sta per attaccare
   (avviso) e dalla mina che lampeggia, si sposta di lato da sotto la stalattite e dalla colonna dello sfiatatoio,
   scansa i proiettili, e se resta chiuso in un angolo scivola lungo il bordo invece di restare fermo. Non usa lo
   scatto, non cerca le bolle né le conchiglie. */
function creaPilota({ cautela, errore }, casuale, freccia) {
  let rx = 0, ry = 0, quando = 0;
  const mossa = { x: 0, y: 0 };
  return M => {
    const h = M.eroe;
    let fx = 0, fy = 0, pericolo = false;
    for (const e of M.predatori) {
      if (!e.minaccia) continue;
      const d = Math.hypot(e.x - h.x, e.y - h.y) - e.r - h.r;
      const soglia = e.avviso > 0 ? cautela * 2.2 : e.vAtt > 100 ? cautela : cautela * 0.8;
      if (d < soglia) { const q = Math.max(5, d + 30); fx += (h.x - e.x) / q; fy += (h.y - e.y) / q; pericolo = true; }
    }
    for (const m of M.pericoli) {
      if (m.alfa < 1) continue;
      const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy) || 1, lato = m.r + h.r + cautela * 0.4;
      let raggio = cautela * 0.6 + h.r + Math.max(0, m.r - 24);
      if (m.zona > 0 && m.attivo > 0.15) raggio = Math.max(raggio, m.zona + h.r + 40);                       // mina che lampeggia
      if (d < raggio) { fx += dx / d * 3; fy += dy / d * 3; pericolo = true; }
      const sopra = m.altezza > 0 && m.attivo > 0.05 && dy < 0 && dy > -(m.altezza + h.r + 40);             // colonna dello sfiatatoio
      const sotto = (m.vy > 50 || (m.def.comportamento === 'caduta' && m.attivo > 0.3)) && dy > 0 && dy < 700;   // stalattite
      if ((sopra || sotto) && Math.abs(dx) < lato) { fx += dx >= 0 ? 3 : -3; pericolo = true; }
    }
    for (const q of M.proiettili) {
      const d = Math.hypot(q.x - h.x, q.y - h.y) || 1;
      if (d < cautela * 0.8 + h.r + q.r) { fx += (h.x - q.x) / d * 3; fy += (h.y - q.y) / d * 3; pericolo = true; }
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
    if (pericolo) {
      const vx = fx, vy = fy;
      if (h.x < 250) fx += 1; if (h.x > M.largo - 250) fx -= 1; if (h.y < 250) fy += 1; if (h.y > M.alto - 250) fy -= 1;
      // chiuso in un angolo (la fuga e la spinta via dal bordo si annullano): scivola di lato, verso il centro del mondo
      if (Math.hypot(fx, fy) < 0.5) { const verso = -vy * (M.largo / 2 - h.x) + vx * (M.alto / 2 - h.y) >= 0 ? 1 : -1; fx = -vy * verso; fy = vx * verso; }
    }
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
  const colpi = {}, perle = {}, diario = [], generi = {};
  const via1 = B.eventi.su('colpito', d => {
    colpi[d.da] = (colpi[d.da] || 0) + 1;
    const M = B.partita.mondo, h = M.eroe;
    let chi = null, vicino = 1e9;
    for (const e of M.predatori) { const q = Math.hypot(e.x - h.x, e.y - h.y) - e.r; if (e.def.id === d.da && q < vicino) { vicino = q; chi = e; } }
    // il genere di chi ha colpito: capobranco, gigante, l'indole del pesce oppure il comportamento del pericolo
    const def = B.specie.prendi(d.da) || {};
    const genere = chi ? (chi.gigante ? 'gigante' : chi.capo ? 'capobranco' : chi.def.indole) : def.tipo === 'gigante' ? 'gigante' : def.comportamento || '?';
    generi[genere] = (generi[genere] || 0) + 1;
    if (!o.diario) return;
    diario.push(minuti(M.tempo) + ' p' + tondo(h.p) + ' ' + d.da + (chi ? ' (p' + tondo(chi.p) + ', ' + (chi.def.indole || 'gigante') + ', ' + chi.stato + (chi.attaccoNome ? ' ' + chi.attaccoNome : '') + ')' : '')
      + (h.x < 200 || h.x > M.largo - 200 || h.y < 200 || h.y > M.alto - 200 ? ' al bordo' : '') + ' → cuori ' + d.cuori);
  });
  const via2 = B.eventi.su('perle', d => { perle[d.motivo] = (perle[d.motivo] || 0) + d.quante; });
  const via = () => { via1(); via2(); };
  B.partita.avvia({ livello: o.livello, modalita: o.modalita });
  const limite = Math.round(o.secondi / PASSO), inizio = process.hrtime.bigint();
  let passi = 0;
  while (B.partita.stato === 'gioco' && passi < limite) { B.partita.aggiorna(PASSO); passi++; }
  const ms = Number(process.hrtime.bigint() - inizio) / 1e6;
  via();
  const M = B.partita.mondo, stato = B.partita.stato;
  const esito = { esito: stato === 'gioco' ? 'tempo' : stato, tempo: M.tempo, potenza: M.eroe ? M.eroe.p : 0, colpi: M.colpi, perle: M.perle,
    cuori: M.cuori, ottava: M.ottava, daChi: colpi, perlePer: perle, diario, generi, passi, ms };
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
  const riepilogo = [], generi = {};
  const livelli = a.livelli === 'tutti' ? Array.from({ length: B.livelli.totale }, (_, i) => i + 1) : a.livelli.filter(n => a.sopravvivenza || n <= B.livelli.totale);
  for (const n of a.sopravvivenza ? [0] : livelli) {
    const cfg = a.sopravvivenza ? null : B.livelli.config(n);
    const nome = a.sopravvivenza ? 'sopravvivenza' : n + ' ' + cfg.ambiente.nome + (cfg.obiettivo.tipo === 'gigante' ? ' ♛' : '') + (cfg.particolarita ? ' [' + cfg.particolarita.tipo + ']' : '');
    for (const pilota of a.piloti) {
      const esiti = [];
      for (let g = 0; g < a.giri; g++) esiti.push(gioca(scatola, { livello: n, modalita: a.sopravvivenza ? 'sopravvivenza' : 'avventura', pilota, secondi: a.secondi, freccia: a.freccia, diario: a.diario,
        seme: a.seme * 100003 + n * 1009 + g * 31 + (pilota === 'attento' ? 0 : 7) }));
      const vinte = esiti.filter(e => e.esito === 'vinto'), perse = esiti.filter(e => e.esito !== 'vinto');
      for (const e of esiti) for (const [genere, q] of Object.entries(e.generi)) generi[genere] = (generi[genere] || 0) + q;
      const perleVinte = vinte.length ? vinte.map(e => e.perle) : esiti.map(e => e.perle);
      console.log(riga([nome, pilota, vinte.length + '/' + esiti.length, minuti(media(vinte.map(e => e.tempo))), minuti(media(perse.map(e => e.tempo))),
        media(esiti.map(e => e.colpi)).toFixed(1), tondo(media(esiti.map(e => e.potenza))), tondo(media(perleVinte)) + (vinte.length ? '' : '°')], larghezze));
      if (a.diario) for (const e of esiti) console.log('    ' + e.esito + ' a ' + minuti(e.tempo) + ' con p' + tondo(e.potenza) + ': ' + (e.diario.join(' · ') || 'nessun colpo'));
      if (a.colpi) {
        const somma = {};
        for (const e of esiti) for (const [chi, q] of Object.entries(e.daChi)) somma[chi] = (somma[chi] || 0) + q;
        const elenco = Object.entries(somma).sort((x, y) => y[1] - x[1]).map(([chi, q]) => chi + ' ' + q).join(', ');
        if (elenco) console.log('    colpi da: ' + elenco);
        const fonti = {};
        const contate = vinte.length ? vinte : esiti;
        for (const e of contate) for (const [motivo, q] of Object.entries(e.perlePer)) fonti[motivo] = (fonti[motivo] || 0) + q / contate.length;
        console.log('    perle' + (vinte.length ? ' delle vinte' : '') + ' da: ' + Object.entries(fonti).sort((x, y) => y[1] - x[1]).map(([motivo, q]) => motivo + ' ' + q.toFixed(0)).join(', '));
        if (a.sopravvivenza) console.log('    ottave raggiunte: ' + esiti.map(e => e.ottava).join(', '));
      }
      riepilogo.push({ n, pilota, vinte: vinte.length, giri: esiti.length, ms: media(esiti.map(e => e.ms / Math.max(1, e.passi))) });
    }
  }
  console.log('* perle medie delle partite vinte (° = nessuna vinta: media di tutte).  Costo medio di un passo: '
    + (media(riepilogo.map(r => r.ms)) * 1000).toFixed(0) + ' µs');
  const partite = riepilogo.reduce((q, r) => q + r.giri, 0), vinte = riepilogo.reduce((q, r) => q + r.vinte, 0);
  console.log('In tutto: ' + vinte + ' vinte su ' + partite + '.  Colpi per genere: '
    + (Object.entries(generi).sort((x, y) => y[1] - x[1]).map(([genere, q]) => genere + ' ' + q).join(', ') || 'nessuno'));
  return riepilogo;
}

// ---------------------------------------------------------------- prova del fumo
function finito(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }

/* Controlli di salute sul mondo: numeri veri, tutti dentro al mondo, liste sotto il tetto, dati del cruscotto sensati. */
function controlla(B, dove, problemi) {
  const M = B.partita.mondo, d = B.partita.dati, guai = t => { if (problemi.length < 40) problemi.push(dove + ': ' + t); };
  const h = M.eroe;
  if (h) {
    for (const k of ['x', 'y', 'vx', 'vy', 'kx', 'ky', 'ang', 'r', 'p', 'bocca', 'attesa', 'pulsa', 'invul', 'stordito']) if (!finito(h[k])) guai('eroe.' + k + ' = ' + h[k]);
    if (h.x < 0 || h.x > M.largo || h.y < 0 || h.y > M.alto) guai('eroe fuori dal mondo');
    if (![0, 1, 2].includes(h.stadio)) guai('eroe.stadio = ' + h.stadio);
    if (!['normale', 'felice', 'spaventato', 'colpito'].includes(h.espressione)) guai('eroe.espressione = ' + h.espressione);
  }
  for (const e of M.predatori) {
    for (const k of ['x', 'y', 'ang', 'r', 'p', 'fase', 'bocca', 'nasce', 'vAtt', 'avviso', 'carica', 'stordito', 'alone', 'aloneR']) if (!finito(e[k])) guai(e.def.id + '.' + k + ' = ' + e[k]);
    if (e.carica < 0 || e.carica > 1 || e.alone < 0 || e.alone > 1 || e.bocca < 0 || e.bocca > 1.001) guai(e.def.id + ': carica, alone o bocca fuori da 0..1');
    if (e.fase < 0 || e.fase >= 1) guai(e.def.id + '.fase fuori da 0..1: ' + e.fase);
    if (e.x < 0 || e.x > M.largo || e.y < 0 || e.y > M.alto) guai(e.def.id + ' fuori dal mondo');
    if (!['calmo', 'caccia', 'fuga', 'avviso', 'carica', 'stordito', 'sconfitto'].includes(e.stato)) guai(e.def.id + '.stato = ' + e.stato);
    if (e.neutro && e.minaccia) guai(e.def.id + ' è neutro ma minaccia');
  }
  for (let i = 0; i < M.pesciolini.length; i += 7) { const f = M.pesciolini[i]; if (!finito(f.x) || !finito(f.y) || !finito(f.ang) || !(f.fase >= 0 && f.fase < 1)) { guai('pesciolino ' + i + ' con numeri rotti'); break; } }
  for (const p of M.pericoli) {
    if (!finito(p.x) || !finito(p.y) || !finito(p.r) || !finito(p.ang) || !(p.fase >= 0 && p.fase < 1) || !(p.attivo >= 0 && p.attivo <= 1) || !(p.alfa >= 0 && p.alfa <= 1) || !(p.colonna >= 0)) guai('pericolo ' + p.def.id + ' con numeri rotti');
    if (p.x < 0 || p.x > M.largo || p.y < 0 || p.y > M.alto) guai('pericolo ' + p.def.id + ' fuori dal mondo');
  }
  for (const k of ['x', 'y', 'z']) if (!finito(M.cam[k])) guai('cam.' + k + ' = ' + M.cam[k]);
  if (M.particelle.length > 260 || M.testi.length > 44 || M.nuvole.length > 12 || M.onde.length > 6 || M.proiettili.length > 20 || M.bolle.length > 12 || M.rinascite.length > 40) guai('una lista ha superato il tetto');
  for (const o of M.onde) if (!finito(o.x) || !finito(o.y) || !(o.r >= 0) || !(o.rMax > 0)) guai('onda con numeri rotti');
  for (const q of M.proiettili) if (!finito(q.x) || !finito(q.y) || !finito(q.ang) || !(q.r > 0)) guai('proiettile con numeri rotti');
  for (const n of M.nuvole) if (!finito(n.x) || !finito(n.y) || !(n.r > 0) || !(n.vita > 0)) guai('nuvola con numeri rotti');
  if (!(M.buio >= 0 && M.buio <= 1)) guai('buio = ' + M.buio);
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
    M.eroe.invul = 0; M.eroe.p = g.p - 10; addosso(B, g);
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
    B.partita.abbandona();                                              // chiude la partita della prova precedente
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

  // ----- le novità di questa versione: indoli, capacità speciali, pericoli, attacchi dei giganti -----
  /* Tiene l'eroe (e, se serve, un pesce) inchiodati a un punto per "secondi", chiamando ogniPasso dopo ogni passo:
     se risponde true ci si ferma. Risponde true se ogniPasso ha detto di fermarsi. */
  const inchioda = (secondi, punti, ogniPasso) => {
    const M = B.partita.mondo;
    for (let i = 0; i < secondi / PASSO && B.partita.stato === 'gioco'; i++) {
      for (const [o, x, y] of punti) { o.x = x; o.y = y; if (o.vx !== undefined) { o.vx = 0; o.vy = 0; o.kx = 0; o.ky = 0; } }
      B.partita.aggiorna(PASSO);
      if (ogniPasso && ogniPasso(M, i * PASSO)) return true;
    }
    return false;
  };
  const sgombra = M => { for (const o of M.predatori) { o.x = o.r + 5; o.y = o.r + 5; o.riposo = 999; } };
  const pericoloDi = (livelli, comportamento) => {
    for (const n of livelli) {
      B.partita.avvia({ livello: n });
      const M = B.partita.mondo, p = M.pericoli.find(q => q.def.comportamento === comportamento);
      if (p) {                                                          // solo lui, lontano dall'angolo dove finiscono i pesci
        sgombra(M); M.pericoli.length = 0; M.pericoli.push(p); M.bolle.length = 0;
        p.x = M.largo * 0.62; if (p.x0) p.x0 = p.x;
        return p;
      }
    }
    return null;
  };

  prova('indoli: ogni indole e ogni capacità del cast ha la sua funzione; il branco gira in gruppi da 3 a 5', () => {
    for (const s of B.cast.specie) {
      if (s.tipo === 'pesce' && !B.partita.indoli[s.indole]) return 'manca l\'indole "' + s.indole + '" (' + s.id + ')';
      if (s.speciale && !B.partita.speciali[s.speciale]) return 'manca la capacità "' + s.speciale + '" (' + s.id + ')';
      if (s.tipo === 'pericolo' && !B.partita.comportamenti[s.comportamento]) return 'manca il comportamento "' + s.comportamento + '" (' + s.id + ')';
      if (s.tipo === 'gigante') for (const nome of s.attacchi) if (!B.giganti.attacchi[nome]) return 'manca l\'attacco "' + nome + '" (' + s.id + ')';
    }
    scatola.seme(21); fermo();
    B.partita.avvia({ livello: 16 });                                   // mare aperto: sgombri e tonni girano in branco
    const M = B.partita.mondo, gruppi = new Map();
    for (const e of M.predatori) if (e.def.indole === 'branco') { const g = e.guida || e; gruppi.set(g, (gruppi.get(g) || 0) + 1); }
    const misure = [...gruppi.values()];
    if (!misure.length) return 'al livello 16 non ci sono pesci da branco';
    if (Math.max(...misure) > 5) return 'un branco ha più di 5 pesci: ' + misure.join();
    if (!misure.some(q => q >= 3)) return 'nessun branco di almeno 3 pesci: ' + misure.join();
    const capo = [...gruppi.keys()].find(g => gruppi.get(g) >= 3), seguace = M.predatori.find(e => e.guida === capo);
    M.eroe.invul = 999; M.eroe.x = 60; M.eroe.y = 60;
    for (let i = 0; i < 20 / PASSO; i++) { M.eroe.x = 60; M.eroe.y = 60; B.partita.aggiorna(PASSO); }
    const d = Math.hypot(seguace.x - capo.x, seguace.y - capo.y);
    if (!capo.via && !seguace.via && d > 420) return 'dopo 20 secondi un pesce del branco è a ' + Math.round(d) + ' dalla sua guida';
  });

  prova('agguato: fermo, poi avviso e scatto da vicino; pattuglia: fa la ronda', () => {
    scatola.seme(22); fermo();
    B.partita.avvia({ livello: 1 });
    let M = B.partita.mondo, h = M.eroe;
    const a = trova(M, e => e.def.indole === 'agguato');
    if (!a) return 'al livello 1 manca un pesce da agguato';
    sgombra(M); a.riposo = 0; a.x = M.largo / 2; a.y = M.alto / 2; a.nasce = 0; h.invul = 999;
    h.p = Math.round(a.p / 3);                                          // abbastanza grosso da interessargli, ma più debole
    const lontano = a.x + a.r + h.r + 260, vicino = a.x + a.r + h.r + 90;
    let mosso = 0, stati = '';
    inchioda(2, [[h, lontano, a.y]], () => { mosso = Math.max(mosso, Math.abs(a.vAtt)); });
    if (mosso > 20) return 'con l\'eroe lontano l\'agguato non sta fermo (velocità ' + Math.round(mosso) + ')';
    if (a.sprint > 0 || a.avviso > 0) return 'l\'agguato scatta da lontano';
    inchioda(1.6, [[h, vicino, a.y]], () => { if (!stati.endsWith(a.stato)) stati += ' ' + a.stato; });
    if (!/avviso carica/.test(stati)) return 'da vicino l\'agguato non fa avviso e scatto:' + stati;
    B.partita.avvia({ livello: 2 });
    M = B.partita.mondo; h = M.eroe;
    const s = trova(M, e => e.def.indole === 'pattuglia');
    if (!s) return 'al livello 2 manca un pesce di pattuglia';
    h.invul = 999;
    let x0 = s.x, x1 = s.x, y0 = s.y, y1 = s.y;
    inchioda(25, [[h, h.r + 5, h.r + 5]], () => { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); });
    if (x1 - x0 + y1 - y0 < 500) return 'la pattuglia non fa la ronda: si è mossa di ' + Math.round(x1 - x0) + ' × ' + Math.round(y1 - y0);
  });

  prova('inchiostro: inseguito lascia una nuvola; scossa: stordisce senza togliere cuori', () => {
    scatola.seme(23); fermo();
    let seppia = null, M = null;
    for (const n of [6, 7, 8, 9, 26, 27]) { B.partita.avvia({ livello: n }); M = B.partita.mondo; seppia = trova(M, e => e.def.speciale === 'inchiostro'); if (seppia) break; }
    if (!seppia) return 'nessun livello con una specie che fa l\'inchiostro';
    let h = M.eroe;
    sgombra(M); seppia.riposo = 0; seppia.nasce = 0; M.pericoli.length = 0; h.invul = 999; h.p = seppia.p * 0.9;
    const sx = M.largo / 2, sy = M.alto / 2;
    let nuvole = 0;
    h.p = seppia.p + 5; seppia.neutro = true;
    inchioda(7, [[seppia, sx, sy], [h, sx + seppia.r + h.r + 110, sy]], () => { nuvole = Math.max(nuvole, M.nuvole.length); return nuvole > 0; });
    if (!nuvole) return 'la seppia inseguita non ha lasciato nuvole';
    if (!(M.nuvole[0].r > 60 && M.nuvole[0].vita > 2)) return 'nuvola troppo piccola o troppo breve';
    let torpedine = null;
    for (const n of [31, 32, 33, 34]) { B.partita.avvia({ livello: n }); M = B.partita.mondo; torpedine = trova(M, e => e.def.speciale === 'scossa'); if (torpedine) break; }
    if (!torpedine) return 'nessun livello con una specie che dà la scossa';
    h = M.eroe;
    sgombra(M); torpedine.riposo = 0; torpedine.nasce = 0; M.pericoli.length = 0; h.invul = 0;
    if (!(torpedine.aloneR > torpedine.r)) return 'la torpedine non ha l\'alone';
    let stordito = false, acceso = 0;
    B.prova.pilota = () => ({ x: 0, y: 1 });
    h.p = Math.round(torpedine.p * 0.8);
    const tx = M.largo / 2, ty = M.alto / 2, hx = tx + torpedine.aloneR - 6;
    inchioda(7, [[torpedine, tx, ty], [h, hx, ty]], () => { acceso = Math.max(acceso, torpedine.alone); if (h.stordito > 0) stordito = true; return stordito; });
    if (!stordito) return 'dentro l\'alone l\'eroe non resta stordito (alone massimo ' + acceso.toFixed(2) + ')';
    if (M.cuori !== M.cuoriMax) return 'la scossa ha tolto un cuore';
    const y0 = h.y; B.partita.aggiorna(PASSO); B.partita.aggiorna(PASSO);
    if (Math.abs(h.y - y0) > 6) return 'da stordito l\'eroe risponde ancora ai comandi';
    fermo();
  });

  prova('mina: si arma se resti vicino, scoppia, fa male e stordisce i pesci; poi ricompare', () => {
    scatola.seme(24); fermo();
    const p = pericoloDi([11, 12, 13], 'mina');
    if (!p) return 'nessuna mina nei livelli del relitto';
    const M = B.partita.mondo, h = M.eroe, pesce = M.predatori.find(e => e.indole);
    h.invul = 0; p.x = M.largo / 2; p.y = p.y0 = M.alto / 2;
    const hx = p.x + p.r + h.r + 70;
    inchioda(0.5, [[h, hx, p.y]]);
    if (M.cuori !== M.cuoriMax) return 'la mina fa male prima di scoppiare';
    if (!(p.attivo > 0.1 && p.attivo < 1)) return 'con l\'eroe vicino la mina non si sta armando (attivo ' + p.attivo.toFixed(2) + ')';
    let massimo = 0, onde = 0;
    const scoppiata = inchioda(4, [[h, hx, p.y], [pesce, p.x - p.r - pesce.r - 30, p.y]], () => { massimo = Math.max(massimo, p.attivo); onde = Math.max(onde, M.onde.length); return p.alfa < 1 && M.cuori < M.cuoriMax; });
    if (!scoppiata) return 'la mina non è scoppiata (attivo massimo ' + massimo.toFixed(2) + ', cuori ' + M.cuori + '/' + M.cuoriMax + ')';
    if (M.cuori !== M.cuoriMax - 1) return 'lo scoppio non ha tolto un cuore solo';
    if (!onde) return 'lo scoppio non ha lasciato un\'onda da disegnare';
    if (!(pesce.stordito > 1)) return 'il pesce vicino non è rimasto stordito';
    h.invul = 999;
    inchioda(18, [[h, M.largo - h.r - 5, M.alto - h.r - 5]]);
    if (!(p.alfa >= 1)) return 'dopo 18 secondi la mina non è ricomparsa';
    // lontano non si arma
    p.attivo = 0;
    inchioda(3, [[h, p.x + p.r + h.r + 400, p.y]]);
    if (p.attivo > 0) return 'la mina si arma anche da lontano';
  });

  prova('sfiatatoio: erutta a intervalli e la colonna fa male; stalattite: trema, cade e fa male; amo: sale e scende', () => {
    scatola.seme(25); fermo();
    let p = pericoloDi([31, 32, 33], 'eruzione');
    if (!p) return 'nessuno sfiatatoio nei livelli del vulcano';
    let M = B.partita.mondo, h = M.eroe;
    h.invul = 0;
    let statoAlColpo = -1, quando = -1, riposi = 0;
    inchioda(14, [[h, p.x, p.y - 220]], (m, t) => { if (p.stato === 0) riposi++; if (M.cuori < M.cuoriMax) { statoAlColpo = p.stato; quando = t; return true; } });
    if (quando < 0) return 'la colonna dello sfiatatoio non ha fatto male in 14 secondi';
    if (statoAlColpo !== 2 || !(p.colonna > 150)) return 'il colpo è arrivato fuori dall\'eruzione (stato ' + statoAlColpo + ', colonna ' + Math.round(p.colonna) + ')';
    if (riposi < 20) return 'lo sfiatatoio erutta senza pause';
    h.invul = 0; const cuori = M.cuori;
    inchioda(14, [[h, p.x + p.r + h.r + 160, p.y - 220]]);
    if (M.cuori !== cuori) return 'la colonna fa male anche di lato';

    p = pericoloDi([21, 22, 23], 'caduta');
    if (!p) return 'nessuna stalattite nei livelli dei ghiacci';
    M = B.partita.mondo; h = M.eroe; h.invul = 0;
    const x = p.x, y = p.y;
    let tremato = false, caduta = false;
    const colpito = inchioda(6, [[h, x, y + 420]], () => { if (p.stato === 0 && p.attivo > 0.3) tremato = true; if (p.stato === 1 && p.y > y + 40) caduta = true; return M.cuori < M.cuoriMax; });
    if (!tremato) return 'la stalattite non trema quando le passi sotto';
    if (!caduta) return 'la stalattite non cade';
    if (!colpito) return 'la stalattite che cade non fa male';
    if (p.alfa !== 0) return 'dopo il colpo la stalattite non va in frantumi';
    inchioda(12, [[h, h.r + 5, M.alto - h.r - 5]]);
    if (!(p.alfa >= 1 && p.y < 120 && p.stato === 0)) return 'la stalattite non è ricresciuta sul soffitto';

    p = pericoloDi([16, 17, 18], 'pendolo');
    if (!p) return 'nessun amo nei livelli del mare aperto';
    M = B.partita.mondo; h = M.eroe; h.invul = 999;
    let alto = p.y, basso = p.y;
    inchioda(12, [[h, h.r + 5, M.alto - h.r - 5]], () => { alto = Math.min(alto, p.y); basso = Math.max(basso, p.y); });
    if (basso - alto < 300) return 'l\'amo non sale e scende abbastanza: ' + Math.round(basso - alto);
    if (Math.abs(p.x - p.x0) > 40) return 'l\'amo si allontana dalla sua lenza';
    h.invul = 0; addosso(B, p);
    if (M.cuori !== M.cuoriMax - 1) return 'l\'amo non fa male';
  });

  prova('giganti: ogni attacco del cast fa il suo effetto', () => {
    fermo();
    const fatti = new Set();
    for (let n = B.livelli.perAmbiente; n <= B.livelli.totale; n += B.livelli.perAmbiente) {
      const nomi = [...new Set(B.livelli.config(n).obiettivo.attacchi || [])];
      for (const nome of nomi) {
        scatola.seme(300 + n);
        B.partita.avvia({ livello: n });
        const M = B.partita.mondo, g = M.obiettivo, h = M.eroe, a = B.giganti.attacchi[nome], chi = g.def.id + ' / ' + nome;
        if (!g || !g.gigante) return 'al livello ' + n + ' non c\'è un gigante';
        soloLui(B, g); M.bolle.length = 0;
        g.x = M.largo / 2; g.y = M.alto / 2; g.nasce = 0; g.ang = 0; g.riposo = 0;
        g.indiceAttacco = g.attacchi.indexOf(nome); g.prossimoAttacco = 0;
        h.p = Math.round(g.p / 8); h.invul = 999;
        const d = Math.min(a.portata * 0.7, g.r + h.r + 170);
        h.x = g.x + d; h.y = g.y; h.vx = 0; h.vy = 0;
        const visto = { avviso: 0, carica: false, onde: 0, proiettili: 0, sparati: 0, nuvole: 0, scie: 0, buio: 0, tiro: 0, branco: 0, nome: '' };
        for (let i = 0; i < 9 / PASSO && B.partita.stato === 'gioco'; i++) {
          if (nome !== 'risucchio') { h.x = g.x + d; h.y = g.y; h.vx = 0; h.vy = 0; h.kx = 0; h.ky = 0; }
          B.partita.aggiorna(PASSO);
          if (g.stato === 'avviso') visto.avviso = Math.max(visto.avviso, g.carica);
          if (g.stato === 'carica') visto.carica = true;
          if (g.attaccoNome && !visto.nome) visto.nome = g.attaccoNome;
          if (g.indiceAttacco > g.attacchi.indexOf(nome) + 1) break;        // è già passato all'attacco dopo
          visto.onde = Math.max(visto.onde, M.onde.length); visto.proiettili = Math.max(visto.proiettili, M.proiettili.length);
          for (const q of M.proiettili) if (q.eta <= PASSO + 1e-9) visto.sparati++;                 // appena partiti
          visto.nuvole = Math.max(visto.nuvole, M.nuvole.filter(q => q.tipo === 'inchiostro').length); visto.scie = Math.max(visto.scie, M.nuvole.filter(q => q.tipo === 'scia').length);
          visto.buio = Math.max(visto.buio, M.buio); visto.tiro = Math.max(visto.tiro, M.tiro.forza);
          visto.branco = Math.max(visto.branco, M.predatori.filter(e => e.evocato).length);
        }
        if (!(visto.avviso > 0.6)) return chi + ': nessun avviso prima dell\'attacco (carica ' + visto.avviso.toFixed(2) + ')';
        if (visto.nome !== nome) return chi + ': attaccoNome è "' + visto.nome + '"';
        const guasto = nome === 'carica' || nome === 'morso' ? (!visto.carica && 'non parte in carica')
          : nome === 'scia' ? ((!visto.carica || visto.scie < 2) && 'carica senza scia (' + visto.scie + ')')
          : nome === 'risucchio' ? ((!(visto.tiro > 0.3) || !(h.x < g.x + d - 40)) && 'non tira l\'eroe (forza ' + visto.tiro + ', spostato di ' + Math.round(g.x + d - h.x) + ')')
          : nome === 'inchiostro' ? (visto.nuvole < 3 && 'poche nuvole: ' + visto.nuvole)
          : nome === 'tentacoli' || nome === 'onda' ? (visto.onde < 1 && 'nessuna onda')
          : nome === 'sparo' ? (visto.proiettili < 3 && 'pochi proiettili: ' + visto.proiettili)
          : nome === 'raffica' ? (visto.sparati < 5 && 'raffica corta: ' + visto.sparati)
          : nome === 'evoca' ? (visto.branco < 3 && 'branco piccolo: ' + visto.branco)
          : nome === 'buio' ? (!(visto.buio > 0.6) && 'non fa buio: ' + visto.buio.toFixed(2))
          : 'attacco sconosciuto alla prova';
        if (guasto) return chi + ': ' + guasto;
        if (M.cuori !== M.cuoriMax) return chi + ': ha tolto un cuore a un eroe al sicuro';
        fatti.add(nome);
      }
    }
    for (const nome of Object.keys(B.giganti.attacchi)) if (!fatti.has(nome)) return 'l\'attacco "' + nome + '" non è usato da nessun gigante aperto (o non è stato provato)';
  });

  prova('giganti: onda e proiettili fanno male da vicino, non da lontano; il risucchio si vince nuotando via', () => {
    fermo();
    const livelloCon = nome => { for (let n = B.livelli.perAmbiente; n <= B.livelli.totale; n += B.livelli.perAmbiente) if ((B.livelli.config(n).obiettivo.attacchi || []).includes(nome)) return n; return 0; };
    const prepara = (nome, distanza) => {
      scatola.seme(400);
      B.partita.avvia({ livello: livelloCon(nome) });
      const M = B.partita.mondo, g = M.obiettivo, h = M.eroe;
      soloLui(B, g); M.bolle.length = 0;
      g.x = M.largo / 2; g.y = M.alto / 2; g.nasce = 0; g.ang = 0; g.riposo = 0; g.indiceAttacco = g.attacchi.indexOf(nome); g.prossimoAttacco = 0;
      h.p = Math.round(g.p / 8); h.invul = 0; h.x = g.x + g.r + h.r + distanza; h.y = g.y;
      return { M, g, h, x: h.x, y: h.y };
    };
    for (const nome of ['tentacoli', 'onda']) {
      if (!livelloCon(nome)) continue;
      let c = prepara(nome, 70), da = '';
      const via = B.eventi.su('colpito', d => { da = d.da; });
      inchioda(4, [[c.h, c.x, c.y], [c.g, c.g.x, c.g.y]], () => c.M.cuori < c.M.cuoriMax);
      via();
      if (c.M.cuori !== c.M.cuoriMax - 1 || da !== c.g.def.id) return nome + ': da vicino non fa male (cuori ' + c.M.cuori + ', da "' + da + '")';
      c = prepara(nome, 70);
      const lontano = c.g.x + B.giganti.attacchi[nome].portata + c.g.r;
      let onde = 0;
      for (let i = 0; i < 4 / PASSO; i++) {                               // l'eroe vede l'avviso e si allontana
        if (c.g.stato === 'avviso' || c.M.onde.length) { c.h.x = Math.max(c.h.x, lontano - 60); c.h.y = c.g.y; }
        B.partita.aggiorna(PASSO);
        onde = Math.max(onde, c.M.onde.length);
        if (onde && !c.M.onde.length) break;                               // l'onda è passata
      }
      if (!onde) return nome + ': l\'onda non è partita';
      if (c.M.cuori !== c.M.cuoriMax) return nome + ': fa male anche da lontano';
    }
    if (livelloCon('sparo')) {
      const c = prepara('sparo', 260);
      inchioda(6, [[c.h, c.x, c.y], [c.g, c.g.x, c.g.y]], () => c.M.cuori < c.M.cuoriMax);
      if (c.M.cuori !== c.M.cuoriMax - 1) return 'sparo: un proiettile preso in pieno non fa male';
    }
    if (livelloCon('risucchio')) {
      const c = prepara('risucchio', 200);
      c.h.invul = 0;
      B.prova.pilota = M => ({ x: M.eroe.x >= M.obiettivo.x ? 1 : -1, y: 0 });       // nuota via dal gigante
      let tirato = false;
      for (let i = 0; i < 5 / PASSO && B.partita.stato === 'gioco'; i++) { B.partita.aggiorna(PASSO); if (c.M.tiro.forza > 0) tirato = true; }
      fermo();
      if (!tirato) return 'risucchio: non è partito';
      if (c.M.cuori !== c.M.cuoriMax) return 'risucchio: chi nuota via viene preso lo stesso';
    }
  });

  prova('livelli: ambienti aperti, fasce, obiettivi, pericoli, difficoltà', () => {
    const L = B.livelli, aperti = B.cast.aperti;
    if (L.totale !== aperti.length * L.perAmbiente) return 'totale = ' + L.totale + ' con ' + aperti.length + ' ambienti aperti';
    let prima = -1;
    for (let n = 1; n <= L.totale; n++) {
      const c = L.config(n), posto = (n - 1) % L.perAmbiente + 1, idAmb = aperti[Math.ceil(n / L.perAmbiente) - 1];
      if (c.ambiente.id !== idAmb) return 'livello ' + n + ': ambiente ' + c.ambiente.id + ' (atteso ' + idAmb + ')';
      if (L.ambienteDi(n).id !== idAmb) return 'ambienteDi(' + n + ') = ' + L.ambienteDi(n).id;
      if (c.fasce.length !== (n === 1 ? 4 : 5)) return 'livello ' + n + ': ' + c.fasce.length + ' fasce';
      for (const f of c.fasce) {
        if (!f.specie.length || !(f.quanti > 0)) return 'livello ' + n + ': fascia ' + f.taglia + ' vuota';
        for (const s of f.specie) if (s.tipo !== 'pesce' || s.taglia !== f.taglia) return 'livello ' + n + ': ' + s.id + ' nella fascia ' + f.taglia;
        if (!f.specie.some(s => s.ambienti.includes(idAmb))) return 'livello ' + n + ': la fascia ' + f.taglia + ' non ha specie dell\'ambiente';
      }
      const ob = c.obiettivo;
      if (posto === L.perAmbiente) { if (ob.tipo !== 'gigante' || ob.def.id !== c.ambiente.gigante || ob.morsi !== 3) return 'livello ' + n + ': manca il gigante dell\'ambiente con tre morsi'; }
      else if (ob.tipo !== 'capobranco' || !ob.def || ob.def.taglia !== 5 || ob.morsi !== 1 || !(ob.r > B.cast.raggi[4]) || !ob.def.ambienti.includes(idAmb)) return 'livello ' + n + ': capobranco sbagliato (' + (ob.def && ob.def.id) + ')';
      if (!(ob.potenza > c.fasce[c.fasce.length - 1].max)) return 'livello ' + n + ': l\'obiettivo non è più forte dei pesci';
      if (n === 1 && c.pericoli.length) return 'al livello 1 ci sono pericoli';
      if (n > 1 && !c.pericoli.length) return 'livello ' + n + ': nessun pericolo';
      for (const g of c.pericoli) if (!c.ambiente.pericoli.includes(g.def.id)) return 'livello ' + n + ': pericolo di un altro ambiente (' + g.def.id + ')';
      if (!c.banchi.quanti || !c.banchi.specie.every(s => c.ambiente.banchi.includes(s.id))) return 'livello ' + n + ': banchi sbagliati';
      if (!(c.tempoStella > 60)) return 'livello ' + n + ': tempo per la stella ' + c.tempoStella;
      if (c.difficolta < prima) return 'livello ' + n + ': la difficoltà scende';
      prima = c.difficolta;
    }
    if (L.config(0).n !== 1 || L.config(999).n !== L.totale) return 'config fuori dai limiti non ripiega su un livello vero';
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
  const aperti = B.cast.ambienti.filter(amb => B.livelli.aperti.includes(amb.id));
  for (const amb of aperti) {
    try { B.partita.sfondoMenu(amb.id); avanza(B, 5, problemi, 'menu ' + amb.id); if (B.partita.stato !== 'ferma') problemi.push('menu ' + amb.id + ': stato ' + B.partita.stato); }
    catch (e) { problemi.push('menu ' + amb.id + ': ' + (e.stack || e)); }
  }
  // 3. la sopravvivenza, due minuti per ambiente
  for (const amb of aperti) {
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
  console.log('Prova del fumo' + (a.sottoinsieme ? ' con una parte sola dei contenuti' : '') + ': ' + B.livelli.totale + ' livelli × 30 s, ' + aperti.length + ' menu, '
    + aperti.length + ' sopravvivenze × 120 s, ' + mirate.length + ' prove mirate — ' + ((Date.now() - inizio) / 1000).toFixed(1) + ' s');
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
