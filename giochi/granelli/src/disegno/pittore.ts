import { ALBERO, GAS, M, N_MATERIALI, STATO } from '../motore/materiali.js';
import type { Mondo } from '../motore/mondo.js';
import { Cielo, oraDelMondo } from './cielo.js';
import { FIORI, TA, TB, TG, TR } from './colori.js';
import { Personaggi } from './omini.js';
import { LUCCIOLA, Particelle, SCINTILLA } from './particelle.js';

/** Le tele sovrapposte su cui si disegna, da quella più in fondo a quella più in alto. */
export interface Tele {
  /** Il cielo, il sole, la luna, le montagne lontane. */
  cielo: HTMLCanvasElement;
  /** I granelli, nitidi: una cella, un quadretto. */
  granelli: HTMLCanvasElement;
  /** Nuvole, vapore, fumo e aria: morbidi, senza spigoli. */
  gas: HTMLCanvasElement;
  /** Il bagliore di ciò che brucia. */
  luce: HTMLCanvasElement;
  /** Omini e particelle, alla risoluzione vera dello schermo. */
  sopra: HTMLCanvasElement;
}

/** Come va disegnato ogni materiale. */
const SOLIDO = 1;
const SOFFICE = 2;
const FIAMMA = 3;
const LAMPO = 4;
const TIZZONE = 5;
const FUSO = 6;
const LIQUIDO = 7;
const VERDE = 8;
const TRONCO = 9;
const MODO = new Uint8Array(N_MATERIALI).fill(SOLIDO);
MODO[M.VUOTO] = 0;
for (let t = 0; t < N_MATERIALI; t++) if (STATO[t] === GAS) MODO[t] = SOFFICE;
MODO[M.FUOCO] = FIAMMA;
MODO[M.FULMINE] = LAMPO;
MODO[M.BRACE] = TIZZONE;
MODO[M.LAVA] = FUSO;
MODO[M.ACQUA] = LIQUIDO;
MODO[M.PIANTA] = VERDE;
MODO[M.LEGNO] = TRONCO;

/** Quanta luce manda ogni materiale su ciò che gli sta intorno. */
const LUCE = new Float32Array(N_MATERIALI);
LUCE[M.FUOCO] = 1;
LUCE[M.BRACE] = 1.1;
LUCE[M.LAVA] = 0.7;
LUCE[M.FULMINE] = 8;

function colore(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Sfuma una mappa di luce: ogni punto prende la media dei vicini, prima in orizzontale e poi in verticale. */
function sfuma(a: Float32Array, tmp: Float32Array, w: number, h: number): void {
  const r = 2;
  const peso = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let s = 0;
    for (let x = 0; x <= r && x < w; x++) s += a[o + x];
    for (let x = 0; x < w; x++) {
      tmp[o + x] = s * peso;
      if (x + r + 1 < w) s += a[o + x + r + 1];
      if (x - r >= 0) s -= a[o + x - r];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = 0; y <= r && y < h; y++) s += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      a[y * w + x] = s * peso;
      if (y + r + 1 < h) s += tmp[(y + r + 1) * w + x];
      if (y - r >= 0) s -= tmp[(y - r) * w + x];
    }
  }
}

/**
 * Disegna il mondo. Ogni granello prende il suo colore, poi l'ombra della profondità (chi sta sotto è più scuro,
 * chi affiora è più chiaro), poi la luce dell'ora del giorno e quella di ciò che gli brucia accanto: di notte un
 * fuoco illumina davvero quello che ha intorno.
 */
export class Pittore {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly ctxGas: CanvasRenderingContext2D;
  private readonly ctxLuce: CanvasRenderingContext2D;
  private readonly ctxSopra: CanvasRenderingContext2D;
  private readonly immagine: ImageData;
  private readonly immagineGas: ImageData;
  private readonly immagineLuce: ImageData;
  private readonly punti: Uint32Array;
  private readonly puntiGas: Uint32Array;
  private readonly puntiLuce: Uint32Array;
  /** Luce e gas si calcolano a metà risoluzione: ingranditi dal browser diventano morbidi da soli. */
  private readonly lw: number;
  private readonly lh: number;
  private readonly lr: Float32Array;
  private readonly lg: Float32Array;
  private readonly lb: Float32Array;
  private readonly tmp: Float32Array;
  private readonly gr: Float32Array;
  private readonly gg: Float32Array;
  private readonly gb: Float32Array;
  private readonly ga: Float32Array;
  /** Per ogni colonna, quanti granelli ci sono sopra quello che si sta disegnando. */
  private readonly sopra: Uint8Array;
  private readonly cielo: Cielo;
  private readonly personaggi = new Personaggi();
  private readonly particelle = new Particelle();
  /** Sugli schermi piccoli le celle sono minuscole: lì gli omini si disegnano un po' più grandi del vero. */
  private ingrandimento = 1;
  private tempo = 0;
  private fotogrammi = 0;
  private eraLampo = false;
  private sporco = true;
  private forzaLuce = -1;
  /** Chiamata quando un fulmine attraversa il cielo. */
  suLampo: (() => void) | null = null;

