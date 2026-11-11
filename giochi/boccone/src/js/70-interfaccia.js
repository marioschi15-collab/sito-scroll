/* Boccone — interfaccia: B.schermate (il gestore delle schermate) e B.interfaccia (i pezzi comuni: bottoni, gettone
   delle perle, avvisi a comparsa, modelli animati, cruscotto di gioco, annunci, consigli della prima partita).
   Le schermate vere e proprie sono in 71-schermate.js; i collegamenti con gli eventi in 99-avvio.js. */
(() => {
'use strict';
const B = window.B, U = B.util;
const $ = id => document.getElementById(id);
const numero = n => (B.disegno ? B.disegno.compatto(n) : U.numero(n));
const suono = nome => { if (B.audio) { B.audio.avvia(); B.audio.effetto(nome); } };

// ---------------------------------------------------------------- pezzi
function el(tag, classe, testo) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined && testo !== null) e.textContent = testo;
  return e;
}
/* Un bottone: testo, classe, che cosa fa, e (facoltativa) una riga piccola sotto. */
function bottone(testo, classe, azione, sotto) {
  const b = el('button', classe);
  b.type = 'button';
  b.append(el('span', 'scritta', testo));
  if (sotto !== undefined) b.append(el('small', '', sotto));
  b.addEventListener('click', () => { if (b.disabled) return; suono('tasto'); azione(b); });
  return b;
}
function scrivi(b, testo, sotto) {
  const s = b.querySelector('.scritta'), p = b.querySelector('small');
  if (s && testo !== undefined) s.textContent = testo;
  if (p && sotto !== undefined) p.textContent = sotto;
}
const stelline = n => '★'.repeat(n) + '<i>' + '★'.repeat(Math.max(0, 3 - n)) + '</i>';
const minuti = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

/* Il gettone con le perle possedute: si aggiorna da solo. */
const gettoni = [];
function gettonePerle() {
  const g = el('span', 'borsa'), n = el('span', '', numero(B.progressi.perle()));
  g.append(el('i', 'perla'), n);
  gettoni.push(n);
  return g;
}
function aggiornaGettoni() { const s = numero(B.progressi.perle()); for (const n of gettoni) if (n.textContent !== s) n.textContent = s; }

/* La testata di una schermata: freccia per tornare indietro, titolo e (se serve) le perle. */
function testata(titolo, opzioni) {
  const t = el('div', 'testata'), o = opzioni || {};
  const dietro = bottone('‹', 'tondo', () => (o.indietro ? o.indietro() : B.schermate.indietro()));
  dietro.setAttribute('aria-label', 'Indietro');
  t.append(dietro, el('h2', '', titolo));
  if (o.perle !== false) t.append(gettonePerle());
  return t;
}

// ---------------------------------------------------------------- avvisi a comparsa
const codaAvvisi = [];
let avvisiVivi = 0;
function avviso(testo, opzioni) {
  const o = opzioni || {};
  const casa = $('avvisi');
  if (!casa) return;
  /* Uno alla volta (in partita più svelti), per non coprire annunci e schermate; in coda al massimo tre: gli altri
     non si perdono, i traguardi restano segnati nella loro schermata. */
  const inPartita = casa.classList.contains('in-partita');
  if (avvisiVivi >= 1) { if (codaAvvisi.length < 3 && !o.leggero) codaAvvisi.push([testo, o]); return; }
  const a = el('div', 'avviso' + (o.classe ? ' ' + o.classe : '')), corpo = el('div', '', testo), durata = o.durata || (inPartita ? 2.2 : 3);
  if (o.segno) a.append(el('span', 'segno', o.segno));
  if (o.sotto) corpo.append(el('small', '', o.sotto));
  a.append(corpo); a.style.setProperty('--durata', durata + 's');
  casa.append(a); avvisiVivi++;
  setTimeout(() => { a.remove(); avvisiVivi--; const p = codaAvvisi.shift(); if (p) avviso(p[0], p[1]); }, durata * 1000);
}

// ---------------------------------------------------------------- modelli animati
const vivi = [];
const om = { fase: 0, t: 0, bocca: 0, minaccia: false, stadio: 0, espressione: 'normale', sguardo: { x: 1, y: 0 }, stato: 'calmo', carica: 0, attivo: 0, dettaglio: 1, furia: 0 };
/* Mostra un modello dentro una tela. opzioni: w, h (misure in pixel della pagina), fermo (un solo disegno),
   sagoma (solo il profilo scuro), stadio, minaccia, pieno (quanta parte della tela occupa, 0..1). */
