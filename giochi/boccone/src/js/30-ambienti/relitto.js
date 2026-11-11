/* Boccone — ambiente «Il relitto» (id: relitto). Contratto: ARCHITETTURA.md §4.

   Stessa ossatura della laguna e della foresta di alghe (attrezzi → pittori → corredo di tele dipinte una volta sola →
   crea() che dispone → passate che quasi soltanto copiano). Qui il protagonista è il GALEONE: un veliero di legno spezzato
   in due tronconi, adagiato sul fondo, che fa da sfondo ravvicinato dietro ai pesci. Il mondo è largo e basso.

   Piani, dal più lontano: acqua verde petrolio (sfumatura) · lame di luce deboli · tre piani di scogli e di altri relitti,
   velati, in parallasse (sfondo) · cielo coperto, isolotti, nuvole · grandi scogli velati ai due capi del mondo · pareti
   di roccia · fila di dietro e dorsale di fango · il galeone (alberi, pennoni, poppa, prua: tele; sartie, cime, vele
   strappate, fiamma in testa d'albero e aloni delle finestre: dal vivo) · buio del fondo · pelo dell'acqua · prima fila
   (rocce, casse, botti, anfore, il cannone, il forziere…) · sabbia · luce sul fondo · monete, cime, assi posate sulla
   sabbia (dietro) · una cima e un brandello di rete ai bordi, bollicine, pulviscolo (davanti) · lame leggere, foschia
   verde in basso, bordi scuri (velo).

   Come è fatto il galeone. Si dipinge in «coordinate di nave» (x da poppa a prua, y = 0 alla chiglia, in su negativo); ogni
   troncone è ruotato di pochi gradi attorno a un perno della chiglia e la rotazione sta già DENTRO le tele, così nel
   fotogramma si copia pari pari (2 pixel per unità, su mezze unità: con lo schermo a 2x è una copia 1:1).
   Una figura più grande di 1024 pixel passa da mosaico(): una passata piccolissima dice dove c'è colore, poi si dipinge una
   tela per ogni cella non vuota, ritagliata su quello che contiene. Il pittore viene chiamato più volte: usa solo casi a
   seme fisso. I pennoni, lunghi e sottili, stanno ciascuno in una tela dritta e si copiano ruotati (in una tela storta
   sprecherebbero dieci volte i pixel). Ciò che si muove (vele, cime che pendono, fiamma) è un tracciato per colore:
   costa pochissimo. Le finestre accese si dipingono DOPO il velo d'acqua, così restano calde; l'alone che tremola è una
   tela piccola con la trasparenza dentro.

   Costi imparati qui (oltre a quelli scritti in cima alla laguna e alle alghe):
   - con la visuale larga quasi tutto il costo sono le copie rimpicciolite e filtrate: lì la sabbia profonda (1 pixel per
     unità) si copia senza filtro, la rete di luce passa da due strati a uno e gli aloni non tremolano più;
   - una sfumatura tonda a tutto schermo per scurire i bordi costa 1,6: tre fasce sfumate (in alto e ai lati) fanno lo
     stesso lavoro con meno della metà;
   - le lame di luce costano quanto l'area che coprono anche quando non si vedono quasi più: sotto una certa profondità
     si saltano;
   - le figurine della fila di dietro a 1 pixel per unità: sono lontane, un po' sfocate stanno bene, e i pixel si dividono
     per quattro. */
(() => {
'use strict';
const B = window.B, U = B.util, TAU = Math.PI * 2, PI = Math.PI, limita = U.limita, rumore = U.rumore;

const S = 2;              // pixel per unità di mondo nelle tele vicine
const OLTRE = 1700;       // fin dove si dipinge fuori dal mondo
const AGIO = 48;          // quanto si dipinge oltre il bordo della visuale (lo schermo che trema sposta il mondo)
const PARETE_L = 192;     // larghezza delle strisce di roccia ai lati
const PEND = .22;         // pendenza delle lame di luce
const ACQUA = '#1c6f6d';  // il velo d'acqua a mezza altezza
const FONDA = '#0e484c';  // l'acqua vicino al fondo: vela ciò che sta laggiù
const NOTTE = '#062a30';  // verso dove virano le ombre
const VELO_FONDO = .14;

// ---------------------------------------------------------------- colori
const memoRgb = {};
function rgb(h) { return memoRgb[h] || (memoRgb[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]); }
function esa(r, g, b) { return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1); }
function mesc(a, b, t) { const p = rgb(a), q = rgb(b); return esa(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); }
function alfa(h, a) { const p = rgb(h); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; }
const chiaro = (c, t) => mesc(c, '#ffffff', t), scuro = (c, t) => mesc(c, NOTTE, t);

const LEGNO = '#7d6852', FASCIA = '#5c4a3c', OCRA = '#b89a5c', ROSSO = '#98584a', OTTONE = '#a39262', BRONZO = '#6f9482';
const RUGGINE = '#9d5f3d', FERRO = '#5d5650', TELA = '#c9cdb2', CORDA = '#958b6c';
const VERDI = ['#587f68', '#6f9a70', '#4a7468', '#86a878'];
const MOLLI = ['#ab8b8e', '#bfa26e', '#8d88ad', '#7fae9f'];
const PIETRA = ['#5d7774', '#6a7f76', '#4f6c6c'];

/* Il colore dell'acqua secondo la profondità (0 = superficie, 1 = fondale): verde petrolio che scende quasi a notte. */
const RAMPA = [[-.25, '#9cc9b8'], [0, '#5fae9d'], [.2, '#33897f'], [.48, '#1b6a69'], [.78, '#0f4c50'], [1, '#0a3b41'], [1.45, '#062a30']].map(p => [p[0], rgb(p[1])]);
function tinta(u) {
  let i = 1;
  while (i < RAMPA.length - 1 && u > RAMPA[i][0]) i++;
  const a = RAMPA[i - 1], b = RAMPA[i], k = limita((u - a[0]) / (b[0] - a[0]), 0, 1);
  return 'rgb(' + Math.round(a[1][0] + (b[1][0] - a[1][0]) * k) + ',' + Math.round(a[1][1] + (b[1][1] - a[1][1]) * k) + ',' + Math.round(a[1][2] + (b[1][2] - a[1][2]) * k) + ')';
}

// ---------------------------------------------------------------- profili che non cambiano (li usano tele e disposizione)
const duna = x => 8 + 9 * Math.sin(x * TAU / 1024 + 1.2) + 5 * Math.sin(x * TAU / 1024 * 3 + .4) + 2.5 * Math.sin(x * TAU / 1024 * 7 + 2.6);     // sabbia davanti: da -8 a 25 sotto il fondale
const dorsale = x => -30 + 12 * Math.sin(x * TAU / 512 + 2.4) + 6 * Math.sin(x * TAU / 512 * 3 + .9);                                          // fango dietro: da -48 a -12
const onda = (x, t) => 7 * Math.sin(x * .013 + t * .9) + 4 * Math.sin(x * .031 - t * 1.4 + 1.3) + 2.2 * Math.sin(x * .0067 + t * .45) + 1.4 * Math.sin(x * .071 + t * 2.1);   // mare un po' mosso
const ciglio = y => -40 + 18 * Math.sin(y / 190 + 2) + 9 * Math.sin(y / 71 + .6) + 4 * Math.sin(y / 31 + 1.5);                                 // faccia della parete: da -71 a -9
const mezzo = n => Math.round(n * 2) / 2;

// ---------------------------------------------------------------- tele e figurine
let pixel = 0;
function tela(w, h) { const im = U.tela(Math.min(1024, w), Math.min(1024, h)); pixel += im.width * im.height; return im; }
function penna(im) { const x = im.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; return x; }
function vela(im, col, a) { const x = im.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = alfa(col, a); x.fillRect(0, 0, im.width, im.height); x.restore(); }

/* Una figurina ritagliata: chi disegna usa unità di mondo; (ax, ay) dice dove sta l'origine dentro la tela. */
function ritaglio(x0, y0, x1, y1, disegna, scala = S) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  const w = x1 - x0, h = y1 - y0, im = tela(w * scala, h * scala), x = penna(im);
  x.scale(scala, scala); x.translate(-x0, -y0);
  disegna(x);
  return { im, w, h, ax: -x0, ay: -y0 };
}
/* Figurina con l'origine nel piede (centro, in basso), velata dall'acqua del fondo. */
function figurina(w, h, piede, disegna, scala = S, velo = VELO_FONDO) { const f = ritaglio(-w / 2, piede - h, w / 2, piede, disegna, scala); if (velo) vela(f.im, FONDA, velo); return f; }
/* La stessa figurina per la fila di dietro: più piccola, allo specchio, più velata e a 1 pixel per unità (è lontana: un po'
   sfocata sta bene, e costa un quarto dei pixel). */
function lontana(f, k = .74, velo = .4, col = FONDA) {
  const w = Math.round(f.w * k), h = Math.round(f.h * k), im = tela(w, h), x = im.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.translate(im.width, 0); x.scale(-1, 1); x.drawImage(f.im, 0, 0, im.width, im.height);
  vela(im, col, velo);
  return { im, w, h, ax: w - f.ax * k, ay: f.ay * k };
}
/* Una figura grande, divisa in tele di al più `cella` unità di lato. Prima una passata piccolissima per capire dove c'è
   colore; poi una tela per ogni cella non vuota, ritagliata su ciò che contiene. Il pittore viene chiamato più volte e deve
   dare sempre lo stesso disegno. Restituisce i pezzi con posto e misure in unità (x, y interi). */
function mosaico(x0, y0, x1, y1, dipingi, scala = S, cella = 512) {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  const R = 8, mw = Math.ceil((x1 - x0) / R), mh = Math.ceil((y1 - y0) / R), m = U.tela(mw, mh), mx = m.getContext('2d', { willReadFrequently: true });
  mx.lineCap = 'round'; mx.lineJoin = 'round'; mx.scale(1 / R, 1 / R); mx.translate(-x0, -y0); dipingi(mx);
  const d = mx.getImageData(0, 0, mw, mh).data, pezzi = [];
  for (let cy = y0; cy < y1; cy += cella) for (let cx = x0; cx < x1; cx += cella) {
    const i0 = (cx - x0) / R, i1 = Math.min(mw, i0 + cella / R), j0 = (cy - y0) / R, j1 = Math.min(mh, j0 + cella / R);
    let a = 1e9, b = -1, c = 1e9, e = -1;
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (d[(j * mw + i) * 4 + 3] > 0) { if (i < a) a = i; if (i > b) b = i; if (j < c) c = j; if (j > e) e = j; }
    if (b < 0) continue;
    const px0 = Math.max(cx, x0 + (a - 1) * R), px1 = Math.min(cx + cella, x1, x0 + (b + 2) * R), py0 = Math.max(cy, y0 + (c - 1) * R), py1 = Math.min(cy + cella, y1, y0 + (e + 2) * R);
    const im = tela((px1 - px0) * scala, (py1 - py0) * scala), x = penna(im);
    x.scale(scala, scala); x.translate(-px0, -py0); dipingi(x);
    pezzi.push({ im, x: px0, y: py0, w: px1 - px0, h: py1 - py0 });
  }
  return pezzi;
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
/* Aggiunge al tracciato la linea y = f(x) da xa a xb (anche all'indietro). */
function lungo(x, f, xa, xb, passo, primo) {
  const n = Math.max(1, Math.round(Math.abs(xb - xa) / passo));
  for (let i = 0; i <= n; i++) { const px = xa + (xb - xa) * i / n; if (i === 0 && primo) x.moveTo(px, f(px)); else x.lineTo(px, f(px)); }
}
/* Un palo tondo (albero, pennone, trave) da un punto all'altro: più chiaro da un lato, più scuro dall'altro. */
function palo(x, x0, y0, x1, y1, w0, w1, tono) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  const fetta = (a, b, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(x0 + nx * w0 * a, y0 + ny * w0 * a); x.lineTo(x1 + nx * w1 * a, y1 + ny * w1 * a); x.lineTo(x1 + nx * w1 * b, y1 + ny * w1 * b); x.lineTo(x0 + nx * w0 * b, y0 + ny * w0 * b); x.closePath(); x.fill(); };
  fetta(-1, 1, tono); fetta(-1, -.35, alfa(chiaro(tono, .3), .55)); fetta(.3, 1, alfa(scuro(tono, .6), .5));
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

// ---------------------------------------------------------------- incrostazioni: alghe, coralli molli, cirripedi, muschio
function alghetta(x, caso, tipo, r, col) {
  if (tipo === 0) {            // foglie larghe e arricciate
    const n = 3 + Math.floor(caso() * 3);
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? i / (n - 1) - .5 : 0, lun = r * (.7 + caso() * .4) * (1 - Math.abs(u) * .3);
      x.save(); x.rotate(u * 1.6 + (caso() - .5) * .2);
      x.fillStyle = sfuma(x, scuro(col, .4), chiaro(col, .06), 2, -lun);
      x.beginPath(); liscia(x, puntiMacchia(0, -lun * .52, lun * .28, lun * .54, caso, .2, 9)); x.fill();
      x.strokeStyle = alfa(chiaro(col, .4), .4); x.lineWidth = 1.6; x.stroke();
      x.restore();
    }
  } else {                     // ciuffo di fili
    const n = 6 + Math.floor(caso() * 4);
    for (let pass = 0; pass < 2; pass++) {
      x.fillStyle = pass ? chiaro(col, .12) : scuro(col, .25); x.beginPath();
      for (let i = pass; i < n; i += 2) { const u = i / (n - 1) - .5, h = r * (.7 + caso() * .5), pg = u * r * 1.1 + (caso() - .5) * 8, bx = u * r * .5, w = 2.4 + caso() * 1.4; x.moveTo(bx - w, 3); x.quadraticCurveTo(bx + pg * .3 - w, -h * .55, bx + pg, -h); x.quadraticCurveTo(bx + pg * .3 + w, -h * .55, bx + w, 3); }
      x.fill();
    }
  }
}
/* Corallo molle: un ventaglio di dita sottili con la punta chiara (poche e grosse sembrano un guanto). */
function molle(x, caso, r, col) {
  const n = 7 + Math.floor(caso() * 4), dita = [];
  for (let i = 0; i < n; i++) { const u = i / (n - 1) - .5, a = -PI / 2 + u * 2.3 + (caso() - .5) * .16, l = r * (.55 + caso() * .5) * (1 - Math.abs(u) * .35); dita.push([Math.cos(a) * l, Math.sin(a) * l, r * (.07 + caso() * .035)]); }
  for (let pass = 0; pass < 2; pass++) { x.strokeStyle = pass ? col : scuro(col, .4); for (const d of dita) { x.lineWidth = d[2] * (pass ? 2 : 2.8); x.beginPath(); x.moveTo(d[0] * .12, 2); x.quadraticCurveTo(d[0] * .3, d[1] * .55, d[0], d[1]); x.stroke(); } }
  x.fillStyle = alfa(chiaro(col, .45), .8); x.beginPath(); for (const d of dita) ovale(x, d[0] - d[2] * .2, d[1] - d[2] * .2, d[2] * .55, d[2] * .55); x.fill();
}
function cirripedi(x, caso, cx, cy, r, n) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = caso() * TAU, d = Math.sqrt(caso()) * r; p.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * .7, 1.6 + caso() * 2.4]); }
  x.fillStyle = alfa('#cfd4bb', .7); x.beginPath(); for (const q of p) ovale(x, q[0], q[1], q[2], q[2] * .85); x.fill();
  x.fillStyle = alfa('#44554e', .6); x.beginPath(); for (const q of p) ovale(x, q[0], q[1], q[2] * .42, q[2] * .34); x.fill();
}
/* Stende il muschio tra un orlo di fuori e uno di dentro (punti nello stesso ordine), con l'ombra sotto l'orlo. */
function stendiMuschio(x, fuori, dentro, col, su, giu) {
  const orlo = fuori.concat(dentro.slice().reverse());
  x.save(); x.translate(0, 4); x.fillStyle = alfa(NOTTE, .3); x.beginPath(); liscia(x, orlo); x.fill(); x.restore();
  x.fillStyle = sfuma(x, chiaro(col, .16), scuro(col, .36), su, giu); x.beginPath(); liscia(x, orlo); x.fill();
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
}
/* Un masso scuro con il muschio in cima, qualche ciuffo e un corallo molle. Origine nel piede. */
function masso(x, caso, w, h, tono, ciuffi = true) {
  const p = cupola(w, h, caso, .16, 8), n = p.length - 1;
  tracciaCupola(x, p, 18);
  const g = x.createLinearGradient(0, -h, 0, 16); g.addColorStop(0, chiaro(tono, .2)); g.addColorStop(.45, tono); g.addColorStop(1, scuro(tono, .6));
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  lucido(x, w * .3, -h * .1, w * .45, h * .55, 0, .4, NOTTE);
  x.strokeStyle = alfa(scuro(tono, .7), .24); x.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const cy = -h * (.1 + i * .17 + caso() * .08), f = caso() * TAU; x.beginPath(); for (let px = -w / 2; px <= w / 2 + 1; px += w / 8) x.lineTo(px, cy + Math.sin(px / w * 7 + f) * h * .06); x.stroke(); }
  const col = VERDI[Math.floor(caso() * VERDI.length)], fuori = [], dentro = [];
  for (let i = 0; i <= n; i++) { const s = Math.pow(Math.sin(PI * i / n), .7) * (.3 + caso() * .25); fuori.push([p[i][0] * 1.1, p[i][1] * 1.1 - 3]); dentro.push([p[i][0] * (1 - s * .45), p[i][1] * (1 - s)]); }
  stendiMuschio(x, fuori, dentro, col, -h * 1.05, -h * .3);
  lucido(x, -w * .16, -h * .8, w * .3, h * .22, -.2, .22);
  cirripedi(x, caso, w * (caso() - .5) * .5, -h * .3, w * .12, 6);
  x.restore();
  if (ciuffi) for (let i = 2; i < p.length - 2; i++) if (caso() < .55) {
    const s = .34 + caso() * .3, r = caso();
    x.save(); x.translate(p[i][0] * .86, p[i][1] * .8); x.rotate(p[i][0] / w * .9); x.scale(s, s);
    if (r < .3) molle(x, caso, 40, MOLLI[Math.floor(caso() * MOLLI.length)]); else alghetta(x, caso, r < .65 ? 0 : 1, 42, VERDI[Math.floor(caso() * VERDI.length)]);
    x.restore();
  }
  return p;
}

// ---------------------------------------------------------------- il galeone: misure in coordinate di nave
const N_CORSI = 14;                                                  // i corsi di tavole tra chiglia e murata
const carena = x => x < 130 ? -64 * Math.pow((130 - x) / 130, 2) : x > 1470 ? -310 * Math.pow((x - 1470) / 230, 1.7) : 0;
const cinta = x => -(288 + 46 * Math.pow((x - 900) / 900, 2));       // l'orlo della murata
const corso = (x, i) => carena(x) + (cinta(x) - carena(x)) * i / N_CORSI;
/* I corrimani dei castelli: salgono verso poppa e verso prua più in fretta della murata. */
const cassero = x => cinta(x) - 92 - 14 * Math.pow(Math.max(0, 560 - x) / 630, 2), casseretto = x => cinta(x) - 184 - 44 * Math.pow(Math.max(0, 280 - x) / 350, 2), castello = x => cinta(x) - 78 - 26 * Math.pow(Math.max(0, x - 1360) / 340, 2);
/* Dove finisce ogni corso di tavole sulla rottura dei due tronconi. */
const ROTTA = { poppa: [], prua: [] };
for (let i = 0; i < N_CORSI; i++) { ROTTA.poppa.push(985 + (rumore(i, 71) - .5) * 70 - Math.abs(i - 6) * 2.5); ROTTA.prua.push(1110 + (rumore(i, 72) - .5) * 70 + Math.abs(i - 7) * 2.5); }
/* Un troncone: le coordinate di nave ruotano di `ang` attorno al perno (perno, 0) della chiglia, che sta `giu` unità sotto
   la linea del fondale. L'origine del troncone è sulla linea del fondale, sopra il perno. */
