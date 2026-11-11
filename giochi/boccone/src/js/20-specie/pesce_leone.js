/* Boccone — specie: PESCE LEONE (taglia 3, pigro, veleno). Un ventaglio che nuota: corpo a righe rosse e panna, una fila di
   lunghi aculei velenosi separati sulla schiena (ognuno con la sua bandierina), due grandi pinne pettorali piumate (la
   lontana spunta sotto il mento, la vicina copre il fianco) con i raggi liberi in punta, cornetti sopra gli occhi, pinne
   molli chiare a puntini. Va piano; a caccia apre i ventagli, drizza gli aculei (le punte si accendono di giallo veleno)
   e spalanca la bocca. Il tratto esagerato sono i ventagli e gli aculei. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, hypot } = Math;

// ---- tinte (una volta sola)
const T = { corpo: P.tinta('#e63c2e', '#8f1f5e'), mento: P.tinta('#ffe6d0', '#f08a6a'), vela: P.tinta('#ffb46a', '#e04a3a'), ala: P.tinta('#f25a30', '#96205a'),
  lontana: P.tinta('#c03c58', '#5a1a66'), spina: P.tinta('#fff0d2', '#ff9a4a'), lembo: P.tinta('#ff8f5e', '#b02850') };
const PANNA = '#fff4e4', ROSSO = '#d42a30', CUPO = '#a01f4e', VELENO = '#eaff5a', BANDIERA = '#ffbe78';
const RIGA = P.alfa(PANNA, .93), NEO = P.alfa(CUPO, .8), RIGA_MENTO = P.alfa(ROSSO, .85), SPALLA = P.alfa('#ffd9b0', .8);
// ---- sagoma: testone, fronte ripida, ventre che si ritira sotto la testa per far posto alla mandibola
const SU = P.sagoma([[0, .12], [.14, .2], [.32, .36], [.52, .5], [.7, .58], [.84, .56], [.94, .46], [1, .34]]);
const GIU = P.sagoma([[0, .12], [.14, .2], [.32, .34], [.52, .45], [.68, .48], [.8, .4], [.9, .3], [1, .22]]);
const ONDA = { amp: .08, onde: .5, testa: .1 };
/* Le righe panna sul rosso: [da, a, pendenza]. Larghe e strette alternate, un po' storte; sulla testa si aprono a raggiera
   attorno all'occhio (che resta dentro una riga rossa). */
const STRISCE = [[.05, .085, .02], [.15, .19, .02], [.245, .27, .02], [.335, .385, .02], [.45, .475, .015], [.545, .595, .01], [.66, .685, -.01], [.75, .795, -.04], [.915, .95, .05]]
  .map((z, i) => [v => z[0] + z[2] * v + .012 * sin(v * 5 + i), v => z[1] + z[2] * v - .012 * sin(v * 4 + i * 2)]);
const NA = 9, ACULEI = [.62, .82, .95, 1, 1, .96, .88, .76, .6];       // gli aculei della schiena, dal primo (sulla nuca) all'ultimo
const PROFILO = [.74, .92, 1, 1, .94, .84, .72];                                // lunghezza dei raggi dei ventagli
const LB = .62, HB = .21;                                                       // la mandibola: lunghezza e spessore
const RIGHE_MENTO = new Path2D();                                                // tre righe rosse sulla mandibola, nelle sue coordinate
for (const [x, w, h] of [[.3, .1, .78], [.54, .1, .82], [.76, .08, .7]]) { RIGHE_MENTO.moveTo(LB * x, .035); RIGHE_MENTO.lineTo(LB * (x + w), .035); RIGHE_MENTO.lineTo(LB * (x + w - .05), HB * h); RIGHE_MENTO.lineTo(LB * (x - .05), HB * h); RIGHE_MENTO.closePath(); }

/* Tante punte (aculei, bandierine, lembi) in UN solo tracciato. lista = [x, y, angolo, lunghezza, larghezza, curva, …];
   e = di quanto ogni punta si allarga. Il bordo scuro NON è una passata di contorno (su forme lunghe e sottili costa caro):
   è la stessa forma, un po' più grande, riempita col colore del bordo (vedi `punte`). */
