/**
 * Attrezzi per i test del canale Telegram: un Bot grammY con l'API finta (nessuna rete), aggiornamenti costruiti
 * a mano e un dispatcher che recita gli eventi dell'assistente. Non è un file di test.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Bot, GrammyError, type Transformer } from 'grammy';
import type { Update, User, UserFromGetMe } from 'grammy/types';
import { vi } from 'vitest';
import type { Broker, Dispatcher, EventoAssistente, Logger, MessaggioIn, Percorsi } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';

export const TOKEN_FINTO = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1';

export const BOT_INFO = {
  id: 123456789,
  is_bot: true,
  first_name: 'Bruno',
  username: 'bruno_di_marco_bot',
  can_join_groups: false,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
} as unknown as UserFromGetMe;

export const MARCO: User = { id: 987654321, is_bot: false, first_name: 'Marco', last_name: 'B.', username: 'marcob' };
export const SCONOSCIUTO: User = { id: 111222333, is_bot: false, first_name: 'Ignoto' };

export interface ChiamataApi {
  method: string;
  payload: Record<string, unknown>;
}

export interface OpzioniBotFinto {
  /** Cosa fa `getUpdates`: 'blocca' (long polling finto che si sblocca solo con stop), un lotto una tantum, o un errore. */
  getUpdates?: 'blocca' | { lotti: Update[][] } | { errore: GrammyError };
  risposte?: Partial<Record<string, (payload: Record<string, unknown>) => unknown>>;
}

export function erroreConflitto(): GrammyError {
  return new GrammyError('Conflict', { ok: false, error_code: 409, description: 'Conflict: terminated by other getUpdates request' }, 'getUpdates', {});
}

/** Bot con l'API intercettata PRIMA che il canale installi i suoi trasformatori (così li attraversa tutti). */
export function creaBotFinto(opzioni: OpzioniBotFinto = {}) {
  const chiamate: ChiamataApi[] = [];
  let messageId = 1000;
  const lotti = typeof opzioni.getUpdates === 'object' && 'lotti' in opzioni.getUpdates ? [...opzioni.getUpdates.lotti] : [];
  const bot = new Bot(TOKEN_FINTO, { botInfo: BOT_INFO });

  const finto: Transformer = async (_prev, method, payload, signal) => {
    const p = (payload ?? {}) as Record<string, unknown>;
    chiamate.push({ method, payload: p });
    const personalizzata = opzioni.risposte?.[method];
    if (personalizzata) return { ok: true, result: personalizzata(p) } as never;
    switch (method) {
      case 'getUpdates': {
        if (typeof opzioni.getUpdates === 'object' && 'errore' in opzioni.getUpdates) throw opzioni.getUpdates.errore;
        const lotto = lotti.shift();
        if (lotto) return { ok: true, result: lotto } as never;
        // `bot.stop()` chiama getUpdates senza signal per confermare l'offset: deve rispondere subito.
        if (!signal) return { ok: true, result: [] } as never;
        return new Promise((_, rifiuta) => {
          signal.addEventListener('abort', () => rifiuta(new Error('polling interrotto')));
        });
      }
      case 'sendMessage':
      case 'sendDocument':
        return { ok: true, result: { message_id: ++messageId, date: Math.floor(Date.now() / 1000), chat: { id: p.chat_id, type: 'private' }, text: p.text } } as never;
      case 'getFile':
        return { ok: true, result: { file_id: p.file_id, file_unique_id: 'u1', file_size: 1234, file_path: `voice/${String(p.file_id)}.oga` } } as never;
      default:
        return { ok: true, result: true } as never;
    }
  };
  bot.api.config.use(finto);

  return {
    bot,
    chiamate,
    inviati: () => chiamate.filter((c) => c.method === 'sendMessage').map((c) => c.payload as { chat_id: number; text: string; parse_mode?: string; reply_markup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } }),
    testi: () => chiamate.filter((c) => c.method === 'sendMessage').map((c) => String(c.payload.text)),
    metodi: () => chiamate.map((c) => c.method),
    azzera: () => {
      chiamate.length = 0;
    },
  };
}

export type BotFinto = ReturnType<typeof creaBotFinto>;

let contatoreUpdate = 1;
export function prossimoUpdateId(): number {
  return contatoreUpdate++;
}

export function messaggioTesto(da: User, testo: string, extra: { chatId?: number; tipoChat?: 'private' | 'group'; date?: number; updateId?: number } = {}): Update {
  const chatId = extra.chatId ?? da.id;
  return {
    update_id: extra.updateId ?? prossimoUpdateId(),
    message: {
      message_id: prossimoUpdateId(),
      date: extra.date ?? Math.floor(Date.now() / 1000),
      chat: extra.tipoChat === 'group' ? { id: chatId, type: 'group', title: 'Gruppo' } : { id: chatId, type: 'private', first_name: da.first_name },
      from: da,
      text: testo,
      ...(testo.startsWith('/') ? { entities: [{ type: 'bot_command', offset: 0, length: testo.split(/\s/)[0]?.length ?? testo.length }] } : {}),
    },
  } as unknown as Update;
}

export function messaggioVocale(da: User, extra: { file_size?: number; duration?: number } = {}): Update {
  return {
    update_id: prossimoUpdateId(),
    message: {
      message_id: prossimoUpdateId(),
      date: Math.floor(Date.now() / 1000),
      chat: { id: da.id, type: 'private', first_name: da.first_name },
      from: da,
      voice: { file_id: 'VOCE1', file_unique_id: 'v1', duration: extra.duration ?? 3, mime_type: 'audio/ogg', file_size: extra.file_size ?? 12345 },
    },
  } as unknown as Update;
}

