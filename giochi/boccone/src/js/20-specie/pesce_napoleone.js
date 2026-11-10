/* Boccone — specie: PESCE NAPOLEONE (taglia 4, pigro). Un bestione buono: corpo alto verde-azzurro, la gobba sulla fronte,
   labbroni carnosi, il disegno a labirinto sul muso (anelli spezzati attorno all'occhio, come un labirinto tondo), le
   tacche delle squame sul fianco e le due righe scure dietro l'occhio. Nuota remando con le pettorali gialle.
   Da calmo ha l'aria bonaria (occhio socchiuso, gota rosa, bocca chiusa); a caccia drizza le pinne, aggrotta la fronte e
   mostra i canini. */
(() => {
'use strict';
const B = window.B, P = B.pittura, R = B.util.rumore, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max } = Math;

// ---- tinte: verde-azzurro con ombre blu-viola, pinne blu orlate di giallo-verde, pettorali gialle, labbra pervinca
const T = { corpo: P.tinta('#25b5a6', '#2a2c8c'), pinna: P.tinta('#3d74ea', '#221a78'), pett: P.tinta('#ffe04a', '#ff8a1a'), labbra: P.tinta('#aab6ff', '#4a3fc0') };
const ORLO = '#e8f26a', DORSO = P.alfa('#2a62e0', .5), VENTRE = P.alfa('#c4f8e2', .72), GHIRIGORO = '#dff58a', TACCA = P.alfa(T.corpo.bordo, .34), RIGA = '#232a8a';
/* Alto e massiccio. Dietro la testa il dorso fa una sella, poi sale nella gobba tonda della fronte e scende ripido verso le labbra. */
const SU = P.sagoma([[0, .15], [.1, .28], [.28, .66], [.46, .82], [.62, .84], [.73, .8], [.83, .93], [.91, 1], [.97, .95], [1, .82]]);
const GIU = P.sagoma([[0, .15], [.1, .28], [.28, .62], [.48, .78], [.66, .78], [.8, .66], [.92, .46], [1, .3]]);
const ONDA = { amp: .1, onde: .5, testa: .14 };
/* Il labirinto del muso: anelli spezzati attorno all'occhio, uniti da tratti corti. Ogni anello è [raggio, da, a] in
   radianti (0 = verso il muso); ogni ponte è [angolo, raggio da, raggio a]. Gli anelli larghi restano sulla testa. */
const ANELLI = [], PONTI = [];
for (let k = 0; k < 6; k++) {
  const r = .27 + k * .088, n = 3 + (k >> 1), giro = k < 3 ? TAU : 3.9, a0 = k < 3 ? R(k, 1) * TAU : -giro / 2 - .1;
  for (let j = 0; j < n; j++) {
    const da = a0 + giro * (j + .22 * R(k * 5 + j, 2)) / n, a = a0 + giro * (j + 1) / n - .1 / r;
    ANELLI.push([r, da, a]);
    if (k < 5 && (k < 3 || j > 0)) PONTI.push([da, r, r + .088]);
  }
}
function labirinto(cc, x, y) {
  cc.beginPath();
  for (const a of ANELLI) { cc.moveTo(x + cos(a[1]) * a[0], y + sin(a[1]) * a[0]); cc.arc(x, y, a[0], a[1], a[2]); }
  for (const p of PONTI) { cc.moveTo(x + cos(p[0]) * p[1], y + sin(p[0]) * p[1]); cc.lineTo(x + cos(p[0]) * p[2], y + sin(p[0]) * p[2]); }
  cc.lineCap = 'round'; cc.lineJoin = 'round'; cc.strokeStyle = GHIRIGORO; cc.lineWidth = .03; cc.stroke();
}
/* Le tacche delle squame: trattini verticali sfalsati sul fianco, dietro la testa. */
function tacche(cc, s) {
  const q = {}; cc.beginPath();
  for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) {
    const u = .1 + (k + (r % 2) * .5) * .068, v = -.64 + r * .3;
    P.suSpina(s, u, v - .07, q); cc.moveTo(q.x, q.y); P.suSpina(s, u, v + .07, q); cc.lineTo(q.x, q.y);
  }
  cc.lineCap = 'round'; cc.strokeStyle = TACCA; cc.lineWidth = .028; cc.stroke();
}

