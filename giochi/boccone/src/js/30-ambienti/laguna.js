/* Boccone — ambiente «Laguna corallina» (id: laguna). Contratto: ARCHITETTURA.md §4.

   Come è fatto questo file (vale da modello per gli altri ambienti):
   1. attrezzi (colori, tele, figurine);
   2. i "pittori": una funzione per ogni elemento (gorgonia, corallo a cervello, spugne…), che disegna in unità di
      mondo con l'origine nel piede dell'elemento. Gli stessi pittori servono per le figurine del fondale, per le grandi
      formazioni e per le pareti;
   3. il "corredo": tutte le tele fuori schermo, dipinte UNA volta sola (la prima crea()) e poi riusate a ogni livello;
   4. crea(): solo la disposizione (dove sta che cosa), con il caso ripetibile del livello;
   5. le quattro passate, che quasi soltanto copiano tele.

   Piani, dal più lontano: acqua (sfumatura) · lame di sole · tre strisce di scogliera in parallasse (sfondo) ·
   cielo, nuvole, isole · grandi formazioni velate · scogliere ai lati · pelo dell'acqua · fila di dietro e dorsale di
   sabbia · prima fila (con posidonia e anemoni vivi) · sabbia · luce sul fondo · stelle e conchiglie (dietro) ·
   poche fronde scure, bollicine, pulviscolo (davanti) · lame di sole leggere, riflessi, bordi più scuri (velo).

   Costi (misurati su tela senza scheda grafica, in riempimenti a tutto schermo):
   - copiare una tela pari pari (1 pixel di tela = 1 pixel di schermo, posizione intera) costa 0,3; ingrandita,
     rimpicciolita, specchiata o su mezzi pixel costa 2,7; ruotata o inclinata 5. Per questo le figurine del fondale
     sono dipinte a 2 pixel per unità e posate su mezze unità intere: a zoom 1 su uno schermo 2x si copiano pari pari;
   - createPattern costa 5–6: qui non c'è, le ripetizioni sono strisce copiate una accanto all'altra;
   - 'lighter' costa il triplo della copia normale: la luce è bianco trasparente già dentro la tela;
   - una sfumatura a due colori costa 1, a tre o più colori più del doppio; un riempimento pieno 0,15–0,25;
   - senza filtro (imageSmoothingEnabled = false) una copia ingrandita costa un quarto: lo usano i piani lontani, che
     sono già sfumati, e tutta la qualità bassa;
   - ciò che si muove (posidonia, anemoni, onde, lame di sole) è fatto di pochi tracciati riempiti in un colpo solo. */
(() => {
'use strict';
const B = window.B, U = B.util, TAU = Math.PI * 2, PI = Math.PI, limita = U.limita, rumore = U.rumore;

const S = 2;             // pixel per unità di mondo nelle figurine del fondale
const OLTRE = 1700;      // fin dove si dipinge fuori dal mondo
const AGIO = 48;         // quanto si dipinge oltre il bordo della visuale: quando lo schermo trema il mondo si sposta di qualche pixel
const PARETE_L = 288;    // larghezza delle strisce di scogliera ai lati
const PEND = .34;        // pendenza delle lame di sole
const ACQUA = '#36a8c9'; // il velo d'acqua che allontana le cose
const BLU = '#12466e';   // verso dove virano le ombre

// ---------------------------------------------------------------- colori
const memoRgb = {};
function rgb(h) { return memoRgb[h] || (memoRgb[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]); }
function esa(r, g, b) { return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1); }
function mesc(a, b, t) { const p = rgb(a), q = rgb(b); return esa(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); }
function alfa(h, a) { const p = rgb(h); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
const chiaro = (c, t) => mesc(c, '#ffffff', t), scuro = (c, t) => mesc(c, BLU, t);

/* Il colore dell'acqua secondo la profondità (0 = superficie, 1 = fondale). */
const RAMPA = [[-.25, '#8fe8e4'], [0, '#66d7dd'], [.3, '#3ab9d4'], [.65, '#239bc7'], [1, '#1b7eb0'], [1.45, '#166898']].map(p => [p[0], rgb(p[1])]);
function tinta(u) {
  let i = 1;
  while (i < RAMPA.length - 1 && u > RAMPA[i][0]) i++;
  const a = RAMPA[i - 1], b = RAMPA[i], k = limita((u - a[0]) / (b[0] - a[0]), 0, 1);
  return 'rgb(' + Math.round(a[1][0] + (b[1][0] - a[1][0]) * k) + ',' + Math.round(a[1][1] + (b[1][1] - a[1][1]) * k) + ',' + Math.round(a[1][2] + (b[1][2] - a[1][2]) * k) + ')';
}

// ---------------------------------------------------------------- profili che non cambiano (li usano tele e disposizione)
const duna = x => 8 + 7 * Math.sin(x * TAU / 1024 + .6) + 4.5 * Math.sin(x * TAU / 1024 * 3 + 2.1) + 2.5 * Math.sin(x * TAU / 1024 * 7 + 4);   // sabbia davanti: da -6 a 22 sotto il fondale
const dorsale = x => -30 + 11 * Math.sin(x * TAU / 512 + .8) + 6 * Math.sin(x * TAU / 512 * 3 + 2);                                               // sabbia dietro: da -47 a -13
const onda = (x, t) => 6 * Math.sin(x * .021 + t * 1.25) + 3.5 * Math.sin(x * .052 - t * 1.8 + 1.3) + 2 * Math.sin(x * .0093 + t * .6);         // pelo dell'acqua
const ciglio = y => -52 + 22 * Math.sin(y / 170 + 1) + 13 * Math.sin(y / 67 + 2.2) + 7 * Math.sin(y / 29 + .5);                                   // faccia della scogliera: da -94 a -10

// ---------------------------------------------------------------- tele e figurine
let pixel = 0;
function tela(w, h) { const im = U.tela(Math.min(1024, w), Math.min(1024, h)); pixel += im.width * im.height; return im; }
function penna(im) { const x = im.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; return x; }

/* Una figurina: tela a `scala` pixel per unità; chi disegna ha l'origine nel piede (centro, in basso). */
function figurina(w, h, piede, disegna, scala = S, velo = .07) {
  const im = tela(Math.round(w * scala), Math.round(h * scala)), x = penna(im);
  x.scale(scala, scala); x.translate(w / 2, h - piede);
  disegna(x);
  if (velo) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = alfa(ACQUA, velo); x.fillRect(0, 0, im.width, im.height); }
  return { im, w, h, ax: w / 2, ay: h - piede };
}
/* La stessa figurina per la fila di dietro: più piccola, allo specchio e velata d'acqua. */
function lontana(f, k = .72) {
  const w = Math.round(f.w * k), h = Math.round(f.h * k), im = tela(w * S, h * S), x = im.getContext('2d');
  x.translate(im.width, 0); x.scale(-1, 1); x.drawImage(f.im, 0, 0, im.width, im.height);
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop';
  x.fillStyle = alfa(ACQUA, .42); x.fillRect(0, 0, im.width, im.height);
  return { im, w, h, ax: w - f.ax * k, ay: f.ay * k };
}

// ---------------------------------------------------------------- attrezzi di disegno
function sfuma(x, c0, c1, y0, y1) { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
/* Alone morbido (luce bianca o ombra colorata) a ellisse. */
function lucido(x, cx, cy, rx, ry, rot, a, col = '#ffffff') {
  x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(1, ry / rx);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, alfa(col, a)); g.addColorStop(1, alfa(col, 0));
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill(); x.restore();
}
function puntiMacchia(cx, cy, rx, ry, caso, irr = .18, n = 9) {
  const p = [], f = caso() * TAU;
  for (let i = 0; i < n; i++) { const a = f + i / n * TAU, k = 1 + (caso() - .5) * 2 * irr; p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return p;
}
/* Curva chiusa morbida per i punti medi. Non fa beginPath: se ne possono mettere tante in un tracciato. */
function liscia(x, p) {
  const n = p.length;
  x.moveTo((p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2);
  for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; x.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  x.closePath();
}
function macchia(x, cx, cy, rx, ry, caso, irr, n) { liscia(x, puntiMacchia(cx, cy, rx, ry, caso, irr, n)); }
/* Cupola irregolare appoggiata sulla base: punti da sinistra a destra. */
function cupola(w, h, caso, irr, n) {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = PI + i / n * PI, k = i === 0 || i === n ? 1 : 1 + (caso() - .5) * 2 * irr; p.push([Math.cos(a) * w / 2 * k, Math.sin(a) * h * k]); }
  return p;
}
function tracciaCupola(x, p, sotto) {
  const n = p.length - 1;
  x.beginPath(); x.moveTo(p[0][0], sotto); x.lineTo(p[0][0], p[0][1]);
  for (let i = 1; i < n; i++) { const a = p[i], b = p[i + 1]; if (i === n - 1) x.quadraticCurveTo(a[0], a[1], b[0], b[1]); else x.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  x.lineTo(p[n][0], sotto); x.closePath();
}
/* Luce dall'alto e ombra al piede su tutto ciò che c'è già nella tela (solo per le figurine singole). */
function luceDallAlto(x, y0, y1, forzaLuce = .26, forzaOmbra = .3) {
  x.save(); x.globalCompositeOperation = 'source-atop';
  const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(255,255,255,' + forzaLuce + ')'); g.addColorStop(.55, 'rgba(255,255,255,0)'); g.addColorStop(1, alfa(BLU, forzaOmbra));
  x.fillStyle = g; x.fillRect(-700, y0 - 80, 1400, y1 - y0 + 160); x.restore();
}

/* Sul bordo sinistro di una tela riporta ciò che c'è già al colore pieno (sfumatura verticale da c0 a c1 tra le righe y0 e y1,
   in pixel della tela), svanendo in `largo` pixel: così il riempimento che continua fuori dalla tela non fa scalino. */
function raccordo(im, c0, c1, y0, y1, largo) {
  const t = U.tela(largo, im.height), x = t.getContext('2d');
  x.fillStyle = sfuma(x, c0, c1, y0, y1); x.fillRect(0, 0, largo, im.height);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createLinearGradient(0, 0, largo, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, largo, im.height);
  const y = im.getContext('2d');
  y.save(); y.setTransform(1, 0, 0, 1, 0, 0); y.globalCompositeOperation = 'source-atop'; y.drawImage(t, 0, 0); y.restore();
}

// ---------------------------------------------------------------- i pittori (origine nel piede, y verso l'alto negativo)
const INCROSTA = ['#d9a0b0', '#9cc7a0', '#e2c58a', '#a9b6dc', '#e7a58f'];

function roccia(x, caso, w, h, tono) {
  tracciaCupola(x, cupola(w, h, caso, .15, 7), 16);
  const g = x.createLinearGradient(0, -h, 0, 14); g.addColorStop(0, chiaro(tono, .32)); g.addColorStop(.5, tono); g.addColorStop(1, scuro(tono, .45));
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  lucido(x, -w * .16, -h * .8, w * .36, h * .32, -.2, .3);
  lucido(x, w * .3, -h * .08, w * .42, h * .5, 0, .32, BLU);
  for (let i = 0, n = 3 + Math.floor(caso() * 4); i < n; i++) {
    const cx = (caso() - .5) * w * .8, cy = -caso() * h * .8, r = 6 + caso() * 13;
    x.fillStyle = alfa(INCROSTA[Math.floor(caso() * INCROSTA.length)], .42);
    x.beginPath(); macchia(x, cx, cy, r, r * (.5 + caso() * .3), caso, .25, 7); x.fill();
  }
  x.strokeStyle = alfa(scuro(tono, .6), .28); x.lineWidth = 2;
  for (let i = 0; i < 2; i++) { const cx = (caso() - .5) * w * .6, cy = -h * (.3 + caso() * .4); x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 8, cy + 9, cx + 2 + caso() * 10, cy + 20); x.stroke(); }
  x.restore();
}

function cervello(x, caso, w, h, col) {
  tracciaCupola(x, cupola(w, h, caso, .06, 8), 16);
  const g = x.createRadialGradient(-w * .16, -h * .72, h * .05, 0, -h * .3, Math.max(w * .62, h * 1.15));
  g.addColorStop(0, chiaro(col, .4)); g.addColorStop(.5, col); g.addColorStop(1, scuro(col, .45));
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  for (let j = 1; j <= 6; j++) {
    const rr = j / 6.4; let a = PI + .04 + caso() * .25;
    x.lineWidth = j % 2 ? 3.2 : 2.2; x.strokeStyle = j % 2 ? alfa(scuro(col, .5), .5) : alfa(chiaro(col, .5), .4);
    while (a < TAU - .1) {
      const fine = Math.min(TAU - .04, a + .32 + caso() * .6), f = caso() * TAU;
      x.beginPath();
      for (let q = a; q <= fine; q += .05) { const k = rr * (1 + .075 * Math.sin(q * 10 + f)); x.lineTo(Math.cos(q) * w / 2 * k, Math.sin(q) * h * k + 2); }
      x.stroke();
      a = fine + .1 + caso() * .12;
    }
  }
  lucido(x, -w * .17, -h * .74, w * .28, h * .22, -.2, .34);
  x.restore();
}

function gorgonia(x, caso, R, apertura, col, luce = true, pieno = .34) {
  const rami = [], punte = [], LIM = 1.12;
  const cresci = (x0, y0, ang, lun, sp, liv) => {
    ang = limita(ang, -PI / 2 - LIM, -PI / 2 + LIM);
    const x1 = x0 + Math.cos(ang) * lun, y1 = y0 + Math.sin(ang) * lun, pg = (caso() - .5) * .34;
    rami.push([x0, y0, (x0 + x1) / 2 - Math.sin(ang) * lun * pg, (y0 + y1) / 2 + Math.cos(ang) * lun * pg, x1, y1, sp]);
    if (liv <= 0) { punte.push([x1, y1]); return; }
    const n = caso() < .3 ? 3 : 2, apri = .55 + caso() * .25;
    for (let k = 0; k < n; k++) cresci(x1, y1, ang + (k / (n - 1) - .5) * apri + (caso() - .5) * .14, lun * (.66 + caso() * .16), Math.max(2.4, sp * .72), liv - 1);
  };
  const steli = 3 + Math.floor(caso() * 2);
  for (let k = 0; k < steli; k++) cresci((k / (steli - 1) - .5) * 10, 2, -PI / 2 + (k / (steli - 1) - .5) * apertura * .62, R * .36, 5.6, 3);
  // il velo pieno del ventaglio: così resta una forma anche da lontano
  const N = 12, raggio = new Array(N).fill(0), bordo = [];
  for (const p of punte) { const i = limita(Math.floor(Math.atan2(-p[1], p[0]) / PI * N), 0, N - 1); raggio[i] = Math.max(raggio[i], Math.hypot(p[0], p[1])); }
  for (let i = 0; i < N; i++) if (raggio[i] > 0) { const a = (i + .5) / N * PI; bordo.push([Math.cos(a) * raggio[i] * .98, -Math.sin(a) * raggio[i] * .98]); }
  if (bordo.length > 2) {
    const m = bordo.length - 1;
    x.fillStyle = alfa(col, pieno); x.beginPath(); x.moveTo(0, 2); x.lineTo(bordo[0][0], bordo[0][1]);
    for (let i = 1; i < m; i++) x.quadraticCurveTo(bordo[i][0], bordo[i][1], (bordo[i][0] + bordo[i + 1][0]) / 2, (bordo[i][1] + bordo[i + 1][1]) / 2);
    x.lineTo(bordo[m][0], bordo[m][1]); x.closePath(); x.fill();
  }
  rami.sort((a, b) => b[6] - a[6]);
  x.strokeStyle = col;
  for (const r of rami) { x.lineWidth = r[6]; x.beginPath(); x.moveTo(r[0], r[1]); x.quadraticCurveTo(r[2], r[3], r[4], r[5]); x.stroke(); }
  x.fillStyle = chiaro(col, .45); x.beginPath(); for (const p of punte) { x.moveTo(p[0] + 2.7, p[1]); x.arc(p[0], p[1], 2.7, 0, TAU); } x.fill();
  if (luce) luceDallAlto(x, -R, 8);
}

function corna(x, caso, alt, col) {
  const rami = [], punte = [];
  const cresci = (x0, y0, ang, lun, sp, liv) => {
    ang = limita(ang, -PI / 2 - 1.05, -PI / 2 + 1.05);
    const x1 = x0 + Math.cos(ang) * lun, y1 = y0 + Math.sin(ang) * lun, pg = (caso() - .5) * .3;
    rami.push([x0, y0, (x0 + x1) / 2 - Math.sin(ang) * lun * pg, (y0 + y1) / 2 + Math.cos(ang) * lun * pg, x1, y1, sp]);
    if (liv <= 0) { punte.push([x1, y1, sp]); return; }
    const n = caso() < .28 ? 3 : 2;
    for (let k = 0; k < n; k++) cresci(x1, y1, ang * .72 - PI / 2 * .28 + (k / (n - 1) - .5) * (.95 + caso() * .3), lun * (.6 + caso() * .2), sp * .78, liv - 1);
  };
  const steli = 3 + Math.floor(caso() * 2);
  for (let k = 0; k < steli; k++) cresci((k / (steli - 1) - .5) * 28, 4, -PI / 2 + (k / (steli - 1) - .5) * 1.5 + (caso() - .5) * .2, alt * .42, 13, 2);
  const passa = (colore, largo, dx, dy) => { x.strokeStyle = colore; for (const r of rami) { x.lineWidth = Math.max(1.5, r[6] * largo[0] + largo[1]); x.beginPath(); x.moveTo(r[0] + dx * r[6], r[1] + dy * r[6]); x.quadraticCurveTo(r[2] + dx * r[6], r[3] + dy * r[6], r[4] + dx * r[6], r[5] + dy * r[6]); x.stroke(); } };
  passa(scuro(col, .32), [1, 3.4], 0, 0);
  passa(col, [1, 0], 0, 0);
  passa(alfa(chiaro(col, .55), .75), [.34, 0], -.2, -.14);
  x.fillStyle = chiaro(col, .62); x.beginPath(); for (const p of punte) { x.moveTo(p[0] + p[2] * .5, p[1]); x.arc(p[0], p[1], p[2] * .5, 0, TAU); } x.fill();
}

function piatto(x, px, py, a, sp, col) {
  x.fillStyle = sfuma(x, scuro(col, .22), scuro(col, .58), py, py + sp * 1.5);
  x.beginPath(); x.ellipse(px, py, a, sp * 1.5, 0, 0, PI); x.closePath(); x.fill();
  const g = x.createLinearGradient(px - a, 0, px + a, 0); g.addColorStop(0, chiaro(col, .36)); g.addColorStop(.5, chiaro(col, .14)); g.addColorStop(1, col);
  x.fillStyle = g; x.beginPath(); x.ellipse(px, py, a, sp * .55, 0, 0, TAU); x.fill();
  x.strokeStyle = alfa(scuro(col, .3), .26); x.lineWidth = 1.7;
  for (const k of [.74, .46]) { x.beginPath(); x.ellipse(px, py - sp * .03, a * k, sp * .55 * k, 0, 0, TAU); x.stroke(); }
  x.strokeStyle = alfa(chiaro(col, .62), .85); x.lineWidth = 2.2; x.beginPath(); x.ellipse(px, py, a, sp * .55, 0, PI * .06, PI * .94); x.stroke();
}
function tavola(x, caso, larg, alt, piani, col) {
  const gb = larg * .1 + 5;
  x.fillStyle = sfuma(x, scuro(col, .3), scuro(col, .55), -alt, 8);
  x.beginPath(); x.moveTo(-gb, 10); x.quadraticCurveTo(-gb * .5, -alt * .5, -gb * 1.7, -alt + 4); x.lineTo(gb * 1.7, -alt + 4); x.quadraticCurveTo(gb * .5, -alt * .5, gb, 10); x.closePath(); x.fill();
  for (let i = 0; i < piani; i++) {
    const u = piani === 1 ? 1 : i / (piani - 1), a = larg / 2 * (piani === 1 ? 1 : 1 - u * .4) * (.94 + caso() * .1);
    piatto(x, piani === 1 ? 0 : (caso() - .5) * larg * .2, -alt * (piani === 1 ? 1 : .45 + u * .55), a, a * .2, col);
  }
}

function spugna(x, caso, n, alt, col) {
  const tubi = [];
  for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) - .5 : 0; tubi.push({ bx: u * n * 15 + (caso() - .5) * 8, h: alt * (.5 + caso() * .5), r: 10 + caso() * 6, inc: u * .3 + (caso() - .5) * .12 }); }
  tubi.sort((a, b) => b.h - a.h);
  for (const tb of tubi) {
    const r = tb.r, h = tb.h;
    x.save(); x.translate(tb.bx, 4); x.rotate(tb.inc);
    const g = x.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, chiaro(col, .24)); g.addColorStop(.45, col); g.addColorStop(1, scuro(col, .38));
    x.fillStyle = g; x.beginPath(); x.moveTo(-r * .72, 6); x.bezierCurveTo(-r * .8, -h * .5, -r * 1.05, -h * .8, -r, -h); x.lineTo(r, -h); x.bezierCurveTo(r * 1.05, -h * .8, r * .8, -h * .5, r * .72, 6); x.closePath(); x.fill();
    x.fillStyle = chiaro(col, .34); x.beginPath(); x.ellipse(0, -h, r, r * .42, 0, 0, TAU); x.fill();
    x.fillStyle = sfuma(x, scuro(col, .62), scuro(col, .36), -h - r * .3, -h + r * .3); x.beginPath(); x.ellipse(0, -h + r * .05, r * .68, r * .26, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.24)'; x.beginPath(); x.ellipse(-r * .46, -h * .52, r * .15, h * .27, 0, 0, TAU); x.fill();
    x.fillStyle = alfa(scuro(col, .5), .2); x.beginPath();
    for (let k = 0; k < 5; k++) { const qx = (caso() - .3) * r * 1.1, qy = -h * (.12 + caso() * .7); x.moveTo(qx + 1.6, qy); x.arc(qx, qy, 1.6, 0, TAU); }
    x.fill();
    x.restore();
  }
}

