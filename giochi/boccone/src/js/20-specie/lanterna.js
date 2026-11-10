/* Boccone — gigante: LA GRANDE LANTERNA, signora dell'abisso. ESEMPIO DI RIFERIMENTO per i giganti (vedi GUIDA-STILE.md):
   tutti gli stati letti con P.statoGigante (calmo, caccia, avviso con o.carica, carica, stordito, sconfitto), mandibola
   sporgente (P.fauci in due parti), esca luminosa che fa da segnale di pericolo, corona.
   Il segnale da ricordare: esca verde acqua = tranquilla, gialla = ti dà la caccia, lampeggia rossa = sta per attaccare. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, round } = Math;

/* Viola-nero, ma con la tinta base abbastanza chiara da staccare dal buio dell'abisso: il nero lo fanno ombre e bordi. */
const T = { corpo: P.tinta('#5d36b8', '#1a0a4a'), mento: P.tinta('#7b4fd0', '#2a0f5a'), ventre: P.tinta('#b993ea', '#5a2a9a'), pinna: P.tinta('#9a3fd6', '#2a0f6a'),
  stelo: P.tinta('#8f72e6', '#2a0f6a'), spenta: P.tinta('#8d89b4') };
const ACQUA = '#62ffd2', ORO = '#ffe14a', ROSSO = '#ff3348', FOTOFORI = '#58f0e0';
/* Un pallone con la coda: il ventre si ritira da u = .6 in avanti, dove lavora la mandibola. */
const SU = P.sagoma([[0, .12], [.1, .2], [.28, .58], [.48, .88], [.68, .98], [.86, .86], [1, .6]]);
const GIU = P.sagoma([[0, .12], [.1, .2], [.28, .55], [.44, .8], [.56, .78], [.64, .4], [.78, .3], [.9, .2], [1, .14]]);
const ONDA = { amp: .13, onde: .5, testa: .02, potenza: 2.2 };       // si muove solo il codino

