import type { CanUseTool, PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import type { Broker, Canale, DecisionePermesso, DomandaUtente, EventoAssistente, Logger, RichiestaPermesso, RispostaUtente } from '../contratti.js';
import { testiAgent } from './testi.js';
import type { DescrittoreRichiesta } from './tipi.js';

export interface ContestoPermessi {
  broker: Broker;
  logger: Logger;
  canale: Canale;
  emetti(evento: EventoAssistente): void;
  ruoloDi(agentId: string | undefined): string | undefined;
  nuovoId(): string;
  descrivi?: DescrittoreRichiesta;
  rispondiDomanda?: (domanda: DomandaUtente) => Promise<RispostaUtente>;
  adesso(): number;
}

/** Forma dell'input di AskUserQuestion (docs SDK: user-input.md "Question format"). */
interface DomandaSdk {
  question: string;
  header?: string;
  options?: Array<{ label: string; description?: string }>;
  multiSelect?: boolean;
}

function domandeDa(input: Record<string, unknown>): DomandaSdk[] {
  const q = input.questions;
  if (!Array.isArray(q)) return [];
  return q.filter((d): d is DomandaSdk => !!d && typeof d === 'object' && typeof (d as DomandaSdk).question === 'string');
}

export function domandaUtenteDa(d: DomandaSdk, id: string): DomandaUtente {
  return {
    id,
    testo: d.question,
    ...(d.header ? { intestazione: d.header } : {}),
    opzioni: (d.options ?? []).map((o) => ({ etichetta: o.label, ...(o.description ? { descrizione: o.description } : {}) })),
    multiSelezione: d.multiSelect === true,
  };
}

/** Le risposte (etichette scelte o testo libero) nel formato che l'SDK rimanda al modello. */
export function rispostaPerSdk(risposta: RispostaUtente | undefined): string {
  const voci = (risposta?.risposte ?? []).map((r) => r.trim()).filter((r) => r.length > 0);
  return voci.length > 0 ? voci.join(', ') : testiAgent.scegliTu;
}

async function gestisciDomande(input: Record<string, unknown>, ctx: ContestoPermessi): Promise<PermissionResult> {
  const answers: Record<string, string> = {};
  for (const d of domandeDa(input)) {
    const domanda = domandaUtenteDa(d, ctx.nuovoId());
    ctx.emetti({ tipo: 'domanda', domanda });
    let risposta: RispostaUtente | undefined;
    if (ctx.rispondiDomanda) {
      try {
        risposta = await ctx.rispondiDomanda(domanda);
      } catch (errore) {
        ctx.logger.avviso('domanda.senza_risposta', { errore: errore instanceof Error ? errore.message : String(errore) });
      }
    }
    answers[d.question] = rispostaPerSdk(risposta);
  }
  return { behavior: 'allow', updatedInput: { questions: input.questions, answers } };
}

const NEGATA_PER_ANNULLAMENTO: Extract<DecisionePermesso, { esito: 'nega' }> = { esito: 'nega', motivo: testiAgent.permessi.annullata };

/**
 * Attende la decisione del Broker ma si arrende appena la sessione viene interrotta (tetto raggiunto, chiusura,
 * errore dell'SDK): una conferma rimasta appesa non deve consumare la prossima riga scritta dall'utente.
 */
export function attendiDecisione(decisione: Promise<DecisionePermesso>, segnale: AbortSignal | undefined): Promise<DecisionePermesso> {
  if (!segnale) return decisione;
  if (segnale.aborted) return Promise.resolve(NEGATA_PER_ANNULLAMENTO);
  return new Promise((risolvi) => {
    const suAnnullamento = () => risolvi(NEGATA_PER_ANNULLAMENTO);
    segnale.addEventListener('abort', suAnnullamento, { once: true });
    decisione.then(
      (d) => { segnale.removeEventListener('abort', suAnnullamento); risolvi(d); },
      () => { segnale.removeEventListener('abort', suAnnullamento); risolvi(NEGATA_PER_ANNULLAMENTO); },
    );
  });
}

/**
 * `canUseTool` dell'SDK (docs/02 §3.1, §6): le domande (AskUserQuestion) vanno all'interfaccia come chip,
 * tutto il resto al Permission Broker. L'attesa può durare a lungo: è il Broker a imporre il timeout; il segnale
 * di annullamento dell'SDK viaggia dentro la richiesta, così chi mostra la scheda può ritirarla.
 */
export function creaCanUseTool(ctx: ContestoPermessi): CanUseTool {
  return async (toolName, input, opzioni) => {
    if (toolName === 'AskUserQuestion') return gestisciDomande(input, ctx);
    if (opzioni.signal.aborted) return { behavior: 'deny', message: NEGATA_PER_ANNULLAMENTO.motivo };

    const ruolo = ctx.ruoloDi(opzioni.agentID);
    const descritta = ctx.descrivi?.(toolName, input, ruolo);
    const richiesta: RichiestaPermesso = {
      id: ctx.nuovoId(),
      strumento: toolName,
      input,
      descrizione: descritta?.descrizione ?? '',
      ...(descritta?.anteprima ? { anteprima: descritta.anteprima } : {}),
      ...(ruolo ? { ruolo } : {}),
      canaleOrigine: ctx.canale,
      creataIl: ctx.adesso(),
      annullamento: opzioni.signal,
    };
    ctx.emetti({ tipo: 'permesso', richiesta });

    const decisione = await attendiDecisione(ctx.broker.chiedi(richiesta), opzioni.signal);
    if (decisione.esito === 'consenti') {
      const aggiornato = decisione.inputAggiornato;
      const updatedInput = aggiornato && typeof aggiornato === 'object' ? (aggiornato as Record<string, unknown>) : input;
      return { behavior: 'allow', updatedInput };
    }
    return { behavior: 'deny', message: decisione.motivo };
  };
}
