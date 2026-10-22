import type { SDKAssistantMessage, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { EventoAssistente } from '../contratti.js';
import { codiceDaAssistente, erroreConCodice, erroreLimite, isoDaResetsAt, type EventoErrore } from './errori.js';
import { testiAgent } from './testi.js';

/** Coda asincrona: chi produce (callback dell'SDK, hook) spinge; chi consuma itera fino alla chiusura. */
export class CodaEventi<T> implements AsyncIterable<T> {
  private readonly elementi: T[] = [];
  private attese: Array<(r: IteratorResult<T>) => void> = [];
  private chiusa = false;

  push(elemento: T): void {
    if (this.chiusa) return;
    const attesa = this.attese.shift();
    if (attesa) attesa({ value: elemento, done: false });
    else this.elementi.push(elemento);
  }

  chiudi(): void {
    if (this.chiusa) return;
    this.chiusa = true;
    for (const attesa of this.attese) attesa({ value: undefined as never, done: true });
    this.attese = [];
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        if (this.elementi.length > 0) return Promise.resolve({ value: this.elementi.shift() as T, done: false });
        if (this.chiusa) return Promise.resolve({ value: undefined as never, done: true });
        return new Promise((risolvi) => this.attese.push(risolvi));
      },
      return: () => {
        this.chiudi();
        return Promise.resolve({ value: undefined as never, done: true });
      },
    };
  }
}

/** Ciò che il traduttore osserva mentre scorre i messaggi di una chiamata. */
export interface ContestoTraduzione {
  /** agent_id → nome del ruolo (dall'hook SubagentStart). */
  ruoloDi(agentId: string | undefined): string | undefined;
  /** Chiamato appena si conosce l'id di sessione. */
  suSessione(id: string): void;
  /** Errore osservato prima del result (assistant.error, rate_limit_event). */
  suErrore(errore: EventoErrore): void;
}

function campo(input: unknown, nome: string): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const v = (input as Record<string, unknown>)[nome];
  return typeof v === 'string' ? v : undefined;
}

function relativo(percorso: string | undefined, cwd: string): string {
  if (!percorso) return '?';
  const p = percorso.replace(/\\/g, '/');
  const base = cwd.replace(/\\/g, '/').replace(/\/$/, '') + '/';
  return p.startsWith(base) ? p.slice(base.length) : p;
}

/** Riga breve per l'interfaccia ("Leggo memoria/agenda.md"): mai gergo. */
export function descriviStrumento(nome: string, input: unknown, cwd: string): string {
  const s = testiAgent.strumenti;
  const percorso = relativo(campo(input, 'file_path') ?? campo(input, 'notebook_path') ?? campo(input, 'path'), cwd);
  switch (nome) {
    case 'Read': return s.leggere(percorso);
    case 'Write': return s.scrivere(percorso);
    case 'Edit':
    case 'NotebookEdit': return s.modificare(percorso);
    case 'Glob':
    case 'Grep': return s.cercareFile;
    case 'WebSearch': return s.ricercaWeb(campo(input, 'query') ?? '');
    case 'WebFetch': return s.pagina(campo(input, 'url') ?? '');
    case 'Bash': return s.comando;
    case 'Agent':
      return s.delega(campo(input, 'subagent_type'));
    case 'AskUserQuestion': return s.domanda;
    case 'Skill': return s.procedura;
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TaskList':
    case 'TaskGet': return s.listaCose;
    case 'EndConversation': return s.chiudoArgomento;
    default:
      if (nome.startsWith('mcp__spalla__memoria')) return s.memoria(campo(input, 'query') ?? '');
      // Mai il nome tecnico verso l'utente (docs/04 §1, docs/05 §1.12): il nome resta nell'evento `strumento.nome`.
      return s.generico;
  }
}

function eventiDaAssistant(m: SDKAssistantMessage, cwd: string, contesto: ContestoTraduzione): EventoAssistente[] {
  const eventi: EventoAssistente[] = [];
  if (m.error) contesto.suErrore(erroreConCodice(codiceDaAssistente(m.error)));
  const ruolo = contesto.ruoloDi(m.agent_id);
  const principale = m.parent_tool_use_id === null && !m.agent_id;
  for (const blocco of m.message.content) {
    if (blocco.type === 'text') {
      // Solo il coordinatore parla con l'utente (docs/04 §1): il testo dei ruoli non passa.
      if (principale && blocco.text.length > 0) eventi.push({ tipo: 'testo', testo: blocco.text, parziale: false });
    } else if (blocco.type === 'tool_use') {
      eventi.push({ tipo: 'strumento', nome: blocco.name, descrizione: descriviStrumento(blocco.name, blocco.input, cwd), ...(ruolo ? { ruolo } : {}) });
    }
  }
  return eventi;
}

/**
 * Traduce un messaggio dell'SDK negli eventi del contratto. Il `result` NON viene tradotto qui:
 * lo gestisce il runtime (costi, sessione, fine/errore).
 */
export function traduciMessaggio(m: SDKMessage, cwd: string, contesto: ContestoTraduzione): EventoAssistente[] {
  switch (m.type) {
    case 'system':
      if (m.subtype === 'init') contesto.suSessione(m.session_id);
      return [];
    case 'stream_event': {
      const e = m.event;
      if (e.type === 'content_block_delta' && e.delta.type === 'text_delta' && m.parent_tool_use_id === null && e.delta.text) {
        return [{ tipo: 'testo', testo: e.delta.text, parziale: true }];
      }
      return [];
    }
    case 'assistant':
      return eventiDaAssistant(m, cwd, contesto);
    case 'rate_limit_event':
      if (m.rate_limit_info.status === 'rejected') contesto.suErrore(erroreLimite(isoDaResetsAt(m.rate_limit_info.resetsAt)));
      return [];
    default:
      return [];
  }
}
