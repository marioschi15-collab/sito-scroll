/* Boccone — eroe: SCOGLIO, la tartarughina marina. Di profilo: un guscio a cupola verde smeraldo con gli scudi incisi e
   l'orlo d'oro; da sotto spuntano il testone verde mela (occhio castano, becco che sorride), la pancia crema e le pinne a
   paletta macchiate, che batte come ali. È il placido del gruppo: palpebre mezze calate e sorriso tranquillo.
   Tre stadi: cucciolo tutto testa con il guscio liscio e tondo, adulto con le pale lunghe e i primi bozzi sul dorso,
   colosso dal guscio possente con la cresta di punte d'oro, le borchie sugli scudi e due patelle attaccate dietro.
   Quattro espressioni: di gioia allunga il collo e sventola le pale; di paura tira la testa sotto il guscio e sbircia;
   colpito resta con le pale a penzoloni. La testa e la sua faccia si disegnano PRIMA del guscio, che ne copre il collo.
   RITOCCATO PER LO STILE «FILM D'ANIMAZIONE»: i verdi sono più vivi e non prendono più il velo viola della cassetta (sul
   verde il viola ingrigisce: sono colori opposti), ma un'ombra blu petrolio fatta qui (vedi `velo` e `fili`); il guscio
   resta smeraldo fino all'orlo, l'oro è pulito, pale e bozzi hanno la linea sottile e il filo di controluce.
   Il battito di ciglia non è più deciso dal modello (o.t): lo guida P.battito da chi lo disegna dal vivo. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, min } = Math;

// ---- tinte e misure dei tre stadi: tutto ciò che cambia crescendo sta qui, il disegno è uno solo
const PELLE = c => P.tinta(c, '#0a8f66'), GUSCIO = c => P.tinta(c, '#0a4a9c');
const ORO = P.tinta('#ffd23f', '#ff7a1a'), CREMA = P.tinta('#fff3c4', '#e8925c'), CALCARE = P.tinta('#fff1d6', '#d98a5a');
const IRIDE = '#c8551c', GOLA = '#ecff84', ROSA = '#ff5f8f', TACCA = P.alfa(ORO.bordo, .45), PIEGA = P.alfa(CREMA.scura, .5);
const CONTROLUCE = P.alfa('#c8f3ff', .36), BLU = '#06357a', VELO = [P.alfa(BLU, 0), P.alfa(BLU, .14), P.alfa(BLU, .3), P.alfa(BLU, .2)];
/* gx, gy, grx, gry, ang: centro, mezze misure e inclinazione del guscio; hx, hy, r: centro e raggio della testa;
   pala: lunghezza delle pinne davanti; nodi: quanto spuntano i bozzi della cresta (0 = guscio liscio);
   rit: di quanto la testa rientra sotto il guscio per la paura. */
const STADI = [
  { gx: -.44, gy: -.1, grx: .6, gry: .68, ang: -.1, hx: .56, hy: -.02, r: .58, occhio: .3, bocca: .18, pala: .6, nodi: 0, rit: .2,
    pelle: PELLE('#a2f04a'), guscio: GUSCIO('#24dc9a'), sguardo: { palpebra: .05, brillio: 1.25 } },
  { gx: -.46, gy: -.08, grx: .76, gry: .78, ang: -.08, hx: .68, hy: -.01, r: .52, occhio: .28, bocca: .17, pala: .8, nodi: .45, rit: .22,
    pelle: PELLE('#86e23a'), guscio: GUSCIO('#12c48a'), sguardo: { palpebra: .2, sotto: .1 } },
  { gx: -.5, gy: -.1, grx: .86, gry: .88, ang: -.07, hx: .72, hy: .01, r: .5, occhio: .25, bocca: .17, pala: .96, nodi: 1, rit: .24,
    pelle: PELLE('#68cc30'), guscio: GUSCIO('#0aa27e'), sguardo: { palpebra: .3, taglio: .1, sotto: .08 } },
];
/* Le forme «in misura del guscio» (u da -1 dietro a +1 davanti, v da -1 in cima a circa +.45 all'orlo) e della testa
   (in raggi della testa): si riportano una volta sola nelle misure di ogni stadio. */
