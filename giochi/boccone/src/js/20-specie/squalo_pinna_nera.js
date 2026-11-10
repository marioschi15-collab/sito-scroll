/* Boccone — specie: SQUALO PINNA NERA (taglia 5, pattuglia). Squalo di barriera snello color bronzo, ventre chiaro, e il
   segno che lo fa riconoscere da lontano: le punte delle pinne «intinte nell'inchiostro», orlate di chiaro.
   Tutte le pinne sono lame piene (P.lama); la coda sono due lame; la bocca sta sotto il muso (P.fauci).
   A caccia inarca la schiena, abbassa le pettorali, drizza la dorsale e mostra i denti. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, hypot } = Math;

// ---- tinte: bronzo caldo con ombre prugna (niente grigio), ventre crema, punte blu notte al posto del nero
const T = { corpo: P.tinta('#c0904c', '#4a2a5e'), pinna: P.tinta('#b27e40', '#44265a'), lontana: P.tinta('#8f643c', '#3a2052'), ventre: P.tinta('#fff3da', '#e39a6c') };
T.mento = Object.assign({}, P.tinta('#fff0d4', '#dc8f62'), { bordo: T.corpo.bordo });      // il mento ha il bordo scuro del corpo
const NERO = '#2a2250', ORLO = '#fff6dc', VENTRE = T.ventre.base, LAMA = P.alfa('#ffecc4', .55), DORSO = P.alfa(T.corpo.bordo, .2), NEI = P.alfa(T.corpo.bordo, .6);
/* Un siluro: muso lungo e tondo che sporge oltre la bocca (il ventre si ritira da u = .78), peduncolo sottile. */
const SU = P.sagoma([[0, .08], [.1, .14], [.3, .31], [.5, .41], [.68, .43], [.82, .39], [.92, .28], [1, .14]]);
const GIU = P.sagoma([[0, .08], [.1, .13], [.3, .28], [.5, .37], [.66, .38], [.76, .34], [.82, .22], [.9, .16], [1, .09]]);
const ONDA = { amp: .13, onde: .6, testa: .12, potenza: 1.7 };

/* Una lama con la punta scura orlata di chiaro. quota = quanta lama prende la punta (0..1). */
function pinnaNera(c, o, quota) {
  const r = hypot(o.px - o.x0, o.py - o.y0) * quota;
  o.dentro = cc => {
    cc.beginPath(); cc.arc(o.px, o.py, r + .065, 0, TAU); cc.fillStyle = ORLO; cc.fill();
    cc.beginPath(); cc.arc(o.px, o.py, r, 0, TAU); cc.fillStyle = NERO; cc.fill();
  };
  P.lama(c, o);
}

