/* Boccone — il disegno (B.disegno): a ogni fotogramma legge lo stato del mondo (B.partita.mondo) e lo dipinge sulla
   tela. Non modifica mai lo stato. Imposta B.vista = { vw, vh, dpr, qualita }, che il mondo legge per lo zoom.
   Ordine: ambiente.sfondo (schermo) → ambiente.dietro (mondo) → conchiglie, bolle, pesciolini, pericoli, pesci,
   colpi dei giganti, eroe, bollicine, nuvole, particelle → ambiente.davanti (mondo) → ambiente.velo (schermo) → buio,
   bordo rosso, etichette, freccia, scritte, leva. Le trasformazioni sono quelle di strumenti/ambiente-pagina.js.
   Il movimento "da film" (schiaccia e allunga, anticipazione, contraccolpo, sguardo, battito di ciglia, bollicine) sta
   nella sezione "l'animazione": è stato del disegno, non del mondo (vedi ARCHITETTURA.md §8.7). */
(() => {
'use strict';
const B = window.B, U = B.util, F = B.figurine, TAU = Math.PI * 2, PI = Math.PI;
const { limita } = U;
const CARATTERE = 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const DPR_MAX = [1.25, 1.5, 2];          // per qualità bassa, media, alta
const MEZZO_PESCIOLINO = 10;             // mezza lunghezza di un pesciolino, in unità di mondo (cresce con la fascia dell'eroe)

const tela = document.getElementById('tela');
const ctx = tela ? tela.getContext('2d', { alpha: false }) : null;
const vista = B.vista = { vw: 390, vh: 844, dpr: 1, qualita: 2 };
const v = { t: 0, dt: 1 / 60, vw: 390, vh: 844, dpr: 1, cam: { x: 0, y: 0, z: 1 }, mondo: { w: 0, h: 0 }, qualita: 2, visibile };
let mw = 0, mh = 0, sx = 0, sy = 0;      // mezza visuale in unità di mondo, tremolio in pixel
let auto = true, lento = 0, media = 1 / 60, prima = 0, tPrima = 0, faseEroe = 0, correnteX = 0, correnteY = 0;
const rotte = new Set();                 // passate degli ambienti andate in errore (si saltano, con un solo avviso)
const o = { x: 0, y: 0, r: 0, ang: 0, fase: 0, bocca: 0, minaccia: false, alfa: 1, stato: 'calmo', t: 0, attivo: 0, carica: 0, furia: 0,
  vivo: false, stira: 0, inclina: 0, battito: 0, dettaglio: undefined, stadio: 0, espressione: 'normale', sguardo: { x: 1, y: 0 } };

function visibile(x, y, margine = 0) { const c = v.cam; return x > c.x - mw - margine && x < c.x + mw + margine && y > c.y - mh - margine && y < c.y + mh + margine; }
function schermo() { ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0); }
function mondo() { const c = v.cam, d = vista.dpr; ctx.setTransform(c.z * d, 0, 0, c.z * d, (vista.vw / 2 - c.x * c.z + sx) * d, (vista.vh / 2 - c.y * c.z + sy) * d); }
function pulito() { ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.filter = 'none'; ctx.setLineDash([]); }
const ax = x => (x - v.cam.x) * v.cam.z + vista.vw / 2 + sx, ay = y => (y - v.cam.y) * v.cam.z + vista.vh / 2 + sy;

// ---------------------------------------------------------------- qualità e misure
function leggiQualita() {
  const s = B.progressi && B.progressi.impostazione ? B.progressi.impostazione('qualita') : 'auto';
  auto = s !== 'alta' && s !== 'media' && s !== 'bassa';
  vista.qualita = s === 'bassa' ? 0 : s === 'media' ? 1 : 2;      // 'auto' parte alta e scende se il gioco rallenta
  lento = 0; media = 1 / 60;
}
function ridimensiona() {
  if (!tela) return;
  vista.dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX[vista.qualita]);
  vista.vw = Math.max(1, window.innerWidth); vista.vh = Math.max(1, window.innerHeight);
  const w = Math.round(vista.vw * vista.dpr), h = Math.round(vista.vh * vista.dpr);
  if (tela.width !== w || tela.height !== h) { tela.width = w; tela.height = h; }
}
function misuraFluidita(dt) {
  if (!auto || vista.qualita === 0 || B.partita.stato !== 'gioco' || dt > 0.25) return;
  media += (dt - media) * 0.05;
  lento = media > 0.024 ? lento + dt : Math.max(0, lento - dt);
  if (lento > 3) { vista.qualita--; lento = 0; media = 1 / 60; ridimensiona(); }
}

// ---------------------------------------------------------------- numeri
const UNITA = [' mln', ' mld', ' bil', ' bld', ' tri', ' trd'];
/* Come B.util.numero, ma regge anche i numeri enormi della sopravvivenza. */
function compatto(n) {
  if (!(n >= 1e6)) return Math.round(n || 0).toLocaleString('it-IT');
  let i = 0, x = n / 1e6;
  while (x >= 1000 && i < UNITA.length - 1) { x /= 1000; i++; }
  return (x >= 100 ? Math.round(x) : x.toFixed(1).replace('.', ',')) + UNITA[i];
}
const scritte = new Map();
function scritta(n) {
  let s = scritte.get(n);
  if (s === undefined) { if (scritte.size > 800) scritte.clear(); s = compatto(n); scritte.set(n, s); }
  return s;
}

// ---------------------------------------------------------------- pezzi disegnati dal motore
function corona(c, x, y, s) {
  c.save(); c.translate(x, y); c.rotate(-.12); c.scale(s, s);
  c.beginPath(); c.moveTo(-1, 0); c.lineTo(-1.15, -1.2); c.lineTo(-.5, -.55); c.lineTo(0, -1.45); c.lineTo(.5, -.55); c.lineTo(1.15, -1.2); c.lineTo(1, 0); c.closePath();
  c.fillStyle = '#ffd24a'; c.fill(); c.strokeStyle = '#a66a00'; c.lineWidth = .14; c.stroke();
  c.fillStyle = '#ff5c7a'; c.beginPath(); c.arc(0, -.42, .2, 0, TAU); c.fill();
  c.restore();
}
function iconaBolla(c, tipo) {
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (tipo === 'x2' || tipo === 'x5') {
    const s = tipo === 'x2' ? '×2' : '×5';
    c.font = '900 26px ' + CARATTERE; c.lineWidth = 5; c.strokeStyle = '#8a4b00';
    c.strokeText(s, 0, 1); c.fillStyle = '#ffe066'; c.fillText(s, 0, 1);
  } else if (tipo === 'calamita') {
    c.lineCap = 'butt'; c.lineWidth = 9; c.strokeStyle = '#ff5c9a';
    c.beginPath(); c.arc(0, 2, 11, 0, Math.PI); c.moveTo(-11, 2); c.lineTo(-11, -9); c.moveTo(11, 2); c.lineTo(11, -9); c.stroke();
    c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(-11, -9); c.lineTo(-11, -15); c.moveTo(11, -9); c.lineTo(11, -15); c.stroke();
  } else if (tipo === 'scudo') {
    c.fillStyle = '#9be7ff'; c.strokeStyle = '#fff'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -15); c.lineTo(13, -9); c.quadraticCurveTo(13, 9, 0, 16); c.quadraticCurveTo(-13, 9, -13, -9); c.closePath(); c.fill(); c.stroke();
  } else if (tipo === 'perla') {
    const g = c.createRadialGradient(-4, -5, 1, 0, 0, 13); g.addColorStop(0, '#fff'); g.addColorStop(.5, '#ffd9f0'); g.addColorStop(1, '#d58fc0');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fill();
  } else {
    c.fillStyle = '#ff5c7a'; c.strokeStyle = '#fff'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(0, 14); c.bezierCurveTo(-22, -2, -12, -18, 0, -7); c.bezierCurveTo(12, -18, 22, -2, 0, 14); c.closePath(); c.fill(); c.stroke();
  }
}
/* Le bolle con gli aiuti si disegnano una volta sola (72 × 72 unità, al doppio della risoluzione) e poi si copiano. */
const bolle = {};
function figurinaBolla(tipo) {
  if (bolle[tipo]) return bolle[tipo];
  const im = U.tela(144, 144), c = im.getContext('2d');
  c.scale(2, 2); c.translate(36, 36);
  const g = c.createRadialGradient(-8, -10, 2, 0, 0, 30);
  g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(.5, 'rgba(160,230,255,.28)'); g.addColorStop(1, 'rgba(120,210,255,.55)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.stroke();
  iconaBolla(c, tipo);
  return bolle[tipo] = im;
}
/* Sfumature tonde riusate (centro nell'origine, raggio 1): si spostano e si scalano con la trasformazione. */
const sfumature = {};
function sfumatura(nome, colori) {
  if (sfumature[nome]) return sfumature[nome];
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (let i = 0; i < colori.length; i += 2) g.addColorStop(colori[i], colori[i + 1]);
  return sfumature[nome] = g;
}
function macchia(x, y, r, g, alfa) {
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r); ctx.globalAlpha = alfa; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
}

