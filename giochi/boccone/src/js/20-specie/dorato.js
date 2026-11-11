/* Boccone — banco: PESCIOLINO DORATO. Il banco raro che vale di più: un pesciolino paffuto tutto d'oro, con la coda a
   ventaglio arancio, due squame in rilievo e una stellina di luce che gli si accende e spegne sul dorso mentre nuota.
   Come la sardina: pochissimi tratti (costo sotto ×2,5), niente attrezzi pesanti; dipende solo da o.fase. */
(() => {
'use strict';
const B = window.B, TAU = Math.PI * 2;
const BORDO = '#8a3208', ARANCIO = '#ff9a1c', SQUAMA = 'rgba(214,98,8,.6)', PUPILLA = '#3b1030';
/* Una stellina a quattro punte di raggio r, aggiunta al tracciato in corso. */
const stellina = (c, x, y, r) => {
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
};

B.specie.registra({
  id: 'dorato',
  forma: { lx: 1, ly: .44 },
  ingombro: { x0: -1.2, y0: -.84, x1: 1.12, y1: .7 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, w = Math.sin(F), yc = w * .16, ym = -w * .05;      // yc: la coda sbatte; ym: il corpo si flette al contrario
    c.save(); c.lineJoin = 'round';
    // coda a ventaglio
    c.beginPath(); c.moveTo(-.46, ym * .5 - .07); c.quadraticCurveTo(-.84, yc - .52, -1.08, yc - .4); c.quadraticCurveTo(-.86, yc, -1.08, yc + .4); c.quadraticCurveTo(-.84, yc + .52, -.46, ym * .5 + .07); c.closePath();
    c.strokeStyle = BORDO; c.lineWidth = .1; c.stroke(); c.fillStyle = ARANCIO; c.fill();
    // corpo paffuto: oro carico sul dorso, oro chiaro sul fianco, pancia quasi bianca
    const g = c.createLinearGradient(0, -.44, 0, .44); g.addColorStop(0, '#ff9f12'); g.addColorStop(.38, '#ffd426'); g.addColorStop(.62, '#fff7b8'); g.addColorStop(1, '#ffbe3a');
    c.beginPath(); c.moveTo(1, .03); c.bezierCurveTo(.74, -.52, -.18, -.5 + ym, -.7, ym * .4 - .06); c.lineTo(-.7, ym * .4 + .08); c.bezierCurveTo(-.18, .5 + ym, .74, .48, 1, .03); c.closePath();
    c.stroke(); c.fillStyle = g; c.fill();
    // due squame in rilievo e la lama di luce sul dorso
    c.beginPath(); c.arc(-.02, ym * .5 + .02, .17, -1.1, 1.1); c.moveTo(-.2, ym * .7 + .18); c.arc(-.32, ym * .7 + .02, .17, -1.1, 1.1);
    c.strokeStyle = SQUAMA; c.lineWidth = .06; c.lineCap = 'round'; c.stroke();
    // tutto il bianco in un colpo solo: la lama di luce sul dorso, l'occhio e il luccichio (due stelline che si accendono a turno)
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(.1, -.25 + ym * .5, .3, .05, -.05, 0, TAU);
    c.moveTo(.76, -.06); c.arc(.6, -.06, .16, 0, TAU);
    stellina(c, -.12, -.4 + ym, .2 + .16 * Math.sin(F + .6)); stellina(c, .42, .26, .1 + .09 * Math.sin(F + 3.4));
    c.fill();
    c.fillStyle = PUPILLA; c.beginPath(); c.arc(.64, -.05, .09, 0, TAU); c.fill();
    c.restore();
  },
});
})();
