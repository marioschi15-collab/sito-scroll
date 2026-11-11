/* Boccone — specie: GRANCHIO NUOTATORE (taglia 2, cacciatore, corazza, assetto 'dritto': il motore non lo ruota, lo specchia
   soltanto). Visto di fronte, appena girato verso +x: carapace largo blu-viola con le due spine ai lati, sotto la «faccia»
   chiara con la bocca, occhi su peduncoli che spuntano sopra il guscio, chele dalla punta arancio, tre paia di zampe che
   penzolano e, dietro, le ultime due zampe a paletta che girano come remi. Calmo tiene le chele basse e sorride; a caccia
   le alza e le fa scattare (le punte diventano rosse), aggrotta gli occhi e mostra i denti. Il tratto esagerato sono le
   chele e gli occhi a periscopio.
   RITOCCO PER LO STILE «FILM D'ANIMAZIONE»: guscio, zampe, chele e palette hanno l'ombra indaco dichiarata nelle tinte
   (senza contorno scuro si impastavano con l'acqua); palette e antennine usano la linea sottile. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, max } = Math;

// ---- tinte (una volta sola)
const T = { guscio: P.tinta('#5b54e6', '#2a1890'), ventre: P.tinta('#e9e0ff', '#9a86e6'), zampa: P.tinta('#4d86ee', '#2a2fc4'), chela: P.tinta('#6f60f4', '#30209e'), pala: P.tinta('#38a4ee', '#2a3fd0') };
const MACCHIA = P.alfa('#aab8ff', .75), AVORIO = '#fff0d2', BAFFO = '#ffd9a0', NERVO = P.alfa(T.pala.scura, .6);
/* Il carapace è un volume su una spina orizzontale ferma (u = 0 la spina di sinistra, u = 1 quella di destra): così ombra,
   luce, macchie e orlo seguono la sua curva. SU è il guscio visto da sopra, GIU la faccia. */
const SU = P.sagoma([[0, .03], [.08, .2], [.25, .4], [.5, .47], [.75, .4], [.92, .2], [1, .03]]);
const GIU = P.sagoma([[0, .03], [.1, .17], [.28, .33], [.5, .42], [.72, .33], [.9, .17], [1, .03]]);
const S = P.spinaPesce(12, -.9, .9, 0, null, SU, GIU, { y: -.05 });
const orlo = u => .22 - .3 * sin(PI * u);                                      // dove finisce il guscio e comincia la faccia
const BORCHIE = P.puntiSuSpina(S, 9, .16, .9, u => orlo(u) - .1);              // la fila di denti tondi lungo l'orlo
const SOLCO = [-.07, -.25, .02, -.17, .13, -.15, .24, -.17, .33, -.25];
const ZAMPE = [[.3, .22, 1.05], [.47, .19, .7], [.64, .12, .38]];              // tre zampe per lato: [x, y, angolo del primo pezzo]
const DENTINI = [[.05, -.5], [.12, -.3], [.2, -.15]];                          // dentini del bordo, verso le spine: [u, inclinazione]
const OCCHI = [[-.2, -1], [.46, 1]];                                           // [x del peduncolo, lato]
const CATTIVI = [P.SGUARDI.cattivo, Object.assign({}, P.SGUARDI.cattivo, { taglio: -P.SGUARDI.cattivo.taglio })];   // sguardo a V
const gira = (a, sg) => sg > 0 ? a : PI - a;                                   // lo stesso angolo sul lato sinistro
/* La paletta dell'ultima zampa: un remo piatto, appuntito all'attacco e tondo in fondo, in tre riempimenti (bordo, colore,
   luce) più la nervatura. L = lunghezza, h = mezza larghezza; sg specchia la luce sul lato sinistro. */
const ovale = (c, L, h, e) => { c.beginPath(); c.moveTo(-e, 0); c.bezierCurveTo(L * .2, -h * 1.5 - e, L * .85, -h * 1.45 - e, L + e, 0); c.bezierCurveTo(L * .85, h * 1.45 + e, L * .2, h * 1.5 + e, -e, 0); c.closePath(); };
const pala = (c, x, y, ang, sg, L, h, t) => {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(1, sg);
  ovale(c, L, h, .03); c.fillStyle = t.linea; c.fill();
  ovale(c, L, h, 0); c.fillStyle = t.base; c.fill();
  c.beginPath(); c.ellipse(L * .58, -h * .38, L * .3, h * .36, 0, 0, TAU); c.fillStyle = t.luce; c.fill();
  c.beginPath(); c.moveTo(L * .12, h * .1); c.lineTo(L * .8, h * .1); c.strokeStyle = NERVO; c.lineWidth = .028; c.stroke();
  c.restore();
};

