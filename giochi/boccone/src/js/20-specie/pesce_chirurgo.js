/* Boccone — specie: PESCE CHIRURGO (taglia 2, branco). Ovale blu intenso con il disegno scuro «a tavolozza» (una fascia
   lungo la schiena e un anello sul fianco), coda gialla orlata di scuro, pettorale con la punta gialla e la piccola lama
   bianca alla base della coda: da calmo è ripiegata, a caccia scatta in fuori (cambia la sagoma). Niente nero: è blu notte. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max } = Math;

// ---- tinte (una volta sola) e sagoma: ovale pieno, muso piccolo e un po' a punta
const T = { corpo: P.tinta('#2a6df4'), notte: P.tinta('#28257c'), pinna: P.tinta('#3f8eff'), coda: P.tinta('#ffd21f', '#ff6a14'), lama: P.tinta('#ffffff', '#8cb2ff'), labbra: P.tinta('#ff7fa6') };
const NOTTE = T.notte.base, CIELO = '#86dcff';
const SU = P.sagoma([[0, .13], [.1, .26], [.3, .6], [.55, .76], [.78, .7], [.93, .5], [1, .34]]);
const GIU = P.sagoma([[0, .13], [.1, .26], [.3, .58], [.55, .72], [.78, .64], [.93, .44], [1, .28]]);
const ONDA = { amp: .1, onde: .5, testa: .14 };
/* Il disegno a tavolozza. La fascia: tutta la schiena, più larga sul gambo della coda e in avanti, dove scende fino all'occhio.
   L'anello: appeso sotto la fascia, chiude dentro un ovale di blu. */
const orloFascia = u => u < .14 ? .2 : u < .62 ? -.74 : -.74 + (u - .62) * 1.9;
const anello = (c, s) => {
  const q = {}; c.beginPath();
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; P.suSpina(s, .4 + .235 * cos(a), -.3 + .42 * sin(a), q); if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); }
  c.closePath(); c.lineJoin = 'round'; c.strokeStyle = NOTTE; c.lineWidth = .115; c.stroke();
};
/* I dentini in vista fra le labbra aperte (P.labbra li lascia dietro le labbra): stessi x, y, ang, r, apri delle labbra. */
const dentini = (c, x, y, ang, r, apri) => {
  c.save(); c.translate(x, y); c.rotate(ang - apri * .5);
  P.denti(c, -.12 * r, .03 * r, .52 * r, -.1 * r, 3, r * (.12 + .22 * apri), -1, { spess: .012 });
  c.rotate(apri * 1.35);
  P.denti(c, -.12 * r, -.03 * r, .48 * r, .09 * r, 3, r * (.08 + .18 * apri), 1, { spess: .012 });
  c.restore();
};

