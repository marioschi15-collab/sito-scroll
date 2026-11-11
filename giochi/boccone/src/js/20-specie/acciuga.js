/* Boccone — banco: ACCIUGA. Pesciolino sottile dei banchi (1 unità = mezza lunghezza; nel gioco è lungo una ventina di pixel
   e ce ne sono a decine, quindi pochissimi tratti e nessun attrezzo pesante di B.pittura; dipende solo da o.fase).
   Si riconosce dalla sardina perché è più snella, ha il dorso verde-blu, la fascia d'argento sul fianco, la pinnetta sulla
   schiena, il muso a punta che sporge e la bocca grande, tagliata fin dietro l'occhio.
   RIFATTA NELLO STILE «FILM D'ANIMAZIONE» sul modello della sardina: niente più contorno scuro spesso ma una linea sottile
   blu scivolata verso il ventre (blu e non verde: così stacca anche dall'acqua verde), il corpo modellato dalla luce
   (filo di luce in cima, dorso verde-blu, fianco verde acqua, ventre d'argento che in fondo prende il colore dell'acqua),
   coda e pinnetta a membrana un po' trasparente, occhio con l'ombra della palpebra in alto e il suo riflesso.
   Dieci tratti in tutto: il costo deve restare vicino a quello della sardina (tetto ×2,5). */
(() => {
'use strict';
const B = window.B, TAU = Math.PI * 2;

B.specie.registra({
  id: 'acciuga',
  forma: { lx: 1, ly: .28 },
  ingombro: { x0: -1.19, y0: -.55, x1: 1.13, y1: .55 },
  disegna(c, o) {
    const w = Math.sin((o.fase || 0) * TAU), yc = w * .17, ym = -w * .05;       // yc: la coda sbatte; ym: il corpo si flette al contrario
    c.save(); c.lineJoin = 'round';
    // coda a forca e pinnetta della schiena: un solo tracciato, due membrane verde acqua un po' trasparenti
    c.beginPath(); c.moveTo(-.5, ym * .5 - .05); c.lineTo(-1.1, yc - .31); c.quadraticCurveTo(-.82, yc, -1.1, yc + .31); c.lineTo(-.5, ym * .5 + .05); c.closePath();
    c.moveTo(.16, ym * .3 - .2); c.quadraticCurveTo(.02, ym * .5 - .36, -.1, ym * .6 - .4); c.lineTo(-.22, ym * .7 - .2); c.closePath();
    c.fillStyle = 'rgba(60,208,178,.86)'; c.fill(); c.strokeStyle = 'rgba(12,66,116,.8)'; c.lineWidth = .035; c.stroke();
    // corpo snello: filo di luce in cima, dorso verde-blu, fianco verde acqua, ventre d'argento, e in fondo il colore dell'acqua
    const g = c.createLinearGradient(0, -.29, 0, .31);
    g.addColorStop(0, '#6adcd0'); g.addColorStop(.17, '#0c789c'); g.addColorStop(.4, '#2fd4a6'); g.addColorStop(.54, '#f6fffb'); g.addColorStop(.8, '#b4d0ea'); g.addColorStop(1, '#8fdcf6');
    const corpo = () => { c.beginPath(); c.moveTo(1.04, -.01); c.bezierCurveTo(.72, -.31, -.15, -.3 + ym, -.72, ym * .4 - .05); c.lineTo(-.72, ym * .4 + .06); c.bezierCurveTo(-.2, .3 + ym, .62, .33, .86, .13); c.closePath(); };
    c.translate(.012, .028); corpo(); c.strokeStyle = '#0b2a6e'; c.lineWidth = .06; c.stroke(); c.translate(-.012, -.028);   // la linea: sottile, più visibile dal lato in ombra
    corpo(); c.fillStyle = g; c.fill();
    // in un colpo solo: la fascia d'argento del fianco (il riflesso lungo della pelle umida) e il puntino netto sul dorso
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(-.12, ym * .7 + .02, .52, .05, 0, 0, TAU); c.moveTo(.11, ym * .5 - .19); c.ellipse(.02, ym * .5 - .188, .09, .03, -.04, 0, TAU); c.fill();
    // occhio: un disco blu che fa da orbita e da ombra della palpebra (il bianco sta più in basso: in alto ne resta di più);
    // pupilla e bocca (un taglio scuro fin dietro l'occhio) nello stesso colpo; il riflesso
    c.fillStyle = '#2c6aa2'; c.beginPath(); c.arc(.6, -.056, .172, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(.6, -.03, .128, 0, TAU); c.fill();
    c.fillStyle = '#17163e'; c.beginPath(); c.arc(.64, -.045, .088, 0, TAU); c.moveTo(.97, .05); c.lineTo(.5, .1); c.lineTo(.84, .15); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(.612, -.08, .033, 0, TAU); c.fill();
    c.restore();
  },
});
})();
