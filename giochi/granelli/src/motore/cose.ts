import { M, OMINO, VILLAGGIO } from './materiali.js';

/**
 * Le invenzioni: cose che non sono granelli. Nascono unendo due scoperte (come nei giochi di alchimia) e molte
 * si possono posare nel mondo, dove stanno appoggiate a terra come un edificio.
 */
export const C = {
  UTENSILE: 200,
  FALO: 201,
  CAPANNA: 202,
  LANCIA: 203,
  RUOTA: 204,
  VASO: 205,
  CAMPO: 206,
  PANE: 207,
  POZZO: 208,
  CASA: 209,
  FORNACE: 210,
  BRONZO: 211,
  SPADA: 212,
  CARRO: 213,
  BARCA: 214,
  STRADA: 215,
  MURA: 216,
  TORRE: 217,
  TEMPIO: 218,
  SCRITTURA: 219,
  MONETA: 220,
  MULINO: 221,
  CASTELLO: 222,
  CITTA: 223,
  MERCATO: 224,
  LIBRO: 225,
  FERRO: 226,
  ARATRO: 227,
  PONTE: 228,
  FARO: 229,
} as const;

/** Le ere e i grandi eventi: non si creano, arrivano quando il mondo fa un certo passo. */
export const E = {
  PIETRA: 400,
  FUOCO_DOMATO: 401,
  AGRICOLTURA: 402,
  BRONZO: 403,
  NASCE_SCRITTURA: 404,
  ANTICA: 405,
  FERRO: 406,
  COMMERCIO: 407,
  MEDIOEVO: 408,
} as const;

/**
 * Le ere di prima delle schede, in ordine. La fila completa (con le ere scritte nelle schede, ognuna dopo la sua)
 * la dà `ere()` di contenuti/registro.ts: è quella che il gioco usa.
 */
export const ERE_DI_PRIMA: readonly number[] = [E.PIETRA, E.BRONZO, E.FERRO, E.ANTICA, E.MEDIOEVO];

/**
 * Quanto è grande nel mondo (in celle) ciò che si posava già prima delle schede. Le costruzioni delle schede hanno
 * l'ingombro ricavato dalla loro figura: tutte insieme le dà `ingombroDi()` di contenuti/registro.ts.
 */
export const INGOMBRO_DI_PRIMA: Readonly<Record<number, readonly [number, number]>> = {
  [C.FALO]: [5, 4],
  [C.CAPANNA]: [10, 6],
  [C.CAMPO]: [10, 4],
  [C.POZZO]: [6, 6],
  [C.CASA]: [11, 8],
  [C.FORNACE]: [7, 7],
  [C.CARRO]: [8, 5],
  [C.BARCA]: [9, 6],
  [C.MURA]: [8, 7],
  [C.TORRE]: [6, 12],
  [C.TEMPIO]: [12, 9],
  [C.MULINO]: [9, 12],
  [C.CASTELLO]: [16, 13],
  [C.MERCATO]: [10, 7],
  [C.PONTE]: [14, 5],
  [C.FARO]: [5, 14],
};

/** Una cosa posata nel mondo (una costruzione, o un oggetto appoggiato a terra): (x, y) è la cella in basso a sinistra del suo ingombro. */
export interface Cosa {
  id: number;
  x: number;
  y: number;
  /** Il suo numero d'ordine: non cambia mai e non ce ne sono due uguali. Serve a riconoscerla (la casa di un omino è questa). */
  n: number;
  /** Le idee portate sopra questa costruzione (la scrittura sul tempio): restano scritte. */
  sa?: number[];
  /** L'idea appena arrivata, mostrata in un fumetto, e fino a quale istante (non si salva). */
  nuvoletta?: number;
  nuvolettaFino?: number;
}

/** Un tetto sotto cui un omino può vivere, e quanti ne ospita. */
export const OSPITA: Record<number, number> = { [C.CAPANNA]: 3, [C.CASA]: 5, [C.CASTELLO]: 12 };

