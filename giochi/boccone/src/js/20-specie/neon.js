/* Boccone — banco: PESCIOLINO NEON. Minuscolo e tondetto, con la striscia azzurra elettrica dall'occhio alla coda, la pancia
   d'argento che dietro diventa rossa e la codina rossa. Come la sardina: pochissimi tratti, niente attrezzi pesanti.
   Dipende solo da o.fase.
   RIFATTO NELLO STILE «FILM D'ANIMAZIONE» sul modello della sardina: niente più contorno scuro spesso ma una linea sottile
   indaco scivolata verso il ventre, il corpo modellato dalla luce (filo di luce in cima, dorso blu notte, pancia d'argento
   che in fondo prende il colore dell'acqua), il rosso della pancia che sfuma in avanti, la codina a membrana, occhio con
   l'ombra della palpebra in alto e il suo riflesso. Dieci tratti in tutto (tetto di costo ×2,5). */
(() => {
'use strict';
const B = window.B, TAU = Math.PI * 2;

B.specie.registra({
  id: 'neon',
  forma: { lx: 1, ly: .4 },
  ingombro: { x0: -1.11, y0: -.74, x1: 1.11, y1: .66 },
  disegna(c, o) {
    const w = Math.sin((o.fase || 0) * TAU), yc = w * .17, ym = -w * .05;      // yc: la coda sbatte; ym: il corpo si flette al contrario
    const sy = -.2 + ym * .6, cy = ym * .4 - .04;                              // la striscia: quota a metà corpo e in coda
    c.save(); c.lineJoin = 'round';
    // codina rossa a forca: una membrana un po' trasparente
    c.beginPath(); c.moveTo(-.48, ym * .5 - .07); c.lineTo(-1.04, yc - .4); c.quadraticCurveTo(-.8, yc, -1.04, yc + .4); c.lineTo(-.48, ym * .5 + .07); c.closePath();
    c.fillStyle = 'rgba(255,74,98,.88)'; c.fill(); c.strokeStyle = 'rgba(150,20,90,.8)'; c.lineWidth = .035; c.stroke();
    // corpo con la pinnetta del dorso in un solo contorno: filo di luce in cima, dorso blu notte, pancia d'argento, e in fondo il colore dell'acqua
    const g = c.createLinearGradient(0, -.42, 0, .44);
    g.addColorStop(0, '#8a94f6'); g.addColorStop(.2, '#2a2c96'); g.addColorStop(.5, '#3038a6'); g.addColorStop(.62, '#f6fbff'); g.addColorStop(.84, '#bccdf2'); g.addColorStop(1, '#8fdcf6');
    const corpo = () => {
      c.beginPath(); c.moveTo(1, .03); c.quadraticCurveTo(.7, -.36, .22, -.345 + ym * .6); c.quadraticCurveTo(0, -.7 + ym, -.26, -.6 + ym); c.lineTo(-.22, -.29 + ym * .8);
      c.quadraticCurveTo(-.48, -.2 + ym * .7, -.7, ym * .4 - .06); c.lineTo(-.7, ym * .4 + .08); c.bezierCurveTo(-.18, .46 + ym, .74, .44, 1, .03); c.closePath();
    };
    c.translate(.012, .028); corpo(); c.strokeStyle = '#1b1872'; c.lineWidth = .06; c.stroke(); c.translate(-.012, -.028);    // la linea: sottile, più visibile dal lato in ombra
    corpo(); c.fillStyle = g; c.fill();
    // la pancia di dietro è rossa, e sfuma in avanti
    const rosso = c.createLinearGradient(-.66, 0, .1, 0); rosso.addColorStop(0, '#ff3d55'); rosso.addColorStop(.5, 'rgba(255,61,85,.9)'); rosso.addColorStop(1, 'rgba(255,61,85,0)');
    c.beginPath(); c.moveTo(-.66, ym * .4 + .02); c.quadraticCurveTo(-.3, .02 + ym * .7, .1, .04 + ym * .3); c.quadraticCurveTo(-.06, .38 + ym * .6, -.66, ym * .4 + .06); c.closePath();
    c.fillStyle = rosso; c.fill();
    // la striscia al neon: larga dietro l'occhio (che ne copre l'inizio), a punta verso la coda
    c.beginPath(); c.moveTo(.72, -.15); c.quadraticCurveTo(.1, sy - .13, -.64, cy); c.quadraticCurveTo(.1, sy + .13, .72, .02); c.closePath();
    c.fillStyle = '#19d3ff'; c.fill();
    // l'occhio: un disco blu che fa da orbita e da ombra della palpebra (il bianco sta più in basso: in alto ne resta di più)
    c.fillStyle = '#4a56b8'; c.beginPath(); c.arc(.6, -.036, .19, 0, TAU); c.fill();
    // l'anima chiara della striscia e il bianco dell'occhio in un colpo solo (l'arco gira nello stesso verso, così non si bucano)
    c.beginPath(); c.moveTo(.7, -.095); c.quadraticCurveTo(.1, sy - .05, -.5, cy); c.quadraticCurveTo(.1, sy + .035, .7, -.04); c.closePath();
    c.moveTo(.742, -.008); c.arc(.6, -.008, .142, 0, TAU, true);
    c.fillStyle = '#f2feff'; c.fill();
    c.fillStyle = '#14173a'; c.beginPath(); c.arc(.64, -.025, .098, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(.61, -.065, .037, 0, TAU); c.fill();
    c.restore();
  },
});
})();
