import type { Firmata } from './firmate.js';
import { BASE, GAS, LIQUIDO, M, N_BASE, POLVERE, SOLIDO, type Sostanza, TRATTI } from './materiali.js';
import { CARATTERI, type Carattere, SOGLIA, coloreFiglio, dado, funziona, margine, stringi, tratti } from './miscele.js';

/**
 * Come due sostanze si fondono in una terza. La regola è fatta perché si possa indovinare: uno dei due genitori
 * conta di più (dà la radice del nome, «di fango», e di solito lo stato), e il figlio tiene il carattere più
 * forte di tutti e due («Resina di muschio gelida»: il muschio vive, la neve gela). Una volta su cinque spunta un
 * carattere in più che nessuno dei due aveva: la sorpresa.
 */

/**
 * Quello che un materiale porta in una miscela, oltre ai suoi numeri: il suo carattere più riconoscibile. Il fango
 * attacca, la nuvola fa piovere, la ruggine tinge. Vale solo nelle miscele nuove (le partite di prima non lo sanno).
 */
const DOTE: Partial<Record<number, Partial<Sostanza>>> = {
  [M.TERRA]: { fertile: 0.8, indurisce: 0.35 },
  [M.ACQUA]: { fiorisce: 0.8, piove: 0.75, tinge: 0.4 },
  [M.ARIA]: { vola: 0.85 },
  [M.VAPORE]: { piove: 0.85, vola: 0.5 },
  [M.FANGO]: { appiccica: 0.8 },
  [M.LAVA]: { indurisce: 0.5 },
  [M.PIETRA]: { indurisce: 0.85 },
  [M.NUVOLA]: { piove: 0.95, vola: 0.6 },
  [M.FULMINE]: { esplode: 0.8 },
  [M.VETRO]: { luce: 0.75 },
  [M.ARGILLA]: { appiccica: 0.85, indurisce: 0.5 },
  [M.MATTONE]: { indurisce: 0.7 },
  [M.PIANTA]: { vivo: 0.75, fiorisce: 0.5 },
  [M.LEGNO]: { brucia: 0.8 },
  [M.CENERE]: { vola: 0.75 },
  [M.FUMO]: { veleno: 0.7, vola: 0.55 },
  [M.GHIACCIO]: { indurisce: 0.4 },
  [M.HUMUS]: { fiorisce: 0.85 },
  [M.OSSIDIANA]: { indurisce: 0.6, luce: 0.3 },
  [M.CARBONE]: { tinge: 0.7 },
  [M.METALLO]: { indurisce: 0.65 },
  [M.RUGGINE]: { tinge: 0.85, corrode: 0.5 },
  [M.ZOLFO]: { veleno: 0.75 },
  [M.DIAMANTE]: { luce: 0.85 },
  [M.MUSCHIO]: { appiccica: 0.5 },
  [M.ALGA]: { tinge: 0.75 },
  [M.FUNGO]: { vivo: 0.5, veleno: 0.3 },
  [M.FRUTTO]: { tinge: 0.6, fiorisce: 0.5 },
};

const dotati: (Sostanza | null)[] = [];

/** Il carattere con cui un materiale entra in una miscela nuova: i suoi numeri più la sua dote; null se non si fonde. */
export function perFondere(t: number): Sostanza | null {
  if (t < 0 || t >= N_BASE) return null;
  if (dotati.length === 0) for (let k = 0; k < N_BASE; k++) dotati.push(BASE[k] ? { ...BASE[k]!, ...DOTE[k] } : null);
  return dotati[t];
}

/**
 * I caratteri che un materiale porta con sé (forti abbastanza, in qualsiasi stato): chi dà il nome a una miscela
 * sa così quale carattere viene dalla radice e quale dall'altro genitore.
 */
export function doteDi(t: number): Carattere[] {
  const s = perFondere(t);
  return s ? CARATTERI.filter((c) => margine(s, c) > 0) : [];
}

/**
 * Lo stato del figlio: di solito quello del genitore che conta di più. Ma un gas vince di rado (svanisce), un
 * liquido si fa sentire (bagna quello che tocca), e un solido mescolato a qualcosa che si muove spesso si sbriciola.
 */
