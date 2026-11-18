import { ingombroDi } from './contenuti/registro.js';
import { type Cosa, OSPITA } from './motore/cose.js';
import { M, N_BASE, N_TIPI, PRIMA_MISCELA, TRONCO } from './motore/materiali.js';
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
  /** Le invenzioni posate nel mondo (il numero d'ordine `n` manca nelle partite salvate prima che esistesse). */
  cose?: { id: number; x: number; y: number; n?: number }[];
  /** 1 se i tronchi degli alberi sono già segnati nel `dato` del legno (vedi TRONCO): nelle partite più vecchie no. */
  tronchi?: 1;
  /** Il tempo che fa: da che parte tira il vento, quanto ha piovuto di recente, quanto si vede l'arcobaleno. */
  vento?: number;
  pioggia?: number;
  arcobaleno?: number;
  /** Le coppie già provate unendo (solo che sono state provate: l'esito si ricalcola). Le partite di prima non le hanno. */
  provate?: [number, number][];
  /** L'istante prima del quale gli omini non (ri)compaiono. */
  prossimoArrivo?: number;
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

/** Un numero vero, finito e non negativo (in un salvataggio può esserci scritto di tutto). */
function numeroBuono(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
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
    cose: m.cose.map((c) => ({ ...c })),
    tronchi: 1,
    vento: m.vento,
    pioggia: m.pioggia,
    arcobaleno: m.arcobaleno,
    prossimoArrivo: m.prossimoArrivo,
    provate: [...m.provate].map((k) => k.split(':').map(Number) as [number, number]),
    extra,
  };
}

/** Ricopia in un mondo le miscele conosciute (nell'ordine in cui sono nate: i genitori vengono prima dei figli). */
export function ricopiaRicette(m: Mondo, ricette: readonly (readonly [number, number, number, string])[]): void {
  for (const [id, a, b, nome] of ricette) m.ricettario.set(id, { a, b, nome: String(nome) });
}

/**
 * Nelle partite salvate quando ogni legno era un muro, riconosce i tronchi degli alberi (legno largo una cella sola:
 * col dito non si riesce a versarne di così sottile) e li segna, così gli omini di quel mondo non restano chiusi.
 */
function segnaTronchi(m: Mondo): void {
  const { tipo, dato, w } = m;
  for (let i = 0; i < tipo.length; i++) {
    if (tipo[i] !== M.LEGNO) continue;
    const x = i % w;
    if ((x > 0 && tipo[i - 1] === M.LEGNO) || (x < w - 1 && tipo[i + 1] === M.LEGNO)) continue;
    dato[i] = TRONCO;
  }
}

/** Le cose posate di una fotografia, ognuna con il suo numero d'ordine; e se i numeri mancavano, quelli nuovi. */
function cosePosate(d: Salvato, m: Mondo): { cose: Cosa[]; rinumerate: boolean } {
  const buone = (d.cose ?? []).filter((c) => ingombroDi(c.id) !== undefined && m.dentro(c.x, c.y));
  const numeri = new Set(buone.map((c) => c.n));
  const rinumerate = numeri.size !== buone.length || buone.some((c) => !Number.isInteger(c.n) || (c.n as number) < 1);
  return { cose: buone.map((c, k) => ({ id: c.id, x: c.x, y: c.y, n: rinumerate ? k + 1 : (c.n as number) })), rinumerate };
}

/** Un omino di una fotografia, senza i ricordi che non hanno senso in questo mondo (colonne che non esistono). */
function ominoPulito(o: Omino, m: Mondo): Omino {
  const copia = { ...o };
  for (const campo of ['casa', 'bevuta', 'pasto'] as const) {
    const v = copia[campo];
    if (numeroBuono(v) && v < m.w) copia[campo] = Math.floor(v);
    else delete copia[campo];
  }
  if (typeof copia.chiusa !== 'number' || !Number.isFinite(copia.chiusa)) delete copia.chiusa;
  return copia;
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
    if (d.tronchi !== 1) segnaTronchi(m);
    m.omini = Array.isArray(d.omini) ? d.omini.filter((o) => m.dentro(o.x, o.y)).map((o) => ominoPulito(o, m)) : [];
    if (Array.isArray(d.cose)) {
      const { cose, rinumerate } = cosePosate(d, m);
      m.cose = cose;
      // Una volta chi dormiva in casa ricordava la colonna della casa più uno: ora ricorda il suo numero d'ordine.
      if (rinumerate) {
        for (const o of m.omini) {
          if (o.dentro) o.dentro = cose.find((c) => OSPITA[c.id] && c.x + 1 === o.dentro)?.n ?? 0;
        }
      }
    }
    m.tic = d.tic | 0;
    // Il tempo che fa e l'attesa degli omini: i salvataggi di prima non li hanno, e allora valgono quelli di un mondo nuovo.
    if (d.vento === 1 || d.vento === -1) m.vento = d.vento;
    if (numeroBuono(d.pioggia)) m.pioggia = d.pioggia;
    if (numeroBuono(d.arcobaleno)) m.arcobaleno = Math.min(1, d.arcobaleno);
    if (numeroBuono(d.prossimoArrivo)) m.prossimoArrivo = Math.floor(d.prossimoArrivo);
    if (Array.isArray(d.provate)) {
      for (const p of d.provate as unknown[]) {
        if (Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) m.ricordaProvata(p[0], p[1]);
      }
    }
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
