/* Boccone — specie: SEPPIA (taglia 3, timida, lascia l'inchiostro). ESEMPIO DI RIFERIMENTO per i cefalopodi (vedi GUIDA-STILE.md):
   mantello rigido su una spina, gonna di pinna ondulante (P.cresta sopra e sotto), braccia fatte con P.tentacolo, occhio a W.
   Lo stesso schema serve per calamari, polpi, nautilus e per i giganti Piovra e Kraken. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, pow } = Math;

/* Calma è color albicocca; quando si arrabbia arrossisce (le seppie cambiano colore davvero) e le righe si fanno più cupe. */
const CALMA = { pelle: P.tinta('#f5914a', '#b0304a'), riga: '#8a3558', lontano: P.tinta('#c9603a', '#6a1a40'), iride: '#e8f24a' };
const IRA = { pelle: P.tinta('#ff5236', '#8a1040'), riga: '#5a0f38', lontano: P.tinta('#c2302c', '#5a0a38'), iride: '#ffb01e' };
const VENTRE = P.tinta('#ffe6c0', '#e88a5a'), GONNA = P.tinta('#4fe3d3'), PREDA = P.tinta('#ffc4a6', '#d8405a');
const SU = P.sagoma([[0, .1], [.1, .32], [.35, .5], [.6, .54], [.85, .47], [1, .38]]);
const GIU = P.sagoma([[0, .1], [.1, .3], [.35, .46], [.6, .5], [.85, .44], [1, .36]]);
/* Zebratura: sette bande ondulate di traverso al mantello, preparate una volta sola. */
const RIGHE = [];
for (let i = 0; i < 7; i++) { const u0 = .09 + i * .118, f = v => u0 + .028 * sin(v * 4 + i * 1.3) + .035 * v; RIGHE.push([f, v => f(v) + .052]); }
const altGonna = k => .2 * pow(sin(PI * k), .55);
/* Le braccia: [angolo da calma, angolo a caccia, lunghezza, ricciolo]. Quattro vicine (chiare) e tre lontane (scure). */
const VICINE = [[-.2, -.7, .5, -.5], [-.02, -.26, .6, -.2], [.18, .42, .6, .25], [.42, .9, .5, .6]];
const LONTANE = [[-.3, -.5, .52, -.4], [0, .1, .62, .1], [.34, .7, .54, .5]];

B.specie.registra({
  id: 'seppia',
  descrizione: 'Cambia colore in un lampo, come un\'insegna luminosa, e ha la pupilla a forma di W. Se si sente in pericolo sparisce dietro una nuvola di inchiostro.',
  forma: { lx: 1.3, ly: .6 },
  ingombro: { x0: -1.5, y0: -.95, x1: 2.06, y1: .9 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, m = !!o.minaccia, b = o.bocca || 0, K = m ? IRA : CALMA, k = m ? 1 : 0;
    c.save();
    c.rotate(sin(F) * .03);                                            // dondola piano: il mantello è rigido, si muovono gonna e braccia
    const s = P.spinaPesce(12, -1.3, .38, 0, null, SU, GIU, { testa: .12, coda: .08 });

    // ---- 1. le braccia (prima le lontane, scure ed economiche), i due tentacoli da preda che scattano a caccia, poi le vicine
    const bx = .78, by = .13;
    for (let i = 0; i < 3; i++) {
      const a = LONTANE[i];
      P.tentacolo(c, { x: bx - .04, y: by - .06, ang: a[0] + (a[1] - a[0]) * k, lung: a[2], spess: .22, punta: .04, curva: a[3], onda: .16, fase: F + i * 1.9 + 1, tinta: K.lontano, ombra: 0, lume: 0, n: 7 });
    }
    if (m) for (const v of [-1, 1]) {
      P.tentacolo(c, { x: bx, y: by, ang: .1 + v * .2, lung: .92 + b * .2, spess: .075, punta: .045, curva: v * -.3, onda: .1, fase: F + v, clava: 1, tinta: PREDA, ombra: 0, lume: .02, n: 8, ventose: 3, lato: v, chiara: '#fff6e0' });
    }
    for (let i = 0; i < 4; i++) {
      const a = VICINE[i];
      P.tentacolo(c, { x: bx, y: by + (i - 1.5) * .06, ang: a[0] + (a[1] - a[0]) * k, lung: a[2], spess: .25, punta: .045, curva: a[3] * (1 + k * .8), onda: .16, fase: F + i * 1.7, tinta: K.pelle, ombra: 0, lume: .04, n: 8,
        ventose: i === 3 ? 4 : 0, lato: 1, chiara: '#ffe9cf' });
    }

    // ---- 2. la testa (copre le radici delle braccia), il sifone, la gonna di pinna sopra e sotto
    P.palla(c, .5, .04, .4, .39, 0, K.pelle, { luce: [.6, -.3, 1], ombra: 0 });      // quasi tutta coperta da mantello e occhio: niente ombra propria
    c.beginPath(); c.ellipse(.3, .43, .15, .09, .35, 0, TAU); c.strokeStyle = VENTRE.bordo; c.lineWidth = .08; c.stroke(); c.fillStyle = VENTRE.ombra; c.fill();     // il sifone: un pezzo piccolo si fa con due tratti
    const velo = P.alfa(GONNA.base, .85);
    P.cresta(c, s, { u0: .02, u1: .97, lato: -1, alt: altGonna, onda: .5, fase: F * 2, onde: 3, passi: 12, tinta: GONNA, colore: velo, orlo: m ? '#ff9ad8' : '#eafffb', dentro: .2 });
    P.cresta(c, s, { u0: .02, u1: .97, lato: 1, alt: altGonna, onda: .5, fase: F * 2 + 2, onde: 3, passi: 12, tinta: GONNA, colore: velo, orlo: m ? '#ff9ad8' : '#eafffb', dentro: .2 });

    // ---- 3. il mantello: zebrato, col ventre chiaro e qualche bozzo
    const luce = [-.2, -.42, 1.5];
    P.volume(c, s, K.pelle, { luce, ombra: .1, dentro(cc) {
      P.fianco(cc, s, u => .5 + .1 * sin(u * 14), 1.4, P.sfumatura(cc, VENTRE, luce));
      P.bande(cc, s, RIGHE, P.alfa(K.riga, .88), 8);
    } });
    if (P.fine(o)) P.bozzi(c, [-.9, -.16, -.56, -.02, -.2, -.06], .032, K.pelle);
    P.riflesso(c, -.34, -.4, .46, -.03, .1);

    // ---- 4. la faccia: occhione con la pupilla a W; a caccia palpebra tagliata e sopracciglio
    P.ombra(c, .5, -.02, .3, .34, 0, .28);
    P.occhio(c, .6, -.08, .22, Object.assign({ tipo: 'w', iride: K.iride, pelle: K.pelle, guarda: { x: .45, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, .64, -.3, .46, .42, K.pelle.bordo, .11);
    c.restore();
  },
});
})();
