/* Boccone — gigante: IL KRAKEN, il padrone del relitto. Un calamaro colossale rosso cupo, lungo e affusolato: mantello a
   siluro che finisce a freccia con le due pinne a rombo, la testa che esce dal colletto del mantello con l'occhio più
   grande del mare (giallo, tondo), il sifone sotto, e davanti il cono delle otto braccia che nasconde il becco. Dal cono
   escono i due tentacoli lunghi, sottili, con la clava in fondo.
   Tutti gli stati letti con P.statoGigante. Da calmo tiene le braccia chiuse a punta, come un tulipano; a caccia le apre a
   fiore, mostra il becco e allunga i tentacoli a tenaglia. Il segnale da ricordare: LE LUCINE AZZURRE che si accendono in
   fila sul fianco e sulle clave, mentre i due tentacoli si avvolgono a molla sopra e sotto la testa = sta per colpire.
   Quando parte li scaglia dritti in avanti, col mantello stirato e le pinne piegate all'indietro. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos } = Math;
const lerp = (a, b, k) => a + (b - a) * k;

// ---- tinte (una volta sola): il rosso cupo vira al viola nelle ombre; le pinne sono più rosa, il sotto è color conchiglia
function tavolozza(base, ombra, spenta) {
  const pelle = P.tinta(base, ombra), fondo = P.mescola(base, '#3c1266', .5), chiaro = spenta ? '#ebe2ee' : '#fff0e2';
  return {
    pelle, lontano: P.tinta(fondo), pinna: P.tinta(P.mescola(base, '#ff62a6', .5), ombra), pinnaLontana: P.tinta(P.mescola(fondo, '#ff62a6', .22)),
    sotto: P.mescola(base, '#ffeedd', .68), velo: P.alfa(P.mescola(base, '#ffeedd', .72), .7), orlo: P.alfa(P.mescola(base, '#ffeedd', .55), .6),
    dorso: P.alfa(pelle.bordo, .24), nei: P.alfa(pelle.bordo, .45), striscia: P.alfa(P.mescola(base, '#ffd9c2', .5), .5),
    ventosa: chiaro, ventosaLontana: P.mescola(chiaro, fondo, .45), cuoreVentosa: spenta ? '#b9a3c4' : '#f0708e',
  };
}
const VIVE = [tavolozza('#c8284e', '#4c0f68'), tavolozza('#e42a46', '#560c64'), tavolozza('#ee2c42', '#5a0c62'), tavolozza('#ff3636', '#6a0a52')];   // calmo · a caccia · avviso · carica
const STORDITA = tavolozza('#dc6884', '#7a3a86'), SPENTA = tavolozza('#bfa3b6', '#6f5f92', true);
const BECCO = P.tinta('#ffb62e', '#d2470e'), LABBRO = P.tinta('#ffb7a8', '#d8486a'), SIFONE = P.tinta('#ffc4b0', '#d8486a');
const LUME = '#36e6ff', ROSSO = '#ff3348', NEON = [.34, .48, .62, .76].map(a => P.alfa('#7af2ff', a));   // la striscia del fianco, sempre più accesa
const CALMO = { palpebra: .13, pupilla: 1.1 };                          // l'occhione tondo e curioso di quando non ha fame

/* Il mantello: un siluro dalla punta (u = 0, dietro) al colletto (u = 1), più largo verso il colletto. */
const SU = P.sagoma([[0, .03], [.1, .13], [.28, .26], [.52, .35], [.78, .395], [.92, .39], [1, .37]]);
const GIU = P.sagoma([[0, .03], [.1, .12], [.28, .24], [.52, .32], [.78, .36], [.92, .355], [1, .34]]);
const NS = 14, X0 = -1.84, Y0 = -.14, X1 = -.12, Y1 = 0;                // tratti del mantello, punta e colletto
const HX = .2, HY = .01, CX = .4, CY = .08;                             // centro della testa, centro della corona di braccia
const ASSE = .04, MX = CX + cos(ASSE) * .42, MY = CY + sin(ASSE) * .42; // direzione e posto del becco (attorno a x = .8)
const ROMBO = [.22, .74, 1, .86, .6, .3];                               // il profilo delle pinne a rombo
/* Le braccia: [angolo da chiuse, angolo aperte, ricciolo da chiuse, ricciolo aperte, lunghezza, lato delle ventose].
   Da chiuse fanno un cono che si stringe in punta; aperte, le quattro di sopra salgono e le quattro di sotto scendono,
   con le punte che tornano in avanti come artigli: in mezzo resta il becco. */
