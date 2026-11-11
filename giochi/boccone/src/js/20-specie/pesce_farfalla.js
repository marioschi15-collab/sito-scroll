/* Boccone — specie: PESCE FARFALLA (taglia 1, timido). Disco alto e sottile, bianco davanti e giallo dietro, con la banda
   scura che nasconde l'occhio vero, il finto occhio vicino alla coda e il muso lungo a pinzetta (il tratto esagerato).
   Il muso fa parte della spina del corpo: così la fronte incavata resta una curva sola.
   RITOCCO PER LO STILE «FILM D'ANIMAZIONE»: il velo d'ombra viola della cassetta sporcava la maschera scura e la parte
   bianca. Ora il corpo ha ombra: 0 e ogni zona ha la sua sfumatura (bianco con l'ombra azzurra chiara, giallo con l'ombra
   arancio, maschera blu notte), più le luci del bordo fatte in casa (luciBordo). */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola): bianco con l'ombra azzurra, giallo con l'ombra arancio, «nero» blu notte
const T = { bianco: P.tinta('#fbfcff', '#a4bef8'), corpo: P.tinta('#ffd21f', '#ff6a14'), notte: P.tinta('#2b2a86'), pinna: P.tinta('#ffcf24', '#ff6a14'),
  pett: P.tinta('#ffe98a', '#ffa23c'), labbra: P.tinta('#ff6f8f') };
const ORLO = '#fff8d6', LINEA = P.alfa('#8f8ae6', .55);
// la spina va dalla coda (u = 0) alla punta del muso (u = 1): il disco finisce a u ≈ .76, poi c'è la pinzetta
const SU = P.sagoma([[0, .14], [.08, .3], [.22, .72], [.4, .96], [.56, .92], [.68, .72], [.77, .46], [.85, .22], [.92, .13], [1, .1]]);
const GIU = P.sagoma([[0, .14], [.08, .3], [.22, .7], [.4, .92], [.56, .86], [.68, .64], [.77, .38], [.85, .19], [.92, .12], [1, .09]]);
const ONDA = { amp: .1, onde: .5, testa: .14 };
const BANDA_OCCHIO = [v => .665 + .03 * (1 - v * v), v => .785 + .03 * (1 - v * v)];
/* Dove comincia il bianco, dal dorso in giù: niente vicino alla coda, poi sale fino a lasciare gialla solo la schiena;
   dalla banda dell'occhio in avanti il muso è tutto bianco. */
const liscio = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const orloBianco = u => u < .5 ? 1.35 - 1.95 * liscio((u - .12) / .38) : u < .7 ? -.6 - (u - .5) : -.8 - (u - .7) * 7;
/* Le luci del bordo fatte in casa (il volume del corpo ha ombra: 0, perché il velo viola della cassetta ingrigiva il giallo,
   la crema e il bianco: qui ogni zona ha già la sua sfumatura, con l'ombra del suo colore). Un filo di luce lungo il dorso
   e il controluce color acqua lungo il ventre. Si chiama per ultima dentro `dentro`. */
