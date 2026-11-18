import { M } from './materiali.js';

/**
 * Le radici dei nomi delle miscele: ogni materiale ne ha una o due, e il nome di una miscela porta quella del
 * genitore che conta di più («Melma di fango», «Polvere di duna»). La prima è il nome del materiale e si usa quasi
 * sempre: così dal nome si indovina da dove viene. La seconda lo ricorda senza ripeterlo.
 */
export const RADICI: Partial<Record<number, readonly string[]>> = {
  [M.TERRA]: ['di terra', 'di zolla'],
  [M.ACQUA]: ['d’acqua', 'di fonte'],
  [M.FUOCO]: ['di fiamma', 'di brace'],
  [M.ARIA]: ['di vento', 'di brezza'],
  [M.VAPORE]: ['di vapore', 'di bruma'],
  [M.FANGO]: ['di fango', 'di pozzanghera'],
  [M.SABBIA]: ['di sabbia', 'di duna'],
  [M.LAVA]: ['di lava', 'di magma'],
  [M.PIETRA]: ['di pietra', 'di sasso'],
  [M.NUVOLA]: ['di nuvola', 'di nembo'],
  [M.FULMINE]: ['di fulmine', 'di saetta'],
  [M.VETRO]: ['di vetro', 'di specchio'],
  [M.ARGILLA]: ['d’argilla', 'di creta'],
  [M.MATTONE]: ['di mattone', 'di cotto'],
  [M.PIANTA]: ['d’erba', 'di foglia'],
  [M.LEGNO]: ['di legno', 'di corteccia'],
  [M.CENERE]: ['di cenere'],
  [M.FUMO]: ['di fumo', 'di camino'],
  [M.NEVE]: ['di neve'],
  [M.GHIACCIO]: ['di ghiaccio', 'di gelo'],
  [M.HUMUS]: ['di terriccio', 'di sottobosco'],
  [M.OSSIDIANA]: ['d’ossidiana', 'di vulcano'],
  [M.CARBONE]: ['di carbone', 'di carbonella'],
  [M.METALLO]: ['di metallo', 'di lamiera'],
  [M.RUGGINE]: ['di ruggine'],
  [M.ZOLFO]: ['di zolfo'],
  [M.POLVERE_NERA]: ['di polvere nera', 'di miccia'],
  [M.ACIDO]: ['d’acido'],
  [M.DIAMANTE]: ['di diamante', 'di gemma'],
  [M.MUSCHIO]: ['di muschio'],
  [M.ALGA]: ['d’alga', 'di stagno'],
  [M.FUNGO]: ['di fungo'],
  [M.FRUTTO]: ['di frutto', 'di bacca'],
};