const LONTANE = [[-.58, -1.4, 1.05, 1.3, 1.15, 1], [-.24, -.5, .43, .7, 1.35, 1], [.2, .45, -.36, -.6, 1.35, -1], [.56, 1.2, -1, -1.1, 1.15, -1]];
const VICINE = [[-.42, -1.2, .76, 1.2, 1.3, 1], [-.1, -.92, .18, .95, 1.45, 1], [.28, 1, -.5, -.95, 1.45, -1], [.66, 1.42, -1.2, -1.2, 1.25, -1]];
const RV = [.032, .048, .056, .046, .032], CLAVA = [];                      // le ventose della clava (raggi) e i loro posti

/* Un braccio: nastro lucido che si assottiglia; le vicine hanno la pancia chiara dal lato delle ventose, che sono perline
   lungo l'orlo col cuore rosa: tinte piatte, in tre passate. st = lo stato già calcolato. */
function braccio(c, a, i, K, st, vicino, q) {
  let ang, curva, lung = a[4];
  if (st.giu) { ang = lerp(a[0], 1.2 + a[0] * .35, .72) + sin(st.t * 1.1 + i) * .05; curva = st.sconfitto ? 1.3 + (i % 3) * .35 : .45; lung *= .92; }
  else {
    ang = lerp(a[0], a[1], st.ap) * (1 + .1 * sin(st.F + .6)) + sin(st.t * .8 + i * 1.3) * .035;
    curva = lerp(a[2], a[3], st.ap) * (1 + st.stringe * .5) + sin(st.t * .6 + i * 2.1) * .1;
    lung *= 1 - st.stringe * .1 + st.scatto * .06;
  }
  const tinta = vicino ? K.pelle : K.lontano, la = a[5], nv = vicino ? 9 : 6;
  const s = P.tentacolo(c, { x: CX - (vicino ? 0 : .04), y: CY - (vicino ? 0 : .03), ang, lung, spess: vicino ? .3 : .27, punta: .035, curva, onda: st.giu ? .08 : .14,
    fase: st.F + i * 1.9, tinta, ombra: 0, lume: vicino ? .04 : 0, n: vicino ? 11 : 8 });
  if (vicino) P.fianco(c, s, la * .2, la * .96, K.sotto, .03, .96, 9);
  for (let passata = vicino ? 0 : 1; passata < (vicino ? 3 : 2); passata++) {       // le lontane: una passata sola, tutta dentro il braccio
    const piu = passata ? 0 : .03, k = passata === 2 ? .42 : vicino ? 1 : .8, v = la * (vicino ? .97 : .62);
    c.beginPath();
    for (let j = 0; j < nv; j++) {
      const u = .12 + .78 * j / (nv - 1), r = (.058 - .036 * u) * k + piu;
      P.suSpina(s, u, v, q); c.moveTo(q.x + r, q.y); c.arc(q.x, q.y, r, 0, TAU);
    }
    c.fillStyle = passata === 2 ? K.cuoreVentosa : passata ? (vicino ? K.ventosa : K.ventosaLontana) : tinta.bordo; c.fill();
  }
}
/* Un tentacolo da preda: stelo sottile e clava in fondo. Quello lontano sta di sopra, quello vicino di sotto. Da calmi
   ondeggiano oltre il cono; a caccia si chiudono a tenaglia; nell'avviso si avvolgono a molla; nella carica partono dritti. */