  constructor(
    private readonly tele: Tele,
    private readonly mondo: Mondo,
  ) {
    const { w, h } = mondo;
    this.lw = Math.ceil(w / 2);
    this.lh = Math.ceil(h / 2);
    tele.granelli.width = w;
    tele.granelli.height = h;
    for (const t of [tele.gas, tele.luce]) {
      t.width = this.lw;
      t.height = this.lh;
      t.style.width = `${((this.lw * 2) / w) * 100}%`;
      t.style.height = `${((this.lh * 2) / h) * 100}%`;
    }
    this.ctx = tele.granelli.getContext('2d')!;
    this.ctxGas = tele.gas.getContext('2d')!;
    this.ctxLuce = tele.luce.getContext('2d')!;
    this.ctxSopra = tele.sopra.getContext('2d')!;
    this.immagine = this.ctx.createImageData(w, h);
    this.immagineGas = this.ctxGas.createImageData(this.lw, this.lh);
    this.immagineLuce = this.ctxLuce.createImageData(this.lw, this.lh);
    this.punti = new Uint32Array(this.immagine.data.buffer);
    this.puntiGas = new Uint32Array(this.immagineGas.data.buffer);
    this.puntiLuce = new Uint32Array(this.immagineLuce.data.buffer);
    const n = this.lw * this.lh;
    this.lr = new Float32Array(n);
    this.lg = new Float32Array(n);
    this.lb = new Float32Array(n);
    this.tmp = new Float32Array(n);
    this.gr = new Float32Array(n);
    this.gg = new Float32Array(n);
    this.gb = new Float32Array(n);
    this.ga = new Float32Array(n);
    this.sopra = new Uint8Array(w);
    this.cielo = new Cielo(tele.cielo, w * 7919 + h);
  }

  /** Da chiamare quando cambia la grandezza del mondo sullo schermo (in pixel della pagina). */
  adatta(larghezza: number, altezza: number): void {
    // Omini e particelle si disegnano fitti (ma non oltre il doppio: di più non si vede e costa);
    // il cielo è fatto di sfumature e sagome lontane, e gli basta molto meno.
    const densita = Math.min(2, window.devicePixelRatio || 1);
    this.tele.sopra.width = Math.max(1, Math.round(larghezza * densita));
    this.tele.sopra.height = Math.max(1, Math.round(altezza * densita));
    const ridotto = Math.min(1, 420 / Math.max(larghezza, altezza));
    this.tele.cielo.width = Math.max(1, Math.round(larghezza * ridotto));
    this.tele.cielo.height = Math.max(1, Math.round(altezza * ridotto));
    this.ingrandimento = Math.max(1, Math.min(1.35, 3.6 / (larghezza / this.mondo.w)));
    this.sporco = true;
    this.fotogrammi = 0;
  }

  /** La festa per una scoperta, nel punto in cui è nata (in celle). */
  scoppio(x: number, y: number): void {
    this.particelle.scoppio(x + 0.5, y + 0.5);
  }

  sbuffo(x: number, y: number): void {
    this.particelle.sbuffo(x + 0.5, y + 0.5);
  }

  cuore(x: number, y: number): void {
    this.particelle.cuore(x + 0.5, y);
  }

