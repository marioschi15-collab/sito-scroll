import fs from 'node:fs';
import type { Logger } from '../contratti.js';

export type ModoOsservazione = 'fs.watch' | 'polling' | 'fermo';

export interface OpzioniOsservatore {
  /** Cartelle assolute da osservare (create se mancano). */
  cartelle: string[];
  /** Chiamata, dopo il debounce, quando qualcosa è cambiato: chi ascolta decide cosa re-indicizzare. */
  suCambiamento: () => void;
  logger: Logger;
  /** Attesa dopo l'ultimo evento prima di avvisare (gli editor salvano in più passi). */
  debounceMs?: number;
  /** Intervallo del polling quando fs.watch non è disponibile. */
  intervalloPollingMs?: number;
  /** Forza il polling (test, cartelle di rete). */
  forzaPolling?: boolean;
}

export interface Osservatore {
  avvia(): void;
  ferma(): void;
  modo(): ModoOsservazione;
}

export const DEBOUNCE_PREDEFINITO_MS = 400;
export const POLLING_PREDEFINITO_MS = 5000;

/**
 * Osserva le cartelle con fs.watch ricorsivo (macOS, Windows, Linux con Node ≥ 20); se non è disponibile
 * o si rompe, passa al polling. Gli eventi sono solo un "qualcosa è cambiato": la sincronizzazione confronta date e
 * dimensioni, quindi non serve sapere quale file.
 */
export function creaOsservatore(opzioni: OpzioniOsservatore): Osservatore {
  const { cartelle, suCambiamento, logger } = opzioni;
  const debounceMs = opzioni.debounceMs ?? DEBOUNCE_PREDEFINITO_MS;
  const intervalloPollingMs = opzioni.intervalloPollingMs ?? POLLING_PREDEFINITO_MS;
  let watchers: fs.FSWatcher[] = [];
  let polling: NodeJS.Timeout | undefined;
  let debounce: NodeJS.Timeout | undefined;
  let modo: ModoOsservazione = 'fermo';

  function avvisa(): void {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      debounce = undefined;
      try {
        suCambiamento();
      } catch (errore) {
        logger.errore('memoria.osservatore_errore', { errore: errore instanceof Error ? errore.message : String(errore) });
      }
    }, debounceMs);
  }

  function chiudiWatchers(): void {
    for (const w of watchers) {
      try {
        w.close();
      } catch {
        // già chiuso
      }
    }
    watchers = [];
  }

  function avviaPolling(motivo: string): void {
    chiudiWatchers();
    if (polling) return;
    modo = 'polling';
    polling = setInterval(() => avvisa(), intervalloPollingMs);
    polling.unref();
    logger.info('memoria.osservatore_avviato', { modo, intervalloMs: intervalloPollingMs, motivo });
  }

  function avviaWatch(): boolean {
    try {
      for (const cartella of cartelle) {
        const w = fs.watch(cartella, { recursive: true, persistent: false }, () => avvisa());
        w.on('error', (errore) => {
          logger.avviso('memoria.osservatore_caduto', { errore: errore.message });
          avviaPolling('errore di fs.watch');
        });
        watchers.push(w);
      }
      modo = 'fs.watch';
      logger.info('memoria.osservatore_avviato', { modo, cartelle: cartelle.length });
      return true;
    } catch (errore) {
      chiudiWatchers();
      logger.avviso('memoria.osservatore_non_disponibile', { errore: errore instanceof Error ? errore.message : String(errore) });
      return false;
    }
  }

  return {
    avvia() {
      if (modo !== 'fermo') return;
      for (const cartella of cartelle) fs.mkdirSync(cartella, { recursive: true });
      if (opzioni.forzaPolling || !avviaWatch()) avviaPolling(opzioni.forzaPolling ? 'richiesto' : 'fs.watch non disponibile');
    },

    ferma() {
      chiudiWatchers();
      if (polling) {
        clearInterval(polling);
        polling = undefined;
      }
      if (debounce) {
        clearTimeout(debounce);
        debounce = undefined;
      }
      modo = 'fermo';
    },

    modo: () => modo,
  };
}