function frusta(c, lontana, K, st, q) {
  const se = lontana ? -1 : 1, i = lontana ? 0 : 1;
  let ang, curva, onda, lung;
  if (st.giu) { ang = 1.05 + se * .22 + sin(st.t * 1.2 + i * 2) * .05; curva = st.sconfitto ? (lontana ? 2.2 : 2.9) : .5; onda = .12; lung = 1.7; }
  else if (st.scatto) { ang = se * .12 + .02; curva = -se * .1; onda = .05; lung = 2.12; }
  else {
    const w = st.avviso ? .3 + .7 * st.stringe : 0;                                  // quanto è avvolto a molla
    ang = lerp(lerp(se * .16 + .04, se * .34, st.ap), se * 1.12, w) + sin(st.t * .7 + i * 2.4) * .05;
    curva = lerp(lerp(se * .55, -se * .55, st.ap), se * 4.7, w) + sin(st.t * .5 + i) * .12;
    onda = lerp(.3, .08, w) * (1 - .4 * st.ap); lung = lerp(1.95, 2.02, st.ap);
  }
  const s = P.tentacolo(c, { x: CX, y: CY, ang, lung, spess: .12, punta: .09, curva, onda, onde: 1.1, fase: st.F + i * 2.6, clava: 1.35, tinta: lontana ? K.lontano : K.pelle,
    ombra: 0, lume: lontana ? 0 : .025, n: 14, bordo: .04 });
  CLAVA.length = 0;
  for (let j = 0; j < 5; j++) { P.suSpina(s, .74 + j * .056, -se * .3, q); CLAVA.push(q.x, q.y); }
  if (st.luci) {                                                                     // la clava accesa: è il pugno che sta per arrivare
    P.suSpina(s, .86, 0, q); P.bagliore(c, q.x, q.y, .5, LUME, st.luci * (lontana ? .6 : .75));
    P.lucine(c, CLAVA, j => RV[j] * (1.05 + .45 * st.lampo), LUME, st.luci);
  } else for (let passata = 0; passata < 2; passata++) {
    c.beginPath();
    for (let j = 0; j < 5; j++) { const r = RV[j] * (passata ? .45 : 1); c.moveTo(CLAVA[j * 2] + r, CLAVA[j * 2 + 1]); c.arc(CLAVA[j * 2], CLAVA[j * 2 + 1], r, 0, TAU); }
    c.fillStyle = passata ? K.cuoreVentosa : lontana ? K.ventosaLontana : K.ventosa; c.fill();
  }
}

