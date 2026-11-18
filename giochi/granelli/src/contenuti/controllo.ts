import { LETTERE } from '../disegno/tavolozza.js';
import { chiaveCoppia } from '../motore/cose.js';
import { esitoNoto, fenomenoDi } from '../motore/esiti.js';
import { N_BASE } from '../motore/materiali.js';
import { COPPIE } from '../motore/ricette.js';
import { FAMIGLIE } from './famiglie.js';
import { PRIMO_NUOVO } from './numeri.js';
import {
  INIZIALI,
  conseguenze,
  eNuova,
  idDi,
  ingombroDi,
  numeri,
  numeroDaArticolo,
  paesaggi,
  problemi,
  schede,
  unioneDi,
  unioni,
  voce,
  voci,
} from './registro.js';
import type { Scheda } from './scheda.js';

/**
 * Il controllo automatico delle scoperte: si fa con `node strumenti/contenuti.cjs` (anche `--file <nome>` per un
 * file solo) e con le prove (test/contenuti.test.ts). Dice se qualcosa non si raggiunge dai quattro elementi, se una
 * coppia ha due esiti, se una scheda è scritta male, e dove una voce non serve a farne altre (un vicolo cieco).
 */

export interface Rapporto {
  /** Cose da correggere: con un errore la prova fallisce. */
  errori: string[];
  /** Cose da sapere: i vicoli ciechi delle voci di prima, che la grande infornata porterà a zero. */
  avvisi: string[];
  /** Quante voci, schede e unioni scritte ci sono, e in quali file. */
  conti: { voci: number; schede: number; unioni: number; file: string[] };
}

export interface Opzioni {
  /** Controlla soltanto le schede di questo file; le chiavi di numeri.ts ancora senza scheda contano come esistenti. */
  file?: string;
}

const TIPI = new Set(['oggetto', 'costruzione', 'creatura', 'mestiere', 'idea', 'luogo', 'fenomeno', 'evento', 'era']);
const EFFETTI = new Set(['pioggia', 'neve', 'vento', 'lampi', 'scossa', 'luce']);
const MOVIMENTI = new Set(['cammina', 'vola', 'nuota', 'sta']);
const ARTICOLI = new Set(['il', 'lo', 'la', 'l', 'i', 'gli', 'le']);
// «api» non c'è apposta: in italiano sono le api del miele, e una scheda le può nominare.
const GERGO = /\b(agente|prompt|token|bug|sprite|render|mestolo)\b/i;
const CHIAVE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Quante volte, almeno, una scheda nuova entra in un'unione come ingrediente. */
const USI_MINIMI = 2;

/** Vero se una figura o un'icona usa solo lettere della tavolozza, ha almeno un quadretto pieno e righe non vuote. */
function disegnoBuono(righe: readonly string[]): boolean {
  if (righe.length === 0 || righe.some((r) => r.length === 0)) return false;
  let pieni = 0;
  for (const r of righe) {
    for (const c of r) {
      if (c === '.') continue;
      if (!LETTERE.has(c)) return false;
      pieni++;
    }
  }
  return pieni > 0;
}

