/* Boccone — specie: PESCE ANGELO (taglia 3, cacciatore). ESEMPIO DI RIFERIMENTO per i pesci «normali» (vedi GUIDA-STILE.md):
   corpo su una spina che ondeggia, pinne a raggi, motivi dipinti dentro il volume, faccia calma e faccia a caccia.
   Niente squame: sulle righe farebbero confusione (si usano sui pesci a tinta unita, vedi P.squame).
   RITOCCO PER LO STILE «FILM D'ANIMAZIONE»: le vele blu sono piene fino in punta (velo: 1), con l'ombra indaco e la punta
   lilla più chiara, così non spariscono sull'acqua blu; il ventre crema sfuma nel fianco e tiene il suo colore caldo
   (il velo d'ombra viola lo ingrigiva: vedi luciBordo). */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola) e sagoma del corpo: alto e compresso, col muso che sporge
const T = { corpo: P.tinta('#ffc21a', '#f0641e'), blu: P.tinta('#2a5cf0', '#2318a8'), notte: P.tinta('#232a8a'), pinna: P.tinta('#4a5dfa', '#2a1fa8'), coda: P.tinta('#ffb01f', '#f0641e'),
  labbra: P.tinta('#ff6f8f'), ventre: P.tinta('#fff0c0', '#f6a04e'), pett: P.tinta('#ffd84a', '#ff7a1a') };
const SU = P.sagoma([[0, .13], [.1, .26], [.26, .7], [.45, .98], [.62, 1.02], [.8, .9], [.93, .66], [1, .44]]);
const GIU = P.sagoma([[0, .13], [.1, .26], [.26, .66], [.45, .9], [.62, .94], [.8, .8], [.93, .56], [1, .34]]);
const ONDA = { amp: .11, onde: .5, testa: .14 };
const arco = (u0, d) => v => u0 + d + .07 * (1 - v * v);              // righe incurvate verso il muso
/* Tre righe blu orlate di notte e d'azzurro, più la maschera scura sull'occhio: ogni lista è [[da, a], …] lungo il corpo. */
const RIGHE = { notte: [], blu: [], filo: [[arco(.8, 0), arco(.8, .014)], [arco(.8, .111), arco(.8, .125)]] };
for (const u0 of [.2, .39, .58]) { RIGHE.notte.push([arco(u0, -.014), arco(u0, .112)]); RIGHE.blu.push([arco(u0, 0), arco(u0, .098)]); RIGHE.filo.push([arco(u0, .012), arco(u0, .03)]); }
RIGHE.notte.push([arco(.8, .014), arco(.8, .111)]);
/* Le luci del bordo fatte in casa (il volume del corpo ha ombra: 0, perché il velo viola della cassetta ingrigiva il giallo,
   la crema e il bianco: qui ogni zona ha già la sua sfumatura, con l'ombra del suo colore). Un filo di luce lungo il dorso
   e il controluce color acqua lungo il ventre. Si chiama per ultima dentro `dentro`. */
const luciBordo = (cc, s) => { P.fianco(cc, s, -1.4, -.93, 'rgba(255,255,255,.28)', 0, 1, 8); P.fianco(cc, s, .9, 1.4, 'rgba(200,243,255,.42)', 0, 1, 8); };

