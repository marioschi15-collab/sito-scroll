/* Boccone — specie: PESCE BALESTRA (taglia 3, scattante). Corpo a rombo, occhio piccolo messo in alto e all'indietro,
   bocca minuscola con i dentoni sempre in vista (il tratto esagerato), disegni geometrici: fascia blu notte sull'occhio
   filettata d'azzurro, baffo giallo, sbarre oblique sul fianco. La spina «a grilletto» sta ripiegata da calmo e scatta
   dritta a caccia. Nuota come i balestra veri: corpo quasi fermo, dorsale e anale che ondeggiano.
   RITOCCO PER LO STILE «FILM D'ANIMAZIONE»: era diventato pallido. Tinte più sature (dorso arancio dorato, pinne di un
   azzurro pieno con l'ombra indaco e piene fino in punta); il corpo ha ombra: 0 e il ventre bianco ha la sua sfumatura
   calda (il velo viola della cassetta lo ingrigiva), più le luci del bordo fatte in casa (luciBordo). */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola) e sagoma: un rombo, alto a metà corpo, con la fronte lunga e dritta
const T = { corpo: P.tinta('#ffb42a', '#f0561a'), ventre: P.tinta('#fffdf2', '#f6b088'), notte: P.tinta('#2b2a80'), pinna: P.tinta('#4aaeff', '#2a3fd0'), coda: P.tinta('#ffd23a', '#ff6a14'), labbra: P.tinta('#ffcf24', '#ff6a14') };
const NOTTE = T.notte.base, BLU = '#2f9dff', GIALLO = '#ffd21f';
const SU = P.sagoma([[0, .12], [.12, .22], [.32, .56], [.5, .8], [.62, .76], [.8, .5], [.92, .3], [1, .18]]);
const GIU = P.sagoma([[0, .12], [.12, .22], [.32, .56], [.5, .78], [.62, .72], [.8, .46], [.92, .28], [1, .17]]);
const ONDA = { amp: .06, onde: .45, testa: .2 };                      // corpo rigido: spingono le pinne
/* La fascia dell'occhio scende obliqua dalla fronte al petto; davanti e dietro ha un filetto azzurro. */
const fa = v => .615 - .035 * v, fb = v => .765 - .055 * v;
const FASCIA = [[fa, fb]], FILETTI = [[v => fa(v) - .034, v => fa(v) - .012], [v => fb(v) + .012, v => fb(v) + .034], [.905, .93]];
/* Le sbarre oblique sul fianco di dietro: tre quadrilateri in un colpo solo, dal mezzo del corpo al ventre. */
/* Le luci del bordo fatte in casa (il volume del corpo ha ombra: 0, perché il velo viola della cassetta ingrigiva il giallo,
   la crema e il bianco: qui ogni zona ha già la sua sfumatura, con l'ombra del suo colore). Un filo di luce lungo il dorso
   e il controluce color acqua lungo il ventre. Si chiama per ultima dentro `dentro`. */
const luciBordo = (cc, s) => { P.fianco(cc, s, -1.4, -.93, 'rgba(255,255,255,.28)', 0, 1, 8); P.fianco(cc, s, .9, 1.4, 'rgba(200,243,255,.42)', 0, 1, 8); };
const SBARRE = [.17, .285, .4];
const sbarre = (c, s) => {
  const q = {}; c.beginPath();
  for (const u0 of SBARRE) {
    P.suSpina(s, u0 + .012, -.22, q); c.moveTo(q.x, q.y); P.suSpina(s, u0 + .045, -.22, q); c.lineTo(q.x, q.y);       // a cuneo: sottili in alto
    P.suSpina(s, u0 + .17, 1.2, q); c.lineTo(q.x, q.y); P.suSpina(s, u0 + .1, 1.2, q); c.lineTo(q.x, q.y); c.closePath();
  }
  c.fillStyle = NOTTE; c.fill();
};
/* I dentoni: due incisivi di sopra che sporgono dalle labbra anche a bocca quasi chiusa; a caccia (sotto = true) si vedono
   anche i due di sotto. Stessi x, y, ang, r, apri delle labbra. */
const dentoni = (c, x, y, ang, r, apri, sotto) => {
  c.save(); c.translate(x, y); c.rotate(ang - apri * .5);
  P.denti(c, -.1 * r, .04 * r, .66 * r, -.14 * r, 2, r * (.34 + .3 * apri), -1, { tipo: 'piatto', spess: .014 });
  if (sotto) { c.rotate(apri * 1.35); P.denti(c, -.1 * r, -.02 * r, .6 * r, .12 * r, 2, r * (.2 + .3 * apri), 1, { tipo: 'piatto', spess: .014 }); }
  c.restore();
};

