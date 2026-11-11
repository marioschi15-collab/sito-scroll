/* Boccone — pericolo: VECCHIA MINA. Una palla di ferro blu-acciaio dimenticata sul relitto: sette corni tutt'intorno e
   tre sul davanti, ognuno col suo cappuccio d'ottone; una fascia di rivetti, chiazze di ruggine che colano, conchiglie
   incrostate, un ciuffo d'alghe in cima e sotto un pezzo di catena spezzata che dondola. In mezzo ha la spia: un vetro
   rosso avvitato su una piastra.
   Dipende solo da o.fase (dondolio, catena, alghe, battito della spia) e da o.attivo: a riposo la spia è spenta; a metà
   si accende e lampeggia rossa; al massimo è incandescente, con i cappucci dei corni roventi e l'alone rosso tutt'intorno.
   I corni e la catena sono tracciati unici, senza attrezzi pesanti. 1 unità = il raggio che fa male.
   RITOCCATA PER LO STILE «FILM D'ANIMAZIONE»: corni, flange, piastra, catena e alghe non hanno più il contorno scuro spesso
   ma la linea sottile del loro colore scurito; i corni e la piastra sono modellati dalla luce (in alto a sinistra), i
   cappucci sono palline con la loro ombra, le alghe sfumano verso la punta, la ruggine ha l'alone morbido. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, min, round } = Math;

// ---- tinte: il ferro è un blu-acciaio (il buio lo fanno bordi e ombre), la ruggine è arancio, i cappucci d'ottone
const T = { ferro: P.tinta('#6c7cc4', '#28226a'), corno: P.tinta('#5868ae', '#221c5c'), piastra: P.tinta('#4c58a0', '#1c1850'), catena: P.tinta('#8490c4', '#28226a'),
  ottone: P.tinta('#ffc43a', '#d2571c'), rovente: P.tinta('#ff5a34', '#a0102c'), crema: P.tinta('#fff0d2', '#d8946a'), alga: P.tinta('#4cc670', '#0f5a52') };
const SPIA = [P.tinta('#a23c62', '#3a1048'), P.tinta('#ff4636', '#8a0f3c'), P.tinta('#ff7a2e', '#c0102a')];      // spenta · accesa · incandescente
const ROSSO = '#ff3a30', RUGGINE = P.alfa('#c4501c', .8), ALONE = P.alfa('#c4501c', .22), BRACE = P.alfa('#f39040', .85), SCOLO = P.alfa('#a43c1c', .42), FASCIA = P.alfa(T.ferro.bordo, .42), FILO = P.alfa(T.ferro.luce, .45);
const ALGA = P.alfa(T.alga.base, .94), ALGA_PUNTA = P.alfa(T.alga.luce, .9), LUME = P.alfa(T.corno.luce, .55);
const RS = .78, R0 = .66, R1 = .99, HW = .085, LX = 0, LY = .03;                    // raggio della sfera · radice, cima e mezza larghezza dei corni · centro della spia
const CORNI = [2.46, 3.24, -2.26, -1.47, -.69, .1, .89];                            // i sette corni del contorno (sotto c'è la catena)
const FRONTE = [[-.17, -.53], [.53, -.17], [-.54, .16]];                            // i tre corni del davanti
const CIME = [], CIME_FRONTE = [], RIVETTI = [], BULLONI = [];
for (const a of CORNI) CIME.push(cos(a) * R1, sin(a) * R1);
for (const p of FRONTE) { const d = Math.hypot(p[0], p[1]); CIME_FRONTE.push(p[0] + p[0] / d * .17, p[1] + p[1] / d * .17); }
for (let i = 0; i < 9; i++) { const a = .22 + (PI - .44) * i / 8; RIVETTI.push(cos(a) * (RS - .05), -.03 + sin(a) * .25); }
for (let i = 0; i < 6; i++) BULLONI.push(LX + cos(i * TAU / 6 + .3) * .255, LY + sin(i * TAU / 6 + .3) * .255);
const CATENA_LUME = P.alfa(T.catena.luce, .85);
const MACCHIE = [[-.46, -.32, .17], [-.24, .52, .2], [.5, .3, .15], [.2, -.6, .11], [-.64, .1, .09], [.6, -.3, .08], [.08, .56, .07]];   // la ruggine: x, y, raggio
const CONCHIGLIE = [-.36, .34, -.47, .43, -.3, .46, .44, .52, .52, .43], RAGGI_CONCHIGLIE = [.055, .04, .034, .045, .032];

/* I corni del contorno, tutti in un tracciato: mozziconi di ferro con la linea sottile, che sfumano dal buio della radice
   alla cima e schiariscono dalla parte della luce (il centro della sfumatura è spostato verso l'ombra). */
