/** Piccoli attrezzi di matematica usati ovunque nel gioco. */

export const limita = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);
export const mescola = (a: number, b: number, t: number): number => a + (b - a) * t;
export function gradino(a: number, b: number, v: number): number {
  const t = limita((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Generatore di numeri casuali ripetibile: con lo stesso seme il mondo nasce sempre uguale. */
export function generatore(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const caso = (min: number, max: number): number => min + Math.random() * (max - min);

function grana(ix: number, iz: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Rumore morbido a due dimensioni, tra 0 e 1. */
export function rumore(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = grana(ix, iz);
  const b = grana(ix + 1, iz);
  const c = grana(ix, iz + 1);
  const d = grana(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Rumore a più strati (colline grandi con sopra increspature piccole), tra 0 e 1. */
export function rumoreStrati(x: number, z: number, strati = 4): number {
  let somma = 0;
  let peso = 0.5;
  let totale = 0;
  for (let i = 0; i < strati; i++) {
    somma += rumore(x, z) * peso;
    totale += peso;
    x = x * 2.03 + 17.1;
    z = z * 2.03 + 9.7;
    peso *= 0.5;
  }
  return somma / totale;
}
