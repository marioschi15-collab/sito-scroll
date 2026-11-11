/* Boccone — ambiente «Foresta di alghe» (id: alghe). Contratto: ARCHITETTURA.md §4.

   Stessa ossatura della laguna (attrezzi → pittori → corredo di tele dipinte una volta sola → crea() che dispone →
   passate che quasi soltanto copiano), ma il protagonista qui è il KELP, e il mondo è stretto e alto: un bosco verticale.

   Piani, dal più lontano: acqua (sfumatura) · lame di sole · tre piani di tronchi velati con il loro suolo, in parallasse
   (in verticale scorrono più svelti che in orizzontale: a mezz'acqua il suolo lontano non si vede e il bosco pare senza
   fondo), e la chioma lontana appesa sotto il pelo dell'acqua (sfondo) · cielo, foschia, faraglioni · grandi massi e arco di
   roccia velati · pareti muschiose · fasci di luce che scendono dai varchi tra le chiome · kelp della fila di dietro ·
   scogli di dietro e dorsale · kelp della fila davanti · pelo dell'acqua e chiome galleggianti · prima fila (scogli con
   gli appigli, alghe corte, anemoni, erba) · ghiaia · luce sul fondo · stelle, abaloni e sassi (dietro) ·
   poche fronde sfocate ai bordi, bollicine, pulviscolo (davanti) · lame leggere, riflessi in alto, bordi scuri (velo).

   Come si muove il kelp spendendo poco: il FUSTO è un tracciato solo per tutte le piante in vista (due passate di
   colore); le LAMINE con la vescichetta sono figurine già dipinte e velate, copiate pari pari (2 pixel per unità,
   posate su mezze unità) nel punto in cui il fusto ondeggia in quel momento. Niente rotazioni nel fotogramma.
   I tronchi lontani sono tele che si ripetono in verticale: il fusto serpeggia con un periodo pari all'altezza della tela;
   con la qualità alta si copiano a fette alte 32 px, ognuna spostata di qualche pixel intero: un'onda che sale lungo i tronchi.

   Costi imparati qui (oltre a quelli scritti in cima alla laguna):
   - copiare una tela con globalAlpha diverso da 1 costa più del doppio: la trasparenza va messa dentro la tela;
   - con la visuale larga le lamine sono piccole: una copia a metà risoluzione, senza filtro, costa un quarto di quella filtrata;
   - 'multiply' su una figurina ingrandita e inclinata costa caro: solo per le pochissime fronde in primo piano. */
(() => {
'use strict';
const B = window.B, U = B.util, TAU = Math.PI * 2, PI = Math.PI, limita = U.limita, rumore = U.rumore;

const S = 2;              // pixel per unità di mondo nelle figurine
const OLTRE = 1700;       // fin dove si dipinge fuori dal mondo
const AGIO = 48;          // quanto si dipinge oltre il bordo della visuale (lo schermo che trema sposta il mondo)
const PARETE_L = 192;     // larghezza delle strisce di roccia ai lati (oltre il bordo si vede al massimo un centinaio di unità)
const PEND = .27;         // pendenza delle lame di sole
const ACQUA = '#2a9e84';  // il velo d'acqua che allontana le cose
const FONDA = '#147666';  // l'acqua vicino al fondo: vela ciò che sta laggiù
const BOTT = '#0b4a44';   // verde bottiglia: verso dove virano le ombre
const VELO_KELP = .4, VELO_FONDO = .1;

// ---------------------------------------------------------------- colori
const memoRgb = {};
function rgb(h) { return memoRgb[h] || (memoRgb[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]); }
function esa(r, g, b) { return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1); }
function mesc(a, b, t) { const p = rgb(a), q = rgb(b); return esa(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); }
function alfa(h, a) { const p = rgb(h); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
const chiaro = (c, t) => mesc(c, '#ffffff', t), scuro = (c, t) => mesc(c, BOTT, t);

const KELP = { lamina: '#869c3e', lamina2: '#6f9844', fusto: '#8b8f3e', bolla: '#c4bf66', oro: '#c9b653' };
const MUSCHIO = ['#5f9a5a', '#7db165', '#4c8a62', '#93bd6e'];
const PIETRA = ['#6f857c', '#7c8c7a', '#62807a'];
const STELLE = ['#e09a52', '#9a82c2', '#d67a62', '#e3b25e'];

/* Il colore dell'acqua secondo la profondità (0 = superficie, 1 = fondale): smeraldo luminoso che scende a verde bottiglia. */
const RAMPA = [[-.25, '#b9f3cd'], [0, '#84e4b4'], [.22, '#4bc79a'], [.5, '#27a585'], [.8, '#167f6d'], [1, '#106a5c'], [1.45, '#0b5049']].map(p => [p[0], rgb(p[1])]);
function tinta(u) {
  let i = 1;
  while (i < RAMPA.length - 1 && u > RAMPA[i][0]) i++;
  const a = RAMPA[i - 1], b = RAMPA[i], k = limita((u - a[0]) / (b[0] - a[0]), 0, 1);
  return 'rgb(' + Math.round(a[1][0] + (b[1][0] - a[1][0]) * k) + ',' + Math.round(a[1][1] + (b[1][1] - a[1][1]) * k) + ',' + Math.round(a[1][2] + (b[1][2] - a[1][2]) * k) + ')';
}

// ---------------------------------------------------------------- profili che non cambiano (li usano tele e disposizione)
const duna = x => 9 + 8 * Math.sin(x * TAU / 1024 + 1.9) + 5 * Math.sin(x * TAU / 1024 * 3 + .7) + 3 * Math.sin(x * TAU / 1024 * 8 + 3.1);      // ghiaia davanti: da -7 a 25 sotto il fondale
const dorsale = x => -34 + 13 * Math.sin(x * TAU / 512 + 2.4) + 7 * Math.sin(x * TAU / 512 * 3 + .9);                                          // roccia dietro: da -54 a -14
const onda = (x, t) => 4.5 * Math.sin(x * .017 + t) + 2.6 * Math.sin(x * .041 - t * 1.5 + 1.3) + 1.6 * Math.sin(x * .0079 + t * .5);          // pelo dell'acqua (il kelp la calma)
const ciglio = y => -40 + 18 * Math.sin(y / 190 + 2) + 9 * Math.sin(y / 71 + .6) + 4 * Math.sin(y / 31 + 1.5);                                 // faccia della parete: da -71 a -9
const mezzo = n => Math.round(n * 2) / 2;

// ---------------------------------------------------------------- tele e figurine
let pixel = 0;
function tela(w, h) { const im = U.tela(Math.min(1024, w), Math.min(1024, h)); pixel += im.width * im.height; return im; }
function penna(im) { const x = im.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; return x; }
function vela(im, col, a) { const x = im.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = alfa(col, a); x.fillRect(0, 0, im.width, im.height); x.restore(); }

/* Una figurina ritagliata: chi disegna usa unità di mondo; (ax, ay) dice dove sta l'origine dentro la tela. */
function ritaglio(x0, y0, x1, y1, disegna, scala = S, velo = 0) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  const w = x1 - x0, h = y1 - y0, im = tela(w * scala, h * scala), x = penna(im);
  x.scale(scala, scala); x.translate(-x0, -y0);
  disegna(x);
  if (velo) vela(im, ACQUA, velo);
  return { im, w, h, ax: -x0, ay: -y0 };
}
/* Figurina con l'origine nel piede (centro, in basso). */
function figurina(w, h, piede, disegna, scala = S, velo = VELO_FONDO) { const f = ritaglio(-w / 2, piede - h, w / 2, piede, disegna, scala, 0); if (velo) vela(f.im, FONDA, velo); return f; }
/* La stessa figurina per la fila di dietro: più piccola, allo specchio e velata d'acqua. */
function lontana(f, k = .74, velo = .36, col = FONDA) {
  const w = Math.round(f.w * k), h = Math.round(f.h * k), im = tela(w * S, h * S), x = im.getContext('2d');
  x.translate(im.width, 0); x.scale(-1, 1); x.drawImage(f.im, 0, 0, im.width, im.height);
  vela(im, col, velo);
  return { im, w, h, ax: w - f.ax * k, ay: f.ay * k };
}

// ---------------------------------------------------------------- attrezzi di disegno
function sfuma(x, c0, c1, y0, y1) { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
function lucido(x, cx, cy, rx, ry, rot, a, col = '#ffffff') {
  x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(1, ry / rx);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, alfa(col, a)); g.addColorStop(1, alfa(col, 0));
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, TAU); x.fill(); x.restore();
}
function ovale(x, cx, cy, rx, ry, rot = 0) { x.moveTo(cx + Math.cos(rot) * rx, cy + Math.sin(rot) * rx); x.ellipse(cx, cy, rx, ry, rot, 0, TAU); }
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
/* Curva aperta morbida. */
function filo(x, p) {
  const n = p.length - 1;
  x.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < n; i++) x.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
  x.lineTo(p[n][0], p[n][1]);
}
function macchia(x, cx, cy, rx, ry, caso, irr, n) { liscia(x, puntiMacchia(cx, cy, rx, ry, caso, irr, n)); }
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
/* Sul bordo sinistro di una tela riporta il colore pieno (sfumatura verticale da c0 a c1 tra le righe y0 e y1), svanendo in
   `largo` pixel: così il riempimento che continua fuori dalla tela non fa scalino. */
function raccordo(im, c0, c1, y0, y1, largo) {
  const t = U.tela(largo, im.height), x = t.getContext('2d');
  x.fillStyle = sfuma(x, c0, c1, y0, y1); x.fillRect(0, 0, largo, im.height);
  x.globalCompositeOperation = 'destination-in';
  const g = x.createLinearGradient(0, 0, largo, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, largo, im.height);
  const y = im.getContext('2d');
  y.save(); y.setTransform(1, 0, 0, 1, 0, 0); y.globalCompositeOperation = 'source-atop'; y.drawImage(t, 0, 0); y.restore();
}

// ---------------------------------------------------------------- i pittori del kelp
/* La forma di una lamina: parte dall'origine (dove si attacca al fusto), va verso `verso` (1 destra, -1 sinistra), sale di
   `sali` e ricade di `cadi` (frazioni della lunghezza). Tiene anche l'ingombro, per ritagliare la figurina. */
function formaLamina(caso, lun, larg, verso, sali, cadi) {
  const n = 12, sp = [], f1 = caso() * TAU, f2 = caso() * TAU, onde = 2 + caso() * 1.6;
  const bx = verso * 9, by = -4, mx = verso * lun * .5, my = -lun * (sali + .16), tx = verso * lun * .97, ty = lun * (cadi - sali);
  let x0 = -4, x1 = 4, y0 = -8, y1 = 5;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u, px = a * bx + b * mx + d * tx, py = a * by + b * my + d * ty;
    let dx = (1 - u) * (mx - bx) + u * (tx - mx), dy = (1 - u) * (my - by) + u * (ty - my);
    const l = Math.hypot(dx, dy) || 1, w = larg * Math.pow(Math.sin(PI * Math.pow(u * .95 + .03, .62)), .75);
    dx /= l; dy /= l;
    sp.push({ x: px, y: py, nx: verso * dy, ny: -verso * dx, wa: w * (1 + .15 * Math.sin(u * onde * TAU + f1)), wb: w * (1 + .15 * Math.sin(u * onde * TAU + f2)) });   // (nx, ny) guarda in su
    x0 = Math.min(x0, px - larg * 1.2); x1 = Math.max(x1, px + larg * 1.2); y0 = Math.min(y0, py - larg * 1.2); y1 = Math.max(y1, py + larg * 1.2);
  }
  return { sp, verso, lun, larg, x0: x0 - 2, y0: y0 - 2, x1: x1 + 2, y1: y1 + 2 };
}
function dipingiLamina(x, f, col, bolla = true) {
  const sp = f.sp, n = sp.length - 1, bordo = [], sopra = [], sotto = [], spina = [];
  for (let i = 0; i <= n; i++) {
    const s = sp[i]; bordo.push([s.x + s.nx * s.wa, s.y + s.ny * s.wa]);
    if (i < n) spina.push([s.x, s.y]);
    if (i > 0 && i < n) { sopra.push([s.x + s.nx * s.wa * .52, s.y + s.ny * s.wa * .52]); sotto.push([s.x - s.nx * s.wb * .58, s.y - s.ny * s.wb * .58]); }
  }
  for (let i = n; i >= 0; i--) { const s = sp[i]; bordo.push([s.x - s.nx * s.wb, s.y - s.ny * s.wb]); }
  x.strokeStyle = scuro(KELP.fusto, .1); x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(sp[0].x, sp[0].y); x.stroke();
  const g = x.createLinearGradient(sp[0].x, sp[0].y, sp[n].x, sp[n].y); g.addColorStop(0, mesc(col, KELP.oro, .45)); g.addColorStop(.4, col); g.addColorStop(1, scuro(col, .28));
  x.fillStyle = g; x.beginPath(); liscia(x, bordo); x.fill();
  x.save(); x.clip();
  x.lineWidth = f.larg * .34; x.strokeStyle = 'rgba(244,255,208,.2)'; x.beginPath(); filo(x, sopra); x.stroke();
  x.strokeStyle = alfa(BOTT, .2); x.beginPath(); filo(x, sotto); x.stroke();
  x.lineWidth = Math.max(1.4, f.larg * .11); x.strokeStyle = alfa(chiaro(mesc(col, KELP.oro, .4), .35), .7); x.beginPath(); filo(x, spina); x.stroke();
  x.restore();
  if (!bolla) return;
  const vx = f.verso * 5.5, vy = -2.5, rot = -f.verso * .35;      // la vescichetta piena d'aria che tiene su la lamina
  x.fillStyle = sfuma(x, chiaro(KELP.bolla, .25), scuro(KELP.bolla, .15), vy - 4.5, vy + 4.5); x.beginPath(); ovale(x, vx, vy, 6.5, 4.6, rot); x.fill();
  x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); ovale(x, vx - 1.6, vy - 1.8, 2.2, 1.1, rot); x.fill();
}
/* Kelp giovane: due o tre lamine che salgono dal piede. */
function germoglio(x, caso, r, col) {
  const n = 2 + Math.floor(caso() * 2);
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) - .5 : .2, verso = u < 0 ? -1 : 1;
    x.save(); x.rotate(-verso * (PI / 2 - .2 - Math.abs(u) * .8));
    dipingiLamina(x, formaLamina(caso, r * (.8 + caso() * .4), r * .17, verso, .05, .12), col, false);
    x.restore();
  }
}
/* L'appiglio: le dita con cui il kelp stringe la roccia. Origine in basso al centro; il fusto parte da (0, -w*.42). */
function appiglio(x, caso, w, col) {
  const h = w * .42, dita = [], n = 7 + Math.floor(caso() * 3);
  for (let i = 0; i < n; i++) { const u = i / (n - 1) - .5; dita.push([u * w * (.9 + caso() * .2), 6 - Math.abs(u) * 6 + caso() * 5, u * w * .5, -h * (.75 + caso() * .2)]); }
  for (let pass = 0; pass < 2; pass++) {
    x.strokeStyle = pass ? chiaro(col, .12) : scuro(col, .4); x.lineWidth = pass ? 4.2 : 7.5; x.beginPath();
    for (const d of dita) { x.moveTo(0, -h); x.quadraticCurveTo(d[2], d[3], d[0], d[1]); }
    x.stroke();
  }
  x.fillStyle = sfuma(x, chiaro(col, .25), scuro(col, .2), -h - 9, -h + 9); x.beginPath(); ovale(x, 0, -h, 9, 8); x.fill();
}
/* Le figurine delle lamine: cinque misure per lato, già velate; le stesse, rimpicciolite, per le piante della fila di dietro. */
function figurineKelp() {
  const c = U.semi(4107), k = {};
  const MISURE = [[44, 10, .5, .2], [60, 12, .4, .28], [76, 13.5, .32, .34], [90, 15, .24, .4], [102, 16, .16, .44]];
  const una = (m, verso, i) => { const f = formaLamina(c, m[0], m[1], verso, m[2], m[3]); return ritaglio(f.x0, f.y0, f.x1, f.y1, x => dipingiLamina(x, f, i % 2 ? KELP.lamina2 : KELP.lamina), S, VELO_KELP); };
  k.dx = MISURE.map((m, i) => una(m, 1, i));
  k.sx = MISURE.map((m, i) => una(m, -1, i + 1));
  k.punta = ritaglio(-30, -58, 30, 8, x => germoglio(x, c, 40, KELP.lamina), S, VELO_KELP);
  const dietro = f => lontana(f, .74, .36, ACQUA);
  k.lontane = { dx: k.sx.map(dietro), sx: k.dx.map(dietro), punta: dietro(k.punta) };
  /* Con la visuale larga ogni lamina è piccola: una copia a metà risoluzione, copiata senza filtro, costa un quarto. */
  for (const f of [...k.dx, ...k.sx, k.punta, ...k.lontane.dx, ...k.lontane.sx, k.lontane.punta]) {
    const m = tela(Math.ceil(f.im.width / 2), Math.ceil(f.im.height / 2)), y = m.getContext('2d');
    y.imageSmoothingQuality = 'high'; y.drawImage(f.im, 0, 0, m.width, m.height); f.mezza = m;
  }
  return k;
}
/* La chioma che galleggia: fusti che si piegano lungo il pelo dell'acqua, lamine distese e pendenti, vescichette a galla e,
   sotto, la sua ombra. Origine al centro, sul pelo dell'acqua. */
