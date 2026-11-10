/* Boccone — gigante: DON CERNIA, il padrone della laguna. Una cernia colossale bruno-oliva marmorizzata: labbroni carnosi,
   mento sporgente, guancia cadente, sopracciglia folte, coroncina e un dente d'oro.
   Tutti gli stati letti con P.statoGigante. Il segnale da ricordare: labbra rosa = tranquillo; labbra che LAMPEGGIANO ROSSE
   (con un alone rosso attorno alla bocca e le spine del dorso dritte) = sta per aspirare o per caricare. Quando aspira
   spalanca una bocca-caverna: mandibola giù, testa su, e in fondo il buio della gola. */
(() => {
'use strict';
const B = window.B, P = B.pittura, R = B.util.rumore, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, round, max, min } = Math;

// ---- tinte (una volta sola): oliva caldo con le ombre color prugna, pinne ruggine orlate d'oro, labbra salmone
const T = { corpo: P.tinta('#9c8c2e', '#4a2456'), mento: P.tinta('#b3a03c', '#5a2a52'), guancia: P.tinta('#bba640', '#5e2c56'), ventre: P.tinta('#ffe9ae', '#e08f4a'),
  pinna: P.tinta('#b8682a', '#4a1e52'), pinnaSpenta: P.tinta('#b39a94', '#6a5a80'), ciglio: P.tinta('#4d2f52'), spenta: P.tinta('#a9a6bd') };
const LABBRA = [];                                                     // dal salmone al rosso acceso: sette gradini per il lampo
for (let i = 0; i <= 6; i++) LABBRA.push(P.tinta(P.mescola('#f08a78', '#ff2a3a', i / 6), '#a8204e'));
const LABBRA_SPENTE = P.tinta('#cbb4be', '#7a6a8a');
const ORO = '#ffe14a', ROSSO = '#ff3348', MARMO = P.alfa('#ece282', .5), NEI = P.alfa(T.corpo.bordo, .5), SELLA = P.alfa(T.corpo.bordo, .24);
const CALMO = { palpebra: .3, sotto: .1 };                             // l'occhio mezzo addormentato del vecchio signore

/* Un barile con la coda: testa enorme, e il ventre che si ritira da u = .6 in avanti, dove lavora la mandibola. */
const SU = P.sagoma([[0, .13], [.1, .21], [.28, .54], [.48, .8], [.66, .88], [.82, .84], [.93, .66], [1, .44]]);
const GIU = P.sagoma([[0, .13], [.1, .21], [.28, .52], [.44, .76], [.56, .8], [.64, .62], [.7, .46], [.8, .36], [.9, .275], [1, .19]]);
const ONDA = { amp: .13, onde: .5, testa: .02, potenza: 2.2 };         // si muove solo il codone
const L = 1.06, H = .35, ANG = -.43, APRI = 1.1;                        // mandibola: lunghezza, spessore, direzione da chiusa, apertura massima (radianti)
const sella = (u0, d) => v => u0 + d + .035 * sin(v * 3 + u0 * 20);    // selle scure dal bordo ondulato
const SELLE = [.14, .3, .46, .62].map(u0 => [sella(u0, 0), sella(u0, .08)]);
/* Le labbra sono due salsicciotti su una spina curva: sottili all'angolo della bocca, gonfi davanti. */
const curva = (ax, ay, bx, by, dx, dy) => (u, p) => { const w = 1 - u; p.x = w * w * ax + 2 * w * u * bx + u * u * dx; p.y = w * w * ay + 2 * w * u * by + u * u * dy; };
const SPL = P.sagoma([[0, .03], [.4, .06], [.78, .1], [1, .09]]);
const LABBRO_GIU = P.spina(8, curva(L * .2, .03, L * 1.03, -.02, L * 1.02, H * .3), SPL, SPL, { testa: .09, coda: .03 });   // nelle coordinate della mandibola

/* Marmo: chiazze irregolari (tre ellissi sghembe ciascuna) sparse sul dorso e sui fianchi, sempre uguali. */
function marmo(cc, s, n, seme, r0, r1, colore) {
  const q = {}; cc.beginPath();
  for (let i = 0; i < n; i++) {
    const r = r0 + (r1 - r0) * R(i, seme + 5);
    P.suSpina(s, .07 + .84 * ((i * .618034 + seme * .37) % 1), -.86 + 1.12 * (i + .5) / n, q);
    for (let k = 0; k < 3; k++) {
      const j = i * 3 + k, a = R(j, seme) * TAU, d = r * .75 * R(j, seme + 2), x = q.x + cos(a) * d, y = q.y + sin(a) * d * .7, rr = r * (.5 + .5 * R(j, seme + 7)), g = R(j, seme + 3) * PI;
      cc.moveTo(x + cos(g) * rr * 1.4, y + sin(g) * rr * 1.4); cc.ellipse(x, y, rr * 1.4, rr * .75, g, 0, TAU);
    }
  }
  cc.fillStyle = colore; cc.fill();
}
/* Sopracciglio folto: una virgola grossa con tre ciuffi verso la tempia. ang > 0 = cattivo. */
function ciglione(c, x, y, lung, ang, s, t) {
  const h = lung / 2;
  c.save(); c.translate(x, y); c.rotate(ang); c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(h, s * .15);
  c.quadraticCurveTo(h * .3, -s * 1.3, -h * .45, -s);
  c.lineTo(-h * 1.05, -s * 1.5); c.lineTo(-h * .8, -s * .55); c.lineTo(-h * 1.28, -s * .45); c.lineTo(-h * .85, s * .08); c.lineTo(-h * 1.1, s * .6); c.lineTo(-h * .5, s * .32);
  c.quadraticCurveTo(h * .2, -s * .1, h, s * .15); c.closePath();
  c.strokeStyle = t.bordo; c.lineWidth = .05; c.stroke(); c.fillStyle = t.base; c.fill();
  c.beginPath(); c.moveTo(h * .6, -s * .3); c.quadraticCurveTo(h * .1, -s * .9, -h * .45, -s * .68);
  c.strokeStyle = P.alfa(t.luce, .6); c.lineWidth = s * .2; c.stroke();
  c.restore();
}
/* Guancia cadente: un lembo della stessa pelle del corpo che pende sopra l'angolo della bocca. In alto si fonde con la
   testa (niente bordo), in basso ha bordo e ombra. k = di quanto si allunga quando la bocca si spalanca. */
function guanciona(c, x, y, k, t, luce, dentro) {
  const p = [x - .26, y - .08, x - .05, y - .23, x + .17, y - .17, x + .25, y + .05, x + .14, y + .27 + k, x - .09, y + .3 + k, x - .27, y + .12];
  c.save(); c.beginPath(); c.rect(x - 1, y - .02, 2, 2); c.clip();
  P.profilo(c, p); c.lineJoin = 'round'; c.strokeStyle = t.bordo; c.lineWidth = P.BORDO * 2; c.stroke(); c.restore();
  P.volume(c, cc => P.profilo(cc, p), t, { luce, bordo: 0, ombra: .09, dentro });
}

B.specie.registra({
  id: 'don_cernia',
  descrizione: 'Le cernie non inseguono nessuno: spalancano la bocca di colpo e l\'acqua si porta dentro la preda. Don Cernia comanda la laguna da cinquant\'anni: quando le labbra gli diventano rosse, nuota via!',
  forma: { lx: 1.25, ly: .95 },
  ingombro: { x0: -2.2, y0: -1.6, x1: 1.8, y1: 1.35 },
  disegna(c, o) {
    const G = P.statoGigante(o), t = o.t || 0, fase = o.fase || 0, F = fase * TAU, q = {};
    const viva = !G.giu, velo = G.sconfitto ? .45 : G.stordito ? .18 : 0;
    const ap = max(.03, G.apri * APRI + (G.calmo ? .06 + .04 * sin(t * 1.6) : 0));     // apertura della mandibola in radianti (da calmo «respira»)
    const rosso = G.carica ? 6 : G.avviso ? round(G.lampo * 6) : G.caccia ? 1 : 0;     // quanto sono accese le labbra (0..6)
    const labbra = G.sconfitto ? LABBRA_SPENTE : LABBRA[rosso], tp = G.sconfitto ? T.pinnaSpenta : T.pinna;
    const orlo = G.sconfitto ? T.spenta.base : rosso > 1 ? P.mescola(ORO, ROSSO, rosso / 6) : ORO;
    const sbiadisci = velo ? cc => { cc.fillStyle = 'rgba(182,180,210,' + velo + ')'; cc.fillRect(-3, -3, 6, 6); } : null;   // sbiadisce quando è giù
    c.save();
    c.translate(G.rincula + G.trema, sin(t * 1.3) * .02 + (G.sconfitto ? .12 : 0));
    c.rotate((G.sconfitto ? .32 : G.stordito ? sin(t * 2.2) * .07 : 0) - ap * .26 - (G.avviso ? G.k * .04 : 0));   // spalancando la bocca alza la testa
    if (G.carica) c.scale(1.05, .96); else if (G.avviso) c.scale(1 + G.k * .03, 1 + G.k * .05);                    // prima di colpire si gonfia
    if (rosso > 1) P.bagliore(c, .8, .3, 1.0, ROSSO, G.carica ? .3 : G.lampo * .5);                                // l'alone dell'avviso
    const s = P.spinaPesce(14, -1.3, .64, fase, ONDA, SU, GIU, { testa: .3, coda: .05 }), luce = [.25, -.55, 2];
    const irto = viva ? G.ira : -.6;                                   // spine dritte quando è arrabbiato, flosce quando è giù

    // ---- 1. dietro al corpo: codone a ventaglio, dorsale molle, dorsale spinosa, anale, e la caverna della bocca
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1) * .3 + (G.giu ? .25 : 0), tipo: 'ventaglio', lung: .62, alt: .66, radice: .15, fase: F - 1.8, onda: .2, tinta: tp, orlo, smerlo: .35, n: 7 });
    const m0 = P.suSpina(s, .42, -.9), m1 = P.suSpina(s, .12, -.62);
    P.pinna(c, { x0: m0.x, y0: m0.y, x1: m1.x, y1: m1.y, a0: -PI / 2 - .55 + irto * .15, a1: -PI + .4, lung: .5, profilo: [.75, 1, 1, .85, .5], n: 6, onda: .08, fase: F, passo: .7, tinta: tp, orlo });
    const d0 = P.suSpina(s, .7, -.93), d1 = P.suSpina(s, .4, -.9);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -PI / 2 - .5 + irto * .35, a1: -PI / 2 - .85 + irto * .25, lung: .4 + irto * .16, profilo: [.55, .9, 1, .95, .85, .7], n: 6, smerlo: .9,
      onda: .05, fase: F, passo: .8, tinta: tp, orlo, primo: true });
    const a0 = P.suSpina(s, .3, .88), a1 = P.suSpina(s, .12, .75);
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: PI / 2 + .55, a1: PI - .4, lung: .4, profilo: [.75, 1, .8, .5], n: 5, onda: .08, fase: F + 1, tinta: tp, orlo });
    const ce = P.suSpina(s, .62, .86), am = ANG + ap, ca = cos(am), sa = sin(am);               // cerniera e direzione della mandibola
    const fauci = { x: ce.x, y: ce.y, ang: ANG, lung: L, apri: ap, alt: H, su: .3, fondo: .74, tinta: T.mento, interno: '#8a1446', lingua: '#ff7d9c', ombra: .09,
      dentro(cc) {                                                     // doppio mento chiaro e piega della gola (nelle coordinate della mandibola)
        cc.fillStyle = P.alfa(T.ventre.base, .62); cc.beginPath(); cc.ellipse(L * .38, H * 1.08, L * .62, H * .52, 0, 0, TAU); cc.fill();
        P.solco(cc, [L * .08, H * .52, L * .34, H * .76, L * .66, H * .7], T.mento, .03);
        if (sbiadisci) sbiadisci(cc);
      } };
    fauci.parte = 'cavita'; P.fauci(c, fauci);
    if (ap > .14) {                                                    // la gola: il buio in fondo alla caverna
      const mid = ANG + (ap - .3) / 2, k = min(1, ap * 1.2);
      P.ombra(c, ce.x + cos(mid) * L * .26, ce.y + sin(mid) * L * .26, L * .34 * k, L * .25 * k, mid, .92, '#1c0318');
    }

    // ---- 2. il corpo: selle scure, ventre chiaro, marmo giallo-verde, nei; sopra bozzi, opercolo, riflesso
    P.volume(c, s, T.corpo, { luce, ombra: .13, dentro(cc) {
      P.bande(cc, s, SELLE, SELLA);
      P.fianco(cc, s, u => .38 + .1 * sin(u * 9), 1.4, T.ventre.base, 0, .66);
      marmo(cc, s, 13, 4, .06, .12, MARMO);
      P.macchie(cc, s, { n: 11, seme: 2, u0: .1, u1: .92, v0: -.82, v1: .3, r0: .022, r1: .045, colore: NEI, lungo: 1.1 });
      if (sbiadisci) sbiadisci(cc);
    } });
    if (P.fine(o)) P.bozzi(c, P.puntiSuSpina(s, 5, .5, .8, u => -.76 - .12 * sin(u * 31)), i => .034 + (i % 3) * .012, T.corpo);
    const b0 = P.suSpina(s, .56, -.5), b1 = P.suSpina(s, .5, -.05), b2 = P.suSpina(s, .51, .3);
    P.solco(c, [b0.x, b0.y, b1.x, b1.y, b2.x, b2.y], T.corpo, .05);
    P.riflesso(c, -.2, -.66, .3, -.08, .12);

    // ---- 3. sul fianco: la pettorale tonda che rema
    const pp = P.suSpina(s, .42, .34), rema = sin(F * 2 + .5), dir = PI * .88 + rema * .28 - (G.carica ? .25 : 0) - (G.giu ? .5 : 0);
    P.ombra(c, pp.x - .16, pp.y + .08, .36, .24, -.3, .3);
    P.pinna(c, { x0: pp.x + .05, y0: pp.y - .12, x1: pp.x - .03, y1: pp.y + .14, a0: dir - .65, a1: dir + .65, lung: .62, profilo: [.65, .92, 1, .92, .65], n: 6, onda: .1, fase: F * 2, passo: .7, tinta: tp, orlo, primo: true });

    // ---- 4. la bocca: denti di sopra e di sotto (col dente d'oro), labbro di sopra, mandibola, labbro di sotto, guancia cadente
    const kd = min(1, .3 + ap * 1.6), l0 = P.suSpina(s, .76, 1), l1 = P.suSpina(s, 1, 1);       // a bocca chiusa i denti stanno dietro le labbra
    P.denti(c, l0.x, l0.y, l1.x + .2, l1.y - .07, 8, .17 * kd, -1, { tipo: 'punta', varia: .3, seme: 11 });
    P.denti(c, ce.x + ca * L * .26, ce.y + sa * L * .26, ce.x + ca * L * .98, ce.y + sa * L * .98, 8, .21 * kd, 1, { tipo: 'punta', varia: .3, seme: 5 });
    P.denti(c, ce.x + ca * L * .71, ce.y + sa * L * .71, ce.x + ca * L * .8, ce.y + sa * L * .8, 1, .22 * kd, 1, { tipo: 'punta', colore: '#ffcf3a', bordo: '#8a4a0a' });
    const la = P.suSpina(s, .72, .9);
    P.volume(c, P.spina(8, curva(la.x, la.y, l1.x + .27, l1.y - .09, l1.x + .3, l1.y - .22), SPL, SPL, { testa: .08, coda: .03 }), labbra, { luce: [l1.x + .2, l1.y - .2, 1], bordo: .04, ombra: .04, lume: .04 });
    P.riflesso(c, l1.x + .25, l1.y - .16, .13, 1.1, .1);
    fauci.parte = 'mandibola'; P.fauci(c, fauci);
    c.save(); c.translate(ce.x, ce.y); c.rotate(am);
    P.volume(c, LABBRO_GIU, labbra, { luce: [L * .9, -.1, 1], bordo: .04, ombra: .04, lume: .04 });
    P.riflesso(c, L * .8, -.035, .15, -.05, .1);
    c.restore();
    const gx = ce.x + .02, gy = ce.y - .13 + ap * .04;
    P.ombra(c, gx + .08, gy + .2, .26, .22, 0, .22);
    guanciona(c, gx, gy, ap * .05 + (viva ? sin(t * 1.6) * .012 : .03), T.guancia, [gx + .06, gy - .1, .62], cc => {
      cc.fillStyle = MARMO; cc.beginPath(); cc.ellipse(gx - .1, gy - .04, .1, .06, .5, 0, TAU); cc.ellipse(gx + .1, gy + .16, .07, .045, -.6, 0, TAU); cc.fill();
      if (viva) P.guancia(cc, gx + .02, gy + .08, .2, '#ff6f7f', .22 + rosso * .1);             // la gota che si arrossa
      if (sbiadisci) sbiadisci(cc);
    });

    // ---- 5. la faccia: narici, occhio pigro (o rosso e tagliato), sopracciglio folto, cicatrice, coroncina
    const e = P.suSpina(s, .87, -.5);
    if (P.fine(o)) {
      const n = P.suSpina(s, 1, -.5);
      c.fillStyle = P.alfa(T.corpo.bordo, .75); c.beginPath(); c.ellipse(n.x + .17, n.y + .02, .028, .02, .5, 0, TAU); c.ellipse(n.x + .09, n.y - .05, .024, .018, .5, 0, TAU); c.fill();
      P.solco(c, [e.x - .34, e.y - .08, e.x - .41, e.y + .05, e.x - .42, e.y + .2], T.corpo, .03);                  // una vecchia cicatrice, con i suoi punti
      c.beginPath(); c.moveTo(e.x - .45, e.y - .01); c.lineTo(e.x - .35, e.y + .02); c.moveTo(e.x - .47, e.y + .1); c.lineTo(e.x - .37, e.y + .12);
      c.lineCap = 'round'; c.strokeStyle = NEI; c.lineWidth = .028; c.stroke();
    }
    if (G.ira > .6) P.bagliore(c, e.x, e.y, .32, ROSSO, G.ira * .4);                                // l'occhio di brace, solo quando sta per colpire
    P.occhio(c, e.x, e.y, .19, Object.assign({ iride: G.ira ? '#ff3a1e' : '#4fe0b0', pelle: T.corpo, tipo: G.ira ? 'fessura' : 'tondo', guarda: P.sguardo(o.sguardo, e.x, e.y) }, G.calmo ? CALMO : G.occhi));
    ciglione(c, e.x + .02, e.y - (G.ira ? .2 : .25), .52, G.giu ? -.35 : G.ira ? .3 + G.ira * .3 : -.12, G.ira ? .15 : .12, T.ciglio);
    const k0 = P.suSpina(s, .74, -1);
    P.corona(c, k0.x - (G.sconfitto ? .3 : G.stordito ? .1 : 0), k0.y + .05, .23, G.sconfitto ? -.8 : G.stordito ? -.55 : -.28);
    if (G.stordito) P.stelle(c, .3, -1.2, .5, t, 3, .11);
    c.restore();
  },
});
})();