const POPPA = { perno: 500, giu: 36, ang: .055 }, PRUA = { perno: 1300, giu: 42, ang: -.105 };
function inNave(x, tr, fn) { x.save(); x.translate(0, tr.giu); x.rotate(tr.ang); x.translate(-tr.perno, 0); fn(); x.restore(); }
function daNave(tr, sx, sy) { const c = Math.cos(tr.ang), s = Math.sin(tr.ang), dx = sx - tr.perno; return [dx * c - sy * s, tr.giu + dx * s + sy * c]; }
/* Gli alberi ancora in piedi sul troncone di poppa: il maestro e, sul casseretto, la mezzana con il suo pennone obliquo.
   Misure lungo l'albero (u di traverso, v in su negativo). */
const MAESTRO = { x: 760, piede: -236, incl: .03, basso: 470, alto: 800, cima: 1080, coffa: true,
  pennoni: [{ u: 0, v: -310, m: 235, incl: -.13 }, { u: 6, v: -640, m: 160, incl: .1 }, { u: 54, v: -838, m: 84, incl: 1.02 }] };
const MEZZANA = { x: 205, piede: casseretto(205) + 40, incl: -.05, basso: 380, alto: 0, cima: 0, coffa: false, pennoni: [{ u: -16, v: -270, m: 185, incl: .74 }] };
const ALBERI = [MAESTRO, MEZZANA];
function daAlbero(al, u, v) { const c = Math.cos(al.incl), s = Math.sin(al.incl); return [al.x + u * c - v * s, al.piede + u * s + v * c]; }
/* Le finestre e gli oblò accesi (coordinate di nave). */
const finestre = (lista, y, w, h, forza) => lista.map(px => ({ x: px, y: y(px), w, h, tondo: false, forza }));
const obloi = (lista, y, r, forza) => lista.map(px => ({ x: px, y: y(px), w: r * 2, h: r * 2, tondo: true, forza }));
const LUCI_POPPA = [...finestre([-30, 4, 38], p => -362 + p * .03, 20, 32, 1), ...finestre([110, 165, 220], p => cinta(p) - 54, 22, 30, 1), ...obloi([350, 430], p => cinta(p) - 52, 10, .6),
  ...obloi([40, 120, 200], p => cinta(p) - 128, 11, .8), ...obloi([120, 215], p => corso(p, 9.4), 11, .7)];
const LUCI_PRUA = [...obloi([1430, 1520, 1610], p => cinta(p) - 50, 10, .7), ...obloi([1570], p => corso(p, 9.4), 10, .5)];
const FANALE = { x: -96, y: casseretto(-68) - 40 };

function sagomaPoppa(x) {
  const R = ROTTA.poppa;
  x.beginPath(); x.moveTo(R[0], 8);
  lungo(x, carena, 960, 0, 30);                                       // la chiglia fino al dritto di poppa
  x.lineTo(-10, -215); x.quadraticCurveTo(-22, -262, -44, -300);      // la volta
  x.lineTo(-68, casseretto(-68) + 22);
  lungo(x, p => casseretto(p) + 22, -68, 280, 29);
  lungo(x, p => cassero(p) + 22, 280, 560, 28);
  lungo(x, cinta, 560, R[N_CORSI - 1], 30);
  for (let i = N_CORSI - 1; i >= 0; i--) { const e = R[i], yt = corso(e, i + 1), yb = corso(e, i); x.lineTo(e, yt); x.lineTo(e + 5 + 9 * rumore(i, 73), (yt + yb) / 2); x.lineTo(e - 2, yb); }
  x.closePath();
}
function sagomaPrua(x) {
  const R = ROTTA.prua;
  x.beginPath(); x.moveTo(R[N_CORSI - 1], cinta(R[N_CORSI - 1]));
  lungo(x, cinta, R[N_CORSI - 1], 1360, 30);
  lungo(x, p => castello(p) + 22, 1360, 1692, 30);
  x.lineTo(1714, -376); x.lineTo(1706, -322);
  lungo(x, carena, 1700, 1470, 14);                                   // la ruota di prua
  x.lineTo(R[0] + 2, 8);
  for (let i = 0; i < N_CORSI; i++) { const e = R[i], yt = corso(e, i + 1), yb = corso(e, i); x.lineTo(e + 2, yb); x.lineTo(e - 5 - 9 * rumore(i, 74), (yt + yb) / 2); x.lineTo(e, yt); }
  x.closePath();
}
/* Una costola: sale dal fondo piegandosi. */
function costola(x, px, alt, piega, sp, tono) {
  x.strokeStyle = scuro(tono, .45); x.lineWidth = sp; x.beginPath(); x.moveTo(px, 12); x.quadraticCurveTo(px - piega, -alt * .5, px + piega * .6, -alt); x.stroke();
  x.strokeStyle = chiaro(tono, .06); x.lineWidth = sp * .46; x.beginPath(); x.moveTo(px - sp * .2, 12); x.quadraticCurveTo(px - piega - sp * .2, -alt * .5, px + piega * .6 - sp * .12, -alt + 2); x.stroke();
}
/* Dietro allo scafo, sulla rottura: la chiglia che continua, i bagli dei ponti che sporgono, le costole rimaste nude. */
function costoleRottura(x, poppa) {
  const lista = poppa ? [[1004, 262], [1040, 232], [1074, 180], [1104, 118]] : [[1094, 250], [1060, 196], [1030, 130]], verso = poppa ? 1 : -1;
  x.fillStyle = scuro(LEGNO, .45);
  if (poppa) x.fillRect(940, -16, 190, 30); else x.fillRect(1004, -16, 150, 30);
  for (const [py, lun] of [[-236, poppa ? 70 : 52], [-128, poppa ? 44 : 78]]) { const x0 = poppa ? 950 : 1150, x1 = (poppa ? 985 : 1110) + verso * lun; palo(x, Math.min(x0, x1), py, Math.max(x0, x1), py + 3, 5.5, 5, scuro(LEGNO, .25)); }
  for (const [px, alt] of lista) costola(x, px + 22, alt * .8, verso * 9, 11, scuro(LEGNO, .34));      // quelle dell'altro fianco, più scure
  for (const [px, alt] of lista) costola(x, px, alt, verso * 15, 13, LEGNO);
  if (poppa) { palo(x, 980, -84, 1090, -80, 5.5, 5.5, chiaro(LEGNO, .03)); palo(x, 985, -168, 1056, -164, 5.5, 5.5, chiaro(LEGNO, .03)); }      // tavole ancora inchiodate
  else palo(x, 1040, -92, 1116, -96, 5.5, 5.5, chiaro(LEGNO, .03));
}
function timone(x) {
  x.fillStyle = sfuma(x, chiaro(LEGNO, .14), scuro(LEGNO, .22), -240, -16);
  x.beginPath(); x.moveTo(-6, -240); x.lineTo(-30, -240); x.lineTo(-36, -184); x.quadraticCurveTo(-40, -130, -56, -104); x.lineTo(-60, -24); x.lineTo(10, -18); x.lineTo(10, -240); x.closePath(); x.fill();
  x.strokeStyle = alfa(scuro(LEGNO, .7), .45); x.lineWidth = 1.6; x.beginPath(); x.moveTo(-18, -236); x.lineTo(-20, -24); x.moveTo(-40, -120); x.lineTo(-42, -26); x.stroke();
  x.strokeStyle = alfa(chiaro(LEGNO, .5), .4); x.lineWidth = 2; x.beginPath(); x.moveTo(-31, -238); x.lineTo(-37, -184); x.quadraticCurveTo(-41, -130, -57, -104); x.lineTo(-61, -26); x.stroke();
  for (const py of [-212, -150, -88, -40]) {      // le ferramenta arrugginite che lo tengono al dritto di poppa
    x.fillStyle = RUGGINE; x.fillRect(-24, py, 34, 8); x.fillStyle = alfa(chiaro(RUGGINE, .35), .7); x.fillRect(-24, py, 34, 2.5);
    x.fillStyle = scuro(RUGGINE, .4); x.beginPath(); ovale(x, -19, py + 4, 1.8, 1.8); ovale(x, -9, py + 4, 1.8, 1.8); x.fill();
  }
}
function forma(x, l, piu) {
  const w = l.w / 2 + piu, h = l.h / 2 + piu;
  x.beginPath();
  if (l.tondo) ovale(x, l.x, l.y, w, h); else { x.moveTo(l.x - w, l.y + h); x.lineTo(l.x - w, l.y - h + w); x.arc(l.x, l.y - h + w, w, PI, 0); x.lineTo(l.x + w, l.y + h); x.closePath(); }
}
/* Il telaio di una finestra o di un oblò (il vetro acceso si dipinge dopo il velo). */
function telaio(x, l) {
  forma(x, l, 4); x.fillStyle = l.tondo ? sfuma(x, chiaro(OTTONE, .2), scuro(OTTONE, .3), l.y - l.h, l.y + l.h) : chiaro(LEGNO, .16); x.fill();
  forma(x, l, 0); x.fillStyle = '#0a2e33'; x.fill();
}
function vetro(x, l) {
  lucido(x, l.x, l.y, l.w * 1.5, l.w * 1.5, 0, .22 * l.forza, '#ffc978');
  forma(x, l, 0); x.fillStyle = sfuma(x, alfa('#ffe6ae', .5 + .4 * l.forza), alfa('#e8a25e', .45 + .4 * l.forza), l.y - l.h / 2, l.y + l.h / 2); x.fill();
  x.strokeStyle = alfa('#4a3626', .7); x.lineWidth = 1.8; x.beginPath(); x.moveTo(l.x, l.y - l.h / 2); x.lineTo(l.x, l.y + l.h / 2); x.moveTo(l.x - l.w / 2, l.y + (l.tondo ? 0 : 2)); x.lineTo(l.x + l.w / 2, l.y + (l.tondo ? 0 : 2)); x.stroke();
}
function fanale(x, acceso) {
  const fx = FANALE.x, fy = FANALE.y;
  if (!acceso) {
    x.strokeStyle = RUGGINE; x.lineWidth = 4; x.beginPath(); x.moveTo(-64, fy + 54); x.quadraticCurveTo(-94, fy + 48, fx, fy + 18); x.stroke();
    x.fillStyle = scuro(RUGGINE, .2); x.beginPath(); x.moveTo(fx - 14, fy - 15); x.lineTo(fx, fy - 30); x.lineTo(fx + 14, fy - 15); x.closePath(); x.fill();
    x.fillRect(fx - 11, fy + 13, 22, 6);
    x.fillStyle = '#0a2e33'; x.fillRect(fx - 10, fy - 16, 20, 30);
    x.fillStyle = OTTONE; x.beginPath(); ovale(x, fx, fy - 33, 3.4, 3.4); x.fill();
  } else {
    lucido(x, fx, fy, 44, 44, 0, .26, '#ffc978');
    x.fillStyle = sfuma(x, alfa('#ffe6ae', .9), alfa('#e8a25e', .85), fy - 16, fy + 14); x.fillRect(fx - 9, fy - 15, 18, 28);
    x.strokeStyle = alfa('#4a3626', .7); x.lineWidth = 2; x.beginPath(); x.moveTo(fx - 3, fy - 15); x.lineTo(fx - 3, fy + 13); x.moveTo(fx + 3, fy - 15); x.lineTo(fx + 3, fy + 13); x.stroke();
  }
}
function balaustra(x, f, xa, xb) {
  x.strokeStyle = scuro(LEGNO, .12); x.lineWidth = 4.5; x.beginPath();
  for (let px = xa + 6; px < xb - 3; px += 13) { x.moveTo(px, f(px) + 4); x.lineTo(px, f(px) + 22); }
  x.stroke();
  x.strokeStyle = chiaro(LEGNO, .08); x.lineWidth = 6.5; x.beginPath(); lungo(x, f, xa, xb, 30, true); x.stroke();
  x.strokeStyle = alfa(chiaro(LEGNO, .45), .5); x.lineWidth = 2; x.beginPath(); lungo(x, p => f(p) - 1.6, xa, xb, 30, true); x.stroke();
}
/* La polena: una testa di cavallo intagliata, con quel che resta della doratura. Origine dove si attacca allo sperone. */
function polena(x, px, py) {
  x.save(); x.translate(px, py);
  const col = mesc(OCRA, LEGNO, .3);
  x.fillStyle = scuro(col, .3); x.beginPath(); for (let i = 0; i < 5; i++) ovale(x, -12 + i * 5, 0 - i * 13, 9, 8); x.fill();      // la criniera a riccioli
  x.fillStyle = sfuma(x, chiaro(col, .22), scuro(col, .32), -66, 10);
  x.beginPath(); x.moveTo(-14, 10); x.quadraticCurveTo(-8, -30, 6, -50); x.quadraticCurveTo(14, -68, 32, -62); x.quadraticCurveTo(52, -54, 60, -36);
  x.quadraticCurveTo(60, -27, 49, -29); x.quadraticCurveTo(38, -34, 31, -26); x.quadraticCurveTo(26, -6, 12, 8); x.closePath(); x.fill();
  x.fillStyle = scuro(col, .2); x.beginPath(); x.moveTo(10, -56); x.lineTo(13, -76); x.lineTo(22, -60); x.closePath(); x.fill();        // l'orecchio
  x.fillStyle = alfa(NOTTE, .6); x.beginPath(); ovale(x, 33, -50, 3, 2.4); ovale(x, 55, -35, 1.6, 1.3); x.fill();
  x.strokeStyle = alfa(chiaro(col, .5), .5); x.lineWidth = 2; x.beginPath(); x.moveTo(-4, -10); x.quadraticCurveTo(4, -36, 16, -52); x.stroke();
  x.restore();
}
/* L'àncora: origine nella croce (dove i bracci incontrano il fuso), il fuso va in su. */
function ancora(x, lun) {
  const sp = lun * .07;
  x.strokeStyle = scuro(FERRO, .25); x.lineWidth = sp * 2; x.beginPath(); x.moveTo(-lun * .36, -lun * .27); x.quadraticCurveTo(-lun * .3, lun * .09, 0, lun * .06); x.quadraticCurveTo(lun * .3, lun * .09, lun * .36, -lun * .27); x.stroke();
  x.strokeStyle = alfa(RUGGINE, .7); x.lineWidth = sp * .8; x.beginPath(); x.moveTo(-lun * .37, -lun * .27); x.quadraticCurveTo(-lun * .31, lun * .06, 0, lun * .03); x.quadraticCurveTo(lun * .29, lun * .06, lun * .35, -lun * .27); x.stroke();
  x.fillStyle = FERRO; x.beginPath(); for (const v of [-1, 1]) { x.moveTo(v * lun * .37, -lun * .39); x.lineTo(v * lun * .47, -lun * .17); x.lineTo(v * lun * .26, -lun * .2); x.closePath(); } x.fill();      // le patte
  palo(x, 0, lun * .06, 0, -lun, sp, sp * .8, mesc(FERRO, RUGGINE, .35));
  palo(x, -lun * .3, -lun * .87, lun * .3, -lun * .91, sp * .95, sp * .95, scuro(LEGNO, .1));       // il ceppo di legno
  x.strokeStyle = mesc(FERRO, RUGGINE, .5); x.lineWidth = sp * .7; x.beginPath(); x.arc(0, -lun * 1.07, lun * .075, 0, TAU); x.stroke();     // l'anello
}
/* Una catena lungo una curva: anelli di fronte e di taglio, alternati. */
function catena(x, x0, y0, mx, my, x1, y1, passo, velo = 0) {
  const lun = Math.hypot(mx - x0, my - y0) + Math.hypot(x1 - mx, y1 - my), n = Math.max(2, Math.round(lun / passo)), anelli = [];
  for (let i = 0; i <= n; i++) { const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; anelli.push([a * x0 + b * mx + d * x1, a * y0 + b * my + d * y1, Math.atan2((1 - u) * (my - y0) + u * (y1 - my), (1 - u) * (mx - x0) + u * (x1 - mx))]); }
  x.strokeStyle = mesc(scuro(FERRO, .2), FONDA, velo); x.lineWidth = passo * .34; x.beginPath();
  for (let i = 0; i <= n; i += 2) ovale(x, anelli[i][0], anelli[i][1], passo * .62, passo * .36, anelli[i][2]);
  x.stroke();
  x.strokeStyle = mesc(mesc(FERRO, RUGGINE, .6), FONDA, velo); x.lineWidth = passo * .4; x.beginPath();
  for (let i = 1; i <= n; i += 2) { const q = anelli[i], c = Math.cos(q[2]) * passo * .5, s = Math.sin(q[2]) * passo * .5; x.moveTo(q[0] - c, q[1] - s); x.lineTo(q[0] + c, q[1] + s); }
  x.stroke();
}
/* Il velo d'acqua sul galeone: verso il fondo l'acqua è più scura e nasconde di più. Vale solo dove c'è già colore. */
function velaNave(x, su) {
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = sfuma(x, alfa(ACQUA, .36), alfa(FONDA, .5), su, 0); x.fillRect(-400, su - 400, 2800, 500 - su);
  x.globalCompositeOperation = 'source-over';
}

