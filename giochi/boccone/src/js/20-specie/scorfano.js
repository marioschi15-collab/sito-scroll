/* Boccone — specie: SCORFANO (taglia 3, agguato, veleno). Tozzo e bitorzoluto: testone che è mezzo pesce, bocca larghissima
   col broncio (la mandibola P.fauci sporge e ha i lembi di pelle sotto il mento), aculei velenosi sulla schiena con la
   punta chiara, due ciuffetti sopra gli occhi, pettorale a gran ventaglio, livrea rossa a selle scure e chiazze chiare.
   Sta quasi fermo; a caccia spalanca la bocca, drizza gli aculei (le punte si accendono di giallo) e i ciuffetti.
   Il tratto esagerato sono la bocca e gli aculei. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, atan2, hypot } = Math;

// ---- tinte (una volta sola) e sagoma: testa enorme, ventre che si ritira sotto la testa per far posto alla mandibola
const T = { corpo: P.tinta('#f04a30', '#8f1f5e'), ventre: P.tinta('#ffd9c2', '#f07a6a'), pinna: P.tinta('#ff8a2a', '#d02a3a'), mento: P.tinta('#ff9e86', '#c8324e'),
  lembo: P.tinta('#ff9a6a', '#c8324e'), spina: P.tinta('#ffe9a0', '#ff9a3a') };
const ORLO = '#ffe08a', SCURO = P.alfa('#8a1750', .5), CHIARO = P.alfa('#ffd9b0', .6), VELENO = '#eaff5a', AVORIO = '#fff6d0';
const SU = P.sagoma([[0, .13], [.12, .24], [.3, .46], [.5, .66], [.7, .78], [.86, .76], [1, .5]]);
const GIU = P.sagoma([[0, .13], [.12, .22], [.3, .42], [.5, .58], [.66, .6], [.78, .46], [.9, .34], [1, .26]]);
const ONDA = { amp: .08, onde: .5, testa: .1 };
const SELLE = [[.13, .24], [.35, .49], [.6, .7]].map(z => [v => z[0] + .05 * v + .025 * sin(v * 5), v => z[1] + .05 * v - .025 * sin(v * 4 + 1)]);   // tre selle scure dai bordi storti
const MENTO = [[.3, .9, .2], [.55, .84, .24], [.78, .62, .18]];        // lembi sotto il mento: [quota lungo la mandibola, quota in altezza, lunghezza]
/* Tante punte (aculei, lembi di pelle) in UN solo tracciato: costano molto meno di altrettanti P.corno.
   lista = [x, y, angolo, lunghezza, larghezza, curva, …]; colore = tinta piatta o sfumatura; bordo = colore del contorno. */
const punte = (c, l, colore, bordo, gonfio = .8) => {
  c.beginPath();
  for (let i = 0; i < l.length; i += 6) {
    const x = l[i], y = l[i + 1], a = l[i + 2], L = l[i + 3], hx = -sin(a) * l[i + 4] / 2, hy = cos(a) * l[i + 4] / 2, cu = l[i + 5];
    const px = x + cos(a + cu) * L, py = y + sin(a + cu) * L, mx = x + cos(a + cu * .3) * L * .5, my = y + sin(a + cu * .3) * L * .5;
    c.moveTo(x + hx, y + hy); c.quadraticCurveTo(mx + hx * gonfio, my + hy * gonfio, px, py); c.quadraticCurveTo(mx - hx * gonfio, my - hy * gonfio, x - hx, y - hy); c.closePath();
  }
  c.lineJoin = 'round'; c.strokeStyle = bordo; c.lineWidth = .07; c.stroke(); c.fillStyle = colore; c.fill();
};

