/* Boccone — specie: MURENA (taglia 4, agguato). ESEMPIO DI RIFERIMENTO per i corpi a nastro (vedi GUIDA-STILE.md):
   una spina lunga che ondeggia per tutta la lunghezza, cresta continua sul dorso, bocca a mandibola (P.fauci) con denti ad ago.
   Lo stesso schema serve per grongo, murena drago, pesce lupo, pesce remo, anguilla pellicano, drago di lava. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, pow } = Math;

const T = { corpo: P.tinta('#c8782a', '#5a2350'), mento: P.tinta('#e8ac48', '#96481e'), ventre: P.tinta('#ffe9a8', '#e08a3a'), cresta: P.tinta('#ffa81e', '#c2410c') };
/* Il nastro: sottile in coda, più grosso verso la testa, con la gobba della fronte. Davanti il ventre si ritira (da u = .9):
   lì sotto lavora la mandibola. */
const SU = P.sagoma([[0, .03], [.08, .12], [.3, .23], [.6, .28], [.8, .36], [.9, .46], [.96, .4], [1, .24]]);
const GIU = P.sagoma([[0, .03], [.08, .1], [.3, .2], [.6, .25], [.8, .34], [.87, .4], [.925, .16], [1, .09]]);
const ONDA = { amp: .3, onde: 1.3, testa: .16, potenza: .75 };       // potenza < 1: ondeggia tutto il corpo, non solo la coda
const altCresta = k => .27 * pow(sin(PI * pow(k, .7)), .6);          // alta a metà corpo, a zero ai due capi

B.specie.registra({
  id: 'murena',
  descrizione: 'Passa la giornata con la testa fuori da una tana, a bocca socchiusa: non minaccia nessuno, sta solo respirando. Ma se le passi davanti al naso scatta come una molla.',
  forma: { lx: 1.75, ly: .45 },
  ingombro: { x0: -2.1, y0: -.93, x1: 1.75, y1: .83 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(22, -1.95, 1.4, fase, ONDA, SU, GIU, { testa: .1, coda: .02 });

    // ---- 1. dietro al corpo: la bocca (cavità, lingua, mandibola, denti di sotto) e le creste
    const ce = P.suSpina(s, .9, .3), apri = m ? .58 + b * .42 : .17 + b * .25;          // calma: socchiusa; a caccia: spalancata
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang + .06, lung: .55, apri, alt: .22, su: .22, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c' });
    P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .2, ge.y0 + (ge.y1 - ge.y0) * .2, ge.x1, ge.y1, 5, .14, 1, { tipo: 'ago', varia: .35, seme: 4 });
    P.cresta(c, s, { u0: .04, u1: .9, lato: -1, alt: k => altCresta(k) * (m ? 1.25 : 1), onda: .16, fase: F * 2, onde: 4, piega: .5, passi: 16, tinta: T.cresta, orlo: '#fff3b0' });
    P.cresta(c, s, { u0: .03, u1: .55, lato: 1, alt: k => .13 * sin(PI * pow(k, .6)), piega: .5, passi: 10, tinta: T.cresta, righe: false });

    // ---- 2. il corpo: tinta piatta con lama di luce (va bene per i nastri), ventre chiaro, macchie gialle, pieghe della gola
    const te = P.suSpina(s, .93, -.2);
    P.volume(c, s, T.corpo, { ombra: .09, lume: .09, dentro(cc) {
      P.fianco(cc, s, u => .45 + .12 * sin(u * 40), 1.4, T.ventre.base);
      P.guancia(cc, te.x, te.y - .1, .5, T.corpo.luce, .7);                           // la testa prende più luce: sembra più tonda
      P.macchie(cc, s, { n: 15, seme: 3, u0: .05, u1: .86, v0: -.85, v1: .3, r0: .05, r1: .1, colore: '#ffd43a', cuore: '#fff6b8', lungo: 1.3 });
      P.macchie(cc, s, { n: 9, seme: 8, u0: .1, u1: .97, v0: -.8, v1: .1, r0: .02, r1: .035, colore: P.alfa(T.corpo.bordo, .55), lungo: 1 });
      P.anelli(cc, s, .8, .87, 3, T.corpo, { v0: .15, v1: 1.1, curva: -.012 });
    } });
    P.suSpina(s, .76, -.62, q); P.riflesso(c, q.x, q.y, .3, q.ang - .05, .12);

    // ---- 3. la faccia: denti di sopra, narice a tubetto, occhio
    const d0 = P.suSpina(s, .94, 1), d1 = P.suSpina(s, 1, 1);
    P.denti(c, d0.x, d0.y - .01, d1.x + .09, d1.y - .02, 5, m ? .15 : .11, -1, { tipo: 'ago', varia: .35, seme: 7 });
    P.suSpina(s, 1, -.75, q); P.corno(c, q.x + .07, q.y + .02, q.ang - .7, .11, .075, T.mento, { gonfio: 1, bordo: .03 });
    const e = P.suSpina(s, .94, -.42);
    P.occhio(c, e.x, e.y, .17, Object.assign({ pelle: T.corpo, guarda: { x: .6, y: .1 } }, m ? { iride: '#ff3a1e', tipo: 'fessura' } : { iride: '#ffe14a' }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    if (m) P.sopracciglio(c, e.x + .03, e.y - .17, .4, e.ang + .5, T.corpo.bordo, .11);
    c.restore();
  },
});
})();