B.specie.registra({
  id: 'squalo_pinna_nera',
  descrizione: 'Lo riconosci dalle punte delle pinne, che sembrano intinte nell\'inchiostro. Fa la ronda in acqua così bassa che spesso la pinna del dorso spunta fuori.',
  forma: { lx: 1.4, ly: .45 },
  ingombro: { x0: -2.5, y0: -1.17, x1: 1.48, y1: 1.0 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(16, -1.4, 1.12, fase, ONDA, SU, GIU, { testa: .24, coda: .03, arco: m ? -.07 : 0 }), luce = [.5, -.5, 2.2];

    // ---- 1. dietro al corpo: pettorale lontana, coda a due lame, seconda dorsale, anale, ventrale, la grande dorsale, la bocca
    const rema = sin(F * 2 + .4), giu = m ? .14 : 0;
    const f0 = P.suSpina(s, .68, .72), f1 = P.suSpina(s, .57, .78);
    P.lama(c, { x0: f0.x, y0: f0.y, x1: f1.x, y1: f1.y, px: f1.x - .2 + giu, py: f1.y + .44 + giu - rema * .03, tinta: T.lontana, punta: NERO, quota: .34 });
    P.suSpina(s, 0, 0, q);
    const ac = q.ang + sin(F - 1.1) * .3, cx = cos(ac), cy = sin(ac);                  // la coda sbatte in ritardo sul corpo
    const X = (a, d) => q.x + cx * a - cy * d, Y = (a, d) => q.y + cy * a + cx * d;    // a = lungo la coda (indietro se negativo), d = di traverso (su se negativo)
    pinnaNera(c, { x0: X(.2, .08), y0: Y(.2, .08), x1: X(-.24, -.03), y1: Y(-.24, -.03), px: X(-.52, .52), py: Y(-.52, .52), tinta: T.pinna, davanti: .1, dietro: .26 }, .44);
    pinnaNera(c, { x0: X(.24, -.08), y0: Y(.24, -.08), x1: X(-.2, .1), y1: Y(-.2, .1), px: X(-.86, -.74), py: Y(-.86, -.74), tinta: T.pinna, davanti: .12, dietro: .24 }, .36);
    const s0 = P.suSpina(s, .23, -.8), s1 = P.suSpina(s, .11, -.8);
    P.lama(c, { x0: s0.x, y0: s0.y, x1: s1.x, y1: s1.y, px: s1.x - .14, py: s1.y - .27, tinta: T.pinna, punta: NERO, quota: .42 });
    const n0 = P.suSpina(s, .21, .8), n1 = P.suSpina(s, .11, .8);
    P.lama(c, { x0: n0.x, y0: n0.y, x1: n1.x, y1: n1.y, px: n1.x - .13, py: n1.y + .23, tinta: T.lontana });
    const v0 = P.suSpina(s, .37, .85), v1 = P.suSpina(s, .26, .85);
    P.lama(c, { x0: v0.x, y0: v0.y, x1: v1.x, y1: v1.y, px: v1.x - .13, py: v1.y + .28, tinta: T.pinna });
    const d0 = P.suSpina(s, .62, -.85), d1 = P.suSpina(s, .4, -.85);
    pinnaNera(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, px: d1.x - .14 + (m ? .1 : 0) + sin(F - .6) * .03, py: d1.y - .72 - (m ? .05 : 0), tinta: T.pinna, davanti: .16, dietro: .26 }, .44);
    const ce = P.suSpina(s, .78, .5), apri = m ? .46 + b * .3 : b * .25;
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang + .02, lung: .4, apri, alt: .14, su: .25, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c' });
    if (apri > .1) P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .15, ge.y0 + (ge.y1 - ge.y0) * .15, ge.x1, ge.y1, 5, .1, 1, { tipo: 'punta', varia: .2 });

    // ---- 2. il corpo: dorso più scuro, ventre chiaro, la lama chiara sul fianco; sopra le branchie e il riflesso
    P.volume(c, s, T.corpo, { luce, ombra: .08, dentro(cc) {
      P.fianco(cc, s, -1.4, -.5, DORSO);
      P.fianco(cc, s, u => .12 + .1 * sin(u * 7 + 1), 1.4, VENTRE);
      P.fianco(cc, s, u => .12 - .3 * sin((u - .14) / .48 * PI), u => .2, LAMA, .14, .62);
      P.macchie(cc, s, { n: 8, seme: 5, u0: .12, u1: .8, v0: -.85, v1: -.3, r0: .018, r1: .034, colore: DORSO, lungo: 1.2 });
    } });
    P.anelli(c, s, .76, .67, 5, T.corpo, { v0: -.42, v1: .32, curva: .012, spess: .03 });
    P.suSpina(s, .74, -.62, q); P.riflesso(c, q.x, q.y, .36, q.ang - .04, .1);

    // ---- 3. sul fianco: la pettorale a falce (a caccia si abbassa)
    const p0 = P.suSpina(s, .67, .42), p1 = P.suSpina(s, .5, .55);
    P.ombra(c, p1.x + .05, p1.y + .14, .36, .15, .45, .28);
    pinnaNera(c, { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, px: p1.x - .4 + giu * 2.2, py: p1.y + .52 + giu + rema * .04, tinta: T.pinna, luce: [p0.x - .1, p0.y - .1, 1.1], davanti: .14, dietro: .26 }, .36);

    // ---- 4. la faccia: denti di sopra, narice, lentiggini del muso, occhio
    if (apri > .1) { const u0 = P.suSpina(s, .82, 1), u1 = P.suSpina(s, .945, 1); P.denti(c, u0.x, u0.y - .01, u1.x, u1.y - .01, 5, .1, -1, { tipo: 'punta', varia: .2, seme: 7 }); }
    if (P.fine(o)) {
      const n = P.suSpina(s, 1, .55);
      c.fillStyle = NEI; c.beginPath(); c.ellipse(n.x + .08, n.y, .035, .02, -.4, 0, TAU);
      for (let i = 0; i < 5; i++) { P.suSpina(s, .97 + i * .008, -.5 + i * .28, q); c.moveTo(q.x + .1 + (i % 2) * .05, q.y); c.arc(q.x + .08 + (i % 2) * .05, q.y, .014, 0, TAU); }
      c.fill();
    }
    const e = P.suSpina(s, .885, -.2);
    P.occhio(c, e.x, e.y, .15, Object.assign({ iride: m ? '#ff3a1e' : '#ffd43c', tipo: m ? 'fessura' : 'tondo', pelle: T.corpo, guarda: { x: .5, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    if (m) P.sopracciglio(c, e.x + .03, e.y - .15, .38, e.ang + .45, T.corpo.bordo, .11);
    c.restore();
  },
});
})();
