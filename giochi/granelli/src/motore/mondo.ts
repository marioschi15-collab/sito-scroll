import {
  ALBERO,
  BRUCIA,
  GAS,
  LIQUIDO,
  M,
  N_MATERIALI,
  NASCOSTO,
  NULLA,
  OMINO,
  POLVERE,
  SOLIDO,
  STATO,
} from './materiali.js';
import { ALTEZZA, type Omino, POPOLAZIONE_MAX, aggiornaOmini, nuovoOmino } from './omini.js';

/** Una scoperta appena avvenuta: cosa e dove (in celle), per far brillare il punto sullo schermo. */
export interface Novita {
  id: number;
  x: number;
  y: number;
}

/**
 * Il mondo: una griglia di celle in cui ogni materiale segue poche regole semplici.
 * Tutto il resto (pioggia, incendi, boschi, temporali) nasce dall'incontro di quelle regole.
 */
export class Mondo {
  readonly w: number;
  readonly h: number;
  readonly tipo: Uint8Array;
  /** Un numero per cella: vita residua del fuoco, acqua nella nuvola, crescita della pianta… */
  readonly dato: Uint8Array;
  /** Un numero casuale per cella, fissato alla nascita: dà la grana ai colori e la quota alle nuvole. */
  readonly tinta: Uint8Array;
  private readonly fatto: Uint8Array;
  private giro = 0;
  private seme: number;

  tic = 0;
  /** Direzione in cui il vento spinge le nuvole: cambia ogni tanto. */
  vento: 1 | -1 = 1;
  omini: Omino[] = [];
  /** Cosa è già stato scoperto: materiali e scoperte speciali (100+). */
  readonly visti = new Set<number>();
  /** Scoperte avvenute dall'ultima volta che qualcuno le ha lette. */
  novita: Novita[] = [];
  /** Dove sono morti degli omini dall'ultima volta che qualcuno ha guardato (in celle). */
  caduti: { x: number; y: number }[] = [];
  /** Dove sono nati dei bambini dall'ultima volta che qualcuno ha guardato (in celle). */
  nati: { x: number; y: number }[] = [];
  /** Quante celle ci sono di ogni materiale: aggiornato ogni due secondi circa. */
  readonly conta = new Uint32Array(N_MATERIALI);
  /** Tic in cui gli omini potranno (ri)comparire. */
  prossimoArrivo = 0;

