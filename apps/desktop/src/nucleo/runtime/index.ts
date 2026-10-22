import fs from 'node:fs';
import path from 'node:path';
import type { Percorsi } from '../contratti.js';

/**
 * Runtime del binario (docs/02 §2.3, §2.5, §3.2).
 * Nel prototipo usiamo il binario incluso nell'SDK: `percorsoEseguibile` resta undefined.
 * La strada C (download verificato) arriverà qui, senza toccare chi ci usa.
 */
export interface RuntimeBinario {
  /** Percorso del binario da passare all'SDK; undefined = quello incluso nell'SDK. */
  readonly percorsoEseguibile: string | undefined;
  /** Variabili d'ambiente da AGGIUNGERE a process.env (l'opzione env dell'SDK sostituisce l'ambiente). */
  ambiente(): Record<string, string>;
  /** True se CLAUDE_CONFIG_DIR viene lasciato quello ereditato (solo sviluppo/E2E). */
  readonly configEreditata: boolean;
}

export interface OpzioniRuntimeBinario {
  /**
   * Solo sviluppo: non impostare CLAUDE_CONFIG_DIR, così il binario trova il login
   * già presente nella cartella di configurazione ereditata. In produzione è sempre false.
   */
  usaConfigEreditata?: boolean;
  /** Percorso esplicito del binario (strada C). Se assente, l'SDK usa il pacchetto incluso. */
  percorsoEseguibile?: string;
}

/** Cartelle che devono esistere prima di avviare il binario o i servizi. */
export function cartelleDaCreare(percorsi: Percorsi): string[] {
  return [
    percorsi.cartellaLavoro,
    percorsi.datiApp,
    path.join(percorsi.datiApp, 'usage'),
    percorsi.datiLocali,
    percorsi.configClaude,
    path.dirname(percorsi.indiceMemoria),
    percorsi.modelliVoce,
    percorsi.logs,
    path.dirname(percorsi.segreti),
  ];
}

/** Variabili fisse del binario (docs/02 §3.2). Non ne aggiungiamo altre. */
export function variabiliFisse(): Record<string, string> {
  return {
    DISABLE_AUTOUPDATER: '1',
    DISABLE_UPDATES: '1',
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
    CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: '1',
    CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: '3',
  };
}

/**
 * L'ambiente completo del processo del binario: `process.env` (l'opzione `env` dell'SDK SOSTITUISCE l'ambiente),
 * le variabili del runtime e quelle di autenticazione. Toglie ciò che non deve passare:
 * - `CLAUDE_CODE_SESSION_ID`: se Spalla gira dentro un'altra sessione di Claude Code (sviluppo), il binario non deve
 *   ereditarne l'id (env-vars.md);
 * - `ANTHROPIC_API_KEY` ereditata: il cervello usa solo la chiave scelta dall'utente (`variabiliAuth`) oppure, con
 *   l'abbonamento, il login del binario; una chiave trovata per caso nell'ambiente non deve decidere chi paga.
 * Unico punto per tutte le `query()` (sessioni e prova di collegamento), così le due strade non divergono.
 */
export function ambientePerBinario(runtime: Pick<RuntimeBinario, 'ambiente'> | undefined, variabiliAuth: Record<string, string>): Record<string, string> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.CLAUDE_CODE_SESSION_ID;
  delete env.ANTHROPIC_API_KEY;
  Object.assign(env, runtime?.ambiente() ?? {}, variabiliAuth);
  for (const chiave of Object.keys(env)) if (env[chiave] === undefined) delete env[chiave];
  return env as Record<string, string>;
}

export function creaRuntimeBinario(percorsi: Percorsi, opzioni: OpzioniRuntimeBinario = {}): RuntimeBinario {
  for (const cartella of cartelleDaCreare(percorsi)) {
    fs.mkdirSync(cartella, { recursive: true });
  }
  const configEreditata = opzioni.usaConfigEreditata === true;

  return {
    percorsoEseguibile: opzioni.percorsoEseguibile,
    configEreditata,
    ambiente() {
      const base = variabiliFisse();
      // In produzione lo stato del binario (sessioni, impostazioni, credenziali) vive in una cartella isolata
      // che la nostra app non legge mai (docs/02 §2.3 punto 2).
      return configEreditata ? base : { CLAUDE_CONFIG_DIR: percorsi.configClaude, ...base };
    },
  };
}
