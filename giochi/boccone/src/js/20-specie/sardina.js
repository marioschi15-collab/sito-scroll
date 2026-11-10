/* Boccone — banco: SARDINA. ESEMPIO DI RIFERIMENTO per i pesciolini dei banchi (vedi GUIDA-STILE.md).
   Nel gioco è lunga una ventina di pixel e ce ne sono a decine: pochissimi tratti (tetto di costo ×4), niente attrezzi
   pesanti di B.pittura, ma gli stessi ingredienti dello stile: bordo scuro colorato, dorso e ventre, occhio grande, un riflesso. */
(() => {
'use strict';
const B = window.B, TAU = Math.PI * 2;

B.specie.registra({
  id: 'sardina',
  forma: { lx: 1, ly: .36 },
  ingombro: { x0: -1.2, y0: -.66, x1: 1.1, y1: .66 },
  disegna(c, o) {
    const w = Math.sin((o.fase || 0) * TAU), yc = w * .16, ym = -w * .05;      // yc: la coda sbatte; ym: il corpo si flette al contrario
    c.save(); c.lineJoin = 'round';
    // coda a forca
    c.beginPath(); c.moveTo(-.5, ym * .5 - .06); c.lineTo(-1.08, yc - .38); c.quadraticCurveTo(-.82, yc, -1.08, yc + .38); c.lineTo(-.5, ym * .5 + .06); c.closePath();
    c.strokeStyle = '#14285e'; c.lineWidth = .1; c.stroke(); c.fillStyle = '#3f86d8'; c.fill();
    // corpo: dorso blu, fianco azzurro, ventre d'argento
    const g = c.createLinearGradient(0, -.34, 0, .34); g.addColorStop(0, '#2456c4'); g.addColorStop(.42, '#58b6f2'); g.addColorStop(.56, '#f2fbff'); g.addColorStop(1, '#c5dcf2');
    c.beginPath(); c.moveTo(1, .02); c.bezierCurveTo(.7, -.42, -.2, -.4 + ym, -.72, ym * .4 - .05); c.lineTo(-.72, ym * .4 + .07); c.bezierCurveTo(-.2, .4 + ym, .7, .4, 1, .02); c.closePath();
    c.stroke(); c.fillStyle = g; c.fill();
    // fila di puntini scuri e riflesso sul dorso
    c.fillStyle = '#1b2f73'; c.beginPath(); for (let i = 0; i < 4; i++) { const x = .28 - i * .24, y = ym * (.3 + i * .2); c.moveTo(x + .05, y); c.arc(x, y, .05, 0, TAU); } c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(.08, -.2 + ym * .5, .3, .045, -.04, 0, TAU); c.fill();
    // occhio
    c.fillStyle = '#fff'; c.beginPath(); c.arc(.62, -.05, .15, 0, TAU); c.fill();
    c.fillStyle = '#14173a'; c.beginPath(); c.arc(.66, -.04, .085, 0, TAU); c.fill();
    c.restore();
  },
});
})();