function dipingiChioma(x, caso, larg) {
  const mezza = larg / 2 + 68;
  for (let i = 0; i < 3; i++) lucido(x, (caso() - .5) * larg * .5, 50 + caso() * 24, larg * (.3 + caso() * .14), 44 + caso() * 22, 0, .2, BOTT);
  x.strokeStyle = scuro(KELP.fusto, .12); x.lineWidth = 4.5; x.beginPath();
  for (let i = 0; i < 5; i++) { const verso = i % 2 ? 1 : -1, x0 = (caso() - .5) * 10, fine = verso * larg * (.18 + caso() * .26), y1 = 7 + caso() * 10; x.moveTo(x0, 58); x.bezierCurveTo(x0, 30, x0 + fine * .25, y1 + 5, x0 + fine, y1); }
  x.stroke();
  const metti = (px, py, rot, lun, lg, verso, sali, cadi, col) => {
    const spazio = mezza - 8 - verso * px;            // quanto posto c'è fino al bordo della tela
    x.save(); x.translate(px, py); x.rotate(rot); dipingiLamina(x, formaLamina(caso, Math.min(lun, spazio), lg, verso, sali, cadi), col); x.restore();
  };
  for (let i = 0; i < larg / 30; i++) { const px = (caso() + caso() - 1) * larg * .4, verso = caso() < .5 ? 1 : -1; metti(px, 10 + caso() * 12, verso * (.45 + caso() * .6), 46 + caso() * 40, 12 + caso() * 4, verso, .1, .3, scuro(KELP.lamina2, .24)); }     // quelle che pendono, dietro
  for (let i = 0; i < larg / 15; i++) { const px = (caso() + caso() - 1) * larg * .46, verso = (px > 0) === (caso() < .75) ? 1 : -1; metti(px, 5 + caso() * 11, verso * (caso() - .3) * .3, 54 + caso() * 58, 12 + caso() * 5, verso, .03, .1 + caso() * .16, caso() < .5 ? KELP.lamina : KELP.lamina2); }   // quelle distese
  x.fillStyle = sfuma(x, chiaro(KELP.bolla, .3), KELP.bolla, -5, 5); x.beginPath();
  const bolle = [];
  for (let i = 0; i < larg / 13; i++) { const px = (caso() + caso() - 1) * larg * .47, r = 3.4 + caso() * 2.6; bolle.push([px, -r * .2 + caso() * 3, r]); ovale(x, px, bolle[i][1], r * 1.2, r, 0); }
  x.fill();
  x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); for (const b of bolle) ovale(x, b[0] - b[2] * .3, b[1] - b[2] * .4, b[2] * .4, b[2] * .22, -.3); x.fill();
}
function chiome() {
  const c = U.semi(4209);
  return [250, 310, 370].map(larg => { const f = ritaglio(-larg / 2 - 68, -10, larg / 2 + 68, 118, x => dipingiChioma(x, c, larg), S, .16); f.larg = larg; return f; });
}

// ---------------------------------------------------------------- i pittori del fondale (origine nel piede, y verso l'alto negativo)
function alghetta(x, caso, tipo, r, col) {
  if (tipo === 0) {            // lattuga di mare: foglie larghe e arricciate
    const n = 4 + Math.floor(caso() * 3);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - .5, lun = r * (.7 + caso() * .4) * (1 - Math.abs(u) * .3);
      x.save(); x.rotate(u * 1.7 + (caso() - .5) * .2);
      x.fillStyle = sfuma(x, scuro(col, .4), chiaro(col, .08), 2, -lun);
      x.beginPath(); liscia(x, puntiMacchia(0, -lun * .52, lun * .3, lun * .54, caso, .2, 9)); x.fill();
      x.strokeStyle = alfa(chiaro(col, .4), .5); x.lineWidth = 1.8; x.stroke();
      x.strokeStyle = alfa(scuro(col, .5), .3); x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(lun * .06, -lun * .4, 0, -lun * .8); x.stroke();
      x.restore();
    }
  } else if (tipo === 1) {     // ciuffo di fili
    const n = 7 + Math.floor(caso() * 4);
    for (let pass = 0; pass < 2; pass++) {
      x.fillStyle = pass ? chiaro(col, .16) : scuro(col, .22); x.beginPath();
      for (let i = pass; i < n; i += 2) { const u = i / (n - 1) - .5, h = r * (.7 + caso() * .5), pg = u * r * 1.1 + (caso() - .5) * 8, bx = u * r * .5, w = 2.6 + caso() * 1.4; x.moveTo(bx - w, 3); x.quadraticCurveTo(bx + pg * .3 - w, -h * .55, bx + pg, -h); x.quadraticCurveTo(bx + pg * .3 + w, -h * .55, bx + w, 3); }
      x.fill();
    }
  } else {                     // quercina di mare: rametti a forcella con le palline in punta
    const rami = [], punte = [];
    const cresci = (x0, y0, ang, lun, sp, liv) => {
      const x1 = x0 + Math.cos(ang) * lun, y1 = y0 + Math.sin(ang) * lun; rami.push([x0, y0, x1, y1, sp]);
      if (liv <= 0) { punte.push([x1, y1]); return; }
      for (const d of [-1, 1]) cresci(x1, y1, ang + d * (.32 + caso() * .2), lun * (.62 + caso() * .16), sp * .8, liv - 1);
    };
    const steli = 2 + Math.floor(caso() * 2), oliva = mesc(col, KELP.oro, .45);
    for (let k = 0; k < steli; k++) cresci((k - (steli - 1) / 2) * 5, 3, -PI / 2 + (k - (steli - 1) / 2) * .5 + (caso() - .5) * .2, r * .42, 4.6, 2);
    x.strokeStyle = oliva; for (const q of rami) { x.lineWidth = q[4]; x.beginPath(); x.moveTo(q[0], q[1]); x.lineTo(q[2], q[3]); x.stroke(); }
    x.fillStyle = chiaro(oliva, .38); x.beginPath(); for (const q of punte) { x.moveTo(q[0] + 2.8, q[1]); x.arc(q[0], q[1], 2.8, 0, TAU); } x.fill();
  }
}
/* Stende il muschio tra un orlo di fuori e uno di dentro (punti nello stesso ordine), con l'ombra sotto l'orlo. */
function stendiMuschio(x, fuori, dentro, col, su, giu) {
  const orlo = fuori.concat(dentro.slice().reverse());
  x.save(); x.translate(0, 4); x.fillStyle = alfa(BOTT, .3); x.beginPath(); liscia(x, orlo); x.fill(); x.restore();
  x.fillStyle = sfuma(x, chiaro(col, .2), scuro(col, .34), su, giu); x.beginPath(); liscia(x, orlo); x.fill();
}
/* La coperta di muschio su una massa tonda (chi chiama ha già ritagliato la massa): spessa in cima, niente sotto. */
function coperta(x, caso, m, col, spesso = .5) {
  const fuori = [], dentro = [], N = 9;
  for (let i = 0; i <= N; i++) {
    const a = PI * (1.03 + i / N * .94), s = Math.pow(Math.sin(PI * i / N), .7) * spesso * (.7 + caso() * .6);
    fuori.push([m.cx + Math.cos(a) * m.rx * 1.12, m.cy + Math.sin(a) * m.ry * 1.12]);
    dentro.push([m.cx + Math.cos(a) * m.rx * (1 - s * .4), m.cy + Math.sin(a) * m.ry * (1 - s)]);
  }
  stendiMuschio(x, fuori, dentro, col, m.cy - m.ry, m.cy - m.ry * .1);
  x.fillStyle = alfa(chiaro(col, .5), .45); x.beginPath();
  for (let i = 0; i < 6; i++) { const a = PI * (1.2 + caso() * .6), k = .72 + caso() * .2, r = 1.4 + caso() * 2.2; ovale(x, m.cx + Math.cos(a) * m.rx * k, m.cy + Math.sin(a) * m.ry * k, r, r); }
  x.fill();
}
/* Un masso con la coperta di muschio (e, se si vuole, le alghe corte in cima). Restituisce i punti del profilo. */
function masso(x, caso, w, h, tono, verde = .6, ciuffi = true) {
  const p = cupola(w, h, caso, .15, 8), n = p.length - 1;
  tracciaCupola(x, p, 18);
  const g = x.createLinearGradient(0, -h, 0, 16); g.addColorStop(0, chiaro(tono, .2)); g.addColorStop(.45, tono); g.addColorStop(1, scuro(tono, .62));
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  lucido(x, w * .3, -h * .1, w * .45, h * .55, 0, .36, BOTT);
  x.strokeStyle = alfa(scuro(tono, .7), .22); x.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const cy = -h * (.1 + i * .17 + caso() * .08), f = caso() * TAU; x.beginPath(); for (let px = -w / 2; px <= w / 2 + 1; px += w / 8) x.lineTo(px, cy + Math.sin(px / w * 7 + f) * h * .06); x.stroke(); }
  lucido(x, -w * .2, -h * .3, w * .3, h * .2, -.2, .2);
  const col = MUSCHIO[Math.floor(caso() * MUSCHIO.length)], fuori = [], dentro = [];
  for (let i = 0; i <= n; i++) { const s = Math.pow(Math.sin(PI * i / n), .7) * (.24 + verde * .3) * (.7 + caso() * .6); fuori.push([p[i][0] * 1.1, p[i][1] * 1.1 - 3]); dentro.push([p[i][0] * (1 - s * .45), p[i][1] * (1 - s)]); }
  stendiMuschio(x, fuori, dentro, col, -h * 1.05, -h * .3);
  x.fillStyle = alfa(chiaro(col, .5), .5); x.beginPath();
  for (let i = 0; i < 12; i++) { const q = p[2 + Math.floor(caso() * (n - 3))], k = .7 + caso() * .24, r = 1.2 + caso() * 2; ovale(x, q[0] * k, q[1] * k, r, r); }
  x.fill();
  lucido(x, -w * .14, -h * .86, w * .3, h * .22, -.2, .3);
  x.restore();
  if (ciuffi && w > 110 && caso() < .5) { x.save(); x.translate((caso() - .5) * w * .5, -h * (.16 + caso() * .16)); stella(x, caso, 11 + caso() * 3, STELLE[Math.floor(caso() * STELLE.length)]); x.restore(); }
  if (ciuffi) for (let i = 2; i < p.length - 2; i++) if (caso() < .6) {
    const s = .34 + caso() * .3;
    x.save(); x.translate(p[i][0] * .86, p[i][1] * .8); x.rotate(p[i][0] / w * .9); x.scale(s, s);
    alghetta(x, caso, Math.floor(caso() * 3), 40, MUSCHIO[Math.floor(caso() * MUSCHIO.length)]); x.restore();
  }
  return p;
}
function colonnaAnemone(x, w, col) {
  const h = w * .5, g = x.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, chiaro(col, .25)); g.addColorStop(.45, col); g.addColorStop(1, scuro(col, .45));
  x.fillStyle = g; x.beginPath(); x.moveTo(-w * .42, 10); x.bezierCurveTo(-w * .6, -h * .2, -w * .56, -h * .8, -w * .42, -h); x.lineTo(w * .42, -h); x.bezierCurveTo(w * .56, -h * .8, w * .6, -h * .2, w * .42, 10); x.closePath(); x.fill();
  x.save(); x.clip(); x.strokeStyle = alfa(chiaro(col, .5), .22); x.lineWidth = 2;
  for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(i * w * .12, 8); x.quadraticCurveTo(i * w * .17, -h * .5, i * w * .12, -h); x.stroke(); }
  lucido(x, -w * .22, -h * .55, w * .16, h * .4, 0, .3);
  x.restore();
  x.fillStyle = scuro(col, .2); x.beginPath(); ovale(x, 0, -h, w * .43, w * .1); x.fill();
}
/* Stella marina paffuta, a punte tonde. */
function stella(x, caso, r, col) {
  const rot = caso() * TAU, p = [], ombra = [];
  for (let i = 0; i < 10; i++) { const a = rot + i * PI / 5, rr = i % 2 ? r * .42 : r * (.92 + caso() * .14); p.push([Math.cos(a) * rr, Math.sin(a) * rr * .9]); ombra.push([p[i][0] + 1.5, p[i][1] + 3]); }
  x.fillStyle = alfa(BOTT, .26); x.beginPath(); liscia(x, ombra); x.fill();
  const g = x.createRadialGradient(-r * .2, -r * .25, 0, 0, 0, r * 1.1); g.addColorStop(0, chiaro(col, .3)); g.addColorStop(1, scuro(col, .16));
  x.fillStyle = g; x.beginPath(); liscia(x, p); x.fill();
  x.fillStyle = alfa(chiaro(col, .55), .8); x.beginPath();
  for (let i = 0; i < 5; i++) for (const k of [.24, .46, .66]) { const a = rot + i * TAU / 5, px = Math.cos(a) * r * k, py = Math.sin(a) * r * k * .9, q = r * .07 * (1.25 - k * .6); x.moveTo(px + q, py); x.arc(px, py, q, 0, TAU); }
  x.fill();
}
/* Conchiglia d'abalone: a orecchio, con la fila di forellini; rovesciata mostra la madreperla. */
function abalone(x, caso, r, col, aperta) {
  x.fillStyle = alfa(BOTT, .24); x.beginPath(); ovale(x, 1, r * .36, r * 1.02, r * .3); x.fill();
  x.save(); x.rotate((caso() - .5) * .5);
  const orlo = [[-r, -r * .2], [-r * .72, -r * .66], [-r * .1, -r * .84], [r * .6, -r * .7], [r, -r * .22], [r * .78, r * .2], [r * .1, r * .34], [-r * .68, r * .22]];
  if (aperta) {
    x.fillStyle = scuro(col, .1); x.beginPath(); liscia(x, orlo); x.fill();
    x.save(); x.clip();
    const g = x.createLinearGradient(-r, -r * .7, r, r * .3); g.addColorStop(0, '#c9eadc'); g.addColorStop(.5, '#e9dcea'); g.addColorStop(1, '#bcdcea');
    x.fillStyle = g; x.beginPath(); ovale(x, 0, -r * .2, r * .84, r * .5, -.05); x.fill();
    lucido(x, -r * .3, -r * .42, r * .5, r * .22, -.2, .6);
    x.restore();
  } else {
    const g = x.createRadialGradient(-r * .3, -r * .55, 0, 0, -r * .2, r * 1.15); g.addColorStop(0, chiaro(col, .4)); g.addColorStop(1, scuro(col, .22));
    x.fillStyle = g; x.beginPath(); liscia(x, orlo); x.fill();
    x.save(); x.clip();
    x.strokeStyle = alfa(scuro(col, .5), .32); x.lineWidth = 1.6;
    for (let k = 1; k <= 4; k++) { x.beginPath(); x.ellipse(-r * .46, -r * .12, r * .34 * k, r * .22 * k, -.1, -PI * .7, PI * .45); x.stroke(); }
    x.restore();
    x.fillStyle = alfa(scuro(col, .6), .6); x.beginPath();
    for (let i = 0; i < 5; i++) { const a = -PI * .78 + i * .3, px = Math.cos(a) * r * .74 + r * .06, py = Math.sin(a) * r * .56 - r * .16; x.moveTo(px + 1.5, py); x.arc(px, py, 1.5, 0, TAU); }
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); ovale(x, -r * .3, -r * .5, r * .28, r * .08, -.25); x.fill();
  }
  x.restore();
}
function sasso(x, caso, w, tono) {
  x.fillStyle = alfa(BOTT, .22); x.beginPath(); ovale(x, 1, 3, w * .56, w * .2); x.fill();
  x.fillStyle = sfuma(x, chiaro(tono, .32), scuro(tono, .3), -w * .45, w * .2); x.beginPath(); macchia(x, 0, -w * .12, w * .5, w * .3, caso, .14, 8); x.fill();
  x.fillStyle = 'rgba(255,255,255,.26)'; x.beginPath(); ovale(x, -w * .14, -w * .26, w * .18, w * .06, -.2); x.fill();
}

