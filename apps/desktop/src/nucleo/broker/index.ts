import type { Broker, Canale, CanaleConferme, DecisionePermesso, Logger, RichiestaPermesso } from '../contratti.js';
import { descriviRichiesta } from './descrizioni.js';
import { generaIdRichiesta } from './id-richiesta.js';
import { testiBroker } from './testi.js';

export { descriviRichiesta, percorsoLeggibile, soggetto } from './descrizioni.js';
export type { DescrizioneRichiesta } from './descrizioni.js';
export { generaIdRichiesta } from './id-richiesta.js';

export interface OpzioniBroker {
  logger: Logger;
  /** Attesa massima per una decisione; poi nega (docs/02 §6: 10 minuti). */
  timeoutMs?: number;
  /** Dopo quanto il desktop è "inattivo" e le conferme vanno su Telegram (docs/02 §6: 5 minuti). */
  inattivitaDesktopMs?: number;
  /** Orologio iniettabile per i test (ms epoch). */
  adesso?: () => number;
}

/** Broker con qualche metodo in più per interfacce e diagnostica. */
export interface BrokerEsteso extends Broker {
  /** Richieste ancora in attesa di una decisione. */
  inAttesa(): RichiestaPermesso[];
  /** Id nuovo, unico tra quelli in attesa. */
  nuovoId(): string;
  /** Quale canale riceverebbe ora una richiesta nata su `origine` (utile per i test e per lo stato). */
  canalePer(origine: Canale): Canale | undefined;
}

export const TIMEOUT_PERMESSO_MS = 10 * 60 * 1000;
export const INATTIVITA_DESKTOP_MS = 5 * 60 * 1000;

/**
 * Permission Broker (docs/02 §6, ADR-013): trasforma una richiesta di `canUseTool` in una domanda
 * in italiano sul canale giusto e restituisce consenti/nega. Mai `bypass`: in dubbio, nega.
 */
export function creaBroker(opzioni: OpzioniBroker): BrokerEsteso {
  const { logger } = opzioni;
  const timeoutMs = opzioni.timeoutMs ?? TIMEOUT_PERMESSO_MS;
  const inattivitaMs = opzioni.inattivitaDesktopMs ?? INATTIVITA_DESKTOP_MS;
  const adesso = opzioni.adesso ?? (() => Date.now());

  const canali = new Map<Canale, CanaleConferme>();
  const ultimaAttivita = new Map<Canale, number>();
  const pendenti = new Map<string, RichiestaPermesso>();

  function desktopAttivo(): boolean {
    const desktop = canali.get('desktop');
    if (!desktop || !desktop.disponibile()) return false;
    const ultima = ultimaAttivita.get('desktop');
    return ultima !== undefined && adesso() - ultima < inattivitaMs;
  }

  function scegliCanale(origine: Canale): CanaleConferme | undefined {
    const telegram = canali.get('telegram');
    const desktop = canali.get('desktop');
    const preferisciTelegram = origine === 'telegram' || !desktopAttivo();
    if (preferisciTelegram && telegram?.disponibile()) return telegram;
    if (desktop?.disponibile()) return desktop;
    if (telegram?.disponibile()) return telegram;
    // Altri canali registrati (es. finestra "voce"): ultimo ricorso.
    for (const canale of canali.values()) if (canale.disponibile()) return canale;
    return undefined;
  }

  function nuovoId(): string {
    let id = generaIdRichiesta();
    while (pendenti.has(id)) id = generaIdRichiesta();
    return id;
  }

  function completa(richiesta: RichiestaPermesso): RichiestaPermesso {
    if (richiesta.descrizione) return richiesta;
    const d = descriviRichiesta(richiesta.strumento, richiesta.input, richiesta.ruolo);
    const dettaglio = richiesta.dettaglio ?? d.dettaglio;
    const spiegazione = richiesta.spiegazione ?? d.spiegazione;
    return {
      ...richiesta,
      descrizione: d.descrizione,
      anteprima: richiesta.anteprima ?? d.anteprima,
      ...(dettaglio ? { dettaglio } : {}),
      ...(spiegazione ? { spiegazione } : {}),
    };
  }

  /** Decisione del canale, oppure nega allo scadere del tempo o all'annullamento della sessione che ha chiesto. */
  function conTimeout(promessa: Promise<DecisionePermesso>, annullamento?: AbortSignal): Promise<DecisionePermesso> {
    return new Promise((risolvi) => {
      const suAnnullamento = () => fine({ esito: 'nega', motivo: testiBroker.motivi.annullata });
      const timer = setTimeout(() => fine({ esito: 'nega', motivo: testiBroker.motivi.tempoScaduto }), timeoutMs);
      function fine(d: DecisionePermesso): void {
        clearTimeout(timer);
        annullamento?.removeEventListener('abort', suAnnullamento);
        risolvi(d);
      }
      if (annullamento?.aborted) return suAnnullamento();
      annullamento?.addEventListener('abort', suAnnullamento, { once: true });
      promessa.then(fine, () => fine({ esito: 'nega', motivo: testiBroker.motivi.erroreCanale }));
    });
  }

  return {
    registraCanale(canale) {
      canali.set(canale.nome, canale);
      logger.info('broker.canale_registrato', { canale: canale.nome });
    },

    segnaAttivita(canale) {
      ultimaAttivita.set(canale, adesso());
    },

    canalePer(origine) {
      return scegliCanale(origine)?.nome;
    },

    inAttesa() {
      return [...pendenti.values()];
    },

    nuovoId,

    async chiedi(richiestaGrezza) {
      const richiesta = completa(richiestaGrezza.id ? richiestaGrezza : { ...richiestaGrezza, id: nuovoId() });
      // Un comando o un testo che non si può mostrare per intero non si chiede nemmeno: si nega (docs/02 §6).
      if (richiesta.dettaglio?.troncato) {
        logger.avviso('broker.dettaglio_troppo_lungo', { id: richiesta.id, strumento: richiesta.strumento });
        return { esito: 'nega', motivo: testiBroker.motivi.troppoLungo };
      }
      const canale = scegliCanale(richiesta.canaleOrigine);
      if (!canale) {
        logger.avviso('broker.nessun_canale', { id: richiesta.id, strumento: richiesta.strumento });
        return { esito: 'nega', motivo: testiBroker.motivi.nessunCanale };
      }
      pendenti.set(richiesta.id, richiesta);
      logger.info('broker.richiesta', { id: richiesta.id, strumento: richiesta.strumento, ruolo: richiesta.ruolo, origine: richiesta.canaleOrigine, canale: canale.nome });
      try {
        const decisione = await conTimeout(canale.chiediConferma(richiesta, timeoutMs), richiesta.annullamento);
        logger.info('broker.decisione', { id: richiesta.id, esito: decisione.esito, canale: canale.nome, attesaMs: adesso() - richiesta.creataIl });
        return decisione;
      } finally {
        pendenti.delete(richiesta.id);
      }
    },
  };
}
