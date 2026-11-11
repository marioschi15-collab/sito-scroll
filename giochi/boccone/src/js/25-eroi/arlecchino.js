/* Boccone — eroe: ARLECCHINO, il pesce mandarino. Testone da ranocchio con due occhi rossi sporgenti in cima (quello lontano
   fa capolino dietro), boccuccia a cuore, corpo arancio a onde blu dal cuore verde, pinne blu a ventaglio orlate d'arancio:
   due ventagli sotto la pancia su cui «cammina», la coda tonda e la vela sul dorso.
   Tre stadi: cucciolo tutto testa senza vela, adulto con la vela, colosso con la vela alta col pennacchio e i ventagli a festoni.
   Quattro espressioni: di gioia drizza la vela e canta, di paura la chiude e gli occhi schizzano fuori, colpito la affloscia. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max, min } = Math;

// ---- tinte e misure dei tre stadi: tutto ciò che cambia crescendo sta qui, il disegno è uno solo
const ARANCIO = c => P.tinta(c, '#e22a1e'), BLU = c => P.tinta(c, '#3a1fb8');
const VERDE = P.tinta('#35d484'), VERDE_LONTANO = P.tinta('#1fae7c'), LABBRO = P.tinta('#ff5f93'), VENTRE = '#ffd45e', CUORE = '#58ec9a', IRIDE = '#ff4a30';
const ORO = P.tinta('#ffc83a', '#ff6a14'), VERDE_LUME = P.alfa(VERDE.luce, .85);
/* Una banda a onde di traverso al corpo: u = dove sta, larg = mezza larghezza, pend = pendenza, amp e ph = l'onda. */
const banda = (u, larg, pend, amp, ph) => [v => u - larg + pend * v + amp * sin(v * 3.2 + ph), v => u + larg + pend * v + amp * sin(v * 3.2 + ph + .6)];
const bande = (lista, k) => lista.map(m => banda(m[0], m[1] * k, m[2], m[3], m[4]));
const ONDE0 = [[.2, .06, -.05, .04, 0], [.47, .065, -.03, .045, 2]];
const ONDE1 = [[.13, .045, -.05, .03, 0], [.31, .05, -.05, .04, 1.7], [.5, .052, -.03, .045, 3.1], [.69, .05, .02, .05, 4.4]];
const ONDE2 = [[.11, .04, -.05, .03, 0], [.26, .045, -.05, .035, 1.7], [.41, .048, -.04, .04, 3.1], [.56, .048, -.02, .045, 4.4], [.71, .046, .02, .05, 5.6]];
const STADI = [
  { x0: -.6, x1: .52, testa: .42, onda: { amp: .09, onde: .45, testa: .14 }, corpo: ARANCIO('#ffa436'), pinna: BLU('#4a9dff'), orlo: '#ffb43a', blu: '#2f7dff', bluBordo: '#1c2f9e',
    su: P.sagoma([[0, .13], [.35, .5], [.7, .72], [1, .6]]), giu: P.sagoma([[0, .12], [.35, .44], [.7, .6], [1, .5]]),
    bande: bande(ONDE0, 1), cuori: bande(ONDE0, .36), occhio: .3, eu: .78, ev: -.84, lontano: .43, bocca: .17,
    coda: .46, pin: .36, vela: 0, ventaglio: .4, smerlo: 0, ru: .42 },
  { x0: -.9, x1: .6, testa: .38, onda: { amp: .11, onde: .5, testa: .12 }, corpo: ARANCIO('#ff8f24'), pinna: BLU('#2f7dff'), orlo: '#ffa02a', blu: '#1f6dff', bluBordo: '#1a2a98',
    su: P.sagoma([[0, .13], [.3, .42], [.6, .64], [.82, .7], [1, .56]]), giu: P.sagoma([[0, .11], [.3, .36], [.6, .52], [.82, .55], [1, .46]]),
    bande: bande(ONDE1, 1), cuori: bande(ONDE1, .36), occhio: .27, eu: .81, ev: -.82, lontano: .43, bocca: .18,
    coda: .6, pin: .46, vela: .72, ventaglio: .56, smerlo: .25, ru: .5 },
  { x0: -.95, x1: .64, testa: .38, onda: { amp: .11, onde: .5, testa: .12 }, corpo: ARANCIO('#ff7a1c'), pinna: BLU('#2462f2'), orlo: '#ff8a1e', blu: '#1a58f0', bluBordo: '#181f86',
    su: P.sagoma([[0, .15], [.3, .48], [.6, .7], [.82, .77], [1, .6]]), giu: P.sagoma([[0, .13], [.3, .42], [.6, .58], [.82, .6], [1, .48]]),
    bande: bande(ONDE2, 1), cuori: bande(ONDE2, .36), occhio: .26, eu: .82, ev: -.82, lontano: .43, bocca: .2,
    coda: .7, pin: .54, vela: .9, ventaglio: .72, smerlo: .6, ru: .5 },
];
for (const K of STADI) K.pinnaLontana = P.tinta(K.pinna.ombra, '#2a148f');