function figurineFondale() {
  const c = U.semi(3107), t = {};
  // gli scogli a cui si aggrappa il kelp: `cima` dice quanto sopra il piede parte il fusto
  t.scoglio = [[150, 70, PIETRA[0]], [190, 92, PIETRA[1]], [128, 58, PIETRA[2]]].map(([w, h, tono]) => {
    let cima = 0;
    const f = figurina(w + 30, h + 62, 18, x => { const p = masso(x, c, w, h, tono, .7, false), su = -p[4][1] * .86; x.translate(0, -su); appiglio(x, c, 58, KELP.fusto); cima = su + 58 * .42; });
    f.cima = cima; return f;
  });
  t.masso = [[168, 84, PIETRA[0]], [226, 106, PIETRA[1]], [126, 70, PIETRA[2]], [92, 46, PIETRA[0]]].map(([w, h, tono]) => figurina(w + 40, h + 58, 18, x => masso(x, c, w, h, tono, .5 + c() * .4)));
  t.alga = [
    figurina(92, 62, 8, x => alghetta(x, c, 0, 46, MUSCHIO[1])),
    figurina(100, 70, 8, x => alghetta(x, c, 0, 52, MUSCHIO[3])),
    figurina(96, 64, 8, x => alghetta(x, c, 2, 62, MUSCHIO[1])),
    figurina(110, 76, 8, x => alghetta(x, c, 2, 74, MUSCHIO[0])),
    figurina(120, 96, 8, x => germoglio(x, c, 70, KELP.lamina)),
    figurina(108, 84, 8, x => germoglio(x, c, 60, KELP.lamina2)),
  ];
  t.anemone = [['#4f9a70', '#8fd39a', '#e9f8cf'], ['#c9814f', '#f0b072', '#fff0d2'], ['#5aa184', '#a9dcb0', '#f2fbe0']].map((col, i) => {
    const w = 46 + i * 7, f = figurina(w + 10, Math.round(w * .5) + 22, 12, x => colonnaAnemone(x, w, col[0]));
    f.anemone = { larg: w, alto: w * .5, tentacolo: col[1], punta: col[2] };
    return f;
  });
  for (const tipo of ['scoglio', 'masso', 'alga']) for (const f of t[tipo]) f.lontana = lontana(f);
  // cose appoggiate sulla ghiaia
  t.stella = STELLE.map((col, i) => figurina(54, 54, 27, x => stella(x, c, 16 + i * 1.5, col)));
  t.abalone = [['#a98f84', false], ['#8f9a8c', false], ['#a99a8f', true]].map(([col, aperta]) => figurina(52, 44, 18, x => abalone(x, c, 19, col, aperta)));
  t.sasso = [['#94a596', 34], ['#b3b79c', 26], ['#83988c', 20]].map(([col, w]) => figurina(44, 30, 10, x => sasso(x, c, w, col)));
  return t;
}

// ---------------------------------------------------------------- la ghiaia
const GHI = ['#cdd3a2', '#a9b587', '#7d8f6f'];   // in cima, sotto la cresta, in profondità
const SASSI = ['#8fa192', '#b7c1a6', '#6d8378', '#bda98a', '#9aae8c'];

/* Chiazze, sassolini e granelli su una striscia larga 512 unità che si ripete. */
function granaGhiaia(x, caso, alt, forza, fitta = 1) {
  const P = 512, GIRI = [-P, 0, P];
  for (let i = 0; i < 4 + alt / 26; i++) {
    const cx = caso() * P, cy = caso() * alt, rx = 36 + caso() * 80, ry = 7 + caso() * 15, luce = caso() < .45;
    for (const ox of GIRI) lucido(x, cx + ox, cy, rx, ry, 0, (luce ? .3 : .24) * forza, luce ? '#f4f8d6' : '#557a5c');
  }
  const sassi = [];
  for (let i = 0; i < alt * 1.1 * fitta; i++) { const u = caso(); sassi.push([caso() * P, caso() * alt, 1.8 + u * u * 7.5, .55 + caso() * .35, (caso() - .5) * 1.2, Math.floor(caso() * SASSI.length)]); }
  const giro = (stile, dx, dy, kx, ky, quale) => {
    x.fillStyle = stile; x.beginPath();
    for (const s of sassi) if (quale === undefined || s[5] === quale) for (const ox of GIRI) ovale(x, s[0] + ox + dx * s[2], s[1] + dy * s[2], s[2] * kx, s[2] * s[3] * ky, s[4]);
    x.fill();
  };
  giro(alfa(BOTT, (.22 * forza).toFixed(3)), .15, .3, 1.05, 1.05);
  for (let k = 0; k < SASSI.length; k++) giro(alfa(SASSI[k], (.8 * forza).toFixed(3)), 0, 0, 1, 1, k);
  giro('rgba(255,255,240,' + (.3 * forza).toFixed(3) + ')', -.2, -.25, .5, .4);
  x.fillStyle = 'rgba(70,104,84,' + (.3 * forza).toFixed(3) + ')'; x.beginPath();
  for (let i = 0; i < alt * 2; i++) { const px = caso() * P, py = caso() * alt, q = .5 + caso() * .8; x.moveTo(px + q, py); x.arc(px, py, q, 0, TAU); }
  x.fill();
}
/* Cresta della ghiaia davanti: 512×128 unità, da 44 sopra il fondale a 84 sotto. Due pezzi che si alternano. */
function crestaGhiaia(indice) {
  const im = tela(1024, 256), x = penna(im), su = 44, linea = px => su + duna(indice * 512 + px), caso = U.semi(510 + indice);
  x.scale(S, S);
  for (let i = 0; i < 22; i++) {      // sassi che sporgono dal profilo (lontani dai bordi: i due pezzi si alternano)
    const px = 16 + caso() * 480, r = 4 + caso() * caso() * 11, py = linea(px) + r * .2, tono = SASSI[Math.floor(caso() * SASSI.length)];
    x.fillStyle = sfuma(x, chiaro(tono, .3), scuro(tono, .25), py - r * .7, py + r * .7); x.beginPath(); ovale(x, px, py, r, r * (.6 + caso() * .2), (caso() - .5) * .5); x.fill();
  }
  x.save(); x.beginPath(); x.moveTo(-6, 134); for (let px = -6; px <= 518; px += 4) x.lineTo(px, linea(px)); x.lineTo(518, 134); x.closePath(); x.clip();
  x.fillStyle = sfuma(x, GHI[0], GHI[1], 40, 128); x.fillRect(0, 0, 512, 128);
  x.translate(0, 34); granaGhiaia(x, U.semi(520 + indice), 94, 1); x.translate(0, -34);
  x.fillStyle = sfuma(x, alfa(GHI[1], 0), GHI[1], 106, 128); x.fillRect(0, 100, 512, 28);
  x.restore();
  x.strokeStyle = 'rgba(240,248,214,.7)'; x.lineWidth = 2.4; x.beginPath(); for (let px = -6; px <= 518; px += 4) x.lineTo(px, linea(px) + 1.5); x.stroke();
  return im;
}
/* Il corpo della ghiaia sotto la cresta: 512×256 unità, sfuma nel colore pieno di sotto. */
function corpoGhiaia() {
  const im = tela(1024, 512), x = penna(im);
  x.scale(S, S);
  x.fillStyle = sfuma(x, GHI[1], GHI[2], 0, 256); x.fillRect(0, 0, 512, 256);
  granaGhiaia(x, U.semi(530), 250, .8, .8);
  x.fillStyle = sfuma(x, GHI[1], alfa(GHI[1], 0), 0, 22); x.fillRect(0, 0, 512, 24);
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = sfuma(x, 'rgba(0,0,0,0)', 'rgba(0,0,0,1)', 150, 252); x.fillRect(0, 150, 512, 106);
  return im;
}
/* La ghiaia profonda, vista in sezione: strati, sassi sepolti. 512×512 unità a 1 pixel per unità, ripetibile nei due versi. */
function ghiaiaProfonda() {
  const P = 512, im = tela(P, P), x = penna(im), caso = U.semi(540);
  x.fillStyle = GHI[2]; x.fillRect(0, 0, P, P);
  for (let i = 0; i < 9; i++) {
    const yy = (i + caso() * .7) / 9 * P, sp = 10 + caso() * 22, f1 = caso() * TAU, f2 = caso() * TAU, amp = 6 + caso() * 10;
    x.fillStyle = caso() < .5 ? 'rgba(226,236,196,.16)' : 'rgba(40,84,70,.16)';
    for (const oy of [-P, 0, P]) {
      x.beginPath();
      for (let px = 0; px <= P; px += 16) x.lineTo(px, oy + yy + amp * Math.sin(px * TAU / P * 2 + f1) + amp * .4 * Math.sin(px * TAU / P * 5 + f2));
      for (let px = P; px >= 0; px -= 16) x.lineTo(px, oy + yy + sp + amp * Math.sin(px * TAU / P * 2 + f1 + .5) + amp * .4 * Math.sin(px * TAU / P * 3 + f2));
      x.closePath(); x.fill();
    }
  }
  for (let i = 0; i < 44; i++) {
    const cx = caso() * P, cy = caso() * P, r = 5 + caso() * 14, col = SASSI[Math.floor(caso() * SASSI.length)], pts = puntiMacchia(0, 0, r, r * (.5 + caso() * .3), caso, .2, 7), rot = caso() * PI;
    for (const ox of [-P, 0, P]) for (const oy of [-P, 0, P]) { x.save(); x.translate(cx + ox, cy + oy); x.rotate(rot); x.fillStyle = alfa(col, .5); x.beginPath(); liscia(x, pts); x.fill(); x.restore(); }
  }
  return im;
}
/* La dorsale di roccia muschiosa dietro alla prima fila: 512×128 unità, da 88 sopra il fondale a 40 sotto; già velata. */
function dorsaleRoccia() {
  const im = tela(1024, 256), x = penna(im), su = 88, caso = U.semi(550), c0 = scuro(MUSCHIO[2], .3), c1 = scuro(PIETRA[2], .5);
  const linea = px => su + dorsale(px);
  x.scale(S, S);
  for (let i = 0; i < 7; i++) {      // sassi muschiosi lungo la cresta (lontani dai bordi: la tela si ripete)
    const px = 44 + (i + caso() * .7) / 7 * 430, w = 46 + caso() * 50, h = 16 + caso() * 16;
    x.save(); x.translate(px, linea(px) + 9); masso(x, caso, w, h, PIETRA[i % 3], .6 + caso() * .4, caso() < .5); x.restore();
  }
  x.save(); x.beginPath(); x.moveTo(-6, 132); for (let px = -6; px <= 518; px += 3) x.lineTo(px, linea(px)); x.lineTo(518, 132); x.closePath(); x.clip();
  x.fillStyle = sfuma(x, c0, c1, 42, 98); x.fillRect(0, 0, 512, 128);
  x.translate(0, 50); granaGhiaia(x, U.semi(551), 78, .35, .5); x.translate(0, -50);
  x.restore();
  x.strokeStyle = alfa(chiaro(MUSCHIO[1], .1), .7); x.lineWidth = 3; x.beginPath(); for (let px = -6; px <= 518; px += 3) x.lineTo(px, linea(px) + 1.6); x.stroke();
  vela(im, FONDA, .3);
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
    const vivo = .5 + .5 * Math.sin(xx / n * TAU * 2 + 2.6 * Math.sin(y / n * TAU + 1)) * Math.sin(y / n * TAU * 3 + 1.7 * Math.sin(xx / n * TAU));
    let a = 1 - (d2 - d1) / (lato * (.1 + .16 * vivo)); a = a < 0 ? 0 : a * a * (3 - 2 * a) * (.25 + .75 * vivo);
    const o = (y * n + xx) * 4; d[o] = 244; d[o + 1] = 255; d[o + 2] = 214; d[o + 3] = Math.round(255 * forza * a);
  }
  x.putImageData(dati, 0, 0);
  const im = tela(512, 512), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, 512, 512);
  if (bordi) {
    y.globalCompositeOperation = 'destination-in';
    const g = y.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.3, 'rgba(0,0,0,1)'); g.addColorStop(.62, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    y.fillStyle = g; y.fillRect(0, 0, 512, 512);
  }
  return im;
}

