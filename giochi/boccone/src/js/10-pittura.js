/* Boccone — B.pittura: la cassetta degli attrezzi dello stile «Giocattolo lucido».
   Le creature sono figurine di vinile: volumi gonfi (sfumatura radiale, ombra propria in basso, luce di rimbalzo), bordo
   scuro colorato, riflessi bianchi netti, ombre di contatto nelle pieghe, particolari in rilievo.
   - Tutte le misure sono in unità del modello (1 = raggio di contatto), gli angoli in radianti, +x muso, +y pancia.
   - Nessuna funzione tiene stato né usa il caso: lo stesso ingresso dà sempre lo stesso disegno.
   - Nessuna funzione usa shadowBlur, filter, setTransform o clearRect; ognuna lascia la tela come l'ha trovata
     (trasformazione, ritaglio, trasparenza, fusione). Possono cambiare solo fillStyle, strokeStyle, lineWidth, lineCap, lineJoin.
   - La ricetta per usarla, con gli esempi, è in GUIDA-STILE.md.
   FILE CONGELATO: i modelli non lo modificano. Se manca un attrezzo, si scrive una funzione locale nel file del modello. */
(() => {
'use strict';
const B = window.B, U = B.util, TAU = Math.PI * 2;
const { sin, cos, min, max, round, hypot, atan2, abs, pow, PI } = Math;
const P = B.pittura = {};
const val = (v, a) => typeof v === 'function' ? v(a) : v;          // un numero oppure una funzione
const lerp = (a, b, k) => a + (b - a) * k;

// =========================================================================== 1. COLORI
const NOTTE = [30, 14, 70];            // il viola-notte verso cui tendono le ombre: mai nero puro
const memo = new Map();
const canale = v => v < 0 ? 0 : v > 255 ? 255 : round(v);
const esa = (r, g, b) => '#' + ((1 << 24) | (canale(r) << 16) | (canale(g) << 8) | canale(b)).toString(16).slice(1);
const ricorda = (chiave, v) => { if (memo.size > 800) memo.clear(); memo.set(chiave, v); return v; };

/* P.rgb(col) → [r, g, b]. Accetta '#rgb', '#rrggbb' e 'rgb(…)'/'rgba(…)'. */
P.rgb = col => {
  let v = memo.get(col); if (v) return v;
  if (col[0] === '#') {
    let h = col.slice(1); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h.slice(0, 6), 16) || 0; v = [n >> 16, (n >> 8) & 255, n & 255];
  } else { const m = String(col).match(/[\d.]+/g) || []; v = [+m[0] || 0, +m[1] || 0, +m[2] || 0]; }
  return ricorda(col, v);
};
/* P.mescola(a, b, k) → colore fra a (k = 0) e b (k = 1). */
P.mescola = (a, b, k) => { const p = P.rgb(a), q = P.rgb(b); return esa(lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)); };
/* P.schiarisci(col, q) → verso il bianco (q da 0 a 1). */
P.schiarisci = (col, q) => P.mescola(col, '#ffffff', q);
/* P.scurisci(col, q) → più scuro restando saturo: moltiplica il colore e lo vela di viola-notte (q da 0 a 1). */
P.scurisci = (col, q) => { const p = P.rgb(col), k = 1 - q, v = q * .62; return esa(p[0] * k + NOTTE[0] * v, p[1] * k + NOTTE[1] * v, p[2] * k + NOTTE[2] * v); };
/* P.alfa(col, a) → lo stesso colore con trasparenza a (0..1), come 'rgba(…)'. */
P.alfa = (col, a) => { const p = P.rgb(col); return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')'; };
/* P.tinta(base, ombra?) → { luce, chiara, base, ombra, scura, bordo, velo }: da UN colore base tutti i toni di un pezzo
   (velo = il colore quasi trasparente delle ombre proprie).
   base: saturo e di media luminosità. ombra (facoltativo): il colore verso cui scurisce; va dato per i colori chiari o
   caldi (crema → pesca, giallo → arancio, rosa → magenta, bianco → azzurro) perché le ombre restino pulite, mai grigie.
   Le tinte si creano UNA volta, in cima al file del modello, fuori da disegna(). */
P.tinta = (base, ombra) => {
  const chiave = 't' + base + (ombra || '');
  let t = memo.get(chiave); if (t) return t;
  t = { base, luce: P.schiarisci(base, .5), chiara: P.schiarisci(base, .24) };
  if (ombra) { t.ombra = P.mescola(base, ombra, .5); t.scura = P.mescola(base, ombra, .9); t.bordo = P.scurisci(ombra, .58); }
  else { t.ombra = P.scurisci(base, .3); t.scura = P.scurisci(base, .52); t.bordo = P.scurisci(base, .76); }
  t.velo = 'rgba(92,22,66,.16)';       // il velo color prugna che, steso due volte, fa l'ombra propria (calda: non ingrigisce i chiari)
  return ricorda(chiave, t);
};

// =========================================================================== 2. TRACCIATI E SPINE
/* P.profilo(c, p, chiusa = true): traccia (con beginPath) la curva morbida che passa per i punti p = [x0,y0, x1,y1, …].
   chiusa = true richiude la sagoma. Poi si usa c.fill()/c.stroke() oppure la si passa a P.volume dentro una funzione. */
P.profilo = (c, p, chiusa = true) => {
  const n = p.length / 2, K = 1 / 6, q = i => (chiusa ? (i + n) % n : max(0, min(n - 1, i))) * 2;
  c.beginPath(); c.moveTo(p[0], p[1]);
  for (let i = 0; i < (chiusa ? n : n - 1); i++) {
    const a = q(i - 1), b = q(i), d = q(i + 1), e = q(i + 2);
    c.bezierCurveTo(p[b] + (p[d] - p[a]) * K, p[b + 1] + (p[d + 1] - p[a + 1]) * K, p[d] - (p[e] - p[b]) * K, p[d + 1] - (p[e + 1] - p[b + 1]) * K, p[d], p[d + 1]);
  }
  if (chiusa) c.closePath();
};
/* Campiona in m tratti la stessa curva morbida (aperta) di P.profilo → [x0,y0, …] con m + 1 punti. */
const campionaCurva = (p, m) => {
  const n = p.length / 2, esce = [], K = 1 / 6, q = i => max(0, min(n - 1, i)) * 2;
  for (let j = 0; j <= m; j++) {
    const f = min(n - 1 - 1e-6, j / m * (n - 1)), i = f | 0, k = f - i, w = 1 - k, a = q(i - 1), b = q(i), d = q(i + 1), e = q(i + 2);
    for (let z = 0; z < 2; z++) {
      const p0 = p[b + z], p3 = p[d + z], p1 = p0 + (p3 - p[a + z]) * K, p2 = p3 - (p[e + z] - p0) * K;
      esce.push(w * w * w * p0 + 3 * w * w * k * p1 + 3 * w * k * k * p2 + k * k * k * p3);
    }
  }
  return esce;
};
/* P.sagoma(punti) → funzione u → mezza larghezza. punti = [[u, mezza larghezza], …] con u crescente da 0 (coda) a 1 (muso).
   Serve per `su` e `giu` di P.spina. Si crea UNA volta, fuori da disegna(). */
P.sagoma = punti => {
  const n = punti.length, m = punti.map((p, i) => { const a = punti[max(0, i - 1)], b = punti[min(n - 1, i + 1)]; return (b[1] - a[1]) / (b[0] - a[0] || 1); });
  return u => {
    let i = 0; while (i < n - 2 && u > punti[i + 1][0]) i++;
    const a = punti[i], b = punti[i + 1], h = b[0] - a[0] || 1, k = max(0, min(1, (u - a[0]) / h)), k2 = k * k, k3 = k2 * k;
    return max(0, (2 * k3 - 3 * k2 + 1) * a[1] + (k3 - 2 * k2 + k) * h * m[i] + (-2 * k3 + 3 * k2) * b[1] + (k3 - k2) * h * m[i + 1]);
  };
};
/* P.onda(u, fase, o) → spostamento di traverso del punto u della spina (0 coda, 1 muso) alla fase 0..1 del nuoto.
   o: { amp ampiezza in coda (.12), onde quante onde stanno nel corpo (.55 pesce, 1.3 anguilla), testa quota di ampiezza
   che resta al muso (0..1, .12), potenza quanto in fretta l'ampiezza cresce verso la coda (1.6; sotto 1 = tutto il corpo
   ondeggia), giri cicli per ogni fase (INTERO, 1) }. */
P.onda = (u, fase, o = {}) => {
  const d = 1 - u, te = o.testa === undefined ? .12 : o.testa;
  return (o.amp || .12) * (te + (1 - te) * pow(d, o.potenza || 1.6)) * sin(fase * TAU * (o.giri || 1) - d * (o.onde || .55) * TAU);
};
/* P.spina(n, punto, su, giu = su, o) → la linea di mezzo di un corpo, campionata in n tratti da coda (u = 0) a muso (u = 1).
   punto(u, p) deve scrivere p.x e p.y; su e giu sono le mezze larghezze verso il dorso e verso il ventre (numeri, o
   funzioni di u fatte con P.sagoma). o.testa / o.coda: lunghezza della calotta tonda al muso e alla coda (0 = chiusura netta).
   La spina serve a P.volume (il corpo), P.suSpina (dove mettere occhi e pinne), P.cresta e ai motivi della sezione 5. */
P.spina = (n, punto, su, giu = su, o = {}) => {
  const s = { n, x: [], y: [], nx: [], ny: [], su: [], giu: [], testa: o.testa || 0, coda: o.coda || 0 }, p = { x: 0, y: 0 };
  for (let i = 0; i <= n; i++) { const u = i / n; punto(u, p); s.x[i] = p.x; s.y[i] = p.y; s.su[i] = val(su, u); s.giu[i] = val(giu, u); }
  for (let i = 0; i <= n; i++) {
    const a = max(0, i - 1), b = min(n, i + 1), dx = s.x[b] - s.x[a], dy = s.y[b] - s.y[a], d = hypot(dx, dy) || 1;
    s.nx[i] = dy / d; s.ny[i] = -dx / d;                              // normale rivolta al dorso
  }
  return s;
};
/* P.spinaPesce(n, xCoda, xMuso, fase, onda, su, giu, o) → la spina più comune: un corpo disteso da xCoda a xMuso che
   ondeggia nuotando. fase = o.fase del modello (0..1); onda = le opzioni di P.onda (null = corpo rigido);
   o: { testa, coda (calotte), y (quota della spina, 0), arco (curvatura fissa: alza muso e coda di questa misura) }. */
P.spinaPesce = (n, xCoda, xMuso, fase, onda, su, giu, o = {}) => {
  const y = o.y || 0, arco = o.arco || 0;
  return P.spina(n, (u, p) => { p.x = xCoda + (xMuso - xCoda) * u; p.y = y + (onda ? P.onda(u, fase, onda) : 0) - arco * (2 * u - 1) * (2 * u - 1); }, su, giu, o);
};
/* P.spinaAngoli(n, x, y, lung, ang, larg, o) → spina costruita per angoli a partire dalla radice (x, y): tentacoli, steli,
   colli, code a frusta. ang(u) dà la direzione del tratto u (0 radice, 1 punta), lung la lunghezza totale, larg la mezza
   larghezza (numero o funzione di u), o come in P.spina. Qui u = 0 è la radice e u = 1 la punta. */
