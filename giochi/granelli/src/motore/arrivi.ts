import { piedi, posto, siArriva } from './cammino.js';
import { OSPITA } from './cose.js';
import { M } from './materiali.js';
import type { Mondo } from './mondo.js';

/** Cosa serve al mondo perché arrivino i primi omini (in celle). */
export const SERVE = { acqua: 120, piante: 50, riparo: 30 };
/** A quante celle da dove si beve arrivano, al meno e al più: vicino all'acqua, ma all'asciutto. */
const VICINO = 3;
const LONTANO = 10;
/** A quante celle l'uno dall'altro arrivano i due omini, in ordine di preferenza. */
const COMPAGNO = [3, -3, 4, -4, 5, -5];

/**
 * Un buon punto d'arrivo nella colonna x: all'asciutto, con lo spazio per stare in piedi, a pochi passi da dove
 * si beve (acqua o pozzo), e da cui a bere ci si arriva davvero a piedi. Restituisce la riga dei piedi, o -1.
 */
function approdo(m: Mondo, x: number): number {
  if (x < 0 || x >= m.w) return -1;
  const fonte = m.fonti.bere(x);
  if (fonte < 0) return -1;
  const distanza = Math.abs(fonte - x);
  if (distanza < VICINO || distanza > LONTANO) return -1;
  const y = piedi(m, x);
  if (!posto(m, x, y) || m.leggi(x, y + 1) === M.ACQUA) return -1;
  return siArriva(m, x, y, fonte, 2) ? y : -1;
}

/** Dove arrivano due omini: i piedi del primo e del secondo. */
export interface Approdo {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

/** Due punti d'arrivo vicini, il primo nella colonna x e il secondo a 3-5 celle da lui; null se lì non ci sono. */
function inDue(m: Mondo, x: number): Approdo | null {
  const y = approdo(m, x);
  if (y < 0) return null;
  for (const passi of COMPAGNO) {
    const y2 = approdo(m, x + passi);
    if (y2 >= 0) return { x, y, x2: x + passi, y2 };
  }
  return null;
}

/**
 * Il posto d'arrivo per due omini più vicino alla colonna x, entro `raggio` colonne: prima x stessa, poi una per
 * parte, e così via. Guarda le fonti come sono adesso: chi chiama le aggiorna, se il mondo è appena cambiato.
 */
export function cercaApprodo(m: Mondo, x: number, raggio: number): Approdo | null {
  for (let d = 0; d <= raggio; d++) {
    for (const lato of d === 0 ? [0] : [-1, 1]) {
      const dove = inDue(m, x + lato * d);
      if (dove) return dove;
    }
  }
  return null;
}

/** Fa arrivare due omini nel posto d'arrivo trovato, e mette in pausa gli arrivi da soli. */
function arrivano(m: Mondo, dove: Approdo): void {
  m.aggiungiOmino(dove.x, dove.y);
  m.aggiungiOmino(dove.x2, dove.y2);
  m.prossimoArrivo = m.tic + 1200;
}

/**
 * I primi omini chiamati da un'unione (un tetto e un frutto): arrivano in due, vicino all'acqua, nel posto buono
 * più vicino alla colonna x entro `raggio` colonne. In due perché un omino da solo non fa figli e non fa paese.
 * Restituisce dove sono arrivati, o null se lì intorno non c'è acqua a cui arrivare a piedi.
 */
export function primiOmini(m: Mondo, x: number, raggio: number): Approdo | null {
  // L'acqua appena versata deve contare subito: le fonti si ricalcolano adesso, non fra due secondi.
  m.fonti.aggiorna(m);
  const dove = cercaApprodo(m, x, raggio);
  if (dove) arrivano(m, dove);
  return dove;
}

/**
 * I primi omini arrivano da soli quando il mondo ha da bere, da mangiare e un riparo fatto dal giocatore
 * (pietra o mattoni: la roccia nuda del fondo non conta). Arrivano in due, vicino all'acqua e a qualche cella
 * l'uno dall'altro, in un punto da cui all'acqua (o al pozzo) si arriva a piedi: mai chiusi in un buco.
 */
export function arrivo(m: Mondo): void {
  if (m.omini.length > 0 || m.tic < m.prossimoArrivo) return;
  const c = m.conta;
  // Un riparo: pietra o mattoni messi dal giocatore, oppure un tetto vero (capanna, casa, castello).
  let riparo = c[M.PIETRA] + c[M.MATTONE];
  for (const cosa of m.cose) if (OSPITA[cosa.id]) riparo += 30;
  if (c[M.ACQUA] < SERVE.acqua || c[M.PIANTA] < SERVE.piante || riparo < SERVE.riparo) return;
  // Si parte da una colonna a caso e si scorre il mondo: ogni riva ha la sua occasione.
  const da = (m.caso() * m.w) | 0;
  for (let k = 0; k < m.w; k++) {
    const dove = inDue(m, (da + k) % m.w);
    if (dove) {
      arrivano(m, dove);
      return;
    }
  }
}
