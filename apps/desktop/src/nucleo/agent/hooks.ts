import fs from 'node:fs';
import path from 'node:path';
import type { HookCallback, HookCallbackMatcher, HookEvent, HookInput } from '@anthropic-ai/claude-agent-sdk';
import type { Canale, Logger, MemoryService } from '../contratti.js';
import { percorsoProtetto, relativoAllaCartella } from './protezioni.js';
import { testiAgent } from './testi.js';

/** Registro agent_id → nome del ruolo, alimentato dagli hook SubagentStart/SubagentStop. */
export interface RegistroRuoli {
  registra(agentId: string, ruolo: string): void;
  rimuovi(agentId: string): void;
  ruoloDi(agentId: string | undefined): string | undefined;
}

export function creaRegistroRuoli(): RegistroRuoli {
  const mappa = new Map<string, string>();
  return {
    registra: (id, ruolo) => { mappa.set(id, ruolo); },
    rimuovi: (id) => { mappa.delete(id); },
    ruoloDi: (id) => (id ? mappa.get(id) : undefined),
  };
}

export interface ContestoHooks {
  cartellaLavoro: string;
  logger: Logger;
  registroRuoli: RegistroRuoli;
  memoria?: MemoryService;
  /** Canale e prima riga del messaggio utente di questa chiamata (per il diario; vuota = niente riga). */
  canale: Canale;
  primaRiga: string;
}

/** Cartelle sorvegliate dai tetti (docs/03 §6), in minuscolo: su macOS e Windows "Profilo/" è la stessa cartella. */
const CARTELLE_CON_TETTI = ['profilo/', 'memoria/'];

/** Strumenti che scrivono file: gli stessi per i tetti della memoria e per la protezione delle impostazioni. */
export const STRUMENTI_DI_SCRITTURA = 'Write|Edit|NotebookEdit|MultiEdit';

/**
 * Il percorso (relativo alla cartella di lavoro, con "/") se il file sta sotto profilo/ o memoria/, altrimenti undefined.
 * Un percorso relativo si risolve rispetto alla cartella di lavoro, non al cwd del processo; il confronto non
 * distingue le maiuscole, come `controllaTetti()`.
 */
export function percorsoRelativoSorvegliato(filePath: string | undefined, cartellaLavoro: string): string | undefined {
  const rel = relativoAllaCartella(filePath, cartellaLavoro);
  if (!rel) return undefined;
  const minuscolo = rel.toLowerCase();
  return CARTELLE_CON_TETTI.some((c) => minuscolo.startsWith(c)) ? rel : undefined;
}

/** Prima riga utile di un messaggio, per la riga meccanica del diario (ADR-007). */
export function primaRigaDi(testo: string, limite = 120): string {
  const riga = testo.split(/\r?\n/).map((r) => r.trim()).find((r) => r.length > 0 && !r.startsWith('[canale:')) ?? '';
  return riga.length > limite ? riga.slice(0, limite - 1) + '…' : riga;
}

function fileDellInput(input: HookInput): string | undefined {
  const ti = (input as { tool_input?: unknown }).tool_input as Record<string, unknown> | undefined;
  const v = ti?.file_path ?? ti?.notebook_path;
  return typeof v === 'string' ? v : undefined;
}

/**
 * Hook dell'SDK (docs/02 §3.2, §10.2, docs/03 §6, ADR-007):
 * - PreToolUse su chi scrive file: nega le scritture sui file protetti (settings, skill, hook, .mcp.json), in
 *   aggiunta alle regole `deny` di opzioni-sdk.ts (cintura e bretelle).
 * - PostToolUse su Write/Edit sotto profilo/ e memoria/: controlla i tetti e, se superati, blocca con il messaggio in italiano.
 * - Stop: appende la riga meccanica al diario (zero token).
 * - SubagentStart/Stop: tiene il registro agent_id → ruolo per nominare chi agisce.
 */
export function creaHooks(ctx: ContestoHooks): Partial<Record<HookEvent, HookCallbackMatcher[]>> {
  const { logger, memoria, registroRuoli, cartellaLavoro } = ctx;

  const protezione: HookCallback = async (input: HookInput) => {
    if (input.hook_event_name !== 'PreToolUse') return {};
    const protetto = percorsoProtetto(fileDellInput(input), cartellaLavoro);
    if (!protetto) return {};
    logger.avviso('sicurezza.scrittura_negata', { file: protetto, strumento: input.tool_name });
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: testiAgent.protezione.fileProtetto(protetto),
      },
    };
  };

  const tettiMemoria: HookCallback = async (input: HookInput) => {
    if (input.hook_event_name !== 'PostToolUse' || !memoria) return {};
    const rel = percorsoRelativoSorvegliato(fileDellInput(input), cartellaLavoro);
    if (!rel) return {};
    let contenuto: string;
    try {
      contenuto = fs.readFileSync(path.resolve(cartellaLavoro, rel), 'utf8');
    } catch {
      return {};
    }
    const problema = memoria.controllaTetti(rel, contenuto);
    if (!problema) return {};
    logger.avviso('memoria.tetto_superato', { file: rel, strumento: input.tool_name });
    return { decision: 'block', reason: problema };
  };

  const diario: HookCallback = async (input: HookInput) => {
    if (input.hook_event_name !== 'Stop' || !memoria || input.agent_id) return {};
    if (!ctx.primaRiga) return {};
    try {
      await memoria.appendiDiario(ctx.canale, ctx.primaRiga);
    } catch (errore) {
      logger.avviso('memoria.diario_non_scritto', { errore: errore instanceof Error ? errore.message : String(errore) });
    }
    return {};
  };

  const avvioRuolo: HookCallback = async (input: HookInput) => {
    if (input.hook_event_name === 'SubagentStart') registroRuoli.registra(input.agent_id, input.agent_type);
    return {};
  };

  const fineRuolo: HookCallback = async (input: HookInput) => {
    if (input.hook_event_name === 'SubagentStop') registroRuoli.rimuovi(input.agent_id);
    return {};
  };

  const hooks: Partial<Record<HookEvent, HookCallbackMatcher[]>> = {
    PreToolUse: [{ matcher: STRUMENTI_DI_SCRITTURA, hooks: [protezione], timeout: 10 }],
    SubagentStart: [{ hooks: [avvioRuolo] }],
    SubagentStop: [{ hooks: [fineRuolo] }],
  };
  if (memoria) {
    hooks.PostToolUse = [{ matcher: STRUMENTI_DI_SCRITTURA, hooks: [tettiMemoria], timeout: 30 }];
    hooks.Stop = [{ hooks: [diario], timeout: 30 }];
  }
  return hooks;
}