// ---------------------------------------------------------------- i piani lontani (sfondo): sagome sfumate su tele ripetute
/* Maschera bianca a bassa risoluzione (bordi morbidi), colorata con una sfumatura e ingrandita. Chi disegna usa px CSS
   (a zoom 1); la tela finale ha `dens` pixel per px CSS, la maschera un pixel ogni `ridu` pixel finali. */
function striscia(larg, alt, dens, ridu, maschera, colori, sopra) {
  const W = larg * dens, A = alt * dens, pw = Math.ceil(W / ridu), ph = Math.ceil(A / ridu), m = U.tela(pw, ph), x = penna(m);
  x.scale(pw / larg, ph / alt); x.fillStyle = x.strokeStyle = '#fff';
  for (const ox of [-larg, 0, larg]) { x.save(); x.translate(ox, 0); maschera(x); x.restore(); }
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = sfuma(x, colori.su, colori.giu, colori.y0, colori.y1); x.fillRect(0, 0, larg, alt);
  x.globalCompositeOperation = 'source-atop';
  if (sopra) for (const ox of [-larg, 0, larg]) { x.save(); x.translate(ox, 0); sopra(x); x.restore(); }
  const im = tela(W, A), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, W, A);
  return im;
}
/* Tronchi di kelp con le loro lamine, su una tela 512×T che si ripete anche in verticale. */
function tronchiLontani(seme, cfg) {
  const caso = U.semi(seme), tra = (a, b) => a + caso() * (b - a), L = 512, T = cfg.T, tr = [];
  for (let j = 0; j < cfg.n; j++) tr.push({ x: (j + tra(.18, .82)) / cfg.n * L, a1: tra(.5, 1) * cfg.onda, f1: tra(0, TAU), a2: tra(.2, .5) * cfg.onda, f2: tra(0, TAU), m: 2 * Math.round(cfg.fronde * tra(.85, 1.15) / 2), sp: cfg.fusto * tra(.8, 1.2), lun: tra(cfg.lun[0], cfg.lun[1]), seme: Math.floor(tra(0, 1e6)), fy: tra(0, 1) });
  const sx = (t, y) => t.x + t.a1 * Math.sin(y * TAU / T + t.f1) + t.a2 * Math.sin(y * TAU / T * 2 + t.f2);
  const fusti = x => { for (const t of tr) { x.lineWidth = t.sp; x.beginPath(); for (let y = -16; y <= T + 16; y += 16) x.lineTo(sx(t, y), y); x.stroke(); } };
  const fronde = (x, mezza) => {
    x.beginPath();
    for (const t of tr) for (let i = -2; i <= t.m + 2; i++) {
      const q = ((i % t.m) + t.m) % t.m, y = (i + t.fy) / t.m * T, lato = ((q & 1) === 1) !== (rumore(q, t.seme + 2) < .22) ? 1 : -1, bx = sx(t, y);
      const lun = t.lun * (.55 + .8 * rumore(q, t.seme)), sali = .08 + .42 * rumore(q, t.seme + 1), larg = lun * .2;
      const tx = bx + lato * lun, ty = y + lun * (.3 - sali), mx = bx + lato * lun * .5, my = y - lun * (sali + .2);
      x.moveTo(bx, y); x.quadraticCurveTo(mx, my - larg, tx, ty); x.quadraticCurveTo(mx, my + (mezza ? -larg * .1 : larg), bx, y + (mezza ? 0 : 2));
    }
    x.fill();
  };
  return striscia(L, T, cfg.dens, cfg.ridu, x => { fusti(x); fronde(x, false); }, { y0: 0, y1: T, su: cfg.colore, giu: cfg.colore }, cfg.luce ? x => { x.fillStyle = cfg.luce; fronde(x, true); } : null);
}
/* Il suolo di un piano lontano: una cresta a gobbe con masse irregolari di roccia e ciuffi d'alghe, a colore pieno. */
function suoloLontano(seme, cfg) {
  const L = 512, A = cfg.alt, caso = U.semi(seme), tra = (a, b) => a + caso() * (b - a), k1 = TAU / L, f = [tra(0, TAU), tra(0, TAU), tra(0, TAU)];
  const cresta = px => cfg.base - cfg.amp * Math.sin(px * k1 + f[0]) - cfg.amp * .6 * Math.abs(Math.sin(px * k1 * 1.5 + f[1])) - cfg.amp * .3 * Math.sin(px * k1 * 4 + f[2]);
  const masse = [], ciuffi = [];
  for (let i = 0; i < cfg.masse; i++) { const bx = (i + tra(.1, .9)) / cfg.masse * L, rx = tra(cfg.raggi[0], cfg.raggi[1]), ry = rx * tra(.5, .9), cy = cresta(bx) + ry * .25; masse.push({ cx: bx, cy, rx, ry, p: puntiMacchia(bx, cy, rx, ry, caso, .2, 9) }); }
  for (let i = 0; i < cfg.ciuffi; i++) { const bx = tra(0, L), n = 3 + Math.floor(caso() * 3), foglie = []; for (let j = 0; j < n; j++) foglie.push([(j / (n - 1) - .5) * 1.5 + tra(-.15, .15), tra(cfg.erba[0], cfg.erba[1])]); ciuffi.push({ bx, by: cresta(bx) - 3, foglie }); }
  return striscia(L, A, cfg.dens, cfg.ridu, x => {
    x.beginPath(); x.moveTo(0, A + 4); for (let px = 0; px <= L; px += 8) x.lineTo(px, cresta(px)); x.lineTo(L, A + 4); x.closePath(); x.fill();
    x.beginPath(); for (const m of masse) liscia(x, m.p); x.fill();
    x.beginPath();
    for (const c of ciuffi) for (const fg of c.foglie) { const tx = c.bx + Math.sin(fg[0]) * fg[1], ty = c.by - Math.cos(fg[0]) * fg[1], w = fg[1] * .13 + 1.5, mx = (c.bx + tx) / 2 + Math.sin(fg[0]) * 3, my = (c.by + ty) / 2; x.moveTo(c.bx - w, c.by + 6); x.quadraticCurveTo(mx - w, my, tx, ty); x.quadraticCurveTo(mx + w, my, c.bx + w, c.by + 6); }
    x.fill();
  }, cfg.colori, x => { for (const m of masse) lucido(x, m.cx - m.rx * .2, m.cy - m.ry * .6, m.rx * .9, m.ry * .6, 0, cfg.luce, '#bfe6a8'); });
}
function pianiLontani() {
  return [
    { tronchi: tronchiLontani(21, { T: 512, dens: 1, ridu: 4, n: 6, onda: 12, fusto: 1.8, lun: [18, 30], fronde: 28, colore: 'rgba(9,78,70,.27)' }), T: 512, dondolo: 0,
      suolo: suoloLontano(31, { alt: 224, dens: 1, ridu: 3, base: 150, amp: 20, masse: 4, raggi: [34, 70], ciuffi: 10, erba: [14, 30], luce: .12, colori: { y0: 70, y1: 224, su: '#1c8170', giu: '#14695c' } }),
      alt: 224, base: 150, rialzo: 30, fondo: '#14695c', par: .16, pary: .25, zoom: .3, fase: 0 },
    { tronchi: tronchiLontani(22, { T: 512, dens: 2, ridu: 5, n: 5, onda: 16, fusto: 2.6, lun: [30, 46], fronde: 20, colore: 'rgba(8,70,64,.4)' }), T: 512, dondolo: 4,
      suolo: suoloLontano(32, { alt: 224, dens: 1, ridu: 2, base: 146, amp: 26, masse: 4, raggi: [40, 84], ciuffi: 9, erba: [20, 40], luce: .14, colori: { y0: 60, y1: 224, su: '#177464', giu: '#0e5a50' } }),
      alt: 224, base: 146, rialzo: 22, fondo: '#0e5a50', par: .36, pary: .5, zoom: .5, fase: 300, lusso: true },
    { tronchi: tronchiLontani(23, { T: 512, dens: 2, ridu: 3.6, n: 3, onda: 20, fusto: 4.2, lun: [48, 72], fronde: 12, colore: 'rgba(7,62,58,.5)', luce: 'rgba(150,214,150,.22)' }), T: 512, dondolo: 4,
      suolo: suoloLontano(33, { alt: 224, dens: 2, ridu: 2.5, base: 140, amp: 30, masse: 3, raggi: [50, 96], ciuffi: 8, erba: [26, 52], luce: .16, colori: { y0: 50, y1: 224, su: '#126659', giu: '#0a4a43' } }),
      alt: 224, base: 140, rialzo: 14, fondo: '#0a4a43', par: .6, pary: .8, zoom: .72, fase: 620 },
  ];
}
/* La chioma lontana: masse scure e lamine che pendono da sotto il pelo dell'acqua. 512×128 px CSS, ripetuta. */
function chiomaLontana() {
  const caso = U.semi(55), L = 512, A = 128, masse = [], lamine = [];
  for (let i = 0; i < 9; i++) masse.push(puntiMacchia((i + caso()) / 9 * L, 0, 30 + caso() * 46, 14 + caso() * 26, caso, .25, 9));
  for (let i = 0; i < 30; i++) lamine.push([caso() * L, 22 + caso() * 60, (caso() - .5) * 34]);
  return striscia(L, A, 1, 3, x => {
    x.beginPath(); for (const m of masse) liscia(x, m); x.fill();
    x.beginPath(); for (const l of lamine) { x.moveTo(l[0] - 5, 0); x.quadraticCurveTo(l[0] + l[2] * .4 - 5, l[1] * .6, l[0] + l[2], l[1]); x.quadraticCurveTo(l[0] + l[2] * .4 + 6, l[1] * .5, l[0] + 5, 0); } x.fill();
  }, { y0: 0, y1: A, su: 'rgba(14,98,82,.6)', giu: 'rgba(14,98,82,.3)' });
}

// ---------------------------------------------------------------- grandi massi e arco di roccia (dietro a tutto, 1 pixel per unità, velati)
const TINTE_DECORO = ['#6ea45c', '#8ab868', '#559068', '#9cc072', '#7a9a40'];
function decoro(x, caso, tipo, col) {
  if (tipo === 0) alghetta(x, caso, 0, 42, col);
  else if (tipo === 1) alghetta(x, caso, 1, 46, col);
  else if (tipo === 2) alghetta(x, caso, 2, 44, col);
  else germoglio(x, caso, tipo === 3 ? 74 : 54, KELP.lamina);
}
function formazione(w, h, seme, costruisci) {
  return figurina(w, h, 34, x => {
    const caso = U.semi(seme), pezzi = [], masse = [];
    costruisci((cx, cy, rx, ry) => { const m = { cx, cy, rx, ry, p: puntiMacchia(cx, cy, rx, ry, caso, .13, 10) }; pezzi.push(m); masse.push(m); }, (x0, y0, mx, my, x1, y1, sp) => pezzi.push({ ponte: [x0, y0, mx, my, x1, y1, sp] }), caso);
    for (const m of pezzi) {
      const tono = PIETRA[Math.floor(caso() * PIETRA.length)], col = MUSCHIO[Math.floor(caso() * MUSCHIO.length)];
      if (m.ponte) {      // il ponte dell'arco: roccia scura sotto, chiara sopra, e il muschio sulla schiena
        const p = m.ponte, sp = p[6], arco = (dy, largo, stile) => { x.strokeStyle = stile; x.lineWidth = largo; x.beginPath(); x.moveTo(p[0], p[1] + dy); x.quadraticCurveTo(p[2], p[3] + dy, p[4], p[5] + dy); x.stroke(); };
        arco(0, sp, scuro(tono, .5)); arco(-sp * .14, sp * .72, tono); arco(-sp * .3, sp * .42, scuro(col, .1)); arco(-sp * .4, sp * .2, chiaro(col, .16));
        continue;
      }
      x.globalCompositeOperation = 'source-atop'; x.strokeStyle = alfa(BOTT, .18); x.lineWidth = 26; x.beginPath(); liscia(x, m.p); x.stroke();     // l'ombra che fa sui sassi di sotto
      x.globalCompositeOperation = 'source-over';
      x.save(); x.beginPath(); liscia(x, m.p); x.clip();
      const g = x.createLinearGradient(0, m.cy - m.ry, 0, m.cy + m.ry); g.addColorStop(0, chiaro(tono, .18)); g.addColorStop(.5, tono); g.addColorStop(1, scuro(tono, .62));
      x.fillStyle = g; x.fillRect(m.cx - m.rx * 1.3, m.cy - m.ry * 1.3, m.rx * 2.6, m.ry * 2.6);
      x.strokeStyle = alfa(scuro(tono, .7), .2); x.lineWidth = 2.4;
      for (let i = 0; i < 2; i++) { const yy = m.cy + m.ry * (-.1 + i * .4 + caso() * .2), f = caso() * TAU; x.beginPath(); for (let px = m.cx - m.rx * 1.2; px <= m.cx + m.rx * 1.2; px += m.rx * .3) x.lineTo(px, yy + 6 * Math.sin(px / 60 + f)); x.stroke(); }
      lucido(x, m.cx + m.rx * .3, m.cy + m.ry * .5, m.rx * .9, m.ry * .6, 0, .36, BOTT);
      coperta(x, caso, m, col, .42 + caso() * .2);
      lucido(x, m.cx - m.rx * .25, m.cy - m.ry * .62, m.rx * .7, m.ry * .36, 0, .24);
      x.restore();
    }
    for (const m of pezzi) if (m.ponte) for (let i = 0; i < 9; i++) {              // alghe che pendono sotto il ponte
      const p = m.ponte, u = .14 + i / 8 * .72, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u, px = a * p[0] + b * p[2] + d * p[4], py = a * p[1] + b * p[3] + d * p[5] + p[6] * .46, lun = 26 + caso() * 46;
      x.fillStyle = scuro(MUSCHIO[Math.floor(caso() * 3)], .2); x.beginPath(); x.moveTo(px - 5, py - 6); x.quadraticCurveTo(px - 4, py + lun * .6, px + (caso() - .5) * 12, py + lun); x.quadraticCurveTo(px + 6, py + lun * .5, px + 5, py - 6); x.fill();
    }
    const cose = [];
    for (const m of masse) for (let i = 0, n = 1 + Math.floor(caso() * 2.4); i < n; i++) { const a = PI + .3 + caso() * (PI - .6); cose.push({ x: m.cx + Math.cos(a) * m.rx * .9, y: m.cy + Math.sin(a) * m.ry * .9, rot: (a - PI * 1.5) * .7, s: .5 + caso() * .4, tipo: Math.floor(caso() * 5), col: TINTE_DECORO[Math.floor(caso() * TINTE_DECORO.length)] }); }
    cose.sort((a, b) => a.y - b.y);
    for (const o of cose) { x.save(); x.translate(o.x, o.y); x.rotate(o.rot); x.scale(o.s, o.s); decoro(x, caso, o.tipo, o.col); x.restore(); }
    for (let i = 0; i < 3; i++) { const m = masse[Math.floor(caso() * masse.length)]; x.save(); x.translate(m.cx + (caso() - .5) * m.rx, m.cy + caso() * m.ry * .4); stella(x, caso, 15, STELLE[Math.floor(caso() * STELLE.length)]); x.restore(); }
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = alfa(FONDA, .46); x.fillRect(-w / 2, -h, w, h + 40);
    x.fillStyle = sfuma(x, 'rgba(226,255,214,.12)', 'rgba(226,255,214,0)', -h + 34, -h * .45); x.fillRect(-w / 2, -h, w, h * .6);
    x.globalCompositeOperation = 'source-over';
  }, 1, 0);
}
function colonna(massa, caso, cx, alt, r0, r1, passo = 74) {
  for (let y = 0; y <= alt; y += passo) { const u = y / alt; massa(cx + Math.sin(u * 5 + cx) * 20 * u, -y, (r0 + (r1 - r0) * u) * (.86 + caso() * .28), 54 + caso() * 20); }
}
function grandiMassi() {
  return [
    formazione(640, 500, 61, (massa, ponte, caso) => { massa(-204, 0, 124, 50); massa(200, 0, 130, 52); colonna(massa, caso, -204, 240, 98, 72); colonna(massa, caso, 200, 214, 104, 78); ponte(-200, -262, 0, -462, 194, -244, 96); massa(-36, -368, 108, 44); massa(92, -334, 82, 38); }),   // l'arco
    formazione(460, 340, 62, (massa, ponte, caso) => { massa(0, 0, 204, 56); massa(0, -108, 178, 118); massa(-112, -60, 98, 84); massa(120, -66, 94, 80); massa(-20, -206, 108, 70); }),
    formazione(400, 430, 63, (massa, ponte, caso) => { massa(0, 0, 172, 52); colonna(massa, caso, -20, 290, 122, 64); massa(98, -70, 86, 70); }),
    formazione(540, 270, 64, (massa, ponte, caso) => { massa(0, 0, 244, 54); massa(-112, -80, 122, 88); massa(40, -98, 152, 100); massa(174, -56, 86, 70); }),
  ];
}