/** Gli errori di scrittura di una scheda presa da sola. `esiste` dice se una chiave usata in un'unione c'è. */
function controllaScheda(s: Scheda, file: string, esiste: (chiave: string) => boolean): string[] {
  const e: string[] = [];
  const chi = `«${s.nome || s.chiave}» (${file})`;
  if (!CHIAVE.test(s.chiave)) e.push(`${chi}: la chiave «${s.chiave}» deve essere fatta di lettere minuscole, numeri e trattini.`);
  if (!s.nome.trim()) e.push(`${chi}: manca il nome.`);
  if (!s.indizio.trim()) e.push(`${chi}: manca l'indizio.`);
  if (!/[.!?…]$/.test(s.descrizione.trim())) e.push(`${chi}: la descrizione manca o non finisce con il punto.`);
  for (const testo of [s.nome, s.indizio, s.descrizione, s.sapevi ?? '']) if (GERGO.test(testo)) e.push(`${chi}: c'è una parola da tecnici in «${testo}».`);
  if (s.genere !== 'm' && s.genere !== 'f') e.push(`${chi}: il genere è «m» o «f».`);
  if (!ARTICOLI.has(s.articolo)) e.push(`${chi}: l'articolo «${s.articolo}» non si conosce.`);
  else {
    if (numeroDaArticolo(s.articolo) !== s.numero) e.push(`${chi}: articolo «${s.articolo}» e numero «${s.numero}» non vanno d'accordo.`);
    const maschile = s.articolo === 'il' || s.articolo === 'lo' || s.articolo === 'i' || s.articolo === 'gli';
    const femminile = s.articolo === 'la' || s.articolo === 'le';
    if ((maschile && s.genere !== 'm') || (femminile && s.genere !== 'f')) e.push(`${chi}: articolo «${s.articolo}» e genere «${s.genere}» non vanno d'accordo.`);
  }
  if (!FAMIGLIE.some(([f]) => f === s.famiglia)) e.push(`${chi}: la famiglia «${s.famiglia}» non è un capitolo del Libro (famiglie.ts).`);
  if (s.tipo === 'materia') e.push(`${chi}: una scheda non può essere materia (i granelli li sa fare solo il motore).`);
  else if (!TIPI.has(s.tipo)) e.push(`${chi}: il tipo «${s.tipo}» non si conosce.`);

  const conFigura = s.tipo === 'costruzione' && s.figura !== undefined;
  if (s.icona === undefined && !conFigura) e.push(`${chi}: manca l'icona.`);
  if (s.icona !== undefined && (s.icona.length !== 12 || s.icona.some((r) => r.length !== 12) || !disegnoBuono(s.icona))) {
    e.push(`${chi}: l'icona deve essere di 12 righe da 12 quadretti, con le lettere della tavolozza.`);
  }
  if (s.tipo === 'costruzione' && s.figura === undefined) e.push(`${chi}: una costruzione ha bisogno della sua figura.`);
  if (s.figura !== undefined && !disegnoBuono(s.figura)) e.push(`${chi}: la figura usa lettere che la tavolozza non ha, o è vuota.`);
  if (s.aGalla && s.tipo !== 'costruzione') e.push(`${chi}: solo una costruzione sta a galla.`);
  if (s.tipo === 'creatura' && s.figura === undefined) e.push(`${chi}: una creatura ha bisogno della sua figura, per muoversi nel mondo.`);
  if (s.altraPosa !== undefined) {
    if (s.tipo !== 'creatura') e.push(`${chi}: «altraPosa» serve solo alle creature.`);
    const stessa = s.figura !== undefined && s.altraPosa.length === s.figura.length && s.altraPosa.every((r, k) => r.length === s.figura![k].length);
    if (!stessa || !disegnoBuono(s.altraPosa)) e.push(`${chi}: «altraPosa» deve essere grande come la figura, con le lettere della tavolozza.`);
  }
  if (s.segno !== undefined) {
    if (s.tipo !== 'mestiere') e.push(`${chi}: «segno» serve solo ai mestieri.`);
    if (s.segno.length > 7 || s.segno.some((r) => r.length > 6) || !disegnoBuono(s.segno)) e.push(`${chi}: il segno è al più di 7 righe da 6 quadretti, con le lettere della tavolozza.`);
  }
  if ((s.tipo === 'creatura') !== (s.muove !== undefined)) e.push(`${chi}: «muove» va scritto per le creature, e solo per loro.`);
  if (s.muove !== undefined && !MOVIMENTI.has(s.muove)) e.push(`${chi}: «muove» non può essere «${s.muove}».`);
  if ((s.tipo === 'evento') !== (s.evento !== undefined)) e.push(`${chi}: ogni evento dice il suo effetto («evento»), e solo gli eventi.`);
  if (s.evento !== undefined && !EFFETTI.has(s.evento)) e.push(`${chi}: l'effetto «${s.evento}» non c'è.`);
  if (s.tipo === 'era' && s.arrivaCon === undefined) e.push(`${chi}: un'era arriva con qualcosa («arrivaCon»).`);
  if (s.dopo !== undefined && s.tipo !== 'era') e.push(`${chi}: «dopo» serve solo alle ere.`);
  if (s.siVede !== undefined) {
    if (s.tipo !== 'luogo' && s.tipo !== 'fenomeno') e.push(`${chi}: «siVede» serve solo a luoghi e fenomeni.`);
    if (!(s.siVede.quante > 0)) e.push(`${chi}: «siVede» vuole un numero di celle più grande di zero.`);
  }
  for (const chiave of [s.arrivaCon, s.dopo]) if (chiave !== undefined && !esiste(chiave)) e.push(`${chi}: la chiave «${chiave}» non c'è.`);
  // Un paesaggio si può vedere anche con un materiale che non è una voce del Libro (la brace, la roccia): basta il numero.
  if (s.siVede !== undefined && idDi(s.siVede.materiale) < 0) e.push(`${chi}: la chiave «${s.siVede.materiale}» non c'è.`);
  if (s.unioni.length === 0 && s.arrivaCon === undefined && s.siVede === undefined) e.push(`${chi}: non dice da cosa nasce (nessuna unione).`);
  for (const [a, b] of s.unioni) {
    if (a === b) e.push(`${chi}: la coppia ${a} + ${b} unisce una cosa con sé stessa.`);
    if (a === s.chiave || b === s.chiave) e.push(`${chi}: la coppia ${a} + ${b} usa la scheda stessa.`);
    for (const k of [a, b]) if (!esiste(k)) e.push(`${chi}: la coppia ${a} + ${b} usa «${k}», che non c'è.`);
  }
  return e;
}

