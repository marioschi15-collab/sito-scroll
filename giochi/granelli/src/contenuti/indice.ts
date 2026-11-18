import { BOTTEGA } from './bottega.js';
import { CAMPAGNA } from './campagna.js';
import { CIELO } from './cielo.js';
import { CITTA } from './citta.js';
import { MACCHINE } from './macchine.js';
import { MODERNO } from './moderno.js';
import { NATURA } from './natura.js';
import { PAESE } from './paese.js';
import type { Scheda } from './scheda.js';

/**
 * I file delle schede, per nome. Un file nuovo si importa qui e si aggiunge alla tavola; il nome è quello che si
 * passa a `node strumenti/contenuti.cjs --file <nome>` per controllarlo da solo.
 * I sei file della grande infornata (P8) ci sono già, anche da vuoti: così chi li scrive tocca solo il suo.
 */
export const FILE: Readonly<Record<string, readonly Scheda[]>> = {
  paese: PAESE,
  campagna: CAMPAGNA,
  natura: NATURA,
  bottega: BOTTEGA,
  citta: CITTA,
  macchine: MACCHINE,
  moderno: MODERNO,
  cielo: CIELO,
};
