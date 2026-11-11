/* Boccone — specie: CASTAGNOLA (taglia 1, branco). Pesciolino ovale blu notte: squame orlate d'azzurro elettrico, un filo
   di luce lungo il dorso, occhione dorato e la coda a forbice dai bordi scuri, che si apre e si chiude mentre nuota.
   Il tratto esagerato sono l'occhio e la forbice della coda.
   RITOCCO PER LO STILE «FILM D'ANIMAZIONE»: il blu ha l'ombra indaco dichiarata nelle tinte (senza contorno scuro si
   impastava con l'acqua), il ventre lilla è più chiaro e sfuma nel fianco, le pinne sono piene fino in punta e sotto la
   pancia corre un filo di luce color acqua. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola) e sagoma: ovale e un po' alto, testa grossa
const T = { corpo: P.tinta('#3848dc', '#23158c'), ventre: P.tinta('#b3bcff', '#5b4bd6'), pinna: P.tinta('#3d7bff', '#2a2fc4'), pett: P.tinta('#63b0ff', '#2b55e8'), labbra: P.tinta('#ff6f8f') };
const NEON = '#4fe0ff', GHIACCIO = '#b4f2ff', SQUAMA = { luce: NEON, scura: T.corpo.bordo }, ACQUA = 'rgba(214,247,255,.6)';
const SU = P.sagoma([[0, .1], [.12, .22], [.3, .48], [.5, .62], [.7, .63], [.88, .52], [1, .32]]);
const GIU = P.sagoma([[0, .1], [.12, .2], [.3, .43], [.5, .55], [.7, .55], [.88, .43], [1, .25]]);
const ONDA = { amp: .12, onde: .55, testa: .13 };

B.specie.registra({
  id: 'castagnola',
  descrizione: 'Da piccola è di un blu elettrico che sembra accesa; crescendo diventa scura come una castagna, e da lì il nome. Vive in nuvole di centinaia di compagne sospese sopra gli scogli.',
  forma: { lx: .95, ly: .6 },
  ingombro: { x0: -1.86, y0: -1.11, x1: 1.13, y1: 1.11 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.86, .7, fase, ONDA, SU, GIU, { testa: .28 }), luce = [.3, -.5, 1.7], alza = m ? .25 : 0;

    // ---- 1. dietro al corpo: la coda a forbice (si apre e si chiude) con i bordi scuri, dorsale, anale, ventrale
    P.suSpina(s, 0, 0, q);
    const g = P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .34, tipo: 'luna', lung: .68, alt: .5 + sin(F * 2 + .6) * .07 + (m ? .07 : 0), radice: .13,
      fase: F - 1.9, onda: .12, tinta: T.pinna, punta: GHIACCIO });
    for (const i of [0, g.n]) P.filo(c, [g.bx[i], g.by[i], g.mx[i], g.my[i], g.ex[i], g.ey[i]], .11, .02, T.corpo, .03);
    const a = P.suSpina(s, .74, -.92), z = P.suSpina(s, .16, -.8), an0 = P.suSpina(s, .44, .88), an1 = P.suSpina(s, .15, .8);
    P.pinna(c, { x0: a.x, y0: a.y, x1: z.x, y1: z.y, a0: -(PI / 2 + .35 - alza), a1: -(PI - .45 - alza * .4), lung: m ? .52 : .45, profilo: [.7, .9, .82, .8, 1.05, .95, .6], n: 9, smerlo: m ? .7 : .35,
      onda: .07, fase: F * 2, passo: .6, tinta: T.pinna, orlo: NEON });
    P.pinna(c, { x0: an0.x, y0: an0.y, x1: an1.x, y1: an1.y, a0: PI / 2 + .45, a1: PI - .4, lung: .36, profilo: [.7, 1, .9, .6], n: 6, smerlo: .35, onda: .07, fase: F * 2 - 1.5, tinta: T.pinna, orlo: NEON });
    const pv = P.suSpina(s, .62, .95);
    P.pinna(c, { x0: pv.x + .06, y0: pv.y - .05, x1: pv.x - .08, y1: pv.y - .05, a0: PI * .6 + sin(F - .5) * .1, a1: PI * .8 + sin(F - .5) * .1, lung: .42, profilo: [1, .5], n: 3, piega: .1, tinta: T.pinna, orlo: NEON, righe: false });

    // ---- 2. il corpo: ventre lilla, filo elettrico lungo il dorso, squame orlate d'azzurro
    P.volume(c, s, T.corpo, { luce, ombra: .12, dentro(cc) {
      P.fianco(cc, s, u => .3 - .18 * sin(u * PI), 1.4, P.alfa(T.ventre.base, .45));              // il ventre: due passate, sfuma nel fianco
      P.fianco(cc, s, u => .52 - .18 * sin(u * PI), 1.4, T.ventre.chiara);
      P.fianco(cc, s, .86, 1.4, ACQUA, .05, .9);                                                  // filo di luce d'acqua sotto la pancia
      P.fianco(cc, s, -.93, -.78, NEON, .2, .97);
      if (P.fine(o)) P.squame(cc, s, { u0: .14, u1: .7, v0: -.68, v1: .4, righe: 4, tinta: SQUAMA, forza: .95 });
    } });
    const g1 = P.suSpina(s, .74, -.5), g2 = P.suSpina(s, .69, 0), g3 = P.suSpina(s, .74, .55);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                                // opercolo
    P.suSpina(s, .56, -.62, q); P.riflesso(c, q.x, q.y, .36, q.ang - .12, .13);

    // ---- 3. sul fianco: la pettorale che rema, con la sua ombra
    const pp = P.suSpina(s, .64, .22), rema = sin(F * 2 + .4), ap = PI * .9 + rema * .35;
    P.ombra(c, pp.x - .18, pp.y + .06, .32, .2, -.3, .28);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .1, x1: pp.x - .02, y1: pp.y + .1, a0: ap + .5 + rema * .1, a1: ap - .55 - rema * .1, lung: .46, profilo: [.7, .95, 1, .9, .65], n: 6, smerlo: .3, onda: .1, fase: F * 2, passo: .7,
      tinta: T.pett, orlo: GHIACCIO, primo: true });

    // ---- 4. la faccia. Calmo: occhione dorato, boccuccia chiusa. A caccia: occhio rosso tagliato, sopracciglio, denti
    const e = P.suSpina(s, .86, -.26);
    P.occhio(c, e.x, e.y, .27, Object.assign({ iride: m ? '#ff3a1e' : '#ffc21a', pelle: T.corpo, guarda: { x: .5, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .06, e.y - .25, .54, .5, T.corpo.bordo, .13);
    const l = P.suSpina(s, 1, .35);
    P.labbra(c, l.x + .23, l.y + .02, l.ang + .08, m ? .15 : .13, m ? max(b, .45) : b * .5, T.labbra, { denti: m ? 3 : 0 });
    c.restore();
  },
});
})();
