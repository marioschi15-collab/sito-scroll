/* Boccone — specie: PESCE SEGA (taglia 5, scattante). Sembra uno squalo ma è parente delle razze: corpo color oliva dal
   ventre piatto e chiaro, pettorali larghe come ali, due pinne del dorso alte e uguali piantate indietro, coda da squalo.
   IL SUO SEGNO: il rostro, una lunga lama piatta color sabbia con una fila di denti d'avorio per lato, che tiene davanti
   a sé come una spada. Il rostro si disegna prima del corpo (la testa ne copre la radice); i denti sono due P.denti.
   A caccia alza la sega e ne sfodera i denti (più lunghi), ingobbisce la schiena, drizza le dorsali e apre la bocca
   che sta sotto la testa. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max } = Math;

// ---- tinte: oliva dorato con ombre calde (mai grigie), ventre crema, sega color sabbia, punte delle pinne chiare
const T = { corpo: P.tinta('#b3b548', '#5a4030'), pinna: P.tinta('#a2ab3e', '#4e3a34'), lontana: P.tinta('#7e8a3a', '#40303a'), ventre: P.tinta('#fff4d2', '#e0a060'), sega: P.tinta('#ecd06a', '#b0642c') };
T.mento = Object.assign({}, P.tinta('#fff0cc', '#dc9a5e'), { bordo: T.corpo.bordo });      // il mento ha il bordo scuro del corpo
const VENTRE = T.ventre.base, DORSO = P.alfa('#4a5a2a', .3), SABBIA = P.alfa('#fff2a8', .62), NEI = P.alfa(T.corpo.bordo, .55), PUNTA = '#f3e58c', CRESTA = P.alfa('#fff6c8', .5);
const DENTI_SEGA = { tipo: 'punta', largo: .78, bordo: T.sega.bordo, spess: .03, colore: '#fff8e2' }, FORI = P.alfa(T.sega.bordo, .5);
/* Uno squalo dal ventre piatto: la testa si schiaccia e si allunga fino alla radice della sega (il ventre si ritira da
   u = .74 per far posto alla bocca). */
const SU = P.sagoma([[0, .07], [.1, .13], [.3, .3], [.5, .42], [.68, .45], [.82, .4], [.93, .28], [1, .16]]);
const GIU = P.sagoma([[0, .07], [.1, .12], [.3, .24], [.5, .33], [.66, .35], [.74, .33], [.81, .22], [.9, .16], [1, .11]]);
const LAMA_SEGA = P.sagoma([[0, .14], [.14, .125], [.55, .105], [.92, .09], [1, .075]]);    // mezza larghezza del rostro, dalla radice alla punta
const ONDA = { amp: .12, onde: .7, testa: .1, potenza: 1.7 };
const PANCIA = u => .14 + .1 * sin(u * 8 + 1) + max(0, u - .9) * 13;      // l'orlo del ventre chiaro: verso il muso si chiude a punta
const NZ = 7, LS = 1.34;                                                  // denti per lato, lunghezza del rostro

/* Il rostro: prima le due file di denti (le radici restano sotto la lama), poi la lama lucida con la costola chiara in
   mezzo, il solco e i forellini alla radice dei denti. (x, y) radice, ang direzione, zanne = lunghezza dei denti. */
