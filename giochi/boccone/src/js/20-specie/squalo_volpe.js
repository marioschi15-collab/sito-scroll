/* Boccone — specie: SQUALO VOLPE (taglia 5, scattante). Squalo tozzo blu-violetto dal ventre bianco, muso corto, occhioni
   tondi da cucciolo e IL SUO SEGNO: il lobo di sopra della coda lungo quanto il corpo, a falce. La coda non è una lama
   rigida ma un nastro su una spina (P.spinaAngoli), così frusta l'acqua come quella vera.
   A caccia la arma sopra la schiena come uno scorpione (è così che stordisce le prede), inarca il dorso, abbassa le
   pettorali, drizza la dorsale e mostra i denti.
   RITOCCO PER LO STILE «FILM D'ANIMAZIONE»: il blu-violetto ha l'ombra indaco dichiarata nelle tinte (corpo, pinne, falce),
   così senza contorno scuro stacca dall'acqua; il controluce è più largo. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos } = Math;

// ---- tinte: blu-violetto saturo (le ombre le fa il viola-notte), ventre bianco con l'ombra azzurra, pinne un tono più scure
const T = { corpo: P.tinta('#6f63e6', '#2c1c98'), pinna: P.tinta('#5f52d2', '#28198c'), lontana: P.tinta('#4a3fae', '#201670'), ventre: P.tinta('#f6f8ff', '#8fb2ea') };
T.mento = Object.assign({}, P.tinta('#f2f5ff', '#8fb2ea'), { bordo: T.corpo.bordo });       // il mento ha il bordo scuro del corpo
const VENTRE = T.ventre.base, DORSO = P.alfa(T.corpo.bordo, .22), LAMA = P.alfa('#d9d4ff', .5), NEI = P.alfa(T.corpo.bordo, .55), PUNTA = '#3d3296';
/* Un siluro tozzo: muso corto a cono che sporge sopra la bocca (il ventre si ritira da u = .8), peduncolo robusto. */
const SU = P.sagoma([[0, .1], [.1, .17], [.3, .34], [.5, .44], [.68, .46], [.82, .42], [.92, .31], [1, .16]]);
const GIU = P.sagoma([[0, .1], [.1, .15], [.3, .3], [.5, .4], [.66, .41], [.78, .36], [.84, .25], [.92, .18], [1, .1]]);
const ONDA = { amp: .12, onde: .6, testa: .12, potenza: 1.7 };
/* La falce: larga all'attacco, sottile in punta. */
const FALCE = P.sagoma([[0, .2], [.1, .175], [.4, .135], [.75, .09], [1, .04]]);
const NF = 14, LF = 1.95;                                                // tratti e lunghezza della falce