function foglie(x, caso, r, col) {
  const n = 7 + Math.floor(caso() * 3), petali = [];
  for (let i = 0; i < n; i++) { const u = i / (n - 1) - .5; petali.push({ ang: u * 2.4 + (caso() - .5) * .2, lun: r * (.78 + caso() * .28) * (1 - Math.abs(u) * .3), lar: r * (.3 + caso() * .1), ord: Math.abs(u) + caso() * .12 }); }
  petali.sort((a, b) => b.ord - a.ord);
  for (const pe of petali) {
    x.save(); x.rotate(pe.ang);
    const g = x.createLinearGradient(0, 0, 0, -pe.lun); g.addColorStop(0, scuro(col, .45)); g.addColorStop(.6, col); g.addColorStop(1, chiaro(col, .32));
    x.fillStyle = g; x.beginPath(); x.moveTo(-pe.lar * .25, 6); x.bezierCurveTo(-pe.lar * 1.25, -pe.lun * .35, -pe.lar * 1.1, -pe.lun * .96, 0, -pe.lun); x.bezierCurveTo(pe.lar * 1.1, -pe.lun * .96, pe.lar * 1.25, -pe.lun * .35, pe.lar * .25, 6); x.closePath(); x.fill();
    x.strokeStyle = alfa(chiaro(col, .65), .75); x.lineWidth = 2.4; x.beginPath(); x.moveTo(-pe.lar * .78, -pe.lun * .74); x.quadraticCurveTo(0, -pe.lun * 1.1, pe.lar * .78, -pe.lun * .74); x.stroke();
    x.strokeStyle = alfa(scuro(col, .45), .26); x.lineWidth = 1.8; x.beginPath(); x.moveTo(0, -pe.lun * .12); x.lineTo(0, -pe.lun * .78); x.stroke();
    x.restore();
  }
}

function piedeAnemone(x, w, col) {
  const h = w * .55, g = x.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, chiaro(col, .2)); g.addColorStop(1, scuro(col, .38));
  x.fillStyle = g; x.beginPath(); x.moveTo(-w * .5, 10); x.quadraticCurveTo(-w * .42, -h * .6, -w * .36, -h); x.lineTo(w * .36, -h); x.quadraticCurveTo(w * .42, -h * .6, w * .5, 10); x.closePath(); x.fill();
  x.fillStyle = chiaro(col, .26); x.beginPath(); x.ellipse(0, -h, w * .37, w * .1, 0, 0, TAU); x.fill();
}

function stella(x, caso, r, col) {
  const rot = caso() * TAU, forma = (dx, dy) => { x.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .4 : r * .88, a = rot + i * PI / 5; x.lineTo(dx + Math.cos(a) * rr, dy + Math.sin(a) * rr); } x.closePath(); };
  x.lineWidth = r * .3;
  forma(1.5, 3); x.fillStyle = x.strokeStyle = 'rgba(120,92,56,.26)'; x.fill(); x.stroke();
  forma(0, 0); const g = x.createRadialGradient(-r * .2, -r * .25, 0, 0, 0, r * 1.1); g.addColorStop(0, chiaro(col, .32)); g.addColorStop(1, scuro(col, .18));
  x.fillStyle = g; x.strokeStyle = mesc(col, scuro(col, .18), .5); x.stroke(); x.fill();
  x.fillStyle = chiaro(col, .5); x.beginPath();
  for (let i = 0; i < 5; i++) for (const k of [.3, .52, .72]) { const a = rot + i * TAU / 5, px = Math.cos(a) * r * k, py = Math.sin(a) * r * k, q = r * .075 * (1.2 - k * .5); x.moveTo(px + q, py); x.arc(px, py, q, 0, TAU); }
  x.fill();
}

