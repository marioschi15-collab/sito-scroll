/* Boccone — modelli e ambienti PROVVISORI: per ogni voce del cast che non ha ancora un modello vero ne registra uno
   semplice (provvisoria: true), così il gioco funziona con qualunque sottoinsieme di contenuti.
   I disegni vengono dalla versione precedente del gioco (pesce parametrico, protagonista, medusa, fondale), variati a
   partire dall'id. Un modello vero registrato prima o dopo prende sempre il posto di quello provvisorio. */
(() => {
'use strict';
const B = window.B, U = B.util, TAU = Math.PI * 2;
const { limita, rumore } = U;

function semeDi(id) { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const hsl = (h, s, l, a) => 'hsl' + (a === undefined ? '(' : 'a(') + Math.round(((h % 360) + 360) % 360) + ',' + Math.round(limita(s, 0, 100)) + '%,' + Math.round(limita(l, 0, 100)) + '%' + (a === undefined ? ')' : ',' + a + ')');

/* Tinta di ogni specie: 'tono saturazione chiarezza' del colore principale. */
const TINTE = {
  ghiozzo: '42 45 62', pesce_farfalla: '52 90 62', pesce_pappagallo: '172 65 50', pesce_chirurgo: '225 80 52', pesce_angelo: '48 85 58',
  pesce_balestra: '200 55 48', pesce_napoleone: '165 45 48', murena: '48 50 40', barracuda: '215 15 68', squalo_pinna_nera: '30 12 55',
  cavalluccio: '38 90 58', castagnola: '235 70 38', pesce_scatola: '50 90 55', triglia: '5 85 68', scorfano: '12 60 42', seppia: '25 45 60',
  razza: '38 40 62', pesce_lupo: '210 25 55', squalo_volpe: '250 30 55', gamberetto: '350 80 78', granchio_nuotatore: '255 50 55',
  pesce_leone: '5 75 55', grongo: '210 20 58', squalo_toro: '28 22 50', pesce_sega: '60 25 52', sgombro: '170 50 45', aguglia: '150 35 62',
  pesce_volante: '215 65 58', lampuga: '70 70 52', tonno: '225 55 35', pesce_spada: '228 50 40', pesce_luna: '215 12 68',
  squalo_martello: '80 12 50', manta: '230 20 22', merluzzetto: '35 30 55', pesce_ghiaccio: '195 45 85', salmone: '350 55 70', lompo: '205 30 60',
  halibut: '75 30 42', granchio_reale: '8 65 45', narvalo: '210 12 75', squalo_groenlandia: '200 8 50', pesce_vetro: '45 55 85',
  nautilus: '20 60 70', pesce_pipistrello: '210 10 72', celacanto: '220 45 42', squalo_tigre: '100 12 50', bavosa: '25 85 58',
  granchio_yeti: '50 30 90', pesce_rospo: '22 80 48', murena_drago: '20 90 52', torpedine: '28 40 45', pesce_accetta: '200 15 75',
  pesce_lanterna: '230 40 25', calamaro_vampiro: '355 65 35', polpo_dumbo: '15 85 72', pesce_vipera: '235 45 22', rana_pescatrice: '270 25 25',
  chimera: '200 30 75', anguilla_pellicano: '260 20 15', squalo_goblin: '350 60 80', pesce_remo: '210 15 75',
  don_cernia: '70 30 40', piovra: '5 75 58', kraken: '355 65 35', marlin_imperatore: '222 75 45', orca: '225 20 14', dunkleosteo: '35 45 42',
  drago_di_lava: '8 30 16', lanterna: '275 35 30',
};

function tavolozza(id) {
  const k = semeDi(id), t = (TINTE[id] || (k % 360) + ' 60 55').split(' ').map(Number), h = t[0], s = t[1], l = t[2];
  const h2 = h + [0, 28, -28, 170][k % 4];
  return { c1: hsl(h, s, l), c2: hsl(h, s * 0.6, Math.min(95, l + 30)), cp: hsl(h2, Math.min(90, s + 12), Math.max(22, l - 14)),
    cs: hsl(h, Math.min(70, s + 10), Math.max(9, l * 0.36)), cm: hsl(h, s, Math.max(8, l * 0.3), 0.32) };
}

// ---------------------------------------------------------------- il pesce parametrico (dalla versione precedente)
const MACCHIE = [[-.55, -.32, .1], [-.2, -.5, .08], [.12, -.3, .07], [-.68, .02, .08], [-.32, -.1, .11], [.3, -.52, .06], [-.05, .12, .07], [-.8, -.2, .06]];
function tracciaCorpo(c, lx, ly) {
  c.beginPath(); c.moveTo(lx, .04 * ly);
  c.bezierCurveTo(lx * .8, -ly * 1.02, -lx * .3, -ly * 1.14, -lx * .98, -ly * .2);
  c.lineTo(-lx * .98, ly * .2);
  c.bezierCurveTo(-lx * .3, ly * 1.14, lx * .8, ly * 1.02, lx, .04 * ly);
  c.closePath();
}
function corona(c, x, y, s) {
  c.save(); c.translate(x, y); c.rotate(-.12); c.scale(s, s);
  c.beginPath(); c.moveTo(-1, 0); c.lineTo(-1.15, -1.2); c.lineTo(-.5, -.55); c.lineTo(0, -1.45); c.lineTo(.5, -.55); c.lineTo(1.15, -1.2); c.lineTo(1, 0); c.closePath();
  c.fillStyle = '#ffd24a'; c.fill(); c.strokeStyle = '#a66a00'; c.lineWidth = .14; c.stroke();
  c.fillStyle = '#ff5c7a'; c.beginPath(); c.arc(0, -.42, .2, 0, TAU); c.fill();
  c.restore();
}
function occhio(c, ox, oy, or, sp, o) {
  const giu = o.stato === 'stordito' || o.stato === 'sconfitto';
  c.fillStyle = '#fff'; c.beginPath(); c.arc(ox, oy, or, 0, TAU); c.fill(); c.strokeStyle = sp.cs; c.lineWidth = .035; c.stroke();
  if (giu) {
    c.strokeStyle = '#18233f'; c.lineWidth = or * .3; c.beginPath();
    c.moveTo(ox - or * .5, oy - or * .5); c.lineTo(ox + or * .5, oy + or * .5); c.moveTo(ox + or * .5, oy - or * .5); c.lineTo(ox - or * .5, oy + or * .5); c.stroke();
    return;
  }
  const sg = o.sguardo, gx = sg ? limita(sg.x, -1, 1) * or * .18 : 0, gy = sg ? limita(sg.y, -1, 1) * or * .18 : 0;
  c.fillStyle = o.minaccia ? '#c81e3a' : '#18233f'; c.beginPath(); c.arc(ox + or * .28 + gx, oy + or * .05 + gy, or * .52, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(ox + or * .45 + gx, oy - or * .2 + gy, or * .18, 0, TAU); c.fill();
  if (o.minaccia) { c.strokeStyle = sp.cs; c.lineWidth = or * .5; c.beginPath(); c.moveTo(ox - or * 1.15, oy - or * 1.3); c.lineTo(ox + or * 1.2, oy - or * .5); c.stroke(); }
}

function pesce(c, sp, o) {
  const lx = sp.lx, ly = sp.ly, extra = sp.extra || '', th = Math.max(ly, .7), F = (o.fase || 0) * TAU;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const bordo = () => { c.strokeStyle = sp.cs; c.lineWidth = .055; c.stroke(); };
  // coda
  c.save(); c.translate(-lx * .93, 0); c.rotate(Math.sin(F) * .32); c.beginPath();
  if (sp.coda === 'forca') { c.moveTo(.14, 0); c.lineTo(-.78, -th); c.quadraticCurveTo(-.42, 0, -.78, th); c.closePath(); }
  else if (sp.coda === 'luna') { c.moveTo(.12, 0); c.quadraticCurveTo(-.3, -th * .9, -.95, -th * 1.3); c.quadraticCurveTo(-.5, 0, -.95, th * 1.3); c.quadraticCurveTo(-.3, th * .9, .12, 0); }
  else { c.moveTo(.14, -.1); c.quadraticCurveTo(-.95, -th * .95, -.8, 0); c.quadraticCurveTo(-.95, th * .95, .14, .1); c.closePath(); }
  c.fillStyle = sp.cp; c.fill(); bordo(); c.restore();
  // pinne sopra e sotto
  c.fillStyle = sp.cp;
  if (sp.dorso === 'vela') { c.beginPath(); c.moveTo(-lx * .55, -ly * .6); c.quadraticCurveTo(-lx * .3, -ly * 2.0, lx * .32, -ly * .7); c.closePath(); c.fill(); bordo(); }
  else if (sp.dorso === 'bassa') { c.beginPath(); c.moveTo(-lx * .55, -ly * .58); c.quadraticCurveTo(-lx * .1, -ly * 1.45, lx * .35, -ly * .68); c.closePath(); c.fill(); bordo(); }
  else if (sp.dorso === 'spine') {
    for (let i = 0; i < 6; i++) { const x = -lx * .6 + i * lx * .19, hh = ly * (.5 + .25 * Math.sin(i * 1.3 + 1)); c.beginPath(); c.moveTo(x - lx * .1, -ly * .6); c.lineTo(x - lx * .04, -ly * .7 - hh); c.lineTo(x + lx * .1, -ly * .62); c.closePath(); c.fill(); bordo(); }
  }
  c.beginPath(); c.moveTo(-lx * .55, ly * .58); c.quadraticCurveTo(-lx * .5, ly * 1.35, -lx * .05, ly * .72); c.closePath(); c.fill(); bordo();
  if (extra.includes('spine')) {
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + .3; if (Math.cos(a) > .75) continue; c.beginPath(); c.moveTo(Math.cos(a - .12) * lx * .9, Math.sin(a - .12) * ly * .82); c.lineTo(Math.cos(a) * lx * 1.2, Math.sin(a) * ly * 1.12); c.lineTo(Math.cos(a + .12) * lx * .9, Math.sin(a + .12) * ly * .82); c.closePath(); c.fill(); }
  }
  if (extra.includes('spada')) { c.beginPath(); c.moveTo(lx * .9, -ly * .12); c.lineTo(lx * 2.05, -ly * .02); c.lineTo(lx * .9, ly * .14); c.closePath(); c.fillStyle = sp.cs; c.fill(); }
  // corpo
  const g = c.createLinearGradient(0, -ly, 0, ly);
  g.addColorStop(0, sp.c1); g.addColorStop(.5, sp.c1); g.addColorStop(.95, sp.c2);
  tracciaCorpo(c, lx, ly); c.fillStyle = g; c.fill();
  c.save(); c.clip();
  if (sp.motivo === 'righe') { c.fillStyle = sp.cm; for (let i = -3; i <= 2; i++) { c.beginPath(); c.moveTo(i * lx * .27, -ly); c.lineTo(i * lx * .27 + lx * .1, -ly); c.lineTo(i * lx * .27 - lx * .02, ly * .25); c.lineTo(i * lx * .27 - lx * .12, ly * .25); c.fill(); } }
  else if (sp.motivo === 'macchie') { c.fillStyle = sp.cm; for (const m of MACCHIE) { c.beginPath(); c.ellipse(m[0] * lx, m[1] * ly, m[2] * 1.3, m[2], 0, 0, TAU); c.fill(); } }
  else if (sp.motivo === 'fascia') { c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-lx, -ly * .1, lx * 1.5, ly * .2); }
  else if (sp.motivo === 'bande') { c.fillStyle = sp.cm; c.fillRect(lx * .47, -ly, lx * .2, ly * 2); c.fillRect(-lx * .3, -ly, lx * .2, ly * 2); c.fillStyle = sp.cp; c.fillRect(-lx, -ly, lx * .3, ly * 2); }
  else if (sp.motivo === 'squame') { c.strokeStyle = sp.cm; c.lineWidth = .035; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(-lx * .75 + i * lx * .28 + (j % 2) * lx * .14, -ly * .5 + j * ly * .3, lx * .13, -.6, 1.4); c.stroke(); } }
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(lx * .05, -ly * .5, lx * .6, ly * .14, -.05, 0, TAU); c.fill();
  c.restore();
  tracciaCorpo(c, lx, ly); bordo();
  // branchia e pinna laterale
  c.strokeStyle = sp.cs; c.globalAlpha *= .4; c.lineWidth = .045; c.beginPath(); c.arc(lx * .05, 0, ly * .52, -.75, .75); c.stroke(); c.globalAlpha /= .4;
  c.save(); c.translate(-lx * .08, ly * .3); c.rotate(.5 + Math.sin(F) * .28);
  c.beginPath(); c.ellipse(-.22, 0, .3, .13, 0, 0, TAU); c.fillStyle = sp.cp; c.fill(); bordo(); c.restore();
  // bocca
  const b = o.bocca || 0, kx = lx * .46, ky = ly * .16, ux = lx * .985, uy = ly * .05, wx = lx * (.93 - .12 * b), wy = ly * (.14 + .3 * b);
  if (o.minaccia || b > .05) {
    c.beginPath(); c.moveTo(kx, ky); c.quadraticCurveTo(lx * .75, 0, ux, uy); c.lineTo(wx, wy); c.quadraticCurveTo(lx * .7, ly * (.2 + .22 * b), kx, ky); c.closePath();
    c.fillStyle = '#4a0f24'; c.fill();
    const n = sp.denti || 4; c.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const u = .2 + .75 * (i + .5) / n, x = kx + (ux - kx) * u, y = ky + (uy - ky) * u - ly * .05 * Math.sin(u * 3), dl = lx * .34 / n;
      c.beginPath(); c.moveTo(x - dl, y); c.lineTo(x + dl, y); c.lineTo(x, y + ly * (.1 + .12 * b)); c.fill();
      if (b > .3 && i % 2 === 0) { const x2 = kx + (wx - kx) * u, y2 = ky + (wy - ky) * u + ly * .04; c.beginPath(); c.moveTo(x2 - dl, y2); c.lineTo(x2 + dl, y2); c.lineTo(x2, y2 - ly * .14 * b); c.fill(); }
    }
  } else {
    c.strokeStyle = sp.cs; c.lineWidth = .05; c.beginPath(); c.moveTo(lx * .62, ly * .2); c.quadraticCurveTo(lx * .82, ly * .22, lx * .97, ly * .08); c.stroke();
  }
  if (extra.includes('baffi')) { c.strokeStyle = sp.cs; c.lineWidth = .05; for (const s of [0, 1]) { c.beginPath(); c.moveTo(lx * (.8 - s * .12), ly * .35); c.quadraticCurveTo(lx * (.85 - s * .1), ly * .9, lx * (.6 - s * .15) + Math.sin(F + s) * .08, ly * 1.15); c.stroke(); } }
  occhio(c, lx * .6, -ly * .24, limita(ly * .27, .15, .27), sp, o);
  if (extra.includes('lanterna')) {
    const ax = lx * 1.28, ay = -ly * 1.2 + Math.sin((o.t || 0) * 2.2) * .06;
    c.strokeStyle = sp.cs; c.lineWidth = .06; c.beginPath(); c.moveTo(lx * .3, -ly * .85); c.quadraticCurveTo(lx * .7, -ly * 1.95, ax, ay); c.stroke();
    const gl = c.createRadialGradient(ax, ay, 0, ax, ay, .6);
    gl.addColorStop(0, 'rgba(255,240,150,.95)'); gl.addColorStop(.3, 'rgba(255,220,90,.5)'); gl.addColorStop(1, 'rgba(255,220,90,0)');
    c.fillStyle = gl; c.beginPath(); c.arc(ax, ay, .6, 0, TAU); c.fill();
    c.fillStyle = '#fff7c2'; c.beginPath(); c.arc(ax, ay, .11, 0, TAU); c.fill();
  }
  if (extra.includes('corona')) corona(c, lx * .12, -ly * .86, .34);
  c.restore();
}
function ingombroPesce(sp) {
  const th = Math.max(sp.ly, .7), ex = sp.extra || '';
  return { x0: -(sp.lx * .93 + 1.1), x1: ex.includes('spada') ? sp.lx * 2.1 : ex.includes('lanterna') ? sp.lx * 1.28 + .65 : sp.lx + .12,
    y0: -Math.max(sp.ly * (ex.includes('lanterna') ? 2 : 1.5), th * 1.3 + .4, ex.includes('corona') ? sp.ly * .86 + .6 : 0), y1: Math.max(sp.ly * 1.3, th * 1.3 + .4) };
}

