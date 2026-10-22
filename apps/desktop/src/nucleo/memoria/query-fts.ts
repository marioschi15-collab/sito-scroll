/**
 * Dalla domanda dell'utente (o dell'assistente) a un'espressione MATCH di FTS5 sicura.
 * Ogni parola diventa una frase tra virgolette: la sintassi di FTS5 (parentesi, due punti, asterischi, NEAR)
 * non può arrivare al motore. Gli accenti li normalizza il tokenizer unicode61 (remove_diacritics) da entrambe le parti.
 *
 * Operatori riconosciuti nella domanda: AND / OR / NOT in maiuscolo, "-parola" per escludere, "frase tra virgolette".
 */
export interface EspressioniFts {
  /** Tutte le parole devono esserci (AND): precisione. */
  stretta: string;
  /** Basta una parola, con prefisso sulle parole lunghe (OR): richiamo. Uguale a `stretta` se la domanda usa operatori espliciti. */
  larga: string;
  /** Le parole positive, per i test e i contatori (mai nei log). */
  termini: string[];
}

const MASSIMO_TERMINI = 16;
const LUNGHEZZA_MASSIMA_TOKEN = 64;
const LUNGHEZZA_MINIMA_PREFISSO = 4;

type Operatore = 'AND' | 'OR';
interface Termine {
  token: string[];
  frase: boolean;
  negato: boolean;
  /** Operatore scritto dall'utente prima di questo termine, se c'è. */
  operatorePrima?: Operatore;
}

/** Parole fatte solo di lettere e cifre Unicode (come fa unicode61), senza punteggiatura né apostrofi. */
export function tokenizza(testo: string): string[] {
  return testo
    .normalize('NFC')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0 && t.length <= LUNGHEZZA_MASSIMA_TOKEN);
}

export function espressioniFts(query: string): EspressioniFts | null {
  const testo = query.normalize('NFC').replace(/[“”„«»]/g, '"').replace(/[‘’]/g, "'");
  const termini: Termine[] = [];
  let operatoreInSospeso: Operatore | undefined;
  let negaProssimo = false;

  const aggiungi = (token: string[], frase: boolean, negato: boolean) => {
    if (token.length === 0) return;
    const termine: Termine = { token, frase, negato };
    if (!negato && operatoreInSospeso) termine.operatorePrima = operatoreInSospeso;
    termini.push(termine);
    operatoreInSospeso = undefined;
  };

  const pezzi = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = pezzi.exec(testo)) !== null) {
    if (m[1] !== undefined) {
      const token = tokenizza(m[1]);
      aggiungi(token, token.length > 1, negaProssimo);
      negaProssimo = false;
      continue;
    }
    const parola = m[2]!;
    if (parola === 'AND' || parola === 'OR') {
      operatoreInSospeso = parola;
      continue;
    }
    if (parola === 'NOT') {
      negaProssimo = true;
      continue;
    }
    let negato = negaProssimo;
    negaProssimo = false;
    let grezza = parola;
    if (grezza.startsWith('-') && grezza.length > 1) {
      negato = true;
      grezza = grezza.slice(1);
    }
    for (const t of tokenizza(grezza)) aggiungi([t], false, negato);
  }

  const positivi = termini.filter((t) => !t.negato).slice(0, MASSIMO_TERMINI);
  const negativi = termini.filter((t) => t.negato).slice(0, MASSIMO_TERMINI);
  if (positivi.length === 0) return null;

  const esclusioni = negativi.map((n) => ` NOT ${frase(n.token)}`).join('');
  return {
    stretta: `(${componi(positivi, 'AND', false)})${esclusioni}`,
    larga: `(${componi(positivi, 'OR', true)})${esclusioni}`,
    termini: positivi.flatMap((t) => t.token),
  };
}

function componi(termini: Termine[], predefinito: Operatore, conPrefisso: boolean): string {
  return termini
    .map((t, i) => {
      const operatore = i === 0 ? '' : ` ${t.operatorePrima ?? predefinito} `;
      const prefisso = conPrefisso && !t.frase && (t.token[0]?.length ?? 0) >= LUNGHEZZA_MINIMA_PREFISSO ? '*' : '';
      return `${operatore}${frase(t.token)}${prefisso}`;
    })
    .join('');
}

/** Frase FTS5: le parole non contengono virgolette (vedi tokenizza), quindi basta racchiuderle. */
function frase(token: string[]): string {
  return `"${token.join(' ')}"`;
}
