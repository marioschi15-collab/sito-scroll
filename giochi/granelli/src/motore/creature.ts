import { misuraDi, muoveDi } from '../contenuti/registro.js';
import { libera } from './cammino.js';
import { SCAPPA } from './cortesia.js';
import { LIQUIDO } from './materiali.js';
import type { Mondo } from './mondo.js';

/**
 * Le creature: animali che vivono da sé nel mondo (camminano, volano, nuotano, oppure stanno). Sono leggere apposta:
 * pensano una volta ogni quattro istanti e guardano poche celle intorno, così anche quaranta insieme non pesano su
 * un telefono lento. Sono bersagli come gli omini: portandoci sopra qualcosa si uniscono.
 */
export interface Creatura {
  /** Il numero della sua voce nel Libro. */
  id: number;
  /** La colonna del centro e la riga dei piedi (il fondo della figura). */
  x: number;
  y: number;
  dir: 1 | -1;
  /** Per quanti momenti resta ferma; per chi vola, -1 vuol dire che sta scendendo a posarsi. */
  fermo?: number;
  /** Da quanti momenti un pesce è fuori dall'acqua, o una creatura è coperta da qualcosa che le è caduto addosso. */
  guai?: number;
  /** Quello che mostra sopra la testa (vedi cortesia.ts) e fino a quando. */
  nuvoletta?: number;
  nuvolettaFino?: number;
}

/** Quante creature regge il mondo, al più. */
export const CREATURE_MAX = 40;
/** Ogni quanti istanti una creatura fa un passo e pensa (la caduta, invece, vale a ogni istante). */
const RITMO = 4;
/** Quanti momenti, al più, un pesce resiste fuori dall'acqua, e una creatura sotto la sabbia. */
const GUAI_MAX = 40;
/** Fin dove si cerca l'acqua per far nascere un pesce lì vicino (in celle). */
const ACQUA_VICINA = 4;
/** A che altezza da terra vola volentieri chi vola (in celle): né radente né tra le nuvole. */
const VOLO_BASSO = 5;
const VOLO_ALTO = 16;

/** Perché una creatura non può nascere lì: ce ne sono già troppe, oppure (per chi nuota) lì vicino non c'è acqua. */
export type NoCreatura = 'affollato' | 'senzAcqua';

const liquida = (m: Mondo, x: number, y: number): boolean => m.dentro(x, y) && m.stato[m.tipo[y * m.w + x]] === LIQUIDO;
/** Una cella in cui chi vola può stare: aria, erba, un tronco; non l'acqua né i solidi. */
const ariosa = (m: Mondo, x: number, y: number): boolean => libera(m, x, y) && !liquida(m, x, y);

const UNA_CELLA: readonly [number, number] = [1, 1];
/** Quanto è grande una creatura: [larghezza, altezza] in celle (una cella per chi non ha figura). */
export function misura(id: number): readonly [number, number] {
  return misuraDi(id) ?? UNA_CELLA;
}

/** Vero se la colonna x, dai piedi (riga y) per tutta l'altezza h, lascia passare chi cammina o vola. */
function colonnaLibera(m: Mondo, x: number, y: number, h: number, volo: boolean): boolean {
  for (let k = 0; k < h; k++) if (!(volo ? ariosa(m, x, y - k) : libera(m, x, y - k))) return false;
  return true;
}

/**
 * Fa nascere una creatura nel punto (x, y). Nel terreno non si nasce: si sale fino al primo posto libero (poi chi
 * cammina cade da sé). Chi nuota nasce nell'acqua più vicina, se ce n'è entro quattro celle.
 */