P.spinaAngoli = (n, x, y, lung, ang, larg, o) => {
  const px = [x], py = [y], passo = lung / n;
  for (let i = 1; i <= n; i++) { const a = val(ang, (i - .5) / n); px[i] = px[i - 1] + cos(a) * passo; py[i] = py[i - 1] + sin(a) * passo; }
  return P.spina(n, (u, p) => { const i = round(u * n); p.x = px[i]; p.y = py[i]; }, larg, larg, o);
};
/* P.suSpina(s, u, v = 0, q = {}) → {x, y, ang}: il punto del corpo a quota u lungo la spina (0 coda, 1 muso) e v di
   traverso (-1 filo del dorso, 0 mezzo, +1 filo del ventre; oltre ±1 esce dal corpo). ang = direzione della spina lì.
   Così occhi, pinne e macchie seguono il corpo mentre ondeggia. Passa q per riusare lo stesso oggetto. */
P.suSpina = (s, u, v = 0, q = {}) => {
  const f = max(0, min(.99999, u)) * s.n, i = f | 0, j = i + 1, k = f - i;
  const w = -v * (v < 0 ? lerp(s.su[i], s.su[j], k) : lerp(s.giu[i], s.giu[j], k)), nx = lerp(s.nx[i], s.nx[j], k), ny = lerp(s.ny[i], s.ny[j], k);
  q.x = lerp(s.x[i], s.x[j], k) + nx * w; q.y = lerp(s.y[i], s.y[j], k) + ny * w; q.ang = atan2(nx, -ny);
  return q;
};
/* P.puntiSuSpina(s, n, u0, u1, v = 0) → [x0,y0, …]: n punti in fila lungo il corpo da u0 a u1, alla quota v (numero o
   funzione di u). Da passare a P.bozzi, P.lucine, o da scorrere per piantare aculei (P.corno). */
P.puntiSuSpina = (s, n, u0, u1, v = 0) => {
  const q = {}, esce = [];
  for (let i = 0; i < n; i++) { const u = n > 1 ? lerp(u0, u1, i / (n - 1)) : u0; P.suSpina(s, u, val(v, u), q); esce.push(q.x, q.y); }
  return esce;
};
/* P.tracciaSpina(c, s): traccia (con beginPath) la sagoma chiusa di una spina: dorso da coda a muso, calotta, ventre,
   calotta di coda. Di solito la chiama P.volume; serve da sola per ritagli o contorni speciali. */
P.tracciaSpina = (c, s) => {
  const n = s.n, tx = i => s.x[i] + s.nx[i] * s.su[i], ty = i => s.y[i] + s.ny[i] * s.su[i], bx = i => s.x[i] - s.nx[i] * s.giu[i], by = i => s.y[i] - s.ny[i] * s.giu[i];
  c.beginPath(); c.moveTo(tx(0), ty(0));
  for (let i = 1; i < n; i++) c.quadraticCurveTo(tx(i), ty(i), (tx(i) + tx(i + 1)) / 2, (ty(i) + ty(i + 1)) / 2);
  c.lineTo(tx(n), ty(n));
  let k = s.testa * 1.34, ax = -s.ny[n] * k, ay = s.nx[n] * k;
  if (k) c.bezierCurveTo(tx(n) + ax, ty(n) + ay, bx(n) + ax, by(n) + ay, bx(n), by(n)); else c.lineTo(bx(n), by(n));
  for (let i = n - 1; i > 0; i--) c.quadraticCurveTo(bx(i), by(i), (bx(i) + bx(i - 1)) / 2, (by(i) + by(i - 1)) / 2);
  c.lineTo(bx(0), by(0));
  k = s.coda * 1.34; ax = s.ny[0] * k; ay = -s.nx[0] * k;
  if (k) c.bezierCurveTo(bx(0) + ax, by(0) + ay, tx(0) + ax, ty(0) + ay, tx(0), ty(0));
  c.closePath();
};

// =========================================================================== 3. VOLUMI, BORDI, LUCI E OMBRE
P.BORDO = .05;                         // spessore del bordo scuro dei pezzi grandi (se ne vede la metà esterna)
/* P.volume(c, forma, t, o): IL MATTONE DELLO STILE. Disegna un pezzo gonfio e lucido da una sagoma.
   forma: una spina (P.spina…) oppure una funzione traccia(c) che fa beginPath e traccia la sagoma (viene chiamata più volte).
   t: tinta del pezzo. o: {
     luce: [x, y, r]  centro del punto illuminato (in alto, verso il muso) e raggio a cui il colore arriva in ombra
                      (≈ 1,5 volte la grandezza del pezzo). Se manca, il pezzo è tinto piatto e riceve una lama di luce
                      in alto: va bene per nastri, tentacoli e pezzi sottili;
     colore           riempimento a scelta (un colore o un gradiente) al posto della sfumatura della tinta;
     bordo            spessore del bordo (P.BORDO; 0 = senza);
     ombra            spessore dell'ombra propria a falce in basso (.11; 0 = senza). Regola: circa un decimo del pezzo;
     lume             spessore della lama di luce in alto (.1 se manca `luce`, altrimenti 0);
     dentro(c)        disegna i motivi (ventre, righe, macchie, squame) ritagliati nella sagoma, sotto ombra e luce } */
P.volume = (c, forma, t, o = {}) => {
  const spina = typeof forma !== 'function', traccia = spina ? cc => P.tracciaSpina(cc, forma) : forma;
  const b = o.bordo === undefined ? P.BORDO : o.bordo, om = o.ombra === undefined ? .11 : o.ombra, lu = o.lume === undefined ? (o.luce ? 0 : .1) : o.lume;
  c.lineJoin = 'round'; c.lineCap = 'round';
  traccia(c);
  if (b) { c.strokeStyle = t.bordo; c.lineWidth = b * 2; c.stroke(); }
  c.fillStyle = o.colore || (o.luce ? P.sfumatura(c, t, o.luce) : t.base);
  c.fill();
  if (!om && !lu && !o.dentro) return;
  if (spina) {
    /* Corpi su una spina: luce e ombra sono fasce lungo i fianchi, che seguono le curve e costano poco. Se c'è il bordo si
       disegnano senza ritaglio (la fascia d'ombra sconfina appena sotto il bordo, dove non si vede). */
    const e = orloSpina(forma), ritaglia = !b;
    if (o.dentro || ritaglia) { c.save(); c.clip(); if (o.dentro) o.dentro(c); if (!ritaglia) c.restore(); }
    if (lu) { c.fillStyle = P.alfa(t.luce, .3); fascia(c, e, lu * .2, lu * 2, 1, 0); c.fill(); fascia(c, e, lu * .5, lu * 1.55, 1, 0); c.fill(); }
    if (om) { c.fillStyle = t.velo; fascia(c, e, 0, om * 2, -1, b * .4); c.fill(); fascia(c, e, 0, om * 1.05, -1, b * .4); c.fill(); }
    if (ritaglia) c.restore();
    return;
  }
  /* Sagome qualsiasi: la sagoma stessa, spostata e ripassata dentro il ritaglio. */
  c.save(); c.clip();
  if (o.dentro) o.dentro(c);
  c.lineJoin = 'round';
  if (lu) { c.save(); c.translate(-lu * .2, lu); traccia(c); c.strokeStyle = P.alfa(t.luce, .3); c.lineWidth = lu * 2; c.stroke(); c.lineWidth = lu * 1.1; c.stroke(); c.restore(); }
  if (om) { c.translate(om * .3, -om); traccia(c); c.strokeStyle = t.velo; c.lineWidth = om * 2; c.stroke(); c.lineWidth = om * 1.05; c.stroke(); }
  c.restore();
};
/* L'orlo di una spina come anello di punti, con la normale che guarda in fuori e lo spazio disponibile verso l'interno. */
const orloSpina = s => {
  const n = s.n, e = { x: [], y: [], nx: [], ny: [], sp: [] };
  const metti = (x, y, nx, ny, sp) => { e.x.push(x); e.y.push(y); e.nx.push(nx); e.ny.push(ny); e.sp.push(sp); };
  for (let i = 0; i <= n; i++) metti(s.x[i] + s.nx[i] * s.su[i], s.y[i] + s.ny[i] * s.su[i], s.nx[i], s.ny[i], s.su[i] * .9);
  if (s.testa) {                                                    // la calotta del muso: la normale gira dal dorso al ventre
    const k = s.testa * 1.34, tx = -s.ny[n], ty = s.nx[n], x0 = e.x[n], y0 = e.y[n], x3 = s.x[n] - s.nx[n] * s.giu[n], y3 = s.y[n] - s.ny[n] * s.giu[n];
    for (let j = 1; j < 6; j++) {
      const q = j / 6, w = 1 - q, a = w * w * w + 3 * w * w * q, z = 1 - a, d = (3 * w * w * q + 3 * w * q * q) * k, ca = cos(PI * q), sa = sin(PI * q);
      metti(a * x0 + z * x3 + d * tx, a * y0 + z * y3 + d * ty, ca * s.nx[n] + sa * tx, ca * s.ny[n] + sa * ty, lerp(s.su[n], s.giu[n], q) * .9);
    }
  }
  for (let i = n; i >= 0; i--) metti(s.x[i] - s.nx[i] * s.giu[i], s.y[i] - s.ny[i] * s.giu[i], -s.nx[i], -s.ny[i], s.giu[i] * .9);
  return e;
};
/* Traccia una fascia lungo l'orlo, fra le profondità da e a, larga in proporzione a quanto l'orlo guarda la luce
   (segno = 1) o le volta le spalle (segno = -1). La luce viene dall'alto, un po' dal muso. Con da = 0 la fascia parte
   un po' fuori dall'orlo (di `fuori`), così non resta un filo scoperto. */
const fascia = (c, e, da, a, segno, fuori) => {
  const m = e.x.length;
  c.beginPath();
  for (let i = 0; i < m; i++) { const f = max(0, segno * (e.nx[i] * .3 - e.ny[i] * .954)), d = da ? min(da * f, e.sp[i]) : -min(fuori, f * .4); if (i) c.lineTo(e.x[i] - e.nx[i] * d, e.y[i] - e.ny[i] * d); else c.moveTo(e.x[i] - e.nx[i] * d, e.y[i] - e.ny[i] * d); }
  for (let i = m - 1; i >= 0; i--) { const f = max(0, segno * (e.nx[i] * .3 - e.ny[i] * .954)), d = min(a * f, e.sp[i]); c.lineTo(e.x[i] - e.nx[i] * d, e.y[i] - e.ny[i] * d); }
  c.closePath();
};
/* P.sfumatura(c, t, luce) → la sfumatura radiale di un volume, da usare come fillStyle (o come `colore`) anche per le zone
   dipinte dentro un corpo (ventre, maschere, bande) perché restino tonde. luce = [x, y, r] come in P.volume. */
P.sfumatura = (c, t, luce) => {
  const x = luce[0], y = luce[1], r = luce[2], g = c.createRadialGradient(x, y, r * .04, x, y, r);
  g.addColorStop(0, t.luce); g.addColorStop(.32, t.base); g.addColorStop(.74, t.ombra); g.addColorStop(.92, t.scura); g.addColorStop(1, t.ombra);   // l'ultimo tratto è la luce di rimbalzo
  return g;
};
/* P.palla(c, x, y, rx, ry, ang, t, o): un volume a ellisse (centro, due raggi, inclinazione): bulbi, esche, giunture,
   gemme, sifoni, nodi. o come in P.volume (se manca `luce` ne mette una adatta, in alto a destra). */
