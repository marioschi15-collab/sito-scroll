/* Boccone — specie: GAMBERETTO (taglia 1, timido). Un gamberetto pulitore visto di fianco, a pezzi incastrati: l'addome
   ad anelli che si piega nuotando (una spina costruita dalla testa verso la coda), il carapace rigido con il rostro, gli
   occhioni, le antenne bianche lunghissime che ricadono all'indietro, le zampette a paletta che remano sotto la pancia.
   A caccia (o quando si spaventa) alza le pinze, drizza le antenne e accende le bande. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, pow, round } = Math;

// ---- tinte (una volta sola): rosa trasparente, bande rosse, antenne bianche
const T = { corpo: P.tinta('#ff9fb4', '#d8387a'), ventre: P.tinta('#fff0de', '#ff9f8a'), coda: P.tinta('#ff5a52', '#b8164c'), zampa: P.tinta('#ffc0cc', '#e0487e'),
  lontano: P.tinta('#ea8aa6', '#9c2a6c'), antenna: P.tinta('#ffffff', '#ee5a94'), rostro: P.tinta('#ff7a8c', '#c41c50'), pinza: P.tinta('#ffd2d8', '#e0487e') };
const ROSSO = '#f23a48', ACCESO = '#ff1630', BIANCO = '#ffffff';
/* L'addome: una spina di N tratti costruita dalla testa (ferma sotto il carapace) verso la coda, che si incurva in giù. */
const N = 12, LUNG = 1.2, AX = new Array(N + 1).fill(0), AY = new Array(N + 1).fill(0);
const SU = P.sagoma([[0, .09], [.2, .17], [.55, .25], [.85, .3], [1, .3]]), GIU = P.sagoma([[0, .08], [.2, .14], [.55, .2], [.85, .24], [1, .24]]);
const PUNTO = (u, p) => { const i = round(u * N); p.x = AX[i]; p.y = AY[i]; };
const addome = piega => {
  let x = .2, y = -.1; AX[N] = x; AY[N] = y;
  for (let i = N - 1; i >= 0; i--) { const a = PI - piega * pow(1 - (i + .5) / N, 1.3); x += cos(a) * LUNG / N; y += sin(a) * LUNG / N; AX[i] = x; AY[i] = y; }
  return P.spina(N, PUNTO, SU, GIU, { coda: .05 });
};
const curva = (ua, ub) => [v => ua - .035 * (1 - v * v), v => ub - .035 * (1 - v * v)];
const BANDE = [curva(.06, .16), curva(.25, .35), curva(.44, .54), curva(.63, .73), curva(.82, .92)];   // una banda rossa per anello
const CARAPACE = [-.12, -.1, -.03, -.38, .3, -.5, .62, -.45, .85, -.25, .89, .02, .74, .25, .34, .31, .02, .23];
const carapace = cc => P.profilo(cc, CARAPACE);
/* Una foglia (paletta) dalla radice (x, y) verso l'angolo a: si aggiunge al tracciato aperto, così tante costano come una. */
const foglia = (c, x, y, a, L, w) => {
  const ca = cos(a), sa = sin(a), px = x + ca * L, py = y + sa * L, mx = x + ca * L * .6, my = y + sa * L * .6;
  c.moveTo(x, y); c.quadraticCurveTo(mx - sa * w, my + ca * w, px, py); c.quadraticCurveTo(mx + sa * w, my - ca * w, x, y);
};
/* Le antenne lunghe: escono da sotto l'occhio, salgono e ricadono all'indietro sopra la schiena; w le fa frustare. */
const puntiAntenna = (dx, dy, alza, w) => [.74 + dx, -.14 + dy, 1.02 + dx, -.46 + dy - alza * .4, .7 + dx, -.9 + dy - alza, .02 + dx, -.99 + dy - alza + w * .5,
  -.6 + dx, -.9 + dy - alza * .5 - w * .5, -1.06 + dx, -.68 + dy + w];
/* La pinza in fondo al primo paio di zampe: due dita a cono, quello di sopra si apre. */
const pinza = (c, p, r, apri, t, punta) => {
  P.corno(c, p.x, p.y, p.ang + .22, r, r * .5, t, { curva: -.3, punta, bordo: .03 });
  P.corno(c, p.x, p.y, p.ang - .25 - apri * .9, r * .92, r * .44, t, { curva: .35, punta, bordo: .03 });
};
/* L'occhio lontano che spunta da dietro il rostro: bulbo, iride e pupilla in tre colpi, senza sfumature. */
const occhioLontano = (c, x, y, r, iride, bordo) => {
  c.beginPath(); c.arc(x, y, r * 1.12, 0, TAU); c.fillStyle = bordo; c.fill();
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#dfe8fb'; c.fill();
  c.beginPath(); c.arc(x + r * .3, y + r * .05, r * .62, 0, TAU); c.fillStyle = iride; c.fill();
  c.beginPath(); c.arc(x + r * .36, y + r * .06, r * .36, 0, TAU); c.fillStyle = '#120a22'; c.fill();
};