function corni(c) {
  c.beginPath();
  for (const a of CORNI) {
    const ca = cos(a), sa = sin(a), hx = -sa * HW, hy = ca * HW;
    c.moveTo(ca * R0 + hx, sa * R0 + hy); c.lineTo(ca * R1 + hx, sa * R1 + hy); c.lineTo(ca * R1 - hx, sa * R1 - hy); c.lineTo(ca * R0 - hx, sa * R0 - hy); c.closePath();
  }
  const g = c.createRadialGradient(.14, .36, R0 * .3, 0, 0, R1 + .06);
  g.addColorStop(0, T.corno.scura); g.addColorStop(.5, T.corno.ombra); g.addColorStop(.78, T.corno.base); g.addColorStop(1, T.corno.luce);
  c.lineJoin = 'round'; c.strokeStyle = T.corno.linea; c.lineWidth = .055; c.stroke(); c.fillStyle = g; c.fill();
}
/* I cappucci in cima ai corni: palline d'ottone (o di ferro rovente) in quattro passate per tutti: la linea sottile
   (scivolata verso l'ombra), l'ombra, il colore pieno spostato verso la luce, la lucina. */
function cappucci(c, p, r, t) {
  for (let passata = 0; passata < 4; passata++) {
    const rr = passata === 0 ? r + .022 : passata === 1 ? r : passata === 2 ? r * .8 : r * .3, dx = passata === 0 ? .008 : passata === 2 ? -r * .14 : passata === 3 ? -r * .3 : 0, dy = passata === 0 ? .014 : passata === 2 ? -r * .18 : passata === 3 ? -r * .4 : 0;
    c.beginPath();
    for (let i = 0; i < p.length; i += 2) { c.moveTo(p[i] + dx + rr, p[i + 1] + dy); c.arc(p[i] + dx, p[i + 1] + dy, rr, 0, TAU); }
    c.fillStyle = passata === 0 ? t.linea : passata === 1 ? t.ombra : passata === 2 ? t.base : t.luce; c.fill();
  }
}
/* Il pezzo di catena: la staffa sotto la sfera, anelli visti di faccia e di taglio, l'ultimo spezzato. Dondola in ritardo. */
function catena(c, F) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let passata = 0; passata < 3; passata++) {
    const d = passata === 2 ? -.017 : 0;
    c.beginPath(); c.moveTo(-.09 + d, .74 + d); c.arc(d, .79 + d, .09, PI, 0, true);
    for (let i = 0; i < 5; i++) {
      const y = .97 + i * .19 + d, x = sin(F - i * .7) * .02 * (i + 1) + d;
      if (i === 4) { c.moveTo(x + cos(.6) * .07, y + sin(.6) * .1); c.ellipse(x, y, .07, .1, 0, .6, TAU - 1.2); }
      else if (i % 2) { c.moveTo(x + .07, y); c.ellipse(x, y, .07, .115, 0, 0, TAU); }
      else { c.moveTo(x, y - .1); c.lineTo(x, y + .1); }
    }
    c.strokeStyle = passata === 0 ? T.catena.linea : passata === 1 ? T.catena.base : CATENA_LUME;
    c.lineWidth = passata === 0 ? .108 : passata === 1 ? .064 : .02; c.stroke();
  }
}
/* Il ciuffo d'alghe in cima: tre foglie in un tracciato, che ondeggiano: linea sottile, verde che schiarisce verso la punta. */
function ciuffo(c, F) {
  c.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = -2.03 + i * .17, l = .32 + (i % 2) * .12, on = sin(F + i * 1.3) * .22, bx = cos(a) * .7, by = sin(a) * .7, nx = -sin(a) * .06, ny = cos(a) * .06;
    const mx = bx + cos(a) * l * .55, my = by + sin(a) * l * .55, tx = bx + cos(a + on) * l, ty = by + sin(a + on) * l;
    c.moveTo(bx - nx, by - ny); c.quadraticCurveTo(mx - nx * 1.5, my - ny * 1.5, tx, ty); c.quadraticCurveTo(mx + nx * 1.5, my + ny * 1.5, bx + nx, by + ny); c.closePath();
  }
  const g = c.createLinearGradient(-.3, -.62, -.5, -1.12); g.addColorStop(0, T.alga.scura); g.addColorStop(.4, ALGA); g.addColorStop(1, ALGA_PUNTA);
  c.lineJoin = 'round'; c.strokeStyle = T.alga.linea; c.lineWidth = .045; c.stroke(); c.fillStyle = g; c.fill();
}