/* Polpi, seppie, calamari: testa a sacco e braccia che seguono dietro. */
function molle(c, sp, o) {
  const F = (o.fase || 0) * TAU;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 0; i < 7; i++) {
    const y0 = (i - 3) / 3 * .62;
    c.beginPath(); c.moveTo(-.15, y0);
    for (let s = 1; s <= 7; s++) c.lineTo(-.15 - s * .3, y0 * (1 + s * .16) + Math.sin(F + s * .85 + i * 1.7) * .05 * s);
    c.strokeStyle = sp.cs; c.lineWidth = .3; c.stroke();
    c.strokeStyle = i % 2 ? sp.c1 : sp.cp; c.lineWidth = .21; c.stroke();
  }
  const g = c.createRadialGradient(.55, -.3, .1, .35, 0, 1.2);
  g.addColorStop(0, sp.c2); g.addColorStop(.5, sp.c1); g.addColorStop(1, sp.cp);
  c.beginPath(); c.ellipse(.35, 0, 1.05, .88, 0, 0, TAU); c.fillStyle = g; c.fill(); c.strokeStyle = sp.cs; c.lineWidth = .06; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(.75, -.45, .4, .16, .5, 0, TAU); c.fill();
  for (const s of [-1, 1]) occhio(c, .16, s * .42, .22, sp, o);
  if ((sp.extra || '').includes('corona')) corona(c, .6, -.84, .34);
  c.restore();
}

