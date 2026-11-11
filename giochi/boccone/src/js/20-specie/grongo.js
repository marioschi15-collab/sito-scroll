/* Boccone — specie: GRONGO (taglia 4, agguato). Un nastro grosso e liscio, tutto diverso dalla murena: azzurro acciaio con
   la pancia bianca, testone tondo dagli occhi grandi, labbroni carnosi rosa, una pinnetta pettorale dietro la branchia, la
   fila di pori bianchi lungo il fianco e una pinna bassa orlata di scuro che gira attorno alla coda.
   Calmo tiene la bocca chiusa; a caccia la spalanca sui dentini, drizza la pinna e stringe la pupilla. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, pow, min } = Math;

// ---- tinte (una volta sola)
const T = { corpo: P.tinta('#4f8ee0', '#3a2a94'), ventre: P.tinta('#ddf2ff', '#86a6f2'), mento: P.tinta('#d4e8ff', '#6f8cf0'), cresta: P.tinta('#86d2ff', '#3550c8'),
  pinna: P.tinta('#9adcff', '#3f5fd8'), labbro: P.tinta('#ff93b8', '#c8328a') };
const INDACO = '#2a2488', DORSO = P.alfa('#2c2f9c', .34), PORI = '#eef6ff';
/* Il nastro: più grosso di quello della murena, con un testone tondo. Da u = .9 il ventre si ritira per la mandibola. */
const SU = P.sagoma([[0, .03], [.08, .15], [.3, .29], [.6, .34], [.8, .41], [.9, .53], [.96, .51], [1, .38]]);
const GIU = P.sagoma([[0, .03], [.08, .13], [.3, .26], [.6, .31], [.8, .39], [.87, .43], [.925, .22], [1, .16]]);
const ONDA = { amp: .27, onde: 1.05, testa: .14, potenza: .8 };
const altDorso = k => min(1, (1 - k) * 7) * (.5 + .5 * sin(PI * pow(k, .8)));     // non scende a zero in coda: lì fa la paletta
const altVentre = k => min(1, (1 - k) * 5) * (.6 + .4 * sin(PI * k));
const orloDorso = u => -.5 + .09 * sin(u * 26), orloVentre = u => .3 + .07 * sin(u * 23 + 1);