function sega(c, x, y, ang, zanne, fine) {
  const ca = cos(ang), sa = sin(ang);
  for (let v = 1; v >= -1; v -= 2) {                                      // 1 = la fila di sopra, -1 quella di sotto
    const w0 = .095 * v, w1 = .06 * v;
    P.denti(c, x + ca * LS * .14 + sa * w0, y + sa * LS * .14 - ca * w0, x + ca * LS * .98 + sa * w1, y + sa * LS * .98 - ca * w1, NZ, zanne, v, DENTI_SEGA);
  }
  const sp = P.spina(5, (u, p) => { p.x = x + ca * LS * u; p.y = y + sa * LS * u; }, LAMA_SEGA, LAMA_SEGA, { testa: .08 });
  P.volume(c, sp, T.sega, { luce: [x + ca * LS * .62 + sa * .2, y + sa * LS * .62 - ca * .2, LS * .85], ombra: .035, dentro(cc) { P.fianco(cc, sp, -.34, .2, CRESTA, .04, 1); } });
  if (!fine) return;
  P.solco(c, [x + ca * LS * .2, y + sa * LS * .2, x + ca * LS * .55, y + sa * LS * .55, x + ca * LS * .92, y + sa * LS * .92], T.sega, .026);
  c.beginPath();
  for (let v = 1; v >= -1; v -= 2) for (let i = 0; i < NZ; i++) {
    const k = .14 + .84 * (i + .5) / NZ, w = (.082 - .03 * k) * v, px = x + ca * LS * k + sa * w, py = y + sa * LS * k - ca * w;
    c.moveTo(px + .017, py); c.arc(px, py, .017, 0, TAU);
  }
  c.fillStyle = FORI; c.fill();
}