function passata(nome, amb, scena) {
  if (typeof amb[nome] !== 'function') return false;
  const chiave = amb.id + ':' + nome;
  if (rotte.has(chiave)) return false;
  ctx.save();
  let bene = true;
  try { amb[nome](ctx, v, scena); } catch (e) { bene = false; rotte.add(chiave); console.error('[Boccone] ambiente "' + amb.id + '": ' + nome + '() va in errore', e); }
  ctx.restore(); pulito();
  return bene;
}

// ---------------------------------------------------------------- il mondo
function disegnaConchiglie(M, t) {
  const H = M.alto;
  if (v.cam.y + mh < H - 80) return;
  for (const c of M.conchiglie) {
    if (!visibile(c.x, H, 60)) continue;
    const ap = c.apre > 0 ? Math.min(1, c.apre * 3) * .9 : c.attesa > 0 ? 0 : .18 + .08 * Math.sin(t * 3 + c.x);
    ctx.save(); ctx.translate(c.x, H - 2);
    ctx.fillStyle = '#e9d8ff'; ctx.strokeStyle = '#8a6fc0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -8, 30, 13, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (c.attesa <= 0) { const g = ctx.createRadialGradient(-2, -14, 1, 0, -12, 9); g.addColorStop(0, '#fff'); g.addColorStop(1, '#f0a8d8'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -12, 8, 0, TAU); ctx.fill(); }
    ctx.rotate(-ap); ctx.fillStyle = c.attesa > 0 && c.apre <= 0 ? '#b9a8d8' : '#f6ecff';
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.bezierCurveTo(-30, -40, 30, -40, 30, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (const u of [-.5, 0, .5]) { ctx.moveTo(u * 18, -9); ctx.lineTo(u * 34, -29 + Math.abs(u) * 10); } ctx.stroke();
    ctx.restore();
  }
}

function disegnaBolle(M, t) {
  for (const b of M.bolle) {
    if (!visibile(b.x, b.y, 50)) continue;
    ctx.drawImage(figurinaBolla(b.tipo), b.x - 36, b.y + Math.sin(t * 2 + b.f) * 6 - 36, 72, 72);
  }
}

function disegnaPesciolini(M) {
  const r = MEZZO_PESCIOLINO * (1 + .2 * Math.min(5, M.fascia)), c = v.cam, mx = mw + r * 2, my = mh + r * 2;
  let def = null, atl = null;
  for (const f of M.pesciolini) {
    if (f.morto > 0 || !f.b.vicino) continue;
    const dx = f.x - c.x, dy = f.y - c.y;
    if (dx > mx || dx < -mx || dy > my || dy < -my) continue;
    if (f.def !== def) { def = f.def; atl = F.banco(def, r); }
    F.pesciolino(ctx, atl, f.x, f.y, f.ang, f.fase, r);
  }
}

function disegnaPericoli(M, t) {
  for (const p of M.pericoli) {
    if (p.alfa <= 0.01) continue;
    const comp = p.def.comportamento;
    if (comp === 'pendolo' && Math.abs(p.x - v.cam.x) < mw + 60) {          // la lenza dell'amo
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x0, -20); ctx.lineTo(p.x, p.y - p.r * 1.25); ctx.stroke();
    }
    if (comp === 'eruzione' && p.colonna > 2 && Math.abs(p.x - v.cam.x) < mw + p.r * 2) {      // la colonna rovente
      const w = p.r * 1.4, g = ctx.createLinearGradient(0, p.y, 0, p.y - p.colonna);
      g.addColorStop(0, 'rgba(255,170,90,.8)'); g.addColorStop(.7, 'rgba(255,210,150,.45)'); g.addColorStop(1, 'rgba(255,230,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x - w * .35, p.y - p.r * .6);
      ctx.lineTo(p.x - w * (.5 + .06 * Math.sin(t * 17)), p.y - p.colonna); ctx.lineTo(p.x + w * (.5 + .06 * Math.sin(t * 13)), p.y - p.colonna); ctx.lineTo(p.x + w * .35, p.y - p.r * .6); ctx.fill();
    }
    if (!visibile(p.x, p.y, p.r * 3.2 + (p.zona || 0))) continue;
    if (p.zona > 0 && p.attivo > 0.02) {                                     // la mina che si arma: cerchio d'allarme
      const batte = .5 + .5 * Math.sin(t * (8 + p.attivo * 22));
      ctx.globalAlpha = p.alfa * (.25 + .5 * p.attivo) * (.5 + .5 * batte);
      ctx.strokeStyle = '#ff5040'; ctx.lineWidth = 5; ctx.setLineDash([18, 14]);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.zona, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = p.alfa * .1 * p.attivo; ctx.fillStyle = '#ff5040'; ctx.fill(); ctx.globalAlpha = 1;
    }
    o.x = p.x; o.y = p.y; o.r = p.r; o.ang = p.ang || 0; o.fase = p.fase; o.attivo = p.attivo; o.alfa = p.alfa; o.t = t;
    o.bocca = 0; o.minaccia = false; o.stato = 'calmo'; o.vivo = false; o.stira = 0; o.inclina = 0; o.battito = 0; o.dettaglio = undefined;
    F.disegna(ctx, p.def, o);
  }
}

// ---------------------------------------------------------------- l'animazione
/* Il movimento "da film". Il mondo dice dove sono le creature e che cosa fanno; qui si decide COME si muovono:
   schiaccia e allunga (a volume costante), anticipazione e contraccolpo, inclinazione nelle virate, respiro da fermi,
   sguardo morbido, battito di ciglia, bollicine. Lo stato dell'animazione è del disegno e non tocca mai il mondo: una
   scheda per creatura in una WeakMap (se ne va insieme alla creatura), creata la prima volta che la si vede.
   I movimenti sono molle smorzate risolte in forma esatta: il passo è una matrice 2 × 2 calcolata una volta per
   fotogramma dal dt di gioco. Restano quindi stabili con qualunque dt (telefono lento) e ferme in pausa. */
const anime = new WeakMap();
const nuovaMolla = (omega, smorza) => ({ omega, smorza, a: 1, b: 0, c: 0, d: 1 });
const M_CORPO = nuovaMolla(19, .42);     // schiaccia e allunga: svelta, con un rimbalzo
const M_BOING = nuovaMolla(23, .34);     // grandezza (crescita, boccone, colpo): la più elastica
const M_PIEGA = nuovaMolla(13, .6);      // inclinazione nelle virate: morbida
const M_SPINTA = nuovaMolla(17, .5);     // spostamenti: rincorsa, slancio, contraccolpo
const MOLLE = [M_CORPO, M_BOING, M_PIEGA, M_SPINTA];
const BATTITO = .15;                     // secondi che dura un battito di ciglia
const scosse = { boccone: 0, morso: 0, colpito: 0, cresciuto: 0, scatto: 0 };      // ciò che è appena successo all'eroe (dagli eventi del mondo)
const impatto = { x: 0, y: 0, r: 0, da: -9 };                                    // il lampo nel punto di un morso al gigante
let nFoto = 0, calma = 1, kSguardo = 1, kBocca = 1, kAttesa = 1, mondoVisto = null, miraEroe = null, gigateATiro = 0;

function preparaMolle(dt) {
  for (let i = 0; i < MOLLE.length; i++) {
    const m = MOLLE[i], w = m.omega * Math.sqrt(1 - m.smorza * m.smorza), e = Math.exp(-m.smorza * m.omega * dt), co = Math.cos(w * dt), si = Math.sin(w * dt), q = m.smorza * m.omega / w;
    m.a = e * (co + q * si); m.b = e * si / w; m.c = -e * m.omega * m.omega / w * si; m.d = e * (co - q * si);
  }
  kSguardo = 1 - Math.exp(-dt * 9); kBocca = 1 - Math.exp(-dt * 30); kAttesa = 1 - Math.exp(-dt * 10);
}
/* La scheda di una creatura. s = allungamento lungo il corpo (0 = a riposo), g = grandezza in più, i = inclinazione,
   k = spostamento lungo il muso e u = contraccolpo lungo (ux, uy), in raggi; ognuno con la sua velocità (v…).
   gx, gy = sguardo ammorbidito (nel mondo); b = bocca ammorbidita; att = attesa del morso (anche per il gigante);
   il resto sono ricordi del fotogramma prima. */
function animaDi(e) {
  let a = anime.get(e);
  if (!a) {
    a = { foto: -9, ang: 0, vel: 0, s: 0, vs: 0, g: 0, vg: 0, i: 0, vi: 0, k: 0, vk: 0, u: 0, vu: 0, ux: 0, uy: 0, gx: 0, gy: 0, b: 0, att: 0,
      occhiT: -1, occhiDa: -9, seme: Math.random() * TAU, morsi: 0, bordo: 1, esp: 'normale', espT: -9, morsoT: -9, ruttoT: 0, rutto: 0, sciaT: 0 };
    anime.set(e, a);
  }
  return a;
}
/* Il battito di ciglia: 0 = occhi aperti, 1 = chiusi. Ogni creatura ha il suo ritmo: un battito ogni 2,5–5 secondi. */
function batte(a, t) {
  if (a.occhiT < 0 || t < a.occhiDa) { a.occhiT = t + .5 + Math.random() * 4; a.occhiDa = -9; }
  if (t >= a.occhiT) { a.occhiDa = t; a.occhiT = t + 2.5 + Math.random() * 2.5; }
  const u = (t - a.occhiDa) / BATTITO;
  return u >= 1 ? 0 : u < .4 ? U.dolce(u / .4) : U.dolce((1 - u) / .6);
}
function chiudiOcchi(a, t) { a.occhiDa = t; a.occhiT = t + 2.5 + Math.random() * 2.5; }

/* Le bollicine sono del disegno (il mondo non le conosce): un mazzetto fisso, riusato in tondo. */
const N_BOLLICINE = 28, bollicine = [];
for (let i = 0; i < N_BOLLICINE; i++) bollicine.push({ x: 0, y: 0, vx: 0, vy: 0, r: 0, eta: 1, vita: 0, f: 0 });
let prossimaBollicina = 0, bollicineFino = -1;
function bollicina(t, x, y, vx, vy, r, vita) {
  const b = bollicine[prossimaBollicina];
  prossimaBollicina = (prossimaBollicina + 1) % N_BOLLICINE;
  b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.r = r; b.eta = 0; b.vita = vita; b.f = Math.random() * TAU;
  if (t + vita > bollicineFino) bollicineFino = t + vita;
}
function disegnaBollicine(t, dt) {
  if (t > bollicineFino) return;
  const frena = Math.max(0, 1 - 3 * dt), sale = Math.min(1, 2.5 * dt);
  for (let i = 0; i < N_BOLLICINE; i++) {
    const b = bollicine[i];
    if (b.eta >= b.vita) continue;
    b.eta += dt; b.vx *= frena; b.vy += (-75 - b.vy) * sale;                // rallentano e poi salgono, dondolando
    b.x += (b.vx + Math.sin(t * 6 + b.f) * 14) * dt; b.y += b.vy * dt;
    if (!visibile(b.x, b.y, 12)) continue;
    const u = b.eta / b.vita, r = b.r * (1 + .3 * u);
    ctx.globalAlpha = Math.min(1, b.eta / .06) * (1 - u * u * u) * .9;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU);
    ctx.fillStyle = 'rgba(190,235,255,.25)'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(.8, r * .24); ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x - r * .3, b.y - r * .34, r * .24, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function spegniBollicine() { for (let i = 0; i < N_BOLLICINE; i++) bollicine[i].eta = bollicine[i].vita; bollicineFino = -1; impatto.da = -9; }
/* Il lampo dell'impatto: un bagliore chiaro e un anello che si allargano in un quarto di secondo dove l'eroe ha morso. */
function disegnaImpatto(t) {
  const u = (t - impatto.da) / .24;
  if (u < 0 || u >= 1) return;
  const q = 1 - (1 - u) * (1 - u), sp = 1 - u;
  macchia(impatto.x, impatto.y, impatto.r * (.4 + .9 * q), sfumatura('impatto', [0, 'rgba(255,255,255,.95)', .4, 'rgba(255,244,190,.65)', 1, 'rgba(255,214,110,0)']), sp * sp);
  ctx.globalAlpha = sp; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 + impatto.r * .09 * sp;
  ctx.beginPath(); ctx.arc(impatto.x, impatto.y, impatto.r * (.35 + 1.15 * q), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
}

let mira = null, miraD = 0;
function disegnaPredatori(M, t, dt) {
  const h = M.eroe, leggera = vista.qualita === 0;
  mira = M.inseguitore; miraD = mira ? -1e9 : 1e9; gigateATiro = 0;
  for (const e of M.predatori) {
    if (!visibile(e.x, e.y, e.r * (e.gigante ? 3.6 : 2.9))) continue;
    /* Chi guarda l'eroe: il pericolo che lo insegue; se no la preda (o il prepotente) più vicino. Chi stava già
       guardando conta un po' di più, così lo sguardo non salta da un pesce all'altro. */
    if (h && !M.inseguitore && (e.minaccia || e.mangiabile) && e.mangiato <= 0 && e.nasce < .5) {
      let d = Math.abs(e.x - h.x) + Math.abs(e.y - h.y) - e.r;
      if (!e.mangiabile) d *= 1.3;
      if (e === miraEroe) d *= .7;
      if (d < miraD && d < 460) { miraD = d; mira = e; }
    }
    if (e.alone > 0.01 && e.aloneR > 0) {                                    // l'alone elettrico
      ctx.globalAlpha = Math.min(1, e.alone) * .8; ctx.strokeStyle = '#fff27a'; ctx.lineWidth = 2 + e.alone * 5;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU, rr = e.aloneR * (1 + (((i * 7 + Math.floor(t * 20)) % 5) - 2) * .035); ctx.lineTo(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = Math.min(1, e.alone) * .14; ctx.fillStyle = '#fff27a'; ctx.fill(); ctx.globalAlpha = 1;
    }
    const caccia = e.minaccia && (e.stato === 'caccia' || e.stato === 'carica' || e.stato === 'avviso');
    const vivo = e.gigante || e.capo, st = e.stato;
    let px = e.x, py = e.y, rr = e.r, stira = 1, incl = 0, alfa = 1, occhi = 0;
    o.sguardo.x = 1; o.sguardo.y = 0;

    if (e.mangiato > 0) {
      /* Uscita: risucchiato verso la bocca (il mondo ce lo porta): si assottiglia e rimpicciolisce accelerando. */
      const u = limita(e.mangiato / .18, 0, 1);
      rr *= Math.max(.05, u * Math.sqrt(u)); stira = 1 + .5 * (1 - u) * calma; alfa = Math.min(1, u * 3.2);
    } else {
      if (e.nasce > 0) {
        /* Entrata: non compare di colpo ma con un piccolo ingresso elastico (arriva un filo più grande, poi si assesta). */
        const u = 1 - e.nasce, q = u - 1;
        rr *= .45 + .55 * (1 + 2.6 * q * q * q + 1.6 * q * q); alfa = Math.min(1, u * 2.4);
      }
      if (e.avviso > 0) {                                                    // prende la mira: un fremito che cresce
        const tr = (.8 + 2.4 * e.carica) * calma, f = t * 58 + e.r;
        px += Math.sin(f) * tr; py += Math.cos(f * .83) * tr * .7;
      }
      if (vivo || !leggera) {
        const a = animaDi(e);
        if (a.foto !== nFoto - 1) { a.ang = e.ang; a.vel = e.vAtt; a.morsi = e.morsi; a.gx = Math.cos(e.ang); a.gy = Math.sin(e.ang); }   // la prima volta, o dopo un'assenza
        a.foto = nFoto;
        if (dt > 0) {
          let giro = (e.ang - a.ang) % TAU;
          if (giro > PI) giro -= TAU; else if (giro < -PI) giro += TAU;
          giro = limita(giro / dt, -8, 8);
          const acc = (e.vAtt - a.vel) / dt;
          a.ang = e.ang; a.vel = e.vAtt;
          /* Schiaccia e allunga: guizzo allungato quando accelera, scatta o fugge; si raccoglie mentre prende la mira;
             si schiaccia quando frena e quando inverte la rotta. */
          let sT = limita(acc * .00006, -.09, .06);
          if (e.def.assetto === 'dritto') sT *= .5; else sT -= Math.min(.12, Math.max(0, Math.abs(giro) - 1.2) * .035);
          if (st === 'carica') sT += .11; else if (st === 'avviso') sT -= .1 * U.dolce(e.carica); else if (st === 'fuga') sT += .05;
          let y = a.s - sT, w = a.vs;
          a.s = sT + M_CORPO.a * y + M_CORPO.b * w; a.vs = M_CORPO.c * y + M_CORPO.d * w;
          if (vivo) {
            /* Giganti e capobranco: durante l'avviso si raccolgono e si gonfiano arretrando, nella carica si lanciano
               in avanti, a ogni morso dell'eroe incassano (si strizzano, sbandano, rinculano). */
            let gT = 0, kT = 0;
            if (st === 'avviso') { const q = U.dolce(e.carica); gT = .07 * q; kT = -.12 * q; }
            else if (st === 'carica') kT = .07;
            else if (st === 'sconfitto') gT = -.05;
            if (e.morsi !== a.morsi) {
              if (e.morsi > a.morsi && h) {
                const dx = e.x - h.x, dy = e.y - h.y, d = Math.hypot(dx, dy) || 1, q = Math.min(1, h.r * 1.1 / d);
                impatto.x = h.x + dx * q; impatto.y = h.y + dy * q; impatto.r = e.r * .75; impatto.da = t;
                a.ux = dx / d; a.uy = dy / d; a.vu += 9; a.vs -= 8; a.vg -= 3;
                a.vi += (Math.cos(e.ang) * -dy + Math.sin(e.ang) * dx) > 0 ? -5 : 5;
                chiudiOcchi(a, t);
              }
              a.morsi = e.morsi;
            }
            const iT = limita(giro * .03, -.16, .16);
            y = a.g - gT; w = a.vg; a.g = gT + M_BOING.a * y + M_BOING.b * w; a.vg = M_BOING.c * y + M_BOING.d * w;
            y = a.i - iT; w = a.vi; a.i = iT + M_PIEGA.a * y + M_PIEGA.b * w; a.vi = M_PIEGA.c * y + M_PIEGA.d * w;
            y = a.k - kT; w = a.vk; a.k = kT + M_SPINTA.a * y + M_SPINTA.b * w; a.vk = M_SPINTA.c * y + M_SPINTA.d * w;
            y = a.u; w = a.vu; a.u = M_SPINTA.a * y + M_SPINTA.b * w; a.vu = M_SPINTA.c * y + M_SPINTA.d * w;
          }
        }
        stira = 1 + limita(a.s, -.26, .3) * calma;
        if (vivo) {
          const co = Math.cos(e.ang), si = Math.sin(e.ang);
          rr *= 1 + limita(a.g, -.2, .25) * calma; incl = a.i * calma;
          px += (co * a.k + a.ux * a.u) * e.r * calma; py += (si * a.k + a.uy * a.u) * e.r * calma;
          occhi = batte(a, t);
          if (h && e.mordibile && Math.abs(e.x - h.x) + Math.abs(e.y - h.y) < h.r * 3 + e.r * 1.25) gigateATiro = 1;      // l'eroe sta per morderlo
          /* Lo sguardo: fissa l'eroe. Si ammorbidisce nel mondo e poi si porta nelle coordinate del modello (che può
             essere girato e specchiato): così non scatta quando il gigante si volta. */
          let mx = co, my = si;
          if (h) { const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1, q = Math.min(1, d / (e.r * 3)) / d; mx = dx * q; my = dy * q; }
          a.gx += (mx - a.gx) * kSguardo; a.gy += (my - a.gy) * kSguardo;
          o.sguardo.x = a.gx * co + a.gy * si; o.sguardo.y = (-a.gx * si + a.gy * co) * (co < 0 ? -1 : 1);
        }
      }
    }
    o.x = px; o.y = py; o.r = rr; o.stira = stira; o.inclina = incl; o.battito = occhi;
    o.ang = e.ang; o.fase = e.fase; o.bocca = e.bocca; o.minaccia = caccia; o.alfa = alfa;
    o.stato = st; o.t = t; o.attivo = 0; o.carica = e.carica; o.furia = e.furia; o.vivo = vivo; o.dettaglio = undefined;
    F.disegna(ctx, e.def, o);
    if (e.capo && e.mangiato <= 0) {                                         // la corona del capobranco (segue il corpo)
      const f = e.def.forma, sin = Math.cos(e.ang) < 0;
      ctx.save(); ctx.translate(px, py); ctx.globalAlpha = alfa;
      if (e.def.assetto === 'dritto') { if (incl) ctx.rotate(incl); if (sin) ctx.scale(-1, 1); } else { ctx.rotate(e.ang + incl); if (sin) ctx.scale(1, -1); }
      if (stira !== 1) ctx.scale(stira, 1 / stira);
      corona(ctx, f.lx * .25 * rr, -f.ly * .95 * rr, rr * .36);
      ctx.restore();
    }
    if (e.stordito > 0 && e.mangiato <= 0) {                                 // stelline di chi è stordito
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * e.r * .7, e.y - e.r * e.def.forma.ly - 8 + Math.sin(a) * e.r * .18, Math.max(3, e.r * .09), 0, TAU); ctx.fill(); }
    }
  }
  miraEroe = mira;
}

function disegnaColpi(M, t) {
  const ti = M.tiro;
  if (ti.forza > 0 && visibile(ti.x, ti.y, ti.raggio)) {                     // il risucchio: linee d'acqua che convergono
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const a = i * 2.39996 + Math.sin(t + i) * .1, u = (t * .9 + i * .137) % 1, d0 = ti.raggio * (1 - u) + 30, d1 = d0 * .84;
      ctx.globalAlpha = .08 + u * .4;
      ctx.beginPath(); ctx.moveTo(ti.x + Math.cos(a) * d0, ti.y + Math.sin(a) * d0); ctx.lineTo(ti.x + Math.cos(a + .08) * d1, ti.y + Math.sin(a + .08) * d1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  for (const w of M.onde) {
    if (!visibile(w.x, w.y, w.r + 20)) continue;
    const k = limita((w.rMax - w.r) / Math.max(1, w.rMax - (w.r0 || 0)), 0, 1);
    ctx.globalAlpha = .15 + .7 * k; ctx.lineWidth = 6 + 12 * k;
    ctx.strokeStyle = w.tipo === 'scoppio' ? '#ffb24a' : '#dff6ff';
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = .12 * k; ctx.lineWidth = 30; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const q of M.proiettili) {
    if (!visibile(q.x, q.y, q.r * 3)) continue;
    const fuoco = q.tipo !== 'raffica', co = Math.cos(q.ang), si = Math.sin(q.ang);
    ctx.globalAlpha = .35; ctx.strokeStyle = fuoco ? '#ff7a2a' : '#8fd8ff'; ctx.lineWidth = q.r * 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - co * q.r * 2.6, q.y - si * q.r * 2.6); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = fuoco ? '#ff7a2a' : '#5cb8f0'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill();
    ctx.fillStyle = fuoco ? '#ffe9a8' : '#eaf8ff'; ctx.beginPath(); ctx.arc(q.x + co * q.r * .15, q.y + si * q.r * .15, q.r * (.5 + .08 * Math.sin(t * 30)), 0, TAU); ctx.fill();
  }
}

function disegnaEroe(M, t, dt) {
  const h = M.eroe, ai = M.aiuti;
  if (!h || !h.vivo || !h.def) { scosse.boccone = scosse.morso = scosse.colpito = scosse.cresciuto = scosse.scatto = 0; return; }
  const vel = Math.hypot(h.vx, h.vy), co = Math.cos(h.ang), si = Math.sin(h.ang), a = animaDi(h);
  faseEroe = (faseEroe + dt * (1.1 + vel * .006)) % 1;
  if (a.foto !== nFoto - 1) {                                                // la prima volta, o dopo un'assenza
    if (a.foto < 0) a.g = -.4;                                               // entra in scena con un piccolo «boing»
    a.ang = h.ang; a.vel = vel; a.gx = co; a.gy = si; a.bordo = 1; a.esp = h.espressione; a.b = h.bocca; a.att = h.attesa;
  }
  a.foto = nFoto;
  const quiete = 1 - U.dolce(vel / 70);                                      // 1 = fermo: allora respira e dondola
  if (dt > 0) {
    let giro = (h.ang - a.ang) % TAU;
    if (giro > PI) giro -= TAU; else if (giro < -PI) giro += TAU;
    if (giro > 2 || giro < -2) a.vs -= 3;                                    // dietrofront: si schiaccia mentre si volta
    giro = vel > 40 ? limita(giro / dt, -9, 9) : 0;                          // da quasi fermo l'angolo non dice nulla
    const acc = (vel - a.vel) / dt, scatto = M.scatto.attivo > 0;
    a.ang = h.ang; a.vel = vel;
    a.att += (Math.max(h.attesa, gigateATiro) - a.att) * kAttesa;            // una preda a tiro (o il gigante da mordere)
    /* Schiaccia e allunga: si allunga un filo quando accelera e nello scatto, si schiaccia quando frena, quando vira
       stretto e mentre prende la rincorsa per il morso; fermo, respira. */
    let sT = limita(acc * .00005, -.1, .06) + (scatto ? .09 : 0) - Math.min(.06, Math.abs(giro) * .01) - a.att * .05 + Math.sin(t * 2.2 + 1) * .02 * quiete;
    const contro = h.x <= h.r + .5 ? -h.vx : h.x >= M.largo - h.r - .5 ? h.vx : h.y <= h.r + .5 ? -h.vy : h.y >= M.alto - h.r - .5 ? h.vy : -1e9;   // quanto spinge contro il bordo del mondo
    if (contro > -1e8) {
      if (!a.bordo && contro > 60) a.vs -= 2 + Math.min(4.5, contro / 100);  // ci sbatte: si schiaccia e rimbalza
      if (contro > 0) sT -= Math.min(.08, contro * .0003);                   // e finché spinge resta un po' schiacciato
      a.bordo = 1;
    } else a.bordo = 0;
    /* Ciò che è appena successo (dagli eventi del mondo): un colpo lo strizza, la crescita fa «boing», il boccone è
       uno slancio in avanti seguito da un sussulto di soddisfazione (più forte per il morso a un gigante). */
    if (scosse.colpito) { a.vs -= 7; a.vg -= 2.2; a.vi += a.seme > PI ? 3.2 : -3.2; chiudiOcchi(a, t); }
    if (scosse.cresciuto) { a.vg += 4.6; a.vs -= 2.5; }
    if (scosse.morso) { a.vg += 3.6; a.vs += 4.5; a.vk += 7; a.morsoT = t; a.rutto = 6; a.ruttoT = t + .16; }
    else if (scosse.boccone) { a.vg += 2.8; a.vs += 3; a.vk += 5; a.morsoT = t; a.rutto = 4; a.ruttoT = t + .16; }
    if (scosse.scatto) a.vs += 1.2;
    const gT = Math.min(h.pulsa, .5) * .07;                                  // i pesciolini: un palpito
    const iT = limita(giro * .04, -.24, .24) + Math.sin(t * 1.25) * .05 * quiete;   // nelle virate il muso anticipa; fermo, dondola
    const kT = -.1 * a.att;                                                  // anticipazione: arretra appena prima del morso
    let y = a.s - sT, w = a.vs;
    a.s = sT + M_CORPO.a * y + M_CORPO.b * w; a.vs = M_CORPO.c * y + M_CORPO.d * w;
    y = a.g - gT; w = a.vg; a.g = gT + M_BOING.a * y + M_BOING.b * w; a.vg = M_BOING.c * y + M_BOING.d * w;
    y = a.i - iT; w = a.vi; a.i = iT + M_PIEGA.a * y + M_PIEGA.b * w; a.vi = M_PIEGA.c * y + M_PIEGA.d * w;
    y = a.k - kT; w = a.vk; a.k = kT + M_SPINTA.a * y + M_SPINTA.b * w; a.vk = M_SPINTA.c * y + M_SPINTA.d * w;
    /* La bocca: si socchiude in anticipo quando c'è una preda a tiro, si spalanca al morso, poi mastica due volte. */
    let bT = Math.max(h.bocca, a.att * .62);
    const dopo = t - a.morsoT;
    if (dopo > .2 && dopo < .68) { const q = (dopo - .2) / .48, m = Math.sin(q * TAU); bT = Math.max(bT, .3 * m * m * (1 - q * .5)); }
    a.b += (bT - a.b) * kBocca;
    if (vista.qualita > 0) {
      const rb = h.r * (calma < 1 ? .6 : 1);
      if (a.rutto > 0 && t >= a.ruttoT) {                                    // dopo un boccone grosso, bollicine dalla bocca
        for (let i = 0; i < a.rutto; i++) {
          const av = h.ang + (Math.random() - .5) * 1.1, v0 = 50 + Math.random() * 90;
          bollicina(t, h.x + co * h.r * .9, h.y + si * h.r * .9 + h.r * .15, Math.cos(av) * v0 + h.vx * .6, Math.sin(av) * v0 + h.vy * .6 - 30, rb * (.07 + Math.random() * .1), .7 + Math.random() * .6);
        }
        a.rutto = 0;
      }
      if (scatto) {                                                          // nello scatto, bollicine dietro la coda
        a.sciaT += dt;
        while (a.sciaT > .05) {
          a.sciaT -= .05;
          const lato = (Math.random() - .5) * h.r * .9;
          bollicina(t, h.x - co * h.r * 1.05 - si * lato, h.y - si * h.r * 1.05 + co * lato, -co * 40, -si * 40, rb * (.06 + Math.random() * .08), .45 + Math.random() * .4);
        }
      } else a.sciaT = 0;
    } else a.rutto = 0;
  }
  scosse.boccone = scosse.morso = scosse.colpito = scosse.cresciuto = scosse.scatto = 0;

  /* L'espressione è quella del mondo, ma senza sfarfallii: la paura entra e esce a due soglie diverse, la felicità del
     boccone vince per un attimo anche sulla paura, e ogni faccia resta almeno un terzo di secondo. */
  let esp = h.espressione;
  if (esp !== 'colpito') {
    const paura = a.esp === 'spaventato' ? M.pericolo > .26 : M.pericolo > .46, felice = h.felice > 0 || esp === 'felice';
    esp = felice && (!paura || h.felice > .45) ? 'felice' : paura ? 'spaventato' : 'normale';
    if (esp !== a.esp && esp !== 'felice' && t - a.espT < .35) esp = a.esp;
  }
  if (esp !== a.esp) { a.esp = esp; a.espT = t; }

  /* Lo sguardo: verso chi lo insegue o verso la preda più vicina (lo ha scelto disegnaPredatori), se no verso il banco
     di pesciolini più vicino, se no avanti. Ammorbidito nel mondo, poi portato nelle coordinate del modello. */
  let mx = co, my = si, bx = 0, by = 0, c = false;
  if (miraEroe && miraEroe.mangiato <= 0) { bx = miraEroe.x; by = miraEroe.y; c = true; }
  else {
    let vicino = 330 + h.r;
    for (const b of M.banchi) { if (!b.vicino) continue; const d = Math.abs(b.x - h.x) + Math.abs(b.y - h.y) - b.raggio * .5; if (d < vicino) { vicino = d; bx = b.x; by = b.y; c = true; } }
  }
  if (c) { const dx = bx - h.x, dy = by - h.y, d = Math.hypot(dx, dy) || 1, q = Math.min(1, d / (h.r * 3)) / d; mx = dx * q; my = dy * q; }
  a.gx += (mx - a.gx) * kSguardo; a.gy += (my - a.gy) * kSguardo;

  if (ai.calamitaT > 0) {
    ctx.strokeStyle = '#ff9ecb'; ctx.lineWidth = 3;
    for (let i = 0; i < 2; i++) { const u = (t * .9 + i * .5) % 1; ctx.globalAlpha = (1 - u) * .5; ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 20 + (1 - u) * 130, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (ai.frenesiaT > 0) macchia(h.x, h.y, h.r * (1.75 + .1 * Math.sin(t * 12)), sfumatura('frenesia', [0, 'rgba(255,170,60,.55)', .6, 'rgba(255,120,40,.28)', 1, 'rgba(255,120,40,0)']), 1);
  const k = a.k * h.r * calma;
  o.x = h.x + co * k; o.y = h.y + si * k + Math.sin(t * 2.2) * h.r * .075 * quiete * calma;
  o.r = h.r * (1 + limita(a.g, -.45, .3) * calma); o.stira = 1 + limita(a.s, -.28, .3) * calma; o.inclina = a.i * calma;
  o.ang = h.ang; o.fase = faseEroe; o.bocca = limita(a.b, 0, 1); o.battito = batte(a, t);
  o.minaccia = false; o.alfa = h.invul > 0 && Math.floor(t * 10) % 2 === 0 ? .5 : 1; o.stato = 'calmo'; o.t = t; o.attivo = 0; o.carica = 0; o.furia = 0;
  o.vivo = true; o.dettaglio = 1; o.stadio = h.stadio; o.espressione = esp;
  o.sguardo.x = a.gx * co + a.gy * si; o.sguardo.y = (-a.gx * si + a.gy * co) * (co < 0 ? -1 : 1);
  F.disegna(ctx, h.def, o);
  if (ai.scudo) {
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (1.45 + Math.sin(t * 5) * .04), 0, TAU);
    ctx.fillStyle = 'rgba(155,231,255,.14)'; ctx.fill(); ctx.strokeStyle = 'rgba(155,231,255,.9)'; ctx.lineWidth = Math.max(2, h.r * .07); ctx.stroke();
  }
  if (h.stordito > 0) {                                                      // scossa: scintille
    ctx.strokeStyle = '#fff27a'; ctx.lineWidth = 3; ctx.lineJoin = 'miter';
    for (let i = 0; i < 5; i++) {
      const an = i * 1.3 + Math.floor(t * 14) * 2.1, r0 = h.r * .9, r1 = h.r * 1.5;
      ctx.beginPath(); ctx.moveTo(h.x + Math.cos(an) * r0, h.y + Math.sin(an) * r0); ctx.lineTo(h.x + Math.cos(an + .22) * (r0 + r1) / 2, h.y + Math.sin(an + .22) * (r0 + r1) / 2); ctx.lineTo(h.x + Math.cos(an - .05) * r1, h.y + Math.sin(an - .05) * r1); ctx.stroke();
    }
  }
}

const LOBI = [[0, 0, 1], [.42, .18, .72], [-.38, .26, .68], [.08, -.4, .66], [-.3, -.3, .6]];
function disegnaNuvole(M) {
  for (let n = 0; n < M.nuvole.length; n++) {
    const w = M.nuvole[n];
    if (!visibile(w.x, w.y, w.r * 1.6)) continue;
    const inchiostro = w.tipo !== 'scia', dentro = Math.min(1, w.eta / .35), fuori = Math.min(1, (w.vita - w.eta) / 1.3);
    const alfa = Math.max(0, Math.min(dentro, fuori)) * (inchiostro ? .93 : .5), cresce = .75 + .25 * Math.min(1, w.eta / 1.2);
    const g = inchiostro ? sfumatura('inchiostro', [0, 'rgba(14,10,34,1)', .55, 'rgba(14,10,34,.92)', 1, 'rgba(14,10,34,0)']) : sfumatura('scia', [0, 'rgba(150,140,125,.9)', .6, 'rgba(150,140,125,.5)', 1, 'rgba(150,140,125,0)']);
    const quanti = inchiostro && vista.qualita > 0 ? LOBI.length : 2;
    for (let i = 0; i < quanti; i++) { const L = LOBI[i]; macchia(w.x + L[0] * w.r, w.y + L[1] * w.r, w.r * L[2] * cresce, g, alfa); }
  }
}

function disegnaParticelle(M) {
  for (const p of M.particelle) {
    const dx = p.x - v.cam.x, dy = p.y - v.cam.y;
    if (dx > mw + 10 || dx < -mw - 10 || dy > mh + 10 || dy < -mh - 10) continue;
    ctx.globalAlpha = Math.max(0, 1 - p.eta / p.vita); ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- sopra tutto, in misure di schermo
let telaBuio = null, cBuio = null;
function disegnaBuio(M) {
  const h = M.eroe, vw = vista.vw, vh = vista.vh, K = 4;
  if (!(M.buio > 0.01) || !h) return;
  const w = Math.ceil(vw / K), hh = Math.ceil(vh / K);
  if (!telaBuio || telaBuio.width !== w || telaBuio.height !== hh) { telaBuio = U.tela(w, hh); cBuio = telaBuio.getContext('2d'); }
  const c = cBuio, z = v.cam.z;
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, hh);
  c.fillStyle = 'rgba(3,5,22,' + Math.min(.97, M.buio * 1.05).toFixed(3) + ')'; c.fillRect(0, 0, w, hh);
  c.globalCompositeOperation = 'destination-out';
  const buco = (x, y, r, forza) => {
    const g = c.createRadialGradient(x / K, y / K, 0, x / K, y / K, r / K);
    g.addColorStop(0, 'rgba(0,0,0,' + forza + ')'); g.addColorStop(.55, 'rgba(0,0,0,' + forza * .75 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x / K, y / K, r / K, 0, TAU); c.fill();
  };
  if (h.vivo) buco(ax(h.x), ay(h.y), Math.min(vw, vh) * .34 + h.r * z * 1.6, 1);
  for (const e of M.predatori) if ((e.def.speciale === 'luce' || e.gigante) && visibile(e.x, e.y, e.r * 2)) buco(ax(e.x), ay(e.y), e.r * z * (e.gigante ? 1.5 : 2.3), e.gigante ? .5 : .8);
  ctx.drawImage(telaBuio, 0, 0, vw, vh);
}
/* Quanto si vede un punto dello schermo nel buio (1 = bene): le etichette lontane dall'eroe si attenuano. */
function luceIn(M, x, y) {
  const h = M.eroe;
  if (!(M.buio > 0.05) || !h) return 1;
  const d = Math.hypot(x - ax(h.x), y - ay(h.y)), r = Math.min(vista.vw, vista.vh) * .34 + h.r * v.cam.z * 1.6;
  return 1 - M.buio * .75 * limita((d - r * .6) / (r * .5), 0, 1);
}
/* Quanto una nuvola d'inchiostro copre un punto del mondo (0..1). */
function copertura(M, x, y) {
  let k = 0;
  for (const w of M.nuvole) {
    if (w.tipo === 'scia') continue;
    const d = Math.hypot(x - w.x, y - w.y);
    if (d < w.r) k = Math.max(k, Math.min(1, w.eta / .35, (w.vita - w.eta) / 1.3) * Math.min(1, (w.r - d) / (w.r * .35)));
  }
  return k;
}

function disegnaCorrente(M, dt) {
  const co = M.corrente;
  if (!co || !co.forza) return;
  const vw = vista.vw, vh = vista.vh, z = v.cam.z, m = Math.hypot(co.x, co.y) || 1;
  correnteX += co.x * z * dt * 2.2; correnteY += co.y * z * dt * 2.2;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.globalAlpha = Math.min(.3, m / 220);
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const x = (((U.rumore(i, 31) * vw + correnteX * (.6 + U.rumore(i, 37) * .8)) % vw) + vw) % vw, y = (((U.rumore(i, 41) * vh + correnteY * (.6 + U.rumore(i, 43) * .8)) % vh) + vh) % vh;
    ctx.moveTo(x, y); ctx.lineTo(x - co.x / m * (10 + m * .25), y - co.y / m * (10 + m * .25));
  }
  ctx.stroke(); ctx.globalAlpha = 1;
}

function iconaEtichetta(tipo, x, y, px) {
  ctx.save(); ctx.translate(x, y); ctx.scale(px / 20, px / 20); ctx.lineJoin = 'round';
  if (tipo === 'scudo') {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, -5); ctx.quadraticCurveTo(7, 5, 0, 9); ctx.quadraticCurveTo(-7, 5, -7, -5); ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, -2, 4.2, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-6.5, -2, 13, 10, 2.5); else ctx.rect(-6.5, -2, 13, 10); ctx.fill();
  }
  ctx.restore();
}
function etichetta(x, y, s, sfondo, px, icona) {
  ctx.font = '900 ' + px + 'px ' + CARATTERE;
  const wi = icona ? px * .95 : 0, w = ctx.measureText(s).width + wi + px * .9, hh = px * 1.45;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - w / 2, y - hh / 2, w, hh, hh / 2); else ctx.rect(x - w / 2, y - hh / 2, w, hh);
  ctx.fillStyle = sfondo; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1.5, px * .1); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s, x + wi / 2, y + px * .04);
  if (icona) iconaEtichetta(icona, x - w / 2 + px * .5 + wi * .42, y, px);
}
const VERDE = 'rgba(26,160,90,.94)', ROSSO = 'rgba(214,40,70,.94)', GRIGIO = 'rgba(96,108,130,.92)', BLU = 'rgba(12,40,90,.92)', ARANCIO = 'rgba(255,150,30,.96)';
const ORO = 'rgba(255,196,40,.97)';