B.specie.registra({
  id: 'granchio_nuotatore',
  descrizione: 'Le sue ultime zampe sono fatte a paletta: le fa girare come due remi e nuota di lato, svelto come un pesce. Se qualcuno lo disturba non scappa: alza le chele e gli va incontro.',
  forma: { lx: .95, ly: .55 },
  ingombro: { x0: -1.44, y0: -1.19, x1: 1.44, y1: .91 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, m = !!o.minaccia, b = o.bocca || 0, polsi = [];
    c.save();
    c.translate(0, sin(F * 2) * .025); c.rotate(sin(F) * .03);                                    // galleggia e dondola

    // ---- 1. dietro al guscio: le palette che remano, le zampe, le spine dei lati, le braccia
    for (const sg of [-1, 1]) {
      const rema = sin(F * 2 + (sg > 0 ? 0 : 2)), a2 = -1.05 + rema * .5;
      const p = P.zampa(c, sg * .5, -.26, [[gira(-.5 + rema * .1, sg), .32], [gira(a2, sg), .15]], T.zampa, { spess: .13, punta: .09 });
      pala(c, p.x, p.y, gira(a2 + rema * .35, sg), sg, .44, .115, T.pala);
    }
    for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) {
      const z = ZAMPE[i], w = sin(F + i * 2 + (sg > 0 ? 0 : 1.5)) * .16, a = z[2] + w;
      P.zampa(c, sg * z[0] + .04, z[1], [[gira(a, sg), .22], [gira(a + .85 + w * .5, sg), .24], [gira(a + 1.45, sg), .2]], T.zampa, { spess: .11, punta: .03 });
    }
    P.corno(c, -.84, -.06, PI + .1, .36, .24, T.guscio, { punta: AVORIO, curva: .15 });
    P.corno(c, .84, -.06, -.1, .36, .24, T.guscio, { punta: AVORIO, curva: -.15 });
    for (let i = 0; i < 2; i++) {
      const sg = i ? -1 : 1, k = i ? .9 : 1, don = sin(F * 2 + i * 2) * .06;
      polsi[i] = P.zampa(c, sg * .58 + .03, .12, [[gira((m ? .3 : .9) + don, sg), .27 * k], [gira((m ? -1.15 : -.6) + don, sg), .27 * k]], T.chela, { spess: .19, punta: .15 });
    }

    // ---- 2. il carapace: guscio blu-viola a macchie chiare, sotto la faccia chiara
    P.volume(c, S, T.guscio, { luce: [.3, -.5, 1.5], ombra: .11, dentro(cc) {
      P.fianco(cc, S, orlo, 1.4, P.sfumatura(cc, T.ventre, [.2, -.1, 1.1]));
      if (P.fine(o)) P.macchie(cc, S, { n: 10, seme: 5, u0: .08, u1: .92, v0: -.85, v1: -.2, r0: .025, r1: .055, colore: MACCHIA, lungo: 1.3 });
    } });
    P.bozzi(c, BORCHIE, i => .034 - .012 * (i % 2), T.guscio);
    P.solco(c, SOLCO, T.guscio, .035);
    P.riflesso(c, .15, -.4, .3, .04, .08);

    // ---- 3. le chele: basse e socchiuse da calmo, alte e scattanti a caccia
    for (let i = 0; i < 2; i++) {
      const sg = i ? -1 : 1, p = polsi[i], scatto = sin(F * 2 + i * 2.5);
      P.ombra(c, p.x - sg * .12, p.y + .08, .2, .12, 0, .25);
      P.chela(c, p.x, p.y, gira(m ? -1.72 + scatto * .06 : -1.25, sg), (m ? .68 : .6) * (i ? .9 : 1), m ? .6 + scatto * .3 : .14 + scatto * .08, T.chela, { lato: sg, punta: m ? '#ff4a2e' : '#ff9a3a' });
    }

    // ---- 4. la faccia. Calmo: occhioni gialli, sorriso, gote rosa. A caccia: occhi rossi aggrottati a V, bocca aperta coi denti
    c.lineCap = 'round';
    for (let passata = 0; passata < 2; passata++) {                                               // le due antennine, in due passate
      c.beginPath(); c.moveTo(.06, -.1); c.quadraticCurveTo(.02, -.3, -.06 + sin(F * 2) * .03, -.42); c.moveTo(.2, -.1); c.quadraticCurveTo(.25, -.3, .33 + sin(F * 2 + 1) * .03, -.42);
      c.strokeStyle = passata ? BAFFO : T.guscio.linea; c.lineWidth = passata ? .028 : .06; c.stroke();
    }
    for (let i = 0; i < 2; i++) {
      const x = OCCHI[i][0], la = OCCHI[i][1], ex = x + la * .05 + sin(F + i * 2) * .025, ey = -.72 + sin(F * 2 + i) * .02 - (m ? .03 : 0);
      P.tubo(c, [x, -.16, x + la * .02, -.4, ex, ey + .1], .11, T.guscio);
      P.occhio(c, ex, ey, .21, Object.assign({ iride: m ? '#ff3a1e' : '#ffcf1e', pelle: T.guscio, guarda: { x: .55, y: .2 } }, m ? CATTIVI[i] : P.SGUARDI.normale));
      if (m) P.sopracciglio(c, ex - la * .02, ey - .17, .4, -la * .5, T.guscio.bordo, .1);
    }
    if (!m) { P.guancia(c, -.2, .14, .11); P.guancia(c, .46, .14, .11); }
    const apri = m ? max(b, .45) : b * .5;
    P.sorriso(c, .13, m ? .15 : .1, m ? .27 : .2, { apri, alt: m ? .3 : .2, curva: m ? -.3 : .75, denti: m ? 'giu' : 0, lingua: !m, tinta: T.ventre });
    if (m) { const fr = .056 + .075 * apri; P.denti(c, -.06, .195 - fr * .51, .32, .195 - fr * .51, 5, .085, -1, { curva: -fr * .49, arco: true }); }   // i denti di sopra seguono il labbro
    c.restore();
  },
});
})();