/* Razze, mante, torpedini: un disco con le ali che battono e la coda a frusta. */
function disco(c, sp, o) {
  const F = (o.fase || 0) * TAU, b = Math.sin(F) * .12;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = sp.cs; c.lineWidth = .1; c.beginPath(); c.moveTo(-.8, 0); c.quadraticCurveTo(-1.4, .12 * Math.sin(F), -1.9, .14 * Math.sin(F + 1)); c.stroke();
  const g = c.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, sp.c1); g.addColorStop(1, sp.c2);
  c.beginPath(); c.moveTo(1.05, 0); c.quadraticCurveTo(.5, -.5, -.1, -(.95 + b)); c.quadraticCurveTo(-.5, -.45, -.9, 0); c.quadraticCurveTo(-.5, .45, -.1, .95 - b); c.quadraticCurveTo(.5, .5, 1.05, 0); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = sp.cs; c.lineWidth = .055; c.stroke();
  c.fillStyle = sp.cm; for (const m of MACCHIE) { c.beginPath(); c.arc(m[0] * .9 + .2, m[1] * 1.1 + .15, m[2], 0, TAU); c.fill(); }
  for (const s of [-1, 1]) occhio(c, .55, s * .2, .13, sp, o);
  c.restore();
}

/* Granchi: di fronte, chele alzate, zampe che remano. */
function granchio(c, sp, o) {
  const F = (o.fase || 0) * TAU, w = Math.sin(F);
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = sp.cs; c.lineWidth = .13;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const k = Math.sin(F + i * 2 + (s > 0 ? 1 : 0)) * .1, x = s * (.6 + i * .16);
    c.beginPath(); c.moveTo(s * .5, .25 + i * .1); c.quadraticCurveTo(x + s * .32, .2 + i * .1 + k, x + s * .34, .82 + k); c.stroke();
  }
  for (const s of [-1, 1]) {
    c.strokeStyle = sp.cs; c.lineWidth = .2; c.beginPath(); c.moveTo(s * .6, -.1); c.lineTo(s * .88, -.42 - w * .05 * s); c.stroke();
    c.beginPath(); c.ellipse(s * .92, -.56 - w * .05 * s, .3, .22, s * .5, 0, TAU); c.fillStyle = sp.cp; c.fill(); c.lineWidth = .055; c.stroke();
    c.strokeStyle = sp.cs; c.lineWidth = .05; c.beginPath(); c.moveTo(s * .82, -.62 - w * .05 * s); c.lineTo(s * 1.12, -.72 - w * .05 * s - (o.bocca || 0) * .1); c.stroke();
  }
  const g = c.createLinearGradient(0, -.5, 0, .7); g.addColorStop(0, sp.c1); g.addColorStop(1, sp.c2);
  c.beginPath(); c.ellipse(0, .1, .95, .62, 0, 0, TAU); c.fillStyle = g; c.fill(); c.strokeStyle = sp.cs; c.lineWidth = .06; c.stroke();
  c.fillStyle = sp.cm; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(-.5 + i * .25, -.05 + (i % 2) * .22, .07, 0, TAU); c.fill(); }
  for (const s of [-1, 1]) {
    c.strokeStyle = sp.cs; c.lineWidth = .08; c.beginPath(); c.moveTo(s * .25, -.4); c.lineTo(s * .3, -.72); c.stroke();
    occhio(c, s * .3, -.8, .15, sp, o);
  }
  c.strokeStyle = sp.cs; c.lineWidth = .05; c.beginPath(); c.arc(0, .28, .2, .2, Math.PI - .2); c.stroke();
  c.restore();
}

/* Cavalluccio: in piedi, muso a tubo, coda arrotolata. */
function cavalluccio(c, sp, o) {
  const F = (o.fase || 0) * TAU;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = sp.cp; c.beginPath(); c.moveTo(-.25, -.3); c.quadraticCurveTo(-.75 - Math.sin(F * 2) * .06, -.1, -.3, .25); c.closePath(); c.fill();
  const corpo = () => { c.beginPath(); c.moveTo(.1, -.7); c.quadraticCurveTo(-.4, -.2, .05, .3); c.quadraticCurveTo(.32, .7, -.05, .9); c.quadraticCurveTo(-.4, 1.05, -.35, .78); };
  corpo(); c.strokeStyle = sp.cs; c.lineWidth = .62; c.stroke();
  corpo(); c.strokeStyle = sp.c1; c.lineWidth = .5; c.stroke();
  c.strokeStyle = sp.cm; c.lineWidth = .06; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-.28, -.3 + i * .28); c.lineTo(.2, -.26 + i * .28); c.stroke(); }
  c.strokeStyle = sp.cs; c.lineWidth = .24; c.beginPath(); c.moveTo(.35, -.82); c.lineTo(.9, -.68); c.stroke();
  c.strokeStyle = sp.c1; c.lineWidth = .14; c.beginPath(); c.moveTo(.35, -.82); c.lineTo(.88, -.685); c.stroke();
  c.beginPath(); c.ellipse(.15, -.88, .36, .3, -.3, 0, TAU); c.fillStyle = sp.c1; c.fill(); c.strokeStyle = sp.cs; c.lineWidth = .055; c.stroke();
  c.fillStyle = sp.cp; c.beginPath(); c.moveTo(-.05, -1.12); c.lineTo(.08, -1.3); c.lineTo(.2, -1.14); c.closePath(); c.fill();
  occhio(c, .22, -.9, .13, sp, o);
  c.restore();
}

