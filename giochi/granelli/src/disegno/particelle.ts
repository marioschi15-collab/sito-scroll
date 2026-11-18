/** I tipi di particella: piccole cose che non fanno parte del mondo ma lo fanno sembrare vivo. */
export const SCINTILLA = 0;
export const LUCCIOLA = 1;
export const STELLINA = 2;
export const SBUFFO = 3;
export const CUORE = 4;
export const ANELLO = 5;
export const SPRUZZO = 6;
/** Una stellina colorata: la festa delle miscele leggendarie ha tutti i colori dell'arcobaleno. */
export const COLORATA = 7;

/** I colori delle stelline della festa leggendaria (rosso, arancio, giallo, verde, azzurro, viola). */
const ARCOBALENO = ['255,90,90', '255,160,60', '255,230,90', '120,230,110', '110,190,255', '200,130,255'];

interface Particella {
  tipo: number;
  /** Posizione e velocità, in celle e celle al secondo. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Secondi di vita passati e totali. */
  eta: number;
  vita: number;
  grande: number;
  seme: number;
}

const MASSIMO = 420;

/** Scintille, lucciole, sbuffi e stelline: nascono, si muovono per un attimo e spariscono. */
export class Particelle {
  private readonly vive: Particella[] = [];

  get quante(): number {
    return this.vive.length;
  }

  quanteDi(tipo: number): number {
    let n = 0;
    for (const p of this.vive) if (p.tipo === tipo) n++;
    return n;
  }

  aggiungi(tipo: number, x: number, y: number, vx: number, vy: number, vita: number, grande: number): void {
    if (this.vive.length >= MASSIMO) return;
    this.vive.push({ tipo, x, y, vx, vy, eta: 0, vita, grande, seme: Math.random() * 100 });
  }