B.specie.registra({
  id: 'pesce_napoleone',
  descrizione: 'Il gigante buono della barriera: è così curioso che si lascia avvicinare dai sub. Il disegno a labirinto sul muso è diverso in ogni pesce, come le nostre impronte digitali.',
  forma: { lx: 1.05, ly: .85 },
  ingombro: { x0: -1.62, y0: -1.12, x1: 1.2, y1: 1.06 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.95, .66, fase, ONDA, SU, GIU, { testa: .27 }), luce = [.3, -.55, 1.9], alza = m ? .22 : 0;

    // ---- 1. dietro al corpo: coda tonda, la lunga dorsale e l'anale (a caccia si drizzano), ventrale
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .06, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .32, tipo: 'ventaglio', lung: .52, alt: .56 + alza * .3, radice: .15, fase: F - 1.9, onda: .2, tinta: T.pinna, orlo: ORLO, n: 8 });
    const d0 = P.suSpina(s, .68, -.92), d1 = P.suSpina(s, .08, -.7);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -PI / 2 - .8 + alza * 1.6, a1: -PI + .2 + alza * .5, lung: .5 + alza * .3, profilo: [.5, .52, .55, .6, .7, .92, 1], n: 8, onda: .06, fase: F * 2, passo: .6, tinta: T.pinna, orlo: ORLO });
    const a0 = P.suSpina(s, .44, .92), a1 = P.suSpina(s, .08, .7);
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: PI / 2 + .8 - alza * 1.4, a1: PI - .2 - alza * .5, lung: .46 + alza * .25, profilo: [.5, .58, .72, .95, 1], n: 6, onda: .06, fase: F * 2 + 1, passo: .6, tinta: T.pinna, orlo: ORLO });
    const v0 = P.suSpina(s, .62, .96), va = PI / 2 + .7 + sin(F - .5) * .1;
    P.corno(c, v0.x, v0.y - .05, va, .36, .15, T.pinna, { curva: .3, punta: ORLO });                // ventrale a punta (un corno costa meno di una pinna)

    // ---- 2. il corpo: dorso blu, ventre chiaro, tacche delle squame, la luce sulla gobba, il labirinto attorno all'occhio
    const go = P.suSpina(s, .93, -.7), e = P.suSpina(s, .86, -.2);
    P.volume(c, s, T.corpo, { luce, ombra: .12, dentro(cc) {
      P.fianco(cc, s, -1.4, u => -.5 + .1 * sin(u * 8), DORSO, 0, .78);
      P.fianco(cc, s, u => .5 - .1 * sin(u * 5), 1.4, VENTRE);
      tacche(cc, s);
      P.guancia(cc, go.x + .08, go.y, .4, T.corpo.luce, .75);
      labirinto(cc, e.x, e.y);
    } });
    const g0 = P.suSpina(s, .64, -.55), g1 = P.suSpina(s, .58, -.05), g2 = P.suSpina(s, .62, .55);
    P.solco(c, [g0.x, g0.y, g1.x, g1.y, g2.x, g2.y], T.corpo, .04);                                // opercolo
    P.riflesso(c, go.x + .1, go.y - .02, .34, .85, .14);
    c.lineCap = 'round'; c.strokeStyle = RIGA; c.lineWidth = .045;                                 // le due righe scure dietro l'occhio
    c.beginPath(); c.moveTo(e.x - .17, e.y - .05); c.quadraticCurveTo(e.x - .3, e.y - .12, e.x - .42, e.y - .1); c.moveTo(e.x - .18, e.y + .07); c.quadraticCurveTo(e.x - .3, e.y + .08, e.x - .4, e.y + .14); c.stroke();

    // ---- 3. sul fianco: la pettorale gialla che rema (i labridi nuotano così)
    const pp = P.suSpina(s, .58, .3), rema = sin(F * 2 + .4), ap = PI * .9 + rema * .45;
    P.ombra(c, pp.x - .16, pp.y + .06, .32, .2, -.3, .28);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .11, x1: pp.x - .02, y1: pp.y + .11, a0: ap - .55 - rema * .1, a1: ap + .6 + rema * .1, lung: .52, profilo: [.7, 1, 1, .8, .55], n: 5, onda: .1, fase: F * 2, passo: .7, tinta: T.pett, orlo: '#ff9d2a', primo: true });

    // ---- 4. la faccia. Calmo: occhio socchiuso, gota rosa, labbroni chiusi. A caccia: occhio rosso tagliato, sopracciglio, canini
    if (!m) P.guancia(c, e.x + .1, e.y + .32, .17, '#ff7f9f', .5);
    P.occhio(c, e.x, e.y, .18, Object.assign({ iride: m ? '#ff3a1e' : '#ffa01e', pelle: T.corpo, guarda: { x: .5, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    if (m) P.sopracciglio(c, e.x + .04, e.y - .19, .44, .5, T.corpo.bordo, .12);
    const l = P.suSpina(s, 1, .55);
    P.labbra(c, l.x + .24, l.y - .02, l.ang + .12, .25, m ? max(b, .45) : b * .5, T.labbra, { denti: m ? 2 : 0 });
    c.restore();
  },
});
})();
