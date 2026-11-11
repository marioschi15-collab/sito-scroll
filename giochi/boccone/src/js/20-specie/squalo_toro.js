/* Boccone — specie: SQUALO TORO (taglia 5, pattuglia). Uno squalo massiccio e gobbo color cacao, col ventre crema e le
   macchie color ruggine sui fianchi. I suoi segni: il muso a punta un po' all'insù, le due pinne del dorso quasi uguali
   e piantate indietro, la coda col lobo di sopra lunghissimo, e soprattutto i denti lunghi e storti che gli spuntano
   dalla bocca anche quando è tranquillo. Tutte le pinne sono lame piene (P.lama); la bocca sta sotto il muso (P.fauci).
   A caccia ingobbisce la schiena, abbassa le pettorali, spalanca la bocca e gli si arrossano le branchie. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max } = Math;

// ---- tinte: cacao caldo con ombre prugna (niente grigio), ventre crema, macchie color ruggine
const T = { corpo: P.tinta('#c68c68', '#4a2860'), pinna: P.tinta('#b67e60', '#44265a'), lontana: P.tinta('#8f6252', '#3a2052'), ventre: P.tinta('#fff1dc', '#e39a6c') };
T.mento = Object.assign({}, P.tinta('#ffeed6', '#dc8f62'), { bordo: T.corpo.bordo });      // il mento ha il bordo scuro del corpo
const VENTRE = T.ventre.base, DORSO = P.alfa('#5e2f52', .26), RUGGINE = P.alfa('#b23a1a', .78), NEI = P.alfa(T.corpo.bordo, .6), LAMA = P.alfa('#ffe6cf', .4);
/* Un barile: la schiena fa la gobba prima della dorsale, il muso scende a punta col sotto piatto (il ventre si ritira
   da u = .72 per far posto alla bocca), il peduncolo è robusto. */
const SU = P.sagoma([[0, .1], [.1, .17], [.3, .38], [.5, .52], [.64, .54], [.78, .46], [.9, .31], [1, .15]]);
const GIU = P.sagoma([[0, .1], [.1, .16], [.3, .34], [.5, .46], [.64, .46], [.72, .42], [.79, .27], [.88, .16], [1, .03]]);
const ONDA = { amp: .11, onde: .6, testa: .12, potenza: 1.7 };
const PANCIA = u => .16 + .1 * sin(u * 7 + 1) + max(0, u - .9) * 13;      // l'orlo del ventre chiaro: verso il muso si chiude a punta

