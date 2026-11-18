import { CONSEGUENZE_DI_PRIMA, ERE_DI_PRIMA, INGOMBRO_DI_PRIMA, UNIONI_DI_PRIMA, chiaveCoppia } from '../motore/cose.js';
import { N_BASE, PAESAGGI_DI_PRIMA, PRIMA_ID_MISCELA } from '../motore/materiali.js';
import { INIZIALI, type Via, VOCI_DI_PRIMA } from '../scoperte.js';
import { FAMIGLIE } from './famiglie.js';
import { FILE } from './indice.js';
import { NUMERI, PRIMO_NUOVO } from './numeri.js';
import type { Articolo, Effetto, Genere, Muove, Numero, Scheda, TipoVoce } from './scheda.js';
import { TIPI_DI_PRIMA } from './tipi.js';

/**
 * Il registro: l'unico posto che mette insieme le voci di prima (scoperte.ts, cose.ts) e le schede (src/contenuti/),
 * e le dà a tutto il gioco con i loro numeri. Libro, tavolozza, Unisci, porta(), il salvataggio leggono da qui: una
 * scheda nuova funziona dappertutto senza toccare altro codice.
 *
 * È anche l'unico file che importa sia le schede sia il motore. Le tavole si costruiscono alla prima chiamata, mai
 * al caricamento del modulo: così l'ordine in cui il browser carica i moduli non conta, e non nascono giri.
 */

export type { Via };
export { INIZIALI };

/** Una voce del Libro, com'è per il gioco: con il suo numero, la chiave, il tipo e tutto quello che serve a mostrarla. */
export interface Voce {
  id: number;
  chiave: string;
  nome: string;
  /** Il capitolo del Libro. */
  famiglia: string;
  tipo: TipoVoce;
  genere: Genere;
  numero: Numero;
  articolo: Articolo;
  indizio: string;
  descrizione: string;
  sapevi?: string;
  /** I modi in cui nasce, con i numeri (vuoto per i quattro elementi). */
  nasce: readonly Via[];
  /** Si mette nel mondo col dito dalla tavolozza: i materiali e le costruzioni. */
  versabile: boolean;
  icona?: readonly string[];
  figura?: readonly string[];
  muove?: Muove;
  evento?: Effetto;
  /** Voluta senza seguito: non conta come vicolo cieco. */
  finale: boolean;
  /** Il file delle schede da cui viene (`paese`…); manca per le voci di prima. */
  file?: string;
}

/** Tutto quello che il registro ricava, costruito una volta sola. */
interface Tavole {
  voci: Voce[];
  perId: Map<number, Voce>;
  numeroDi: Map<string, number>;
  chiaveDi: Map<number, string>;
  /** Tutte le unioni scritte: [ingrediente, ingrediente, risultato]. */
  unioni: (readonly [number, number, number])[];
  perCoppia: Map<number, number>;
  risultati: Set<number>;
  ingredienti: Set<number>;
  /** Le vie dei fenomeni scritti nelle schede: Unisci non li regala, si guardano succedere. */
  vieDeiFenomeni: Map<number, number>;
  ingombro: Record<number, readonly [number, number]>;
  costruzioni: number[];
  aGalla: Set<number>;
  ere: number[];
  conseguenze: (readonly [number, number])[];
  paesaggi: (readonly [number, number, number])[];
  /** Quello che nelle schede non torna (una chiave senza numero, una coppia con una chiave ignota…): il controllo lo mostra. */
  problemi: string[];
}

/** Il numero che dice l'articolo: «le Mura» sono tante, «la Capanna» una. */
export const numeroDaArticolo = (a: Articolo): Numero => (a === 'i' || a === 'gli' || a === 'le' ? 'p' : 's');

/** L'ingombro di una figura nel mondo: le figure sono disegnate a due quadretti per cella. */
export function ingombroDaFigura(figura: readonly string[]): readonly [number, number] {
  const largo = Math.max(0, ...figura.map((r) => r.length));
  return [Math.ceil(largo / 2), Math.ceil(figura.length / 2)];
}

