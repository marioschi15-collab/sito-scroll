/* Boccone — specie: PESCE LUPO (taglia 4, cacciatore). Lungo come un'anguilla grassa, azzurro acciaio a bande blu notte,
   con un testone da vecchio brontolone: fronte bombata, guance a pieghe e IL SUO SEGNO, i denti storti che
   sporgono anche a bocca chiusa (le zanne di sotto salgono sopra il labbro, come a un bulldog).
   Pinna dorsale continua dalla nuca alla coda (P.cresta), anale lunga, codina tonda, pettorale a ventaglio grande.
   A caccia spalanca la bocca-tagliola, drizza la cresta e inarca la schiena.
   RITOCCO PER LO STILE «FILM D'ANIMAZIONE»: l'azzurro acciaio ha l'ombra indaco dichiarata nelle tinte e le bande sono
   più decise (senza contorno scuro si impastava con l'acqua); il ventre celeste sfuma nel fianco e finisce in un filo di
   luce color acqua. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte: azzurro acciaio saturo (niente grigio: le ombre vanno al viola-notte), ventre celeste, pinne indaco orlate di chiaro
const T = { corpo: P.tinta('#6198ea', '#34239c'), mento: P.tinta('#a2c6f8', '#5a5ecc'), cresta: P.tinta('#4a66cc', '#2a1f8e'), pinna: P.tinta('#6a78ee', '#3a2ab0'), lontana: P.tinta('#3f55b0') };
const BANDA = P.alfa('#211a78', .64), VENTRE = '#c9f1ff', ACQUA = 'rgba(222,249,255,.6)', NEI = P.alfa(T.corpo.bordo, .5), ORLO = '#cfe6ff', ORLO_IRA = '#ffd9a0';
/* Testone massiccio (il punto più grosso è la nuca, a u = .86), corpo che si assottiglia fino alla codina. Il ventre si
   ritira da u = .76 in avanti: lì lavora la mandibola. */
const SU = P.sagoma([[0, .07], [.12, .14], [.35, .22], [.58, .3], [.75, .42], [.86, .5], [.94, .46], [1, .33]]);
const GIU = P.sagoma([[0, .07], [.12, .13], [.35, .2], [.58, .27], [.72, .33], [.79, .29], [.87, .2], [.95, .15], [1, .12]]);
const ONDA = { amp: .24, onde: 1.15, testa: .07, potenza: 1 };
/* Le bande: nove fasce larghe e irregolari, più larghe sul dorso, che non arrivano alla testa. */
const BANDE = [];
for (let i = 0; i < 9; i++) { const u0 = .04 + i * .078, w = .036 + .012 * ((i * 7) % 3), f = v => u0 + .01 * sin(v * 3 + i * 2.1) - .016 * v; BANDE.push([f, v => f(v) + w * (1 - .4 * v)]); }
const altDorso = k => .21 * Math.pow(sin(PI * k), .3), altDorsoIrta = k => altDorso(k) * 1.35, altAnale = k => .15 * Math.pow(sin(PI * k), .4);

