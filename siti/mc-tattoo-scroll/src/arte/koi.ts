// La carpa che risale verso il sole: disegno originale, costruito punto per punto a partire dalla sua spina dorsale.
// Coordinate in un foglio 1000 × 1000. I tempi (da, a) dicono quando ogni segno si disegna, tra 0 e 1.
import {
  type Pt,
  campiona,
  casuale,
  curva1d,
  liscia,
  lunghezza,
  pennellata,
  per,
  ricampiona,
  riquadro,
  somma,
  unita,
} from './geometria.js';

export interface Pennellata {
  /** Sagoma piena, a spessore variabile. */
  d: string;
  /** Linea guida: serve a far comparire la pennellata e a disegnare lo stencil. */
  guida: string;
  larghezza: number;
  riquadro: { x: number; y: number; w: number; h: number };
  da: number;
  a: number;
}

export interface Linea {
  d: string;
  spessore: number;
  da: number;
  a: number;
  /** Per i segni fatti di tanti trattini uguali: la parte di lunghezza di ciascuno. */
  quota?: number;
}

export interface Goccia {
  c: Pt;
  r: number;
  da: number;
}

export const SOLE = { c: [704, 268] as Pt, r: 172 };

const N = 160;
const SPINA_CTRL: Pt[] = [
  [598, 236],
  [607, 322],
  [556, 430],
  [470, 524],
  [420, 628],
  [448, 730],
  [532, 798],
];
const spina = campiona(SPINA_CTRL, N);
const LUNGA = lunghezza(spina);
const MEZZA = 66;
const profilo = curva1d([
  [0, 0],
  [0.012, 0.27],
  [0.035, 0.5],
  [0.07, 0.68],
  [0.13, 0.85],
  [0.21, 0.97],
  [0.3, 1],
  [0.45, 0.93],
  [0.6, 0.76],
  [0.75, 0.54],
  [0.88, 0.35],
  [1, 0.25],
]);

interface Quadro {
  p: Pt;
  /** Verso la coda. */
  t: Pt;
  /** Verso il dorso. */
  n: Pt;
  mezza: number;
}

function quadro(t: number): Quadro {
  const x = Math.min(Math.max(t, 0), 1) * (N - 1);
  const i = Math.min(N - 2, Math.floor(x));
  const u = x - i;
  const a = spina[i]!;
  const b = spina[i + 1]!;
  const prima = spina[Math.max(0, i - 2)]!;
  const dopo = spina[Math.min(N - 1, i + 3)]!;
  const tg = unita([dopo[0] - prima[0], dopo[1] - prima[1]]);
  return {
    p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
    t: tg,
    n: [-tg[1], tg[0]].map((v) => v) as unknown as Pt,
    mezza: MEZZA * Math.max(0, profilo(t)),
  };
}

/** Punto del corpo: t lungo la spina (0 muso, 1 coda), u di traverso (1 dorso, −1 ventre). */
function sulCorpo(t: number, u: number): Pt {
  const q = quadro(t);
  return somma(q.p, per(q.n, u * q.mezza));
}

const passi = Array.from({ length: N }, (_, i) => i / (N - 1));
export const dorso: Pt[] = passi.map((t) => sulCorpo(t, 1));
export const ventre: Pt[] = passi.map((t) => sulCorpo(t, -1));

const pennellate: Pennellata[] = [];
const linee: Linea[] = [];
const sagome: string[] = [];
const gocce: Goccia[] = [];

function pennello(punti: readonly Pt[], larghezza: number, da: number, a: number, prof?: (s: number) => number): void {
  const fitti = ricampiona(punti, Math.max(12, Math.round(lunghezza(punti) / 7)));
  pennellate.push({
    d: pennellata(fitti, larghezza, prof),
    guida: liscia(fitti),
    larghezza,
    riquadro: riquadro(fitti, larghezza * 1.5 + 4),
    da,
    a,
  });
}
function linea(punti: readonly Pt[], spessore: number, da: number, a: number): void {
  linee.push({ d: liscia(punti), spessore, da, a });
}

// ——— Corpo ———
const contorno = (s: number): number => 0.5 + 0.5 * Math.sin(Math.PI * Math.pow(s, 0.62)) * (1 - 0.55 * s * s) + 0.04 * Math.sin(s * 30);
pennello(dorso, 10.5, 0, 0.2, contorno);
pennello(ventre, 8.5, 0.2, 0.34, contorno);
export const corpo = liscia([...dorso, ...[...ventre].reverse()], true);
sagome.push(corpo);