// ---------------------------------------------------------------- le pareti di roccia muschiosa ai lati (1 pixel per unità)
const PARETE_SU = '#5a8f7a', PARETE_GIU = '#27584e', VELO_PARETE = .16, ALT_PARETE = 3264;
const PARETE_SU_VELATA = mesc(PARETE_SU, ACQUA, VELO_PARETE), PARETE_GIU_VELATA = mesc(PARETE_GIU, ACQUA, VELO_PARETE);
function pareti() {
  const caso = U.semi(808), L = PARETE_L, tele = [], masse = [], cose = [];
  for (let y = -70, ry = 0; y < ALT_PARETE + 70; y += ry * (.8 + caso() * .9)) { const grande = caso() < .3, rx = grande ? 70 + caso() * 30 : 34 + caso() * 30, cx = Math.min(-rx - 2, ciglio(y) - rx * (.84 + caso() * .34)); ry = grande ? 54 + caso() * 30 : 28 + caso() * 26; masse.push({ cx, cy: y, rx, ry, p: puntiMacchia(cx, y, rx, ry, caso, .12, 10), col: MUSCHIO[Math.floor(caso() * MUSCHIO.length)], verde: .3 + caso() * .35, seme: Math.floor(caso() * 1e6) }); }
  for (const m of masse) if (caso() < .6) { const a = -1.25 + caso() * 1.1; cose.push({ x: m.cx + Math.cos(a) * m.rx * .92, y: m.cy + Math.sin(a) * m.ry * .92, rot: (a + PI / 2) * .8, s: .45 + caso() * .35, tipo: Math.floor(caso() * 5), col: TINTE_DECORO[Math.floor(caso() * TINTE_DECORO.length)], seme: Math.floor(caso() * 1e6) }); }
  for (let k = 0; k * 1024 < ALT_PARETE; k++) {
    const alt = Math.min(1024, ALT_PARETE - k * 1024), im = tela(L, alt), x = penna(im), y0 = k * 1024, y1 = y0 + alt, vicine = masse.filter(m => m.cy > y0 - 130 && m.cy < y1 + 130);
    x.translate(L, -y0);
    x.fillStyle = sfuma(x, scuro(PARETE_SU, .2), scuro(PARETE_GIU, .2), 0, ALT_PARETE);      // la lastra di fondo, tra una cengia e l'altra
    x.beginPath(); x.moveTo(-L - 2, y0 - 6); for (let y = y0 - 6; y <= y1 + 6; y += 6) x.lineTo(ciglio(y) - 48, y); x.lineTo(-L - 2, y1 + 6); x.closePath(); x.fill();
    for (const m of vicine) {      // dall'alto in basso: ogni cengia copre il piede di quella sopra e mostra la sua schiena
      const c2 = U.semi(m.seme), tono = mesc(PARETE_SU, PARETE_GIU, limita(m.cy / ALT_PARETE, 0, 1));
      x.globalCompositeOperation = 'source-atop'; x.strokeStyle = alfa(BOTT, .2); x.lineWidth = 22; x.beginPath(); liscia(x, m.p); x.stroke();
      x.globalCompositeOperation = 'source-over';
      x.save(); x.beginPath(); liscia(x, m.p); x.clip();
      const g = x.createLinearGradient(0, m.cy - m.ry, 0, m.cy + m.ry); g.addColorStop(0, chiaro(tono, .16)); g.addColorStop(.5, tono); g.addColorStop(1, scuro(tono, .55));
      x.fillStyle = g; x.fillRect(m.cx - m.rx * 1.3, m.cy - m.ry * 1.3, m.rx * 2.6, m.ry * 2.6);
      lucido(x, m.cx - m.rx * .1, m.cy + m.ry * .6, m.rx * .9, m.ry * .6, 0, .32, BOTT);
      coperta(x, c2, m, m.col, m.verde);
      lucido(x, m.cx + m.rx * .2, m.cy - m.ry * .6, m.rx * .7, m.ry * .36, 0, .2);
      x.restore();
    }
    raccordo(im, PARETE_SU, PARETE_GIU, -y0, ALT_PARETE - y0, 60);      // verso l'interno torna il colore pieno: lì continua il riempimento
    for (const o of cose) if (o.y > y0 - 160 && o.y < y1 + 160) { x.save(); x.translate(o.x, o.y); x.rotate(o.rot); x.scale(o.s, o.s); decoro(x, U.semi(o.seme), o.tipo, o.col); x.restore(); }
    vela(im, ACQUA, VELO_PARETE);
    tele.push(im);
  }
  return tele;
}
/* La scogliera che esce dall'acqua sopra la parete: 256×384 unità, con erba e pini in cima. */
const RUPE_ALTA = 236, RUPE = ['#b3bba8', '#84948a'], PINO = ['#3f7a5c', '#56946a', '#2f6650'];
function pino(x, bx, by, alt, col) {
  x.strokeStyle = '#7b6a55'; x.lineWidth = alt * .07; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, by - alt * .5); x.stroke();
  x.fillStyle = col; x.beginPath();
  for (let i = 0; i < 4; i++) { const u = i / 3, cy = by - alt * (.3 + u * .6), w = alt * (.34 - u * .2), h = alt * .3; x.moveTo(bx - w, cy + h * .5); x.quadraticCurveTo(bx - w * .3, cy, bx, cy - h * .6); x.quadraticCurveTo(bx + w * .3, cy, bx + w, cy + h * .5); x.quadraticCurveTo(bx, cy + h * .25, bx - w, cy + h * .5); }
  x.fill();
}
function scoglieraEmersa() {
  const im = tela(256, 384), x = penna(im), caso = U.semi(717), A = RUPE_ALTA;
  x.translate(256, 384);
  for (let i = 0; i < 4; i++) pino(x, -214 + i * 24 + caso() * 10, -A + 6, 70 + caso() * 36, PINO[2]);      // i pini dietro
  const orlo = [[-230, -A - 6], [-180, -A + 4], [-140, -A + 30], [-122, -A + 78], [-128, -A + 110], [-100, -A + 136], [-84, -100], [-96, -72], [-66, -52], [-44, -24]];
  x.fillStyle = RUPE[0]; x.beginPath(); x.moveTo(-258, 8); x.lineTo(-258, -A);
  for (let i = 0; i < orlo.length - 1; i++) x.quadraticCurveTo(orlo[i][0], orlo[i][1], (orlo[i][0] + orlo[i + 1][0]) / 2, (orlo[i][1] + orlo[i + 1][1]) / 2);
  x.quadraticCurveTo(-44, -24, -20, 8); x.closePath(); x.fill();
  x.save(); x.clip();
  x.fillStyle = sfuma(x, RUPE[0], RUPE[1], -A - 20, 0); x.fillRect(-256, -384, 256, 392);
  for (let i = 0; i < 7; i++) {
    const yy = -A + 20 + i * 34 + caso() * 12, sp = 6 + caso() * 10, f = caso() * TAU;
    x.fillStyle = i % 2 ? 'rgba(70,96,86,.2)' : 'rgba(244,250,232,.26)'; x.beginPath();
    for (let px = -260; px <= 0; px += 20) x.lineTo(px, yy + 5 * Math.sin(px / 60 + f) + px * .04);
    for (let px = 0; px >= -260; px -= 20) x.lineTo(px, yy + sp + 5 * Math.sin(px / 75 + f + 1) + px * .04);
    x.closePath(); x.fill();
  }
  const gl = x.createLinearGradient(-150, 0, -30, 0); gl.addColorStop(0, 'rgba(250,252,236,0)'); gl.addColorStop(1, 'rgba(250,252,236,.28)');
  x.fillStyle = gl; x.fillRect(-150, -384, 150, 392);
  lucido(x, -110, -A + 120, 60, 18, -.1, .3, '#56706a'); lucido(x, -84, -86, 44, 14, -.1, .28, '#56706a');
  x.fillStyle = sfuma(x, 'rgba(60,118,92,0)', 'rgba(60,118,92,.7)', -44, 4); x.fillRect(-256, -44, 256, 54);       // la fascia bagnata, verde d'alghe
  x.restore();
  raccordo(im, RUPE[0], RUPE[1], 384 - A - 20, 384, 70);
  for (let giro = 0; giro < 2; giro++) for (let px = -262; px < -128 - giro * 20; px += (giro ? 12 : 24) + caso() * 18) {      // erba e cespugli sul ciglio
    const r = giro ? 8 + caso() * 10 : 16 + caso() * 12, cy = -A + (giro ? 4 : -8) + (px > -180 ? (px + 180) * .5 : 0) + caso() * 6, col = giro ? PINO[1] : PINO[0];
    x.fillStyle = col; x.beginPath(); x.arc(px, cy, r, 0, TAU); x.fill();
    x.fillStyle = chiaro(col, .22); x.beginPath(); x.arc(px - r * .2, cy - r * .3, r * .5, 0, TAU); x.fill();
  }
  pino(x, -196, -A + 2, 90, PINO[0]); pino(x, -160, -A + 8, 66, PINO[1]);
  return im;
}

// ---------------------------------------------------------------- foschia e faraglioni lontani (sopra l'acqua)
function foschia() {
  const L = 1024, A = 256, caso = U.semi(919), gruppi = [];
  const banco = (cx, cy, r, n) => { const palle = []; for (let j = 0; j < n; j++) palle.push([cx + (j - (n - 1) / 2) * r * 1.5 + (caso() - .5) * r * .4, cy - Math.sin((j + .5) / n * PI) * r * .5 * (.5 + caso() * .6), r * (.6 + caso() * .5)]); gruppi.push(palle); };
  for (let i = 0; i < 3; i++) banco((i + .15 + caso() * .7) / 3 * L, 60 + caso() * 70, 22 + caso() * 12, 5 + Math.floor(caso() * 4));
  for (let i = 0; i < 4; i++) banco((i + .1 + caso() * .8) / 4 * L, 204 + caso() * 26, 9 + caso() * 6, 6 + Math.floor(caso() * 5));
  const m = U.tela(L / 4, A / 4), x = m.getContext('2d');      // dipinta in piccolo: i bordi restano soffici
  x.scale(.25, .25);
  for (const ox of [-L, 0, L]) for (const palle of gruppi) for (let pass = 0; pass < 2; pass++) {
    x.fillStyle = pass ? 'rgba(255,255,248,.8)' : 'rgba(176,216,214,.6)'; x.beginPath();
    for (const p of palle) { const py = p[1] + (pass ? 0 : p[2] * .34); x.moveTo(p[0] + ox + p[2] * 1.7, py); x.ellipse(p[0] + ox, py, p[2] * 1.7, p[2] * (pass ? .8 : .86), 0, 0, TAU); }
    x.fill();
  }
  const im = tela(L / 2, A / 2), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, L / 2, A / 2);
  return im;
}
function faraglioni() {
  const W = 420, H = 200, caso = U.semi(929), m = U.tela(W / 2, H / 2), x = penna(m);
  x.scale(.5, .5); x.translate(W / 2, H - 6);
  const scoglio = (cx, w, h, pini) => {
    const p = [[cx - w * .5, 8], [cx - w * .47, -h * .3], [cx - w * .36, -h * .5], [cx - w * .34, -h * .82], [cx - w * .14, -h * .97], [cx + w * .08, -h], [cx + w * .2, -h * .78], [cx + w * .36, -h * .7], [cx + w * .4, -h * .34], [cx + w * .5, 8]];
    const sagoma = () => { x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length - 1; i++) x.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] * .4 + p[i + 1][0] * .6), (p[i][1] * .4 + p[i + 1][1] * .6)); x.lineTo(p[9][0], p[9][1]); x.closePath(); };
    for (let i = 0; i < pini; i++) pino(x, cx - w * .2 + i * w * .16 + caso() * 6, -h * (.9 + caso() * .06), 24 + caso() * 16, '#4f8a70');
    x.fillStyle = sfuma(x, '#9db8a6', '#6f958c', -h, 0); sagoma(); x.fill();
    x.save(); x.clip();
    x.fillStyle = 'rgba(244,250,226,.3)'; x.beginPath(); x.moveTo(cx - w * .6, 10); x.lineTo(cx - w * .5, -h * 1.1); x.lineTo(cx - w * .1, -h * 1.1); x.lineTo(cx - w * .24, 10); x.closePath(); x.fill();     // il fianco al sole
    x.fillStyle = 'rgba(60,110,96,.3)'; for (let i = 0; i < 3; i++) { const yy = -h * (.2 + i * .25); x.beginPath(); x.moveTo(cx - w * .6, yy); x.lineTo(cx + w * .6, yy + h * .06); x.lineTo(cx + w * .6, yy + h * .1); x.lineTo(cx - w * .6, yy + h * .03); x.closePath(); x.fill(); }
    x.fillStyle = 'rgba(86,148,106,.7)'; x.beginPath(); x.ellipse(cx - w * .04, -h * .98, w * .3, h * .1, 0, 0, TAU); x.fill();      // l'erba in cima
    x.restore();
  };
  scoglio(-112, 124, 104, 2); scoglio(34, 180, 140, 3); scoglio(152, 84, 66, 1);
  x.fillStyle = 'rgba(244,252,240,.7)'; x.beginPath(); x.ellipse(0, 6, 204, 8, 0, 0, TAU); x.fill();
  const im = tela(W, H), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, W, H);
  vela(im, '#cfeadf', .34);
  return { im, w: W, h: H };
}

