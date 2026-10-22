import { InlineKeyboard } from 'grammy';
import type { DecisionePermesso, Logger, RichiestaPermesso } from '../contratti.js';
import { codificaCallback, interpretaConfermaTesto } from './callback.js';
import { escapaHtml } from './html.js';
import type { TestiTelegram } from './testi.js';

export interface MessaggioInviato {
  chatId: number;
  messageId: number;
}

/** Ciò che le conferme chiedono al canale: inviare e ritoccare messaggi nella chat del proprietario. */
export interface TrasportoConferme {
  invia(chatId: number, html: string, tastiera?: InlineKeyboard): Promise<MessaggioInviato>;
  togliTastiera(messaggio: MessaggioInviato): Promise<void>;
  rispondiCallback(callbackId: string, testo: string): Promise<void>;
}

export interface DipendenzeConferme {
  trasporto: TrasportoConferme;
  /** Chat del proprietario a cui mandare le richieste (undefined finché il bot non è collegato). */
  chatProprietario: () => number | undefined;
  eProprietario: (utenteId: number) => boolean;
  testi: TestiTelegram;
  logger: Logger;
  adesso?: () => number;
}

interface InAttesa {
  richiesta: RichiestaPermesso;
  messaggio?: MessaggioInviato;
  risolvi: (d: DecisionePermesso) => void;
  timer: NodeJS.Timeout;
}

/** Testo della scheda su Telegram: chi agisce, cosa vuole fare, anteprima, riserva a testo (docs/02 §6). */
export function schedaConferma(richiesta: RichiestaPermesso, testi: TestiTelegram): string {
  const righe = [`<b>${escapaHtml(richiesta.descrizione)}</b>`];
  if (richiesta.anteprima) {
    const anteprima = richiesta.anteprima.length > 700 ? `${richiesta.anteprima.slice(0, 700)}…` : richiesta.anteprima;
    righe.push(`<pre>${escapaHtml(anteprima)}</pre>`);
  }
  righe.push(escapaHtml(testi.permessi.riservaTesto(richiesta.id)));
  return righe.join('\n');
}

export function tastieraConferma(id: string, testi: TestiTelegram): InlineKeyboard {
  return new InlineKeyboard()
    .text(testi.conferme.siFallo, codificaCallback({ tipo: 'permesso', id, esito: 'ok' }))
    .text(testi.conferme.no, codificaCallback({ tipo: 'permesso', id, esito: 'no' }));
}

/**
 * Le conferme del Permission Broker su Telegram: pulsanti [Sì, fallo] [No] legati all'id della richiesta,
 * solo il proprietario può rispondere, i callback vecchi vengono ignorati, "sì <id>" a testo come riserva.
 */
export function creaConfermeTelegram(deps: DipendenzeConferme) {
  const { trasporto, testi, logger } = deps;
  const inAttesa = new Map<string, InAttesa>();

  function chiudi(id: string, decisione: DecisionePermesso, esitoUtente?: string): InAttesa | undefined {
    const voce = inAttesa.get(id);
    if (!voce) return undefined;
    inAttesa.delete(id);
    clearTimeout(voce.timer);
    voce.risolvi(decisione);
    if (voce.messaggio) {
      const m = voce.messaggio;
      void trasporto.togliTastiera(m).catch(() => undefined);
      if (esitoUtente) void trasporto.invia(m.chatId, escapaHtml(esitoUtente)).catch(() => undefined);
    }
    return voce;
  }

  return {
    async chiediConferma(richiesta: RichiestaPermesso, timeoutMs: number): Promise<DecisionePermesso> {
      const chatId = deps.chatProprietario();
      if (chatId === undefined) return { esito: 'nega', motivo: testi.conferme.scaduta };
      return new Promise<DecisionePermesso>((risolvi) => {
        const timer = setTimeout(() => chiudi(richiesta.id, { esito: 'nega', motivo: testi.conferme.scaduta }, testi.conferme.scaduta), timeoutMs);
        timer.unref?.();
        const voce: InAttesa = { richiesta, risolvi, timer };
        inAttesa.set(richiesta.id, voce);
        // Sessione interrotta prima della risposta: via i pulsanti, così un tocco tardivo non approva un'azione vecchia.
        richiesta.annullamento?.addEventListener(
          'abort',
          () => chiudi(richiesta.id, { esito: 'nega', motivo: testi.conferme.annullata }, testi.conferme.annullata),
          { once: true },
        );
        trasporto
          .invia(chatId, schedaConferma(richiesta, testi), tastieraConferma(richiesta.id, testi))
          .then((m) => {
            voce.messaggio = m;
          })
          .catch((errore: unknown) => {
            logger.avviso('telegram.conferma_non_inviata', { id: richiesta.id, errore: errore instanceof Error ? errore.message : String(errore) });
            chiudi(richiesta.id, { esito: 'nega', motivo: testi.conferme.scaduta });
          });
      });
    },

    /** Pulsante premuto: `dati` è già decodificato dal canale. Restituisce true se riguardava una conferma. */
    async gestisciCallback(callbackId: string, utenteId: number, dati: { id: string; esito: 'ok' | 'no' }): Promise<boolean> {
      if (!deps.eProprietario(utenteId)) {
        await trasporto.rispondiCallback(callbackId, testi.permessi.richiestaNonTua).catch(() => undefined);
        return true;
      }
      const voce = inAttesa.get(dati.id);
      if (!voce) {
        await trasporto.rispondiCallback(callbackId, testi.permessi.richiestaVecchia).catch(() => undefined);
        return true;
      }
      const consentito = dati.esito === 'ok';
      chiudi(dati.id, consentito ? { esito: 'consenti' } : { esito: 'nega', motivo: testi.conferme.nonLoFaccio });
      await trasporto.rispondiCallback(callbackId, consentito ? testi.conferme.fatto : testi.conferme.nonLoFaccio).catch(() => undefined);
      logger.info('telegram.conferma', { id: dati.id, esito: dati.esito });
      return true;
    },

    /** Riserva a testo "sì <id>" / "no <id>": true solo se l'id è di una richiesta in attesa ("no grazie" resta un messaggio). */
    gestisciTesto(utenteId: number, testo: string): boolean {
      const letto = interpretaConfermaTesto(testo);
      if (!letto) return false;
      const voce = inAttesa.get(letto.id);
      if (!voce || !deps.eProprietario(utenteId)) return false;
      const consentito = letto.esito === 'ok';
      chiudi(letto.id, consentito ? { esito: 'consenti' } : { esito: 'nega', motivo: testi.conferme.nonLoFaccio }, consentito ? testi.conferme.fatto : testi.conferme.nonLoFaccio);
      logger.info('telegram.conferma', { id: letto.id, esito: letto.esito, via: 'testo' });
      return true;
    },

    /** Alla chiusura del canale: nega tutto ciò che è in attesa. */
    annullaTutte(): void {
      for (const id of [...inAttesa.keys()]) chiudi(id, { esito: 'nega', motivo: testi.conferme.scaduta });
    },

    inAttesa(): RichiestaPermesso[] {
      return [...inAttesa.values()].map((v) => v.richiesta);
    },
  };
}

export type ConfermeTelegram = ReturnType<typeof creaConfermeTelegram>;
