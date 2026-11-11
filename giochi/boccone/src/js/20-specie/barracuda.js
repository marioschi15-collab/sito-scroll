/* Boccone — specie: BARRACUDA (taglia 5, scattante). Un siluro d'argento lunghissimo: testa a punta, mandibola che sporge
   oltre il muso con le zanne sempre in vista, barre scure sul dorso, due pinnette lontane fra loro, coda a forca.
   Da calmo ha lo sguardo fisso (occhio tondo spalancato, bocca appena socchiusa); a caccia le barre si scuriscono,
   le pinne si drizzano, l'occhio diventa rosso e la bocca si spalanca sulle zanne.
   La mandibola (P.fauci) si disegna prima del corpo, che ne copre la radice: resta fuori solo la punta, più lunga del muso.
   RITOCCO PER LO STILE «FILM D'ANIMAZIONE»: dorso e barre vanno all'indaco invece che al blu dell'acqua (senza contorno
   scuro il siluro d'argento si impastava con lo sfondo), il controluce è più largo. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos } = Math;

// ---- tinte: l'argento è un azzurro chiaro con le ombre indaco (niente grigio); pinne blu-viola con le punte chiare
const T = { corpo: P.tinta('#a4cff2', '#3a3ab4'), ventre: P.tinta('#f6fbff', '#9fbef0'), pinna: P.tinta('#5a64cc', '#221a66'), pett: P.tinta('#86a4ee', '#2f3a9a') };
T.mento = Object.assign({}, P.tinta('#d4eafc', '#6f8fd8'), { bordo: T.corpo.bordo });       // la mandibola ha il bordo scuro del corpo
const DORSO = P.alfa('#3140b8', .72), LUCCICHIO = 'rgba(255,255,255,.5)', BARRA = P.alfa('#231f7c', .6), BARRA_M = P.alfa('#1f2670', .82), CHIAZZA = P.alfa('#27307a', .6), PUNTA = '#e4f3ff';
const FISSO = { palpebra: 0, pupilla: .72 };                          // lo sguardo fisso: niente palpebra, pupilla piccola
/* Lunghissimo e sottile. Il ventre si ritira da u = .84: lì sotto lavora la mandibola, più lunga del muso. */
const SU = P.sagoma([[0, .07], [.08, .12], [.3, .24], [.55, .3], [.75, .3], [.88, .25], [.96, .17], [1, .1]]);
const GIU = P.sagoma([[0, .07], [.08, .11], [.3, .22], [.55, .27], [.75, .27], [.84, .22], [.89, .1], [1, .05]]);
const ONDA = { amp: .1, onde: .7, testa: .1, potenza: 2 };
const L = .7, H = .15;                                               // mandibola: lunghezza e spessore
const BARRE = [];                                                     // barre oblique dal dorso al fianco
for (let k = 0; k < 10; k++) { const u0 = .1 + k * .068; BARRE.push([v => u0 + .03 * v, v => u0 + .03 + .03 * v]); }

