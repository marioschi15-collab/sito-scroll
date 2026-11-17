import { GAS, LIQUIDO, POLVERE, PRIMA_ID_MISCELA, SOLIDO, type Sostanza, TRATTI } from './materiali.js';

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

const stringi = (v: number, da = 0, a = 1): number => Math.max(da, Math.min(a, v));

/** I tratti che una sostanza mostra davvero (quelli abbastanza forti da vedersi nel mondo). */
export function tratti(s: Sostanza): string[] {
  const t: string[] = [];
  if (s.calore > 0.5) t.push('caldo');
  if (s.calore < -0.5) t.push('freddo');
  if (s.luce > 0.5) t.push('luce');
  if (s.brucia > 0.55) t.push('brucia');
  if (s.esplode > 0.6) t.push('esplode');
  if (s.fertile > 0.6) t.push('fertile');
  if (s.vivo > 0.6) t.push('vivo');
  if (s.veleno > 0.55) t.push('veleno');
  if (s.nutre > 0.6) t.push('nutre');
  if (s.corrode > 0.6) t.push('corrode');
  return t;
}

function statoFiglio(a: number, b: number, r: () => number): number {
  const tiro = r();
  if (a === b) return tiro < 0.88 ? a : [POLVERE, LIQUIDO, SOLIDO, GAS][(r() * 4) | 0];
  const ha = (s: number): boolean => a === s || b === s;
  if (ha(POLVERE) && ha(LIQUIDO)) return tiro < 0.55 ? LIQUIDO : POLVERE;
  if (ha(POLVERE) && ha(SOLIDO)) return tiro < 0.6 ? POLVERE : SOLIDO;
  if (ha(POLVERE) && ha(GAS)) return tiro < 0.6 ? POLVERE : GAS;
  if (ha(LIQUIDO) && ha(SOLIDO)) return tiro < 0.5 ? LIQUIDO : SOLIDO;
  if (ha(LIQUIDO) && ha(GAS)) return tiro < 0.5 ? LIQUIDO : GAS;
  return tiro < 0.5 ? SOLIDO : POLVERE;
}

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

/** I tratti pericolosi compaiono dal nulla più di rado degli altri: un mondo divorato per caso non è divertente. */
const RARO: Record<string, number> = { vivo: 0.05, corrode: 0.05, esplode: 0.07 };

/**
 * Fonde due sostanze in una nuova. Il figlio prende un po' dell'una e un po' dell'altra, e ogni tanto tira fuori
 * un carattere che nessuno dei due genitori aveva: è così che dalle miscele nascono le sorprese.
 */
export function fondi(a: Sostanza, b: Sostanza, id: number): Sostanza {
  const r = dado(id);
  const tra = (x: number, y: number): number => x + (y - x) * r();
  const figlio: Sostanza = {
    stato: statoFiglio(a.stato, b.stato, r),
    colore: [0, 0, 0],
    peso: tra(a.peso, b.peso),
    scorre: tra(a.scorre, b.scorre),
    calore: tra(a.calore, b.calore),
    brucia: tra(a.brucia, b.brucia),
    luce: tra(a.luce, b.luce),
    fertile: tra(a.fertile, b.fertile),
    vivo: tra(a.vivo, b.vivo),
    veleno: tra(a.veleno, b.veleno),
    nutre: tra(a.nutre, b.nutre),
    esplode: tra(a.esplode, b.esplode),
    corrode: tra(a.corrode, b.corrode),
  };
  for (const k of TRATTI) {
    if (r() >= (RARO[k] ?? 0.13)) continue;
    const salto = 0.3 + r() * 0.6;
    if (k === 'calore') figlio.calore = stringi(figlio.calore + (r() < 0.5 ? -salto : salto), -1);
    else figlio[k] = stringi(figlio[k] + salto);
  }
  if (figlio.calore > 0.6) figlio.luce = Math.max(figlio.luce, 0.55);
  if (figlio.stato === GAS) {
    figlio.peso = Math.min(figlio.peso, 0.12);
    figlio.vivo = 0;
    figlio.fertile = 0;
  } else if (figlio.stato === LIQUIDO) {
    figlio.peso = stringi(figlio.peso, 0.25, 0.95);
    figlio.scorre = Math.max(figlio.scorre, 0.15);
  } else if (figlio.stato === SOLIDO) {
    figlio.scorre = 0;
  }

  // Nessuna miscela è anonima: se non ha preso nessun carattere, gliene tocca uno in sorte.
  if (tratti(figlio).length === 0) {
    const sorte = (r() * 7) | 0;
    if (sorte === 0) figlio.luce = 0.6 + r() * 0.3;
    else if (sorte === 1) figlio.fertile = 0.65 + r() * 0.3;
    else if (sorte === 2) figlio.nutre = 0.65 + r() * 0.3;
    else if (sorte === 3) figlio.brucia = 0.6 + r() * 0.3;
    else if (sorte === 4) figlio.calore = 0.55 + r() * 0.3;
    else if (sorte === 5) figlio.calore = -0.55 - r() * 0.3;
    else figlio.veleno = 0.6 + r() * 0.3;
  }

  // Il colore: a metà tra i genitori, poi spostato un po' lungo l'arcobaleno, più vivo e mai troppo scuro.
  const [h, s, l] = inHsl((a.colore[0] + b.colore[0]) / 2, (a.colore[1] + b.colore[1]) / 2, (a.colore[2] + b.colore[2]) / 2);
  let tono = h + (r() - 0.5) * 0.22;
  if (figlio.calore > 0.5) tono = tono * 0.6 + 0.05 * 0.4;
  if (figlio.calore < -0.5) tono = tono * 0.6 + 0.56 * 0.4;
  const vivezza = stringi(s * 0.8 + 0.18 + r() * 0.3, 0.2, 0.9);
  const chiaro = stringi(l * 0.8 + 0.1 + (figlio.luce > 0.5 ? 0.15 : 0) + (r() - 0.5) * 0.2, 0.28, 0.8);
  figlio.colore = daHsl(tono, vivezza, chiaro);
  return figlio;
}