// ——— Testa ———
export const OCCHIO = { c: sulCorpo(0.072, 0.46), r: 8.5 };
{
  const { c, r } = OCCHIO;
  const giro: Pt[] = Array.from({ length: 25 }, (_, i) => {
    const th = (i / 24) * Math.PI * 2 + 2;
    return [c[0] + Math.cos(th) * r, c[1] + Math.sin(th) * r] as Pt;
  });
  linee.push({ d: liscia(giro), spessore: 3, da: 0.3, a: 0.35 });
  gocce.push({ c: [c[0] + 1, c[1] + 1], r: 3.6, da: 0.345 });
}
const branchia = (t0: number, da: number, a: number, apertura: number): Pt[] =>
  Array.from({ length: 17 }, (_, i) => {
    const u = da + ((a - da) * i) / 16;
    return sulCorpo(t0 + apertura * (1 - u * u), u);
  });
pennello(branchia(0.158, 0.96, -0.9, 0.052), 6.5, 0.33, 0.39);
linea(branchia(0.142, 0.7, -0.55, 0.04), 2.2, 0.36, 0.4);
for (const lato of [1, -1]) {
  const q = quadro(0.03);
  const inizio = somma(q.p, per(q.n, lato * q.mezza * 0.92));
  const via = (avanti: number, fuori: number): Pt => somma(inizio, somma(per(q.t, -avanti), per(q.n, lato * fuori)));
  pennello([inizio, via(13, 13), via(12, 34), via(-2, 50), via(-20, 55)], 4.2, 0.37 + (lato < 0 ? 0.02 : 0), 0.42 + (lato < 0 ? 0.02 : 0));
}
linea([sulCorpo(0.022, -0.5), sulCorpo(0.034, -0.1), sulCorpo(0.03, 0.35)], 2.2, 0.38, 0.41);

// ——— Pinne ———
interface OpzioniPinna {
  ricciolo?: (x: number) => number;
  base?: number;
  forma?: (x: number) => number;
}
function pinna(base: Pt, angolo: number, lunga: number, apertura: number, m: number, da: number, a: number, o: OpzioniPinna = {}): void {
  const perp: Pt = [-Math.sin(angolo), Math.cos(angolo)];
  const forma = o.forma ?? ((x: number) => 0.66 + 0.34 * Math.sin(Math.PI * (0.12 + 0.76 * x)));
  const raggi: Pt[][] = [];
  for (let i = 0; i < m; i++) {
    const x = i / (m - 1);
    const b = somma(base, per(perp, (x - 0.5) * (o.base ?? lunga * 0.16)));
    const phi = angolo + (x - 0.5) * apertura;
    const riccio = o.ricciolo ? o.ricciolo(x) : 0;
    const l = lunga * forma(x);
    const raggio: Pt[] = [];
    for (let s = 0; s <= 10; s++) {
      const q = s / 10;
      const ang = phi + riccio * q * q;
      raggio.push([b[0] + Math.cos(ang) * l * q, b[1] + Math.sin(ang) * l * q]);
    }
    raggi.push(raggio);
  }
  const punte = raggi.slice(1, -1).map((r) => r[10]!);
  const bordo = campiona([...raggi[0]!.filter((_, k) => k % 2 === 0), ...punte, ...[...raggi[m - 1]!].reverse().filter((_, k) => k % 2 === 0)], 70);
  pennello(bordo, 6.5, da, a, (s) => 0.55 + 0.45 * Math.sin(Math.PI * s));
  sagome.push(liscia(bordo, true));
  raggi.slice(1, -1).forEach((r, k) => {
    const x = k / Math.max(1, m - 3);
    linea(r.slice(2, 10), 1.9, da + (a - da) * (0.35 + 0.4 * x), a + 0.02);
  });
}
const ang = (v: Pt): number => Math.atan2(v[1], v[0]);
{
  const q = quadro(0.215);
  pinna(somma(q.p, per(q.n, -q.mezza * 0.9)), ang(somma(per(q.n, -0.82), per(q.t, 0.58))), 122, 1.05, 8, 0.38, 0.48, { ricciolo: () => 0.5 });
  const r = quadro(0.2);
  pinna(somma(r.p, per(r.n, r.mezza * 0.9)), ang(somma(per(r.n, 0.85), per(r.t, 0.52))), 84, 0.9, 6, 0.42, 0.5, { ricciolo: () => -0.45 });
  const s = quadro(0.53);
  pinna(somma(s.p, per(s.n, -s.mezza * 0.9)), ang(somma(per(s.n, -0.72), per(s.t, 0.7))), 66, 0.85, 5, 0.58, 0.64, { ricciolo: () => 0.45 });
  const u = quadro(0.79);
  pinna(somma(u.p, per(u.n, -u.mezza * 0.85)), ang(somma(per(u.n, -0.7), per(u.t, 0.72))), 46, 0.8, 4, 0.61, 0.66, { ricciolo: () => 0.4 });
  // coda: due lobi che si aprono a ventaglio
  const c = quadro(1);
  pinna(c.p, ang(c.t) + 0.08, 196, 1.7, 13, 0.6, 0.74, {
    base: c.mezza * 1.7,
    forma: (x) => (1 - 0.45 * Math.exp(-(((x - 0.5) / 0.14) ** 2))) * (0.86 + 0.14 * Math.sin(Math.PI * x)),
    ricciolo: (x) => (x - 0.5) * 1.25,
  });
}
// pinna dorsale: una vela bassa lungo la schiena
{
  const m = 15;
  const punte: Pt[] = [];
  const basi: Pt[] = [];
  for (let i = 0; i < m; i++) {
    const x = i / (m - 1);
    const t = 0.3 + 0.33 * x;
    const q = quadro(t);
    const b = somma(q.p, per(q.n, q.mezza));
    const dir = unita(somma(per(q.n, 0.78), per(q.t, 0.8)));
    const h = 8 + 46 * Math.pow(Math.sin(Math.PI * Math.pow(x, 0.6)), 0.8) * (1 - 0.3 * x);
    basi.push(b);
    punte.push(somma(b, per(dir, h)));
  }
  const bordo = campiona([basi[0]!, ...punte, basi[m - 1]!], 60);
  pennello(bordo, 6, 0.44, 0.56, (s) => 0.5 + 0.5 * Math.sin(Math.PI * s));
  sagome.push(liscia([...bordo, ...basi.slice().reverse()], true));
  for (let i = 1; i < m - 1; i++) {
    const b = basi[i]!;
    const p = punte[i]!;
    linea([somma(b, per(somma(p, per(b, -1)), 0.12)), somma(b, per(somma(p, per(b, -1)), 0.88))], 1.8, 0.48 + 0.06 * (i / m), 0.56 + 0.04 * (i / m));
  }
}