/* Un troncone dello scafo, in coordinate di nave. */
function dipingiScafo(x, poppa) {
  const caso = U.semi(poppa ? 701 : 702), tra = (a, b) => a + caso() * (b - a), uno = l => l[Math.floor(caso() * l.length)];
  const R = poppa ? ROTTA.poppa : ROTTA.prua, xa = poppa ? -70 : 1040, xb = poppa ? 1030 : 1720, luci = poppa ? LUCI_POPPA : LUCI_PRUA;

  // --- dietro allo scafo
  costoleRottura(x, poppa);
  if (poppa) timone(x);
  else {
    palo(x, 1540, -384, 1940, -590, 11, 6.5, scuro(LEGNO, .1));                                 // il bompresso
    x.strokeStyle = CORDA; x.lineWidth = 3; x.beginPath(); for (const u of [.36, .4, .44, .72, .76]) { const bx = 1540 + 400 * u, by = -384 - 206 * u; x.moveTo(bx - 5, by - 9); x.lineTo(bx + 5, by + 9); } x.stroke();
    palo(x, 1484, -230, 1478, -492, 15, 13, scuro(LEGNO, .12));                                 // il troncone dell'albero di trinchetto
    x.fillStyle = chiaro(LEGNO, .12); x.beginPath(); x.moveTo(1465, -488); x.lineTo(1468, -520); x.lineTo(1474, -498); x.lineTo(1480, -532); x.lineTo(1485, -500); x.lineTo(1490, -514); x.lineTo(1491, -488); x.closePath(); x.fill();
    x.fillStyle = RUGGINE; x.fillRect(1464, -420, 30, 6);
    // lo sperone con la polena
    x.fillStyle = sfuma(x, LEGNO, scuro(LEGNO, .45), -400, -290);
    x.beginPath(); x.moveTo(1688, -296); x.quadraticCurveTo(1790, -316, 1864, -384); x.lineTo(1858, -400); x.quadraticCurveTo(1780, -374, 1688, -364); x.closePath(); x.fill();
    x.strokeStyle = alfa(OCRA, .6); x.lineWidth = 3; x.beginPath(); x.moveTo(1700, -354); x.quadraticCurveTo(1790, -364, 1856, -396); x.moveTo(1700, -328); x.quadraticCurveTo(1790, -338, 1852, -380); x.stroke();
    polena(x, 1856, -390);
  }

  // --- lo scafo
  (poppa ? sagomaPoppa : sagomaPrua)(x);
  const g = x.createLinearGradient(0, -520, 0, 10); g.addColorStop(0, chiaro(LEGNO, .1)); g.addColorStop(.5, LEGNO); g.addColorStop(1, scuro(LEGNO, .5));
  x.fillStyle = g; x.fill();
  x.save(); x.clip();
  // le tavole: qualcuna più chiara, più scura o inverdita; i giunti; le commessure
  const giunti = [];
  for (let i = 0; i < N_CORSI; i++) for (let px = xa + tra(0, 120); px < xb; ) {
    const fine = Math.min(xb, px + tra(90, 230));
    if (caso() < .55) {
      x.fillStyle = uno([alfa(chiaro(LEGNO, .25), .3), alfa(scuro(LEGNO, .5), .28), alfa(VERDI[2], .26), alfa('#8a6a4c', .3)]);
      x.beginPath(); lungo(x, p => corso(p, i), px, fine, 30, true); lungo(x, p => corso(p, i + 1), fine, px, 30); x.closePath(); x.fill();
    }
    giunti.push([fine, i]); px = fine;
  }
  x.strokeStyle = alfa(scuro(LEGNO, .8), .4); x.lineWidth = 1.5; x.beginPath();
  for (const q of giunti) { x.moveTo(q[0], corso(q[0], q[1])); x.lineTo(q[0], corso(q[0], q[1] + 1)); }
  for (let i = 1; i < N_CORSI; i++) lungo(x, p => corso(p, i), xa, xb, 30, true);
  x.stroke();
  x.strokeStyle = 'rgba(255,255,240,.09)'; x.lineWidth = 1.3; x.beginPath();
  for (let i = 1; i < N_CORSI; i++) lungo(x, p => corso(p, i) + 2.4, xa, xb, 30, true);
  x.stroke();
  // le cinte: due fasce più spesse e più scure
  for (const [i0, i1] of [[6, 7], [10.4, 11.3]]) {
    x.fillStyle = alfa(scuro(FASCIA, .15), .85); x.beginPath(); lungo(x, p => corso(p, i0), xa, xb, 30, true); lungo(x, p => corso(p, i1), xb, xa, 30); x.closePath(); x.fill();
    x.strokeStyle = alfa(chiaro(LEGNO, .35), .4); x.lineWidth = 2; x.beginPath(); lungo(x, p => corso(p, i1) + 1.5, xa, xb, 30, true); x.stroke();
    x.strokeStyle = alfa(NOTTE, .3); x.lineWidth = 4; x.beginPath(); lungo(x, p => corso(p, i0) + 3, xa, xb, 30, true); x.stroke();
  }
  // le opere morte dei castelli: dipinte, con il fregio a triangoli color ruggine e ocra
  const c0 = poppa ? -70 : 1360, c1 = poppa ? 560 : 1716;
  x.fillStyle = alfa(mesc(LEGNO, '#6f9486', .6), .55); x.beginPath(); lungo(x, cinta, c0, c1, 30, true); x.lineTo(c1, -700); x.lineTo(c0, -700); x.closePath(); x.fill();
  for (let pass = 0; pass < 2; pass++) {
    x.fillStyle = pass ? alfa(OCRA, .5) : alfa(ROSSO, .65); x.beginPath();
    for (let px = c0; px < c1; px += 26) { const y0 = cinta(px + 13) - 8; if (pass) { x.moveTo(px + 13, y0 - 22); x.lineTo(px + 39, y0 - 22); x.lineTo(px + 26, y0); } else { x.moveTo(px, y0); x.lineTo(px + 26, y0); x.lineTo(px + 13, y0 - 22); } x.closePath(); }
    x.fill();
  }
  x.strokeStyle = alfa(OCRA, .6); x.lineWidth = 3; x.beginPath(); lungo(x, p => cinta(p) - 5, c0, c1, 30, true); lungo(x, p => cinta(p) - 33, c0, c1, 30, true); x.stroke();
  if (poppa) {
    x.fillStyle = alfa(scuro(LEGNO, .25), .35); x.beginPath(); lungo(x, p => cassero(p) + 20, -70, 280, 30, true); x.lineTo(280, -700); x.lineTo(-70, -700); x.closePath(); x.fill();
    x.strokeStyle = alfa(OCRA, .55); x.lineWidth = 3; x.beginPath(); lungo(x, p => cassero(p) + 20, -70, 280, 30, true); x.stroke();
    x.strokeStyle = alfa(scuro(LEGNO, .7), .35); x.lineWidth = 2; x.beginPath();
    for (let px = -40; px < 280; px += 46) { x.moveTo(px, cassero(px) + 24); x.lineTo(px - 4, casseretto(px) + 26); }
    x.stroke();
    x.fillStyle = alfa(NOTTE, .25); x.fillRect(273, casseretto(280) + 10, 7, 100); x.fillRect(553, cassero(560) + 10, 7, 80);
  } else { x.fillStyle = alfa(NOTTE, .25); x.fillRect(1360, castello(1360) + 10, 7, 76); }
  x.strokeStyle = alfa(OCRA, .5); x.lineWidth = 2.4; x.beginPath();      // una fila di archetti dorati sotto i corrimani
  if (poppa) for (let px = -52; px < 268; px += 20) { const cy = casseretto(px + 10) + 46; x.moveTo(px + 2, cy); x.arc(px + 10, cy, 8, PI, 0); }
  else for (let px = 1374; px < 1684; px += 20) { const cy = castello(px + 10) + 44; x.moveTo(px + 2, cy); x.arc(px + 10, cy, 8, PI, 0); }
  x.stroke();
  // ombra verso la chiglia, un filo di luce in alto
  lucido(x, (xa + xb) / 2, -6, (xb - xa) * .56, 120, 0, .5, NOTTE);
  lucido(x, (xa + xb) / 2, -252, (xb - xa) * .5, 44, 0, .1, '#e8ffe0');
  // i portelli dei cannoni: 0 chiuso, 1 con la bocca del cannone, 2 aperto e vuoto
  for (const [px, tipo] of (poppa ? [[330, 1], [465, 0], [600, 2], [880, 1]] : [[1195, 2], [1325, 1], [1455, 0]])) {
    const cy = corso(px, 8.7);
    x.fillStyle = sfuma(x, alfa(RUGGINE, .34), alfa(RUGGINE, 0), cy + 16, cy + 80); x.fillRect(px - 9, cy + 16, 18, 64);      // la colatura di ruggine
    x.fillStyle = scuro(LEGNO, .35); x.fillRect(px - 21, cy - 19, 42, 38);
    if (tipo === 0) {
      x.fillStyle = mesc(LEGNO, ROSSO, .4); x.fillRect(px - 17, cy - 15, 34, 30);
      x.strokeStyle = alfa(NOTTE, .35); x.lineWidth = 1.5; x.beginPath(); x.moveTo(px - 17, cy - 5); x.lineTo(px + 17, cy - 5); x.moveTo(px - 17, cy + 5); x.lineTo(px + 17, cy + 5); x.stroke();
      x.fillStyle = RUGGINE; x.fillRect(px - 12, cy - 15, 4, 13); x.fillRect(px + 8, cy - 15, 4, 13);
      continue;
    }
    x.fillStyle = '#082c31'; x.fillRect(px - 17, cy - 15, 34, 30);
    x.fillStyle = alfa(mesc(LEGNO, ROSSO, .3), .95); x.beginPath(); x.moveTo(px - 19, cy - 19); x.lineTo(px + 19, cy - 19); x.lineTo(px + 16, cy - 31); x.lineTo(px - 16, cy - 31); x.closePath(); x.fill();     // il portello alzato
    if (tipo === 1) {
      x.fillStyle = sfuma(x, chiaro(BRONZO, .25), scuro(BRONZO, .4), cy - 12, cy + 13); x.beginPath(); ovale(x, px, cy + 1, 12, 12); x.fill();
      x.fillStyle = '#051b1f'; x.beginPath(); ovale(x, px, cy + 1, 6, 6); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; x.beginPath(); x.arc(px, cy + 1, 9.5, PI * 1.05, PI * 1.6); x.stroke();
    }
  }
  if (poppa) {      // lo squarcio nel fianco: dentro è buio e si vedono le costole
    const cx = 735, cy = -128, buco = puntiMacchia(cx, cy, 78, 58, caso, .22, 11);
    x.save(); x.beginPath(); liscia(x, buco); x.fillStyle = '#072a2f'; x.fill(); x.clip();
    for (let pass = 0; pass < 2; pass++) {
      x.strokeStyle = pass ? alfa(chiaro(LEGNO, .05), .9) : scuro(LEGNO, .55); x.lineWidth = pass ? 6 : 13; x.beginPath();
      for (let k = -3; k <= 3; k++) { const px = cx + k * 36 + 10 - pass * 1.5; x.moveTo(px - 8, cy + 80); x.quadraticCurveTo(px + 6, cy, px - 4, cy - 80); }
      x.stroke();
    }
    x.fillStyle = sfuma(x, alfa(NOTTE, .75), alfa(NOTTE, 0), cy - 60, cy + 20); x.fillRect(cx - 90, cy - 70, 180, 90);
    x.restore();
    x.strokeStyle = alfa(NOTTE, .45); x.lineWidth = 4; x.beginPath(); liscia(x, buco); x.stroke();
    x.fillStyle = chiaro(LEGNO, .06);      // tavole spezzate che sporgono nel buco
    for (let k = 0; k < 6; k++) { const i = 3 + k, lato = k % 2 ? 1 : -1, yb = corso(cx, i), yt = corso(cx, i + 1), x0 = cx + lato * 88, x1 = cx + lato * tra(30, 62); x.beginPath(); x.moveTo(x0, yb - 1); x.lineTo(x1, yb - 1); x.lineTo(x1 - lato * 8, (yb + yt) / 2); x.lineTo(x1 + lato * 3, yt + 1); x.lineTo(x0, yt + 1); x.closePath(); x.fill(); }
  }
  // incrostazioni: chiazze d'alghe e cirripedi
  for (let i = 0; i < (poppa ? 16 : 10); i++) { x.fillStyle = alfa(uno(VERDI), tra(.22, .4)); x.beginPath(); macchia(x, tra(xa + 30, xb - 30), tra(-250, -10), tra(18, 54), tra(8, 20), caso, .25, 8); x.fill(); }
  for (let i = 0; i < (poppa ? 12 : 8); i++) cirripedi(x, caso, tra(xa + 30, xb - 30), tra(-200, -20), tra(8, 18), 5 + Math.floor(caso() * 6));
  x.restore();

  // --- sopra lo scafo: corrimani, balaustre, galleria, telai delle finestre
  const m0 = poppa ? 560 : R[N_CORSI - 1], m1 = poppa ? R[N_CORSI - 1] : 1360;
  x.strokeStyle = scuro(FASCIA, .1); x.lineWidth = 7; x.beginPath(); lungo(x, p => cinta(p) - 1, m0, m1, 30, true); x.stroke();
  x.strokeStyle = alfa(chiaro(LEGNO, .4), .5); x.lineWidth = 2.2; x.beginPath(); lungo(x, p => cinta(p) - 3, m0, m1, 30, true); x.stroke();
  if (poppa) {
    balaustra(x, casseretto, -68, 280); balaustra(x, cassero, 280, 560);
    x.fillStyle = scuro(LEGNO, .3); x.beginPath(); x.moveTo(-56, -326); x.quadraticCurveTo(8, -290, 70, -322); x.closePath(); x.fill();           // la galleria di poppa: mensola, balconcino chiuso, tettuccio
    x.fillStyle = sfuma(x, mesc(LEGNO, '#86a595', .55), mesc(LEGNO, '#5d8478', .5), -404, -322);
    x.beginPath(); x.moveTo(-62, -326); x.lineTo(74, -322); x.lineTo(70, -398); x.lineTo(-66, -402); x.closePath(); x.fill();
    x.strokeStyle = alfa(OCRA, .7); x.lineWidth = 3; x.stroke();
    x.fillStyle = scuro(FASCIA, .1); x.beginPath(); x.moveTo(-72, -401); x.lineTo(78, -396); x.lineTo(60, -414); x.lineTo(-60, -419); x.closePath(); x.fill();
    fanale(x, false);
    const bx = 598, by = cinta(bx);      // la campana di bordo sul suo castelletto, davanti al cassero
    x.strokeStyle = scuro(LEGNO, .1); x.lineWidth = 5; x.beginPath(); x.moveTo(bx - 15, by); x.lineTo(bx - 15, by - 50); x.moveTo(bx + 15, by); x.lineTo(bx + 15, by - 50); x.stroke();
    x.lineWidth = 6; x.beginPath(); x.moveTo(bx - 21, by - 52); x.quadraticCurveTo(bx, by - 62, bx + 21, by - 52); x.stroke();
    x.fillStyle = sfuma(x, chiaro(OTTONE, .25), scuro(OTTONE, .35), by - 46, by - 16);
    x.beginPath(); x.moveTo(bx - 4, by - 48); x.quadraticCurveTo(bx - 6, by - 30, bx - 12, by - 20); x.lineTo(bx + 12, by - 20); x.quadraticCurveTo(bx + 6, by - 30, bx + 4, by - 48); x.closePath(); x.fill();
    x.fillStyle = scuro(OTTONE, .5); x.beginPath(); ovale(x, bx, by - 17, 3, 3); x.fill();
  } else {
    balaustra(x, castello, 1360, 1692);
    x.fillStyle = '#082c31'; x.beginPath(); ovale(x, 1640, -262, 11, 8); x.fill(); x.strokeStyle = RUGGINE; x.lineWidth = 3.5; x.stroke();         // l'occhio di cubia, da dove esce la catena
    // la parte alta del trinchetto, caduta di traverso sul fianco
    x.strokeStyle = alfa(NOTTE, .3); x.lineWidth = 26; x.beginPath(); x.moveTo(1440, -396); x.lineTo(1100, -18); x.stroke();
    palo(x, 1085, -14, 1452, -420, 8.5, 13, scuro(LEGNO, .08));
    x.fillStyle = RUGGINE; for (const u of [.3, .62, .9]) { x.save(); x.translate(1085 + 367 * u, -14 - 406 * u); x.rotate(Math.atan2(-406, 367)); x.fillRect(-3, -14, 6, 28); x.restore(); }
    x.save(); x.translate(1085 + 367 * .46, -14 - 406 * .46); x.rotate(Math.atan2(-406, 367) + PI / 2);                    // la sua coffa
    x.fillStyle = scuro(LEGNO, .25); x.fillRect(-46, -6, 92, 10); x.fillStyle = alfa(LEGNO, .9); x.beginPath(); x.moveTo(-46, -6); x.lineTo(46, -6); x.lineTo(50, -26); x.lineTo(-50, -26); x.closePath(); x.fill();
    x.restore();
  }
  for (const l of luci) telaio(x, l);
  // muschio sugli orli e barbe d'alghe che pendono
  const orli = poppa ? [[casseretto, -60, 275, 16], [cassero, 285, 555, 12], [cinta, 565, 960, 14], [p => corso(p, 7), 60, 940, 14]] : [[cinta, 1140, 1355, 9], [castello, 1365, 1690, 14], [p => corso(p, 7), 1150, 1560, 9]];
  for (const [f, a, b, n] of orli) {
    for (let i = 0; i < n; i++) { const px = tra(a, b); x.fillStyle = alfa(uno(VERDI), .85); x.beginPath(); macchia(x, px, f(px) - 2, tra(9, 24), tra(3.5, 7), caso, .2, 7); x.fill(); }
    x.fillStyle = alfa(scuro(VERDI[0], .25), .8); x.beginPath();
    for (let i = 0; i < n * 1.4; i++) { const px = tra(a, b), lun = tra(14, 52), lg = tra(2.5, 5), pg = tra(-8, 8), py = f(px) + 3; x.moveTo(px - lg, py); x.quadraticCurveTo(px - lg * .6 + pg * .4, py + lun * .6, px + pg, py + lun); x.quadraticCurveTo(px + lg * .8 + pg * .4, py + lun * .5, px + lg, py); }
    x.fill();
  }
  for (const [px, f] of (poppa ? [[90, casseretto], [236, casseretto], [420, cassero], [690, cinta], [900, cinta]] : [[1250, cinta], [1450, castello], [1620, castello]])) {
    const s = tra(.45, .7); x.save(); x.translate(px, f(px) - 2); x.scale(s, s);
    if (caso() < .6) molle(x, caso, 40, uno(MOLLI)); else alghetta(x, caso, 0, 44, uno(VERDI));
    x.restore();
  }

  // --- il velo d'acqua, poi le luci
  velaNave(x, -700);
  for (const l of luci) vetro(x, l);
  if (poppa) fanale(x, true);
}
function dipingiPoppa(x) {
  inNave(x, POPPA, () => dipingiScafo(x, true));
  const a = daNave(POPPA, 912, cinta(912) - 3);      // una catena scavalca la murata vicino alla rottura e scende fino alla sabbia
  catena(x, a[0], a[1], a[0] + 30, a[1] + 150, a[0] + 6, 30, 9, .42);
}
/* La prua, con la catena che scende dall'occhio di cubia fino all'àncora posata sul fondo. */
const CUBIA = daNave(PRUA, 1640, -262), ANCORA = { x: 486, y: 2, lun: 168, rot: -.24 };
function dipingiPrua(x) {
  const cima = [ANCORA.x + Math.sin(ANCORA.rot) * ANCORA.lun * 1.07, ANCORA.y - Math.cos(ANCORA.rot) * ANCORA.lun * 1.07];
  catena(x, CUBIA[0], CUBIA[1] + 4, (CUBIA[0] + cima[0]) / 2 - 10, cima[1] + 150, cima[0], cima[1], 9);
  x.save(); x.translate(ANCORA.x, ANCORA.y); x.rotate(ANCORA.rot); ancora(x, ANCORA.lun); x.restore();
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = alfa(FONDA, .34); x.fillRect(-400, -700, 1100, 800); x.globalCompositeOperation = 'source-over';
  inNave(x, PRUA, () => dipingiScafo(x, false));
}

