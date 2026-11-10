/* Boccone — gigante: LA PIOVRA, la regina della foresta di alghe. Un polpo colossale rosso corallo: testa a sacco che
   respira, occhione dorato con la pupilla a sbarra sopra il suo bozzo, cornetti di pelle al posto delle sopracciglia, becco
   in mezzo alle braccia, corona. Le otto braccia sono vive e girano a girandola: quattro lontane (scure) e quattro vicine
   con la pancia chiara e la fila di ventose a perline; ognuna si arriccia per conto suo.
   Tutti gli stati letti con P.statoGigante. Il segnale da ricordare: macchie ad anello spente = tranquilla; macchie e
   ventose che si ACCENDONO DI GIALLO (con il sacco che si gonfia e le braccia che si avvolgono come molle) = sta per colpire.
   Quando parte spalanca le braccia a tenaglia e apre il becco. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, round } = Math;
const lerp = (a, b, k) => a + (b - a) * k;

// ---- tinte (una volta sola). La pelle ha sette gradini, dal corallo al rosso rovente: i polpi cambiano colore davvero.
function tavolozza(base, ombra, livello, spenta) {
  const pelle = P.tinta(base, ombra), fondo = P.mescola(base, '#5a1466', .46), acceso = livello > 1, k = acceso ? (livello - 2) / 4 : 0;
  return {
    pelle, lontano: P.tinta(fondo), sotto: P.mescola(base, '#fff0dc', .64), velo: P.alfa(P.mescola(base, '#fff0dc', .7), .72), nei: P.alfa(pelle.bordo, .38),
    ventosa: spenta ? '#ebe2ee' : acceso ? P.mescola('#ffe14a', '#fffbd0', k) : '#fff0e2',
    ventosaLontana: P.mescola(spenta ? '#ebe2ee' : acceso ? '#ffd23c' : '#fff0e2', fondo, acceso ? .25 : .42),
    cuoreVentosa: spenta ? '#b9a3c4' : acceso ? '#ff8a1e' : '#f58a8e',
    anello: spenta ? P.alfa('#7d6a9c', .45) : acceso ? P.mescola('#ffb21e', '#ffee3c', k) : livello ? '#c42a52' : P.alfa('#a8204e', .5),
    cuore: spenta ? '#d9cfe0' : acceso ? P.mescola('#ffe9a0', '#ffffff', k) : livello ? '#ffc0a0' : '#ffb59c',
  };
}
const VIVE = [];
for (let i = 0; i <= 6; i++) VIVE.push(tavolozza(P.mescola('#ff6b4a', '#ff2444', i / 6), P.mescola('#9a1a5e', '#6e0a52', i / 6), i, false));
const STORDITA = tavolozza('#f58a78', '#8a3a80', 0, false), SPENTA = tavolozza('#c9aabb', '#6f5f92', 0, true);
const BECCO = P.tinta('#ffc21f', '#f0641e'), LABBRO = P.tinta('#ffb7a8', '#d8486a'), SIFONE = P.tinta('#ffc9b4', '#d8486a');
const ROSSO = '#ff3348', GIALLO = '#ffd21e';
const CALMO = { palpebra: .3, sotto: .1 };                             // l'occhio socchiuso della regina che non ha fretta

/* Il sacco: un pallone inclinato all'indietro, più stretto al collo dove sparisce sotto la testa. Va dalla punta (in alto
   a sinistra) al collo. */
const SU = P.sagoma([[0, .42], [.08, .47], [.25, .61], [.45, .68], [.7, .61], [.88, .48], [1, .38]]);
const GIU = P.sagoma([[0, .4], [.08, .44], [.25, .52], [.45, .56], [.7, .51], [.88, .43], [1, .36]]);
const NS = 12, X0 = -.92, Y0 = -.86, X1 = .06, Y1 = -.1;                // tratti del sacco, punta e collo
const HX = .17, HY = -.03, CX = .35, CY = .2;                           // centro della testa, centro della corona di braccia
const ASSE = .1, MX = CX + cos(ASSE) * .47, MY = CY + sin(ASSE) * .47;  // direzione e posto del becco (attorno a x = .8)
/* Le braccia: [angolo da calma, angolo a tenaglia aperta, ricciolo da calma, ricciolo aperto, lunghezza, lato delle ventose].
   Si alternano una lontana e una vicina, dall'alto in avanti fino a dietro sotto il sacco. Da calma girano tutte dalla
   stessa parte, a girandola, così non si incrociano; aperte, le tre di sopra si alzano e piegano la punta in giù come
   artigli, le cinque di sotto si distendono: in mezzo resta il becco. */
