/* Boccone — pericolo: VECCHIA MINA. Una palla di ferro blu-acciaio dimenticata sul relitto: sette corni tutt'intorno e
   tre sul davanti, ognuno col suo cappuccio d'ottone; una fascia di rivetti, chiazze di ruggine che colano, conchiglie
   incrostate, un ciuffo d'alghe in cima e sotto un pezzo di catena spezzata che dondola. In mezzo ha la spia: un vetro
   rosso avvitato su una piastra.
   Dipende solo da o.fase (dondolio, catena, alghe, battito della spia) e da o.attivo: a riposo la spia è spenta; a metà
   si accende e lampeggia rossa; al massimo è incandescente, con i cappucci dei corni roventi e l'alone rosso tutt'intorno.
   I corni e la catena sono tracciati unici, senza attrezzi pesanti. 1 unità = il raggio che fa male. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, min, round } = Math;

// ---- tinte: il ferro è un blu-acciaio (il buio lo fanno bordi e ombre), la ruggine è arancio, i cappucci d'ottone
const T = { ferro: P.tinta('#6c7cc4', '#28226a'), corno: P.tinta('#5868ae', '#221c5c'), piastra: P.tinta('#4c58a0', '#1c1850'), catena: P.tinta('#8490c4', '#28226a'),
  ottone: P.tinta('#ffc43a', '#d2571c'), rovente: P.tinta('#ff5a34', '#a0102c'), crema: P.tinta('#fff0d2', '#d8946a'), alga: P.tinta('#4cc670', '#0f5a52') };
const SPIA = [P.tinta('#a23c62', '#3a1048'), P.tinta('#ff4636', '#8a0f3c'), P.tinta('#ff7a2e', '#c0102a')];      // spenta · accesa · incandescente
const ROSSO = '#ff3a30', RUGGINE = P.alfa('#c4501c', .82), BRACE = P.alfa('#f39040', .85), SCOLO = P.alfa('#a43c1c', .5), FASCIA = P.alfa(T.ferro.bordo, .42), FILO = P.alfa(T.ferro.luce, .45);
const RS = .78, R0 = .66, R1 = .99, HW = .085, LX = 0, LY = .03;                    // raggio della sfera · radice, cima e mezza larghezza dei corni · centro della spia
const CORNI = [2.46, 3.24, -2.26, -1.47, -.69, .1, .89];                            // i sette corni del contorno (sotto c'è la catena)
const FRONTE = [[-.17, -.53], [.53, -.17], [-.54, .16]];                            // i tre corni del davanti
const CIME = [], CIME_FRONTE = [], RIVETTI = [], BULLONI = [];
for (const a of CORNI) CIME.push(cos(a) * R1, sin(a) * R1);
for (const p of FRONTE) { const d = Math.hypot(p[0], p[1]); CIME_FRONTE.push(p[0] + p[0] / d * .17, p[1] + p[1] / d * .17); }
for (let i = 0; i < 9; i++) { const a = .22 + (PI - .44) * i / 8; RIVETTI.push(cos(a) * (RS - .05), -.03 + sin(a) * .25); }
for (let i = 0; i < 6; i++) BULLONI.push(LX + cos(i * TAU / 6 + .3) * .255, LY + sin(i * TAU / 6 + .3) * .255);
const MACCHIE = [[-.46, -.32, .17], [-.24, .52, .2], [.5, .3, .15], [.2, -.6, .11], [-.64, .1, .09], [.6, -.3, .08], [.08, .56, .07]];   // la ruggine: x, y, raggio
const CONCHIGLIE = [-.36, .34, -.47, .43, -.3, .46, .44, .52, .52, .43], RAGGI_CONCHIGLIE = [.055, .04, .034, .045, .032];

/* I corni del contorno, tutti in un tracciato: mozziconi di ferro che sfumano dal buio della radice alla cima. */
function corni(c) {
  c.beginPath();
  for (const a of CORNI) {
    const ca = cos(a), sa = sin(a), hx = -sa * HW, hy = ca * HW;
    c.moveTo(ca * R0 + hx, sa * R0 + hy); c.lineTo(ca * R1 + hx, sa * R1 + hy); c.lineTo(ca * R1 - hx, sa * R1 - hy); c.lineTo(ca * R0 - hx, sa * R0 - hy); c.closePath();
  }
  const g = c.createRadialGradient(0, 0, R0, 0, 0, R1 + .06);
  g.addColorStop(0, T.corno.scura); g.addColorStop(.55, T.corno.base); g.addColorStop(1, T.corno.chiara);
  c.lineJoin = 'round'; c.strokeStyle = T.corno.bordo; c.lineWidth = .1; c.stroke(); c.fillStyle = g; c.fill();
}
/* I cappucci in cima ai corni: bordo, ottone (o ferro rovente) e lucina, tre passate per tutti. */
function cappucci(c, p, r, t) {
  for (let passata = 0; passata < 3; passata++) {
    const rr = passata === 0 ? r + .045 : passata === 1 ? r : r * .34, d = passata === 2 ? r * .34 : 0;
    c.beginPath();
    for (let i = 0; i < p.length; i += 2) { c.moveTo(p[i] + d + rr, p[i + 1] - d); c.arc(p[i] + d, p[i + 1] - d, rr, 0, TAU); }
    c.fillStyle = passata === 0 ? t.bordo : passata === 1 ? t.base : t.luce; c.fill();
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
    c.strokeStyle = passata === 0 ? T.catena.bordo : passata === 1 ? T.catena.base : P.alfa(T.catena.luce, .85);
    c.lineWidth = passata === 0 ? .125 : passata === 1 ? .062 : .02; c.stroke();
  }
}
/* Il ciuffo d'alghe in cima: tre foglie in un tracciato, che ondeggiano. */
function ciuffo(c, F) {
  c.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = -2.03 + i * .17, l = .32 + (i % 2) * .12, on = sin(F + i * 1.3) * .22, bx = cos(a) * .7, by = sin(a) * .7, nx = -sin(a) * .06, ny = cos(a) * .06;
    const mx = bx + cos(a) * l * .55, my = by + sin(a) * l * .55, tx = bx + cos(a + on) * l, ty = by + sin(a + on) * l;
    c.moveTo(bx - nx, by - ny); c.quadraticCurveTo(mx - nx * 1.5, my - ny * 1.5, tx, ty); c.quadraticCurveTo(mx + nx * 1.5, my + ny * 1.5, bx + nx, by + ny); c.closePath();
  }
  c.lineJoin = 'round'; c.strokeStyle = T.alga.bordo; c.lineWidth = .075; c.stroke(); c.fillStyle = T.alga.base; c.fill();
}

