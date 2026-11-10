/* Boccone — i comandi (B.comandi): la leva a dito, che compare dove tocchi, e la tastiera
   (frecce o WASD per nuotare, spazio per lo scatto, P o Esc per la pausa).
   B.comandi.direzione() → { x, y } di lunghezza al massimo 1: la legge il mondo a ogni passo. */
(() => {
'use strict';
const B = window.B;
const CORSA = 50;          // pixel di trascinamento per andare alla massima velocità
const GUINZAGLIO = 70;     // oltre questa distanza il centro della leva segue il dito

const leva = { attiva: false, id: null, x0: 0, y0: 0, x: 0, y: 0 };
const tasti = new Set();
const dir = { x: 0, y: 0 };
const tela = document.getElementById('tela');
const inGioco = () => !!B.partita && B.partita.stato === 'gioco';

function molla() { leva.attiva = false; leva.id = null; }
function azzera() { molla(); tasti.clear(); }

if (tela) {
  tela.addEventListener('pointerdown', e => {
    if (!inGioco() || leva.attiva) return;
    leva.attiva = true; leva.id = e.pointerId; leva.x0 = leva.x = e.clientX; leva.y0 = leva.y = e.clientY;
    try { tela.setPointerCapture(e.pointerId); } catch (err) {}
    if (B.audio && B.audio.avvia) B.audio.avvia();
    e.preventDefault();
  });
  tela.addEventListener('pointermove', e => {
    if (!leva.attiva || e.pointerId !== leva.id) return;
    leva.x = e.clientX; leva.y = e.clientY;
    const dx = leva.x - leva.x0, dy = leva.y - leva.y0, d = Math.hypot(dx, dy);
    if (d > GUINZAGLIO) { leva.x0 += dx / d * (d - GUINZAGLIO); leva.y0 += dy / d * (d - GUINZAGLIO); }
  });
  const rilascia = e => { if (e.pointerId === leva.id) molla(); };
  tela.addEventListener('pointerup', rilascia);
  tela.addEventListener('pointercancel', rilascia);
  tela.addEventListener('lostpointercapture', rilascia);
}

const SCORRE = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '];
window.addEventListener('keydown', e => {
  const k = (e.key || '').toLowerCase(), bersaglio = e.target && e.target.tagName;
  if (bersaglio === 'INPUT' || bersaglio === 'TEXTAREA' || bersaglio === 'SELECT') return;
  tasti.add(k);
  if (inGioco() && SCORRE.includes(k)) e.preventDefault();
  if (k === ' ' && inGioco() && !e.repeat) B.partita.scatta();
  if ((k === 'escape' || k === 'p') && !e.repeat) B.eventi.emetti('comando', { tipo: 'pausa' });
});
window.addEventListener('keyup', e => tasti.delete((e.key || '').toLowerCase()));
window.addEventListener('blur', azzera);
document.addEventListener('contextmenu', e => e.preventDefault());
// Niente zoom col doppio tocco o con due dita, niente pagina che si trascina mentre si gioca.
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

function direzione() {
  let x = 0, y = 0;
  if (leva.attiva) { x = (leva.x - leva.x0) / CORSA; y = (leva.y - leva.y0) / CORSA; }
  else {
    if (tasti.has('arrowleft') || tasti.has('a')) x -= 1;
    if (tasti.has('arrowright') || tasti.has('d')) x += 1;
    if (tasti.has('arrowup') || tasti.has('w')) y -= 1;
    if (tasti.has('arrowdown') || tasti.has('s')) y += 1;
  }
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  dir.x = x; dir.y = y;
  return dir;
}

B.comandi = { direzione, leva, azzera, inUso: () => leva.attiva || tasti.size > 0 };
})();