const SAGOMA = [1, .1, .93, -.36, .62, -.8, .1, -1, -.45, -.9, -.86, -.5, -1, .02, -.86, .36, -.3, .46, .4, .44, .88, .34];
const TESTA = [-1, -.1, -.72, -.72, -.1, -1, .52, -.84, .92, -.36, 1.1, .08, .98, .42, .6, .8, -.1, .92, -.75, .7];
const orlo = u => .24 - .22 * u * u;                                // dove comincia la fascia d'oro degli scudi dell'orlo
const ORLO = [], TACCHE = [];
for (let i = 0; i <= 10; i++) { const u = -1.1 + i * .22; ORLO.push(u, orlo(u)); }
for (const u of [-.84, -.58, -.32, -.06, .2, .46, .72]) TACCHE.push([u, orlo(u), u * 1.05, .62]);
const CUCITURE = [[-1.05, -.1, -.86, -.22, -.62, -.58, -.38, -.56, -.12, -.76, .14, -.62, .42, -.68, .62, -.44, .86, -.3, 1.05, -.32],      // lo zig-zag fra gli scudi del dorso e quelli del fianco
  [-.62, -.58, -.8, -.82], [-.12, -.76, -.16, -1.1], [.42, -.68, .56, -1], [-.38, -.56, -.46, orlo(-.46)], [.14, -.62, .08, orlo(.08)], [.62, -.44, .6, orlo(.6)], ORLO];
const CENTRI = [[-.66, -.2, .16, .22], [-.14, -.22, .19, .27], [.37, -.2, .18, .25], [.8, -.12, .09, .14]];        // il lustro al centro di ogni scudo
const PIEGHE = [[-.52, .5, -.56, .95], [-.14, .5, -.16, .95], [.24, .5, .24, .95]];
const NODI = [[3.75, 1], [4.28, 1.15], [4.8, 1.1], [5.32, .85], [2.82, .8], [3.2, .9]];                           // [direzione dal centro del guscio, altezza]; gli ultimi due sono i denti dell'orlo dietro
const PLACCHE = [[-.62, -.52, .13], [-.3, -.84, .11], [.14, -.9, .1], [.52, -.72, .09], [.8, -.42, .08], [-.86, -.16, .1]];
for (const K of STADI) {
  const ca = cos(K.ang), sa = sin(K.ang);
  const X = K.X = (u, v) => K.gx + u * K.grx * ca - v * K.gry * sa, Y = K.Y = (u, v) => K.gy + u * K.grx * sa + v * K.gry * ca;
  const mappa = p => { const q = []; for (let i = 0; i < p.length; i += 2) q.push(X(p[i], p[i + 1]), Y(p[i], p[i + 1])); return q; };
  K.sag = mappa(SAGOMA); K.cuciture = CUCITURE.map(mappa); K.tacche = TACCHE.map(mappa); K.pieghe = PIEGHE.map(mappa);
  K.fascia = [mappa(ORLO.concat([1.4, .9, -1.4, .9]))];
  K.centri = CENTRI.map(m => [X(m[0], m[1]), Y(m[0], m[1]), m[2] * K.grx, m[3] * K.gry]);
  K.borchie = mappa([-.66, -.24, -.14, -.28, .37, -.25, -.36, -.76, .15, -.84]); K.patelle = mappa([-.8, .0, -.9, -.2, -.62, .06]);
  K.testa = TESTA.map(v => v * K.r);
  K.nodiP = [];
  for (let i = 0; i < (K.nodi === 1 ? 6 : 4); i++) {                 // ogni bozzo: base, punta piegata all'indietro, base
    const a = NODI[i][0], h = NODI[i][1] * .17 * K.nodi, d = .17, e = [];
    for (const [da, rr] of [[-d, .9], [-d * .6, 1 + h * .6], [-.1, 1 + h], [d * .55, 1 + h * .5], [d, .9]]) e.push(X(cos(a + da) * rr, sin(a + da) * rr), Y(cos(a + da) * rr, sin(a + da) * rr));
    K.nodiP.push(e);
  }
  K.lontana = P.tinta(K.pelle.scura, '#0a3f6e'); K.placca = P.alfa(K.pelle.scura, .5);
  K.lustro = P.alfa(P.mescola(K.guscio.luce, '#e2ff7a', .45), .18); K.solco = P.alfa(K.guscio.bordo, .6); K.filo = P.alfa(K.guscio.luce, .5);
}
const SCAGLIE = [[.3, -.09, .075], [.47, -.12, .07], [.64, -.12, .06], [.8, -.09, .045], [.4, .035, .04], [.58, .035, .035], [.74, .025, .03]];
const PAURA = Object.assign({ raggioIride: .54 }, P.SGUARDI.spaventato);      // occhio sbarrato: tanto bianco, iride piccola
const TMP = new Array(20);                                          // il profilo della testa col mento che scende (riscritto a ogni disegno)