// ---------------------------------------------------------------- le fronde in primo piano (scure e sfocate)
function frondeVicine() {
  const fai = (W, H, ox, oy, disegna, svanisci) => {
    const m = U.tela(W / 4, H / 4), x = penna(m);       // dipinte in piccolo e ingrandite: restano fuori fuoco
    x.scale(.25, .25); x.translate(ox, oy); x.fillStyle = x.strokeStyle = sfuma(x, '#6fb894', '#3f9478', -H * .8, 0);
    disegna(x);
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in';     // il piede svanisce: non si vede dove nasce
    x.fillStyle = svanisci(x, W / 4, H / 4); x.fillRect(0, 0, W / 4, H / 4);
    const im = tela(W / 2, H / 2), y = im.getContext('2d');
    y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, W / 2, H / 2);
    return { im, w: W, h: H, ax: ox, ay: oy };
  };
  const lama = (x, bx, by, ang, lun, larg) => {       // una grande lamina mossa
    x.save(); x.translate(bx, by); x.rotate(ang); x.beginPath(); x.moveTo(0, -larg * .3);
    for (let i = 1; i <= 8; i++) { const u = i / 8; x.lineTo(u * lun, -larg * Math.sin(PI * Math.pow(u, .6)) * (1 + .16 * Math.sin(u * 9 + bx)) + Math.sin(u * 2.2) * lun * .12); }
    for (let i = 8; i >= 0; i--) { const u = i / 8; x.lineTo(u * lun, larg * Math.sin(PI * Math.pow(u, .6)) * (1 + .16 * Math.sin(u * 8 + by)) + Math.sin(u * 2.2) * lun * .12); }
    x.closePath(); x.fill(); x.restore();
  };
  const daSotto = (x, w, h) => sfuma(x, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)', h - 14, h - 3);
  const daLato = (x, w, h) => { const g = x.createLinearGradient(2, 0, 16, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); return g; };
  return {
    basso: [
      fai(280, 320, 140, 304, x => { lama(x, -30, 0, -PI / 2 - .3, 250, 22); lama(x, 0, 0, -PI / 2 + .05, 290, 26); lama(x, 30, 0, -PI / 2 + .36, 220, 20); }, daSotto),
      fai(280, 320, 140, 304, x => { lama(x, -20, 0, -PI / 2 - .12, 280, 28); lama(x, 24, 0, -PI / 2 + .3, 240, 24); }, daSotto),
    ],
    lato: [      // un fusto che entra dal bordo con le sue lamine: l'origine è sul bordo sinistro, a metà altezza
      fai(300, 360, 8, 180, x => { x.lineWidth = 12; x.beginPath(); x.moveTo(-10, 170); x.quadraticCurveTo(40, 40, 70, -170); x.stroke(); lama(x, 34, 60, -.2, 210, 26); lama(x, 52, -40, -.42, 190, 24); lama(x, 22, 130, .1, 170, 22); lama(x, 66, -130, -.6, 150, 20); }, daLato),
      fai(300, 360, 8, 180, x => { x.lineWidth = 12; x.beginPath(); x.moveTo(-10, -170); x.quadraticCurveTo(50, -30, 40, 170); x.stroke(); lama(x, 30, -70, .3, 220, 28); lama(x, 46, 30, .1, 200, 24); lama(x, 40, 120, .42, 160, 22); }, daLato),
    ],
  };
}

// ---------------------------------------------------------------- il corredo: tutte le tele, dipinte una volta sola
let corredo = null;
function prepara() {
  if (corredo) return corredo;
  pixel = 0;
  const co = {};
  co.kelp = figurineKelp();
  co.chiome = chiome();
  co.tipi = figurineFondale();
  co.piani = pianiLontani();
  co.chiomaLontana = chiomaLontana();
  co.formazioni = grandiMassi();
  co.cresta = [crestaGhiaia(0), crestaGhiaia(1)];
  co.corpo = corpoGhiaia();
  co.profonda = ghiaiaProfonda();
  co.dorsale = dorsaleRoccia();
  co.luce = reteDiLuce(87, 7, .085, false);      // la forza è già dentro le tele: copiarle con globalAlpha diverso da 1 costa più del doppio
  co.luceFondo = reteDiLuce(88, 6, .28, true);
  co.parete = pareti();
  co.rupe = scoglieraEmersa();
  co.foschia = foschia();
  co.faraglioni = faraglioni();
  co.fronde = frondeVicine();
  co.pixel = pixel;
  return corredo = co;
}

// ---------------------------------------------------------------- ciò che si muove
const LAME_DIETRO = [0, 1, 2, 3, 4].map(i => ({ x: (i + rumore(i, 131) * .7) / 5, w: 22 + rumore(i, 132) * 34, a: .5 + rumore(i, 133) * .5, b: .2 + rumore(i, 134) * .25, f: rumore(i, 135) * TAU, v: .85 + rumore(i, 136) * .3 }));
const LAME_VELO = [0, 1, 2].map(i => ({ x: (i + rumore(i, 141) * .7) / 3, w: 28 + rumore(i, 142) * 30, a: .5 + rumore(i, 143) * .5, b: .16 + rumore(i, 144) * .2, f: rumore(i, 145) * TAU, v: .9 + rumore(i, 146) * .2 }));
/* Lame di sole oblique (misure di schermo): partono dal pelo dell'acqua e si spengono scendendo. */
function lame(c, v, lista, forza, par, daY) {
  const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, t = v.t;
  const ys = vh / 2 - cam.y * z, fine = ys + 2700 * z, y0 = Math.max(daY, 0), y1 = Math.min(vh, fine);
  if (y1 <= y0 + 10 || forza < .01) return;
  c.fillStyle = sfuma(c, 'rgba(246,255,200,1)', 'rgba(246,255,200,0)', ys, fine);
  const sc = .55 + .45 * z, giro = vw + PEND * vh + 260, scorri = -(cam.x + PEND * cam.y) * z * par + t * 3;
  for (const r of lista) {
    const cima = (((r.x * giro + scorri * r.v) % giro) + giro) % giro - 130, w = r.w * sc;
    const xa = cima - PEND * y0, xb = cima - PEND * y1, wa = w * (1 + y0 / vh * .6), wb = w * (1 + y1 / vh * .6);
    c.globalAlpha = forza * r.a * (.62 + .38 * Math.sin(t * r.b + r.f));
    c.beginPath(); c.moveTo(xa - wa, y0); c.lineTo(xa + wa, y0); c.lineTo(xb + wb, y1); c.lineTo(xb - wb, y1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(xa - wa * .42, y0); c.lineTo(xa + wa * .42, y0); c.lineTo(xb + wb * .42, y1); c.lineTo(xb - wb * .42, y1); c.closePath(); c.fill();
  }
  c.globalAlpha = 1;
}
/* Fasci di luce nel mondo: scendono dai varchi tra le chiome e si spengono verso il fondo. */
function fasci(c, v, sc, xa, xb, ya, yb) {
  const t = v.t, y0 = Math.max(ya, 2);
  c.fillStyle = sfuma(c, 'rgba(248,255,196,.3)', 'rgba(248,255,196,0)', 0, 2200);
  for (const f of sc.fasci) {
    const y1 = Math.min(yb, f.lun);
    if (y1 <= y0 + 10) continue;
    const x0 = f.x - PEND * y0, x1 = f.x - PEND * y1, w0 = f.w * (1 + y0 / 1600), w1 = f.w * (1 + y1 / 1600);
    if (Math.max(x0 + w0, x1 + w1) < xa || Math.min(x0 - w0, x1 - w1) > xb) continue;
    c.globalAlpha = f.a * (.7 + .3 * Math.sin(t * f.b + f.f));
    c.beginPath(); c.moveTo(x0 - w0, y0); c.lineTo(x0 + w0, y0); c.lineTo(x1 + w1, y1); c.lineTo(x1 - w1, y1); c.closePath(); c.fill();
  }
  c.globalAlpha = 1;
}

/* Dove sta il fusto `st` della pianta `p` alla quota y: il piede è fermo, più su serpeggia e ondeggia con la corrente. */
function fustoX(p, st, y, t) {
  const su = p.y - y, k = su <= 0 ? 0 : su >= 420 ? 1 : su / 420, kk = k * k * (3 - 2 * k);
  return p.x + st.dx + kk * (st.apri + st.m * Math.sin(y * st.k + st.f) + p.amp * (Math.sin(t * .45 + y * .0033 + p.f) + .4 * Math.sin(t * .8 + y * .0074 + st.f2)));
}
const PASSO_FUSTO = 48;
const FETTA = 32;          // altezza (px CSS) delle fette con cui ondeggiano i tronchi lontani
/* Le piante di kelp di una fila: prima tutti i fusti in un tracciato solo, poi le lamine (figurine copiate pari pari). */
function bosco(c, v, lista, tinte, xa, xb, ya, yb) {
  const t = v.t;
  let qualcuna = false;
  c.beginPath();
  for (const p of lista) {
    p.vista = p.x1 > xa && p.x0 < xb && p.y > ya && p.cima < yb;
    if (!p.vista) continue;
    qualcuna = true;
    for (const st of p.fusti) {
      const su = Math.max(st.cima, ya - PASSO_FUSTO), giu = Math.min(p.y, yb + PASSO_FUSTO);
      if (giu <= su) continue;
      let px = fustoX(p, st, giu, t), py = giu;
      c.moveTo(px, py);
      for (let y = Math.ceil(giu / PASSO_FUSTO - 1) * PASSO_FUSTO; ; y -= PASSO_FUSTO) {
        const yy = y < su ? su : y, nx = fustoX(p, st, yy, t);
        c.quadraticCurveTo(px, py, (px + nx) / 2, (py + yy) / 2);
        px = nx; py = yy;
        if (y <= su) break;
      }
      c.lineTo(px, py);
    }
  }
  if (!qualcuna) return;
  c.strokeStyle = tinte.fusto; c.lineWidth = tinte.spesso; c.stroke();
  if (v.qualita > 0) { c.strokeStyle = tinte.luce; c.lineWidth = tinte.spesso * .36; c.stroke(); }
  const piccolo = v.cam.z * (v.dpr || 1) < 1.3;
  if (piccolo) c.imageSmoothingEnabled = false;
  for (const p of lista) {
    if (!p.vista) continue;
    for (const st of p.fusti) for (const n of st.nodi) {
      if (n.y < ya - 100 || n.y > yb + 100) continue;
      const f = n.fig, px = fustoX(p, st, n.y, t) + n.lato * 2;
      c.drawImage(piccolo ? f.mezza : f.im, mezzo(px - f.ax), mezzo(n.y - f.ay), f.w, f.h);
    }
  }
  if (piccolo && v.qualita > 0) c.imageSmoothingEnabled = true;
}
const TINTE_VICINE = { fusto: mesc(scuro(KELP.fusto, .12), ACQUA, VELO_KELP), luce: mesc(chiaro(KELP.fusto, .3), ACQUA, VELO_KELP), spesso: 6.5 };
const TINTE_LONTANE = { fusto: mesc(scuro(KELP.fusto, .12), ACQUA, .6), luce: mesc(chiaro(KELP.fusto, .3), ACQUA, .6), spesso: 4.8 };

const PUNTE = new Float32Array(64);
function tentacoli(c, a, t) {
  const n = a.n;
  c.lineWidth = a.sp; c.strokeStyle = a.col; c.beginPath();
  const lento = Math.sin(t * .45 + a.f * 2) * .14;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - .5, ang = u * 2.5, on = ang + Math.sin(t * 1.1 + a.f + i * .8) * .16 + lento, lun = a.lun[i];
    const bx = a.x + u * a.w * .7, tx = bx + Math.sin(on) * lun, ty = a.y - Math.cos(on) * lun * .9;
    c.moveTo(bx, a.y + 3); c.quadraticCurveTo(bx + Math.sin(ang * .4) * lun * .5, a.y - Math.cos(ang * .4) * lun * .6, tx, ty);
    PUNTE[i * 2] = tx; PUNTE[i * 2 + 1] = ty;
  }
  c.stroke();
  c.fillStyle = a.punta; c.beginPath();
  for (let i = 0; i < n; i++) { c.moveTo(PUNTE[i * 2] + a.sp * .6, PUNTE[i * 2 + 1]); c.arc(PUNTE[i * 2], PUNTE[i * 2 + 1], a.sp * .6, 0, TAU); }
  c.fill();
}
/* Un ciuffo d'erba marina: nastri sottili piegati dalla corrente. */
function ciuffo(c, e, t) {
  const corr = .35 + Math.sin(t * .5 + e.x * .006) * .5 + Math.sin(t * .9 + e.f) * .2, nastri = e.nastri, n = nastri.length;
  for (let pass = 0; pass < 2; pass++) {
    c.fillStyle = pass ? e.col1 : e.col0; c.beginPath();
    for (let i = pass; i < n; i += 2) {
      const l = nastri[i], sv = (corr + Math.sin(t * 1.2 + l.f) * .2) * l.h * .3 + l.inc, bx = e.x + l.dx, mx = bx + sv * .25, my = e.y - l.h * .6, w = l.w;
      c.moveTo(bx - w, e.y + 4); c.quadraticCurveTo(mx - w * .8, my, bx + sv, e.y - l.h); c.quadraticCurveTo(mx + w * .8, my, bx + w, e.y + 4);
    }
    c.fill();
  }
}

