/* Boccone — specie: PESCE PAPPAGALLO (taglia 2, cacciatore). Robusto, fronte ripida, becco da pappagallo (il tratto
   esagerato), squame grandi turchesi orlate di rosa, coda a mezzaluna. Il becco si disegna PRIMA del corpo, che ne copre
   la radice come la testa di un uccello; le squame sono una funzione locale (P.squame non fa l'orlo colorato). */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max } = Math;

// ---- tinte (una volta sola) e sagoma: corpo pieno, testa grossa dalla fronte ripida
const T = { corpo: P.tinta('#1cc4b6'), ventre: P.tinta('#c4f7d4', '#3fb8a8'), pinna: P.tinta('#ff6aa6', '#d21f7c'), pett: P.tinta('#ffd84a', '#ff7a1a'), becco: P.tinta('#fff3cf', '#e8925c') };
const ROSA = '#ff5fa2', ORLO = '#49dcff';
const SU = P.sagoma([[0, .14], [.12, .32], [.35, .6], [.6, .72], [.8, .7], [.93, .58], [1, .42]]);
const GIU = P.sagoma([[0, .14], [.12, .3], [.35, .54], [.6, .62], [.8, .6], [.93, .5], [1, .4]]);
const ONDA = { amp: .1, onde: .5, testa: .14 };
/* Squame grandi a tegola orlate di rosa: quattro file sfalsate di archi aperti verso il muso, in due colpi (orlo rosa e,
   subito dentro, un filo di luce). Costano poco: due tratti in tutto. */
const squame = (c, s) => {
  const q = {};
  for (let passata = 0; passata < 2; passata++) {
    const k = passata ? .7 : 1;
    c.beginPath();
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) {
      const u = .15 + (i + (r % 2) * .5) * .105, R = .1 * (SU(u) + GIU(u)) * k;
      P.suSpina(s, u, -.66 + r * .36, q); const a = q.ang + PI;
      c.moveTo(q.x + cos(a - 1.15) * R, q.y + sin(a - 1.15) * R); c.arc(q.x, q.y, R, a - 1.15, a + 1.15);
    }
    c.lineCap = 'round'; c.strokeStyle = passata ? P.alfa(T.corpo.luce, .55) : ROSA; c.lineWidth = passata ? .018 : .034; c.stroke();
  }
};
/* Il becco: due piastre color avorio (le sagome sono nelle misure del muso: origine alla cerniera, x in avanti). Quella
   di sopra finisce a uncino e copre la punta di quella di sotto, che si abbassa quando la bocca si apre. */
const BECCO_SU = [0, -.28, .22, -.3, .44, -.2, .56, -.03, .575, .14, .5, .25, .43, .12, .28, .07, 0, .08];
const BECCO_GIU = [0, .08, .3, .09, .42, .12, .47, .07, .46, .2, .36, .29, .2, .31, 0, .28];
const piastra = (c, p, t, colore) => {
  P.profilo(c, p); c.lineJoin = 'round'; c.strokeStyle = t.bordo; c.lineWidth = P.BORDO * 1.8; c.stroke(); c.fillStyle = colore; c.fill();
};
const becco = (c, x, y, ang, apri, t, fine) => {
  c.save(); c.translate(x, y); c.rotate(ang);
  const g = c.createLinearGradient(0, -.3, .1, .36); g.addColorStop(0, t.luce); g.addColorStop(.45, t.base); g.addColorStop(1, t.ombra);
  if (apri > .03) {                                                 // la gola, fra le due piastre
    const a = apri * .8;
    c.beginPath(); c.moveTo(-.1, .08); c.lineTo(.46, .06); c.lineTo(.46 * cos(a), .08 + .46 * sin(a)); c.closePath(); c.fillStyle = '#7d1037'; c.fill();
  }
  c.save(); c.translate(0, .08); c.rotate(apri * .8); c.translate(0, -.08); piastra(c, BECCO_GIU, t, g); c.restore();
  c.rotate(-apri * .12); piastra(c, BECCO_SU, t, g);
  if (fine) {                                                       // le giunture dei denti saldati e un riflesso
    c.beginPath(); c.moveTo(.3, -.2); c.quadraticCurveTo(.36, -.04, .33, .08); c.moveTo(.44, -.12); c.quadraticCurveTo(.48, 0, .47, .13);
    c.lineCap = 'round'; c.strokeStyle = P.alfa(t.scura, .5); c.lineWidth = .022; c.stroke();
  }
  c.beginPath(); c.ellipse(.36, -.17, .1, .03, .45, 0, TAU); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill();
  c.restore();
};

