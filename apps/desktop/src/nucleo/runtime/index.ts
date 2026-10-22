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
 * Variabili dell'ambiente di sistema che passano al binario quando la sua configurazione è isolata (produzione).
 * Solo ciò che serve a far girare un programma e i suoi comandi (percorsi, cartelle temporanee, lingua, terminale,
 * proxy e certificati aziendali, schermo per aprire il browser del login): nessuna credenziale, nessun indirizzo
 * alternativo del servizio, nessuna impostazione di Claude Code ereditata (docs/02 §2.3.2-2.3.4).
 * Confronto senza maiuscole/minuscole: su Windows "Path" e "PATH" sono la stessa variabile.
 */
export const VARIABILI_AMMESSE: readonly string[] = [
  'PATH', 'PATHEXT', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'USER', 'USERNAME', 'LOGNAME', 'SHELL',
  'APPDATA', 'LOCALAPPDATA', 'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432', 'COMMONPROGRAMFILES',
  'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR', 'COMSPEC', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS',
  'TEMP', 'TMP', 'TMPDIR',
  'LANG', 'LANGUAGE', 'TZ', 'TERM', 'COLORTERM',
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'ALL_PROXY', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'SSL_CERT_DIR',
  'DISPLAY', 'WAYLAND_DISPLAY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', '__CF_USER_TEXT_ENCODING',
];
const PREFISSI_AMMESSI: readonly string[] = ['LC_'];

/**
 * Variabili che non devono MAI arrivare al binario, nemmeno in sviluppo con la configurazione ereditata (dove
 * l'ambiente passa intero): l'id di una sessione di Claude Code in cui gira Spalla e una chiave API trovata per caso.
 */
const SEMPRE_TOLTE: readonly string[] = ['CLAUDE_CODE_SESSION_ID', 'ANTHROPIC_API_KEY'];

/** True se la variabile d'ambiente di sistema può passare al binario isolato. */
export function variabileAmmessa(nome: string): boolean {
  const n = nome.toUpperCase();
  return VARIABILI_AMMESSE.includes(n) || PREFISSI_AMMESSI.some((p) => n.startsWith(p));
}

/**
 * L'ambiente completo del processo del binario (l'opzione `env` dell'SDK SOSTITUISCE l'ambiente): le variabili di
 * sistema ammesse, poi le variabili fisse del runtime (CLAUDE_CONFIG_DIR isolato, niente aggiornamenti, ...) e infine
 * quelle di autenticazione scelte dall'utente (`variabiliAuth`). Nient'altro:
 * - niente token di accesso ereditati (quello OAuth di Claude Code, ANTHROPIC_AUTH_TOKEN, AWS_BEARER_TOKEN_BEDROCK) né CLAUDE_CODE_USE_*: un accesso
 *   trovato nell'ambiente non deve dire "collegato" né decidere chi paga (docs/02 §2.3.2);
 * - niente ANTHROPIC_BASE_URL né ANTHROPIC_CUSTOM_HEADERS: la chiave dell'utente va solo ad Anthropic (§2.3.4);
 * - niente CLAUDE_CONFIG_DIR o CLAUDECODE ereditati, niente id di sessione di un Claude Code che ci ospita.
 * Solo in sviluppo con `configEreditata` (SPALLA_CONFIG_EREDITATA=1, mai nell'app pacchettizzata) l'ambiente passa
 * intero, meno SEMPRE_TOLTE: serve a usare il login di Claude Code della macchina.
 * Unico punto per tutte le `query()` (sessioni, prova di collegamento) e per il pannello di collegamento.
 */
export function ambientePerBinario(
  runtime: (Pick<RuntimeBinario, 'ambiente'> & { readonly configEreditata?: boolean }) | undefined,
  variabiliAuth: Record<string, string>,
  sistema: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const ereditata = runtime?.configEreditata === true;
  const env: Record<string, string> = {};
  for (const [nome, valore] of Object.entries(sistema)) {
    if (valore === undefined) continue;
    if (SEMPRE_TOLTE.includes(nome.toUpperCase())) continue;
    if (ereditata || variabileAmmessa(nome)) env[nome] = valore;
  }
  Object.assign(env, runtime?.ambiente() ?? {}, variabiliAuth);
  return env;
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
