/* Boccone — banco: PESCIOLINO DORATO. Il banco raro che vale di più: un pesciolino paffuto tutto d'oro, con la coda a
   ventaglio arancio, due squame in rilievo e una stellina di luce che gli si accende e spegne sul dorso mentre nuota.
   Come la sardina: pochissimi tratti (costo sotto ×2,5), niente attrezzi pesanti; dipende solo da o.fase.
   RIFATTO NELLO STILE «FILM D'ANIMAZIONE» sul modello della sardina: niente più contorno scuro spesso ma una linea sottile
   color rame scivolata verso il ventre, il corpo modellato dalla luce (filo di luce in cima, oro carico sul dorso, oro
   chiaro sul fianco, pancia quasi bianca, e in fondo l'ambra calda del rimbalzo), la coda a membrana, le squame a filo
   sottile, riflesso morbido più un puntino netto, occhio con l'ombra della palpebra in alto e il suo riflesso. */
(() => {
'use strict';
const B = window.B, TAU = Math.PI * 2;
const LINEA = '#9a3c0a', SQUAMA = 'rgba(206,92,8,.6)', PUPILLA = '#3b1030';
/* Una stellina a quattro punte di raggio r, aggiunta al tracciato in corso. */
const stellina = (c, x, y, r) => {
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
};

B.specie.registra({
  id: 'dorato',
  forma: { lx: 1, ly: .44 },
  ingombro: { x0: -1.16, y0: -.83, x1: 1.11, y1: .66 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, w = Math.sin(F), yc = w * .16, ym = -w * .05;      // yc: la coda sbatte; ym: il corpo si flette al contrario
    c.save(); c.lineJoin = 'round';
    // coda a ventaglio: una membrana arancio un po' trasparente
    c.beginPath(); c.moveTo(-.46, ym * .5 - .07); c.quadraticCurveTo(-.84, yc - .52, -1.08, yc - .4); c.quadraticCurveTo(-.86, yc, -1.08, yc + .4); c.quadraticCurveTo(-.84, yc + .52, -.46, ym * .5 + .07); c.closePath();
    c.fillStyle = 'rgba(255,158,34,.94)'; c.fill(); c.strokeStyle = 'rgba(170,58,10,.8)'; c.lineWidth = .035; c.stroke();
    // corpo paffuto: filo di luce in cima, oro carico sul dorso, oro chiaro sul fianco, pancia quasi bianca, e in fondo l'ambra del rimbalzo
    const g = c.createLinearGradient(0, -.46, 0, .48);
    g.addColorStop(0, '#ffe07a'); g.addColorStop(.16, '#ff9a10'); g.addColorStop(.42, '#ffd426'); g.addColorStop(.62, '#fff8c0'); g.addColorStop(.84, '#ffb630'); g.addColorStop(1, '#ffe4a6');
    const corpo = () => { c.beginPath(); c.moveTo(1, .03); c.bezierCurveTo(.74, -.52, -.18, -.5 + ym, -.7, ym * .4 - .06); c.lineTo(-.7, ym * .4 + .08); c.bezierCurveTo(-.18, .5 + ym, .74, .48, 1, .03); c.closePath(); };
    c.translate(.012, .028); corpo(); c.strokeStyle = LINEA; c.lineWidth = .06; c.stroke(); c.translate(-.012, -.028);        // la linea: sottile, più visibile dal lato in ombra
    corpo(); c.fillStyle = g; c.fill();
    // due squame in rilievo, a filo sottile
    c.beginPath(); c.arc(-.02, ym * .5 + .02, .17, -1.1, 1.1); c.moveTo(-.2, ym * .7 + .18); c.arc(-.32, ym * .7 + .02, .17, -1.1, 1.1);
    c.strokeStyle = SQUAMA; c.lineWidth = .038; c.lineCap = 'round'; c.stroke();
    // l'alone morbido del riflesso sul dorso; poi l'occhio: un disco ambra che fa da orbita e da ombra della palpebra
    // (il bianco sta più in basso: in alto ne resta di più)
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(.08, -.27 + ym * .5, .36, .07, -.05, 0, TAU); c.fill();
    c.fillStyle = '#d07a24'; c.beginPath(); c.arc(.6, -.066, .186, 0, TAU); c.fill();
    // tutto il bianco in un colpo solo: il puntino netto del riflesso, l'occhio e il luccichio (due stelline che si accendono a turno)
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(-.06, -.285 + ym * .5, .08, .034, -.05, 0, TAU);
    c.moveTo(.74, -.04); c.arc(.6, -.04, .14, 0, TAU);
    stellina(c, -.12, -.4 + ym, .2 + .16 * Math.sin(F + .6)); stellina(c, .42, .26, .1 + .09 * Math.sin(F + 3.4));
    c.fill();
    c.fillStyle = PUPILLA; c.beginPath(); c.arc(.64, -.055, .095, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(.61, -.092, .036, 0, TAU); c.fill();
    c.restore();
  },
});
})();