function conchiglia(x, caso, tipo, r, col) {
  x.fillStyle = 'rgba(120,92,56,.24)'; x.beginPath(); x.ellipse(1, r * .34, r * 1.02, r * .3, 0, 0, TAU); x.fill();
  if (tipo === 'torre') {            // un cono a spirale, sdraiato
    for (let i = 0; i < 7; i++) {
      const u = i / 6, px = r * (.72 - u * 1.55), py = -r * .1 - u * r * .16, q = r * (.5 - u * .38);
      x.fillStyle = sfuma(x, chiaro(col, .45), i % 2 ? scuro(col, .12) : col, py - q, py + q);
      x.beginPath(); x.ellipse(px, py, q * .62, q, -.25, 0, TAU); x.fill();
    }
    x.fillStyle = alfa(scuro(col, .5), .5); x.beginPath(); x.ellipse(r * .8, -r * .06, r * .16, r * .3, -.25, 0, TAU); x.fill();
  } else if (tipo === 'chiocciola') { // un guscio tondo con la spirale
    const g = x.createRadialGradient(-r * .25, -r * .5, 0, 0, -r * .2, r * 1.1); g.addColorStop(0, chiaro(col, .5)); g.addColorStop(1, scuro(col, .2));
    x.fillStyle = g; x.beginPath(); x.ellipse(0, -r * .28, r * .86, r * .68, 0, 0, TAU); x.fill();
    x.strokeStyle = alfa(scuro(col, .45), .5); x.lineWidth = 2; x.beginPath();
    for (let a = 0; a < TAU * 2.1; a += .2) { const q = r * .6 * (1 - a / (TAU * 2.4)); x.lineTo(-r * .12 + Math.cos(a) * q, -r * .32 + Math.sin(a) * q * .8); }
    x.stroke();
    x.fillStyle = alfa(scuro(col, .55), .55); x.beginPath(); x.ellipse(r * .56, -r * .04, r * .26, r * .2, .3, 0, TAU); x.fill();
  } else {                           // una ciprea: ovale lucido a pallini
    const g = x.createRadialGradient(-r * .25, -r * .45, 0, 0, -r * .2, r * 1.1); g.addColorStop(0, chiaro(col, .55)); g.addColorStop(1, scuro(col, .15));
    x.fillStyle = g; x.beginPath(); x.ellipse(0, -r * .22, r * .9, r * .56, 0, 0, TAU); x.fill();
    x.fillStyle = alfa(scuro(col, .4), .4); x.beginPath();
    for (let i = 0; i < 7; i++) { const px = (caso() - .5) * r * 1.3, py = -r * .22 + (caso() - .5) * r * .6; x.moveTo(px + r * .07, py); x.arc(px, py, r * .07, 0, TAU); }
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(-r * .3, -r * .46, r * .26, r * .08, -.2, 0, TAU); x.fill();
  }
}

function sasso(x, caso, w, tono) {
  x.fillStyle = 'rgba(120,92,56,.22)'; x.beginPath(); x.ellipse(1, 3, w * .56, w * .2, 0, 0, TAU); x.fill();
  const g = x.createLinearGradient(0, -w * .45, 0, w * .2); g.addColorStop(0, chiaro(tono, .35)); g.addColorStop(1, scuro(tono, .3));
  x.fillStyle = g; x.beginPath(); macchia(x, 0, -w * .12, w * .5, w * .3, caso, .14, 8); x.fill();
  x.fillStyle = 'rgba(255,255,255,.28)'; x.beginPath(); x.ellipse(-w * .14, -w * .26, w * .18, w * .06, -.2, 0, TAU); x.fill();
}

// ---------------------------------------------------------------- le figurine della barriera
function figurineBarriera() {
  const c = U.semi(2024), t = {};
  t.gorgonia = [
    figurina(250, 160, 8, x => gorgonia(x, c, 138, 1.9, '#e08a84')),
    figurina(288, 186, 8, x => gorgonia(x, c, 164, 1.7, '#b295d6')),
    figurina(216, 138, 8, x => gorgonia(x, c, 118, 2.1, '#e6b96e')),
    figurina(236, 150, 8, x => gorgonia(x, c, 130, 1.5, '#e79bb0')),
  ];
  t.cervello = [
    figurina(132, 94, 16, x => cervello(x, c, 120, 70, '#dcc08f')),
    figurina(164, 118, 16, x => cervello(x, c, 150, 92, '#d3a9bb')),
    figurina(108, 82, 16, x => cervello(x, c, 96, 60, '#aecb9c')),
  ];
  t.corna = [
    figurina(200, 140, 12, x => corna(x, c, 122, '#f0bc9c')),
    figurina(232, 168, 12, x => corna(x, c, 150, '#a5c6e2')),
    figurina(172, 122, 12, x => corna(x, c, 104, '#eedd9f')),
  ];
  t.tavola = [
    figurina(200, 126, 14, x => tavola(x, c, 184, 96, 1, '#84c4b4')),
    figurina(236, 150, 14, x => tavola(x, c, 216, 122, 2, '#dbbd8e')),
    figurina(180, 148, 14, x => tavola(x, c, 160, 124, 3, '#bd9fc6')),
  ];
  t.spugna = [
    figurina(134, 150, 12, x => spugna(x, c, 4, 126, '#ecbb63')),
    figurina(172, 172, 12, x => spugna(x, c, 5, 148, '#ac8ad2')),
    figurina(112, 120, 12, x => spugna(x, c, 3, 100, '#ea9190')),
  ];
  t.foglie = [
    figurina(188, 108, 12, x => foglie(x, c, 80, '#bcd394')),
    figurina(220, 124, 12, x => foglie(x, c, 95, '#efab93')),
    figurina(156, 92, 12, x => foglie(x, c, 66, '#b6a8dd')),
  ];
  t.roccia = [
    figurina(180, 112, 18, x => roccia(x, c, 160, 80, '#86a7b3')),
    figurina(244, 142, 18, x => roccia(x, c, 220, 104, '#a09fae')),
    figurina(138, 100, 18, x => roccia(x, c, 120, 70, '#aca690')),
    figurina(104, 70, 18, x => roccia(x, c, 88, 44, '#86a7b3')),
  ];
  t.anemone = [['#b87992', '#e9a7bb', '#fdeaf0'], ['#6fae8e', '#a3d59c', '#eef8d6'], ['#c9825e', '#f1b381', '#fff2da']].map((col, i) => {
    const w = 50 + i * 6, f = figurina(w + 10, Math.round(w * .55) + 22, 12, x => piedeAnemone(x, w, col[0]));
    f.anemone = { larg: w, alto: w * .55, tentacolo: col[1], punta: col[2] };
    return f;
  });
  for (const tipo of ['gorgonia', 'cervello', 'corna', 'tavola', 'spugna', 'foglie', 'roccia']) for (const f of t[tipo]) f.lontana = lontana(f);
  // cose appoggiate sulla sabbia
  t.stella = ['#e9a06a', '#d97a6c', '#9a86c9'].map((col, i) => figurina(52, 52, 26, x => stella(x, c, 17 + i * 2, col)));
  t.conchiglia = [['torre', '#ecd7b4'], ['chiocciola', '#e9c3ae'], ['ciprea', '#e6cfa0']].map(([tipo, col]) => figurina(56, 44, 16, x => conchiglia(x, c, tipo, 18, col)));
  t.sasso = [['#9fb0b4', 34], ['#b7ac98', 26], ['#a3a3b2', 20]].map(([col, w]) => figurina(44, 30, 10, x => sasso(x, c, w, col)));
  return t;
}

// ---------------------------------------------------------------- la sabbia
const SAB = ['#f5e9c6', '#e7d5a6', '#d2bb8a'];   // in cima, sotto la cresta, in profondità

/* Chiazze, ondine e granelli su una striscia larga 512 unità che si ripete. */
function granaSabbia(x, caso, alt, forza) {
  const P = 512;
  for (let i = 0; i < 4 + alt / 26; i++) {
    const cx = caso() * P, cy = caso() * alt, rx = 36 + caso() * 80, ry = 7 + caso() * 15, luce = caso() < .5;
    for (const ox of [-P, 0, P]) lucido(x, cx + ox, cy, rx, ry, 0, (luce ? .34 : .22) * forza, luce ? '#fff9e6' : '#b08f5c');
  }
  for (let yy = 9 + caso() * 6; yy < alt - 3; yy += 12 + caso() * 9) {
    const f1 = caso() * TAU, f2 = caso() * TAU, amp = 1.8 + caso() * 2, vis = forza * (1 - yy / alt * .7);
    const riga = px => yy + amp * Math.sin(px * TAU / P * 3 + f1) + amp * .5 * Math.sin(px * TAU / P * 8 + f2);
    for (let xs = caso() * 60; xs < P; ) {
      const lun = 30 + caso() * 110;
      for (const ox of [-P, 0, P]) for (let pass = 0; pass < 2; pass++) {
        x.strokeStyle = pass ? 'rgba(255,252,238,' + (.6 * vis).toFixed(3) + ')' : 'rgba(164,132,84,' + (.3 * vis).toFixed(3) + ')';
        x.lineWidth = pass ? 2 : 2.4; x.beginPath();
        for (let px = xs; px <= xs + lun; px += 6) x.lineTo(px + ox, riga(px) + (pass ? 0 : 2.6));
        x.stroke();
      }
      xs += lun + 12 + caso() * 34;
    }
  }
  x.fillStyle = 'rgba(150,118,76,' + (.3 * forza).toFixed(3) + ')'; x.beginPath();
  for (let i = 0; i < alt * 2.2; i++) { const px = caso() * P, py = caso() * alt, q = .5 + caso() * .8; x.moveTo(px + q, py); x.arc(px, py, q, 0, TAU); }
  x.fill();
  x.fillStyle = 'rgba(255,255,246,' + (.55 * forza).toFixed(3) + ')'; x.beginPath();
  for (let i = 0; i < alt * 1.2; i++) { const px = caso() * P, py = caso() * alt, q = .5 + caso() * .7; x.moveTo(px + q, py); x.arc(px, py, q, 0, TAU); }
  x.fill();
}
/* Cresta della sabbia davanti: 512×128 unità, da 44 sopra il fondale a 84 sotto. Due pezzi che si alternano. */
function crestaSabbia(indice) {
  const im = tela(1024, 256), x = penna(im), su = 44, linea = px => su + duna(indice * 512 + px);
  x.scale(S, S);
  x.save(); x.beginPath(); x.moveTo(-6, 134); for (let px = -6; px <= 518; px += 4) x.lineTo(px, linea(px)); x.lineTo(518, 134); x.closePath(); x.clip();
  x.fillStyle = sfuma(x, SAB[0], SAB[1], 40, 128); x.fillRect(0, 0, 512, 128);
  x.translate(0, 34); granaSabbia(x, U.semi(410 + indice), 94, 1); x.translate(0, -34);
  x.fillStyle = sfuma(x, alfa(SAB[1], 0), SAB[1], 106, 128); x.fillRect(0, 100, 512, 28);
  x.restore();
  x.strokeStyle = 'rgba(255,253,242,.85)'; x.lineWidth = 2.6; x.beginPath(); for (let px = -6; px <= 518; px += 4) x.lineTo(px, linea(px) + 1.5); x.stroke();
  return im;
}
/* Il corpo della sabbia sotto la cresta: 512×256 unità, sfuma nel colore pieno di sotto. */
function corpoSabbia() {
  const im = tela(1024, 512), x = penna(im);
  x.scale(S, S);
  x.fillStyle = sfuma(x, SAB[1], SAB[2], 0, 256); x.fillRect(0, 0, 512, 256);
  granaSabbia(x, U.semi(420), 250, .8);
  x.fillStyle = sfuma(x, SAB[1], alfa(SAB[1], 0), 0, 22); x.fillRect(0, 0, 512, 24);
  x.globalCompositeOperation = 'destination-out';      // in fondo sfuma nel nulla: sotto continua la sabbia profonda
  x.fillStyle = sfuma(x, 'rgba(0,0,0,0)', 'rgba(0,0,0,1)', 150, 252); x.fillRect(0, 150, 512, 106);
  return im;
}
/* La sabbia profonda, vista in sezione: strati morbidi, sassi e gusci sepolti. 512×512 unità a 1 pixel per unità, ripetibile nei due versi. */
function sabbiaProfonda() {
  const P = 512, im = tela(P, P), x = penna(im), caso = U.semi(440);
  x.fillStyle = SAB[2]; x.fillRect(0, 0, P, P);
  for (let i = 0; i < 9; i++) {      // strati
    const yy = (i + caso() * .7) / 9 * P, sp = 10 + caso() * 22, f1 = caso() * TAU, f2 = caso() * TAU, amp = 6 + caso() * 10, chiaro2 = caso() < .5;
    x.fillStyle = chiaro2 ? 'rgba(255,246,220,.2)' : 'rgba(150,118,74,.14)';
    for (const oy of [-P, 0, P]) {
      x.beginPath();
      for (let px = 0; px <= P; px += 16) x.lineTo(px, oy + yy + amp * Math.sin(px * TAU / P * 2 + f1) + amp * .4 * Math.sin(px * TAU / P * 5 + f2));
      for (let px = P; px >= 0; px -= 16) x.lineTo(px, oy + yy + sp + amp * Math.sin(px * TAU / P * 2 + f1 + .5) + amp * .4 * Math.sin(px * TAU / P * 3 + f2));
      x.closePath(); x.fill();
    }
  }
  for (let i = 0; i < 26; i++) {     // sassi e pezzi di guscio
    const cx = caso() * P, cy = caso() * P, r = 5 + caso() * 12, col = caso() < .5 ? '#b9a27a' : '#e9dcc0', pts = puntiMacchia(0, 0, r, r * (.45 + caso() * .3), caso, .2, 7), rot = caso() * PI;
    for (const ox of [-P, 0, P]) for (const oy of [-P, 0, P]) { x.save(); x.translate(cx + ox, cy + oy); x.rotate(rot); x.fillStyle = alfa(col, .5); x.beginPath(); liscia(x, pts); x.fill(); x.restore(); }
  }
  x.fillStyle = 'rgba(140,108,68,.22)'; x.beginPath();
  for (let i = 0; i < 500; i++) { const px = caso() * P, py = caso() * P, q = .6 + caso() * 1; x.moveTo(px + q, py); x.arc(px, py, q, 0, TAU); }
  x.fill();
  return im;
}
/* La dorsale di sabbia dietro alla prima fila: 512×96 unità, da 56 sopra il fondale a 40 sotto; già velata d'acqua. */
function dorsaleSabbia() {
  const im = tela(1024, 192), x = penna(im), su = 56, c0 = mesc(SAB[0], ACQUA, .36), c1 = mesc(SAB[1], ACQUA, .42);
  x.scale(S, S);
  x.save(); x.beginPath(); x.moveTo(-6, 100); for (let px = -6; px <= 518; px += 4) x.lineTo(px, su + dorsale(px)); x.lineTo(518, 100); x.closePath(); x.clip();
  x.fillStyle = sfuma(x, c0, c1, 8, 70); x.fillRect(0, 0, 512, 96);
  x.translate(0, 10); granaSabbia(x, U.semi(430), 86, .45); x.translate(0, -10);
  x.restore();
  x.strokeStyle = alfa(chiaro(c0, .5), .7); x.lineWidth = 2.4; x.beginPath(); for (let px = -6; px <= 518; px += 4) x.lineTo(px, su + dorsale(px) + 1.4); x.stroke();
  return im;
}

