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
const css = (c: Rgb): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const caso = (a: number, b: number): number => {
  let s = (a * 374761393 + b * 668265263) | 0;
  s = (s ^ (s >>> 13)) * 1274126177;
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
};

const LUCE_NOTTE: Rgb = [0.42, 0.48, 0.78];
const LUCE_GIORNO: Rgb = [1, 1, 1];
const LUCE_TRAMONTO: Rgb = [1, 0.78, 0.64];
const ALTO: Record<string, Rgb> = { notte: [10, 14, 40], giorno: [60, 132, 222], rosso: [70, 52, 120] };
const BASSO: Record<string, Rgb> = { notte: [34, 50, 104], giorno: [196, 228, 250], rosso: [255, 160, 96] };

export function oraDelMondo(tic: number): Ora {
  const fase = faseDelGiorno(tic);
  const giorno = luceDelGiorno(tic);
  const crepuscolo = Math.pow(1 - Math.abs(giorno * 2 - 1), 1.4);
  const ambiente = mescola(mescola(LUCE_NOTTE, LUCE_GIORNO, giorno), LUCE_TRAMONTO, crepuscolo * 0.6);
  return { fase, giorno, crepuscolo, ambiente };
}

const NUVOLA = ['.......WWWWWW..........', '....WWWWWWWWWWW..WWW...', '..WWWWWWWWWWWWWWWWWWW..', '.WWWWWWWWWWWWWWWWWWWWW.', 'WWWWWWWWWWWWWWWWWWWWWWW', '.SWWWWWWWWWWWWWWWWWWWS.', '...SSSSWWWWWWWWSSSSS...', '.......SSSSSSSS........'];

/**
 * Lo sfondo, a quadretti come tutto il resto: il cielo a fasce che cambia colore con l'ora, le stelle, il sole e
 * la luna, le nuvole e tre file di colline che scorrono più piano del mondo e gli danno profondità.
 */
export class Cielo {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stelle: [number, number, number][] = [];

  constructor(private readonly tela: HTMLCanvasElement) {
    this.ctx = tela.getContext('2d')!;
    for (let n = 0; n < 80; n++) this.stelle.push([caso(n, 11), caso(n, 12) * 0.75, caso(n, 13) * 6]);
  }

