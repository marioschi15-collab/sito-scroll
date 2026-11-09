// src/regia/colore.ts — piccole utilità per fondere i colori esadecimali.

export type Rgb = readonly [number, number, number];

export function daEsadecimale(hex: string): Rgb {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function fondi(a: Rgb, b: Rgb, t: number): string {
  const c = (i: 0 | 1 | 2): number => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${c(0)} ${c(1)} ${c(2)})`;
}