// ---------------------------------------------------------------- riflessi di luce (caustiche): una rete di celle, ripetibile
function reteDiLuce(seme, celle, forza, bordi) {
  const n = 256, lato = n / celle, caso = U.semi(seme), px = [], py = [];
  for (let j = 0; j < celle; j++) for (let i = 0; i < celle; i++) { px.push((i + .12 + caso() * .76) * lato); py.push((j + .12 + caso() * .76) * lato); }
  const m = U.tela(n, n), x = m.getContext('2d'), dati = x.createImageData(n, n), d = dati.data;
  for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
    const u = xx + 11 * Math.sin(y / n * TAU * 2 + 1) + 5 * Math.sin(xx / n * TAU * 3 + y / n * TAU), w = y + 11 * Math.sin(xx / n * TAU * 2 + 2) + 5 * Math.sin(y / n * TAU * 3 + 1 + xx / n * TAU);
    const ci = Math.floor(u / lato), cj = Math.floor(w / lato);
    let d1 = 1e9, d2 = 1e9;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const gi = ci + di, gj = cj + dj, wi = ((gi % celle) + celle) % celle, wj = ((gj % celle) + celle) % celle, k = wj * celle + wi;
      const dd = Math.hypot(u - px[k] - (gi - wi) * lato, w - py[k] - (gj - wj) * lato);
      if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
    }
    const vivo = .5 + .5 * Math.sin(xx / n * TAU * 2 + 2.6 * Math.sin(y / n * TAU + 1)) * Math.sin(y / n * TAU * 3 + 1.7 * Math.sin(xx / n * TAU));   // dove la luce si raccoglie
    let a = 1 - (d2 - d1) / (lato * (.1 + .16 * vivo)); a = a < 0 ? 0 : a * a * (3 - 2 * a) * (.25 + .75 * vivo);
    const o = (y * n + xx) * 4; d[o] = 255; d[o + 1] = 255; d[o + 2] = 246; d[o + 3] = Math.round(255 * forza * a);
  }
  x.putImageData(dati, 0, 0);
  const im = tela(512, 512), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, 512, 512);
  if (bordi) {   // per il fondale: sfuma sopra e sotto
    y.globalCompositeOperation = 'destination-in';
    const g = y.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.3, 'rgba(0,0,0,1)'); g.addColorStop(.62, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    y.fillStyle = g; y.fillRect(0, 0, 512, 512);
  }
  return im;
}

// ---------------------------------------------------------------- i piani lontani (sfondo): sagome sfumate su strisce ripetute
/* Disegna la maschera a bassa risoluzione (bordi morbidi), la colora con una sfumatura e la ingrandisce.
   Le misure di chi disegna sono pixel della striscia finale (2 pixel = 1 px CSS a zoom 1). */
function striscia(larg, alt, ridu, maschera, colori, sopra) {
  const pw = Math.ceil(larg / ridu), ph = Math.ceil(alt / ridu), m = U.tela(pw, ph), x = penna(m);
  x.scale(pw / larg, ph / alt); x.fillStyle = x.strokeStyle = '#fff';
  for (const ox of [-larg, 0, larg]) { x.save(); x.translate(ox, 0); maschera(x); x.restore(); }
  x.globalCompositeOperation = 'source-in';
  const g = x.createLinearGradient(0, colori.y0, 0, colori.y1); g.addColorStop(0, colori.su); g.addColorStop(1, colori.giu);
  x.fillStyle = g; x.fillRect(0, 0, larg, alt);
  x.globalCompositeOperation = 'source-atop';
  if (sopra) for (const ox of [-larg, 0, larg]) { x.save(); x.translate(ox, 0); sopra(x); x.restore(); }
  const im = tela(larg, alt), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, larg, alt);
  return im;
}
function torre(x, t) { x.beginPath(); for (const m of t.masse) liscia(x, m); x.fill(); }   // un pinnacolo: masse tonde una sull'altra
function arco(x, a) {
  x.lineWidth = a.sp; x.beginPath(); x.moveTo(a.x0, a.y + a.sp); x.lineTo(a.x0, a.y); x.quadraticCurveTo((a.x0 + a.x1) / 2, a.y - a.h * 2, a.x1, a.y + a.dy); x.lineTo(a.x1, a.y + a.dy + a.sp); x.stroke();
}
function pianiLontani() {
  const L = 1024, A = 576, k1 = TAU / L;
  const fai = (seme, cfg) => {
    const caso = U.semi(seme), tra = (a, b) => a + caso() * (b - a), f = [tra(0, TAU), tra(0, TAU), tra(0, TAU)];
    const cresta = px => cfg.base - cfg.amp * Math.sin(px * k1 + f[0]) - cfg.amp * .7 * Math.abs(Math.sin(px * k1 * 1.5 + f[1])) - cfg.amp * .45 * Math.abs(Math.sin(px * k1 * 3.5 + f[2])) - cfg.amp * .16 * Math.sin(px * k1 * 9 + f[0] * 2);   // gobbe tonde con gole strette, come teste di corallo
    const torri = [], archi = [], coralli = [];
    for (let i = 0; i < cfg.torri; i++) {
      const bx = (i + tra(.15, .85)) / cfg.torri * L, w = tra(cfg.largo[0], cfg.largo[1]), h = tra(cfg.alto[0], cfg.alto[1]), by = cresta(bx) + 30, pende = tra(-.25, .25) * h, masse = [], n = 3 + Math.floor(caso() * 3);
      for (let j = 0; j < n; j++) { const u = j / (n - 1); masse.push(puntiMacchia(bx + pende * u + tra(-.22, .22) * w, by - h * u * .86, w * (1 - u * .55) * tra(.62, .9), h / n * tra(.75, 1.05), caso, .16, 9)); }
      torri.push({ masse });
    }
    for (let i = 0; i < cfg.archi; i++) { const x0 = tra(0, L), larg = tra(150, 240); archi.push({ x0, x1: x0 + larg, y: cresta(x0) + 10, dy: tra(-20, 30), h: tra(90, 150), sp: tra(38, 56) }); }
    for (let i = 0; i < cfg.coralli; i++) { const bx = tra(0, L); coralli.push({ bx, by: cresta(bx) + 6, tipo: cfg.tipi[Math.floor(caso() * cfg.tipi.length)], r: tra(cfg.raggi[0], cfg.raggi[1]), f: caso(), col: cfg.tinte[Math.floor(caso() * cfg.tinte.length)] }); }
    const sagomaCorallo = (x, c) => {
      if (c.tipo === 0) { x.beginPath(); x.moveTo(c.bx, c.by); x.arc(c.bx, c.by, c.r, PI * 1.1, PI * 1.9); x.closePath(); x.fill(); }                                  // ventaglio
      else if (c.tipo === 1) { x.beginPath(); x.ellipse(c.bx, c.by, c.r * .9, c.r * .6, 0, PI, TAU); x.fill(); }                                                        // cupola
      else if (c.tipo === 2) { x.lineWidth = c.r * .16; x.beginPath(); x.moveTo(c.bx, c.by); x.lineTo(c.bx, c.by - c.r * .55); x.stroke(); x.beginPath(); x.ellipse(c.bx, c.by - c.r * .6, c.r, c.r * .16, 0, 0, TAU); x.fill(); }   // tavola
      else { x.lineWidth = c.r * .15; x.beginPath(); for (let j = -2; j <= 2; j++) { const a = -PI / 2 + j * .36 + (c.f - .5) * .2, l = c.r * (1 - Math.abs(j) * .13); x.moveTo(c.bx + j * c.r * .06, c.by); x.quadraticCurveTo(c.bx + Math.cos(a) * l * .5, c.by + Math.sin(a) * l * .7, c.bx + Math.cos(a) * l + j * 4, c.by + Math.sin(a) * l); } x.stroke(); }   // corna
    };
    return striscia(L, A, cfg.ridu, x => {
      x.beginPath(); x.moveTo(0, A + 4); for (let px = 0; px <= L; px += 16) x.lineTo(px, cresta(px)); x.lineTo(L, A + 4); x.closePath(); x.fill();
      for (const t of torri) torre(x, t);
      for (const a of archi) arco(x, a);
      for (const c of coralli) sagomaCorallo(x, c);
    }, cfg.colori, cfg.tinte.length ? x => { for (const c of coralli) { x.fillStyle = x.strokeStyle = alfa(c.col, cfg.forzaTinte); sagomaCorallo(x, c); } } : null);
  };
  return [
    { im: fai(11, { ridu: 6, base: 430, amp: 34, torri: 2, largo: [120, 190], alto: [190, 340], archi: 1, coralli: 3, raggi: [80, 130], tipi: [0, 1, 3], tinte: [],
        colori: { y0: 90, y1: 430, su: 'rgba(52,156,194,.24)', giu: 'rgba(22,104,156,.4)' } }), fondo: 'rgba(22,104,156,.4)', par: .16, zoom: .3, fase: 0 },
    { im: fai(23, { ridu: 4, base: 410, amp: 46, torri: 3, largo: [80, 140], alto: [130, 300], archi: 1, coralli: 5, raggi: [56, 100], tipi: [0, 1, 3, 0], tinte: [],
        colori: { y0: 80, y1: 410, su: 'rgba(34,128,174,.38)', giu: 'rgba(15,86,138,.5)' } }), fondo: 'rgba(15,86,138,.5)', par: .36, zoom: .5, fase: 300, lusso: true },
    { im: fai(37, { ridu: 2.5, base: 400, amp: 56, torri: 2, largo: [100, 160], alto: [120, 230], archi: 1, coralli: 8, raggi: [46, 92], tipi: [0, 1, 2, 3, 0, 3], tinte: ['#d48f9a', '#c9a878', '#9d8fc4', '#6fb5a8'], forzaTinte: .34,
        colori: { y0: 110, y1: 410, su: 'rgba(28,114,160,.54)', giu: 'rgba(13,76,124,.64)' } }), fondo: 'rgba(13,76,124,.64)', par: .6, zoom: .72, fase: 620 },
  ];
}

