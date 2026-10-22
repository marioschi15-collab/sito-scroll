import { telegram as testiTelegram } from '@spalla/it-copy';
import type { ControlloTelegram } from '../nucleo/controllo-telegram.js';
import type { Logger } from '../nucleo/contratti.js';
import type { Terminale } from './terminale.js';
import { testiCli } from './testi.js';

export interface DipendenzeTelegramCli {
  terminale: Terminale;
  controllo: ControlloTelegram;
  logger: Logger;
  /** Nome dell'assistente e dell'utente per i suggerimenti di BotFather. */
  identita: () => { nomeAssistente: string; nomeUtente: string };
  /** Messaggio di sistema all'assistente (canale "sistema"), dopo il collegamento chiesto dal rituale. */
  inviaSistema: (testo: string) => Promise<void>;
}

export interface TelegramCli {
  /** `/telegram [riga di BotFather | codice del telefono]`. */
  comando(argomento: string): Promise<void>;
  /** Il rituale ha scritto [[APRI:TELEGRAM]]: procedura guidata e poi la risposta di sistema all'assistente. */
  daMarcatore(): Promise<void>;
  /** Riga di stato per /stato. */
  rigaStato(): string;
}

/**
 * Collegamento di Telegram dal terminale (docs/02 §8.3, procedura BotFather di riserva): suggerisce nome e
 * username, chiede la riga di BotFather, la verifica e avvia il bot; poi il telefono scrive "ciao", riceve un
 * codice e l'utente lo conferma qui con `/telegram <codice>`.
 */
export function creaTelegramCli(deps: DipendenzeTelegramCli): TelegramCli {
  const { terminale: t, controllo, logger } = deps;

  function mostraProcedura(): void {
    const id = deps.identita();
    const s = controllo.suggerimenti(id.nomeAssistente, id.nomeUtente);
    t.scrivi(t.evidenzia(testiTelegram.botfather.titolo) + '\n');
    s.passi.forEach((p, i) => t.scrivi(`  ${i + 1}. ${p}\n`));
    t.scrivi(`  ${testiTelegram.botfather.apriBotFather}: ${s.link}\n`);
    t.scrivi(`  ${testiTelegram.pairing.nomeSuggerito(id.nomeAssistente, id.nomeUtente)}  →  ${s.username}\n`);
  }

  /** Chiede la riga di BotFather e collega. True se il bot è partito. */
  async function chiediECollega(): Promise<string | undefined> {
    const riga = (await t.chiedi(testiCli.telegram.incolla))?.trim();
    if (!riga) return undefined;
    t.scrivi(t.attenua(testiCli.telegram.verifico) + '\n');
    const esito = await controllo.collega(riga);
    t.scrivi(esito.messaggio + '\n');
    return esito.ok ? esito.username : undefined;
  }

  async function confermaCodice(codice: string): Promise<void> {
    const esito = await controllo.confermaPairing(codice);
    t.scrivi((esito.ok && controllo.username() ? testiCli.telegram.confermato(controllo.username() as string) : esito.messaggio) + '\n');
  }

  return {
    async comando(argomento) {
      const arg = argomento.trim();
      if (arg) {
        if (controllo.eRigaBotFather(arg)) {
          t.scrivi(t.attenua(testiCli.telegram.verifico) + '\n');
          const esito = await controllo.collega(arg);
          t.scrivi(esito.messaggio + '\n');
          return;
        }
        if (controllo.attivo()) return confermaCodice(arg);
        t.scrivi(testiCli.telegram.uso + '\n');
        return;
      }
      if (controllo.attivo()) {
        t.scrivi(testiCli.telegram.giaCollegato(controllo.username() ?? '?') + '\n');
        for (const p of controllo.pairingInAttesa()) t.scrivi(testiCli.telegram.inAttesaCodice(p.codice, p.nomeMostrato) + '\n');
        return;
      }
      mostraProcedura();
      const username = await chiediECollega();
      if (!username) t.scrivi(testiCli.telegram.rimandato + '\n');
    },

    async daMarcatore() {
      if (controllo.attivo()) {
        await deps.inviaSistema(testiCli.telegram.sistemaCollegato(controllo.username() ?? '?'));
        return;
      }
      t.scrivi('\n' + t.evidenzia(testiCli.telegram.chiesto) + '\n');
      mostraProcedura();
      let username: string | undefined;
      try {
        username = await chiediECollega();
      } catch (errore) {
        logger.errore('cli.telegram_fallito', { errore: errore instanceof Error ? errore.message : String(errore) });
      }
      if (!username) {
        t.scrivi(testiCli.telegram.rimandato + '\n');
        await deps.inviaSistema(testiCli.telegram.sistemaNonCollegato);
        return;
      }
      await deps.inviaSistema(testiCli.telegram.sistemaCollegato(username));
    },

    rigaStato() {
      const righe = [testiCli.stato.telegram(controllo.attivo() ? controllo.username() : undefined)];
      const n = controllo.pairingInAttesa().length;
      if (n > 0) righe.push(testiCli.stato.telegramInAttesa(n));
      return righe.join('\n');
    },
  };
}