B.specie.registra({
  id: 'squalo_volpe',
  descrizione: 'La sua coda è lunga quanto tutto il resto del corpo. La usa come una frusta: una sferzata in mezzo a un banco di pesciolini e li stordisce, poi torna indietro a mangiarli.',
  forma: { lx: 1.25, ly: .48 },
  ingombro: { x0: -2.92, y0: -2.06, x1: 1.42, y1: 1.14 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(16, -1.02, 1.06, fase, ONDA, SU, GIU, { testa: .23, coda: .03, arco: m ? -.07 : 0 }), luce = [.45, -.55, 2.2];

    // ---- 1. dietro al corpo: pettorale lontana, la falce e il lobo di sotto, seconda dorsale, anale, ventrale, dorsale, la bocca
    const rema = sin(F * 2 + .4), giu = m ? .14 : 0;
    const f0 = P.suSpina(s, .7, .7), f1 = P.suSpina(s, .53, .78);
    P.lama(c, { x0: f0.x, y0: f0.y, x1: f1.x, y1: f1.y, px: f1.x - .26 + giu, py: f1.y + .58 + giu - rema * .03, tinta: T.lontana, davanti: .14, dietro: .28 });
    P.suSpina(s, 0, 0, q);
    const frusta = sin(F - 1.1) * .22, rx = q.x + .1, ry = q.y - .02;
    const coda = P.spinaAngoli(NF, rx, ry, LF, m
      ? u => PI + 1.0 + u * u + frusta * .5 + .16 * u * sin(F * 2 - 1 - u * 2.6)        // armata sopra la schiena, e vibra
      : u => PI + .78 - .82 * u + frusta * (.45 + .55 * u) + .2 * u * sin(F - 1.7 - u * 2.4),  // distesa all'indietro, e ondeggia in ritardo
      FALCE, { testa: .04 });
    const lobo = q.ang + frusta * .6;
    P.lama(c, { x0: q.x + .14 * cos(lobo) - .09 * sin(lobo), y0: q.y + .14 * sin(lobo) + .09 * cos(lobo), x1: q.x - .16 * cos(lobo), y1: q.y - .16 * sin(lobo),
      px: q.x - .42 * cos(lobo) - .44 * sin(lobo), py: q.y - .42 * sin(lobo) + .44 * cos(lobo), tinta: T.pinna, davanti: .1, dietro: .26 });
    P.suSpina(coda, .86, -.8, q); P.corno(c, q.x, q.y, q.ang - PI / 2 + .75, .17, .15, T.pinna, { lume: false });      // la bandierina vicino alla punta
    const pt = P.suSpina(coda, 1, 0), tg = c.createLinearGradient(rx, ry, pt.x, pt.y);
    tg.addColorStop(0, T.pinna.scura); tg.addColorStop(.22, T.pinna.base); tg.addColorStop(.8, T.pinna.chiara); tg.addColorStop(1, PUNTA);
    P.volume(c, coda, T.pinna, { colore: tg, ombra: .035, lume: .05 });
    if (P.fine(o)) P.solco(c, P.puntiSuSpina(coda, 6, .1, .82, .25), T.pinna, .028);        // la nervatura della falce
    const s0 = P.suSpina(s, .2, -.8), s1 = P.suSpina(s, .11, -.8);
    P.lama(c, { x0: s0.x, y0: s0.y, x1: s1.x, y1: s1.y, px: s1.x - .1, py: s1.y - .16, tinta: T.pinna });
    const n0 = P.suSpina(s, .19, .8), n1 = P.suSpina(s, .1, .8);
    P.lama(c, { x0: n0.x, y0: n0.y, x1: n1.x, y1: n1.y, px: n1.x - .1, py: n1.y + .15, tinta: T.lontana });
    const v0 = P.suSpina(s, .4, .85), v1 = P.suSpina(s, .27, .85);
    P.lama(c, { x0: v0.x, y0: v0.y, x1: v1.x, y1: v1.y, px: v1.x - .14, py: v1.y + .32, tinta: T.pinna });
    const d0 = P.suSpina(s, .6, -.85), d1 = P.suSpina(s, .4, -.85);
    P.lama(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, px: d1.x - .12 + (m ? .1 : 0) + sin(F - .6) * .03, py: d1.y - .58 - (m ? .07 : 0), tinta: T.pinna, davanti: .16, dietro: .24 });
    const ce = P.suSpina(s, .8, .5), apri = m ? .46 + b * .3 : b * .25;
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang + .04, lung: .34, apri, alt: .12, su: .25, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c' });
    if (apri > .1) P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .15, ge.y0 + (ge.y1 - ge.y0) * .15, ge.x1, ge.y1, 5, .085, 1, { tipo: 'punta', varia: .2 });

    // ---- 2. il corpo: dorso più scuro, ventre bianco che risale sopra la pettorale, il lampo chiaro sul fianco
    P.volume(c, s, T.corpo, { luce, ombra: .12, dentro(cc) {
      P.fianco(cc, s, -1.4, -.5, DORSO);
      P.fianco(cc, s, u => .14 + .08 * sin(u * 7 + 1) - .34 * Math.exp(-((u - .6) / .09) * ((u - .6) / .09)), 1.4, VENTRE);
      P.fianco(cc, s, u => -.02 - .3 * sin((u - .1) / .42 * PI), u => .06, LAMA, .1, .52);
      P.macchie(cc, s, { n: 9, seme: 4, u0: .1, u1: .8, v0: -.88, v1: -.35, r0: .018, r1: .036, colore: DORSO, lungo: 1.2 });
    } });
    P.anelli(c, s, .77, .69, 5, T.corpo, { v0: -.4, v1: .26, curva: .012, spess: .03 });
    P.suSpina(s, .72, -.64, q); P.riflesso(c, q.x, q.y, .38, q.ang - .04, .1);

    // ---- 3. sul fianco: la pettorale lunga a falce (a caccia si abbassa)
    const p0 = P.suSpina(s, .68, .38), p1 = P.suSpina(s, .47, .58);
    P.ombra(c, p1.x + .05, p1.y + .14, .38, .16, .45, .28);
    P.lama(c, { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, px: p1.x - .44 + giu * 2.2, py: p1.y + .68 + giu + rema * .04, tinta: T.pinna, luce: [p0.x - .1, p0.y - .1, 1.25], davanti: .14, dietro: .28 });

    // ---- 4. la faccia: denti di sopra, narice, lentiggini del muso, occhione
    if (apri > .1) { const u0 = P.suSpina(s, .84, 1), u1 = P.suSpina(s, .95, 1); P.denti(c, u0.x, u0.y - .01, u1.x, u1.y - .01, 5, .085, -1, { tipo: 'punta', varia: .2, seme: 7 }); }
    if (P.fine(o)) {
      const n = P.suSpina(s, 1, .5);
      c.fillStyle = NEI; c.beginPath(); c.ellipse(n.x + .09, n.y - .01, .032, .02, -.4, 0, TAU);
      for (let i = 0; i < 5; i++) { P.suSpina(s, .975 + i * .006, -.55 + i * .26, q); c.moveTo(q.x + .12 + (i % 2) * .05, q.y); c.arc(q.x + .1 + (i % 2) * .05, q.y, .013, 0, TAU); }
      c.fill();
    }
    const e = P.suSpina(s, .865, -.2);
    P.occhio(c, e.x, e.y, .2, Object.assign({ iride: m ? '#ff3a1e' : '#3fe6c4', tipo: m ? 'fessura' : 'tondo', pelle: T.corpo, guarda: { x: .5, y: .15 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .04, e.y - .19, .46, e.ang + .45, T.corpo.bordo, .12);
    c.restore();
  },
});
})();