// ---------------------------------------------------------------- le grandi formazioni (sfondo ravvicinato, 1 pixel per unità)
const TINTE_LONTANE = ['#e08088', '#eaa566', '#a888d8', '#62bfa9', '#ecd070', '#82aae0', '#e79ab8'];
function decoro(x, caso, tipo, col) {
  if (tipo === 0) gorgonia(x, caso, 110, 1.8, col, false, .55);
  else if (tipo === 1) tavola(x, caso, 150, 46, 1, col);
  else if (tipo === 2) cervello(x, caso, 110, 62, col);
  else if (tipo === 3) spugna(x, caso, 3, 100, col);
  else if (tipo === 4) foglie(x, caso, 72, col);
  else corna(x, caso, 100, col);
}
function formazione(w, h, seme, costruisci) {
  const BASE = '#52869f';
  return figurina(w, h, 34, x => {
    const caso = U.semi(seme), masse = [], ponti = [];
    costruisci((cx, cy, rx, ry) => masse.push({ cx, cy, rx, ry, p: puntiMacchia(cx, cy, rx, ry, caso, .13, 10) }), (x0, y0, mx, my, x1, y1, sp) => ponti.push([x0, y0, mx, my, x1, y1, sp]), caso);
    x.fillStyle = x.strokeStyle = BASE;
    x.beginPath(); for (const m of masse) liscia(x, m.p); x.fill();
    for (const p of ponti) { x.lineWidth = p[6]; x.beginPath(); x.moveTo(p[0], p[1]); x.quadraticCurveTo(p[2], p[3], p[4], p[5]); x.stroke(); }
    x.globalCompositeOperation = 'source-atop';
    const g = x.createLinearGradient(0, -h + 34, 0, 30); g.addColorStop(0, chiaro(BASE, .3)); g.addColorStop(.5, BASE); g.addColorStop(1, scuro(BASE, .45));
    x.fillStyle = g; x.fillRect(-w / 2, -h, w, h + 40);
    x.strokeStyle = alfa(BLU, .07); x.lineWidth = 30;                      // un'ombra dove una massa si appoggia sull'altra
    for (const m of masse) { x.beginPath(); liscia(x, m.p); x.stroke(); }
    for (const m of masse) { lucido(x, m.cx - m.rx * .25, m.cy - m.ry * .5, m.rx * .85, m.ry * .7, 0, .3); lucido(x, m.cx + m.rx * .3, m.cy + m.ry * .55, m.rx * .9, m.ry * .6, 0, .3, BLU); }
    for (let i = 0; i < 46; i++) { const m = masse[Math.floor(caso() * masse.length)], cx = m.cx + (caso() - .5) * m.rx * 1.6, cy = m.cy + (caso() - .5) * m.ry * 1.6, r = 8 + caso() * 22; x.fillStyle = alfa(caso() < .5 ? '#ffffff' : INCROSTA[Math.floor(caso() * INCROSTA.length)], .1 + caso() * .1); x.beginPath(); macchia(x, cx, cy, r, r * .6, caso, .25, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    // i coralli che ci crescono sopra: più fitti in alto, girati verso l'acqua aperta
    const cose = [];
    for (const m of masse) for (let i = 0, n = 2 + Math.floor(caso() * 2.2); i < n; i++) { const a = PI + .2 + caso() * (PI - .4); cose.push({ x: m.cx + Math.cos(a) * m.rx * .84, y: m.cy + Math.sin(a) * m.ry * .84, rot: (a - PI * 1.5) * .7, s: .34 + caso() * .28, tipo: Math.floor(caso() * 6), col: TINTE_LONTANE[Math.floor(caso() * TINTE_LONTANE.length)] }); }
    cose.sort((a, b) => a.y - b.y);
    for (const o of cose) { x.save(); x.translate(o.x, o.y); x.rotate(o.rot); x.scale(o.s, o.s); decoro(x, caso, o.tipo, o.col); x.restore(); }
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = alfa('#2f9ac2', .4); x.fillRect(-w / 2, -h, w, h + 40);
    x.fillStyle = sfuma(x, 'rgba(255,255,255,.12)', 'rgba(255,255,255,0)', -h + 34, -h * .45); x.fillRect(-w / 2, -h, w, h * .6);
    x.globalCompositeOperation = 'source-over';
  }, 1, 0);
}
function colonna(massa, caso, cx, alt, r0, r1, passo = 88) {   // una pila di masse che si stringe salendo
  for (let y = 0; y <= alt; y += passo) { const u = y / alt; massa(cx + Math.sin(u * 5 + cx) * 26 * u, -y, (r0 + (r1 - r0) * u) * (.86 + caso() * .28), 62 + caso() * 22); }
}
function grandiFormazioni() {
  return [
    formazione(400, 900, 51, (massa, ponte, caso) => { massa(0, 4, 180, 56); colonna(massa, caso, 0, 760, 150, 52); massa(-96, -300, 78, 24); massa(92, -470, 70, 22); massa(-70, -610, 56, 20); }),
    formazione(640, 500, 52, (massa, ponte, caso) => { massa(0, 4, 300, 60); massa(0, -150, 262, 186); massa(-178, -72, 128, 108); massa(184, -92, 138, 118); massa(-46, -312, 168, 118); massa(98, -262, 148, 108); }),
    formazione(700, 660, 53, (massa, ponte, caso) => { massa(-232, 4, 130, 50); massa(228, 4, 140, 50); colonna(massa, caso, -232, 380, 112, 74); colonna(massa, caso, 226, 430, 118, 76); ponte(-228, -400, 0, -690, 222, -450, 124); massa(-10, -548, 120, 58); massa(120, -520, 80, 46); }),
    formazione(540, 800, 54, (massa, ponte, caso) => { massa(0, 4, 250, 56); colonna(massa, caso, -112, 660, 132, 50); colonna(massa, caso, 122, 430, 124, 58); massa(10, -120, 150, 96); }),
    formazione(500, 580, 55, (massa, ponte, caso) => { massa(0, 4, 190, 52); colonna(massa, caso, 0, 330, 104, 78); massa(0, -410, 222, 104); massa(-66, -474, 122, 58); massa(84, -468, 112, 54); }),
  ];
}

// ---------------------------------------------------------------- le pareti di scogliera ai lati (1 pixel per unità)
const PARETE_SU = '#4f8fa9', PARETE_GIU = '#27608a', VELO_PARETE = .18;
function pareti() {
  const caso = U.semi(606), ALT = 3072, L = PARETE_L, tele = [], masse = [], cose = [];
  // la faccia della scogliera è l'unione di tante masse tonde, una sopra l'altra
  for (let y = -70; y < ALT + 70; y += 44 + caso() * 50) {
    const rx = 58 + caso() * 44, ry = 50 + caso() * 38, cx = ciglio(y) - rx * 1.03;
    masse.push({ cx, cy: y, rx, ry, p: puntiMacchia(cx, y, rx, ry, caso, .11, 10) });
  }
  for (const m of masse) for (let i = 0, n = caso() < .62 ? 1 : 0; i < n; i++) {
    const a = -1.15 + caso() * 1.5;          // verso l'acqua aperta, un po' all'insù
    cose.push({ x: m.cx + Math.cos(a) * m.rx * .86, y: m.cy + Math.sin(a) * m.ry * .86, rot: a + PI / 2, s: .5 + caso() * .4, tipo: Math.floor(caso() * 6), col: TINTE_LONTANE[Math.floor(caso() * TINTE_LONTANE.length)], seme: Math.floor(caso() * 1e6) });
  }
  for (let k = 0; k < 3; k++) {
    const im = tela(L, 1024), x = penna(im), y0 = k * 1024, y1 = y0 + 1024, vicine = masse.filter(m => m.cy > y0 - 130 && m.cy < y1 + 130);
    x.translate(L, -y0);
    x.fillStyle = '#000';
    x.beginPath(); x.moveTo(-L - 2, y0 - 6); for (let y = y0 - 6; y <= y1 + 6; y += 6) x.lineTo(ciglio(y) - 64, y); x.lineTo(-L - 2, y1 + 6); x.closePath(); x.fill();
    x.beginPath(); for (const m of vicine) liscia(x, m.p); x.fill();
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = sfuma(x, PARETE_SU, PARETE_GIU, 0, ALT); x.fillRect(-L, y0, L, 1024);
    x.strokeStyle = alfa(BLU, .08); x.lineWidth = 26;
    for (const m of vicine) { x.beginPath(); liscia(x, m.p); x.stroke(); }
    for (const m of vicine) { lucido(x, m.cx + m.rx * .15, m.cy - m.ry * .5, m.rx * .85, m.ry * .7, 0, .26); lucido(x, m.cx - m.rx * .1, m.cy + m.ry * .6, m.rx * .9, m.ry * .6, 0, .28, BLU); }
    for (let i = 0; i < 26; i++) { const m = vicine[Math.floor(caso() * vicine.length)], cx = m.cx + (caso() - .5) * m.rx * 1.5, cy = m.cy + (caso() - .5) * m.ry * 1.5, r = 6 + caso() * caso() * 34; x.fillStyle = alfa(caso() < .3 ? '#ffffff' : INCROSTA[Math.floor(caso() * INCROSTA.length)], .07 + caso() * .09); x.beginPath(); macchia(x, cx, cy, r, r * .7, caso, .25, 7); x.fill(); }
    raccordo(im, PARETE_SU, PARETE_GIU, -y0, ALT - y0, 110);      // verso l'interno torna il colore pieno: lì continua il riempimento
    x.globalCompositeOperation = 'source-over';
    for (const o of cose) if (o.y > y0 - 160 && o.y < y1 + 160) { x.save(); x.translate(o.x, o.y); x.rotate(o.rot); x.scale(o.s, o.s); decoro(x, U.semi(o.seme), o.tipo, o.col); x.restore(); }
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = alfa(ACQUA, VELO_PARETE); x.fillRect(0, 0, L, 1024);
    tele.push(im);
  }
  return tele;
}
/* Lo scoglio che esce dall'acqua sopra la parete: 512×512 unità, con cespugli e una palma in cima. */
const SCOGLIO_ALTO = 330, SCOGLIO = ['#f1e7cd', '#cbbb9e'], VERDE = ['#6fae7c', '#8fc68c', '#b4dda4'];
function scoglioEmerso() {
  const im = tela(512, 512), x = penna(im), caso = U.semi(707), A = SCOGLIO_ALTO;
  x.translate(512, 512);
  const orlo = [[-430, -A - 10], [-350, -A + 2], [-280, -A - 8], [-215, -A + 6], [-172, -A + 34], [-150, -A + 86], [-160, -A + 122], [-126, -A + 150], [-110, -150], [-124, -116], [-94, -92], [-66, -44]];
  x.fillStyle = '#000'; x.beginPath(); x.moveTo(-514, 8); x.lineTo(-514, -A);
  for (let i = 0; i < orlo.length - 1; i++) x.quadraticCurveTo(orlo[i][0], orlo[i][1], (orlo[i][0] + orlo[i + 1][0]) / 2, (orlo[i][1] + orlo[i + 1][1]) / 2);
  x.quadraticCurveTo(-66, -44, -34, 8); x.closePath(); x.fill();
  x.globalCompositeOperation = 'source-atop';
  const base = sfuma(x, SCOGLIO[0], SCOGLIO[1], -A - 30, 0);
  x.fillStyle = base; x.fillRect(-512, -512, 512, 520);
  for (let i = 0; i < 8; i++) {          // strati di roccia
    const yy = -A + 24 + i * 40 + caso() * 14, sp = 7 + caso() * 12, f = caso() * TAU;
    x.fillStyle = i % 2 ? 'rgba(150,124,96,.2)' : 'rgba(255,250,236,.3)'; x.beginPath();
    for (let px = -520; px <= 0; px += 20) x.lineTo(px, yy + 5 * Math.sin(px / 60 + f) + px * .03);
    for (let px = 0; px >= -520; px -= 20) x.lineTo(px, yy + sp + 5 * Math.sin(px / 75 + f + 1) + px * .03);
    x.closePath(); x.fill();
  }
  const gl = x.createLinearGradient(-230, 0, -40, 0); gl.addColorStop(0, 'rgba(255,252,240,0)'); gl.addColorStop(1, 'rgba(255,252,240,.3)');     // la faccia verso il sole
  x.fillStyle = gl; x.fillRect(-230, -512, 230, 520);
  lucido(x, -150, -A + 132, 70, 20, -.1, .34, '#7d6a58'); lucido(x, -112, -104, 56, 18, -.1, .3, '#7d6a58'); lucido(x, -190, -A + 44, 90, 34, .3, .3);
  x.strokeStyle = 'rgba(125,106,88,.26)'; x.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) { const cx = -90 - caso() * 400, cy = -30 - caso() * (A - 80); x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + 8, cy + 20, cx - 4 + caso() * 16, cy + 36 + caso() * 20); x.stroke(); }
  x.fillStyle = sfuma(x, 'rgba(62,112,126,0)', 'rgba(62,112,126,.6)', -30, 4); x.fillRect(-512, -30, 512, 40);        // la fascia bagnata
  raccordo(im, SCOGLIO[0], SCOGLIO[1], 512 - A - 30, 512, 120);                                                        // a sinistra torna il colore pieno: lì continua il riempimento
  x.globalCompositeOperation = 'source-over';
  // una palma che si sporge e i cespugli sulla cima
  const tx = -176, ty = -A - 112;
  x.strokeStyle = '#bfa680'; x.lineWidth = 9; x.beginPath(); x.moveTo(-268, -A + 4); x.quadraticCurveTo(-244, -A - 70, tx, ty); x.stroke();
  for (let i = 0; i < 8; i++) { const a = -PI / 2 + (i - 3.5) * .5 + (caso() - .5) * .2, l = 66 + caso() * 22; x.strokeStyle = i % 2 ? VERDE[0] : VERDE[1]; x.lineWidth = 9; x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx + Math.cos(a) * l * .6, ty + Math.sin(a) * l * .6 - l * .3, tx + Math.cos(a) * l, ty + Math.sin(a) * l * .5 + l * .3); x.stroke(); }
  for (let giro = 0; giro < 2; giro++) for (let px = -530; px < -176 - giro * 30; px += (giro ? 13 : 26) + caso() * (giro ? 24 : 30)) {
    const r = giro ? 9 + caso() * 14 : 20 + caso() * 16, cy = -A + (giro ? 4 : -12) + (px > -230 ? (px + 230) * .55 : 0) + caso() * 8, col = giro ? VERDE[Math.floor(caso() * 2)] : scuro(VERDE[0], .1);
    x.fillStyle = scuro(col, .12); x.beginPath(); x.arc(px, cy, r, 0, TAU); x.fill();
    x.fillStyle = col; x.beginPath(); x.arc(px - r * .12, cy - r * .2, r * .8, 0, TAU); x.fill();
    x.fillStyle = VERDE[2]; x.beginPath(); x.arc(px - r * .28, cy - r * .42, r * .4, 0, TAU); x.fill();
  }
  return im;
}