B.specie.registra({
  id: 'mina',
  descrizione: 'Una vecchia mina dimenticata accanto al relitto, tutta ruggine e conchiglie. Se la spia rossa comincia a lampeggiare, allontanati in fretta!',
  forma: { lx: 1, ly: 1 },
  ingombro: { x0: -1.25, y0: -1.25, x1: 1.25, y1: 2 },
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
      cc.beginPath(); for (const m of MACCHIE) { cc.moveTo(m[0] + m[2] * 1.15, m[1]); cc.ellipse(m[0], m[1], m[2] * 1.15, m[2], .3, 0, TAU); }
      cc.fillStyle = RUGGINE; cc.fill();
      cc.beginPath(); for (const m of MACCHIE) { cc.moveTo(m[0] + m[2] * .5, m[1] - m[2] * .15); cc.arc(m[0] + m[2] * .1, m[1] - m[2] * .15, m[2] * .42, 0, TAU); }
      cc.fillStyle = BRACE; cc.fill();
      if (liv) { cc.beginPath(); cc.arc(0, 0, RS, 0, TAU); cc.fillStyle = P.sfumaturaRossa || (liv === 2 ? 'rgba(255,40,30,.3)' : 'rgba(255,40,30,.14)'); cc.fill(); }
    } });
    P.bozzi(c, RIVETTI, .034, T.ferro);
    if (P.fine(o)) P.bozzi(c, CONCHIGLIE, i => RAGGI_CONCHIGLIE[i], T.crema);
    P.riflesso(c, .36, -.5, .32, .72, .14);

    // ---- 4. davanti: i tre corni che puntano verso chi guarda, ognuno sulla sua flangia
    c.beginPath(); for (const p of FRONTE) { c.moveTo(p[0] + .14, p[1]); c.arc(p[0], p[1], .14, 0, TAU); }
    c.strokeStyle = T.piastra.bordo; c.lineWidth = .07; c.stroke(); c.fillStyle = T.piastra.base; c.fill();
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      const p = FRONTE[i], tx = CIME_FRONTE[i * 2], ty = CIME_FRONTE[i * 2 + 1], d = Math.hypot(tx - p[0], ty - p[1]), hx = -(ty - p[1]) / d * HW, hy = (tx - p[0]) / d * HW;
      c.moveTo(p[0] + hx, p[1] + hy); c.lineTo(tx + hx, ty + hy); c.lineTo(tx - hx, ty - hy); c.lineTo(p[0] - hx, p[1] - hy); c.closePath();
    }
    c.lineJoin = 'round'; c.strokeStyle = T.corno.bordo; c.lineWidth = .09; c.stroke(); c.fillStyle = T.corno.base; c.fill();
    cappucci(c, CIME_FRONTE, .105, liv === 2 ? T.rovente : T.ottone);
    if (liv === 2) P.lucine(c, CIME_FRONTE, .05, ROSSO, .9);

    // ---- 5. la spia: piastra avvitata, vetro rosso che si accende, il suo bagliore
    P.ombra(c, LX + .03, LY + .07, .38, .38, 0, .4);
    c.beginPath(); c.arc(LX, LY, .31, 0, TAU); c.strokeStyle = T.piastra.bordo; c.lineWidth = .09; c.stroke(); c.fillStyle = T.piastra.base; c.fill();
    c.beginPath(); c.arc(LX, LY, .2, 0, TAU); c.fillStyle = T.piastra.bordo; c.fill();
    P.bozzi(c, BULLONI, .03, T.piastra);
    P.palla(c, LX, LY, .165, .165, 0, SPIA[liv], { luce: [LX + .05, LY - .07, .3], ombra: .03, bordo: .03 });
    if (at > .02) { P.bagliore(c, LX, LY, .34 + .3 * lume, ROSSO, min(1, .35 + lume)); c.beginPath(); c.arc(LX, LY, .05 + .05 * lume, 0, TAU); c.fillStyle = 'rgba(255,244,214,.9)'; c.fill(); }
    P.riflesso(c, LX + .05, LY - .09, .11, .6, .2);
    c.restore();
  },
});
})();