B.specie.registra({
  id: 'scorfano',
  descrizione: 'Sta immobile fra gli scogli e sembra un sasso coperto d\'alghe, finché un pesciolino non gli passa davanti alla bocca. Gli aculei sulla schiena pungono e fanno molto male: meglio non toccarlo.',
  forma: { lx: 1.0, ly: .7 },
  ingombro: { x0: -1.47, y0: -1.61, x1: 1.19, y1: 1.08 },
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -.9, .6, fase, ONDA, SU, GIU, { testa: .3 }), luce = [.35, -.55, 1.9], alza = m ? .22 : 0, punta = m ? VELENO : AVORIO;

    // ---- 1. dietro al corpo: coda tonda, dorsale molle, anale; la vela degli aculei; i ciuffetti; la bocca coi suoi lembi
    P.suSpina(s, 0, 0, q);
    P.coda(c, { x: q.x + .06, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .3, tipo: 'ventaglio', lung: .5, alt: .46, radice: .14, fase: F - 1.9, onda: .18, smerlo: .35, tinta: T.pinna, orlo: ORLO });
    const a0 = P.suSpina(s, .74, -.92), a1 = P.suSpina(s, .36, -.88), b0 = P.suSpina(s, .34, -.86), b1 = P.suSpina(s, .14, -.8), an0 = P.suSpina(s, .36, .86), an1 = P.suSpina(s, .16, .8);
    P.pinna(c, { x0: b0.x, y0: b0.y, x1: b1.x, y1: b1.y, a0: -(PI / 2 + .35), a1: -(PI - .45), lung: .36, profilo: [.85, 1, .95, .7], n: 4, smerlo: .4, onda: .08, fase: F * 2 - 1, tinta: T.pinna, orlo: ORLO });
    P.pinna(c, { x0: an0.x, y0: an0.y, x1: an1.x, y1: an1.y, a0: PI / 2 + .45, a1: PI - .4, lung: .3, profilo: [.85, 1, .9, .7], n: 4, smerlo: .4, onda: .08, fase: F * 2 - 2, tinta: T.pinna, orlo: ORLO, righe: false });
    const g = P.pinna(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, a0: -(PI / 2 + .1 - alza), a1: -(PI - .75 - alza), lung: m ? .7 : .56, profilo: [.7, 1, 1.05, 1, .92, .8, .6], n: 7, smerlo: .9,
      onda: .05, fase: F, passo: .7, tinta: T.pinna, righe: false });
    const ac = [], cx = (a0.x + a1.x) / 2, cy = (a0.y + a1.y) / 2; let R = .1;                    // gli aculei: dal mezzo del raggio fin oltre la vela
    for (let i = 0; i <= g.n; i++) {
      const dx = g.ex[i] - g.mx[i], dy = g.ey[i] - g.my[i], d = hypot(dx, dy) * 1.35;
      ac.push(g.mx[i], g.my[i], atan2(dy, dx), d, .1, 0); R = max(R, hypot(g.mx[i] + dx * 1.35 - cx, g.my[i] + dy * 1.35 - cy));
    }
    const sf = c.createRadialGradient(cx, cy, R * .3, cx, cy, R); sf.addColorStop(0, T.spina.ombra); sf.addColorStop(.5, T.spina.base); sf.addColorStop(.8, AVORIO); sf.addColorStop(1, punta);
    punte(c, ac, sf, T.spina.bordo);
    const ci = [];                                                                                 // ciuffetti sopra l'occhio
    for (let i = 0; i < 2; i++) { P.suSpina(s, .88 - i * .08, -.93, q); ci.push(q.x, q.y + .06, -PI / 2 + .25 - i * .5 - (m ? 0 : .35) + sin(F * 2 + i) * .1, m ? .36 : .28, .15, m ? -.2 : -.7); }
    const ce = P.suSpina(s, .74, .78), L = .9, H = .31, apri = m ? max(b, .45) * .95 : .04 + b * .3, ang = ce.ang - .5, k = m ? 1 : .6, ca = cos(ang + apri), sa = sin(ang + apri);
    for (let i = 0; i < 3; i++) {                                                                  // i lembi sotto il mento seguono la mandibola
      const lx = L * MENTO[i][0], ly = H * MENTO[i][1];
      ci.push(ce.x + ca * lx - sa * ly, ce.y + sa * lx + ca * ly, ang + apri + PI / 2 + .25 + sin(F * 2 + i * 2) * .22, MENTO[i][2], .15, .5);
    }
    punte(c, ci, T.lembo.base, T.lembo.bordo, 1.2);
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang, lung: L, apri, alt: H, su: .3, tinta: T.mento, interno: '#8a1240', lingua: '#ff7d9c', ombra: 0 });
    P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .3, ge.y0 + (ge.y1 - ge.y0) * .3, ge.x1, ge.y1, 7, .085 * k, 1, { varia: .3, seme: 4 });

    // ---- 2. il corpo: selle scure, ventre chiaro, chiazze chiare da finto sasso
    P.volume(c, s, T.corpo, { luce, ombra: .1, dentro(cc) {
      P.bande(cc, s, SELLE, SCURO);
      P.fianco(cc, s, u => .5 - .12 * sin(u * PI) + max(0, u - .6) * 4, 1.4, T.ventre.base);
      P.macchie(cc, s, { n: 7, seme: 6, u0: .1, u1: .92, v0: -.8, v1: .35, r0: .06, r1: .11, colore: CHIARO, lungo: 1.3 });
    } });
    const g1 = P.suSpina(s, .68, -.6), g2 = P.suSpina(s, .62, -.05), g3 = P.suSpina(s, .66, .5);
    P.solco(c, [g1.x, g1.y, g2.x, g2.y, g3.x, g3.y], T.corpo, .04);                                // opercolo
    P.corno(c, g2.x + .06, g2.y - .04, PI - .1, .17, .09, T.spina, { bordo: .03 });                // la spina della guancia
    if (P.fine(o)) {                                                                               // bitorzoli: lungo il fianco e sul muso
      const bz = P.puntiSuSpina(s, 5, .2, .58, -.5);
      P.suSpina(s, .97, -.72, q); bz.push(q.x + .1, q.y); P.suSpina(s, 1, -.3, q); bz.push(q.x + .2, q.y, q.x + .08, q.y + .2);
      P.bozzi(c, bz, i => .028 + .012 * (i % 3), T.corpo);
    }
    P.suSpina(s, 1, -.62, q); P.riflesso(c, q.x + .1, q.y + .02, .28, q.ang + .45, .12);

    // ---- 3. sul fianco: la pettorale a gran ventaglio, con la sua ombra
    const pp = P.suSpina(s, .58, .4), rema = sin(F * 2 + .4), ap = PI * .84 + rema * .18, lp = m ? .62 : .54;
    P.ombra(c, pp.x - .2, pp.y + .08, .38, .27, -.3, .28);
    P.pinna(c, { x0: pp.x + .04, y0: pp.y - .13, x1: pp.x - .03, y1: pp.y + .13, a0: ap + .8 + alza, a1: ap - .8 - alza, lung: lp, profilo: [.7, .92, 1, 1, .92, .74], n: 8, smerlo: .6, onda: .08, fase: F * 2, passo: .7,
      tinta: T.pinna, orlo: ORLO, primo: true });

    // ---- 4. la faccia. Calmo: palpebra calata e broncio chiuso. A caccia: occhio rosso a fessura, sopracciglio, bocca spalancata coi denti
    const d0 = P.suSpina(s, .84, 1), d1 = P.suSpina(s, 1, 1);
    if (m) P.denti(c, d0.x, d0.y - .01, d1.x + .13, d1.y - .05, 7, .085, -1, { varia: .3, seme: 7 });
    const e = P.suSpina(s, .86, -.5);
    P.occhio(c, e.x, e.y, .21, Object.assign({ pelle: T.corpo, guarda: { x: .55, y: .15 } }, m ? { iride: '#ff3a1e', tipo: 'fessura' } : { iride: '#ffc21a' }, m ? P.SGUARDI.cattivo : P.SGUARDI.calmo));
    if (m) P.sopracciglio(c, e.x + .05, e.y - .2, .48, .5, T.corpo.bordo, .12);
    c.restore();
  },
});
})();