export function messaggioFoto(da: User, didascalia?: string): Update {
  return {
    update_id: prossimoUpdateId(),
    message: {
      message_id: prossimoUpdateId(),
      date: Math.floor(Date.now() / 1000),
      chat: { id: da.id, type: 'private', first_name: da.first_name },
      from: da,
      photo: [
        { file_id: 'FOTO_S', file_unique_id: 'fs', width: 90, height: 90, file_size: 1000 },
        { file_id: 'FOTO_L', file_unique_id: 'fl', width: 1280, height: 960, file_size: 150000 },
      ],
      ...(didascalia ? { caption: didascalia } : {}),
    },
  } as unknown as Update;
}

export function messaggioDocumento(da: User, nome: string, dimensione: number, didascalia?: string): Update {
  return {
    update_id: prossimoUpdateId(),
    message: {
      message_id: prossimoUpdateId(),
      date: Math.floor(Date.now() / 1000),
      chat: { id: da.id, type: 'private', first_name: da.first_name },
      from: da,
      document: { file_id: 'DOC1', file_unique_id: 'd1', file_name: nome, mime_type: 'application/pdf', file_size: dimensione },
      ...(didascalia ? { caption: didascalia } : {}),
    },
  } as unknown as Update;
}

export function callback(da: User, dati: string, messageId = 1001): Update {
  return {
    update_id: prossimoUpdateId(),
    callback_query: {
      id: `cb${prossimoUpdateId()}`,
      from: da,
      chat_instance: 'ci',
      data: dati,
      message: { message_id: messageId, date: Math.floor(Date.now() / 1000), chat: { id: da.id, type: 'private', first_name: da.first_name } },
    },
  } as unknown as Update;
}

/** Dispatcher che recita gli eventi dati (o calcolati dal messaggio). */
export function dispatcherFinto(eventi: EventoAssistente[] | ((m: MessaggioIn) => EventoAssistente[])) {
  const gestisci = vi.fn(async (m: MessaggioIn, consegna: (e: EventoAssistente) => Promise<void>) => {
    const lista = typeof eventi === 'function' ? eventi(m) : eventi;
    for (const e of lista) await consegna(e);
  });
  const dispatcher: Dispatcher = { gestisci };
  return { dispatcher, gestisci };
}

export function rispostaSemplice(testo: string): EventoAssistente[] {
  return [
    { tipo: 'testo', testo, parziale: false },
    { tipo: 'fine', sessioneId: 's1', durataMs: 10 },
  ];
}

export function brokerFinto(): Broker & { chiedi: ReturnType<typeof vi.fn>; registraCanale: ReturnType<typeof vi.fn>; segnaAttivita: ReturnType<typeof vi.fn> } {
  return { chiedi: vi.fn(async () => ({ esito: 'consenti' as const })), registraCanale: vi.fn(), segnaAttivita: vi.fn() };
}

export function loggerFinto(): Logger & { eventi: Array<{ livello: string; evento: string; dati?: Record<string, unknown> }> } {
  const eventi: Array<{ livello: string; evento: string; dati?: Record<string, unknown> }> = [];
  return {
    eventi,
    info: (evento, dati) => void eventi.push({ livello: 'info', evento, dati }),
    avviso: (evento, dati) => void eventi.push({ livello: 'avviso', evento, dati }),
    errore: (evento, dati) => void eventi.push({ livello: 'errore', evento, dati }),
  };
}

/** Un SPALLA_HOME temporaneo con tutti i percorsi. */
export function percorsiTemporanei(prefisso = 'spalla-tg-'): Percorsi & { radice: string } {
  const radice = fs.mkdtempSync(path.join(os.tmpdir(), prefisso));
  const precedente = process.env.SPALLA_HOME;
  process.env.SPALLA_HOME = radice;
  const percorsi = calcolaPercorsi();
  if (precedente === undefined) delete process.env.SPALLA_HOME;
  else process.env.SPALLA_HOME = precedente;
  for (const c of [percorsi.cartellaLavoro, percorsi.datiApp, percorsi.datiLocali]) fs.mkdirSync(c, { recursive: true });
  return { ...percorsi, radice };
}

/** Attende che una condizione diventi vera (i gestori grammY sono asincroni rispetto a handleUpdate). */
export async function attendiChe(condizione: () => boolean, ms = 2000): Promise<void> {
  const fine = Date.now() + ms;
  while (!condizione()) {
    if (Date.now() > fine) throw new Error('condizione non raggiunta in tempo');
    await new Promise((ok) => setTimeout(ok, 5));
  }
}

/** Genera con ffmpeg una nota vocale OGG/Opus (sinusoide) e ne restituisce il percorso; `undefined` se ffmpeg manca. */
export function generaOggOpus(cartella: string, opzioni: { secondi?: number; hz?: number; canali?: number; nome?: string } = {}): string | undefined {
  const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
  const uscita = path.join(cartella, opzioni.nome ?? 'nota.ogg');
  try {
    execFileSync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=${opzioni.hz ?? 440}:duration=${opzioni.secondi ?? 1}:sample_rate=48000`, '-ac', String(opzioni.canali ?? 1), '-c:a', 'libopus', '-b:a', '24k', uscita],
      { stdio: 'ignore' },
    );
    return uscita;
  } catch {
    return undefined;
  }
}
