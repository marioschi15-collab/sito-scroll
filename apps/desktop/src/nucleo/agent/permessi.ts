import path from 'node:path';
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
  /** Cartella di lavoro (cwd del binario): Glob e Grep dentro di essa non chiedono il permesso. */
  cartellaLavoro?: string;
}

/** True se `percorso` (relativo al cwd del binario) sta nella cartella di lavoro o è la cartella stessa. */
function dentroCartella(percorso: string, cartellaLavoro: string): boolean {
  // "~" lo espande il binario, non path.resolve: lo trattiamo come fuori (la home non è la cartella di lavoro).
  if (percorso.startsWith('~')) return false;
  const base = path.resolve(cartellaLavoro);
  const rel = path.relative(base, path.resolve(base, percorso));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Un modello di ricerca che esce dalla cartella (assoluto, "~", oppure con un segmento ".."). */
function modelloEsce(modello: string | undefined): boolean {
  if (!modello) return false;
  return path.isAbsolute(modello) || /^[A-Za-z]:/.test(modello) || modello.startsWith('~') || modello.split(/[\\/]/).includes('..');
}

/**
 * Glob e Grep si consentono da soli SOLO dentro la cartella di lavoro (docs/02 §10.2: letture fuori cartella →
 * canUseTool → Broker). Fuori, o con un modello che esce, si chiede come per ogni altra lettura.
 */
export function ricercaDentroCartella(strumento: string, input: Record<string, unknown>, cartellaLavoro: string | undefined): boolean {
  if (!cartellaLavoro || (strumento !== 'Glob' && strumento !== 'Grep')) return false;
  const dove = typeof input.path === 'string' && input.path.trim() ? input.path.trim() : '.';
  if (!dentroCartella(dove, cartellaLavoro)) return false;
  const modello = strumento === 'Glob' ? input.pattern : input.glob;
  return !modelloEsce(typeof modello === 'string' ? modello : undefined);
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

const NUMERI: Record<string, number> = { due: 2, tre: 3, quattro: 4, cinque: 5 };

/**
 * Quante scelte al massimo chiede il testo di una scelta multipla («Scegline fino a tre», «al massimo 2»), se lo dice.
 * L'SDK non ha un campo per questo: lo si ricava dalle parole del rituale (docs/05 §1, Q5).
 */
export function massimoDalTesto(testo: string): number | undefined {
  const m = /\b(?:fino a|al massimo|massimo|non più di)\s+(\d+|due|tre|quattro|cinque)\b/i.exec(testo);
  if (!m?.[1]) return undefined;
  const n = /^\d+$/.test(m[1]) ? Number.parseInt(m[1], 10) : NUMERI[m[1].toLowerCase()];
  return n !== undefined && n >= 1 ? n : undefined;
}

export function domandaUtenteDa(d: DomandaSdk, id: string): DomandaUtente {
  const multi = d.multiSelect === true;
  const massimo = multi ? massimoDalTesto(d.question) : undefined;
  return {
    id,
    testo: d.question,
    ...(d.header ? { intestazione: d.header } : {}),
    opzioni: (d.options ?? []).map((o) => ({ etichetta: o.label, ...(o.description ? { descrizione: o.description } : {}) })),
    multiSelezione: multi,
    ...(massimo !== undefined ? { maxSelezioni: massimo } : {}),
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
    if (ricercaDentroCartella(toolName, input, ctx.cartellaLavoro)) return { behavior: 'allow', updatedInput: input };

    const ruolo = ctx.ruoloDi(opzioni.agentID);
    const descritta = ctx.descrivi?.(toolName, input, ruolo);
    const richiesta: RichiestaPermesso = {
      id: ctx.nuovoId(),
      strumento: toolName,
      input,
      descrizione: descritta?.descrizione ?? '',
      ...(descritta?.anteprima ? { anteprima: descritta.anteprima } : {}),
      ...(descritta?.dettaglio ? { dettaglio: descritta.dettaglio } : {}),
      ...(descritta?.spiegazione ? { spiegazione: descritta.spiegazione } : {}),
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
