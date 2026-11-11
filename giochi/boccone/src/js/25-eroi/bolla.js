/* Boccone — eroe: BOLLA, il polpetto. Un testone a palloncino rosa-viola con la faccia di tre quarti (due occhioni dolci
   color acquamarina, quello lontano mezzo nascosto dalla curva della testa), il musetto chiaro col sorriso, e sotto un
   ciuffo di braccia arricciate che seguono dietro pulsando: tre lontane scure e tre vicine con le ventose a perline.
   Tre stadi: cucciolo tutto testa con i riccioli corti, adulto con la testa che si allunga all'indietro e gli occhielli,
   colosso viola dal testone a cupola, cornetti sopra gli occhi e braccia lunghe e grosse.
   Quattro espressioni: di gioia alza un braccio e sventola, di paura sbianca e si raggomitola, colpito lascia penzolare le braccia.
   RITOCCATO PER LO STILE «FILM D'ANIMAZIONE»: sotto il mento la testa prende il colore dell'acqua (luce di rimbalzo) e gli
   occhielli hanno un alone morbido; il resto rendeva già bene con la cassetta nuova. Il battito di ciglia non è più deciso
   dal modello (o.t): lo guida P.battito da chi lo disegna dal vivo. */
(() => {
'use strict';
const B = window.B, P = B.pittura, U = B.util, TAU = Math.PI * 2, PI = Math.PI, GRADI = PI / 180;
const { sin, cos, max, min } = Math;

// ---- tinte e misure dei tre stadi: tutto ciò che cambia crescendo sta qui, il disegno è uno solo
const CX = .12, CY = -.06, SU = -.07, RX = -.22, RY = .5;                // centro della testa (alzata di SU), radice delle braccia
const PALLIDA = P.tinta('#f7dcf6', '#b490e6'), PALLIDA_LONTANA = P.tinta('#d3b4ea', '#8a6ad0');
const LABBRO = P.tinta('#b02a8c'), IRIDE = '#1fc9be', VENTOSA = '#ffe1f2', ACQUA = '#8fe6ff';
const STADI = [
  { rx: .86, ry: .84, gobbe: [[-120, 50, .03]], corpo: P.tinta('#ff8fd6', '#a43ae0'), lontano: P.tinta('#c45fd0', '#5a1f9a'), anello: '#ffc2ec', cuore: '#fff0fa',
    occhio: .33, ex: .27, ey: -.06, fx: .8, bx: .66, by: .36, bocca: .12, lung: .8, spess: .34, nv: 3, corni: 0,
    occhielli: [[-.42, -.5, .05], [-.2, -.68, .04], [-.55, -.22, .04]] },
  { rx: .85, ry: .82, gobbe: [[-128, 46, .16], [95, 40, -.04]], corpo: P.tinta('#ea78f0', '#7a2fd8'), lontano: P.tinta('#a04fd6', '#4a1c98'), anello: '#ff9fe6', cuore: '#ffe4f8',
    occhio: .3, ex: .28, ey: -.05, fx: .8, bx: .67, by: .36, bocca: .13, lung: 1.02, spess: .38, nv: 4, corni: 0,
    occhielli: [[-.5, -.58, .1], [-.2, -.78, .075], [-.68, -.24, .08], [-.36, -.3, .06], [-.76, -.62, .055]] },
  { rx: .86, ry: .82, gobbe: [[-134, 44, .3], [95, 40, -.05]], corpo: P.tinta('#c862f6', '#5a28c8'), lontano: P.tinta('#8440d2', '#3a1890'), anello: '#ff8ae0', cuore: '#ffd9f4',
    occhio: .28, ex: .29, ey: -.04, fx: .8, bx: .68, by: .37, bocca: .15, lung: 1.22, spess: .44, nv: 6, corni: 1,
    occhielli: [[-.56, -.66, .12], [-.22, -.84, .085], [-.78, -.3, .09], [-.4, -.34, .07], [-.9, -.72, .07], [-.62, -.98, .06], [-.1, -.56, .05]] },
];
for (const K of STADI) K.alone = P.alfa(K.anello, .32);
/* Le braccia: [angolo, lunghezza, ricciolo, spessore]. Tre vicine e tre lontane, a ventaglio da sotto il mento a dietro la nuca. */
const VICINE = [[1.8, .86, -2.5, .95], [2.5, 1.05, 2.4, 1], [3.2, .95, 2.9, .9]], LONTANE = [[1.45, .7, -2.2, .85], [2.15, .95, -2.7, .9], [2.85, 1, 2.6, .9]];
/* Raggio della testa nella direzione ang (0 = muso, 90° = mento): un'ellisse con qualche gobba (la nuca che cresce). */
const raggio = (K, ang) => {
  let r = 1 / Math.hypot(cos(ang) / K.rx, sin(ang) / K.ry);
  for (const g of K.gobbe) { const d = U.differenzaAngolo(g[0] * GRADI, ang) / (g[1] * GRADI); r += g[2] * Math.exp(-d * d); }
  return r;
};

B.eroi.registra({
  id: 'bolla',
  descrizione: 'Un polpetto timido e furbissimo: ha tre cuori, il sangue blu e sa cambiare colore. Quando prende uno spavento diventa bianco come un lenzuolo e sparisce dietro una nuvola di inchiostro.',
  ingombro: { x0: -1.74, y0: -1.62, x1: 1.14, y1: 1.76 },
  disegna(c, o) {
    const st = max(0, min(2, o.stadio | 0)), K = STADI[st], esp = o.espressione || 'normale', F = (o.fase || 0) * TAU, t = o.t || 0, b = max(0, min(1, o.bocca || 0));
    const paura = esp === 'spaventato', colpito = esp === 'colpito', felice = esp === 'felice';
    const pelle = paura ? PALLIDA : K.corpo, scura = paura ? PALLIDA_LONTANA : K.lontano, spinta = sin(F), respiro = sin(t * 2.2) * .012;
    c.save();
    if (paura) c.translate(sin(t * 41) * .012, 0);                   // trema
    c.rotate(sin(F - .8) * .04 + (colpito ? -.16 : 0));

    // ---- 1. le braccia, prima della testa che ne copre le radici: tre lontane scure, poi tre vicine con le ventose
    const lung = K.lung * (paura ? .72 : 1) * (1 + spinta * .07), ricc = paura ? 1.5 : colpito ? .25 : felice ? .55 : 1, largo = paura ? .55 : felice ? 1.3 : 1;
    for (let giro = 0; giro < 2; giro++) for (let i = 0; i < 3; i++) {
      const a = giro ? VICINE[i] : LONTANE[i];
      let ang = 2.4 + (a[0] - 2.4) * largo - spinta * .1 * (a[0] - 2.4) + sin(t * 1.3 + i * 2) * .04, curva = a[2] * ricc, onda = paura ? .08 : felice ? .4 : .22;
      if (colpito) { ang = 2.45 + (a[0] - 2.4) * .3; onda = .05; }                                         // penzolano all'indietro
      else if (felice) ang += sin(t * 9 + i * 2.1) * .1;                                                  // evviva: le braccia ballano
      P.tentacolo(c, { x: RX + (giro ? 0 : .12), y: RY - (giro ? 0 : .04), ang, lung: lung * a[1], spess: K.spess * a[3], punta: .07, curva, onda, fase: F + i * 1.3 + giro, tinta: giro ? pelle : scura,
        ombra: 0, lume: giro ? .045 : 0, ventose: giro ? K.nv : 0, lato: -1, chiara: VENTOSA });
    }

    // ---- 2. la testa: un palloncino con la nuca che cresce; dentro, il musetto chiaro, gli occhielli e l'occhio lontano
    const gonfia = 1 + respiro + (paura ? -.03 : 0);
    c.translate(0, SU);                                              // la testa sta un po' in alto, così le braccia si vedono
    c.translate(CX, CY); c.scale(gonfia * (1 + spinta * .025), gonfia * (1 - spinta * .025)); c.translate(-CX, -CY);
    const sag = []; for (let i = 0; i < 18; i++) { const a = i * 20 * GRADI, r = raggio(K, a); sag.push(CX + cos(a) * r, CY + sin(a) * r); }
    if (K.corni) {                                                   // i cornetti di pelle del colosso
      P.corno(c, CX + .32, CY - .74, -PI / 2 + .05 + (paura ? .5 : 0), .27, .2, pelle, { curva: .4 });
      P.corno(c, CX + .64, CY - .5, -PI / 2 + .6 + (paura ? .5 : 0), .22, .18, pelle, { curva: .4 });
    }
    const r = K.occhio;
    const sg = colpito ? P.SGUARDI.colpito : felice ? P.SGUARDI.felice : paura ? P.SGUARDI.spaventato : st === 2 ? { palpebra: .2, taglio: -.12, brillio: 1.15 } : { palpebra: .08, taglio: -.2, brillio: 1.25 };
    P.volume(c, cc => P.profilo(cc, sag), pelle, { luce: [.3, -.5, 1.6], ombra: .12, dentro(cc) {
      P.guancia(cc, .6, .5, .56, '#fff2fa', .62);                     // il musetto chiaro
      P.guancia(cc, .2, .84, .62, ACQUA, .34);                        // sotto il mento la pelle prende il colore dell'acqua
      for (let giro = 0; giro < 3; giro++) {                          // gli occhielli: alone morbido, anello, cuore chiaro
        cc.beginPath();
        for (const m of K.occhielli) { const rr = m[2] * (giro === 2 ? .5 : giro ? 1 : 1.55); cc.moveTo(m[0] + rr, m[1]); cc.arc(m[0], m[1], rr, 0, TAU); }
        cc.fillStyle = giro === 2 ? K.cuore : giro ? K.anello : K.alone; cc.fill();
      }
      P.occhio(cc, K.fx, K.ey - .04, r * .8, Object.assign({ iride: IRIDE, pelle, guarda: P.sguardo(o.sguardo, K.fx, K.ey) }, sg));
    } });
    P.riflesso(c, .16, -.72, .42, .02, .15);
    if (P.fine(o)) P.bozzi(c, [-.3, -.6, -.52, -.36, -.08, -.76], .034, pelle);
    P.guancia(c, K.ex + .06, K.ey + r + .13, .17, '#ff4f8f', paura ? .2 : felice ? .85 : .55);
    P.guancia(c, K.fx + .08, K.ey + r * .8 + .1, .12, '#ff4f8f', paura ? .15 : felice ? .7 : .45);

    // ---- 3. la faccia: l'occhio vicino, il sopracciglio della paura, la bocca
    P.occhio(c, K.ex, K.ey, r, Object.assign({ iride: IRIDE, pelle, guarda: P.sguardo(o.sguardo, K.ex, K.ey) }, sg));
    if (paura) { P.sopracciglio(c, K.ex - .02, K.ey - r * 1.45, r * 1.1, -.3, pelle.bordo, .06); P.sopracciglio(c, K.fx, K.ey - r * 1.25, r * .8, .25, pelle.bordo, .05); }
    const w = K.bocca;
    if (paura) P.sorriso(c, K.bx, K.by + .02, w * .55, { ang: -.1, apri: .6 + sin(t * 30) * .08, alt: w * .9, curva: -.3, lingua: false, tinta: LABBRO, spess: .055 });
    else if (colpito) P.sorriso(c, K.bx, K.by, w, { ang: -.1, apri: .5, alt: w * .7, curva: -.8, lingua: false, tinta: LABBRO, spess: .055 });
    else P.sorriso(c, K.bx, K.by - (felice ? .02 : 0), w * (felice ? 1.15 : 1), { ang: -.1, apri: felice ? max(b, .35) : b * .9, alt: w * 1.7, curva: felice ? 1 : .8, tinta: LABBRO, spess: .055 });

    // ---- 4. i segni dell'espressione
    if (paura) P.goccia(c, -.3, -.62 + sin(t * 5) * .015, .08, -.5);
    if (colpito) P.stelle(c, .15, -1.12, .55, t, 3, .12);
    c.restore();
  },
});
})();