/* L'etichetta del gigante: il numero è la vita che gli resta (rosso; verde quando l'eroe lo può mangiare in un boccone),
   più grande di quello dei pesci e con un sussulto a ogni morso. Sotto, la barra della vita con le due tacche della
   furia (due terzi e un terzo). Sopra, l'invito: "MORDI!" quando si può mordere, "MANGIALO!" quando è verde; il
   lucchetto finché l'eroe non è cresciuto abbastanza per morderlo. */
function etichettaGigante(M, e, ex, ey, px, t) {
  const ob = B.partita.dati.obiettivo, puo = !!ob && ob.puoMordere;
  const colpo = limita((e.intoccabile - 2) / .4, 0, 1), pg = Math.round(px * 1.15 * (1 + .14 * colpo)), testo = scritta(e.p);
  // il numero resta sempre leggibile: dentro lo schermo ai lati e sotto il cruscotto
  ctx.font = '900 ' + pg + 'px ' + CARATTERE;
  const mezzo = (ctx.measureText(testo).width + pg * 1.9) / 2 + 6;
  ex = limita(ex, Math.min(mezzo, vista.vw / 2), Math.max(vista.vw - mezzo, vista.vw / 2)); ey = Math.max(ey, 204 + pg * 2.3);   // sopra resta il posto per "MORDI!" e per "!"

  etichetta(ex, ey, testo, e.mangiabile ? VERDE : ROSSO, pg, !puo && !e.mangiabile ? 'lucchetto' : null);
  if (e.vitaTotale > 0 && e.sconfitto <= 0) {
    const w = Math.max(px * 5.2, 86), hh = Math.max(7, px * .34), x0 = ex - w / 2, yy = ey + pg * .72 + 5, vita = limita(e.vita, 0, 1);
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, yy, w, hh, hh / 2); else ctx.rect(x0, yy, w, hh);
    ctx.fillStyle = 'rgba(8,20,48,.78)'; ctx.fill();
    if (vita > 0) {
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, yy, Math.max(hh, w * vita), hh, hh / 2); else ctx.rect(x0, yy, w * vita, hh);
      ctx.fillStyle = e.mangiabile ? '#3fd68a' : e.furia > 1 ? '#ffb02e' : e.furia > 0 ? '#ff7a3d' : '#ff4f6e'; ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(x0 + w / 3 - 1, yy + 1, 2, hh - 2); ctx.fillRect(x0 + w * 2 / 3 - 1, yy + 1, 2, hh - 2);
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, yy, w, hh, hh / 2); else ctx.rect(x0, yy, w, hh);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  if (e.avviso > 0) etichetta(ex, ey - pg * 1.9, '!', ARANCIO, Math.round(px * 1.3));
  else if ((e.mordibile || e.mangiabile) && e.sconfitto <= 0) {
    const batte = 1 + .1 * Math.sin(t * 9);
    etichetta(ex, ey - pg * 1.75, e.mangiabile ? 'MANGIALO!' : 'MORDI!', e.mangiabile ? VERDE : ORO, Math.round(Math.max(13, px * .72) * batte));
  }
}