// ---------------------------------------------------------------- pezzi della passata «dietro»
const FILE_FOSCHIA = [{ y: -352, k: 1, par: .6, fase: 0 }, { y: -980, k: 1.5, par: .42, fase: 600 }];
const FARAGLIONI = [{ x: .2, par: .74, k: 1 }, { x: .72, par: .8, k: .7 }];
function cielo(c, v, sc, xa, xb, ya) {
  const t = v.t, cam = v.cam, co = sc.co, W = sc.W, passo = 24, x0 = Math.floor((xa - 30) / passo) * passo, x1 = xb + 30 + passo, su = Math.min(ya - 20, -40);
  c.save();
  c.beginPath(); c.moveTo(x0, su);                       // tutto il cielo sta sopra l'onda
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.lineTo(x1, su); c.closePath(); c.clip();
  const g = c.createLinearGradient(0, -1200, 0, 0);
  g.addColorStop(0, '#4fa6c4'); g.addColorStop(.66, '#9fd8d6'); g.addColorStop(1, '#f1f7dc');
  c.fillStyle = g; c.fillRect(xa - 4, su, xb - xa + 8, 16 - su);
  const sx = cam.x * .8 + W * .2, sy = -260, sr = 340;      // il sole dietro la foschia: un alone che segue piano la visuale
  if (ya < sy + sr) {
    const gs = c.createRadialGradient(sx, sy, 0, sx, sy, sr); gs.addColorStop(0, 'rgba(255,255,240,.9)'); gs.addColorStop(.14, 'rgba(255,252,226,.6)'); gs.addColorStop(.4, 'rgba(255,250,220,.2)'); gs.addColorStop(1, 'rgba(255,250,220,0)');
    c.fillStyle = gs; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  }
  for (const o of FARAGLIONI) {
    const w = co.faraglioni.w * o.k, h = co.faraglioni.h * o.k, x = cam.x * o.par + W * o.x * (1 - o.par);
    if (x + w / 2 > xa && x - w / 2 < xb) c.drawImage(co.faraglioni.im, x - w / 2, 8 - h, w, h);
  }
  for (const r of FILE_FOSCHIA) {
    const lw = 1400 * r.k, lh = 350 * r.k;
    if (r.y + lh < ya) continue;
    const sposta = cam.x * r.par + r.fase + t * 3;
    for (let x = Math.floor((xa - sposta) / lw) * lw + sposta; x < xb; x += lw) c.drawImage(co.foschia, x, r.y, lw + .5, lh);
  }
  c.restore();
}

function scogliere(c, v, sc, xa, xb, ya, yb) {
  const co = sc.co, W = sc.W, H = sc.H;
  for (let lato = 0; lato < 2; lato++) {
    const fuori = lato ? xb - W : -xa;       // quanto si vede oltre il bordo del mondo
    if (fuori < -20) continue;
    c.save();
    if (lato) { c.translate(W, 0); c.scale(-1, 1); }   // la parete destra è lo specchio della sinistra: qui la roccia sta a x < 0
    if (fuori > PARETE_L - 4) { c.fillStyle = sfuma(c, PARETE_SU_VELATA, PARETE_GIU_VELATA, 0, ALT_PARETE); c.fillRect(-OLTRE, -4, OLTRE - PARETE_L + 1, H + 80); }
    for (let k = 0; k < co.parete.length; k++) { const y0 = k * 1024, im = co.parete[k]; if (y0 < yb && y0 + im.height > ya) c.drawImage(im, -PARETE_L, y0); }
    if (ya < 10) {
      c.drawImage(co.rupe, -256, -384);
      if (fuori > 252) {
        c.fillStyle = PINO[0]; c.fillRect(-OLTRE, -RUPE_ALTA - 22, OLTRE - 255, 40);
        c.fillStyle = sfuma(c, RUPE[0], RUPE[1], -RUPE_ALTA - 20, 0); c.fillRect(-OLTRE, -RUPE_ALTA + 8, OLTRE - 255, RUPE_ALTA - 4);
      }
    }
    c.restore();
  }
}

function superficie(c, v, sc, xa, xb) {
  const t = v.t, passo = 24, x0 = Math.floor((xa - 30) / passo) * passo, x1 = xb + 30 + passo;
  // la luce che entra sotto il pelo dell'acqua
  c.fillStyle = sfuma(c, 'rgba(232,255,226,.5)', 'rgba(206,250,214,0)', 0, 230);
  c.beginPath(); c.moveTo(x0, 230);
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.lineTo(x1, 230); c.closePath(); c.fill();
  if (v.qualita > 0) {      // riflessi che scorrono appena sotto
    c.fillStyle = 'rgba(250,255,236,.3)'; c.beginPath();
    for (let i = Math.floor(xa / 64) - 1, fine = Math.floor(xb / 64) + 1; i <= fine; i++) {
      const vivo = Math.sin(t * (.7 + rumore(i, 3) * .8) + rumore(i, 5) * TAU);
      if (vivo < -.2) continue;
      const cx = i * 64 + rumore(i, 7) * 64 + Math.sin(t * .4 + i) * 12, cy = 16 + rumore(i, 9) * 90, rx = (14 + rumore(i, 11) * 34) * (.5 + vivo * .5), ry = 2 + rumore(i, 13) * 2.4;
      c.moveTo(cx + rx, cy); c.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    }
    c.fill();
  }
  // il pelo dell'acqua: una fascia chiara tra l'onda di dietro e quella davanti, poi il filo bianco
  c.fillStyle = 'rgba(214,248,232,.8)'; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t) + 1);
  for (let x = x1; x >= x0; x -= passo) c.lineTo(x, onda(x + 150, t + 1.7) * .8 - 8);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(20,140,110,.3)'; c.lineWidth = 3; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t) + 5);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,250,.95)'; c.lineWidth = 3; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.stroke();
  // le chiome che galleggiano: seguono l'onda e la cima della loro pianta; sotto ognuna scende la sua ombra
  const ombra = v.qualita > 0 ? sfuma(c, 'rgba(6,70,60,.26)', 'rgba(6,70,60,0)', 30, 520) : null;
  for (const o of sc.chiome) {
    const f = o.f, x = fustoX(o.p, o.p.fusti[0], o.p.cima, t) + o.sposta;
    if (x + f.w / 2 + 150 < xa || x - f.w / 2 > xb) continue;
    if (ombra) { const w = f.larg * .42; c.fillStyle = ombra; c.beginPath(); c.moveTo(x - w, 24); c.lineTo(x + w, 24); c.lineTo(x + w * .7 - PEND * 500, 520); c.lineTo(x - w * .7 - PEND * 500, 520); c.closePath(); c.fill(); }
    c.drawImage(f.im, mezzo(x - f.ax), mezzo(onda(x, t) * .7 - f.ay), f.w, f.h);
  }
}

function fondaleDietro(c, v, sc, xa, xb) {
  const co = sc.co, H = sc.H, t = v.t;
  for (const e of sc.dietro) {
    if (e.x1 < xa || e.x0 > xb) continue;
    if (e.ci) ciuffo(c, e.ci, t); else c.drawImage(e.im, e.dx, e.dy, e.w, e.h);
  }
  for (let i = Math.floor(xa / 512), i1 = Math.floor(xb / 512); i <= i1; i++) c.drawImage(co.dorsale, i * 512, H - 88, 512, 128);
}
function fondaleDavanti(c, v, sc, xa, xb, ya, yb) {
  const co = sc.co, H = sc.H, t = v.t, q = v.qualita, i0 = Math.floor(xa / 512), i1 = Math.floor(xb / 512);
  for (const e of sc.fila) {
    if (e.x1 < xa || e.x0 > xb) continue;
    if (e.ci) { ciuffo(c, e.ci, t); continue; }
    if (e.an) tentacoli(c, e.an, t);
    c.drawImage(e.im, e.dx, e.dy, e.w, e.h);
  }
  // la ghiaia davanti: prima il colore pieno, poi cresta e corpo
  if (yb > H + 30) { c.fillStyle = GHI[2]; c.fillRect(xa - 4, H + 30, xb - xa + 8, yb - H - 26); }
  if (yb > H + 230) {      // la ghiaia profonda, sempre più scura scendendo
    for (let y = H + 230; y < yb; y += 512) for (let i = i0; i <= i1; i++) c.drawImage(co.profonda, i * 512, y, 512.5, 512.5);
    c.fillStyle = sfuma(c, 'rgba(20,62,54,0)', 'rgba(20,62,54,.5)', H + 300, H + 1700); c.fillRect(xa - 4, H + 300, xb - xa + 8, yb - H - 296);
  }
  for (let i = i0; i <= i1; i++) {
    c.drawImage(co.cresta[((i % 2) + 2) % 2], i * 512, H - 44, 512, 128);
    if (yb > H + 84) c.drawImage(co.corpo, i * 512, H + 84, 512, 256);
  }
  if (q > 0) {      // la luce che balla sul fondo
    for (let giro = 0; giro < q; giro++) {
      const sposta = mezzo(giro ? -t * 6 + 90 : t * 8);
      for (let x = Math.floor((xa - sposta) / 256) * 256 + sposta; x < xb; x += 256) c.drawImage(co.luceFondo, x, H - 86 + giro * 22, 256, 256);
    }
  }
  for (const e of sc.suolo) if (e.x1 > xa && e.x0 < xb) c.drawImage(e.im, e.dx, e.dy, e.w, e.h);
}

