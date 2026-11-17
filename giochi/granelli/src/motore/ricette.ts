import { ESPLOSIONE, M } from './materiali.js';

/** Cosa fare di una cella quando reagisce con la sua vicina: restare com'è, oppure prendere fuoco. */
export const RESTA = -1;
export const ACCENDI = -2;

/**
 * Una coppia con il suo risultato "d'autore": le due cose, cosa diventa la prima, cosa diventa la seconda e, quando
 * serve, ciò che si vede in Unisci (per quello che brucia: non la fiamma, ma quello che resta quando ha finito).
 */
export type Coppia = readonly [a: number, b: number, primo: number, secondo: number, inUnisci?: number];

/**
 * Le reazioni del mondo, coppia per coppia: portando una cosa sopra l'altra succede subito quello che nel mondo
 * succederebbe da sé con un po' di tempo, e Unisci dà lo stesso risultato (vedi esiti.ts). Chi aggiunge al mondo
 * una reazione tra due materiali la scrive anche qui. Tutte le altre coppie, e sono infinite, danno una miscela.
 */
const SCRITTE: readonly Coppia[] = [
  [M.TERRA, M.ACQUA, M.FANGO, M.FANGO],
  [M.TERRA, M.ARIA, M.SABBIA, M.SABBIA],
  [M.TERRA, M.FUOCO, M.LAVA, M.LAVA],
  [M.ACQUA, M.FUOCO, M.VAPORE, M.VAPORE],
  [M.ACQUA, M.ARIA, M.VAPORE, RESTA],
  [M.ACQUA, M.FULMINE, M.VAPORE, RESTA],
  [M.FUOCO, M.ARIA, M.FUMO, M.FUMO],
  [M.LAVA, M.ACQUA, M.PIETRA, M.VAPORE],
  [M.LAVA, M.ARIA, M.PIETRA, RESTA],
  [M.FANGO, M.ARIA, M.ARGILLA, M.ARGILLA],
  [M.FANGO, M.FUOCO, M.TERRA, RESTA],
  [M.FANGO, M.LAVA, M.TERRA, RESTA],
  [M.ARGILLA, M.FUOCO, M.MATTONE, M.MATTONE],
  [M.ARGILLA, M.LAVA, M.MATTONE, RESTA],
  [M.SABBIA, M.LAVA, M.VETRO, RESTA],
  [M.SABBIA, M.FULMINE, M.VETRO, RESTA],
  [M.VAPORE, M.ARIA, M.NUVOLA, M.NUVOLA],
  [M.NUVOLA, M.ARIA, M.NEVE, M.NEVE],
  [M.NEVE, M.ACQUA, M.GHIACCIO, M.GHIACCIO],
  [M.NEVE, M.FUOCO, M.ACQUA, M.ACQUA],
  [M.NEVE, M.FULMINE, M.ACQUA, RESTA],
  [M.GHIACCIO, M.FUOCO, M.ACQUA, M.ACQUA],
  [M.GHIACCIO, M.FULMINE, M.ACQUA, RESTA],
  [M.LAVA, M.NEVE, M.OSSIDIANA, M.VAPORE],
  [M.LAVA, M.GHIACCIO, M.OSSIDIANA, M.VAPORE],
  [M.CENERE, M.TERRA, M.HUMUS, M.HUMUS],
  [M.PIETRA, M.LAVA, M.METALLO, RESTA],
  [M.METALLO, M.ACQUA, M.RUGGINE, RESTA],
  [M.CENERE, M.LAVA, M.ZOLFO, RESTA],
  [M.CARBONE, M.ZOLFO, M.POLVERE_NERA, M.POLVERE_NERA],
  [M.ZOLFO, M.ACQUA, M.ACIDO, M.ACIDO],
  [M.ACIDO, M.ACQUA, M.ACQUA, RESTA],
  [M.PIETRA, M.ACQUA, M.MUSCHIO, RESTA],
  [M.CARBONE, M.FULMINE, M.DIAMANTE, RESTA],
  // Il legno coperto dalla lava brucia senz'aria: è il modo più svelto di fare il carbone.
  [M.LEGNO, M.LAVA, ACCENDI, RESTA, M.CARBONE],

  // ── Ciò che nel mondo nasce col tempo: portando una cosa sopra l'altra, e in Unisci, nasce subito ──
  [M.HUMUS, M.ACQUA, RESTA, M.PIANTA],
  [M.ALGA, M.TERRA, M.PIANTA, RESTA],
  [M.FRUTTO, M.TERRA, M.PIANTA, RESTA],
  [M.FRUTTO, M.FANGO, M.PIANTA, RESTA],
  [M.FRUTTO, M.HUMUS, M.PIANTA, RESTA],
  [M.PIANTA, M.HUMUS, M.LEGNO, RESTA],
  [M.PIANTA, M.ACQUA, RESTA, M.FRUTTO],
  [M.PIETRA, M.PIANTA, M.MUSCHIO, RESTA],
  [M.MUSCHIO, M.PIETRA, RESTA, M.MUSCHIO],
  [M.LEGNO, M.HUMUS, RESTA, M.FUNGO],
  [M.ALGA, M.ACQUA, RESTA, M.ALGA],
];

/** Ciò che brucia, e quello che ne resta quando la fiamma ha finito (la polvere nera non brucia: salta). */
const BRUCIANDO: readonly (readonly [number, number])[] = [
  [M.PIANTA, M.CENERE],
  [M.LEGNO, M.CENERE],
  [M.CARBONE, M.CENERE],
  [M.ZOLFO, M.FUMO],
  [M.POLVERE_NERA, ESPLOSIONE],
  [M.MUSCHIO, M.CENERE],
  [M.FUNGO, M.CENERE],
  [M.FRUTTO, M.CENERE],
];

/** Tutte le coppie d'autore: quelle scritte una per una, più ciò che brucia con ognuna delle tre fiamme. */
export const COPPIE: readonly Coppia[] = (() => {
  const tutte = [...SCRITTE];
  const gia = new Set(SCRITTE.flatMap(([a, b]) => [a * 256 + b, b * 256 + a]));
  for (const [cosa, resto] of BRUCIANDO) {
    for (const fiamma of [M.FUOCO, M.LAVA, M.FULMINE]) {
      if (!gia.has(cosa * 256 + fiamma)) tutte.push([cosa, fiamma, ACCENDI, RESTA, resto]);
    }
  }
  return tutte;
})();

/** Per ogni coppia ordinata (primo * 256 + secondo): cosa diventa il primo e cosa il secondo. */
export const CELLA_PER_CELLA = new Map<number, readonly [number, number]>();
for (const [a, b, ra, rb] of COPPIE) {
  CELLA_PER_CELLA.set(a * 256 + b, [ra, rb]);
  CELLA_PER_CELLA.set(b * 256 + a, [rb, ra]);
}
