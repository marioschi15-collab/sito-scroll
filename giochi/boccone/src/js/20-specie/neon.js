/* Boccone — banco: PESCIOLINO NEON. Minuscolo e tondetto, con la striscia azzurra elettrica dall'occhio alla coda, la pancia
   d'argento che dietro diventa rossa e la codina rossa. Come la sardina: pochissimi tratti (due bordi e sei riempimenti),
   niente attrezzi pesanti, ma bordo scuro colorato, occhio grande e un'anima di luce nella striscia. Dipende solo da o.fase. */
(() => {
'use strict';
const B = window.B, TAU = Math.PI * 2;

B.specie.registra({
  id: 'neon',
  forma: { lx: 1, ly: .4 },
  ingombro: { x0: -1.16, y0: -.77, x1: 1.11, y1: .69 },
  disegna(c, o) {
    const w = Math.sin((o.fase || 0) * TAU), yc = w * .17, ym = -w * .05;      // yc: la coda sbatte; ym: il corpo si flette al contrario
    const sy = -.2 + ym * .6, cy = ym * .4 - .04;                              // la striscia: quota a metà corpo e in coda
    c.save(); c.lineJoin = 'round';
    // codina rossa a forca
    c.beginPath(); c.moveTo(-.48, ym * .5 - .07); c.lineTo(-1.04, yc - .4); c.quadraticCurveTo(-.8, yc, -1.04, yc + .4); c.lineTo(-.48, ym * .5 + .07); c.closePath();
    c.strokeStyle = '#2a1460'; c.lineWidth = .1; c.stroke(); c.fillStyle = '#ff3d55'; c.fill();
    // corpo con la pinnetta del dorso in un solo contorno (costa meno di due sagome sovrapposte): dorso blu notte, fianco e pancia d'argento
    const g = c.createLinearGradient(0, -.4, 0, .4); g.addColorStop(0, '#4a52c8'); g.addColorStop(.36, '#2c2f8e'); g.addColorStop(.6, '#f4fbff'); g.addColorStop(1, '#c4d6f4');
    c.beginPath(); c.moveTo(1, .03); c.quadraticCurveTo(.7, -.36, .22, -.345 + ym * .6); c.quadraticCurveTo(0, -.7 + ym, -.26, -.6 + ym); c.lineTo(-.22, -.29 + ym * .8);
    c.quadraticCurveTo(-.48, -.2 + ym * .7, -.7, ym * .4 - .06); c.lineTo(-.7, ym * .4 + .08); c.bezierCurveTo(-.18, .46 + ym, .74, .44, 1, .03); c.closePath();
    c.stroke(); c.fillStyle = g; c.fill();
    // la pancia di dietro è rossa
    c.beginPath(); c.moveTo(-.66, ym * .4 + .02); c.quadraticCurveTo(-.3, .02 + ym * .7, .08, .04 + ym * .3); c.quadraticCurveTo(-.06, .36 + ym * .6, -.66, ym * .4 + .06); c.closePath();
    c.fillStyle = '#ff3d55'; c.fill();
    // la striscia al neon: larga dietro l'occhio (che ne copre l'inizio), a punta verso la coda. I riempimenti costano meno dei tratti spessi
    c.beginPath(); c.moveTo(.72, -.15); c.quadraticCurveTo(.1, sy - .13, -.64, cy); c.quadraticCurveTo(.1, sy + .13, .72, .02); c.closePath();
    c.fillStyle = '#19d3ff'; c.fill();
    // l'anima chiara della striscia e il bianco dell'occhio in un colpo solo (l'arco gira nello stesso verso, così non si bucano)
    c.beginPath(); c.moveTo(.7, -.095); c.quadraticCurveTo(.1, sy - .05, -.5, cy); c.quadraticCurveTo(.1, sy + .035, .7, -.04); c.closePath();
    c.moveTo(.77, -.03); c.arc(.6, -.03, .17, 0, TAU, true);
    c.fillStyle = '#eefeff'; c.fill();
    c.fillStyle = '#14173a'; c.beginPath(); c.arc(.64, -.02, .095, 0, TAU); c.fill();
    c.restore();
  },
});
})();
