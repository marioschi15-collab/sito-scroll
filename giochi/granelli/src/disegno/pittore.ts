import { ALBERO, GAS, LIQUIDO as STATO_LIQUIDO, M, N_TIPI, PRIMA_MISCELA, STATO } from '../motore/materiali.js';
import type { Mondo } from '../motore/mondo.js';
import { Cielo, oraDelMondo } from './cielo.js';
import { FIORI, TA, TB, TG, TR, tinteMiscela } from './colori.js';
import { FIAMME, figura, figureOmino } from './figure.js';
import { C, INGOMBRO } from '../motore/cose.js';
import { NUOTA, type Omino, SCAPPA } from '../motore/omini.js';
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
  /** Omini, invenzioni e particelle: figure a quadretti grandi mezza cella, solo per la parte di mondo che si vede. */
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
const ALTRO_LIQUIDO = 10;
const MODO = new Uint8Array(N_TIPI).fill(SOLIDO);
MODO[M.VUOTO] = 0;
for (let t = 0; t < N_TIPI; t++) if (STATO[t] === GAS) MODO[t] = SOFFICE;
MODO[M.FUOCO] = FIAMMA;
MODO[M.FULMINE] = LAMPO;
MODO[M.BRACE] = TIZZONE;
MODO[M.LAVA] = FUSO;
MODO[M.ACQUA] = LIQUIDO;
MODO[M.PIANTA] = VERDE;
MODO[M.LEGNO] = TRONCO;
MODO[M.ACIDO] = ALTRO_LIQUIDO;
MODO[M.ALGA] = TRONCO;
MODO[M.FUNGO] = TRONCO;
MODO[M.FRUTTO] = TRONCO;