/* Un albero: quello maestro ha la coffa, l'albero di gabbia e l'alberetto; la mezzana è un palo solo. Origine nel piede. */
function dipingiAlbero(x, al) {
  const tono = scuro(LEGNO, .12), cv = -al.basso + 34, r0 = al.coffa ? 16 : 12;
  palo(x, 0, 30, 0, -al.basso, r0, r0 * .75, tono);
  x.fillStyle = RUGGINE; for (let v = -70; v > -al.basso + 70; v -= 78) { const hw = r0 * (1 + .25 * v / al.basso); x.fillRect(-hw - 1, v, hw * 2 + 2, 6); }
  if (!al.coffa) { x.fillStyle = OCRA; x.beginPath(); ovale(x, 0, -al.basso - 4, 7, 7); x.fill(); return; }
  palo(x, 6, cv + 14, 6, -al.alto, 10.5, 7.5, tono);                                       // l'albero di gabbia
  x.fillStyle = scuro(LEGNO, .3); x.beginPath(); x.moveTo(-24, cv + 18); x.lineTo(30, cv + 18); x.lineTo(54, cv - 3); x.lineTo(-48, cv - 3); x.closePath(); x.fill();      // la coffa
  x.fillStyle = chiaro(LEGNO, .05); x.fillRect(-56, cv - 12, 118, 9);
  x.fillStyle = alfa(LEGNO, .92); x.beginPath(); x.moveTo(-52, cv - 12); x.lineTo(58, cv - 12); x.lineTo(62, cv - 36); x.lineTo(-56, cv - 36); x.closePath(); x.fill();
  x.strokeStyle = alfa(scuro(LEGNO, .7), .4); x.lineWidth = 1.6; x.beginPath(); for (let px = -40; px <= 50; px += 18) { x.moveTo(px, cv - 13); x.lineTo(px * 1.05, cv - 35); } x.stroke();
  x.strokeStyle = chiaro(LEGNO, .12); x.lineWidth = 4; x.beginPath(); x.moveTo(-57, cv - 36); x.lineTo(63, cv - 36); x.stroke();
  x.fillStyle = RUGGINE; x.fillRect(-15, -al.basso - 4, 34, 8);
  x.fillStyle = scuro(LEGNO, .2); x.fillRect(-22, -al.alto + 26, 62, 6);                    // le crocette
  palo(x, 10, -al.alto + 44, 10, -al.cima, 6, 3.6, tono);                                  // l'alberetto
  x.fillStyle = OCRA; x.beginPath(); ovale(x, 10, -al.cima - 3, 5, 5); x.fill();
}
function dipingiTronco(x, al) { inNave(x, POPPA, () => { x.translate(al.x, al.piede); x.rotate(al.incl); dipingiAlbero(x, al); velaNave(x, -1100); }); }
/* Un pennone con quel che resta della vela arrotolata e legata: in orizzontale, origine al centro. Nel fotogramma si copia
   ruotato: è lungo e sottile, in una tela dritta spreca pochissimi pixel. `fondo` (0..1) dice quanto sta in basso. */
function figuraPennone(p, fondo) {
  const w = p.m > 200 ? 8.5 : p.m > 120 ? 7 : 5.5;
  const f = ritaglio(-p.m - 8, -w - 6, p.m + 8, w * 2.6 + 4, x => {
    const t2 = scuro(LEGNO, .05);
    palo(x, -p.m, 0, 0, 0, w * .5, w, t2); palo(x, 0, 0, p.m, 0, w, w * .5, t2);
    x.fillStyle = TELA; x.beginPath();
    for (let k = -3; k <= 3; k++) if (rumore(k + 4, Math.round(p.m)) < .72) ovale(x, k / 3.7 * p.m, w * .8, p.m * .13, w * .8);
    x.fill();
    x.strokeStyle = CORDA; x.lineWidth = 2.4; x.beginPath(); for (let k = -3; k <= 3; k++) { const u = (k + .5) / 3.7 * p.m; if (Math.abs(u) < p.m * .92) { x.moveTo(u, -w); x.lineTo(u, w * 1.5); } } x.stroke();
    x.fillStyle = RUGGINE; x.beginPath(); ovale(x, 0, 0, w * 1.1, w * 1.1); x.fill();
  });
  vela(f.im, mesc(ACQUA, FONDA, fondo), .36 + .14 * fondo);
  return f;
}

// ---------------------------------------------------------------- cose del fondale (origine nel piede, y verso l'alto negativo)
function cassa(x, caso, w, h) {
  x.save(); x.rotate((caso() - .5) * .3);
  x.fillStyle = sfuma(x, chiaro(LEGNO, .12), scuro(LEGNO, .35), -h, 4); x.fillRect(-w / 2, -h, w, h + 6);
  x.strokeStyle = alfa(scuro(LEGNO, .7), .45); x.lineWidth = 1.6; x.beginPath(); for (let i = 1; i < 4; i++) { const py = -h + i * h / 4; x.moveTo(-w / 2, py); x.lineTo(w / 2, py); } x.stroke();
  x.strokeStyle = scuro(FASCIA, .05); x.lineWidth = 5; x.strokeRect(-w / 2 + 2.5, -h + 2.5, w - 5, h); x.beginPath(); x.moveTo(-w / 2 + 4, 0); x.lineTo(w / 2 - 4, -h + 4); x.stroke();
  x.fillStyle = chiaro(LEGNO, .2); x.beginPath(); x.moveTo(-w / 2, -h); x.lineTo(-w / 2 + 9, -h - 9); x.lineTo(w / 2 + 9, -h - 9); x.lineTo(w / 2, -h); x.closePath(); x.fill();
  x.fillStyle = scuro(LEGNO, .32); x.beginPath(); x.moveTo(w / 2, -h); x.lineTo(w / 2 + 9, -h - 9); x.lineTo(w / 2 + 9, -3); x.lineTo(w / 2, 6); x.closePath(); x.fill();
  x.restore();
}
function botte(x, caso, r, h, sdraiata) {
  x.save();
  if (sdraiata) { x.translate(0, -r); x.rotate(PI / 2 + (caso() - .5) * .3); x.translate(0, h / 2); } else x.rotate((caso() - .5) * .16);
  const g = x.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, chiaro(LEGNO, .22)); g.addColorStop(.5, LEGNO); g.addColorStop(1, scuro(LEGNO, .5));
  x.fillStyle = g; x.beginPath(); x.moveTo(-r * .78, 3); x.quadraticCurveTo(-r * 1.14, -h / 2, -r * .78, -h); x.lineTo(r * .78, -h); x.quadraticCurveTo(r * 1.14, -h / 2, r * .78, 3); x.closePath(); x.fill();
  x.save(); x.clip();
  x.strokeStyle = alfa(scuro(LEGNO, .7), .35); x.lineWidth = 1.4; x.beginPath(); for (let i = -2; i <= 2; i++) { x.moveTo(i * r * .3, 3); x.quadraticCurveTo(i * r * .44, -h / 2, i * r * .3, -h); } x.stroke();
  x.strokeStyle = RUGGINE; x.lineWidth = 5; x.beginPath(); for (const k of [.12, .38, .64, .9]) { x.moveTo(-r * 1.2, -h * k + 1); x.quadraticCurveTo(0, -h * k + 5, r * 1.2, -h * k + 1); } x.stroke();
  x.restore();
  x.fillStyle = scuro(LEGNO, .25); x.beginPath(); ovale(x, 0, -h, r * .78, r * .2); x.fill();
  x.restore();
}
function anfora(x, caso, h, col) {
  x.save(); x.rotate((caso() - .5) * 1.2);
  const w = h * .36;
  x.strokeStyle = scuro(col, .2); x.lineWidth = h * .05; x.beginPath();
  for (const v of [-1, 1]) { x.moveTo(v * w * .34, -h * .9); x.quadraticCurveTo(v * w * 1.05, -h * .86, v * w * .8, -h * .6); }
  x.stroke();
  const g = x.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, chiaro(col, .25)); g.addColorStop(.45, col); g.addColorStop(1, scuro(col, .45));
  x.fillStyle = g; x.beginPath();
  x.moveTo(0, 4); x.bezierCurveTo(-w * .5, -h * .1, -w * 1.25, -h * .5, -w * .7, -h * .72); x.quadraticCurveTo(-w * .3, -h * .8, -w * .3, -h * .96); x.lineTo(-w * .42, -h); x.lineTo(w * .42, -h); x.lineTo(w * .3, -h * .96);
  x.quadraticCurveTo(w * .3, -h * .8, w * .7, -h * .72); x.bezierCurveTo(w * 1.25, -h * .5, w * .5, -h * .1, 0, 4); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); ovale(x, -w * .45, -h * .5, w * .16, h * .16, .2); x.fill();
  x.restore();
}
function palle(x, caso, r, n) {
  const posti = n >= 6 ? [[-2, 0], [0, 0], [2, 0], [-1, 1.7], [1, 1.7], [0, 3.4]] : n >= 3 ? [[-1, 0], [1, 0], [0, 1.7]] : [[0, 0]];
  for (const p of posti) {
    const cx = p[0] * r, cy = -r * .7 - p[1] * r, g = x.createRadialGradient(cx - r * .3, cy - r * .35, 0, cx, cy, r);
    g.addColorStop(0, '#7f8c88'); g.addColorStop(.5, '#4a5a5a'); g.addColorStop(1, '#27383b');
    x.fillStyle = g; x.beginPath(); ovale(x, cx, cy, r, r); x.fill();
  }
}
function tavole(x, caso, n, lun) {
  for (let i = 0; i < n; i++) {
    const a = (caso() - .5) * 1.6, l = lun * (.5 + caso() * .6), w = 5 + caso() * 3;
    x.save(); x.translate((i - (n - 1) / 2) * 16 + (caso() - .5) * 8, 6); x.rotate(a);
    x.fillStyle = sfuma(x, chiaro(LEGNO, .1), scuro(LEGNO, .4), -l, 4); x.beginPath(); x.moveTo(-w, 4); x.lineTo(-w, -l + 6); x.lineTo(-w * .2, -l); x.lineTo(w * .3, -l + 9); x.lineTo(w, -l + 3); x.lineTo(w, 4); x.closePath(); x.fill();
    x.strokeStyle = alfa(scuro(LEGNO, .7), .4); x.lineWidth = 1.3; x.beginPath(); x.moveTo(0, 2); x.lineTo(0, -l + 12); x.stroke();
    x.restore();
  }
}
/* Un cannone di bronzo sul suo affusto sfasciato. */
function cannone(x, caso) {
  x.save(); x.rotate((caso() - .5) * .14);
  x.fillStyle = sfuma(x, chiaro(LEGNO, .08), scuro(LEGNO, .4), -34, 2);
  x.beginPath(); x.moveTo(-46, 2); x.lineTo(-46, -30); x.lineTo(-20, -30); x.lineTo(-20, -22); x.lineTo(6, -22); x.lineTo(6, -14); x.lineTo(34, -14); x.lineTo(34, 2); x.closePath(); x.fill();
  for (const px of [-30, 18]) { x.fillStyle = scuro(LEGNO, .35); x.beginPath(); ovale(x, px, -4, 11, 11); x.fill(); x.fillStyle = RUGGINE; x.beginPath(); ovale(x, px, -4, 3.5, 3.5); x.fill(); }
  x.translate(-14, -35); x.rotate(-.2);
  x.fillStyle = sfuma(x, chiaro(BRONZO, .3), scuro(BRONZO, .5), -13, 13);
  x.beginPath(); x.moveTo(-44, -12); x.lineTo(52, -8); x.lineTo(62, -10.5); x.lineTo(66, -10.5); x.lineTo(66, 10.5); x.lineTo(62, 10.5); x.lineTo(52, 8); x.lineTo(-44, 12); x.quadraticCurveTo(-52, 0, -44, -12); x.closePath(); x.fill();
  x.beginPath(); ovale(x, -54, 0, 5.5, 5.5); x.fill();                                                                       // il pomo
  x.fillStyle = alfa(scuro(BRONZO, .6), .6); for (const px of [-30, -4, 26]) x.fillRect(px, -11.6 + (px + 44) * .04, 5, 23.2 - (px + 44) * .08);   // i cerchi
  x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.moveTo(-40, -8); x.lineTo(50, -5); x.lineTo(50, -3); x.lineTo(-40, -5); x.closePath(); x.fill();
  x.fillStyle = '#06181c'; x.beginPath(); ovale(x, 66, 0, 2.5, 6.5); x.fill();
  x.restore();
}
/* Il forziere socchiuso: piccolo, con un filo di luccichio che esce dalla fessura. Solo scena: non è un premio. */
function forziere(x) {
  const w = 38, h = 22;
  x.fillStyle = sfuma(x, chiaro(LEGNO, .1), scuro(LEGNO, .4), -h, 2); x.fillRect(-w / 2, -h, w, h + 6);
  x.fillStyle = sfuma(x, 'rgba(255,214,120,.85)', 'rgba(232,170,80,.5)', -h - 7, -h); x.fillRect(-w / 2 + 3, -h - 6, w - 6, 7);
  x.save(); x.translate(-w / 2, -h - 3); x.rotate(-.3);
  x.fillStyle = sfuma(x, chiaro(LEGNO, .18), scuro(LEGNO, .2), -16, 0); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(w * .05, -17, w * .5, -17); x.quadraticCurveTo(w * .95, -17, w, 0); x.closePath(); x.fill();
  x.strokeStyle = OTTONE; x.lineWidth = 3; x.beginPath(); for (const u of [.2, .8]) { x.moveTo(w * u, 0); x.quadraticCurveTo(w * u, -13, w * (u < .5 ? u + .06 : u - .06), -15.5); } x.stroke();
  x.restore();
  x.strokeStyle = OTTONE; x.lineWidth = 3; x.beginPath(); x.moveTo(-w / 2 + 7, -h); x.lineTo(-w / 2 + 7, 4); x.moveTo(w / 2 - 7, -h); x.lineTo(w / 2 - 7, 4); x.stroke();
  x.fillStyle = OTTONE; x.fillRect(-4, -h + 3, 8, 9);
  lucido(x, 0, -h - 4, 24, 11, 0, .28, '#ffd88a');
}
/* Costole di un relitto più vecchio che spuntano dalla sabbia: tutte piegate dallo stesso verso (sono il fianco di uno scafo,
   non devono sembrare una gabbia toracica), qualcuna spezzata, con la chiglia mezza sepolta e due tavole ancora inchiodate. */
function costoleGrandi(x, caso, n, alt) {
  const passo = 38, x0 = -(n - 1) * passo / 2 + 8, alte = [];
  for (let i = 0; i < n; i++) alte.push(alt * (.62 + .38 * Math.sin(PI * (i + .5) / n)) * (.82 + caso() * .26) * (caso() < .25 ? .5 : 1));
  x.lineCap = 'butt';      // teste squadrate: sono travi segate
  for (let i = 0; i < n; i++) costola(x, x0 + i * passo + 19, alte[i] * .72, 11, 12, scuro(LEGNO, .34));
  palo(x, x0 - 44, 5, x0 + (n - 1) * passo + 40, 1, 8, 8, scuro(LEGNO, .3));
  for (let i = 0; i < n; i++) costola(x, x0 + i * passo, alte[i], 17, 15, LEGNO);
  x.lineCap = 'round';
  palo(x, x0 - 30, -alt * .19 + 3, x0 + Math.min(n - 1, 4) * passo - 4, -alt * .19 - 4, 6.5, 6.5, chiaro(LEGNO, .04));
  palo(x, x0 + passo * 1.5, -alt * .42 + 2, x0 + Math.min(n - 1, 4) * passo + 12, -alt * .42 - 3, 6, 6, chiaro(LEGNO, .02));
  x.fillStyle = alfa(VERDI[1], .8); x.beginPath(); for (let i = 0; i < n; i++) if (caso() < .5) macchia(x, x0 + i * passo + 10, -alte[i] + 2, 9, 4, caso, .2, 7); x.fill();
}
/* Cose posate sulla sabbia: monete sparse, un rotolo di cima, un'asse, un sasso. */
function monete(x, caso) {
  const p = [];
  for (let i = 0; i < 7; i++) p.push([(caso() + caso() - 1) * 30, (caso() - .5) * 12, 3 + caso() * 1.4, (caso() - .5) * .6]);
  x.fillStyle = alfa(NOTTE, .25); x.beginPath(); for (const q of p) ovale(x, q[0] + .8, q[1] + 1.4, q[2], q[2] * .5, q[3]); x.fill();
  x.fillStyle = '#c4a65c'; x.beginPath(); for (const q of p) ovale(x, q[0], q[1], q[2], q[2] * .5, q[3]); x.fill();
  x.fillStyle = 'rgba(255,244,200,.5)'; x.beginPath(); for (const q of p) ovale(x, q[0] - q[2] * .25, q[1] - q[2] * .14, q[2] * .45, q[2] * .16, q[3]); x.fill();
}
function rotolo(x, caso) {
  x.fillStyle = alfa(NOTTE, .25); x.beginPath(); ovale(x, 1, 3, 26, 9); x.fill();
  for (let k = 0; k < 4; k++) { x.strokeStyle = k % 2 ? chiaro(CORDA, .1) : scuro(CORDA, .2); x.lineWidth = 5; x.beginPath(); x.ellipse(0, -k * 3.2, 22 - k * 1.5, 7.5 - k * .4, 0, 0, TAU); x.stroke(); }
  x.strokeStyle = CORDA; x.lineWidth = 4.5; x.beginPath(); x.moveTo(20, -2); x.quadraticCurveTo(34, 6, 30 + caso() * 6, 14); x.stroke();
}
function asse(x, caso, lun) {
  x.save(); x.rotate((caso() - .5) * .3);
  x.fillStyle = alfa(NOTTE, .22); x.fillRect(-lun / 2 + 2, -1, lun, 8);
  x.fillStyle = sfuma(x, chiaro(LEGNO, .14), scuro(LEGNO, .3), -6, 5); x.beginPath(); x.moveTo(-lun / 2, -5); x.lineTo(lun / 2 - 8, -5); x.lineTo(lun / 2, -1); x.lineTo(lun / 2 - 6, 4); x.lineTo(-lun / 2 + 4, 4); x.lineTo(-lun / 2 - 3, 0); x.closePath(); x.fill();
  x.strokeStyle = alfa(scuro(LEGNO, .7), .4); x.lineWidth = 1.2; x.beginPath(); x.moveTo(-lun / 2 + 6, -1); x.lineTo(lun / 2 - 10, -1); x.stroke();
  x.restore();
}
function sasso(x, caso, w, tono) {
  x.fillStyle = alfa(NOTTE, .22); x.beginPath(); ovale(x, 1, 3, w * .56, w * .2); x.fill();
  x.fillStyle = sfuma(x, chiaro(tono, .28), scuro(tono, .3), -w * .45, w * .2); x.beginPath(); macchia(x, 0, -w * .12, w * .5, w * .3, caso, .14, 8); x.fill();
  x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); ovale(x, -w * .14, -w * .26, w * .18, w * .06, -.2); x.fill();
}
function figurineFondale() {
  const c = U.semi(3107), t = {};
  t.masso = [[170, 84, PIETRA[0]], [226, 104, PIETRA[1]], [128, 66, PIETRA[2]], [92, 46, PIETRA[0]]].map(([w, h, tono]) => figurina(w + 44, h + 70, 18, x => masso(x, c, w, h, tono)));
  t.cassa = [[58, 46], [44, 38], [70, 52]].map(([w, h]) => figurina(w + 44, h + 40, 12, x => cassa(x, c, w, h)));
  t.botte = [[22, 56, false], [20, 50, true], [25, 62, false]].map(([r, h, sd]) => figurina(sd ? h + 30 : r * 2 + 26, sd ? r * 2 + 30 : h + 26, 10, x => botte(x, c, r, h, sd)));
  t.anfora = [[58, '#a97b60'], [48, '#9c8468'], [64, '#b08566']].map(([h, col]) => figurina(h * 1.9, h + 26, 12, x => anfora(x, c, h, col)));
  t.palle = [[8, 6], [9, 3], [8, 1]].map(([r, n]) => figurina(r * 7 + 8, r * 6 + 12, 6, x => palle(x, c, r, n)));
  t.tavole = [[3, 70], [2, 54], [4, 84]].map(([n, lun]) => figurina(lun * 1.6 + 40, lun * 1.2 + 20, 10, x => tavole(x, c, n, lun)));
  t.cannone = [figurina(170, 96, 12, x => cannone(x, c))];
  t.forziere = [figurina(84, 62, 12, x => forziere(x))];
  t.costole = [figurina(300, 196, 14, x => costoleGrandi(x, c, 6, 150))];
  t.ancora = [figurina(200, 180, 16, x => { x.translate(-24, -4); x.rotate(.52); ancora(x, 116); })];
  t.alga = [figurina(90, 60, 8, x => alghetta(x, c, 0, 44, VERDI[1])), figurina(96, 64, 8, x => alghetta(x, c, 1, 50, VERDI[0])), figurina(60, 42, 8, x => molle(x, c, 26, MOLLI[1])), figurina(60, 42, 8, x => molle(x, c, 24, MOLLI[2]))];
  for (const tipo of ['masso', 'cassa', 'botte', 'tavole', 'anfora', 'costole', 'alga']) for (const f of t[tipo]) f.lontana = lontana(f);
  // cose posate sulla sabbia
  t.monete = [0, 1].map(() => figurina(80, 30, 15, x => monete(x, c)));
  t.rotolo = [figurina(84, 50, 22, x => rotolo(x, c))];
  t.asse = [0, 1, 2].map(i => figurina(116, 40, 20, x => asse(x, c, 66 + i * 14)));
  t.sasso = [['#7f918a', 30], ['#a3ab96', 22], ['#5f7872', 18]].map(([col, w]) => figurina(44, 30, 10, x => sasso(x, c, w, col)));
  t.palla = [figurina(28, 24, 8, x => palle(x, c, 8, 1))];
  return t;
}

