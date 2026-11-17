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
    const x = (da + k) % m.w;
    const y = approdo(m, x);
    if (y < 0) continue;
    for (const passi of COMPAGNO) {
      const y2 = approdo(m, x + passi);
      if (y2 < 0) continue;
      m.aggiungiOmino(x, y);
      m.aggiungiOmino(x + passi, y2);
      m.prossimoArrivo = m.tic + 1200;
      return;
    }
  }
}
