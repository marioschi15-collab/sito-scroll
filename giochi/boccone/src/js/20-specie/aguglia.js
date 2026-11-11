/* Boccone — specie: AGUGLIA (taglia 1, scattante). Un ago che nuota: corpo sottilissimo verde smeraldo con la pancia
   d'argento e una striscia azzurra lungo il fianco, becco lunghissimo a due aste (quella di sotto un po' più lunga), occhione,
   pinne tutte in fondo, vicino alla coda. Il tratto esagerato è il becco: a caccia si apre a forbice e mostra una sega di dentini. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, min } = Math;

// ---- tinte (una volta sola) e sagoma: un filo che si ingrossa appena attorno all'occhio
const T = { corpo: P.tinta('#22c46c', '#0f5a8a'), ventre: P.tinta('#eefcff', '#7fb4f0'), pinna: P.tinta('#d2f03c', '#2fa04e'), becco: P.tinta('#2fb872', '#0f5a8a'),
  mento: P.tinta('#dff6ff', '#6fa4e8') };
const STRISCIA = '#22cdf2', LAMPO = 'rgba(255,255,255,.85)', ORLO = '#f6ffb0', GOLA = '#8a1240';
const SU = P.sagoma([[0, .05], [.1, .11], [.35, .19], [.7, .21], [.86, .27], [.94, .31], [1, .23]]);
const GIU = P.sagoma([[0, .05], [.1, .1], [.35, .18], [.7, .2], [.86, .23], [.94, .24], [1, .17]]);
const ONDA = { amp: .13, onde: .9, testa: .1, potenza: 1.3 };
const punta = u => min(1, (1 - u) * 7) * min(1, u * 9);                   // fa finire a punta le strisce ai due capi
const LAMPI = [.2, .44, .66];

B.specie.registra({
  id: 'aguglia',
  descrizione: 'Ha le lische verdi come l\'erba! Quando scappa schizza fuori dall\'acqua e rimbalza sulla superficie come un sasso piatto lanciato da riva.',
  forma: { lx: 1.5, ly: .28 },
  ingombro: { x0: -1.91, y0: -.69, x1: 1.69, y1: .66 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(16, -1.36, .72, fase, ONDA, SU, GIU, { testa: .1 }), alza = m ? .3 : 0;

    // ---- 1. dietro al corpo: coda a forca, dorsale e anale in fondo (una lo specchio dell'altra), ventrale arretrata
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .03, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .4, tipo: 'forca', lung: .42, alt: .4, radice: .06, fase: F - 1.9, onda: .16, n: 6, tinta: T.pinna, orlo: ORLO });
    for (const v of [-1, 1]) {
      const a = P.suSpina(s, .24, v * .85), z = P.suSpina(s, .07, v * .8);
      P.pinna(c, { x0: a.x, y0: a.y, x1: z.x, y1: z.y, a0: v * (PI / 2 + .55 - alza), a1: v * (PI - .3), lung: m ? .36 : .3, profilo: [1, .8, .5, .34, .28], n: 5, onda: .08, fase: F * 2 - v, tinta: T.pinna, orlo: ORLO });
    }
    const pv = P.suSpina(s, .36, .95);
    P.pinna(c, { x0: pv.x + .05, y0: pv.y - .03, x1: pv.x - .06, y1: pv.y - .03, a0: PI * .62 + sin(F - .5) * .12, a1: PI * .84 + sin(F - .5) * .12, lung: .2, profilo: [1, .6], n: 3, tinta: T.pinna, righe: false });

    // ---- 2. il becco, prima del corpo che ne copre le radici: gola, dentini a sega, asta di sopra e asta di sotto
    const h = P.suSpina(s, 1, .05), apri = m ? .15 + b * .17 : b * .13, aS = h.ang - apri * .8 + .05, aG = h.ang + apri - .045;
    const bx = h.x - .02, by = h.y, LS = .8, LG = .88, cS = cos(aS), sS = sin(aS), cG = cos(aG), sG = sin(aG);
    if (apri > .04) {
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + cS * LS * .9, by + sS * LS * .9); c.lineTo(bx + cG * LG * .9, by + sG * LG * .9); c.closePath(); c.fillStyle = GOLA; c.fill();
      P.denti(c, bx + cS * .12 - sS * .03, by + sS * .12 + cS * .03, bx + cS * LS * .9, by + sS * LS * .9, 8, .05, -1, { tipo: 'ago', largo: .8, spess: .01 });
      P.denti(c, bx + cG * .12 + sG * .03, by + sG * .12 - cG * .03, bx + cG * LG * .9, by + sG * LG * .9, 8, .05, 1, { tipo: 'ago', largo: .8, spess: .01 });
    }
    P.corno(c, bx + sG * .05, by - cG * .05 + .1, aG, LG, .18, T.mento, { gonfio: .45, punta: T.becco.base, bordo: .04 });
    P.corno(c, bx - sS * .05, by + cS * .05 - .1, aS, LS, .2, T.becco, { gonfio: .45, punta: T.becco.scura, bordo: .04 });

    // ---- 3. il corpo: tinta piatta con lama di luce, pancia d'argento, striscia azzurra, tre lampi di luce sul dorso
    P.volume(c, s, T.corpo, { ombra: .055, lume: .07, dentro(cc) {
      P.fianco(cc, s, u => .14 - .2 * (1 - punta(u)), 1.4, T.ventre.base);
      P.fianco(cc, s, u => -.16 * punta(u), u => .16 * punta(u), STRISCIA, .02, .97);
      cc.beginPath();
      for (const u of LAMPI) { P.suSpina(s, u, -.52, q); const ca = cos(q.ang) * .09, sa = sin(q.ang) * .09; cc.moveTo(q.x - ca, q.y - sa); cc.lineTo(q.x + sa * .22, q.y - ca * .22); cc.lineTo(q.x + ca, q.y + sa); cc.lineTo(q.x - sa * .22, q.y + ca * .22); cc.closePath(); }
      cc.fillStyle = LAMPO; cc.fill();
      if (P.fine(o)) P.squame(cc, s, { u0: .12, u1: .8, v0: -.95, v1: -.2, righe: 2, tinta: T.corpo, forza: .8 });
    } });
    const g1 = P.suSpina(s, .86, -.6), g2 = P.suSpina(s, .835, 0), g3 = P.suSpina(s, .86, .65);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .03);                                // opercolo

    // ---- 4. sul fianco: la pettorale piccola che rema
    const pp = P.suSpina(s, .8, .2), rema = sin(F * 2 + .4), ap = pp.ang + PI * .92 + rema * .3;
    P.ombra(c, pp.x - .1, pp.y + .04, .18, .1, pp.ang - .2, .25);
    P.pinna(c, { x0: pp.x + .02, y0: pp.y - .06, x1: pp.x - .02, y1: pp.y + .06, a0: ap + .32, a1: ap - .36, lung: .27, profilo: [.7, 1, .8, .5], n: 4, tinta: T.pinna, orlo: ORLO, primo: true });

    // ---- 5. la faccia. Calmo: occhione ambrato e becco chiuso. A caccia: occhio rosso tagliato, sopracciglio, becco a forbice
    const e = P.suSpina(s, .935, -.12);
    P.occhio(c, e.x, e.y, .23, Object.assign({ iride: m ? '#ff3a1e' : '#ffa81e', pelle: T.corpo, guarda: { x: .55, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .04, e.y - .22, .46, e.ang + .5, T.corpo.bordo, .11);
    c.restore();
  },
});
})();
