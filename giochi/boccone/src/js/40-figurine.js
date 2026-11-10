/* Boccone — le figurine (B.figurine): disegna un modello nel mondo rispettando assetto e specchiatura.
   I pesci normali e i pericoli vengono pre-disegnati in "figurine" (tele fuori schermo): per ogni specie e per ogni
   risoluzione (a scatti di circa √2) alcuni fotogrammi del nuoto per due stati (calmo; a caccia, con la bocca che si
   apre e si chiude lungo il ciclo). Si preparano poche per fotogramma, con un tetto di tempo e uno di memoria; finché
   una figurina non è pronta il modello si disegna dal vivo. I pesciolini dei banchi hanno un atlante in 16 direzioni.
   Eroi, giganti e capobranco si disegnano sempre dal vivo. */
(() => {
'use strict';
const B = window.B, U = B.util, TAU = Math.PI * 2;

const TETTO_PIXEL = 24e6;        // memoria totale delle figurine, in pixel
const TETTO_CELLA = 280e3;       // una figurina più grande di così si riduce di uno scatto; oltre, si disegna dal vivo
const MARGINE = 2;               // pixel vuoti attorno a ogni figurina
const STATI_PESCE = 2, STATI_PERICOLO = 3, DIREZIONI = 16, PASSI_BANCO = 4;
const VECCHIO = 90;              // fotogrammi senza essere usato dopo i quali un atlante si può buttare

const atlanti = new Map();       // 'id:livello' → atlante
const daFare = [];               // atlanti ancora da finire
let fotogramma = 0, scala = 2, pixel = 0, errori = 0;
const opz = { fase: 0, bocca: 0, minaccia: false, attivo: 0, t: 0, dettaglio: 1, stato: 'calmo' };

const livelloDi = px => Math.round(Math.log2(Math.max(3, px)) * 2);
const scalaDi = livello => Math.pow(2, livello / 2);

function butta(a) {
  atlanti.delete(a.chiave);
  if (a.tela) { pixel -= a.pixel; a.tela.width = 1; a.tela.height = 1; a.tela = null; a.c = null; }
  a.buttato = true;
}
/* Fa posto per "servono" pixel buttando gli atlanti che nessuno usa da un po', dal più vecchio. */
function faiPosto(servono) {
  if (pixel + servono <= TETTO_PIXEL) return true;
  const vecchi = [...atlanti.values()].filter(a => a.tela && fotogramma - a.uso > VECCHIO).sort((x, y) => x.uso - y.uso);
  for (const a of vecchi) { butta(a); if (pixel + servono <= TETTO_PIXEL) return true; }
  return false;
}

// ---------------------------------------------------------------- pesci e pericoli
function nuovoAtlante(def, livello, chiave) {
  const s = scalaDi(livello), g = def.ingombro;
  const cw = Math.ceil((g.x1 - g.x0) * s) + MARGINE * 2, ch = Math.ceil((g.y1 - g.y0) * s) + MARGINE * 2;
  const n = Math.max(1, def.fotogrammi || 8), stati = def.tipo === 'pericolo' ? STATI_PERICOLO : STATI_PESCE;
  return { chiave, def, livello, s, cw, ch, n, stati, ox: -g.x0 * s + MARGINE, oy: -g.y0 * s + MARGINE,
    tela: null, c: null, fatte: 0, totale: n * stati, pronto: false, uso: fotogramma, pixel: cw * n * ch * stati, buttato: false };
}
function preparaCella(a) {
  if (!a.tela) {
    if (!faiPosto(a.pixel)) return false;
    a.tela = U.tela(a.cw * a.n, a.ch * a.stati); a.c = a.tela.getContext('2d'); pixel += a.pixel;
  }
  const i = a.fatte % a.n, st = Math.floor(a.fatte / a.n), c = a.c;
  opz.fase = i / a.n; opz.t = 0; opz.dettaglio = Math.min(1, a.s / 40); opz.stato = 'calmo';
  if (a.def.tipo === 'pericolo') { opz.attivo = st / (a.stati - 1); opz.bocca = 0; opz.minaccia = false; }
  else { opz.attivo = 0; opz.minaccia = st === 1; opz.bocca = st === 1 ? 0.55 + 0.4 * Math.sin(i / a.n * TAU) : 0; if (st === 1) opz.stato = 'caccia'; }
  c.save();
  c.beginPath(); c.rect(i * a.cw, st * a.ch, a.cw, a.ch); c.clip();
  c.translate(i * a.cw + a.ox, st * a.ch + a.oy); c.scale(a.s, a.s);
  try { a.def.disegna(c, opz); } catch (e) { if (errori++ < 5) console.error('[Boccone] il modello "' + a.def.id + '" non si disegna', e); }
  c.restore();
  a.fatte++;
  if (a.fatte >= a.totale) a.pronto = true;
  return true;
}
/* L'atlante pronto per disegnare def a "px" pixel per unità; null se bisogna disegnare dal vivo (per ora o per sempre). */
function atlantePer(def, px) {
  let livello = livelloDi(px);
  const g = def.ingombro, area = (g.x1 - g.x0) * (g.y1 - g.y0);
  if (area * scalaDi(livello) * scalaDi(livello) > TETTO_CELLA) { livello--; if (area * scalaDi(livello) * scalaDi(livello) > TETTO_CELLA) return null; }
  const chiave = def.id + ':' + livello;
  let a = atlanti.get(chiave);
  if (!a) {
    a = nuovoAtlante(def, livello, chiave);
    if (pixel + a.pixel > TETTO_PIXEL && !faiPosto(a.pixel)) return null;
    atlanti.set(chiave, a); daFare.push(a);
  }
  a.uso = fotogramma;
  if (a.pronto) return a;
  const vicino = atlanti.get(def.id + ':' + (livello - 1)) || atlanti.get(def.id + ':' + (livello + 1));   // intanto, la risoluzione accanto
  if (vicino && vicino.pronto) { vicino.uso = fotogramma; return vicino; }
  return null;
}

/* Disegna un modello nel mondo. o = { x, y, r, ang, fase, bocca, minaccia, alfa, stato, t, attivo, vivo, stira, … }:
   o.vivo = true lo disegna sempre dal vivo (eroi, giganti, capobranco); gli altri campi passano al modello così come sono. */
function disegna(c, def, o) {
  const r = o.r, alfa = o.alfa === undefined ? 1 : o.alfa;
  if (!(r > 0) || alfa <= 0.01 || !def) return;
  const ang = o.ang || 0, sinistra = Math.cos(ang) < 0, tipo = def.tipo;
  c.save();
  c.translate(o.x, o.y);
  if (tipo === 'pericolo') { if (ang) c.rotate(ang); }
  else if (def.assetto === 'dritto') { if (sinistra) c.scale(-1, 1); }
  else { c.rotate(ang); if (sinistra) c.scale(1, -1); }
  if (o.stira) c.scale(o.stira, 1 / o.stira);
  if (alfa < 1) c.globalAlpha = alfa;
  const a = !o.vivo && (tipo === 'pesce' || tipo === 'pericolo') ? atlantePer(def, r * scala) : null;
  if (a) {
    const fase = o.fase || 0, i = Math.floor((fase - Math.floor(fase)) * a.n) % a.n, k = r / a.s;
    const st = tipo === 'pericolo' ? Math.round(U.limita(o.attivo || 0, 0, 1) * (a.stati - 1)) : o.minaccia ? 1 : 0;
    c.drawImage(a.tela, i * a.cw, st * a.ch, a.cw, a.ch, -a.ox * k, -a.oy * k, a.cw * k, a.ch * k);
  } else {
    c.scale(r, r);
    if (o.dettaglio === undefined) o.dettaglio = Math.min(1, r * scala / 40);
    try { def.disegna(c, o); } catch (e) { if (errori++ < 5) console.error('[Boccone] il modello "' + def.id + '" non si disegna', e); }
  }
  c.restore();
}

// ---------------------------------------------------------------- pesciolini dei banchi
/* L'atlante di un banco: DIREZIONI colonne (verso dove nuota) per PASSI_BANCO righe (il colpo di coda).
   r = mezza lunghezza del pesciolino in unità di mondo. Si prepara subito: sono disegni minuscoli. */
function banco(def, r) {
  const livello = livelloDi(r * scala), chiave = def.id + ':b' + livello;
  let a = atlanti.get(chiave);
  if (!a) {
    const s = scalaDi(livello), g = def.ingombro;
    const raggio = Math.max(Math.hypot(g.x0, g.y0), Math.hypot(g.x1, g.y0), Math.hypot(g.x0, g.y1), Math.hypot(g.x1, g.y1));
    const lato = Math.ceil(raggio * s) * 2 + MARGINE * 2;
    a = { chiave, def, livello, s, lato, mezzo: lato / 2 / s, tela: null, c: null, pronto: true, uso: fotogramma, pixel: lato * DIREZIONI * lato * PASSI_BANCO, buttato: false };
    faiPosto(a.pixel);
    a.tela = U.tela(lato * DIREZIONI, lato * PASSI_BANCO); a.c = a.tela.getContext('2d'); pixel += a.pixel;
    opz.bocca = 0; opz.minaccia = false; opz.attivo = 0; opz.t = 0; opz.dettaglio = Math.min(1, s / 40); opz.stato = 'calmo';
    for (let p = 0; p < PASSI_BANCO; p++) for (let d = 0; d < DIREZIONI; d++) {
      const ang = d / DIREZIONI * TAU, c = a.c;
      opz.fase = p / PASSI_BANCO;
      c.save();
      c.beginPath(); c.rect(d * lato, p * lato, lato, lato); c.clip();
      c.translate(d * lato + lato / 2, p * lato + lato / 2); c.rotate(ang); if (Math.cos(ang) < -0.01) c.scale(1, -1); c.scale(s, s);
      try { def.disegna(c, opz); } catch (e) { if (errori++ < 5) console.error('[Boccone] il modello "' + def.id + '" non si disegna', e); }
      c.restore();
    }
    atlanti.set(chiave, a);
  }
  a.uso = fotogramma;
  return a;
}
/* Copia un pesciolino dall'atlante a (preso da banco()). */
function pesciolino(c, a, x, y, ang, fase, r) {
  const d = Math.round(ang / TAU * DIREZIONI) & (DIREZIONI - 1), p = Math.floor((fase - Math.floor(fase)) * PASSI_BANCO) % PASSI_BANCO, m = a.mezzo * r;
  c.drawImage(a.tela, d * a.lato, p * a.lato, a.lato, a.lato, x - m, y - m, m * 2, m * 2);
}

// ---------------------------------------------------------------- lavoro a rate
/* A inizio fotogramma: pxPerUnita = zoom × dpr (serve a scegliere la risoluzione delle figurine). */
function inizio(pxPerUnita) { fotogramma++; scala = pxPerUnita > 0 ? pxPerUnita : 1; }
/* A fine fotogramma: prepara qualche figurina, per al massimo "ms" millisecondi. */
function lavora(ms) {
  const fine = performance.now() + (ms || 4);
  while (daFare.length) {
    const a = daFare[0];
    if (a.buttato || a.pronto) { daFare.shift(); continue; }
    if (fotogramma - a.uso > VECCHIO) { daFare.shift(); butta(a); continue; }      // non serve più
    if (!preparaCella(a)) { daFare.shift(); butta(a); continue; }                    // non c'è posto
    if (performance.now() >= fine) break;
  }
  if (pixel > TETTO_PIXEL) faiPosto(0);
}
function svuota() { for (const a of [...atlanti.values()]) butta(a); daFare.length = 0; }

B.figurine = {
  disegna, banco, pesciolino, inizio, lavora, svuota,
  stato: () => ({ atlanti: atlanti.size, daFare: daFare.length, pixel, errori }),
};
})();
