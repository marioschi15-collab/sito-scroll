import { M, N_BASE, type Sostanza } from '../src/motore/materiali.js';
import { Mondo } from '../src/motore/mondo.js';
import { INIZIALI } from '../src/scoperte.js';

/** Un mondo piccolo e vuoto, con i quattro elementi già noti e un seme fisso: ogni prova rifà sempre la stessa storia. */
export function mondo(w = 60, h = 60, seme = 7): Mondo {
  const m = new Mondo(w, h, seme);
  for (const t of INIZIALI) m.visti.add(t);
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