function disegnaEtichette(M, t) {
  const h = M.eroe, z = v.cam.z;
  if (!h) return;
  const inchiostro = M.nuvole.length > 0;
  for (const e of M.predatori) {
    if (e.nasce > .5 || e.mangiato > 0 || !visibile(e.x, e.y, e.r * 2)) continue;
    const f = e.def.forma, px = Math.round(limita(e.r * z * .42, 12, 30));
    const alto = e.def.assetto === 'dritto' ? f.ly : f.ly * Math.abs(Math.cos(e.ang)) + f.lx * Math.abs(Math.sin(e.ang));
    const ex = ax(e.x), ey = ay(e.y - e.r * Math.max(f.ly, alto) * (e.gigante ? 1.25 : 1)) - px * 1.5;
    let alfa = luceIn(M, ex, ey);
    if (inchiostro) alfa *= 1 - .85 * copertura(M, e.x, e.y);
    if (alfa < .06) continue;
    ctx.globalAlpha = alfa;
    if (e.gigante) { etichettaGigante(M, e, ex, ey - px * .5, px, t); continue; }
    const sp = e.def.speciale, chiuso = !e.mangiabile && h.p > e.p && (sp === 'corazza' || sp === 'veleno');
    etichetta(ex, ey, scritta(e.p), e.mangiabile ? VERDE : e.minaccia ? ROSSO : GRIGIO, px, chiuso ? (sp === 'corazza' ? 'scudo' : 'lucchetto') : null);
    if (e.avviso > 0) etichetta(ex, ey - px * 2, '!', ARANCIO, Math.round(px * 1.3));
  }
  ctx.globalAlpha = 1;
  if (h.vivo) etichetta(ax(h.x), ay(h.y - h.r) - 20, scritta(h.p), BLU, Math.round(16 + h.pulsa * 4));
}