// ——— Scaglie ———
const VENTRE_U = -0.5;
{
  const file: { t: number; r: number }[] = [];
  let t = 0.235;
  while (t < 0.94) {
    const r = quadro(t).mezza * 0.27;
    file.push({ t, r });
    t += (r * 0.98) / LUNGA;
  }
  file.forEach((fila, k) => {
    const q = quadro(fila.t);
    let d = '';
    let quante = 0;
    for (let j = -4; j <= 4; j++) {
      const u = (j + (k % 2) * 0.5) * 0.5;
      if (u < VENTRE_U - 0.2 || u > 1.2) continue;
      const c = somma(q.p, per(q.n, u * q.mezza));
      const arco: Pt[] = [];
      for (let s = 0; s <= 8; s++) {
        const th = (s / 8) * Math.PI;
        arco.push(somma(c, somma(per(q.n, fila.r * Math.cos(th)), per(q.t, fila.r * 1.08 * Math.sin(th)))));
      }
      d += liscia(arco);
      quante++;
    }
    const da = 0.46 + 0.2 * (k / file.length);
    linee.push({ d, spessore: 2.1, da, a: da + 0.05, quota: 1 / quante });
  });
}
export const zonaScaglie = liscia(
  [
    ...branchia(0.165, 1.05, VENTRE_U, 0.052),
    ...passi.filter((t) => t > 0.2 && t < 0.955).map((t) => sulCorpo(t, VENTRE_U)),
    ...passi
      .filter((t) => t > 0.2 && t < 0.955)
      .map((t) => sulCorpo(t, 1.05))
      .reverse(),
  ],
  true,
);
linea(
  passi.filter((t) => t > 0.225 && t < 0.93).map((t) => sulCorpo(t, VENTRE_U)),
  2.2,
  0.5,
  0.62,
);

