import type { z } from 'zod';

/** Errore di validazione con i problemi in italiano, uno per riga, pronti per l'utente o per il log. */
export class ErroreSchema extends Error {
  readonly problemi: readonly string[];
  constructor(contesto: string, problemi: readonly string[]) {
    super(`${contesto}: ${problemi.join('; ')}`);
    this.name = 'ErroreSchema';
    this.problemi = problemi;
  }
}

/** Trasforma gli errori zod in righe "percorso: messaggio" (il messaggio è già in italiano: vedi index.ts). */
export function formattaProblemi(errore: z.ZodError): string[] {
  return errore.issues.map((i) => {
    const percorso = i.path.length ? i.path.map(String).join('.') : '(radice)';
    return `${percorso}: ${i.message}`;
  });
}

/** Esito "sicuro" di un parse, senza eccezioni. */
export type Esito<T> = { ok: true; valore: T } | { ok: false; problemi: string[] };