/**
 * Le unioni scritte a mano prima delle schede: due scoperte qualsiasi (materiali, invenzioni, perfino gli omini) e
 * ciò che ne nasce. Le unioni nuove si scrivono nelle schede (src/contenuti/), con le chiavi; tutte insieme le dà
 * `unioneDi()` di contenuti/registro.ts. In Unisci vengono prima di tutto; poi le reazioni del mondo (esiti.ts), e
 * solo le coppie di sostanze rimaste senza esito danno una miscela. Le altre coppie non danno niente.
 */
export const UNIONI_DI_PRIMA: readonly (readonly [number, number, number])[] = [
  [M.PIETRA, M.LEGNO, C.UTENSILE],
  [M.LEGNO, M.FUOCO, C.FALO],
  [M.LEGNO, M.PIANTA, C.CAPANNA],
  [C.UTENSILE, M.LEGNO, C.LANCIA],
  [C.UTENSILE, M.PIETRA, C.RUOTA],
  [M.ARGILLA, M.ACQUA, C.VASO],
  [C.UTENSILE, M.TERRA, C.CAMPO],
  [C.UTENSILE, M.HUMUS, C.CAMPO],
  [C.CAMPO, M.FUOCO, C.PANE],
  [M.PIETRA, M.ACQUA, C.POZZO],
  [M.MATTONE, M.LEGNO, C.CASA],
  [M.MATTONE, M.FUOCO, C.FORNACE],
  [C.FORNACE, M.METALLO, C.BRONZO],
  [C.BRONZO, C.UTENSILE, C.SPADA],
  [C.RUOTA, M.LEGNO, C.CARRO],
  [C.UTENSILE, M.ACQUA, C.BARCA],
  [M.PIETRA, M.SABBIA, C.STRADA],
  [M.PIETRA, M.MATTONE, C.MURA],
  [C.MURA, M.PIETRA, C.TORRE],
  [C.MURA, M.VETRO, C.TEMPIO],
  [M.ARGILLA, C.UTENSILE, C.SCRITTURA],
  [C.BRONZO, M.FUOCO, C.MONETA],
  [C.RUOTA, M.ARIA, C.MULINO],
  [C.TORRE, C.MURA, C.CASTELLO],
  [VILLAGGIO, C.MURA, C.CITTA],
  [C.MONETA, C.CARRO, C.MERCATO],
  [C.SCRITTURA, M.PIANTA, C.LIBRO],
  [C.FORNACE, M.CARBONE, C.FERRO],
  [C.FERRO, C.CAMPO, C.ARATRO],
  [C.STRADA, M.ACQUA, C.PONTE],
  [C.TORRE, M.FUOCO, C.FARO],
  [OMINO, M.FUOCO, C.FALO],

  // ── La via dei primi omini: un tetto e qualcosa da mangiare, e arriva qualcuno ──
  [C.CAPANNA, M.FRUTTO, OMINO],
];

/**
 * Un numero solo per una coppia di scoperte d'autore, uguale nei due ordini (un numero e non un testo: si chiede
 * spesso, e un numero non lascia niente da buttare). -1 se una delle due è una miscela: le miscele non hanno coppie scritte.
 */
export function chiaveCoppia(a: number, b: number): number {
  if (a >= 65536 || b >= 65536) return -1;
  return a < b ? a * 65536 + b : b * 65536 + a;
}

/**
 * Quando si scopre la prima cosa, arriva anche la seconda: è così che cambiano le ere. Queste sono quelle di prima
 * delle schede; tutte insieme (con `arrivaCon` delle schede) le dà `conseguenze()` di contenuti/registro.ts.
 */
export const CONSEGUENZE_DI_PRIMA: readonly (readonly [number, number])[] = [
  [C.UTENSILE, E.PIETRA],
  [C.FALO, E.FUOCO_DOMATO],
  [C.CAMPO, E.AGRICOLTURA],
  [C.BRONZO, E.BRONZO],
  [C.SCRITTURA, E.NASCE_SCRITTURA],
  [C.FERRO, E.FERRO],
  [C.TEMPIO, E.ANTICA],
  [C.MERCATO, E.COMMERCIO],
  [C.CASTELLO, E.MEDIOEVO],
];
