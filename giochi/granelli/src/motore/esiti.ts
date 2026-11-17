import { SCOPERTE } from '../scoperte.js';
import { chiaveCoppia, unione } from './cose.js';
import { N_BASE, OMINO, VILLAGGIO } from './materiali.js';
import { COPPIE, DEL_MESTOLO, RESTA } from './ricette.js';

/** Quello che `Mondo.unisci` risponde quando la coppia è la via di un fenomeno: succede solo nel mondo. */
export const SOLO_NEL_MONDO = -2;

/** Per ogni coppia (in qualsiasi ordine), il materiale che ne nasce secondo le regole scritte a mano. */
const MATERIA = new Map<number, number>();
/** Per ogni coppia, il fenomeno o il paesaggio di cui è la via: Unisci non lo regala, lo si vede solo nel mondo. */
const FENOMENO = new Map<number, number>();

/**
 * Le reazioni tra due celle che il Mestolo conosce: quelle di ricette.ts, più le vie a due ingredienti che il
 * Libro dà per un materiale (lì il primo ingrediente resta com'è e il secondo diventa la cosa nuova).
 * Chiave: primo * 256 + secondo.
 */
export const REAZIONI = new Map(DEL_MESTOLO);

for (const [a, b, primo, secondo, inUnisci] of COPPIE) {
  const esito = inUnisci ?? (primo > 0 ? primo : secondo);
  if (esito <= 0) continue;
  (esito < N_BASE ? MATERIA : FENOMENO).set(chiaveCoppia(a, b), esito);
}
for (const voce of SCOPERTE) {
  // Le invenzioni hanno la loro tavola (cose.ts) e le ere arrivano da sole: qui contano materiali, vita e fenomeni.
  if (voce.sezione === 'cose' || voce.sezione === 'ere') continue;
  for (const via of voce.nasce) {
    if (via.con.length !== 2 || via.con[0] === via.con[1]) continue;
    const [a, b] = via.con;
    const chiave = chiaveCoppia(a, b);
    if (MATERIA.has(chiave) || FENOMENO.has(chiave)) continue;
    if (voce.id >= N_BASE) {
      FENOMENO.set(chiave, voce.id);
      continue;
    }
    MATERIA.set(chiave, voce.id);
    if (a < N_BASE && b < N_BASE && !REAZIONI.has(a * 256 + b)) {
      REAZIONI.set(a * 256 + b, [RESTA, voce.id]);
      REAZIONI.set(b * 256 + a, [voce.id, RESTA]);
    }
  }
}

/**
 * Il materiale (o la cosa viva) che nasce da due scoperte secondo le reazioni del mondo: terra e acqua fanno
 * fango, in Unisci come sotto il Mestolo. -1 se per quella coppia non c'è niente di scritto.
 */
export function esitoNoto(a: number, b: number): number {
  return MATERIA.get(chiaveCoppia(a, b)) ?? -1;
}

/** Il fenomeno di cui la coppia è la via (un'esplosione, un temporale…); -1 se non lo è di nessuno. */
export function fenomenoDi(a: number, b: number): number {
  return FENOMENO.get(chiaveCoppia(a, b)) ?? -1;
}

/** Vero se la coppia ha già un esito scritto a mano (invenzione, reazione del mondo o fenomeno): non dà mai una miscela. */
export function coppiaDAutore(a: number, b: number): boolean {
  if (unione(a, b) >= 0) return true;
  const chiave = chiaveCoppia(a, b);
  return MATERIA.has(chiave) || FENOMENO.has(chiave) || (a < 256 && b < 256 && REAZIONI.has(a * 256 + b));
}

const INVENZIONI = new Set(SCOPERTE.filter((s) => s.sezione === 'cose').map((s) => s.id));

/** Una scoperta d'autore che in Unisci si può unire ad altro: i materiali, le invenzioni, gli omini e il villaggio. */
export function siUnisce(id: number): boolean {
  return (id > 0 && id < N_BASE) || id === OMINO || id === VILLAGGIO || INVENZIONI.has(id);
}

/**
 * Una coppia da suggerire a chi apre Unisci, fatta solo di cose che possiede davvero: per prima una che porta a
 * una scoperta nuova, altrimenti una che dà qualcosa di già noto. null se non c'è niente di scritto da suggerire.
 */
export function coppiaDEsempio(visti: ReadonlySet<number>): [number, number] | null {
  const miei: number[] = [];
  for (const id of visti) if (siUnisce(id)) miei.push(id);
  let nota: [number, number] | null = null;
  for (let i = 0; i < miei.length; i++) {
    for (let j = i + 1; j < miei.length; j++) {
      let esito = unione(miei[i], miei[j]);
      if (esito < 0) esito = esitoNoto(miei[i], miei[j]);
      if (esito < 0) continue;
      if (!visti.has(esito)) return [miei[i], miei[j]];
      nota ??= [miei[i], miei[j]];
    }
  }
  return nota;
}
