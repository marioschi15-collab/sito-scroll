/* Boccone — specie: SGOMBRO (taglia 1, branco). Un siluretto: dorso verde-blu con le onde scure a zigzag, fianco e pancia
   di madreperla (bianco con un velo rosa e uno d'oro), muso a punta, coda a forca e la fila di pinnette dorate davanti
   alla coda, sopra e sotto. Il tratto esagerato sono l'occhione e le onde del dorso. A caccia drizza la prima dorsale. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos } = Math;

// ---- tinte (una volta sola) e sagoma: affusolata, col muso a punta e il peduncolo sottile
const T = { corpo: P.tinta('#10b4b0', '#1d3aa8'), ventre: P.tinta('#fbf6ff', '#c79cf0'), pinna: P.tinta('#3f86f4', '#2a2aa8'), coda: P.tinta('#2f9be8', '#2a2aa8'),
  pinnetta: P.tinta('#ffc832', '#f0641e') };
const ONDE = '#1b3a9c', ROSA = P.alfa('#ff9fd2', .5), ORO = P.alfa('#ffe27a', .75), ORLO = '#bff4ff';
const SU = P.sagoma([[0, .06], [.14, .17], [.4, .35], [.64, .41], [.84, .37], [.94, .25], [1, .1]]);
const GIU = P.sagoma([[0, .06], [.14, .16], [.4, .32], [.64, .36], [.82, .32], [.885, .28], [.93, .13], [1, .06]]);   // da u = .88 si ritira: lì lavora la mandibola
const ONDA = { amp: .09, onde: .55, testa: .12, potenza: 2.2 };
/* Le onde scure del dorso: otto barre a zigzag, da passare a P.bande (la pancia chiara, dipinta dopo, le taglia a metà fianco). */
const BARRE = [];
for (let k = 0; k < 8; k++) { const u0 = .13 + k * .092, z = v => u0 + .034 * sin(v * 7.5 + k * 1.7) + .03 * v; BARRE.push([z, v => z(v) + .042]); }
const PINNETTE = [.05, .105, .16, .215];
/* Le pinnette: piccoli triangoli piegati all'indietro, sopra e sotto il peduncolo, tutti in un solo tracciato. */
const pinnette = (c, s, q) => {
  c.beginPath();
  for (const v of [-1, 1]) for (const u of PINNETTE) {
    P.suSpina(s, u, v * .8, q);
    const a = q.ang + PI - v * .75, ca = cos(q.ang), sa = sin(q.ang), L = .1 + u * .5;
    c.moveTo(q.x + ca * .045, q.y + sa * .045); c.lineTo(q.x + cos(a) * L, q.y + sin(a) * L); c.lineTo(q.x - ca * .045, q.y - sa * .045); c.closePath();
  }
  c.lineJoin = 'round'; c.strokeStyle = T.pinnetta.bordo; c.lineWidth = .07; c.stroke(); c.fillStyle = T.pinnetta.base; c.fill();
};

