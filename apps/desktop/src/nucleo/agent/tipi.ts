import type { Options, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AuthProvider, Broker, LivelloModello, Logger, MemoryService, ModalitaCervello, Percorsi } from '../contratti.js';

/** La `query()` dell'SDK, iniettabile nei test (il vero `query` restituisce un `Query`, che è compatibile). */
export type FunzioneQuery = (parametri: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}) => AsyncIterable<SDKMessage> & { interrupt?(): Promise<unknown>; close?(): void };

/** Sezione `cervello` di config.json (docs/05 §4.4). Strutturale: l'oggetto di @spalla/schema va bene così com'è. */
export interface ConfigCervello {
  modalita: ModalitaCervello;
  livello?: LivelloModello;
  tetto_mensile_eur?: number | null;
}

export interface ConfigRuntime {
  cervello: ConfigCervello;
}

/** Ciò che serve del runtime del binario (strutturalmente uguale a `RuntimeBinario` di ../runtime). */
export interface AmbienteBinario {
  readonly percorsoEseguibile: string | undefined;
  ambiente(): Record<string, string>;
}

/** Costruisce la frase italiana di una richiesta di permesso (di norma `descriviRichiesta` del broker). */
export type DescrittoreRichiesta = (strumento: string, input: unknown, ruolo?: string) => { descrizione: string; anteprima?: string };

export interface DipendenzeAgentRuntime {
  percorsi: Percorsi;
  auth: AuthProvider;
  broker: Broker;
  runtime: AmbienteBinario;
  logger: Logger;
  config: ConfigRuntime;
  memoria?: MemoryService;
  /** Iniettabile nei test; predefinita la `query()` dell'SDK. */
  query?: FunzioneQuery;
  descriviRichiesta?: DescrittoreRichiesta;
  /** Orologio iniettabile. */
  adesso?: () => Date;
  /** Cambio approssimato per confrontare la spesa (in dollari) con il tetto scelto in euro. */
  cambioUsdEur?: number;
}