function modelloVivo(tela, def, opzioni) {
  const o = opzioni || {}, dpr = Math.min(window.devicePixelRatio || 1, 2);
  tela.width = Math.round((o.w || 96) * dpr); tela.height = Math.round((o.h || 64) * dpr);
  const m = { tela, c: tela.getContext('2d'), def, o, t: o.fermo ? 0.3 : Math.random() * 4, via: false };
  disegnaModello(m, 0);
  if (!o.fermo) vivi.push(m);
  return m;
}
function disegnaModello(m, dt) {
  const c = m.c, def = m.def, o = m.o, g = def.ingombro, W = m.tela.width, H = m.tela.height;
  m.t += dt;
  const s = Math.min(W / (g.x1 - g.x0), H / (g.y1 - g.y0)) * (o.pieno || .9), eroe = !def.tipo, t = m.t;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
  c.translate(W / 2 - (g.x0 + g.x1) / 2 * s, H / 2 - (g.y0 + g.y1) / 2 * s); c.scale(s, s);
  om.fase = (t * .85) % 1; om.t = t; om.dettaglio = 1; om.stato = 'calmo'; om.carica = 0; om.furia = 0;
  om.minaccia = o.minaccia !== undefined ? !!o.minaccia : !eroe && def.tipo !== 'pericolo' && !o.fermo && (t % 7) > 4.6;
  om.bocca = o.fermo ? 0 : om.minaccia ? .55 + .4 * Math.sin(t * 9) : eroe ? Math.max(0, Math.sin(t * 2.1)) * .5 : 0;
  om.attivo = def.tipo === 'pericolo' ? .5 + .5 * Math.sin(t * 1.5) : 0;
  om.stadio = o.stadio !== undefined ? o.stadio : Math.floor(t / 2.6) % 3;
  om.espressione = eroe && (t % 5.2) > 4.2 ? 'felice' : 'normale';
  om.sguardo.x = Math.cos(t * .7); om.sguardo.y = Math.sin(t * .9) * .5;
  c.save();
  try { def.disegna(c, om); } catch (e) { /* un modello rotto non deve fermare la schermata */ }
  c.restore();
  if (o.sagoma) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-in'; c.fillStyle = '#0d2146'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
}
let pari = false;
/* Da chiamare a ogni fotogramma: anima i modelli che si vedono (a fotogrammi alterni: bastano 30 al secondo). */
function anima(dt) {
  pari = !pari;
  for (let i = vivi.length - 1; i >= 0; i--) {
    const m = vivi[i];
    if (m.via || !m.tela.isConnected) { vivi.splice(i, 1); continue; }
    if ((i & 1) === (pari ? 1 : 0) || m.tela.offsetParent === null) continue;
    disegnaModello(m, dt * 2);
  }
}

// ---------------------------------------------------------------- schermate
const registrate = new Map(), pila = [];
let corrente = null;
function mostraSchermata(id, dati, opzioni) {
  const s = registrate.get(id);
  if (!s) { console.error('[Boccone] schermata sconosciuta: ' + id); return; }
  const o = opzioni || {};
  if (corrente && corrente !== s && !o.senzaPila) pila.push({ id: corrente.id, dati: corrente.dati });
  if (corrente && corrente !== s) nascondiCorrente();
  if (id === 'casa') pila.length = 0;
  if (!s.radice) {
    s.radice = el('div', 'schermata'); s.radice.id = 's-' + id;
    $('schermate').append(s.radice);
    s.def.crea(s.radice);
  }
  corrente = s; s.dati = dati;
  if (s.def.mostra) s.def.mostra(dati);
  s.radice.classList.add('visibile');
  const corpo = s.radice.querySelector('.corpo');
  if (corpo && !o.fermo) corpo.scrollTop = 0;
  B.eventi.emetti('schermata', { id });
}
function nascondiCorrente() {
  if (!corrente) return;
  corrente.radice.classList.remove('visibile');
  if (corrente.def.nascondi) corrente.def.nascondi();
  corrente = null;
}
B.schermate = {
  registra(id, def) { registrate.set(id, { id, def, radice: null, dati: undefined }); },
  mostra: mostraSchermata,
  /* Torna alla schermata di prima (alla casa, se non ce n'è una). */
  indietro() {
    const p = pila.pop();
    if (p) mostraSchermata(p.id, p.dati, { senzaPila: true });
    else if (!corrente || corrente.id !== 'casa') mostraSchermata('casa', undefined, { senzaPila: true });
  },
  /* Toglie tutte le schermate (comincia la partita). */
  chiudi() { nascondiCorrente(); pila.length = 0; B.eventi.emetti('schermata', { id: null }); },
  corrente: () => (corrente ? corrente.id : null),
  /* Rilegge i dati della schermata che si vede (dopo un acquisto, un premio…). */
  aggiorna() { if (corrente && corrente.def.aggiorna) corrente.def.aggiorna(corrente.dati); },
};

