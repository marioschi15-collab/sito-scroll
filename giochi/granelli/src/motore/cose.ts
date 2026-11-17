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

/** Le ere, in ordine: l'ultima raggiunta è quella in cui si trova il mondo. */
export const ERE: readonly number[] = [E.PIETRA, E.BRONZO, E.FERRO, E.ANTICA, E.MEDIOEVO];

/** Quanto è grande nel mondo (in celle) ciò che si può posare. Quello che manca qui è solo un'idea o un oggetto da tasca. */
export const INGOMBRO: Record<number, readonly [number, number]> = {
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

/** Una cosa posata nel mondo: (x, y) è la cella in basso a sinistra del suo ingombro. */
export interface Cosa {
  id: number;
  x: number;
  y: number;
}

/** Un tetto sotto cui un omino può vivere, e quanti ne ospita. */
export const OSPITA: Record<number, number> = { [C.CAPANNA]: 3, [C.CASA]: 5, [C.CASTELLO]: 12 };

/**
 * Le unioni scritte a mano: due scoperte qualsiasi (materiali, invenzioni, perfino gli omini) e ciò che ne nasce.
 * In Unisci vengono prima di tutto; poi le reazioni del mondo (esiti.ts), e solo le coppie di sostanze rimaste
 * senza esito danno una miscela. Le altre coppie non danno niente.
 */
const UNIONI: readonly (readonly [number, number, number])[] = [
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
];

/**
 * Un numero solo per una coppia di scoperte d'autore, uguale nei due ordini (un numero, non un testo: il Mestolo
 * lo chiede per ogni cella che tocca). -1 se una delle due è una miscela: le miscele non hanno coppie scritte.
 */
export function chiaveCoppia(a: number, b: number): number {
  if (a >= 65536 || b >= 65536) return -1;
  return a < b ? a * 65536 + b : b * 65536 + a;
}
const TAVOLA = new Map<number, number>(UNIONI.map(([a, b, r]) => [chiaveCoppia(a, b), r]));

/** Cosa nasce unendo due scoperte secondo le unioni scritte a mano; -1 se quella coppia non è prevista. */
export function unione(a: number, b: number): number {
  return TAVOLA.get(chiaveCoppia(a, b)) ?? -1;
}

/** Per ogni invenzione, le coppie da cui nasce (serve al libro). */
export function vieDi(id: number): [number, number][] {
  return UNIONI.filter(([, , r]) => r === id).map(([a, b]) => [a, b]);
}

/** Quando si scopre la prima cosa, arriva anche la seconda: è così che cambiano le ere. */
export const CONSEGUENZE: readonly (readonly [number, number])[] = [
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