B.specie.registra({
  id: 'grongo',
  descrizione: 'Di giorno resta rintanato nei relitti, di notte esce a caccia. Nasce come una larva trasparente a forma di foglia e può diventare lungo tre metri.',
  forma: { lx: 1.7, ly: .5 },
  ingombro: { x0: -2.08, y0: -.88, x1: 1.63, y1: .77 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(22, -1.9, 1.3, fase, ONDA, SU, GIU, { testa: .16, coda: .02 });

    // ---- 1. dietro al corpo: la bocca (cavità, mandibola, dentini, labbro di sotto) e la pinna che gira attorno alla coda
    const ce = P.suSpina(s, .895, .32), apri = m ? .5 + b * .4 : .03 + b * .3;
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang + .05, lung: .52, apri, alt: .27, su: .2, tinta: T.mento, interno: '#7a1450', lingua: '#ff86a8' });
    const gx = ge.x1 - ge.x0, gy = ge.y1 - ge.y0, lx = -sin(ge.ang) * .09, ly = cos(ge.ang) * .09;
    if (apri > .15) P.denti(c, ge.x0 + gx * .2, ge.y0 + gy * .2, ge.x1, ge.y1, 6, .1, 1, { tipo: 'punta', arco: true });
    P.tubo(c, [ge.x0 + gx * .12 + lx, ge.y0 + gy * .12 + ly, ge.x0 + gx * .6 + lx * 1.1, ge.y0 + gy * .6 + ly * 1.1, ge.x1 + lx * .9, ge.y1 + ly * .9], .125, T.labbro, .035);   // labbro di sotto
    const alza = m ? 1.4 : 1;
    P.cresta(c, s, { u0: .01, u1: .75, lato: -1, alt: k => .19 * alza * altDorso(k), onda: .14, fase: F * 2, onde: 4, piega: .45, passi: 14, tinta: T.cresta, orlo: INDACO });
    P.cresta(c, s, { u0: .01, u1: .5, lato: 1, alt: k => .15 * alza * altVentre(k), onda: .12, fase: F * 2 + 1, onde: 3, piega: .45, passi: 9, tinta: T.cresta, orlo: INDACO });

    // ---- 2. il corpo: tinta piatta con lama di luce, dorso più scuro, pancia bianca, pori bianchi in fila lungo il fianco
    const te = P.suSpina(s, .93, -.2);
    P.volume(c, s, T.corpo, { ombra: .075, lume: .1, dentro(cc) {
      P.fianco(cc, s, -1.4, orloDorso, DORSO, 0, .88);
      P.fianco(cc, s, orloVentre, 1.4, T.ventre.base);
      P.guancia(cc, te.x, te.y - .1, .55, T.corpo.luce, .65);                         // la testa prende più luce: sembra più tonda
      const pr = P.puntiSuSpina(s, 13, .08, .8, -.06);
      cc.beginPath(); for (let i = 0; i < pr.length; i += 2) { cc.moveTo(pr[i] + .03, pr[i + 1]); cc.arc(pr[i], pr[i + 1], .03, 0, TAU); }
      cc.fillStyle = PORI; cc.fill();
    } });
    const g1 = P.suSpina(s, .845, -.25), g2 = P.suSpina(s, .825, .2), g3 = P.suSpina(s, .85, .7);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                    // la fessura della branchia
    if (P.fine(o)) {                                                                   // due vecchie cicatrici: vive tra le lamiere
      const c1 = P.suSpina(s, .52, -.6), c2 = P.suSpina(s, .55, -.1), c3 = P.suSpina(s, .48, -.5), c4 = P.suSpina(s, .505, -.15);
      P.solco(c, [c1.x, c1.y, c2.x, c2.y], T.corpo, .03); P.solco(c, [c3.x, c3.y, c4.x, c4.y], T.corpo, .03);
    }
    P.suSpina(s, .77, -.64, q); P.riflesso(c, q.x, q.y, .32, q.ang - .05, .12);

    // ---- 3. sul fianco: la pinnetta pettorale che rema, con la sua ombra
    const pp = P.suSpina(s, .8, .12), rema = sin(F * 2 + .4), ap = pp.ang + PI * .93 + rema * .3 - (m ? .35 : 0);
    P.ombra(c, pp.x - .14, pp.y + .05, .24, .16, pp.ang - .2, .28);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .09, x1: pp.x - .02, y1: pp.y + .09, a0: ap + .5, a1: ap - .5, lung: .34, profilo: [.75, 1, 1.05, .85], n: 5, smerlo: .35, onda: .1, fase: F * 2, passo: .7,
      tinta: T.pinna, orlo: INDACO, primo: true });

    // ---- 4. la faccia: dentini di sopra, labbrone, narice a tubetto, occhio grande
    const d0 = P.suSpina(s, .93, 1), d1 = P.suSpina(s, 1, 1), l0 = P.suSpina(s, .922, .86), l1 = P.suSpina(s, .965, .82);
    if (apri > .15) P.denti(c, d0.x + .03, d0.y - .01, d1.x + .08, d1.y - .02, 6, .15, -1, { tipo: 'punta', arco: true });
    P.tubo(c, [l0.x, l0.y, l1.x, l1.y, d1.x + .1, d1.y - .05], .135, T.labbro, .035);                // labbro di sopra
    P.suSpina(s, 1, -.7, q); P.corno(c, q.x + .08, q.y + .03, q.ang - .6, .1, .075, T.mento, { gonfio: 1, bordo: .03 });
    const e = P.suSpina(s, .93, -.4);
    P.occhio(c, e.x, e.y, .21, Object.assign({ pelle: T.corpo, guarda: { x: .6, y: .1 } }, m ? { iride: '#ff3a1e', tipo: 'fessura' } : { iride: '#ffd23a' }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    if (m) P.sopracciglio(c, e.x + .03, e.y - .2, .46, e.ang + .5, T.corpo.bordo, .12);
    c.restore();
  },
});
})();