// ---------------------------------------------------------------- cruscotto
const cache = Object.create(null);
function metti(id, proprieta, valore) {
  const k = id + proprieta;
  if (cache[k] === valore) return;
  cache[k] = valore;
  const e = $(id);
  if (!e) return;
  if (proprieta === 'width') e.style.width = valore; else e[proprieta] = valore;
}
/* La barra della vita del gigante: una riga intera sotto l'avanzamento, con il nome e il numero che gli resta
   (♛ Don Cernia … 2,4 mln). La pagina non ce l'ha: la si aggiunge qui, una volta sola. */
function creaBarraVita() {
  const alto = $('cr-alto');
  if (!alto || $('cr-vita')) return;
  const b = el('div', 'vetro');
  b.id = 'cr-vita';
  for (const [tag, id] of [['i', 'cr-vita-piena'], ['span', 'cr-vita-nome'], ['b', 'cr-vita-num']]) { const e = el(tag); e.id = id; b.append(e); }
  alto.insertBefore(b, $('cr-sotto'));
}
creaBarraVita();
/* Aggiorna la barra del gigante: quanto è piena, di che colore (la furia sale quando la vita scende sotto i due terzi e
   sotto un terzo; verde quando l'eroe lo può mangiare in un boccone) e un sussulto a ogni morso. */