// ---------------------------------------------------------------- la sabbia
const SAB = ['#94a18b', '#6e8378', '#425b56'];   // in cima, sotto la cresta, in profondità
const SASSI = ['#7f918a', '#a3ab96', '#5f7872', '#9a8f7c', '#8a9c8c'];
/* Chiazze, rughe, sassolini e granelli su una striscia larga 512 unità che si ripete. */
function granaSabbia(x, caso, alt, forza, fitta = 1) {
  const P = 512, GIRI = [-P, 0, P];
  for (let i = 0; i < 4 + alt / 26; i++) {
    const cx = caso() * P, cy = caso() * alt, rx = 36 + caso() * 80, ry = 7 + caso() * 15, luce = caso() < .45;
    for (const ox of GIRI) lucido(x, cx + ox, cy, rx, ry, 0, (luce ? .26 : .24) * forza, luce ? '#e6eed6' : '#33524e');
  }
  x.strokeStyle = 'rgba(240,246,226,' + (.17 * forza).toFixed(3) + ')'; x.lineWidth = 1.6; x.beginPath();
  for (let i = 0; i < alt / 8; i++) {
    const y0 = caso() * alt, x0 = caso() * P, lun = 50 + caso() * 110, f = caso() * TAU;
    for (const ox of GIRI) for (let k = 0; k <= 6; k++) { const px = x0 + ox + lun * k / 6, py = y0 + Math.sin(k * 1.1 + f) * 2.2; if (k) x.lineTo(px, py); else x.moveTo(px, py); }
  }
  x.stroke();
  const sassi = [];
  for (let i = 0; i < alt * .6 * fitta; i++) { const u = caso(); sassi.push([caso() * P, caso() * alt, 1.6 + u * u * 6, .55 + caso() * .35, (caso() - .5) * 1.2, Math.floor(caso() * SASSI.length)]); }
  const giro = (stile, dx, dy, kx, ky, quale) => {
    x.fillStyle = stile; x.beginPath();
    for (const s of sassi) if (quale === undefined || s[5] === quale) for (const ox of GIRI) ovale(x, s[0] + ox + dx * s[2], s[1] + dy * s[2], s[2] * kx, s[2] * s[3] * ky, s[4]);
    x.fill();
  };
  giro(alfa(NOTTE, (.22 * forza).toFixed(3)), .15, .3, 1.05, 1.05);
  for (let k = 0; k < SASSI.length; k++) giro(alfa(SASSI[k], (.8 * forza).toFixed(3)), 0, 0, 1, 1, k);
  giro('rgba(255,255,240,' + (.26 * forza).toFixed(3) + ')', -.2, -.25, .5, .4);
  x.fillStyle = 'rgba(40,74,70,' + (.3 * forza).toFixed(3) + ')'; x.beginPath();
  for (let i = 0; i < alt * 2; i++) { const px = caso() * P, py = caso() * alt, q = .5 + caso() * .8; x.moveTo(px + q, py); x.arc(px, py, q, 0, TAU); }
  x.fill();
}
/* Cresta della sabbia davanti: 512×128 unità, da 44 sopra il fondale a 84 sotto. Due pezzi che si alternano (cambiano il profilo e i sassi). */
function crestaSabbia(indice) {
  const im = tela(1024, 256), x = penna(im), su = 44, linea = px => su + duna(indice * 512 + px), caso = U.semi(510 + indice);
  x.scale(S, S);
  for (let i = 0; i < 12; i++) {      // sassi che sporgono dal profilo (lontani dai bordi: i due pezzi si alternano)
    const px = 16 + caso() * 480, r = 4 + caso() * caso() * 10, py = linea(px) + r * .2, tono = SASSI[Math.floor(caso() * SASSI.length)];
    x.fillStyle = sfuma(x, chiaro(tono, .25), scuro(tono, .3), py - r * .7, py + r * .7); x.beginPath(); ovale(x, px, py, r, r * (.6 + caso() * .2), (caso() - .5) * .5); x.fill();
  }
  x.save(); x.beginPath(); x.moveTo(-6, 134); for (let px = -6; px <= 518; px += 4) x.lineTo(px, linea(px)); x.lineTo(518, 134); x.closePath(); x.clip();
  x.fillStyle = sfuma(x, SAB[0], SAB[1], 40, 128); x.fillRect(0, 0, 512, 128);
  x.translate(0, 34); granaSabbia(x, U.semi(520), 94, 1); x.translate(0, -34);      // la stessa grana nei due pezzi: le chiazze continuano dall'uno all'altro senza scalino
  x.fillStyle = sfuma(x, alfa(SAB[1], 0), SAB[1], 106, 128); x.fillRect(0, 100, 512, 28);
  x.restore();
  x.strokeStyle = 'rgba(226,236,214,.6)'; x.lineWidth = 2.4; x.beginPath(); for (let px = -6; px <= 518; px += 4) x.lineTo(px, linea(px) + 1.5); x.stroke();
  return im;
}
/* Il corpo della sabbia sotto la cresta: 512×256 unità, sfuma nel colore pieno di sotto. */
function corpoSabbia() {
  const im = tela(1024, 512), x = penna(im);
  x.scale(S, S);
  x.fillStyle = sfuma(x, SAB[1], SAB[2], 0, 256); x.fillRect(0, 0, 512, 256);
  granaSabbia(x, U.semi(530), 250, .7, .5);
  x.fillStyle = sfuma(x, SAB[1], alfa(SAB[1], 0), 0, 22); x.fillRect(0, 0, 512, 24);
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = sfuma(x, 'rgba(0,0,0,0)', 'rgba(0,0,0,1)', 150, 252); x.fillRect(0, 150, 512, 106);
  return im;
}
/* Il fondo in profondità, visto in sezione: strati di fango, sassi e cocci sepolti. 512×512 a 1 pixel per unità, ripetibile. */
function sabbiaProfonda() {
  const P = 512, im = tela(P, P), x = penna(im), caso = U.semi(540);
  x.fillStyle = SAB[2]; x.fillRect(0, 0, P, P);
  for (let i = 0; i < 9; i++) {
    const yy = (i + caso() * .7) / 9 * P, sp = 10 + caso() * 22, f1 = caso() * TAU, f2 = caso() * TAU, amp = 6 + caso() * 10;
    x.fillStyle = caso() < .5 ? 'rgba(196,212,190,.13)' : 'rgba(14,52,54,.2)';
    for (const oy of [-P, 0, P]) {
      x.beginPath();
      for (let px = 0; px <= P; px += 16) x.lineTo(px, oy + yy + amp * Math.sin(px * TAU / P * 2 + f1) + amp * .4 * Math.sin(px * TAU / P * 5 + f2));
      for (let px = P; px >= 0; px -= 16) x.lineTo(px, oy + yy + sp + amp * Math.sin(px * TAU / P * 2 + f1 + .5) + amp * .4 * Math.sin(px * TAU / P * 3 + f2));
      x.closePath(); x.fill();
    }
  }
  for (let i = 0; i < 40; i++) {
    const cx = caso() * P, cy = caso() * P, r = 5 + caso() * 14, col = i % 7 === 0 ? '#8f6f58' : SASSI[Math.floor(caso() * SASSI.length)], pts = puntiMacchia(0, 0, r, r * (.5 + caso() * .3), caso, .2, 7), rot = caso() * PI;
    for (const ox of [-P, 0, P]) for (const oy of [-P, 0, P]) { x.save(); x.translate(cx + ox, cy + oy); x.rotate(rot); x.fillStyle = alfa(col, .45); x.beginPath(); liscia(x, pts); x.fill(); x.restore(); }
  }
  return im;
}
/* La dorsale di fango dietro al galeone: 512×128 unità, da 88 sopra il fondale a 40 sotto; già velata. */
function dorsaleFango() {
  const im = tela(1024, 256), x = penna(im), su = 88, caso = U.semi(550), c0 = '#5d7a70', c1 = '#35524f';
  const linea = px => su + dorsale(px);
  x.scale(S, S);
  for (let i = 0; i < 6; i++) {      // sassi muschiosi lungo la cresta (lontani dai bordi: la tela si ripete)
    const px = 44 + (i + caso() * .7) / 6 * 430, w = 40 + caso() * 46, h = 13 + caso() * 14;
    x.save(); x.translate(px, linea(px) + 9); masso(x, caso, w, h, PIETRA[i % 3], caso() < .5); x.restore();
  }
  x.save(); x.beginPath(); x.moveTo(-6, 132); for (let px = -6; px <= 518; px += 3) x.lineTo(px, linea(px)); x.lineTo(518, 132); x.closePath(); x.clip();
  x.fillStyle = sfuma(x, c0, c1, 42, 98); x.fillRect(0, 0, 512, 128);
  x.translate(0, 50); granaSabbia(x, U.semi(551), 78, .35, .5); x.translate(0, -50);
  x.restore();
  x.strokeStyle = alfa('#8fa894', .6); x.lineWidth = 3; x.beginPath(); for (let px = -6; px <= 518; px += 3) x.lineTo(px, linea(px) + 1.6); x.stroke();
  vela(im, FONDA, .34);
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
    const o = (y * n + xx) * 4; d[o] = 214; d[o + 1] = 246; d[o + 2] = 222; d[o + 3] = Math.round(255 * forza * a);
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
/* La sagoma di un altro relitto, a tinta unita. Tipo 0: troncone di poppa con il castello a gradini, l'albero storto, il
   pennone che pende con uno straccio di vela (mai in croce: sembrerebbe un cimitero), qualche costola. Tipo 1: troncone di
   prua con il bompresso. Origine al piede. */
function sagomaRelitto(x, s, tipo) {
  x.save(); x.scale(s, s);
  if (tipo === 0) {
    x.rotate(-.07);
    x.beginPath(); x.moveTo(-150, 12); x.lineTo(-158, -60); x.lineTo(-166, -128); x.lineTo(-84, -120); x.lineTo(-82, -92); x.lineTo(-20, -86); x.lineTo(-18, -64); x.lineTo(96, -58); x.lineTo(84, -44); x.lineTo(108, -36); x.lineTo(92, -20); x.lineTo(112, -8); x.lineTo(100, 12); x.closePath(); x.fill();
    x.lineWidth = 7; x.beginPath(); x.moveTo(20, -50); x.lineTo(66, -250); x.stroke();
    x.lineWidth = 4.5; x.beginPath(); x.moveTo(52, -196); x.lineTo(120, -128); x.stroke();
    x.beginPath(); x.moveTo(62, -186); x.lineTo(110, -136); x.lineTo(84, -96); x.lineTo(76, -130); x.lineTo(60, -112); x.closePath(); x.fill();
    x.lineWidth = 2; x.beginPath(); x.moveTo(66, -250); x.lineTo(-150, -124); x.stroke();
    x.lineWidth = 5; x.beginPath(); for (let i = 0; i < 4; i++) { const px = 128 + i * 24, h = 70 - i * 13; x.moveTo(px, 10); x.quadraticCurveTo(px - 10, -h * .6, px + 6, -h); } x.stroke();
  } else {
    x.rotate(.1);
    x.beginPath(); x.moveTo(-96, 12); x.lineTo(-104, -10); x.lineTo(-84, -24); x.lineTo(-100, -40); x.lineTo(-78, -58); x.lineTo(30, -62); x.lineTo(34, -86); x.lineTo(112, -92); x.quadraticCurveTo(150, -96, 176, -118); x.quadraticCurveTo(150, -40, 96, 12); x.closePath(); x.fill();
    x.lineWidth = 6; x.beginPath(); x.moveTo(90, -92); x.lineTo(222, -164); x.stroke();
    x.lineWidth = 8; x.beginPath(); x.moveTo(44, -70); x.lineTo(36, -132); x.stroke();
    x.lineWidth = 5; x.beginPath(); for (let i = 0; i < 4; i++) { const px = -124 - i * 24, h = 66 - i * 12; x.moveTo(px, 10); x.quadraticCurveTo(px + 10, -h * .6, px - 6, -h); } x.stroke();
  }
  x.restore();
}
/* Un piano lontano: una cresta a gobbe con masse irregolari di roccia, travi che spuntano e i resti di altri relitti. */
function pianoLontano(seme, cfg) {
  const L = cfg.L, A = cfg.alt, caso = U.semi(seme), tra = (a, b) => a + caso() * (b - a), k1 = TAU / L, f = [tra(0, TAU), tra(0, TAU), tra(0, TAU)];
  const cresta = px => cfg.base - cfg.amp * Math.sin(px * k1 + f[0]) - cfg.amp * .55 * Math.abs(Math.sin(px * k1 * 1.5 + f[1])) - cfg.amp * .3 * Math.sin(px * k1 * 4 + f[2]);
  const masse = [], legni = [];
  for (let i = 0; i < cfg.masse; i++) { const bx = (i + tra(.1, .9)) / cfg.masse * L, rx = tra(cfg.raggi[0], cfg.raggi[1]), ry = rx * tra(.45, .8), cy = cresta(bx) + ry * .3; masse.push({ cx: bx, cy, rx, ry, p: puntiMacchia(bx, cy, rx, ry, caso, .22, 9) }); }
  for (let i = 0; i < cfg.legni; i++) { const bx = tra(0, L); legni.push([bx, cresta(bx) + 4, tra(-.6, .6), tra(cfg.travi[0], cfg.travi[1]), tra(2.5, 5)]); }
  return striscia(L, A, 1, cfg.ridu, x => {
    x.beginPath(); x.moveTo(0, A + 4); for (let px = 0; px <= L; px += 8) x.lineTo(px, cresta(px)); x.lineTo(L, A + 4); x.closePath(); x.fill();
    x.beginPath(); for (const m of masse) liscia(x, m.p); x.fill();
    for (const l of legni) { x.lineWidth = l[4]; x.beginPath(); x.moveTo(l[0], l[1]); x.lineTo(l[0] + Math.sin(l[2]) * l[3], l[1] - Math.cos(l[2]) * l[3]); x.stroke(); }
    for (const r of cfg.relitti) { x.save(); x.translate(r[0] * L, cresta(r[0] * L) + 6); x.scale(r[3], 1); sagomaRelitto(x, r[1], r[2]); x.restore(); x.fillStyle = x.strokeStyle = '#fff'; }
  }, cfg.colori, x => { for (const m of masse) lucido(x, m.cx - m.rx * .2, m.cy - m.ry * .6, m.rx * .9, m.ry * .6, 0, cfg.luce, '#9fd0c0'); });
}
function pianiLontani() {
  return [
    { im: pianoLontano(31, { L: 512, alt: 256, ridu: 4, base: 190, amp: 16, masse: 3, raggi: [34, 70], legni: 2, travi: [20, 40], relitti: [[.6, .46, 0, 1]], luce: .1, colori: { y0: 60, y1: 256, su: '#1b6464', giu: '#145457' } }),
      L: 512, alt: 256, base: 190, rialzo: 64, fondo: '#145457', par: .16, pary: .3, zoom: .3, fase: 0 },
    { im: pianoLontano(32, { L: 1024, alt: 256, ridu: 3, base: 184, amp: 22, masse: 6, raggi: [40, 90], legni: 5, travi: [26, 60], relitti: [[.27, .62, 1, 1], [.74, .56, 0, -1]], luce: .12, colori: { y0: 40, y1: 256, su: '#16575a', giu: '#0f474b' } }),
      L: 1024, alt: 256, base: 184, rialzo: 44, fondo: '#0f474b', par: .36, pary: .5, zoom: .5, fase: 300, lusso: true },
    { im: pianoLontano(33, { L: 1024, alt: 256, ridu: 2, base: 178, amp: 26, masse: 6, raggi: [50, 104], legni: 6, travi: [30, 80], relitti: [[.52, .8, 0, 1]], luce: .14, colori: { y0: 30, y1: 256, su: '#104a4e', giu: '#0a3a3f' } }),
      L: 1024, alt: 256, base: 178, rialzo: 24, fondo: '#0a3a3f', par: .6, pary: .8, zoom: .72, fase: 620 },
  ];
}

// ---------------------------------------------------------------- grandi scogli (dietro a tutto, 1 pixel per unità, velati)
function formazione(w, h, seme, costruisci) {
  return figurina(w, h, 34, x => {
    const caso = U.semi(seme), masse = [];
    costruisci((cx, cy, rx, ry) => masse.push({ cx, cy, rx, ry, p: puntiMacchia(cx, cy, rx, ry, caso, .13, 10) }), caso);
    for (const m of masse) {
      const tono = PIETRA[Math.floor(caso() * PIETRA.length)], col = VERDI[Math.floor(caso() * VERDI.length)];
      x.globalCompositeOperation = 'source-atop'; x.strokeStyle = alfa(NOTTE, .2); x.lineWidth = 26; x.beginPath(); liscia(x, m.p); x.stroke();     // l'ombra che fa sui sassi di sotto
      x.globalCompositeOperation = 'source-over';
      x.save(); x.beginPath(); liscia(x, m.p); x.clip();
      const g = x.createLinearGradient(0, m.cy - m.ry, 0, m.cy + m.ry); g.addColorStop(0, chiaro(tono, .16)); g.addColorStop(.5, tono); g.addColorStop(1, scuro(tono, .6));
      x.fillStyle = g; x.fillRect(m.cx - m.rx * 1.3, m.cy - m.ry * 1.3, m.rx * 2.6, m.ry * 2.6);
      x.strokeStyle = alfa(scuro(tono, .7), .2); x.lineWidth = 2.4;
      for (let i = 0; i < 2; i++) { const yy = m.cy + m.ry * (-.1 + i * .4 + caso() * .2), f = caso() * TAU; x.beginPath(); for (let px = m.cx - m.rx * 1.2; px <= m.cx + m.rx * 1.2; px += m.rx * .3) x.lineTo(px, yy + 6 * Math.sin(px / 60 + f)); x.stroke(); }
      lucido(x, m.cx + m.rx * .3, m.cy + m.ry * .5, m.rx * .9, m.ry * .6, 0, .36, NOTTE);
      coperta(x, caso, m, col, .34 + caso() * .2);
      lucido(x, m.cx - m.rx * .25, m.cy - m.ry * .62, m.rx * .7, m.ry * .36, 0, .16);
      x.restore();
    }
    const cose = [];
    for (const m of masse) for (let i = 0, n = 1 + Math.floor(caso() * 2.2); i < n; i++) { const a = PI + .3 + caso() * (PI - .6); cose.push({ x: m.cx + Math.cos(a) * m.rx * .9, y: m.cy + Math.sin(a) * m.ry * .9, rot: (a - PI * 1.5) * .7, s: .5 + caso() * .4, tipo: Math.floor(caso() * 3) }); }
    cose.sort((a, b) => a.y - b.y);
    for (const o of cose) { x.save(); x.translate(o.x, o.y); x.rotate(o.rot); x.scale(o.s, o.s); if (o.tipo === 2) molle(x, caso, 40, MOLLI[Math.floor(caso() * MOLLI.length)]); else alghetta(x, caso, o.tipo, 44, VERDI[Math.floor(caso() * VERDI.length)]); x.restore(); }
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = alfa(FONDA, .52); x.fillRect(-w / 2, -h, w, h + 40);
    x.fillStyle = sfuma(x, 'rgba(190,236,214,.1)', 'rgba(190,236,214,0)', -h + 34, -h * .45); x.fillRect(-w / 2, -h, w, h * .6);
    x.globalCompositeOperation = 'source-over';
  }, 1, 0);
}
function grandiScogli() {
  return [
    formazione(540, 300, 62, massa => { massa(0, 0, 240, 54); massa(-116, -80, 122, 88); massa(40, -98, 152, 100); massa(176, -56, 86, 70); massa(-10, -190, 96, 60); }),
    formazione(470, 440, 63, massa => { massa(0, 0, 204, 52); massa(-100, -62, 104, 74); massa(-36, -136, 112, 76); massa(38, -210, 98, 62); massa(98, -276, 72, 46); massa(134, -64, 80, 60); massa(146, -330, 44, 30); }),
  ];
}

// ---------------------------------------------------------------- una cima e un brandello di rete in primo piano (scuri, sfocati, mezzo trasparenti)
function coseVicine() {
  const fai = (W, H, ox, disegna) => {
    const m = U.tela(W / 4, H / 4), x = penna(m);       // dipinte in piccolo e ingrandite: restano fuori fuoco
    x.scale(.25, .25); x.translate(ox, 0); x.fillStyle = x.strokeStyle = '#0b3d42';
    disegna(x);
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in';     // in alto svanisce: non si vede da dove pende
    const g = x.createLinearGradient(0, 2, 0, H / 4 * .3); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    x.fillStyle = g; x.fillRect(0, 0, W / 4, H / 4);
    const im = tela(W / 2, H / 2), y = im.getContext('2d');
    y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, W / 2, H / 2);
    return { im, w: W, h: H, ax: ox, ay: 0 };
  };
  const cima = fai(120, 430, 60, x => {
    x.lineWidth = 11; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(14, 110, -16, 220, 4, 340); x.stroke();
    x.beginPath(); ovale(x, 0, 250, 12, 15); x.fill();
    x.lineWidth = 4; x.beginPath(); for (const d of [-14, -4, 8, 16]) { x.moveTo(4, 338); x.quadraticCurveTo(4 + d * .4, 370, 4 + d, 396 + Math.abs(d)); } x.stroke();
  });
  const rete = fai(300, 400, 150, x => {
    const orlo = [[-130, 0], [130, 0], [118, 120], [84, 150], [96, 230], [40, 300], [10, 250], [-30, 340], [-70, 270], [-100, 290], [-120, 160]];
    x.save(); x.beginPath(); for (const q of orlo) x.lineTo(q[0], q[1]); x.closePath(); x.clip();
    x.lineWidth = 3.5; x.beginPath();
    for (let k = -14; k <= 14; k++) { x.moveTo(k * 34, 0); x.lineTo(k * 34 + 400, 400); x.moveTo(k * 34, 0); x.lineTo(k * 34 - 400, 400); }
    x.stroke(); x.restore();
    x.lineWidth = 9; x.beginPath(); x.moveTo(-140, 4); x.quadraticCurveTo(0, 22, 140, 4); x.stroke();
    x.beginPath(); ovale(x, -60, 10, 16, 9); ovale(x, 50, 12, 16, 9); x.fill();
  });
  return { cima, rete };
}

