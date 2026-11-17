import { M } from './materiali.js';

/** Cosa fare di una cella quando il Mestolo la fonde con la sua vicina. */
export const RESTA = -1;
export const ACCENDI = -2;

/**
 * Le coppie che hanno già un risultato "d'autore": passandoci sopra il Mestolo succede subito quello che nel mondo
 * succederebbe da sé con un po' di tempo. Per ogni coppia: cosa diventa la prima cosa, cosa diventa la seconda.
 * Tutte le altre coppie, e sono infinite, danno una miscela nuova.
 */
const COPPIE: readonly (readonly [number, number, number, number])[] = [
  [M.TERRA, M.ACQUA, M.FANGO, M.FANGO],
  [M.TERRA, M.ARIA, M.SABBIA, M.SABBIA],
  [M.TERRA, M.FUOCO, M.LAVA, M.LAVA],
  [M.ACQUA, M.FUOCO, M.VAPORE, M.VAPORE],
  [M.LAVA, M.ACQUA, M.PIETRA, M.VAPORE],
  [M.FANGO, M.ARIA, M.ARGILLA, M.ARGILLA],
  [M.FANGO, M.FUOCO, M.TERRA, RESTA],
  [M.ARGILLA, M.FUOCO, M.MATTONE, M.MATTONE],
  [M.ARGILLA, M.LAVA, M.MATTONE, RESTA],
  [M.SABBIA, M.LAVA, M.VETRO, RESTA],
  [M.SABBIA, M.FULMINE, M.VETRO, RESTA],
  [M.VAPORE, M.ARIA, M.NUVOLA, M.NUVOLA],
  [M.NUVOLA, M.ARIA, M.NEVE, M.NEVE],
  [M.NEVE, M.ACQUA, M.GHIACCIO, M.GHIACCIO],
  [M.NEVE, M.FUOCO, M.ACQUA, M.ACQUA],
  [M.GHIACCIO, M.FUOCO, M.ACQUA, M.ACQUA],
  [M.LAVA, M.NEVE, M.OSSIDIANA, M.VAPORE],
  [M.LAVA, M.GHIACCIO, M.OSSIDIANA, M.VAPORE],
  [M.CENERE, M.TERRA, M.HUMUS, M.HUMUS],
  [M.PIETRA, M.LAVA, M.METALLO, RESTA],
  [M.METALLO, M.ACQUA, M.RUGGINE, RESTA],
  [M.CENERE, M.LAVA, M.ZOLFO, RESTA],
  [M.CARBONE, M.ZOLFO, M.POLVERE_NERA, M.POLVERE_NERA],
  [M.ZOLFO, M.ACQUA, M.ACIDO, M.ACIDO],
  [M.PIETRA, M.ACQUA, M.MUSCHIO, RESTA],
  [M.CARBONE, M.FULMINE, M.DIAMANTE, RESTA],
  [M.PIANTA, M.FUOCO, ACCENDI, RESTA],
  [M.LEGNO, M.FUOCO, ACCENDI, RESTA],
  [M.CARBONE, M.FUOCO, ACCENDI, RESTA],
  [M.POLVERE_NERA, M.FUOCO, ACCENDI, RESTA],
  [M.PIANTA, M.LAVA, ACCENDI, RESTA],
  [M.LEGNO, M.LAVA, ACCENDI, RESTA],
];

/** Per ogni coppia ordinata (primo * 256 + secondo): cosa diventa il primo e cosa il secondo. */
export const DEL_MESTOLO = new Map<number, readonly [number, number]>();
for (const [a, b, ra, rb] of COPPIE) {
  DEL_MESTOLO.set(a * 256 + b, [ra, rb]);
  DEL_MESTOLO.set(b * 256 + a, [rb, ra]);
}