function aggiornaVita(ob) {
  const c = $('cruscotto'), b = $('cr-vita'), gigante = !!ob && ob.gigante;
  if (cache.gigante !== gigante) { cache.gigante = gigante; cache.vita = -1; if (c) c.classList.toggle('con-gigante', gigante); }
  if (!gigante || !b) return;
  metti('cr-vita-nome', 'textContent', '♛ ' + ob.nome);
  metti('cr-vita-num', 'textContent', ob.potenza > 0 ? numero(ob.potenza) : 'sconfitto!');
  metti('cr-vita-piena', 'width', (U.limita(ob.vita, 0, 1) * 100).toFixed(1) + '%');
  const stato = ob.boccone ? 'verde' : ob.vita > 2 / 3 ? '' : ob.vita > 1 / 3 ? 'furia1' : 'furia2';
  if (cache.vitaStato !== stato) { cache.vitaStato = stato; for (const k of ['verde', 'furia1', 'furia2']) b.classList.toggle(k, k === stato); }
  if (cache.vita >= 0 && ob.potenza < cache.vita) { b.classList.remove('colpo'); void b.offsetWidth; b.classList.add('colpo'); }   // un morso: la barra sussulta
  cache.vita = ob.potenza;
}
function aggiornaCruscotto() {
  const d = B.partita.dati, ob = d.obiettivo;
  let largoObiettivo = '';
  if (ob) {
    // con il gigante la riga in alto dice da quando lo si può mordere (la sua vita sta nella barra rossa)
    const s = !ob.gigante ? '♛ ' + numero(ob.potenza) : ob.boccone ? 'Mangialo!' : ob.puoMordere ? 'Mordilo!' : 'morso da ' + numero(ob.sogliaMorso);
    metti('cr-obiettivo', 'textContent', s);
    largoObiettivo = String(s.length);
  } else metti('cr-obiettivo', 'textContent', minuti(d.tempo));
  aggiornaVita(ob);
  const perle = numero(B.progressi.perle());
  metti('cr-perle-num', 'textContent', perle);
  /* Il nome dell'ambiente si scrive solo se c'è posto accanto all'obiettivo: se non ci sta resta "Livello 3". Si
     ricontrolla solo quando cambia il testo, la larghezza dell'obiettivo, quella del conto delle perle (che ruba
     posto alla riga) o quella dello schermo. */
  const corto = d.modalita === 'sopravvivenza' ? 'Sopravvivenza' : 'Livello ' + d.livello, lungo = corto + ' · ' + d.nomeAmbiente;
  const chiave = lungo + '|' + largoObiettivo + '|' + perle.length + '|' + window.innerWidth;
  if (cache.livelloChiave !== chiave) {
    const e = $('cr-livello');
    if (e) {
      e.textContent = lungo;
      if (e.clientWidth > 0) { cache.livelloChiave = chiave; if (e.scrollWidth > e.clientWidth + 1) e.textContent = corto; }   // se il cruscotto non si vede ancora, si riprova
    }
  }
  metti('cr-barra-piena', 'width', (d.avanzamento * 100).toFixed(1) + '%');
  metti('cr-frenesia-piena', 'width', (d.frenesia * 100).toFixed(0) + '%');
  metti('cr-cuori', 'innerHTML', '<span class="pieno">' + '♥'.repeat(Math.max(0, d.cuori)) + '</span><span class="vuoto">' + '♥'.repeat(Math.max(0, d.cuoriMax - d.cuori)) + '</span>');
  let s = '';
  if (d.frenesiaT > 0) s += '<span class="gettone vetro fre">Frenesia ×2 · ' + Math.ceil(d.frenesiaT) + ' s</span>';
  if (d.moltT > 0) s += '<span class="gettone vetro molt">×' + d.molt + ' · ' + Math.ceil(d.moltT) + ' s</span>';
  if (d.calamitaT > 0) s += '<span class="gettone vetro cal">Calamita · ' + Math.ceil(d.calamitaT) + ' s</span>';
  if (d.scudo) s += '<span class="gettone vetro scu">Scudo</span>';
  metti('cr-aiuti', 'innerHTML', s);
  const car = Math.round(U.limita(d.scatto, 0, 1) * 50) * 2;
  if (cache.car !== car) { cache.car = car; const b = $('cr-scatto'); b.style.setProperty('--car', car + '%'); b.classList.toggle('pronto', car >= 100); }
  aggiornaConsigli();
}
function mostraCruscotto(si) {
  $('cruscotto').classList.toggle('visibile', !!si);
  $('avvisi').classList.toggle('in-partita', !!si);
  if (si) { leggiMano(); aggiornaCruscotto(); }
}
function leggiMano() { $('cruscotto').classList.toggle('mano-sinistra', B.progressi.impostazione('mano') === 'sinistra'); }

function annuncio(titolo, sotto, durata) {
  const a = $('cr-annuncio');
  if (!a) return;
  $('cr-annuncio-titolo').textContent = titolo || ''; $('cr-annuncio-sotto').textContent = sotto || '';
  a.style.setProperty('--durata', (durata || 2.4) + 's');
  a.classList.remove('vai'); void a.offsetWidth; a.classList.add('vai');
}

