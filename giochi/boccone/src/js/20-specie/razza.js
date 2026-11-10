/* Boccone — specie: RAZZA (taglia 4, pigra). Vista di tre quarti dall'alto: un aquilone color sabbia che batte le ali.
   Il disco a rombo è UN pezzo solo (sagoma mia, non P.lama): muso a punta, ala vicina grande e in luce, ala lontana più
   corta e velata di scuro, orli d'uscita che fanno l'onda. Sopra c'è il dorso rialzato, con i due occhi in cima e la fila
   di spine. IL SUO SEGNO: gli occhielli azzurri cerchiati di blu, uno grande per ala, che sembrano occhi finti.
   Coda a frusta con le due pinnette in fondo. Quando l'ala vicina sale la punta si torce e mostra il sotto color crema.
   A caccia alza il muso e le ali, drizza la coda, e sul bordo del muso si apre la bocca con i denti. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max, min } = Math;
const lerp = (a, b, k) => a + (b - a) * k;

// ---- tinte: sabbia dorata con le ombre arancio-mattone (mai grigie), sotto color crema, occhielli azzurri
const T = { ala: P.tinta('#e9ad4e', '#a8402e'), lontana: P.tinta('#c8863e', '#6e2a4a'), sotto: P.tinta('#fff3dc', '#e8946a'), coda: P.tinta('#cf8e44', '#7a3044') };
T.dorso = Object.assign({}, P.tinta('#f0bc62', '#b4482c'), { bordo: P.mescola(T.ala.base, T.ala.bordo, .62) });     // il dorso è un rilievo, non un pezzo a parte: bordo più tenue
const BLU = '#28308f', AZZURRO = '#35b8ff', CELESTE = '#d2f6ff', NEI = P.alfa('#8a3a28', .34), CHIARO = P.alfa('#fff0c4', .42), VELO = P.alfa('#7a2c48', .34), PIEGA = P.alfa(T.ala.scura, .32);
/* Il dorso: un fuso corto, più largo alla testa (dove stanno gli occhi), che sfuma nella coda. */
const SU = P.sagoma([[0, .06], [.25, .14], [.55, .2], [.78, .25], [.92, .21], [1, .12]]);
const GIU = P.sagoma([[0, .06], [.25, .13], [.55, .18], [.78, .22], [.92, .19], [1, .11]]);
/* Occhielli e nei di un'ala: [lungo la linea di mezzo 0 (muso) .. 1 (coda), verso la punta 0..1, raggio]. Il primo è quello grande. */
const OCCHIELLI = [[.52, .5, .13], [.3, .26, .05], [.78, .36, .05], [.44, .8, .042]];
const PUNTINI = [[.2, .5, .03], [.34, .64, .024], [.62, .7, .028], [.7, .52, .022], [.86, .22, .024], [.4, .34, .022], [.62, .3, .026], [.5, .92, .02], [.16, .22, .02]];
const MX = 1.05, RX = -.72, RY = -.02, PINNETTE = [.45, .7];              // punta del muso, attacco della coda, dove stanno le due pinnette della coda

/* Un tratto dell'orlo del disco: dal punto in cui si è (fx, fy) alla punta dell'ala (px, py), che arrotonda, e poi fino
   a (tx, ty). a1, a2 = di quanto si gonfia in fuori il primo lato (vicino alla partenza, vicino alla punta); b1, b2 = lo
   stesso per il secondo lato. Valori negativi lo incavano. */