B.specie.registra({
  id: 'pesce_angelo',
  descrizione: 'Elegante e vanitoso, sfila tra i coralli con i suoi lunghi nastri. Le righe servono a farsi riconoscere dai compagni… e a confondere chi vorrebbe mangiarlo.',
  forma: { lx: 1.0, ly: 1.0 },
  ingombro: { x0: -2.3, y0: -1.36, x1: 1.12, y1: 1.46 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.84, .66, o.fase || 0, ONDA, SU, GIU, { testa: .24 }), luce = [.3, -.5, 1.8];

    // ---- 1. dietro al corpo: coda, dorsale e anale (vele che finiscono in un nastro), ventrali
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .06, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .34, tipo: 'ventaglio', lung: .66, alt: .62, radice: .13, fase: F - 1.9, onda: .22, tinta: T.coda, orlo: '#3d6bff' });
    for (const v of [-1, 1]) {
      const a = P.suSpina(s, .7, v * .9), z = P.suSpina(s, .1, v * .8), alza = m ? .2 : 0;      // a caccia le vele si drizzano
      const vela = { x0: a.x, y0: a.y, x1: z.x, y1: z.y, a0: v * (PI / 2 + .5 - alza), a1: v * (PI - .3 - alza * .5), lung: v < 0 ? .98 : .86, profilo: [.34, .52, .68, .86, 1.04, .9], n: 9, piega: v * -.16,
        onda: .07, fase: F - 1, passo: .55, tinta: T.pinna, orlo: '#ffd23c', punta: '#a48aff', velo: 1 };
      /* Il nastro prosegue il raggio più lungo e si stende all'indietro. P.raggi dice dove finisce il raggio PRIMA di
         disegnare la vela: così il nastro si disegna sotto, e la vela ne copre la radice. */
      const g = P.raggi(vela), i = 7, dx = g.ex[i] - g.mx[i], dy = g.ey[i] - g.my[i], w = sin(F - 2.2) * .06;
      P.filo(c, [g.mx[i] + dx * .6, g.my[i] + dy * .6, g.ex[i] + dx * .2, g.ey[i] + dy * .2, g.ex[i] + dx * .5 - .22, g.ey[i] + dy * .4 + v * w, g.ex[i] + dx * .6 - .52, g.ey[i] + dy * .4 - v * (.08 + w)], .09, .022, T.coda, .04);
      P.pinna(c, vela);
    }
    const pv = P.suSpina(s, .7, .96);
    P.pinna(c, { x0: pv.x + .05, y0: pv.y - .05, x1: pv.x - .09, y1: pv.y - .05, a0: PI * .62 + sin(F - .5) * .1, a1: PI * .8 + sin(F - .5) * .1, lung: .62, profilo: [1, .55], n: 3, piega: .12, tinta: T.coda, orlo: '#3d6bff', righe: false });

    // ---- 2. il corpo, con ventre chiaro, righe blu orlate di notte e d'azzurro, maschera sull'occhio, squame
    P.volume(c, s, T.corpo, { luce, ombra: 0, dentro(cc) {
      P.fianco(cc, s, u => .3 - .2 * sin(u * PI), 1.4, P.alfa(T.ventre.base, .5), 0, 1, 8);         // il ventre: due passate, sfuma nel fianco
      P.fianco(cc, s, u => .52 - .2 * sin(u * PI), 1.4, P.sfumatura(cc, T.ventre, [.3, .2, 1.6]));
      P.bande(cc, s, RIGHE.notte, T.notte.base);                     // tutte le bande dello stesso colore in un colpo solo
      P.bande(cc, s, RIGHE.blu, P.sfumatura(cc, T.blu, luce));
      P.bande(cc, s, RIGHE.filo, '#86e4ff', 4);
      luciBordo(cc, s);
    } });
    const g1 = P.suSpina(s, .76, -.5), g2 = P.suSpina(s, .715, 0), g3 = P.suSpina(s, .76, .55);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                                // opercolo
    P.riflesso(c, .2, -.72, .46, -.2, .14);

    // ---- 3. sul fianco: la pettorale che rema, con la sua ombra
    const pp = P.suSpina(s, .66, .22), rema = sin(F * 2 + .4), ap = PI * .9 + rema * .35;
    P.ombra(c, pp.x - .16, pp.y + .06, .3, .2, -.3, .25);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .1, x1: pp.x - .02, y1: pp.y + .1, a0: ap - .42 - rema * .1, a1: ap + .5 + rema * .1, lung: .5, profilo: [.7, 1, 1, .8, .55], n: 5, onda: .1, fase: F * 2, passo: .7, tinta: T.pett, orlo: '#ff9d2a', primo: true });

    // ---- 4. la faccia. Calmo: occhio tondo ambrato, boccuccia chiusa. A caccia: occhio rosso tagliato, sopracciglio, denti
    const e = P.suSpina(s, .9, -.3);
    P.occhio(c, e.x, e.y, .21, Object.assign({ iride: m ? '#ff3a1e' : '#ff9d1c', pelle: T.notte, guarda: { x: .5, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .2, .42, .5, T.notte.bordo, .11);
    const l = P.suSpina(s, 1, .25);
    P.labbra(c, l.x + .24, l.y + .02, l.ang + .1, m ? .15 : .13, m ? max(b, .45) : b * .5, T.labbra, { denti: m ? 3 : 0 });
    c.restore();
  },
});
})();