/* L'ombra dei pezzi VERDI, da usare dentro `dentro` di un P.volume con `ombra: 0`: lo stesso velo che modella i motivi
   nella cassetta, ma blu petrolio invece che viola. L = la luce del volume, [x, y, r]. */
const velo = (cc, L) => {
  const r = L[2], x = L[0] - .24 * r, y = L[1], g = cc.createRadialGradient(x, y, r * .34, x, y, r);
  g.addColorStop(0, VELO[0]); g.addColorStop(.5, VELO[1]); g.addColorStop(.8, VELO[2]); g.addColorStop(1, VELO[3]);
  cc.fillStyle = g; cc.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
};
/* …e i due fili che la cassetta mette con l'ombra: il controluce color acqua lungo il bordo in ombra (largo w) e il filo
   di luce lungo il bordo illuminato. Vanno per ultimi, sopra i motivi. */
const fili = (cc, traccia, w) => {
  cc.save();
  cc.translate(-.17 * w, -.47 * w); traccia(cc); cc.strokeStyle = CONTROLUCE; cc.lineWidth = w; cc.stroke();
  cc.translate(.31 * w, .86 * w); traccia(cc); cc.strokeStyle = 'rgba(255,255,255,.24)'; cc.lineWidth = w * .84; cc.stroke();
  cc.restore();
};
/* Tante spezzate in un tracciato solo, spostate di (dx, dy): cuciture, tacche, pieghe. */
const linee = (c, liste, dx, dy) => {
  c.beginPath();
  for (const p of liste) { c.moveTo(p[0] + dx, p[1] + dy); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i] + dx, p[i + 1] + dy); }
};
/* Una pinna a paletta lunga L che parte da (x, y) e punta nella direzione fi: il bordo d'attacco è gonfio, la punta tonda.
   macchia = colore delle placche (o niente, per le pinne lontane). */
const pala = (c, x, y, fi, L, tinta, macchia) => {
  c.save(); c.translate(x, y); c.rotate(fi);
  c.beginPath(); c.moveTo(-.06 * L, -.15 * L); c.bezierCurveTo(.25 * L, -.36 * L, .78 * L, -.32 * L, L, -.07 * L);
  c.quadraticCurveTo(1.07 * L, .06 * L, .92 * L, .11 * L); c.bezierCurveTo(.62 * L, .18 * L, .3 * L, .1 * L, -.06 * L, .17 * L); c.closePath();
  c.lineJoin = 'round'; c.strokeStyle = tinta.linea; c.lineWidth = .055; c.stroke();                             // la linea: sottile (metà resta sotto il colore)
  const g = c.createLinearGradient(0, 0, L, 0); g.addColorStop(0, tinta.scura); g.addColorStop(.3, tinta.base); g.addColorStop(1, tinta.chiara);
  c.fillStyle = g; c.fill();
  if (macchia) {
    c.fillStyle = macchia; c.beginPath();
    for (const m of SCAGLIE) { c.moveTo((m[0] + m[2]) * L, m[1] * L); c.arc(m[0] * L, m[1] * L, m[2] * L, 0, TAU); }
    c.fill();
    c.beginPath(); c.moveTo(.2 * L, -.215 * L); c.quadraticCurveTo(.55 * L, -.29 * L, .86 * L, -.15 * L);         // il bordo d'attacco volta le spalle alla luce: filo di controluce
    c.lineCap = 'round'; c.strokeStyle = CONTROLUCE; c.lineWidth = .03; c.stroke();
    c.beginPath(); c.moveTo(.3 * L, .075 * L); c.quadraticCurveTo(.6 * L, .12 * L, .88 * L, .07 * L);              // e l'altro bordo prende la luce
    c.strokeStyle = P.alfa(tinta.luce, .55); c.lineWidth = .026; c.stroke();
  }
  c.restore();
};