function orlo(cc, fx, fy, px, py, tx, ty, a1, a2, b1, b2) {
  let ax = -(py - fy), ay = px - fx; if (ax * (tx - fx) + ay * (ty - fy) > 0) { ax = -ax; ay = -ay; }
  let bx = -(ty - py), by = tx - px; if (bx * (fx - px) + by * (fy - py) > 0) { bx = -bx; by = -by; }
  cc.bezierCurveTo(lerp(fx, px, .33) + ax * a1, lerp(fy, py, .33) + ay * a1, lerp(fx, px, .7) + ax * a2, lerp(fy, py, .7) + ay * a2, lerp(px, fx, .12), lerp(py, fy, .12));
  cc.quadraticCurveTo(px, py, lerp(px, tx, .12), lerp(py, ty, .12));
  cc.bezierCurveTo(lerp(px, tx, .36) + bx * b1, lerp(py, ty, .36) + by * b1, lerp(px, tx, .72) + bx * b2, lerp(py, ty, .72) + by * b2, tx, ty);
}
/* Occhielli, nei e pieghe di un'ala che ha il muso in (sx, sy) e la punta in (px, py). Tinte piatte, poche passate. */
function motivi(cc, sx, sy, px, py, q) {
  const su = (a, b) => { q.x = lerp(lerp(sx, RX, a), px, b); q.y = lerp(lerp(sy, RY, a), py, b); };
  cc.beginPath(); for (const m of PUNTINI) { su(m[0], m[1]); cc.moveTo(q.x + m[2], q.y); cc.arc(q.x, q.y, m[2], 0, TAU); } cc.fillStyle = NEI; cc.fill();
  for (let giro = 0; giro < 3; giro++) {
    const k = [1.34, 1, .44][giro];
    cc.beginPath(); for (const m of OCCHIELLI) { su(m[0], m[1]); cc.moveTo(q.x + m[2] * k, q.y); cc.ellipse(q.x, q.y, m[2] * k, m[2] * k * .82, 0, 0, TAU); }
    cc.fillStyle = [BLU, AZZURRO, CELESTE][giro]; cc.fill();
  }
  cc.beginPath(); su(.3, .12); cc.moveTo(q.x, q.y); su(.62, .78); cc.lineTo(q.x, q.y); su(.62, .1); cc.moveTo(q.x, q.y); su(.86, .6); cc.lineTo(q.x, q.y);
  cc.strokeStyle = PIEGA; cc.lineWidth = .03; cc.lineCap = 'round'; cc.stroke();                                         // due pieghe leggere verso l'orlo
}

