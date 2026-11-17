import { ALBERO, M, N_MATERIALI } from './motore/materiali.js';
import type { Mondo } from './motore/mondo.js';
import type { Omino } from './motore/omini.js';

/** Un colore nel formato che il browser usa dentro l'immagine (alfa, blu, verde, rosso). */
function colore(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Quattro sfumature per materiale: la "grana" che fa sembrare la terra terra e non una macchia piatta. */
const TINTE = new Uint32Array(N_MATERIALI * 4);
function tinte(t: number, r: number, g: number, b: number, grana: number, a = 255): void {
  for (let k = 0; k < 4; k++) {
    const f = 1 + ((k - 1.5) / 1.5) * grana;
    TINTE[t * 4 + k] = colore(Math.min(255, r * f) | 0, Math.min(255, g * f) | 0, Math.min(255, b * f) | 0, a);
  }
}
tinte(M.TERRA, 138, 90, 60, 0.14);
tinte(M.ACQUA, 52, 132, 222, 0.06, 215);
tinte(M.ARIA, 205, 230, 245, 0.05, 70);
tinte(M.VAPORE, 225, 235, 240, 0.05, 110);
tinte(M.FANGO, 88, 62, 46, 0.12);
tinte(M.SABBIA, 228, 202, 140, 0.1);
tinte(M.PIETRA, 122, 130, 142, 0.12);
tinte(M.NUVOLA, 240, 244, 250, 0.04, 200);
tinte(M.VETRO, 170, 226, 232, 0.05, 150);
tinte(M.ARGILLA, 186, 118, 92, 0.08);
tinte(M.MATTONE, 178, 66, 48, 0.14);
tinte(M.PIANTA, 70, 170, 78, 0.2);
tinte(M.LEGNO, 108, 74, 44, 0.14);
tinte(M.CENERE, 168, 168, 170, 0.12);
tinte(M.FUMO, 105, 105, 115, 0.1, 120);
tinte(M.NEVE, 246, 250, 255, 0.03);
tinte(M.GHIACCIO, 176, 222, 250, 0.06, 235);
tinte(M.HUMUS, 62, 44, 30, 0.16);
tinte(M.OSSIDIANA, 44, 36, 60, 0.2);
tinte(M.ROCCIA, 50, 56, 82, 0.12);

const FIORI = [colore(255, 214, 92), colore(250, 130, 170), colore(245, 245, 250), colore(190, 140, 250)];
const PELO_ACQUA = colore(120, 185, 250, 235);
const CRESTA = colore(96, 108, 146);
const RIFLESSO = colore(170, 215, 255, 240);

const CONTORNO = 'rgba(8, 12, 28, 0.6)';
const VESTITI = ['#e65050', '#5096f0', '#fac846', '#a06ee6', '#5ac896', '#f08c3c'];
const PELLI = ['#f2c89e', '#dba878', '#a9714c'];
const CAPELLI = ['#2b1d14', '#6b4423', '#d8b25a', '#c9c9d2'];
const GAMBE = '#8f9cc9';

/** Dove l'omino è disegnato in questo momento: insegue la sua posizione vera, così cammina invece di scattare. */
interface Posa {
  x: number;
  y: number;
  fase: number;
}

/**
 * Disegna il mondo su tre tele sovrapposte: i granelli (nitidi), il bagliore di ciò che brucia (morbido)
 * e gli omini (alla risoluzione vera dello schermo, perché si riconoscano anche su un telefono).
 */
export class Pittore {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly ctxLuce: CanvasRenderingContext2D;
  private readonly ctxOmini: CanvasRenderingContext2D;
  private readonly immagine: ImageData;
  private readonly luce: ImageData;
  private readonly punti: Uint32Array;
  private readonly puntiLuce: Uint32Array;
  /** Il bagliore ha metà risoluzione: ingrandito dal browser diventa un alone morbido, senza costare nulla. */
  private readonly lw: number;
  private readonly lh: number;
  private readonly pose = new WeakMap<Omino, Posa>();
  private ominiDisegnati = false;
  /** Sugli schermi piccoli le celle sono minuscole: lì gli omini si disegnano un po' più grandi del vero. */
  private ingrandimento = 1;

  constructor(
    tela: HTMLCanvasElement,
    telaLuce: HTMLCanvasElement,
    private readonly telaOmini: HTMLCanvasElement,
    private readonly mondo: Mondo,
  ) {
    tela.width = mondo.w;
    tela.height = mondo.h;
    this.lw = Math.ceil(mondo.w / 2);
    this.lh = Math.ceil(mondo.h / 2);
    telaLuce.width = this.lw;
    telaLuce.height = this.lh;
    telaLuce.style.width = `${((this.lw * 2) / mondo.w) * 100}%`;
    telaLuce.style.height = `${((this.lh * 2) / mondo.h) * 100}%`;
    this.ctx = tela.getContext('2d')!;
    this.ctxLuce = telaLuce.getContext('2d')!;
    this.ctxOmini = telaOmini.getContext('2d')!;
    this.immagine = this.ctx.createImageData(mondo.w, mondo.h);
    this.luce = this.ctxLuce.createImageData(this.lw, this.lh);
    this.punti = new Uint32Array(this.immagine.data.buffer);
    this.puntiLuce = new Uint32Array(this.luce.data.buffer);
  }

  /** Da chiamare quando cambia la grandezza del mondo sullo schermo (in pixel della pagina). */
  adatta(larghezza: number, altezza: number): void {
    const densita = Math.min(3, window.devicePixelRatio || 1);
    this.telaOmini.width = Math.max(1, Math.round(larghezza * densita));
    this.telaOmini.height = Math.max(1, Math.round(altezza * densita));
    this.ingrandimento = Math.max(1, Math.min(1.35, 3.6 / (larghezza / this.mondo.w)));
    this.ominiDisegnati = true;
  }

  disegna(): void {
    const { tipo, dato, tinta, w, h, tic } = this.mondo;
    const { punti, puntiLuce, lw } = this;
    puntiLuce.fill(0);
    let i = 0;
    for (let y = 0; y < h; y++) {
      const rigaLuce = (y >> 1) * lw;
      for (let x = 0; x < w; x++, i++) {
        const t = tipo[i];
        if (t === M.VUOTO) {
          punti[i] = 0;
          continue;
        }
        const c = tinta[i];
        let p: number;
        switch (t) {
          case M.FUOCO: {
            const v = dato[i];
            p = v > 26 ? colore(255, 244, 190) : v > 14 ? colore(255, 190, 60) : v > 6 ? colore(255, 120, 30) : colore(210, 60, 20, 220);
            puntiLuce[rigaLuce + (x >> 1)] = colore(255, 130, 40, 150);
            break;
          }
          case M.BRACE:
            p = ((c + tic * 7) & 63) > 40 ? colore(255, 170, 60) : colore(200, 70, 24);
            puntiLuce[rigaLuce + (x >> 1)] = colore(255, 110, 30, 130);
            break;
          case M.LAVA: {
            const onda = (c + (tic >> 2)) & 31;
            p = onda > 26 ? colore(255, 214, 90) : onda > 12 ? colore(255, 110, 24) : colore(226, 62, 16);
            puntiLuce[rigaLuce + (x >> 1)] = colore(255, 90, 20, 170);
            break;
          }
          case M.FULMINE:
            p = colore(255, 255, 235);
            puntiLuce[rigaLuce + (x >> 1)] = colore(255, 250, 200, 255);
            break;
          case M.ACQUA:
            // Il pelo dell'acqua è più chiaro, e ogni tanto passa un riflesso: l'acqua non sta mai del tutto ferma.
            if (y > 0 && tipo[i - w] !== M.ACQUA) p = PELO_ACQUA;
            else if (((c + i + (tic >> 3)) & 63) === 0) p = RIFLESSO;
            else p = TINTE[t * 4 + (c >> 6)];
            break;
          case M.PIANTA: {
            const d = dato[i];
            if (d === 0 && c > 238) p = FIORI[c & 3];
            else if (d > 0 && d !== ALBERO) p = colore(150, 220, 110);
            else p = TINTE[t * 4 + (c >> 6)];
            break;
          }
          case M.ROCCIA:
            p = y > 0 && tipo[i - w] !== M.ROCCIA ? CRESTA : TINTE[t * 4 + (c >> 6)];
            break;
          default:
            p = TINTE[t * 4 + (c >> 6)];
        }
        punti[i] = p;
      }
    }
    this.ctx.putImageData(this.immagine, 0, 0);
    this.ctxLuce.putImageData(this.luce, 0, 0);
    this.disegnaOmini();
  }

  private disegnaOmini(): void {
    const { omini, w } = this.mondo;
    if (omini.length === 0 && !this.ominiDisegnati) return;
    const ctx = this.ctxOmini;
    ctx.clearRect(0, 0, this.telaOmini.width, this.telaOmini.height);
    this.ominiDisegnati = omini.length > 0;
    const cella = this.telaOmini.width / w;
    for (const o of omini) {
      let posa = this.pose.get(o);
      if (!posa) {
        posa = { x: o.x, y: o.y, fase: 0 };
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
      if (inMoto) posa.fase += 0.4;
      this.omino(ctx, (posa.x + 0.5) * cella, (posa.y + 1) * cella, cella, o, inMoto ? Math.sin(posa.fase) : 0);
    }
  }

  /** Un personaggino: testa, capelli, busto, braccia e due gambe che si alternano quando cammina. */
  private omino(ctx: CanvasRenderingContext2D, cx: number, terra: number, cella: number, o: Omino, passo: number): void {
    // I bambini nascono piccoli e crescono.
    const s = cella * this.ingrandimento * (o.eta < 600 ? 0.6 + (0.4 * o.eta) / 600 : 1);
    const piedi = terra - Math.abs(passo) * 0.1 * s;
    const g = Math.max(1, 0.16 * s);
    const rett = (x0: number, y0: number, x1: number, y1: number, gonfia = 0): void => {
      ctx.fillRect(cx + x0 * s - gonfia, piedi + y0 * s - gonfia, (x1 - x0) * s + gonfia * 2, (y1 - y0) * s + gonfia * 2);
    };
    const tondo = (y: number, r: number, da = 0, a = Math.PI * 2): void => {
      ctx.beginPath();
      ctx.arc(cx, piedi + y * s, r, da, a);
      ctx.fill();
    };
    const sx = Math.max(0, passo) * 0.3;
    const dx = Math.max(0, -passo) * 0.3;
    const braccio = passo * 0.15;

    // Prima un'ombra scura tutt'intorno, perché si stacchi da qualsiasi sfondo; poi i colori.
    ctx.fillStyle = CONTORNO;
    rett(-0.5, -1, 0.5, 0, g);
    rett(-0.92, -2.05, 0.92, -0.9, g);
    tondo(-2.62, 0.66 * s + g);

    ctx.fillStyle = GAMBE;
    rett(-0.5, -1, -0.08, -sx);
    rett(0.08, -1, 0.5, -dx);
    ctx.fillStyle = PELLI[(o.aspetto >> 3) % PELLI.length];
    rett(-0.92, -1.95 + braccio, -0.62, -1.2 + braccio);
    rett(0.62, -1.95 - braccio, 0.92, -1.2 - braccio);
    tondo(-2.62, 0.66 * s);
    ctx.fillStyle = VESTITI[o.aspetto % VESTITI.length];
    rett(-0.62, -2.05, 0.62, -0.9);
    ctx.fillStyle = CAPELLI[(o.aspetto >> 5) % CAPELLI.length];
    tondo(-2.72, 0.66 * s, Math.PI, Math.PI * 2);
    if (s >= 5) {
      ctx.fillStyle = '#1a1a24';
      rett(o.dir * 0.3 - 0.09, -2.66, o.dir * 0.3 + 0.09, -2.46);
    }
  }
}
