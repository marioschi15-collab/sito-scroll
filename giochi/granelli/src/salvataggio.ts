import { N_MATERIALI } from './motore/materiali.js';
import { Mondo } from './motore/mondo.js';
import type { Omino } from './motore/omini.js';

const CHIAVE = 'granelli-v1';

/** La fotografia di una partita: solo dati semplici, pronti per essere scritti come testo. */
export interface Salvato {
  v: 1;
  w: number;
  h: number;
  visti: number[];
  tipo: string;
  dato: string;
  tinta: string;
  omini: Omino[];
  tic: number;
}

function inTesto(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return btoa(s);
}

function daTesto(s: string, in_: Uint8Array): boolean {
  const b = atob(s);
  if (b.length !== in_.length) return false;
  for (let i = 0; i < b.length; i++) in_[i] = b.charCodeAt(i);
  return true;
}

export function fotografa(m: Mondo): Salvato {
  return {
    v: 1,
    w: m.w,
    h: m.h,
    visti: [...m.visti],
    tipo: inTesto(m.tipo),
    dato: inTesto(m.dato),
    tinta: inTesto(m.tinta),
    omini: m.omini.map((o) => ({ ...o })),
    tic: m.tic,
  };
}

/** Ricostruisce il mondo da una fotografia; null se non è una fotografia valida. */
export function ripristina(dati: unknown): Mondo | null {
  try {
    const d = dati as Salvato;
    if (!d || d.v !== 1 || !(d.w > 0) || !(d.h > 0) || d.w * d.h > 400000) return null;
    const m = new Mondo(d.w, d.h, (Date.now() & 0x7fffffff) || 1);
    if (!daTesto(d.tipo, m.tipo) || !daTesto(d.dato, m.dato) || !daTesto(d.tinta, m.tinta)) return null;
    for (let i = 0; i < m.tipo.length; i++) if (m.tipo[i] >= N_MATERIALI) m.tipo[i] = 0;
    for (const id of d.visti) m.visti.add(id);
    m.omini = Array.isArray(d.omini) ? d.omini.filter((o) => m.dentro(o.x, o.y)).map((o) => ({ ...o })) : [];
    m.tic = d.tic | 0;
    return m;
  } catch {
    return null;
  }
}

export function impacchetta(m: Mondo): string {
  return JSON.stringify(fotografa(m));
}

/** Ricostruisce il mondo da un testo salvato; null se il testo non è un salvataggio valido. */
export function spacchetta(testo: string): Mondo | null {
  try {
    return ripristina(JSON.parse(testo));
  } catch {
    return null;
  }
}

export function salva(m: Mondo): void {
  try {
    localStorage.setItem(CHIAVE, impacchetta(m));
  } catch {
    // Spazio finito o salvataggio vietato dal browser: si gioca lo stesso, senza ricordare.
  }
}

export function carica(): Mondo | null {
  try {
    const testo = localStorage.getItem(CHIAVE);
    return testo ? spacchetta(testo) : null;
  } catch {
    return null;
  }
}
