/* Boccone — specie: CAVALLUCCIO MARINO (taglia 1, timido, assetto 'dritto': il motore non lo ruota, lo specchia soltanto).
   Sta in piedi col muso a tubo verso +x: testa da cavallino con la coroncina, collo arcuato, pancia tonda, coda a ricciolo.
   Il corpo è UNA spina costruita per angoli dalla nuca alla punta della coda (così la testa resta ferma e la coda dondola);
   la testa è un pezzo a parte, appoggiato sul collo. Il tratto esagerato sono il muso a trombetta e l'occhione. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, min, pow, round } = Math;

// ---- tinte (una volta sola)
const T = { corpo: P.tinta('#ffc21a', '#f0541e'), ventre: P.tinta('#fff1c4', '#f0a05a'), pinna: P.tinta('#27c9c0'), corona: P.tinta('#ff7a2e', '#d02a3a'), labbra: P.tinta('#ff6f8f') };
const ORLO = '#c9fff6', PUNTINI = P.alfa('#fff6d0', .85);
// ---- il corpo: 28 tratti lunghi in tutto 2.85, dalla punta della coda (u = 0) alla nuca (u = 1). SU è la schiena (-x), GIU la pancia (+x)
const NT = 28, LUNG = 2.85;
const SU = P.sagoma([[0, .035], [.2, .07], [.4, .12], [.52, .21], [.68, .27], [.85, .23], [1, .16]]);
const GIU = P.sagoma([[0, .035], [.2, .07], [.4, .12], [.5, .2], [.62, .4], [.72, .45], [.86, .33], [1, .17]]);
/* Di quanto la linea di mezzo devia dalla verticale scendendo dalla nuca (k = 0): collo all'indietro, pancia in avanti,
   coda di nuovo indietro; da k = .56 in poi si arrotola in avanti, sempre più stretta. */
const PIEGA = [[0, .5], [.1, .28], [.24, -.3], [.36, -.1], [.47, .3], [.56, .1]];
const tab = (l, k) => { let i = 0; while (i < l.length - 2 && k > l[i + 1][0]) i++; const a = l[i], b = l[i + 1], q = max(0, min(1, (k - a[0]) / (b[0] - a[0]))); return a[1] + (b[1] - a[1]) * q * q * (3 - 2 * q); };
const posa = F => {
  const px = [-.05], py = [-.6 + .03 * sin(F)], passo = LUNG / NT, ricciolo = 6.3 * (1 + .05 * sin(F - 1));
  for (let i = 1; i <= NT; i++) {
    const k = (i - .5) / NT, a = PI / 2 + (k < .56 ? tab(PIEGA, k) : .1 - ricciolo * pow((k - .56) / .44, 1.3)) + .07 * k * sin(F - k * 2.5);
    px[i] = px[i - 1] + cos(a) * passo; py[i] = py[i - 1] + sin(a) * passo;
  }
  return P.spina(NT, (u, p) => { const i = round((1 - u) * NT); p.x = px[i]; p.y = py[i]; }, SU, GIU, { coda: .03 });
};
// ---- la testa, nelle sue coordinate (origine al centro del cranio, +x lungo il muso): sagoma, coroncina [x, y, angolo, lunghezza]
const TESTA = [-.34, -.02, -.16, -.33, .13, -.28, .33, -.11, .6, -.09, .8, -.11, .88, 0, .8, .11, .6, .085, .33, .12, .1, .3, -.18, .28];
const CORONA = [[-.28, -.14, -PI / 2 - .95, .22], [-.19, -.25, -PI / 2 - .45, .31], [-.07, -.28, -PI / 2 - .02, .32], [.05, -.25, -PI / 2 + .42, .22]];
const OPERCOLO = [-.14, -.16, -.22, .04, -.13, .2], FASCE = [.47, .63];
/* I nodi ossei che sporgono dalla schiena: tondini della tinta del corpo, tutti in un tracciato. Si disegnano PRIMA del corpo. */
const nodi = (c, p, r, t) => {
  c.beginPath(); for (let i = 0; i < p.length; i += 2) { const rr = r(i / 2); c.moveTo(p[i] + rr, p[i + 1]); c.arc(p[i], p[i + 1], rr, 0, TAU); }
  c.strokeStyle = t.bordo; c.lineWidth = P.BORDO * 1.6; c.stroke(); c.fillStyle = t.chiara; c.fill();
};
const raggioNodo = i => .034 + .004 * i;