B.specie.registra({
  id: 'gamberetto',
  descrizione: 'Fa il dentista del mare: apre una «stazione di pulizia» e i pesci si mettono in fila per farsi togliere i parassiti, perfino dentro la bocca. Le lunghe antenne bianche sono la sua insegna.',
  forma: { lx: 1.0, ly: .5 },
  ingombro: { x0: -1.52, y0: -1.3, x1: 1.45, y1: 1.05 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = addome(.8 + .2 * sin(F) + (m ? .1 : 0)), w = sin(F - 1) * .09, alza = m ? .12 : 0, rosso = m ? ACCESO : ROSSO, iride = m ? '#ff2a1a' : '#12b8c8';

    // ---- 1. dietro a tutto: antenna e zampe del lato lontano (un solo tracciato); le palette che remano; la coda a ventaglio
    c.lineCap = 'round'; c.lineJoin = 'round';
    P.profilo(c, puntiAntenna(.07, -.04, alza, -w), false);
    for (let i = 0; i < 3; i++) { const d = sin(F * 2 + i * 2.1 + 1.5) * .3, x = .27 + i * .14, a = PI / 2 + .7 + d; c.moveTo(x, .16); c.lineTo(x + .06, .35); c.lineTo(x + .06 + cos(a) * .24, .35 + sin(a) * .24); }
    c.strokeStyle = T.lontano.bordo; c.lineWidth = .1; c.stroke(); c.strokeStyle = T.lontano.base; c.lineWidth = .045; c.stroke();
    c.beginPath();
    for (let i = 0; i < 4; i++) { P.suSpina(s, .3 + i * .16, .8, q); foglia(c, q.x, q.y, q.ang + PI / 2 + .45 + .6 * sin(F * 2 - i * 1.2), .28, .08); }
    c.lineJoin = 'round'; c.strokeStyle = T.zampa.bordo; c.lineWidth = .07; c.stroke(); c.fillStyle = T.zampa.base; c.fill();
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .22, tipo: 'ventaglio', lung: .48, alt: m ? .52 : .42, radice: .1, fase: F - 1.9, onda: .15, smerlo: .55, n: 6, tinta: T.coda, orlo: BIANCO });

    // ---- 2. l'addome ad anelli: ventre chiaro, una banda rossa per anello, solchi fra un anello e l'altro
    P.volume(c, s, T.corpo, { luce: [0, -.45, 1.5], ombra: .07, dentro(cc) {
      P.fianco(cc, s, .35, 1.4, T.ventre.base);
      P.bande(cc, s, BANDE, rosso);
      P.anelli(cc, s, .2, .96, 5, T.corpo, { curva: -.035, spess: .03 });
    } });

    // ---- 3. sotto il carapace: zampe vicine, pinza, rostro, occhio lontano, antenne (il carapace ne copre le radici)
    c.beginPath();
    for (let i = 0; i < 3; i++) { const d = sin(F * 2 + i * 2.1) * .3, x = .2 + i * .14, a = PI / 2 + .7 + d; c.moveTo(x, .2); c.lineTo(x + .065, .41); c.lineTo(x + .065 + cos(a) * .27, .41 + sin(a) * .27); }
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = T.zampa.bordo; c.lineWidth = .125; c.stroke(); c.strokeStyle = T.zampa.base; c.lineWidth = .065; c.stroke();
    c.save(); c.translate(.008, -.014); c.strokeStyle = T.zampa.luce; c.lineWidth = .022; c.stroke(); c.restore();
    occhioLontano(c, .84, -.42, .2, iride, T.corpo.bordo);
    c.beginPath(); c.moveTo(.8, -.1); c.quadraticCurveTo(1.06, -.3 - alza, 1.3, -.3 - alza * 2 + w * .6); c.moveTo(.8, -.04); c.quadraticCurveTo(1.1, -.02, 1.34, -.04 + alza - w * .6);
    c.lineCap = 'round'; c.strokeStyle = T.antenna.bordo; c.lineWidth = .1; c.stroke(); c.strokeStyle = BIANCO; c.lineWidth = .045; c.stroke();
    P.filo(c, puntiAntenna(0, 0, alza, w), .075, .027, T.antenna, .03);
    P.corno(c, .66, -.4, -.14, m ? .6 : .52, .17, T.rostro, { curva: -.14, punta: rosso });
    if (m) P.denti(c, .8, -.47, 1.12, -.56, 3, .07, 1, { colore: '#ffd9de', spess: .012 });           // la sega del rostro
    const pv = P.zampa(c, .62, .16, m ? [[.5, .22], [-.5, .24]] : [[.95, .22], [.25 + sin(F * 2) * .12, .22]], T.zampa, { spess: .1, punta: .07, bordo: .03 });
    pinza(c, pv, .2, m ? .8 : .12 + b * .5, T.pinza, rosso);
    P.ombra(c, -.02, -.06, .2, .34, 0, .3);

    // ---- 4. il carapace: sella e collare rossi, pancia chiara, gota rosa
    P.volume(c, carapace, T.corpo, { luce: [.45, -.42, 1.25], ombra: .06, dentro(cc) {
      cc.beginPath(); cc.ellipse(.42, .4, .62, .2, 0, 0, TAU); cc.fillStyle = T.ventre.base; cc.fill();
      cc.beginPath(); cc.ellipse(.16, -.54, .3, .13, -.1, 0, TAU); cc.ellipse(-.2, -.08, .17, .5, 0, 0, TAU); cc.fillStyle = rosso; cc.fill();
    } });
    P.riflesso(c, .16, -.3, .24, -.25, .14);
    P.guancia(c, .5, .1, .15, '#ff4f86', .5);

    // ---- 5. la faccia. Calmo: occhione turchese e sorriso. A caccia: occhio rosso tagliato, sopracciglio, bocca aperta coi denti
    P.occhio(c, .58, -.22, .27, Object.assign({ iride, pelle: T.corpo, guarda: { x: .55, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, .64, -.47, .52, .48, T.corpo.bordo, .12);
    P.sorriso(c, .74, .12, .1, { ang: .2, apri: m ? max(b, .55) : b * .6, alt: .16, curva: m ? -.3 : .7, denti: m ? 'su' : '', lingua: !m, tinta: T.corpo, spess: .045 });
    c.restore();
  },
});
})();
