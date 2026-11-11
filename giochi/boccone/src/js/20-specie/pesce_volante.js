/* Boccone — specie: PESCE VOLANTE (taglia 2, scattante). Un aliante: corpo lungo blu cobalto con la pancia d'argento, quattro
   «ali» color ambra, trasparenti, venate e macchiate come quelle di una farfalla (le due pettorali enormi e a punta, stese
   all'indietro come quelle di una rondine, e le due ventrali più piccole), coda col lobo di sotto lungo il doppio. Diverso dall'eroe Saetta, che è
   paffuto, azzurro e con le ali celesti. A caccia spalanca le ali, che si orlano di rosso, e drizza la dorsale. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola) e sagoma: siluro dal muso tondo
const T = { corpo: P.tinta('#4656ee', '#2a168c'), ventre: P.tinta('#eef5ff', '#8f9cf2'), ala: P.tinta('#ffdc6e', '#ff6a22'), alaLontana: P.tinta('#f4a644', '#b8328a'),
  pinna: P.tinta('#6f8cff', '#3a2ab0'), labbra: P.tinta('#ff7fa8') };
const STRISCIA = '#7fe6ff', MACCHIA = P.alfa('#7a2fc8', .5), VENA = '#fff3c0', ROSSO = '#ff4a22', PUNTINI = P.alfa('#a8c4ff', .8);
const SU = P.sagoma([[0, .06], [.15, .17], [.4, .31], [.65, .38], [.85, .39], [1, .3]]);
const GIU = P.sagoma([[0, .06], [.15, .16], [.4, .28], [.65, .33], [.85, .33], [1, .24]]);
const ONDA = { amp: .08, onde: .5, testa: .12, potenza: 2.2 };
const PROFILO_ALA = [1, .87, .72, .58, .46, .36, .28], PROFILO_CODA = [.72, .58, .42, .66, 1.18];
/* Le macchie dell'ala: un puntino a metà di ogni raggio, più grande verso il bordo d'attacco. g = la geometria ritornata da P.pinna. */
const macchie = (c, g, r) => {
  c.beginPath();
  for (let i = 1; i < g.n; i++) for (const k of [.25, .6]) { const x = g.mx[i] + (g.ex[i] - g.mx[i]) * k, y = g.my[i] + (g.ey[i] - g.my[i]) * k, rr = r * (1 - i / g.n * .5) * (k > .5 ? .8 : 1); c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU); }
  c.fillStyle = MACCHIA; c.fill();
};