const LONTANE = [[-.6, -1.25, -2.3, 1, 1.2, 1], [.3, -.7, -2, .8, 1.6, 1], [1.2, 1.45, -2.3, -1.1, 1.5, -1], [2.1, 2.2, -2.2, -1.4, 1.4, -1]];
const VICINE = [[-.15, -1, -3.5, 1.3, 1.5, 1], [.75, 1.1, -2.6, -1, 1.65, -1], [1.65, 1.8, -3.3, -1.3, 1.6, -1], [2.55, 2.6, -3, -1.6, 1.55, -1]];

/* Un braccio: nastro lucido che si assottiglia e si arriccia; le vicine hanno la pancia chiara dal lato delle ventose e
   qualche neo sul dorso. Le ventose delle vicine sono perline lungo l'orlo (metà dentro e metà fuori), col loro cuore
   rosa: tutte tinte piatte, in tre passate. st = lo stato già calcolato. */
function braccio(c, a, i, K, st, vicino, q) {
  let ang, curva, lung = a[4];
  if (st.giu) { ang = lerp(a[0], 1.2 + (a[0] - .9) * .3, .65) + sin(st.t * 1.1 + i) * .05; curva = a[2] * (st.sconfitto ? 1.25 : .45); lung *= .9; }
  else {
    ang = lerp(a[0], a[1], st.ap) + sin(st.t * .8 + i * 1.3) * .05;
    curva = lerp(a[2], a[3], st.ap) * (1 + st.stringe * .7) + sin(st.t * .6 + i * 2.1) * .2;
    lung *= 1 - st.stringe * .16 + st.scatto * .08;
  }
  const tinta = vicino ? K.pelle : K.lontano, la = a[5], nv = vicino ? 9 : 6;
  const s = P.tentacolo(c, { x: CX - (vicino ? 0 : .05), y: CY - (vicino ? 0 : .04), ang, lung, spess: vicino ? .46 : .4, punta: .06, curva, onda: st.giu ? .1 : .18,
    fase: st.F + i * 1.9, tinta, ombra: vicino ? .05 : 0, lume: vicino ? .05 : 0, n: vicino ? 12 : 10 });
  if (vicino) {
    P.fianco(c, s, la * .26, la * .96, K.sotto, .02, .95, 10);
    if (st.fine) P.macchie(c, s, { n: 5, seme: i + 2, u0: .1, u1: .72, v0: -la * .62, v1: -la * .12, r0: .016, r1: .03, colore: K.nei, lungo: 1.3 });
  }
  for (let passata = vicino ? 0 : 1; passata < (vicino ? 3 : 2); passata++) {       // le lontane: una passata sola, tutta dentro il braccio
    const piu = passata ? 0 : .034, k = passata === 2 ? .42 : vicino ? 1 : .8, v = la * (vicino ? .97 : .66);
    c.beginPath();
    for (let j = 0; j < nv; j++) {
      const u = .1 + .8 * j / (nv - 1), r = (.078 - .046 * u) * k + piu;
      P.suSpina(s, u, v, q); c.moveTo(q.x + r, q.y); c.arc(q.x, q.y, r, 0, TAU);
    }
    c.fillStyle = passata === 2 ? K.cuoreVentosa : passata ? (vicino ? K.ventosa : K.ventosaLontana) : tinta.bordo; c.fill();
  }
}

