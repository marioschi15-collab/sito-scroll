import { eIngrediente, eRisultato, unioneDi, viaDiFenomeno } from '../contenuti/registro.js';
import { VOCI_DI_PRIMA } from '../scoperte.js';
import { UNIONI_DI_PRIMA, chiaveCoppia } from './cose.js';
import { BASE, N_BASE, OMINO, PRIMA_ID_MISCELA, VILLAGGIO } from './materiali.js';
import { idMiscela } from './miscele.js';
import { CELLA_PER_CELLA, COPPIE, RESTA } from './ricette.js';

/** Quello che `Mondo.unisci` risponde quando la coppia è la via di un fenomeno: succede solo nel mondo. */
export const SOLO_NEL_MONDO = -2;

/** Per ogni coppia (in qualsiasi ordine), il materiale che ne nasce secondo le regole scritte a mano. */
const MATERIA = new Map<number, number>();
/** Per ogni coppia, il fenomeno o il paesaggio di cui è la via: Unisci non lo regala, lo si vede solo nel mondo. */
const FENOMENO = new Map<number, number>();

/**
 * Le reazioni tra due celle che si toccano quando si porta una cosa sopra un'altra: quelle di ricette.ts, più le
 * vie a due ingredienti che il Libro dà per un materiale (lì il primo ingrediente resta com'è e il secondo diventa
 * la cosa nuova). Chiave: primo * 256 + secondo.
 */
export const REAZIONI = new Map(CELLA_PER_CELLA);