// ---------------------------------------------------------------- le nuvole (striscia ripetuta, morbida)
function nuvole() {
  const L = 1024, A = 320, caso = U.semi(909), gruppi = [];
  const nuvola = (cx, cy, r, n) => { const palle = []; for (let j = 0; j < n; j++) palle.push([cx + (j - (n - 1) / 2) * r * .95 + (caso() - .5) * r * .3, cy - Math.sin((j + .5) / n * PI) * r * .8 * (.6 + caso() * .6), r * (.62 + caso() * .5)]); gruppi.push(palle); };
  for (let i = 0; i < 4; i++) nuvola((i + .15 + caso() * .7) / 4 * L, 70 + caso() * 110, 24 + caso() * 16, 4 + Math.floor(caso() * 4));   // in alto, grandi
  for (let i = 0; i < 5; i++) nuvola((i + .1 + caso() * .8) / 5 * L, 250 + caso() * 40, 9 + caso() * 7, 3 + Math.floor(caso() * 4));     // sull'orizzonte, piccole
  const m = U.tela(L / 2, A / 2), x = m.getContext('2d');
  x.scale(.5, .5);
  for (const ox of [-L, 0, L]) for (const palle of gruppi) for (let pass = 0; pass < 2; pass++) {
    x.fillStyle = pass ? 'rgba(255,255,255,.96)' : 'rgba(186,222,244,.9)'; x.beginPath();
    for (const p of palle) { const py = p[1] + (pass ? 0 : p[2] * .3); x.moveTo(p[0] + ox + p[2], py); x.arc(p[0] + ox, py, p[2] * (pass ? 1 : 1.04), 0, TAU); }
    x.fill();
  }
  const im = tela(L, A), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, L, A);
  return im;
}
/* Un'isola lontana sull'orizzonte, velata dall'aria: 400×180 unità. */
function isola() {
  const W = 400, H = 180, caso = U.semi(919), m = U.tela(W / 2, H / 2), x = penna(m);
  x.scale(.5, .5); x.translate(W / 2, H - 8);
  const palma = (bx, by, alt, pende) => {
    const tx = bx + pende, ty = by - alt;
    x.strokeStyle = '#9fb9a8'; x.lineWidth = 6; x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + pende * .2, by - alt * .6, tx, ty); x.stroke();
    x.strokeStyle = '#74b69a'; x.lineWidth = 7;
    for (let i = 0; i < 7; i++) { const a = -PI / 2 + (i - 3) * .52 + (caso() - .5) * .2, l = alt * (.5 + caso() * .16); x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx + Math.cos(a) * l * .6, ty + Math.sin(a) * l * .6 - l * .25, tx + Math.cos(a) * l, ty + Math.sin(a) * l * .5 + l * .22); x.stroke(); }
  };
  palma(-50, -52, 78, -22); palma(34, -60, 92, 26); palma(96, -40, 62, 30);
  x.fillStyle = sfuma(x, '#a8d9c0', '#84c2bd', -84, 0); x.beginPath(); x.moveTo(-190, 6);
  x.bezierCurveTo(-150, -34, -90, -66, -20, -74); x.bezierCurveTo(50, -80, 120, -52, 190, 6); x.closePath(); x.fill();
  x.fillStyle = '#8fcab0'; x.beginPath(); for (let i = 0; i < 9; i++) { const px = -120 + i * 28 + caso() * 12, py = -40 - Math.sin((i + .5) / 9 * PI) * 30, r = 12 + caso() * 9; x.moveTo(px + r, py); x.arc(px, py, r, 0, TAU); } x.fill();
  x.fillStyle = '#f3f1dc'; x.beginPath(); x.moveTo(-196, 8); x.quadraticCurveTo(0, -22, 196, 8); x.closePath(); x.fill();
  const im = tela(W, H), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, W, H);
  y.globalCompositeOperation = 'source-atop'; y.fillStyle = 'rgba(190,232,246,.34)'; y.fillRect(0, 0, W, H);
  return { im, w: W, h: H };
}

// ---------------------------------------------------------------- le fronde in primo piano (scure e sfocate)
function frondeVicine() {
  const W = 260, H = 300, COL = '#3d8aa4';
  const fai = disegna => {
    const m = U.tela(W / 4, H / 4), x = penna(m);       // dipinte in piccolo e ingrandite: restano fuori fuoco
    x.scale(.25, .25); x.translate(W / 2, H - 16); x.fillStyle = COL;
    disegna(x);
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in';     // il piede svanisce: non si vede dove nasce
    x.fillStyle = sfuma(x, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)', (H - 52) / 4, (H - 16) / 4); x.fillRect(0, 0, W / 4, H / 4);
    const im = tela(W / 2, H / 2), y = im.getContext('2d');
    y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, W / 2, H / 2);
    return { im, w: W, h: H, ay: H - 16 };
  };
  const lama = (x, pende, alt, larg) => { x.beginPath(); x.moveTo(-larg * .3, 6); x.bezierCurveTo(-larg * 1.2 + pende * .1, -alt * .4, -larg + pende * .55, -alt * .8, pende, -alt); x.bezierCurveTo(larg + pende * .75, -alt * .7, larg * 1.2 + pende * .25, -alt * .35, larg * .3, 6); x.closePath(); x.fill(); };
  return [
    fai(x => { lama(x, -88, 190, 13); lama(x, -40, 262, 15); lama(x, 6, 228, 14); lama(x, 52, 270, 15); lama(x, 96, 176, 12); }),
    fai(x => { lama(x, -70, 210, 24); lama(x, 4, 270, 27); lama(x, 74, 196, 22); }),
    fai(x => { lama(x, -30, 240, 17); lama(x, 30, 276, 20); lama(x, 84, 214, 17); lama(x, 110, 140, 13); }),
  ];
}

// ---------------------------------------------------------------- il corredo: tutte le tele, dipinte una volta sola
let corredo = null;
function prepara() {
  if (corredo) return corredo;
  pixel = 0;
  const co = {};
  co.tipi = figurineBarriera();
  co.piani = pianiLontani();
  co.formazioni = grandiFormazioni();
  co.cresta = [crestaSabbia(0), crestaSabbia(1)];
  co.corpo = corpoSabbia();
  co.profonda = sabbiaProfonda();
  co.dorsale = dorsaleSabbia();
  co.luce = reteDiLuce(77, 8, .26, false);
  co.luceFondo = reteDiLuce(78, 6, .46, true);
  co.parete = pareti();
  co.scoglio = scoglioEmerso();
  co.nuvole = nuvole();
  co.isola = isola();
  co.fronde = frondeVicine();
  co.pixel = pixel;
  return corredo = co;
}

// ---------------------------------------------------------------- ciò che si muove
const LAME_DIETRO = [0, 1, 2, 3, 4].map(i => ({ x: (i + rumore(i, 31) * .7) / 5, w: 20 + rumore(i, 32) * 30, a: .5 + rumore(i, 33) * .5, b: .25 + rumore(i, 34) * .3, f: rumore(i, 35) * TAU, v: .85 + rumore(i, 36) * .3 }));
const LAME_VELO = [0, 1, 2].map(i => ({ x: (i + rumore(i, 41) * .7) / 3, w: 26 + rumore(i, 42) * 30, a: .5 + rumore(i, 43) * .5, b: .2 + rumore(i, 44) * .25, f: rumore(i, 45) * TAU, v: .9 + rumore(i, 46) * .2 }));
/* Lame di sole oblique (misure di schermo): partono dal pelo dell'acqua e si spengono scendendo. */
function lame(c, v, lista, forza, par, daY) {
  const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, t = v.t;
  const ys = vh / 2 - cam.y * z, fine = ys + 2400 * z, y0 = Math.max(daY, 0), y1 = Math.min(vh, fine);
  if (y1 <= y0 + 10 || forza < .01) return;
  const g = c.createLinearGradient(0, ys, 0, fine); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(1, 'rgba(255,255,240,0)');
  c.fillStyle = g;
  const sc = .55 + .45 * z, giro = vw + PEND * vh + 260, scorri = -(cam.x + PEND * cam.y) * z * par + t * 4;
  for (const r of lista) {
    const cima = (((r.x * giro + scorri * r.v) % giro) + giro) % giro - 130, w = r.w * sc;
    const xa = cima - PEND * y0, xb = cima - PEND * y1, wa = w * (1 + y0 / vh * .6), wb = w * (1 + y1 / vh * .6);
    c.globalAlpha = forza * r.a * (.62 + .38 * Math.sin(t * r.b + r.f));
    c.beginPath(); c.moveTo(xa - wa, y0); c.lineTo(xa + wa, y0); c.lineTo(xb + wb, y1); c.lineTo(xb - wb, y1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(xa - wa * .42, y0); c.lineTo(xa + wa * .42, y0); c.lineTo(xb + wb * .42, y1); c.lineTo(xb - wb * .42, y1); c.closePath(); c.fill();
  }
  c.globalAlpha = 1;
}

const PUNTE = new Float32Array(64);
function tentacoli(c, e, t) {
  const a = e.an, n = a.n;
  c.lineWidth = a.sp; c.strokeStyle = a.col; c.beginPath();
  const lento = Math.sin(t * .5 + a.f * 2) * .12;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - .5, ang = u * 2.3, on = ang + Math.sin(t * 1.25 + a.f + i * .9) * .17 + lento, lun = a.lun[i];
    const bx = a.x + u * a.w * .62, tx = bx + Math.sin(on) * lun, ty = a.y - Math.cos(on) * lun;
    c.moveTo(bx, a.y + 3); c.quadraticCurveTo(bx + Math.sin(ang * .45) * lun * .5, a.y - Math.cos(ang * .45) * lun * .62, tx, ty);
    PUNTE[i * 2] = tx; PUNTE[i * 2 + 1] = ty;
  }
  c.stroke();
  c.fillStyle = a.punta; c.beginPath();
  for (let i = 0; i < n; i++) { c.moveTo(PUNTE[i * 2] + a.sp * .56, PUNTE[i * 2 + 1]); c.arc(PUNTE[i * 2], PUNTE[i * 2 + 1], a.sp * .56, 0, TAU); }
  c.fill();
}
function ciuffo(c, e, t) {
  const corr = Math.sin(t * .55 + e.x * .006) * .5 + Math.sin(t * .95 + e.f) * .22, lame = e.lame, n = lame.length;
  for (let pass = 0; pass < 2; pass++) {
    c.fillStyle = pass ? e.col1 : e.col0; c.beginPath();
    for (let i = pass; i < n; i += 2) {
      const l = lame[i], sv = (corr + Math.sin(t * 1.3 + l.f) * .2) * l.h * .24 + l.inc, bx = e.x + l.dx, mx = bx + sv * .3, my = e.y - l.h * .55, w = l.w;
      c.moveTo(bx - w, e.y + 4); c.quadraticCurveTo(mx - w * .85, my, bx + sv, e.y - l.h); c.quadraticCurveTo(mx + w * .85, my, bx + w, e.y + 4);
    }
    c.fill();
  }
}