B.specie.registra({
  id: 'sgombro',
  descrizione: 'Non ha la «bolla d\'aria» che tiene a galla gli altri pesci: se smette di nuotare, affonda. Per questo non si ferma mai, nemmeno per dormire.',
  forma: { lx: 1.05, ly: .42 },
  ingombro: { x0: -1.86, y0: -.91, x1: 1.08, y1: .91 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -1.05, .86, fase, ONDA, SU, GIU, { testa: .1 }), luce = [.3, -.45, 1.6], alza = m ? .3 : 0;

    // ---- 1. dietro al corpo: coda a forca, pinnette, le due dorsali, l'anale, la ventrale, la bocca
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .04, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .36, tipo: 'forca', lung: .62, alt: .6, radice: .075, fase: F - 1.9, onda: .14, tinta: T.coda, orlo: ORLO });
    pinnette(c, s, q);
    const a0 = P.suSpina(s, .7, -.9), a1 = P.suSpina(s, .52, -.86), b0 = P.suSpina(s, .37, -.85), b1 = P.suSpina(s, .25, -.8), n0 = P.suSpina(s, .37, .85), n1 = P.suSpina(s, .25, .8);
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: -(PI / 2 + .45 - alza), a1: -(PI - .35 - alza * .6), lung: m ? .44 : .36, profilo: [.85, 1, .8, .5, .3], n: 5, smerlo: .35, onda: .06, fase: F * 2, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: b0.x, y0: b0.y, x1: b1.x, y1: b1.y, a0: -(PI / 2 + .7), a1: -(PI - .25), lung: .27, profilo: [1, .7, .4], n: 4, onda: .06, fase: F * 2 - 1, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: n0.x, y0: n0.y, x1: n1.x, y1: n1.y, a0: PI / 2 + .7, a1: PI - .25, lung: .25, profilo: [1, .7, .4], n: 4, onda: .06, fase: F * 2 - 2, tinta: T.pinna, orlo: ORLO });
    const pv = P.suSpina(s, .62, .95);
    P.pinna(c, { x0: pv.x + .06, y0: pv.y - .05, x1: pv.x - .07, y1: pv.y - .05, a0: PI * .6 + sin(F - .5) * .12, a1: PI * .82 + sin(F - .5) * .12, lung: .28, profilo: [1, .6], n: 3, tinta: T.pinna, righe: false });
    const ce = P.suSpina(s, .868, .42), apri = m ? .42 + b * .38 : .03 + b * .32;
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang + .1, lung: .36, apri, alt: .13, su: .2, tinta: T.ventre, interno: '#8a1240', lingua: '#ff7d9c', bordo: .04 });
    if (m) P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .25, ge.y0 + (ge.y1 - ge.y0) * .25, ge.x1, ge.y1, 4, .055, 1, { spess: .012 });

    // ---- 2. il corpo: onde scure sul dorso, poi la madreperla che le taglia a metà fianco, con un velo d'oro e uno rosa
    P.volume(c, s, T.corpo, { luce, ombra: .08, dentro(cc) {
      P.bande(cc, s, BARRE, ONDE, 10);
      P.fianco(cc, s, u => -.06 + .05 * sin(u * 9), 1.4, T.ventre.base);
      P.fianco(cc, s, u => -.06 + .05 * sin(u * 9), u => .1 + .05 * sin(u * 9), ORO, .04, .9);
      P.fianco(cc, s, .3, .56, ROSA, .1, .82);
    } });
    const g1 = P.suSpina(s, .775, -.55), g2 = P.suSpina(s, .735, 0), g3 = P.suSpina(s, .775, .6);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .035);                               // opercolo
    P.suSpina(s, .55, -.66, q); P.riflesso(c, q.x, q.y, .34, q.ang - .08, .1);

    // ---- 3. sul fianco: la pettorale a punta che rema, con la sua ombra
    const pp = P.suSpina(s, .665, .14), rema = sin(F * 2 + .4), ap = PI * .93 + rema * .3;
    P.ombra(c, pp.x - .12, pp.y + .05, .22, .12, -.25, .25);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .065, x1: pp.x - .02, y1: pp.y + .065, a0: ap + .26 + rema * .08, a1: ap - .3 - rema * .08, lung: .34, profilo: [.55, 1, .78, .45], n: 4, onda: .1, fase: F * 2, passo: .7, tinta: T.pinna, orlo: ORLO, primo: true });

    // ---- 4. la faccia. Calmo: occhione dorato, bocca chiusa. A caccia: occhio rosso tagliato, sopracciglio, bocca aperta coi dentini
    if (m) { const d0 = P.suSpina(s, .93, 1), d1 = P.suSpina(s, 1, 1); P.denti(c, d0.x, d0.y - .01, d1.x + .05, d1.y - .01, 4, .065, -1, { spess: .012 }); }
    const e = P.suSpina(s, .84, -.3);
    P.occhio(c, e.x, e.y, .25, Object.assign({ iride: m ? '#ff3a1e' : '#ffcf2e', pelle: T.corpo, guarda: { x: .55, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .23, .5, .5, T.corpo.bordo, .12);
    c.restore();
  },
});
})();
