import { GAS, LIQUIDO, POLVERE, SOLIDO, type Sostanza } from './materiali.js';
import { coloreFiglio, dado, stringi, tratti } from './miscele.js';

/**
 * Le regole con cui si fondevano le miscele prima dei nomi parlanti e dei caratteri nuovi. Servono solo alle
 * miscele delle partite salvate allora: restano com'erano, con lo stesso nome e lo stesso carattere, anche dopo.
 * Non vanno toccate: ogni dado tirato in più o in meno cambierebbe tutte le miscele di quelle partite.
 */

/** I tratti di allora, nell'ordine di allora (l'ordine decide quale dado tocca a chi). */
const TRATTI_DI_PRIMA = ['calore', 'brucia', 'luce', 'fertile', 'vivo', 'veleno', 'nutre', 'esplode', 'corrode'] as const;

/** I tratti pericolosi compaiono dal nulla più di rado degli altri. */
const RARO: Record<string, number> = { vivo: 0.05, corrode: 0.05, esplode: 0.07 };

function statoFiglio(a: number, b: number, r: () => number): number {
  const tiro = r();
  if (a === b) return tiro < 0.88 ? a : [POLVERE, LIQUIDO, SOLIDO, GAS][(r() * 4) | 0];
  const ha = (s: number): boolean => a === s || b === s;
  if (ha(POLVERE) && ha(LIQUIDO)) return tiro < 0.55 ? LIQUIDO : POLVERE;
  if (ha(POLVERE) && ha(SOLIDO)) return tiro < 0.6 ? POLVERE : SOLIDO;
  if (ha(POLVERE) && ha(GAS)) return tiro < 0.6 ? POLVERE : GAS;
  if (ha(LIQUIDO) && ha(SOLIDO)) return tiro < 0.5 ? LIQUIDO : SOLIDO;
  if (ha(LIQUIDO) && ha(GAS)) return tiro < 0.5 ? LIQUIDO : GAS;
  return tiro < 0.5 ? SOLIDO : POLVERE;
}

/** Fonde due sostanze con le regole di prima: un po' dell'una e un po' dell'altra, e spesso un salto a caso. */
export function fondiDiPrima(a: Sostanza, b: Sostanza, id: number): Sostanza {
  const r = dado(id);
  const tra = (x: number, y: number): number => x + (y - x) * r();
  const figlio: Sostanza = {
    stato: statoFiglio(a.stato, b.stato, r),
    colore: [0, 0, 0],
    peso: tra(a.peso, b.peso),
    scorre: tra(a.scorre, b.scorre),
    calore: tra(a.calore, b.calore),
    brucia: tra(a.brucia, b.brucia),
    luce: tra(a.luce, b.luce),
    fertile: tra(a.fertile, b.fertile),
    vivo: tra(a.vivo, b.vivo),
    veleno: tra(a.veleno, b.veleno),
    nutre: tra(a.nutre, b.nutre),
    esplode: tra(a.esplode, b.esplode),
    corrode: tra(a.corrode, b.corrode),
    // I caratteri nuovi allora non c'erano: queste miscele non li hanno, e non li passano ai figli.
    vola: 0,
    appiccica: 0,
    fiorisce: 0,
    tinge: 0,
    indurisce: 0,
    piove: 0,
    radice: a.radice,
  };
  for (const k of TRATTI_DI_PRIMA) {
    if (r() >= (RARO[k] ?? 0.13)) continue;
    const salto = 0.3 + r() * 0.6;
    if (k === 'calore') figlio.calore = stringi(figlio.calore + (r() < 0.5 ? -salto : salto), -1);
    else figlio[k] = stringi(figlio[k] + salto);
  }
  if (figlio.calore > 0.6) figlio.luce = Math.max(figlio.luce, 0.55);
  if (figlio.stato === GAS) {
    figlio.peso = Math.min(figlio.peso, 0.12);
    figlio.vivo = 0;
    figlio.fertile = 0;
  } else if (figlio.stato === LIQUIDO) {
    figlio.peso = stringi(figlio.peso, 0.25, 0.95);
    figlio.scorre = Math.max(figlio.scorre, 0.15);
  } else if (figlio.stato === SOLIDO) {
    figlio.scorre = 0;
  }

  // Nessuna miscela è anonima: se non ha preso nessun carattere, gliene tocca uno in sorte.
  if (tratti(figlio).length === 0) {
    const sorte = (r() * 7) | 0;
    if (sorte === 0) figlio.luce = 0.6 + r() * 0.3;
    else if (sorte === 1) figlio.fertile = 0.65 + r() * 0.3;
    else if (sorte === 2) figlio.nutre = 0.65 + r() * 0.3;
    else if (sorte === 3) figlio.brucia = 0.6 + r() * 0.3;
    else if (sorte === 4) figlio.calore = 0.55 + r() * 0.3;
    else if (sorte === 5) figlio.calore = -0.55 - r() * 0.3;
    else figlio.veleno = 0.6 + r() * 0.3;
  }

  figlio.colore = coloreFiglio(a, b, figlio, r);
  return figlio;
}
