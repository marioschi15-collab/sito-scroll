/* Boccone — il disegno (B.disegno): a ogni fotogramma legge lo stato del mondo (B.partita.mondo) e lo dipinge sulla
   tela. Non modifica mai lo stato. Imposta B.vista = { vw, vh, dpr, qualita }, che il mondo legge per lo zoom.
   Ordine: ambiente.sfondo (schermo) → ambiente.dietro (mondo) → conchiglie, bolle, pesciolini, pericoli, pesci,
   colpi dei giganti, eroe, nuvole, particelle → ambiente.davanti (mondo) → ambiente.velo (schermo) → buio, bordo
   rosso, etichette, freccia, scritte, leva. Le trasformazioni sono quelle di strumenti/ambiente-pagina.js. */
(() => {
'use strict';
const B = window.B, U = B.util, F = B.figurine, TAU = Math.PI * 2;
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
  vivo: false, stira: 0, dettaglio: undefined, stadio: 0, espressione: 'normale', sguardo: { x: 1, y: 0 } };
const avanti = { x: 1, y: 0 };

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
    o.bocca = 0; o.minaccia = false; o.stato = 'calmo'; o.vivo = false; o.stira = 0; o.dettaglio = undefined;
    F.disegna(ctx, p.def, o);
  }
}

/* Lo sguardo verso un punto del mondo, nelle coordinate del modello (che può essere girato e specchiato). */
function sguardoVerso(da, x, y, uscita) {
  const dx = x - da.x, dy = y - da.y, d = Math.hypot(dx, dy) || 1, co = Math.cos(da.ang), si = Math.sin(da.ang), k = Math.min(1, d / (da.r * 3)) / d;
  uscita.x = (dx * co + dy * si) * k; uscita.y = (-dx * si + dy * co) * k * (co < 0 ? -1 : 1);
  return uscita;
}

