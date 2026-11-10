/* Boccone — specie: GHIOZZO (taglia 1, cacciatore). Pesciolino di fondo color sabbia: testone con gli occhioni in cima
   (su due torrette), labbroni carnosi, pinne tonde a ventaglio, puntini azzurri. Il tratto esagerato sono occhi e labbra. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola) e sagoma: testa grossa e schiacciata, corpo che si assottiglia, ventre piatto da pesce di fondo
const T = { corpo: P.tinta('#f4c56c', '#bb5a3c'), ventre: P.tinta('#fff2cf', '#f0a05a'), pinna: P.tinta('#ff9f3a', '#e2481e'), labbra: P.tinta('#ff6f8f') };
const SELLA = P.alfa('#c0623a', .55), AZZURRO = '#27b6ff', CUORE = '#d2f6ff', ORLO = '#49d2ff';
const SU = P.sagoma([[0, .13], [.2, .28], [.5, .44], [.74, .6], [.9, .62], [1, .46]]);
const GIU = P.sagoma([[0, .13], [.2, .24], [.5, .34], [.74, .43], [.9, .43], [1, .32]]);
const ONDA = { amp: .13, onde: .6, testa: .12 };
const SELLE = [[.2, .29], [.4, .5], [.6, .69]].map(z => [v => z[0] - .03 * v, v => z[1] - .03 * v]);   // tre selle scure sul dorso
/* La torretta dell'occhio: un bozzo della tinta del corpo da cui sporge l'occhio. Si disegna PRIMA del corpo. */
const torretta = (c, x, y, r, colore, bordo) => {
  c.beginPath(); c.ellipse(x, y, r, r * .96, 0, 0, TAU);
  c.strokeStyle = bordo; c.lineWidth = P.BORDO * 2; c.stroke(); c.fillStyle = colore; c.fill();
};
/* L'occhio lontano, che spunta da dietro la testa: bulbo e pupilla in due colpi, senza sfumature. */
const occhioLontano = (c, x, y, r, iride) => {
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#dfe8fb'; c.fill();
  c.beginPath(); c.arc(x + r * .3, y + r * .05, r * .6, 0, TAU); c.fillStyle = iride; c.fill();
  c.beginPath(); c.arc(x + r * .36, y + r * .06, r * .34, 0, TAU); c.fillStyle = '#120a22'; c.fill();
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
  id: 'ghiozzo',
  descrizione: 'Con le pinne della pancia, unite a ventosa, si attacca ai sassi anche dove la corrente tira. Certi ghiozzi dividono la tana con un gamberetto quasi cieco: lui scava, il ghiozzo fa la guardia.',
  forma: { lx: 1.0, ly: .55 },
  ingombro: { x0: -1.72, y0: -1.05, x1: 1.24, y1: .74 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -1.05, .68, fase, ONDA, SU, GIU, { testa: .32 }), luce = [.32, -.5, 1.7];
    const alza = m ? .28 : 0, e = P.suSpina(s, .84, -.8), R = .3, iride = m ? '#ff3a1e' : '#19b89c';

    // ---- 1. dietro al corpo: coda tonda, due dorsali, anale, la ventosa della pancia, le torrette degli occhi
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .38, tipo: 'ventaglio', lung: .56, alt: .5, radice: .12, fase: F - 1.9, onda: .2, smerlo: .5, tinta: T.pinna, orlo: ORLO });
    const a0 = P.suSpina(s, .66, -.9), a1 = P.suSpina(s, .46, -.85), b0 = P.suSpina(s, .42, -.85), b1 = P.suSpina(s, .12, -.8), an0 = P.suSpina(s, .42, .85), an1 = P.suSpina(s, .14, .8);
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: -(PI / 2 + .3 - alza), a1: -(PI - .6 - alza * .5), lung: m ? .5 : .42, profilo: [.7, 1, .95, .7], n: 5, smerlo: .5, onda: .08, fase: F * 2, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: b0.x, y0: b0.y, x1: b1.x, y1: b1.y, a0: -(PI / 2 + .5 - alza), a1: -(PI - .4), lung: .36, profilo: [.8, 1, .95, .8], n: 6, smerlo: .4, onda: .08, fase: F * 2 - 1, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: an0.x, y0: an0.y, x1: an1.x, y1: an1.y, a0: PI / 2 + .6, a1: PI - .4, lung: .28, profilo: [.8, 1, .9, .75], n: 5, smerlo: .4, onda: .08, fase: F * 2 - 2, tinta: T.pinna, orlo: ORLO });
    const pv = P.suSpina(s, .66, .95);
    P.pinna(c, { x0: pv.x + .1, y0: pv.y - .06, x1: pv.x - .1, y1: pv.y - .06, a0: PI * .42, a1: PI * .84, lung: .27, profilo: [.8, 1, .9], n: 4, smerlo: .4, tinta: T.pinna, righe: false });
    torretta(c, e.x + .2, e.y - .05, R * 1.05, T.corpo.ombra, T.corpo.bordo);                      // l'occhio lontano, con la sua torretta
    occhioLontano(c, e.x + .23, e.y - .05, R * .84, iride);
    torretta(c, e.x, e.y, R * 1.2, T.corpo.base, T.corpo.bordo);

    // ---- 2. il corpo: selle scure sul dorso, ventre chiaro, puntini azzurri
    P.volume(c, s, T.corpo, { luce, ombra: .09, dentro(cc) {
      P.bande(cc, s, SELLE, SELLA);
      P.fianco(cc, s, u => .25 - .15 * sin(u * PI) + max(0, u - .78) * 6, 1.5, T.ventre.base);   // verso il mento si chiude a punta
      P.macchie(cc, s, { n: 10, seme: 5, u0: .08, u1: .82, v0: -.7, v1: .3, r0: .04, r1: .062, colore: AZZURRO, cuore: CUORE, lungo: 1 });
    } });
    const g1 = P.suSpina(s, .75, -.45), g2 = P.suSpina(s, .7, .05), g3 = P.suSpina(s, .76, .6);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .035);                               // opercolo
    P.suSpina(s, .6, -.6, q); P.riflesso(c, q.x, q.y, .3, q.ang - .1, .12);

    // ---- 3. sul fianco: la pettorale tonda che rema, con la sua ombra
    const pp = P.suSpina(s, .66, .2), rema = sin(F * 2 + .4), ap = PI * .92 + rema * .35;
    P.ombra(c, pp.x - .18, pp.y + .06, .34, .22, -.3, .25);
    P.pinna(c, { x0: pp.x + .05, y0: pp.y - .13, x1: pp.x - .02, y1: pp.y + .13, a0: ap + .58 + rema * .1, a1: ap - .58 - rema * .1, lung: .45, profilo: [.8, 1, 1.05, 1, .8], n: 7, smerlo: .45, onda: .1, fase: F * 2, passo: .7, tinta: T.pinna, orlo: ORLO, primo: true });

    // ---- 4. la faccia. Calmo: occhione verde acqua, labbroni chiusi. A caccia: occhio rosso tagliato, sopracciglio, denti
    P.occhio(c, e.x, e.y, R, Object.assign({ iride, pelle: T.corpo, guarda: { x: .55, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .06, e.y - .27, .56, .5, T.corpo.bordo, .13);
    const l = P.suSpina(s, 1, .3);
    const lx = l.x + .3, ly = l.y + .02, la = l.ang + .08, lr = m ? .24 : .21, apri = m ? max(b, .45) : b * .5;
    P.labbra(c, lx, ly, la, lr, apri, T.labbra);
    if (m) dentini(c, lx, ly, la, lr, apri);
    c.restore();
  },
});
})();