const ARCHETIPI = {
  pesce: { disegna: pesce },
  molle: { disegna: molle, forma: { lx: 1.1, ly: .9 }, ingombro: { x0: -2.5, y0: -1.45, x1: 1.5, y1: 1.3 } },
  disco: { disegna: disco, forma: { lx: 1.05, ly: .95 }, ingombro: { x0: -2.05, y0: -1.2, x1: 1.15, y1: 1.2 } },
  granchio: { disegna: granchio, forma: { lx: 1, ly: .75 }, ingombro: { x0: -1.4, y0: -1.05, x1: 1.4, y1: 1.1 } },
  cavalluccio: { disegna: cavalluccio, forma: { lx: .6, ly: 1.15 }, ingombro: { x0: -.95, y0: -1.4, x1: 1.1, y1: 1.3 } },
};
function archetipoDi(id) {
  if (/granchio/.test(id)) return 'granchio';
  if (/razza|manta|torpedine|halibut/.test(id)) return 'disco';
  if (/seppia|calamaro|polpo|nautilus|piovra|kraken/.test(id)) return 'molle';
  if (/cavalluccio/.test(id)) return 'cavalluccio';
  return 'pesce';
}
/* I parametri del pesce: scelti dall'id (sempre gli stessi) e ritoccati secondo qualche parola del nome. */
function parametri(scheda) {
  const id = scheda.id, k = semeDi(id), sp = tavolozza(id);
  sp.lx = 1.1 + (k % 5) * .08; sp.ly = .62 + ((k >> 3) % 5) * .07;
  sp.coda = ['tonda', 'forca', 'luna'][(k >> 6) % 3]; sp.dorso = ['bassa', 'vela', 'bassa', 'spine'][(k >> 8) % 4];
  sp.motivo = ['macchie', 'righe', 'fascia', 'bande', 'squame', 'nessuno'][(k >> 10) % 6]; sp.denti = 4; sp.extra = '';
  if (/squalo/.test(id)) { sp.lx = 1.7; sp.ly = .6; sp.coda = 'luna'; sp.dorso = 'vela'; sp.motivo = id === 'squalo_tigre' ? 'righe' : 'nessuno'; sp.denti = 7; }
  if (/barracuda|aguglia|luccio|vipera/.test(id)) { sp.lx = 1.8; sp.ly = .48; sp.coda = 'forca'; sp.dorso = 'bassa'; sp.denti = 6; }
  if (/murena|grongo|anguilla|pesce_remo|pesce_lupo|bavosa/.test(id)) { sp.lx = 2; sp.ly = .42; sp.coda = 'tonda'; sp.dorso = 'bassa'; sp.denti = 6; }
  if (/spada|narvalo|sega|aguglia|marlin/.test(id)) sp.extra += ' spada';
  if (/scatola|lompo|rospo|luna|napoleone|pipistrello|farfalla|rana/.test(id)) { sp.lx = 1.05; sp.ly = .95; sp.coda = 'tonda'; }
  if (/scorfano|leone|scatola|lompo/.test(id)) { sp.dorso = 'spine'; sp.extra += ' spine'; }
  if (/triglia|merluzz|drago/.test(id)) sp.extra += ' baffi';
  if (/tonno|sgombro|lampuga|marlin|orca/.test(id)) { sp.coda = 'luna'; sp.lx = 1.5; sp.ly = .72; }
  if (/rana|lanterna/.test(id)) { sp.extra += ' lanterna'; sp.denti = 8; }
  return sp;
}

// ---------------------------------------------------------------- registrazione di pesci e giganti
const GIGANTI = {
  don_cernia: { lx: 1.3, ly: .95, coda: 'tonda', dorso: 'spine', motivo: 'macchie', denti: 5, extra: ' corona' },
  marlin_imperatore: { lx: 1.6, ly: .66, coda: 'luna', dorso: 'vela', motivo: 'righe', denti: 5, extra: ' spada corona' },
  orca: { lx: 1.6, ly: .78, coda: 'luna', dorso: 'vela', motivo: 'fascia', denti: 8, extra: ' corona', c2: '#f4f7ff' },
  dunkleosteo: { lx: 1.5, ly: .85, coda: 'forca', dorso: 'bassa', motivo: 'squame', denti: 8, extra: ' corona' },
  drago_di_lava: { lx: 1.8, ly: .62, coda: 'forca', dorso: 'spine', motivo: 'righe', denti: 8, extra: ' baffi corona', cp: '#ff6a2a', cm: 'rgba(255,120,40,.5)' },
  lanterna: { lx: 1.2, ly: 1, coda: 'tonda', dorso: 'spine', motivo: 'macchie', denti: 8, extra: ' lanterna corona' },
  piovra: { extra: ' corona' }, kraken: { extra: ' corona' },
};
function registraCreatura(scheda) {
  const tipo = archetipoDi(scheda.id), a = ARCHETIPI[tipo], sp = Object.assign(parametri(scheda), scheda.tipo === 'gigante' ? GIGANTI[scheda.id] || { extra: ' corona' } : null);
  const def = { id: scheda.id, provvisoria: true, descrizione: 'Un abitante di queste acque: il suo ritratto è in arrivo.', disegna(c, o) { a.disegna(c, sp, o); } };
  if (tipo === 'pesce') { def.forma = { lx: sp.lx, ly: sp.ly }; def.ingombro = ingombroPesce(sp); }
  else { def.forma = a.forma; def.ingombro = a.ingombro; }
  B.specie.registra(def);
}

// ---------------------------------------------------------------- banchi
const COLORI_BANCO = { sardina: ['#e6f4ff', '#3f86d8'], acciuga: ['#eaf6ff', '#3f9a8f'], neon: ['#bff3ff', '#19a8f0', '#ff4f5e'], krill: ['#ffe1e6', '#ff8fa3'],
  lucciola: ['#565fa8', '#1c2158', '#7af0ff'], dorato: ['#fff3a8', '#ffb400', '#ff8a00'] };