  /** La festa di una scoperta: un anello che si allarga e una corona di stelline dorate. */
  scoppio(x: number, y: number): void {
    this.aggiungi(ANELLO, x, y, 0, 0, 1.1, 1);
    this.aggiungi(ANELLO, x, y, 0, 0, 1.5, 0.6);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.3;
      const v = 9 + Math.random() * 16;
      this.aggiungi(STELLINA, x, y, Math.cos(a) * v, Math.sin(a) * v - 4, 0.7 + Math.random() * 0.7, 0.8 + Math.random() * 0.8);
    }
  }

  /**
   * La festa di una miscela rara (forza 2) o leggendaria (forza 3): più anelli e più stelline di una scoperta
   * qualsiasi, e per la leggendaria stelline di tutti i colori che volano più lontano.
   */
  festa(x: number, y: number, forza: 2 | 3): void {
    const grande = forza === 3;
    const anelli = grande ? 4 : 2;
    for (let k = 0; k < anelli; k++) this.aggiungi(ANELLO, x, y, 0, 0, 1.2 + k * 0.45, grande ? 1 + k * 0.6 : 0.6 + k * 0.35);
    const n = grande ? 90 : 40;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const v = 10 + Math.random() * (grande ? 40 : 18);
      this.aggiungi(grande ? COLORATA : STELLINA, x, y, Math.cos(a) * v, Math.sin(a) * v - 5, 0.9 + Math.random() * (grande ? 1.4 : 0.9), (grande ? 1.2 : 0.9) + Math.random());
    }
  }

  sbuffo(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      this.aggiungi(SBUFFO, x + Math.random() - 0.5, y + Math.random() * 2 - 1, (Math.random() - 0.5) * 6, -2 - Math.random() * 5, 0.6 + Math.random() * 0.6, 0.7 + Math.random());
    }
  }

  cuore(x: number, y: number): void {
    this.aggiungi(CUORE, x, y, 0, -3, 1.6, 1);
  }

  /** Fa passare `dt` secondi e disegna tutto. `cella` è il lato di una cella in pixel della tela. */
  disegna(ctx: CanvasRenderingContext2D, cella: number, dt: number): void {
    const { vive } = this;
    let tenute = 0;
    for (let i = 0; i < vive.length; i++) {
      const p = vive[i];
      p.eta += dt;
      if (p.eta >= p.vita) continue;
      vive[tenute++] = p;
      const k = p.eta / p.vita;
      switch (p.tipo) {
        case SCINTILLA:
          p.vy += 6 * dt;
          p.vx += Math.sin(p.eta * 9 + p.seme) * 14 * dt;
          break;
        case LUCCIOLA:
          p.vx = Math.sin(p.eta * 1.3 + p.seme) * 2.2;
          p.vy = Math.cos(p.eta * 1.7 + p.seme * 2) * 1.4 - 0.3;
          break;
        case STELLINA:
        case COLORATA:
          p.vx *= 1 - 3 * dt;
          p.vy = p.vy * (1 - 3 * dt) + 14 * dt;
          break;
        case SBUFFO:
          p.vx *= 1 - 2 * dt;
          p.vy *= 1 - 2 * dt;
          break;
        case SPRUZZO:
          p.vy += 60 * dt;
          break;
        default:
          break;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const x = p.x * cella;
      const y = p.y * cella;
      const lato = Math.max(1.5, p.grande * cella);
      switch (p.tipo) {
        case SCINTILLA: {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = k < 0.4 ? `rgba(255,220,130,${1 - k})` : `rgba(255,120,40,${1 - k})`;
          ctx.fillRect(x - lato / 2, y - lato / 2, lato, lato);
          break;
        }
        case LUCCIOLA: {
          const acceso = Math.max(0, Math.sin(p.eta * 3 + p.seme)) * Math.min(1, k * 6, (1 - k) * 6);
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(200,255,120,${0.22 * acceso})`;
          ctx.fillRect(x - lato * 2, y - lato * 2, lato * 4, lato * 4);
          ctx.fillStyle = `rgba(230,255,160,${acceso})`;
          ctx.fillRect(x - lato / 2, y - lato / 2, lato, lato);
          break;
        }
        case STELLINA: {
          ctx.globalCompositeOperation = 'lighter';
          const l = lato * (1 - k * 0.6) * (0.7 + 0.3 * Math.sin(p.eta * 30 + p.seme));
          ctx.fillStyle = `rgba(255,214,90,${1 - k * k})`;
          ctx.fillRect(x - l / 2, y - l / 2, l, l);
          break;
        }
        case COLORATA: {
          ctx.globalCompositeOperation = 'lighter';
          const l = lato * (1 - k * 0.5) * (0.7 + 0.3 * Math.sin(p.eta * 30 + p.seme));
          ctx.fillStyle = `rgba(${ARCOBALENO[(p.seme | 0) % ARCOBALENO.length]},${1 - k * k})`;
          ctx.fillRect(x - l / 2, y - l / 2, l, l);
          break;
        }
        case SBUFFO: {
          ctx.globalCompositeOperation = 'source-over';
          const l = lato * (1 + k * 1.5);
          ctx.fillStyle = `rgba(222,228,245,${0.55 * (1 - k)})`;
          ctx.fillRect(x - l / 2, y - l / 2, l, l);
          break;
        }
        case SPRUZZO: {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = `rgba(170,215,255,${0.9 * (1 - k)})`;
          ctx.fillRect(x - lato / 2, y - lato / 2, lato, lato);
          break;
        }
        case CUORE: {
          ctx.globalCompositeOperation = 'source-over';
          const u = Math.max(1, cella * 0.45) * (0.6 + 0.4 * Math.min(1, k * 5));
          ctx.fillStyle = `rgba(255,96,130,${Math.min(1, (1 - k) * 3)})`;
          // Un cuoricino fatto di quadretti, come tutto il resto.
          for (const [cx, cy, cw] of [
            [-2, -2, 2],
            [1, -2, 2],
            [-3, -1, 7],
            [-2, 0, 5],
            [-1, 1, 3],
            [0, 2, 1],
          ]) ctx.fillRect(x + cx * u, y + cy * u, cw * u, u + 0.5);
          break;
        }
        case ANELLO: {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(255,214,90,${(1 - k) * 0.9})`;
          ctx.lineWidth = Math.max(2, cella * 0.7 * (1 - k));
          ctx.beginPath();
          ctx.arc(x, y, cella * (1 + k * 16 * p.grande), 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        default:
          break;
      }
    }
    vive.length = tenute;
    ctx.globalCompositeOperation = 'source-over';
  }
}
