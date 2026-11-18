import { GAS, LIQUIDO, POLVERE, PRIMA_ID_MISCELA, type Sostanza } from './materiali.js';

/**
 * Il numero di una miscela dipende solo dai suoi due ingredienti (in qualsiasi ordine): la stessa coppia dà
 * sempre la stessa miscela, in ogni partita e per ogni giocatore.
 */
export function idMiscela(a: number, b: number): number {
  const x = Math.min(a, b);
  const y = Math.max(a, b);
  let h = 2166136261;
  for (const v of [x, y]) {
    h = Math.imul(h ^ (v >>> 0), 16777619);
    h = Math.imul(h ^ Math.floor(v / 4294967296), 16777619);
    h ^= h >>> 15;
  }
  return PRIMA_ID_MISCELA + (h >>> 0);
}

/** Un dado truccato: a parità di seme, tira sempre gli stessi numeri (tra 0 e 1). */
export function dado(seme: number): () => number {
  let s = (seme ^ 0x9e3779b9) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const stringi = (v: number, da = 0, a = 1): number => Math.max(da, Math.min(a, v));

/**
 * Da che valore in su un tratto del carattere conta davvero. Le stesse soglie decidono le etichette che il Libro
 * mostra e quello che la miscela fa nel mondo (mondo.ts, miscele-vive.ts): un'etichetta senza effetto sarebbe una
 * bugia. Per il calore la soglia vale nei due versi: sopra scotta, sotto il suo opposto gela.
 */
export const SOGLIA = {
  calore: 0.5,
  luce: 0.5,
  brucia: 0.55,
  esplode: 0.6,
  fertile: 0.6,
  vivo: 0.6,
  veleno: 0.55,
  nutre: 0.6,
  corrode: 0.6,
  vola: 0.5,
  appiccica: 0.5,
  fiorisce: 0.5,
  tinge: 0.5,
  indurisce: 0.5,
  piove: 0.5,
} as const;

/** Fa male a chi la tocca: scotta, avvelena o corrode. Gli omini le stanno alla larga, e se la toccano muoiono. */
export function faMale(s: Sostanza): boolean {
  return s.calore > SOGLIA.calore || s.veleno > SOGLIA.veleno || s.corrode > SOGLIA.corrode;
}

/** Un omino la può mangiare: nutre e non fa male. */
export function siMangia(s: Sostanza): boolean {
  return s.nutre > SOGLIA.nutre && !faMale(s);
}

/** Il nome di un carattere che una sostanza può mostrare (le etichette del Libro ne sono la traduzione). */
export type Carattere =
  | 'caldo' | 'freddo' | 'luce' | 'brucia' | 'esplode' | 'fertile' | 'vivo' | 'veleno' | 'nutre' | 'corrode'
  | 'vola' | 'appiccica' | 'fiorisce' | 'tinge' | 'indurisce' | 'piove';

/**
 * Vero se un carattere ha un effetto nel mondo per una sostanza in quello stato: volare e attaccarsi sono cose da
 * polveri e liquidi (un solido sta fermo, un gas sale già), tingere l'acqua è da liquidi, farsi nuvola da gas;
 * un gas non si allarga come una cosa viva e non fa presa.
 */
export function funziona(c: Carattere, stato: number): boolean {
  switch (c) {
    case 'vola':
    case 'appiccica':
      return stato === POLVERE || stato === LIQUIDO;
    case 'tinge':
      return stato === LIQUIDO;
    case 'piove':
      return stato === GAS;
    case 'vivo':
    case 'indurisce':
      return stato !== GAS;
    default:
      return true;
  }
}

/** Quanto un carattere supera la sua soglia (negativo se non la supera). */
export function margine(s: Sostanza, c: Carattere): number {
  switch (c) {
    case 'caldo':
      return s.calore - SOGLIA.calore;
    case 'freddo':
      return -s.calore - SOGLIA.calore;
    case 'nutre':
      return siMangia(s) ? s.nutre - SOGLIA.nutre : -1;
    default:
      return s[c] - SOGLIA[c];
  }
}

/** Tutti i caratteri, nell'ordine in cui il Libro li elenca. */
export const CARATTERI: readonly Carattere[] = [
  'caldo', 'freddo', 'luce', 'brucia', 'esplode', 'fertile', 'vivo', 'veleno', 'nutre', 'corrode',
  'vola', 'appiccica', 'fiorisce', 'tinge', 'indurisce', 'piove',
];

/** I tratti che una sostanza mostra davvero: abbastanza forti, e con un effetto nel mondo per il suo stato. */
export function tratti(s: Sostanza): Carattere[] {
  const t: Carattere[] = [];
  for (const c of CARATTERI) if (margine(s, c) > 0 && funziona(c, s.stato)) t.push(c);
  return t;
}

/** Quanto è rara una miscela: lo dice il suo carattere, quindi è la stessa in ogni partita. */
export type Rarita = 'comune' | 'rara' | 'leggendaria';

/** I caratteri che valgono di più: fanno cose che si vedono da lontano o che cambiano il mondo intorno. */
const PREZIOSI = new Set<Carattere>(['luce', 'esplode', 'vivo', 'corrode', 'vola', 'piove', 'fiorisce', 'tinge']);

/**
 * Comune, rara o leggendaria, contando i caratteri (quelli preziosi valgono una volta e mezza). Con le regole di
 * oggi, tra le miscele di due materiali circa una su cinque è rara e una su quaranta leggendaria; più avanti, con
 * genitori che hanno già tanti caratteri, le rare e le leggendarie si fanno più frequenti.
 */
export function rarita(s: Sostanza): Rarita {
  let punti = 0;
  for (const c of tratti(s)) punti += PREZIOSI.has(c) ? 1.5 : 1;
  return punti >= 4.5 ? 'leggendaria' : punti >= 3 ? 'rara' : 'comune';
}

// ── Colori: a metà tra i genitori, girati un poco lungo l'arcobaleno ──────────────

function inHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function daHsl(h: number, s: number, l: number): [number, number, number] {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canale = (t: number): number => {
    t = ((t % 1) + 1) % 1;
    const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    return Math.round(v * 255);
  };
  return [canale(h + 1 / 3), canale(h), canale(h - 1 / 3)];
}

/**
 * Il colore di una miscela: tra quelli dei genitori (`quanto` è il peso del primo), poi spostato un po' lungo
 * l'arcobaleno, più vivo e mai troppo scuro; una miscela che scotta tira al rosso, una gelida all'azzurro.
 */
export function coloreFiglio(a: Sostanza, b: Sostanza, figlio: Sostanza, r: () => number, quanto = 0.5): [number, number, number] {
  const mezzo = (k: number): number => a.colore[k] * quanto + b.colore[k] * (1 - quanto);
  const [h, s, l] = inHsl(mezzo(0), mezzo(1), mezzo(2));
  let tono = h + (r() - 0.5) * 0.22;
  if (figlio.calore > 0.5) tono = tono * 0.6 + 0.05 * 0.4;
  if (figlio.calore < -0.5) tono = tono * 0.6 + 0.56 * 0.4;
  const vivezza = stringi(s * 0.8 + 0.18 + r() * 0.3, 0.2, 0.9);
  const chiaro = stringi(l * 0.8 + 0.1 + (figlio.luce > 0.5 ? 0.15 : 0) + (r() - 0.5) * 0.2, 0.28, 0.8);
  return daHsl(tono, vivezza, chiaro);
}