function disegnaFreccia(M, t) {
  const h = M.eroe, e = M.obiettivo;
  if (!h || !h.vivo || !e || e.via || B.partita.stato !== 'gioco' || visibile(e.x, e.y, -e.r * .3)) return;
  const vw = vista.vw, vh = vista.vh, a = Math.atan2(e.y - h.y, e.x - h.x), rr = Math.min(vw, vh) * .4, ob = B.partita.dati.obiettivo, pronto = e.mangiabile || (e.gigante && !!ob && ob.puoMordere), batte = pronto ? 1 + .15 * Math.sin(t * 8) : 1;
  ctx.save(); ctx.translate(vw / 2 + Math.cos(a) * rr, vh / 2 + Math.sin(a) * rr * Math.min(1.5, vh / vw)); ctx.rotate(a); ctx.scale(batte, batte);
  ctx.fillStyle = pronto ? 'rgba(124,242,154,.95)' : 'rgba(255,123,123,.8)'; ctx.strokeStyle = 'rgba(8,20,48,.6)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-3, 0); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(-a); corona(ctx, -Math.cos(a) * 24, -Math.sin(a) * 24 + 6, 7);
  ctx.restore();
}

/* Il danno di un morso al gigante: un numero grosso, dal giallo oro al rosso, che compare con un rimbalzo (più grande
   e con un sussulto quando c'è un moltiplicatore, o quando è il boccone finale), sale piano e sfuma. Resta sempre dentro
   lo schermo e sotto il cruscotto. */
