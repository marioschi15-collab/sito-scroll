import { N_BASE, N_TIPI, PRIMA_MISCELA } from './motore/materiali.js';
import { Mondo } from './motore/mondo.js';
import type { Omino } from './motore/omini.js';

const CHIAVE = 'granelli-v1';

/** La fotografia di una partita: solo dati semplici, pronti per essere scritti come testo. */
export interface Salvato {
  v: 1 | 2;
  w: number;
  h: number;
  visti: number[];
  tipo: string;
  dato: string;
  tinta: string;
  omini: Omino[];
  tic: number;
  /** Le miscele conosciute: numero, i due ingredienti, il nome. */
  ricette?: [number, number, number, string][];
  /** Quale miscela occupa quale posto nelle celle di questo mondo. */
  posti?: [number, number][];
  /** Quello che la pagina vuole ricordare insieme alla partita (per esempio gli ultimi materiali usati). */
  extra?: unknown;
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

export function fotografa(m: Mondo, extra?: unknown): Salvato {
  const posti: [number, number][] = [];
  for (let t = PRIMA_MISCELA; t < N_TIPI; t++) if (m.idTipo[t] > 0) posti.push([t, m.idTipo[t]]);
  return {
    v: 2,
    w: m.w,
    h: m.h,
    visti: [...m.visti],
    tipo: inTesto(m.tipo),
    dato: inTesto(m.dato),
    tinta: inTesto(m.tinta),
    omini: m.omini.map((o) => ({ ...o })),
    tic: m.tic,
    ricette: [...m.ricettario].map(([id, r]) => [id, r.a, r.b, r.nome]),
    posti,
    extra,
  };
}

/** Ricopia in un mondo le miscele conosciute (nell'ordine in cui sono nate: i genitori vengono prima dei figli). */
export function ricopiaRicette(m: Mondo, ricette: readonly (readonly [number, number, number, string])[]): void {
  for (const [id, a, b, nome] of ricette) m.ricettario.set(id, { a, b, nome: String(nome) });
}

/** Ricostruisce il mondo da una fotografia; null se non è una fotografia valida. */
export function ripristina(dati: unknown): Mondo | null {
  try {
    const d = dati as Salvato;
    if (!d || (d.v !== 1 && d.v !== 2) || !(d.w > 0) || !(d.h > 0) || d.w * d.h > 400000) return null;
    const m = new Mondo(d.w, d.h, (Date.now() & 0x7fffffff) || 1);
    if (!daTesto(d.tipo, m.tipo) || !daTesto(d.dato, m.dato) || !daTesto(d.tinta, m.tinta)) return null;
    if (Array.isArray(d.ricette)) ricopiaRicette(m, d.ricette);
    if (Array.isArray(d.posti)) for (const [t, id] of d.posti) m.occupa(t, id);
    // Una cella che contiene un numero senza significato (un posto di miscela rimasto vuoto) torna vuota.
    for (let i = 0; i < m.tipo.length; i++) {
      const t = m.tipo[i];
      if (t >= N_BASE && m.idTipo[t] === 0) m.tipo[i] = 0;
    }
    for (const id of d.visti) m.visti.add(id);
    m.omini = Array.isArray(d.omini) ? d.omini.filter((o) => m.dentro(o.x, o.y)).map((o) => ({ ...o })) : [];
    m.tic = d.tic | 0;
    return m;
  } catch {
    return null;
  }
}

/** Quello che la pagina aveva chiesto di ricordare insieme alla partita. */
export function extraDi(dati: unknown): unknown {
  return dati && typeof dati === 'object' ? (dati as Salvato).extra : undefined;
}

export function impacchetta(m: Mondo, extra?: unknown): string {
  return JSON.stringify(fotografa(m, extra));
}

/** Ricostruisce il mondo da un testo salvato; null se il testo non è un salvataggio valido. */
export function spacchetta(testo: string): Mondo | null {
  try {
    return ripristina(JSON.parse(testo));
  } catch {
    return null;
  }
}

export function salva(m: Mondo, extra?: unknown): void {
  try {
    localStorage.setItem(CHIAVE, impacchetta(m, extra));
  } catch {
    // Spazio finito o salvataggio vietato dal browser: si gioca lo stesso, senza ricordare.
  }
}

/** La fotografia salvata nel browser, se c'è. */
export function carica(): unknown {
  try {
    const testo = localStorage.getItem(CHIAVE);
    return testo ? JSON.parse(testo) : null;
  } catch {
    return null;
  }
}