B.specie.registra({
  id: 'pesce_volante',
  descrizione: 'Non vola davvero: prende la rincorsa, salta fuori e plana sulle pinne aperte anche per cinquanta metri. Il lobo lungo della coda fa da motore: frusta l\'acqua per ripartire senza rituffarsi.',
  forma: { lx: 1.05, ly: .42 },
  ingombro: { x0: -1.99, y0: -1.24, x1: 1.16, y1: 1.36 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -1.06, .72, fase, ONDA, SU, GIU, { testa: .26 }), luce = [.3, -.45, 1.6];
    const batte = sin(F), apre = m ? .5 : .38, orlo = m ? ROSSO : VENA, alza = m ? .3 : 0;

    // ---- 1. dietro al corpo: ala lontana (in su), coda dal lobo lungo, dorsale e anale arretrate, ala ventrale
    const af = P.suSpina(s, .66, -.45), AF = PI + .26 + (m ? .14 : 0) + batte * .16;
    const gl = P.pinna(c, { x0: af.x + .1, y0: af.y, x1: af.x - .1, y1: af.y + .04, a0: AF + apre, a1: AF - apre, lung: 1.2, profilo: PROFILO_ALA, n: 7, piega: -.1, onda: .05, fase: F - 1, passo: .5, smerlo: .3, tinta: T.alaLontana, orlo, primo: true });
    macchie(c, gl, .04);
    P.suSpina(s, 0, 0, q);
    const ac = q.ang + PI + sin(F - 1.1) * .34;
    P.pinna(c, { x0: q.x + .04 + sin(ac) * .08, y0: q.y - Math.cos(ac) * .08, x1: q.x + .04 - sin(ac) * .08, y1: q.y + Math.cos(ac) * .08, a0: ac - .62, a1: ac + .7, lung: .78, profilo: PROFILO_CODA, n: 8, onda: .14, fase: F - 1.9, passo: 0,
      tinta: T.pinna, orlo: STRISCIA, primo: true });
    const d0 = P.suSpina(s, .3, -.85), d1 = P.suSpina(s, .13, -.8), n0 = P.suSpina(s, .28, .85), n1 = P.suSpina(s, .14, .8);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -(PI / 2 + .55 - alza), a1: -(PI - .3), lung: m ? .36 : .3, profilo: [1, .8, .55, .4], n: 4, onda: .07, fase: F * 2, tinta: T.pinna, orlo: STRISCIA });
    P.pinna(c, { x0: n0.x, y0: n0.y, x1: n1.x, y1: n1.y, a0: PI / 2 + .65, a1: PI - .3, lung: .24, profilo: [1, .75, .5], n: 4, onda: .07, fase: F * 2 - 1, tinta: T.pinna, orlo: STRISCIA });
    const pv = P.suSpina(s, .38, .9), AV = PI * .64 - batte * .14;
    const gv = P.pinna(c, { x0: pv.x + .1, y0: pv.y - .04, x1: pv.x - .1, y1: pv.y - .06, a0: AV - .34, a1: AV + .3, lung: .56, profilo: [1, .9, .7, .5], n: 5, smerlo: .25, tinta: T.ala, orlo, primo: true });
    macchie(c, gv, .03);

    // ---- 2. il corpo: pancia d'argento, striscia celeste, puntini chiari e squame sul dorso
    P.volume(c, s, T.corpo, { luce, ombra: .08, dentro(cc) {
      P.fianco(cc, s, u => .08 + max(0, u - .8) * 5, 1.4, T.ventre.base);
      P.fianco(cc, s, u => -.06 + max(0, u - .8) * 5, u => .08 + max(0, u - .8) * 5, STRISCIA, .03, .93);
      P.macchie(cc, s, { n: 7, seme: 4, u0: .1, u1: .7, v0: -.85, v1: -.3, r0: .022, r1: .04, colore: PUNTINI, lungo: 1 });
      if (P.fine(o)) P.squame(cc, s, { u0: .2, u1: .74, v0: -.9, v1: -.12, righe: 3, tinta: T.corpo, forza: .8 });
    } });
    const g1 = P.suSpina(s, .77, -.55), g2 = P.suSpina(s, .73, 0), g3 = P.suSpina(s, .77, .6);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .035);                               // opercolo
    P.suSpina(s, .56, -.66, q); P.riflesso(c, q.x, q.y, .34, q.ang - .08, .1);

    // ---- 3. sul fianco: l'ala vicina, enorme e trasparente, stesa all'indietro e in giù, con la sua ombra
    const pp = P.suSpina(s, .68, .02), AN = PI - .34 - (m ? .16 : 0) - batte * .18;
    P.ombra(c, pp.x - .22, pp.y + .1, .4, .2, -.4, .28);
    c.globalAlpha = .84;
    const gn = P.pinna(c, { x0: pp.x + .06, y0: pp.y + .09, x1: pp.x - .07, y1: pp.y - .08, a0: AN - apre, a1: AN + apre, lung: 1.38, profilo: PROFILO_ALA, n: 7, piega: .1, onda: .05, fase: F, passo: .5, smerlo: .3, tinta: T.ala, orlo, primo: true });
    c.globalAlpha = 1;
    macchie(c, gn, .05);

    // ---- 4. la faccia. Calmo: occhione verde menta, boccuccia chiusa. A caccia: occhio rosso tagliato, sopracciglio, denti
    const e = P.suSpina(s, .87, -.28);
    P.occhio(c, e.x, e.y, .25, Object.assign({ iride: m ? '#ff3a1e' : '#34dca4', pelle: T.corpo, guarda: { x: .55, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .23, .5, .5, T.corpo.bordo, .12);
    const l = P.suSpina(s, 1, .35);
    P.labbra(c, l.x + .27, l.y, l.ang + .1, m ? .13 : .11, m ? max(b, .45) : b * .5, T.labbra, { denti: m ? 3 : 0 });
    c.restore();
  },
});
})();