B.eroi.registra({
  id: 'scoglio',
  descrizione: 'Una tartarughina marina calma e testarda, che nuota battendo le pinne come ali. Le tartarughe di mare vere non riescono a nascondere la testa nel guscio: lui, quando ha paura, ci prova lo stesso.',
  ingombro: { x0: -1.66, y0: -1.36, x1: 1.45, y1: 1.2 },
  disegna(c, o) {
    const st = max(0, min(2, o.stadio | 0)), K = STADI[st], esp = o.espressione || 'normale', F = (o.fase || 0) * TAU, t = o.t || 0, b = max(0, min(1, o.bocca || 0));
    const paura = esp === 'spaventato', colpito = esp === 'colpito', felice = esp === 'felice', fermo = paura || colpito;
    const batte = sin(F), rema = fermo ? 0 : sin(F * 2 + .6), r = K.r, L = K.pala * (paura ? .55 : 1), X = K.X, Y = K.Y;
    // la direzione delle pale davanti: 1.57 = in giù, 3.14 = all'indietro. Battono come ali; di paura si chiudono sotto il guscio
    const fi = paura ? 2.75 : colpito ? 1.8 : felice ? 1.5 + batte * .4 + sin(t * 9) * .14 : 2.02 + batte * .5;
    c.save();
    if (paura) c.translate(sin(t * 41) * .012, 0);                   // trema
    c.translate(0, fermo ? 0 : sin(F - 1) * .03);                    // ogni colpo di pala lo solleva un po'
    c.rotate(batte * .03 + (colpito ? -.14 : 0));

    // ---- 1. dietro a tutto: pala lontana, pinne di dietro, codino, cresta di bozzi (le radici finiscono sotto il guscio)
    pala(c, X(.6, .3), Y(.6, .3), fi - .22 - (fermo ? 0 : cos(F) * .12), L * .86, K.lontana, null);
    const ch = paura ? .5 : 1;
    pala(c, X(-.4, .4), Y(-.4, .4), 2.25 - rema * .14, K.grx * .52 * ch, K.lontana, null);
    P.corno(c, X(-.9, .24), Y(-.9, .24), PI - .3 + rema * .12, K.grx * .3, .15, K.pelle);
    pala(c, X(-.66, .32), Y(-.66, .32), 2.72 + rema * .14, K.grx * .62 * ch, K.pelle, null);
    if (K.nodi) {
      c.beginPath();
      for (const e of K.nodiP) { c.moveTo(e[0], e[1]); c.quadraticCurveTo(e[2], e[3], e[4], e[5]); c.quadraticCurveTo(e[6], e[7], e[8], e[9]); }
      c.lineJoin = 'round'; c.strokeStyle = K.guscio.linea; c.lineWidth = .05; c.stroke();
      const g = c.createRadialGradient(K.gx, K.gy, K.gry * .92, K.gx, K.gy, K.gry * 1.17); g.addColorStop(0, K.guscio.base); g.addColorStop(.5, K.guscio.chiara); g.addColorStop(1, ORO.base);
      c.fillStyle = g; c.fill();
    }

    // ---- 2. la pancia crema, con le pieghe delle piastre
    P.palla(c, X(.04, .42), Y(.04, .42), K.grx * .88, K.gry * .42, K.ang, CREMA, { luce: [X(.25, .62), Y(.25, .62), K.grx * 1.5], ombra: .04, dentro(cc) {
      linee(cc, K.pieghe, 0, 0); cc.lineCap = 'round'; cc.strokeStyle = PIEGA; cc.lineWidth = .03; cc.stroke();
    } });

    // ---- 3. la testa con tutta la faccia: il mento scende quando apre la bocca; di paura rientra sotto il guscio
    const rit = paura ? K.rit : colpito ? .06 : felice ? -.05 : 0, apre = paura ? .3 : colpito ? .2 : felice ? max(b, .35) : b * .9;
    const hx = K.hx - rit, hy = K.hy - (felice ? .03 : 0), ex = -.02 * r, ey = -.2 * r, ro = K.occhio;
    c.save(); c.translate(hx, hy); c.rotate(sin(F - .9) * .03 + sin(t * 1.7) * .012 + (felice ? -.13 : colpito ? .12 : 0));
    for (let i = 0; i < 20; i++) TMP[i] = K.testa[i];
    TMP[13] += .1 * r * apre; TMP[14] += .03 * r * apre; TMP[15] += .26 * r * apre; TMP[17] += .12 * r * apre;
    const testa = cc => P.profilo(cc, TMP), luceTesta = [.25 * r, -.4 * r, 2.1 * r];
    P.volume(c, testa, K.pelle, { luce: luceTesta, ombra: 0, dentro(cc) {
      velo(cc, luceTesta);
      P.guancia(cc, .3 * r, .95 * r, .85 * r, GOLA, .7);              // la gola chiara, che sfuma nella guancia
      cc.fillStyle = K.placca; cc.beginPath();                        // le placche scure sulla testa
      for (const m of PLACCHE) { cc.moveTo((m[0] + m[2]) * r, m[1] * r); cc.arc(m[0] * r, m[1] * r, m[2] * r, 0, TAU); }
      cc.fill();
      fili(cc, testa, .05);
    } });
    P.guancia(c, -.25 * r, .56 * r, .32 * r, ROSA, paura ? .25 : felice ? .85 : .55);
    const sg = colpito ? P.SGUARDI.colpito : felice ? P.SGUARDI.felice : paura ? PAURA : K.sguardo;
    P.occhio(c, ex, ey, ro, Object.assign({ iride: IRIDE, pelle: K.pelle, guarda: P.sguardo(o.sguardo, hx + ex, hy + ey) }, sg));
    if (paura) P.sopracciglio(c, ex + .04, ey - ro * 1.42, ro * 1.1, -.32, K.pelle.bordo, .06);
    else if (st === 2 && !colpito && !felice) P.sopracciglio(c, ex + .05, ey - ro * 1.04, ro * 1.8, .16, K.pelle.bordo, .085);      // da colosso: lo sguardo di chi ne ha viste tante
    if (P.fine(o)) { c.fillStyle = P.alfa(K.pelle.bordo, .7); c.beginPath(); c.ellipse(.93 * r, -.16 * r, .035, .02, -.6, 0, TAU); c.fill(); }      // la narice
    const mx = .6 * r, my = .5 * r, w = K.bocca;
    if (paura) P.sorriso(c, mx + .03, my, w * .5, { ang: -.3, apri: .55 + sin(t * 30) * .08, alt: w * .8, curva: -.3, lingua: false, tinta: K.pelle, spess: .06 });
    else if (colpito) P.sorriso(c, mx, my, w * .9, { ang: -.3, apri: .45, alt: w * .7, curva: -.8, lingua: false, tinta: K.pelle, spess: .06 });
    else P.sorriso(c, mx, my, w, { ang: -.3, apri: apre, alt: w * 1.35, curva: felice ? 1 : .75, tinta: K.pelle, spess: .06 });
    c.restore();

    // ---- 4. la pala vicina (la radice finisce sotto il guscio) e l'ombra che il guscio le getta addosso
    pala(c, X(.42, .2), Y(.42, .2), fi, L, K.pelle, K.placca);
    P.ombra(c, X(.2, .56), Y(.2, .56), K.grx * .55, .1, K.ang, .3);

    // ---- 5. il guscio: una cupola sola; dentro, il lustro degli scudi, la fascia d'oro dell'orlo e le cuciture incise
    const guscio = cc => P.profilo(cc, K.sag), luceGuscio = [X(.35, -.55), Y(.35, -.55), K.grx * 2.2];
    P.volume(c, guscio, K.guscio, { luce: luceGuscio, ombra: 0, dentro(cc) {
      cc.fillStyle = K.lustro; cc.beginPath();
      for (const m of K.centri) { cc.moveTo(m[0] + m[2], m[1]); cc.ellipse(m[0], m[1], m[2], m[3], 0, 0, TAU); }
      cc.fill();
      velo(cc, luceGuscio);                                           // l'ombra blu del verde, PRIMA dell'oro (che ha la sua, arancio)
      linee(cc, K.fascia, 0, 0); cc.fillStyle = P.sfumatura(cc, ORO, [X(.4, .1), Y(.4, .1), K.grx * 1.9]); cc.fill();
      cc.lineJoin = cc.lineCap = 'round';
      linee(cc, K.cuciture, 0, 0); cc.strokeStyle = K.solco; cc.lineWidth = .036; cc.stroke();
      linee(cc, K.cuciture, .02, .016); cc.strokeStyle = K.filo; cc.lineWidth = .02; cc.stroke();
      linee(cc, K.tacche, 0, 0); cc.strokeStyle = TACCA; cc.lineWidth = .03; cc.stroke();
      fili(cc, guscio, .06);
    } });
    if (st === 2 && P.fine(o)) { P.bozzi(c, K.borchie, .05, K.guscio); P.bozzi(c, K.patelle, .05, CALCARE); }
    P.riflesso(c, X(.36, -.7), Y(.36, -.7), K.grx * .55, .4 + K.ang, .16);

    // ---- 6. i segni dell'espressione
    if (paura) P.goccia(c, hx + .5 * r, K.hy - .88 * r + sin(t * 5) * .015, .085, .5);
    if (colpito) P.stelle(c, hx - .1, K.hy - r - .3, .5, t, 3, .12);
    c.restore();
  },
});
})();
