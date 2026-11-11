/* Boccone — eroe: ZANNA, lo squaletto. Di profilo: un siluro paffuto azzurro con la pancia bianca, il muso tondo che
   sporge sopra la bocca, e il suo marchio: il ghigno sempre socchiuso con i dentini in vista (la mandibola è incernierata
   e si spalanca per il morso). Occhio ambra, guancia rosa con la fossetta, pinne piene a lama, coda a falce.
   Tre stadi: cucciolo corto e tondo con tre dentini e le pinnette arrotondate; adulto affusolato con il sopracciglio
   da sbruffone; colosso dal petto largo e il dorso scuro, pinna alta, zanne irregolari e lo sfregio ricucito sull'occhio.
   Quattro espressioni: di gioia strizza l'occhio e spalanca il ghigno scodinzolando; di paura si ingobbisce, abbassa la
   pinna, stringe le pettorali e batte i denti; colpito resta a bocca aperta con le pinne flosce.
   RITOCCATO PER LO STILE «FILM D'ANIMAZIONE»: l'azzurro del corpo ha un'ombra indaco più decisa (dichiarata nelle tinte),
   così senza contorno scuro stacca dall'acqua blu; la pancia bianca è tonda (ombra fredda azzurra) e da sotto prende il
   colore dell'acqua; la pinna del dorso ha il filo di controluce; lo sfregio è più fine.
   Il battito di ciglia non è più deciso dal modello (o.t): lo guida P.battito da chi lo disegna dal vivo. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI;
const { sin, cos, max, min } = Math;

// ---- tinte e misure dei tre stadi: tutto ciò che cambia crescendo sta qui, il disegno è uno solo
const INDACO = '#2b22b6', BLU = c => P.tinta(c, INDACO), BIANCO = P.tinta('#f8fcff', '#7a9cf2');
const IRIDE = '#ff931c', ROSA = '#ff5f93', SFREGIO = '#ffe3ec', ACQUA = '#8fe6ff';
/* x0, x1, testa: la spina dal codino al muso e la calotta del muso; cu, cv: la cerniera della mandibola sulla spina;
   mang, mand, malt: direzione, lunghezza e spessore della mandibola (segue il labbro); lu0, lu1: il tratto dei denti di sopra;
   nd, ld: quanti denti e quanto lunghi; dors, coda, pett: grandezza della pinna del dorso, della coda, delle pettorali. */
const STADI = [
  { x0: -.56, x1: .78, testa: .34, onda: { amp: .1, onde: .5, testa: .14, potenza: 1.5 },
    su: P.sagoma([[0, .1], [.16, .3], [.38, .58], [.6, .72], [.8, .68], [.93, .52], [1, .34]]),
    giu: P.sagoma([[0, .1], [.16, .3], [.38, .56], [.58, .66], [.68, .6], [.75, .46], [.84, .4], [.93, .36], [1, .32]]),
    corpo: BLU('#7cb4ff'), occhio: .3, eu: .78, ev: -.22, cu: .74, cv: .85, mang: -.3, mand: .44, malt: .17, lu0: .79, lu1: .985, nd: 3, ld: .11, br: 2,
    dors: .36, coda: .6, pett: .6, tondo: .36, falce: .05, sguardo: { palpebra: .05, brillio: 1.25, pupilla: 1.15 } },
  { x0: -.9, x1: .84, testa: .28, onda: { amp: .12, onde: .55, testa: .12, potenza: 1.6 },
    su: P.sagoma([[0, .09], [.14, .22], [.34, .46], [.55, .62], [.72, .64], [.86, .54], [.95, .38], [1, .26]]),
    giu: P.sagoma([[0, .09], [.14, .21], [.34, .42], [.54, .56], [.66, .56], [.74, .44], [.83, .36], [.92, .3], [1, .25]]),
    corpo: BLU('#5a94f6'), occhio: .27, eu: .82, ev: -.28, cu: .73, cv: .85, mang: -.34, mand: .55, malt: .19, lu0: .77, lu1: .985, nd: 5, ld: .12, br: 3,
    dors: .5, coda: .8, pett: .82, tondo: .18, falce: .16, sguardo: { palpebra: .12, taglio: .14, sotto: .12, pupilla: 1.15 } },
  { x0: -.96, x1: .88, testa: .26, onda: { amp: .12, onde: .55, testa: .1, potenza: 1.7 },
    su: P.sagoma([[0, .1], [.12, .22], [.3, .48], [.5, .68], [.68, .72], [.84, .58], [.94, .4], [1, .26]]),
    giu: P.sagoma([[0, .1], [.12, .22], [.3, .42], [.5, .58], [.64, .6], [.73, .47], [.82, .38], [.92, .31], [1, .25]]),
    corpo: BLU('#4274e4'), occhio: .23, eu: .85, ev: -.3, cu: .72, cv: .85, mang: -.36, mand: .61, malt: .22, lu0: .76, lu1: .985, nd: 6, ld: .15, br: 3,
    dors: .66, coda: .95, pett: 1, tondo: .12, falce: .2, sguardo: { palpebra: .26, taglio: .3, sotto: .08, pupilla: 1.1 } },
];
for (const K of STADI) {
  K.pinna = P.tinta(P.mescola(K.corpo.base, INDACO, .26), '#2a1f9c'); K.lontana = P.tinta(K.corpo.scura, '#241a78');
  K.mento = Object.assign({}, BIANCO, { bordo: K.corpo.bordo });      // la mandibola è bianca ma ha il bordo scuro del corpo
  K.dorso = P.alfa(K.corpo.bordo, .24); K.neo = P.alfa(K.corpo.bordo, .75);
}
const PAURA = Object.assign({ raggioIride: .54 }, P.SGUARDI.spaventato);