P.palla = (c, x, y, rx, ry, ang, t, o = {}) => {
  const R = max(rx, ry);
  P.volume(c, cc => { cc.beginPath(); cc.ellipse(x, y, rx, ry, ang, 0, TAU); }, t, { luce: o.luce || [x + R * .3, y - R * .4, R * 1.7], colore: o.colore,
    bordo: o.bordo, ombra: o.ombra === undefined ? min(rx, ry) * .22 : o.ombra, lume: o.lume, dentro: o.dentro });
};
/* P.riflesso(c, x, y, lung, ang = -.4, curva = .25, forza = .92): il riflesso speculare netto, firma dello stile: una virgola
   bianca più un puntino. (x, y) centro, lung lunghezza, ang inclinazione, curva = quanto si incurva (segue la rotondità
   del pezzo). UNO per pezzo importante, in alto verso il muso, DOPO il volume. */
P.riflesso = (c, x, y, lung, ang = -.4, curva = .25, forza = .92) => {
  const sp = lung * .34, f = lung * curva * 2;
  c.save(); c.translate(x, y); c.rotate(ang);
  c.lineJoin = 'round'; c.strokeStyle = c.fillStyle = 'rgba(255,255,255,' + forza + ')'; c.lineWidth = sp * .3;
  c.beginPath(); c.moveTo(-lung / 2, 0); c.quadraticCurveTo(0, -f - sp * .55, lung / 2, 0); c.quadraticCurveTo(0, -f + sp * .75, -lung / 2, 0); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(-lung / 2 - sp * .95, f * .42 + sp * .5, sp * .36, 0, TAU); c.fill();
  c.restore();
};
/* P.ombra(c, x, y, rx, ry, ang = 0, forza = .35, col): ombra di contatto, una macchia scura e sfumata da mettere nelle
   pieghe: sotto la pinna pettorale, dietro la guancia, sotto il labbro, dove un pezzo si appoggia su un altro.
   Si disegna DOPO il pezzo che la riceve e PRIMA del pezzo che la getta. */
P.ombra = (c, x, y, rx, ry, ang = 0, forza = .35, col = '#1e0e46') => {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(rx, ry);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, P.alfa(col, forza)); g.addColorStop(.6, P.alfa(col, forza * .45)); g.addColorStop(1, P.alfa(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.fill(); c.restore();
};
/* P.bagliore(c, x, y, r, col, forza = 1): alone di luce sfumato (esche, fotofori grandi, occhi di brace, lava).
   r = raggio dell'alone, forza 0..1. Non usa shadowBlur: va bene anche in eroi e giganti. */
P.bagliore = (c, x, y, r, col, forza = 1) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, P.alfa(P.schiarisci(col, .55), .95 * forza)); g.addColorStop(.22, P.alfa(col, .6 * forza)); g.addColorStop(.55, P.alfa(col, .2 * forza)); g.addColorStop(1, P.alfa(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
};
/* P.lucine(c, p, r, col, forza = 1): tante lucine economiche (fotofori) nei punti p = [x0,y0, …]: alone, corpo, cuore
   chiaro, senza gradienti. r = raggio del corpo luminoso (numero o funzione dell'indice). Per i punti vedi P.puntiSuSpina. */
P.lucine = (c, p, r, col, forza = 1) => {
  for (let passata = 0; passata < 3; passata++) {
    const k = [2.5, 1.35, .7][passata];
    c.beginPath(); for (let i = 0; i < p.length; i += 2) { const rr = val(r, i / 2) * k; c.moveTo(p[i] + rr, p[i + 1]); c.arc(p[i], p[i + 1], rr, 0, TAU); }
    c.fillStyle = passata === 2 ? P.schiarisci(col, .75) : P.alfa(col, (passata ? .75 : .24) * forza); c.fill();
  }
};
/* P.guancia(c, x, y, r, col = '#ff5f8f', forza = .55): velo di colore tondo e sfumato: il rosa delle gote dei buoni,
   il rossore di chi caccia, una macchia di colore morbida. */
P.guancia = (c, x, y, r, col = '#ff5f8f', forza = .55) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, P.alfa(col, forza)); g.addColorStop(.5, P.alfa(col, forza * .6)); g.addColorStop(1, P.alfa(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
};
/* P.solco(c, p, t, spess = .035): solco inciso lungo la curva per i punti p = [x0,y0, …]: opercolo, cicatrici, pieghe,
   giunture delle corazze. Una riga scura e, appena sotto, una riga chiara. t = tinta del pezzo su cui sta. */
P.solco = (c, p, t, spess = .035) => {
  c.lineCap = 'round';
  P.profilo(c, p, false); c.strokeStyle = P.alfa(t.scura, .7); c.lineWidth = spess; c.stroke();
  c.save(); c.translate(spess * .7, spess * .5); P.profilo(c, p, false); c.strokeStyle = P.alfa(t.luce, .55); c.lineWidth = spess * .6; c.stroke(); c.restore();
};
/* P.bozzi(c, p, r, t): bozzi in rilievo nei punti p = [x0,y0, …]: verruche, tubercoli, borchie, nei. Sotto ognuno una
   mezzaluna scura, sopra una gobba chiara. r = raggio (numero o funzione dell'indice), t = tinta del pezzo. */
P.bozzi = (c, p, r, t) => {
  for (let passata = 0; passata < 2; passata++) {
    c.beginPath();
    for (let i = 0; i < p.length; i += 2) { const rr = val(r, i / 2), x = p[i] - (passata ? 0 : rr * .12), y = p[i + 1] + (passata ? 0 : rr * .34); c.moveTo(x + rr, y); c.arc(x, y, rr * (passata ? .88 : 1), 0, TAU); }
    c.fillStyle = passata ? t.luce : P.alfa(t.scura, .6); c.fill();
  }
};
/* P.tubo(c, p, spess, t, bordo): tubo lucido di diametro costante lungo la curva per i punti p = [x0,y0, …]: steli,
   peduncoli degli occhi, catene, antenne grosse. Per un filo che si assottiglia usa P.filo, per le zampe P.zampa. */
P.tubo = (c, p, spess, t, bordo = P.BORDO * .8) => {
  c.lineCap = 'round'; c.lineJoin = 'round';
  P.profilo(c, p, false);
  c.strokeStyle = t.bordo; c.lineWidth = spess + bordo * 2; c.stroke();
  c.strokeStyle = t.ombra; c.lineWidth = spess; c.stroke();
  c.save(); c.translate(spess * .05, -spess * .14); P.profilo(c, p, false); c.strokeStyle = t.base; c.lineWidth = spess * .7; c.stroke();
  c.translate(0, -spess * .12); P.profilo(c, p, false); c.strokeStyle = P.alfa(t.luce, .9); c.lineWidth = spess * .2; c.stroke(); c.restore();
};
/* P.filo(c, p, spess0, spess1, t, bordo): filo che si assottiglia da spess0 a spess1 lungo la curva per i punti
   p = [x0,y0, …]: antenne, barbigli, baffi, filamenti delle pinne, code a frusta, lenze. t = tinta oppure un colore;
   bordo = spessore del bordo (0 = senza). Costa pochissimo. */
P.filo = (c, p, spess0, spess1, t, bordo = P.BORDO * .6) => {
  const m = max(6, (p.length / 2 - 1) * 5), q = campionaCurva(p, m), ax = [], ay = [], bx = [], by = [], col = typeof t === 'string';
  for (let i = 0; i <= m; i++) {
    const a = max(0, i - 1) * 2, b = min(m, i + 1) * 2, tx = q[b] - q[a], ty = q[b + 1] - q[a + 1], d = hypot(tx, ty) || 1, w = lerp(spess0, spess1, i / m) / 2;
    ax[i] = q[i * 2] + ty / d * w; ay[i] = q[i * 2 + 1] - tx / d * w; bx[i] = q[i * 2] - ty / d * w; by[i] = q[i * 2 + 1] + tx / d * w;
  }
  c.beginPath(); c.moveTo(ax[0], ay[0]);
  for (let i = 1; i <= m; i++) c.lineTo(ax[i], ay[i]);
  for (let i = m; i >= 0; i--) c.lineTo(bx[i], by[i]);
  c.closePath(); c.lineJoin = 'round';
  if (bordo) { c.strokeStyle = col ? P.scurisci(t, .7) : t.bordo; c.lineWidth = bordo * 2; c.stroke(); }
  c.fillStyle = col ? t : t.base; c.fill();
};
/* P.corno(c, x, y, ang, lung, larg, t, o): cono lucido che si assottiglia: aculei, spine, corna, zanne, rostri, becchi,
   unghie. (x, y) centro della base, ang direzione, lung lunghezza, larg larghezza alla base.
   o: { curva (di quanto piega verso la punta, radianti), gonfio (0..1 pancia dei fianchi, .7), punta (colore della punta),
        bordo, lume (false = senza filo di luce) }. Gli aculei che spuntano da dietro si disegnano PRIMA del corpo. */
P.corno = (c, x, y, ang, lung, larg, t, o = {}) => {
  const cu = o.curva || 0, hx = -sin(ang) * larg / 2, hy = cos(ang) * larg / 2, g = o.gonfio === undefined ? .7 : o.gonfio;
  const px = x + cos(ang + cu) * lung, py = y + sin(ang + cu) * lung, mx = x + cos(ang + cu * .3) * lung * .5, my = y + sin(ang + cu * .3) * lung * .5;
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x + hx, y + hy); c.quadraticCurveTo(mx + hx * g, my + hy * g, px, py); c.quadraticCurveTo(mx - hx * g, my - hy * g, x - hx, y - hy); c.closePath();
  const b = o.bordo === undefined ? P.BORDO * .8 : o.bordo;
  if (b) { c.strokeStyle = t.bordo; c.lineWidth = b * 2; c.stroke(); }
  const gr = c.createLinearGradient(x, y, px, py); gr.addColorStop(0, t.ombra); gr.addColorStop(.45, t.base); gr.addColorStop(1, o.punta || t.luce);
  c.fillStyle = gr; c.fill();
  if (o.lume === false) return;
  const s = hy > 0 ? -.42 : .42;                                    // il filo di luce corre sul fianco rivolto in alto
  c.beginPath(); c.moveTo(lerp(x, mx, .3) + hx * s, lerp(y, my, .3) + hy * s); c.quadraticCurveTo(mx + hx * s * g, my + hy * s * g, lerp(mx, px, .6), lerp(my, py, .6));
  c.strokeStyle = P.alfa(t.luce, .85); c.lineWidth = larg * .13; c.stroke();
};

// =========================================================================== 4. PINNE E CODE
const campiona = (lista, k) => { const f = k * (lista.length - 1), i = min(lista.length - 2, f | 0); return lista.length < 2 ? lista[0] : lerp(lista[i], lista[i + 1], f - i); };
/* P.raggi(o) → { n, bx, by (attaccatura), mx, my (gomiti), ex, ey (punte dei raggi) }: la geometria di una pinna, con le
   stesse opzioni di P.pinna. Serve quando occorre sapere dove finisce un raggio (per attaccarci un filamento) prima di
   disegnare la pinna; P.pinna ritorna lo stesso oggetto. */