const luciBordo = (cc, s) => { P.fianco(cc, s, -1.4, -.93, 'rgba(255,255,255,.28)', 0, 1, 8); P.fianco(cc, s, .9, 1.4, 'rgba(200,243,255,.42)', 0, 1, 8); };
const LINEE = [.34, .42, .5, .58];                                    // le righine oblique sul bianco
const righine = (c, s) => {
  const q = {}; c.beginPath();
  for (const u0 of LINEE) for (let i = 0; i <= 4; i++) { const v = orloBianco(u0) + .14 + (.9 - orloBianco(u0)) * i / 4; P.suSpina(s, u0 + .05 * v, v, q); if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); }
  c.lineCap = 'round'; c.strokeStyle = LINEA; c.lineWidth = .028; c.stroke();
};
/* Il finto occhio: macchia scura cerchiata di bianco, con un lumino che la fa sembrare viva. */
const fintoOcchio = (c, x, y, r) => {
  c.beginPath(); c.arc(x, y, r * 1.36, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = T.notte.base; c.fill();
  c.beginPath(); c.arc(x + r * .3, y - r * .34, r * .3, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
};
/* I dentini di sopra, in vista fra le labbra aperte (P.labbra li lascia dietro le labbra): stessi x, y, ang, r, apri delle labbra.
   La pinzetta è minuscola: una fila sola basta. */
const dentini = (c, x, y, ang, r, apri) => {
  c.save(); c.translate(x, y); c.rotate(ang - apri * .5);
  P.denti(c, -.12 * r, .03 * r, .52 * r, -.1 * r, 3, r * (.14 + .26 * apri), -1, { spess: .012 });
  c.restore();
};

B.specie.registra({
  id: 'pesce_farfalla',
  descrizione: 'Con il muso a pinzetta pesca i bocconi nelle fessure dei coralli. La banda scura nasconde l\'occhio vero e la macchia vicino alla coda ne finge un altro: chi lo attacca sbaglia direzione, e lui scappa dall\'altra parte.',
  forma: { lx: 1.0, ly: .95 },
  ingombro: { x0: -1.33, y0: -1.13, x1: 1.36, y1: 1.24 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(16, -.8, 1.1, fase, ONDA, SU, GIU, { testa: .08 }), luce = [.25, -.5, 1.8], alza = m ? .22 : 0;

    // ---- 1. dietro al corpo: coda, dorsale spinosa, anale tonda, ventrale a punta
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .06, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .34, tipo: 'tronca', lung: .44, alt: .42, radice: .13, fase: F - 1.9, onda: .2, tinta: T.pinna, orlo: ORLO });
    const d0 = P.suSpina(s, .68, -.92), d1 = P.suSpina(s, .05, -.85), a0 = P.suSpina(s, .52, .92), a1 = P.suSpina(s, .05, .85);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -(PI / 2 + .15 - alza), a1: -(PI - .55 - alza * .4), lung: .6, profilo: [.5, .58, .66, .74, .84, .96, 1, .86], n: 10, smerlo: .55, piega: -.1,
      onda: .06, fase: F * 2, passo: .5, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: PI / 2 + .5 - alza, a1: PI - .55, lung: .58, profilo: [.4, .7, .92, 1, .84], n: 7, smerlo: .3, piega: .1,
      onda: .06, fase: F * 2 - 1, passo: .5, tinta: T.pinna, orlo: ORLO });
    const pv = P.suSpina(s, .6, .96);
    P.pinna(c, { x0: pv.x + .06, y0: pv.y - .05, x1: pv.x - .09, y1: pv.y - .05, a0: PI * .6 + sin(F - .5) * .1, a1: PI * .8 + sin(F - .5) * .1, lung: .46, profilo: [1, .55], n: 3, piega: .12, tinta: T.pinna, righe: false });

    // ---- 2. il corpo: giallo, con il bianco dipinto su fianco e muso (resta gialla la schiena, la coda e la punta della pinzetta), banda scura sull'occhio
    P.volume(c, s, T.corpo, { luce, ombra: 0, dentro(cc) {
      P.fianco(cc, s, orloBianco, 1.5, P.sfumatura(cc, T.bianco, luce), .1, .93, 16);
      if (P.fine(o)) righine(cc, s);
      P.banda(cc, s, BANDA_OCCHIO[0], BANDA_OCCHIO[1], P.sfumatura(cc, T.notte, [.5, -.6, 1.9]));
      luciBordo(cc, s);
    } });
    P.suSpina(s, .17, -.28, q); fintoOcchio(c, q.x, q.y, .12);
    const g1 = P.suSpina(s, .63, -.45), g2 = P.suSpina(s, .595, 0), g3 = P.suSpina(s, .63, .5);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.bianco, .035);                               // opercolo
    P.riflesso(c, .14, -.66, .44, -.2, .14);

    // ---- 3. sul fianco: la pettorale chiara che rema, con la sua ombra
    const pp = P.suSpina(s, .56, .22), rema = sin(F * 2 + .4), ap = PI * .9 + rema * .35;
    P.ombra(c, pp.x - .14, pp.y + .05, .26, .18, -.3, .22);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .09, x1: pp.x - .02, y1: pp.y + .09, a0: ap + .5 + rema * .1, a1: ap - .5 - rema * .1, lung: .42, profilo: [.75, 1, 1, .8, .6], n: 5, onda: .1, fase: F * 2, passo: .7, tinta: T.pett, orlo: '#ffffff', primo: true });

    // ---- 4. la faccia. Calmo: occhio ambrato dentro la banda, pinzetta chiusa. A caccia: occhio rosso tagliato, sopracciglio, pinzetta aperta coi dentini
    const e = P.suSpina(s, .745, -.34);
    P.occhio(c, e.x, e.y, .21, Object.assign({ iride: m ? '#ff3a1e' : '#ffa51c', pelle: T.notte, guarda: { x: .5, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .2, .44, .5, T.notte.bordo, .11);
    const l = P.suSpina(s, 1, 0), lx = l.x + .08, ly = l.y + .01, lr = m ? .11 : .09, apri = m ? max(b, .5) : b * .5;
    P.labbra(c, lx, ly, l.ang, lr, apri, T.labbra);
    if (m) dentini(c, lx, ly, l.ang, lr, apri);
    c.restore();
  },
});
})();