// ---------------------------------------------------------------- consigli guidati della prima partita
const ditoFine = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const CONSIGLI = [
  { testo: ditoFine ? 'Trascina il dito sullo schermo per nuotare' : 'Trascina sullo schermo per nuotare (o usa le frecce)', fatto: g => g.strada > 450, durata: 14 },
  { testo: 'Mangia i pesciolini per crescere', fatto: (g, M) => M.eroe.p >= 14, durata: 18 },
  { testo: 'Numero verde: mangialo! Numero rosso: scappa!', fatto: g => g.mangiati > 0, durata: 16 },
  { testo: 'Tocca SCATTO per uno sprint', fatto: g => g.scatti > 0, durata: 12 },
  { testo: 'Le bolle regalano aiuti: prendile!', fatto: g => g.aiuti > 0, durata: 9 },
];
const guida = { attiva: false, passo: 0, t: 0, pausa: 0, strada: 0, mangiati: 0, scatti: 0, aiuti: 0, x: 0, y: 0, tPrima: 0 };
function avviaConsigli() {
  guida.attiva = !B.progressi.tutorialFatto();
  guida.passo = 0; guida.t = 0; guida.pausa = 2.8; guida.strada = 0; guida.mangiati = 0; guida.scatti = 0; guida.aiuti = 0; guida.tPrima = 0;
  consiglio('');
}
function consiglio(testo) {
  const c = $('cr-consiglio');
  if (!c) return;
  if (testo) c.textContent = testo;
  c.classList.toggle('visibile', !!testo);
}
function aggiornaConsigli() {
  if (!guida.attiva) return;
  const M = B.partita.mondo;
  if (!M || !M.eroe || B.partita.stato !== 'gioco') { if (B.partita.stato !== 'pausa') consiglio(''); return; }
  const h = M.eroe, dt = guida.tPrima ? Math.min(.1, Math.max(0, M.tempo - guida.tPrima)) : 0;
  guida.tPrima = M.tempo;
  if (guida.x || guida.y) guida.strada += Math.min(40, Math.hypot(h.x - guida.x, h.y - guida.y));
  guida.x = h.x; guida.y = h.y;
  if (guida.pausa > 0) { guida.pausa -= dt; if (guida.pausa <= 0) { guida.t = 0; consiglio(CONSIGLI[guida.passo].testo); } return; }
  const c = CONSIGLI[guida.passo];
  guida.t += dt;
  if ((guida.t > 2.5 && c.fatto(guida, M)) || guida.t > c.durata) {
    consiglio(''); guida.passo++; guida.pausa = 1.2;
    if (guida.passo >= CONSIGLI.length) { guida.attiva = false; B.progressi.segnaTutorial(); }
  }
}
B.eventi.su('mangiato', () => { guida.mangiati++; });
B.eventi.su('scatto', () => { guida.scatti++; });
B.eventi.su('aiuto', () => { guida.aiuti++; });

// ---------------------------------------------------------------- partita: avvio, pausa, uscita
const ultima = { livello: 1, modalita: 'avventura', ambiente: undefined };
/* Fa partire una partita: { livello, modalita, ambiente }. Senza argomenti rigioca l'ultima. */
function gioca(opzioni) {
  if (opzioni) { ultima.livello = opzioni.livello || 1; ultima.modalita = opzioni.modalita || 'avventura'; ultima.ambiente = opzioni.ambiente; }
  if (B.audio) B.audio.avvia();
  const attesa = $('attesa');
  attesa.classList.add('visibile');
  B.schermate.chiudi();
  setTimeout(() => {                                // un attimo, perché "Si parte…" si veda prima del lavoro
    try { B.partita.avvia({ livello: ultima.livello, modalita: ultima.modalita, ambiente: ultima.ambiente }); }
    catch (e) { console.error('[Boccone] la partita non parte', e); mostraCruscotto(false); mostraSchermata('casa'); avviso('Non riesco ad aprire questo livello', { segno: '!' }); }
    attesa.classList.remove('visibile');
  }, 40);
}
function pausa() {
  if (B.partita.stato !== 'gioco') return;
  B.partita.pausa(); if (B.comandi) B.comandi.azzera();
  mostraSchermata('pausa');
}
function riprendi() {
  if (B.partita.stato !== 'pausa') return;
  if (B.audio) B.audio.avvia();
  B.schermate.chiudi(); B.partita.riprendi();
}
/* Lascia la partita (o il risultato) e torna alla casa: il mondo resta come acquario sullo sfondo. */
function esci(schermata) {
  B.partita.abbandona(); if (B.comandi) B.comandi.azzera();
  mostraCruscotto(false); consiglio('');
  B.schermate.chiudi();
  mostraSchermata('casa');
  if (schermata && schermata !== 'casa') mostraSchermata(schermata);
}

const sc = $('cr-scatto'), pa = $('cr-pausa');
if (sc) sc.addEventListener('pointerdown', e => { e.preventDefault(); if (B.audio) B.audio.avvia(); B.partita.scatta(); });
if (pa) pa.addEventListener('click', () => { suono('tasto'); pausa(); });

B.interfaccia = {
  el, bottone, scrivi, testata, gettonePerle, aggiornaGettoni, stelline, minuti, numero, suono,
  avviso, modelloVivo, anima,
  cruscotto: { mostra: mostraCruscotto, aggiorna: aggiornaCruscotto, mano: leggiMano },
  annuncio, avviaConsigli, consiglio,
  gioca, pausa, riprendi, esci, ultima,
};
})();
