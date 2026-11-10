/* Boccone — specie: PESCE SCATOLA (taglia 2, pigro, corazza). Un cubetto giallo a pois blu notte: la corazza è rigida, quindi
   il corpo non ondeggia ma dondola tutto intero, e a spingerlo sono le pinnette minuscole che frullano e la codina su un
   gambo. Faccia in discesa, boccuccia a bacio in basso, due cornetti sopra gli occhi. Il tratto esagerato è la forma a dado. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola) e sagoma: una scatola dagli spigoli tondi, col muso in discesa e la bocca in basso
const T = { corpo: P.tinta('#ffd21f', '#ff7a14'), pinna: P.tinta('#ff8f1f', '#e0341e'), labbra: P.tinta('#ff6f8f') };
const POIS = '#2e2a86', SOPRA = P.alfa('#fff6a8', .55), SOTTO = P.alfa('#ff8a1e', .5), ORLO = '#ffe98a';
const SU = P.sagoma([[0, .42], [.07, .62], [.2, .7], [.6, .72], [.78, .64], [.9, .34], [1, .03]]);
const GIU = P.sagoma([[0, .4], [.07, .6], [.2, .68], [.65, .68], [.84, .66], [.94, .56], [1, .4]]);
/* I dentini in vista fra le labbra aperte (P.labbra li lascia dietro le labbra): stessi x, y, ang, r, apri delle labbra. */
const dentini = (c, x, y, ang, r, apri) => {
  c.save(); c.translate(x, y); c.rotate(ang - apri * .5);
  P.denti(c, -.12 * r, .03 * r, .52 * r, -.1 * r, 3, r * (.12 + .22 * apri), -1, { tipo: 'piatto', spess: .012 });
  c.rotate(apri * 1.35);
  P.denti(c, -.12 * r, -.03 * r, .48 * r, .09 * r, 3, r * (.08 + .18 * apri), 1, { tipo: 'piatto', spess: .012 });
  c.restore();
};

B.specie.registra({
  id: 'pesce_scatola',
  descrizione: 'Sotto la pelle ha una vera scatola d\'osso, fatta di piastrine a sei lati saldate fra loro: non può piegarsi, e nuota remando con le pinnette come un piccolo elicottero.',
  forma: { lx: .9, ly: .72 },
  ingombro: { x0: -1.69, y0: -1.13, x1: 1.22, y1: 1.02 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    c.translate(0, sin(F) * .03); c.rotate(sin(F - .8) * .055);                                    // la scatola dondola tutta intera
    const s = P.spinaPesce(12, -.8, .8, 0, null, SU, GIU, { testa: .14, coda: .1 }), luce = [.3, -.5, 2], apre = m ? 1.25 : 1;

    // ---- 1. dietro al corpo: codina a ventaglio sul suo gambo, dorsale e anale minuscole che frullano, i due cornetti
    const scod = sin(F - 1.1) * .45, gx = -.72, gy = .06;
    P.coda(c, { x: gx - .26, y: gy + sin(scod * .5) * .26, ang: PI + scod, tipo: 'ventaglio', lung: .44 * apre, alt: .38 * apre, radice: .09, fase: F - 1.9, onda: .2, smerlo: .4, tinta: T.pinna, orlo: ORLO });
    P.corno(c, gx, gy, PI + scod * .5, .42, .34, T.corpo, { punta: T.corpo.base, gonfio: 1 });     // il gambo della coda
    P.pinna(c, { x0: -.3, y0: -.64, x1: -.56, y1: -.6, a0: -PI / 2 - .25, a1: -PI + .45, lung: .3 * apre, profilo: [.8, 1, .95, .7], n: 5, smerlo: .4, onda: .22, fase: F * 3, passo: .9, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: -.3, y0: .6, x1: -.56, y1: .56, a0: PI / 2 + .25, a1: PI - .45, lung: .28 * apre, profilo: [.8, 1, .95, .7], n: 5, smerlo: .4, onda: .22, fase: F * 3 + 1.6, passo: .9, tinta: T.pinna, orlo: ORLO });
    const e = P.suSpina(s, .76, -.36), punta = m ? '#fff2a0' : T.pinna.luce;
    P.corno(c, e.x + .2, e.y - .2, -PI / 2 + (m ? .95 : .8), m ? .46 : .36, .2, T.pinna, { curva: -.25, punta });   // cornetto lontano
    P.corno(c, e.x + .06, e.y - .22, -PI / 2 + (m ? .6 : .42), m ? .56 : .44, .23, T.pinna, { curva: -.25, punta });

    // ---- 2. la scatola: faccia di sopra chiara, faccia di sotto calda, pois blu notte, spigoli incisi
    P.volume(c, s, T.corpo, { luce, ombra: .1, dentro(cc) {
      P.fianco(cc, s, -1.4, -.64, SOPRA);
      P.fianco(cc, s, .66, 1.4, SOTTO);
      P.macchie(cc, s, { n: 15, seme: 3, u0: .05, u1: .7, v0: -.9, v1: .9, r0: .055, r1: .085, colore: POIS, lungo: 1 });
    } });
    P.solco(c, P.puntiSuSpina(s, 5, .07, .74, -.64), T.corpo, .035);
    P.solco(c, P.puntiSuSpina(s, 5, .07, .86, .66), T.corpo, .035);
    P.riflesso(c, .06, -.52, .36, -.05, .08);

    // ---- 3. sul fianco: la pettorale piccola che frulla, con la sua ombra
    const rema = sin(F * 3 + .4), ap = PI * .95 + rema * .3;
    P.ombra(c, .04, .2, .28, .22, -.2, .25);
    P.pinna(c, { x0: .2, y0: .06, x1: .17, y1: .26, a0: ap + .7 + rema * .1, a1: ap - .7 - rema * .1, lung: .3 * apre, profilo: [.8, 1, 1.05, 1, .8], n: 6, smerlo: .45, onda: .14, fase: F * 3, passo: .8, tinta: T.pinna, orlo: ORLO, primo: true });

    // ---- 4. la faccia. Calmo: occhione azzurro, gota rosa, bacio chiuso. A caccia: occhio rosso tagliato, sopracciglio, dentoni
    if (!m) P.guancia(c, e.x + .12, e.y + .36, .15);
    P.occhio(c, e.x, e.y, .27, Object.assign({ iride: m ? '#ff3a1e' : '#2a8cff', pelle: T.corpo, guarda: { x: .5, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .06, e.y - .25, .56, .5, T.corpo.bordo, .13);
    const lx = .97, ly = .2, lr = m ? .2 : .18, apri = m ? max(b, .45) : b * .5;
    P.labbra(c, lx, ly, .1, lr, apri, T.labbra);
    if (m) dentini(c, lx, ly, .1, lr, apri);
    c.restore();
  },
});
})();