B.specie.registra({
  id: 'piovra',
  descrizione: 'Il polpo ha tre cuori, il sangue blu e nove cervelli: uno nella testa e uno per ogni braccio. La Piovra cambia colore quando si arrabbia: se le macchie le si accendono di giallo, nuota via!',
  forma: { lx: 1.25, ly: 1.0 },
  ingombro: { x0: -1.72, y0: -1.72, x1: 2.06, y1: 1.95 },
  disegna(c, o) {
    const G = P.statoGigante(o), t = o.t || 0, F = (o.fase || 0) * TAU, q = {};
    const viva = !G.giu, rosso = G.carica ? 6 : G.avviso ? 2 + round(G.lampo * 4) : G.caccia ? 1 : 0;   // quanto è accesa (0..6): nell'avviso parte già da 2
    const K = G.sconfitto ? SPENTA : G.stordito ? STORDITA : VIVE[rosso];
    const st = { t, F, fine: P.fine(o), giu: G.giu, sconfitto: G.sconfitto, stringe: G.avviso ? G.k : 0, scatto: G.carica ? 1 : 0,
      ap: G.carica ? 1 : G.avviso ? .3 - .14 * G.k : G.apri };                                          // quanto si apre la tenaglia delle braccia
    const becco = G.giu ? .12 : G.apri;
    c.save();
    c.translate(G.rincula + G.trema, sin(t * 1.3) * .025 + (G.sconfitto ? .14 : 0));
    c.rotate(G.sconfitto ? .3 : G.stordito ? sin(t * 2.2) * .07 : -st.ap * .05);
    if (rosso > 1) P.bagliore(c, -.2, -.3, 1.7, G.carica ? ROSSO : GIALLO, G.carica ? .3 : .16 + G.lampo * .34);        // l'alone dell'avviso

    // ---- 1. le quattro braccia lontane, scure, dietro a tutto
    for (let i = 0; i < 4; i++) braccio(c, LONTANE[i], i * 2, K, st, false, q);

    // ---- 2. il sacco: respira, si gonfia prima di colpire, si allunga nello scatto, si affloscia quando è giù
    const cade = G.sconfitto ? .7 : G.stordito ? .3 + sin(t * 2.2) * .04 : G.carica ? .3 : 0, lungo = G.carica ? 1.12 : G.sconfitto ? .94 : 1;
    const dondola = viva ? sin(F - 1) * .05 + sin(t * .9) * .03 : 0;
    const gonfia = G.sconfitto ? -.22 : G.carica ? -.12 : G.avviso ? .05 + G.k * .12 + G.lampo * .03 : (viva ? .035 : .015) * sin(t * 1.7);
    const s = P.spina(NS, (u, p) => { const d = 1 - u; p.x = X1 + (X0 - X1) * d * lungo - cade * d * d * .5; p.y = Y1 + (Y0 - Y1) * d + (cade + dondola) * d * d; }, SU, GIU, { coda: .42, testa: .1 });
    for (let i = 0; i <= NS; i++) { const g = 1 + gonfia * sin(PI * i / NS); s.su[i] *= g; s.giu[i] *= g; }
    P.volume(c, s, K.pelle, { luce: [-.1, -1.2, 2], ombra: .13, dentro(cc) {
      P.fianco(cc, s, u => .46 + .08 * sin(u * 11), 1.4, K.velo);
      P.macchie(cc, s, { n: 8, seme: 3, u0: .04, u1: .8, v0: -.84, v1: .3, r0: .075, r1: .125, colore: K.anello, cuore: K.cuore, lungo: 1.1 });
      P.macchie(cc, s, { n: 12, seme: 8, u0: .05, u1: .9, v0: -.9, v1: .42, r0: .014, r1: .028, colore: K.nei, lungo: 1 });
    } });
    if (st.fine) P.bozzi(c, P.puntiSuSpina(s, 5, .14, .56, u => -.76 - .1 * sin(u * 29)), i => .03 + (i % 3) * .012, K.pelle);
    P.suSpina(s, .56, -.62, q); P.riflesso(c, q.x, q.y, .44, q.ang - .1, .13);

    // ---- 3. sotto la testa: l'ombra del collo, il sifone, la membrana fra le braccia, la bocca col becco
    P.ombra(c, HX - .3, HY - .12, .36, .5, .5, .34);
    c.beginPath(); c.ellipse(HX - .36, HY + .34, .16, .095, .75, 0, TAU); c.strokeStyle = SIFONE.bordo; c.lineWidth = .09; c.stroke(); c.fillStyle = viva ? SIFONE.base : K.sotto; c.fill();
    c.beginPath(); c.ellipse(HX - .44, HY + .41, .05, .07, .75, 0, TAU); c.fillStyle = SIFONE.bordo; c.fill();
    c.beginPath(); c.ellipse(CX + .1, CY + .1, .42, .38, .4, 0, TAU); c.strokeStyle = K.lontano.bordo; c.lineWidth = .1; c.stroke(); c.fillStyle = K.lontano.ombra; c.fill();
    c.beginPath(); c.ellipse(MX, MY, .2 + becco * .04, .23 + becco * .05, ASSE, 0, TAU); c.strokeStyle = LABBRO.bordo; c.lineWidth = .08; c.stroke(); c.fillStyle = viva ? LABBRO.base : K.sotto; c.fill();
    c.beginPath(); c.ellipse(MX + .02, MY + .01, .11 + becco * .06, .13 + becco * .09, ASSE, 0, TAU); c.fillStyle = '#5a0c34'; c.fill();
    P.corno(c, MX - .06, MY + .06, ASSE + .28 + becco * .55, .22, .18, BECCO, { curva: -.7 });
    P.corno(c, MX - .07, MY - .06, ASSE - .1 - becco * .4, .33, .23, BECCO, { curva: .75 });

    // ---- 4. le quattro braccia vicine
    for (let i = 0; i < 4; i++) braccio(c, VICINE[i], i * 2 + 1, K, st, true, q);

    // ---- 5. la testa: cornetti di pelle e bozzo dell'occhio (dietro), poi la palla della testa
    const ex = HX + .09, ey = HY - .17, irto = viva ? G.ira : -.5;
    P.corno(c, ex - .2, ey - .24, -PI / 2 - .55 + irto * .2, .17 + irto * .13, .14, K.pelle, { curva: -.3 });
    P.corno(c, ex + .01, ey - .3, -PI / 2 - .12 + irto * .32, .19 + irto * .16, .15, K.pelle, { curva: -.25 });
    c.beginPath(); c.ellipse(ex - .04, ey - .08, .32, .3, 0, 0, TAU); c.strokeStyle = K.pelle.bordo; c.lineWidth = .1; c.stroke(); c.fillStyle = K.pelle.chiara; c.fill();   // il bozzo dell'occhio: se ne vede solo l'orlo
    P.palla(c, HX, HY, .5, .46, -.15, K.pelle, { luce: [HX + .12, HY - .3, 1], ombra: .09 });
    if (viva) P.guancia(c, HX + .22, HY + .22, .2, '#ff4f8a', .3 + rosso * .05);
    if (st.fine) {
      P.solco(c, [HX - .3, HY - .14, HX - .37, HY + .05, HX - .32, HY + .25], K.pelle, .035);                           // la piega del collo
      P.bozzi(c, [HX - .17, HY + .22, HX - .05, HY + .32, HX + .33, HY + .04], .026, K.pelle);
    }

    // ---- 6. la faccia: occhione (dorato e socchiuso, oppure rosso e tagliato), sopracciglio, corona, stelline
    if (G.ira > .6) P.bagliore(c, ex, ey, .38, ROSSO, G.ira * .4);
    P.occhio(c, ex, ey, .25, Object.assign({ iride: G.ira ? '#ff3a1e' : '#ffd23c', pelle: K.pelle, tipo: 'barra', guarda: P.sguardo(o.sguardo, ex, ey) }, G.calmo ? CALMO : G.occhi));
    if (G.ira) P.sopracciglio(c, ex + .04, ey - .22, .54, .4 + G.ira * .2, K.pelle.bordo, .13);
    else if (G.giu) P.sopracciglio(c, ex, ey - .3, .42, -.35, K.pelle.bordo, .07);
    P.suSpina(s, .62, -1, q);
    P.corona(c, q.x - (G.sconfitto ? .2 : 0), q.y + .05, .23, q.ang - .45 - (G.sconfitto ? .7 : G.stordito ? .4 : 0));
    if (G.stordito) P.stelle(c, .1, -1.35, .5, t, 3, .11);
    c.restore();
  },
});
})();