function disegnaDanno(s) {
  const vw = vista.vw, sec = s.eta * s.durata, forte = s.danno > 1;
  const px = Math.round((forte ? 50 : 40) * limita(vw / 390, .82, 1.25));
  const balzo = sec < .1 ? .5 + sec / .1 * (forte ? 1.05 : .85) : sec < .28 ? (forte ? 1.55 : 1.35) - (sec - .1) / .18 * (forte ? .55 : .35) : 1;
  ctx.font = '900 ' + px + 'px ' + CARATTERE;
  const w = ctx.measureText(s.s).width * balzo / 2 + 10;
  const x = limita(ax(s.x), Math.min(w, vw / 2), Math.max(vw - w, vw / 2)), y = limita(ay(s.y), 200 + px * (s.molt > 1 ? 1.5 : .7), vista.vh - 120);
  ctx.save(); ctx.translate(x, y);
  if (forte && sec < .5) ctx.rotate(Math.sin(sec * 40) * .07 * (1 - sec / .5));
  ctx.scale(balzo, balzo);
  ctx.globalAlpha = s.eta < .75 ? 1 : Math.max(0, 1 - (s.eta - .75) / .25);
  const g = ctx.createLinearGradient(0, -px * .5, 0, px * .5);
  g.addColorStop(0, '#fff3a6'); g.addColorStop(.45, '#ffc93c'); g.addColorStop(1, '#ff3b4e');
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(6, px * .2); ctx.strokeStyle = 'rgba(70,6,20,.95)'; ctx.strokeText(s.s, 0, 0);
  ctx.lineWidth = Math.max(2, px * .06); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(s.s, 0, 0);
  ctx.fillStyle = g; ctx.fillText(s.s, 0, 0);
  if (s.molt > 1) {                                                          // il moltiplicatore, più piccolo, sopra al numero
    const pm = Math.round(px * .46), scrittaM = 'Morso ×' + s.molt;
    ctx.font = '900 ' + pm + 'px ' + CARATTERE; ctx.lineWidth = Math.max(4, pm * .22); ctx.strokeStyle = 'rgba(70,6,20,.95)';
    ctx.strokeText(scrittaM, 0, -px * .82); ctx.fillStyle = '#ffe066'; ctx.fillText(scrittaM, 0, -px * .82);
  }
  ctx.restore();
}

