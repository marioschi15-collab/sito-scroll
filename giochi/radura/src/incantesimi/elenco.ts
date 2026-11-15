import type { Incantesimo } from '../gioco.js';
import { crescita } from './crescita.js';
import { cristalli } from './cristalli.js';
import { esplosione } from './esplosione.js';
import { fulmine } from './fulmine.js';
import { fuoco } from './fuoco.js';
import { gelo } from './gelo.js';
import { levitazione } from './levitazione.js';
import { meteore } from './meteore.js';
import { presa } from './presa.js';
import { rammendo } from './rammendo.js';
import { singolarita } from './singolarita.js';
import { terremoto } from './terremoto.js';
import { tornado } from './tornado.js';

/** Gli incantesimi nell'ordine in cui compaiono nella barra: prima quelli che distruggono, poi quelli che giocano e riparano. */
export const INCANTESIMI: readonly Incantesimo[] = [
  fuoco, gelo, fulmine, esplosione, meteore, terremoto, tornado,
  singolarita, levitazione, presa, cristalli, crescita, rammendo,
];
