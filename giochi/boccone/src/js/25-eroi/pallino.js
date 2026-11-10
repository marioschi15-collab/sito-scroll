/* Boccone — eroe: PALLINO, il pesce palla. ESEMPIO DI RIFERIMENTO per gli eroi (vedi GUIDA-STILE.md).
   Tre stadi (cucciolo tondo e tenero, adulto con le prime spine, colosso dall'aria da duro), quattro espressioni,
   bocca che si apre, pupilla che segue lo sguardo. */
(() => {
'use strict';
const B = window.B, P = B.pittura, U = B.util, TAU = Math.PI * 2, PI = Math.PI, GRADI = PI / 180;
const { sin, cos, max, min, abs } = Math;

// ---- tinte e misure dei tre stadi: tutto ciò che cambia crescendo sta qui, il disegno è uno solo
const GIALLO = c => P.tinta(c, '#ff6a14'), CREMA = c => P.tinta(c, '#e8925c');
const STADI = [
  { rx: .98, ry: .96, gobbe: [[16, 26, .06]], corpo: P.tinta('#34d8c8'), sella: '#1fb6c4', ventre: CREMA('#fff6da'), pinna: GIALLO('#ffd83a'), orlo: '#fff0a0',
    occhio: .36, ox: .36, oy: -.2, spine: .1, nSpine: 8, coda: .5, pin: .4, bocca: .2 },
  { rx: 1.03, ry: .93, gobbe: [[14, 24, .09], [180, 46, -.05]], corpo: P.tinta('#1cc3cd'), sella: '#0f93b8', ventre: CREMA('#fff1c8'), pinna: GIALLO('#ffc61c'), orlo: '#ff9226',
    occhio: .31, ox: .4, oy: -.21, spine: .2, nSpine: 10, coda: .6, pin: .5, bocca: .23 },
  { rx: 1.05, ry: .97, gobbe: [[12, 22, .1], [52, 30, .06], [-40, 20, .05], [180, 40, -.04]], corpo: P.tinta('#13a6c2'), sella: '#0a5f96', ventre: CREMA('#ffe9b4'), pinna: GIALLO('#ffb214'), orlo: '#ff5a1f',
    occhio: .27, ox: .43, oy: -.2, spine: .3, nSpine: 12, coda: .68, pin: .6, bocca: .26 },
];
for (const K of STADI) K.pinnaLontana = P.tinta(K.pinna.ombra, '#c2410c');
const AVORIO = P.tinta('#fff3d2', '#e07a3a'), LABBRO = P.tinta('#e8467a'), IRIDE = '#5b3bd6';
const NEI = [[-.5, -.38], [-.2, -.6], [-.72, -.06], [-.42, -.1], [-.14, -.34], [-.66, .26], [.04, -.72], [-.32, .2]];
/* Raggio della sagoma nella direzione ang (0 = muso, 90° = pancia): un'ellisse con qualche gobba (fronte, mento, groppa). */
const raggio = (K, ang) => {
  let r = 1 / Math.hypot(cos(ang) / K.rx, sin(ang) / K.ry);
  for (const g of K.gobbe) { const d = U.differenzaAngolo(g[0] * GRADI, ang) / (g[1] * GRADI); r += g[2] * Math.exp(-d * d); }
  return r;
};

B.eroi.registra({
  id: 'pallino',
  descrizione: 'Un pesce palla curioso e goloso. Da piccolo è una pallina tenera; più mangia, più mette spine e grinta. Quando ha paura si gonfia come un palloncino.',
  ingombro: { x0: -1.86, y0: -1.66, x1: 1.34, y1: 1.66 },
  disegna(c, o) {
    const st = max(0, min(2, o.stadio | 0)), K = STADI[st], esp = o.espressione || 'normale', F = (o.fase || 0) * TAU, t = o.t || 0, b = max(0, min(1, o.bocca || 0));
    const paura = esp === 'spaventato', colpito = esp === 'colpito', felice = esp === 'felice';
    const gonfio = (paura ? 1.06 : 1) + sin(t * 2.4) * .008, nuota = sin(F), rema = sin(F * 2 + .6);
    c.save();
    if (paura) c.translate(sin(t * 41) * .012, 0);                   // trema
    c.rotate(nuota * .045 + (colpito ? -.12 : 0));                   // dondola nuotando; il colpo lo ribalta un po'
    c.scale(gonfio * (1 + sin(F * 2) * .014) * (colpito ? .95 : 1), gonfio * (1 - sin(F * 2) * .014) * (colpito ? 1.05 : 1));
    const sag = []; for (let i = 0; i < 18; i++) { const a = i * 20 * GRADI, r = raggio(K, a); sag.push(cos(a) * r, sin(a) * r); }
    const luce = [.26, -.44, 1.6];

    // ---- 1. dietro al corpo: pinna pettorale lontana, coda, spine, dorsale, anale
    P.pinna(c, { x0: .2, y0: .66, x1: 0, y1: .74, a0: PI * .5 - .2 - rema * .3, a1: PI * .8 - rema * .3, lung: K.pin * .8, profilo: [.7, 1, .8], n: 4, tinta: K.pinnaLontana, righe: false });
    P.coda(c, { x: -raggio(K, PI) + .1, y: .04, ang: PI + sin(F - .7) * .5, tipo: st === 2 ? 'tronca' : 'ventaglio', lung: K.coda, alt: K.coda * .84, radice: .14, fase: F - 1.7, onda: .26,
      tinta: K.pinna, orlo: K.orlo, smerlo: st === 2 ? .7 : 0, n: 7 });
    const lsp = K.spine * (paura ? 1.7 - st * .2 : 1) * (1 + sin(t * 2.4) * .04);        // le spine si drizzano con la paura
    for (let passata = 0; passata < 2; passata++) {
      c.beginPath();
      for (let i = 0; i < K.nSpine; i++) {
        const a = (64 + i * 232 / (K.nSpine - 1)) * GRADI, r = raggio(K, a) - .06, d = .075 + K.spine * .1, L = lsp * (.75 + .5 * U.rumore(i, 4)), p = a + (a < PI ? .16 : -.16);
        c.moveTo(cos(a - d) * r, sin(a - d) * r); c.quadraticCurveTo(cos(a - d * .2) * (r + L * .55), sin(a - d * .2) * (r + L * .55), cos(p) * (r + L + .06), sin(p) * (r + L + .06));
        c.quadraticCurveTo(cos(a + d * .5) * (r + L * .5), sin(a + d * .5) * (r + L * .5), cos(a + d) * r, sin(a + d) * r);
      }
      if (!passata) { c.strokeStyle = AVORIO.bordo; c.lineWidth = .075; c.lineJoin = 'round'; c.stroke(); }
      else { const g = c.createRadialGradient(0, 0, .92, 0, 0, 1.04 + lsp); g.addColorStop(0, st === 2 ? '#ff8a2a' : '#ffb85a'); g.addColorStop(.6, AVORIO.base); g.addColorStop(1, '#ffffff'); c.fillStyle = g; c.fill(); }
    }
    const rs = raggio(K, -118 * GRADI) - .1, ra = raggio(K, 122 * GRADI) - .1;
    P.pinna(c, { x0: cos(-98 * GRADI) * rs, y0: sin(-98 * GRADI) * rs, x1: cos(-138 * GRADI) * rs, y1: sin(-138 * GRADI) * rs, a0: -PI * .6, a1: -PI * .93,
      lung: K.pin * 1.1, profilo: [.75, 1, .92, .62], n: 5, onda: .2, fase: F * 2, passo: .8, tinta: K.pinna, orlo: K.orlo });
    P.pinna(c, { x0: cos(106 * GRADI) * ra, y0: sin(106 * GRADI) * ra, x1: cos(140 * GRADI) * ra, y1: sin(140 * GRADI) * ra, a0: PI * .62, a1: PI * .93,
      lung: K.pin * .9, profilo: [.75, 1, .88, .6], n: 5, onda: .2, fase: F * 2 + 1, passo: .8, tinta: K.pinna, orlo: K.orlo });

    // ---- 2. il corpo: un solo volume, con sella scura sul dorso, macchie e pancia crema dipinte dentro
    P.volume(c, cc => P.profilo(cc, sag), K.corpo, { luce, ombra: .13, dentro(cc) {
      if (st) {
        cc.fillStyle = P.alfa(K.sella, .8); cc.beginPath(); cc.ellipse(-.42, -.95, 1.0, .52, -.12, 0, TAU); cc.fill();
        cc.fillStyle = P.alfa(K.sella, .9); cc.beginPath();
        for (let i = 0; i < (st === 2 ? 7 : 5); i++) { const x = -.78 + i * .2 + U.rumore(i, 2) * .08, y = -.32 + U.rumore(i, 3) * .16 - abs(i - 3) * .03, r = .055 + U.rumore(i, 5) * .04 + st * .012; cc.moveTo(x + r * 1.3, y); cc.ellipse(x, y, r * 1.3, r, -.2, 0, TAU); }
        cc.fill();
      }
      cc.fillStyle = P.sfumatura(cc, K.ventre, [.3, .1, 1.5]); cc.beginPath(); cc.ellipse(.16, 1.02, 1.12, .8, -.1, 0, TAU); cc.fill();
      cc.strokeStyle = P.alfa(K.ventre.scura, .35); cc.lineWidth = .028; cc.lineCap = 'round'; cc.beginPath();          // pieghe della pancia
      for (let i = 0; i < 4; i++) { cc.moveTo(-.5 + i * .27, .62 + abs(i - 1.5) * .05); cc.quadraticCurveTo(-.46 + i * .27, .8, -.52 + i * .28, .96); }
      cc.stroke();
    } });
    // particolari in rilievo: nei da cucciolo, spinette da grande
    if (st) for (let i = 0; i < 8; i++) {
      const x = NEI[i][0], y = NEI[i][1], r = .04 + st * .012;
      c.beginPath(); c.moveTo(x + r, y + r * .9); c.quadraticCurveTo(x - r, y + r * .3, x - r * (1.8 + st), y - r * .8); c.quadraticCurveTo(x - r * .2, y - r * 1.1, x + r * .9, y - r * .7); c.closePath();
      c.strokeStyle = P.alfa(K.corpo.bordo, .75); c.lineWidth = .04; c.lineJoin = 'round'; c.stroke(); c.fillStyle = AVORIO.base; c.fill();
    } else P.bozzi(c, [-.5, -.38, -.2, -.6, -.72, -.06, -.42, -.1, -.14, -.34], .042, K.corpo);
    P.riflesso(c, .12, -.73, .5, -.1, .15);
    P.guancia(c, K.ox - .16, K.oy + K.occhio + .16, .19, '#ff5f93', felice ? .8 : .55);

    // ---- 3. sul fianco: la pinna pettorale che rema, con la sua ombra di contatto
    const px = -.14, py = .26, ap = PI * .88 + rema * .45;
    P.ombra(c, px - .2, py + .12, K.pin * .9, K.pin * .55, -.4, .26);
    P.pinna(c, { x0: px + .08, y0: py - .1, x1: px - .02, y1: py + .14, a0: ap - .85 - rema * .12, a1: ap + .85 + rema * .12, lung: K.pin * 1.05, profilo: [.6, .88, 1, 1, .88, .6], n: 6,
      onda: .12, fase: F * 2, passo: .7, tinta: K.pinna, orlo: K.orlo, primo: true });

    // ---- 4. la faccia: occhio, sopracciglio, bocca
    const ammicca = (t % 4.2) > 4.05;
    const sg = colpito ? P.SGUARDI.colpito : felice ? P.SGUARDI.felice : paura ? P.SGUARDI.spaventato : ammicca ? P.SGUARDI.felice : st === 2 ? { palpebra: .26, taglio: .2 } : P.SGUARDI.normale;
    P.occhio(c, K.ox, K.oy, K.occhio, Object.assign({ iride: IRIDE, pelle: K.corpo, guarda: P.sguardo(o.sguardo, K.ox, K.oy) }, sg));
    if (paura) P.sopracciglio(c, K.ox + .02, K.oy - K.occhio * 1.42, K.occhio * 1.1, -.32, K.corpo.bordo, .06);
    if (st === 2 && !paura && !colpito) {                              // da colosso: sopracciglio da duro e cicatrice
      P.sopracciglio(c, K.ox + .06, K.oy - K.occhio * 1.02, K.occhio * 1.9, .3, K.corpo.bordo, .1);
      P.solco(c, [K.ox - .34, K.oy - .46, K.ox - .22, K.oy - .26, K.ox - .16, K.oy - .02], K.corpo, .04);
    }
    const bx = .7, by = .34 + (st === 2 ? .04 : 0), w = K.bocca;
    if (paura) P.sorriso(c, bx + .04, by + .02, w * .5, { ang: -.3, apri: .55 + sin(t * 30) * .08, alt: w * .8, curva: -.3, lingua: false, tinta: LABBRO, spess: .06 });
    else if (colpito) P.sorriso(c, bx, by, w * .95, { ang: -.3, apri: .6, alt: w * .7, curva: -.8, denti: 'tutti', lingua: false, tinta: LABBRO, spess: .06 });
    else P.sorriso(c, bx, by, w, { ang: -.3, apri: b * (felice ? 1 : .9), alt: w * 1.55, curva: felice ? 1 : .75, denti: st === 2 ? 'tutti' : 'su', tinta: LABBRO, spess: .06 });

    // ---- 5. i segni dell'espressione
    if (paura) P.goccia(c, -.02, -.52 + sin(t * 5) * .015, .075, -.5);
    if (colpito) P.stelle(c, .22, -1.2, .55, t, 3, .12);
    c.restore();
  },
});
})();