B.specie.registra({
  id: 'squalo_toro',
  descrizione: 'Ha i denti in mostra anche a bocca chiusa, ma è più pigro di quanto sembri. Per restare sospeso a mezz\'acqua senza fatica sale in superficie e manda giù una boccata d\'aria.',
  forma: { lx: 1.3, ly: .52 },
  ingombro: { x0: -2.42, y0: -1.06, x1: 1.31, y1: .98 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(16, -1.25, 1.08, fase, ONDA, SU, GIU, { testa: .1, coda: .03, arco: m ? -.09 : -.03 }), luce = [.45, -.6, 2.3];

    // ---- 1. dietro al corpo: pettorale lontana, coda a due lame, seconda dorsale, anale, ventrale, prima dorsale, la bocca
    const rema = sin(F * 2 + .4), giu = m ? .14 : 0;
    const f0 = P.suSpina(s, .66, .72), f1 = P.suSpina(s, .55, .78);
    P.lama(c, { x0: f0.x, y0: f0.y, x1: f1.x, y1: f1.y, px: f1.x - .13 + giu, py: f1.y + .3 + giu - rema * .03, tinta: T.lontana, tondo: .22 });
    P.suSpina(s, 0, 0, q);
    const ac = q.ang + sin(F - 1.1) * .3, cx = cos(ac), cy = sin(ac);                  // la coda sbatte in ritardo sul corpo
    const X = (a, d) => q.x + cx * a - cy * d, Y = (a, d) => q.y + cy * a + cx * d;    // a = lungo la coda (indietro se negativo), d = di traverso (su se negativo)
    P.lama(c, { x0: X(.2, .09), y0: Y(.2, .09), x1: X(-.24, -.03), y1: Y(-.24, -.03), px: X(-.44, .46), py: Y(-.44, .46), tinta: T.lontana, davanti: .1, dietro: .2, tondo: .2 });
    P.lama(c, { x0: X(.28, -.1), y0: Y(.28, -.1), x1: X(-.2, .11), y1: Y(-.2, .11), px: X(-1.04, -.68), py: Y(-1.04, -.68), tinta: T.pinna, davanti: .12, dietro: .2, tondo: .2 });
    const s0 = P.suSpina(s, .27, -.82), s1 = P.suSpina(s, .13, -.8);
    P.lama(c, { x0: s0.x, y0: s0.y, x1: s1.x, y1: s1.y, px: s1.x - .1 + sin(F - 1.4) * .03, py: s1.y - .42, tinta: T.pinna, tondo: .26, dietro: .16 });
    const n0 = P.suSpina(s, .24, .82), n1 = P.suSpina(s, .12, .8);
    P.lama(c, { x0: n0.x, y0: n0.y, x1: n1.x, y1: n1.y, px: n1.x - .12, py: n1.y + .32, tinta: T.lontana, tondo: .24, dietro: .16 });
    const v0 = P.suSpina(s, .41, .86), v1 = P.suSpina(s, .31, .86);
    P.lama(c, { x0: v0.x, y0: v0.y, x1: v1.x, y1: v1.y, px: v1.x - .1, py: v1.y + .24, tinta: T.pinna, tondo: .24, dietro: .16 });
    const d0 = P.suSpina(s, .51, -.9), d1 = P.suSpina(s, .35, -.86);
    P.lama(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, px: d1.x - .1 + (m ? .09 : 0) + sin(F - .6) * .03, py: d1.y - .48 - (m ? .06 : 0), tinta: T.pinna, davanti: .16, dietro: .2, tondo: .26 });
    const ce = P.suSpina(s, .73, .5), apri = m ? .58 + b * .3 : .15 + b * .25, zanne = m ? .17 : .12;
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang - .1, lung: .54, apri, alt: .19, su: .3, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c' });
    P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .2, ge.y0 + (ge.y1 - ge.y0) * .2, ge.x1, ge.y1, 7, zanne, 1, { tipo: 'ago', varia: .55, largo: .8, seme: 4 });

    // ---- 2. il corpo: dorso più scuro, ventre chiaro, macchie di ruggine; sopra le branchie (rosse a caccia) e il riflesso
    P.volume(c, s, T.corpo, { luce, ombra: .1, dentro(cc) {
      P.fianco(cc, s, -1.4, u => -.5 + .08 * sin(u * 9), DORSO);
      P.fianco(cc, s, PANCIA, 1.5, VENTRE);
      P.fianco(cc, s, u => .06 - .26 * sin((u - .14) / .5 * PI), u => .14, LAMA, .14, .64);
      P.macchie(cc, s, { n: 10, seme: 6, u0: .06, u1: .78, v0: -.7, v1: .16, r0: .035, r1: .08, colore: RUGGINE, lungo: 1.5 });
      P.macchie(cc, s, { n: 10, seme: 11, u0: .04, u1: .84, v0: -.86, v1: .1, r0: .014, r1: .03, colore: RUGGINE, lungo: 1.3 });
      P.macchie(cc, s, { n: 9, seme: 2, u0: .1, u1: .9, v0: -.9, v1: -.3, r0: .012, r1: .024, colore: NEI, lungo: 1.2 });
    } });
    if (m) { P.suSpina(s, .68, -.05, q); P.guancia(c, q.x, q.y, .3, '#ff3a2a', .42); }
    P.anelli(c, s, .715, .64, 5, T.corpo, { v0: -.3, v1: .22, curva: .01, spess: .03 });
    P.suSpina(s, .73, -.66, q); P.riflesso(c, q.x, q.y, .4, q.ang - .04, .1);

    // ---- 3. sul fianco: la pettorale larga (a caccia si abbassa)
    const p0 = P.suSpina(s, .65, .44), p1 = P.suSpina(s, .49, .58);
    P.ombra(c, p1.x + .05, p1.y + .14, .38, .16, .45, .3);
    P.lama(c, { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, px: p1.x - .3 + giu * 2.2, py: p1.y + .5 + giu + rema * .04, tinta: T.pinna, luce: [p0.x - .1, p0.y - .1, 1.1], davanti: .16, dietro: .2, tondo: .24 });

    // ---- 4. la faccia: i denti di sopra, lunghi e storti, sempre in vista; narice, lentiggini del muso, occhio
    const u0 = P.suSpina(s, .805, 1), u1 = P.suSpina(s, .955, 1);
    P.denti(c, u0.x, u0.y - .015, u1.x, u1.y - .015, 7, zanne, -1, { tipo: 'ago', varia: .55, largo: .8, seme: 7 });
    if (P.fine(o)) {
      const n = P.suSpina(s, 1, .2);
      c.fillStyle = NEI; c.beginPath(); c.ellipse(n.x + .03, n.y + .02, .036, .02, -.3, 0, TAU);
      for (let i = 0; i < 5; i++) { P.suSpina(s, .965 + i * .008, -.6 + i * .2, q); c.moveTo(q.x + .05 + (i % 2) * .05, q.y); c.arc(q.x + .03 + (i % 2) * .05, q.y, .014, 0, TAU); }
      c.fill();
    }
    const e = P.suSpina(s, .87, -.3);
    P.occhio(c, e.x, e.y, .17, Object.assign({ iride: m ? '#ff3a1e' : '#d9f07a', tipo: m ? 'fessura' : 'tondo', pelle: T.corpo, guarda: { x: .5, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    if (m) P.sopracciglio(c, e.x + .03, e.y - .18, .46, e.ang + .45, T.corpo.bordo, .13);
    c.restore();
  },
});
})();
