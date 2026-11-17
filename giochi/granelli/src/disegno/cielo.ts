import { faseDelGiorno, luceDelGiorno } from '../motore/tempo.js';

type Rgb = readonly [number, number, number];

/** Che ora è nel mondo, tradotta in ciò che serve per disegnarlo. */
export interface Ora {
  /** Dove siamo nel giro del giorno: 0 alba, 0.25 mezzogiorno, 0.5 tramonto, 0.75 mezzanotte. */
  fase: number;
  /** 1 in pieno giorno, 0 in piena notte. */
  giorno: number;
  /** 1 nel momento più rosso di alba e tramonto, 0 altrimenti. */
  crepuscolo: number;
  /** Il colore della luce che cade su ogni cosa (1 = luce piena). */
  ambiente: Rgb;
}

const mescola = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: Rgb, a = 1): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const LUCE_NOTTE: Rgb = [0.5, 0.57, 0.88];
const LUCE_GIORNO: Rgb = [1, 1, 1];
const LUCE_TRAMONTO: Rgb = [1, 0.8, 0.66];

const ALTO_NOTTE: Rgb = [6, 10, 30];
const BASSO_NOTTE: Rgb = [28, 44, 96];
const ALTO_GIORNO: Rgb = [58, 140, 226];
const BASSO_GIORNO: Rgb = [190, 228, 255];
const ALTO_TRAMONTO: Rgb = [52, 44, 104];
const BASSO_TRAMONTO: Rgb = [255, 150, 92];

export function oraDelMondo(tic: number): Ora {
  const fase = faseDelGiorno(tic);
  const giorno = luceDelGiorno(tic);
  const crepuscolo = Math.pow(1 - Math.abs(giorno * 2 - 1), 1.4);
  const ambiente = mescola(mescola(LUCE_NOTTE, LUCE_GIORNO, giorno), LUCE_TRAMONTO, crepuscolo * 0.55);
  return { fase, giorno, crepuscolo, ambiente };
}

interface Stella {
  x: number;
  y: number;
  r: number;
  ritmo: number;
}

/**
 * Lo sfondo: il cielo che cambia colore con l'ora, il sole e la luna che lo attraversano, le stelle che tremolano
 * e due file di montagne lontane. Non fa parte del mondo: è il posto in cui il mondo sta.
 */
export class Cielo {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stelle: Stella[] = [];
  private readonly creste: number[][] = [];

  constructor(
    private readonly tela: HTMLCanvasElement,
    seme: number,
  ) {
    this.ctx = tela.getContext('2d')!;
    let s = seme | 0 || 1;
    const caso = (): number => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
    for (let i = 0; i < 90; i++) this.stelle.push({ x: caso(), y: caso() * 0.75, r: 0.5 + caso() * 1.1, ritmo: 0.5 + caso() * 2 });
    // Due profili di montagne: quello lontano più alto e dolce, quello vicino più basso e frastagliato.
    for (const [alto, mosso] of [
      [0.36, 3],
      [0.24, 5],
    ]) {
      const fasi = [caso() * 7, caso() * 7, caso() * 7];
      const cresta: number[] = [];
      for (let i = 0; i <= 64; i++) {
        const x = i / 64;
        cresta.push(
          alto * (0.72 + 0.2 * Math.sin(x * mosso + fasi[0]) + 0.11 * Math.sin(x * mosso * 2.7 + fasi[1]) + 0.05 * Math.sin(x * mosso * 7 + fasi[2])),
        );
      }
      this.creste.push(cresta);
    }
  }

  disegna(ora: Ora, tempo: number, arcobaleno = 0): void {
    const { ctx, tela } = this;
    const w = tela.width;
    const h = tela.height;
    const alto = mescola(mescola(ALTO_NOTTE, ALTO_GIORNO, ora.giorno), ALTO_TRAMONTO, ora.crepuscolo * 0.8);
    const basso = mescola(mescola(BASSO_NOTTE, BASSO_GIORNO, ora.giorno), BASSO_TRAMONTO, ora.crepuscolo * 0.9);
    const sfumatura = ctx.createLinearGradient(0, 0, 0, h);
    sfumatura.addColorStop(0, css(alto));
    sfumatura.addColorStop(0.78, css(basso));
    sfumatura.addColorStop(1, css(mescola(basso, [255, 255, 255], 0.12)));
    ctx.fillStyle = sfumatura;
    ctx.fillRect(0, 0, w, h);

    const buio = 1 - ora.giorno;
    if (buio > 0.05) {
      ctx.fillStyle = '#fff';
      for (const s of this.stelle) {
        ctx.globalAlpha = buio * (0.45 + 0.55 * Math.sin(tempo * s.ritmo + s.x * 40));
        const r = Math.max(1, s.r * (w / 420));
        ctx.fillRect(s.x * w, s.y * h, r, r);
      }
      ctx.globalAlpha = 1;
    }

    // Il sole sale a sinistra e scende a destra; la luna fa lo stesso giro, mezza giornata dopo.
    const giro = ora.fase * Math.PI * 2;
    const orizzonte = h * 0.82;
    const raggio = Math.max(10, Math.min(w, h) * 0.055);
    this.astro(w * (0.5 - 0.42 * Math.cos(giro)), orizzonte - Math.sin(giro) * h * 0.7, raggio, [255, 236, 170], [255, 190, 90], 1);
    this.astro(w * (0.5 + 0.42 * Math.cos(giro)), orizzonte + Math.sin(giro) * h * 0.7, raggio * 0.8, [232, 238, 255], [150, 170, 230], buio);

    // Quando piove col sole, un arcobaleno attraversa il cielo dietro le montagne.
    if (arcobaleno > 0.02) {
      const cx = w * 0.5;
      const cy = h * 0.92;
      const raggioArco = Math.min(w * 0.62, h * 0.7);
      const fascia = Math.max(2, raggioArco * 0.022);
      const colori = ['#ff5a5a', '#ffa64d', '#ffe65a', '#6fdc6f', '#5ab4ff', '#7a6cf0', '#b06ce0'];
      ctx.globalAlpha = 0.55 * arcobaleno;
      ctx.lineWidth = fascia + 0.6;
      colori.forEach((colore, n) => {
        ctx.strokeStyle = colore;
        ctx.beginPath();
        ctx.arc(cx, cy, raggioArco - n * fascia, Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    const tinta: Rgb = [ora.ambiente[0] * 255, ora.ambiente[1] * 255, ora.ambiente[2] * 255];
    this.montagne(this.creste[0], css(mescola(mescola(basso, [70, 84, 130], 0.5), tinta, 0.12)), w, h);
    this.montagne(this.creste[1], css(mescola(mescola(basso, [40, 50, 90], 0.72), tinta, 0.1)), w, h);
  }

  private astro(x: number, y: number, r: number, disco: Rgb, alone: Rgb, forza: number): void {
    if (forza <= 0.02 || y - r * 4 > this.tela.height) return;
    const { ctx } = this;
    const luce = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4.5);
    luce.addColorStop(0, css(alone, 0.5 * forza));
    luce.addColorStop(1, css(alone, 0));
    ctx.fillStyle = luce;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    ctx.fillStyle = css(disco, forza);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private montagne(cresta: readonly number[], colore: string, w: number, h: number): void {
    const { ctx } = this;
    ctx.fillStyle = colore;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < cresta.length; i++) ctx.lineTo((i / (cresta.length - 1)) * w, h * (1 - cresta[i]));
    ctx.lineTo(w, h);
    ctx.fill();
  }
}