B.specie.registra({
  id: 'cavalluccio',
  descrizione: 'Nuota in piedi, piano piano, facendo vibrare la pinna che ha sulla schiena. Con la coda si aggrappa alle alghe per non farsi portare via, e i piccoli li porta nel marsupio il papà.',
  forma: { lx: .55, ly: 1.2 },
  ingombro: { x0: -.95, y0: -1.35, x1: 1.05, y1: 1.4 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = posa(F), luce = [.3, -.5, 2];

    // ---- 1. dietro al corpo: la pinna della schiena che vibra, i nodi ossei lungo la schiena
    const d0 = P.suSpina(s, .75, -.85), d1 = P.suSpina(s, .57, -.85);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: PI + .75 + (m ? .25 : 0), a1: PI - .55 - (m ? .15 : 0), lung: m ? .52 : .43, profilo: [.75, 1, 1, .8], n: 8, smerlo: .35,
      onda: .16, fase: F * 4, passo: 1.1, tinta: T.pinna, orlo: ORLO });
    nodi(c, P.puntiSuSpina(s, 10, .381, .96, -1), raggioNodo, T.corpo);

    // ---- 2. il corpo: pancia chiara, puntini, anelli incisi dalla coda al collo
    P.volume(c, s, T.corpo, { luce, ombra: .08, dentro(cc) {
      P.fianco(cc, s, u => .3 + max(0, .58 - u) * 7, 1.4, T.ventre.base, .44, .97);
      if (P.fine(o)) P.macchie(cc, s, { n: 9, seme: 4, u0: .45, u1: .95, v0: -.75, v1: .1, r0: .018, r1: .03, colore: PUNTINI, lungo: 1 });
    } });
    P.anelli(c, s, .06, .96, 15, T.corpo, { spess: .04 });
    P.suSpina(s, .8, .35, q); P.riflesso(c, q.x, q.y, .34, q.ang + PI, .14);

    // ---- 3. sul collo: la pinnetta dietro la guancia, che frulla
    const pe = P.suSpina(s, .9, -.25), fr = sin(F * 3) * .18;
    P.pinna(c, { x0: pe.x + .03, y0: pe.y - .08, x1: pe.x - .02, y1: pe.y + .08, a0: PI + .75 + fr, a1: PI - .45 + fr, lung: .27, profilo: [.7, 1, 1, .75], n: 5, smerlo: .3, onda: .12, fase: F * 3,
      tinta: T.pinna, orlo: ORLO, primo: true });

    // ---- 4. la testa appoggiata sul collo: coroncina (a caccia si drizza), cranio e muso a tubo
    const n0 = P.suSpina(s, 1, 0), ha = .4 + .05 * sin(F + 1) + (m ? .1 : 0), hx = n0.x + .06, hy = n0.y - .12, ca = cos(ha), sa = sin(ha);
    P.ombra(c, n0.x + .07, n0.y + .14, .32, .15, .4, .3);
    c.save(); c.translate(hx, hy); c.rotate(ha);
    for (const k of CORONA) P.corno(c, k[0], k[1], k[2] + (m ? .12 : 0), k[3] * (m ? 1.35 : 1), .12, T.corona, { punta: m ? '#ffe14a' : T.corona.luce });
    P.volume(c, cc => P.profilo(cc, TESTA), T.corpo, { luce: [.1, -.3, 1], ombra: .06, dentro(cc) {
      cc.beginPath(); cc.ellipse(.22, .37, .55, .2, 0, 0, TAU); cc.fillStyle = T.ventre.base; cc.fill();          // sotto il muso, chiaro
      cc.beginPath(); for (const x of FASCE) cc.rect(x, -.2, .045, .4); cc.fillStyle = P.alfa(T.corpo.scura, .65); cc.fill();   // fascette sul tubo
    } });
    P.solco(c, OPERCOLO, T.corpo, .03);
    P.riflesso(c, .56, -.045, .2, 0, .04);
    c.restore();

    // ---- 5. la faccia. Calmo: occhione verde acqua, gota rosa, trombetta chiusa. A caccia: occhio rosso tagliato, sopracciglio, dentini
    const ex = hx + ca * .02 + sa * .05, ey = hy + sa * .02 - ca * .05;
    if (!m) P.guancia(c, hx + ca * .2 - sa * .2, hy + sa * .2 + ca * .2, .12);
    P.occhio(c, ex, ey, .21, Object.assign({ iride: m ? '#ff3a1e' : '#19b89c', pelle: T.corpo, guarda: { x: .5, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, ex + .05, ey - .21, .48, .55, T.corpo.bordo, .12);
    P.labbra(c, hx + ca * .9, hy + sa * .9, ha, m ? .13 : .115, m ? max(b, .45) : b * .5, T.labbra, { denti: m ? 2 : 0 });
    c.restore();
  },
});
})();