  /** `camX`, `camY` dicono dove guarda la vista (in celle); `orizzonte` è la riga del mondo dove sta la terra. */
  disegna(ora: Ora, tempo: number, arcobaleno: number, camX: number, camY: number, orizzonte: number): void {
    const { ctx: x, tela } = this;
    const W = tela.width;
    const H = tela.height;
    const buio = 1 - ora.giorno;
    const alto = mescola(mescola(ALTO.notte, ALTO.giorno, ora.giorno), ALTO.rosso, ora.crepuscolo * 0.8);
    const basso = mescola(mescola(BASSO.notte, BASSO.giorno, ora.giorno), BASSO.rosso, ora.crepuscolo * 0.9);
    const luce: Rgb = [ora.ambiente[0], ora.ambiente[1], ora.ambiente[2]];
    const tinta = (c: Rgb): string => css([c[0] * luce[0], c[1] * luce[1], c[2] * luce[2]]);

    // Fasce di colore che si sfrangiano una nell'altra.
    const N = 14;
    const alta = Math.ceil(H / N);
    for (let i = 0; i < N; i++) {
      x.fillStyle = css(mescola(alto, basso, i / (N - 1)));
      x.fillRect(0, i * alta, W, alta);
      if (i === N - 1) break;
      x.fillStyle = css(mescola(alto, basso, (i + 1) / (N - 1)));
      for (let k = i % 2; k < W; k += 2) x.fillRect(k, (i + 1) * alta - 1, 1, 1);
      for (let k = i % 4; k < W; k += 4) x.fillRect(k, (i + 1) * alta - 2, 1, 1);
    }
    if (buio > 0.1) {
      for (const [sx, sy, f] of this.stelle) {
        const a = buio * (0.5 + 0.5 * Math.sin(tempo * 3 + f));
        if (a < 0.35) continue;
        x.fillStyle = `rgba(255,255,240,${a})`;
        x.fillRect(Math.round(sx * W), Math.round(sy * H * 0.8), 1, 1);
      }
    }
    const terra = orizzonte - camY;
    const giro = ora.fase * Math.PI * 2;
    const astro = (ax: number, ay: number, r: number, dentro: string, fuori: string, alone: string): void => {
      x.fillStyle = alone;
      x.beginPath();
      x.arc(ax, ay, r + 6, 0, 7);
      x.fill();
      x.fillStyle = fuori;
      x.beginPath();
      x.arc(ax, ay, r, 0, 7);
      x.fill();
      x.fillStyle = dentro;
      x.beginPath();
      x.arc(ax - r * 0.25, ay - r * 0.25, r * 0.55, 0, 7);
      x.fill();
    };
    const su = Math.min(H * 0.55, terra * 0.8);
    astro(Math.round(W * (0.5 - 0.42 * Math.cos(giro))), Math.round(terra - 10 - Math.sin(giro) * su), 8, '#fff8cf', ora.crepuscolo > 0.3 ? '#ffb060' : '#ffe680', 'rgba(255,240,170,0.25)');
    if (buio > 0.05) astro(Math.round(W * (0.5 + 0.42 * Math.cos(giro))), Math.round(terra - 10 + Math.sin(giro) * su), 6, '#ffffff', '#dfe6ff', `rgba(200,215,255,${0.2 * buio})`);

    // Piove col sole: l'arcobaleno, sette fasce di un quadretto.
    if (arcobaleno > 0.02) {
      const colori = ['#ff5a5a', '#ffa64d', '#ffe65a', '#6fdc6f', '#5ab4ff', '#7a6cf0', '#b06ce0'];
      const r0 = Math.min(W * 0.55, terra * 0.9);
      x.globalAlpha = 0.6 * arcobaleno;
      x.lineWidth = 1;
      colori.forEach((colore, n) => {
        x.strokeStyle = colore;
        x.beginPath();
        x.arc(W * 0.5, terra, r0 - n, Math.PI, Math.PI * 2);
        x.stroke();
      });
      x.globalAlpha = 1;
    }

    // Nuvole.
    const bianco = tinta([255, 255, 255]);
    const ombra = tinta([201, 214, 234]);
    for (const [nx, ny, v] of [[40, 14, 0.2], [210, 30, 0.3], [380, 8, 0.2], [540, 24, 0.3]]) {
      const giroLargo = W + 80;
      const X = Math.round((((nx - camX * v + tempo * 1.8 * v * 4) % giroLargo) + giroLargo) % giroLargo) - 40;
      const Y = Math.round(ny - camY * 0.15 + terra * 0.12);
      NUVOLA.forEach((riga, j) => {
        for (let i = 0; i < riga.length; i++) {
          if (riga[i] === '.') continue;
          x.fillStyle = riga[i] === 'W' ? bianco : ombra;
          x.fillRect(X + i, Y + j, 1, 1);
        }
      });
    }
    // Tre file di colline: più sono lontane, più sono chiare e più piano scorrono.
    for (const [passo, base, amp, col, cresta] of [
      [0.2, 18, 22, [147, 178, 214], [169, 196, 226]],
      [0.38, 9, 16, [111, 157, 146], [132, 176, 160]],
      [0.6, 2, 10, [79, 138, 102], [98, 160, 116]],
    ] as const) {
      // Quando la vista sale o scende, le colline lontane si spostano meno del mondo.
      const fermo = H * 0.62;
      const linea = fermo + (terra - fermo) * (0.4 + passo * 0.6);
      const pieno = tinta(col);
      const chiaro = tinta(cresta);
      const scuro = tinta([61, 116, 85]);
      for (let i = 0; i < W; i++) {
        const wx = i + camX * passo;
        const cima = Math.round(linea - base - Math.sin(wx / 43) * amp * 0.45 - Math.sin(wx / 15 + 1) * amp * 0.16 - Math.abs(Math.sin(wx / 71)) * amp);
        x.fillStyle = pieno;
        x.fillRect(i, cima, 1, H);
        x.fillStyle = chiaro;
        x.fillRect(i, cima, 1, 2);
        if (passo > 0.5 && caso(Math.round(wx), 3) > 0.8) {
          x.fillStyle = scuro;
          x.fillRect(i, cima - 2 - ((caso(Math.round(wx), 4) * 3) | 0), 1, 3);
        }
      }
    }
  }
}