B.specie.registra({
  id: 'barracuda',
  descrizione: 'Resta immobile a mezz\'acqua e ti fissa senza battere ciglio. Poi parte come una freccia: lo attira tutto ciò che luccica.',
  forma: { lx: 1.55, ly: .32 },
  ingombro: { x0: -2.33, y0: -.86, x1: 1.63, y1: .86 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(18, -1.6, 1.22, fase, ONDA, SU, GIU, { testa: .16, coda: .03 }), luce = [.6, -.4, 2.3];
    const irto = m ? 1 : 0;

    // ---- 1. dietro al corpo: coda a forca, le due dorsali, anale, ventrale, e la bocca con le zanne di sotto (le più lunghe in punta)
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .3, tipo: 'forca', lung: .58, alt: .52, radice: .08, fase: F - 1.9, onda: .14, tinta: T.pinna, punta: PUNTA, n: 8 });
    const d0 = P.suSpina(s, .6, -.85), d1 = P.suSpina(s, .5, -.85);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -PI / 2 - .75 + irto * .4, a1: -PI / 2 - 1.2 + irto * .3, lung: .3 + irto * .06, profilo: [1, .85, .6, .4], n: 4, smerlo: .6, tinta: T.pinna, punta: PUNTA, primo: true });
    const e0 = P.suSpina(s, .28, -.82), e1 = P.suSpina(s, .17, -.8);
    P.pinna(c, { x0: e0.x, y0: e0.y, x1: e1.x, y1: e1.y, a0: -PI / 2 - .6 + irto * .2, a1: -PI + .25, lung: .32 + irto * .05, profilo: [1, .7, .45, .35], n: 5, onda: .06, fase: F * 2, tinta: T.pinna, punta: PUNTA });
    const a0 = P.suSpina(s, .26, .82), a1 = P.suSpina(s, .16, .8);
    P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: PI / 2 + .6 - irto * .2, a1: PI - .25, lung: .3 + irto * .05, profilo: [1, .7, .45, .35], n: 5, onda: .06, fase: F * 2 + 1, tinta: T.pinna, punta: PUNTA });
    const v0 = P.suSpina(s, .55, .85);
    P.pinna(c, { x0: v0.x + .06, y0: v0.y - .04, x1: v0.x - .05, y1: v0.y - .04, a0: PI / 2 + .7 - irto * .3, a1: PI / 2 + 1.25 - irto * .2, lung: .25, profilo: [1, .7, .4], n: 3, tinta: T.pinna, punta: PUNTA });
    const k = m ? 1 : .55, ce = P.suSpina(s, .85, .4), ap = m ? .42 + b * .3 : .05 + b * .22, am = ce.ang - .03 + ap, ca = cos(am), sa = sin(am);
    P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang - .03, lung: L, apri: ap, alt: H, su: .2, fondo: .76, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c', ombra: .05 });
    P.denti(c, ce.x + ca * L * .3, ce.y + sa * L * .3, ce.x + ca * L * .84, ce.y + sa * L * .84, 6, .11 * k, 1, { tipo: 'ago', varia: .45, seme: 4 });
    P.denti(c, ce.x + ca * L * .82, ce.y + sa * L * .82, ce.x + ca * L * .97, ce.y + sa * L * .97, 2, .18 * k, 1, { tipo: 'punta', largo: .7, piega: .2 });

    // ---- 2. il corpo: dorso blu, barre scure (più nere a caccia), ventre bianco, chiazze verso la coda, un filo di luccichio
    P.volume(c, s, T.corpo, { luce, ombra: .1, dentro(cc) {
      P.fianco(cc, s, -1.4, u => -.3 + .08 * sin(u * 30), DORSO);
      P.bande(cc, s, BARRE, m ? BARRA_M : BARRA, 3);
      P.fianco(cc, s, u => .22 + .06 * sin(u * 26), 1.4, T.ventre.base);
      P.fianco(cc, s, -.1, .04, LUCCICHIO, .06, .8);
      P.macchie(cc, s, { n: 5, seme: 3, u0: .06, u1: .5, v0: .35, v1: .8, r0: .025, r1: .05, colore: CHIAZZA, lungo: 1.3 });
    } });
    const g0 = P.suSpina(s, .8, -.7), g1 = P.suSpina(s, .765, -.1), g2 = P.suSpina(s, .79, .6);
    P.solco(c, [g0.x, g0.y, g1.x, g1.y, g2.x, g2.y], T.corpo, .035);                               // opercolo
    P.suSpina(s, .68, -.62, q); P.riflesso(c, q.x, q.y, .46, q.ang - .02, .06);

    // ---- 3. sul fianco: la pettorale, piccola e bassa
    const pp = P.suSpina(s, .73, .42), rema = sin(F * 2 + .4), dir = PI * .88 + rema * .25 - irto * .25;
    P.ombra(c, pp.x - .1, pp.y + .04, .2, .1, -.2, .25);
    P.pinna(c, { x0: pp.x + .02, y0: pp.y - .06, x1: pp.x - .02, y1: pp.y + .06, a0: dir - .35, a1: dir + .4, lung: .32, profilo: [.8, 1, .7], n: 4, tinta: T.pett, punta: PUNTA, primo: true });

    // ---- 4. le zanne di sopra, lungo il labbro del muso
    const l0 = P.suSpina(s, .9, 1), l1 = P.suSpina(s, 1, 1);
    P.denti(c, l0.x, l0.y - .01, l1.x + .11, l1.y - .02, 6, .1 * k, -1, { tipo: 'ago', varia: .45, seme: 7 });
    P.denti(c, l1.x + .02, l1.y - .01, l1.x + .13, l1.y - .03, 2, .17 * k, -1, { tipo: 'punta', largo: .7, piega: -.15 });

    // ---- 5. la faccia: narice, occhio fisso (a caccia rosso e tagliato), sopracciglio
    if (P.fine(o)) { P.suSpina(s, 1, -.6, q); c.fillStyle = P.alfa(T.corpo.bordo, .7); c.beginPath(); c.ellipse(q.x + .02, q.y + .03, .03, .016, .2, 0, TAU); c.fill(); }
    const e = P.suSpina(s, .865, -.2);
    P.occhio(c, e.x, e.y, .165, Object.assign({ iride: m ? '#ff3a1e' : '#ffd83c', tipo: m ? 'fessura' : 'tondo', pelle: T.corpo, guarda: { x: .55, y: .05 } }, m ? P.SGUARDI.cattivo : FISSO));
    if (m) P.sopracciglio(c, e.x + .03, e.y - .16, .4, e.ang + .42, T.corpo.bordo, .11);
    c.restore();
  },
});
})();