B.specie.registra({
  id: 'pesce_lupo',
  descrizione: 'Con quei dentoni storti schiaccia ricci di mare, granchi e conchiglie come noccioline: gli si consumano tanto che ogni anno li cambia tutti. Nel sangue ha un antigelo naturale, per questo vive bene nell\'acqua gelata.',
  forma: { lx: 1.35, ly: .5 },
  ingombro: { x0: -2.24, y0: -.8, x1: 1.24, y1: .9 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(22, -1.78, .78, fase, ONDA, SU, GIU, { testa: .3, coda: .04, arco: m ? -.07 : 0 }), luce = [.4, -.6, 2.4];

    // ---- 1. dietro al corpo: codina tonda, cresta del dorso, anale, la bocca con i denti di sotto in fondo
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .04, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .3, tipo: 'ventaglio', lung: .34, alt: .22, radice: .07, fase: F - 1.9, tinta: T.cresta, orlo: m ? ORLO_IRA : ORLO, n: 6 });
    P.cresta(c, s, { u0: .03, u1: .8, lato: -1, alt: m ? altDorsoIrta : altDorso, onda: .14, fase: F * 2, onde: 3, piega: .5, passi: 12, tinta: T.cresta, orlo: m ? ORLO_IRA : ORLO, dentro: .25 });
    P.cresta(c, s, { u0: .03, u1: .6, lato: 1, alt: altAnale, onda: .14, fase: F * 2 + 2, onde: 2, piega: .5, passi: 8, tinta: T.cresta, orlo: m ? ORLO_IRA : ORLO, dentro: .25 });
    const ce = P.suSpina(s, .79, .72), apri = m ? max(b, .45) * .8 + .12 : .1 + b * .3;
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang - .1, lung: .56, apri, alt: .21, su: .3, tinta: T.mento, interno: '#8a1446', lingua: '#ff7d9c', ombra: .06 });
    const gx = ge.x1 - ge.x0, gy = ge.y1 - ge.y0;
    if (apri > .25) P.denti(c, ge.x0 + gx * .1, ge.y0 + gy * .1, ge.x0 + gx * .6, ge.y0 + gy * .6, 4, .11, 1, { tipo: 'punta', varia: .4, seme: 5 });

    // ---- 2. il corpo: ventre chiaro, bande blu notte, lentiggini sulla testa
    P.volume(c, s, T.corpo, { luce, ombra: .1, dentro(cc) {
      P.fianco(cc, s, u => .26 + .1 * sin(u * 13), 1.4, P.alfa(VENTRE, .4), 0, .8);                // il ventre: due passate, sfuma nel fianco
      P.fianco(cc, s, u => .54 + .1 * sin(u * 13), 1.4, P.alfa(VENTRE, .85), 0, .8);
      P.bande(cc, s, BANDE, BANDA, 5);
      P.fianco(cc, s, .84, 1.4, ACQUA, .02, .78);                                                  // filo di luce d'acqua lungo la pancia
      P.macchie(cc, s, { n: 9, seme: 6, u0: .76, u1: .99, v0: -.85, v1: .1, r0: .016, r1: .032, colore: NEI, lungo: 1 });
    } });
    const g0 = P.suSpina(s, .8, -.62), g1 = P.suSpina(s, .755, -.1), g2 = P.suSpina(s, .77, .42);                     // 3. sopra: opercolo, pieghe della guancia, riflesso
    P.solco(c, [g0.x, g0.y, g1.x, g1.y, g2.x, g2.y], T.corpo, .04);
    if (P.fine(o)) {
      const r0 = P.suSpina(s, .9, .02), r1 = P.suSpina(s, .86, .34), r2 = P.suSpina(s, .9, .62);
      P.solco(c, [r0.x, r0.y, r1.x, r1.y, r2.x, r2.y], T.corpo, .03);
      P.bozzi(c, P.puntiSuSpina(s, 4, .82, .93, u => -.8 + .1 * sin(u * 60)), .026, T.corpo);
    }
    P.suSpina(s, .8, -.7, q); P.riflesso(c, q.x, q.y, .36, q.ang - .05, .12);

    // ---- 4. sul fianco: la pettorale a ventaglio che rema
    const pp = P.suSpina(s, .68, .42), rema = sin(F * 2 + .4), dir = PI * .74 + rema * .28 - (m ? .25 : 0);
    P.ombra(c, pp.x - .14, pp.y + .08, .32, .2, -.3, .28);
    P.pinna(c, { x0: pp.x + .04, y0: pp.y - .11, x1: pp.x - .03, y1: pp.y + .12, a0: dir - .8, a1: dir + .8, lung: .6, profilo: [.7, .95, 1, .95, .7], n: 7, onda: .1, fase: F * 2, passo: .7, smerlo: .5,
      tinta: T.pinna, orlo: m ? ORLO_IRA : ORLO, primo: true });

    // ---- 5. la faccia: i denti storti di sopra, le zanne di sotto che salgono sopra il labbro, narice, occhio da brontolone
    const l0 = P.suSpina(s, .82, 1), l1 = P.suSpina(s, 1, 1), k = m ? 1.15 : 1;
    P.denti(c, l0.x, l0.y - .01, l1.x + .25, l1.y - .08, 6, .17 * k, -1, { tipo: 'punta', varia: .55, seme: 12, largo: .8 });
    P.denti(c, ge.x0 + gx * .58, ge.y0 + gy * .58, ge.x0 + gx * 1.02, ge.y0 + gy * 1.02, 3, .2 * k, 1, { tipo: 'punta', varia: .5, seme: 3, largo: .78 });
    const e = P.suSpina(s, .93, -.42);
    if (P.fine(o)) { const n = P.suSpina(s, 1, -.3); c.fillStyle = NEI; c.beginPath(); c.ellipse(n.x + .2, n.y + .04, .03, .022, .4, 0, TAU); c.fill(); }
    P.occhio(c, e.x, e.y, .18, Object.assign({ iride: m ? '#ff3a1e' : '#ffd43c', tipo: m ? 'fessura' : 'tondo', pelle: T.corpo, guarda: { x: .5, y: .2 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    P.sopracciglio(c, e.x + (m ? .04 : -.02), e.y - (m ? .19 : .24), m ? .46 : .38, e.ang + (m ? .5 : -.12), T.corpo.bordo, m ? .12 : .06);
    c.restore();
  },
});
})();
