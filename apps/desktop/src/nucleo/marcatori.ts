import { MARCATORI_APP } from '@spalla/schema';

/** I marcatori che l'assistente scrive da soli su una riga per chiedere qualcosa all'app (docs/05 S7). */
export const MARCATORI_PREDEFINITI: readonly string[] = [MARCATORI_APP.APRI_TELEGRAM, MARCATORI_APP.FINE_PROFILO];

/**
 * Toglie i marcatori dal testo prima che arrivi all'utente e ricorda quali ha incontrato.
 * Funziona anche in streaming: un frammento che finisce con un pezzo di marcatore ("[[APRI:TE") viene
 * trattenuto finché il frammento seguente non dice se era davvero un marcatore.
 */
export interface FiltroMarcatori {
  /** Un frammento in streaming (parziale: true): restituisce ciò che si può mostrare subito. */
  frammento(testo: string): string;
  /** Il testo trattenuto, da mostrare a fine blocco. */
  svuota(): string;
  /** Un blocco completo (parziale: false): tolti i marcatori e la loro riga. */
  completo(testo: string): string;
  /** Marcatori incontrati finora, in ordine e senza doppioni. */
  trovati(): string[];
}

function scappa(testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Il suffisso più lungo di `testo` che è l'inizio (non completo) di uno dei marcatori. */
function codaSospetta(testo: string, marcatori: readonly string[]): number {
  const massimo = Math.max(0, ...marcatori.map((m) => m.length - 1));
  for (let k = Math.min(massimo, testo.length); k > 0; k--) {
    const coda = testo.slice(-k);
    if (marcatori.some((m) => m.startsWith(coda))) return k;
  }
  return 0;
}

export function creaFiltroMarcatori(marcatori: readonly string[] = MARCATORI_PREDEFINITI): FiltroMarcatori {
  const visti: string[] = [];
  let trattenuto = '';
  const regexRiga = marcatori.map((m) => new RegExp(`^[ \\t]*${scappa(m)}[ \\t]*(?:\\r?\\n)?`, 'gm'));
  const regexNudo = marcatori.map((m) => new RegExp(scappa(m), 'g'));

  function segna(marcatore: string): void {
    if (!visti.includes(marcatore)) visti.push(marcatore);
  }

  /** Toglie ogni marcatore completo (con l'a capo che lo segue, se c'è) e lo registra. */
  function togli(testo: string): string {
    let esito = testo;
    marcatori.forEach((m, i) => {
      if (!esito.includes(m)) return;
      segna(m);
      esito = esito.replace(regexRiga[i] as RegExp, '').replace(regexNudo[i] as RegExp, '');
    });
    return esito;
  }

  return {
    frammento(testo) {
      const insieme = togli(trattenuto + testo);
      const coda = codaSospetta(insieme, marcatori);
      trattenuto = coda > 0 ? insieme.slice(-coda) : '';
      return coda > 0 ? insieme.slice(0, -coda) : insieme;
    },
    svuota() {
      const resto = togli(trattenuto);
      trattenuto = '';
      return resto;
    },
    completo(testo) {
      return togli(testo);
    },
    trovati() {
      return [...visti];
    },
  };
}
