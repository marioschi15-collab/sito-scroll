/* Boccone — specie: TRIGLIA (taglia 2, cacciatore). Pesce di fondo rosso corallo: fronte ripida quasi a muro, occhi in alto,
   bocca bassa e, sotto il mento, due lunghi barbigli che frugano (da calma pendono e ondeggiano, a caccia puntano in avanti).
   Striscia gialla sul fianco, ventre rosa chiaro, squame grandi sul dorso, prima dorsale a vela gialla orlata di rosso.
   Il tratto esagerato sono i barbigli e il profilo ripido. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola) e sagoma: testa alta e tronca, corpo che si assottiglia, ventre quasi piatto
const T = { corpo: P.tinta('#ff5648', '#c41f52'), ventre: P.tinta('#ffe6dc', '#ff9486'), pinna: P.tinta('#ffc81f', '#ff6a14'), pett: P.tinta('#ffb3a0', '#f0506a'),
  barba: P.tinta('#ffe3d6', '#ff8f7f'), barbaLontana: P.tinta('#ffb4a2', '#e0506a'), labbra: P.tinta('#ff7f9c') };
const GIALLO = '#ffd21f', GIALLINO = P.alfa('#ffd21f', .7), CREMISI = P.alfa('#c41f52', .55), ORLO = '#ff4a3a';
const SU = P.sagoma([[0, .1], [.15, .2], [.4, .4], [.65, .52], [.82, .57], [.93, .53], [1, .42]]);
const GIU = P.sagoma([[0, .1], [.15, .18], [.4, .33], [.65, .41], [.85, .4], [1, .33]]);
const ONDA = { amp: .12, onde: .6, testa: .12 };
/* Un barbiglio dal mento (x, y): da calmo pende e la punta ondeggia all'indietro (w), a caccia si tende in avanti a frugare. */
const barbiglio = (c, x, y, w, m, t) => P.filo(c, m ? [x, y, x + .2, y + .16, x + .42, y + .2 + w * .08, x + .6, y + .1 + w * .16]
  : [x, y, x + .1, y + .2, x + .09 + w * .06, y + .43, x - .05 + w * .15, y + .62], .1, .035, t, .035);

/* I dentini in vista fra le labbra aperte (P.labbra li lascia dietro le labbra): stessi x, y, ang, r, apri delle labbra. */
const dentini = (c, x, y, ang, r, apri) => {
  c.save(); c.translate(x, y); c.rotate(ang - apri * .5);
  P.denti(c, -.12 * r, .03 * r, .52 * r, -.1 * r, 3, r * (.12 + .22 * apri), -1, { spess: .012 });
  c.rotate(apri * 1.35);
  P.denti(c, -.12 * r, -.03 * r, .48 * r, .09 * r, 3, r * (.08 + .18 * apri), 1, { spess: .012 });
  c.restore();
};

