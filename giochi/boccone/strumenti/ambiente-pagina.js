/* Parte che gira nella pagina di anteprima degli ambienti (vedi ambiente.mjs).
   Chiama le passate nello stesso ordine e con le stesse trasformazioni del gioco. */
(() => {
'use strict';
const B = window.B, U = B.util, TAU = Math.PI * 2, P = window.__parametri || {};
const DPR = 2, VW = 390, VH = 844;
const rapporto = { ambienti: [], errori: [...(window.__erroriCaricamento || [])], riferimentoMs: 0 };

function vista(def, cam, t, qualita) {
  const m = def.mondo, mw = VW / 2 / cam.z, mh = VH / 2 / cam.z;
  return { t, dt: 1 / 60, vw: VW, vh: VH, dpr: DPR, cam, mondo: { w: m.w, h: m.h }, qualita,
    visibile: (x, y, margine = 0) => x > cam.x - mw - margine && x < cam.x + mw + margine && y > cam.y - mh - margine && y < cam.y + mh + margine };
}
function schermo(c) { c.setTransform(DPR, 0, 0, DPR, 0, 0); }
function mondo(c, v) { c.setTransform(v.cam.z * DPR, 0, 0, v.cam.z * DPR, (VW / 2 - v.cam.x * v.cam.z) * DPR, (VH / 2 - v.cam.y * v.cam.z) * DPR); }
function pulito(c) { c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.setLineDash([]); c.shadowBlur = 0; c.filter = 'none'; }

/* Esegue una passata controllando che lasci la tela come l'ha trovata. */
function passata(c, nome, def, v, scena, problemi) {
  const SEGNO = 0.321;
  c.save(); c.lineDashOffset = SEGNO;
  let errore = null;
  try { def[nome](c, v, scena); } catch (e) { errore = e; }
  const troppi = Math.abs(c.lineDashOffset - SEGNO) > 1e-6, alfa = c.globalAlpha, fus = c.globalCompositeOperation;
  c.restore();
  const aperto = Math.abs(c.lineDashOffset - SEGNO) < 1e-6;
  c.lineDashOffset = 0; pulito(c);
  if (problemi) {
    if (errore) problemi.add(nome + '() va in errore: ' + errore.message);
    if (troppi) problemi.add(nome + '() fa più restore() che save()');
    if (aperto) problemi.add(nome + '() lascia un save() senza restore()');
    if (Math.abs(alfa - 1) > 1e-3) problemi.add(nome + '() lascia globalAlpha diverso da 1');
    if (fus !== 'source-over') problemi.add(nome + '() lascia globalCompositeOperation cambiato');
  }
}

function etichetta(c, x, y, testo, sfondo, px) {
  c.font = '900 ' + px + 'px system-ui, sans-serif';
  const w = c.measureText(testo).width + px * .9, hh = px * 1.45;
  c.beginPath(); c.roundRect(x - w / 2, y - hh / 2, w, hh, hh / 2);
  c.fillStyle = sfondo; c.fill(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1.5, px * .1); c.stroke();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(testo, x, y + px * .04);
}

/* Qualche abitante di prova, per giudicare se le creature si leggono bene sullo sfondo. */
function comparse(def) {
  const pesci = B.specie.diTipo('pesce'), miei = pesci.filter(s => s.ambienti.includes(def.id));
  const lista = (miei.length ? miei : pesci).slice().sort((a, b) => a.taglia - b.taglia);
  const scelti = []; for (let i = 0; i < Math.min(4, lista.length); i++) scelti.push(lista[Math.floor(i * (lista.length - 1) / Math.max(1, Math.min(4, lista.length) - 1))]);
  const banco = B.specie.diTipo('banco').find(s => def.banchi.includes(s.id)) || B.specie.diTipo('banco')[0] || null;
  const eroe = B.eroi.tutte()[0] || null;
  return { scelti, banco, eroe };
}
function disegnaComparse(c, v, comp) {
  const R = B.cast.raggi, cam = v.cam, posti = [[-150, -230], [120, -120], [-110, 170], [140, 260]];
  const metti = (d, x, y, r, o, ang, specchia) => { c.save(); c.translate(x, y); c.rotate(ang); if (specchia) c.scale(1, -1); c.scale(r, r); try { d.disegna(c, o); } catch (e) {} c.restore(); pulito(c); };
  const base = { fase: .2, t: v.t, bocca: 0, minaccia: false, stadio: 0, stato: 'calmo', espressione: 'normale', sguardo: { x: 1, y: 0 }, attivo: 0, carica: 0, dettaglio: 1 };
  if (comp.banco) for (let i = 0; i < 46; i++) { const a = U.rumore(i, 2) * TAU, d = Math.sqrt(U.rumore(i, 4)) * 120, ang = U.rumore(i, 6) * 1.2 - .6; metti(comp.banco, cam.x + 40 + Math.cos(a) * d, cam.y + 40 + Math.sin(a) * d * .7, 9, Object.assign({}, base, { fase: U.rumore(i, 8) }), ang, false); }
  comp.scelti.forEach((d, i) => {
    const r = R[d.taglia - 1], x = cam.x + posti[i][0] / cam.z, y = cam.y + posti[i][1] / cam.z, sinistra = i % 2 === 1, dritto = d.assetto === 'dritto';
    metti(d, x, y, r, Object.assign({}, base, i === 3 ? { minaccia: true, bocca: .6 } : {}), dritto ? 0 : sinistra ? Math.PI : 0, !dritto && sinistra);
  });
  if (comp.eroe) metti(comp.eroe, cam.x, cam.y + 20 / cam.z, 30, base, 0, false);
  // etichette in misure di schermo, come nel gioco
  const z = cam.z; c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  comp.scelti.forEach((d, i) => { const r = R[d.taglia - 1], px = Math.max(12, Math.min(30, r * z * .42)); etichetta(c, VW / 2 + posti[i][0], VH / 2 + posti[i][1] - d.forma.ly * r * z - px * 1.5, String(40 * (i + 1) * (i + 1)), i === 3 ? 'rgba(214,40,70,.94)' : 'rgba(26,160,90,.94)', px); });
  if (comp.eroe) etichetta(c, VW / 2, VH / 2 + 20 - 30 * z - 20, '128', 'rgba(12,40,90,.92)', 16);
  c.restore();
}

function fotogramma(c, def, v, scena, comp, problemi) {
  schermo(c); pulito(c); c.clearRect(0, 0, VW, VH);
  passata(c, 'sfondo', def, v, scena, problemi);
  mondo(c, v); passata(c, 'dietro', def, v, scena, problemi);
  mondo(c, v); if (comp) disegnaComparse(c, v, comp);
  mondo(c, v); passata(c, 'davanti', def, v, scena, problemi);
  schermo(c); passata(c, 'velo', def, v, scena, problemi);
  schermo(c);
}

let telaMisura = null;
function cronometra(fn, giri = 24) { fn(); fn(); const t0 = performance.now(); for (let i = 0; i < giri; i++) { fn(i); if (telaMisura) telaMisura.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / giri; }

function anteprima(def) {
  const problemi = new Set(), m = def.mondo;
  const t0 = performance.now();
  let scena = null;
  try { scena = def.crea({ w: m.w, h: m.h }, U.semi(12345)); } catch (e) { problemi.add('crea() va in errore: ' + e.message); }
  const creaMs = performance.now() - t0;
  if (creaMs > 1500) problemi.add('crea() impiega ' + creaMs.toFixed(0) + ' ms: troppo (tetto 1500 ms qui)');
  const viste = [
    ['centro', { x: m.w / 2, y: m.h / 2, z: 1 }, 2], ['superficie', { x: m.w / 2, y: 270, z: 1 }, 2], ['fondale', { x: m.w / 2, y: m.h - 250, z: 1 }, 2],
    ['angolo', { x: 230, y: m.h - 300, z: .8 }, 2], ['largo', { x: m.w * .35, y: m.h * .6, z: .5 }, 2], ['economico', { x: m.w / 2, y: m.h - 250, z: 1 }, 0],
  ];
  const comp = comparse(def);
  const fila = document.createElement('div'); fila.className = 'fila'; fila.id = 'fila-' + def.id;
  const tele = [];
  for (const [nome, cam, qualita] of viste) {
    const t = document.createElement('canvas'); t.width = VW * DPR; t.height = VH * DPR; t.style.width = VW + 'px'; t.style.height = VH + 'px';
    const c = t.getContext('2d'), v = vista(def, cam, 3.7, qualita);
    fotogramma(c, def, v, scena, comp, problemi);
    const box = document.createElement('div'); box.className = 'vista'; box.id = 'vista-' + def.id + '-' + nome;
    const s = document.createElement('span'); s.textContent = nome + (qualita === 0 ? ' (qualità bassa)' : '') + ' · z ' + cam.z;
    box.append(t, s); fila.append(box); tele.push([c, cam, qualita]);
  }
  // Costi, misurati sulla vista "fondale" (di solito la più carica), in unità di riempimento a tutto schermo
  const scratch = document.createElement('canvas'); scratch.width = VW * DPR; scratch.height = VH * DPR; const cs = scratch.getContext('2d'); telaMisura = cs;
  const camF = { x: m.w / 2, y: m.h - 250, z: 1 };
  const costoDi = (nome, qualita) => cronometra(i => { const v = vista(def, camF, 3.7 + (i || 0) / 60, qualita); if (nome === 'dietro' || nome === 'davanti') mondo(cs, v); else schermo(cs); passata(cs, nome, def, v, scena, null); }) / rapporto.riferimentoMs;
  const costo = { sfondo: costoDi('sfondo', 2), dietro: costoDi('dietro', 2), davanti: costoDi('davanti', 2), velo: costoDi('velo', 2) };
  costo.totale = costo.sfondo + costo.dietro + costo.davanti + costo.velo;
  costo.economico = costoDi('sfondo', 0) + costoDi('dietro', 0) + costoDi('davanti', 0) + costoDi('velo', 0);
  if (costo.totale > 16) problemi.add('troppo costoso per fotogramma: ×' + costo.totale.toFixed(1) + ' (tetto ×16). Pre-disegna in crea() su tele fuori schermo.');
  if (costo.economico > 7) problemi.add('con qualità bassa (v.qualita === 0) costa ancora ×' + costo.economico.toFixed(1) + ' (tetto ×7)');
  // Lo sfondo deve coprire tutto lo schermo
  const prova = document.createElement('canvas'); prova.width = VW; prova.height = VH; const cp = prova.getContext('2d', { willReadFrequently: true });
  try { cp.setTransform(1, 0, 0, 1, 0, 0); def.sfondo(cp, Object.assign(vista(def, { x: m.w / 2, y: m.h / 2, z: 1 }, 1, 2), { dpr: 1 }), scena); } catch (e) {}
  const d = cp.getImageData(0, 0, VW, VH).data; let buchi = 0; for (let i = 3; i < d.length; i += 4 * 37) if (d[i] < 250) buchi++;
  if (buchi > 3) problemi.add('sfondo() non copre tutto lo schermo con colore pieno');

  const h = document.createElement('h3'); h.textContent = def.nome + ' (' + def.id + ') — mondo ' + m.w + '×' + m.h;
  document.body.append(h);
  for (const a of problemi) { const p = document.createElement('p'); p.className = 'male'; p.textContent = '✗ ' + a; document.body.append(p); }
  document.body.append(fila);
  rapporto.ambienti.push({ id: def.id, nome: def.nome, viste: viste.map(v => v[0]), costo, creaMs, avvisi: [...problemi] });
}

try {
  const s = document.createElement('canvas'); s.width = VW * DPR; s.height = VH * DPR; const c = s.getContext('2d');
  rapporto.riferimentoMs = Math.max(.002, cronometra(() => { const g = c.createLinearGradient(0, 0, 0, VH * DPR); g.addColorStop(0, '#3fa0dc'); g.addColorStop(1, '#0b2a5c'); c.fillStyle = g; c.fillRect(0, 0, VW * DPR, VH * DPR); c.getImageData(0, 0, 1, 1); }, 40)); telaMisura = null;
  let lista = B.ambienti.inOrdine();
  if (P.solo) lista = lista.filter(a => P.solo.includes(a.id));
  if (!lista.length) rapporto.errori.push('Nessun ambiente registrato' + (P.solo ? ' tra ' + P.solo.join(', ') : ''));
  for (const def of lista) { try { anteprima(def); } catch (e) { rapporto.errori.push(def.id + ': ' + e.message); } }
} catch (e) { rapporto.errori.push('anteprima: ' + e.message); }
rapporto.errori.push(...(window.__erroriCaricamento || []).filter(e => !rapporto.errori.includes(e)));
window.__rapporto = rapporto; window.__pronto = true;
})();
