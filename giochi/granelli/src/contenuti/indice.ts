import { CAMPAGNA } from './campagna.js';
import { PAESE } from './paese.js';
import type { Scheda } from './scheda.js';

/**
 * I file delle schede, per nome. Un file nuovo si importa qui e si aggiunge alla tavola; il nome è quello che si
 * passa a `node strumenti/contenuti.cjs --file <nome>` per controllarlo da solo.
 */
export const FILE: Readonly<Record<string, readonly Scheda[]>> = {
  paese: PAESE,
  campagna: CAMPAGNA,
};
