import { cli as testiCli, telegram as testiTelegram } from '@spalla/it-copy';
import type { StoreSegreti } from './auth/index.js';
import type { Logger } from './contratti.js';
import { creaProceduraBotFather, testiBotFatherDa, type CanaleTelegram, type EventoTelegram } from './telegram/index.js';

/** Nome con cui il token del bot sta nel deposito cifrato dei segreti. */
export const NOME_SEGRETO_TOKEN_TELEGRAM = 'token_telegram';

export interface PairingInAttesa {
  codice: string;
  nomeMostrato: string;
  utenteId: number;
}

/** Ciò che un'interfaccia (terminale oggi, finestra domani) usa per collegare Telegram e confermare il telefono. */
export interface ControlloTelegram {
  attivo(): boolean;
  username(): string | undefined;
  /** Telefoni che hanno scritto al bot e aspettano che l'utente confermi il codice nell'app. */
  pairingInAttesa(): PairingInAttesa[];
  /** True se il testo somiglia alla riga di BotFather (e non a un codice del telefono). */
  eRigaBotFather(testo: string): boolean;
  /** Nome e username da incollare in BotFather, più il link. */
  suggerimenti(nomeAssistente: string, nomeUtente: string): { nome: string; username: string; link: string; passi: readonly string[] };
  /** Verifica la riga di BotFather, salva il token nei segreti e avvia il canale. */
  collega(rigaBotFather: string): Promise<{ ok: boolean; messaggio: string; username?: string }>;
  /** Il codice ricevuto sul telefono: promuove quel telefono a proprietario. */
  confermaPairing(codice: string): Promise<{ ok: boolean; messaggio: string }>;
}

export interface DipendenzeControlloTelegram {
  store: StoreSegreti;
  logger: Logger;
  canale(): CanaleTelegram | undefined;
  /** Crea e avvia un canale con questo token (ferma l'eventuale canale precedente). */
  avviaCanale(token: string): Promise<CanaleTelegram>;
  fetch?: typeof fetch;
}

export function creaControlloTelegram(deps: DipendenzeControlloTelegram): ControlloTelegram & { suEvento(e: EventoTelegram): void } {
  const procedura = creaProceduraBotFather({ testi: testiBotFatherDa(testiTelegram.botfather), ...(deps.fetch ? { fetch: deps.fetch } : {}) });
  const inAttesa = new Map<number, PairingInAttesa>();

  return {
    attivo: () => deps.canale()?.stato().attivo === true,
    username: () => deps.canale()?.stato().botUsername,
    pairingInAttesa: () => [...inAttesa.values()],
    eRigaBotFather: (testo) => procedura.validaFormato(testo),
    suggerimenti(nomeAssistente, nomeUtente) {
      const s = procedura.suggerisci(nomeAssistente, nomeUtente);
      return { ...s, link: procedura.linkBotFather, passi: testiTelegram.botfather.passi };
    },

    async collega(rigaBotFather) {
      const verifica = await procedura.verifica(rigaBotFather);
      if (!verifica.ok) return { ok: false, messaggio: verifica.messaggio };
      const token = procedura.normalizza(rigaBotFather);
      try {
        await deps.store.scrivi(NOME_SEGRETO_TOKEN_TELEGRAM, token);
        await deps.avviaCanale(token);
      } catch (errore) {
        const motivo = errore instanceof Error ? errore.message : String(errore);
        deps.logger.errore('telegram.collegamento_fallito', { errore: motivo });
        return { ok: false, messaggio: testiCli.telegram.avvioFallito(motivo) };
      }
      deps.logger.info('telegram.collegato', { username: verifica.username });
      return { ok: true, username: verifica.username, messaggio: testiCli.telegram.salvato(verifica.username) };
    },

    async confermaPairing(codice) {
      const canale = deps.canale();
      if (!canale) return { ok: false, messaggio: testiCli.telegram.nonDisponibile };
      const esito = await canale.confermaPairing(codice);
      if (esito.ok) {
        for (const [id, p] of inAttesa) if (p.codice.toLowerCase() === codice.trim().toLowerCase()) inAttesa.delete(id);
      }
      return esito;
    },

    suEvento(e) {
      if (e.tipo === 'pairing_richiesto') inAttesa.set(e.utenteId, { codice: e.codice, nomeMostrato: e.nomeMostrato, utenteId: e.utenteId });
      if (e.tipo === 'collegato') inAttesa.delete(e.utenteId);
      if (e.tipo === 'fermato') inAttesa.clear();
    },
  };
}