const tracciaPunte = (c, l, gonfio, e) => {
  for (let i = 0; i < l.length; i += 6) {
    const a = l[i + 2], L = l[i + 3] + e * 2, w = l[i + 4] / 2 + e * 1.4, hx = -sin(a) * w, hy = cos(a) * w, cu = l[i + 5], x = l[i] - cos(a) * e, y = l[i + 1] - sin(a) * e;
    const px = x + cos(a + cu) * L, py = y + sin(a + cu) * L, mx = x + cos(a + cu * .3) * L * .5, my = y + sin(a + cu * .3) * L * .5;
    c.moveTo(x + hx, y + hy); c.quadraticCurveTo(mx + hx * gonfio, my + hy * gonfio, px, py); c.quadraticCurveTo(mx - hx * gonfio, my - hy * gonfio, x - hx, y - hy); c.closePath();
  }
};
const punte = (c, l, colore, bordo, gonfio = .8) => {
  if (bordo) { c.beginPath(); tracciaPunte(c, l, gonfio, .035); c.fillStyle = bordo; c.fill(); }
  c.beginPath(); tracciaPunte(c, l, gonfio, 0); c.fillStyle = colore; c.fill();
};
/* Sfumatura radiale «a gradini»: attorno a (x, y), da k0·R a .86·R, n fasce alterne dei colori b e a; l'ultimo tratto sfuma
   in `punta`. Data a un ventaglio o a una fila di aculei li riga tutti insieme, ad archi, con un solo riempimento. */
const fasce = (c, x, y, R, k0, n, a, b, punta) => {
  const g = c.createRadialGradient(x, y, 0, x, y, R), passo = (.86 - k0) / n;
  g.addColorStop(0, a);
  for (let i = 0; i < n; i++) { const k = k0 + passo * i; g.addColorStop(k, i % 2 ? b : a); g.addColorStop(k + passo * .15, i % 2 ? a : b); }
  g.addColorStop(.86, n % 2 ? b : a); g.addColorStop(1, punta);
  return g;
};
/* Le piume di un ventaglio (g = la geometria di P.raggi): lunghe e sottili, dalla quota `da` del raggio fino in punta. */
const piume = (c, g, larg, e, da) => {
  const { bx, by, mx, my, ex, ey } = g;
  c.beginPath();
  for (let i = 0; i <= g.n; i++) {
    const dx = ex[i] - bx[i], dy = ey[i] - by[i], d = hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, hx = -uy * (larg + e * 2), hy = ux * (larg + e * 2);
    const x0 = bx[i] + dx * da - ux * e, y0 = by[i] + dy * da - uy * e, x1 = ex[i] + ux * e * 2, y1 = ey[i] + uy * e * 2;
    c.moveTo(x0, y0); c.quadraticCurveTo(mx[i] + hx, my[i] + hy, x1, y1); c.quadraticCurveTo(mx[i] - hx, my[i] - hy, x0, y0); c.closePath();
  }
};
/* Il ventaglio piumato: prima la membrana, che arriva a `quota` dei raggi con l'orlo a festoni (sm), poi le piume, libere in
   punta. Anche qui il bordo delle piume è un riempimento più largo, non un contorno. */
const ventaglio = (c, g, quota, sm, membrana, raggi, bordo, larg = .085) => {
  const n = g.n, { bx, by, ex, ey } = g;
  let px = bx[0] + (ex[0] - bx[0]) * quota, py = by[0] + (ey[0] - by[0]) * quota;
  c.lineJoin = 'round'; c.beginPath(); c.moveTo(bx[0], by[0]); c.lineTo(px, py);
  for (let i = 1; i <= n; i++) {
    const x = bx[i] + (ex[i] - bx[i]) * quota, y = by[i] + (ey[i] - by[i]) * quota, hx = (x + px) / 2, hy = (y + py) / 2;
    c.quadraticCurveTo(hx + ((bx[i] + bx[i - 1]) / 2 - hx) * sm, hy + ((by[i] + by[i - 1]) / 2 - hy) * sm, x, y); px = x; py = y;
  }
  c.lineTo(bx[n], by[n]); c.closePath();
  c.strokeStyle = bordo; c.lineWidth = P.BORDO * 2; c.stroke(); c.fillStyle = membrana; c.fill();
  piume(c, g, larg, .035, .28); c.fillStyle = bordo; c.fill();
  piume(c, g, larg, 0, .28); c.fillStyle = raggi; c.fill();
};
/* I puntini scuri lungo i raggi delle pinne molli (aggiunge al tracciato in corso). */
const nei = (c, g) => {
  for (let i = 1; i < g.n; i++) for (let j = 0; j < 2; j++) {
    const k = .02 + .52 * j, x = g.mx[i] + (g.ex[i] - g.mx[i]) * k, y = g.my[i] + (g.ey[i] - g.my[i]) * k;
    c.moveTo(x + .03, y); c.arc(x, y, .03, 0, TAU);
  }
};

