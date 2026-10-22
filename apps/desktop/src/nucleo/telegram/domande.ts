import { InlineKeyboard } from 'grammy';
import type { DomandaUtente, Logger, RispostaUtente } from '../contratti.js';
import { codificaCallback } from './callback.js';
import type { MessaggioInviato, TrasportoConferme } from './conferme.js';
import { escapaHtml } from './html.js';
import type { TestiTelegram } from './testi.js';

export const TIMEOUT_DOMANDA_MS = 10 * 60 * 1000;

interface DomandaInAttesa {
  domanda: DomandaUtente;
  chatId: number;
  scelte: Set<number>;
  messaggio?: MessaggioInviato;
  risolvi: (r: RispostaUtente) => void;
  timer: NodeJS.Timeout;
}

/** Testo della domanda: intestazione in grassetto, testo, nota sulla scelta multipla e sulla risposta libera. */
export function testoDomanda(domanda: DomandaUtente, testi: TestiTelegram, scelte: ReadonlySet<number> = new Set()): string {
  const righe: string[] = [];
  if (domanda.intestazione) righe.push(`<b>${escapaHtml(domanda.intestazione)}</b>`);
  righe.push(escapaHtml(domanda.testo));
  const descrizioni = domanda.opzioni.filter((o) => o.descrizione).map((o, i) => `• ${escapaHtml(o.etichetta)}: ${escapaHtml(o.descrizione ?? '')}${scelte.has(i) ? ' ✓' : ''}`);
  if (descrizioni.length) righe.push(descrizioni.join('\n'));
  if (domanda.multiSelezione) righe.push(escapaHtml(testi.permessi.domanda.sceltaMultipla));
  righe.push(escapaHtml(testi.permessi.domanda.scriviRisposta));
  return righe.join('\n');
}

export function tastieraDomanda(domanda: DomandaUtente, testi: TestiTelegram, scelte: ReadonlySet<number> = new Set()): InlineKeyboard {
  // Un pulsante per riga, senza righe vuote in coda (Telegram le rifiuta).
  const tastiera = new InlineKeyboard();
  domanda.opzioni.forEach((o, i) => {
    if (i > 0) tastiera.row();
    const etichetta = scelte.has(i) ? `✓ ${o.etichetta}` : o.etichetta;
    tastiera.text(etichetta.slice(0, 64), codificaCallback({ tipo: 'domanda', id: domanda.id, scelta: i }));
  });
  if (domanda.multiSelezione) {
    if (domanda.opzioni.length > 0) tastiera.row();
    tastiera.text(testi.altro.fattoScelta, codificaCallback({ tipo: 'domanda', id: domanda.id, scelta: 'fine' }));
  }
  return tastiera;
}

/**
 * Le domande dell'assistente (chip, docs/05 §1.2) su Telegram: un pulsante per opzione, risposta libera
 * sempre ammessa scrivendo un messaggio; scelta multipla con il pulsante "Fatto".
 */
export function creaDomandeTelegram(deps: {
  trasporto: TrasportoConferme & { aggiornaTastiera(m: MessaggioInviato, html: string, tastiera: InlineKeyboard): Promise<void> };
  eProprietario: (utenteId: number) => boolean;
  testi: TestiTelegram;
  logger: Logger;
  timeoutMs?: number;
}) {
  const { trasporto, testi, logger } = deps;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_DOMANDA_MS;
  const perId = new Map<string, DomandaInAttesa>();
  const perChat = new Map<number, string>();

  function chiudi(id: string, risposte: string[]): void {
    const voce = perId.get(id);
    if (!voce) return;
    perId.delete(id);
    if (perChat.get(voce.chatId) === id) perChat.delete(voce.chatId);
    clearTimeout(voce.timer);
    voce.risolvi({ id, risposte });
    if (voce.messaggio) void trasporto.togliTastiera(voce.messaggio).catch(() => undefined);
  }

  return {
    chiedi(chatId: number, domanda: DomandaUtente): Promise<RispostaUtente> {
      return new Promise<RispostaUtente>((risolvi) => {
        const timer = setTimeout(() => chiudi(domanda.id, []), timeoutMs);
        timer.unref?.();
        const voce: DomandaInAttesa = { domanda, chatId, scelte: new Set(), risolvi, timer };
        perId.set(domanda.id, voce);
        perChat.set(chatId, domanda.id);
        trasporto
          .invia(chatId, testoDomanda(domanda, testi), tastieraDomanda(domanda, testi))
          .then((m) => {
            voce.messaggio = m;
          })
          .catch((errore: unknown) => {
            logger.avviso('telegram.domanda_non_inviata', { errore: errore instanceof Error ? errore.message : String(errore) });
            chiudi(domanda.id, []);
          });
      });
    },

    async gestisciCallback(callbackId: string, utenteId: number, dati: { id: string; scelta: number | 'fine' }): Promise<void> {
      if (!deps.eProprietario(utenteId)) {
        await trasporto.rispondiCallback(callbackId, testi.permessi.richiestaNonTua).catch(() => undefined);
        return;
      }
      const voce = perId.get(dati.id);
      if (!voce) {
        await trasporto.rispondiCallback(callbackId, testi.permessi.richiestaVecchia).catch(() => undefined);
        return;
      }
      if (dati.scelta === 'fine') {
        const etichette = [...voce.scelte].sort().map((i) => voce.domanda.opzioni[i]?.etichetta ?? '').filter(Boolean);
        chiudi(dati.id, etichette);
        await trasporto.rispondiCallback(callbackId, testi.conferme.fatto).catch(() => undefined);
        return;
      }
      const opzione = voce.domanda.opzioni[dati.scelta];
      if (!opzione) {
        await trasporto.rispondiCallback(callbackId, testi.permessi.richiestaVecchia).catch(() => undefined);
        return;
      }
      if (!voce.domanda.multiSelezione) {
        chiudi(dati.id, [opzione.etichetta]);
        await trasporto.rispondiCallback(callbackId, opzione.etichetta).catch(() => undefined);
        return;
      }
      if (voce.scelte.has(dati.scelta)) voce.scelte.delete(dati.scelta);
      else voce.scelte.add(dati.scelta);
      await trasporto.rispondiCallback(callbackId, opzione.etichetta).catch(() => undefined);
      if (voce.messaggio) {
        await trasporto.aggiornaTastiera(voce.messaggio, testoDomanda(voce.domanda, testi, voce.scelte), tastieraDomanda(voce.domanda, testi, voce.scelte)).catch(() => undefined);
      }
    },

    /** Un messaggio di testo del proprietario mentre una domanda è aperta risponde alla domanda. */
    rispondiConTesto(chatId: number, testo: string): boolean {
      const id = perChat.get(chatId);
      if (!id) return false;
      chiudi(id, [testo.trim()]);
      return true;
    },

    annullaTutte(): void {
      for (const id of [...perId.keys()]) chiudi(id, []);
    },

    inAttesa(chatId?: number): number {
      return chatId === undefined ? perId.size : perChat.has(chatId) ? 1 : 0;
    },
  };
}

export type DomandeTelegram = ReturnType<typeof creaDomandeTelegram>;
