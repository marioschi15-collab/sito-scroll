import { query as querySdk } from '@anthropic-ai/claude-agent-sdk';
import type { Options, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { ambientePerBinario, type RuntimeBinario } from '../runtime/index.js';

/** La `query()` dell'SDK, iniettabile nei test. */
export type FunzioneQuery = (parametri: { prompt: string | AsyncIterable<SDKUserMessage>; options?: Options }) => AsyncIterable<SDKMessage>;

export type CodiceProva = 'credenziali' | 'limite' | 'rete' | 'tempo' | 'altro';

export interface EsitoProva {
  ok: boolean;
  codice?: CodiceProva;
  dettaglio?: string;
}

export interface OpzioniProva {
  runtime?: RuntimeBinario;
  query?: FunzioneQuery;
  /** Cartella in cui gira la prova; predefinita la cartella corrente. */
  cwd?: string;
  timeoutMs?: number;
}

const PROMPT_PROVA = 'Rispondi solo con la parola: ok';

/** Classifica il testo di un errore dell'SDK o del binario. */
export function classificaErrore(testo: string): CodiceProva {
  const t = testo.toLowerCase();
  if (/rate.?limit|usage limit|limite|429|too many requests|credits_required/.test(t)) return 'limite';
  if (/401|403|authentication|unauthori|invalid.*api.?key|api key|not logged in|login|credential|oauth|billing|account_on_hold/.test(t)) return 'credenziali';
  if (/enotfound|econnrefused|econnreset|etimedout|eai_again|fetch failed|network|socket|dns|offline|unreachable/.test(t)) return 'rete';
  if (/timeout|timed out|tempo scaduto/.test(t)) return 'tempo';
  return 'altro';
}

/**
 * Una `query()` di una riga, senza strumenti né memoria, per sapere se il binario riesce a parlare con
 * Anthropic con le credenziali date (docs/05 §2.1: "Al termine l'app fa una prova e dice Collegato").
 * Non legge mai le credenziali: osserva solo se la risposta arriva.
 */
export async function provaCollegamento(variabiliAuth: Record<string, string>, opzioni: OpzioniProva = {}): Promise<EsitoProva> {
  const query = opzioni.query ?? (querySdk as FunzioneQuery);
  const abort = new AbortController();
  const timeoutMs = opzioni.timeoutMs ?? 90_000;
  const timer = setTimeout(() => abort.abort(), timeoutMs);

  const options: Options = {
    cwd: opzioni.cwd ?? process.cwd(),
    // Stesso ambiente delle sessioni vere (niente id di sessione ereditato, niente chiave trovata per caso).
    env: ambientePerBinario(opzioni.runtime, variabiliAuth),
    settingSources: [],
    tools: [],
    maxTurns: 1,
    persistSession: false,
    permissionMode: 'default',
    abortController: abort,
    ...(opzioni.runtime?.percorsoEseguibile ? { pathToClaudeCodeExecutable: opzioni.runtime.percorsoEseguibile } : {}),
  };

  try {
    let esito: EsitoProva | undefined;
    for await (const messaggio of query({ prompt: PROMPT_PROVA, options })) {
      if (messaggio.type === 'assistant' && messaggio.error) {
        esito = { ok: false, codice: classificaErrore(messaggio.error), dettaglio: messaggio.error };
      }
      if (messaggio.type === 'rate_limit_event' && messaggio.rate_limit_info.status === 'rejected') {
        esito = { ok: false, codice: 'limite' };
      }
      if (messaggio.type === 'result') {
        if (messaggio.subtype === 'success' && !messaggio.is_error) return { ok: true };
        const dettaglio = messaggio.subtype === 'success' ? messaggio.result : messaggio.errors.join('; ');
        esito = esito ?? { ok: false, codice: classificaErrore(dettaglio), dettaglio };
      }
    }
    return esito ?? { ok: false, codice: 'altro', dettaglio: 'nessuna risposta' };
  } catch (errore) {
    if (abort.signal.aborted) return { ok: false, codice: 'tempo' };
    const dettaglio = errore instanceof Error ? errore.message : String(errore);
    return { ok: false, codice: classificaErrore(dettaglio), dettaglio };
  } finally {
    clearTimeout(timer);
  }
}