B.specie.registra({
  id: 'razza',
  descrizione: 'Parente piatta degli squali: non ha nemmeno un osso, solo cartilagine come il tuo naso. Sta nascosta sotto la sabbia con fuori soltanto gli occhi, e i due occhielli azzurri sul dorso servono a sembrare la faccia di un pesce molto più grosso.',
  forma: { lx: 1.0, ly: .85 },
  ingombro: { x0: -2.17, y0: -1.12, x1: 1.17, y1: 1.23 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    c.rotate(sin(F) * .025);
    const tv = sin(F) + (m ? .5 : 0), tl = sin(F - .8) + (m ? .5 : 0);              // quanto sono alzate le ali (vicina, lontana): la lontana è in ritardo
    const my = m ? -.07 : 0, vx = -.1 + tv * .05, vy = .98 - tv * .2, lx = -.03 - tl * .05, ly = -.76 - tl * .2;       // muso, punta vicina, punta lontana
    const rv = sin(F * 2 - .4) * .05, rl = sin(F * 2 - 1.2) * .05;                  // l'onda degli orli d'uscita

    // ---- 1. dietro al disco: coda a frusta con le pinnette, pinne del bacino
    const w = k => (m ? -.1 * k - .05 * k * k : 0) + (.03 + .05 * k) * sin(F - 1.2 - k * 1.1);     // la frusta ondeggia in ritardo; a caccia si alza
    const cq = [RX + .1, RY, -1.15, RY + w(1), -1.6, RY + w(2), -2.02, RY + w(3)];
    for (const k of PINNETTE) P.corno(c, lerp(cq[4], cq[6], k), lerp(cq[5], cq[7], k) - .01, -PI / 2 - .7, .13, .11, T.coda, { curva: -.4, lume: false });
    P.filo(c, cq, .13, .028, T.coda, .04);
    P.lama(c, { x0: RX + .22, y0: RY - .12, x1: RX, y1: RY - .03, px: RX - .2, py: RY - .26, tinta: T.lontana, davanti: .2, dietro: -.1, tondo: .3 });
    P.lama(c, { x0: RX + .24, y0: RY + .14, x1: RX, y1: RY + .03, px: RX - .26, py: RY + .32 + sin(F * 2) * .02, tinta: T.ala, davanti: .2, dietro: -.1, tondo: .3 });

    // ---- 2. il disco: un pezzo solo, con la metà lontana velata, il muso chiaro, occhielli, nei e pieghe
    P.volume(c, cc => { cc.beginPath(); cc.moveTo(MX, my); orlo(cc, MX, my, vx, vy, RX, RY, -.03, .11, .2 + rv, .15 - rv); orlo(cc, RX, RY, lx, ly, MX, my, .15 - rl, .2 + rl, .11, -.03); cc.closePath(); },
      T.ala, { luce: [.4, .25, 1.6], ombra: .07, dentro(cc) {
        cc.beginPath(); cc.moveTo(MX + .1, my); cc.lineTo(RX - .1, RY); cc.lineTo(RX - .1, -2); cc.lineTo(MX + .1, -2); cc.closePath(); cc.fillStyle = VELO; cc.fill();
        cc.beginPath(); cc.moveTo(MX + .1, my); cc.lineTo(lerp(MX, lx, .34), lerp(my, ly, .34)); cc.lineTo(.6, my * .5); cc.lineTo(lerp(MX, vx, .34), lerp(my, vy, .34)); cc.closePath(); cc.fillStyle = CHIARO; cc.fill();
        motivi(cc, MX, my, lx, ly, q); motivi(cc, MX, my, vx, vy, q);
        if (tv > .1) {                                                 // l'ala vicina sale: la punta si torce e mostra il sotto color crema
          const k = .12 + .16 * min(1, tv - .1), ax = lerp(vx, MX, k), ay = lerp(vy, my, k), bx = lerp(vx, RX, k * .85), by = lerp(vy, RY, k * .85), ox = vx - (MX + RX) / 2, oy = vy - (my + RY) / 2;
          cc.beginPath(); cc.moveTo(ax, ay); cc.quadraticCurveTo((ax + bx) / 2 - ox * .05, (ay + by) / 2 - oy * .05, bx, by); cc.lineTo(bx + ox, by + oy); cc.lineTo(ax + ox, ay + oy); cc.closePath();
          cc.fillStyle = T.sotto.base; cc.fill(); cc.strokeStyle = P.alfa(T.ala.bordo, .85); cc.lineWidth = .045; cc.stroke();
        }
      } });

    // ---- 3. il dorso rialzato: la sua ombra sull'ala, il fuso, le spine in fila, il riflesso
    const s = P.spinaPesce(10, -.64, .6, 0, null, SU, GIU, { testa: .13, coda: .05, arco: m ? .05 : 0, y: -.03 });
    P.ombra(c, .0, .17, .72, .17, .03, .3);
    P.volume(c, s, T.dorso, { luce: [.3, -.3, 1.3], ombra: .06, bordo: .035, dentro(cc) {
      P.macchie(cc, s, { n: 8, seme: 5, u0: .1, u1: .8, v0: -.75, v1: .75, r0: .02, r1: .038, colore: NEI, lungo: 1.2 });
    } });
    if (P.fine(o)) P.bozzi(c, P.puntiSuSpina(s, 6, .08, .62, -.1), i => .022 + (i % 2) * .008, T.dorso);
    P.suSpina(s, .56, -.55, q); P.riflesso(c, q.x, q.y, .26, q.ang - .05, .12);

    // ---- 4. la faccia: bocca sul bordo del muso, sfiatatoi, i due occhi in cima (il lontano sporge dal profilo del dorso)
    P.sorriso(c, .86, my + .095, m ? .13 : .1, { ang: -.62, apri: m ? max(b, .5) : b * .4, alt: .16, curva: m ? .2 : .75, denti: m ? 'tutti' : null, tinta: T.ala, spess: .045 });
    const e1 = P.suSpina(s, .84, -.92), e2 = P.suSpina(s, .8, .6), sg = m ? P.SGUARDI.cattivo : P.SGUARDI.calmo, iride = m ? '#ff3a1e' : '#2fd6c0';
    if (P.fine(o)) { c.fillStyle = P.alfa(T.ala.bordo, .7); c.beginPath(); c.ellipse(e2.x - .21, e2.y - .03, .045, .03, .3, 0, TAU); c.ellipse(e1.x - .17, e1.y + .06, .035, .024, .3, 0, TAU); c.fill(); }
    P.occhio(c, e1.x, e1.y, .125, Object.assign({ iride, tipo: m ? 'fessura' : 'tondo', pelle: T.dorso, guarda: { x: .5, y: .2 } }, sg));
    P.occhio(c, e2.x, e2.y, .165, Object.assign({ iride, tipo: m ? 'fessura' : 'tondo', pelle: T.dorso, guarda: { x: .5, y: .2 } }, sg));
    if (m) { P.sopracciglio(c, e1.x + .03, e1.y - .12, .3, .5, T.ala.bordo, .09); P.sopracciglio(c, e2.x + .04, e2.y - .17, .4, .5, T.ala.bordo, .11); }
    c.restore();
  },
});
})();