P.raggi = o => {
  const n = o.n || 6, pr = o.profilo || [1], on = o.onda || 0, fa = o.fase || 0, pa = o.passo === undefined ? .5 : o.passo, pg = o.piega || 0;
  const g = { n, bx: [], by: [], mx: [], my: [], ex: [], ey: [] };
  for (let i = 0; i <= n; i++) {
    const k = i / n, a = lerp(o.a0, o.a1, k) + on * sin(fa - i * pa), L = o.lung * campiona(pr, k);
    g.bx[i] = lerp(o.x0, o.x1, k); g.by[i] = lerp(o.y0, o.y1, k);
    g.mx[i] = g.bx[i] + cos(a - pg) * L * .5; g.my[i] = g.by[i] + sin(a - pg) * L * .5;                 // gomito del raggio
    g.ex[i] = g.mx[i] + cos(a + pg) * L * .5; g.ey[i] = g.my[i] + sin(a + pg) * L * .5;
  }
  return g;
};
/* P.pinna(c, o) → geometria (vedi P.raggi). Pinna carnosa a raggi: dorsali, anali, pettorali, ventrali, ventagli. o: {
     x0,y0, x1,y1  attaccatura sul corpo (primo e ultimo raggio);   a0, a1  direzione del primo e dell'ultimo raggio;
     lung          lunghezza;   profilo  moltiplicatori di lunghezza lungo l'attaccatura, es. [.5, 1, .7] (interpolati);
     n             numero di raggi (6);
     onda, fase, passo  ondeggiamento: ogni raggio ruota di onda·sin(fase − i·passo); fase in RADIANTI (o.fase·TAU·intero);
     piega         curvatura dei raggi (radianti);   smerlo  0..1 orlo a festoni fra un raggio e l'altro;
     tinta;  orlo  colore di una fascia lungo il bordo esterno;  punta  colore verso cui sfuma l'estremità;
     righe         false = senza raggi in rilievo;   primo  true = disegna anche il primo e l'ultimo raggio;   bordo }
   Se nasce dietro il corpo (dorsale, anale, coda) si disegna PRIMA del corpo; se sta sul fianco (pettorale) DOPO. */
P.pinna = (c, o) => {
  const g = P.raggi(o), n = g.n, t = o.tinta, sm = o.smerlo || 0, { bx, by, mx, my, ex, ey } = g, orlo = [o.x0, o.y0];
  let lmax = 0; const cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2;
  for (let i = 0; i <= n; i++) {
    if (i && sm) orlo.push(lerp((ex[i] + ex[i - 1]) / 2, (bx[i] + bx[i - 1]) / 2, sm * .35), lerp((ey[i] + ey[i - 1]) / 2, (by[i] + by[i - 1]) / 2, sm * .35));
    orlo.push(ex[i], ey[i]); lmax = max(lmax, hypot(ex[i] - cx, ey[i] - cy));
  }
  orlo.push(o.x1, o.y1);
  const m = orlo.length / 2;
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(orlo[0], orlo[1]);
  for (let i = 1; i < m - 1; i++) c.quadraticCurveTo(orlo[i * 2], orlo[i * 2 + 1], (orlo[i * 2] + orlo[i * 2 + 2]) / 2, (orlo[i * 2 + 1] + orlo[i * 2 + 3]) / 2);
  c.lineTo(orlo[m * 2 - 2], orlo[m * 2 - 1]); c.closePath();
  const b = o.bordo === undefined ? P.BORDO : o.bordo;
  if (b) { c.strokeStyle = t.bordo; c.lineWidth = b * 2; c.stroke(); }
  const gr = c.createRadialGradient(cx, cy, 0, cx, cy, lmax || 1);
  gr.addColorStop(0, t.scura); gr.addColorStop(.2, t.ombra); gr.addColorStop(.42, t.base); gr.addColorStop(o.orlo ? .78 : 1, o.punta || t.chiara);
  if (o.orlo) { gr.addColorStop(.82, o.orlo); gr.addColorStop(1, o.orlo); }
  c.fillStyle = gr; c.fill();
  if (o.righe === false) return g;
  for (let passata = 0; passata < 2; passata++) {                  // raggi in rilievo: riga scura e, accanto, riga chiara
    const d = passata ? .017 : 0;
    c.beginPath();
    for (let i = (o.primo ? 0 : 1); i < n + (o.primo ? 1 : 0); i++) {
      c.moveTo(lerp(bx[i], mx[i], .34) + d, lerp(by[i], my[i], .34) - d);
      c.quadraticCurveTo(mx[i] + d, my[i] - d, lerp(mx[i], ex[i], .72) + d, lerp(my[i], ey[i], .72) - d);
    }
    c.lineCap = 'butt'; c.strokeStyle = passata ? P.alfa(t.luce, .6) : P.alfa(t.scura, .5); c.lineWidth = passata ? .016 : .03; c.stroke();
  }
  return g;
};
const CODE = {                         // profili (lunghezza dei raggi dall'alto al basso) e apertura dei tipi di coda
  ventaglio: [[.72, .93, 1, .93, .72], 1], forca: [[1, .8, .5, .8, 1], 1.05], luna: [[1.05, .66, .36, .66, 1.05], 1.25],
  tronca: [[.9, .95, .92, .95, .9], .8], punta: [[.5, .8, 1, .8, .5], .8], lira: [[1.15, .7, .62, .7, 1.15], .9],
};
/* P.coda(c, o) → geometria (vedi P.raggi). Coda a raggi. o: {
     x, y  radice (fine della spina: P.suSpina(s, 0));   ang  direzione in cui punta (ang della spina in coda + π, più lo sbattere);
     tipo  'ventaglio' | 'forca' | 'luna' | 'tronca' | 'punta' | 'lira';
     lung, alt (mezza altezza alle punte), radice (mezza altezza all'attaccatura);
     fase (RADIANTI) e onda: i raggi sventolano in ritardo dal centro alle punte;
     tinta, orlo, punta, n, smerlo, piega, righe, bordo  come in P.pinna }
   Si disegna PRIMA del corpo. Le code degli squali (rigide, a falce) si fanno invece con due P.lama. */
P.coda = (c, o) => {
  const tipo = CODE[o.tipo] || CODE.ventaglio, rad = o.radice || .12, a = o.ang, ap = atan2((o.alt || .6) - rad, o.lung) * tipo[1];
  const px = -sin(a) * rad, py = cos(a) * rad;
  return P.pinna(c, { x0: o.x - px, y0: o.y - py, x1: o.x + px, y1: o.y + py, a0: a - ap, a1: a + ap, lung: o.lung / cos(ap * .8), profilo: tipo[0], n: o.n || 8,
    onda: o.onda === undefined ? .16 : o.onda, fase: o.fase || 0, passo: 0, tinta: o.tinta, orlo: o.orlo, punta: o.punta, smerlo: o.smerlo, piega: o.piega, righe: o.righe, primo: true, bordo: o.bordo });
};
/* P.cresta(c, s, o): pinna continua lungo un corpo fra u0 e u1: dorsale della murena, gonna della seppia, vele, creste. o: {
     u0, u1;  lato (-1 dorso, +1 ventre);  alt altezza (numero o funzione di k = 0..1 lungo la cresta: falla scendere a 0 ai capi);
     onda 0..1 quanto ondeggia l'orlo, fase (RADIANTI), onde quante creste d'onda;  piega (inclinazione all'indietro, radianti);
     passi (14);  tinta;  colore (riempimento al posto di tinta.base);  orlo (colore del filo di luce sul bordo);
     righe (false = senza raggi);  dentro (0..1 quanto affonda nel corpo, .3);  bordo }
   Si disegna PRIMA del corpo. */
P.cresta = (c, s, o) => {
  const m = o.passi || 14, la = o.lato || -1, t = o.tinta, q = {}, ix = [], iy = [], ox = [], oy = [], on = o.onda || 0, k0 = (o.onde || 2) * TAU, de = 1 - (o.dentro === undefined ? .3 : o.dentro);
  for (let i = 0; i <= m; i++) {
    const k = i / m, u = lerp(o.u0, o.u1, k), h = val(o.alt, k) * (1 + on * sin((o.fase || 0) - k * k0));
    P.suSpina(s, u, la * de, q); ix[i] = q.x; iy[i] = q.y;
    P.suSpina(s, u, la, q); const a = q.ang + (o.piega || 0) * la;
    ox[i] = q.x - sin(a) * h * la; oy[i] = q.y + cos(a) * h * la;
  }
  c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath(); c.moveTo(ix[0], iy[0]);
  for (let i = 0; i < m; i++) c.quadraticCurveTo(ox[i], oy[i], (ox[i] + ox[i + 1]) / 2, (oy[i] + oy[i + 1]) / 2);
  c.lineTo(ix[m], iy[m]); for (let i = m - 1; i >= 0; i--) c.lineTo(ix[i], iy[i]); c.closePath();
  const b = o.bordo === undefined ? P.BORDO : o.bordo;
  if (b) { c.strokeStyle = t.bordo; c.lineWidth = b * 2; c.stroke(); }
  c.fillStyle = o.colore || t.base; c.fill();
  if (o.righe === false) return;
  c.beginPath(); for (let i = 1; i < m; i++) { c.moveTo(lerp(ix[i], ox[i], .3), lerp(iy[i], oy[i], .3)); c.lineTo(lerp(ix[i], ox[i], .82), lerp(iy[i], oy[i], .82)); }
  c.lineCap = 'butt'; c.strokeStyle = P.alfa(t.scura, .5); c.lineWidth = .028; c.stroke();
  c.beginPath(); c.moveTo(lerp(ix[0], ox[0], .9), lerp(iy[0], oy[0], .9));                 // filo di luce sull'orlo
  for (let i = 0; i < m; i++) c.quadraticCurveTo(lerp(ix[i], ox[i], .86), lerp(iy[i], oy[i], .86), (lerp(ix[i], ox[i], .86) + lerp(ix[i + 1], ox[i + 1], .86)) / 2, (lerp(iy[i], oy[i], .86) + lerp(iy[i + 1], oy[i + 1], .86)) / 2);
  c.strokeStyle = P.alfa(o.orlo || t.luce, .75); c.lineWidth = .035; c.stroke();
};
/* P.lama(c, o): pinna piena e liscia, a falce o a triangolo: pinne e code degli squali, ali di razze e mante, pinne dei
   cetacei, pale delle tartarughe, timoni. o: {
     x0,y0  attacco davanti;  x1,y1  attacco dietro;  px,py  punta;
     davanti  gonfiore del bordo d'attacco (.18; 0 = dritto);  dietro  incavo del bordo d'uscita (.22 = falce; <0 = gonfio);
     tondo    0..0.4 quanto è arrotondata la punta (.14);
     tinta;  luce [x,y,r] (se manca: sfuma da scura alla radice a chiara in punta);  colore (riempimento a scelta);
     punta (colore della punta, es. le punte nere), quota (0..1 quanta lama prende, .32);
     ombra (0: le lame sono piatte), lume, bordo, dentro(c)  come in P.volume }
   L'attacco deve essere largo almeno un terzo della lunghezza, altrimenti sembra un filo. Per muoverla si sposta la
   punta con la fase (px, py). Dietro il corpo PRIMA del corpo, sul fianco DOPO. */
