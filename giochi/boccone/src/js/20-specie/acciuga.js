/* Boccone — banco: ACCIUGA. Pesciolino sottile dei banchi (1 unità = mezza lunghezza; nel gioco è lungo una ventina di pixel
   e ce ne sono a decine, quindi pochissimi tratti e nessun attrezzo pesante di B.pittura; dipende solo da o.fase).
   Si riconosce dalla sardina perché è più snella, ha il dorso verde-blu, la fascia d'argento sul fianco, la pinnetta sulla
   schiena, il muso a punta che sporge e la bocca grande, tagliata fin dietro l'occhio. */
(() => {
'use strict';
const B = window.B, TAU = Math.PI * 2;

B.specie.registra({
  id: 'acciuga',
  forma: { lx: 1, ly: .28 },
  ingombro: { x0: -1.22, y0: -.61, x1: 1.16, y1: .61 },
  disegna(c, o) {
    const w = Math.sin((o.fase || 0) * TAU), yc = w * .17, ym = -w * .05;       // yc: la coda sbatte; ym: il corpo si flette al contrario
    c.save(); c.lineJoin = 'round';
    // coda a forca e pinnetta della schiena: un solo tracciato
    c.beginPath(); c.moveTo(-.5, ym * .5 - .05); c.lineTo(-1.1, yc - .31); c.quadraticCurveTo(-.82, yc, -1.1, yc + .31); c.lineTo(-.5, ym * .5 + .05); c.closePath();
    c.moveTo(.16, ym * .3 - .2); c.quadraticCurveTo(.02, ym * .5 - .36, -.1, ym * .6 - .4); c.lineTo(-.22, ym * .7 - .2); c.closePath();
    c.strokeStyle = '#0d3a4a'; c.lineWidth = .1; c.stroke(); c.fillStyle = '#27b39a'; c.fill();
    // corpo snello: dorso verde-blu, ventre d'argento; il muso a punta sporge oltre il mento
    const g = c.createLinearGradient(0, -.28, 0, .28); g.addColorStop(0, '#0e7c8e'); g.addColorStop(.36, '#2fd0a8'); g.addColorStop(.52, '#f4fffb'); g.addColorStop(1, '#bfe0ea');
    c.beginPath(); c.moveTo(1.04, -.01); c.bezierCurveTo(.72, -.31, -.15, -.3 + ym, -.72, ym * .4 - .05); c.lineTo(-.72, ym * .4 + .06); c.bezierCurveTo(-.2, .3 + ym, .62, .33, .86, .13); c.closePath();
    c.stroke(); c.fillStyle = g; c.fill();
    // fascia d'argento lungo il fianco e riflesso sul dorso
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-.12, ym * .7 + .02, .52, .055, 0, 0, TAU); c.moveTo(.38, ym * .5 - .2); c.ellipse(.1, ym * .5 - .19, .28, .035, -.04, 0, TAU); c.fill();
    // occhio grande; pupilla e bocca (un taglio scuro fin dietro l'occhio) nello stesso colpo
    c.fillStyle = '#fff'; c.beginPath(); c.arc(.6, -.05, .15, 0, TAU); c.fill();
    c.fillStyle = '#2a0f3a'; c.beginPath(); c.arc(.64, -.04, .085, 0, TAU); c.moveTo(.97, .05); c.lineTo(.5, .1); c.lineTo(.84, .15); c.closePath(); c.fill();
    c.restore();
  },
});
})();