B.specie.registra({
  id: 'kraken',
  descrizione: 'Il calamaro gigante ha gli occhi più grandi di tutti gli animali: grossi come un pallone. Se al Kraken si accendono le lucine azzurre e i due tentacoli lunghi si avvolgono a molla, scappa: sta per colpire!',
  forma: { lx: 1.5, ly: .6 },
  ingombro: { x0: -2.15, y0: -1.82, x1: 2.86, y1: 2.05 },   // nell'avviso i tentacoli si alzano più che nelle pose della galleria
  disegna(c, o) {
    const G = P.statoGigante(o), t = o.t || 0, F = (o.fase || 0) * TAU, q = {};
    const viva = !G.giu, K = G.sconfitto ? SPENTA : G.stordito ? STORDITA : VIVE[G.carica ? 3 : G.avviso ? 2 : G.caccia ? 1 : 0];
    const luci = G.carica ? 1 : G.avviso ? .68 + .32 * G.lampo : 0;                  // le lucine: già ben accese appena parte l'avviso, poi pulsano
    const st = { t, F, fine: P.fine(o), giu: G.giu, sconfitto: G.sconfitto, avviso: G.avviso, stringe: G.avviso ? G.k : 0, scatto: G.carica ? 1 : 0, luci, lampo: G.lampo,
      ap: G.carica ? 1 : G.avviso ? .34 - .14 * G.k : G.caccia ? .55 + .45 * (o.bocca || 0) : G.apri };   // quanto si apre il fiore delle braccia
    const becco = G.giu ? .12 : G.apri;
    c.save();
    c.translate(G.rincula + G.trema, sin(t * 1.3) * .025 + (G.sconfitto ? .12 : 0));
    c.rotate(G.sconfitto ? .26 : G.stordito ? sin(t * 2.2) * .07 : -st.ap * .03);
    if (luci) P.bagliore(c, .2, 0, 1.35, G.carica ? ROSSO : LUME, G.carica ? .26 : .14 + G.lampo * .3);   // l'alone dell'avviso

    // ---- 1. dietro a tutto: il tentacolo lontano e le quattro braccia lontane, scure
    frusta(c, true, K, st, q);
    for (let i = 0; i < 4; i++) braccio(c, LONTANE[i], i * 2, K, st, false, q);

    // ---- 2. in mezzo alle braccia: la membrana scura, la bocca col becco
    c.beginPath(); c.ellipse(CX + .14, CY, .3, .3, 0, 0, TAU); c.strokeStyle = K.lontano.bordo; c.lineWidth = .1; c.stroke(); c.fillStyle = K.lontano.ombra; c.fill();
    c.beginPath(); c.ellipse(MX, MY, .2 + becco * .03, .22 + becco * .05, ASSE, 0, TAU); c.strokeStyle = LABBRO.bordo; c.lineWidth = .07; c.stroke(); c.fillStyle = viva ? LABBRO.base : K.sotto; c.fill();
    c.beginPath(); c.ellipse(MX + .02, MY + .01, .11 + becco * .05, .12 + becco * .09, ASSE, 0, TAU); c.fillStyle = '#5a0c34'; c.fill();
    P.corno(c, MX - .06, MY + .07, ASSE + .3 + becco * .55, .25, .19, BECCO, { curva: -.7 });
    P.corno(c, MX - .07, MY - .07, ASSE - .1 - becco * .4, .37, .25, BECCO, { curva: .75 });

    // ---- 3. le quattro braccia vicine e il tentacolo vicino
    for (let i = 0; i < 4; i++) braccio(c, VICINE[i], i * 2 + 1, K, st, true, q);
    frusta(c, false, K, st, q);

    // ---- 4. la testa (copre le radici delle braccia) e il sifone, che spunta da sotto il colletto
    P.palla(c, HX, HY, .43, .34, -.06, K.pelle, { luce: [HX + .14, HY - .3, 1], ombra: .08 });
    if (viva) P.guancia(c, HX + .27, HY + .2, .17, '#ff4f8a', .34);
    c.beginPath(); c.ellipse(0, HY + .31, .2, .085, .2, 0, TAU); c.strokeStyle = SIFONE.bordo; c.lineWidth = .08; c.stroke(); c.fillStyle = viva ? SIFONE.base : K.sotto; c.fill();
    c.beginPath(); c.ellipse(.15, HY + .345, .042, .062, .2, 0, TAU); c.fillStyle = SIFONE.bordo; c.fill();

    P.ombra(c, X1 + .12, HY, .2, .38, 0, .4);                                         // l'ombra del colletto sulla testa

    // ---- 5. il mantello: respira, pulsa nuotando, si gonfia prima di colpire, si stira nello scatto, si affloscia quando è giù
    const cade = G.sconfitto ? .5 : G.stordito ? .22 + sin(t * 2.2) * .04 : 0, lungo = G.carica ? 1.1 : G.avviso ? 1 - .06 * G.k : G.sconfitto ? .95 : 1;
    const dondola = viva ? sin(F - 1) * .05 + sin(t * .9) * .025 : 0;
    const gonfia = G.sconfitto ? -.2 : G.carica ? -.14 : G.avviso ? .04 + G.k * .1 + G.lampo * .03 : (viva ? .03 : .012) * sin(t * 1.7) + (viva ? .025 * sin(F) : 0);
    const s = P.spina(NS, (u, p) => { const d = 1 - u; p.x = X1 + (X0 - X1) * d * lungo; p.y = Y1 + (Y0 - Y1) * d + (cade + dondola) * d * d; }, SU, GIU, { coda: .02, testa: .05 });
    for (let i = 0; i <= NS; i++) { const g = 1 + gonfia * sin(PI * i / NS); s.su[i] *= g; s.giu[i] *= g; }
    // le due pinne a rombo, in punta: quella di sotto più scura; ondeggiano, a caccia si drizzano, nello scatto si piegano indietro
    const irto = viva ? G.ira : -.7, vela = G.carica ? .5 : G.giu ? .3 : 0;
    const f0 = P.suSpina(s, .47, .72), f1 = P.suSpina(s, .03, .4);
    P.pinna(c, { x0: f0.x, y0: f0.y, x1: f1.x, y1: f1.y, a0: f0.ang + PI / 2 + .15 + vela, a1: f0.ang + PI / 2 + .8 + vela * .5, lung: .5 * (1 + irto * .14), profilo: ROMBO, n: 7,
      onda: viva ? .13 : .04, fase: F * 2 + 1.5, passo: .8, tinta: K.pinnaLontana, orlo: luci ? LUME : undefined });
    const g0 = P.suSpina(s, .47, -.72), g1 = P.suSpina(s, .03, -.4);
    P.pinna(c, { x0: g0.x, y0: g0.y, x1: g1.x, y1: g1.y, a0: g0.ang - PI / 2 - .15 - vela, a1: g0.ang - PI / 2 - .8 - vela * .5, lung: .56 * (1 + irto * .14), profilo: ROMBO, n: 7,
      onda: viva ? .13 : .04, fase: F * 2, passo: .8, tinta: K.pinna, orlo: luci ? LUME : K.sotto });
    P.volume(c, s, K.pelle, { luce: [-.45, -.8, 2.1], ombra: .1, dentro(cc) {
      P.fianco(cc, s, -1.4, u => -.5 + .09 * sin(u * 15), K.dorso);
      P.fianco(cc, s, u => .44 + .07 * sin(u * 12 + 1), 1.4, K.velo);
      P.fianco(cc, s, .07, .25, luci ? NEON[Math.round((G.carica ? 1 : G.lampo) * 3)] : K.striscia, .08, .93);
      P.banda(cc, s, .955, 1.2, K.orlo);
      P.macchie(cc, s, { n: 7, seme: 9, u0: .12, u1: .9, v0: .3, v1: .8, r0: .014, r1: .028, colore: K.striscia, lungo: 1.3 });
      P.macchie(cc, s, { n: 16, seme: 4, u0: .08, u1: .92, v0: -.92, v1: -.08, r0: .016, r1: .042, colore: K.nei, lungo: 1.4 });
    } });
    const foto = P.puntiSuSpina(s, 7, .17, .89, .16), rf = i => .034 + .005 * i;       // la fila di lucine sul fianco
    if (luci) P.lucine(c, foto, i => rf(i) * (1 + .5 * G.lampo), LUME, luci);
    else if (st.fine) P.bozzi(c, foto, rf, K.pelle);
    if (st.fine) {                                                                    // le cicatrici di cento battaglie
      const a = P.suSpina(s, .6, -.8), b = P.suSpina(s, .52, -.12), d = P.suSpina(s, .51, -.74), e = P.suSpina(s, .45, -.22);
      P.solco(c, [a.x, a.y, (a.x + b.x) / 2 + .03, (a.y + b.y) / 2, b.x, b.y], K.pelle, .04);
      P.solco(c, [d.x, d.y, (d.x + e.x) / 2 + .03, (d.y + e.y) / 2, e.x, e.y], K.pelle, .035);
    }
    P.suSpina(s, .8, -.6, q); P.riflesso(c, q.x, q.y, .46, q.ang - .06, .11);

    // ---- 6. la faccia: l'occhione (giallo e tondo, oppure rosso e tagliato), sopracciglio, stelline
    const ex = HX + .1, ey = HY - .05;
    if (G.ira > .6) P.bagliore(c, ex, ey, .4, ROSSO, G.ira * .4);
    c.beginPath(); c.arc(ex - .01, ey, .32, 0, TAU); c.fillStyle = K.pelle.chiara; c.fill();                 // il bozzo dell'occhio
    P.occhio(c, ex, ey, .27, Object.assign({ iride: G.ira ? '#ff3a1e' : '#ffd21e', pelle: K.pelle, tipo: G.ira ? 'fessura' : 'tondo', guarda: P.sguardo(o.sguardo, ex, ey) }, G.calmo ? CALMO : G.occhi));
    if (G.ira) P.sopracciglio(c, ex + .05, ey - .26, .6, .42 + G.ira * .2, K.pelle.bordo, .14);
    else if (G.giu) P.sopracciglio(c, ex, ey - .35, .44, -.35, K.pelle.bordo, .07);
    if (G.stordito) P.stelle(c, .25, -.72, .5, t, 3, .11);
    c.restore();
  },
});
})();