  constructor(w: number, h: number, seme = 12345) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.tipo = new Uint8Array(n);
    this.dato = new Uint8Array(n);
    this.tinta = new Uint8Array(n);
    this.fatto = new Uint8Array(n);
    this.seme = seme | 0 || 1;
  }

  /** Numero casuale tra 0 e 1 (ripetibile a parità di seme: serve ai test). */
  caso(): number {
    let s = this.seme;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.seme = s;
    return (s >>> 0) / 4294967296;
  }

  dentro(x: number, y: number): boolean {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  /** Cosa c'è in una cella; fuori dai bordi il mondo è roccia. */
  leggi(x: number, y: number): number {
    return this.dentro(x, y) ? this.tipo[y * this.w + x] : M.ROCCIA;
  }

  private datoIniziale(t: number): number {
    switch (t) {
      case M.FUOCO:
        return 20 + ((this.caso() * 28) | 0);
      case M.ARIA:
        return 40 + ((this.caso() * 50) | 0);
      case M.VAPORE:
        return 150 + ((this.caso() * 100) | 0);
      case M.FUMO:
        return 50 + ((this.caso() * 70) | 0);
      case M.NUVOLA:
        return 3 + ((this.caso() * 4) | 0);
      case M.FULMINE:
        // Resta nel cielo un attimo in più del necessario, perché l'occhio faccia in tempo a vederlo.
        return 9;
      default:
        return 0;
    }
  }

  /** Mette un materiale in una cella e, se è la prima volta che compare, lo segna come scoperta. */
  metti(i: number, t: number, dato = -1): void {
    this.tipo[i] = t;
    this.dato[i] = dato < 0 ? this.datoIniziale(t) : dato;
    this.tinta[i] = (this.caso() * 256) | 0;
    this.fatto[i] = this.giro;
    if (!NASCOSTO[t] && !this.visti.has(t)) this.scopri(t, i % this.w, (i / this.w) | 0);
  }

  scopri(id: number, x: number, y: number): void {
    if (this.visti.has(id)) return;
    this.visti.add(id);
    this.novita.push({ id, x, y });
  }

  svuota(i: number): void {
    this.tipo[i] = M.VUOTO;
    this.dato[i] = 0;
  }

  private scambia(a: number, b: number): void {
    const { tipo, dato, tinta, fatto } = this;
    const t = tipo[a];
    const d = dato[a];
    const c = tinta[a];
    tipo[a] = tipo[b];
    dato[a] = dato[b];
    tinta[a] = tinta[b];
    tipo[b] = t;
    dato[b] = d;
    tinta[b] = c;
    fatto[a] = this.giro;
    fatto[b] = this.giro;
  }

  /** Una delle quattro celle accanto, scelta a caso; -1 se cade fuori dal mondo. */
  private vicino(i: number, x: number, y: number): number {
    const r = (this.caso() * 4) | 0;
    if (r === 0) return y > 0 ? i - this.w : -1;
    if (r === 1) return y < this.h - 1 ? i + this.w : -1;
    if (r === 2) return x > 0 ? i - 1 : -1;
    return x < this.w - 1 ? i + 1 : -1;
  }

  private entraPolvere(j: number): boolean {
    const s = STATO[this.tipo[j]];
    return s === NULLA || s === GAS || (s === LIQUIDO && this.caso() < 0.6);
  }

  private entraLiquido(j: number): boolean {
    const s = STATO[this.tipo[j]];
    return s === NULLA || s === GAS;
  }

  /** Cade; se non può, scivola di lato con probabilità `scorre` (la sabbia scorre, il fango quasi no). */
  private muoviPolvere(i: number, x: number, y: number, scorre: number): boolean {
    if (y >= this.h - 1) return false;
    const giu = i + this.w;
    if (this.entraPolvere(giu)) {
      this.scambia(i, giu);
      return true;
    }
    if (this.caso() < scorre) {
      const d = this.caso() < 0.5 ? -1 : 1;
      for (let k = 0; k < 2; k++) {
        const dx = k === 0 ? d : -d;
        const nx = x + dx;
        if (nx < 0 || nx >= this.w) continue;
        if (STATO[this.tipo[i + dx]] === SOLIDO) continue;
        if (this.entraPolvere(giu + dx)) {
          this.scambia(i, giu + dx);
          return true;
        }
      }
    }
    return false;
  }

  /** Cade, scivola in diagonale, oppure si allarga di lato fino a `spinta` celle per livellarsi. */
  private muoviLiquido(i: number, x: number, y: number, spinta: number): boolean {
    const w = this.w;
    if (y < this.h - 1) {
      const giu = i + w;
      if (this.entraLiquido(giu)) {
        this.scambia(i, giu);
        return true;
      }
      const d = this.caso() < 0.5 ? -1 : 1;
      for (let k = 0; k < 2; k++) {
        const dx = k === 0 ? d : -d;
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        if (this.entraLiquido(giu + dx) && this.entraLiquido(i + dx)) {
          this.scambia(i, giu + dx);
          return true;
        }
      }
    }
    const d = this.caso() < 0.5 ? -1 : 1;
    let meta = -1;
    for (let n = 1; n <= spinta; n++) {
      const nx = x + d * n;
      if (nx < 0 || nx >= w) break;
      const j = i + d * n;
      if (!this.entraLiquido(j)) break;
      meta = j;
      if (y < this.h - 1 && this.entraLiquido(j + w)) break;
    }
    if (meta >= 0) {
      this.scambia(i, meta);
      return true;
    }
    return false;
  }

  /** Sale con probabilità `su`, altrimenti ondeggia di lato. */
  private muoviGas(i: number, x: number, y: number, su: number): boolean {
    const r = this.caso();
    if (r < su) {
      if (y > 0) {
        const d = r < su * 0.25 ? (this.caso() < 0.5 ? -1 : 1) : 0;
        const nx = x + d;
        if (nx >= 0 && nx < this.w && this.tipo[i - this.w + d] === M.VUOTO) {
          this.scambia(i, i - this.w + d);
          return true;
        }
        if (this.tipo[i - this.w] === M.VUOTO) {
          this.scambia(i, i - this.w);
          return true;
        }
      }
    }
    if (r > 0.6 || r < su) {
      const d = this.caso() < 0.5 ? -1 : 1;
      const nx = x + d;
      if (nx >= 0 && nx < this.w && this.tipo[i + d] === M.VUOTO) {
        this.scambia(i, i + d);
        return true;
      }
    }
    return false;
  }

  /** L'aria è un soffio: si sparpaglia in ogni direzione, anche verso il basso, e sale solo un poco. */
  private soffia(i: number, x: number, y: number): void {
    const r = this.caso();
    const dx = r < 0.4 ? -1 : r < 0.8 ? 1 : 0;
    const q = this.caso();
    const dy = q < 0.45 ? -1 : q < 0.75 ? 1 : 0;
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= this.w || ny < 0 || ny >= this.h) return;
    const j = ny * this.w + nx;
    if (this.tipo[j] === M.VUOTO) this.scambia(i, j);
  }

  /** Dà fuoco a una pianta o a un pezzo di legno: il legno brucia molto più a lungo. */
  accendi(j: number): void {
    const lungo = this.tipo[j] === M.LEGNO;
    this.metti(j, M.BRACE, lungo ? 110 + ((this.caso() * 120) | 0) : 22 + ((this.caso() * 30) | 0));
  }

  /** Fa nascere un germoglio: erba bassa, oppure (più di rado) un albero. */
  private germoglia(j: number, fertile: boolean): void {
    const albero = this.caso() < (fertile ? 0.35 : 0.15);
    this.metti(j, M.PIANTA, albero ? ALBERO + 6 + ((this.caso() * 8) | 0) : 1 + ((this.caso() * 4) | 0));
  }

  /** Un fulmine scende a zig-zag da (x, y) finché non colpisce qualcosa. */
  fulmine(x: number, y: number): void {
    const { w, h, tipo } = this;
    let cx = x;
    for (let cy = Math.max(0, y); cy < h; cy++) {
      const i = cy * w + cx;
      const t = tipo[i];
      const s = STATO[t];
      if (s === NULLA || s === GAS) {
        if (t !== M.NUVOLA) this.metti(i, M.FULMINE);
        const d = ((this.caso() * 3) | 0) - 1;
        if (cx + d >= 0 && cx + d < w) cx += d;
        continue;
      }
      this.colpisci(cx, cy);
      return;
    }
  }

  private colpisci(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > 5 || !this.dentro(x + dx, y + dy)) continue;
        const j = (y + dy) * this.w + x + dx;
        const t = this.tipo[j];
        if (t === M.SABBIA) this.metti(j, M.VETRO);
        else if (BRUCIA[t]) this.accendi(j);
        else if (t === M.ACQUA && this.caso() < 0.5) this.metti(j, M.VAPORE);
        else if ((t === M.NEVE || t === M.GHIACCIO) && this.caso() < 0.5) this.metti(j, M.ACQUA);
      }
    }
  }

  /** Fa avanzare il mondo di un istante. */
  passo(): void {
    this.tic++;
    this.giro = (this.giro + 1) & 255;
    const { w, h, tipo, fatto } = this;
    const giro = this.giro;
    const daSinistra = (this.tic & 1) === 0;
    for (let y = h - 1; y >= 0; y--) {
      const riga = y * w;
      for (let k = 0; k < w; k++) {
        const x = daSinistra ? k : w - 1 - k;
        const i = riga + x;
        const t = tipo[i];
        if (t === M.VUOTO || fatto[i] === giro) continue;
        this.aggiorna(i, x, y, t);
      }
    }
    if (this.tic % 2400 === 0 && this.caso() < 0.5) this.vento = this.vento === 1 ? -1 : 1;
    if (this.tic % 120 === 0) this.censimento();
    aggiornaOmini(this);
  }

  private censimento(): void {
    const { conta, tipo } = this;
    conta.fill(0);
    for (let i = 0; i < tipo.length; i++) conta[tipo[i]]++;
  }

  private aggiorna(i: number, x: number, y: number, t: number): void {
    const { tipo, dato, w } = this;
    switch (t) {
      case M.TERRA:
        this.muoviPolvere(i, x, y, 0.35);
        return;

      case M.SABBIA:
        this.muoviPolvere(i, x, y, 1);
        return;

      case M.FANGO:
      case M.HUMUS: {
        if (this.muoviPolvere(i, x, y, t === M.FANGO ? 0.08 : 0.35)) return;
        // Sotto uno specchio d'acqua il fango si approfondisce di qualche cella: la riva si vede.
        if (t === M.FANGO && y > 1 && y < this.h - 1 && tipo[i + w] === M.TERRA && this.caso() < 0.01) {
          if (tipo[i - w] === M.ACQUA || tipo[i - 2 * w] === M.ACQUA) this.metti(i + w, M.FANGO);
        }
        // La vita: un germoglio spunta dove il terreno umido (o fertile) ha cielo aperto sopra.
        if (y > 1 && tipo[i - w] === M.VUOTO && tipo[i - 2 * w] === M.VUOTO) {
          if (this.caso() < (t === M.FANGO ? 0.00006 : 0.0005)) this.germoglia(i - w, t === M.HUMUS);
        }
        return;
      }

      case M.CENERE: {
        const j = this.vicino(i, x, y);
        if (j >= 0 && tipo[j] === M.TERRA && this.caso() < 0.1) {
          this.metti(j, M.HUMUS);
          this.svuota(i);
          return;
        }
        if (this.caso() < 0.7) this.muoviPolvere(i, x, y, 0.8);
        return;
      }

      case M.NEVE: {
        const j = this.vicino(i, x, y);
        if (j >= 0 && tipo[j] === M.ACQUA && this.caso() < 0.15) {
          this.metti(j, M.GHIACCIO);
          this.metti(i, M.GHIACCIO);
          return;
        }
        if (this.caso() < 0.5) this.muoviPolvere(i, x, y, 0.5);
        return;
      }

      case M.ARGILLA:
        if (y < this.h - 1 && this.entraPolvere(i + w)) this.scambia(i, i + w);
        return;

      case M.ACQUA: {
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (v === M.FUOCO) {
            this.metti(j, M.VAPORE);
            if (this.caso() < 0.5) {
              this.svuota(i);
              return;
            }
          } else if (v === M.LAVA) {
            this.metti(j, M.PIETRA);
            this.metti(i, M.VAPORE);
            return;
          } else if (v === M.BRACE) {
            this.metti(j, M.CENERE);
            this.metti(i, M.VAPORE);
            return;
          } else if (v === M.TERRA && this.caso() < 0.12) {
            this.metti(j, M.FANGO);
            this.svuota(i);
            return;
          }
        }
        this.muoviLiquido(i, x, y, 4);
        return;
      }

      case M.LAVA: {
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (BRUCIA[v]) this.accendi(j);
          else if (v === M.SABBIA) {
            if (this.caso() < 0.05) this.metti(j, M.VETRO);
          } else if (v === M.NEVE || v === M.GHIACCIO) {
            this.metti(j, M.VAPORE);
            this.metti(i, M.OSSIDIANA);
            return;
          } else if (v === M.ARGILLA) {
            if (this.caso() < 0.1) this.metti(j, M.MATTONE);
          } else if (v === M.FANGO) {
            if (this.caso() < 0.1) this.metti(j, M.TERRA);
          } else if (v === M.ARIA && this.caso() < 0.2) {
            this.svuota(j);
            this.metti(i, M.PIETRA);
            return;
          } else if (v === M.VUOTO && j === i - w && this.caso() < 0.01) {
            this.metti(j, M.FUOCO, 6 + ((this.caso() * 8) | 0));
          }
        }
        // Lasciata in pace, la lava si raffredda da sola e diventa pietra.
        if (this.caso() < 0.0015) {
          this.metti(i, M.PIETRA);
          return;
        }
        if (this.caso() < 0.35) this.muoviLiquido(i, x, y, 1);
        return;
      }

      case M.FUOCO: {
        if (dato[i] <= 1) {
          if (this.caso() < 0.2) this.metti(i, M.FUMO);
          else this.svuota(i);
          return;
        }
        dato[i]--;
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (BRUCIA[v]) {
            if (this.caso() < 0.5) this.accendi(j);
          } else if (v === M.ACQUA) {
            this.metti(i, M.VAPORE);
            return;
          } else if (v === M.TERRA) {
            if (this.caso() < 0.05) this.metti(j, M.LAVA);
          } else if (v === M.FANGO) {
            if (this.caso() < 0.1) this.metti(j, M.TERRA);
          } else if (v === M.ARGILLA) {
            if (this.caso() < 0.08) this.metti(j, M.MATTONE);
          } else if (v === M.NEVE || v === M.GHIACCIO) {
            this.metti(j, M.ACQUA);
            this.svuota(i);
            return;
          }
        }
        this.muoviGas(i, x, y, 0.7);
        return;
      }

      case M.BRACE: {
        if (dato[i] <= 1) {
          this.metti(i, this.caso() < 0.6 ? M.CENERE : M.FUMO);
          return;
        }
        dato[i]--;
        if (y > 0 && tipo[i - w] === M.VUOTO && this.caso() < 0.3) {
          this.metti(i - w, M.FUOCO, 8 + ((this.caso() * 10) | 0));
        }
        const j = this.vicino(i, x, y);
        if (j >= 0 && BRUCIA[tipo[j]] && this.caso() < 0.08) this.accendi(j);
        return;
      }

      case M.ARIA: {
        if (dato[i] <= 1) {
          this.svuota(i);
          return;
        }
        dato[i]--;
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (v === M.TERRA) {
            if (this.caso() < 0.25) {
              this.metti(j, M.SABBIA);
              this.svuota(i);
              return;
            }
          } else if (v === M.FANGO) {
            if (this.caso() < 0.3) {
              this.metti(j, M.ARGILLA);
              this.svuota(i);
              return;
            }
          } else if (v === M.VAPORE) {
            if (this.caso() < 0.5) this.metti(j, M.NUVOLA);
          } else if (v === M.FUOCO || v === M.BRACE) {
            // L'aria alimenta il fuoco: la fiammata corre lungo il soffio.
            this.metti(i, M.FUOCO, 14 + ((this.caso() * 14) | 0));
            return;
          } else if (v === M.NUVOLA) {
            if (this.caso() < 0.2) {
              this.metti(j, M.NEVE);
              this.svuota(i);
              return;
            }
          } else if (v === M.LAVA && this.caso() < 0.2) {
            this.metti(j, M.PIETRA);
            this.svuota(i);
            return;
          }
        }
        this.soffia(i, x, y);
        return;
      }

      case M.VAPORE: {
        // Arrivato in alto, il vapore si raccoglie in nuvola; se resta intrappolato, torna acqua.
        if (y < this.h * 0.16) {
          this.metti(i, M.NUVOLA);
          return;
        }
        if (dato[i] <= 1) {
          this.metti(i, M.ACQUA);
          return;
        }
        dato[i]--;
        this.muoviGas(i, x, y, 0.8);
        return;
      }

      case M.FUMO:
        if (dato[i] <= 1) {
          this.svuota(i);
          return;
        }
        dato[i]--;
        this.muoviGas(i, x, y, 0.6);
        return;

      case M.NUVOLA: {
        const quota = 2 + (this.tinta[i] % Math.max(1, (this.h * 0.13) | 0));
        if (y > quota) {
          if (tipo[i - w] === M.VUOTO && this.caso() < 0.5) {
            this.scambia(i, i - w);
            return;
          }
        }
        if (this.caso() < 0.0015 && y < this.h - 1 && tipo[i + w] === M.VUOTO) {
          this.metti(i + w, M.ACQUA);
          if (dato[i] <= 1) {
            this.svuota(i);
            return;
          }
          dato[i]--;
        }
        if (
          this.caso() < 0.00005 &&
          x > 0 &&
          x < w - 1 &&
          y > 0 &&
          tipo[i - 1] === M.NUVOLA &&
          tipo[i + 1] === M.NUVOLA &&
          tipo[i - w] === M.NUVOLA &&
          tipo[i + w] === M.NUVOLA
        ) {
          this.fulmine(x, y + 1);
          return;
        }
        if (this.caso() < 0.06) {
          const d = this.caso() < 0.8 ? this.vento : -this.vento;
          const nx = x + d;
          if (nx >= 0 && nx < w && tipo[i + d] === M.VUOTO) this.scambia(i, i + d);
        }
        return;
      }

      case M.FULMINE: {
        if (dato[i] <= 1) {
          this.svuota(i);
          return;
        }
        dato[i]--;
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          if (tipo[j] === M.SABBIA) this.metti(j, M.VETRO);
          else if (BRUCIA[tipo[j]]) this.accendi(j);
        }
        return;
      }

      case M.PIANTA: {
        const d = dato[i];
        if (d === 0 || d === ALBERO || y === 0 || this.caso() >= 0.02) return;
        if (d < ALBERO) {
          // Erba: uno stelo che sale di qualche cella.
          if (tipo[i - w] === M.VUOTO) this.metti(i - w, M.PIANTA, d - 1);
          dato[i] = 0;
          return;
        }
        // Albero: la punta sale, e dietro di sé lascia il tronco.
        const resto = d - ALBERO - 1;
        let dx = 0;
        if (this.caso() < 0.15) dx = this.caso() < 0.5 ? -1 : 1;
        if (x + dx < 0 || x + dx >= w || tipo[i - w + dx] !== M.VUOTO) dx = 0;
        const j = i - w + dx;
        if (tipo[j] !== M.VUOTO) {
          dato[i] = 0;
          return;
        }
        this.metti(j, M.PIANTA, resto > 0 ? ALBERO + resto : 0);
        this.metti(i, M.LEGNO);
        if (resto <= 0) this.chioma(x + dx, y - 1);
        return;
      }

      default:
        return;
    }
  }

  private chioma(x: number, y: number): void {
    const r = 2 + ((this.caso() * 2) | 0);
    for (let dy = -r; dy <= 1; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + 1 || !this.dentro(x + dx, y + dy)) continue;
        const j = (y + dy) * this.w + x + dx;
        if (this.tipo[j] === M.VUOTO && this.caso() < 0.85) this.metti(j, M.PIANTA, 0);
      }
    }
  }

  /**
   * Il gesto del giocatore: versa un materiale in un cerchio. I granelli cadono solo dove c'è posto,
   * così non si cancella per sbaglio quello che c'è già.
   */
  versa(x: number, y: number, raggio: number, t: number): void {
    const stato = STATO[t];
    const fitto = stato === SOLIDO ? 1 : stato === LIQUIDO ? 0.5 : stato === POLVERE ? 0.35 : 0.3;
    for (let dy = -raggio; dy <= raggio; dy++) {
      for (let dx = -raggio; dx <= raggio; dx++) {
        if (dx * dx + dy * dy > raggio * raggio || !this.dentro(x + dx, y + dy)) continue;
        const i = (y + dy) * this.w + x + dx;
        if (this.tipo[i] === M.VUOTO && this.caso() < fitto) this.metti(i, t);
      }
    }
  }

  /** La gomma: toglie tutto quello che trova nel cerchio, omini compresi. */
  cancella(x: number, y: number, raggio: number): void {
    for (let dy = -raggio; dy <= raggio; dy++) {
      for (let dx = -raggio; dx <= raggio; dx++) {
        if (dx * dx + dy * dy > raggio * raggio || !this.dentro(x + dx, y + dy)) continue;
        this.svuota((y + dy) * this.w + x + dx);
      }
    }
    // Un omino sparisce se la gomma passa su un punto qualsiasi del suo corpo.
    const r2 = (raggio + 1) * (raggio + 1);
    this.omini = this.omini.filter((o) => {
      for (let k = 0; k < ALTEZZA; k++) {
        if ((o.x - x) * (o.x - x) + (o.y - k - y) * (o.y - k - y) <= r2) return false;
      }
      return true;
    });
  }

  /** Posa un omino con i piedi nel punto indicato (se è per aria, cadrà fino a terra da solo). */
  aggiungiOmino(x: number, y: number): void {
    if (x < 0 || x >= this.w || this.omini.length >= POPOLAZIONE_MAX + 6) return;
    const piedi = Math.max(ALTEZZA - 1, Math.min(this.h - 1, y));
    this.omini.push(nuovoOmino(this, x, piedi, 300 + ((this.caso() * 300) | 0)));
    this.scopri(OMINO, x, piedi - 1);
  }
}