B.specie.registra({
  id: 'pesce_balestra',
  descrizione: 'Sulla schiena ha una spina che si blocca dritta come il grilletto di una balestra: incastrato in una fessura, nessuno riesce più a tirarlo fuori. Con i suoi dentoni sgranocchia ricci e conchiglie.',
  forma: { lx: 1.0, ly: .8 },
  ingombro: { x0: -1.49, y0: -1.38, x1: 1.3, y1: 1.22 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.88, .92, fase, ONDA, SU, GIU, { testa: .12 }), luce = [.2, -.5, 1.8];

    // ---- 1. dietro al corpo: coda, dorsale e anale che ondeggiano, il grilletto con la sua vela, la spina del ventre
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .06, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .3, tipo: 'ventaglio', lung: .5, alt: .46, radice: .12, fase: F - 1.9, onda: .2, tinta: T.coda, orlo: BLU });
    for (const v of [-1, 1]) {
      const a = P.suSpina(s, .45, v * .92), z = P.suSpina(s, .09, v * .85);
      P.pinna(c, { x0: a.x, y0: a.y, x1: z.x, y1: z.y, a0: v * (PI / 2 + .4), a1: v * (PI - .3), lung: .52, profilo: [.85, 1, .9, .7, .5, .36], n: 9, smerlo: .2, piega: v * -.08,
        onda: .17, fase: F * 2 + (v > 0 ? PI : 0), passo: .85, tinta: T.pinna, orlo: '#e8f8ff', velo: 1 });
    }
    const t0 = P.suSpina(s, .62, -.94), t1 = P.suSpina(s, .47, -.9), ag = m ? -(PI / 2 + .2) : -(PI - .85);       // il grilletto: giù da calmo, dritto a caccia
    P.pinna(c, { x0: t0.x, y0: t0.y, x1: t1.x, y1: t1.y, a0: ag, a1: -(PI - .25), lung: m ? .56 : .44, profilo: [.94, .7, .4], n: 3, tinta: T.pinna, orlo: '#e8f8ff', righe: false, velo: 1 });
    P.corno(c, t0.x - .02, t0.y + .05, ag, m ? .62 : .5, .13, T.notte, { curva: -.12, gonfio: .6 });
    const pv = P.suSpina(s, .5, 1);
    P.corno(c, pv.x + .04, pv.y - .08, PI * .62, .26, .15, T.ventre, { curva: .25 });

    // ---- 2. il corpo: ventre bianco, sbarre oblique, baffo giallo, fascia dell'occhio blu notte coi filetti azzurri
    P.volume(c, s, T.corpo, { luce, ombra: 0, dentro(cc) {
      P.fianco(cc, s, u => -.06 - .3 * sin(u * PI), 1.4, P.alfa(T.ventre.base, .5));                // il ventre: due passate, sfuma nel fianco
      P.fianco(cc, s, u => .14 - .3 * sin(u * PI), 1.4, P.sfumatura(cc, T.ventre, [.2, 0, 1.7]));
      sbarre(cc, s);
      P.fianco(cc, s, .1, .3, GIALLO, .7, 1.1, 5);
      P.bande(cc, s, FASCIA, NOTTE);
      P.bande(cc, s, FILETTI, BLU, 4);
      luciBordo(cc, s);
    } });
    if (P.fine(o)) P.bozzi(c, P.puntiSuSpina(s, 3, .06, .15, -.3).concat(P.puntiSuSpina(s, 3, .06, .15, .3)), .028, T.notte);   // le spinette del gambo della coda
    P.riflesso(c, .0, -.52, .4, -.3, .13);

    // ---- 3. sul fianco: la fessura della branchia e la pettorale che rema, con la sua ombra
    const pp = P.suSpina(s, .6, .16), rema = sin(F * 2 + .4), ap = PI * .9 + rema * .35;
    const g1 = P.suSpina(s, .63, -.22), g2 = P.suSpina(s, .615, 0);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, pp.x + .06, pp.y - .02], T.notte, .04);
    P.ombra(c, pp.x - .13, pp.y + .05, .24, .16, -.3, .25);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .09, x1: pp.x - .02, y1: pp.y + .09, a0: ap + .5 + rema * .1, a1: ap - .5 - rema * .1, lung: .36, profilo: [.75, 1, 1, .8, .6], n: 5, onda: .1, fase: F * 2, passo: .7, tinta: T.pinna, orlo: '#e8f8ff', primo: true });

    // ---- 4. la faccia. Calmo: occhio ambrato, labbra socchiuse sui dentoni. A caccia: occhio rosso tagliato, sopracciglio, bocca spalancata
    const e = P.suSpina(s, .7, -.5);
    P.occhio(c, e.x, e.y, .2, Object.assign({ iride: m ? '#ff3a1e' : '#ffa51c', pelle: T.notte, guarda: { x: .5, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .2, .44, e.ang + .5, T.notte.bordo, .11);
    const l = P.suSpina(s, 1, .1), lx = l.x + .1, ly = l.y + .01, lr = m ? .23 : .2, apri = m ? max(b, .55) : .22 + b * .3;
    P.labbra(c, lx, ly, l.ang, lr, apri, T.labbra);
    dentoni(c, lx, ly, l.ang, lr, apri, m);
    c.restore();
  },
});
})();