// ---------------------------------------------------------------- le pareti di roccia scura ai lati (1 pixel per unità)
const PARETE_SU = '#44706c', PARETE_GIU = '#1d4246', VELO_PARETE = .16, ALT_PARETE = 2464;
const PARETE_SU_VELATA = mesc(PARETE_SU, ACQUA, VELO_PARETE), PARETE_GIU_VELATA = mesc(PARETE_GIU, ACQUA, VELO_PARETE);
function pareti() {
  const caso = U.semi(808), L = PARETE_L, tele = [], masse = [], cose = [];
  for (let y = -70, ry = 0; y < ALT_PARETE + 70; y += ry * (.8 + caso() * .9)) { const grande = caso() < .3, rx = grande ? 70 + caso() * 30 : 34 + caso() * 30, cx = Math.min(-rx - 2, ciglio(y) - rx * (.84 + caso() * .34)); ry = grande ? 54 + caso() * 30 : 28 + caso() * 26; masse.push({ cx, cy: y, rx, ry, p: puntiMacchia(cx, y, rx, ry, caso, .12, 10), col: VERDI[Math.floor(caso() * VERDI.length)], verde: .25 + caso() * .3, seme: Math.floor(caso() * 1e6) }); }
  for (const m of masse) if (caso() < .5) { const a = -1.25 + caso() * 1.1; cose.push({ x: m.cx + Math.cos(a) * m.rx * .92, y: m.cy + Math.sin(a) * m.ry * .92, rot: (a + PI / 2) * .8, s: .45 + caso() * .35, tipo: Math.floor(caso() * 3), seme: Math.floor(caso() * 1e6) }); }
  for (let k = 0; k * 1024 < ALT_PARETE; k++) {
    const alt = Math.min(1024, ALT_PARETE - k * 1024), im = tela(L, alt), x = penna(im), y0 = k * 1024, y1 = y0 + alt, vicine = masse.filter(m => m.cy > y0 - 130 && m.cy < y1 + 130);
    x.translate(L, -y0);
    x.fillStyle = sfuma(x, scuro(PARETE_SU, .2), scuro(PARETE_GIU, .2), 0, ALT_PARETE);      // la lastra di fondo, tra una cengia e l'altra
    x.beginPath(); x.moveTo(-L - 2, y0 - 6); for (let y = y0 - 6; y <= y1 + 6; y += 6) x.lineTo(ciglio(y) - 48, y); x.lineTo(-L - 2, y1 + 6); x.closePath(); x.fill();
    for (const m of vicine) {      // dall'alto in basso: ogni cengia copre il piede di quella sopra e mostra la sua schiena
      const c2 = U.semi(m.seme), tono = mesc(PARETE_SU, PARETE_GIU, limita(m.cy / ALT_PARETE, 0, 1));
      x.globalCompositeOperation = 'source-atop'; x.strokeStyle = alfa(NOTTE, .2); x.lineWidth = 22; x.beginPath(); liscia(x, m.p); x.stroke();
      x.globalCompositeOperation = 'source-over';
      x.save(); x.beginPath(); liscia(x, m.p); x.clip();
      const g = x.createLinearGradient(0, m.cy - m.ry, 0, m.cy + m.ry); g.addColorStop(0, chiaro(tono, .14)); g.addColorStop(.5, tono); g.addColorStop(1, scuro(tono, .55));
      x.fillStyle = g; x.fillRect(m.cx - m.rx * 1.3, m.cy - m.ry * 1.3, m.rx * 2.6, m.ry * 2.6);
      lucido(x, m.cx - m.rx * .1, m.cy + m.ry * .6, m.rx * .9, m.ry * .6, 0, .32, NOTTE);
      coperta(x, c2, m, m.col, m.verde);
      lucido(x, m.cx + m.rx * .2, m.cy - m.ry * .6, m.rx * .7, m.ry * .36, 0, .14);
      x.restore();
    }
    raccordo(im, PARETE_SU, PARETE_GIU, -y0, ALT_PARETE - y0, 60);      // verso l'interno torna il colore pieno: lì continua il riempimento
    for (const o of cose) if (o.y > y0 - 160 && o.y < y1 + 160) { const c3 = U.semi(o.seme); x.save(); x.translate(o.x, o.y); x.rotate(o.rot); x.scale(o.s, o.s); if (o.tipo === 2) molle(x, c3, 40, MOLLI[o.seme % MOLLI.length]); else alghetta(x, c3, o.tipo, 44, VERDI[o.seme % VERDI.length]); x.restore(); }
    vela(im, ACQUA, VELO_PARETE);
    tele.push(im);
  }
  return tele;
}
/* La scogliera scura che esce dall'acqua sopra la parete: 256×384 unità. */
const RUPE_ALTA = 236, RUPE = ['#8d9b96', '#5c726f'];
function scoglieraEmersa() {
  const im = tela(256, 384), x = penna(im), caso = U.semi(717), A = RUPE_ALTA;
  x.translate(256, 384);
  const orlo = [[-230, -A - 6], [-180, -A + 4], [-140, -A + 30], [-122, -A + 78], [-128, -A + 110], [-100, -A + 136], [-84, -100], [-96, -72], [-66, -52], [-44, -24]];
  x.fillStyle = RUPE[0]; x.beginPath(); x.moveTo(-258, 8); x.lineTo(-258, -A);
  for (let i = 0; i < orlo.length - 1; i++) x.quadraticCurveTo(orlo[i][0], orlo[i][1], (orlo[i][0] + orlo[i + 1][0]) / 2, (orlo[i][1] + orlo[i + 1][1]) / 2);
  x.quadraticCurveTo(-44, -24, -20, 8); x.closePath(); x.fill();
  x.save(); x.clip();
  x.fillStyle = sfuma(x, RUPE[0], RUPE[1], -A - 20, 0); x.fillRect(-256, -384, 256, 392);
  for (let i = 0; i < 7; i++) {
    const yy = -A + 20 + i * 34 + caso() * 12, sp = 6 + caso() * 10, f = caso() * TAU;
    x.fillStyle = i % 2 ? 'rgba(40,66,66,.22)' : 'rgba(226,234,222,.2)'; x.beginPath();
    for (let px = -260; px <= 0; px += 20) x.lineTo(px, yy + 5 * Math.sin(px / 60 + f) + px * .04);
    for (let px = 0; px >= -260; px -= 20) x.lineTo(px, yy + sp + 5 * Math.sin(px / 75 + f + 1) + px * .04);
    x.closePath(); x.fill();
  }
  const gl = x.createLinearGradient(-150, 0, -30, 0); gl.addColorStop(0, 'rgba(232,240,226,0)'); gl.addColorStop(1, 'rgba(232,240,226,.2)');
  x.fillStyle = gl; x.fillRect(-150, -384, 150, 392);
  x.fillStyle = sfuma(x, 'rgba(40,86,78,0)', 'rgba(40,86,78,.75)', -50, 4); x.fillRect(-256, -50, 256, 60);       // la fascia bagnata, scura d'alghe
  x.restore();
  raccordo(im, RUPE[0], RUPE[1], 384 - A - 20, 384, 70);
  return im;
}

// ---------------------------------------------------------------- cielo coperto: nuvole basse e scogli lontani
function nuvole() {
  const L = 1024, A = 256, caso = U.semi(919), gruppi = [];
  const banco = (cx, cy, r, n) => { const palle = []; for (let j = 0; j < n; j++) palle.push([cx + (j - (n - 1) / 2) * r * 1.5 + (caso() - .5) * r * .4, cy - Math.sin((j + .5) / n * PI) * r * .5 * (.5 + caso() * .6), r * (.6 + caso() * .5)]); gruppi.push(palle); };
  for (let i = 0; i < 4; i++) banco((i + .1 + caso() * .8) / 4 * L, 60 + caso() * 80, 26 + caso() * 14, 5 + Math.floor(caso() * 5));
  for (let i = 0; i < 4; i++) banco((i + .1 + caso() * .8) / 4 * L, 204 + caso() * 26, 10 + caso() * 6, 6 + Math.floor(caso() * 5));
  const m = U.tela(L / 4, A / 4), x = m.getContext('2d');      // dipinte in piccolo: i bordi restano soffici
  x.scale(.25, .25);
  for (const ox of [-L, 0, L]) for (const palle of gruppi) for (let pass = 0; pass < 2; pass++) {
    x.fillStyle = pass ? 'rgba(208,216,208,.72)' : 'rgba(84,108,114,.6)'; x.beginPath();
    for (const p of palle) { const py = p[1] + (pass ? 0 : p[2] * .4); x.moveTo(p[0] + ox + p[2] * 1.7, py); x.ellipse(p[0] + ox, py, p[2] * 1.7, p[2] * (pass ? .8 : .9), 0, 0, TAU); }
    x.fill();
  }
  const im = tela(L / 2, A / 2), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, L / 2, A / 2);
  return im;
}
function scogliLontani() {
  const W = 480, H = 160, m = U.tela(W / 2, H / 2), x = penna(m), caso = U.semi(929);
  x.scale(.5, .5); x.translate(W / 2, H - 6);
  const isolotto = (cx, w, h) => {      // una cresta frastagliata: punte basse e disuguali, mai una torre
    const n = 7, p = [[cx - w / 2, 8]];
    for (let i = 0; i <= n; i++) { const u = i / n; p.push([cx - w / 2 + w * u + (caso() - .5) * w * .06, -h * Math.pow(Math.sin(PI * (.08 + u * .84)), .7) * (.55 + caso() * .45)]); }
    p.push([cx + w / 2, 8]);
    x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (const q of p) x.lineTo(q[0], q[1]); x.closePath(); x.fill();
  };
  x.fillStyle = sfuma(x, '#7a9092', '#5f7a7a', -110, 0); x.lineJoin = 'round';
  isolotto(-96, 210, 104); isolotto(60, 150, 58); isolotto(170, 90, 36);
  x.fillStyle = 'rgba(232,240,230,.2)'; x.beginPath(); x.moveTo(-190, 0); x.lineTo(-150, -70); x.lineTo(-120, -96); x.lineTo(-128, -40); x.lineTo(-150, 0); x.closePath(); x.fill();     // un fianco appena più chiaro
  x.fillStyle = 'rgba(232,238,228,.7)'; x.beginPath(); x.ellipse(-10, 6, 226, 7, 0, 0, TAU); x.fill();
  const im = tela(W, H), y = im.getContext('2d');
  y.imageSmoothingQuality = 'high'; y.drawImage(m, 0, 0, W, H);
  vela(im, '#b9c6bd', .5);
  return { im, w: W, h: H };
}
/* L'alone caldo di una finestra accesa: la trasparenza è già dentro la tela (`forza` 1 per quello che tremola, più tenue
   per quello fermo che si usa con la visuale larga). */
function alone(forza) {
  const im = tela(128, 128), x = im.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,206,132,' + (.5 * forza).toFixed(3) + ')'); g.addColorStop(.4, 'rgba(255,190,110,' + (.2 * forza).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,180,100,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return im;
}

// ---------------------------------------------------------------- il corredo: tutte le tele, dipinte una volta sola
let corredo = null;
function prepara() {
  if (corredo) return corredo;
  pixel = 0;
  const co = {};
  co.alberi = [mosaico(160, -1300, 460, -150, x => dipingiTronco(x, MAESTRO)), mosaico(-330, -870, -210, -400, x => dipingiTronco(x, MEZZANA))];
  co.pennoni = ALBERI.map(al => al.pennoni.map(p => figuraPennone(p, limita(1 + (al.piede + 236 + p.v) / 1100, 0, 1))));
  co.poppa = mosaico(-640, -696, 640, 72, dipingiPoppa, S, 256);
  co.prua = mosaico(-320, -664, 640, 72, dipingiPrua, S, 256);
  co.alone = alone(1); co.aloneFermo = alone(.62);
  co.tipi = figurineFondale();
  co.formazioni = grandiScogli();
  co.vicine = coseVicine();
  co.piani = pianiLontani();
  co.cresta = [crestaSabbia(0), crestaSabbia(1)];
  co.corpo = corpoSabbia();
  co.profonda = sabbiaProfonda();
  co.dorsale = dorsaleFango();
  co.luceFondo = reteDiLuce(88, 6, .15, true);      // la forza è già dentro la tela: copiarla con globalAlpha diverso da 1 costa più del doppio
  co.parete = pareti();
  co.rupe = scoglieraEmersa();
  co.nuvole = nuvole();
  co.scogli = scogliLontani();
  co.pixel = pixel;
  return corredo = co;
}

