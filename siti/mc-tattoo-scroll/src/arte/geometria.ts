// Piccoli attrezzi di geometria: tutto il disegno del sito nasce da qui, calcolato e non copiato.

export type Pt = readonly [number, number];

const r1 = (v: number): number => Math.round(v * 10) / 10;
const f = (p: Pt): string => `${r1(p[0])} ${r1(p[1])}`;

export const somma = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const per = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
export const dist = (a: Pt, b: Pt): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const limita = (v: number, min = 0, max = 1): number => Math.min(max, Math.max(min, v));
export const morbido = (v: number): number => {
  const t = limita(v);
  return t * t * (3 - 2 * t);
};
export const unita = (a: Pt): Pt => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};

/** Generatore di numeri "a caso" ma sempre uguali: il disegno non cambia da un avvio all'altro. */
export function casuale(seme: number): () => number {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curva morbida che passa per tutti i punti. */
export function liscia(p: readonly Pt[], chiusa = false): string {
  const n = p.length;
  if (n < 2) return '';
  const at = (i: number): Pt => (chiusa ? p[(i + n) % n]! : p[Math.max(0, Math.min(n - 1, i))]!);
  let d = `M${f(p[0]!)}`;
  const fine = chiusa ? n : n - 1;
  for (let i = 0; i < fine; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1)} ${f(c2)} ${f(p2)}`;
  }
  return chiusa ? `${d}Z` : d;
}

export function lunghezza(p: readonly Pt[]): number {
  let l = 0;
  for (let i = 1; i < p.length; i++) l += dist(p[i - 1]!, p[i]!);
  return l;
}

/** Ridistribuisce i punti a passo costante lungo la linea. */
export function ricampiona(p: readonly Pt[], n: number): Pt[] {
  const tot = lunghezza(p);
  const out: Pt[] = [p[0]!];
  let i = 1;
  let fatto = 0;
  for (let k = 1; k < n - 1; k++) {
    const meta = (tot * k) / (n - 1);
    while (i < p.length - 1 && fatto + dist(p[i - 1]!, p[i]!) < meta) {
      fatto += dist(p[i - 1]!, p[i]!);
      i++;
    }
    const a = p[i - 1]!;
    const b = p[i]!;
    const t = (meta - fatto) / (dist(a, b) || 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  out.push(p[p.length - 1]!);
  return out;
}

/** Curva morbida per i punti di controllo, restituita come n punti a passo costante. */
export function campiona(ctrl: readonly Pt[], n: number): Pt[] {
  const fitti: Pt[] = [];
  const at = (i: number): Pt => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))]!;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < 20; s++) {
      const t = s / 20;
      const t2 = t * t;
      const t3 = t2 * t;
      const q = (a: number, b: number, c: number, e: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - e) * t2 + (-a + 3 * b - 3 * c + e) * t3);
      fitti.push([q(p0[0], p1[0], p2[0], p3[0]), q(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  fitti.push(ctrl[ctrl.length - 1]!);
  return ricampiona(fitti, n);
}

/** Punto e direzione a una certa frazione (0–1) della linea. */
export function lungo(p: readonly Pt[], frazione: number): { p: Pt; t: Pt } {
  const tot = lunghezza(p);
  const meta = tot * limita(frazione);
  let fatto = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1]!;
    const b = p[i]!;
    const l = dist(a, b);
    if (fatto + l >= meta || i === p.length - 1) {
      const t = l ? limita((meta - fatto) / l) : 0;
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], t: unita([b[0] - a[0], b[1] - a[1]]) };
    }
    fatto += l;
  }
  return { p: p[0]!, t: [1, 0] };
}

/** Come cambia lo spessore lungo una pennellata: attacco deciso, pancia piena, coda sottile. */
export const profiloPennello = (s: number): number =>
  (0.34 + 0.66 * Math.sin(Math.PI * Math.pow(s, 0.7))) * (1 - 0.72 * s * s * s) + 0.05 * Math.sin(s * 21);

/** Sagoma piena di una pennellata attorno alla sua linea guida. */
export function pennellata(p: readonly Pt[], larghezza: number, profilo: (s: number) => number = profiloPennello): string {
  const n = p.length;
  const sx: Pt[] = [];
  const dx: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)]!;
    const b = p[Math.min(n - 1, i + 1)]!;
    const t = unita([b[0] - a[0], b[1] - a[1]]);
    const w = (larghezza / 2) * Math.max(0.06, profilo(i / (n - 1)));
    sx.push([p[i]![0] - t[1] * w, p[i]![1] + t[0] * w]);
    dx.push([p[i]![0] + t[1] * w, p[i]![1] - t[0] * w]);
  }
  return liscia([...sx, ...dx.reverse()], true);
}

/** Macchia d'inchiostro di raggio circa 100, con il bordo irregolare. */
export function macchia(seme: number, irregolarita = 0.14, n = 96): string {
  const c = casuale(seme);
  const onde = Array.from({ length: 9 }, (_, k) => ({ k: k + 2, a: (c() * 0.7 + 0.3) / (k + 2), f: c() * Math.PI * 2 }));
  const fini = Array.from({ length: 5 }, (_, k) => ({ k: 13 + k * 5, a: (c() * 0.5 + 0.2) / 9, f: c() * Math.PI * 2 }));
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    let r = 1;
    for (const o of [...onde, ...fini]) r += irregolarita * o.a * Math.sin(o.k * th + o.f);
    pts.push([Math.cos(th) * r * 100, Math.sin(th) * r * 100]);
  }
  return liscia(pts, true);
}

/** Rettangolo che contiene i punti, con un margine. */
export function riquadro(p: readonly Pt[], margine: number): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const q of p) {
    x0 = Math.min(x0, q[0]);
    y0 = Math.min(y0, q[1]);
    x1 = Math.max(x1, q[0]);
    y1 = Math.max(y1, q[1]);
  }
  return { x: Math.round(x0 - margine), y: Math.round(y0 - margine), w: Math.round(x1 - x0 + margine * 2), h: Math.round(y1 - y0 + margine * 2) };
}

/** Curva a una dimensione che passa per le chiavi [t, valore]. */
export function curva1d(chiavi: readonly Pt[]): (t: number) => number {
  return (t) => {
    if (t <= chiavi[0]![0]) return chiavi[0]![1];
    const ult = chiavi[chiavi.length - 1]!;
    if (t >= ult[0]) return ult[1];
    let i = 0;
    while (chiavi[i + 1]![0] < t) i++;
    const a = chiavi[i]!;
    const b = chiavi[i + 1]!;
    const pa = chiavi[Math.max(0, i - 1)]!;
    const pb = chiavi[Math.min(chiavi.length - 1, i + 2)]!;
    const u = (t - a[0]) / (b[0] - a[0]);
    // tangenti alla Catmull-Rom, attente ai passi irregolari
    const ma = ((b[1] - pa[1]) / (b[0] - pa[0] || 1)) * (b[0] - a[0]);
    const mb = ((pb[1] - a[1]) / (pb[0] - a[0] || 1)) * (b[0] - a[0]);
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * a[1] + (u3 - 2 * u2 + u) * ma + (-2 * u3 + 3 * u2) * b[1] + (u3 - u2) * mb;
  };
}