P.lama = (c, o) => {
  const x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1, px = o.px, py = o.py, t = o.tinta, ro = o.tondo === undefined ? .14 : o.tondo, k = 1 - ro;
  const ax = px - x0, ay = py - y0, la = hypot(ax, ay) || 1, s1 = ((x1 - x0) * ay - (y1 - y0) * ax) > 0 ? 1 : -1, da = (o.davanti === undefined ? .18 : o.davanti) * s1;
  const bx = x1 - px, by = y1 - py, s2 = ((x0 - px) * by - (y0 - py) * bx) > 0 ? 1 : -1, di = (o.dietro === undefined ? .22 : o.dietro) * s2;
  const m1x = (x0 + px) / 2 - ay * da, m1y = (y0 + py) / 2 + ax * da, m2x = (px + x1) / 2 + by * di, m2y = (py + y1) / 2 - bx * di;   // punti di controllo dei due bordi
  const q1x = k * k * x0 + 2 * k * ro * m1x + ro * ro * px, q1y = k * k * y0 + 2 * k * ro * m1y + ro * ro * py, q2x = k * k * px + 2 * k * ro * m2x + ro * ro * x1, q2y = k * k * py + 2 * k * ro * m2y + ro * ro * y1;
  const traccia = cc => {
    cc.beginPath(); cc.moveTo(x0, y0); cc.quadraticCurveTo(lerp(x0, m1x, k), lerp(y0, m1y, k), q1x, q1y);
    cc.quadraticCurveTo(px, py, q2x, q2y); cc.quadraticCurveTo(lerp(m2x, x1, ro), lerp(m2y, y1, ro), x1, y1); cc.closePath();
  };
  let colore = o.colore;
  if (!colore && !o.luce) { const g = c.createLinearGradient((x0 + x1) / 2, (y0 + y1) / 2, px, py); g.addColorStop(0, t.scura); g.addColorStop(.3, t.base); g.addColorStop(1, t.chiara); colore = g; }
  P.volume(c, traccia, t, { luce: o.luce, colore, bordo: o.bordo, ombra: o.ombra || 0, lume: o.lume || 0,
    dentro: (o.punta || o.dentro) && (cc => { if (o.punta) { cc.beginPath(); cc.arc(px, py, (o.quota || .32) * la, 0, TAU); cc.fillStyle = o.punta; cc.fill(); } if (o.dentro) o.dentro(cc); }) });
};

// =========================================================================== 5. MOTIVI DENTRO IL CORPO (si usano in `dentro`)
/* P.banda(c, s, ua, ub, colore, passi = 6): banda di traverso al corpo fra ua e ub (numeri, o funzioni di v per bande
   curve o oblique): righe verticali, fasce, maschere sugli occhi, selle. colore può essere una P.sfumatura. */
P.banda = (c, s, ua, ub, colore, passi = 6) => P.bande(c, s, [[ua, ub]], colore, passi);
/* P.bande(c, s, lista, colore, passi = 6): tante bande dello stesso colore in un colpo solo: lista = [[ua, ub], …] come in
   P.banda. Costa molto meno di tante P.banda: usala per le zebrature e per tutte le righe dello stesso colore. */
P.bande = (c, s, lista, colore, passi = 6) => {
  const q = {}; c.beginPath();
  for (const b of lista) {
    for (let i = 0; i <= passi; i++) { const v = -1.25 + 2.5 * i / passi; P.suSpina(s, val(b[0], v), v, q); if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); }
    for (let i = passi; i >= 0; i--) { const v = -1.25 + 2.5 * i / passi; P.suSpina(s, val(b[1], v), v, q); c.lineTo(q.x, q.y); }
    c.closePath();
  }
  c.fillStyle = colore; c.fill();
};
/* P.fianco(c, s, v0, v1, colore, u0 = 0, u1 = 1, passi = 12): fascia per il lungo fra le quote v0 e v1 (numeri o funzioni
   di u), da u0 a u1: ventre chiaro (v0 = .2, v1 = 1.4), dorso scuro (v0 = -1.4, v1 = -.3), striscia sul fianco. */
P.fianco = (c, s, v0, v1, colore, u0 = 0, u1 = 1, passi = 12) => {
  const q = {}; c.beginPath();
  for (let i = 0; i <= passi; i++) { const u = lerp(u0, u1, i / passi); P.suSpina(s, u, val(v0, u), q); c.lineTo(q.x, q.y); }
  for (let i = passi; i >= 0; i--) { const u = lerp(u0, u1, i / passi); P.suSpina(s, u, val(v1, u), q); c.lineTo(q.x, q.y); }
  c.closePath(); c.fillStyle = colore; c.fill();
};
/* P.macchie(c, s, o): macchie sparse in una zona del corpo, sempre uguali. o: { n, seme (cambia la disposizione),
   u0, u1, v0, v1 (zona), r0, r1 (raggio minimo e massimo), colore, cuore (colore di un centro più piccolo: macchie ad
   anello, occhielli), lungo (allungamento lungo il corpo: 1 = tonde, 1.25) } */
P.macchie = (c, s, o) => {
  const q = {}, n = o.n || 8, se = o.seme || 1, lu = o.lungo || 1.25;
  for (let giro = 0; giro < (o.cuore ? 2 : 1); giro++) {
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const u = lerp(o.u0 || 0, o.u1 === undefined ? 1 : o.u1, (i * .618034 + U.rumore(i, se) * .12 + se * .37) % 1), v = lerp(o.v0 === undefined ? -1 : o.v0, o.v1 === undefined ? 1 : o.v1, (i + .5) / n);
      const r = lerp(o.r0 || .05, o.r1 || .1, U.rumore(i, se + 5)) * (giro ? .5 : 1);
      P.suSpina(s, u, v, q); c.moveTo(q.x + cos(q.ang) * r * lu, q.y + sin(q.ang) * r * lu); c.ellipse(q.x, q.y, r * lu, r, q.ang, 0, TAU);
    }
    c.fillStyle = giro ? o.cuore : o.colore; c.fill();
  }
};
/* P.squame(c, s, o): squame bombate a tegola: file sfalsate di archetti scuri con un filo di luce subito dentro.
   o: { u0, u1, v0, v1 (zona del corpo), righe (quante file), tinta, fitte (1 = normali, >1 più strette), forza 0..1 }.
   Costano: usale su una zona sola, con poche file, e saltale se P.fine(o) è falso. */
P.squame = (c, s, o) => {
  const q = {}, xs = [], ys = [], as = [], rs = [], fo = o.forza === undefined ? 1 : o.forza;
  let hmax = 0, lung = 0;
  for (let i = 0; i <= s.n; i++) { hmax = max(hmax, s.su[i] + s.giu[i]); if (i) lung += hypot(s.x[i] - s.x[i - 1], s.y[i] - s.y[i - 1]); }
  const R = (o.v1 - o.v0) / o.righe * hmax * .5 * .64, colonne = max(2, round((o.u1 - o.u0) * lung / (R * 1.5) * (o.fitte || 1)));
  for (let r = 0; r < o.righe; r++) for (let k = 0; k < colonne; k++) {
    const u = lerp(o.u0, o.u1, (k + (r % 2) * .5) / colonne), i = round(u * s.n);
    P.suSpina(s, u, lerp(o.v0, o.v1, (r + .5) / o.righe), q); xs.push(q.x); ys.push(q.y); as.push(q.ang + PI); rs.push(R * max(.45, (s.su[i] + s.giu[i]) / hmax));
  }
  for (let passata = 0; passata < 2; passata++) {                  // orlo scuro della squama e, subito dentro, filo di luce
    const k = passata ? .74 : 1, d = passata ? .9 : 1.15;
    c.beginPath(); for (let i = 0; i < xs.length; i++) { c.moveTo(xs[i] + cos(as[i] - d) * rs[i] * k, ys[i] + sin(as[i] - d) * rs[i] * k); c.arc(xs[i], ys[i], rs[i] * k, as[i] - d, as[i] + d); }
    c.strokeStyle = passata ? P.alfa(o.tinta.luce, .5 * fo) : P.alfa(o.tinta.scura, .55 * fo); c.lineWidth = R * (passata ? .14 : .2); c.lineCap = 'butt'; c.stroke();
  }
};
/* P.anelli(c, s, u0, u1, n, t, o): n solchi di traverso al corpo, da u0 a u1: anelli di gamberi e cavallucci, piastre
   delle corazze, pieghe del ventre, e le fessure delle branchie degli squali (v0 = -.45, v1 = .3, curva = .012).
   o: { v0, v1 (da dove a dove, -1.1 … 1.1), curva (di quanto il solco si gonfia verso il muso, in u), spess (.035) }.
   Si può usare in `dentro` oppure sopra il corpo. */
P.anelli = (c, s, u0, u1, n, t, o = {}) => {
  const v0 = o.v0 === undefined ? -1.1 : o.v0, v1 = o.v1 === undefined ? 1.1 : o.v1, cu = o.curva || 0, sp = o.spess || .035, a = {}, m = {}, z = {};
  for (let passata = 0; passata < 2; passata++) {
    const dx = passata ? sp * .7 : 0, dy = passata ? sp * .5 : 0;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? lerp(u0, u1, i / (n - 1)) : u0;
      P.suSpina(s, u, v0, a); P.suSpina(s, u + cu, (v0 + v1) / 2, m); P.suSpina(s, u, v1, z);
      c.moveTo(a.x + dx, a.y + dy); c.quadraticCurveTo(2 * m.x - (a.x + z.x) / 2 + dx, 2 * m.y - (a.y + z.y) / 2 + dy, z.x + dx, z.y + dy);
    }
    c.lineCap = 'round'; c.strokeStyle = passata ? P.alfa(t.luce, .5) : P.alfa(t.scura, .7); c.lineWidth = passata ? sp * .6 : sp; c.stroke();
  }
};

// =========================================================================== 6. OCCHI
/* P.SGUARDI: sguardi pronti, da unire alle opzioni di P.occhio con Object.assign: così tutte le creature parlano la stessa
   lingua. normale, calmo (palpebra un po' calata), felice (arco chiuso), contento, spaventato, colpito, cattivo (palpebra
   tagliata in diagonale, pupilla stretta), stordito (spirale), sconfitto (croce), addormentato. */
P.SGUARDI = {
  normale: { palpebra: .08 }, calmo: { palpebra: .2 }, felice: { tipo: 'chiuso' }, contento: { sotto: .34, brillio: 1.25 },
  spaventato: { pupilla: .6, grande: 1.12, brillio: .8 }, colpito: { tipo: 'stretto' }, cattivo: { palpebra: .34, taglio: .46, pupilla: .72, sotto: .1 },
  stordito: { tipo: 'spirale' }, sconfitto: { tipo: 'croce' }, addormentato: { palpebra: .62 },
};
/* P.sguardo(sg, x, y) → {x, y} fra -1 e 1: dal bersaglio dello sguardo (o.sguardo, in coordinate del modello) allo
   spostamento della pupilla dell'occhio che sta in (x, y). Senza bersaglio guarda avanti. Si passa a P.occhio come `guarda`. */
P.sguardo = (sg, x, y) => {
  if (!sg) return { x: .5, y: .05 };
  const dx = sg.x - x, dy = sg.y - y, d = hypot(dx, dy) || 1, k = min(1, d / .7) / d;
  return { x: dx * k, y: dy * k };
};
/* P.occhio(c, x, y, r, o): l'occhio da giocattolo: orbita scura, bulbo lucido, iride colorata, pupilla, due riflessi fissi,
   palpebre della tinta del corpo. (x, y) centro, r raggio (mai sotto .14: deve leggersi da piccolo). o: {
     iride (colore), pelle (tinta delle palpebre e dell'orbita: quella della testa), bianco (colore del bulbo, se non bianco),
     guarda {x, y} fra -1 e 1 (vedi P.sguardo), pupilla (1 = normale), raggioIride (quota del raggio, .7),
     tipo: 'tondo' | 'fessura' (pupilla verticale: predatori, murene) | 'barra' (pupilla orizzontale: polpi) | 'w' (seppie) |
           'perla' (pallina nera lucida: crostacei, creature minute) | 'chiuso' (arco felice) | 'stretto' (colpito, a >) |
           'croce' (sconfitto) | 'spirale' (stordito),
     palpebra 0..1 (quanto scende quella di sopra), taglio (radianti: la inclina; >0 scende verso il muso = cattivo),
     sotto 0..1 (palpebra di sotto che sale: sorriso), grande (ingrandisce), brillio (grandezza dei riflessi),
     ry (schiaccia in altezza, es. .8) }. Si disegna per ultimo, sopra il corpo. */