for (const [a, b, primo, secondo, inUnisci] of COPPIE) {
  const esito = inUnisci ?? (primo > 0 ? primo : secondo);
  if (esito <= 0) continue;
  (esito < N_BASE ? MATERIA : FENOMENO).set(chiaveCoppia(a, b), esito);
}
/** Ciò che nasce da un'unione scritta prima delle schede (le schede hanno le loro unioni, nel registro). */
const NATI_DA_UNIONE = new Set(UNIONI_DI_PRIMA.map(([, , r]) => r));
// Queste tavole si fanno con le sole voci di prima: le schede non inventano materiali, e le vie dei loro fenomeni
// le dà il registro (`viaDiFenomeno`), che si legge solo quando serve e mai al caricamento di questo modulo.
for (const voce of VOCI_DI_PRIMA) {
  // Le invenzioni hanno la loro tavola (cose.ts) e le ere arrivano da sole: qui contano materiali, vita e fenomeni.
  // Anche ciò che nasce da un'unione scritta (l'omino che arriva alla capanna) ha già la sua tavola: le sue vie non
  // sono quelle di un fenomeno da guardare nel mondo.
  if (voce.sezione === 'cose' || voce.sezione === 'ere' || NATI_DA_UNIONE.has(voce.id)) continue;
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
 * fango, in Unisci come nel mondo. -1 se per quella coppia non c'è niente di scritto.
 */
export function esitoNoto(a: number, b: number): number {
  return MATERIA.get(chiaveCoppia(a, b)) ?? -1;
}

/**
 * Le coppie che hanno un esito nelle tavole di questo modulo (reazioni del mondo e vie dei fenomeni di prima), come
 * [a, b]: servono ai suggerimenti, che vogliono sapere quali coppie scritte esistono. L'esito resta di `esitoDi`.
 */
export function coppieDelMondo(): [number, number][] {
  const coppie: [number, number][] = [];
  for (const chiave of [...MATERIA.keys(), ...FENOMENO.keys()]) coppie.push([Math.floor(chiave / 65536), chiave % 65536]);
  return coppie;
}

/** Il fenomeno di cui la coppia è la via (un'esplosione, un temporale…); -1 se non lo è di nessuno. */
export function fenomenoDi(a: number, b: number): number {
  return FENOMENO.get(chiaveCoppia(a, b)) ?? viaDiFenomeno(a, b);
}

/** Vero se la coppia ha già un esito scritto a mano (invenzione, reazione del mondo o fenomeno): non dà mai una miscela. */
export function coppiaDAutore(a: number, b: number): boolean {
  if (unioneDi(a, b) >= 0 || viaDiFenomeno(a, b) >= 0) return true;
  const chiave = chiaveCoppia(a, b);
  return MATERIA.has(chiave) || FENOMENO.has(chiave) || (a < 256 && b < 256 && REAZIONI.has(a * 256 + b));
}

/**
 * Da quante voci del Libro trovate (i quattro elementi compresi) due sostanze senza un esito scritto si mescolano.
 * Prima, la coppia non dà niente «per ora»: i primi minuti sono per le cose che il Libro racconta, non per le miscele.
 */
export const SOGLIA_MISCELE = 12;

/** Che cosa dà una coppia, deciso una volta sola per Unisci, per la tavolozza e per il mondo. */
export type Esito =
  /** Un'unione scritta a mano (invenzioni, e quello che verrà): `id` è ciò che nasce. */
  | { genere: 'unione'; id: number }
  /** Una reazione del mondo tra due materiali (terra e acqua: fango). */
  | { genere: 'materia'; id: number }
  /** La via di un fenomeno: non si regala, va visto nel mondo. `id` è il fenomeno. */
  | { genere: 'fenomeno'; id: number }
  /** Due sostanze senza esito scritto: la loro miscela, con il suo numero (non ancora registrata). */
  | { genere: 'miscela'; id: number }
  /** Niente. `perOra` se sarebbe una miscela ma il Libro è ancora troppo vuoto: quella coppia non va ricordata. */
  | { genere: 'niente'; id: -1; perOra?: true };

const NIENTE: Esito = { genere: 'niente', id: -1 };
const PER_ORA: Esito = { genere: 'niente', id: -1, perOra: true };

/** Vero per ciò che ha un carattere di sostanza e si può fondere: i materiali scritti a mano (non roccia e brace) e le miscele. */
function sostanza(id: number): boolean {
  return id >= PRIMA_ID_MISCELA || (id > 0 && id < N_BASE && BASE[id] !== null);
}

/**
 * L'esito di una coppia, sempre nello stesso ordine: unione scritta a mano, reazione del mondo, via di un fenomeno,
 * miscela (solo da quando il Libro ha `SOGLIA_MISCELE` voci), niente. `voci` è quante voci del Libro sono trovate.
 * Non tocca niente: non registra miscele, non scopre, non guarda cosa è già visto. Si può chiamare mentre il dito
 * si muove sopra le cose, quante volte si vuole; registrano e scoprono solo `Mondo.unisci` e `Mondo.porta`.
 */
export function esitoDi(a: number, b: number, voci: number): Esito {
  if (a === b) return NIENTE;
  const invenzione = unioneDi(a, b);
  if (invenzione >= 0) return { genere: 'unione', id: invenzione };
  const materia = esitoNoto(a, b);
  if (materia >= 0) return { genere: 'materia', id: materia };
  const fenomeno = fenomenoDi(a, b);
  if (fenomeno >= 0) return { genere: 'fenomeno', id: fenomeno };
  if (!sostanza(a) || !sostanza(b) || coppiaDAutore(a, b)) return NIENTE;
  if (voci < SOGLIA_MISCELE) return PER_ORA;
  return { genere: 'miscela', id: idMiscela(a, b) };
}

/**
 * Una scoperta d'autore che in Unisci si può unire ad altro: i materiali, gli omini, il villaggio, e tutto ciò che
 * entra in un'unione scritta o ne nasce (le invenzioni, i mestieri, le cose nuove).
 */
export function siUnisce(id: number): boolean {
  return (id > 0 && id < N_BASE) || id === OMINO || id === VILLAGGIO || eIngrediente(id) || eRisultato(id);
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
      let esito = unioneDi(miei[i], miei[j]);
      if (esito < 0) esito = esitoNoto(miei[i], miei[j]);
      if (esito < 0) continue;
      if (!visti.has(esito)) return [miei[i], miei[j]];
      nota ??= [miei[i], miei[j]];
    }
  }
  return nota;
}