B.specie.registra({
  id: 'mina',
  descrizione: 'Una vecchia mina dimenticata accanto al relitto, tutta ruggine e conchiglie. Se la spia rossa comincia a lampeggiare, allontanati in fretta!',
  forma: { lx: 1, ly: 1 },
  ingombro: { x0: -1.16, y0: -1.19, x1: 1.19, y1: 1.94 },
  disegna(c, o) {
    const F = (o.fase || 0) * TAU, at = max(0, min(1, o.attivo || 0)), liv = round(at * 2);
    const lume = at * (.62 + .38 * cos(F * 4));                                     // la spia batte: più è armata, più resta accesa
    c.save();
    if (at > .02) P.bagliore(c, 0, 0, 1.2, ROSSO, .16 + .42 * lume);                // l'alone rosso dell'allarme

    // ---- 1. sotto: la catena, che dondola per conto suo
    catena(c, F);
    c.rotate(sin(F) * .05);

    // ---- 2. dietro: il ciuffo d'alghe, i corni del contorno coi loro cappucci (roventi quando sta per scoppiare)
    ciuffo(c, F);
    corni(c);
    cappucci(c, CIME, .1, liv === 2 ? T.rovente : T.ottone);
    if (liv === 2) P.lucine(c, CIME, .045, ROSSO, .9);

    // ---- 3. la sfera: fascia e giunta, ruggine che cola; sopra rivetti, conchiglie e il riflesso
    P.palla(c, 0, 0, RS, RS, 0, T.ferro, { luce: [.26, -.36, 1.4], ombra: .1, dentro(cc) {
      cc.lineCap = 'round';
      cc.beginPath(); cc.ellipse(0, -.03, RS + .03, .25, 0, 0, PI); cc.strokeStyle = FASCIA; cc.lineWidth = .15; cc.stroke();
      cc.beginPath(); cc.ellipse(0, -.1, RS + .03, .25, 0, .1, PI - .1); cc.moveTo(-.12, -RS); cc.ellipse(-.12, 0, .3, RS + .03, 0, -PI / 2, PI / 2, true); cc.strokeStyle = FILO; cc.lineWidth = .028; cc.stroke();
      cc.beginPath(); for (const m of MACCHIE) if (m[2] > .1) cc.rect(m[0] - m[2] * .28, m[1], m[2] * .56, m[2] * 2.3);
      cc.fillStyle = SCOLO; cc.fill();
      for (let giro = 0; giro < 2; giro++) {                          // la ruggine: un alone largo e leggero, poi la chiazza
        const k = giro ? 1 : 1.5;
        cc.beginPath(); for (const m of MACCHIE) { cc.moveTo(m[0] + m[2] * 1.15 * k, m[1]); cc.ellipse(m[0], m[1], m[2] * 1.15 * k, m[2] * k, .3, 0, TAU); }
        cc.fillStyle = giro ? RUGGINE : ALONE; cc.fill();
      }
      cc.beginPath(); for (const m of MACCHIE) { cc.moveTo(m[0] + m[2] * .5, m[1] - m[2] * .15); cc.arc(m[0] + m[2] * .1, m[1] - m[2] * .15, m[2] * .42, 0, TAU); }
      cc.fillStyle = BRACE; cc.fill();
      if (liv) { cc.beginPath(); cc.arc(0, 0, RS, 0, TAU); cc.fillStyle = P.sfumaturaRossa || (liv === 2 ? 'rgba(255,40,30,.3)' : 'rgba(255,40,30,.14)'); cc.fill(); }
    } });
    P.bozzi(c, RIVETTI, .034, T.ferro);
    if (P.fine(o)) P.bozzi(c, CONCHIGLIE, i => RAGGI_CONCHIGLIE[i], T.crema);
    P.riflesso(c, .36, -.5, .32, .72, .14);

    // ---- 4. davanti: i tre corni che puntano verso chi guarda, ognuno sulla sua flangia
    c.beginPath(); for (const p of FRONTE) { c.moveTo(p[0] + .14, p[1]); c.arc(p[0], p[1], .14, 0, TAU); }
    c.strokeStyle = T.piastra.linea; c.lineWidth = .045; c.stroke(); c.fillStyle = T.piastra.base; c.fill();
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      const p = FRONTE[i], tx = CIME_FRONTE[i * 2], ty = CIME_FRONTE[i * 2 + 1], d = Math.hypot(tx - p[0], ty - p[1]), hx = -(ty - p[1]) / d * HW, hy = (tx - p[0]) / d * HW;
      c.moveTo(p[0] + hx, p[1] + hy); c.lineTo(tx + hx, ty + hy); c.lineTo(tx - hx, ty - hy); c.lineTo(p[0] - hx, p[1] - hy); c.closePath();
    }
    c.lineJoin = 'round'; c.strokeStyle = T.corno.linea; c.lineWidth = .05; c.stroke(); c.fillStyle = T.corno.base; c.fill();
    c.beginPath(); for (let i = 0; i < 3; i++) { const p = FRONTE[i]; c.moveTo(p[0] - .045, p[1] - .04); c.lineTo(CIME_FRONTE[i * 2] - .045, CIME_FRONTE[i * 2 + 1] - .04); }       // il filo di luce sul fianco in alto a sinistra
    c.lineCap = 'round'; c.strokeStyle = LUME; c.lineWidth = .03; c.stroke();
    cappucci(c, CIME_FRONTE, .105, liv === 2 ? T.rovente : T.ottone);
    if (liv === 2) P.lucine(c, CIME_FRONTE, .05, ROSSO, .9);

    // ---- 5. la spia: piastra avvitata, vetro rosso che si accende, il suo bagliore
    P.ombra(c, LX + .03, LY + .07, .38, .38, 0, .4);
    const gp = c.createLinearGradient(LX - .12, LY - .3, LX + .12, LY + .3); gp.addColorStop(0, T.piastra.chiara); gp.addColorStop(.45, T.piastra.base); gp.addColorStop(1, T.piastra.scura);
    c.beginPath(); c.arc(LX, LY, .31, 0, TAU); c.strokeStyle = T.piastra.linea; c.lineWidth = .05; c.stroke(); c.fillStyle = gp; c.fill();
    c.beginPath(); c.arc(LX, LY, .2, 0, TAU); c.fillStyle = T.piastra.bordo; c.fill();
    P.bozzi(c, BULLONI, .03, T.piastra);
    P.palla(c, LX, LY, .165, .165, 0, SPIA[liv], { luce: [LX + .05, LY - .07, .3], ombra: .03, bordo: .03 });
    if (at > .02) { P.bagliore(c, LX, LY, .34 + .3 * lume, ROSSO, min(1, .35 + lume)); c.beginPath(); c.arc(LX, LY, .05 + .05 * lume, 0, TAU); c.fillStyle = 'rgba(255,244,214,.9)'; c.fill(); }
    P.riflesso(c, LX + .05, LY - .09, .11, .6, .2);
    c.restore();
  },
});
})();