B.specie.registra({
  id: 'lanterna',
  descrizione: 'Nel buio dell\'abisso si vede soltanto la sua lucina che dondola, e chi si avvicina a guardare scopre troppo tardi la bocca che c\'è dietro. Se la luce diventa rossa, scappa.',
  forma: { lx: 1.15, ly: 1.0 },
  ingombro: { x0: -1.96, y0: -1.84, x1: 1.84, y1: 1.58 },
  disegna(c, o) {
    const G = P.statoGigante(o), t = o.t || 0, fase = o.fase || 0, F = fase * TAU, q = {};
    const ap = G.apri * 1.05, viva = !G.giu;                           // ap: apertura della mandibola in radianti
    c.save();
    c.translate(G.rincula + G.trema, sin(t * 1.3) * .02 + (G.sconfitto ? .1 : 0));
    c.rotate((G.sconfitto ? .3 : G.stordito ? sin(t * 2.2) * .07 : 0) - ap * .13 - (G.avviso ? G.k * .05 : 0));   // spalancando la bocca alza la testa
    if (G.carica) c.scale(1.05, .96);                                  // lanciata: si allunga
    const s = P.spinaPesce(14, -1.2, .62, fase, ONDA, SU, GIU, { testa: .3, coda: .05 }), luce = [.2, -.55, 1.9];
    const irto = viva ? G.ira : -.6;                                   // pinne irte quando è arrabbiata, flosce quando è giù

    // ---- 1. dietro al corpo: coda sfrangiata, pinna dorsale a punte, anale, e la cavità della bocca
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1) * .3, tipo: 'ventaglio', lung: .52, alt: .56, radice: .13, fase: F - 1.8, onda: .2, tinta: T.pinna, orlo: viva ? FOTOFORI : T.spenta.base, smerlo: .8, n: 6 });
    const d0 = P.suSpina(s, .52, -.9), d1 = P.suSpina(s, .2, -.75);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -PI / 2 - .5 + irto * .3, a1: -PI + .45 + irto * .15, lung: .5 + irto * .12, profilo: [.55, 1, .9, .7, .45], n: 5, smerlo: .85,
      onda: .06, fase: F, passo: .8, tinta: T.pinna, orlo: viva ? FOTOFORI : T.spenta.base, primo: true });
    const a0 = P.suSpina(s, .34, .85), a1 = P.suSpina(s, .14, .8);
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: PI / 2 + .6, a1: PI - .4, lung: .36, profilo: [.7, 1, .7], n: 4, smerlo: .8, onda: .08, fase: F + 1, tinta: T.pinna });
    const ce = P.suSpina(s, .58, .5), L = 1.08, h = .42;               // cerniera, lunghezza e spessore della mandibola
    const fauci = { x: ce.x, y: ce.y, ang: -.36, lung: L, apri: ap, alt: h, su: .25, fondo: .74, tinta: T.mento, interno: '#7a0c3e', lingua: '#ff6f9a', ombra: .08,
      dentro(cc) {                                                     // labbro chiaro, bozzi del mento (nelle coordinate della mandibola)
        cc.fillStyle = P.alfa(T.ventre.base, .55); cc.fillRect(-L * .3, 0, L * 1.4, h * .2);
        P.bozzi(cc, [L * .3, h * .55, L * .52, h * .62, L * .72, h * .5, L * .88, h * .3], .034, T.mento);
      } };
    fauci.parte = 'cavita'; P.fauci(c, fauci);

    // ---- 2. il corpo: ventre chiaro con le pieghe, sella scura sul dorso, macchie; sopra bozzi, fotofori, branchia, riflesso
    P.volume(c, s, T.corpo, { luce, ombra: .13, dentro(cc) {
      P.fianco(cc, s, u => .42 + .1 * sin(u * 9), 1.4, T.ventre.base, 0, .63);
      P.fianco(cc, s, -1.4, u => -.62 + .12 * sin(u * 23), P.alfa(T.corpo.bordo, .4), 0, 1);
      P.macchie(cc, s, { n: 9, seme: 6, u0: .12, u1: .8, v0: -.5, v1: .3, r0: .035, r1: .075, colore: P.alfa(T.corpo.bordo, .42), lungo: 1.1 });
      P.anelli(cc, s, .3, .5, 4, T.ventre, { v0: .5, v1: 1.1, curva: -.03, spess: .04 });
      if (!viva) { cc.fillStyle = 'rgba(176,176,206,' + (G.sconfitto ? .42 : .2) + ')'; cc.fillRect(-2, -2, 4, 4); }     // sbiadisce quando è giù
    } });
    P.bozzi(c, P.puntiSuSpina(s, 6, .32, .8, u => -.6 - .2 * sin(u * 31)), i => .04 + (i % 3) * .012, T.corpo);
    P.lucine(c, P.puntiSuSpina(s, 6, .15, .52, u => .08 + .1 * sin(u * 12)), i => .03 + (i % 2) * .012, FOTOFORI, viva ? .7 + .3 * sin(t * 3) : .15);
    const b0 = P.suSpina(s, .5, -.25), b1 = P.suSpina(s, .46, .1), b2 = P.suSpina(s, .5, .4);
    P.solco(c, [b0.x, b0.y, b1.x, b1.y, b2.x, b2.y], T.corpo, .05);
    P.riflesso(c, .36, -.66, .34, .55, .12);

    // ---- 3. sul fianco: pinna pettorale che rema
    const pp = P.suSpina(s, .4, .45), rema = sin(F * 2 + .5), dir = PI * .86 + rema * .3 - (G.carica ? .25 : 0);
    P.ombra(c, pp.x - .16, pp.y + .08, .34, .22, -.3, .3);
    P.pinna(c, { x0: pp.x + .05, y0: pp.y - .1, x1: pp.x - .03, y1: pp.y + .12, a0: dir - .6, a1: dir + .6, lung: .6, profilo: [.6, .9, 1, .9, .6], n: 5, smerlo: .6, onda: .1, fase: F * 2, passo: .7, tinta: T.pinna, orlo: viva ? FOTOFORI : T.spenta.base, primo: true });

    // ---- 4. la bocca: denti di vetro di sopra, poi quelli di sotto, il pizzetto, e la mandibola che ne copre le radici
    const l0 = P.suSpina(s, .68, 1), l1 = P.suSpina(s, 1, 1);
    P.denti(c, l0.x, l0.y - .02, l1.x + .16, l1.y - .05, 7, .3, -1, { tipo: 'ago', varia: .5, seme: 11, colore: '#eefcff', curva: -.02 });
    const am = fauci.ang + ap, ca = cos(am), sa = sin(am);
    P.denti(c, ce.x + ca * L * .2, ce.y + sa * L * .2, ce.x + ca * L * .97, ce.y + sa * L * .97, 7, .36, 1, { tipo: 'ago', varia: .5, seme: 5, colore: '#eefcff' });
    const mx = ce.x + ca * L * .62 - sa * h * .9, my = ce.y + sa * L * .62 + ca * h * .9, don = sin(t * 1.7) * .06;       // sotto il mento
    P.filo(c, [mx, my, mx - .05 + don, my + .17, mx - .13 + don * 2, my + .31], .06, .025, T.stelo, .03);
    fauci.parte = 'mandibola'; P.fauci(c, fauci);
    if (viva) P.lucine(c, [mx - .13 + don * 2, my + .33], .035, FOTOFORI, .8);

    // ---- 5. l'occhio piccolo e crudele sotto l'arcata, la corona
    const e = P.suSpina(s, .9, -.42);
    if (G.ira) P.bagliore(c, e.x, e.y, .34, ROSSO, G.ira * .55);
    P.occhio(c, e.x, e.y, .15, Object.assign({ iride: G.ira ? '#ff5a1e' : '#b8f23a', bianco: '#fff6b0', tipo: 'fessura', pelle: T.corpo, guarda: P.sguardo(o.sguardo, e.x, e.y) }, G.occhi));
    P.sopracciglio(c, e.x + .03, e.y - (G.ira ? .17 : .2), .46, G.giu ? -.3 : G.ira ? .3 + G.ira * .35 : -.04, T.corpo.bordo, G.ira ? .14 : .1);   // piatto da calma, a spiovente da arrabbiata
    const k0 = P.suSpina(s, .62, -1);
    P.corona(c, k0.x - (G.sconfitto ? .3 : G.stordito ? .1 : 0), k0.y + .06, .25, G.sconfitto ? -.75 : G.stordito ? -.5 : -.2);

    // ---- 6. l'esca: lo stelo parte dalla fronte e porta la lucina davanti alla bocca. Il colore dice che cosa sta per fare
    const r0 = P.suSpina(s, .83, -.96);
    const stelo = P.tentacolo(c, { x: r0.x, y: r0.y, lung: 1.22, spess: .11, punta: .05, n: 9, tinta: T.stelo, ombra: 0, lume: .03,
      ang: G.carica ? -2.7 : G.giu ? -.6 : -.82 - (G.avviso ? G.k * .2 : 0),                       // in carica la corrente lo piega all'indietro
      curva: G.carica ? -.5 : G.giu ? 3.2 : 2.8 - (G.avviso ? G.k * .5 : 0),
      onda: G.carica ? .05 : .12, fase: t * 1.4, onde: .8 });
    P.palla(c, r0.x, r0.y + .02, .1, .07, 0, T.corpo, { ombra: .02 });                              // l'attacco dello stelo
    const p = P.suSpina(stelo, 1), ex = p.x + cos(p.ang) * .13, ey = p.y + sin(p.ang) * .13;
    const col = G.sconfitto ? null : G.carica ? ROSSO : G.avviso ? P.mescola(ORO, ROSSO, round(G.lampo * 6) / 6) : G.caccia ? ORO : ACQUA;
    const forza = G.stordito ? .28 + .12 * sin(t * 9) : G.avviso ? .65 + .35 * G.lampo : G.carica ? 1 : .8 + .1 * sin(t * 2.3);
    if (col) {
      P.bagliore(c, ex, ey, .95, col, forza * .3);                     // la luce che rischiara il muso
      P.bagliore(c, ex, ey, .5, col, forza);
    }
    P.palla(c, ex, ey, .15, .15, 0, col ? P.tinta(col) : T.spenta, { ombra: .03 });
    if (col) P.lucine(c, [ex + .03, ey - .03], .07, col, forza);
    P.riflesso(c, ex + .03, ey - .07, .11, -.3, .1);

    if (G.stordito) P.stelle(c, .35, -1.15, .5, t, 3, .11);
    c.restore();
  },
});
})();