P.occhio = (c, x, y, r, o = {}) => {
  const pelle = o.pelle || P.tinta('#8090a0'), tipo = o.tipo || 'tondo', ir = o.iride || '#2a2350', gu = o.guarda || { x: .5, y: 0 };
  r *= o.grande || 1;
  c.save(); c.translate(x, y); if (o.ry) c.scale(1, o.ry);
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.arc(0, 0, r * 1.1, 0, TAU); c.fillStyle = pelle.bordo; c.fill();                // orbita scura
  if (tipo === 'chiuso' || tipo === 'stretto' || tipo === 'croce') {
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = tipo === 'croce' ? '#e9edf7' : pelle.chiara; c.fill();
    c.beginPath();
    if (tipo === 'chiuso') { c.moveTo(-r * .62, r * .2); c.quadraticCurveTo(0, -r * .85, r * .62, r * .2); }
    else if (tipo === 'stretto') { c.moveTo(-r * .5, -r * .5); c.lineTo(r * .42, 0); c.lineTo(-r * .5, r * .5); }
    else { c.moveTo(-r * .46, -r * .46); c.lineTo(r * .46, r * .46); c.moveTo(r * .46, -r * .46); c.lineTo(-r * .46, r * .46); }
    c.strokeStyle = pelle.bordo; c.lineWidth = r * .3; c.stroke();
    c.restore(); return;
  }
  if (tipo === 'perla') {
    const g = c.createRadialGradient(r * .3, -r * .35, r * .05, 0, 0, r); g.addColorStop(0, P.schiarisci(ir, .35)); g.addColorStop(.5, ir); g.addColorStop(1, '#0b0618');
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(r * .32, -r * .36, r * .3, 0, TAU); c.fill(); c.beginPath(); c.arc(-r * .34, r * .36, r * .13, 0, TAU); c.fill();
    c.restore(); return;
  }
  const bi = o.bianco || '#ffffff', g = c.createRadialGradient(r * .25, -r * .3, r * .1, 0, 0, r);
  g.addColorStop(0, bi); g.addColorStop(.72, o.bianco ? bi : '#f2f6ff'); g.addColorStop(1, o.bianco ? P.scurisci(bi, .35) : '#b4c3e6');
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill();
  c.save(); c.clip();
  if (tipo === 'spirale') {
    c.beginPath(); for (let i = 0; i <= 26; i++) { const a = i * .52, d = r * .82 * i / 26; c.lineTo(cos(a) * d, sin(a) * d); }
    c.strokeStyle = pelle.bordo; c.lineWidth = r * .17; c.stroke();
  } else {
    const ri = r * (o.raggioIride || .7), ix = gu.x * (r - ri) * .9, iy = gu.y * (r - ri) * .8, pu = (o.pupilla === undefined ? 1 : o.pupilla) * ri * .62;
    const gi = c.createRadialGradient(ix, iy + ri * .45, ri * .05, ix, iy, ri); gi.addColorStop(0, P.schiarisci(ir, .45)); gi.addColorStop(.55, ir); gi.addColorStop(1, P.scurisci(ir, .6));
    c.beginPath(); c.arc(ix, iy, ri, 0, TAU); c.fillStyle = gi; c.fill();
    c.fillStyle = '#120a22'; c.beginPath();
    const px = ix + gu.x * ri * .1, py = iy + gu.y * ri * .1;
    if (tipo === 'fessura') c.ellipse(px, py, pu * .36, pu * 1.35, 0, 0, TAU);
    else if (tipo === 'barra') c.ellipse(px, py, pu * 1.4, pu * .38, 0, 0, TAU);
    else if (tipo === 'w') { c.moveTo(px - pu * 1.2, py - pu * .5); c.quadraticCurveTo(px - pu * .6, py + pu * 1.5, px - pu * .25, py + pu * .1); c.quadraticCurveTo(px, py - pu * .35, px + pu * .25, py + pu * .1); c.quadraticCurveTo(px + pu * .6, py + pu * 1.5, px + pu * 1.2, py - pu * .5); c.quadraticCurveTo(px, py + pu * .25, px - pu * 1.2, py - pu * .5); }
    else c.arc(px, py, pu, 0, TAU);
    c.fill();
    const br = o.brillio === undefined ? 1 : o.brillio;                                            // riflessi fissi sulla cornea
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ix + ri * .3, iy - ri * .42, ri * .3 * br, 0, TAU); c.fill();
    c.beginPath(); c.arc(ix - ri * .4, iy + ri * .42, ri * .13 * br, 0, TAU); c.fill();
  }
  c.beginPath(); c.arc(-r * .1, r * .3, r * 1.12, 0, TAU); c.rect(r * 2, -r * 2, -r * 4, r * 4); c.fillStyle = 'rgba(40,24,90,.22)'; c.fill();   // ombra della palpebra
  const pa = o.palpebra || 0, ta = o.taglio || 0, so = o.sotto || 0;
  c.strokeStyle = pelle.bordo; c.lineWidth = r * .16;
  if (pa > 0 || ta) {
    const yl = -r * 1.2 + r * 2.2 * pa;
    c.save(); c.rotate(ta); c.beginPath(); c.moveTo(-r * 1.7, yl); c.quadraticCurveTo(0, yl + r * .34, r * 1.7, yl); c.lineTo(r * 1.7, -r * 2.5); c.lineTo(-r * 1.7, -r * 2.5); c.closePath();
    c.fillStyle = pelle.base; c.fill(); c.stroke(); c.restore();
  }
  if (so > 0) {
    const yl = r * 1.25 - r * 1.9 * so;
    c.beginPath(); c.moveTo(-r * 1.6, yl + r * .3); c.quadraticCurveTo(0, yl - r * .5, r * 1.6, yl + r * .3); c.lineTo(r * 1.6, r * 2.4); c.lineTo(-r * 1.6, r * 2.4); c.closePath();
    c.fillStyle = pelle.chiara; c.fill(); c.stroke();
  }
  c.restore(); c.restore();
};
/* P.sopracciglio(c, x, y, lung, ang, col, spess): virgola spessa sopra l'occhio. (x, y) centro, lung lunghezza,
   ang inclinazione (>0 scende verso il muso: cattivo; <0 sale: spaventato o triste), col colore (il bordo della tinta
   della testa), spess spessore (lung·.26). È il segno che più fa leggere «a caccia» da piccolo: fallo grosso. */
P.sopracciglio = (c, x, y, lung, ang, col, spess = lung * .26) => {
  c.save(); c.translate(x, y); c.rotate(ang); c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = spess;
  c.beginPath(); c.moveTo(-lung / 2, 0); c.quadraticCurveTo(0, -lung * .16, lung / 2, 0); c.stroke(); c.restore();
};

// =========================================================================== 7. BOCCHE E DENTI
/* P.denti(c, x0, y0, x1, y1, n, lung, verso = 1, o): fila di n denti lucidi lungo il tratto (x0, y0) → (x1, y1), lunghi lung.
   Puntano a sinistra di chi percorre il tratto se verso = 1, a destra se verso = -1 (tratto da sinistra a destra:
   verso 1 = in su, denti di sotto; verso -1 = in giù, denti di sopra). o: {
     tipo: 'punta' (zanne tonde) | 'ago' (denti di vetro, sottili) | 'piatto' (incisivi, becchi);
     curva (freccia della fila, per seguire un labbro curvo), arco (true = più corti ai capi della fila),
     piega (inclinazione, radianti), varia 0..1 (irregolarità di lunghezza e inclinazione), seme,
     largo (quota del passo occupata dal dente), colore, bordo (colore del contorno), spess (spessore del contorno) } */
P.denti = (c, x0, y0, x1, y1, n, lung, verso = 1, o = {}) => {
  const dx = x1 - x0, dy = y1 - y0, d = hypot(dx, dy) || 1, tx = dx / d, ty = dy / d, nx = ty * verso, ny = -tx * verso;
  const tipo = o.tipo || 'punta', la = (o.largo || (tipo === 'ago' ? .62 : .96)) * d / n / 2, cu = o.curva || 0, va = o.varia || 0, se = o.seme || 3;
  const col = o.colore || '#fffdf0', g = c.createLinearGradient(x0, y0, x0 + nx * lung, y0 + ny * lung);
  g.addColorStop(0, P.mescola(col, '#e8b9a8', .55)); g.addColorStop(.4, col); g.addColorStop(1, '#ffffff');
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const k = (i + .5) / n, sag = cu * 4 * k * (1 - k), cx = x0 + dx * k + nx * sag, cy = y0 + dy * k + ny * sag;
    const L = lung * (1 - va * U.rumore(i, se)) * (o.arco ? .55 + .45 * sin(k * PI) : 1), a = (o.piega || 0) + (U.rumore(i, se + 9) - .5) * va * .5, ca = cos(a), sa = sin(a);
    const ux = nx * ca - ny * sa, uy = ny * ca + nx * sa, px = cx + ux * L, py = cy + uy * L;      // punta del dente
    if (tipo === 'piatto') { c.moveTo(cx - tx * la, cy - ty * la); c.lineTo(cx - tx * la + ux * L * .7, cy - ty * la + uy * L * .7); c.quadraticCurveTo(px - tx * la, py - ty * la, px, py); c.quadraticCurveTo(px + tx * la, py + ty * la, cx + tx * la + ux * L * .7, cy + ty * la + uy * L * .7); c.lineTo(cx + tx * la, cy + ty * la); }
    else { const go = tipo === 'ago' ? .28 : .55; c.moveTo(cx - tx * la, cy - ty * la); c.quadraticCurveTo(cx - tx * la * go + ux * L * .6, cy - ty * la * go + uy * L * .6, px, py); c.quadraticCurveTo(cx + tx * la * go + ux * L * .6, cy + ty * la * go + uy * L * .6, cx + tx * la, cy + ty * la); }
    c.closePath();
  }
  c.lineJoin = 'round'; c.strokeStyle = o.bordo || 'rgba(70,30,70,.6)'; c.lineWidth = (o.spess || .022) * 2; c.stroke(); c.fillStyle = g; c.fill();
};
/* P.fauci(c, o) → { x0, y0, x1, y1, ang }: la linea delle gengive di sotto (da passare a P.denti con verso = 1) e la
   direzione della mandibola. Bocca grande a mandibola incernierata: cavità, lingua, mandibola lucida.
   SI DISEGNA PRIMA DEL CORPO, che ne copre la radice e fa da mascella di sopra. o: {
     x, y  cerniera (dentro il corpo, sotto e dietro l'occhio);   ang  direzione della bocca chiusa (verso il muso);
     lung  lunghezza della mandibola;   apri  apertura in radianti (0 chiusa; .5 aperta; 1 spalancata);
     alt   spessore della mandibola (lung·.35);
     su    di quanto (radianti) la cavità sale sopra la linea della bocca, nascosta dal corpo (.35);
     fondo 0..1 quanto è incavato il bordo davanti della cavità (.7);
     tinta, interno (colore della cavità), lingua (colore, o null), luce [x,y,r] nelle coordinate della mandibola
     (origine alla cerniera, x lungo la mandibola), ombra, bordo, dentro(c)  come in P.volume;
     parte  'cavita' = disegna solo cavità e lingua, 'mandibola' = solo la mandibola (se manca: tutto) }
   I denti di sopra si mettono DOPO il corpo, lungo il suo labbro, con verso = -1.
   Mandibola sporgente (rane pescatrici, barracuda, cernie): chiama P.fauci due volte con le stesse opzioni: parte 'cavita'
   PRIMA del corpo, poi il corpo, i denti di sopra, i denti di sotto e infine parte 'mandibola', che copre le radici dei denti. */