function registraBanco(scheda) {
  const col = COLORI_BANCO[scheda.id] || ['#d9ffd0', '#5fd08a'];
  B.specie.registra({ id: scheda.id, provvisoria: true, forma: { lx: 1, ly: .5 }, ingombro: { x0: -1.05, y0: -.72, x1: 1.05, y1: .72 },
    disegna(c, o) {
      const w = Math.sin((o.fase || 0) * TAU) * .7;
      c.save(); c.scale(1 / 7, 1 / 7); c.translate(1.5, 0);
      c.fillStyle = col[2] || col[1]; c.beginPath(); c.moveTo(-3.5, 0); c.lineTo(-8.5, -3.3 + w); c.lineTo(-7, 0); c.lineTo(-8.5, 3.3 + w); c.closePath(); c.fill();
      c.fillStyle = col[1]; c.beginPath(); c.moveTo(-1.5, -3); c.lineTo(1.5, -4.6); c.lineTo(2.5, -2.8); c.fill();
      c.fillStyle = col[0]; c.beginPath(); c.ellipse(0, 0, 5.4, 3.4, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(.6, 1.3, 3.6, 1.4, 0, 0, TAU); c.fill();
      c.fillStyle = col[1]; c.fillRect(-2.5, -.9, 4.4, 1.2);
      c.fillStyle = '#18233f'; c.beginPath(); c.arc(2.8, -.7, 1.05, 0, TAU); c.fill();
      c.restore();
    } });
}

// ---------------------------------------------------------------- pericoli (1 unità = il raggio che fa male)
function medusa(colore, tentacoli) {
  return (c, o) => {
    const s = limita(o.attivo || 0, 0, 1), larg = 1 + s * .14, alt = 1 - s * .12, F = (o.fase || 0) * TAU, meta = (tentacoli - 1) / 2;
    c.save(); c.scale(1 / 24, 1 / 24); c.lineCap = 'round';
    c.strokeStyle = colore; c.globalAlpha = .75; c.lineWidth = 3;
    for (let i = 0; i < tentacoli; i++) {
      const x0 = (i - meta) * (36 / tentacoli) * larg; c.beginPath(); c.moveTo(x0, 4);
      for (let k = 1; k <= 5; k++) c.lineTo(x0 + Math.sin(F + k * 1.1 + i) * 5, 4 + k * 11 * (1.1 - s * .25));
      c.stroke();
    }
    c.globalAlpha = .88; c.fillStyle = colore;
    c.beginPath(); c.moveTo(-26 * larg, 6); c.bezierCurveTo(-28 * larg, -34 * alt, 28 * larg, -34 * alt, 26 * larg, 6); c.quadraticCurveTo(13 * larg, 0, 0, 6); c.quadraticCurveTo(-13 * larg, 0, -26 * larg, 6); c.fill();
    c.globalAlpha = .5; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-8 * larg, -14 * alt, 9, 5, -.5, 0, TAU); c.fill();
    c.globalAlpha = 1; c.fillStyle = '#18233f'; c.beginPath(); c.arc(-8, -4, 2.6, 0, TAU); c.arc(8, -4, 2.6, 0, TAU); c.fill();
    c.restore();
  };
}
const PERICOLI = {
  medusa: { ingombro: { x0: -1.4, y0: -1.3, x1: 1.4, y1: 2.9 }, disegna: medusa('#ff9ecb', 5) },
  medusa_criniera: { ingombro: { x0: -1.4, y0: -1.3, x1: 1.4, y1: 2.9 }, disegna: medusa('#ff8a4a', 9) },
  riccio: { ingombro: { x0: -1.5, y0: -1.5, x1: 1.5, y1: 1.5 },
    disegna(c, o) {
      const at = limita(o.attivo || 0, 0, 1), F = (o.fase || 0) * TAU;
      c.save(); c.fillStyle = '#2a1a3a';
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU, l = 1.02 + .3 * at + .07 * Math.sin(F + i * 2.1);
        c.beginPath(); c.moveTo(Math.cos(a - .14) * .55, Math.sin(a - .14) * .55); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.lineTo(Math.cos(a + .14) * .55, Math.sin(a + .14) * .55); c.fill();
      }
      c.fillStyle = '#e9d8ff'; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, l = 1.02 + .3 * at + .07 * Math.sin(F + i * 2.1); c.beginPath(); c.arc(Math.cos(a) * l, Math.sin(a) * l, .045, 0, TAU); c.fill(); }
      const g = c.createRadialGradient(-.15, -.2, .05, 0, 0, .65); g.addColorStop(0, '#6a4a8a'); g.addColorStop(1, '#1c1028');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, .62, 0, TAU); c.fill();
      c.restore();
    } },
  mina: { ingombro: { x0: -1.2, y0: -1.2, x1: 1.2, y1: 2 },
    disegna(c, o) {
      const at = limita(o.attivo || 0, 0, 1);
      c.save(); c.lineCap = 'round';
      c.strokeStyle = '#3a3f48'; c.lineWidth = .1; c.setLineDash([.16, .14]); c.beginPath(); c.moveTo(0, .8); c.lineTo(0, 1.95); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#2a2f38'; c.lineWidth = .2;
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2; c.beginPath(); c.moveTo(Math.cos(a) * .7, Math.sin(a) * .7); c.lineTo(Math.cos(a) * 1.08, Math.sin(a) * 1.08); c.stroke(); }
      const g = c.createRadialGradient(-.25, -.3, .05, 0, 0, .85); g.addColorStop(0, '#7a8494'); g.addColorStop(.6, '#4a515e'); g.addColorStop(1, '#262a33');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, .82, 0, TAU); c.fill();
      c.fillStyle = 'rgba(160,80,40,.45)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(rumore(i, 3) * 1.1 - .55, rumore(i, 5) * 1.1 - .55, .1 + rumore(i, 7) * .08, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,60,50,' + (.25 + .75 * at).toFixed(2) + ')'; c.beginPath(); c.arc(0, 0, .2 + .08 * at, 0, TAU); c.fill();
      if (at > .02) { const gl = c.createRadialGradient(0, 0, .1, 0, 0, 1.1); gl.addColorStop(0, 'rgba(255,70,50,' + (.55 * at).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(255,70,50,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, 1.1, 0, TAU); c.fill(); }
      c.restore();
    } },
  amo: { ingombro: { x0: -1.1, y0: -1.45, x1: .65, y1: 1.2 },
    disegna(c, o) {
      const F = (o.fase || 0) * TAU;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      const uncino = () => { c.beginPath(); c.moveTo(0, -1.2); c.lineTo(0, .3); c.bezierCurveTo(0, 1.1, -.9, 1.1, -.85, .15); c.lineTo(-.6, .45); };
      uncino(); c.strokeStyle = '#3a4658'; c.lineWidth = .26; c.stroke();
      uncino(); c.strokeStyle = '#dfe8f2'; c.lineWidth = .14; c.stroke();
      c.strokeStyle = '#3a4658'; c.lineWidth = .08; c.beginPath(); c.arc(0, -1.3, .1, 0, TAU); c.stroke();
      c.strokeStyle = '#ff8fa3'; c.lineWidth = .22; c.beginPath(); c.moveTo(-.2, .78); c.quadraticCurveTo(-.5, 1 + Math.sin(F) * .08, -.82, .7); c.quadraticCurveTo(-1, .5, -.9 + Math.sin(F) * .06, .3); c.stroke();
      c.restore();
    } },
  sfiatatoio: { ingombro: { x0: -1.25, y0: -1.95, x1: 1.25, y1: 1.1 },
    disegna(c, o) {
      const at = limita(o.attivo || 0, 0, 1), f = o.fase || 0;
      c.save();
      c.fillStyle = 'rgba(220,220,230,.35)';
      for (let i = 0; i < 4; i++) { const u = (f + i / 4) % 1; c.globalAlpha = (1 - u) * (.5 + .5 * at); c.beginPath(); c.arc(Math.sin(i * 2.3) * .2 * (1 + u), -.8 - u * 1, .12 + u * .16, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      const g = c.createLinearGradient(0, -.8, 0, 1); g.addColorStop(0, '#4a3a38'); g.addColorStop(1, '#221a1c');
      c.fillStyle = g; c.beginPath(); c.moveTo(-1.15, 1.05); c.quadraticCurveTo(-.8, 0, -.5, -.75); c.lineTo(.5, -.75); c.quadraticCurveTo(.8, 0, 1.15, 1.05); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,' + Math.round(110 + 90 * at) + ',40,' + (.35 + .65 * at).toFixed(2) + ')'; c.beginPath(); c.ellipse(0, -.75, .5, .16, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,140,50,' + (.2 + .6 * at).toFixed(2) + ')'; c.lineWidth = .06; c.beginPath(); c.moveTo(-.3, -.6); c.lineTo(-.45, .1); c.lineTo(-.3, .5); c.moveTo(.25, -.55); c.lineTo(.4, .3); c.stroke();
      c.restore();
    } },
  stalattite: { ingombro: { x0: -.8, y0: -1.1, x1: .8, y1: 1.25 },
    disegna(c, o) {
      const at = limita(o.attivo || 0, 0, 1), dx = Math.sin((o.fase || 0) * TAU * 6) * .06 * at;
      c.save(); c.translate(dx, 0); c.lineJoin = 'round';
      const g = c.createLinearGradient(-.6, 0, .6, 0); g.addColorStop(0, '#bfe9ff'); g.addColorStop(.5, '#f4fcff'); g.addColorStop(1, '#8fc8ea');
      c.fillStyle = g; c.beginPath(); c.moveTo(-.6, -1.05); c.lineTo(.6, -1.05); c.lineTo(.22, .2); c.lineTo(0, 1.18); c.lineTo(-.25, .1); c.closePath(); c.fill();
      c.strokeStyle = '#5a9cc8'; c.lineWidth = .06; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = .05; c.beginPath(); c.moveTo(-.2, -.9); c.lineTo(-.05, .6); c.stroke();
      c.restore();
    } },
};
function registraPericolo(scheda) {
  const p = PERICOLI[scheda.id] || PERICOLI.riccio;
  B.specie.registra({ id: scheda.id, provvisoria: true, forma: { lx: 1, ly: 1 }, ingombro: p.ingombro, disegna: p.disegna });
}

