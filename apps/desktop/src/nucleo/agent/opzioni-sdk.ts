import type { CanUseTool, HookCallbackMatcher, HookEvent, McpServerConfig, Options } from '@anthropic-ai/claude-agent-sdk';
import type { LivelloModello, Logger, ModalitaCervello, OpzioniInvio, Percorsi, TipoSessione } from '../contratti.js';
import { ambientePerBinario } from '../runtime/index.js';
import { regoleProtezioneCartella, regoleProtezioneCredenziali } from './protezioni.js';
import type { AmbienteBinario } from './tipi.js';

/**
 * Regole `allow` della sessione (docs/02 §3.2, docs/05 §4.3): Read/Write/Edit SOLO con percorso dentro la
 * cartella di lavoro ("./**"). Un nome nudo aggirerebbe il Broker per tutto il disco.
 */
export const STRUMENTI_CONSENTITI: readonly string[] = [
  'Read(./**)', 'Write(./**)', 'Edit(./**)',
  'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Agent', 'AskUserQuestion', 'mcp__spalla__memoria_cerca',
];

/** Tetto predefinito per i lavori di sfondo/programmati in modalità chiave API (docs/02 §3.2, docs/03 §8). */
export const TETTO_PREDEFINITO_USD = 0.1;
export const TURNI_MASSIMI: Record<Exclude<TipoSessione, 'principale'>, number> = { programmata: 8, sfondo: 20 };

/** Livello scelto dall'utente → alias di modello (ADR-009). Solo con chiave API; con l'abbonamento sempre "sonnet". */
export function modelloPer(modalita: ModalitaCervello, livello: LivelloModello | undefined, tipo: TipoSessione): string {
  if (tipo !== 'principale') return 'haiku';
  if (modalita !== 'chiave_api') return 'sonnet';
  switch (livello) {
    case 'economico': return 'haiku';
    case 'massima': return 'opus';
    default: return 'sonnet';
  }
}

/**
 * Regole `deny` che nessun tipo di sessione e nessun ruolo può togliere: le impostazioni del progetto, le skill,
 * gli hook e `.mcp.json` non si riscrivono dalla conversazione; le credenziali del binario e il deposito dei
 * segreti non si leggono (docs/02 §2.3, §10.2; vedi protezioni.ts). Le sessioni di sfondo perdono anche la shell.
 */
export function strumentiNegati(percorsi: Pick<Percorsi, 'configClaude' | 'segreti'>, tipo: TipoSessione): string[] {
  const fissi = [...regoleProtezioneCartella(), ...regoleProtezioneCredenziali(percorsi)];
  return tipo === 'principale' ? fissi : ['Bash', ...fissi];
}

export interface IngredientiOpzioni {
  percorsi: Percorsi;
  runtime: AmbienteBinario;
  variabiliAuth: Record<string, string>;
  modalita: ModalitaCervello;
  livello: LivelloModello | undefined;
  tipo: TipoSessione;
  invio: OpzioniInvio;
  riprendi: string | undefined;
  canUseTool: CanUseTool;
  hooks: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  serverSpalla: McpServerConfig | undefined;
  abort: AbortController;
  logger: Logger;
}

/** Le `Options` dell'SDK per una chiamata (docs/02 §3.2). Nessun `bypass`, mai. */
export function costruisciOpzioni(i: IngredientiOpzioni): Options {
  const options: Options = {
    cwd: i.percorsi.cartellaLavoro,
    // L'opzione env SOSTITUISCE l'ambiente: ambientePerBinario copia process.env e toglie ciò che non deve passare.
    env: ambientePerBinario(i.runtime, i.variabiliAuth),
    settingSources: ['project'],
    permissionMode: 'default',
    allowedTools: [...STRUMENTI_CONSENTITI],
    disallowedTools: strumentiNegati(i.percorsi, i.tipo),
    canUseTool: i.canUseTool,
    hooks: i.hooks,
    mcpServers: i.serverSpalla ? { spalla: i.serverSpalla } : {},
    includePartialMessages: true,
    abortController: i.abort,
    stderr: (testo) => { if (testo.trim()) i.logger.avviso('binario.stderr', { testo: testo.trim().slice(0, 200) }); },
  };
  if (i.runtime.percorsoEseguibile) options.pathToClaudeCodeExecutable = i.runtime.percorsoEseguibile;

  if (i.invio.ruolo) {
    // Il modello lo decide il frontmatter del ruolo (docs/04 §2); i ruoli stanno in .claude/agents (settingSources project).
    options.agent = i.invio.ruolo;
  } else {
    options.model = modelloPer(i.modalita, i.livello, i.tipo);
  }

  if (i.tipo === 'principale') {
    if (i.riprendi) options.resume = i.riprendi;
  } else {
    // Sessioni separate e brevi, con tetto (docs/02 §6, docs/04 §3.2); la shell è già tra gli strumenti negati.
    options.maxTurns = TURNI_MASSIMI[i.tipo];
    const tetto = i.invio.tettoUsd ?? (i.modalita === 'chiave_api' ? TETTO_PREDEFINITO_USD : undefined);
    if (tetto !== undefined) options.maxBudgetUsd = tetto;
  }
  // Un tetto di passi esplicito (prove, lavori brevi) vince sui predefiniti del tipo di sessione.
  if (i.invio.maxTurni !== undefined && Number.isFinite(i.invio.maxTurni) && i.invio.maxTurni > 0) options.maxTurns = Math.trunc(i.invio.maxTurni);
  return options;
}
