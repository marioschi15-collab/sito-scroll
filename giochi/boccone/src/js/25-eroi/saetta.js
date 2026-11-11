/* Boccone — eroe: SAETTA, il pesce volante. Un siluro azzurro dalla pancia d'argento con una saetta gialla sul fianco e
   due grandi pinne ad ala: quella lontana si alza dietro la schiena, quella vicina si apre verso il basso, e battono insieme.
   Tre stadi: cucciolo paffuto con le alucce tonde, adulto affusolato dalle ali lunghe, colosso con ali larghe e affilate
   dalle punte dorate, alucce ventrali e coda a falce. Quattro espressioni: le ali si spalancano di gioia, si chiudono
   lungo il corpo per la paura, pendono flosce dopo un colpo. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, min } = Math;

// ---- tinte e misure dei tre stadi: tutto ciò che cambia crescendo sta qui, il disegno è uno solo
const ALA = c => P.tinta(c, '#2b55e8'), ARGENTO = P.tinta('#eef8ff', '#6c9cf2'), LABBRO = P.tinta('#2747b8'), GIALLO = '#ffd93a', ARANCIO = '#ff8a1e', IRIDE = '#ff8a1e';
const STADI = [
  { x0: -.72, x1: .64, testa: .36, onda: { amp: .08, onde: .45, testa: .15 }, corpo: P.tinta('#3aa4ff'), ala: ALA('#86e6ff'), orlo: '#ffffff',
    su: P.sagoma([[0, .13], [.3, .45], [.6, .64], [.85, .63], [1, .47]]), giu: P.sagoma([[0, .12], [.3, .42], [.6, .6], [.85, .56], [1, .42]]),
    pancia: u => .5 - .42 * u, occhio: .33, eu: .76, ev: -.22, bx: .7, by: .27, bocca: .16, au: .5, av: .4, ru: .5,
    lungAla: .86, profAla: [.9, 1, .88, .68, .46], apreAla: 1.05, smerlo: 0, nAla: 5,
    coda: .5, forca: .62, profCoda: [1, .8, .58, .7, .84], pin: .2, ventrale: 0,
    fulmine: [[.58, -.4], [.58, .02], [.44, -.26], [.44, -.06], [.2, -.42], [.37, -.33], [.37, -.52]] },
  { x0: -1.02, x1: .72, testa: .34, onda: { amp: .1, onde: .5, testa: .12 }, corpo: P.tinta('#2a8cff'), ala: ALA('#6fdcff'), orlo: '#ffffff',
    su: P.sagoma([[0, .09], [.25, .36], [.55, .54], [.8, .56], [1, .44]]), giu: P.sagoma([[0, .08], [.25, .32], [.55, .49], [.8, .48], [1, .38]]),
    pancia: u => .46 - .42 * u, occhio: .28, eu: .8, ev: -.2, bx: .82, by: .17, bocca: .17, au: .62, av: .42, ru: .54,
    lungAla: 1.3, profAla: [1, .93, .78, .6, .44, .32], apreAla: 1, smerlo: .35, nAla: 6,
    coda: .62, forca: .66, profCoda: [1.2, .82, .46, .6, .88], pin: .3, ventrale: .34,
    fulmine: [[.66, -.36], [.66, .1], [.48, -.22], [.48, 0], [.14, -.44], [.38, -.32], [.38, -.54]] },
  { x0: -1.06, x1: .76, testa: .32, onda: { amp: .1, onde: .5, testa: .12 }, corpo: P.tinta('#1c70f2'), ala: ALA('#57cbff'), orlo: '#ffe45a',
    su: P.sagoma([[0, .1], [.25, .38], [.5, .56], [.72, .65], [.88, .59], [1, .45]]), giu: P.sagoma([[0, .09], [.25, .34], [.55, .52], [.8, .5], [1, .38]]),
    pancia: u => .46 - .42 * u, occhio: .26, eu: .81, ev: -.2, bx: .86, by: .17, bocca: .19, au: .62, av: .42, ru: .52,
    lungAla: 1.52, profAla: [1, .86, .7, .55, .43, .33, .26], apreAla: 1.1, smerlo: .75, nAla: 7,
    coda: .68, forca: .7, profCoda: [1.3, .84, .42, .56, .92], pin: .4, ventrale: .62,
    fulmine: [[.66, -.36], [.66, .12], [.48, -.2], [.48, .04], [.1, -.44], [.38, -.3], [.38, -.56]] },
];
for (const K of STADI) K.alaLontana = P.tinta(K.ala.ombra, '#2433b0');

B.eroi.registra({
  id: 'saetta',
  descrizione: 'Un pesce volante che non sta mai fermo. Prende la rincorsa, salta fuori dall\'acqua e plana sulle onde con le pinne aperte come ali. Più cresce, più le sue ali si fanno larghe e affilate.',
  ingombro: { x0: -1.95, y0: -1.53, x1: 1.23, y1: 1.67 },
  disegna(c, o) {
    const st = max(0, min(2, o.stadio | 0)), K = STADI[st], esp = o.espressione || 'normale', fase = o.fase || 0, F = fase * TAU, t = o.t || 0, b = max(0, min(1, o.bocca || 0)), q = {};
    const paura = esp === 'spaventato', colpito = esp === 'colpito', felice = esp === 'felice';
    c.save();
    if (paura) c.translate(sin(t * 41) * .012, 0);                   // trema
    c.rotate(-.05 + sin(F) * .03 + (colpito ? .2 : 0));              // plana col muso un po' in su; il colpo lo fa picchiare
    const s = P.spinaPesce(14, K.x0, K.x1, fase, K.onda, K.su, K.giu, { testa: K.testa }), luce = [.3, -.5, 1.8];
    const apri = paura || colpito ? .5 : felice ? max(b, .3) : b * .9;
    for (let i = 11; i <= 14; i++) s.giu[i] += apri * .035 * (i - 10);                // il mento scende con la bocca
    // quanto le ali stanno aperte (angolo dal corpo) e quanto è largo il ventaglio dei raggi
    const batte = sin(F), fuori = (paura ? .3 : colpito ? 1.2 : felice ? 1.3 : .95) + batte * (paura ? .05 : colpito ? .04 : .22) + (felice ? sin(t * 13) * .06 : paura ? sin(t * 37) * .03 : 0);
    const fuoriL = colpito ? .2 : fuori + sin(F + .7) * .06, vent = K.apreAla * (paura ? .55 : colpito ? .6 : 1), lung = K.lungAla * (1 + sin(t * 2.2) * .012);

    // ---- 1. dietro al corpo: ala lontana, coda, dorsale, anale
    const l0 = P.suSpina(s, K.au + .04, -.3), l1 = P.suSpina(s, K.au - .16, -.4);
    P.pinna(c, { x0: l0.x, y0: l0.y, x1: l1.x, y1: l1.y, a0: -PI + fuoriL + .12, a1: -PI + fuoriL + .12 - vent * .9, lung: lung * .92, profilo: K.profAla, n: K.nAla, smerlo: K.smerlo, piega: -.08,
      onda: .05, fase: F * 2 + 1, passo: .7, tinta: K.alaLontana, orlo: K.orlo === '#ffffff' ? '#cfeaff' : '#ffc23a' });
    P.suSpina(s, 0, 0, q);
    const ac = q.ang + PI + sin(F - 1.1) * .32, rx = -sin(ac) * .1, ry = cos(ac) * .1;
    P.pinna(c, { x0: q.x - rx + .06, y0: q.y - ry, x1: q.x + rx + .06, y1: q.y + ry, a0: ac - K.forca, a1: ac + K.forca, lung: K.coda, profilo: K.profCoda, n: 6, onda: .14, fase: F - 1.9, passo: 0,
      tinta: K.ala, orlo: K.orlo, primo: true });
    const d0 = P.suSpina(s, .36, -.82), d1 = P.suSpina(s, .13, -.7), n0 = P.suSpina(s, .34, .82), n1 = P.suSpina(s, .13, .7);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -PI / 2 - .6, a1: -PI + .2, lung: K.pin, profilo: [.75, 1, .6], n: 4, onda: .08, fase: F * 2, tinta: K.ala, orlo: K.orlo });
    P.pinna(c, { x0: n0.x, y0: n0.y, x1: n1.x, y1: n1.y, a0: PI / 2 + .6, a1: PI - .2, lung: K.pin * .8, profilo: [.75, 1, .6], n: 4, onda: .08, fase: F * 2 + 1, tinta: K.ala, orlo: K.orlo });

    // ---- 2. il corpo: azzurro sopra, argento sotto, e la saetta gialla sul fianco
    P.volume(c, s, K.corpo, { luce, ombra: .1, dentro(cc) {
      P.fianco(cc, s, K.pancia, 1.4, P.sfumatura(cc, ARGENTO, [.3, .1, 1.7]));
      cc.beginPath();
      for (let i = 0; i < 7; i++) { P.suSpina(s, K.fulmine[i][0], K.fulmine[i][1], q); if (i) cc.lineTo(q.x, q.y); else cc.moveTo(q.x, q.y); }
      cc.closePath(); cc.lineJoin = 'round'; cc.strokeStyle = ARANCIO; cc.lineWidth = .06; cc.stroke(); cc.fillStyle = GIALLO; cc.fill();
    } });
    const g0 = P.suSpina(s, K.eu - .1, -.5), g1 = P.suSpina(s, K.eu - .15, .05), g2 = P.suSpina(s, K.eu - .1, .55);
    P.solco(c, [g0.x, g0.y, g1.x, g1.y, g2.x, g2.y], K.corpo);
    P.suSpina(s, K.ru, -.74, q); P.riflesso(c, q.x, q.y, .34, q.ang - .05, .12);
    const e = P.suSpina(s, K.eu, K.ev), r = K.occhio;
    P.guancia(c, e.x + .02, e.y + r + .13, .17, '#ff5f93', felice ? .8 : .5);

    // ---- 3. sul fianco: aluccia ventrale e ala vicina, con le loro ombre di contatto
    if (K.ventrale) {
      const v0 = P.suSpina(s, .44, .78), v1 = P.suSpina(s, .32, .8), av = PI - fuori * .7;
      P.pinna(c, { x0: v0.x, y0: v0.y, x1: v1.x, y1: v1.y, a0: av - .2, a1: av + .55, lung: K.ventrale, profilo: [1, .85, .6, .4], n: 4, smerlo: K.smerlo, tinta: K.ala, orlo: K.orlo, primo: true });
    }
    const a0 = P.suSpina(s, K.au, K.av), a1 = P.suSpina(s, K.au - .2, K.av - .1);
    P.ombra(c, a0.x - .3, a0.y + .12, .42, .2, -.35, .28);
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: PI - fuori, a1: PI - fuori + vent, lung, profilo: K.profAla, n: K.nAla, smerlo: K.smerlo, piega: .08,
      onda: .05, fase: F * 2, passo: .7, tinta: K.ala, orlo: K.orlo, primo: true });
    P.bozzi(c, [a0.x - .03, a0.y - .02], .06, K.ala);                 // la spalla dell'ala

    // ---- 4. la faccia: occhio, sopracciglio, bocca
    const ammicca = (t % 3.6) > 3.46;
    const sg = colpito ? P.SGUARDI.colpito : felice ? P.SGUARDI.felice : paura ? P.SGUARDI.spaventato : ammicca ? P.SGUARDI.felice : st === 2 ? { palpebra: .24, taglio: .22 } : P.SGUARDI.normale;
    P.occhio(c, e.x, e.y, r, Object.assign({ iride: IRIDE, pelle: K.corpo, guarda: P.sguardo(o.sguardo, e.x, e.y) }, sg));
    if (paura) P.sopracciglio(c, e.x + .02, e.y - r * 1.42, r * 1.1, -.32, K.corpo.bordo, .06);
    else if (st === 2 && !colpito) P.sopracciglio(c, e.x + .05, e.y - r * 1.04, r * 1.9, .3, K.corpo.bordo, .1);
    const w = K.bocca;
    if (paura) P.sorriso(c, K.bx + .02, K.by + .02, w * .5, { ang: -.35, apri: .55 + sin(t * 30) * .08, alt: w * .8, curva: -.3, lingua: false, tinta: LABBRO, spess: .06 });
    else if (colpito) P.sorriso(c, K.bx, K.by, w * .95, { ang: -.35, apri: .6, alt: w * .7, curva: -.8, denti: 'tutti', lingua: false, tinta: LABBRO, spess: .06 });
    else P.sorriso(c, K.bx, K.by, w, { ang: -.35, apri, alt: w * 1.3, curva: felice ? 1 : .75, tinta: LABBRO, spess: .06 });

    // ---- 5. i segni dell'espressione
    if (paura) P.goccia(c, e.x - r - .2, e.y - r - .1 + sin(t * 5) * .015, .075, -.5);
    if (colpito) P.stelle(c, .25, -.95, .5, t, 3, .12);
    c.restore();
  },
});
})();
