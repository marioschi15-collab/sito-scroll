import { effettoDi } from '../contenuti/registro.js';
import type { Effetto } from '../contenuti/scheda.js';
import { GAS, LIQUIDO, M, POLVERE } from './materiali.js';
import type { Mondo } from './mondo.js';

/**
 * Gli eventi portati nel mondo: un acquazzone, una bufera, un colpo di vento… accadono lì, per qualche secondo, con
 * uno dei sei effetti pronti, fatti tutti con quello che il mondo sa già fare (gocce d'acqua, fiocchi di neve,
 * fulmini, granelli che scivolano). Poi finiscono da soli. Non si salvano: durano troppo poco.
 */
export interface Evento {
  /** Il numero della sua voce nel Libro. */
  id: number;
  effetto: Effetto;
  /** Dove accade (in celle). */
  x: number;
  y: number;
  /** L'istante in cui finisce. */
  fine: number;
  /** Da che parte soffia (per il vento). */
  dir: 1 | -1;
}

/** Quanti istanti dura un evento (cinque secondi). */
export const DURATA_EVENTO = 300;
/** Quanti eventi, al più, accadono insieme: il quarto fa finire il più vecchio. */
const EVENTI_MAX = 3;
/** Quanto è largo il posto in cui accade, attorno al punto (in celle). */
export const RAGGIO_EVENTO = 14;
/** Da quante celle sopra il punto cadono pioggia e neve: dal cielo, non dal dito. */
const DAL_CIELO = 28;
/** Ogni quanti istanti cade un fulmine, durante i lampi. */
const OGNI_LAMPO = 50;

/** Ciò che il vento solleva e spinge: i gas e le polveri leggere. */
const LEGGERO = new Set<number>([M.SABBIA, M.CENERE, M.NEVE]);

/** Fa accadere l'evento `id` nel punto (x, y). Falso se `id` non è un evento. */
export function accadi(m: Mondo, id: number, x: number, y: number): boolean {
  const effetto = effettoDi(id);
  if (!effetto) return false;
  if (m.eventi.length >= EVENTI_MAX) m.eventi.shift();
  const e: Evento = { id, effetto, x: Math.max(0, Math.min(m.w - 1, x)), y: Math.max(0, Math.min(m.h - 1, y)), fine: m.tic + DURATA_EVENTO, dir: m.caso() < 0.5 ? -1 : 1 };
  m.eventi.push(e);
  if (effetto === 'lampi') m.fulmine(e.x, Math.max(0, e.y - DAL_CIELO));
  if (effetto === 'vento') m.vento = e.dir;
  return true;
}

/** Una colonna a caso nel posto dell'evento. */
const colonna = (m: Mondo, e: Evento): number => Math.max(1, Math.min(m.w - 2, e.x + Math.round((m.caso() * 2 - 1) * RAGGIO_EVENTO)));
/** Una riga a caso nel posto dell'evento (un po' più in alto che in basso: il cielo sopra il punto conta). */
const riga = (m: Mondo, e: Evento): number => Math.max(1, Math.min(m.h - 2, e.y + Math.round((m.caso() * 1.5 - 1) * RAGGIO_EVENTO)));

/** Gocce (o fiocchi) che cadono dal cielo sopra il punto, nelle celle vuote. */
function cade(m: Mondo, e: Evento, t: number): void {
  const cima = Math.max(1, e.y - DAL_CIELO);
  for (let k = 0; k < 2; k++) {
    const x = colonna(m, e);
    const y = cima + ((m.caso() * 4) | 0);
    const i = y * m.w + x;
    if (m.tipo[i] === M.VUOTO) m.metti(i, t);
  }
}

/** Il vento: spinge di lato i gas e le polveri leggere, e lascia qualche soffio d'aria. */
function soffia(m: Mondo, e: Evento): void {
  for (let k = 0; k < 14; k++) {
    const i = riga(m, e) * m.w + colonna(m, e);
    const t = m.tipo[i];
    if (m.stato[t] !== GAS && !LEGGERO.has(t)) continue;
    if (m.tipo[i + e.dir] === M.VUOTO) m.sposta(i, i + e.dir);
  }
  const i = riga(m, e) * m.w + colonna(m, e);
  if (m.tipo[i] === M.VUOTO) m.metti(i, M.ARIA);
}

/** La scossa: le polveri e i liquidi scivolano di lato, i frutti e i funghi cadono dai rami. */
function scuoti(m: Mondo, e: Evento): void {
  for (let k = 0; k < 24; k++) {
    const i = riga(m, e) * m.w + colonna(m, e);
    const t = m.tipo[i];
    const sciolto = m.stato[t] === POLVERE || m.stato[t] === LIQUIDO;
    if (!sciolto && t !== M.FRUTTO && t !== M.FUNGO) continue;
    const giu = i + m.w;
    if (m.tipo[giu] === M.VUOTO) m.sposta(i, giu);
    else {
      const d = m.caso() < 0.5 ? -1 : 1;
      if (m.tipo[i + d] === M.VUOTO) m.sposta(i, i + d);
    }
  }
}

/** La luce: scioglie la neve e il ghiaccio che tocca (e chi disegna fa brillare il posto). */
function scalda(m: Mondo, e: Evento): void {
  for (let k = 0; k < 10; k++) {
    const i = riga(m, e) * m.w + colonna(m, e);
    const t = m.tipo[i];
    if ((t === M.NEVE || t === M.GHIACCIO) && m.caso() < 0.5) m.trasforma(i, M.ACQUA);
  }
}

/** Fa andare avanti di un istante gli eventi che stanno accadendo; quelli finiti se ne vanno. */
export function aggiornaEventi(m: Mondo): void {
  const { eventi } = m;
  let k = 0;
  for (const e of eventi) {
    if (e.fine <= m.tic) continue;
    eventi[k++] = e;
    switch (e.effetto) {
      case 'pioggia':
        cade(m, e, M.ACQUA);
        break;
      case 'neve':
        cade(m, e, M.NEVE);
        break;
      case 'vento':
        soffia(m, e);
        break;
      case 'lampi':
        if ((e.fine - m.tic) % OGNI_LAMPO === 0) m.fulmine(colonna(m, e), Math.max(0, e.y - DAL_CIELO));
        break;
      case 'scossa':
        if ((m.tic & 1) === 0) scuoti(m, e);
        break;
      case 'luce':
        if (m.tic % 3 === 0) scalda(m, e);
        break;
    }
  }
  eventi.length = k;
}

/** Vero se nel mondo sta accadendo un evento con questo effetto (chi disegna fa tremare la vista durante la scossa). */
export function accade(m: Mondo, effetto: Effetto): boolean {
  for (const e of m.eventi) if (e.effetto === effetto) return true;
  return false;
}
