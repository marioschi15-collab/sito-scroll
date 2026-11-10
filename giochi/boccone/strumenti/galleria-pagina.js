/* Parte che gira nella pagina della galleria (vedi galleria.mjs). Disegna ogni modello in tutte le pose,
   misura costo e ingombro e lascia tutto in window.__rapporto. */
(() => {
'use strict';
const B = window.B, U = B.util, TAU = Math.PI * 2;
const P = window.__parametri || {};
const DPR = 2;
const RAGGI = B.cast.raggi;
const rapporto = { modelli: [], errori: [...(window.__erroriCaricamento || [])], riferimentoMs: 0 };

function tela(w, h) {
  const t = document.createElement('canvas');
  t.width = w * DPR; t.height = h * DPR; t.style.width = w + 'px'; t.style.height = h + 'px';
  const c = t.getContext('2d'); c.scale(DPR, DPR);
  return { t, c };
}
function azzera(c) {
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.setLineDash([]); c.lineDashOffset = 0; c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)'; c.filter = 'none';
}
const TONI = { chiaro: ['#5cbcec', '#1f6cb8'], medio: ['#2f86c8', '#12458a'], scuro: ['#1c2456', '#090c22'], verde: ['#3fb58c', '#0b4a44'], carta: ['#f4f6fb', '#dfe5f2'] };
function acqua(c, x, y, w, h, tono) {
  const g = c.createLinearGradient(0, y, 0, y + h), col = TONI[tono] || TONI.chiaro;
  g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  c.fillStyle = g; c.fillRect(x, y, w, h);
}
function scritta(c, testo, x, y, colore = 'rgba(255,255,255,.8)', px = 11) {
  c.font = '600 ' + px + 'px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = colore; c.fillText(testo, x, y);
}
function etichetta(c, x, y, testo, sfondo, px) {
  c.font = '900 ' + px + 'px system-ui, sans-serif';
  const w = c.measureText(testo).width + px * .9, hh = px * 1.45;
  c.beginPath(); c.roundRect(x - w / 2, y - hh / 2, w, hh, hh / 2);
  c.fillStyle = sfondo; c.fill(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1.5, px * .1); c.stroke();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(testo, x, y + px * .04);
}

/* Opzioni complete passate a disegna(): i modelli usano solo quelle che servono loro. */
function opzioni(extra) {
  return Object.assign({ fase: .15, t: 1.3, bocca: 0, minaccia: false, stadio: 0, stato: 'calmo', espressione: 'normale', sguardo: { x: 1, y: 0 }, attivo: 0, carica: 0, dettaglio: 1 }, extra || {});
}
const CALMO = e => opzioni(Object.assign({ fase: .15 }, e));
const CACCIA = e => opzioni(Object.assign({ fase: .4, bocca: .75, minaccia: true, stato: 'caccia', espressione: 'normale' }, e));

/* Disegna un modello e controlla che lasci la tela come l'ha trovata. */
function posa(c, def, cx, cy, r, o, ang = 0, specchia = false, problemi = null) {
  const SEGNO = 0.123;
  c.save(); c.translate(cx, cy); if (ang) c.rotate(ang); if (specchia) c.scale(1, -1); c.scale(r, r);
  c.lineDashOffset = SEGNO;
  let errore = null;
  try { def.disegna(c, o); } catch (e) { errore = e; }
  const troppiRestore = Math.abs(c.lineDashOffset - SEGNO) > 1e-6;
  const alfa = c.globalAlpha, fusione = c.globalCompositeOperation;
  c.restore();
  const saveAperto = Math.abs(c.lineDashOffset - SEGNO) < 1e-6;
  azzera(c);
  if (problemi) {
    if (errore) problemi.add('disegna() va in errore: ' + (errore && errore.message));
    if (troppiRestore) problemi.add('disegna() fa più restore() che save()');
    if (saveAperto) problemi.add('disegna() lascia un save() senza restore()');
    if (Math.abs(alfa - 1) > 1e-3) problemi.add('disegna() lascia globalAlpha diverso da 1');
    if (fusione !== 'source-over') problemi.add('disegna() lascia globalCompositeOperation cambiato');
  }
  return !errore;
}

function raggioAdatto(def, w, h, margine = 14) {
  const g = def.ingombro;
  return Math.min((w - margine * 2) / (g.x1 - g.x0), (h - margine * 2) / (g.y1 - g.y0));
}
/* Centra l'ingombro nel riquadro. */
function inRiquadro(c, def, x, y, w, h, o, problemi, fattore = 1) {
  const r = raggioAdatto(def, w, h) * fattore, g = def.ingombro;
  posa(c, def, x + w / 2 - (g.x0 + g.x1) / 2 * r, y + h / 2 - (g.y0 + g.y1) / 2 * r, r, o, 0, false, problemi);
  return r;
}

// ------------------------------------------------------------ misure
function pesceDiRiferimento(c) {   // la complessità di un pesce semplice: serve da unità di misura del costo
  c.save();
  c.fillStyle = '#3f9b4a'; c.beginPath(); c.moveTo(-1, 0); c.lineTo(-1.8, -.8); c.quadraticCurveTo(-1.5, 0, -1.8, .8); c.closePath(); c.fill();
  const g = c.createLinearGradient(0, -.8, 0, .8); g.addColorStop(0, '#6fcf5f'); g.addColorStop(1, '#e2f9b5');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 1.2, .8, 0, 0, TAU); c.fill(); c.strokeStyle = '#256b33'; c.lineWidth = .05; c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(.7, -.2, .22, 0, TAU); c.fill();
  c.fillStyle = '#18233f'; c.beginPath(); c.arc(.76, -.2, .11, 0, TAU); c.fill();
  c.restore();
}
const banco = document.createElement('canvas'); banco.width = banco.height = 720;
const cb = banco.getContext('2d', { willReadFrequently: true });
function cronometra(fn) {
  const c = cb; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 720, 720);
  const giro = n => { for (let i = 0; i < n; i++) { c.setTransform(40, 0, 0, 40, 360, 360); fn(c, i); } };
  giro(12);
  let migliore = Infinity;
  for (let k = 0; k < 4; k++) { const t0 = performance.now(); giro(40); c.getImageData(0, 0, 1, 1); migliore = Math.min(migliore, (performance.now() - t0) / 40); }
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  return migliore;
}
function misuraIngombro(def, pose) {
  const R = 36, c = cb; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const o of pose) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 720, 720);
    c.save(); c.setTransform(R, 0, 0, R, 360, 360);
    try { def.disegna(c, o); } catch (e) { /* già segnalato altrove */ }
    c.restore(); c.setTransform(1, 0, 0, 1, 0, 0);
    const d = c.getImageData(0, 0, 720, 720).data;
    for (let y = 0; y < 720; y++) for (let x = 0; x < 720; x++) if (d[(y * 720 + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x0 === Infinity) return null;
  const u = v => Math.round((v - 360) / R * 100) / 100;
  return { x0: u(x0), y0: u(y0), x1: u(x1 + 1), y1: u(y1 + 1) };
}

// ------------------------------------------------------------ pose per tipo
function tutteLePose(def, tipo) {
  const pose = [];
  if (tipo === 'eroe') {
    for (let s = 0; s < (def.stadi || 3); s++) for (const esp of ['normale', 'felice', 'spaventato', 'colpito']) for (const f of [0, .25, .5, .75]) pose.push(opzioni({ stadio: s, espressione: esp, fase: f, t: f * 2, bocca: esp === 'felice' ? 1 : 0 }));
  } else if (tipo === 'gigante') {
    for (const stato of ['calmo', 'caccia', 'avviso', 'carica', 'stordito', 'sconfitto']) for (const f of [0, .25, .5, .75]) pose.push(opzioni({ stato, fase: f, t: f * 3, bocca: stato === 'calmo' ? 0 : 1, minaccia: stato !== 'calmo', carica: stato === 'avviso' ? .8 : stato === 'carica' ? 1 : 0 }));
  } else if (tipo === 'pericolo') {
    for (const attivo of [0, .5, 1]) for (const f of [0, .25, .5, .75]) pose.push(opzioni({ attivo, fase: f, t: f * 2 }));
  } else {
    for (let i = 0; i < 8; i++) { pose.push(opzioni({ fase: i / 8 })); pose.push(opzioni({ fase: i / 8, bocca: 1, minaccia: true })); }
  }
  return pose;
}

function raggiDiGioco(def, tipo) {
  if (tipo === 'gigante') return [.55, .42, .33].map(z => B.cast.raggioGigante * z);
  if (tipo === 'eroe') return [22, 26, 31, 35, 40];
  if (tipo === 'pericolo') return [26, 20, 14];
  if (tipo === 'banco') return [];
  return [1, .75, .55, .42].map(z => RAGGI[(def.taglia || 1) - 1] * z);
}

// ------------------------------------------------------------ scheda di un modello
function scheda(def, tipo) {
  const problemi = new Set();
  const W = 1400, H1 = 300, H2 = 150, H3 = 140, H = H1 + H2 + H3;
  const { t, c } = tela(W, H);
  const g = def.ingombro;

  // --- Riga 1: primi piani
  if (tipo === 'eroe') {
    const toni = ['chiaro', 'medio', 'scuro'];
    for (let s = 0; s < 3; s++) { acqua(c, s * 290, 0, 290, H1, toni[s]); inRiquadro(c, def, s * 290, 0, 290, H1, opzioni({ stadio: s, fase: .1 + s * .2 }), problemi); scritta(c, 'stadio ' + s, s * 290 + 8, 6); }
  } else if (tipo === 'pericolo') {
    acqua(c, 0, 0, 350, H1, 'chiaro'); inRiquadro(c, def, 0, 0, 350, H1, opzioni({ attivo: 0, t: 0 }), problemi); scritta(c, 'a riposo', 8, 6);
    acqua(c, 350, 0, 350, H1, 'scuro'); inRiquadro(c, def, 350, 0, 350, H1, opzioni({ attivo: 1, t: .6, fase: .6 }), problemi); scritta(c, 'attivo', 358, 6);
  } else if (tipo === 'gigante') {
    acqua(c, 0, 0, 440, H1, 'medio'); inRiquadro(c, def, 0, 0, 440, H1, CALMO(), problemi); scritta(c, 'calmo', 8, 6);
    acqua(c, 440, 0, 440, H1, 'scuro'); inRiquadro(c, def, 440, 0, 440, H1, CACCIA({ bocca: .9 }), problemi); scritta(c, 'a caccia', 448, 6);
  } else {
    acqua(c, 0, 0, 350, H1, 'chiaro'); inRiquadro(c, def, 0, 0, 350, H1, CALMO(), problemi); scritta(c, 'calmo', 8, 6);
    acqua(c, 350, 0, 350, H1, 'scuro'); inRiquadro(c, def, 350, 0, 350, H1, CACCIA(), problemi); scritta(c, 'a caccia (minaccia, bocca aperta)', 358, 6);
  }
  // Riquadro tecnico: ingombro dichiarato (blu), raggio di contatto 1 (rosso), forma (verde)
  const xt = tipo === 'eroe' || tipo === 'gigante' ? 880 : 700, wt = 230;
  acqua(c, xt, 0, wt, H1, 'carta');
  const rt = raggioAdatto(def, wt, H1, 22), cx = xt + wt / 2 - (g.x0 + g.x1) / 2 * rt, cy = H1 / 2 - (g.y0 + g.y1) / 2 * rt;
  posa(c, def, cx, cy, rt, opzioni({ stadio: 1 }), 0, false, problemi);
  c.lineWidth = 1.2; c.setLineDash([5, 4]); c.strokeStyle = '#2b62d9'; c.strokeRect(cx + g.x0 * rt, cy + g.y0 * rt, (g.x1 - g.x0) * rt, (g.y1 - g.y0) * rt);
  c.setLineDash([]); c.strokeStyle = '#e0304a'; c.beginPath(); c.arc(cx, cy, rt, 0, TAU); c.stroke();
  if (def.forma) { c.strokeStyle = '#1e9c55'; c.beginPath(); c.ellipse(cx, cy, def.forma.lx * rt, def.forma.ly * rt, 0, 0, TAU); c.stroke(); }
  c.strokeStyle = '#333'; c.beginPath(); c.moveTo(cx - 5, cy); c.lineTo(cx + 5, cy); c.moveTo(cx, cy - 5); c.lineTo(cx, cy + 5); c.stroke();
  scritta(c, 'blu: ingombro · rosso: raggio 1 · verde: forma', xt + 6, 6, '#334', 10);
  // Girato e specchiato come nel gioco
  const xd = xt + wt, wd = W - xd;
  acqua(c, xd, 0, wd, H1, 'verde');
  const rd = raggioAdatto(def, wd / 2 - 10, H1 / 2 - 10, 10) * .9, dritto = def.assetto === 'dritto';
  const o1 = tipo === 'eroe' ? opzioni({ stadio: 1 }) : CALMO({ fase: .6 });
  if (dritto) {
    posa(c, def, xd + wd * .28, H1 * .3, rd, o1, 0, false, problemi);
    c.save(); c.translate(xd + wd * .72, H1 * .3); c.scale(-1, 1); c.translate(-(xd + wd * .72), -H1 * .3); posa(c, def, xd + wd * .72, H1 * .3, rd, o1, 0, false, problemi); c.restore(); azzera(c);
    scritta(c, 'assetto dritto: nel gioco non ruota, si specchia soltanto', xd + 8, 6);
  } else {
    posa(c, def, xd + wd * .27, H1 * .27, rd, o1, Math.PI, true, problemi);
    posa(c, def, xd + wd * .75, H1 * .27, rd, o1, -.6, false, problemi);
    posa(c, def, xd + wd * .27, H1 * .75, rd, o1, Math.PI + .55, true, problemi);
    posa(c, def, xd + wd * .75, H1 * .75, rd, o1, 1.2, false, problemi);
    scritta(c, 'verso sinistra (specchiato) e in diagonale, come nel gioco', xd + 8, 6);
  }

  // --- Riga 2: il ciclo di nuoto e le altre pose
  const y2 = H1, n = 8, wc = W / n;
  for (let i = 0; i < n; i++) {
    let o, nota, tono = i < 4 ? 'chiaro' : 'medio';
    if (tipo === 'eroe') {
      const lista = [['normale', 0, 0], ['normale', 0, .5], ['felice', 1, .3], ['felice', 1, 1], ['spaventato', 1, 0], ['colpito', 1, 0], ['normale', 2, 1], ['spaventato', 0, 0]][i];
      o = opzioni({ espressione: lista[0], stadio: lista[1], bocca: lista[2], fase: i / n, t: i * .37 }); nota = lista[0] + ' · stadio ' + lista[1] + (lista[2] ? ' · bocca ' + lista[2] : '');
    } else if (tipo === 'gigante') {
      const lista = [['calmo', 0, 0], ['caccia', .5, 0], ['avviso', .3, .35], ['avviso', .6, .9], ['carica', 1, 1], ['stordito', .2, 0], ['sconfitto', .3, 0], ['caccia', 1, 0]][i];
      o = opzioni({ stato: lista[0], bocca: lista[1], carica: lista[2], minaccia: lista[0] !== 'calmo', fase: i / n, t: i * .41 }); nota = lista[0] + (lista[2] ? ' ' + lista[2] : ''); tono = 'scuro';
    } else if (tipo === 'pericolo') {
      o = opzioni({ attivo: i / (n - 1), fase: i / n, t: i * .3 }); nota = 'attivo ' + (i / (n - 1)).toFixed(2);
    } else if (i < 4) { o = opzioni({ fase: i / 4 }); nota = 'fase ' + (i / 4).toFixed(2); }
    else { o = opzioni({ fase: (i - 4) / 4 + .125, bocca: [.25, .5, .8, 1][i - 4], minaccia: true }); nota = 'caccia · bocca ' + [.25, .5, .8, 1][i - 4]; }
    acqua(c, i * wc, y2, wc, H2, tono);
    inRiquadro(c, def, i * wc, y2 + 8, wc, H2 - 8, o, problemi);
    scritta(c, nota, i * wc + 6, y2 + 4, 'rgba(255,255,255,.75)', 10);
  }

  // --- Riga 3: come si vede davvero nel gioco (in pixel di telefono)
  const y3 = H1 + H2;
  acqua(c, 0, y3, W / 2, H3, 'medio'); acqua(c, W / 2, y3, W / 2, H3, 'scuro');
  scritta(c, 'grandezze reali nel gioco', 8, y3 + 4);
  if (tipo === 'banco') {
    for (let lato = 0; lato < 2; lato++) for (let i = 0; i < 70; i++) {
      const r = lato ? 12 : 9, x = (lato ? W / 2 : 0) + 40 + U.rumore(i, 1 + lato) * (W / 2 - 80), y = y3 + 22 + U.rumore(i, 3 + lato) * (H3 - 40), ang = U.rumore(i, 5) * TAU;
      posa(c, def, x, y, r, opzioni({ fase: U.rumore(i, 9) }), ang, Math.cos(ang) < 0, problemi);
    }
  } else {
    const raggi = raggiDiGioco(def, tipo);
    for (let lato = 0; lato < 2; lato++) {
      let x = (lato ? W / 2 : 0) + 30;
      raggi.forEach((r, i) => {
        const largo = (g.x1 - g.x0) * r, xc = x - g.x0 * r, yc = y3 + H3 * .6;
        const o = tipo === 'eroe' ? opzioni({ stadio: Math.min(2, Math.floor(i / 2)), fase: i * .2 }) : tipo === 'pericolo' ? opzioni({ attivo: lato, t: i }) : lato ? CACCIA({ fase: i * .2 }) : CALMO({ fase: i * .2 });
        if (x + largo < (lato ? W : W / 2) - 10) {
          posa(c, def, xc, yc, r, o, 0, false, problemi);
          if (tipo !== 'pericolo') {
            const px = Math.max(12, Math.min(30, r * .42));
            etichetta(c, xc, yc - (def.forma ? def.forma.ly : 1) * r - px * 1.5, tipo === 'eroe' ? '128' : '1.250', tipo === 'eroe' ? 'rgba(12,40,90,.92)' : lato ? 'rgba(214,40,70,.94)' : 'rgba(26,160,90,.94)', px);
          }
        }
        x += largo + 26;
      });
    }
  }

  // --- Misure
  const pose = tutteLePose(def, tipo);
  const misurato = misuraIngombro(def, pose);
  const oCalmo = tipo === 'eroe' ? opzioni({ stadio: 2 }) : CALMO(), oCaccia = tipo === 'eroe' ? opzioni({ stadio: 2, bocca: 1, espressione: 'felice' }) : CACCIA();
  const costo = { calmo: cronometra((cc, i) => def.disegna(cc, Object.assign({}, oCalmo, { fase: (i % 8) / 8 }))) / rapporto.riferimentoMs, caccia: cronometra((cc, i) => def.disegna(cc, Object.assign({}, oCaccia, { fase: (i % 8) / 8 }))) / rapporto.riferimentoMs };
  if (!misurato) problemi.add('il modello non disegna nulla');
  else {
    const fuori = Math.max(g.x0 - misurato.x0, misurato.x1 - g.x1, g.y0 - misurato.y0, misurato.y1 - g.y1);
    if (fuori > .04) problemi.add('esce dall\'ingombro dichiarato di ' + fuori.toFixed(2) + ' unità: ingombro misurato ' + JSON.stringify(misurato));
    const areaD = (g.x1 - g.x0) * (g.y1 - g.y0), areaM = (misurato.x1 - misurato.x0) * (misurato.y1 - misurato.y0);
    if (areaD > areaM * 1.7) problemi.add('ingombro dichiarato troppo largo (spreca memoria): quello misurato è ' + JSON.stringify(misurato));
  }
  const tetto = { pesce: 40, banco: 4, eroe: 45, gigante: 70, pericolo: 40 }[tipo];
  if (Math.max(costo.calmo, costo.caccia) > tetto) problemi.add('disegno troppo costoso: ×' + Math.max(costo.calmo, costo.caccia).toFixed(1) + ' (tetto per ' + tipo + ': ×' + tetto + ')');
  if (!def.descrizione && tipo !== 'pericolo' && tipo !== 'banco') problemi.add('manca la descrizione per l\'acquario');
  // Controllo di ripetibilità: la stessa posa deve dare lo stesso disegno (niente Math.random nei modelli)
  const impronta = () => { cb.setTransform(1, 0, 0, 1, 0, 0); cb.clearRect(0, 0, 720, 720); cb.save(); cb.setTransform(30, 0, 0, 30, 360, 360); try { def.disegna(cb, oCalmo); } catch (e) {} cb.restore(); const d = cb.getImageData(200, 200, 320, 320).data; let s = 0; for (let i = 0; i < d.length; i += 97) s = (s * 31 + d[i]) >>> 0; return s; };
  if (impronta() !== impronta()) problemi.add('il disegno cambia da una chiamata all\'altra (usa Math.random o stato interno?)');

  const voce = { id: def.id, tipo, nome: def.nome, taglia: def.taglia || null, costo, misurato, dichiarato: g, avvisi: [...problemi] };
  rapporto.modelli.push(voce);

  const box = document.createElement('div'); box.className = 'scheda'; box.id = 'scheda-' + def.id;
  const h = document.createElement('h3'); h.textContent = def.nome + '  (' + def.id + ')';
  const p = document.createElement('p');
  p.textContent = [tipo, def.taglia ? 'taglia ' + def.taglia : '', def.indole || '', def.speciale || '', def.assetto === 'dritto' ? 'assetto dritto' : '', 'costo ×' + costo.calmo.toFixed(1) + ' calmo, ×' + costo.caccia.toFixed(1) + ' a caccia'].filter(Boolean).join(' · ');
  box.append(h, p);
  for (const a of problemi) { const m = document.createElement('p'); m.className = 'male'; m.textContent = '✗ ' + a; box.append(m); }
  box.append(t);
  document.body.append(box);

  // --- Primo piano grande
  const big = tela(W, 620), gb = document.createElement('div'); gb.className = 'grande'; gb.id = 'grande-' + def.id;
  const sin = tipo === 'eroe' ? opzioni({ stadio: 0 }) : tipo === 'pericolo' ? opzioni({ attivo: 0 }) : CALMO();
  const des = tipo === 'eroe' ? opzioni({ stadio: 2, bocca: .6, espressione: 'felice' }) : tipo === 'pericolo' ? opzioni({ attivo: 1, t: .7 }) : CACCIA({ bocca: 1 });
  acqua(big.c, 0, 0, W / 2, 620, 'chiaro'); inRiquadro(big.c, def, 0, 0, W / 2, 620, sin, null);
  acqua(big.c, W / 2, 0, W / 2, 620, 'scuro'); inRiquadro(big.c, def, W / 2, 0, W / 2, 620, des, null);
  const hg = document.createElement('h3'); hg.textContent = def.nome + ' — primo piano';
  gb.append(hg, big.t); document.body.append(gb);
}

// ------------------------------------------------------------ foglio d'insieme
function foglio(voci) {
  const col = 7, cw = 200, ch = 150, righe = Math.ceil(voci.length / col);
  const { t, c } = tela(col * cw, righe * ch + 190);
  voci.forEach(([def, tipo], i) => {
    const x = (i % col) * cw, y = Math.floor(i / col) * ch, buio = (def.ambienti || []).length === 1 && (def.ambienti[0] === 'abisso' || def.ambienti[0] === 'vulcano');
    acqua(c, x, y, cw, ch, buio ? 'scuro' : (i + Math.floor(i / col)) % 2 ? 'medio' : 'chiaro');
    inRiquadro(c, def, x, y + 4, cw, ch - 22, tipo === 'eroe' ? opzioni({ stadio: 1 }) : CALMO({ fase: (i % 5) / 5 }), null);
    scritta(c, def.nome + (def.taglia ? ' · T' + def.taglia : tipo !== 'pesce' ? ' · ' + tipo : ''), x + 6, y + ch - 16, '#fff', 11);
  });
  // Tutti in scala tra loro, come nel gioco
  const y0 = righe * ch; acqua(c, 0, y0, col * cw, 190, 'medio'); scritta(c, 'in scala tra loro (taglie 1-5)', 8, y0 + 6);
  let x = 20;
  for (const [def, tipo] of voci.filter(v => v[1] === 'pesce').sort((a, b) => a[0].taglia - b[0].taglia)) {
    const r = RAGGI[def.taglia - 1] * .5, largo = (def.ingombro.x1 - def.ingombro.x0) * r;
    if (x + largo > col * cw - 10) break;
    posa(c, def, x - def.ingombro.x0 * r, y0 + 110, r, CALMO(), 0, false, null); x += largo + 8;
  }
  t.id = 'foglio'; document.body.append(t);
}

// ------------------------------------------------------------ via
try {
  rapporto.riferimentoMs = Math.max(1e-4, cronometra(pesceDiRiferimento));
  const ordineTipo = { eroe: 0, pesce: 1, gigante: 2, banco: 3, pericolo: 4 };
  let voci = [...B.eroi.tutte().map(d => [d, 'eroe']), ...B.specie.tutte().map(d => [d, d.tipo])];
  if (P.solo) voci = voci.filter(v => P.solo.includes(v[0].id));
  voci.sort((a, b) => (ordineTipo[a[1]] - ordineTipo[b[1]]) || ((a[0].taglia || 0) - (b[0].taglia || 0)) || (a[0].id < b[0].id ? -1 : 1));
  for (const [def, tipo] of voci) {
    try { scheda(def, tipo); } catch (e) { rapporto.errori.push(def.id + ': ' + e.message); }
  }
  if (voci.length) foglio(voci);
  if (!voci.length) rapporto.errori.push('Nessun modello registrato' + (P.solo ? ' tra ' + P.solo.join(', ') : ''));
} catch (e) { rapporto.errori.push('galleria: ' + e.message); }
rapporto.errori.push(...(window.__erroriCaricamento || []).filter(e => !rapporto.errori.includes(e)));
window.__rapporto = rapporto; window.__pronto = true;
})();