B.eroi.registra({
  id: 'arlecchino',
  descrizione: 'Un pesce mandarino, il più colorato della barriera: sembra dipinto a mano. Non ha squame e, più che nuotare, saltella sul fondo sulle pinne come su due ventagli. Dicono che porti fortuna.',
  ingombro: { x0: -1.75, y0: -1.9, x1: 1.2, y1: 1.34 },
  disegna(c, o) {
    const st = max(0, min(2, o.stadio | 0)), K = STADI[st], esp = o.espressione || 'normale', fase = o.fase || 0, F = fase * TAU, t = o.t || 0, b = max(0, min(1, o.bocca || 0)), q = {};
    const paura = esp === 'spaventato', colpito = esp === 'colpito', felice = esp === 'felice';
    const drizza = paura ? .3 : colpito ? .55 : felice ? 1.14 : 1, passo = sin(F * 2), rema = sin(F * 2 + .6);    // quanto tiene aperte le pinne
    c.save();
    if (paura) c.translate(sin(t * 41) * .012, 0);                   // trema
    c.translate(0, sin(F) * .03);                                    // saltella
    c.rotate(sin(F) * .04 + (colpito ? -.14 : 0));
    const s = P.spinaPesce(13, K.x0, K.x1, fase, K.onda, K.su, K.giu, { testa: K.testa }), luce = [.25, -.5, 1.7];
    const e = P.suSpina(s, K.eu, K.ev), r = K.occhio, salta = paura ? .13 : 0;          // di paura gli occhi schizzano in su
    const ammicca = (t % 4.6) > 4.46;
    const sg = colpito ? P.SGUARDI.colpito : felice ? P.SGUARDI.felice : paura ? P.SGUARDI.spaventato : ammicca ? P.SGUARDI.felice : st === 2 ? P.SGUARDI.calmo : P.SGUARDI.normale;

    // ---- 1. dietro al corpo: ventaglio lontano, coda, pinne del dorso e del ventre, vela, ventaglio vicino, occhio lontano
    const p0 = P.suSpina(s, .68, .9), p1 = P.suSpina(s, .52, .9), av = PI / 2 + .25 + (1 - drizza) * .7;
    P.pinna(c, { x0: p0.x + .16, y0: p0.y - .04, x1: p1.x + .16, y1: p1.y - .04, a0: av - .95 - passo * .16, a1: av + .1 - passo * .16, lung: K.ventaglio * .9, profilo: [.75, 1, .95, .7], n: 5,
      smerlo: K.smerlo, tinta: K.pinnaLontana, righe: false });
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .06, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .4, tipo: 'ventaglio', lung: K.coda, alt: K.coda * .92, radice: .13, fase: F - 1.9, onda: .2,
      tinta: K.pinna, orlo: K.orlo, smerlo: K.smerlo, n: 8 });
    const d0 = P.suSpina(s, .36, -.82), d1 = P.suSpina(s, .13, -.7);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -PI / 2 - .5, a1: -PI + .25, lung: K.pin * .8, profilo: [.8, 1, .7], n: 4, onda: .1, fase: F * 2, tinta: K.pinna, orlo: K.orlo });
    if (K.vela) {
      const v0 = P.suSpina(s, .62, -.84), v1 = P.suSpina(s, .4, -.82), a0 = -PI / 2 - .08 - (1 - drizza) * 1.25 + sin(t * 1.7) * .03;
      const g = P.pinna(c, { x0: v0.x, y0: v0.y, x1: v1.x, y1: v1.y, a0, a1: a0 - .55 - .45 * drizza, lung: K.vela * (.6 + .4 * drizza), profilo: [1, .94, .76, .5], n: 5, smerlo: .45,
        onda: .08, fase: F * 2, passo: .8, tinta: K.pinna, orlo: K.orlo, primo: true });
      if (st === 2) {                                                // il pennacchio in cima al primo raggio
        const fx = g.ex[0] * .8 + g.mx[0] * .2, fy = g.ey[0] * .8 + g.my[0] * .2, giu = (1 - drizza) * .5;
        P.filo(c, [fx, fy, fx - .1 - giu * .3, fy - .2 + giu * .3, fx - .3 + sin(F) * .05 - giu * .2, fy - .27 + giu * .6], .06, .02, K.pinna);
      }
    }
    P.pinna(c, { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, a0: av - .6 + passo * .16, a1: av + .5 + passo * .16, lung: K.ventaglio, profilo: [.75, 1, .95, .7], n: 5, smerlo: K.smerlo,
      onda: .06, fase: F * 2, tinta: K.pinna, orlo: K.orlo, primo: true });
    const lx = e.x + K.lontano, ly = e.y - .09 - salta, rl = r * .8;
    c.beginPath(); c.arc(lx, ly + rl * .1, rl * 1.22, 0, TAU); c.lineWidth = P.BORDO * 2; c.strokeStyle = VERDE_LONTANO.bordo; c.stroke(); c.fillStyle = VERDE_LONTANO.base; c.fill();
    P.occhio(c, lx + .02, ly, rl, Object.assign({ iride: IRIDE, pelle: VERDE_LONTANO, raggioIride: .74, guarda: P.sguardo(o.sguardo, lx, ly) }, sg));

    // ---- 2. il corpo: arancio, pancia dorata, onde blu col cuore verde, occhielli sulla guancia
    P.volume(c, s, K.corpo, { luce, ombra: .12, dentro(cc) {
      P.fianco(cc, s, .5, 1.4, VENTRE);
      P.bande(cc, s, K.bande, K.blu); cc.lineJoin = 'round'; cc.strokeStyle = K.bluBordo; cc.lineWidth = .04; cc.stroke();
      P.bande(cc, s, K.cuori, CUORE);
      P.macchie(cc, s, { n: 4 + st, seme: 3, u0: .84, u1: 1.03, v0: -.15, v1: .8, r0: .04, r1: .065, colore: K.blu, cuore: CUORE, lungo: 1 });
    } });
    P.suSpina(s, K.ru, -.6, q); P.riflesso(c, q.x, q.y, .36, q.ang - .08, .12);
    P.guancia(c, e.x + .2, e.y + r + .5, .18, '#ff3f7a', felice ? .85 : .55);

    // ---- 3. sul fianco: la pinna pettorale che rema, con la sua ombra di contatto
    const pp = P.suSpina(s, .58, .3), ap = PI * .9 + rema * .4;
    P.ombra(c, pp.x - .2, pp.y + .1, K.pin * .9, K.pin * .5, -.4, .26);
    P.pinna(c, { x0: pp.x + .07, y0: pp.y - .1, x1: pp.x - .02, y1: pp.y + .13, a0: ap - .8 * drizza - rema * .1, a1: ap + .8 * drizza + rema * .1, lung: K.pin, profilo: [.6, .88, 1, 1, .88, .6], n: 6,
      smerlo: K.smerlo, onda: .12, fase: F * 2, passo: .7, tinta: ORO, orlo: K.blu, primo: true });

    // ---- 4. la faccia: l'occhio vicino sulla sua torretta verde, la boccuccia a cuore
    const ty = e.y - salta + r * .12, rt = r * 1.34;
    P.ombra(c, e.x - .04, e.y + r * 1.25, r * 1.3, r * .55, 0, .3);
    c.beginPath(); c.arc(e.x, ty, rt, 0, TAU); c.lineWidth = P.BORDO * 2; c.strokeStyle = VERDE.bordo; c.stroke(); c.fillStyle = VERDE.base; c.fill();
    c.beginPath(); c.arc(e.x, ty, rt - r * .13, -PI * .9, -PI * .25); c.lineCap = 'round'; c.lineWidth = r * .11; c.strokeStyle = VERDE_LUME; c.stroke();
    P.occhio(c, e.x + .02, e.y - salta, r, Object.assign({ iride: IRIDE, pelle: VERDE, raggioIride: .74, guarda: P.sguardo(o.sguardo, e.x, e.y) }, sg));
    if (paura) P.sopracciglio(c, e.x + .02, e.y - salta - r * 1.5, r * 1.1, -.3, VERDE.bordo, .06);
    const l = P.suSpina(s, 1, .12), lx2 = l.x + K.testa * .82, w = K.bocca;
    if (paura) P.labbra(c, lx2 - .02, l.y + .03, l.ang + sin(t * 30) * .05, w * .8, .12, LABBRO);
    else if (colpito) P.labbra(c, lx2 - .02, l.y + .04, l.ang + .45, w, .4, LABBRO, { denti: 2 });
    else P.labbra(c, lx2, l.y, l.ang, w, felice ? max(b, .5) : b * .9, LABBRO);

    // ---- 5. i segni dell'espressione
    if (paura) P.goccia(c, e.x - r * 1.9, e.y - .02 + sin(t * 5) * .015, .075, -.5);
    if (colpito) P.stelle(c, e.x + .1, e.y - r - .42, .5, t, 3, .12);
    c.restore();
  },
});
})();