function disegnaTesti(M) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,20,48,.85)';
  for (const s of M.testi) {
    if (s.danno > 0) continue;
    const px = s.grande ? 24 : 16, x = limita(ax(s.x), 40, vista.vw - 40), y = ay(s.y);
    if (y < -20 || y > vista.vh + 20) continue;
    ctx.globalAlpha = s.eta < .7 ? 1 : Math.max(0, 1 - (s.eta - .7) / .3);
    ctx.font = '900 ' + px + 'px ' + CARATTERE;
    ctx.strokeText(s.s, x, y); ctx.fillStyle = s.c; ctx.fillText(s.s, x, y);
    if (s.perla) {
      const w = ctx.measureText(s.s).width / 2 + 10, g = ctx.createRadialGradient(x + w - 2, y - 2, 1, x + w, y, 7);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#e09ccc'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + w, y, 7, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const s of M.testi) if (s.danno > 0) disegnaDanno(s);                // i danni per ultimi, sopra a tutte le altre scritte
  ctx.globalAlpha = 1;
}

function disegnaLeva() {
  const l = B.comandi && B.comandi.leva;
  if (!l || !l.attiva || B.partita.stato !== 'gioco') return;
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath(); ctx.arc(l.x0, l.y0, 55, 0, TAU); ctx.fill(); ctx.stroke();
  let dx = l.x - l.x0, dy = l.y - l.y0; const d = Math.hypot(dx, dy);
  if (d > 55) { dx *= 55 / d; dy *= 55 / d; }
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(l.x0 + dx, l.y0 + dy, 24, 0, TAU); ctx.fill();
}

// ---------------------------------------------------------------- il fotogramma
function fotogramma() {
  if (!ctx) return;
  const ora = performance.now(), dtVero = prima ? Math.min(.1, (ora - prima) / 1000) : 1 / 60;
  prima = ora;
  const M = B.partita && B.partita.mondo, vw = vista.vw, vh = vista.vh;
  /* Prima la misura della fluidità: se abbassa la qualità cambia le misure della tela, e una tela che cambia misure
     perde la trasformazione. Va fatto prima di impostarla, altrimenti lo sfondo di quel fotogramma esce rimpicciolito. */
  if (M) misuraFluidita(dtVero);
  schermo(); pulito();
  if (!M) { ctx.fillStyle = '#0a1f44'; ctx.fillRect(0, 0, vw, vh); return; }
  const t = M.t, cam = M.cam, z = cam.z, dt = limita(t - tPrima, 0, .05), stato = B.partita.stato;
  tPrima = t; nFoto++;
  if (M !== mondoVisto) { mondoVisto = M; miraEroe = null; spegniBollicine(); }   // un mondo nuovo: l'animazione riparte
  preparaMolle(dt);
  v.t = t; v.dt = dt || 1 / 60; v.vw = vw; v.vh = vh; v.dpr = vista.dpr; v.qualita = vista.qualita;
  v.cam.x = cam.x; v.cam.y = cam.y; v.cam.z = z; v.mondo.w = M.largo; v.mondo.h = M.alto;
  mw = vw / 2 / z; mh = vh / 2 / z;
  sx = M.scossa > 0 ? (Math.random() * 2 - 1) * M.scossa : 0; sy = M.scossa > 0 ? (Math.random() * 2 - 1) * M.scossa : 0;
  F.inizio(z * vista.dpr);
  const amb = M.ambiente, scena = M.scena;

  if (!passata('sfondo', amb, scena)) { schermo(); ctx.fillStyle = (amb.colori && amb.colori.acquaBassa) || '#0b2a5c'; ctx.fillRect(0, 0, vw, vh); }
  mondo(); passata('dietro', amb, scena);
  mondo(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  disegnaConchiglie(M, t);
  disegnaBolle(M, t);
  disegnaPesciolini(M);
  disegnaPericoli(M, t);
  disegnaPredatori(M, t, dt);
  disegnaColpi(M, t);
  disegnaEroe(M, t, dt);
  disegnaBollicine(t, dt);
  disegnaImpatto(t);
  disegnaNuvole(M);
  disegnaParticelle(M);
  pulito();
  mondo(); passata('davanti', amb, scena);
  schermo(); passata('velo', amb, scena);

  schermo(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  disegnaCorrente(M, dt);
  disegnaBuio(M);
  const rosso = stato === 'gioco' || stato === 'perso' ? Math.max(M.lampo, M.pericolo * (.3 + .12 * Math.sin(t * 9))) : 0;
  if (rosso > .02) {
    const rg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * .3, vw / 2, vh / 2, Math.max(vw, vh) * .7);
    rg.addColorStop(0, 'rgba(255,40,70,0)'); rg.addColorStop(1, 'rgba(255,40,70,' + (rosso * .75).toFixed(3) + ')');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, vw, vh);
  }
  if (M.eroe) { disegnaEtichette(M, t); disegnaFreccia(M, t); disegnaTesti(M); disegnaLeva(); }
  pulito();
  F.lavora(4);
}

leggiQualita(); ridimensiona();
window.addEventListener('resize', ridimensiona);
window.addEventListener('orientationchange', ridimensiona);
B.eventi.su('impostazioni', d => { if (d && d.chiave === 'qualita') { leggiQualita(); ridimensiona(); } });
// Ciò che succede all'eroe arriva dagli eventi del mondo: il disegno lo ricorda fino al prossimo fotogramma.
B.eventi.su('mangiato', () => { scosse.boccone = 1; });
B.eventi.su('gigante:morso', () => { scosse.morso = 1; });
B.eventi.su('colpito', () => { scosse.colpito = 1; });
B.eventi.su('cresciuto', () => { scosse.cresciuto = 1; });
B.eventi.su('scatto', () => { scosse.scatto = 1; });
B.eventi.su('partita:inizio', () => { scosse.boccone = scosse.morso = scosse.colpito = scosse.cresciuto = scosse.scatto = 0; });
// Chi soffre il movimento (prefers-reduced-motion): le stesse animazioni, ma con ampiezze molto ridotte.
try {
  const meno = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (meno) {
    const leggi = () => { calma = meno.matches ? .35 : 1; };
    leggi();
    if (meno.addEventListener) meno.addEventListener('change', leggi); else if (meno.addListener) meno.addListener(leggi);
  }
} catch (e) {}

B.disegno = { fotogramma, ridimensiona, compatto, corona, iconaBolla, tela, CARATTERE,
  /* Per le prove: la scheda di animazione di una creatura (sola lettura) e le bollicine vive in questo momento. */
  animazione: { di: e => anime.get(e) || null, bollicine: () => bollicine.filter(b => b.eta < b.vita).length, get calma() { return calma; } } };
})();