function costruisci(): Tavole {
  const problemi: string[] = [];
  const numeroDi = new Map<string, number>();
  const chiaveDi = new Map<number, string>();
  for (const [chiave, n] of NUMERI) {
    if (!numeroDi.has(chiave)) numeroDi.set(chiave, n);
    if (!chiaveDi.has(n)) chiaveDi.set(n, chiave);
  }

  const voci: Voce[] = [];
  for (const s of VOCI_DI_PRIMA) {
    const chiave = chiaveDi.get(s.id) ?? `voce-${s.id}`;
    const [tipo, articolo, genere] = TIPI_DI_PRIMA[chiave] ?? ['oggetto', 'il', 'm'];
    if (!TIPI_DI_PRIMA[chiave]) problemi.push(`La voce «${s.nome}» non ha il suo tipo in tipi.ts.`);
    voci.push({
      id: s.id,
      chiave,
      nome: s.nome,
      famiglia: s.sezione,
      tipo,
      genere,
      numero: numeroDaArticolo(articolo),
      articolo,
      indizio: s.indizio,
      descrizione: s.descrizione,
      nasce: s.nasce,
      versabile: s.versabile,
      finale: false,
    });
  }

  const unioni: (readonly [number, number, number])[] = [...UNIONI_DI_PRIMA];
  const vieDeiFenomeni = new Map<number, number>();
  const ingombro: Record<number, readonly [number, number]> = { ...INGOMBRO_DI_PRIMA };
  const aGalla = new Set<number>();
  const conseguenze: (readonly [number, number])[] = [...CONSEGUENZE_DI_PRIMA];
  const paesaggi: (readonly [number, number, number])[] = [...PAESAGGI_DI_PRIMA];
  const coppia = (c: readonly [string, string], nome: string): readonly [number, number] | null => {
    const a = numeroDi.get(c[0]);
    const b = numeroDi.get(c[1]);
    if (a === undefined || b === undefined) {
      problemi.push(`«${nome}»: la coppia ${c[0]} + ${c[1]} usa una chiave che non ha un numero.`);
      return null;
    }
    return [a, b];
  };
  const dopo: [number, string, string][] = [];
  const presi = new Set(voci.map((v) => v.id));

  for (const [file, schede] of Object.entries(FILE)) {
    for (const s of schede) {
      const id = numeroDi.get(s.chiave);
      if (id === undefined) {
        problemi.push(`La scheda «${s.nome}» (${file}) ha la chiave «${s.chiave}», che non ha un numero in numeri.ts.`);
        continue;
      }
      if (presi.has(id)) {
        problemi.push(`La chiave «${s.chiave}» (${file}) ha già una voce: due schede, o una scheda e una voce di prima.`);
        continue;
      }
      presi.add(id);
      const nasce: Via[] = [];
      for (const c of s.unioni) {
        const ab = coppia(c, s.nome);
        if (!ab) continue;
        nasce.push({ con: ab });
        if (s.tipo === 'fenomeno') vieDeiFenomeni.set(chiaveCoppia(ab[0], ab[1]), id);
        else unioni.push([ab[0], ab[1], id]);
      }
      if (s.arrivaCon !== undefined) {
        const con = numeroDi.get(s.arrivaCon);
        if (con === undefined) problemi.push(`«${s.nome}»: arrivaCon «${s.arrivaCon}» non ha un numero.`);
        else {
          conseguenze.push([con, id]);
          nasce.push({ con: [con] });
        }
      }
      if (s.siVede) {
        const materiale = numeroDi.get(s.siVede.materiale);
        if (materiale === undefined || materiale >= N_BASE) problemi.push(`«${s.nome}»: siVede vuole un materiale, e «${s.siVede.materiale}» non lo è.`);
        else {
          paesaggi.push([id, materiale, s.siVede.quante]);
          nasce.push({ con: [materiale], nota: 'in gran quantità' });
        }
      }
      if (s.tipo === 'era' && s.dopo !== undefined) dopo.push([id, s.dopo, s.nome]);
      const posabile = s.tipo === 'costruzione' && s.figura !== undefined && s.figura.length > 0;
      if (posabile) {
        ingombro[id] = ingombroDaFigura(s.figura!);
        if (s.aGalla) aGalla.add(id);
      }
      voci.push({
        id,
        chiave: s.chiave,
        nome: s.nome,
        famiglia: s.famiglia,
        tipo: s.tipo,
        genere: s.genere,
        numero: s.numero,
        articolo: s.articolo,
        indizio: s.indizio,
        descrizione: s.descrizione,
        sapevi: s.sapevi,
        nasce,
        versabile: posabile,
        icona: s.icona,
        figura: s.figura,
        muove: s.muove,
        evento: s.evento,
        finale: s.finale === true,
        file,
      });
    }
  }

  // Le ere delle schede: ognuna subito dopo la sua (anche a catena, scritte in qualsiasi ordine).
  const ere = [...ERE_DI_PRIMA];
  for (let mosse = true; mosse; ) {
    mosse = false;
    for (const [id, chiave] of dopo) {
      const prima = numeroDi.get(chiave);
      const k = prima === undefined ? -1 : ere.indexOf(prima);
      if (k < 0 || ere.includes(id)) continue;
      ere.splice(k + 1, 0, id);
      mosse = true;
    }
  }
  for (const [id, chiave, nome] of dopo) if (!ere.includes(id)) problemi.push(`L'era «${nome}» viene dopo «${chiave}», che non è un'era.`);

  const perCoppia = new Map<number, number>();
  for (const [a, b, r] of unioni) if (!perCoppia.has(chiaveCoppia(a, b))) perCoppia.set(chiaveCoppia(a, b), r);
  return {
    voci,
    perId: new Map(voci.map((v) => [v.id, v])),
    numeroDi,
    chiaveDi,
    unioni,
    perCoppia,
    risultati: new Set(unioni.map(([, , r]) => r)),
    ingredienti: new Set(unioni.flatMap(([a, b]) => [a, b])),
    vieDeiFenomeni,
    ingombro,
    costruzioni: Object.keys(ingombro).map(Number),
    aGalla,
    ere,
    conseguenze,
    paesaggi,
    problemi,
  };
}

