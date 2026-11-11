/* Boccone — banco: SARDINA. ESEMPIO DI RIFERIMENTO per i pesciolini dei banchi (vedi GUIDA-STILE.md).
   VERSIONE RITOCCATA PER LO STILE «FILM D'ANIMAZIONE» (anteprime/film/modelli). I pesciolini dei banchi si disegnano a
   mano, senza la cassetta: per questo lo stile nuovo va portato qui dentro a mano. Niente più contorno scuro spesso: una
   linea sottile blu scivolata verso il ventre, il corpo modellato dalla luce (dorso blu in luce, fianco azzurro, ventre
   d'argento che in basso prende il colore dell'acqua), coda semitrasparente, riflesso morbido più un puntino netto,
   occhio grande con l'ombra in alto e il suo riflesso. Sempre pochissimi tratti (tetto di costo ×4). */
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
    // coda a forca: una membrana azzurra un po' trasparente
    c.beginPath(); c.moveTo(-.5, ym * .5 - .06); c.lineTo(-1.08, yc - .38); c.quadraticCurveTo(-.82, yc, -1.08, yc + .38); c.lineTo(-.5, ym * .5 + .06); c.closePath();
    c.fillStyle = 'rgba(78,150,232,.86)'; c.fill(); c.strokeStyle = 'rgba(34,74,168,.8)'; c.lineWidth = .035; c.stroke();
    // corpo: dorso blu, fianco azzurro, ventre d'argento, e in fondo un filo del colore dell'acqua (luce di rimbalzo)
    const g = c.createLinearGradient(0, -.36, 0, .38);
    g.addColorStop(0, '#5f9cf0'); g.addColorStop(.16, '#2a5fd0'); g.addColorStop(.42, '#58b4f2'); g.addColorStop(.56, '#f4fbff'); g.addColorStop(.8, '#b9cdf0'); g.addColorStop(1, '#8fdcf6');
    const corpo = () => { c.beginPath(); c.moveTo(1, .02); c.bezierCurveTo(.7, -.42, -.2, -.4 + ym, -.72, ym * .4 - .05); c.lineTo(-.72, ym * .4 + .07); c.bezierCurveTo(-.2, .4 + ym, .7, .4, 1, .02); c.closePath(); };
    c.translate(.012, .028); corpo(); c.strokeStyle = '#1b3a8c'; c.lineWidth = .06; c.stroke(); c.translate(-.012, -.028);   // la linea: sottile, più visibile dal lato in ombra
    corpo(); c.fillStyle = g; c.fill();
    // fila di puntini scuri e riflesso sul dorso (alone morbido più puntino netto)
    c.fillStyle = 'rgba(27,47,115,.75)'; c.beginPath(); for (let i = 0; i < 4; i++) { const x = .28 - i * .24, y = ym * (.3 + i * .2); c.moveTo(x + .045, y); c.arc(x, y, .045, 0, TAU); } c.fill();
    c.fillStyle = 'rgba(255,255,255,.42)'; c.beginPath(); c.ellipse(-.02, -.21 + ym * .5, .36, .06, -.04, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.ellipse(-.16, -.22 + ym * .5, .075, .032, -.04, 0, TAU); c.fill();
    // occhio: orbita morbida, bulbo con l'ombra in alto, pupilla e il suo riflesso
    c.fillStyle = 'rgba(20,34,96,.5)'; c.beginPath(); c.arc(.62, -.04, .185, 0, TAU); c.fill();
    c.fillStyle = '#c3cff2'; c.beginPath(); c.arc(.62, -.05, .15, 0, TAU); c.fill();                           // in alto resta l'ombra della palpebra
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(.62, -.02, .125, 0, TAU); c.fill();
    c.fillStyle = '#14173a'; c.beginPath(); c.arc(.66, -.04, .09, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(.63, -.075, .034, 0, TAU); c.fill();
    c.restore();
  },
});
})();