// ---------------------------------------------------------------- l'ambiente
B.ambienti.registra({
  id: 'alghe',
  descrizione: 'Un bosco di alghe altissime, tra lame di luce verde e rocce coperte di muschio.',
  colori: { acquaAlta: '#1f9a7a', acquaBassa: '#0c5148', sabbia: '#8f9c68', roccia: '#3f6f5f', accento: '#d98a3c' },   // l'interfaccia ci scrive sopra in bianco

  /* Il gioco la chiama quando si passa a un altro ambiente: le tele si rifanno alla prossima crea(). */
  libera() { corredo = null; },

  crea(mondo, caso) {
    const co = prepara(), W = mondo.w, H = mondo.h;
    const tra = (a, b) => a + caso() * (b - a), uno = l => l[Math.floor(caso() * l.length)];
    const sc = { co, W, H, formazioni: [], lontane: [], vicine: [], chiome: [], fasci: [], dietro: [], fila: [], suolo: [], sorgenti: [], fronde: [] };

    // chi sta sul fondo, su due file
    const occupati = [[], []];
    const libero = (fila, x, m) => occupati[fila].every(o => Math.abs(o[0] - x) > (o[1] + m) * .5);
    const posa = (f0, x, dietro, perForza) => {
      const f = dietro ? f0.lontana : f0, fila = dietro ? 0 : 1, m = f.w / 2;
      if (!perForza && !libero(fila, x, m)) return null;
      occupati[fila].push([x, m]);
      const y = H + (dietro ? dorsale(x) + 9 : duna(x) + 7);
      const e = { im: f.im, w: f.w, h: f.h, x: mezzo(x), y: mezzo(y), dx: mezzo(x - f.ax), dy: mezzo(y - f.ay), x0: x - m, x1: x + m, alto: f.h + caso() * 26, an: null, ci: null };
      if (f0.anemone) {
        const a = f0.anemone, n = 11 + Math.floor(caso() * 4), lun = [];
        for (let i = 0; i < n; i++) lun.push((26 + caso() * 14) * (1 - Math.abs(i / (n - 1) - .5) * .4));
        e.an = { x: e.x, y: e.y - a.alto, w: a.larg, n, lun, sp: 6.5, col: a.tentacolo, punta: a.punta, f: caso() * TAU };
        e.x0 -= 40; e.x1 += 40; e.alto = 50;
      }
      (dietro ? sc.dietro : sc.fila).push(e);
      return e;
    };

    // il kelp: boschetti di una, due o tre piante, separati da radure d'acqua libera
    const kelp = (x, dietro) => {
      const k = dietro ? .74 : 1, f0 = uno(co.tipi.scoglio), e = posa(f0, x, dietro, true), fr = dietro ? co.kelp.lontane : co.kelp;
      const piede = e.y - f0.cima * k, arriva = caso() < .72, cima = arriva ? tra(34, 46) : H * tra(.14, .5);
      const p = { x: e.x, y: piede, cima, amp: tra(15, 27) * k, f: tra(0, TAU), fusti: [], x0: x - 190 * k, x1: x + 190 * k, vista: false };
      const nf = 1 + (caso() < .5 ? 1 : 0) + (arriva && caso() < .3 ? 1 : 0);
      for (let j = 0; j < nf; j++) {
        const u = nf > 1 ? j / (nf - 1) - .5 : 0, intero = j === 0 || caso() < .5;
        const st = { dx: u * 12 * k, apri: (u * tra(50, 90) + tra(-10, 10)) * k, m: tra(8, 18) * k, k: TAU / tra(600, 1100), f: tra(0, TAU), f2: tra(0, TAU), cima: intero ? cima : Math.max(cima, piede - tra(500, 1900)), nodi: [] };
        const fino = st.cima > 100;       // finisce in mezzo all'acqua: verso la punta le lamine rimpiccioliscono
        let lato = caso() < .5 ? 1 : -1;
        for (let y = piede - tra(60, 100) * k, n = 0; y > st.cima + (fino ? 30 : 44); y -= (dietro ? tra(62, 90) : tra(48, 70)) * k, n++) {
          const resta = (y - st.cima) / (60 * k), taglia = n < 2 ? n : fino && resta < 4 ? Math.floor(resta) : 1 + Math.floor(caso() * 4);
          lato = -lato;
          st.nodi.push({ y, lato, fig: (lato > 0 ? fr.dx : fr.sx)[limita(taglia, 0, 4)] });
        }
        if (fino) st.nodi.push({ y: st.cima, lato: 0, fig: fr.punta });
        p.fusti.push(st);
        p.cima = Math.min(p.cima, st.cima);
      }
      (dietro ? sc.lontane : sc.vicine).push(p);
      if (arriva) sc.chiome.push({ f: uno(co.chiome), p, sposta: 0 });
    };
    for (let x = tra(90, 240); x < W - 90; ) {
      const quante = 2 + (caso() < .4 ? 1 : 0) - (caso() < .2 ? 1 : 0), prima = caso() < .5 ? 0 : 1;      // quasi sempre due o tre piante, una davanti e una dietro
      for (let i = 0; i < quante && x < W - 90; i++) { kelp(x, (i + prima) % 2 === 1); x += tra(100, 170); }
      x += tra(200, 360);
    }
    // i fasci di luce scendono dove tra una chioma e l'altra resta un varco
    const coperto = sc.chiome.map(o => [o.p.x + o.sposta - o.f.larg * .5, o.p.x + o.sposta + o.f.larg * .5]).sort((a, b) => a[0] - b[0]);
    let da = -80;
    for (const iv of [...coperto, [W + 80, W + 80]]) {
      const buco = iv[0] - da;
      if (buco > 80) for (let n = Math.max(1, Math.round(buco / 280)), i = 0; i < n; i++) sc.fasci.push({ x: da + buco * (i + .5) / n + 60, w: Math.min(buco / n, 260) * tra(.2, .32), a: tra(.6, 1), b: tra(.2, .5), f: tra(0, TAU), lun: tra(1500, 2200) });
      da = Math.max(da, iv[1]);
    }

    // i grandi massi e l'arco, a distanze irregolari
    const giro = co.formazioni.map((f, i) => i);
    for (let i = giro.length - 1; i > 0; i--) { const j = Math.floor(caso() * (i + 1)), a = giro[i]; giro[i] = giro[j]; giro[j] = a; }
    const arco = giro.indexOf(0); if (arco > 1) { giro[arco] = giro[1]; giro[1] = 0; }      // l'arco c'è sempre: tra i primi due
    for (let x = tra(-60, 200), n = 0; x < W - 80; n++) {
      const f = co.formazioni[giro[n % giro.length]], s = tra(.9, 1.2), cx = mezzo(x + f.w * s * .5);
      sc.formazioni.push({ f, s, specchio: caso() < .5, x: cx, y: H + 22, cy: H + 22 - f.ay * s / 2, margine: Math.max(f.w, f.h) * s * .5 });
      x += f.w * s * tra(.6, .9) + tra(60, 380);
    }

    // massi muschiosi, alghe corte e anemoni a gruppi; tra un gruppo e l'altro l'erba marina
    const prato = (x, dietro) => {
      const nastri = [], n = 7 + Math.floor(caso() * 5), k = dietro ? .72 : 1;
      for (let i = 0; i < n; i++) nastri.push({ dx: ((i / (n - 1) - .5) * 30 + tra(-4, 4)) * k, h: tra(50, 120) * k, w: tra(2.4, 3.8) * k, inc: tra(-8, 8) * k, f: caso() * TAU });
      const verde = caso() < .6 ? ['#4e9a66', '#79bb74'] : ['#5f9c5c', '#9cc878'], y = H + (dietro ? dorsale(x) + 6 : duna(x) + 5);
      const ci = { x, y, f: caso() * TAU, nastri, col0: dietro ? mesc(verde[0], ACQUA, .45) : verde[0], col1: dietro ? mesc(verde[1], ACQUA, .45) : verde[1] };
      (dietro ? sc.dietro : sc.fila).push({ ci, x0: x - 80, x1: x + 80, alto: 130 * k + caso() * 30 });
    };
    for (let cx = tra(20, 120); cx < W + 40; ) {
      const quanti = 3 + Math.floor(caso() * 4), largo = tra(70, 150);
      for (let i = 0; i < quanti; i++) {
        const r = caso(), f0 = i === 0 || r < .4 ? uno(co.tipi.masso) : r < .74 ? uno(co.tipi.alga) : uno(co.tipi.anemone), dietro = !f0.anemone && caso() < .4;
        for (let prova = 0; prova < 4; prova++) if (posa(f0, cx + (caso() + caso() - 1) * largo * (1 + prova * .3), dietro, false)) break;
      }
      if (caso() < .75) for (let i = 0, n = 2 + Math.floor(caso() * 3); i < n; i++) prato(cx + largo + tra(20, 100) + i * tra(14, 36), caso() < .35);
      cx += largo + tra(70, 180);
    }
    for (let i = 0; i < W / 240; i++) prato(tra(-40, W + 40), caso() < .4);
    sc.dietro.sort((a, b) => b.alto - a.alto);
    sc.fila.sort((a, b) => b.alto - a.alto);

    // stelle, abaloni e sassi sulla ghiaia
    const appoggia = (f, x, giu) => { const y = H + duna(x) + giu; if (sc.suolo.some(o => Math.abs(o.cx - x) < 46 && Math.abs(o.cy - y) < 30)) return; sc.suolo.push({ im: f.im, w: f.w, h: f.h, cx: x, cy: y, dx: mezzo(x - f.ax), dy: mezzo(y - f.ay), x0: x - f.w, x1: x + f.w }); };
    for (let i = 0; i < W / 210; i++) appoggia(uno(co.tipi.stella), tra(-60, W + 60), tra(20, 70));
    for (let i = 0; i < W / 300; i++) appoggia(uno(co.tipi.abalone), tra(-60, W + 60), tra(18, 64));
    for (let i = 0; i < W / 120; i++) appoggia(uno(co.tipi.sasso), tra(-60, W + 60), tra(14, 130));

    // da dove salgono le bollicine, e le pochissime fronde in primo piano: ai bordi del mondo e, rade, sul fondo
    for (let i = 0; i < W / 330; i++) { const x = tra(60, W - 60); sc.sorgenti.push({ x, y: H + duna(x) - 6, f: caso(), alt: tra(380, 640) }); }
    for (const lato of [0, 1]) for (let y = tra(700, 1200); y < H - 420; y += tra(700, 1200)) sc.fronde.push({ f: uno(co.fronde.lato), x: lato ? W + 30 : -30, y, s: tra(.5, .7), fase: caso() * TAU, specchio: lato === 1, lato: true });
    for (const x of [tra(30, 120), W - tra(30, 120)]) sc.fronde.push({ f: uno(co.fronde.basso), x, y: H + duna(x) + tra(2, 8), s: tra(.6, .8), fase: caso() * TAU, specchio: caso() < .5, lato: false });
    return sc;
  },

  /* Misure di schermo: acqua, lame di sole, tre piani di tronchi lontani con il loro suolo, la chioma lontana. */
  sfondo(c, v, sc) {
    const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, H = v.mondo.h, mh = vh / 2 / z, q = v.qualita;
    const g = c.createLinearGradient(0, 0, 0, vh);       // due soli colori: con tre la sfumatura costa più del doppio
    g.addColorStop(0, tinta((cam.y - mh) / H)); g.addColorStop(1, tinta((cam.y + mh) / H));
    c.fillStyle = g; c.fillRect(0, 0, vw, vh);
    if (!sc) return;
    c.save();
    const dpr = v.dpr || 1, fermo = n => Math.round(n * dpr) / dpr, prof = limita(cam.y / H, 0, 1), ys = vh / 2 - cam.y * z, su = Math.max(0, ys - 10 * z);      // sopra `su` c'è il cielo
    if (q > 0) lame(c, v, LAME_DIETRO, .36 - prof * .14, .3, 0);
    c.imageSmoothingEnabled = false;      // i piani lontani sono già sfumati: copiati senza filtro costano un quarto e non si nota
    for (const p of sc.co.piani) {
      if (p.lusso && q === 0) continue;
      const k = 1 + (z - 1) * p.zoom, lw = 512 * k, lh = p.alt * k, th = p.T * k, piu = k === 1 ? 0 : .6;   // i piani lontani risentono meno dello zoom
      const y0 = fermo(vh / 2 + (H - cam.y) * p.pary * k - (p.rialzo + p.base) * k), yB = y0 + lh;
      const x0 = fermo(-((((cam.x * p.par * k + p.fase) % lw) + lw) % lw));
      const giu = Math.min(vh, y0 + (p.base + 16) * k);       // sotto questa riga i tronchi li copre il suolo
      const r0 = Math.max(0, Math.floor((yB - giu) / th));
      if (q === 0 && !p.dondolo) { /* con la qualità bassa i tronchi più lontani, quasi invisibili, si saltano */ }
      else if (q < 2 || !p.dondolo) { for (let y = yB - (r0 + 1) * th; y + th > su; y -= th) for (let x = x0; x < vw; x += lw) c.drawImage(p.tronchi, x, fermo(y), lw + piu, th + piu); }
      else {      // a fette: ogni fetta si sposta di poco, come un'onda che sale lungo i tronchi (il piede resta fermo)
        const dens = p.tronchi.width / 512, fk = FETTA * k, nf = p.T / FETTA;
        for (let r = r0, yr = yB - (r0 + 1) * th; yr + th > su; r++, yr -= th) for (let s = 0; s < nf; s++) {
          const ya = fermo(yr + s * fk), yb = fermo(yr + (s + 1) * fk);
          if (yb <= su || ya >= giu) continue;
          const alto = (r + 1) * p.T - (s + .5) * FETTA, dx = p.dondolo * k * Math.min(1, alto / 260) * Math.sin(v.t * .4 + alto * .0034 + p.fase);
          for (let x = x0 + dx - (dx > 0 ? lw : 0); x < vw; x += lw) c.drawImage(p.tronchi, 0, s * FETTA * dens, 512 * dens, FETTA * dens, fermo(x), ya, lw + piu, yb - ya);
        }
      }
      if (y0 < vh) {
        for (let x = x0; x < vw; x += lw) c.drawImage(p.suolo, x, y0, lw + piu, lh);
        if (yB < vh) { c.fillStyle = p.fondo; c.fillRect(0, yB - .5, vw, vh - yB + .5); }
      }
    }
    if (ys > -4 && ys < vh) {      // la chioma lontana, appesa sotto il pelo dell'acqua
      const k = 1 + (z - 1) * .8, lw = 512 * k, lh = 128 * k, x0 = fermo(-((((cam.x * .7 * k + 140) % lw) + lw) % lw));
      for (let x = x0; x < vw; x += lw) c.drawImage(sc.co.chiomaLontana, x, fermo(ys - 2), lw + .6, lh);
    }
    c.restore();
  },

  /* Misure di mondo, dietro alle creature: cielo, massi, pareti, fasci di luce, kelp, superficie e chiome, fondale. */
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
    if (v.qualita > 0 && ya < 2200) fasci(c, v, sc, xa, xb, ya, yb);
    bosco(c, v, sc.lontane, TINTE_LONTANE, xa, xb, ya, yb);
    if (yb > H - 340) fondaleDietro(c, v, sc, xa, xb);
    bosco(c, v, sc.vicine, TINTE_VICINE, xa, xb, ya, yb);
    if (v.qualita > 0 && yb > H - 1300) { c.fillStyle = sfuma(c, 'rgba(6,58,54,0)', 'rgba(6,58,54,.3)', H - 1300, H); c.fillRect(xa - 4, Math.max(ya - 4, H - 1300), xb - xa + 8, Math.min(yb, H + 30) - Math.max(ya - 4, H - 1300)); }      // il buio del fondo
    if (ya < 520) superficie(c, v, sc, xa, xb);
    if (yb > H - 340) fondaleDavanti(c, v, sc, xa, xb, ya, yb);
    c.restore();
  },

  /* Misure di mondo, davanti alle creature: pochissime fronde sfocate, bollicine e pulviscolo verde-oro. */
  davanti(c, v, sc) {
    if (!sc || v.qualita === 0) return;
    const cam = v.cam, z = cam.z, t = v.t, H = sc.H, mw = v.vw / 2 / z, mh = v.vh / 2 / z, ya = cam.y - mh, yb = cam.y + mh;
    c.save();
    c.globalAlpha = .55; c.globalCompositeOperation = 'multiply';      // chiare e fuori fuoco: scuriscono appena ciò che hanno dietro, senza nascondere pesci e numeri
    for (const e of sc.fronde) {
      const f = e.f, x = e.x + (e.x - cam.x) * .1, w = f.w * e.s, h = f.h * e.s;     // scorrono un po' più del mondo: sono più vicine
      if (!v.visibile(x, e.lato ? e.y : e.y - h / 2, Math.max(w, h) * .7)) continue;
      c.save(); c.translate(x, e.y);
      if (e.lato) c.transform(e.specchio ? -1 : 1, Math.sin(t * .5 + e.fase) * .05, 0, 1, 0, 0); else c.transform(e.specchio ? -1 : 1, 0, Math.sin(t * .6 + e.fase) * .07, 1, 0, 0);
      c.drawImage(f.im, -f.ax * e.s, -f.ay * e.s, w, h); c.restore();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // colonne di bollicine che salgono dal fondale
    c.fillStyle = 'rgba(244,255,240,.3)'; c.beginPath();
    for (const s of sc.sorgenti) {
      if (!v.visibile(s.x, s.y - s.alt / 2, s.alt / 2 + 20)) continue;
      for (let i = 0; i < 6; i++) {
        const u = (t * .1 + s.f + i / 6) % 1, y = s.y - u * s.alt;
        if (y < ya - 10 || y > yb + 10) continue;
        const x = s.x + Math.sin(u * 11 + i * 2.1) * 12 * u + Math.sin(t * 1.7 + i) * 2, r = (1.5 + u * 2.4 + rumore(i, 3) * 1.3) * (u > .85 ? (1 - u) / .15 : 1);
        c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
      }
    }
    // bollicine sparse: salgono piano e seguono la visuale un po' più in fretta del mondo
    const lw = mw * 2.3, lh = mh * 2.3, rz = 1 / Math.sqrt(z);
    for (let i = 0; i < 10; i++) {
      const fx = (((rumore(i, 51) * lw - cam.x * .25) % lw) + lw) % lw, fy = (((rumore(i, 53) * lh - cam.y * .25 - t * (14 + rumore(i, 55) * 20)) % lh) + lh) % lh;
      const x = cam.x - lw / 2 + fx + Math.sin(t * 1.3 + i * 1.9) * 5, y = cam.y - lh / 2 + fy, r = (1.2 + rumore(i, 57) * 2) * rz;
      if (y < 6 || y > H) continue;      // solo nell'acqua
      c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
    }
    c.fill();
    // pulviscolo verde-oro che scende piano
    c.fillStyle = 'rgba(232,240,170,.3)'; c.beginPath();
    for (let i = 0; i < 26; i++) {
      const fx = (((rumore(i, 61) * lw - cam.x * .4 + Math.sin(t * .2 + i) * 20) % lw) + lw) % lw, fy = (((rumore(i, 63) * lh - cam.y * .4 + t * (4 + rumore(i, 65) * 7)) % lh) + lh) % lh;
      const x = cam.x - lw / 2 + fx, y = cam.y - lh / 2 + fy, r = (1.1 + rumore(i, 67) * 1.8) * rz;
      if (y < 6 || y > H) continue;
      c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
    }
    c.fill();
    c.restore();
  },

  /* Misure di schermo, sopra tutto: lame di sole leggere, riflessi di luce verso la superficie, bordi appena più scuri. */
  velo(c, v, sc) {
    if (!sc) return;
    const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, t = v.t, prof = limita(cam.y / sc.H, 0, 1), ys = vh / 2 - cam.y * z;
    c.save();
    if (v.qualita > 0) {
      lame(c, v, LAME_VELO, .1 - prof * .05, .7, ys + 6);
      const strati = prof < .15 ? 2 : prof < .34 ? 1 : 0;      // riflessi di luce: due reti che si incrociano vicino alla superficie, una più giù, poi niente (sul fondo li fa la ghiaia)
      if (strati) {
        const dpr = v.dpr || 1, fermo = n => Math.round(n * dpr) / dpr, lato = sc.co.luce.width / 2, su = Math.max(0, ys + 4);
        if (su > 0) { c.beginPath(); c.rect(0, su, vw, vh - su); c.clip(); }
        for (let g = 0; g < strati; g++) {
          const ox = fermo(-((((cam.x * z * .45 + (g ? 97 - t * 5 : t * 6)) % lato) + lato) % lato)), oy = fermo(-((((cam.y * z * .45 + (g ? 61 + t * 3 : -t * 4)) % lato) + lato) % lato));
          for (let y = oy; y < vh; y += lato) { if (y + lato < su) continue; for (let x = ox; x < vw; x += lato) c.drawImage(sc.co.luce, x, y, lato, lato); }
        }
      }
    }
    c.restore();
    c.save();
    if (v.qualita > 0) {
      const vg = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * .55, vw / 2, vh / 2, Math.max(vw, vh) * .8);
      vg.addColorStop(0, 'rgba(4,50,46,0)'); vg.addColorStop(1, 'rgba(4,50,46,.34)');
      c.fillStyle = vg; c.fillRect(0, 0, vw, vh);
    } else {
      c.fillStyle = sfuma(c, 'rgba(4,50,46,.26)', 'rgba(4,50,46,0)', 0, vh * .22); c.fillRect(0, 0, vw, vh * .22);
    }
    c.restore();
  },
});
})();
