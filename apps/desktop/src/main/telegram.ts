import type { EsitoCollegamento, StatoTelegram, SuggerimentiTelegram } from '../ipc/contratto.js';
import type { Nucleo } from '../nucleo/index.js';
import { NOME_SEGRETO_TOKEN_TELEGRAM } from '../nucleo/controllo-telegram.js';
import { aggiornaConfigurazione } from '../nucleo/configurazione.js';
import type { EventoTelegram } from '../nucleo/telegram/index.js';
import { SCADENZA_PAIRING_MS } from '../nucleo/telegram/pairing.js';

/**
 * Ponte tra la sezione Telegram della finestra e `nucleo.controlloTelegram` (docs/02 §8.2-8.3):
 * suggerimenti per BotFather, collegamento con la riga di BotFather, conferma del codice del telefono, scollegamento.
 *
 * Il codice di pairing NON va alla finestra: l'utente lo legge sul telefono e lo digita nell'app; è proprio questo
 * che dimostra che il telefono è suo. `pairingInAttesa.codice` arriva quindi vuoto (si mostrano nome e scadenza).
 */

export type NucleoTelegram = Pick<Nucleo, 'controlloTelegram' | 'telegram' | 'store' | 'percorsi' | 'logger'>;

export interface PonteTelegram {
  stato(nucleo: NucleoTelegram): StatoTelegram;
  suggerimenti(nucleo: NucleoTelegram, nomi: { nomeAssistente: string; nomeUtente: string }): SuggerimentiTelegram;
  collegaConToken(nucleo: NucleoTelegram, riga: string): Promise<EsitoCollegamento & { username?: string }>;
  confermaPairing(nucleo: NucleoTelegram, codice: string): Promise<EsitoCollegamento>;
  scollega(nucleo: NucleoTelegram): Promise<void>;
  /** Da collegare a `suEventoTelegram` del Nucleo: ricorda quando è arrivata ogni richiesta di pairing. */
  suEvento(e: EventoTelegram): void;
}

export function creaPonteTelegram(opzioni: { adesso?: () => number } = {}): PonteTelegram {
  const adesso = opzioni.adesso ?? Date.now;
  const vistiAlle = new Map<number, number>();

  return {
    suEvento(e) {
      if (e.tipo === 'pairing_richiesto' && !vistiAlle.has(e.utenteId)) vistiAlle.set(e.utenteId, adesso());
      if (e.tipo === 'collegato') vistiAlle.delete(e.utenteId);
      if (e.tipo === 'fermato') vistiAlle.clear();
    },

    stato(nucleo) {
      const controllo = nucleo.controlloTelegram;
      const canale = nucleo.telegram();
      const username = controllo.username();
      const proprietari = canale?.stato().proprietari.length ?? 0;
      const limite = adesso() - SCADENZA_PAIRING_MS;
      const inAttesa = controllo
        .pairingInAttesa()
        .map((p) => ({ p, visto: vistiAlle.get(p.utenteId) ?? adesso() }))
        .filter(({ visto }) => visto > limite)
        .sort((a, b) => b.visto - a.visto)[0];
      return {
        collegato: controllo.attivo(),
        ...(username ? { username } : {}),
        proprietarioConfermato: proprietari > 0,
        ...(inAttesa
          ? { pairingInAttesa: { codice: '', nome: inAttesa.p.nomeMostrato, scadeAlle: new Date(inAttesa.visto + SCADENZA_PAIRING_MS).toISOString() } }
          : {}),
      };
    },

    suggerimenti(nucleo, nomi) {
      const s = nucleo.controlloTelegram.suggerimenti(nomi.nomeAssistente, nomi.nomeUtente);
      // Il link "due tocchi" (Managed Bots) arriva quando il bot gestore sarà pubblicato: fino ad allora non c'è.
      return { nomeBot: s.nome, usernameSuggerito: s.username, linkBotFather: s.link };
    },

    async collegaConToken(nucleo, riga) {
      const esito = await nucleo.controlloTelegram.collega(riga);
      return { ok: esito.ok, messaggio: esito.messaggio, ...(esito.ok ? {} : { codice: 'credenziali' as const }), ...(esito.username ? { username: esito.username } : {}) };
    },

    async confermaPairing(nucleo, codice) {
      const esito = await nucleo.controlloTelegram.confermaPairing(codice);
      return { ok: esito.ok, messaggio: esito.messaggio, ...(esito.ok ? {} : { codice: 'formato' as const }) };
    },

    async scollega(nucleo) {
      const canale = nucleo.telegram();
      if (canale) await canale.ferma().catch((e: unknown) => nucleo.logger.avviso('telegram.non_fermato', { errore: e instanceof Error ? e.message : String(e) }));
      await nucleo.store.rimuovi(NOME_SEGRETO_TOKEN_TELEGRAM);
      aggiornaConfigurazione(nucleo.percorsi.datiApp, { telegram: { attivo: false, bot: null } }, nucleo.logger);
      vistiAlle.clear();
      nucleo.logger.info('telegram.scollegato', {});
    },
  };
}