// ---------------------------------------------------------------- ciò che si muove
const LAME_DIETRO = [0, 1, 2].map(i => ({ x: (i + rumore(i, 131) * .7) / 3, w: 24 + rumore(i, 132) * 36, a: .5 + rumore(i, 133) * .5, b: .2 + rumore(i, 134) * .25, f: rumore(i, 135) * TAU, v: .85 + rumore(i, 136) * .3 }));
const LAME_VELO = [0, 1].map(i => ({ x: (i + rumore(i, 141) * .7) / 2, w: 30 + rumore(i, 142) * 30, a: .5 + rumore(i, 143) * .5, b: .16 + rumore(i, 144) * .2, f: rumore(i, 145) * TAU, v: .9 + rumore(i, 146) * .2 }));
/* Lame di luce oblique (misure di schermo): partono dal pelo dell'acqua e si spengono scendendo. */
function lame(c, v, lista, forza, par, daY) {
  const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, t = v.t;
  const ys = vh / 2 - cam.y * z, fine = ys + 2100 * z, y0 = Math.max(daY, 0), y1 = Math.min(vh, fine);
  if (y1 <= y0 + 10 || forza < .01) return;
  c.fillStyle = sfuma(c, 'rgba(214,250,226,1)', 'rgba(214,250,226,0)', ys, fine);
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
const COL_SARTIE = mesc(CORDA, ACQUA, .5), COL_VELA_SU = mesc(TELA, ACQUA, .52), COL_VELA_GIU = mesc(TELA, FONDA, .68), COL_PIEGA = mesc(TELA, FONDA, .74), COL_FIAMMA = mesc(ROSSO, ACQUA, .42);
const N_COL = 7;
/* Sartie e griselle (ferme), cime che pendono, brandelli di vela e la fiamma in testa d'albero (che ondeggiano piano). */
function attrezzatura(c, v, sc, xa, xb, ya, yb) {
  const a = sc.attrezzi, t = v.t;
  if (a.x1 < xa || a.x0 > xb || a.y1 < ya || a.y0 > yb) return;
  c.strokeStyle = COL_SARTIE;
  c.lineWidth = 2.2; c.beginPath();
  for (let i = 0, s = a.sartie; i < s.length; i += 4) { c.moveTo(s[i], s[i + 1]); c.lineTo(s[i + 2], s[i + 3]); }
  for (const p of a.pendenti) { const dx = p.amp * Math.sin(t * .5 + p.f); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x + dx * .3 + p.pancia, p.y + p.lun * .55, p.x + dx + p.cadi, p.y + p.lun); }
  c.stroke();
  c.lineWidth = 1.3; c.beginPath();
  for (let i = 0, s = a.griselle; i < s.length; i += 4) { c.moveTo(s[i], s[i + 1]); c.lineTo(s[i + 2], s[i + 3]); }
  c.stroke();
  // i brandelli di vela: appesi al pennone, a colonne di lunghezza diversa (l'orlo strappato)
  c.fillStyle = sfuma(c, COL_VELA_SU, COL_VELA_GIU, a.y0 + 200, a.y1 - 200);
  for (const s of a.vele) {
    if (s.x1 < xa || s.x0 > xb || s.y1 < ya || s.y0 > yb) continue;
    c.beginPath(); c.moveTo(s.ax, s.ay); c.lineTo(s.bx, s.by);
    for (let j = N_COL; j >= 0; j--) {
      const u = j / N_COL, tx = s.ax + (s.bx - s.ax) * u, ty = s.ay + (s.by - s.ay) * u, l = s.lun * s.prof[j], dx = s.amp * Math.sin(t * .55 + s.f + u * 2.4), bx = tx + dx + s.cadi * l, by = ty + l;
      if (j === N_COL) c.quadraticCurveTo(tx + dx * .4 + s.pancia, ty + l * .5, bx, by); else c.lineTo(bx, by);
      if (j === 0) c.quadraticCurveTo(tx + dx * .4 - s.pancia, ty + l * .5, s.ax, s.ay);
    }
    for (const b of s.buchi) {      // gli strappi: losanghe lunghe e strette, bucate con la regola pari-dispari
      const tx = s.ax + (s.bx - s.ax) * b.u, ty = s.ay + (s.by - s.ay) * b.u, k = s.amp * Math.sin(t * .55 + s.f + b.u * 2.4) + s.cadi * b.l, sm = (b.s0 + b.s1) / 2;
      c.moveTo(tx + k * b.s0, ty + b.l * b.s0); c.lineTo(tx + k * sm + b.w, ty + b.l * sm); c.lineTo(tx + k * b.s1, ty + b.l * b.s1); c.lineTo(tx + k * sm - b.w, ty + b.l * sm); c.closePath();
    }
    c.fill('evenodd');
  }
  if (v.qualita > 0) {      // le pieghe
    c.strokeStyle = COL_PIEGA; c.lineWidth = 2; c.beginPath();
    for (const s of a.vele) if (s.x1 > xa && s.x0 < xb && s.y1 > ya && s.y0 < yb) for (let j = 1; j < N_COL; j += 2) {
      const u = j / N_COL, tx = s.ax + (s.bx - s.ax) * u, ty = s.ay + (s.by - s.ay) * u, l = s.lun * s.prof[j] * .86, dx = s.amp * Math.sin(t * .55 + s.f + u * 2.4);
      c.moveTo(tx, ty + 3); c.quadraticCurveTo(tx + dx * .3, ty + l * .5, tx + dx * .86 + s.cadi * l, ty + l);
    }
    c.stroke();
  }
  // la fiamma in testa d'albero
  const f = a.fiamma, n = 7;
  c.fillStyle = COL_FIAMMA; c.beginPath(); c.moveTo(f.x, f.y - 9);
  for (let i = 1; i <= n; i++) { const u = i / n; c.lineTo(f.x + u * f.lun, f.y - 9 * (1 - u) + u * 26 + Math.sin(t * 1.1 - u * 5) * 9 * u); }
  for (let i = n - 1; i >= 0; i--) { const u = i / n; c.lineTo(f.x + u * f.lun, f.y + 9 * (1 - u) + u * 26 + Math.sin(t * 1.1 - u * 5 + .5) * 9 * u); }
  c.closePath(); c.fill();
}

/* Un ciuffo d'erba marina: nastri sottili piegati dalla corrente. */
function ciuffo(c, e, t) {
  const corr = .3 + Math.sin(t * .45 + e.x * .006) * .45 + Math.sin(t * .8 + e.f) * .18, nastri = e.nastri, n = nastri.length;
  for (let pass = 0; pass < 2; pass++) {
    c.fillStyle = pass ? e.col1 : e.col0; c.beginPath();
    for (let i = pass; i < n; i += 2) {
      const l = nastri[i], sv = (corr + Math.sin(t * 1.1 + l.f) * .2) * l.h * .3 + l.inc, bx = e.x + l.dx, mx = bx + sv * .25, my = e.y - l.h * .6, w = l.w;
      c.moveTo(bx - w, e.y + 4); c.quadraticCurveTo(mx - w * .8, my, bx + sv, e.y - l.h); c.quadraticCurveTo(mx + w * .8, my, bx + w, e.y + 4);
    }
    c.fill();
  }
}