let tavole: Tavole | null = null;
const t = (): Tavole => (tavole ??= costruisci());

/** Tutte le voci del Libro, nell'ordine in cui si mostrano dentro ogni capitolo. */
export const voci = (): readonly Voce[] => t().voci;
/** La voce del Libro con quel numero; undefined per le miscele e per ciò che non è una voce. */
export const voce = (id: number): Voce | undefined => t().perId.get(id);
export const eVoce = (id: number): boolean => t().perId.has(id);
/** Il numero di una chiave; -1 se la chiave non c'è. */
export const idDi = (chiave: string): number => t().numeroDi.get(chiave) ?? -1;
export const chiaveDi = (id: number): string | undefined => t().chiaveDi.get(id);
export const tipoDi = (id: number): TipoVoce | undefined => t().perId.get(id)?.tipo;
/**
 * Vero se, senza un'icona o una figura sua, la voce si mostra come uno stendardo: le ere e gli eventi. Si guarda il
 * tipo e non il numero: le scoperte nuove hanno numeri da 500 in su, e non sono stendardi solo per questo.
 */
export const haStendardo = (id: number): boolean => {
  const tipo = t().perId.get(id)?.tipo;
  return tipo === 'era' || tipo === 'evento';
};
/** I capitoli del Libro: [chiave, nome]. */
export const capitoli = (): readonly (readonly [string, string])[] => FAMIGLIE;
/** Le voci di un capitolo, nell'ordine del Libro. */
export const vociDelCapitolo = (famiglia: string): Voce[] => t().voci.filter((v) => v.famiglia === famiglia);

