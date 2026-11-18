import { eVoce, unioni, voci } from '../contenuti/registro.js';
import { SOGLIA_MISCELE, coppieDelMondo, esitoDi } from './esiti.js';

/**
 * Il solo modulo che sa cosa suggerire a chi gioca: le coppie scritte che si possono già provare, quali gettoni hanno
 * ancora qualcosa da dare, l'indizio da dare e, quando con le cose possedute non c'è più niente di scritto, quale
 * cosa del mondo provare a far nascere. Il tasto Indizio, l'indizio dopo tre «niente» e i puntini sui gettoni (e più
 * avanti il Libro e «il prossimo passo») chiedono tutti a lui, così dicono sempre la stessa cosa.
 *
 * Non guarda la pagina e non tocca il mondo: lavora sulle scoperte (`visti`). Si chiama quando cambia qualcosa (una
 * scoperta, un tocco su Indizio), mai a ogni fotogramma; anche con cinquecento voci risponde in meno di un millesimo.
 */

/** Una coppia scritta: due scoperte e ciò che ne nasce. `nelMondo` se è la via di un fenomeno, che si guarda succedere. */
export interface Coppia {
  a: number;
  b: number;
  nato: number;
  nelMondo: boolean;
}

/** Che cosa ha ancora da dare un gettone, secondo le coppie scritte. */
export type Resa =
  /** Ha almeno una coppia scritta con una cosa già posseduta, e quello che ne nasce manca ancora: il puntino. */
  | 'daProvare'
  /** Ha coppie scritte ancora da scoprire, ma con cose che non si hanno ancora: per ora niente segno. */
  | 'aspetta'
  /** Tutte le sue coppie scritte hanno già dato quello che dovevano: il segno discreto. */
  | 'finito'
  /** Non entra in nessuna coppia scritta (una miscela, un'era): niente da dire. */
  | 'nessuna';

/** Quello che si sa delle scoperte di adesso: lo calcola `quadro`, lo leggono gli altri. */
export interface Quadro {
  /** Le coppie scritte con tutti e due gli ingredienti già scoperti, e il loro esito ancora da scoprire. */
  daProvare: Coppia[];
  /** Per ogni scoperta che entra in una coppia scritta, che cosa ha ancora da dare (vedi `resaDi`). */
  rese: Map<number, number>;
  /** Da quanto tempo c'è ogni scoperta (0 la prima): per preferire le cose nuove a quelle di sempre. */
  eta: Map<number, number>;
}

// I bit di `rese`: si tiene il più forte.
const FINITO = 1;
const ASPETTA = 2;
const DA_PROVARE = 4;

/**
 * Tutte le coppie scritte del gioco, una per coppia: le unioni del registro, le reazioni del mondo, le vie a due
 * ingredienti di ogni voce (anche quelle dei fenomeni delle schede). Quello che nasce lo decide `esitoDi`, come per
 * Unisci e per il mondo; restano solo le coppie che danno una voce del Libro. Si fanno alla prima chiamata.
 */
export function coppieScritte(): readonly Coppia[] {
  return (tutte ??= raccogli());
}
let tutte: Coppia[] | null = null;

function raccogli(): Coppia[] {
  const candidate: (readonly [number, number])[] = [...unioni().map(([a, b]) => [a, b] as const), ...coppieDelMondo()];
  for (const v of voci()) for (const via of v.nasce) if (via.con.length === 2) candidate.push([via.con[0], via.con[1]]);
  const viste = new Set<string>();
  const coppie: Coppia[] = [];
  for (const [a, b] of candidate) {
    const chiave = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (a === b || viste.has(chiave)) continue;
    viste.add(chiave);
    // Con il Libro pieno abbastanza perché le miscele ci siano: una coppia scritta non è mai una miscela.
    const esito = esitoDi(a, b, SOGLIA_MISCELE);
    if (esito.genere !== 'unione' && esito.genere !== 'materia' && esito.genere !== 'fenomeno') continue;
    if (!eVoce(esito.id)) continue;
    coppie.push({ a, b, nato: esito.id, nelMondo: esito.genere === 'fenomeno' });
  }
  return coppie;
}

/**
 * Il quadro delle scoperte di adesso, calcolato sulle `coppie` date (di solito `coppieScritte()`; le prove ne
 * passano di finte). Una passata sola sulle coppie.
 */
export function calcola(coppie: readonly Coppia[], visti: ReadonlySet<number>): Quadro {
  const daProvare: Coppia[] = [];
  const rese = new Map<number, number>();
  const segna = (id: number, bit: number): void => {
    rese.set(id, (rese.get(id) ?? 0) | bit);
  };
  for (const c of coppie) {
    if (visti.has(c.nato)) {
      segna(c.a, FINITO);
      segna(c.b, FINITO);
    } else if (visti.has(c.a) && visti.has(c.b)) {
      daProvare.push(c);
      segna(c.a, DA_PROVARE);
      segna(c.b, DA_PROVARE);
    } else {
      segna(c.a, ASPETTA);
      segna(c.b, ASPETTA);
    }
  }
  const eta = new Map<number, number>();
  let n = 0;
  for (const id of visti) eta.set(id, n++);
  return { daProvare, rese, eta };
}

