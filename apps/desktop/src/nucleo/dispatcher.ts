import type { AgentRuntime, Broker, Dispatcher, EventoAssistente, Logger, MessaggioIn, OpzioniInvio, TipoSessione } from './contratti.js';
import { creaFiltroMarcatori, MARCATORI_PREDEFINITI } from './marcatori.js';

/** Com'è finito uno scambio, per chi ascolta `dopoScambio` (onboarding, contatori, interfacce). */
export interface EsitoScambio {
  messaggio: MessaggioIn;
  tipo: TipoSessione;
  esito: 'fine' | 'errore' | 'interrotto';
  /** Marcatori scritti dall'assistente in questo scambio (es. "[[APRI:TELEGRAM]]"). */
  marcatori: string[];
  sessioneId?: string;
  costoUsd?: number;
  durataMs: number;
}

export type AscoltatoreScambio = (scambio: EsitoScambio) => Promise<void> | void;

export interface DipendenzeDispatcher {
  runtime: AgentRuntime;
  broker: Broker;
  logger: Logger;
  /** Segnale "la sessione principale sta lavorando" (il riordino notturno lo rispetta). */
  segnaleAttivita?: { segna(): void };
  /** Marcatori da togliere dal testo e da segnalare; predefinito: quelli di docs/05. */
  marcatori?: readonly string[];
  adesso?: () => number;
}

export interface DispatcherEsteso extends Dispatcher {
  /** Chiamato a fine scambio, una volta per marcatore trovato (es. "[[APRI:TELEGRAM]]" → apri il collegamento). */
  suMarcatore(marcatore: string, ascoltatore: AscoltatoreScambio): () => void;
  /** Chiamato dopo ogni scambio (anche quelli falliti). */
  dopoScambio(ascoltatore: AscoltatoreScambio): () => void;
  /** Scambi sulla sessione principale in attesa o in corso. */
  inCoda(): number;
}

/**
 * Dispatcher (contratti.ts): un solo scambio alla volta sulla sessione principale, qualunque sia il canale
 * (terminale, Telegram, lavori di sistema); gli eventi tornano al canale che ha chiesto. Toglie dal testo i
 * marcatori per l'app e avvisa chi li ascolta a fine scambio, quando il canale è di nuovo libero.
 */
export function creaDispatcher(deps: DipendenzeDispatcher): DispatcherEsteso {
  const { runtime, broker, logger } = deps;
  const adesso = deps.adesso ?? Date.now;
  const marcatori = deps.marcatori ?? MARCATORI_PREDEFINITI;
  const ascoltatoriMarcatori = new Map<string, Set<AscoltatoreScambio>>();
  const ascoltatoriScambio = new Set<AscoltatoreScambio>();
  let coda: Promise<unknown> = Promise.resolve();
  let inCoda = 0;

  async function avvisa(ascoltatori: Iterable<AscoltatoreScambio>, scambio: EsitoScambio, evento: string): Promise<void> {
    for (const a of ascoltatori) {
      try {
        await a(scambio);
      } catch (errore) {
        logger.errore(evento, { errore: errore instanceof Error ? errore.message : String(errore) });
      }
    }
  }

  /** Avvisa gli ascoltatori FUORI dalla coda: un ascoltatore può a sua volta mandare un messaggio (es. la riga di sistema dopo Telegram). */
  async function notifica(scambio: EsitoScambio): Promise<void> {
    await avvisa(ascoltatoriScambio, scambio, 'dispatcher.ascoltatore_fallito');
    for (const m of scambio.marcatori) await avvisa(ascoltatoriMarcatori.get(m) ?? [], scambio, 'dispatcher.marcatore_fallito');
  }

  async function esegui(messaggio: MessaggioIn, consegna: (e: EventoAssistente) => Promise<void>, opzioni: OpzioniInvio, tipo: TipoSessione): Promise<EsitoScambio> {
    const inizio = adesso();
    if (messaggio.canale !== 'sistema') broker.segnaAttivita(messaggio.canale);
    if (tipo === 'principale') deps.segnaleAttivita?.segna();
    const filtro = creaFiltroMarcatori(marcatori);
    let esito: EsitoScambio['esito'] = 'interrotto';
    let sessioneId: string | undefined;
    let costoUsd: number | undefined;

    try {
      for await (const evento of runtime.invia(messaggio, opzioni)) {
        if (evento.tipo === 'testo') {
          if (evento.parziale) {
            const visibile = filtro.frammento(evento.testo);
            if (visibile) await consegna({ ...evento, testo: visibile });
          } else {
            const resto = filtro.svuota();
            if (resto) await consegna({ tipo: 'testo', testo: resto, parziale: true });
            const pulito = filtro.completo(evento.testo);
            if (pulito.trim() || !evento.testo.trim()) await consegna({ ...evento, testo: pulito });
          }
          continue;
        }
        if (evento.tipo === 'fine') {
          esito = 'fine';
          sessioneId = evento.sessioneId;
          costoUsd = evento.costoUsd;
        } else if (evento.tipo === 'errore') {
          esito = 'errore';
        }
        await consegna(evento);
      }
      const resto = filtro.svuota();
      if (resto) await consegna({ tipo: 'testo', testo: resto, parziale: true });
    } catch (errore) {
      // Chi consegna ha fallito (o il runtime ha lanciato): chi ascolta lo sa comunque, poi l'errore risale al chiamante.
      const scambio: EsitoScambio = { messaggio, tipo, esito: 'interrotto', marcatori: filtro.trovati(), sessioneId, costoUsd, durataMs: adesso() - inizio };
      logger.avviso('dispatcher.scambio_interrotto', { canale: messaggio.canale, tipo, errore: errore instanceof Error ? errore.message : String(errore) });
      void notifica(scambio);
      throw errore;
    }
    const scambio: EsitoScambio = { messaggio, tipo, esito, marcatori: filtro.trovati(), sessioneId, costoUsd, durataMs: adesso() - inizio };
    logger.info('dispatcher.scambio', { canale: messaggio.canale, tipo, esito, marcatori: scambio.marcatori.length, durataMs: scambio.durataMs });
    return scambio;
  }

  return {
    async gestisci(messaggio, consegna, opzioni = {}) {
      const tipo: TipoSessione = opzioni.sessione ?? 'principale';
      if (tipo !== 'principale') {
        await notifica(await esegui(messaggio, consegna, opzioni, tipo));
        return;
      }
      inCoda++;
      const lavoro = () => esegui(messaggio, consegna, opzioni, tipo).finally(() => { inCoda--; });
      const mio = coda.then(lavoro, lavoro);
      coda = mio.catch(() => undefined);
      // Gli ascoltatori girano a coda già libera: possono rimettere in coda un messaggio senza bloccarsi.
      await notifica(await mio);
    },

    suMarcatore(marcatore, ascoltatore) {
      const insieme = ascoltatoriMarcatori.get(marcatore) ?? new Set();
      insieme.add(ascoltatore);
      ascoltatoriMarcatori.set(marcatore, insieme);
      return () => { insieme.delete(ascoltatore); };
    },

    dopoScambio(ascoltatore) {
      ascoltatoriScambio.add(ascoltatore);
      return () => { ascoltatoriScambio.delete(ascoltatore); };
    },

    inCoda: () => inCoda,
  };
}
