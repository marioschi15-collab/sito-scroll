/** Chiamate dirette alla Bot API (i tre metodi Managed Bots di Bot API 9.6 e poco altro). */
export interface RispostaBotApi<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export class ErroreBotApi extends Error {
  constructor(
    public readonly metodo: string,
    public readonly codice: number | undefined,
    descrizione: string,
  ) {
    super(`${metodo}: ${descrizione}`);
    this.name = 'ErroreBotApi';
  }
}

export async function chiamaBotApi<T>(token: string, metodo: string, parametri: Record<string, unknown>, fetchImpl: typeof fetch = fetch): Promise<T> {
  const risposta = await fetchImpl(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parametri),
  });
  const corpo = (await risposta.json().catch(() => ({ ok: false, description: 'risposta non JSON' }))) as RispostaBotApi<T>;
  if (!risposta.ok || !corpo.ok || corpo.result === undefined) {
    throw new ErroreBotApi(metodo, corpo.error_code ?? risposta.status, corpo.description ?? `HTTP ${risposta.status}`);
  }
  return corpo.result;
}

/** Update `managed_bot` (Bot API 9.6): utente che ha creato il bot e il bot stesso. */
export interface UpdateManagedBot {
  update_id: number;
  managed_bot?: {
    user: { id: number; first_name?: string; username?: string };
    bot: { id: number; is_bot: boolean; first_name?: string; username?: string };
  };
}

/** Restringe il bot al proprietario (Telegram lo impone anche se la nostra allowlist fosse sbagliata). */
export function restringiAlProprietario(token: string, botId: number, fetchImpl?: typeof fetch): Promise<true> {
  return chiamaBotApi<true>(token, 'setManagedBotAccessSettings', { user_id: botId, is_access_restricted: true }, fetchImpl);
}

export function prelevaToken(token: string, botId: number, fetchImpl?: typeof fetch): Promise<string> {
  return chiamaBotApi<string>(token, 'getManagedBotToken', { user_id: botId }, fetchImpl);
}