/** L'ultimo quadro fatto, con le scoperte da cui è nato: finché non ne arriva una nuova, vale ancora. */
let ultimo: { visti: ReadonlySet<number>; quante: number; quadro: Quadro } | null = null;

/**
 * Il quadro delle scoperte di `visti`, con tutte le coppie scritte del gioco. Le scoperte crescono soltanto: finché
 * il Set è lo stesso e non è cresciuto, il quadro di prima vale ancora e non si rifà.
 */
export function quadro(visti: ReadonlySet<number>): Quadro {
  if (ultimo && ultimo.visti === visti && ultimo.quante === visti.size) return ultimo.quadro;
  const fatto = calcola(coppieScritte(), visti);
  ultimo = { visti, quante: visti.size, quadro: fatto };
  return fatto;
}

/** Che cosa ha ancora da dare la scoperta `id` (vedi `Resa`). */
export function resaDi(q: Quadro, id: number): Resa {
  const bit = q.rese.get(id) ?? 0;
  if (bit & DA_PROVARE) return 'daProvare';
  if (bit & ASPETTA) return 'aspetta';
  if (bit & FINITO) return 'finito';
  return 'nessuna';
}

/** Una coppia scritta in forma di chiave, uguale nei due ordini. */
export const chiaveDi = (c: Coppia): string => (c.a < c.b ? `${c.a}:${c.b}` : `${c.b}:${c.a}`);

/**
 * La coppia da suggerire: tra quelle da provare, prima una che contiene una delle `preferite` (le cose appena
 * provate, la più recente per prima), poi una che si fa unendo e non solo guardando il mondo, poi quella con la
 * cosa scoperta più di recente. `dopo` è la coppia di cui si è appena detto tutto: se ce n'è un'altra si passa a
 * quella, e se si può a una che fa nascere un'altra cosa. null se con le cose possedute non c'è niente da provare.
 */
export function scegliCoppia(q: Quadro, preferite: readonly number[] = [], dopo?: Coppia): Coppia | null {
  const altre = dopo === undefined ? q.daProvare : q.daProvare.filter((c) => c !== dopo);
  const nuove = dopo === undefined ? altre : altre.filter((c) => c.nato !== dopo.nato);
  const scelte = nuove.length > 0 ? nuove : altre.length > 0 ? altre : q.daProvare;
  let migliore: Coppia | null = null;
  let punti = -Infinity;
  for (const c of scelte) {
    // Quanto è recente, tra le cose appena provate, quella che la coppia contiene (-1 se non ne contiene nessuna).
    const ka = preferite.indexOf(c.a);
    const kb = preferite.indexOf(c.b);
    const k = ka < 0 ? kb : kb < 0 ? ka : Math.min(ka, kb);
    // Prima le cose appena provate, poi le unioni da fare (non da guardare), poi le scoperte più recenti.
    const p = (k < 0 ? 0 : 1e9 * (100 - Math.min(99, k))) + (c.nelMondo ? 0 : 1e8) + Math.max(q.eta.get(c.a) ?? 0, q.eta.get(c.b) ?? 0);
    if (p > punti) {
      punti = p;
      migliore = c;
    }
  }
  return migliore;
}

/**
 * Quale delle due cose di una coppia nominare nell'indizio: quella appena provata, se c'è; altrimenti non quella
 * nominata dall'indizio di prima (`evita`), così due indizi di fila non sembrano uguali; altrimenti la scoperta più
 * recente, che è quella a cui chi gioca sta pensando. L'altra resta da indovinare.
 */
export function daNominare(q: Quadro, c: Coppia, preferite: readonly number[] = [], evita = -1): number {
  for (const id of preferite) if (id === c.a || id === c.b) return id;
  if (evita === c.a) return c.b;
  if (evita === c.b) return c.a;
  return (q.eta.get(c.a) ?? 0) >= (q.eta.get(c.b) ?? 0) ? c.a : c.b;
}

/**
 * Quando con le cose possedute non c'è più niente di scritto da provare: la voce del Libro più vicina, cioè quella a
 * cui mancano meno ingredienti (prima quelle che nascono nel mondo da cose che si hanno già: un lago, la notte), a
 * parità la prima nell'ordine del Libro. Le ere arrivano da sole e non si suggeriscono. -1 se è tutto scoperto.
 */
export function voceVicina(visti: ReadonlySet<number>): number {
  let scelta = -1;
  let meno = Infinity;
  for (const v of voci()) {
    if (visti.has(v.id) || v.tipo === 'era' || v.nasce.length === 0) continue;
    for (const via of v.nasce) {
      let manca = 0;
      for (const id of new Set(via.con)) if (!visti.has(id)) manca++;
      if (manca < meno) {
        meno = manca;
        scelta = v.id;
      }
    }
  }
  return scelta;
}
