/* Boccone — pericolo: RICCIO DI MARE. Una palla viola-notte di aculei lunghi dalla punta chiara: una corona di aculei
   lunghi dietro, la palla lucida del corpo, una corona di aculei corti davanti, e in mezzo due occhi che spiano.
   Dipende solo da o.fase (gli aculei che dondolano) e da o.attivo (quanto sei vicino): a riposo sonnecchia; a metà
   spalanca gli occhi; da vicino rizza gli aculei (più lunghi, fermi, con le punte che si accendono di rosso) e fa la
   faccia cattiva. Gli aculei si disegnano tutti insieme, in un tracciato solo. 1 unità = il raggio che fa male.
   RITOCCATO PER LO STILE «FILM D'ANIMAZIONE»: gli aculei non hanno più il contorno scuro spesso ma la linea sottile del
   loro viola scurito; li modella la luce (quelli rivolti in alto a sinistra sono più chiari, quelli in basso a destra
   restano nel buio fin quasi alla punta) e ognuno ha il suo filo di luce sul fianco illuminato. */
(() => {
'use strict';
const B = window.B, P = B.pittura, R = B.util.rumore, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, min, round } = Math;

// ---- tinte: il «nero» è un viola-blu medio, il buio lo fanno bordi e ombre; punte lilla che da vicino diventano rosse
const T = { corpo: P.tinta('#7648d8', '#1e0c5c'), dietro: P.tinta('#4a34a6', '#160a4a'), davanti: P.tinta('#6248c8', '#1a0c52') };
const PUNTE = ['#ecdfff', '#ffc48a', '#ff5a36'], LUCE = ['#d9c2ff', '#ffb070', '#ff5a36'], PERLE = '#5ad8ff';
const DIETRO = [], DAVANTI = [];                                      // gli aculei: direzione, lunghezza, sfasamento del dondolio
for (let i = 0; i < 26; i++) DIETRO.push({ a: (i + .5 * R(i, 3)) / 26 * TAU, l: .86 + .14 * R(i, 5), f: i * 2.1 });
for (let i = 0; i < 12; i++) DAVANTI.push({ a: (i + .25 + .4 * R(i, 7)) / 12 * TAU, l: .8 + .2 * R(i, 9), f: i * 1.3 + 1 });
const SONNO = { iride: '#ffd23c', pelle: T.corpo, guarda: { x: 0, y: .3 }, palpebra: .6 }, SVEGLIO = { iride: '#ffd23c', pelle: T.corpo, guarda: { x: 0, y: -.1 }, pupilla: .7, grande: 1.08 };
const CATTIVO_SX = { iride: '#ff3a1e', pelle: T.corpo, tipo: 'fessura', guarda: { x: .35, y: .1 }, palpebra: .34, taglio: .46, pupilla: .72, sotto: .1 };
const CATTIVO_DX = Object.assign({}, CATTIVO_SX, { guarda: { x: -.35, y: .1 }, taglio: -.46 });
const BRONCIO = { curva: -.7, tinta: T.corpo, spess: .05 }, STUPORE = { apri: .8, alt: .09, curva: 0, tinta: T.corpo, lingua: false, spess: .045 };
const TIARA = [-.2, -.24, 0, -.31, .2, -.24], CIME = [];

/* Una corona di aculei in tre tracciati soli: i triangoli sottili da r0 in fuori (linea sottile e una sfumatura che
   schiarisce verso la punta e verso la luce, in alto a sinistra), poi il filo di luce sul fianco illuminato di ognuno,
   poi le punte chiare. lungo = lunghezza, molle = quanto dondolano. Se cime è una lista, ci scrive dove finiscono le punte. */
const AX = [], AY = [], AL = [], LUME = P.alfa('#e4dcff', .5);
function aculei(c, lista, r0, lungo, hw, t, punta, F, molle, cime) {
  let m = 0; const n = lista.length;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const s = lista[i], a = s.a + molle * sin(F + s.f), L = r0 + lungo * s.l * (1 + .5 * molle * sin(F + s.f * 1.7)), ca = cos(a), sa = sin(a);
    AX[i] = ca; AY[i] = sa; AL[i] = L; if (L > m) m = L;
    c.moveTo(ca * r0 - sa * hw, sa * r0 + ca * hw); c.lineTo(ca * L, sa * L); c.lineTo(ca * r0 + sa * hw, sa * r0 - ca * hw); c.closePath();
    if (cime) cime.push(ca * (L - .02), sa * (L - .02));
  }
  const g = c.createRadialGradient(m * .12, m * .32, r0 * .3, 0, 0, m);                // il centro è spostato dalla parte dell'ombra: così il lato in luce schiarisce prima
  g.addColorStop(0, t.scura); g.addColorStop(.4, t.ombra); g.addColorStop(.66, t.base); g.addColorStop(1, t.luce);
  c.lineJoin = 'round'; c.strokeStyle = t.linea; c.lineWidth = .045; c.stroke(); c.fillStyle = g; c.fill();
  c.beginPath();
  for (let i = 0; i < n; i++) {                                     // il filo di luce: sul fianco che guarda in alto a sinistra
    const ca = AX[i], sa = AY[i], L = AL[i], k = (.34 * sa - .94 * ca > 0 ? .5 : -.5) * hw, a = r0 + .08, b = L - (L - r0) * .34;
    c.moveTo(ca * a - sa * k, sa * a + ca * k); c.lineTo(ca * b - sa * k * .5, sa * b + ca * k * .5);
  }
  c.lineCap = 'round'; c.strokeStyle = LUME; c.lineWidth = .022; c.stroke();
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const ca = AX[i], sa = AY[i], L = AL[i], b = L - (L - r0) * .3, w = hw * .5;
    c.moveTo(ca * b - sa * w, sa * b + ca * w); c.lineTo(ca * (L + .015), sa * (L + .015)); c.lineTo(ca * b + sa * w, sa * b - ca * w); c.closePath();
  }
  c.fillStyle = punta; c.fill();
}