function statoFiglio(d: number, o: number, r: () => number): number {
  const tiro = r();
  if (d === o) return tiro < 0.95 ? d : POLVERE;
  if (d === GAS) return tiro < 0.45 ? GAS : o;
  if (o === GAS) return tiro < 0.15 ? GAS : d;
  if (d === LIQUIDO || o === LIQUIDO) return tiro < 0.6 ? LIQUIDO : d === LIQUIDO ? o : d;
  if (d === SOLIDO) return tiro < 0.45 ? SOLIDO : o;
  return tiro < 0.72 ? d : o;
}

/** Due caratteri che non stanno insieme: caldo e gelo, e il cibo con ciò che fa male. */
function contrari(c: Carattere): readonly Carattere[] {
  switch (c) {
    case 'caldo':
      return ['freddo', 'nutre'];
    case 'freddo':
      return ['caldo'];
    case 'veleno':
    case 'corrode':
      return ['nutre'];
    case 'nutre':
      return ['caldo', 'veleno', 'corrode'];
    default:
      return [];
  }
}

/** Il carattere più forte di un genitore che nel figlio, in quello stato, avrebbe un effetto; null se non ne ha. */
function segno(p: Sostanza, stato: number, esclusi: readonly Carattere[]): Carattere | null {
  let meglio: Carattere | null = null;
  let quanto = 0;
  for (const c of CARATTERI) {
    if (esclusi.includes(c) || !funziona(c, stato)) continue;
    const m = margine(p, c);
    if (m > quanto) {
      meglio = c;
      quanto = m;
    }
  }
  return meglio;
}

/** Il figlio prende un carattere: appena sopra la soglia, più su di `quanto` (quanto il genitore la superava). */
function eredita(figlio: Sostanza, c: Carattere, quanto: number): void {
  const sopra = 0.06 + Math.max(0, quanto) * 0.7;
  if (c === 'caldo') figlio.calore = Math.max(figlio.calore, SOGLIA.calore + sopra);
  else if (c === 'freddo') figlio.calore = Math.min(figlio.calore, -SOGLIA.calore - sopra);
  else if (c === 'nutre') {
    // Si mangia solo ciò che non fa male: chi prende il segno del cibo lascia sotto le soglie veleno, corrosione e calore.
    figlio.nutre = stringi(Math.max(figlio.nutre, SOGLIA.nutre + sopra));
    figlio.veleno = Math.min(figlio.veleno, SOGLIA.veleno - 0.1);
    figlio.corrode = Math.min(figlio.corrode, SOGLIA.corrode - 0.1);
    figlio.calore = Math.min(figlio.calore, SOGLIA.calore - 0.1);
  } else figlio[c] = stringi(Math.max(figlio[c], SOGLIA[c] + sopra));
}

/** I caratteri pericolosi spuntano dal nulla più di rado degli altri: un mondo divorato per caso non è divertente. */
const PESO_SORPRESA: Partial<Record<Carattere, number>> = { vivo: 0.3, corrode: 0.3, esplode: 0.4, veleno: 0.6 };

/** Una volta su cinque il figlio ha un carattere che nessuno dei genitori aveva. */
const SORPRESA = 0.2;

/** Lo stato decide qualche numero: un gas è leggerissimo, non vive e non fa presa; un liquido scorre, un solido sta fermo. */
function aggiustaPerLoStato(figlio: Sostanza): void {
  if (figlio.calore > 0.6) figlio.luce = Math.max(figlio.luce, 0.55);
  if (figlio.stato === GAS) {
    // Un gas fertile resta fertile: sfiorando la terra ci lascia i semi (vedi miscele-vive.ts).
    // Un gas è leggero anche se nasce da una pietra: sale e lascia posto, invece di ristagnare tutto in basso.
    figlio.peso = Math.min(0.02 + figlio.peso * 0.15, 0.12);
    figlio.vivo = 0;
    figlio.indurisce = 0;
  } else if (figlio.stato === LIQUIDO) {
    figlio.peso = stringi(figlio.peso, 0.25, 0.95);
    figlio.scorre = Math.max(figlio.scorre, 0.15);
  } else if (figlio.stato === SOLIDO) {
    figlio.scorre = 0;
  }
}