// ---------------------------------------------------------------- pezzi della passata «dietro»
function cielo(c, v, sc, xa, xb, ya) {
  const t = v.t, cam = v.cam, co = sc.co, W = sc.W, passo = 24, x0 = Math.floor((xa - 30) / passo) * passo, x1 = xb + 30 + passo, su = Math.min(ya - 20, -40);
  c.save();
  c.beginPath(); c.moveTo(x0, su);                       // tutto il cielo sta sopra l'onda
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.lineTo(x1, su); c.closePath(); c.clip();
  const g = c.createLinearGradient(0, -1300, 0, 0);
  g.addColorStop(0, '#429fe0'); g.addColorStop(.72, '#7fcbf2'); g.addColorStop(1, '#d6f3fb');
  c.fillStyle = g; c.fillRect(xa - 4, su, xb - xa + 8, 16 - su);
  // il sole: un alone che segue piano la visuale
  const sx = cam.x * .8 + W * .14, sy = -310, sr = 380;
  if (ya < sy + sr) {
    const gs = c.createRadialGradient(sx, sy, 0, sx, sy, sr); gs.addColorStop(0, 'rgba(255,255,246,.96)'); gs.addColorStop(.1, 'rgba(255,253,230,.8)'); gs.addColorStop(.36, 'rgba(255,250,222,.26)'); gs.addColorStop(1, 'rgba(255,250,222,0)');
    c.fillStyle = gs; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  }
  // nuvole e isole restano indietro rispetto al mondo: sono lontane
  for (const r of FILE_NUVOLE) {
    const lw = 1536 * r.k, lh = 480 * r.k;
    if (r.y + lh < ya) continue;
    const sposta = cam.x * r.par + r.fase;
    for (let x = Math.floor((xa - sposta) / lw) * lw + sposta; x < xb; x += lw) c.drawImage(co.nuvole, x, r.y, lw + .5, lh);
  }
  for (const o of ISOLE) {
    const w = co.isola.w * o.k, h = co.isola.h * o.k, x = cam.x * o.par + W * o.x * (1 - o.par);
    if (x + w / 2 > xa && x - w / 2 < xb) c.drawImage(co.isola.im, x - w / 2, 8 - h, w, h);
  }
  c.restore();
}
const FILE_NUVOLE = [{ y: -500, k: 1, par: .55, fase: 0 }, { y: -1180, k: 1.4, par: .4, fase: 700 }];
const ISOLE = [{ x: .16, par: .72, k: 1 }, { x: .58, par: .8, k: .66 }, { x: .9, par: .74, k: 1.15 }];

function scogliere(c, v, sc, xa, xb, ya, yb) {
  const co = sc.co, W = sc.W, H = sc.H;
  for (let lato = 0; lato < 2; lato++) {
    const fuori = lato ? xb - W : -xa;       // quanto si vede oltre il bordo del mondo
    if (fuori < -20) continue;
    c.save();
    if (lato) { c.translate(W, 0); c.scale(-1, 1); }   // la parete destra è lo specchio della sinistra: qui la roccia sta a x < 0
    if (fuori > PARETE_L - 4) { c.fillStyle = sfuma(c, PARETE_SU_VELATA, PARETE_GIU_VELATA, 0, 3072); c.fillRect(-OLTRE, -4, OLTRE - PARETE_L + 1, H + 80); }
    for (let k = 0; k * 1024 < H + 40; k++) { const y0 = k * 1024; if (y0 < yb && y0 + 1024 > ya) c.drawImage(co.parete[k % co.parete.length], -PARETE_L, y0); }
    if (ya < 10) {
      c.drawImage(co.scoglio, -512, -512);
      if (fuori > 508) {
        c.fillStyle = sfuma(c, SCOGLIO[0], SCOGLIO[1], -SCOGLIO_ALTO - 30, 0); c.fillRect(-OLTRE, -SCOGLIO_ALTO + 14, OLTRE - 511, SCOGLIO_ALTO - 10);
        c.fillStyle = VERDE[0]; c.fillRect(-OLTRE, -SCOGLIO_ALTO - 8, OLTRE - 511, 24);
      }
    }
    c.restore();
  }
}
const PARETE_SU_VELATA = mesc(PARETE_SU, ACQUA, VELO_PARETE), PARETE_GIU_VELATA = mesc(PARETE_GIU, ACQUA, VELO_PARETE);

function superficie(c, v, sc, xa, xb) {
  const t = v.t, passo = 24, x0 = Math.floor((xa - 30) / passo) * passo, x1 = xb + 30 + passo;
  // la luce che entra sotto il pelo dell'acqua
  const g = c.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, 'rgba(226,252,250,.55)'); g.addColorStop(.3, 'rgba(196,246,248,.22)'); g.addColorStop(1, 'rgba(196,246,248,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(x0, 250);
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.lineTo(x1, 250); c.closePath(); c.fill();
  // riflessi che scorrono appena sotto
  if (v.qualita > 0) {
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath();
    for (let i = Math.floor(xa / 64) - 1, fine = Math.floor(xb / 64) + 1; i <= fine; i++) {
      const vivo = Math.sin(t * (.8 + rumore(i, 3) * .9) + rumore(i, 5) * TAU);
      if (vivo < -.2) continue;
      const cx = i * 64 + rumore(i, 7) * 64 + Math.sin(t * .4 + i) * 14, cy = 16 + rumore(i, 9) * 96, rx = (14 + rumore(i, 11) * 34) * (.5 + vivo * .5), ry = 2 + rumore(i, 13) * 2.6;
      c.moveTo(cx + rx, cy); c.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    }
    c.fill();
  }
  // il pelo dell'acqua: una fascia chiara tra l'onda di dietro e quella davanti, poi il filo bianco
  c.fillStyle = 'rgba(206,244,250,.8)'; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t) + 1);
  for (let x = x1; x >= x0; x -= passo) c.lineTo(x, onda(x + 150, t + 1.7) * .8 - 9);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(20,150,190,.3)'; c.lineWidth = 3; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t) + 5);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 3; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.stroke();
  if (v.qualita > 0) {      // scintille di sole sul pelo dell'acqua
    c.fillStyle = '#ffffff'; c.beginPath();
    for (let i = Math.floor(xa / 90) - 1, fine = Math.floor(xb / 90) + 1; i <= fine; i++) {
      const vivo = Math.sin(t * (1.6 + rumore(i, 21) * 1.4) + rumore(i, 23) * TAU);
      if (vivo < .5) continue;
      const cx = i * 90 + rumore(i, 25) * 90, cy = onda(cx, t) - 3, r = (vivo - .5) * 13;
      c.moveTo(cx - r, cy); c.quadraticCurveTo(cx, cy, cx, cy - r * .8); c.quadraticCurveTo(cx, cy, cx + r, cy); c.quadraticCurveTo(cx, cy, cx, cy + r * .8); c.quadraticCurveTo(cx, cy, cx - r, cy);
    }
    c.fill();
  }
}

function fondale(c, v, sc, xa, xb, ya, yb) {
  const co = sc.co, H = sc.H, t = v.t, q = v.qualita;
  // fila di dietro e la sua dorsale di sabbia
  for (const e of sc.dietro) {
    if (e.x1 < xa || e.x0 > xb) continue;
    if (e.ci) ciuffo(c, e.ci, t); else c.drawImage(e.im, e.dx, e.dy, e.w, e.h);
  }
  const i0 = Math.floor(xa / 512), i1 = Math.floor(xb / 512);
  for (let i = i0; i <= i1; i++) c.drawImage(co.dorsale, i * 512, H - 56, 512, 96);
  // prima fila
  for (const e of sc.fila) {
    if (e.x1 < xa || e.x0 > xb) continue;
    if (e.ci) { ciuffo(c, e.ci, t); continue; }
    if (e.an) tentacoli(c, e, t);
    if (e.s !== 1 && q > 0) c.drawImage(e.im, e.x - e.ax * e.s, e.y - e.ay * e.s, e.w * e.s, e.h * e.s); else c.drawImage(e.im, e.dx, e.dy, e.w, e.h);
  }
  // la sabbia davanti: prima il colore pieno, poi cresta e corpo
  if (yb > H + 30) { c.fillStyle = SAB[2]; c.fillRect(xa - 4, H + 30, xb - xa + 8, yb - H - 26); }
  if (yb > H + 230) {      // la sabbia profonda, sempre più scura scendendo
    for (let y = H + 230; y < yb; y += 512) for (let i = i0; i <= i1; i++) c.drawImage(co.profonda, i * 512, y, 512.5, 512.5);
    c.fillStyle = sfuma(c, 'rgba(120,88,58,0)', 'rgba(120,88,58,.4)', H + 300, H + 1700); c.fillRect(xa - 4, H + 300, xb - xa + 8, yb - H - 296);
  }
  for (let i = i0; i <= i1; i++) {
    c.drawImage(co.cresta[((i % 2) + 2) % 2], i * 512, H - 44, 512, 128);
    if (yb > H + 84) c.drawImage(co.corpo, i * 512, H + 84, 512, 256);
  }
  // la luce che balla sul fondo
  if (q > 0) {
    for (let giro = 0; giro < q; giro++) {
      const sposta = Math.round((giro ? -t * 7 + 90 : t * 10) * 2) / 2;
      c.globalAlpha = giro ? .55 : .85;
      for (let x = Math.floor((xa - sposta) / 256) * 256 + sposta; x < xb; x += 256) c.drawImage(co.luceFondo, x, H - 86 + giro * 22, 256, 256);
    }
    c.globalAlpha = 1;
  }
  // ciò che sta appoggiato sulla sabbia
  for (const e of sc.sabbia) if (e.x1 > xa && e.x0 < xb) c.drawImage(e.im, e.dx, e.dy, e.w, e.h);
}

