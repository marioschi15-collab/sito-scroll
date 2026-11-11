/* Boccone — specie: LAMPUGA (taglia 2, cacciatore). Il pesce dalla fronte a muro: testone alto e squadrato con l'occhio in
   basso e la bocca imbronciata, corpo che si assottiglia fino a una coda a forca, e una pinna dorsale blu che parte da sopra
   l'occhio e arriva alla coda. Fianchi d'oro, dorso verde smeraldo, puntini blu. A caccia «si accende»: la cresta si alza
   e sul fianco compaiono barre blu (lo fa davvero, quando è eccitata). */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, pow, min } = Math;

// ---- tinte (una volta sola) e sagoma: altissima in testa, sottile in coda; da u = .87 il ventre si ritira per la mandibola
const T = { corpo: P.tinta('#ffd21e', '#ff6a14'), ventre: P.tinta('#fff19c', '#f0a03c'), mento: P.tinta('#ffe680', '#f07a1e'), cresta: P.tinta('#2a80f6', '#2a2ab0'),
  gialla: P.tinta('#ffc21a', '#f0541e'), pett: P.tinta('#34d2c2', '#1f52d0') };
const VERDE = '#14bd86', LIME = P.alfa('#9fe234', .85), BLU = '#2470f0', CUORE = '#aee8ff', ORLO = '#86f2ff', ORLO_CODA = '#d4ff7a', BARRA = P.alfa('#0fae9c', .82), CIELO = '#2ab8ff';
const SU = P.sagoma([[0, .07], [.12, .17], [.35, .36], [.6, .52], [.8, .62], [.92, .65], [1, .57]]);
const GIU = P.sagoma([[0, .07], [.12, .16], [.35, .3], [.6, .4], [.8, .46], [.87, .45], [.93, .3], [1, .2]]);
const ONDA = { amp: .1, onde: .5, testa: .12 };
const altDorsale = k => (.12 + .24 * pow(k, 1.2)) * min(1, (1 - k) * 9) * min(1, k * 8);        // più alta sulla testa, a zero ai due capi
const altAnale = k => .15 * pow(sin(PI * k), .6);
const orloVerde = u => -.56 + .07 * sin(u * 11), orloLime = u => -.3 + .07 * sin(u * 11 + .6);
const BARRE = [.2, .32, .44, .56, .68].map(u0 => [v => u0 - .03 * v, v => u0 + .045 - .03 * v]);   // le barre che si accendono a caccia

B.specie.registra({
  id: 'lampuga',
  descrizione: 'Cresce più in fretta di quasi ogni altro pesce: in un anno può superare il metro. Quando caccia i suoi colori si accendono e lampeggiano, dall\'oro al blu.',
  forma: { lx: 1.0, ly: .6 },
  ingombro: { x0: -1.94, y0: -1.17, x1: .97, y1: 1.05 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -1.02, .68, fase, ONDA, SU, GIU, { testa: .1 }), luce = [.3, -.5, 1.8], alza = m ? 1.3 : 1;

    // ---- 1. dietro al corpo: coda a forca, la lunga dorsale blu, l'anale, la ventrale, la bocca
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .34, tipo: 'forca', lung: .72, alt: .74, radice: .085, fase: F - 1.9, onda: .15, tinta: T.gialla, orlo: ORLO_CODA });
    P.cresta(c, s, { u0: .1, u1: .97, lato: -1, alt: k => altDorsale(k) * alza, onda: .12, fase: F * 2, onde: 3, piega: .45, passi: 16, tinta: T.cresta, orlo: ORLO });
    P.cresta(c, s, { u0: .08, u1: .52, lato: 1, alt: altAnale, onda: .1, fase: F * 2 + 1, onde: 2, piega: .5, passi: 9, tinta: T.gialla, orlo: ORLO_CODA });
    const pv = P.suSpina(s, .7, .95);
    P.pinna(c, { x0: pv.x + .07, y0: pv.y - .05, x1: pv.x - .08, y1: pv.y - .05, a0: PI * .64 + sin(F - .5) * .1, a1: PI * .84 + sin(F - .5) * .1, lung: .5, profilo: [1, .55], n: 3, piega: .1, tinta: T.gialla, orlo: ORLO_CODA, righe: false });
    const ce = P.suSpina(s, .872, .5), apri = m ? .52 + b * .4 : .04 + b * .3;
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang - .1, lung: .37, apri, alt: .2, su: .25, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c' });
    if (apri > .2) P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .25, ge.y0 + (ge.y1 - ge.y0) * .25, ge.x1, ge.y1, 5, .06, 1, { arco: true, spess: .014 });

    // ---- 2. il corpo d'oro: dorso verde che sfuma nel lime, pancia chiara, barre blu (solo a caccia), puntini blu
    const fr = P.suSpina(s, .95, -.7);
    P.volume(c, s, T.corpo, { luce, ombra: .075, dentro(cc) {
      P.fianco(cc, s, -1.4, orloLime, LIME);
      P.fianco(cc, s, -1.4, orloVerde, VERDE);
      P.fianco(cc, s, u => .74 - .16 * sin(u * PI), 1.4, P.sfumatura(cc, T.ventre, luce));
      P.guancia(cc, fr.x, fr.y, .42, CIELO, .5);                                       // la fronte vira all'azzurro
      if (m) P.bande(cc, s, BARRE, BARRA);
      P.macchie(cc, s, { n: 17, seme: 6, u0: .06, u1: .8, v0: -.75, v1: .62, r0: .026, r1: .046, colore: BLU, cuore: CUORE, lungo: 1 });
    } });
    const g1 = P.suSpina(s, .77, -.4), g2 = P.suSpina(s, .725, .1), g3 = P.suSpina(s, .78, .62);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                                // opercolo
    P.suSpina(s, .62, -.7, q); P.riflesso(c, q.x, q.y, .42, q.ang - .12, .13);

    // ---- 3. sul fianco: la pettorale a falce che rema, con la sua ombra
    const pp = P.suSpina(s, .7, .22), rema = sin(F * 2 + .4), ap = PI * .86 + rema * .3;
    P.ombra(c, pp.x - .18, pp.y + .1, .32, .2, -.5, .26);
    P.pinna(c, { x0: pp.x + .04, y0: pp.y - .09, x1: pp.x - .03, y1: pp.y + .09, a0: ap + .3 + rema * .08, a1: ap - .36 - rema * .08, lung: .56, profilo: [.55, .8, 1, .7], n: 4, piega: -.12, onda: .08, fase: F * 2, passo: .7,
      tinta: T.pett, orlo: ORLO, primo: true });

    // ---- 4. la faccia. Calmo: occhio celeste e broncio. A caccia: occhio rosso tagliato, sopracciglio, bocca aperta coi denti
    if (apri > .2) { const d0 = P.suSpina(s, .935, 1), d1 = P.suSpina(s, 1, 1); P.denti(c, d0.x, d0.y - .01, d1.x + .07, d1.y - .01, 5, .075, -1, { arco: true, spess: .014 }); }
    const e = P.suSpina(s, .885, -.1);
    P.occhio(c, e.x, e.y, .21, Object.assign({ iride: m ? '#ff3a1e' : '#23b4ff', pelle: T.corpo, guarda: { x: .55, y: .1 } }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    if (m) P.sopracciglio(c, e.x + .04, e.y - .2, .46, .5, T.corpo.bordo, .12);
    c.restore();
  },
});
})();