/** Le vie dei fenomeni scritte nelle schede, con i numeri: [a, b, fenomeno]. */
function vieDeiFenomeni(): [number, number, number][] {
  const vie: [number, number, number][] = [];
  for (const [, s] of schede()) {
    if (s.tipo !== 'fenomeno') continue;
    for (const [a, b] of s.unioni) vie.push([idDi(a), idDi(b), idDi(s.chiave)]);
  }
  return vie.filter(([a, b, r]) => a >= 0 && b >= 0 && r >= 0);
}

/**
 * Le voci che si raggiungono partendo dai quattro elementi: con le vie del Libro (anche quelle che il mondo fa da
 * sé, come la pietra dalla lava), le unioni scritte, le reazioni del mondo, le vie dei fenomeni, le conseguenze
 * (le ere) e i paesaggi. `anche` sono numeri che contano come già raggiunti.
 */
function raggiungibili(anche: Iterable<number>): Set<number> {
  // I materiali che il mondo fa da sé e che non sono voci del Libro (la brace di ciò che brucia, la roccia del
  // terreno) ci sono sempre: un paesaggio può nascere da loro.
  const delMondo = numeri()
    .map(([, n]) => n)
    .filter((n) => n < N_BASE && voce(n) === undefined);
  const preso = new Set<number>([...INIZIALI, ...delMondo, ...anche]);
  const fenomeni = vieDeiFenomeni();
  for (let mosse = true; mosse; ) {
    mosse = false;
    const prendi = (id: number): void => {
      if (id <= 0 || preso.has(id)) return;
      preso.add(id);
      mosse = true;
    };
    for (const v of voci()) {
      // Le vie delle voci di prima, anche quelle a un ingrediente solo «col tempo» o «in gran quantità».
      if (v.file === undefined && v.nasce.some((via) => via.con.length > 0 && via.con.every((id) => preso.has(id)))) prendi(v.id);
    }
    for (const [a, b, r] of unioni()) if (preso.has(a) && preso.has(b)) prendi(r);
    for (const [a, b, r] of fenomeni) if (preso.has(a) && preso.has(b)) prendi(r);
    for (const [a, b, primo, secondo] of COPPIE) {
      if (!preso.has(a) || !preso.has(b)) continue;
      prendi(primo);
      prendi(secondo);
    }
    for (const [quando, allora] of conseguenze()) if (preso.has(quando)) prendi(allora);
    for (const [id, materiale] of paesaggi()) if (preso.has(materiale)) prendi(id);
  }
  return preso;
}