export function nasciCreatura(m: Mondo, id: number, x: number, y: number): Creatura | NoCreatura {
  if (m.creature.length >= CREATURE_MAX) return 'affollato';
  const [w, h] = misura(id);
  let cx = Math.max(w >> 1, Math.min(m.w - 1 - (w >> 1), x));
  let cy = Math.max(h, Math.min(m.h - 2, y));
  if (muoveDi(id) === 'nuota') {
    let trovata = false;
    for (let r = 0; r <= ACQUA_VICINA && !trovata; r++) {
      for (let dy = -r; dy <= r && !trovata; dy++) {
        for (let dx = -r; dx <= r && !trovata; dx++) {
          if (!liquida(m, cx + dx, cy + dy)) continue;
          cx += dx;
          cy += dy;
          trovata = true;
        }
      }
    }
    if (!trovata) return 'senzAcqua';
  } else {
    for (let su = 0; su < 12 && cy > h && !colonnaLibera(m, cx, cy, h, false); su++) cy--;
  }
  const c: Creatura = { id, x: cx, y: cy, dir: m.caso() < 0.5 ? -1 : 1 };
  m.creature.push(c);
  return c;
}

/** Un passo di lato (salendo un gradino, se serve); false se di lì non si passa. */
function passo(m: Mondo, c: Creatura, h: number, volo: boolean, gradino: number): boolean {
  const nx = c.x + c.dir;
  if (nx < 1 || nx >= m.w - 1) return false;
  for (let su = 0; su <= gradino; su++) {
    if (c.y - su - h < 0 || !colonnaLibera(m, nx, c.y - su, h, volo)) continue;
    // Chi cammina non entra nell'acqua fonda: una pozzanghera sì, ma dove sotto i piedi ci sono due celle d'acqua si gira.
    if (!volo && liquida(m, nx, c.y - su + 1) && liquida(m, nx, c.y - su + 2)) return false;
    c.x = nx;
    c.y -= su;
    return true;
  }
  return false;
}

function gira(c: Creatura): void {
  c.dir = c.dir === 1 ? -1 : 1;
}

/** Vero se la creatura tocca qualcosa che la uccide: il fuoco, la lava, la brace, l'acido. */
function scotta(m: Mondo, c: Creatura, h: number): boolean {
  for (let k = 0; k < h; k++) if (m.mortale[m.leggi(c.x, c.y - k)]) return true;
  return false;
}

function cammina(m: Mondo, c: Creatura, h: number, scappa: boolean): void {
  if (liquida(m, c.x, c.y - 1) && ariosa(m, c.x, c.y - h)) {
    // Finita in acqua: torna a galla.
    c.y--;
    return;
  }
  if (c.fermo && c.fermo > 0) {
    c.fermo--;
    return;
  }
  if (!scappa) {
    const dado = m.caso();
    if (dado < 0.03) gira(c);
    else if (dado < 0.06) {
      c.fermo = 5 + ((m.caso() * 20) | 0);
      return;
    }
  }
  if (!passo(m, c, h, false, 2)) gira(c);
}

function vola(m: Mondo, c: Creatura, h: number, scappa: boolean): void {
  const giu = ariosa(m, c.x, c.y + 1);
  if (c.fermo === -1) {
    // Scende a posarsi: quando tocca terra resta lì un po'.
    if (giu) c.y++;
    else c.fermo = 20 + ((m.caso() * 40) | 0);
    return;
  }
  if (c.fermo && c.fermo > 0) {
    if (--c.fermo === 0 && ariosa(m, c.x, c.y - h)) c.y--;
    return;
  }
  // Quanto è alta sopra il terreno (o sopra l'acqua) che ha sotto.
  let quota = 0;
  while (quota <= VOLO_ALTO && c.y + 1 + quota < m.h && ariosa(m, c.x, c.y + 1 + quota)) quota++;
  if (!scappa && m.caso() < 0.01) {
    c.fermo = -1;
    return;
  }
  if (quota < VOLO_BASSO && ariosa(m, c.x, c.y - h) && c.y - h > 1) c.y--;
  else if (quota > VOLO_ALTO && giu) c.y++;
  else if (m.caso() < 0.25) {
    const dy = m.caso() < 0.5 ? -1 : 1;
    if (c.y + dy - h > 1 && ariosa(m, c.x, dy < 0 ? c.y - h : c.y + 1)) c.y += dy;
  }
  if (!scappa && m.caso() < 0.02) gira(c);
  // Davanti a un muro prova a salirci sopra; se non può, torna indietro.
  if (!passo(m, c, h, true, 3)) gira(c);
}