// ——— Chiazze rosse (il rosso arriva per ultimo) ———
function chiazza(t0: number, u0: number, rt: number, ru: number, seme: number): string {
  const c = casuale(seme);
  const fasi = [c() * 6, c() * 6, c() * 6];
  const pts: Pt[] = [];
  for (let i = 0; i < 44; i++) {
    const th = (i / 44) * Math.PI * 2;
    const k = 1 + 0.16 * Math.sin(2 * th + fasi[0]!) + 0.1 * Math.sin(3 * th + fasi[1]!) + 0.06 * Math.sin(5 * th + fasi[2]!);
    pts.push(sulCorpo(Math.min(0.985, Math.max(0.004, t0 + rt * k * Math.cos(th))), u0 + ru * k * Math.sin(th)));
  }
  return liscia(pts, true);
}
export const chiazze: { d: string; c: Pt; r: number }[] = [
  { d: chiazza(0.112, -0.02, 0.046, 0.52, 3), c: sulCorpo(0.112, -0.02), r: 44 },
  { d: chiazza(0.37, 0.62, 0.085, 0.7, 8), c: sulCorpo(0.37, 0.5), r: 82 },
  { d: chiazza(0.61, 0.5, 0.07, 0.8, 5), c: sulCorpo(0.61, 0.4), r: 66 },
  { d: chiazza(0.84, 0.3, 0.045, 0.9, 11), c: sulCorpo(0.84, 0.3), r: 44 },
];

// ——— Onde ———
function cresta(cx: number, cy: number, r: number, verso: 1 | -1, giri: number, lontano: number, da: number, a: number, larga: number): void {
  const pts: Pt[] = [
    [cx - verso * r * lontano, cy + r * 1.45],
    [cx - verso * r * (lontano * 0.62), cy + r * 1.22],
    [cx - verso * r * 1.55, cy + r * 0.72],
  ];
  const th0 = verso === 1 ? Math.PI : 0;
  const quanti = Math.round(46 * giri);
  for (let k = 0; k <= quanti; k++) {
    const x = k / 46;
    const th = th0 + verso * x * Math.PI * 2;
    const rr = r * (1 - 0.56 * Math.pow(x / 1.3, 0.85));
    pts.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]);
  }
  pennello(pts, larga, da, a, (s) => (0.3 + 0.7 * Math.sin(Math.PI * Math.pow(s, 0.8))) * (1 - 0.6 * s * s));
}
function onda(cx: number, cy: number, r: number, verso: 1 | -1, da: number): void {
  cresta(cx, cy, r, verso, 1.3, 4.2, da, da + 0.1, 9.5);
  cresta(cx, cy + r * 0.06, r * 1.34, verso, 0.36, 3.6, da + 0.03, da + 0.1, 6);
  cresta(cx, cy + r * 0.12, r * 1.68, verso, 0.26, 3.1, da + 0.05, da + 0.11, 4.5);
  const c = casuale(Math.round(cx * 7 + cy));
  for (let i = 0; i < 7; i++) {
    const th = -Math.PI / 2 + verso * (0.2 + c() * 1.5);
    const d = r * (1.5 + c() * 1.3);
    gocce.push({ c: [cx + Math.cos(th) * d, cy + Math.sin(th) * d * 0.8], r: 2 + c() * 3.4, da: da + 0.1 + c() * 0.06 });
  }
}
onda(196, 846, 62, 1, 0.7);
onda(812, 868, 54, -1, 0.75);
onda(560, 930, 34, 1, 0.8);
function increspatura(y: number, x0: number, x1: number, amp: number, fase: number, da: number, larga: number): void {
  const pts: Pt[] = [];
  for (let x = x0; x <= x1; x += 22) pts.push([x, y + amp * Math.sin(x / 58 + fase) + amp * 0.4 * Math.sin(x / 23 + fase * 2)]);
  pennello(pts, larga, da, da + 0.1);
}
increspatura(912, 250, 760, 7, 0.4, 0.8, 6);
increspatura(952, -30, 470, 8, 1.9, 0.82, 7);
increspatura(968, 600, 1030, 7, 3.1, 0.84, 6);
increspatura(990, 150, 900, 5, 5.2, 0.86, 4.5);
// cerchi nell'acqua dove la coda la rompe
for (const [rx, ry, da] of [
  [86, 15, 0.78],
  [138, 24, 0.81],
] as const) {
  const arco = (a0: number, a1: number): Pt[] =>
    Array.from({ length: 15 }, (_, i) => {
      const th = a0 + ((a1 - a0) * i) / 14;
      return [568 + Math.cos(th) * rx, 872 + Math.sin(th) * ry] as Pt;
    });
  linea(arco(0.3, 2.6), 2.2, da, da + 0.06);
  linea(arco(3.5, 5.6), 2.2, da + 0.02, da + 0.08);
}

export const koi = { pennellate, linee, sagome, gocce } as const;