B.specie.registra({
  id: 'riccio',
  descrizione: 'Sente le ombre con tutto il corpo: se qualcosa gli passa vicino, punta gli aculei da quella parte. Meglio girargli al largo.',
  forma: { lx: 1, ly: 1 },
  ingombro: { x0: -1.38, y0: -1.38, x1: 1.38, y1: 1.38 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, at = max(0, min(1, o.attivo || 0)), liv = round(at * 2), molle = .08 * (1 - .85 * at);
    c.save();

    // ---- 1. dietro: la corona di aculei lunghi (da vicino si allungano e le punte si accendono)
    CIME.length = 0;
    aculei(c, DIETRO, .4, .58 + .3 * at, .065, T.dietro, PUNTE[liv], F, molle, CIME);
    if (liv) P.lucine(c, CIME, .03, LUCE[liv], .35 + .5 * at);

    // ---- 2. il corpo: una palla lucida, con la sua tiara di perline azzurre
    P.palla(c, 0, 0, .5, .47, 0, T.corpo, { luce: [.14, -.22, .95], ombra: .09 });
    P.riflesso(c, .24, -.33, .2, .62, .16);

    // ---- 3. davanti: la corona di aculei corti, che nasconde l'orlo della palla
    aculei(c, DAVANTI, .37, .3 + .14 * at, .06, T.davanti, PUNTE[liv], F, molle);
    if (P.fine(o)) P.lucine(c, TIARA, .026, PERLE, .7);

    // ---- 4. la faccia: sonnecchia · occhi spalancati · cattiva
    if (liv === 2) {
      P.occhio(c, -.17, .03, .15, CATTIVO_SX); P.occhio(c, .17, .03, .15, CATTIVO_DX);
      P.sopracciglio(c, -.16, -.13, .3, .5, T.corpo.bordo, .09); P.sopracciglio(c, .16, -.13, .3, -.5, T.corpo.bordo, .09);
      P.sorriso(c, 0, .27, .08, BRONCIO);
    } else {
      P.occhio(c, -.17, .03, .15, liv ? SVEGLIO : SONNO); P.occhio(c, .17, .03, .15, liv ? SVEGLIO : SONNO);
      P.sorriso(c, 0, liv ? .23 : .26, liv ? .045 : .06, liv ? STUPORE : BRONCIO);
    }
    c.restore();
  },
});
})();