function nuota(m: Mondo, c: Creatura): void {
  const nx = c.x + c.dir;
  if (m.caso() < 0.2) {
    const dy = m.caso() < 0.5 ? -1 : 1;
    if (liquida(m, c.x, c.y + dy) && liquida(m, nx, c.y + dy)) c.y += dy;
  }
  if (m.caso() < 0.02 || !liquida(m, nx, c.y) || nx < 1 || nx >= m.w - 1) gira(c);
  else c.x = nx;
}

/**
 * Un momento della vita di una creatura. Restituisce false se muore: nel fuoco o nella lava, un pesce rimasto
 * troppo a lungo fuori dall'acqua, chiunque resti sepolto.
 */
function vivi(m: Mondo, c: Creatura, pensa: boolean): boolean {
  const [, h] = misura(c.id);
  const come = muoveDi(c.id) ?? 'sta';
  const acqua = come === 'nuota';
  // La caduta vale a ogni istante: chi nuota cade solo fuori dall'acqua, chi vola solo mentre è posato o scende.
  const cade = acqua ? !liquida(m, c.x, c.y) : come !== 'vola' || (c.fermo !== undefined && c.fermo !== 0);
  if (cade && c.y < m.h - 2 && !liquida(m, c.x, c.y) && libera(m, c.x, c.y + 1)) c.y++;
  if (!pensa) return true;
  if (scotta(m, c, h)) return false;
  if (acqua) {
    c.guai = liquida(m, c.x, c.y) ? 0 : (c.guai ?? 0) + 1;
    if (c.guai > GUAI_MAX) return false;
  } else if (!libera(m, c.x, c.y)) {
    // Qualcosa le è caduto addosso: prova a tirarsi fuori salendo.
    if (colonnaLibera(m, c.x, c.y - 1, h, false)) c.y--;
    else if ((c.guai = (c.guai ?? 0) + 1) > GUAI_MAX) return false;
    return true;
  } else c.guai = 0;
  const scappa = c.nuvoletta === SCAPPA && (c.nuvolettaFino ?? 0) > m.tic;
  const volte = scappa ? 2 : 1;
  for (let k = 0; k < volte; k++) {
    if (come === 'cammina') cammina(m, c, h, scappa);
    else if (come === 'vola') vola(m, c, h, scappa);
    else if (acqua && liquida(m, c.x, c.y)) nuota(m, c);
  }
  return true;
}

/** Fa vivere tutte le creature un istante; quelle che muoiono lasciano uno sbuffo (in `Mondo.sparite`). */
export function aggiornaCreature(m: Mondo): void {
  const { creature } = m;
  if (creature.length === 0) return;
  const pensa = m.tic % RITMO === 0;
  let k = 0;
  for (const c of creature) {
    if (vivi(m, c, pensa)) creature[k++] = c;
    else m.sparite.push({ x: c.x, y: c.y - 1 });
  }
  creature.length = k;
}

/** Il quadrato della distanza tra il punto e il corpo di una creatura (il rettangolo della sua figura). */
export function distanzaDalCorpo(c: Creatura, x: number, y: number): number {
  const [w, h] = misura(c.id);
  const x0 = c.x - (w >> 1);
  const dx = x < x0 ? x0 - x : x > x0 + w - 1 ? x - x0 - w + 1 : 0;
  const dy = y < c.y - h + 1 ? c.y - h + 1 - y : y > c.y ? y - c.y : 0;
  return dx * dx + dy * dy;
}