let vicinoEroe = null, vicinoD = 0;
function disegnaPredatori(M, t) {
  const h = M.eroe;
  vicinoEroe = M.inseguitore; vicinoD = vicinoEroe ? 0 : 1e9;
  for (const e of M.predatori) {
    if (!visibile(e.x, e.y, e.r * (e.gigante ? 3.6 : 2.9))) continue;
    if (h && !M.inseguitore && (e.minaccia || e.mangiabile) && e.mangiato <= 0) {
      const d = Math.abs(e.x - h.x) + Math.abs(e.y - h.y) - e.r;
      if (d < vicinoD && d < 420) { vicinoD = d; vicinoEroe = e; }
    }
    if (e.alone > 0.01 && e.aloneR > 0) {                                    // l'alone elettrico
      ctx.globalAlpha = Math.min(1, e.alone) * .8; ctx.strokeStyle = '#fff27a'; ctx.lineWidth = 2 + e.alone * 5;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU, rr = e.aloneR * (1 + (((i * 7 + Math.floor(t * 20)) % 5) - 2) * .035); ctx.lineTo(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = Math.min(1, e.alone) * .14; ctx.fillStyle = '#fff27a'; ctx.fill(); ctx.globalAlpha = 1;
    }
    const caccia = e.minaccia && (e.stato === 'caccia' || e.stato === 'carica' || e.stato === 'avviso');
    const trema = e.avviso > 0 ? 3 : 0;
    o.x = e.x + (trema ? (Math.random() * 2 - 1) * trema : 0); o.y = e.y + (trema ? (Math.random() * 2 - 1) * trema : 0);
    o.r = e.r * (e.mangiato > 0 ? limita(e.mangiato / .18, .05, 1) : 1);
    o.ang = e.ang; o.fase = e.fase; o.bocca = e.bocca; o.minaccia = caccia; o.alfa = e.nasce > 0 ? 1 - e.nasce : 1;
    o.stato = e.stato; o.t = t; o.attivo = 0; o.carica = e.carica; o.furia = e.furia; o.vivo = e.gigante || e.capo; o.stira = 0; o.dettaglio = undefined;
    if (o.vivo && h) sguardoVerso(e, h.x, h.y, o.sguardo); else { o.sguardo.x = 1; o.sguardo.y = 0; }
    F.disegna(ctx, e.def, o);
    if (e.capo && e.mangiato <= 0) {                                         // la corona del capobranco
      const f = e.def.forma, sin = Math.cos(e.ang) < 0;
      ctx.save(); ctx.translate(e.x, e.y); ctx.globalAlpha = o.alfa;
      if (e.def.assetto === 'dritto') { if (sin) ctx.scale(-1, 1); } else { ctx.rotate(e.ang); if (sin) ctx.scale(1, -1); }
      corona(ctx, f.lx * .25 * e.r, -f.ly * .95 * e.r, e.r * .36);
      ctx.restore();
    }
    if (e.stordito > 0 && e.mangiato <= 0) {                                 // stelline di chi è stordito
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * e.r * .7, e.y - e.r * e.def.forma.ly - 8 + Math.sin(a) * e.r * .18, Math.max(3, e.r * .09), 0, TAU); ctx.fill(); }
    }
  }
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
  const h = M.eroe, a = M.aiuti;
  if (!h || !h.vivo || !h.def) return;
  faseEroe = (faseEroe + dt * (1.1 + Math.hypot(h.vx, h.vy) * .006)) % 1;
  if (a.calamitaT > 0) {
    ctx.strokeStyle = '#ff9ecb'; ctx.lineWidth = 3;
    for (let i = 0; i < 2; i++) { const u = (t * .9 + i * .5) % 1; ctx.globalAlpha = (1 - u) * .5; ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 20 + (1 - u) * 130, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (a.frenesiaT > 0) macchia(h.x, h.y, h.r * (1.75 + .1 * Math.sin(t * 12)), sfumatura('frenesia', [0, 'rgba(255,170,60,.55)', .6, 'rgba(255,120,40,.28)', 1, 'rgba(255,120,40,0)']), 1);
  o.x = h.x; o.y = h.y; o.r = h.r * (1 + h.pulsa * .12); o.ang = h.ang; o.fase = faseEroe; o.bocca = Math.max(h.bocca, h.attesa * .65);
  o.minaccia = false; o.alfa = h.invul > 0 && Math.floor(t * 10) % 2 === 0 ? .5 : 1; o.stato = 'calmo'; o.t = t; o.attivo = 0; o.carica = 0; o.furia = 0;
  o.vivo = true; o.stira = M.scatto.attivo > 0 ? 1.12 : 0; o.dettaglio = 1; o.stadio = h.stadio; o.espressione = h.espressione;
  if (vicinoEroe && vicinoEroe.mangiato <= 0) sguardoVerso(h, vicinoEroe.x, vicinoEroe.y, o.sguardo); else { o.sguardo.x = avanti.x; o.sguardo.y = avanti.y; }
  F.disegna(ctx, h.def, o);
  if (a.scudo) {
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
    const sp = e.def.speciale, chiuso = !e.mangiabile && h.p > e.p && (sp === 'corazza' || sp === 'veleno');
    etichetta(ex, ey, scritta(e.p), e.mangiabile ? VERDE : e.minaccia ? ROSSO : GRIGIO, px, chiuso ? (sp === 'corazza' ? 'scudo' : 'lucchetto') : null);
    if (e.avviso > 0) etichetta(ex, ey - px * 2, '!', ARANCIO, Math.round(px * 1.3));
    if (e.gigante && e.morsiTotali > 1) {                                   // i morsi che mancano al gigante
      const n = e.morsiTotali, passo = px * .95, x0 = ex - (n - 1) * passo / 2, yy = ey + px * 1.25;
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.arc(x0 + i * passo, yy, px * .32, 0, TAU);
        ctx.fillStyle = i < e.morsi ? '#ff5c7a' : 'rgba(8,20,48,.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  if (h.vivo) etichetta(ax(h.x), ay(h.y - h.r) - 20, scritta(h.p), BLU, Math.round(16 + h.pulsa * 4));
}

function disegnaFreccia(M, t) {
  const h = M.eroe, e = M.obiettivo;
  if (!h || !h.vivo || !e || e.via || B.partita.stato !== 'gioco' || visibile(e.x, e.y, -e.r * .3)) return;
  const vw = vista.vw, vh = vista.vh, a = Math.atan2(e.y - h.y, e.x - h.x), rr = Math.min(vw, vh) * .4, pronto = e.mangiabile, batte = pronto ? 1 + .15 * Math.sin(t * 8) : 1;
  ctx.save(); ctx.translate(vw / 2 + Math.cos(a) * rr, vh / 2 + Math.sin(a) * rr * Math.min(1.5, vh / vw)); ctx.rotate(a); ctx.scale(batte, batte);
  ctx.fillStyle = pronto ? 'rgba(124,242,154,.95)' : 'rgba(255,123,123,.8)'; ctx.strokeStyle = 'rgba(8,20,48,.6)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-3, 0); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(-a); corona(ctx, -Math.cos(a) * 24, -Math.sin(a) * 24 + 6, 7);
  ctx.restore();
}

function disegnaTesti(M) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(8,20,48,.85)';
  for (const s of M.testi) {
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
  tPrima = t;
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
  disegnaPredatori(M, t);
  disegnaColpi(M, t);
  disegnaEroe(M, t, dt);
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

B.disegno = { fotogramma, ridimensiona, compatto, corona, iconaBolla, tela, CARATTERE };
})();