// ---------------------------------------------------------------- l'ambiente
B.ambienti.registra({
  id: 'laguna',
  descrizione: 'Acqua bassa e piena di sole, tra coralli colorati e sabbia chiara.',
  colori: { acquaAlta: '#1b97bb', acquaBassa: '#0d5083', sabbia: '#dcc48f', roccia: '#35708c', accento: '#f07f6e' },   // l'interfaccia ci scrive sopra in bianco

  crea(mondo, caso) {
    const co = prepara(), W = mondo.w, H = mondo.h;
    const tra = (a, b) => a + caso() * (b - a), uno = l => l[Math.floor(caso() * l.length)], mezzo = n => Math.round(n * 2) / 2;
    const sc = { co, W, H, formazioni: [], dietro: [], fila: [], sabbia: [], sorgenti: [], fronde: [] };

    // le grandi formazioni, a distanze irregolari
    const giro = co.formazioni.map((f, i) => i);
    for (let i = giro.length - 1; i > 0; i--) { const j = Math.floor(caso() * (i + 1)), a = giro[i]; giro[i] = giro[j]; giro[j] = a; }
    for (let x = tra(-80, 160), n = 0; x < W - 60; n++) {
      const f = co.formazioni[giro[n % giro.length]], s = f.h > 700 ? tra(1.15, 1.45) : tra(.95, 1.25), cx = mezzo(x + f.w * s * .5);   // i pinnacoli alti arrivano a metà del mondo
      sc.formazioni.push({ f, s, specchio: caso() < .5, x: cx, y: H + 22, cy: H + 22 - f.ay * s / 2, margine: Math.max(f.w, f.h) * s * .5 });
      x += f.w * s * tra(.5, .8) + tra(10, 240);
    }

    // la barriera: gruppi con un tema, su due file
    const occupati = [[], []];
    const libero = (fila, x, m) => occupati[fila].every(o => Math.abs(o[0] - x) > (o[1] + m) * .5);
    const pianta = (tipo, x, dietro) => {
      const f0 = uno(co.tipi[tipo]), f = dietro ? f0.lontana : f0, fila = dietro ? 0 : 1, m = f.w / 2;
      if (!libero(fila, x, m)) return false;
      occupati[fila].push([x, m]);
      const y = H + (dietro ? dorsale(x) + 9 : duna(x) + 7), s = !dietro && !f0.anemone && caso() < .2 ? tra(1.18, 1.42) : 1;
      const e = { im: f.im, w: f.w, h: f.h, ax: f.ax, ay: f.ay, x: mezzo(x), y: mezzo(y), s, dx: mezzo(x - f.ax), dy: mezzo(y - f.ay), x0: x - m * s, x1: x + m * s, alto: f.h * s + caso() * 26, an: null, ci: null };
      if (f0.anemone) {
        const a = f0.anemone, n = 9 + Math.floor(caso() * 3), lun = [];
        for (let i = 0; i < n; i++) lun.push((44 + caso() * 22) * (1 - Math.abs(i / (n - 1) - .5) * .5));
        e.an = { x: e.x, y: e.y - a.alto, w: a.larg, n, lun, sp: 7.5, col: a.tentacolo, punta: a.punta, f: caso() * TAU };
        e.x0 -= 60; e.x1 += 60; e.alto = 60;
      }
      (dietro ? sc.dietro : sc.fila).push(e);
      return true;
    };
    const prato = (x, dietro) => {
      const lame = [], n = 6 + Math.floor(caso() * 4), k = dietro ? .72 : 1;
      for (let i = 0; i < n; i++) lame.push({ dx: ((i / (n - 1) - .5) * 34 + tra(-5, 5)) * k, h: tra(60, 140) * k, w: tra(3.4, 5.2) * k, inc: tra(-12, 12) * k, f: caso() * TAU });
      const verde = caso() < .6 ? ['#4f9f7e', '#78bf90'] : ['#62a078', '#9bc98f'], y = H + (dietro ? dorsale(x) + 6 : duna(x) + 5);
      const ci = { x, y, f: caso() * TAU, lame, col0: dietro ? mesc(verde[0], ACQUA, .45) : verde[0], col1: dietro ? mesc(verde[1], ACQUA, .45) : verde[1] };
      (dietro ? sc.dietro : sc.fila).push({ ci, x0: x - 70, x1: x + 70, alto: 150 * k + caso() * 30 });
    };
    const TIPI = ['gorgonia', 'cervello', 'corna', 'tavola', 'spugna', 'foglie', 'roccia', 'anemone'];
    for (let cx = tra(20, 130); cx < W + 40; ) {
      const tema = [uno(TIPI), uno(TIPI), uno(TIPI)], quanti = 6 + Math.floor(caso() * 6), largo = tra(80, 170);
      for (let i = 0; i < quanti; i++) {
        const tipo = caso() < .7 ? uno(tema) : uno(TIPI), dietro = tipo !== 'anemone' && caso() < .4;
        for (let prova = 0; prova < 5; prova++) if (pianta(tipo, cx + (caso() + caso() - 1) * largo * (1 + prova * .3), dietro)) break;
      }
      if (caso() < .7) for (let i = 0, n = 2 + Math.floor(caso() * 3); i < n; i++) prato(cx + largo + tra(20, 110) + i * tra(14, 40), caso() < .35);   // una macchia di posidonia nello spazio tra i gruppi
      cx += largo + tra(100, 230);
    }
    for (let i = 0; i < W / 300; i++) pianta('roccia', tra(0, W), caso() < .5);
    for (let i = 0; i < W / 190; i++) prato(tra(-40, W + 40), caso() < .4);
    sc.dietro.sort((a, b) => b.alto - a.alto);
    sc.fila.sort((a, b) => b.alto - a.alto);

    // stelle, conchiglie e sassi sulla sabbia
    const posa = (f, x, giu) => { const y = H + duna(x) + giu; if (sc.sabbia.some(o => Math.abs(o.cx - x) < 46 && Math.abs(o.cy - y) < 30)) return; sc.sabbia.push({ im: f.im, w: f.w, h: f.h, cx: x, cy: y, dx: mezzo(x - f.ax), dy: mezzo(y - f.ay), x0: x - f.w, x1: x + f.w }); };
    for (let i = 0; i < W / 200; i++) posa(uno(co.tipi.stella), tra(-60, W + 60), tra(20, 70));
    for (let i = 0; i < W / 300; i++) posa(uno(co.tipi.conchiglia), tra(-60, W + 60), tra(18, 64));
    for (let i = 0; i < W / 130; i++) posa(uno(co.tipi.sasso), tra(-60, W + 60), tra(14, 130));

    // da dove salgono le bollicine, e le fronde in primo piano
    for (let i = 0; i < W / 330; i++) { const x = tra(60, W - 60); sc.sorgenti.push({ x, y: H + duna(x) - 6, f: caso(), alt: tra(380, 620) }); }
    const postiFronde = [tra(10, 110), W - tra(10, 110)];
    for (let x = tra(520, 900); x < W - 500; x += tra(620, 1000)) postiFronde.push(x);     // pochissime: una ogni tanto, mai vicine tra loro
    for (const x of postiFronde) sc.fronde.push({ f: uno(co.fronde), x, y: H + duna(x) + tra(2, 8), s: tra(.66, .9), fase: caso() * TAU, specchio: caso() < .5 });
    return sc;
  },

  /* Misure di schermo: acqua e piani lontani in parallasse. */
  sfondo(c, v, sc) {
    const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, H = v.mondo.h, mh = vh / 2 / z;
    const g = c.createLinearGradient(0, 0, 0, vh);       // due soli colori: con tre la sfumatura costa più del doppio
    g.addColorStop(0, tinta((cam.y - mh) / H)); g.addColorStop(1, tinta((cam.y + mh) / H));
    c.fillStyle = g; c.fillRect(0, 0, vw, vh);
    if (!sc) return;
    c.save();
    const dpr = v.dpr || 1, fermo = n => Math.round(n * dpr) / dpr, prof = limita(cam.y / H, 0, 1);
    if (v.qualita > 0) lame(c, v, LAME_DIETRO, .3 - prof * .08, .3, 0);
    c.imageSmoothingEnabled = false;      // i piani lontani sono già sfumati: copiati senza filtro costano un quarto e non si nota
    for (const p of sc.co.piani) {
      if (p.lusso && v.qualita === 0) continue;
      const k = 1 + (z - 1) * p.zoom, lw = p.im.width / 2 * k, lh = p.im.height / 2 * k;   // i piani lontani risentono meno dello zoom
      const y0 = fermo(vh / 2 + (H - cam.y) * p.par * k + 62 * k - lh);
      if (y0 >= vh) continue;
      const x0 = fermo(-((((cam.x * p.par * k + p.fase) % lw) + lw) % lw)), piu = k === 1 ? 0 : .6;
      for (let x = x0; x < vw; x += lw) c.drawImage(p.im, x, y0, lw + piu, lh);
      if (y0 + lh < vh) { c.fillStyle = p.fondo; c.fillRect(0, y0 + lh, vw, vh - y0 - lh); }
    }
    c.restore();
  },

  /* Misure di mondo, dietro alle creature: cielo e superficie, scogliere, formazioni, barriera, sabbia. */
  dietro(c, v, sc) {
    if (!sc) return;
    const cam = v.cam, W = sc.W, H = sc.H, mw = v.vw / 2 / cam.z + AGIO, mh = v.vh / 2 / cam.z + AGIO, xa = cam.x - mw, xb = cam.x + mw, ya = cam.y - mh, yb = cam.y + mh;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (v.qualita === 0) c.imageSmoothingEnabled = false;
    if (ya < 30) cielo(c, v, sc, xa, xb, ya);
    for (const f of sc.formazioni) {
      if (!v.visibile(f.x, f.cy, f.margine)) continue;
      const g = f.f, s = f.s;
      if (f.specchio) { c.save(); c.translate(f.x, f.y); c.scale(-s, s); c.drawImage(g.im, -g.ax, -g.ay, g.w, g.h); c.restore(); }
      else c.drawImage(g.im, f.x - g.ax * s, f.y - g.ay * s, g.w * s, g.h * s);
    }
    if (xa < 20 || xb > W - 20) scogliere(c, v, sc, xa, xb, ya, yb);
    if (ya < 260) superficie(c, v, sc, xa, xb);
    if (yb > H - 340) fondale(c, v, sc, xa, xb, ya, yb);
    c.restore();
  },

  /* Misure di mondo, davanti alle creature: poche fronde sfocate in basso, bollicine e pulviscolo. */
  davanti(c, v, sc) {
    if (!sc || v.qualita === 0) return;
    const cam = v.cam, z = cam.z, t = v.t, H = sc.H, mw = v.vw / 2 / z, mh = v.vh / 2 / z, xa = cam.x - mw, xb = cam.x + mw, ya = cam.y - mh, yb = cam.y + mh;
    c.save();
    if (yb > H - 300) {
      c.globalAlpha = .62; c.globalCompositeOperation = 'multiply';    // scuriscono ciò che hanno dietro senza ingrigirlo
      for (const e of sc.fronde) {
        const f = e.f, x = e.x + (e.x - cam.x) * .1, w = f.w * e.s, h = f.h * e.s;     // scorrono un po' più del mondo: sono più vicine
        if (!v.visibile(x, e.y - h / 2, Math.max(w, h) * .6)) continue;
        c.save(); c.translate(x, e.y); c.transform(e.specchio ? -1 : 1, 0, Math.sin(t * .6 + e.fase) * .07, 1, 0, 0);
        c.drawImage(f.im, -w / 2, -f.ay * e.s, w, h); c.restore();
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    // colonne di bollicine che salgono dal fondale
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath();
    for (const s of sc.sorgenti) {
      if (!v.visibile(s.x, s.y - s.alt / 2, s.alt / 2 + 20)) continue;
      for (let i = 0; i < 6; i++) {
        const u = (t * .11 + s.f + i / 6) % 1, y = s.y - u * s.alt;
        if (y < ya - 10 || y > yb + 10) continue;
        const x = s.x + Math.sin(u * 11 + i * 2.1) * 12 * u + Math.sin(t * 1.7 + i) * 2, r = (1.6 + u * 2.6 + rumore(i, 3) * 1.4) * (u > .85 ? (1 - u) / .15 : 1);
        c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
      }
    }
    // bollicine sparse: salgono piano e seguono la visuale un po' più in fretta del mondo
    const lw = mw * 2.3, lh = mh * 2.3, rz = 1 / Math.sqrt(z);
    for (let i = 0; i < 12; i++) {
      const fx = (((rumore(i, 51) * lw - cam.x * .25) % lw) + lw) % lw, fy = (((rumore(i, 53) * lh - cam.y * .25 - t * (16 + rumore(i, 55) * 22)) % lh) + lh) % lh;
      const x = cam.x - lw / 2 + fx + Math.sin(t * 1.3 + i * 1.9) * 5, y = cam.y - lh / 2 + fy, r = (1.3 + rumore(i, 57) * 2.2) * rz;
      if (y < 6 || y > H) continue;      // solo nell'acqua: non nel cielo né sulla sabbia
      c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
    }
    c.fill();
    // pulviscolo
    c.fillStyle = 'rgba(236,250,246,.22)'; c.beginPath();
    for (let i = 0; i < 20; i++) {
      const fx = (((rumore(i, 61) * lw - cam.x * .4 + Math.sin(t * .23 + i) * 18) % lw) + lw) % lw, fy = (((rumore(i, 63) * lh - cam.y * .4 + t * (3 + rumore(i, 65) * 5)) % lh) + lh) % lh;
      const x = cam.x - lw / 2 + fx, y = cam.y - lh / 2 + fy, r = (1.1 + rumore(i, 67) * 1.7) * rz;
      if (y < 6 || y > H) continue;      // solo nell'acqua: non nel cielo né sulla sabbia
      c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
    }
    c.fill();
    c.restore();
  },

  /* Misure di schermo, sopra tutto: lame di sole leggere, riflessi di luce, bordi appena più scuri. */
  velo(c, v, sc) {
    if (!sc) return;
    const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, t = v.t, prof = limita(cam.y / sc.H, 0, 1), ys = vh / 2 - cam.y * z;
    c.save();
    if (v.qualita > 0) {
      lame(c, v, LAME_VELO, .1 - prof * .04, .7, ys + 6);
      // riflessi di luce: si vedono vicino alla superficie e si spengono scendendo (sul fondo li fa la sabbia)
      const forza = 1 - prof * 1.5;
      if (forza > .06) {
        const dpr = v.dpr || 1, fermo = n => Math.round(n * dpr) / dpr, lato = sc.co.luce.width / 2, su = Math.max(0, ys + 4);
        const ox = fermo(-((((cam.x * z * .45 + t * 8) % lato) + lato) % lato)), oy = fermo(-((((cam.y * z * .45 - t * 5) % lato) + lato) % lato));
        if (su > 0) { c.beginPath(); c.rect(0, su, vw, vh - su); c.clip(); }
        c.globalAlpha = Math.min(1, forza) * .42;
        for (let y = oy; y < vh; y += lato) { if (y + lato < su) continue; for (let x = ox; x < vw; x += lato) c.drawImage(sc.co.luce, x, y, lato, lato); }
        c.globalAlpha = 1;
      }
    }
    c.restore();
    c.save();
    if (v.qualita > 0) {
      const vg = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * .55, vw / 2, vh / 2, Math.max(vw, vh) * .8);
      vg.addColorStop(0, 'rgba(8,52,104,0)'); vg.addColorStop(1, 'rgba(8,52,104,.32)');
      c.fillStyle = vg; c.fillRect(0, 0, vw, vh);
    } else {
      c.fillStyle = sfuma(c, 'rgba(8,52,104,.26)', 'rgba(8,52,104,0)', 0, vh * .22); c.fillRect(0, 0, vw, vh * .22);
    }
    c.restore();
  },
});
})();