B.specie.registra({
  id: 'triglia',
  descrizione: 'Con i due baffi sotto il mento fruga nella sabbia e sente il sapore di quello che tocca, come se avesse la lingua sulle dita. Cambia colore con l\'umore: di notte, quando dorme, diventa a chiazze.',
  forma: { lx: 1.05, ly: .5 },
  ingombro: { x0: -1.8, y0: -1.2, x1: 1.5, y1: 1.1 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.95, .8, fase, ONDA, SU, GIU, { testa: .2 }), luce = [.35, -.5, 1.8], alza = m ? .25 : 0;

    // ---- 1. dietro al corpo: coda a forca, le due dorsali (la prima è una vela), anale, ventrale, i due barbigli
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .35, tipo: 'forca', lung: .62, alt: .52, radice: .11, fase: F - 1.9, onda: .16, tinta: T.pinna, orlo: ORLO });
    const a0 = P.suSpina(s, .7, -.9), a1 = P.suSpina(s, .5, -.88), b0 = P.suSpina(s, .42, -.86), b1 = P.suSpina(s, .2, -.8), an0 = P.suSpina(s, .4, .86), an1 = P.suSpina(s, .2, .8);
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: -(PI / 2 + .2 - alza), a1: -(PI - .5 - alza * .5), lung: m ? .66 : .56, profilo: [1, .95, .7, .42], n: 5, smerlo: .45, onda: .06, fase: F * 2,
      tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: b0.x, y0: b0.y, x1: b1.x, y1: b1.y, a0: -(PI / 2 + .45), a1: -(PI - .4), lung: .32, profilo: [.9, 1, .8, .6], n: 5, smerlo: .3, onda: .08, fase: F * 2 - 1, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: an0.x, y0: an0.y, x1: an1.x, y1: an1.y, a0: PI / 2 + .5, a1: PI - .4, lung: .28, profilo: [.9, 1, .8, .6], n: 5, smerlo: .3, onda: .08, fase: F * 2 - 2, tinta: T.pinna, orlo: ORLO });
    const pv = P.suSpina(s, .62, .95);
    P.pinna(c, { x0: pv.x + .06, y0: pv.y - .05, x1: pv.x - .08, y1: pv.y - .05, a0: PI * .6 + sin(F - .5) * .1, a1: PI * .82 + sin(F - .5) * .1, lung: .38, profilo: [1, .55], n: 3, piega: .1, tinta: T.pinna, orlo: ORLO, righe: false });
    const me = P.suSpina(s, .97, .8);
    barbiglio(c, me.x + .07, me.y - .04, sin(F * 2 + 1.6), m, T.barbaLontana);
    barbiglio(c, me.x - .02, me.y - .02, sin(F * 2), m, T.barba);

    // ---- 2. il corpo: ventre rosa chiaro, striscia gialla sul fianco e un filo giallo più sotto, squame sul dorso
    P.volume(c, s, T.corpo, { luce, ombra: .09, dentro(cc) {
      P.fianco(cc, s, u => .42 - .14 * sin(u * PI) + max(0, u - .8) * 4.5, 1.4, T.ventre.base);   // verso il mento si chiude a punta
      P.fianco(cc, s, u => -.3 + max(0, u - .66) * 1.3, 0, CREMISI, .05, .82);                      // la striscia gialla, orlata di rosso cupo, finisce a punta dietro l'occhio
      P.fianco(cc, s, u => -.17 + max(0, u - .66) * 1.3, u => .08 - max(0, u - .66) * .7, GIALLO, .05, .82);
      P.fianco(cc, s, .2, .29, GIALLINO, .1, .7);
      if (P.fine(o)) P.squame(cc, s, { u0: .1, u1: .74, v0: -.9, v1: -.2, righe: 3, tinta: T.corpo, forza: .9 });
    } });
    const g1 = P.suSpina(s, .76, -.55), g2 = P.suSpina(s, .71, 0), g3 = P.suSpina(s, .77, .6);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                                // opercolo
    P.suSpina(s, .6, -.66, q); P.riflesso(c, q.x, q.y, .36, q.ang - .1, .12);

    // ---- 3. sul fianco: la pettorale che rema, con la sua ombra
    const pp = P.suSpina(s, .66, .42), rema = sin(F * 2 + .4), ap = PI * .9 + rema * .35;
    P.ombra(c, pp.x - .15, pp.y + .05, .26, .17, -.3, .25);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .09, x1: pp.x - .02, y1: pp.y + .09, a0: ap + .45 + rema * .1, a1: ap - .5 - rema * .1, lung: .37, profilo: [.7, .95, 1, .9, .65], n: 6, smerlo: .3, onda: .1, fase: F * 2, passo: .7,
      tinta: T.pett, orlo: '#ffe9a0', primo: true });

    // ---- 4. la faccia. Calmo: occhio verde acqua in alto, bocca bassa chiusa. A caccia: occhio rosso tagliato, sopracciglio, denti
    const e = P.suSpina(s, .88, -.42);
    if (m) P.guancia(c, e.x - .02, e.y + .34, .2, '#e0143c', .5);
    P.occhio(c, e.x, e.y, .24, Object.assign({ iride: m ? '#ff3a1e' : '#19b8a8', pelle: T.corpo, guarda: { x: .5, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .23, .5, .5, T.corpo.bordo, .12);
    const l = P.suSpina(s, 1, .62);
    const lx = l.x + .2, ly = l.y, la = l.ang + .12, lr = m ? .16 : .13, apri = m ? max(b, .45) : b * .5;
    P.labbra(c, lx, ly, la, lr, apri, T.labbra);
    if (m) dentini(c, lx, ly, la, lr, apri);
    c.restore();
  },
});
})();