// ---------------------------------------------------------------- eroi (il protagonista della versione precedente)
const VESTITI = {
  pallino: { c0: '#9ff9ea', c1: '#2fd3c0', c2: '#0e8f9c', pancia: '#fff6d6', pinna: '#ffd24a', spina: '#0c7f8c', bordo: '#0a5f6c' },
  saetta: { c0: '#d6ecff', c1: '#5aa8f0', c2: '#2a62b8', pancia: '#f4f8ff', pinna: '#cfe4ff', spina: '#1f4f9c', bordo: '#163a78' },
  arlecchino: { c0: '#ffe6b0', c1: '#ff9a3b', c2: '#d05a12', pancia: '#e9fff4', pinna: '#3bb6e0', spina: '#1f7a52', bordo: '#7a3208' },
  bolla: { c0: '#f3d6ff', c1: '#c77be8', c2: '#8a3fb5', pancia: '#ffe9f6', pinna: '#ff9ecb', spina: '#7a2f9c', bordo: '#5a1f78' },
  scoglio: { c0: '#d9f5b8', c1: '#6fc25a', c2: '#2f7f3a', pancia: '#fff6d6', pinna: '#9fd86a', spina: '#2a6a34', bordo: '#1f4f28' },
  zanna: { c0: '#dfe8f5', c1: '#8fa6c4', c2: '#4f6686', pancia: '#ffffff', pinna: '#6f86a8', spina: '#3a4f6c', bordo: '#2a3a52' },
};
function protagonista(c, v, o) {
  const F = (o.fase || 0) * TAU, bocca = limita(o.bocca || 0, 0, 1), stadio = limita(o.stadio | 0, 0, 2), esp = o.espressione || 'normale';
  c.save(); c.lineJoin = 'round';
  c.save(); c.translate(-.88, 0); c.rotate(Math.sin(F) * .35);
  c.beginPath(); c.moveTo(.12, 0); c.quadraticCurveTo(-.5, -.8, -.9, -.6); c.quadraticCurveTo(-.58, 0, -.9, .6); c.quadraticCurveTo(-.5, .8, .12, 0);
  c.fillStyle = v.pinna; c.fill(); c.strokeStyle = v.bordo; c.lineWidth = .06; c.stroke();
  c.restore();
  c.fillStyle = v.spina;
  const punta = 1.1 + stadio * .13;
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * .28 + i * (Math.PI * 1.5 / 11);
    c.beginPath(); c.moveTo(Math.cos(a - .1) * .95, Math.sin(a - .1) * .95); c.lineTo(Math.cos(a) * punta, Math.sin(a) * punta); c.lineTo(Math.cos(a + .1) * .95, Math.sin(a + .1) * .95); c.fill();
  }
  const g = c.createRadialGradient(.25, -.4, .08, 0, 0, 1.08);
  g.addColorStop(0, v.c0); g.addColorStop(.55, v.c1); g.addColorStop(1, v.c2);
  c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.fillStyle = g; c.fill();
  c.save(); c.clip();
  c.fillStyle = v.pancia; c.beginPath(); c.ellipse(.1, .98, 1.05, .62, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-.1, -.62, .6, .2, -.25, 0, TAU); c.fill();
  c.restore();
  c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.strokeStyle = v.bordo; c.lineWidth = .06; c.stroke();
  c.save(); c.translate(-.12, .32); c.rotate(.5 + Math.sin(F * 2) * .3);
  c.beginPath(); c.ellipse(-.24, 0, .32, .16, 0, 0, TAU); c.fillStyle = v.pinna; c.fill(); c.strokeStyle = v.bordo; c.lineWidth = .05; c.stroke(); c.restore();
  c.fillStyle = 'rgba(255,110,150,.5)'; c.beginPath(); c.arc(.36, .22, .16, 0, TAU); c.fill();
  // occhio, secondo l'espressione
  const ro = esp === 'spaventato' ? .35 : .31;
  c.fillStyle = '#fff'; c.beginPath(); c.arc(.42, -.3, ro, 0, TAU); c.fill(); c.strokeStyle = v.bordo; c.lineWidth = .04; c.stroke();
  if (esp === 'colpito') { c.strokeStyle = '#18233f'; c.lineWidth = .07; c.beginPath(); c.moveTo(.28, -.44); c.lineTo(.56, -.16); c.moveTo(.56, -.44); c.lineTo(.28, -.16); c.stroke(); }
  else if (esp === 'felice') { c.strokeStyle = '#18233f'; c.lineWidth = .08; c.beginPath(); c.arc(.44, -.24, .16, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  else {
    const sg = o.sguardo, gx = sg ? limita(sg.x, -1, 1) * .07 : 0, gy = sg ? limita(sg.y, -1, 1) * .07 : 0, rp = esp === 'spaventato' ? .11 : .17;
    c.fillStyle = '#18233f'; c.beginPath(); c.arc(.49 + gx, -.28 + gy, rp, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(.55 + gx, -.35 + gy, .065, 0, TAU); c.fill();
  }
  c.fillStyle = '#6a1238'; c.beginPath(); c.ellipse(.8, .22, .1 + .22 * bocca, .07 + .33 * bocca, 0, 0, TAU); c.fill();
  if (bocca > .25) { c.fillStyle = '#ff8fa3'; c.beginPath(); c.ellipse(.78, .22 + .16 * bocca, .12 * bocca, .1 * bocca, 0, 0, TAU); c.fill(); }
  c.restore();
}
function registraEroe(scheda) {
  const v = VESTITI[scheda.id] || VESTITI.pallino;
  B.eroi.registra({ id: scheda.id, provvisoria: true, descrizione: scheda.vantaggio || '', ingombro: { x0: -1.95, y0: -1.5, x1: 1.5, y1: 1.5 }, disegna(c, o) { protagonista(c, v, o); } });
}

// ---------------------------------------------------------------- ambienti (sfondo e fondale della versione precedente)
const TAVOLOZZE = {
  laguna:      { alto: '#3fa0dc', basso: '#0b2a5c', sabbia: '#e2c48d', alga: '#2fbf8a', roccia: '#123063', corallo: ['#ff7b8a', '#ffb05c', '#c58bff'], soffitto: 'acqua', riga: 'Acqua bassa e luminosa, piena di coralli.' },
  alghe:       { alto: '#3fb58c', basso: '#06302f', sabbia: '#b9c08a', alga: '#b5e05a', roccia: '#0a3f3d', corallo: ['#ffd24a', '#ff8f5a', '#7be0d0'], soffitto: 'acqua', alghe: 2.2, riga: 'Un bosco verde che ondeggia fino alla superficie.' },
  relitto:     { alto: '#3f8f8a', basso: '#0a2a2e', sabbia: '#a89a78', alga: '#6fae7a', roccia: '#3a2c22', corallo: ['#c9792b', '#8f9f6a', '#d9b36a'], soffitto: 'acqua', riga: 'Un vecchio galeone spezzato sul fondo.' },
  mare_aperto: { alto: '#3a8fe0', basso: '#061a4a', sabbia: '#9fb0c8', alga: '#3f7fbf', roccia: '#0c2a5e', corallo: ['#7ad9ff', '#5c8fe0', '#b6d8ff'], soffitto: 'acqua', alghe: .3, scogli: .3, riga: 'Blu a perdita d\'occhio, e nessun posto dove nascondersi.' },
  ghiacci:     { alto: '#bfe6f5', basso: '#1f4f7a', sabbia: '#55606e', alga: '#8fd0e0', roccia: '#cfe8f5', corallo: ['#ffffff', '#bfe9ff', '#8fc8ea'], soffitto: 'ghiaccio', alghe: .4, riga: 'Acque gelide sotto un tetto di ghiaccio.' },
  rovine:      { alto: '#4fc0c0', basso: '#0c3a55', sabbia: '#d8c08a', alga: '#5fbf9a', roccia: '#3d5a66', corallo: ['#ffd24a', '#ff9a6b', '#e0c070'], soffitto: 'acqua', riga: 'Colonne e statue di una città dimenticata.' },
  vulcano:     { alto: '#5a3a3a', basso: '#140a0c', sabbia: '#2a2224', alga: '#ff8a3b', roccia: '#1c1416', corallo: ['#ff6a2a', '#ffb24a', '#c8324a'], soffitto: 'roccia', alghe: .5, riga: 'Rocce nere, lava e bolle roventi.' },
  abisso:      { alto: '#2a2a6e', basso: '#05041a', sabbia: '#3a3358', alga: '#ff7bd0', roccia: '#120c30', corallo: ['#6ff0ff', '#ff7bd0', '#b79cff'], soffitto: 'roccia', buio: .22, riga: 'Il buio più profondo, pieno di lucine.' },
};
function trama(lato, quanti, genera) {
  const im = U.tela(lato, lato), x = im.getContext('2d');
  for (let i = 0; i < quanti; i++) {
    const forma = genera(i);
    for (const ox of [-lato, 0, lato]) for (const oy of [-lato, 0, lato]) { x.save(); x.translate(ox, oy); forma(x); x.restore(); }
  }
  return im;
}
let caustiche = null;
function tramaCaustiche() {
  if (caustiche) return caustiche;
  const caso = U.semi(77);
  return caustiche = trama(256, 11, () => {
    const cx = caso() * 256, cy = caso() * 256, r = 22 + caso() * 28, k = 4 + Math.floor(caso() * 4), ph = caso() * TAU;
    return x => {
      x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.shadowColor = '#fff'; x.shadowBlur = 7; x.beginPath();
      for (let a = 0; a <= 48; a++) { const an = a / 48 * TAU, rr = r * (1 + .3 * Math.sin(an * k + ph) + .14 * Math.sin(an * 2 + ph * 2)), px = cx + Math.cos(an) * rr, py = cy + Math.sin(an) * rr; if (a) x.lineTo(px, py); else x.moveTo(px, py); }
      x.closePath(); x.stroke();
    };
  });
}
/* I motivi ripetuti si creano con la tela su cui si disegna, la prima volta che servono. */
function motivi(c, sc) {
  if (sc.motiviDi !== c) {
    sc.motiviDi = c;
    sc.motivi = { lontano: c.createPattern(sc.trame.lontano, 'repeat'), vicino: c.createPattern(sc.trame.vicino, 'repeat'), luce: c.createPattern(tramaCaustiche(), 'repeat') };
  }
  return sc.motivi;
}
function stendi(c, v, motivo, scala, ox, oy, alfa, fusione) {
  if (!motivo) return;
  c.save(); c.globalAlpha = alfa; if (fusione) c.globalCompositeOperation = fusione;
  c.scale(scala, scala); c.translate(-ox, -oy); c.fillStyle = motivo; c.fillRect(ox, oy, v.vw / scala + 1, v.vh / scala + 1);
  c.restore();
}
const BOLLICINE = Array.from({ length: 40 }, (_, i) => ({ x: rumore(i, 11), y: rumore(i, 13), r: 1.2 + rumore(i, 17) * 3.3, v: .02 + rumore(i, 19) * .05, f: rumore(i, 23) * TAU }));

function registraAmbiente(scheda) {
  const pal = TAVOLOZZE[scheda.id] || TAVOLOZZE.laguna;
  B.ambienti.registra({
    id: scheda.id, provvisoria: true, descrizione: pal.riga,
    colori: { acquaAlta: pal.alto, acquaBassa: pal.basso, sabbia: pal.sabbia, roccia: pal.roccia, accento: pal.corallo[0] },
    crea(mondo, caso) {
      const W = mondo.w, H = mondo.h, tra = (a, b) => a + caso() * (b - a), uno = lista => lista[Math.floor(caso() * lista.length)], k = W / 2600;
      const sc = { pal, alghe: [], rocce: [], coralli: [], stelle: [], scogli: [], trame: null, motivi: null, motiviDi: null };
      for (let i = 0; i < 60 * k * (pal.alghe || 1); i++) sc.alghe.push({ x: tra(0, W), h: tra(70, 220) * (pal.alghe > 1.5 ? 2 : 1), f: tra(0, TAU), l: tra(7, 15) });
      for (let i = 0; i < 18 * k; i++) sc.rocce.push({ x: tra(0, W), w: tra(70, 200), h: tra(40, 120) });
      for (let i = 0; i < 26 * k; i++) sc.coralli.push({ x: tra(0, W), h: tra(50, 120), c: uno(pal.corallo), rami: 3 + Math.floor(caso() * 3) });
      for (let i = 0; i < 12 * k; i++) sc.stelle.push({ x: tra(0, W), y: H + tra(14, 40), r: tra(9, 15), a: tra(0, TAU), c: uno(pal.corallo) });
      for (let i = 0; i < 11 * k * H / 2600 * (pal.scogli || 1); i++) {
        const s = { x: tra(150, W - 150), y: tra(350, H - 350), w: tra(90, 190), h: tra(50, 100), ciuffi: [] };
        for (let j = 0, n = 3 + Math.floor(caso() * 4); j < n; j++) s.ciuffi.push({ dx: tra(-.7, .7), h: tra(30, 80), f: tra(0, TAU), c: caso() < .5 ? pal.alga : uno(pal.corallo) });
        sc.scogli.push(s);
      }
      sc.trame = {
        lontano: trama(512, 8, () => { const cx = tra(0, 512), cy = tra(0, 512), w = tra(50, 130), h = tra(30, 80), rot = tra(-.4, .4); return x => { x.fillStyle = pal.roccia; x.beginPath(); x.ellipse(cx, cy, w, h, rot, 0, TAU); x.fill(); }; }),
        vicino: trama(512, 12, () => { const cx = tra(0, 512), cy = tra(0, 512), h = tra(60, 150), l = tra(5, 10), pie = tra(-30, 30); return x => { x.strokeStyle = pal.roccia; x.lineWidth = l; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + pie, cy - h * .5, cx - pie * .6, cy - h); x.stroke(); }; }),
      };
      return sc;
    },
    sfondo(c, v, sc) {
      const cam = v.cam, z = cam.z, vw = v.vw, vh = v.vh, t = v.t, prof = limita(cam.y / v.mondo.h, 0, 1);
      const sf = c.createLinearGradient(0, -vh * prof * 1.2, 0, vh * (2.2 - prof * 1.2));
      sf.addColorStop(0, pal.alto); sf.addColorStop(1, pal.basso);
      c.fillStyle = sf; c.fillRect(0, 0, vw, vh);
      if (!sc) return;
      const m = motivi(c, sc);
      stendi(c, v, m.lontano, 2.4 * z, cam.x * .22 / 2.4, cam.y * .22 / 2.4, .32);
      stendi(c, v, m.vicino, 1.6 * z, cam.x * .45 / 1.6, cam.y * .45 / 1.6, .3);
      if (pal.soffitto !== 'roccia') {
        c.fillStyle = 'rgba(255,255,255,' + (.06 * (1.2 - prof)).toFixed(3) + ')';
        for (let i = 0; i < 6; i++) {
          const largo = vw * 1.4, bx = (((i * .23 + .05) * largo - cam.x * .15 + Math.sin(t * .3 + i) * 30) % largo + largo) % largo - vw * .2, l = 34 + i * 13;
          c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + l, 0); c.lineTo(bx + l * 2.6 - 150, vh); c.lineTo(bx - 190, vh); c.fill();
        }
      }
      if (v.qualita > 0) {
        const luce = .06 * (1.15 - prof * .7) * (pal.soffitto === 'roccia' ? .4 : 1);
        stendi(c, v, m.luce, 1.7, cam.x * z * .6 / 1.7 + t * 9, cam.y * z * .6 / 1.7 + t * 4, luce, 'lighter');
        if (v.qualita > 1) stendi(c, v, m.luce, 2.3, cam.x * z * .6 / 2.3 - t * 6 + 90, cam.y * z * .6 / 2.3 + t * 7 + 40, luce * .8, 'lighter');
      }
    },
    dietro(c, v, sc) {
      if (!sc) return;
      const cam = v.cam, t = v.t, W = v.mondo.w, H = v.mondo.h, mw = v.vw / 2 / cam.z, mh = v.vh / 2 / cam.z;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      for (const s of sc.scogli) {
        if (!v.visibile(s.x, s.y, s.w + 90)) continue;
        for (const ci of s.ciuffi) {
          const x0 = s.x + ci.dx * s.w, o = Math.sin(t * 1.4 + ci.f) * 10;
          c.strokeStyle = ci.c; c.globalAlpha = .55; c.lineWidth = 7;
          c.beginPath(); c.moveTo(x0, s.y - s.h * .5); c.quadraticCurveTo(x0 - o, s.y - s.h * .5 - ci.h * .5, x0 + o, s.y - s.h * .5 - ci.h); c.stroke();
        }
        c.globalAlpha = .6; c.fillStyle = pal.roccia; c.beginPath(); c.ellipse(s.x, s.y, s.w, s.h, 0, 0, TAU); c.fill();
        c.globalAlpha = .12; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(s.x - s.w * .15, s.y - s.h * .45, s.w * .6, s.h * .28, 0, 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
      c.fillStyle = pal.roccia;
      c.fillRect(-2000, -2000, 2000, H + 4000); c.fillRect(W, -2000, 2000, H + 4000);
      if (cam.y - mh < 60) {
        const x0 = Math.floor((cam.x - mw - 60) / 30) * 30, x1 = cam.x + mw + 60;
        if (pal.soffitto === 'acqua') {
          c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-2000, -2000, W + 4000, 2000);
          c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.beginPath();
          for (let x = x0; x < x1; x += 30) c.lineTo(x, Math.sin(x * .02 + t * 2) * 6);
          c.stroke();
        } else {
          c.fillStyle = pal.soffitto === 'ghiaccio' ? '#eaf6fc' : pal.roccia;
          c.beginPath(); c.moveTo(x0, -2000);
          for (let x = x0; x <= x1; x += 30) c.lineTo(x, 8 + rumore(Math.round(x / 30), 5) * 36);
          c.lineTo(x1, -2000); c.closePath(); c.fill();
        }
      }
      if (cam.y + mh > H - 320) {
        for (const r of sc.rocce) if (v.visibile(r.x, H, r.w)) {
          c.fillStyle = pal.roccia; c.beginPath(); c.ellipse(r.x, H + 6, r.w, r.h, 0, Math.PI, TAU); c.fill();
          c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.ellipse(r.x - r.w * .2, H - r.h * .55, r.w * .5, r.h * .25, 0, 0, TAU); c.fill();
        }
        for (const a of sc.alghe) if (v.visibile(a.x, H - a.h * .5, 60 + a.h * .5)) {
          const o = Math.sin(t * 1.3 + a.f) * 24;
          c.strokeStyle = pal.alga; c.lineWidth = a.l; c.beginPath(); c.moveTo(a.x, H + 4); c.bezierCurveTo(a.x - o, H - a.h * .35, a.x + o * 1.3, H - a.h * .65, a.x + o * .4, H - a.h); c.stroke();
        }
        for (const co of sc.coralli) if (v.visibile(co.x, H, 110)) {
          c.strokeStyle = co.c; c.fillStyle = co.c; c.lineWidth = 11;
          for (let i = 0; i < co.rami; i++) {
            const u = (i / (co.rami - 1) - .5) * 1.5, hx = co.x + u * co.h * .6, hy = H - co.h * (1 - Math.abs(u) * .35);
            c.beginPath(); c.moveTo(co.x + u * 10, H + 4); c.quadraticCurveTo(co.x + u * co.h * .15, H - co.h * .5, hx, hy); c.stroke();
            c.beginPath(); c.arc(hx, hy, 9, 0, TAU); c.fill();
          }
        }
        c.fillStyle = pal.sabbia; c.fillRect(-2000, H, W + 4000, 2000);
        c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(-2000, H + 60, W + 4000, 2000);
        for (const s of sc.stelle) if (v.visibile(s.x, s.y, 20)) {
          c.fillStyle = s.c; c.beginPath();
          for (let i = 0; i < 10; i++) { const rr = i % 2 ? s.r * .45 : s.r, a = s.a + i * Math.PI / 5; c.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); }
          c.fill();
        }
      }
      c.restore();
    },
    davanti() {},
    velo(c, v) {
      const vw = v.vw, vh = v.vh, t = v.t, cam = v.cam;
      c.save();
      if (v.qualita > 0) {
        c.fillStyle = 'rgba(255,255,255,.2)';
        for (const b of BOLLICINE) {
          const y = (((b.y - t * b.v) % 1.1) + 1.1) % 1.1 - .05, x = ((b.x * vw - cam.x * cam.z * .3) % vw + vw) % vw + Math.sin(t * 2 + b.f) * 4;
          c.beginPath(); c.arc(x, y * vh, b.r, 0, TAU); c.fill();
        }
      }
      const vg = c.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * .45, vw / 2, vh / 2, Math.max(vw, vh) * .78);
      vg.addColorStop(0, 'rgba(0,0,0,' + (pal.buio || 0) + ')'); vg.addColorStop(1, 'rgba(0,8,30,' + (.5 + (pal.buio || 0)) + ')');
      c.fillStyle = vg; c.fillRect(0, 0, vw, vh);
      c.restore();
    },
  });
}

// ---------------------------------------------------------------- si registra tutto ciò che manca
for (const s of B.cast.specie) {
  if (B.specie.ha(s.id)) continue;
  try {
    if (s.tipo === 'banco') registraBanco(s); else if (s.tipo === 'pericolo') registraPericolo(s); else registraCreatura(s);
  } catch (e) { console.error('[Boccone] modello provvisorio di "' + s.id + '"', e); }
}
for (const e of B.cast.eroi) if (!B.eroi.ha(e.id)) { try { registraEroe(e); } catch (err) { console.error('[Boccone] eroe provvisorio "' + e.id + '"', err); } }
for (const a of B.cast.ambienti) if (!B.ambienti.ha(a.id)) { try { registraAmbiente(a); } catch (err) { console.error('[Boccone] ambiente provvisorio "' + a.id + '"', err); } }
})();