  /** Disegna un fotogramma; `dt` sono i secondi passati dal precedente. */
  disegna(dt: number): void {
    const { tipo, dato, tinta, w, h, tic } = this.mondo;
    const { punti, puntiGas, puntiLuce, lw, lh, lr, lg, lb, gr, gg, gb, ga, sopra, particelle } = this;
    this.tempo += dt;
    const tempo = this.tempo;
    const ora = oraDelMondo(tic);
    // Il cielo cambia piano: basta ridisegnarlo qualche volta al secondo.
    if (this.fotogrammi++ % 8 === 0) this.cielo.disegna(ora, tempo);

    // Prima passata: chi manda luce e dove stanno i gas.
    lr.fill(0);
    lg.fill(0);
    lb.fill(0);
    ga.fill(0);
    gr.fill(0);
    gg.fill(0);
    gb.fill(0);
    puntiLuce.fill(0);
    let accese = 0;
    let lampi = 0;
    const scintille = particelle.quante < 260;
    let i = 0;
    for (let y = 0; y < h; y++) {
      const riga = (y >> 1) * lw;
      for (let x = 0; x < w; x++, i++) {
        const t = tipo[i];
        if (t === M.VUOTO) continue;
        const modo = MODO[t];
        if (modo === SOFFICE) {
          const li = riga + (x >> 1);
          const a = TA[t] / 255;
          const k = t * 4 + (tinta[i] >> 6);
          gr[li] += TR[k] * a;
          gg[li] += TG[k] * a;
          gb[li] += TB[k] * a;
          ga[li] += a;
          continue;
        }
        const luce = LUCE[t];
        if (luce === 0) continue;
        const li = riga + (x >> 1);
        if (modo === LAMPO) {
          lr[li] += luce * 0.8;
          lg[li] += luce * 0.9;
          lb[li] += luce;
          puntiLuce[li] = colore(255, 250, 200, 255);
          lampi++;
        } else {
          lr[li] += luce;
          lg[li] += luce * 0.55;
          lb[li] += luce * 0.2;
          puntiLuce[li] = modo === FUSO ? colore(255, 90, 20, 170) : colore(255, 130, 40, 150);
          accese++;
          // Ogni tanto una scintilla si stacca e sale.
          if (scintille && Math.random() < (modo === FUSO ? 0.0012 : 0.004)) {
            particelle.aggiungi(SCINTILLA, x + 0.5, y, (Math.random() - 0.5) * 5, -5 - Math.random() * 9, 0.5 + Math.random() * 0.9, 0.45);
          }
        }
      }
    }
    if (accese + lampi > 0) {
      for (const mappa of [lr, lg, lb]) {
        sfuma(mappa, this.tmp, lw, lh);
        sfuma(mappa, this.tmp, lw, lh);
      }
    }
    // Di giorno un fuoco rischiara poco; di notte è l'unica luce che c'è.
    const forza = 1.3 - ora.giorno * 0.8;
    const aR = ora.ambiente[0];
    const aG = ora.ambiente[1];
    const aB = ora.ambiente[2];

    // Seconda passata: ogni granello con il suo colore, la sua ombra e la sua luce.
    sopra.fill(0);
    i = 0;
    for (let y = 0; y < h; y++) {
      const riga = (y >> 1) * lw;
      for (let x = 0; x < w; x++, i++) {
        const t = tipo[i];
        const modo = MODO[t];
        if (modo === 0 || modo === SOFFICE) {
          punti[i] = 0;
          sopra[x] = 0;
          continue;
        }
        const c = tinta[i];
        const k = t * 4 + (c >> 6);
        let r = TR[k];
        let g = TG[k];
        let b = TB[k];
        let a = TA[t];
        let f = 1;
        switch (modo) {
          case FIAMMA: {
            const v = dato[i];
            punti[i] = v > 26 ? colore(255, 246, 200) : v > 14 ? colore(255, 196, 70) : v > 6 ? colore(255, 124, 34) : colore(214, 62, 22, 220);
            sopra[x] = 0;
            continue;
          }
          case LAMPO:
            punti[i] = colore(255, 255, 240);
            sopra[x] = 0;
            continue;
          case TIZZONE:
            punti[i] = ((c + tic * 7) & 63) > 40 ? colore(255, 176, 66) : colore(204, 72, 26);
            sopra[x] = 0;
            continue;
          case FUSO: {
            const d = sopra[x];
            sopra[x] = d < 250 ? d + 1 : d;
            const onda = (c + (tic >> 2)) & 31;
            // La crosta in superficie è più scura; sotto, la lava è viva.
            punti[i] = d === 0 && onda < 20 ? colore(196, 58, 20) : onda > 26 ? colore(255, 222, 100) : onda > 12 ? colore(255, 116, 28) : colore(232, 66, 18);
            continue;
          }
          case LIQUIDO: {
            const d = sopra[x];
            sopra[x] = d < 250 ? d + 1 : d;
            if (d === 0) {
              if (y < h - 1 && tipo[i + w] === M.VUOTO) {
                // Una goccia che cade si lascia dietro una scia: la pioggia si vede cadere.
                r = 186;
                g = 224;
                b = 255;
                a = 215;
                if (y > 1 && tipo[i - w] === M.VUOTO) {
                  punti[i - w] = colore(170 * aR, 210 * aG, 250 * aB, 120);
                  if (tipo[i - 2 * w] === M.VUOTO) punti[i - 2 * w] = colore(170 * aR, 210 * aG, 250 * aB, 50);
                }
              } else {
                // Il pelo dell'acqua: piccole onde che corrono, con la cresta più chiara.
                const onda = Math.sin(x * 0.55 + tempo * 2.4) + Math.sin(x * 0.21 - tempo * 1.3);
                if (onda > 1.05) {
                  r = 228;
                  g = 244;
                  b = 255;
                } else {
                  r = 128;
                  g = 196;
                  b = 252;
                }
                a = 235;
              }
            } else {
              // Più si scende, più l'acqua è scura e fitta.
              f = 1 - (d > 18 ? 18 : d) * 0.03;
              a = 190 + (d > 9 ? 9 : d) * 7;
              if (((c + i + (tic >> 3)) & 127) === 0) f += 0.35;
            }
            break;
          }
          case VERDE: {
            sopra[x] = 0;
            const d = dato[i];
            if (d === 0 && c > 238) {
              const fiore = FIORI[c & 3];
              r = fiore[0];
              g = fiore[1];
              b = fiore[2];
            } else if (d > 0 && d !== ALBERO) {
              r = 156;
              g = 226;
              b = 114;
            } else {
              // Le foglie brillano a ondate, come quando ci passa il vento.
              f = 0.86 + (c & 15) / 60 + 0.09 * Math.sin(x * 0.45 + y * 0.2 + tempo * 2.2 + (c >> 4));
            }
            break;
          }
          case TRONCO:
            sopra[x] = 0;
            break;
          default: {
            const d = sopra[x];
            sopra[x] = d < 250 ? d + 1 : d;
            // Chi affiora prende luce; chi sta sotto è via via più in ombra.
            f = d === 0 ? 1.17 : 1 - (d > 14 ? 14 : d) * 0.022;
            if (a < 255 && (c & 31) === 0) f += 0.3;
          }
        }
        const li = riga + (x >> 1);
        const R = r * f * (aR + lr[li] * forza);
        const G = g * f * (aG + lg[li] * forza);
        const B = b * f * (aB + lb[li] * forza);
        punti[i] = ((a << 24) | ((B > 255 ? 255 : B) << 16) | ((G > 255 ? 255 : G) << 8) | (R > 255 ? 255 : R)) >>> 0;
      }
    }

    // I gas: per ogni punto della mappa, il colore medio di ciò che c'è e tanto più opaco quanto più ce n'è.
    const n = lw * lh;
    for (let li = 0; li < n; li++) {
      const q = ga[li];
      if (q <= 0) {
        puntiGas[li] = 0;
        continue;
      }
      const R = (gr[li] / q) * (aR + lr[li] * forza);
      const G = (gg[li] / q) * (aG + lg[li] * forza);
      const B = (gb[li] / q) * (aB + lb[li] * forza);
      const A = q * 80;
      puntiGas[li] = (((A > 255 ? 255 : A) << 24) | ((B > 255 ? 255 : B) << 16) | ((G > 255 ? 255 : G) << 8) | (R > 255 ? 255 : R)) >>> 0;
    }

    this.ctx.putImageData(this.immagine, 0, 0);
    this.ctxGas.putImageData(this.immagineGas, 0, 0);
    this.ctxLuce.putImageData(this.immagineLuce, 0, 0);
    if (Math.abs(forza - this.forzaLuce) > 0.03) {
      this.forzaLuce = forza;
      this.tele.luce.style.opacity = String(Math.min(1, 0.5 + forza * 0.4));
    }

    if (lampi > 0 && !this.eraLampo) this.suLampo?.();
    this.eraLampo = lampi > 0;

    // Di notte, tra le piante, si accendono le lucciole.
    if (ora.giorno < 0.3 && particelle.quanteDi(LUCCIOLA) < 22) {
      for (let prova = 0; prova < 4; prova++) {
        const j = (Math.random() * tipo.length) | 0;
        if (tipo[j] === M.PIANTA) particelle.aggiungi(LUCCIOLA, (j % w) + 0.5, ((j / w) | 0) - 1, 0, 0, 4 + Math.random() * 5, 0.4);
      }
    }

    const { omini } = this.mondo;
    if (omini.length > 0 || particelle.quante > 0 || this.sporco) {
      const ctx = this.ctxSopra;
      const tela = this.tele.sopra;
      ctx.clearRect(0, 0, tela.width, tela.height);
      const cella = tela.width / w;
      this.personaggi.disegna(ctx, omini, cella, this.ingrandimento, ora.ambiente, tempo);
      particelle.disegna(ctx, cella, dt);
      this.sporco = omini.length > 0 || particelle.quante > 0;
    }
  }
}
