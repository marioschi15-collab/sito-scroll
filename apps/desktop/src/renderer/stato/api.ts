import type { ApiSpalla } from '../../ipc/contratto.js';

/**
 * Unico punto di accesso a `window.spalla` (esposto dal preload con contextBridge).
 * Il renderer non tocca nient'altro: niente Node, niente rete, niente percorsi assoluti.
 */
export function spalla(): ApiSpalla {
  const api = (globalThis as { spalla?: ApiSpalla }).spalla ?? (typeof window !== 'undefined' ? window.spalla : undefined);
  if (!api) throw new Error('window.spalla non disponibile');
  return api;
}

export function spallaDisponibile(): boolean {
  return typeof window !== 'undefined' && Boolean(window.spalla);
}

/**
 * Estensione facoltativa del contratto per gli allegati trascinati nella finestra: se il preload la espone
 * (`window.spalla.allegati.aggiungi`), la usiamo; altrimenti la chat mostra un avviso. Non è in contratto.ts.
 */
export interface ApiAllegati {
  aggiungi(file: File[]): Promise<string[]>;
}

export function apiAllegati(): ApiAllegati | undefined {
  const api = spalla() as ApiSpalla & { allegati?: Partial<ApiAllegati> };
  return api.allegati && typeof api.allegati.aggiungi === 'function' ? (api.allegati as ApiAllegati) : undefined;
}

/** Id casuale per gli scambi (uuid se il browser lo offre). */
export function nuovoId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Messaggio in italiano da un errore qualunque (mai lo stack verso l'utente). */
export function messaggioErrore(errore: unknown, predefinito: string): string {
  if (errore instanceof Error && errore.message && !/^Error invoking remote method/i.test(errore.message)) return errore.message;
  return predefinito;
}