P.fauci = (c, o) => {
  const L = o.lung, h = o.alt || L * .35, a = o.ang + o.apri, su = o.ang - (o.su === undefined ? .35 : o.su), ca = cos(a), sa = sin(a), int = o.interno || '#7d1037';
  c.save(); c.translate(o.x, o.y);
  if (o.apri > .02 && o.parte !== 'mandibola') {                    // cavità, più scura verso la gola
    const g = c.createRadialGradient(0, 0, L * .1, 0, 0, L); g.addColorStop(0, P.scurisci(int, .75)); g.addColorStop(.55, int); g.addColorStop(1, P.schiarisci(int, .16));
    c.beginPath(); c.moveTo(-cos(o.ang) * L * .2, -sin(o.ang) * L * .2); c.lineTo(cos(su) * L * .97, sin(su) * L * .97);
    c.quadraticCurveTo(cos((su + a) / 2) * L * (o.fondo || .7), sin((su + a) / 2) * L * (o.fondo || .7), ca * L * .97, sa * L * .97); c.closePath();
    c.fillStyle = g; c.fill();
  }
  c.rotate(a);
  if (o.lingua && o.apri > .08 && o.parte !== 'mandibola') {
    const k = min(1, o.apri * 2.2), lt = P.tinta(o.lingua);
    c.beginPath(); c.ellipse(L * .46, -h * .1 * k, L * .34, h * .34 * k, -.06, 0, TAU); c.fillStyle = lt.base; c.fill(); c.strokeStyle = lt.ombra; c.lineWidth = .03; c.stroke();
    c.beginPath(); c.ellipse(L * .52, -h * .2 * k, L * .16, h * .09 * k, -.06, 0, TAU); c.fillStyle = P.alfa(lt.luce, .8); c.fill();
  }
  if (o.parte !== 'cavita') P.volume(c, cc => { cc.beginPath(); cc.moveTo(-L * .3, 0); cc.lineTo(L * .84, 0); cc.quadraticCurveTo(L * 1.03, 0, L * 1.0, h * .42); cc.quadraticCurveTo(L * .8, h * 1.05, L * .25, h); cc.quadraticCurveTo(-L * .2, h * .98, -L * .4, h * .3); cc.closePath(); },
    o.tinta, { luce: o.luce || [L * .6, h * .1, L * .9], ombra: o.ombra === undefined ? .08 : o.ombra, bordo: o.bordo, dentro: o.dentro });
  c.restore();
  return { x0: o.x + ca * L * .16, y0: o.y + sa * L * .16, x1: o.x + ca * L * .95, y1: o.y + sa * L * .95, ang: a };
};
/* P.labbra(c, x, y, ang, r, apri, t, o): boccuccia a labbra carnose in punta al muso, per i pesci dalla bocca piccola.
   (x, y) dove le labbra si toccano, ang direzione del muso, r grandezza, apri 0..1, t tinta delle labbra.
   o: { denti: quanti per fila (0 = nessuno), interno (colore) }. Si disegna DOPO il corpo. */
P.labbra = (c, x, y, ang, r, apri, t, o = {}) => {
  c.save(); c.translate(x, y); c.rotate(ang); c.lineJoin = 'round';
  if (apri > .03) {
    c.beginPath(); c.ellipse(-r * .1, r * .12 * apri, r * .62, r * (.16 + .8 * apri), 0, 0, TAU); c.fillStyle = o.interno || '#5a0c2c'; c.fill();
    if (o.denti) { P.denti(c, -r * .5, -r * (.1 + .5 * apri), r * .3, -r * (.2 + .62 * apri), o.denti, r * .32 * (.5 + apri), -1, { spess: .007 }); P.denti(c, -r * .5, r * (.2 + .7 * apri), r * .26, r * (.3 + .84 * apri), o.denti, r * .26 * (.5 + apri), 1, { spess: .007 }); }
  }
  for (const v of [-1, 1]) {
    c.save(); c.rotate(v * apri * (v < 0 ? .5 : .85));
    c.beginPath(); c.ellipse(r * .12, v * r * .36, r * .6, r * .4, v * .28, 0, TAU);
    c.strokeStyle = t.bordo; c.lineWidth = P.BORDO * 1.6; c.stroke(); c.fillStyle = v < 0 ? t.base : t.ombra; c.fill();
    c.beginPath(); c.ellipse(r * .22, v * r * .36 - r * .14, r * .26, r * .1, v * .28, 0, TAU); c.fillStyle = P.alfa(t.luce, .9); c.fill();
    c.restore();
  }
  c.restore();
};
/* P.sorriso(c, x, y, w, o): bocca «a lente» disegnata sul muso, per le facce viste di tre quarti (eroi, creature tonde,
   cetacei, tartarughe). (x, y) centro, w mezza larghezza. o: { ang, apri 0..1, alt (altezza massima dell'apertura),
   curva (-1 broncio … +1 sorriso), denti ('su', 'giu', 'tutti' o niente), lingua (false = senza), tinta (delle labbra:
   ne usa il bordo), interno (colore), spess (spessore del tratto) }. Chiusa è una riga curva. Si disegna DOPO il corpo. */