B.specie.registra({
  id: 'pesce_pappagallo',
  descrizione: 'Con il becco durissimo rosicchia il corallo per mangiare le alghe che ci crescono sopra, e quello che avanza lo restituisce in sabbia finissima: molte spiagge bianche dei tropici sono in buona parte opera sua.',
  forma: { lx: 1.05, ly: .7 },
  ingombro: { x0: -1.83, y0: -1.08, x1: 1.52, y1: 1.02 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.95, .74, fase, ONDA, SU, GIU, { testa: .22 }), luce = [.3, -.5, 1.8], alza = m ? .25 : 0;

    // ---- 1. dietro al corpo: coda a mezzaluna, dorsale lunga, anale, ventrale, e il becco
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .06, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .34, tipo: 'luna', lung: .62, alt: .64, radice: .13, fase: F - 1.9, onda: .18, tinta: T.pinna, orlo: ORLO });
    const d0 = P.suSpina(s, .74, -.92), d1 = P.suSpina(s, .1, -.85), a0 = P.suSpina(s, .44, .9), a1 = P.suSpina(s, .1, .85);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -(PI / 2 + .45 - alza), a1: -(PI - .5 - alza * .5), lung: m ? .44 : .36, profilo: [.7, .9, 1, 1, .95, .8], n: 10, smerlo: .3,
      onda: .07, fase: F * 2, passo: .5, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: PI / 2 + .6, a1: PI - .45, lung: .32, profilo: [.75, 1, .95, .8], n: 6, smerlo: .3, onda: .07, fase: F * 2 - 1, passo: .5, tinta: T.pinna, orlo: ORLO });
    const pv = P.suSpina(s, .62, .95);
    P.pinna(c, { x0: pv.x + .06, y0: pv.y - .05, x1: pv.x - .1, y1: pv.y - .05, a0: PI * .58 + sin(F - .5) * .1, a1: PI * .8 + sin(F - .5) * .1, lung: .4, profilo: [1, .6], n: 3, piega: .12, tinta: T.pinna, righe: false });
    const n = P.suSpina(s, 1, 0), apri = m ? max(b, .45) : b * .45;
    becco(c, n.x + .1, n.y + .04, n.ang, apri, T.becco, P.fine(o));

    // ---- 2. il corpo: ventre chiaro, muso e guancia rosa, squame orlate di rosa
    P.volume(c, s, T.corpo, { luce, dentro(cc) {
      P.fianco(cc, s, u => .5 - .15 * sin(u * PI), 1.4, T.ventre.base);
      P.banda(cc, s, v => .95 - .04 * v, 1.4, ROSA, 4);
      P.fianco(cc, s, -.02, .12, ROSA, .68, 1, 5);
      if (P.fine(o)) squame(cc, s);
    } });
    const g1 = P.suSpina(s, .76, -.5), g2 = P.suSpina(s, .71, 0), g3 = P.suSpina(s, .76, .55);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                                // opercolo
    P.riflesso(c, .28, -.5, .42, -.15, .13);

    // ---- 3. sul fianco: la pettorale gialla che rema, con la sua ombra
    const pp = P.suSpina(s, .66, .25), rema = sin(F * 2 + .4), ap = PI * .92 + rema * .45;   // il pappagallo nuota «volando» con le pettorali
    P.ombra(c, pp.x - .14, pp.y + .05, .26, .17, -.3, .25);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .1, x1: pp.x - .02, y1: pp.y + .1, a0: ap + .3 + rema * .15, a1: ap - .6 - rema * .1, lung: .5, profilo: [1, .95, .78, .55, .34], n: 5, onda: .1, fase: F * 2, passo: .7, tinta: T.pett, orlo: '#ff9d2a', primo: true });

    // ---- 4. la faccia. Calmo: occhio ambrato. A caccia: occhio rosso tagliato e sopracciglio (il becco aperto è già disegnato)
    const e = P.suSpina(s, .88, -.38);
    P.occhio(c, e.x, e.y, .22, Object.assign({ iride: m ? '#ff3a1e' : '#ffa51c', pelle: T.corpo, guarda: { x: .5, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .21, .46, .5, T.corpo.bordo, .12);
    c.restore();
  },
});
})();