B.specie.registra({
  id: 'pesce_chirurgo',
  descrizione: 'Si chiama così per la lama affilata come un bisturi che tiene ripiegata vicino alla coda: se qualcuno lo disturba la fa scattare con un colpo di coda. Di notte dorme incastrato tra i coralli.',
  forma: { lx: 1.0, ly: .74 },
  ingombro: { x0: -1.63, y0: -1.02, x1: 1.13, y1: 1.08 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.9, .72, fase, ONDA, SU, GIU, { testa: .26 }), luce = [.3, -.5, 1.8], alza = m ? .22 : 0;

    // ---- 1. dietro al corpo: coda gialla con gli orli scuri, dorsale e anale lunghe e basse, ventrale
    P.suSpina(s, 0, 0, q);
    const g = P.coda(c, { x: q.x + .06, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .34, tipo: 'forca', lung: .56, alt: .56, radice: .13, fase: F - 1.9, onda: .18, tinta: T.coda, orlo: '#fff3a0' });
    for (let i = 0; i <= g.n; i += g.n) P.filo(c, [g.bx[i], g.by[i], g.mx[i], g.my[i], g.mx[i] + (g.ex[i] - g.mx[i]) * .72, g.my[i] + (g.ey[i] - g.my[i]) * .72], .09, .04, NOTTE, .03);
    const d0 = P.suSpina(s, .78, -.92), d1 = P.suSpina(s, .08, -.85), a0 = P.suSpina(s, .5, .9), a1 = P.suSpina(s, .08, .85);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -(PI / 2 + .5 - alza), a1: -(PI - .5 - alza * .5), lung: m ? .44 : .36, profilo: [.6, .85, 1, 1, .95, .8], n: 10, smerlo: .25,
      onda: .07, fase: F * 2, passo: .5, tinta: T.pinna, orlo: CIELO });
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: PI / 2 + .6, a1: PI - .5, lung: .32, profilo: [.7, 1, .95, .8], n: 7, smerlo: .25, onda: .07, fase: F * 2 - 1, passo: .5, tinta: T.pinna, orlo: CIELO });
    const pv = P.suSpina(s, .64, .95);
    P.pinna(c, { x0: pv.x + .06, y0: pv.y - .05, x1: pv.x - .1, y1: pv.y - .05, a0: PI * .58 + sin(F - .5) * .1, a1: PI * .8 + sin(F - .5) * .1, lung: .38, profilo: [1, .6], n: 3, piega: .12, tinta: T.pinna, righe: false });

    // ---- 2. il corpo: ventre appena più chiaro, la tavolozza blu notte
    P.volume(c, s, T.corpo, { luce, dentro(cc) {
      P.fianco(cc, s, .5, 1.4, P.alfa(CIELO, .22));
      P.fianco(cc, s, -1.4, orloFascia, NOTTE, 0, .93, 14);
      anello(cc, s);
    } });
    const g1 = P.suSpina(s, .76, -.4), g2 = P.suSpina(s, .715, .05), g3 = P.suSpina(s, .76, .55);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                                // opercolo
    P.riflesso(c, .3, -.52, .38, -.15, .12);

    // ---- 3. la lama: ripiegata verso la coda da calmo, aperta e più lunga a caccia
    P.suSpina(s, .13, .12, q);
    P.ombra(c, q.x - .05, q.y + .04, .16, .09, q.ang, .3);
    P.corno(c, q.x + .06, q.y, q.ang + PI + (m ? .75 : .08), m ? .34 : .2, m ? .12 : .09, T.lama, { gonfio: .8, bordo: .035 });

    // ---- 4. sul fianco: la pettorale dalla punta gialla che rema, con la sua ombra
    const pp = P.suSpina(s, .66, .25), rema = sin(F * 2 + .4), ap = PI * .9 + rema * .35;
    P.ombra(c, pp.x - .15, pp.y + .05, .28, .18, -.3, .25);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .1, x1: pp.x - .02, y1: pp.y + .1, a0: ap + .45 + rema * .1, a1: ap - .5 - rema * .1, lung: .48, profilo: [.75, 1, 1, .8, .55], n: 5, onda: .1, fase: F * 2, passo: .7, tinta: T.pinna, punta: '#ffd21f', orlo: '#ffd21f', primo: true });

    // ---- 5. la faccia. Calmo: occhio dorato dentro la fascia scura, boccuccia chiusa. A caccia: occhio rosso tagliato, sopracciglio, dentini
    const e = P.suSpina(s, .875, -.3);
    P.occhio(c, e.x, e.y, .21, Object.assign({ iride: m ? '#ff3a1e' : '#ffc21a', pelle: T.notte, guarda: { x: .5, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .2, .44, .5, T.notte.bordo, .11);
    const l = P.suSpina(s, 1, .3), lx = l.x + .22, ly = l.y + .02, la = l.ang + .08, lr = m ? .14 : .12, apri = m ? max(b, .45) : b * .5;
    P.labbra(c, lx, ly, la, lr, apri, T.labbra);
    if (m) dentini(c, lx, ly, la, lr, apri);
    c.restore();
  },
});
})();