B.specie.registra({
  id: 'pesce_leone',
  descrizione: 'Nuota piano piano, senza paura di nessuno: gli aculei che porta sulla schiena sono velenosi. Con le grandi pinne a ventaglio spinge i pesciolini in un angolo, poi li aspira in un boccone.',
  forma: { lx: 1.0, ly: .62 },
  ingombro: { x0: -1.52, y0: -1.58, x1: 1.02, y1: 1.36 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.9, .62, fase, ONDA, SU, GIU, { testa: .26 }), luce = [.3, -.5, 1.8], punta = m ? VELENO : PANNA;

    // ---- 1. dietro al corpo. Il ventaglio lontano, che spunta sotto il mento (più scuro)
    const pl = P.suSpina(s, .7, .5), al = PI * .4 + sin(F + 1.5) * .07, sl = m ? .8 : .62, Ll = m ? .92 : .84;
    const gl = P.raggi({ x0: pl.x - .12, y0: pl.y, x1: pl.x + .1, y1: pl.y, a0: al + sl, a1: al - sl, lung: Ll, profilo: PROFILO, n: 5, onda: .06, fase: F * 2 + 1, passo: .7 });
    ventaglio(c, gl, .68, .55, T.lontana.base, T.lontana.luce, T.lontana.bordo);
    // coda, dorsale molle e anale: chiare, a puntini
    P.suSpina(s, 0, 0, q);
    const gc = P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .28, tipo: 'ventaglio', lung: .52, alt: .44, radice: .12, fase: F - 1.9, onda: .16, smerlo: .3, n: 6, tinta: T.vela, orlo: PANNA });
    const b0 = P.suSpina(s, .31, -.86), b1 = P.suSpina(s, .09, -.8), n0 = P.suSpina(s, .36, .86), n1 = P.suSpina(s, .1, .8);
    const gd = P.pinna(c, { x0: b0.x, y0: b0.y, x1: b1.x, y1: b1.y, a0: -(PI / 2 + .15), a1: -(PI - .4), lung: .5, profilo: [.75, 1, 1, .85, .6], n: 5, smerlo: .35, onda: .09, fase: F * 2 - 1, tinta: T.vela, orlo: PANNA, righe: false });
    const ga = P.pinna(c, { x0: n0.x, y0: n0.y, x1: n1.x, y1: n1.y, a0: PI / 2 + .3, a1: PI - .4, lung: .42, profilo: [.8, 1, .95, .7], n: 5, smerlo: .35, onda: .09, fase: F * 2 - 2, tinta: T.vela, orlo: PANNA, righe: false });
    if (P.fine(o)) { c.beginPath(); nei(c, gc); nei(c, gd); nei(c, ga); c.fillStyle = NEO; c.fill(); }
    // gli aculei della schiena: prima le bandierine, poi gli aculei rigati (una sola sfumatura a gradini per tutti)
    const ba = [], ac = [], cime = m && new Path2D(), orli = m && new Path2D(), k0 = P.suSpina(s, .55, .7); let R = .5;
    for (let i = 0; i < NA; i++) {
      const k = i / (NA - 1); P.suSpina(s, .78 - .45 * k, -.88, q);
      const a = -PI / 2 + (m ? .55 - 1.0 * k : .4 - 1.15 * k) + sin(F * 2 - i * .6) * .05, L = ACULEI[i] * (m ? .95 : .82), tx = q.x + cos(a) * L, ty = q.y + sin(a) * L;
      ba.push(q.x, q.y, a - .27, L * .84, .36, -.12); ac.push(q.x, q.y, a, L, .12, 0); if (m) { cime.moveTo(tx + .045, ty); cime.arc(tx, ty, .045, 0, TAU); orli.moveTo(tx + .075, ty); orli.arc(tx, ty, .075, 0, TAU); } R = max(R, hypot(tx - k0.x, ty - k0.y));
    }
    c.beginPath(); tracciaPunte(c, ba, 1, .035); tracciaPunte(c, ac, 1, .035); c.fillStyle = T.corpo.bordo; c.fill(); if (m) c.fill(orli);
    punte(c, ba, BANDIERA, null, 1);
    punte(c, ac, fasce(c, k0.x, k0.y, R, .5, 6, ROSSO, PANNA, punta), null, 1);
    if (m) { c.fillStyle = VELENO; c.fill(cime); }                                                 // a caccia le punte si accendono
    // cornetti sopra gli occhi, poi la bocca (la mandibola è rigata anche lei)
    const ci = [], ce = P.suSpina(s, .77, .74), apri = m ? max(b, .45) * .9 : .03 + b * .3, ang = ce.ang - .34;
    for (let i = 0; i < 2; i++) { P.suSpina(s, .91 - i * .09, -.93, q); ci.push(q.x, q.y + .06, -PI / 2 + .4 - i * .45 - (m ? 0 : .45) + sin(F * 2 + i) * .1, m ? .44 : .34, .14, m ? -.2 : -.75); }
    punte(c, ci, T.lembo.base, T.corpo.bordo, 1.2);
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang, lung: LB, apri, alt: HB, su: .3, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c', ombra: 0 });
    c.save(); c.translate(ce.x, ce.y); c.rotate(ge.ang); c.fillStyle = RIGA_MENTO; c.fill(RIGHE_MENTO); c.restore();
    if (apri > .12) P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .3, ge.y0 + (ge.y1 - ge.y0) * .3, ge.x1, ge.y1, 5, m ? .065 : .04, 1, { varia: .3, seme: 4 });

    // ---- 2. il corpo: rosso, con le righe panna
    P.volume(c, s, T.corpo, { luce, ombra: .1, dentro(cc) {
      P.bande(cc, s, STRISCE, RIGA);
    } });
    const g1 = P.suSpina(s, .7, -.55), g2 = P.suSpina(s, .655, -.05), g3 = P.suSpina(s, .69, .5);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                                // opercolo
    P.suSpina(s, 1, -.62, q); P.riflesso(c, q.x + .09, q.y + .03, .3, q.ang + .45, .12);

    // ---- 3. sul fianco: il ventaglio vicino, con la sua ombra
    const pp = P.suSpina(s, .6, .38), av = PI * .7 + sin(F + .4) * .08, sv = m ? 1 : .8, Lv = m ? 1.07 : 1;
    P.ombra(c, pp.x - .2, pp.y + .12, .42, .3, -.5, .3);
    const gv = P.raggi({ x0: pp.x + .05, y0: pp.y - .14, x1: pp.x - .02, y1: pp.y + .15, a0: av + sv, a1: av - sv, lung: Lv, profilo: PROFILO, n: 8, onda: .06, fase: F * 2, passo: .6 });
    ventaglio(c, gv, .7, .5, T.ala.base, fasce(c, pp.x, pp.y, Lv, .1, 12, PANNA, ROSSO, PANNA), T.ala.bordo);
    c.beginPath(); c.ellipse(pp.x + .035, pp.y, .11, .2, .2, 0, TAU); c.fillStyle = T.ala.bordo; c.fill();               // la spalla carnosa da cui parte il ventaglio
    c.beginPath(); c.ellipse(pp.x + .04, pp.y - .005, .075, .165, .2, 0, TAU); c.fillStyle = T.ala.base; c.fill();
    c.beginPath(); c.ellipse(pp.x + .06, pp.y - .06, .025, .07, .2, 0, TAU); c.fillStyle = SPALLA; c.fill();

    // ---- 4. la faccia. Calmo: occhio verde acqua a palpebra calata, bocca chiusa. A caccia: occhio rosso a fessura, sopracciglio, denti
    const d0 = P.suSpina(s, .86, 1), d1 = P.suSpina(s, 1, 1);
    if (m) P.denti(c, d0.x, d0.y - .01, d1.x + .12, d1.y - .05, 5, .07, -1, { varia: .3, seme: 7 });
    const e = P.suSpina(s, .85, -.42);
    P.occhio(c, e.x, e.y, .2, Object.assign({ pelle: T.corpo, guarda: { x: .55, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo, m ? { iride: '#ff3a1e', tipo: 'fessura', sotto: 0 } : { iride: '#2fd6c4' }));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .2, .46, .5, T.corpo.bordo, .12);
    c.restore();
  },
});
})();