/** Quanta luce manda ogni materiale su ciò che gli sta intorno. */
const LUCE = new Float32Array(N_TIPI);
LUCE[M.FUOCO] = 1;
LUCE[M.BRACE] = 1.1;
LUCE[M.LAVA] = 0.7;
LUCE[M.FULMINE] = 8;
/** Di che colore è quella luce (rosso, verde, blu, da 0 a 1). */
const LUCE_R = new Float32Array(N_TIPI).fill(1);
const LUCE_G = new Float32Array(N_TIPI).fill(0.55);
const LUCE_B = new Float32Array(N_TIPI).fill(0.2);
LUCE_R[M.FULMINE] = 0.8;
LUCE_G[M.FULMINE] = 0.9;
LUCE_B[M.FULMINE] = 1;
/** Quanto un materiale si vede anche al buio, perché fa luce da sé. */
const PROPRIA = new Float32Array(N_TIPI);
PROPRIA[M.DIAMANTE] = 0.35;

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
  private readonly pose = new WeakMap<Omino, { x: number; y: number; passo: number }>();
  private readonly copia = document.createElement('canvas');
  private readonly particelle = new Particelle();
  /** Quante celle di mondo entrano nella vista. */
  private visteW = 1;
  private visteH = 1;
  private tempo = 0;
  private fotogrammi = 0;
  private eraLampo = false;
  private forzaLuce = -1;
  private cieloX = -1;
  private cieloY = -1;
  private versione = -1;
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
    this.cielo = new Cielo(tele.cielo);
  }

  /** Ogni miscela presente nel mondo prende i suoi colori, il suo modo di essere disegnata e la sua luce. */
  private aggiornaMiscele(): void {
    const { sostanze, versioneTipi } = this.mondo;
    for (let t = PRIMA_MISCELA; t < N_TIPI; t++) {
      const s = sostanze[t];
      LUCE[t] = 0;
      PROPRIA[t] = 0;
      if (!s) continue;
      tinteMiscela(t, s);
      MODO[t] = s.stato === GAS ? SOFFICE : s.stato === STATO_LIQUIDO ? ALTRO_LIQUIDO : SOLIDO;
      if (s.luce > 0.5 || s.calore > 0.6) {
        const forte = Math.max(s.colore[0], s.colore[1], s.colore[2], 1);
        LUCE[t] = 0.35 + s.luce * 0.5;
        LUCE_R[t] = s.colore[0] / forte;
        LUCE_G[t] = s.colore[1] / forte;
        LUCE_B[t] = s.colore[2] / forte;
        PROPRIA[t] = 0.6;
      }
    }
    this.versione = versioneTipi;
  }

  /** Un'esplosione: un lampo di scintille e sbuffi dove è avvenuta (in celle). */
  botto(x: number, y: number, r: number): void {
    for (let n = 0; n < 10 + r * 4; n++) {
      const a = Math.random() * Math.PI * 2;
      const v = 10 + Math.random() * 30;
      this.particelle.aggiungi(SCINTILLA, x + 0.5, y + 0.5, Math.cos(a) * v, Math.sin(a) * v - 8, 0.4 + Math.random() * 0.7, 0.6);
    }
    this.particelle.sbuffo(x + 0.5, y + 0.5);
  }

  /** Da chiamare quando cambia la vista: quante celle di mondo si vedono, in larghezza e in altezza. */
  adatta(celleW: number, celleH: number): void {
    this.visteW = Math.max(1, Math.ceil(celleW));
    this.visteH = Math.max(1, Math.ceil(celleH));
    this.tele.cielo.width = this.visteW;
    this.tele.cielo.height = this.visteH;
    for (const t of [this.tele.sopra, this.copia]) {
      t.width = this.visteW * 2;
      t.height = this.visteH * 2;
    }
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
  disegna(dt: number, camX: number, camY: number): void {
    const { tipo, dato, tinta, w, h, tic } = this.mondo;
    const { punti, puntiGas, puntiLuce, lw, lh, lr, lg, lb, gr, gg, gb, ga, sopra, particelle } = this;
    this.tempo += dt;
    const tempo = this.tempo;
    const ora = oraDelMondo(tic);
    // Il cielo cambia piano: basta ridisegnarlo qualche volta al secondo.
    if (this.versione !== this.mondo.versioneTipi) this.aggiornaMiscele();
    // Il cielo cambia piano: si ridisegna subito solo quando la vista si sposta.
    if (this.fotogrammi++ % 6 === 0 || camX !== this.cieloX || camY !== this.cieloY) {
      this.cielo.disegna(ora, tempo, this.mondo.arcobaleno, camX, camY, this.mondo.h * 0.56);
      this.cieloX = camX;
      this.cieloY = camY;
    }

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
    // Si disegna solo la parte di mondo che si vede, con un po' di margine perché la luce arrivi anche da fuori.
    const x0 = Math.max(0, (Math.floor(camX) - 12) & ~1);
    const x1 = Math.min(w, Math.ceil(camX + this.visteW) + 12);
    const y0 = Math.max(0, (Math.floor(camY) - 18) & ~1);
    const y1 = Math.min(h, Math.ceil(camY + this.visteH) + 12);
    for (let y = y0; y < y1; y++) {
      const riga = (y >> 1) * lw;
      let i = y * w + x0;
      for (let x = x0; x < x1; x++, i++) {
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
        lr[li] += luce * LUCE_R[t];
        lg[li] += luce * LUCE_G[t];
        lb[li] += luce * LUCE_B[t];
        if (modo === LAMPO) {
          puntiLuce[li] = colore(255, 250, 200, 255);
          lampi++;
        } else if (t >= PRIMA_MISCELA) {
          // Una miscela luminosa: un alone del suo colore, senza scintille.
          puntiLuce[li] = colore(255 * LUCE_R[t], 255 * LUCE_G[t], 255 * LUCE_B[t], 110);
          accese++;
        } else {
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
    for (let y = y0; y < y1; y++) {
      const riga = (y >> 1) * lw;
      let i = y * w + x0;
      for (let x = x0; x < x1; x++, i++) {
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
          case ALTRO_LIQUIDO: {
            // Un liquido che non è acqua: il suo colore, più chiaro in superficie e più scuro in fondo.
            const d = sopra[x];
            sopra[x] = d < 250 ? d + 1 : d;
            f = d === 0 ? 1.25 : 1 - (d > 14 ? 14 : d) * 0.03;
            if (((c + i + (tic >> 3)) & 63) === 0) f += 0.3;
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
        const sua = PROPRIA[t];
        const R = r * f * (aR + lr[li] * forza + sua);
        const G = g * f * (aG + lg[li] * forza + sua);
        const B = b * f * (aB + lb[li] * forza + sua);
        punti[i] = ((a << 24) | ((B > 255 ? 255 : B) << 16) | ((G > 255 ? 255 : G) << 8) | (R > 255 ? 255 : R)) >>> 0;
      }
    }

    // I gas: per ogni punto della mappa, il colore medio di ciò che c'è e tanto più opaco quanto più ce n'è.
    for (let ly = y0 >> 1; ly < (y1 + 1) >> 1; ly++)
    for (let li = ly * lw + (x0 >> 1), fine = ly * lw + ((x1 + 1) >> 1); li < fine; li++) {
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

    this.ctx.putImageData(this.immagine, 0, 0, x0, y0, x1 - x0, y1 - y0);
    this.ctxGas.putImageData(this.immagineGas, 0, 0, x0 >> 1, y0 >> 1, ((x1 + 1) >> 1) - (x0 >> 1), ((y1 + 1) >> 1) - (y0 >> 1));
    this.ctxLuce.putImageData(this.immagineLuce, 0, 0, x0 >> 1, y0 >> 1, ((x1 + 1) >> 1) - (x0 >> 1), ((y1 + 1) >> 1) - (y0 >> 1));
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
    this.disegnaSopra(dt, camX, camY, ora.ambiente, ora.giorno < 0.45);
  }

  /** Invenzioni, omini e particelle: figure disegnate sopra i granelli, con la luce dell'ora e i loro lumi. */
  private disegnaSopra(dt: number, camX: number, camY: number, luce: readonly number[], notte: boolean): void {
    const { cose, omini } = this.mondo;
    const x = this.ctxSopra;
    const W = this.tele.sopra.width;
    const H = this.tele.sopra.height;
    const ox = Math.round(camX * 2);
    const oy = Math.round(camY * 2);
    x.clearRect(0, 0, W, H);
    const lumi: [number, number, number, string][] = [];
    for (const c of cose) {
      const [lw, lh] = INGOMBRO[c.id];
      const f = c.id === C.FALO ? FIAMME[(this.fotogrammi >> 3) % 3] : figura(c.id, notte);
      if (!f) continue;
      const X = Math.round((c.x + lw / 2) * 2 - f.width / 2) - ox;
      const Y = (c.y + 1) * 2 - f.height + 1 - oy;
      if (X > W || X + f.width < 0 || Y > H || Y + f.height < 0) continue;
      x.drawImage(f, X, Y);
      if (c.id === C.FALO) {
        lumi.push([X + f.width / 2, Y + f.height / 2, 22 + Math.sin(this.tempo * 9) * 3, notte ? 'rgba(255,150,50,0.6)' : 'rgba(255,150,50,0.25)']);
        if (Math.random() < 0.1) this.particelle.aggiungi(SCINTILLA, c.x + lw / 2, c.y - lh + 1, (Math.random() - 0.5) * 3, -4 - Math.random() * 5, 0.6 + Math.random() * 0.8, 0.45);
      } else if (c.id === C.FARO) lumi.push([X + f.width / 2, Y + 3, notte ? 30 : 10, 'rgba(255,240,170,0.6)']);
      else if (c.id === C.FORNACE) lumi.push([X + f.width / 2, Y + f.height - 5, 12, 'rgba(255,140,50,0.45)']);
      else if (notte && lh > 5 && c.id !== C.CAMPO && c.id !== C.CARRO && c.id !== C.BARCA && c.id !== C.PONTE && c.id !== C.MURA && c.id !== C.POZZO) {
        lumi.push([X + f.width / 2, Y + f.height - 6, f.width * 0.5, 'rgba(255,205,90,0.35)']);
      }
      void lh;
    }
    for (const o of omini) {
      let posa = this.pose.get(o);
      if (!posa) {
        posa = { x: o.x, y: o.y, passo: 0 };
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
      if (Math.abs(dx) > 0.05) posa.passo += o.stato === SCAPPA ? 0.35 : 0.2;
      const figure = figureOmino(o.aspetto);
      const f = o.stato === SCAPPA ? figure.fuga : figure.passi[Math.floor(posa.passo) & 3];
      // I bambini nascono piccoli e crescono.
      const grande = o.eta < 600 ? 0.6 + (0.4 * o.eta) / 600 : 1;
      const fw = Math.round(f.width * grande);
      const fh = Math.round(f.height * grande);
      const X = Math.round((posa.x + 0.5) * 2 - fw / 2) - ox;
      const affonda = o.stato === NUOTA ? 4 + Math.round(Math.sin(this.tempo * 3 + o.aspetto) * 0.6) : 0;
      const Y = Math.round((posa.y + 1) * 2) - fh + 1 - oy + affonda;
      if (X > W || X + fw < 0 || Y > H || Y + fh < 0) continue;
      const visibile = o.stato === NUOTA ? Math.max(1, f.height - Math.round(affonda / grande) - 1) : f.height;
      x.save();
      if (o.dir < 0) {
        x.translate(X + fw, Y);
        x.scale(-1, 1);
      } else x.translate(X, Y);
      x.drawImage(f, 0, 0, f.width, visibile, 0, 0, fw, Math.round(visibile * grande));
      x.restore();
    }
    // La luce dell'ora cade sulle figure (non sul vuoto intorno), poi si accendono i lumi.
    if (luce[0] < 0.98 || luce[1] < 0.98 || luce[2] < 0.98) {
      const k = this.copia.getContext('2d')!;
      k.clearRect(0, 0, W, H);
      k.drawImage(this.tele.sopra, 0, 0);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = `rgb(${(luce[0] * 255) | 0},${(luce[1] * 255) | 0},${(luce[2] * 255) | 0})`;
      x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'destination-in';
      x.drawImage(this.copia, 0, 0);
      x.globalCompositeOperation = 'source-over';
    }
    x.globalCompositeOperation = 'lighter';
    for (const [lx, ly, r, colore] of lumi) {
      const g = x.createRadialGradient(lx, ly, 1, lx, ly, r);
      g.addColorStop(0, colore);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    x.globalCompositeOperation = 'source-over';
    x.save();
    x.translate(-ox, -oy);
    this.particelle.disegna(x, 2, dt);
    x.restore();
  }
}
