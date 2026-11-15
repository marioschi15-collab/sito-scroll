import type { Incantesimo } from '../gioco.js';
import { crescita } from './crescita.js';
import { esplosione } from './esplosione.js';
import { fulmine } from './fulmine.js';
import { fuoco } from './fuoco.js';
import { gelo } from './gelo.js';
import { singolarita } from './singolarita.js';
import { tornado } from './tornado.js';

/** I sette incantesimi, nell'ordine in cui compaiono nella barra (tasti da 1 a 7). */
export const INCANTESIMI: readonly Incantesimo[] = [fuoco, gelo, esplosione, singolarita, tornado, crescita, fulmine];