/** Quante voci del Libro sono già state scoperte. Le miscele non sono voci: hanno un capitolo a parte, senza fine. */
export function vociTrovate(visti: ReadonlySet<number>): number {
  let n = 0;
  for (const v of t().voci) if (visti.has(v.id)) n++;
  return n;
}

/** Cosa nasce unendo due scoperte secondo le unioni scritte (di prima e delle schede); -1 se la coppia non è scritta. */
export function unioneDi(a: number, b: number): number {
  return t().perCoppia.get(chiaveCoppia(a, b)) ?? -1;
}
/** Tutte le unioni scritte: [ingrediente, ingrediente, risultato]. */
export const unioni = (): readonly (readonly [number, number, number])[] => t().unioni;
/** Le coppie da cui nasce una scoperta secondo le unioni scritte. */
export const vieDi = (id: number): [number, number][] => t().unioni.filter(([, , r]) => r === id).map(([a, b]) => [a, b]);
/** Nasce da un'unione scritta: per Unisci è una cosa da unire, mai un fenomeno da guardare nel mondo. */
export const eRisultato = (id: number): boolean => t().risultati.has(id);
/** Entra in un'unione scritta come ingrediente. */
export const eIngrediente = (id: number): boolean => t().ingredienti.has(id);
/** Il fenomeno di una scheda di cui la coppia è la via nel mondo; -1 se non lo è di nessuno. */
export const viaDiFenomeno = (a: number, b: number): number => t().vieDeiFenomeni.get(chiaveCoppia(a, b)) ?? -1;

/** Quanto è grande nel mondo, in celle, una cosa che si posa; undefined se non si posa. */
export const ingombroDi = (id: number): readonly [number, number] | undefined => t().ingombro[id];
/** Tutte le cose che si posano nel mondo. */
export const costruzioni = (): readonly number[] => t().costruzioni;
/** Una costruzione delle schede che si posa solo sull'acqua (barca e ponte, di prima, li sa posa.ts). */
export const aGalla = (id: number): boolean => t().aGalla.has(id);
/** La figura nel mondo di una scheda; undefined per le voci di prima (le loro figure stanno in disegno/figure.ts). */
export const figuraDi = (id: number): readonly string[] | undefined => t().perId.get(id)?.figura;
/** L'icona a quadretti di una scheda, se ce l'ha. */
export const iconaDi = (id: number): readonly string[] | undefined => t().perId.get(id)?.icona;

/** Le ere in ordine: l'ultima raggiunta è quella in cui si trova il mondo. */
export const ere = (): readonly number[] => t().ere;
/** Quando si scopre la prima cosa, arriva anche la seconda (le ere e i grandi passi della storia). */
export const conseguenze = (): readonly (readonly [number, number])[] => t().conseguenze;
/** [scoperta, materiale, celle]: il mondo «ha» quel paesaggio quando ha almeno tante celle di quel materiale. */
export const paesaggi = (): readonly (readonly [number, number, number])[] => t().paesaggi;
/** Quello che il registro non ha potuto leggere dalle schede. */
export const problemi = (): readonly string[] => t().problemi;
/** Le schede così come sono scritte, con il nome del loro file: servono al controllo (strumenti/contenuti.cjs). */
export const schede = (): readonly (readonly [string, Scheda])[] => Object.entries(FILE).flatMap(([file, lista]) => lista.map((s) => [file, s] as const));
/** Tutte le chiavi con il loro numero, nell'ordine di numeri.ts. */
export const numeri = (): readonly (readonly [string, number])[] => NUMERI;
/** Vero per i numeri delle scoperte nate con le schede nuove (da 500 in su). */
export const eNuova = (id: number): boolean => id >= PRIMO_NUOVO && id < PRIMA_ID_MISCELA;