/**
 * Fonde due sostanze in una nuova (`a` e `b` nell'ordine del ricettario; i materiali vanno passati con
 * `perFondere`). Con una miscela d'autore il carattere è quello scritto a mano, e solo i numeri che lei non dice
 * (peso, scorrevolezza, colore) vengono dai genitori.
 */
export function fondi(a: Sostanza, b: Sostanza, id: number, firmata?: Firmata): Sostanza {
  const r = dado(id);
  const forza = (s: Sostanza): number => tratti(s).length;
  const primo = r() < 0.5 + 0.15 * Math.sign(forza(a) - forza(b));
  const d = primo ? a : b;
  const o = primo ? b : a;
  const mischia = (x: number, y: number): number => x * 0.62 + y * 0.38;
  const figlio: Sostanza = {
    stato: statoFiglio(d.stato, o.stato, r),
    colore: [0, 0, 0],
    peso: mischia(d.peso, o.peso),
    scorre: mischia(d.scorre, o.scorre),
    calore: 0,
    brucia: 0,
    luce: 0,
    fertile: 0,
    vivo: 0,
    veleno: 0,
    nutre: 0,
    esplode: 0,
    corrode: 0,
    vola: 0,
    appiccica: 0,
    fiorisce: 0,
    tinge: 0,
    indurisce: 0,
    piove: 0,
    radice: d.radice,
  };
  for (const k of TRATTI) {
    const v = mischia(d[k], o[k]) + (r() - 0.5) * 0.1;
    figlio[k] = k === 'calore' ? stringi(v, -1) : stringi(v);
  }
  // Il segno del genitore che conta di più, poi quello dell'altro, se non va contro il primo (caldo e gelo no).
  const daD = segno(d, figlio.stato, []);
  if (daD) eredita(figlio, daD, margine(d, daD));
  const daO = segno(o, figlio.stato, daD ? [daD, ...contrari(daD)] : []);
  if (daO) eredita(figlio, daO, margine(o, daO));
  if (r() < SORPRESA) {
    const presi = tratti(figlio);
    const possibili = CARATTERI.filter((c) => funziona(c, figlio.stato) && !presi.includes(c) && !presi.some((p) => contrari(p).includes(c)));
    let totale = 0;
    for (const c of possibili) totale += PESO_SORPRESA[c] ?? 1;
    let tiro = r() * totale;
    for (const c of possibili) {
      tiro -= PESO_SORPRESA[c] ?? 1;
      if (tiro > 0) continue;
      // Appena sopra la soglia: la sorpresa si vede, ma il nome racconta prima quello che viene dai genitori.
      eredita(figlio, c, r() * 0.1);
      break;
    }
  }
  if (firmata) scriviAMano(figlio, firmata);
  aggiustaPerLoStato(figlio);
  // Nessuna miscela è anonima: se non ha preso nessun carattere (i genitori non ne avevano per quello stato), gliene
  // tocca uno in sorte tra quelli che in quello stato funzionano.
  if (tratti(figlio).length === 0) {
    const possibili = CARATTERI.filter((c) => funziona(c, figlio.stato) && c !== 'vivo' && c !== 'esplode' && c !== 'corrode');
    eredita(figlio, possibili[(r() * possibili.length) | 0], 0.1 + r() * 0.3);
  }
  const colore = firmata?.carattere.colore;
  figlio.colore = colore ? [colore[0], colore[1], colore[2]] : coloreFiglio(d, o, figlio, r, 0.62);
  return figlio;
}

/** Una miscela d'autore: tutti i caratteri sotto le soglie, poi quelli scritti a mano. */
function scriviAMano(figlio: Sostanza, firmata: Firmata): void {
  for (const k of TRATTI) {
    if (k === 'calore') figlio.calore = stringi(figlio.calore, -SOGLIA.calore + 0.1, SOGLIA.calore - 0.1);
    else figlio[k] = Math.min(figlio[k], SOGLIA[k] - 0.15);
  }
  // Il colore scritto a mano (se c'è) lo mette `fondi` alla fine, come quello generato.
  Object.assign(figlio, firmata.carattere);
}
