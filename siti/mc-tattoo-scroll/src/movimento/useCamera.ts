// src/movimento/useCamera.ts — una "camera" che inquadra un disegno: zoom, punto di fuoco e rotazione
// cambiano lungo la scena seguendo dei fotogrammi chiave. Il fuoco è in coordinate del disegno.
import { useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { morbido } from '../arte/geometria.js';

export interface Fotogramma {
  p: number;
  /** Zoom (1 = disegno intero). */
  s: number;
  /** Punto del disegno da mettere al centro dell'inquadratura. */
  fx: number;
  fy: number;
  /** Rotazione in gradi. */
  r?: number;
}

export interface Camera {
  scale: MotionValue<number>;
  x: MotionValue<string>;
  y: MotionValue<string>;
  rotate: MotionValue<number>;
}

export function interpola(f: readonly Fotogramma[], p: number): Required<Fotogramma> {
  const primo = f[0]!;
  if (p <= primo.p) return { ...primo, r: primo.r ?? 0 };
  for (let i = 0; i < f.length - 1; i++) {
    const a = f[i]!;
    const b = f[i + 1]!;
    if (p <= b.p) {
      const t = morbido((p - a.p) / Math.max(1e-6, b.p - a.p));
      return {
        p,
        s: a.s + (b.s - a.s) * t,
        fx: a.fx + (b.fx - a.fx) * t,
        fy: a.fy + (b.fy - a.fy) * t,
        r: (a.r ?? 0) + ((b.r ?? 0) - (a.r ?? 0)) * t,
      };
    }
  }
  const ultimo = f[f.length - 1]!;
  return { ...ultimo, r: ultimo.r ?? 0 };
}

/** Da zoom e fuoco allo spostamento, in percentuale della scatola del disegno (lato `lato`). */
export const sposta = (s: number, fuoco: number, lato: number): string => `${(-(fuoco - lato / 2) / lato) * 100 * s}%`;

export function useCamera(p: MotionValue<number>, fotogrammi: readonly Fotogramma[], lato = 1000): Camera {
  const scale = useTransform(p, (v) => interpola(fotogrammi, v).s);
  const x = useTransform(p, (v) => {
    const k = interpola(fotogrammi, v);
    return sposta(k.s, k.fx, lato);
  });
  const y = useTransform(p, (v) => {
    const k = interpola(fotogrammi, v);
    return sposta(k.s, k.fy, lato);
  });
  const rotate = useTransform(p, (v) => interpola(fotogrammi, v).r);
  return { scale, x, y, rotate };
}