/** Il controllo: tutto il Libro, oppure le schede di un file solo. */
export function controlla(opzioni: Opzioni = {}): Rapporto {
  const errori: string[] = [];
  const avvisi: string[] = [];
  const file = opzioni.file;
  const tutte = schede();
  const nomiFile = [...new Set(tutte.map(([f]) => f))];
  if (file !== undefined && !nomiFile.includes(file)) errori.push(`Non c'è un file di schede che si chiama «${file}» (indice.ts).`);
  const nome = (id: number): string => voce(id)?.nome ?? String(id);

  // ── I numeri: unici, e quelli nuovi solo in coda ──
  const chiaviViste = new Set<string>();
  const numeriVisti = new Set<number>();
  let ultimo = -1;
  let nuovi = false;
  for (const [chiave, n] of numeri()) {
    if (chiaviViste.has(chiave)) errori.push(`In numeri.ts la chiave «${chiave}» c'è due volte.`);
    if (numeriVisti.has(n)) errori.push(`In numeri.ts il numero ${n} è dato a due chiavi.`);
    if (!CHIAVE.test(chiave)) errori.push(`In numeri.ts la chiave «${chiave}» deve essere fatta di lettere minuscole, numeri e trattini.`);
    if (n >= PRIMO_NUOVO) {
      if (n <= ultimo) errori.push(`In numeri.ts il numero ${n} («${chiave}») non è in coda: i numeri nuovi crescono sempre.`);
      nuovi = true;
    } else if (nuovi) errori.push(`In numeri.ts «${chiave}» ha un numero di prima (${n}) dopo quelli nuovi.`);
    ultimo = Math.max(ultimo, n);
    chiaviViste.add(chiave);
    numeriVisti.add(n);
  }
  for (const p of problemi()) errori.push(p);

  // ── Le schede, una per una ──
  // Con un file solo, le chiavi già date in numeri.ts ma ancora senza scheda (le scrive qualcun altro) esistono.
  const esiste = (chiave: string): boolean => (file === undefined ? voce(idDi(chiave)) !== undefined : idDi(chiave) >= 0);
  const mie = tutte.filter(([f]) => file === undefined || f === file);
  for (const [f, s] of mie) errori.push(...controllaScheda(s, f, esiste));

  // ── Nomi unici in tutto il Libro ──
  const nomi = new Map<string, string>();
  for (const v of voci()) {
    const k = v.nome.trim().toLowerCase();
    if (nomi.has(k)) errori.push(`Il nome «${v.nome}» c'è due volte (${nomi.get(k)} e ${v.chiave}).`);
    else nomi.set(k, v.chiave);
  }

  // ── Coppie: una coppia, un esito solo ──
  const perCoppia = new Map<number, number[]>();
  for (const [a, b, r] of unioni()) {
    const k = chiaveCoppia(a, b);
    perCoppia.set(k, [...(perCoppia.get(k) ?? []), r]);
  }
  for (const [k, esiti] of perCoppia) {
    if (esiti.length < 2) continue;
    const a = Math.floor(k / 65536);
    const b = k % 65536;
    errori.push(`La coppia ${nome(a)} + ${nome(b)} è scritta ${esiti.length} volte (${esiti.map(nome).join(', ')}).`);
  }
  for (const [f, s] of mie) {
    const id = idDi(s.chiave);
    for (const [ka, kb] of s.unioni) {
      const a = idDi(ka);
      const b = idDi(kb);
      if (a < 0 || b < 0) continue;
      const coppia = `${ka} + ${kb} (${s.nome}, ${f})`;
      const reazione = a < 256 && b < 256 && COPPIE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
      if (esitoNoto(a, b) >= 0 || reazione) errori.push(`La coppia ${coppia} è già una reazione del mondo (${nome(esitoNoto(a, b))}).`);
      if (s.tipo === 'fenomeno') {
        if (unioneDi(a, b) >= 0) errori.push(`La coppia ${coppia} è già l'unione di ${nome(unioneDi(a, b))}.`);
        if (fenomenoDi(a, b) !== id) errori.push(`La coppia ${coppia} è già la via di ${nome(fenomenoDi(a, b))}.`);
      } else if (fenomenoDi(a, b) >= 0) errori.push(`La coppia ${coppia} è già la via di ${nome(fenomenoDi(a, b))}, che succede nel mondo.`);
    }
  }

  // ── Raggiungibili dai quattro elementi ──
  const senzaScheda = file === undefined ? [] : numeri().map(([, n]) => n).filter((n) => voce(n) === undefined);
  const preso = raggiungibili(senzaScheda);
  for (const v of voci()) {
    if (file !== undefined && v.file !== file) continue;
    if (!preso.has(v.id)) errori.push(`«${v.nome}» non si raggiunge partendo dai quattro elementi.`);
  }

  // ── Vicoli ciechi: ogni scheda nuova serve a farne altre ──
  const usi = new Map<number, number>();
  const usiNelFile = new Map<number, number>();
  const conta = (m: Map<number, number>, id: number): void => {
    m.set(id, (m.get(id) ?? 0) + 1);
  };
  for (const [a, b] of unioni()) {
    conta(usi, a);
    conta(usi, b);
  }
  for (const [a, b] of vieDeiFenomeni()) {
    conta(usi, a);
    conta(usi, b);
  }
  for (const [f, s] of tutte) {
    if (f !== file) continue;
    for (const [a, b] of s.unioni) {
      conta(usiNelFile, idDi(a));
      conta(usiNelFile, idDi(b));
    }
  }
  const ciechi: string[] = [];
  for (const v of voci()) {
    if (v.finale || v.tipo === 'era') continue;
    const n = usi.get(v.id) ?? 0;
    if (!eNuova(v.id)) {
      if (n < USI_MINIMI && file === undefined) ciechi.push(v.nome);
      continue;
    }
    if (file === undefined && n < USI_MINIMI) {
      const quante = n === 0 ? 'in nessuna unione' : n === 1 ? 'in una sola unione' : `in ${n} unioni`;
      errori.push(`«${v.nome}» entra ${quante} come ingrediente: ne servono almeno ${USI_MINIMI} (o la si segna «finale»).`);
    }
    if (file !== undefined && v.file === file && (usiNelFile.get(v.id) ?? 0) < 1) {
      errori.push(`«${v.nome}» non entra in nessuna unione del suo file (${file}) come ingrediente.`);
    }
  }
  if (ciechi.length > 0) {
    avvisi.push(`Voci di prima che entrano in meno di ${USI_MINIMI} unioni scritte (${ciechi.length}): ${ciechi.join(', ')}.`);
  }

  // ── Le costruzioni hanno un ingombro, le voci della tavolozza si posano o si versano ──
  for (const v of voci()) {
    if (v.tipo === 'costruzione' && ingombroDi(v.id) === undefined) errori.push(`La costruzione «${v.nome}» non ha un ingombro: nel mondo non si potrebbe posare.`);
    if (v.id < N_BASE && v.tipo !== 'materia') errori.push(`«${v.nome}» è un materiale, ma il suo tipo è «${v.tipo}».`);
  }

  return {
    errori,
    avvisi,
    conti: { voci: voci().length, schede: tutte.length, unioni: unioni().length, file: nomiFile },
  };
}