/* Lo sfregio ricucito del colosso: una riga da (x0, y0) a (x1, y1) con i punti di sutura di traverso alle quote `punti`. */
const sfregio = (c, x0, y0, x1, y1, punti, scuro) => {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d * .055, ny = dx / d * .055;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
  for (const k of punti) { c.moveTo(x0 + dx * k - nx, y0 + dy * k - ny); c.lineTo(x0 + dx * k + nx, y0 + dy * k + ny); }
  c.lineCap = 'round'; c.strokeStyle = scuro; c.lineWidth = .072; c.stroke(); c.strokeStyle = SFREGIO; c.lineWidth = .036; c.stroke();
};
const SOTTO = [.55], SOPRA = [];

B.eroi.registra({
  id: 'zanna',
  descrizione: 'Uno squaletto sfrontato che sorride sempre, anche perché i denti non riesce proprio a nasconderli. Gli squali li cambiano per tutta la vita: quando ne cade uno, dietro ce n\'è già un altro pronto.',
  ingombro: { x0: -1.92, y0: -1.5, x1: 1.3, y1: 1.08 },
  disegna(c, o) {
    const st = max(0, min(2, o.stadio | 0)), K = STADI[st], esp = o.espressione || 'normale', fase = o.fase || 0, F = fase * TAU, t = o.t || 0, b = max(0, min(1, o.bocca || 0));
    const paura = esp === 'spaventato', colpito = esp === 'colpito', felice = esp === 'felice';
    const rema = sin(F * 2 + .4), q = {}, bordo = K.corpo.bordo;
    c.save();
    if (paura) c.translate(sin(t * 41) * .012, 0);                   // trema
    c.rotate(sin(F) * .025 + (colpito ? -.13 : 0));
    // di paura si ingobbisce (muso e coda giù), il colpo lo piega al contrario
    const s = P.spinaPesce(14, K.x0, K.x1, fase, K.onda, K.su, K.giu, { testa: K.testa, coda: .03, arco: paura ? -.07 : colpito ? .06 : 0 });

    // ---- 1. dietro al corpo: pettorale lontana, coda a due lame, pinnette, la pinna del dorso, la mandibola con i denti di sotto
    const kp = K.pett, pu = K.cu - .18;
    const f0 = P.suSpina(s, pu + .1, .72), f1 = P.suSpina(s, pu - .03, .78);
    P.lama(c, { x0: f0.x, y0: f0.y, x1: f1.x, y1: f1.y, px: f1.x - (paura ? .34 : .16) * kp, py: f1.y + (paura ? .12 : .4) * kp - rema * .03, tondo: K.tondo, tinta: K.lontana });
    P.suSpina(s, 0, 0, q);
    const ac = q.ang + sin(F - 1.1) * .32 + (felice ? sin(t * 12) * .14 : 0), cx = cos(ac) * K.coda, cy = sin(ac) * K.coda;      // la coda sbatte in ritardo sul corpo; di gioia scodinzola
    const X = (a, d) => q.x + cx * a - cy * d, Y = (a, d) => q.y + cy * a + cx * d;                // a = lungo la coda (indietro se negativo), d = di traverso (su se negativo)
    P.lama(c, { x0: X(.28, .1), y0: Y(.28, .1), x1: X(-.26, -.04), y1: Y(-.26, -.04), px: X(-.48, .5), py: Y(-.48, .5), tinta: K.pinna, davanti: .16, dietro: K.falce * .8, tondo: K.tondo });
    P.lama(c, { x0: X(.32, -.1), y0: Y(.32, -.1), x1: X(-.24, .13), y1: Y(-.24, .13), px: X(-.72, -.7), py: Y(-.72, -.7), tinta: K.pinna, davanti: .2, dietro: K.falce * .8, tondo: K.tondo });
    if (st) { const a0 = P.suSpina(s, .24, -.8), a1 = P.suSpina(s, .13, -.8); P.lama(c, { x0: a0.x, y0: a0.y, x1: a1.x, y1: a1.y, px: a1.x - .13, py: a1.y - .1 - st * .07, tinta: K.pinna }); }
    const v0 = P.suSpina(s, .36, .85), v1 = P.suSpina(s, .25, .85);
    P.lama(c, { x0: v0.x, y0: v0.y, x1: v1.x, y1: v1.y, px: v1.x - .12, py: v1.y + .14 + kp * .12, tondo: K.tondo, tinta: K.lontana });
    const d0 = P.suSpina(s, .66, -.85), d1 = P.suSpina(s, .38, -.85), giu = paura ? .55 : colpito ? .25 : 0;      // la pinna del dorso: si abbassa con la paura
    P.lama(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, px: d1.x - .1 - giu * .3 + sin(F - .6) * .03, py: d1.y - K.dors * (1 - giu * .6) - (felice ? .05 : 0), tinta: K.pinna, davanti: .16, dietro: K.falce, tondo: K.tondo, ombra: .06 });
    const ce = P.suSpina(s, K.cu, K.cv);
    const apri = paura ? .3 + sin(t * 30) * .07 : colpito ? .5 : (felice ? max(b, .5) : b) * .58 + .26;       // il ghigno resta sempre socchiuso
    const ge = P.fauci(c, { x: ce.x, y: ce.y, ang: ce.ang + K.mang, lung: K.mand, apri, alt: K.malt, su: .3, tinta: K.mento, interno: '#8a1240', lingua: '#ff7d9c' });
    P.denti(c, ge.x0 + (ge.x1 - ge.x0) * .3, ge.y0 + (ge.y1 - ge.y0) * .3, ge.x1, ge.y1, K.nd - 1, K.ld * .85, 1, { tipo: 'punta', varia: st === 2 ? .25 : 0 });

    // ---- 2. il corpo: dorso più scuro da grande, pancia bianca; sopra, le branchie e il riflesso
    P.volume(c, s, K.corpo, { luce: [.35, -.5, 2], ombra: .07, dentro(cc) {
      if (st) P.fianco(cc, s, -1.4, u => -.52 + .1 * sin(u * 9), K.dorso);
      P.fianco(cc, s, u => .2 + .1 * sin(u * 6.5 + .8) + max(0, u - .62) * 1.5, 1.4, P.sfumatura(cc, BIANCO, [.3, .12, 1.8]));      // il bianco (tondo, con l'ombra azzurra) si stringe verso il labbro: il muso resta azzurro
      P.guancia(cc, .05, .62, .5, ACQUA, .22);                        // da sotto, il colore dell'acqua
    } });
    P.anelli(c, s, K.cu - .13, K.cu - .23, K.br, K.corpo, { v0: -.4, v1: .2, curva: .012, spess: .032 });
    P.suSpina(s, .68, -.62, q); P.riflesso(c, q.x, q.y, .4, q.ang - .05, .12);
    if (st === 2 && P.fine(o)) P.solco(c, P.puntiSuSpina(s, 4, .14, .5, -.08), K.corpo, .03);      // la linea del fianco: muscoli da nuotatore

    // ---- 3. sul fianco: la pettorale a lama, con la sua ombra
    const p0 = P.suSpina(s, pu + .07, .45), p1 = P.suSpina(s, pu - .08, .58);
    const dx = paura ? -.56 : colpito ? -.08 : felice ? -.3 + sin(t * 9) * .05 : -.38, dy = paura ? .12 : colpito ? .52 : felice ? .5 + sin(t * 9) * .08 : .46 + rema * .06;
    P.ombra(c, p1.x + .04, p1.y + .12, .34 * kp, .14, .45, .28);
    P.lama(c, { x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, px: p1.x + dx * kp, py: p1.y + dy * kp, tinta: K.pinna, luce: [p0.x - .05, p0.y - .05, 1.1 * kp], davanti: .14, dietro: K.falce, tondo: K.tondo });

    // ---- 4. la faccia: denti di sopra, guancia con la fossetta, sfregio, occhio, sopracciglio, narice
    const u0 = P.suSpina(s, K.lu0, 1), u1 = P.suSpina(s, K.lu1, 1);
    P.denti(c, u0.x, u0.y - .012, u1.x, u1.y - .012, K.nd, K.ld, -1, { tipo: 'punta', varia: st === 2 ? .3 : 0, seme: 7 });
    P.guancia(c, ce.x - .02, ce.y - .2, .24, ROSA, paura ? .25 : felice ? .9 : .6);
    c.beginPath(); c.moveTo(ce.x + .03, ce.y - .01); c.quadraticCurveTo(ce.x - .05, ce.y - .01, ce.x - .09, ce.y - .11);       // l'angolo della bocca tirato in su: il ghigno
    c.lineCap = 'round'; c.strokeStyle = bordo; c.lineWidth = .05; c.stroke();
    const e = P.suSpina(s, K.eu, K.ev), ro = K.occhio;
    if (st === 2) sfregio(c, e.x - ro * .78, e.y + ro * .7, e.x - ro * 1.2, e.y + ro * 1.75, SOTTO, K.neo);      // lo sfregio passa dietro l'occhio: qui il pezzo di sotto
    const sg = colpito ? P.SGUARDI.colpito : felice ? P.SGUARDI.felice : paura ? PAURA : K.sguardo;
    P.occhio(c, e.x, e.y, ro, Object.assign({ iride: IRIDE, pelle: K.corpo, guarda: P.sguardo(o.sguardo, e.x, e.y) }, sg));
    if (paura) P.sopracciglio(c, e.x + .02, e.y - ro * 1.42, ro * 1.1, -.32, bordo, .06);
    else if (st && !colpito && !felice) P.sopracciglio(c, e.x + .04, e.y - ro * 1.03, ro * 1.9, e.ang + .06 + st * .13, bordo, .045 + st * .03);      // lo sguardo da sbruffone
    if (st === 2) sfregio(c, e.x - ro * .12, e.y - ro * .95, e.x + ro * .02, e.y - ro * 1.3, SOPRA, K.neo);         // …e qui il pezzo di sopra, che taglia il sopracciglio
    if (P.fine(o)) { P.suSpina(s, 1, .1, q); c.fillStyle = K.neo; c.beginPath(); c.ellipse(q.x + K.testa * .5, q.y + .02, .034, .02, -.5, 0, TAU); c.fill(); }

    // ---- 5. i segni dell'espressione
    if (paura) P.goccia(c, e.x - ro * 1.5, e.y - ro * 1.3 + sin(t * 5) * .015, .08, -.5);
    if (colpito) P.stelle(c, e.x - .15, e.y - ro - .62, .5, t, 3, .12);
    c.restore();
  },
});
})();