P.sorriso = (c, x, y, w, o = {}) => {
  const a = o.apri || 0, h = (o.alt || w) * a, k = (o.curva === undefined ? .6 : o.curva) * w * .55, t = o.tinta || P.tinta('#803050');
  const traccia = () => { c.beginPath(); c.moveTo(-w, -k); c.quadraticCurveTo(0, k * 1.5 - h * .5, w, -k); c.quadraticCurveTo(0, k * 1.5 + h * 1.9, -w, -k); c.closePath(); };
  c.save(); c.translate(x, y); c.rotate(o.ang || 0); c.lineJoin = 'round'; c.lineCap = 'round';
  traccia(); c.strokeStyle = t.bordo; c.lineWidth = o.spess || .075; c.stroke();
  if (h > .01) {
    const g = c.createLinearGradient(0, -h * .3, 0, h); g.addColorStop(0, P.scurisci(o.interno || '#8a1240', .55)); g.addColorStop(1, o.interno || '#8a1240');
    c.fillStyle = g; c.fill(); c.save(); c.clip();
    if (o.lingua !== false) { c.beginPath(); c.ellipse(w * .05, k * 1.5 + h * .95, w * .62, h * .5, 0, 0, TAU); c.fillStyle = '#ff7d9c'; c.fill(); c.beginPath(); c.ellipse(w * .1, k * 1.5 + h * .72, w * .3, h * .14, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,.45)'; c.fill(); }
    if (o.denti === 'su' || o.denti === 'tutti') { c.beginPath(); c.moveTo(-w, -k - .2); c.lineTo(w, -k - .2); c.lineTo(w, -k); c.quadraticCurveTo(0, k * 1.5 - h * .5 + min(h * .5, w * .34) * 2, -w, -k); c.closePath(); c.fillStyle = '#fffdf2'; c.fill(); }
    if (o.denti === 'giu' || o.denti === 'tutti') { c.beginPath(); c.moveTo(-w, h + w); c.lineTo(w, h + w); c.lineTo(w * .8, k + h * .6); c.quadraticCurveTo(0, k * 1.5 + h * 1.5, -w * .8, k + h * .6); c.closePath(); c.fillStyle = '#fffdf2'; c.fill(); }
    c.restore();
  }
  c.restore();
};

// =========================================================================== 8. TENTACOLI, ZAMPE, CHELE
/* P.tentacolo(c, o) → la spina del tentacolo (P.suSpina(s, 1) dà la punta, per attaccarci clave, esche, lucine).
   Nastro lucido che si assottiglia e si arriccia: braccia di polpi e seppie, steli, code prensili, filamenti grossi. o: {
     x, y radice;  ang direzione di partenza;  lung;  spess (diametro alla radice);  punta (diametro in punta);
     curva (di quanto gira in tutto, radianti: 0 dritto, ±3 ricciolo);
     onda (ampiezza dell'ondeggiare, radianti), fase (RADIANTI), onde (quante lungo il tentacolo);
     clava 0..1 (ingrossa la punta: i due tentacoli da preda di seppie e calamari);
     tinta;  luce [x,y,r] (facoltativa);  ombra, lume, bordo come in P.volume (ombra 0 e lume 0 = economico, per le braccia lontane);
     ventose: quante, lato (+1 o -1: da che parte stanno), chiara (colore delle ventose);
     n tratti (10);  dentro(c, s) motivi }.  La radice va nascosta sotto il corpo: i tentacoli si disegnano PRIMA. */
P.tentacolo = (c, o) => {
  const n = o.n || 10, sp = o.spess / 2, pu = (o.punta === undefined ? o.spess * .22 : o.punta) / 2, cl = o.clava || 0, cu = o.curva || 0, on = o.onda || 0, k0 = (o.onde || 1) * TAU;
  const s = P.spinaAngoli(n, o.x, o.y, o.lung, u => o.ang + cu * u * u + on * u * sin((o.fase || 0) - u * k0),
    u => lerp(sp, pu, pow(u, .8)) * (1 + cl * 1.6 * max(0, 1 - abs(u - .86) / .16)), { testa: pu * (1 + cl) });
  P.volume(c, s, o.tinta, { luce: o.luce, ombra: o.ombra === undefined ? sp * .5 : o.ombra, lume: o.lume === undefined ? (o.luce ? 0 : sp * .42) : o.lume, bordo: o.bordo, dentro: o.dentro && (cc => o.dentro(cc, s)) });
  if (o.ventose) {
    const q = {}, la = o.lato || 1; c.beginPath();
    for (let i = 0; i < o.ventose; i++) { const u = .1 + .86 * i / o.ventose, r = lerp(sp, pu, u) * .36; P.suSpina(s, u, la * .62, q); c.moveTo(q.x + r, q.y); c.arc(q.x, q.y, r, 0, TAU); }
    c.fillStyle = o.chiara || o.tinta.luce; c.fill(); c.strokeStyle = P.alfa(o.tinta.scura, .6); c.lineWidth = .016; c.stroke();
  }
  return s;
};
/* P.zampa(c, x, y, pezzi, t, o) → {x, y, ang} la punta. Zampa articolata di crostaceo (o d'insetto, o un braccio a snodi):
   parte da (x, y); pezzi = [[angolo, lunghezza], …] con angoli ASSOLUTI (0 = verso il muso, π/2 = in giù).
   o: { spess (diametro alla radice, .12), punta (diametro in punta), bordo }. Per camminare o remare si fanno oscillare
   gli angoli con la fase. Le zampe lontane si disegnano PRIMA del corpo con una tinta più scura, le vicine DOPO. */
P.zampa = (c, x, y, pezzi, t, o = {}) => {
  const n = pezzi.length, sp = o.spess || .12, pu = o.punta === undefined ? sp * .25 : o.punta, jx = [x], jy = [y], ax = [], ay = [], bx = [], by = [], w = [];
  for (let i = 0; i < n; i++) { jx[i + 1] = jx[i] + cos(pezzi[i][0]) * pezzi[i][1]; jy[i + 1] = jy[i] + sin(pezzi[i][0]) * pezzi[i][1]; }
  for (let i = 0; i <= n; i++) {
    const a = max(0, i - 1), b = min(n, i + 1), dx = jx[b] - jx[a], dy = jy[b] - jy[a], d = hypot(dx, dy) || 1;
    w[i] = lerp(sp, pu, i / n) / 2 * (i > 0 && i < n ? 1.15 : 1);                                  // giunture un po' ingrossate
    ax[i] = jx[i] + dy / d * w[i]; ay[i] = jy[i] - dx / d * w[i]; bx[i] = jx[i] - dy / d * w[i]; by[i] = jy[i] + dx / d * w[i];
  }
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(ax[0], ay[0]);
  for (let i = 1; i <= n; i++) c.lineTo(ax[i], ay[i]);
  for (let i = n; i >= 0; i--) c.lineTo(bx[i], by[i]);
  c.closePath();
  const b = o.bordo === undefined ? P.BORDO * .8 : o.bordo;
  if (b) { c.strokeStyle = t.bordo; c.lineWidth = b * 2; c.stroke(); }
  c.fillStyle = t.ombra; c.fill();
  for (let passata = 0; passata < 2; passata++) {                  // il dorso della zampa: fascia di colore pieno e filo di luce
    const su = passata ? .46 : .26;
    c.beginPath(); c.moveTo(jx[0], jy[0] - w[0] * su);
    for (let i = 1; i < n; i++) c.lineTo(jx[i], jy[i] - w[i] * su);
    c.lineTo(lerp(jx[n - 1], jx[n], .45), lerp(jy[n - 1], jy[n], .45) - lerp(w[n - 1], w[n], .45) * su);
    c.strokeStyle = passata ? P.alfa(t.luce, .85) : t.base; c.lineWidth = (sp + pu) / 2 * (passata ? .16 : .5); c.stroke();
  }
  if (n > 1) {                                                      // tacche scure alle giunture
    c.beginPath(); for (let i = 1; i < n; i++) { c.moveTo(lerp(jx[i], ax[i], .8), lerp(jy[i], ay[i], .8)); c.lineTo(lerp(jx[i], bx[i], .8), lerp(jy[i], by[i], .8)); }
    c.strokeStyle = P.alfa(t.bordo, .7); c.lineWidth = sp * .16; c.stroke();
  }
  return { x: jx[n], y: jy[n], ang: pezzi[n - 1][0] };
};
/* P.chela(c, x, y, ang, m, apri, t, o): chela di granchio, gambero o astice. (x, y) polso, ang direzione, m lunghezza,
   apri 0..1 (il dito mobile si alza). o: { lato (+1 dito mobile in alto, -1 in basso), punta (colore delle punte), bordo }.
   Di solito sta in fondo a una P.zampa: const p = P.zampa(…); P.chela(c, p.x, p.y, p.ang, …). */
P.chela = (c, x, y, ang, m, apri, t, o = {}) => {
  const la = o.lato || 1, ca = cos(ang) * m, sa = sin(ang) * m, X = (u, v) => x + u * ca - v * la * sa, Y = (u, v) => y + u * sa + v * la * ca;
  P.corno(c, X(.4, -.17), Y(.4, -.17), ang - la * (.12 + apri * .8), m * .66, m * .26, t, { curva: la * .5, punta: o.punta, bordo: o.bordo });   // dito mobile
  const p = [0, -.13, .2, -.3, .44, -.27, .56, -.09, .78, -.03, 1, -.13, .84, .15, .46, .31, .14, .24, -.02, .08], q = [];
  for (let i = 0; i < p.length; i += 2) q.push(X(p[i], p[i + 1]), Y(p[i], p[i + 1]));
  P.volume(c, cc => P.profilo(cc, q), t, { luce: [X(.4, -.2), Y(.4, -.2) - m * .1, m * 1.1], ombra: m * .07, bordo: o.bordo,
    dentro: o.punta && (cc => { cc.beginPath(); cc.arc(X(1.02, -.1), Y(1.02, -.1), m * .3, 0, TAU); cc.fillStyle = o.punta; cc.fill(); }) });
};

// =========================================================================== 9. ACCESSORI, ESPRESSIONI, STATI
/* P.corona(c, x, y, m, ang = 0, gemma): la corona dei giganti e dei capibranco: oro lucido con tre punte e gemme.
   (x, y) centro della base, m grandezza (è larga circa 2m e alta 1,4m), ang inclinazione, gemma colore della pietra. */
P.corona = (c, x, y, m, ang = 0, gemma = '#ff3d6e') => {
  const oro = P.tinta('#ffc21f');
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(m, m);
  P.volume(c, cc => { cc.beginPath(); cc.moveTo(-1, 0); cc.lineTo(-1.18, -1.05); cc.lineTo(-.52, -.5); cc.lineTo(0, -1.35); cc.lineTo(.52, -.5); cc.lineTo(1.18, -1.05); cc.lineTo(1, 0); cc.quadraticCurveTo(0, .22, -1, 0); cc.closePath(); },
    oro, { luce: [.3, -.6, 1.7], bordo: .09, ombra: .12 });
  c.beginPath(); c.moveTo(-.98, -.12); c.quadraticCurveTo(0, .1, .98, -.12); c.strokeStyle = P.alfa(oro.scura, .6); c.lineWidth = .08; c.stroke();
  const pietre = [[[0, -.36, .2]], [[-.6, -.24, .11], [.6, -.24, .11]], [[-1.18, -1.05, .13], [0, -1.35, .15], [1.18, -1.05, .13]]], colori = [gemma, '#5ad1ff', '#fff3b0'];
  c.strokeStyle = oro.bordo; c.lineWidth = .1;
  for (let k = 0; k < 3; k++) {                                     // gemma, pietre azzurre, perle sulle punte: ogni gruppo in un colpo
    c.beginPath(); for (const g of pietre[k]) { c.moveTo(g[0] + g[2], g[1]); c.arc(g[0], g[1], g[2], 0, TAU); }
    c.stroke(); c.fillStyle = colori[k]; c.fill();
  }
  c.beginPath(); for (const gruppo of pietre) for (const g of gruppo) { c.moveTo(g[0] + g[2] * .62, g[1] - g[2] * .35); c.arc(g[0] + g[2] * .3, g[1] - g[2] * .35, g[2] * .32, 0, TAU); }
  c.fillStyle = 'rgba(255,255,255,.9)'; c.fill();
  P.riflesso(c, .5, -.3, .34, -.9, .1, .8);
  c.restore();
};
/* P.stelle(c, x, y, giro, t, n = 3, r = .11): stelline gialle che girano in tondo attorno a (x, y), sopra la testa di chi
   è «colpito» (eroi) o «stordito» (giganti). giro = raggio del girotondo, t = o.t (secondi). */
P.stelle = (c, x, y, giro, t, n = 3, r = .11) => {
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = t * 5 + i * TAU / n, sx = x + cos(a) * giro, sy = y + sin(a) * giro * .3;
    for (let k = 0; k < 10; k++) { const q = k * PI / 5 + a, d = k % 2 ? r * .45 : r; if (k) c.lineTo(sx + cos(q) * d, sy + sin(q) * d); else c.moveTo(sx + cos(q) * d, sy + sin(q) * d); }
    c.closePath();
  }
  c.lineJoin = 'round'; c.strokeStyle = '#b86a00'; c.lineWidth = r * .36; c.stroke(); c.fillStyle = '#ffe14a'; c.fill();
};
/* P.goccia(c, x, y, r, ang = 0): goccia di sudore di chi è «spaventato». (x, y) centro della parte tonda, r raggio,
   ang inclinazione (la punta sta in alto). */
P.goccia = (c, x, y, r, ang = 0) => {
  c.save(); c.translate(x, y); c.rotate(ang); c.lineJoin = 'round';
  c.beginPath(); c.moveTo(0, -r * 1.9); c.bezierCurveTo(r * .35, -r * 1.1, r, -r * .5, r, 0); c.arc(0, 0, r, 0, PI); c.bezierCurveTo(-r, -r * .5, -r * .35, -r * 1.1, 0, -r * 1.9); c.closePath();
  c.strokeStyle = '#2f6fb8'; c.lineWidth = r * .36; c.stroke(); c.fillStyle = '#d2f2ff'; c.fill();
  c.beginPath(); c.ellipse(r * .3, -r * .25, r * .2, r * .34, .3, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
  c.restore();
};
/* P.statoGigante(o) → come si legge lo stato di un gigante, uguale per tutti e otto. Dalle opzioni (stato, carica, bocca, t)
   ricava: { stato, calmo, caccia, avviso, carica, stordito, sconfitto (uno solo è vero),
     k        o.carica fra 0 e 1;
     ira      0 calmo · .6 a caccia · da .6 a 1 durante l'avviso · 1 in carica: guida sopracciglia, colori accesi, pinne irte;
     apri     apertura consigliata della bocca, 0..1;
     occhi    lo sguardo pronto di P.SGUARDI (calmo, cattivo, stordito, sconfitto);
     trema    tremito in unità (da sommare alla x del corpo): cresce durante l'avviso;
     rincula  spostamento in x: si ritrae mentre prepara il colpo, si allunga quando parte;
     lampo    0..1 pulsazione dell'avviso, sempre più rapida: accendi con questa il segnale di pericolo (esca, occhi, creste);
     giu      true se stordito o sconfitto (pinne flosce, niente luci) }. */
P.statoGigante = o => {
  const st = o.stato || (o.minaccia ? 'caccia' : 'calmo'), k = max(0, min(1, o.carica || 0)), t = o.t || 0, b = o.bocca || 0;
  const caccia = st === 'caccia', avviso = st === 'avviso', carica = st === 'carica', stordito = st === 'stordito', sconfitto = st === 'sconfitto';
  const ira = avviso ? .6 + .4 * k : carica ? 1 : caccia ? .6 : 0;
  return { stato: st, calmo: !caccia && !avviso && !carica && !stordito && !sconfitto, caccia, avviso, carica, stordito, sconfitto, k, ira,
    apri: sconfitto ? .16 : stordito ? .3 : carica ? 1 : avviso ? max(b * .6, .3 + .6 * k) : caccia ? max(b, .4) : b * .6,
    occhi: sconfitto ? P.SGUARDI.sconfitto : stordito ? P.SGUARDI.stordito : ira ? P.SGUARDI.cattivo : P.SGUARDI.calmo,
    trema: avviso ? sin(t * 47) * .022 * k : carica ? sin(t * 61) * .01 : 0,
    rincula: avviso ? -.12 * k : carica ? .1 : 0,
    lampo: avviso ? k * (.55 + .45 * sin(t * (9 + 13 * k))) : 0,
    giu: stordito || sconfitto };
};
/* P.fine(o) → true se vanno disegnati anche i particolari minuti (o.dettaglio manca oppure è almeno .5). */
P.fine = o => o.dettaglio === undefined || o.dettaglio >= .5;
})();