B.specie.registra({
  id: 'pesce_sega',
  descrizione: 'La sega non serve a tagliare il legno: è piena di sensori che sentono i pesci nascosti nel fango, e con un colpo di lato li stordisce. Sembra uno squalo, ma è cugino delle razze.',
  forma: { lx: 1.25, ly: .42 },
  ingombro: { x0: -2.2, y0: -1.06, x1: 2.07, y1: .9 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(16, -1.2, .62, fase, ONDA, SU, GIU, { testa: .12, coda: .03, arco: m ? -.07 : 0 }), luce = [.2, -.5, 2];

    // ---- 1. dietro al corpo: il rostro, pettorale lontana, coda a due lame, le due dorsali, ventrale, la bocca
    P.suSpina(s, .94, -.12, q);
    sega(c, q.x, q.y, q.ang - .03 + sin(F + .8) * .05 - (m ? .15 - b * .06 : 0), m ? .21 : .15, P.fine(o));
    const rema = sin(F * 2 + .4), giu = m ? .12 : 0;
    const f0 = P.suSpina(s, .76, .74), f1 = P.suSpina(s, .6, .8);
    P.lama(c, { x0: f0.x, y0: f0.y, x1: f1.x, y1: f1.y, px: f1.x - .16 + giu, py: f1.y + .3 + giu - rema * .03, tinta: T.lontana, tondo: .2 });
    P.suSpina(s, 0, 0, q);
    const ac = q.ang + sin(F - 1.1) * .32, cx = cos(ac), cy = sin(ac);                 // la coda sbatte in ritardo sul corpo
    const X = (a, d) => q.x + cx * a - cy * d, Y = (a, d) => q.y + cy * a + cx * d;    // a = lungo la coda (indietro se negativo), d = di traverso (su se negativo)
    P.lama(c, { x0: X(.2, .07), y0: Y(.2, .07), x1: X(-.22, -.03), y1: Y(-.22, -.03), px: X(-.42, .38), py: Y(-.42, .38), tinta: T.lontana, davanti: .1, dietro: .2, tondo: .2 });
    P.lama(c, { x0: X(.26, -.08), y0: Y(.26, -.08), x1: X(-.2, .1), y1: Y(-.2, .1), px: X(-.8, -.66), py: Y(-.8, -.66), tinta: T.pinna, davanti: .12, dietro: .22, tondo: .18, punta: PUNTA, quota: .3 });
    const s0 = P.suSpina(s, .29, -.84), s1 = P.suSpina(s, .15, -.8);
    P.lama(c, { x0: s0.x, y0: s0.y, x1: s1.x, y1: s1.y, px: s1.x - .12 + (m ? .06 : 0) + sin(F - 1.4) * .03, py: s1.y - .44, tinta: T.pinna, tondo: .2, dietro: .2, punta: PUNTA, quota: .3 });
    const d0 = P.suSpina(s, .56, -.88), d1 = P.suSpina(s, .41, -.86);
    P.lama(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, px: d1.x - .12 + (m ? .08 : 0) + sin(F - .6) * .03, py: d1.y - .5 - (m ? .05 : 0), tinta: T.pinna, davanti: .16, dietro: .22, tondo: .2, punta: PUNTA, quota: .3 });
    const v0 = P.suSpina(s, .45, .86), v1 = P.suSpina(s, .34, .86);
    P.lama(c, { x0: v0.x, y0: v0.y, x1: v1.x, y1: v1.y, px: v1.x - .12, py: v1.y + .25, tinta: T.lontana, tondo: .22, dietro: .16 });
    const ce = P.suSpina(s, .73, .56), apri = m ? .5 + b * .3 : b * .25;
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang - .06, lung: .33, apri, alt: .12, su: .25, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c' });
    if (apri > .1) P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .15, ge.y0 + (ge.y1 - ge.y0) * .15, ge.x1, ge.y1, 6, .06, 1, { tipo: 'punta' });

    // ---- 2. il corpo: dorso più scuro, ventre chiaro, granelli di sabbia; sopra la cresta di bozzi, la piega e il riflesso
    P.volume(c, s, T.corpo, { luce, ombra: .08, dentro(cc) {
      P.fianco(cc, s, -1.4, u => -.48 + .1 * sin(u * 10), DORSO);
      P.fianco(cc, s, PANCIA, 1.5, VENTRE);
      P.macchie(cc, s, { n: 13, seme: 3, u0: .08, u1: .9, v0: -.85, v1: .05, r0: .016, r1: .04, colore: SABBIA, lungo: 1.2 });
      P.macchie(cc, s, { n: 8, seme: 7, u0: .1, u1: .85, v0: -.9, v1: -.2, r0: .012, r1: .022, colore: NEI, lungo: 1.2 });
    } });
    if (P.fine(o)) {
      P.bozzi(c, P.puntiSuSpina(s, 5, .62, .86, -.8), i => .022 + .004 * i, T.corpo);
      const g0 = P.suSpina(s, .74, -.5), g1 = P.suSpina(s, .715, -.1), g2 = P.suSpina(s, .73, .26);
      P.solco(c, [g0.x, g0.y, g1.x, g1.y, g2.x, g2.y], T.corpo, .032);
    }
    P.suSpina(s, .7, -.64, q); P.riflesso(c, q.x, q.y, .36, q.ang - .04, .1);

    // ---- 3. sul fianco: la pettorale larga come un'ala (a caccia si abbassa)
    const p0 = P.suSpina(s, .8, .46), p1 = P.suSpina(s, .53, .6);
    P.ombra(c, p1.x + .1, p1.y + .12, .42, .15, .3, .28);
    P.lama(c, { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, px: p1.x - .18 + giu * 2, py: p1.y + .48 + giu + rema * .04, tinta: T.pinna, luce: [p0.x - .1, p0.y - .1, 1.1], davanti: .14, dietro: .2, tondo: .2, punta: PUNTA, quota: .26 });

    // ---- 4. la faccia: i dentini di sopra, lo sfiatatoio dietro l'occhio, l'occhio
    if (apri > .1) { const u0 = P.suSpina(s, .78, 1), u1 = P.suSpina(s, .9, 1); P.denti(c, u0.x, u0.y - .01, u1.x, u1.y - .01, 6, .06, -1, { tipo: 'punta', seme: 7 }); }
    const e = P.suSpina(s, .855, -.3);
    if (P.fine(o)) { c.beginPath(); c.ellipse(e.x - .26, e.y + .02, .04, .055, .3, 0, TAU); c.fillStyle = NEI; c.fill(); }
    P.occhio(c, e.x, e.y, .18, Object.assign({ iride: m ? '#ff3a1e' : '#ffcf3a', tipo: m ? 'fessura' : 'tondo', pelle: T.corpo, guarda: { x: .5, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    if (m) P.sopracciglio(c, e.x + .03, e.y - .19, .48, e.ang + .45, T.corpo.bordo, .13);
    c.restore();
  },
});
})();
