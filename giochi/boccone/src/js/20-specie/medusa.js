/* Boccone — pericolo: MEDUSA. Ombrello traslucido rosa-lilla dall'orlo a festoni, con dentro il «quadrifoglio» viola; sotto,
   quattro braccia orali arricciate e otto tentacoli sottili con la perlina urticante in punta.
   Dipende solo da o.fase (i tentacoli che ondeggiano) e da o.attivo (la spinta: l'ombrello si stringe e si allunga,
   braccia e tentacoli si distendono, e lei strizza gli occhi per lo sforzo). 1 unità = il raggio che fa male. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, abs, max, min } = Math;

// ---- tinte: rosa con le ombre viola; braccia più cariche, tentacoli lilla
const T = { ombrello: P.tinta('#ff8fd0', '#8a3fd0'), braccia: P.tinta('#ff6fb4', '#9a3ab8'), lontane: P.tinta('#dc62c2', '#6a2aa0'), filo: P.tinta('#dcaaff', '#6a3fd0') };
const GONADI = P.alfa('#b84fe0', .8), CUORE = P.alfa('#ffe0f6', .6), CANALI = 'rgba(255,255,255,.34)', SOTTO = P.alfa('#8a3ad0', .32), GOTA = P.alfa('#ff3f8f', .38), PERLA = '#fff3a8', BALZA = '#ffd2ee';
const FILI = [-.92, -.66, -.4, -.14, .14, .4, .66, .92];             // da dove pendono i tentacoli (in quote della larghezza)
const OCCHIO = { iride: '#7a3fe0', pelle: T.ombrello, guarda: { x: 0, y: .3 }, palpebra: .24 }, STRIZZATO = { pelle: T.ombrello, tipo: 'chiuso' };
const SORRISO = { curva: .8, tinta: T.ombrello, spess: .05 }, SFORZO = { apri: .7, alt: .13, curva: .5, tinta: T.ombrello, lingua: false, spess: .05 };
const PUNTE = [], ORLO = [];                                // tamponi riusati a ogni disegno (non tengono stato)

B.specie.registra({
  id: 'medusa',
  descrizione: 'Non ha cervello, né cuore, né ossa: è quasi tutta acqua. Eppure i suoi tentacoli pungono chiunque li sfiori.',
  forma: { lx: 1, ly: 1 },
  ingombro: { x0: -1.33, y0: -1.08, x1: 1.33, y1: 2.72 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, at = max(0, min(1, o.attivo || 0));
    const w = 1.02 - .17 * at, top = -(.9 + .12 * at), orlo = .2 + .07 * at;        // spingendo, l'ombrello si stringe e si allunga
    c.save();

    // ---- 1. sotto l'ombrello: i tentacoli sottili (con la perlina in punta) e le braccia orali arricciate
    PUNTE.length = 0; c.beginPath();                                  // tutti i tentacoli in un tracciato solo: due passate (bordo, colore) invece di sedici
    for (let i = 0; i < FILI.length; i++) {
      const x0 = FILI[i] * w * .9, lung = (1.7 + .36 * sin(i * 2.4)) * (1 + .12 * at), am = .17 * (1 - .55 * at);
      let px = x0, py = orlo - .06; c.moveTo(px, py);
      for (let k = 1; k <= 4; k++) {
        const x = x0 * (1 - k * .07 * at) + sin(F - k * 1.2 + i * 1.7) * am * k * .5, y = orlo + lung * k / 4;
        if (k > 1) c.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        px = x; py = y;
      }
      c.lineTo(px, py); PUNTE.push(px, py);
    }
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = T.filo.bordo; c.lineWidth = .11; c.stroke(); c.strokeStyle = T.filo.base; c.lineWidth = .048; c.stroke();
    P.lucine(c, PUNTE, .036, PERLA, .55 + .45 * at);
    for (let i = 0; i < 4; i++) {
      const lato = i % 2 ? 1 : -1, vicino = i > 1;
      P.tentacolo(c, { x: lato * (vicino ? .16 : .4) * w, y: orlo - .14, ang: PI / 2 - lato * (vicino ? .1 : -.12) * (1 - at * .6), lung: (vicino ? 1.35 : 1.05) * (1 + .12 * at), spess: vicino ? .27 : .21, punta: .08,
        curva: -lato * (vicino ? 2.3 : 2.9) * (1 - .6 * at), onda: .5 * (1 - .4 * at), fase: F + i * 1.9, onde: 1.8, n: 7, tinta: vicino ? T.braccia : T.lontane, ombra: 0, lume: 0,
        ventose: vicino ? 7 : 0, lato: -lato, chiara: BALZA });                                     // i pallini chiari fanno la balza arricciata
    }

    // ---- 2. l'ombrello traslucido: il sotto in trasparenza, i canali, il quadrifoglio
    const traccia = cc => {
      cc.beginPath(); cc.moveTo(-w, orlo - .04);
      cc.bezierCurveTo(-w * 1.07, top * 1.32, w * 1.07, top * 1.32, w, orlo - .04);
      for (let i = 0; i < 6; i++) { const xa = w - i * w / 3, xb = xa - w / 3; cc.quadraticCurveTo((xa + xb) / 2, orlo + .17, xb, orlo - .04); }   // l'orlo a festoni
      cc.closePath();
    };
    c.globalAlpha = .9;
    P.volume(c, traccia, T.ombrello, { luce: [.32, top * .8, 1.75], ombra: .1, dentro(cc) {
      cc.fillStyle = SOTTO; cc.beginPath(); cc.ellipse(0, orlo - .02, w * .88, .2, 0, 0, TAU); cc.fill();
      cc.beginPath(); for (let i = -3; i <= 3; i++) { cc.moveTo(i * .05, top * .8); cc.quadraticCurveTo(i * w * .2, top * .3, i * w * .31, orlo + .1); }
      cc.strokeStyle = CANALI; cc.lineWidth = .026; cc.stroke();
      cc.beginPath(); for (let i = 0; i < 4; i++) { const x = (i - 1.5) * .3 * w, y = top * .6 + abs(i - 1.5) * .05; cc.moveTo(x + .13 * w, y); cc.ellipse(x, y, .13 * w, .1, 0, 0, TAU); }
      cc.fillStyle = CUORE; cc.fill(); cc.strokeStyle = GONADI; cc.lineWidth = .055; cc.stroke();
    } });
    c.globalAlpha = 1;
    ORLO.length = 0; for (let i = 0; i <= 6; i++) ORLO.push(w - i * w / 3, orlo - .05);
    if (P.fine(o)) P.bozzi(c, ORLO, .04, T.ombrello);                                               // una perlina a ogni festone
    P.riflesso(c, w * .44, top * .68, .36, .8, .16);

    // ---- 3. il visino: occhi sognanti (strizzati mentre spinge), gote, bocca
    const su = at > .6;
    c.fillStyle = GOTA; c.beginPath(); c.ellipse(-.53 * w, .0, .1, .06, 0, 0, TAU); c.ellipse(.53 * w, .0, .1, .06, 0, 0, TAU); c.fill();
    P.occhio(c, -.3 * w, -.13, .16, su ? STRIZZATO : OCCHIO); P.occhio(c, .3 * w, -.13, .16, su ? STRIZZATO : OCCHIO);
    P.sorriso(c, 0, su ? .0 : .02, su ? .07 : .1, su ? SFORZO : SORRISO);
    c.restore();
  },
});
})();
