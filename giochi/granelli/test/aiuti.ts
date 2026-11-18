import { ALBA, ARCOBALENO, FIORE, FORESTA, LAGO, LUCCIOLE, M, N_BASE, NOTTE, PIOGGIA, type Sostanza, TRONCO } from '../src/motore/materiali.js';
import { Mondo } from '../src/motore/mondo.js';
import type { Causa } from '../src/motore/omini.js';
import { terreno } from '../src/motore/terreno.js';
import { INIZIALI } from '../src/contenuti/registro.js';

/** Un mondo piccolo e vuoto, con i quattro elementi già noti e un seme fisso: ogni prova rifà sempre la stessa storia. */
export function mondo(w = 60, h = 60, seme = 7): Mondo {
  const m = new Mondo(w, h, seme);
  for (const t of INIZIALI) m.visti.add(t);
  return m;
}
/**
 * Porta il Libro a dodici voci aggiungendo fenomeni che non entrano in nessuna unione (notte, alba, lago…): da lì
 * in poi due sostanze senza esito scritto si mescolano. Le prove che creano miscele partono da qui.
 */
export function libroDa12(m: Mondo = mondo()): Mondo {
  for (const id of [NOTTE, ALBA, PIOGGIA, ARCOBALENO, LAGO, FIORE, LUCCIOLE, FORESTA]) {
    if (m.voci() >= 12) break;
    m.visti.add(id);
  }
  return m;
}
export function riempi(m: Mondo, x0: number, y0: number, x1: number, y1: number, t: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.metti(y * m.w + x, t);
}
export function gira(m: Mondo, n: number): void {
  for (let i = 0; i < n; i++) m.passo();
}
export function quanti(m: Mondo, t: number): number {
  let n = 0;
  for (const v of m.tipo) if (v === t) n++;
  return n;
}
/** Versa un materiale per un po', come farebbe un dito tenuto premuto. */
export function versaPer(m: Mondo, x: number, y: number, t: number, tic: number, raggio = 3): void {
  for (let i = 0; i < tic; i++) {
    m.versa(x, y, raggio, t);
    m.passo();
  }
}

/** Una conca di roccia: il fondo dalla riga `fondo` in giù e due pareti ai bordi, alte fino alla riga `orlo`. */
export function conca(m: Mondo, fondo: number, orlo: number): void {
  riempi(m, 0, fondo, m.w - 1, m.h - 1, M.ROCCIA);
  riempi(m, 0, orlo, 0, fondo, M.ROCCIA);
  riempi(m, m.w - 1, orlo, m.w - 1, fondo, M.ROCCIA);
}

/** Tutta l'acqua che c'è nel mondo, in qualunque forma stia girando: acqua, vapore e nuvole. */
export function acquaInGiro(m: Mondo): number {
  return quanti(m, M.ACQUA) + quanti(m, M.VAPORE) + quanti(m, M.NUVOLA);
}

/** Conta i fulmini che il cielo scarica da qui in poi (quelli lanciati dalla prova stessa compresi). */
export function contaFulmini(m: Mondo): () => number {
  let n = 0;
  const vero = m.fulmine.bind(m);
  m.fulmine = (x: number, y: number): void => {
    n++;
    vero(x, y);
  };
  return () => n;
}

/** Conta i tiri di dado del mondo da qui in poi: dove non può succedere niente, il mondo non deve tirarne. */
export function contaTiri(m: Mondo): () => number {
  let n = 0;
  const vero = m.caso.bind(m);
  m.caso = (): number => {
    n++;
    return vero();
  };
  return () => n;
}

export interface Miscela {
  id: number;
  a: number;
  b: number;
  s: Sostanza;
}

/** Tutte le miscele che nascono fondendo due materiali scritti a mano, con il loro carattere. */
export function primaGenerazione(m: Mondo): Miscela[] {
  const tutte: Miscela[] = [];
  for (let a = 1; a < N_BASE; a++) {
    for (let b = a + 1; b < N_BASE; b++) {
      const id = m.registra(a, b);
      if (id >= 0) tutte.push({ id, a, b, s: m.sostanzaDi(id)! });
    }
  }
  return tutte;
}

// ── Mondi veri: grandi come quello del gioco, con il suo terreno ─────────────────

/** Quanti istanti dura un giorno del mondo (lo stesso numero di src/motore/tempo.ts). */
export const GIORNO = 14400;

/** Un mondo grande come quello del gioco (420 x 190), con il suo fondo di roccia: colline, conca e pianoro. */
export function mondoVero(seme: number): Mondo {
  const m = mondo(420, 190, seme);
  terreno(m);
  return m;
}

/** Riempie d'acqua il punto più basso del mondo fino a `fondo` celle di profondità: dice da che colonna a che colonna arriva il lago, e a che riga sta il pelo. */
export function lago(m: Mondo, fondo: number): { x0: number; x1: number; pelo: number } {
  let giu = 0;
  for (let x = 0; x < m.w; x++) if (m.suolo(x) > m.suolo(giu)) giu = x;
  const pelo = m.suolo(giu) - fondo;
  let x0 = giu;
  let x1 = giu;
  while (x0 > 0 && m.suolo(x0 - 1) > pelo) x0--;
  while (x1 < m.w - 1 && m.suolo(x1 + 1) > pelo) x1++;
  for (let x = x0; x <= x1; x++) {
    const fondale = m.suolo(x);
    for (let y = pelo; y < fondale; y++) m.metti(y * m.w + x, M.ACQUA);
  }
  return { x0, x1, pelo };
}

/** Copre la roccia nuda, da una colonna all'altra, con due celle di terriccio e un filo d'erba ogni due colonne. */
export function prato(m: Mondo, x0: number, x1: number): void {
  for (let x = Math.max(0, x0); x <= Math.min(m.w - 1, x1); x++) {
    const cima = m.suolo(x);
    if (m.leggi(x, cima) !== M.ROCCIA) continue;
    m.metti((cima - 1) * m.w + x, M.HUMUS);
    m.metti((cima - 2) * m.w + x, M.HUMUS);
    if (x % 2 === 0) m.metti((cima - 3) * m.w + x, M.PIANTA, 0);
  }
}

/** Un albero cresciuto, come quelli che il mondo fa da sé: un tronco alto `alto` celle sopra il suolo e la sua chioma. */
export function albero(m: Mondo, x: number, alto: number): void {
  const piede = m.suolo(x) - 1;
  for (let k = 0; k < alto; k++) m.metti((piede - k) * m.w + x, M.LEGNO, TRONCO);
  for (let dy = -2; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const i = (piede - alto + dy) * m.w + x + dx;
      if (m.dentro(x + dx, piede - alto + dy) && m.tipo[i] === M.VUOTO) m.metti(i, M.PIANTA, 0);
    }
  }
}

/** Tiene il conto di nascite e morti (per causa) mentre il mondo gira: va chiamato ogni tanto, svuota la coda del mondo. */
export class Anagrafe {
  nati = 0;
  readonly morti: Partial<Record<Causa, number>> = {};

  leggi(m: Mondo): void {
    for (const f of m.fatti) {
      if (f.cosa === 'nato') this.nati++;
      else this.morti[f.causa] = (this.morti[f.causa] ?? 0) + 1;
    }
    m.fatti.length = 0;
  }

  /** Fa girare il mondo per `tic` istanti, leggendo la coda ogni mille. */
  gira(m: Mondo, tic: number): void {
    for (let fatti = 0; fatti < tic; fatti += 1000) {
      gira(m, Math.min(1000, tic - fatti));
      this.leggi(m);
    }
  }
}
