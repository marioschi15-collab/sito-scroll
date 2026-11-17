import { NUOTA, type Omino, SCAPPA } from '../motore/omini.js';

type Rgb = readonly [number, number, number];

const VESTITI: readonly Rgb[] = [
  [230, 80, 80],
  [80, 150, 240],
  [250, 200, 70],
  [160, 110, 230],
  [90, 200, 150],
  [240, 140, 60],
];
const PELLI: readonly Rgb[] = [
  [242, 200, 158],
  [219, 168, 120],
  [169, 113, 76],
];
const CAPELLI: readonly Rgb[] = [
  [43, 29, 20],
  [107, 68, 35],
  [216, 178, 90],
  [201, 201, 210],
];
const GAMBE: Rgb = [143, 156, 201];
const CONTORNO = 'rgba(8, 12, 28, 0.6)';

/** Dove l'omino è disegnato in questo momento: insegue la sua posizione vera, così cammina invece di scattare. */
interface Posa {
  x: number;
  y: number;
  fase: number;
}

/** Disegna gli abitanti come piccoli personaggi: camminano, nuotano, scappano a braccia alzate, respirano. */
export class Personaggi {
  private readonly pose = new WeakMap<Omino, Posa>();

  disegna(ctx: CanvasRenderingContext2D, omini: readonly Omino[], cella: number, ingrandimento: number, luce: Rgb, tempo: number): void {
    // Di notte anche loro sono in penombra, ma mai tanto da sparire.
    const l: Rgb = [Math.max(0.62, luce[0]), Math.max(0.64, luce[1]), Math.max(0.7, luce[2])];
    const tinta = (c: Rgb): string => `rgb(${(c[0] * l[0]) | 0},${(c[1] * l[1]) | 0},${(c[2] * l[2]) | 0})`;
    for (const o of omini) {
      let posa = this.pose.get(o);
      if (!posa) {
        posa = { x: o.x, y: o.y, fase: Math.random() * 6 };
        this.pose.set(o, posa);
      }
      const dx = o.x - posa.x;
      const dy = o.y - posa.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 8) {
        posa.x = o.x;
        posa.y = o.y;
      } else {
        posa.x += dx * 0.3;
        posa.y += dy * 0.5;
      }
      const inMoto = Math.abs(dx) > 0.05;
      if (inMoto) posa.fase += o.stato === SCAPPA ? 0.7 : 0.4;

      // I bambini nascono piccoli e crescono.
      const s = cella * ingrandimento * (o.eta < 600 ? 0.6 + (0.4 * o.eta) / 600 : 1);
      const cx = (posa.x + 0.5) * cella;
      const nuota = o.stato === NUOTA;
      const scappa = o.stato === SCAPPA;
      const passo = inMoto || nuota ? Math.sin(posa.fase + (nuota ? tempo * 5 : 0)) : 0;
      const respiro = Math.sin(tempo * 2.2 + posa.fase) * 0.04;
      // Chi nuota sta immerso fino al petto e dondola con l'acqua.
      const piedi = (posa.y + 1) * cella - Math.abs(passo) * 0.1 * s + (nuota ? s * (1.1 + Math.sin(tempo * 3 + posa.fase) * 0.12) : 0);
      const g = Math.max(1, 0.16 * s);
      const rett = (x0: number, y0: number, x1: number, y1: number, gonfia = 0): void => {
        ctx.fillRect(cx + x0 * s - gonfia, piedi + y0 * s - gonfia, (x1 - x0) * s + gonfia * 2, (y1 - y0) * s + gonfia * 2);
      };
      const tondo = (y: number, r: number, da = 0, a = Math.PI * 2): void => {
        ctx.beginPath();
        ctx.arc(cx, piedi + y * s, r, da, a);
        ctx.fill();
      };
      const sinistra = Math.max(0, passo) * 0.3;
      const destra = Math.max(0, -passo) * 0.3;
      // Le braccia: lungo i fianchi quando cammina, in alto quando scappa, larghe quando nuota.
      const su = scappa ? -0.85 : nuota ? -0.35 + passo * 0.25 : passo * 0.15;
      const giu = scappa ? -0.85 : nuota ? -0.35 - passo * 0.25 : -passo * 0.15;
      const busto = -2.05 - respiro;

      if (nuota) {
        // Si vede solo quello che sta sopra il pelo dell'acqua.
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - 3 * s, 0, 6 * s, (posa.y + 0.35) * cella);
        ctx.clip();
      }
      ctx.fillStyle = CONTORNO;
      if (!nuota) rett(-0.5, -1, 0.5, 0, g);
      rett(-0.92, busto + Math.min(0, su, giu), 0.92, -0.9, g);
      tondo(-2.62 - respiro, 0.66 * s + g);

      if (!nuota) {
        ctx.fillStyle = tinta(GAMBE);
        rett(-0.5, -1, -0.08, -sinistra);
        rett(0.08, -1, 0.5, -destra);
      }
      ctx.fillStyle = tinta(PELLI[(o.aspetto >> 3) % PELLI.length]);
      rett(-0.92, busto + 0.1 + su, -0.62, busto + 0.85 + su);
      rett(0.62, busto + 0.1 + giu, 0.92, busto + 0.85 + giu);
      tondo(-2.62 - respiro, 0.66 * s);
      ctx.fillStyle = tinta(VESTITI[o.aspetto % VESTITI.length]);
      rett(-0.62, busto, 0.62, -0.9);
      ctx.fillStyle = tinta(CAPELLI[(o.aspetto >> 5) % CAPELLI.length]);
      tondo(-2.72 - respiro, 0.66 * s, Math.PI, Math.PI * 2);
      // L'occhio guarda dove va l'omino, e ogni tanto sbatte.
      if (s >= 4 && Math.sin(tempo * 1.3 + posa.fase * 3) < 0.97) {
        ctx.fillStyle = '#1a1a24';
        rett(o.dir * 0.3 - 0.1, -2.68 - respiro, o.dir * 0.3 + 0.1, -2.44 - respiro);
      }
      if (nuota) ctx.restore();
    }
  }
}