// ---------------------------------------------------------------- pezzi della passata «dietro»
const FILE_NUVOLE = [{ y: -372, k: 1, par: .6, fase: 0 }, { y: -1010, k: 1.5, par: .42, fase: 600 }];
const SCOGLI = [{ x: .24, par: .74, k: .9 }, { x: .72, par: .8, k: .6 }];
function cielo(c, v, sc, xa, xb, ya) {
  const t = v.t, cam = v.cam, co = sc.co, W = sc.W, passo = 24, x0 = Math.floor((xa - 30) / passo) * passo, x1 = xb + 30 + passo, su = Math.min(ya - 20, -40);
  c.save();
  c.beginPath(); c.moveTo(x0, su);                       // tutto il cielo sta sopra l'onda
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.lineTo(x1, su); c.closePath(); c.clip();
  c.fillStyle = sfuma(c, '#58767f', '#c4cdbf', -1100, 0); c.fillRect(xa - 4, su, xb - xa + 8, 30 - su);
  const sx = cam.x * .8 + W * .2, sy = -300, sr = 380;      // un chiarore dietro le nuvole, che segue piano la visuale
  if (ya < sy + sr) {
    const gs = c.createRadialGradient(sx, sy, 0, sx, sy, sr); gs.addColorStop(0, 'rgba(240,244,230,.6)'); gs.addColorStop(1, 'rgba(240,244,230,0)');
    c.fillStyle = gs; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  }
  for (const o of SCOGLI) {
    const w = co.scogli.w * o.k, h = co.scogli.h * o.k, x = cam.x * o.par + W * o.x * (1 - o.par);
    if (x + w / 2 > xa && x - w / 2 < xb) c.drawImage(co.scogli.im, x - w / 2, 10 - h, w, h);
  }
  for (const r of FILE_NUVOLE) {
    const lw = 1400 * r.k, lh = 350 * r.k;
    if (r.y + lh < ya) continue;
    const sposta = cam.x * r.par + r.fase + t * 4;
    for (let x = Math.floor((xa - sposta) / lw) * lw + sposta; x < xb; x += lw) c.drawImage(co.nuvole, x, r.y, lw + .5, lh);
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
      if (fuori > 252) { c.fillStyle = sfuma(c, RUPE[0], RUPE[1], -RUPE_ALTA - 20, 0); c.fillRect(-OLTRE, -RUPE_ALTA - 4, OLTRE - 255, RUPE_ALTA + 8); }
    }
    c.restore();
  }
}
function superficie(c, v, sc, xa, xb) {
  const t = v.t, passo = 24, x0 = Math.floor((xa - 30) / passo) * passo, x1 = xb + 30 + passo;
  c.fillStyle = sfuma(c, 'rgba(206,236,222,.42)', 'rgba(190,230,214,0)', 0, 240);      // la luce che entra sotto il pelo dell'acqua
  c.beginPath(); c.moveTo(x0, 240);
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.lineTo(x1, 240); c.closePath(); c.fill();
  if (v.qualita > 0) {      // riflessi che scorrono appena sotto
    c.fillStyle = 'rgba(236,248,236,.26)'; c.beginPath();
    for (let i = Math.floor(xa / 64) - 1, fine = Math.floor(xb / 64) + 1; i <= fine; i++) {
      const vivo = Math.sin(t * (.7 + rumore(i, 3) * .8) + rumore(i, 5) * TAU);
      if (vivo < -.2) continue;
      const cx = i * 64 + rumore(i, 7) * 64 + Math.sin(t * .4 + i) * 12, cy = 20 + rumore(i, 9) * 90, rx = (14 + rumore(i, 11) * 34) * (.5 + vivo * .5), ry = 2 + rumore(i, 13) * 2.4;
      c.moveTo(cx + rx, cy); c.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    }
    c.fill();
  }
  // il pelo dell'acqua: una fascia chiara tra l'onda di dietro e quella davanti, poi il filo bianco
  c.fillStyle = 'rgba(196,226,214,.8)'; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t) + 1);
  for (let x = x1; x >= x0; x -= passo) c.lineTo(x, onda(x + 150, t + 1.7) * .8 - 9);
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(16,96,92,.3)'; c.lineWidth = 3; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t) + 5);
  c.stroke();
  c.strokeStyle = 'rgba(248,252,246,.92)'; c.lineWidth = 3; c.beginPath();
  for (let x = x0; x <= x1; x += passo) c.lineTo(x, onda(x, t));
  c.stroke();
}
function fondaleDietro(c, v, sc, xa, xb) {
  const co = sc.co, H = sc.H, t = v.t;
  for (const e of sc.dietro) { if (e.x1 < xa || e.x0 > xb) continue; if (e.ci) ciuffo(c, e.ci, t); else c.drawImage(e.im, e.dx, e.dy, e.w, e.h); }
  for (let i = Math.floor(xa / 512), i1 = Math.floor(xb / 512); i <= i1; i++) c.drawImage(co.dorsale, i * 512, H - 88, 512, 128);
}
function galeone(c, v, sc, xa, xb, ya, yb) {
  const np = sc.dopoAlberi;      // prima i tronchi degli alberi, poi i pennoni (ruotati), poi lo scafo
  for (let i = 0; i < np; i++) { const q = sc.pezzi[i]; if (q.x + q.w > xa && q.x < xb && q.y + q.h > ya && q.y < yb) c.drawImage(q.im, q.x, q.y, q.w, q.h); }
  for (const q of sc.pennoni) {
    if (q.x + q.r < xa || q.x - q.r > xb || q.y + q.r < ya || q.y - q.r > yb) continue;
    c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.drawImage(q.f.im, -q.f.ax, -q.f.ay, q.f.w, q.f.h); c.restore();
  }
  for (let i = np; i < sc.pezzi.length; i++) { const q = sc.pezzi[i]; if (q.x + q.w > xa && q.x < xb && q.y + q.h > ya && q.y < yb) c.drawImage(q.im, q.x, q.y, q.w, q.h); }
  attrezzatura(c, v, sc, xa, xb, ya, yb);
  if (v.qualita > 0) {      // gli aloni caldi di finestre, oblò e fanale: tremolano appena
    const t = v.t, piccolo = v.cam.z * (v.dpr || 1) < 1.3, im = piccolo ? sc.co.aloneFermo : sc.co.alone;      // con la visuale larga stanno fermi: una copia con globalAlpha costa il doppio
    for (const l of sc.luci) {
      if (l.x + l.r < xa || l.x - l.r > xb || l.y + l.r < ya || l.y - l.r > yb) continue;
      if (!piccolo) c.globalAlpha = l.forza * (.66 + .2 * Math.sin(t * 1.3 + l.f) + .1 * Math.sin(t * 3.7 + l.f * 2.3));
      c.drawImage(im, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    c.globalAlpha = 1;
  }
}
function fondaleDavanti(c, v, sc, xa, xb, ya, yb) {
  const co = sc.co, H = sc.H, t = v.t, q = v.qualita, i0 = Math.floor(xa / 512), i1 = Math.floor(xb / 512), piccolo = v.cam.z * (v.dpr || 1) < 1.3;
  for (const e of sc.fila) { if (e.x1 < xa || e.x0 > xb) continue; if (e.ci) ciuffo(c, e.ci, t); else c.drawImage(e.im, e.dx, e.dy, e.w, e.h); }
  // la sabbia davanti: prima il colore pieno, poi cresta e corpo
  if (yb > H + 30) { c.fillStyle = SAB[2]; c.fillRect(xa - 4, H + 30, xb - xa + 8, yb - H - 26); }
  if (yb > H + 230) {      // il fondo in profondità, sempre più scuro scendendo
    if (piccolo) c.imageSmoothingEnabled = false;      // con la visuale larga un pixel della tela è circa un pixel dello schermo: senza filtro costa un quarto
    for (let y = H + 230; y < yb; y += 512) for (let i = i0; i <= i1; i++) c.drawImage(co.profonda, i * 512, y, 512.5, 512.5);
    if (piccolo && q > 0) c.imageSmoothingEnabled = true;
    c.fillStyle = sfuma(c, 'rgba(6,36,40,0)', 'rgba(6,36,40,.6)', H + 300, H + 1700); c.fillRect(xa - 4, H + 300, xb - xa + 8, yb - H - 296);
  }
  for (let i = i0; i <= i1; i++) {
    c.drawImage(co.cresta[((i % 2) + 2) % 2], i * 512, H - 44, 512, 128);
    if (yb > H + 84) c.drawImage(co.corpo, i * 512, H + 84, 512, 256);
  }
  if (q > 0) {      // la luce che balla sul fondo
    for (let giro = 0, giri = piccolo ? 1 : q; giro < giri; giro++) {
      const sposta = mezzo(giro ? -t * 6 + 90 : t * 8);
      for (let x = Math.floor((xa - sposta) / 256) * 256 + sposta; x < xb; x += 256) c.drawImage(co.luceFondo, x, H - 60 + giro * 22, 256, 256);
    }
  }
  for (const e of sc.suolo) if (e.x1 > xa && e.x0 < xb) c.drawImage(e.im, e.dx, e.dy, e.w, e.h);
}

// ---------------------------------------------------------------- l'ambiente
B.ambienti.registra({
  id: 'relitto',
  descrizione: 'Un galeone spezzato sul fondo, tra acque verde petrolio, catene e vecchie casse.',
  colori: { acquaAlta: '#2a8a80', acquaBassa: '#0a3c42', sabbia: '#7f9080', roccia: '#35585a', accento: '#d0803e' },   // l'interfaccia ci scrive sopra in bianco

  /* Il gioco la chiama quando si passa a un altro ambiente: le tele si rifanno alla prossima crea(). */
  libera() { corredo = null; },

  crea(mondo, caso) {
    const co = prepara(), W = mondo.w, H = mondo.h;
    const tra = (a, b) => a + caso() * (b - a), uno = l => l[Math.floor(caso() * l.length)];
    const sc = { co, W, H, pezzi: [], pennoni: [], dopoAlberi: 0, luci: [], attrezzi: null, formazioni: [], dietro: [], fila: [], suolo: [], sorgenti: [], vicine: [] };

    // il galeone: i due tronconi e l'albero maestro
    const xNave = mezzo(tra(480, 620)), xp = xNave + POPPA.perno, xr = xNave + PRUA.perno + Math.round(tra(30, 90));      // dove stanno i perni dei due tronconi
    const metti = (tele, X) => { for (const q of tele) sc.pezzi.push({ im: q.im, x: X + q.x, y: H + q.y, w: q.w, h: q.h }); };
    for (const tele of co.alberi) metti(tele, xp);
    sc.dopoAlberi = sc.pezzi.length;
    metti(co.poppa, xp); metti(co.prua, xr);
    const dallaPoppa = (sx, sy) => { const p = daNave(POPPA, sx, sy); return [xp + p[0], H + p[1]]; }, dallaPrua = (sx, sy) => { const p = daNave(PRUA, sx, sy); return [xr + p[0], H + p[1]]; };
    const dall = al => (u, v) => { const q = daAlbero(al, u, v); return dallaPoppa(q[0], q[1]); }, dalMaestro = dall(MAESTRO), dallaMezzana = dall(MEZZANA), M = MAESTRO, Z = MEZZANA;
    for (const l of LUCI_POPPA) { const p = dallaPoppa(l.x, l.y); sc.luci.push({ x: mezzo(p[0]), y: mezzo(p[1]), r: l.tondo ? 34 : 44, forza: l.forza, f: tra(0, TAU) }); }
    for (const l of LUCI_PRUA) { const p = dallaPrua(l.x, l.y); sc.luci.push({ x: mezzo(p[0]), y: mezzo(p[1]), r: 32, forza: l.forza, f: tra(0, TAU) }); }
    { const p = dallaPoppa(FANALE.x, FANALE.y); sc.luci.push({ x: mezzo(p[0]), y: mezzo(p[1]), r: 52, forza: 1, f: tra(0, TAU) }); }

    // i pennoni (capi[0..2] del maestro, capi[3] della mezzana)
    const capi = [];
    [[M, dalMaestro], [Z, dallaMezzana]].forEach(([al, da], n) => al.pennoni.forEach((p, i) => {
      const cc = da(p.u, p.v), ca = Math.cos(p.incl), sa = Math.sin(p.incl);
      sc.pennoni.push({ f: co.pennoni[n][i], x: cc[0], y: cc[1], rot: POPPA.ang + al.incl + p.incl, r: p.m + 24 });
      capi.push({ a: da(p.u - ca * p.m, p.v - sa * p.m), b: da(p.u + ca * p.m, p.v + sa * p.m), punto: k => da(p.u + ca * p.m * k - sa * 8, p.v + sa * p.m * k + ca * 8) });
    }));
    // sartie, griselle, stragli; cime che pendono; brandelli di vela; la fiamma
    const sartie = [], griselle = [], pendenti = [], vele = [];
    const lega = (l, a, b) => l.push(a[0], a[1], b[0], b[1]), tra2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const scala = (apice, basi, da, a) => {      // un ventaglio di sartie con i suoi gradini
      for (const b of basi) lega(sartie, apice, b);
      for (let u = da; u < a; u += 22 / Math.hypot(basi[0][0] - apice[0], basi[0][1] - apice[1])) lega(griselle, tra2(basi[0], apice, u), tra2(basi[basi.length - 1], apice, u));
    };
    scala(dalMaestro(0, -M.basso + 30), [-132, -96, -60, -24, 34, 70].map(d => dallaPoppa(M.x + d, cinta(M.x + d) + 2)), .06, .88);
    scala(dalMaestro(6, -M.alto + 30), [-52, -30, 40, 62].map(d => dalMaestro(d, -M.basso - 2)), .08, .86);
    scala(dallaMezzana(0, -Z.basso + 24), [-66, -38, -10, 42].map(d => dallaPoppa(Z.x + d, casseretto(Z.x + d) + 2)), .08, .86);
    lega(sartie, dalMaestro(6, -M.alto + 20), dallaPoppa(330, cassero(330)));                 // i paterazzi, verso poppa
    lega(sartie, dalMaestro(10, -M.cima + 30), dallaMezzana(0, -Z.basso + 10));
    lega(sartie, dalMaestro(0, -M.basso + 20), dallaPoppa(545, cassero(545)));
    lega(sartie, dallaMezzana(0, -Z.basso + 16), dalMaestro(0, -150));                         // lo straglio di mezzana
    for (let i = 0; i < 2; i++) { const su = dalMaestro(M.pennoni[i].u, M.pennoni[i].v - 120); lega(sartie, su, capi[i].a); lega(sartie, su, capi[i].b); }      // gli amantigli
    lega(sartie, capi[3].b, dallaPoppa(330, cassero(330)));
    lega(sartie, dallaPrua(1900, -570), dallaPrua(1858, -398));                                // dal bompresso allo sperone e al castello di prua, e lo straglio del trinchetto spezzato
    lega(sartie, dallaPrua(1770, -502), dallaPrua(1686, castello(1686) + 2));
    lega(sartie, dallaPrua(1480, -486), dallaPrua(1690, -461));
    const pende = (p, lun) => pendenti.push({ x: p[0], y: p[1], lun, amp: lun * tra(.05, .1), f: tra(0, TAU), pancia: tra(-14, 14), cadi: tra(-16, 16) });
    pende(capi[0].a, tra(120, 200)); pende(capi[0].b, tra(90, 170)); pende(capi[1].b, tra(110, 180)); pende(capi[2].b, tra(60, 110)); pende(capi[3].a, tra(70, 120));
    pende(dalMaestro(6, -M.alto + 40), tra(240, 330)); pende(dallaPrua(1940, -590), tra(120, 190)); pende(dallaPrua(1760, -500), tra(90, 150));
    const brandello = (i, k0, k1, lun) => {
      const a = capi[i].punto(k0), b = capi[i].punto(k1), prof = [];
      for (let j = 0; j <= N_COL; j++) prof.push(tra(.5, 1));
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]), buchi = [];
      if (lun > 120 && largo > 90) for (let n = caso() < .5 ? 2 : 1, q = 0; q < n; q++) {      // uno o due strappi nei brandelli grandi, a metà tra due pieghe
        const j = 2 * Math.floor(tra(0, N_COL / 2 - .01)), s0 = tra(.2, .42);
        buchi.push({ u: (j + .5) / N_COL + (q ? .25 : 0), l: lun * Math.min(prof[j], prof[j + 1]), s0, s1: s0 + tra(.2, .32), w: largo * tra(.02, .035) });
      }
      vele.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], lun, prof, buchi: buchi.filter(q => q.u < .9), amp: lun * tra(.05, .09), f: tra(0, TAU), pancia: tra(4, 12), cadi: tra(-.08, .08),
        x0: Math.min(a[0], b[0]) - lun * .3 - 20, x1: Math.max(a[0], b[0]) + lun * .3 + 20, y0: Math.min(a[1], b[1]) - 10, y1: Math.max(a[1], b[1]) + lun + 10 });
    };
    brandello(0, -.94, -.2, tra(190, 250)); brandello(0, .34, .62, tra(120, 170)); if (caso() < .6) brandello(0, .72, .95, tra(60, 100));
    brandello(1, -.9, .05, tra(160, 220)); if (caso() < .7) brandello(1, .4, .8, tra(80, 130));
    brandello(2, .1, .9, tra(70, 110));
    brandello(3, -.8, -.1, tra(110, 160)); if (caso() < .6) brandello(3, .2, .6, tra(60, 100));
    const cima = dalMaestro(10, -M.cima + 4);
    sc.attrezzi = { sartie: new Float32Array(sartie), griselle: new Float32Array(griselle), pendenti, vele, fiamma: { x: cima[0], y: cima[1], lun: tra(90, 130) }, x0: xNave - 140, x1: xr + 760, y0: cima[1] - 60, y1: H };

    // chi sta sul fondo, su due file: tra i tronconi e attorno, i resti del carico; più in là, rocce
    const occupati = [[], []];
    const libero = (fila, x, m) => occupati[fila].every(o => Math.abs(o[0] - x) > (o[1] + m) * .5);
    const posa = (f0, x, dietro) => {
      const f = dietro ? f0.lontana : f0, fila = dietro ? 0 : 1;
      if (!f || !libero(fila, x, f.w / 2)) return null;
      const m = f.w / 2, y = H + (dietro ? dorsale(x) + 9 : duna(x) + 7);
      occupati[fila].push([x, m]);
      const e = { im: f.im, w: f.w, h: f.h, dx: mezzo(x - f.ax), dy: mezzo(y - f.ay), x0: x - m, x1: x + m, alto: f.h + caso() * 26 };
      (dietro ? sc.dietro : sc.fila).push(e);
      return e;
    };
    const t = co.tipi, xRotta = xp + 520, xFine = xr + 700;      // più o meno dove il galeone si è spezzato, e dove finisce
    // i grandi scogli velati, ai due capi del mondo
    const scoglio = (f, cx) => { const k = tra(.9, 1.15); sc.formazioni.push({ f, s: k, specchio: caso() < .5, x: mezzo(cx), y: H + 22, cy: H + 22 - f.ay * k / 2, margine: Math.max(f.w, f.h) * k * .5 }); };
    const alto = caso() < .5 ? 1 : 0;      // da che parte sta lo scoglio alto
    scoglio(co.formazioni[alto], tra(100, Math.max(130, xNave - 270))); scoglio(co.formazioni[1 - alto], tra(Math.min(W - 150, xFine + 110), W - 100));
    // i pezzi forti: il cannone caduto e il forziere socchiuso vicino alla rottura; ai lati le costole di un relitto più vecchio e un'ancora
    posa(t.cannone[0], xRotta + tra(-30, 70), false);
    posa(t.palle[0], xRotta + tra(-30, 70) + 96, false);
    posa(t.forziere[0], xRotta + (caso() < .5 ? -1 : 1) * tra(170, 260), false);
    const costoleASinistra = caso() < .5;
    posa(uno(t.costole), costoleASinistra ? tra(150, xNave - 150) : tra(xFine + 60, W - 150), caso() < .6);
    posa(t.ancora[0], costoleASinistra ? tra(xFine + 80, W - 140) : tra(130, xNave - 130), false);
    for (let cx = tra(20, 120); cx < W + 40; ) {
      const vicino = Math.abs(cx - xRotta) < 420, sottoNave = cx > xNave - 60 && cx < xr + 420, quanti = 2 + Math.floor(caso() * 3), largo = tra(60, 130);
      for (let i = 0; i < quanti; i++) {
        const r = caso();
        const f0 = vicino ? (r < .25 ? uno(t.cassa) : r < .5 ? uno(t.botte) : r < .65 ? uno(t.palle) : r < .82 ? uno(t.tavole) : uno(t.anfora))
          : sottoNave ? (r < .3 ? uno(t.masso.slice(2)) : r < .5 ? uno(t.botte) : r < .7 ? uno(t.anfora) : r < .85 ? uno(t.tavole) : uno(t.cassa))
          : (i === 0 || r < .45 ? uno(t.masso) : r < .7 ? uno(t.alga) : r < .82 ? uno(t.anfora) : r < .93 ? uno(t.tavole) : uno(t.botte));
        const dietro = !!f0.lontana && caso() < (sottoNave ? .2 : .4);
        for (let prova = 0; prova < 4; prova++) if (posa(f0, cx + (caso() + caso() - 1) * largo * (1 + prova * .3), dietro)) break;
      }
      cx += largo + tra(90, 220);
    }
    for (let i = 0; i < W / 260; i++) posa(uno(t.alga), tra(-30, W + 30), caso() < .4);
    // ciuffi d'erba marina che ondeggiano piano: pochi e spenti, qua e là
    const prato = (x, dietro) => {
      const nastri = [], n = 6 + Math.floor(caso() * 4), k = dietro ? .72 : 1;
      for (let i = 0; i < n; i++) nastri.push({ dx: ((i / (n - 1) - .5) * 26 + tra(-4, 4)) * k, h: tra(36, 84) * k, w: tra(2.2, 3.4) * k, inc: tra(-6, 6) * k, f: caso() * TAU });
      const verde = caso() < .6 ? ['#3f7a62', '#5f9a74'] : ['#4a7f5c', '#7aa878'], y = H + (dietro ? dorsale(x) + 6 : duna(x) + 5), vel = dietro ? .5 : .16;
      (dietro ? sc.dietro : sc.fila).push({ ci: { x, y, f: caso() * TAU, nastri, col0: mesc(verde[0], FONDA, vel), col1: mesc(verde[1], FONDA, vel) }, x0: x - 70, x1: x + 70, alto: 90 * k + caso() * 30 });
    };
    for (let i = 0; i < W / 190; i++) { const x = tra(-40, W + 40), dietro = caso() < .35; for (let j = 0, n = 1 + Math.floor(caso() * 3); j < n; j++) prato(x + j * tra(14, 34), dietro); }
    sc.dietro.sort((a, b) => b.alto - a.alto);
    sc.fila.sort((a, b) => b.alto - a.alto);

    // monete, cime arrotolate, assi, palle di cannone e sassi sulla sabbia
    const appoggia = (f, x, giu) => { const y = H + duna(x) + giu; if (sc.suolo.some(o => Math.abs(o.cx - x) < 50 && Math.abs(o.cy - y) < 30)) return; sc.suolo.push({ im: f.im, w: f.w, h: f.h, cx: x, cy: y, dx: mezzo(x - f.ax), dy: mezzo(y - f.ay), x0: x - f.w, x1: x + f.w }); };
    for (let i = 0; i < 5; i++) appoggia(uno(t.monete), xRotta + tra(-460, 460), tra(18, 60));
    for (let i = 0; i < 3; i++) appoggia(t.rotolo[0], tra(xNave, xFine), tra(22, 60));
    for (let i = 0; i < W / 300; i++) appoggia(uno(t.asse), tra(-60, W + 60), tra(18, 70));
    for (let i = 0; i < W / 420; i++) appoggia(t.palla[0], xRotta + tra(-760, 760), tra(16, 60));
    for (let i = 0; i < W / 130; i++) appoggia(uno(t.sasso), tra(-60, W + 60), tra(14, 130));

    // in primo piano, solo ai bordi del mondo: un brandello di rete da una parte, una cima o due dall'altra
    const reteASinistra = caso() < .5, vicina = (f, sinistra, y) => sc.vicine.push({ f, x: sinistra ? tra(20, 70) : W - tra(20, 70), y, s: tra(.8, 1), fase: caso() * TAU, specchio: caso() < .5 });
    vicina(co.vicine.rete, reteASinistra, H - tra(1000, 700)); vicina(co.vicine.cima, !reteASinistra, H - tra(1200, 800)); vicina(co.vicine.cima, reteASinistra, tra(500, 900));

    // da dove salgono le bollicine: dallo squarcio, dai boccaporti, dalla rottura
    for (const p of [dallaPoppa(735, -150), dallaPoppa(430, -300), dallaPoppa(140, -420), dallaPoppa(1010, -200), dallaPrua(1240, -290), dallaPrua(1520, -380)]) sc.sorgenti.push({ x: p[0], y: p[1], f: caso(), alt: tra(420, 700) });
    return sc;
  },

  /* Misure di schermo: acqua, lame di luce deboli, tre piani di scogli e relitti lontani. */
  sfondo(c, v, sc) {
    const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, H = v.mondo.h, mh = vh / 2 / z, q = v.qualita;
    const g = c.createLinearGradient(0, 0, 0, vh);       // due soli colori: con tre la sfumatura costa più del doppio
    g.addColorStop(0, tinta((cam.y - mh) / H)); g.addColorStop(1, tinta((cam.y + mh) / H));
    c.fillStyle = g; c.fillRect(0, 0, vw, vh);
    if (!sc) return;
    c.save();
    const dpr = v.dpr || 1, fermo = n => Math.round(n * dpr) / dpr, prof = limita(cam.y / H, 0, 1);
    if (q > 0) lame(c, v, LAME_DIETRO, .24 - prof * .12, .3, 0);
    c.imageSmoothingEnabled = false;      // i piani lontani sono già sfumati: copiati senza filtro costano un quarto e non si nota
    for (const p of sc.co.piani) {
      if (p.lusso && q === 0) continue;
      const k = 1 + (z - 1) * p.zoom, lw = p.L * k, lh = p.alt * k, piu = k === 1 ? 0 : .6;   // i piani lontani risentono meno dello zoom
      const y0 = fermo(vh / 2 + (H - cam.y) * p.pary * k - (p.rialzo + p.base) * k), yB = y0 + lh;
      if (y0 >= vh) continue;
      const x0 = fermo(-((((cam.x * p.par * k + p.fase) % lw) + lw) % lw));
      for (let x = x0; x < vw; x += lw) c.drawImage(p.im, x, y0, lw + piu, lh);
      if (yB < vh) { c.fillStyle = p.fondo; c.fillRect(0, yB - .5, vw, vh - yB + .5); }
    }
    c.restore();
  },

  /* Misure di mondo, dietro alle creature: cielo, pareti, fila di dietro, galeone, buio del fondo, superficie, fondale. */
  dietro(c, v, sc) {
    if (!sc) return;
    const cam = v.cam, W = sc.W, H = sc.H, mw = v.vw / 2 / cam.z + AGIO, mh = v.vh / 2 / cam.z + AGIO, xa = cam.x - mw, xb = cam.x + mw, ya = cam.y - mh, yb = cam.y + mh;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (v.qualita === 0) c.imageSmoothingEnabled = false;
    if (ya < 40) cielo(c, v, sc, xa, xb, ya);
    for (const f of sc.formazioni) {
      if (!v.visibile(f.x, f.cy, f.margine)) continue;
      const g = f.f, k = f.s;
      if (f.specchio) { c.save(); c.translate(f.x, f.y); c.scale(-k, k); c.drawImage(g.im, -g.ax, -g.ay, g.w, g.h); c.restore(); }
      else c.drawImage(g.im, f.x - g.ax * k, f.y - g.ay * k, g.w * k, g.h * k);
    }
    if (xa < 20 || xb > W - 20) scogliere(c, v, sc, xa, xb, ya, yb);
    if (yb > H - 340) fondaleDietro(c, v, sc, xa, xb);
    galeone(c, v, sc, xa, xb, ya, yb);
    if (v.qualita > 0 && yb > H - 1300) { c.fillStyle = sfuma(c, 'rgba(4,34,40,0)', 'rgba(4,34,40,.3)', H - 1300, H); c.fillRect(xa - 4, Math.max(ya - 4, H - 1300), xb - xa + 8, Math.min(yb, H + 30) - Math.max(ya - 4, H - 1300)); }      // il buio del fondo
    if (ya < 520) superficie(c, v, sc, xa, xb);
    if (yb > H - 340) fondaleDavanti(c, v, sc, xa, xb, ya, yb);
    c.restore();
  },

  /* Misure di mondo, davanti alle creature: bollicine che salgono dallo scafo e pulviscolo. */
  davanti(c, v, sc) {
    if (!sc || v.qualita === 0) return;
    const cam = v.cam, z = cam.z, t = v.t, H = sc.H, mw = v.vw / 2 / z, mh = v.vh / 2 / z, ya = cam.y - mh, yb = cam.y + mh;
    c.save();
    for (const e of sc.vicine) {      // scorrono un po' più del mondo (sono più vicine) e dondolano appena
      const f = e.f, x = e.x + (e.x - cam.x) * .1, w = f.w * e.s, h = f.h * e.s;
      if (!v.visibile(x, e.y + h / 2, Math.max(w, h) * .7)) continue;
      c.save(); c.translate(x, e.y); c.transform(e.specchio ? -1 : 1, 0, Math.sin(t * .5 + e.fase) * .06, 1, 0, 0);
      c.drawImage(f.im, -f.ax * e.s, 0, w, h); c.restore();
    }
    c.fillStyle = 'rgba(226,246,236,.28)'; c.beginPath();
    for (const s of sc.sorgenti) {
      if (!v.visibile(s.x, s.y - s.alt / 2, s.alt / 2 + 20)) continue;
      for (let i = 0; i < 6; i++) {
        const u = (t * .09 + s.f + i / 6) % 1, y = s.y - u * s.alt;
        if (y < ya - 10 || y > yb + 10) continue;
        const x = s.x + Math.sin(u * 11 + i * 2.1) * 12 * u + Math.sin(t * 1.7 + i) * 2, r = (1.5 + u * 2.2 + rumore(i, 3) * 1.2) * (u > .85 ? (1 - u) / .15 : 1);
        c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
      }
    }
    c.fill();
    // pulviscolo in sospensione: scende pianissimo e segue la visuale un po' più in fretta del mondo
    const lw = mw * 2.3, lh = mh * 2.3, rz = 1 / Math.sqrt(z);
    c.fillStyle = 'rgba(206,226,196,.28)'; c.beginPath();
    for (let i = 0; i < 30; i++) {
      const fx = (((rumore(i, 61) * lw - cam.x * .4 + Math.sin(t * .2 + i) * 20) % lw) + lw) % lw, fy = (((rumore(i, 63) * lh - cam.y * .4 + t * (3 + rumore(i, 65) * 6)) % lh) + lh) % lh;
      const x = cam.x - lw / 2 + fx, y = cam.y - lh / 2 + fy, r = (1 + rumore(i, 67) * 1.8) * rz;
      if (y < 6 || y > H) continue;
      c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
    }
    c.fill();
    c.restore();
  },

  /* Misure di schermo, sopra tutto: lame di luce fioche, un filo di foschia verde in basso, bordi appena più scuri. */
  velo(c, v, sc) {
    if (!sc) return;
    const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, prof = limita(cam.y / sc.H, 0, 1), ys = vh / 2 - cam.y * z, yf = vh / 2 + (sc.H - cam.y) * z;
    c.save();
    if (v.qualita > 0) {
      if (prof < .7) lame(c, v, LAME_VELO, .09 - prof * .06, .7, ys + 6);      // più giù non si vedrebbero: si risparmiano
      const su = yf - 420 * z;      // la foschia del fondo
      if (su < vh) { c.fillStyle = sfuma(c, 'rgba(60,150,128,0)', 'rgba(60,150,128,.15)', su, yf); c.fillRect(0, Math.max(0, su), vw, vh - Math.max(0, su)); }
      // i bordi appena più scuri: una fascia in alto e due ai lati (una sfumatura tonda a tutto schermo costa più del doppio)
      c.fillStyle = sfuma(c, 'rgba(3,30,36,.32)', 'rgba(3,30,36,0)', 0, vh * .24); c.fillRect(0, 0, vw, vh * .24);
      const lato = vw * .2;
      let g = c.createLinearGradient(0, 0, lato, 0); g.addColorStop(0, 'rgba(3,30,36,.28)'); g.addColorStop(1, 'rgba(3,30,36,0)');
      c.fillStyle = g; c.fillRect(0, 0, lato, vh);
      g = c.createLinearGradient(vw, 0, vw - lato, 0); g.addColorStop(0, 'rgba(3,30,36,.28)'); g.addColorStop(1, 'rgba(3,30,36,0)');
      c.fillStyle = g; c.fillRect(vw - lato, 0, lato, vh);
    } else {
      c.fillStyle = sfuma(c, 'rgba(3,30,36,.26)', 'rgba(3,30,36,0)', 0, vh * .22); c.fillRect(0, 0, vw, vh * .22);
    }
    c.restore();
  },
});
})();
