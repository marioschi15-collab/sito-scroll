import type { SDKAssistantMessageError, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { EventoAssistente } from '../contratti.js';
import { testiAgent } from './testi.js';

export type EventoErrore = Extract<EventoAssistente, { tipo: 'errore' }>;
export type CodiceErrore = NonNullable<EventoErrore['codice']>;

/** `resetsAt` dell'SDK (secondi o millisecondi epoch) → ISO 8601. */
export function isoDaResetsAt(resetsAt: number | undefined): string | undefined {
  if (resetsAt === undefined || !Number.isFinite(resetsAt)) return undefined;
  const ms = resetsAt < 1e12 ? resetsAt * 1000 : resetsAt;
  return new Date(ms).toISOString();
}

/** "16:30" nell'ora locale, per il messaggio all'utente. */
export function oraLocale(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function erroreLimite(riprovaAlle?: string): EventoErrore {
  return { tipo: 'errore', codice: 'limite_raggiunto', messaggio: testiAgent.errori.limite(oraLocale(riprovaAlle)), riprovaAlle };
}

export function erroreConCodice(codice: CodiceErrore, riprovaAlle?: string): EventoErrore {
  switch (codice) {
    case 'limite_raggiunto': return erroreLimite(riprovaAlle);
    case 'credenziali': return { tipo: 'errore', codice, messaggio: testiAgent.errori.credenziali };
    case 'rete': return { tipo: 'errore', codice, messaggio: testiAgent.errori.rete };
    case 'budget': return { tipo: 'errore', codice, messaggio: testiAgent.errori.budget };
    default: return { tipo: 'errore', codice: 'altro', messaggio: testiAgent.errori.altro };
  }
}

/** Classifica il testo di un errore (eccezione dell'SDK, stderr del binario, `errors[]` del result). */
export function codiceDaTesto(testo: string): CodiceErrore {
  const t = testo.toLowerCase();
  if (/rate.?limit|usage limit|hit your limit|429|too many requests|credits_required|overloaded|529/.test(t)) return 'limite_raggiunto';
  if (/max.?budget|budget/.test(t)) return 'budget';
  if (/401|403|authentication|unauthori|invalid.*api.?key|api key|not logged in|please run \/login|login|credential|oauth|billing|account_on_hold/.test(t)) return 'credenziali';
  if (/enotfound|econnrefused|econnreset|etimedout|eai_again|fetch failed|network|socket hang up|dns|offline|unreachable|getaddrinfo/.test(t)) return 'rete';
  return 'altro';
}

/** Dal campo `error` di un messaggio assistant (docs SDK: SDKAssistantMessageError). */
export function codiceDaAssistente(errore: SDKAssistantMessageError): CodiceErrore {
  switch (errore) {
    case 'rate_limit': return 'limite_raggiunto';
    case 'authentication_failed':
    case 'oauth_org_not_allowed':
    case 'account_on_hold':
    case 'verification_required':
    case 'billing_error':
    case 'cloud_credential_error':
      return 'credenziali';
    case 'overloaded':
    case 'server_error':
      return 'rete';
    default:
      return 'altro';
  }
}

/** Da un `result` con esito negativo, tenendo conto di ciò che si è già visto nel flusso. */
export function erroreDaRisultato(risultato: SDKResultMessage, osservato?: EventoErrore): EventoErrore {
  if (risultato.subtype === 'error_max_budget_usd') return erroreConCodice('budget');
  if (risultato.subtype === 'error_max_turns') return { tipo: 'errore', codice: 'altro', messaggio: testiAgent.errori.turni };
  if (osservato) return osservato;
  const testo = risultato.subtype === 'success' ? risultato.result : risultato.errors.join('; ');
  const codice = codiceDaTesto(testo);
  return erroreConCodice(codice);
}

export function erroreDaEccezione(errore: unknown): EventoErrore {
  const testo = errore instanceof Error ? errore.message : String(errore);
  return erroreConCodice(codiceDaTesto(testo));
}
