import { TETTI_MEMORIA } from '@spalla/schema';
import type { AgentRuntime, Broker, Canale, CanaleConferme, CanaleMessaggi, Logger, MemoryService, ModalitaCervello, Onboarding, OpzioniInvio, StatoOnboarding } from '../nucleo/contratti.js';
import type { ControlloTelegram } from '../nucleo/controllo-telegram.js';
import type { DispatcherEsteso } from '../nucleo/dispatcher.js';
import { leggiIdentita } from '../nucleo/identita.js';
import { MARCATORI_PREDEFINITI } from '../nucleo/marcatori.js';
import { creaCanaleConfermeCli } from './canale-conferme-cli.js';
import { creaRenderer, creaRispondiDomanda } from './rendering.js';
import { creaTelegramCli, type TelegramCli } from './telegram-cli.js';
import type { Terminale } from './terminale.js';
import { testiCli } from './testi.js';

export interface DipendenzeCli {
  runtime: AgentRuntime;
  broker: Broker;
  terminale: Terminale;
  logger: Logger;
  /** Se presente, gli scambi passano dal Dispatcher (coda unica con Telegram, marcatori, chiusura delle presentazioni). */
  dispatcher?: DispatcherEsteso;
  onboarding?: Onboarding;
  /** Canale Telegram da avviare e fermare insieme al terminale (quando non c'è il Nucleo a farlo). */
  telegram?: CanaleMessaggi;
  /** Collegamento di Telegram dal terminale (/telegram, marcatore del rituale). */
  telegramControllo?: ControlloTelegram;
  memoria?: MemoryService & { statoIndice?(): Promise<{ file: number; blocchi: number; osservazione: string }> };
  /** False se memoria e Telegram li avvia e ferma qualcun altro (il Nucleo). Predefinito: true. */
  avviaServizi?: boolean;
  /** Cartella di lavoro, per leggere i nomi da profilo/IDENTITA.md (suggerimenti BotFather). */
  cartellaLavoro?: string;
  info?: { prodotto?: string; modalita?: ModalitaCervello };
}

export interface Cli {
  /** Ciclo principale: torna quando l'utente esce o chiude l'ingresso. */
  avvia(): Promise<void>;
  /** Una riga dell'utente (messaggio o comando). False se è il comando di uscita. */
  gestisciRiga(riga: string): Promise<boolean>;
  canaleConferme: CanaleConferme;
}

const COMANDI_DISPONIBILI = ['/aiuto', '/nuova', '/stato', '/memoria', '/telegram', '/esci'];

/**
 * Terminale interattivo di sviluppo: stesso runtime, stesso Broker, stesse regole della finestra che verrà.
 * Il cablaggio dei moduli (onboarding, Telegram, memoria) lo fa chi lo crea: qui si usano solo le interfacce.
 */
export function creaCli(deps: DipendenzeCli): Cli {
  const { runtime, broker, terminale: t, logger } = deps;
  const renderer = creaRenderer(t);
  const rispondiDomanda = creaRispondiDomanda(t);
  const canaleConferme = creaCanaleConfermeCli(t);
  const prodotto = deps.info?.prodotto ?? 'Spalla';
  const avviaServizi = deps.avviaServizi !== false;
  let statoOnboarding: StatoOnboarding | undefined;

  const telegramCli: TelegramCli | undefined = deps.telegramControllo
    ? creaTelegramCli({
        terminale: t,
        controllo: deps.telegramControllo,
        logger,
        identita: () => {
          const id = deps.cartellaLavoro ? leggiIdentita(deps.cartellaLavoro) : {};
          return { nomeAssistente: id.nomeAssistente ?? prodotto, nomeUtente: id.nomeUtente ?? 'me' };
        },
        inviaSistema: (testo) => scambio(testo, 'sistema'),
      })
    : undefined;

  async function scambio(testo: string, canale: Canale = 'desktop', opzioni: Omit<OpzioniInvio, 'rispondiDomanda'> = {}): Promise<void> {
    broker.segnaAttivita('desktop');
    const messaggio = { testo, canale };
    const invio: OpzioniInvio = { ...opzioni, rispondiDomanda };
    try {
      if (deps.dispatcher) {
        await deps.dispatcher.gestisci(messaggio, async (evento) => renderer.mostra(evento), invio);
      } else {
        for await (const evento of runtime.invia(messaggio, invio)) renderer.mostra(evento);
      }
    } catch (errore) {
      logger.errore('cli.scambio_fallito', { errore: errore instanceof Error ? errore.message : String(errore) });
      renderer.mostra({ tipo: 'errore', messaggio: testiCli.errore(String(errore instanceof Error ? errore.message : errore)), codice: 'altro' });
    }
    renderer.chiudiRiga();
    await aggiornaOnboarding();
  }

  async function aggiornaOnboarding(): Promise<void> {
    if (!deps.onboarding || statoOnboarding === 'completato') return;
    const nuovo = await deps.onboarding.stato();
    if (nuovo === 'completato') {
      t.scrivi(t.attenua(testiCli.onboarding.completato) + '\n');
      const problemi = await deps.onboarding.valida();
      if (problemi.length > 0) {
        t.scrivi(testiCli.onboarding.problemi(problemi.length) + '\n');
        for (const p of problemi) t.scrivi(`  - ${p}\n`);
      }
    }
    statoOnboarding = nuovo;
  }

  /** Prima volta (o presentazioni interrotte): il rituale è il primo messaggio utente di una sessione nuova. */
  async function avviaOnboardingSeServe(): Promise<void> {
    if (!deps.onboarding) return;
    statoOnboarding = await deps.onboarding.stato();
    if (statoOnboarding === 'completato') return;
    t.scrivi(t.attenua(statoOnboarding === 'da_fare' ? testiCli.onboarding.inizio : testiCli.onboarding.ripresa) + '\n');
    await deps.onboarding.prepara();
    if (statoOnboarding === 'da_fare') await runtime.nuovaSessione();
    const iniziale = await deps.onboarding.messaggioIniziale();
    // Nel diario non va il titolo del rituale (è per l'assistente): va cosa è successo per l'utente.
    await scambio(iniziale, 'desktop', { rigaDiario: testiCli.onboarding.diarioIniziate });
  }

  async function mostraStato(): Promise<void> {
    const costi = await runtime.statoCosti();
    t.scrivi(testiCli.stato.sessione(runtime.sessioneCorrente()) + '\n');
    t.scrivi(testiCli.stato.spesa(costi.meseUsd, costi.tettoEur, costi.sopraTetto) + '\n');
    if (deps.onboarding) t.scrivi(testiCli.stato.onboarding(await deps.onboarding.stato()) + '\n');
    if (telegramCli) t.scrivi(telegramCli.rigaStato() + '\n');
    else t.scrivi(testiCli.stato.telegram(deps.telegram ? deps.telegram.nome : undefined) + '\n');
  }

  async function mostraMemoria(argomento: string): Promise<void> {
    const memoria = deps.memoria;
    if (!memoria) return;
    if (argomento.trim() === 'ricostruisci') {
      await memoria.ricostruisciIndice();
      t.scrivi(testiCli.stato.indiceRicostruito + '\n');
    }
    const c = await memoria.contatori();
    t.scrivi(testiCli.stato.memoriaRighe(c.memoriaRighe, TETTI_MEMORIA.MEMORIA_RIGHE) + '\n');
    t.scrivi(testiCli.stato.memoriaContatori(c.schede, c.diari, c.utenteCaratteri, TETTI_MEMORIA.UTENTE_CARATTERI) + '\n');
    if (memoria.statoIndice) {
      const s = await memoria.statoIndice();
      t.scrivi(testiCli.stato.memoriaDettaglio(s.file, s.blocchi, s.osservazione) + '\n');
    }
  }

  function mostraAiuto(): void {
    t.scrivi(testiCli.comandi.intestazione + '\n');
    for (const voce of testiCli.comandi.elenco) {
      if (!COMANDI_DISPONIBILI.includes(voce.comando)) continue;
      if (voce.comando === '/memoria' && !deps.memoria) continue;
      if (voce.comando === '/telegram' && !telegramCli) continue;
      t.scrivi(`${voce.comando}${' '.repeat(Math.max(1, 9 - voce.comando.length))}${voce.descrizione}\n`);
    }
    for (const r of testiCli.comandi.note) t.scrivi(r + '\n');
  }

  async function gestisciRiga(riga: string): Promise<boolean> {
    const testo = riga.trim();
    if (!testo) return true;
    if (!testo.startsWith('/')) {
      await scambio(testo);
      return true;
    }
    const [comando = testo, ...resto] = testo.split(/\s+/);
    const argomento = resto.join(' ');
    switch (comando) {
      case '/esci':
      case '/exit':
      case '/quit':
        return false;
      case '/nuova':
        await runtime.nuovaSessione();
        t.scrivi(testiCli.nuovaSessione + '\n');
        return true;
      case '/stato':
        await mostraStato();
        return true;
      case '/memoria':
        if (!deps.memoria) {
          t.scrivi(testiCli.comandoSconosciuto(comando) + '\n');
          return true;
        }
        await mostraMemoria(argomento);
        return true;
      case '/telegram':
        if (!telegramCli) {
          t.scrivi(testiCli.telegram.nonDisponibile + '\n');
          return true;
        }
        await telegramCli.comando(argomento);
        return true;
      case '/aiuto':
      case '/help':
        mostraAiuto();
        return true;
      default:
        t.scrivi(testiCli.comandoSconosciuto(comando) + '\n');
        return true;
    }
  }

  return {
    canaleConferme,
    gestisciRiga,
    async avvia() {
      const modalita = deps.info?.modalita ? testiCli.modalita[deps.info.modalita] : '?';
      t.scrivi(t.evidenzia(testiCli.intestazione(prodotto, modalita)) + '\n' + t.attenua(testiCli.comandiBrevi) + '\n\n');
      broker.registraCanale(canaleConferme);
      broker.segnaAttivita('desktop');
      // Il rituale chiede di aprire Telegram con una riga speciale: la procedura parte a fine scambio, terminale libero.
      const staccaMarcatore = telegramCli && deps.dispatcher
        ? deps.dispatcher.suMarcatore(MARCATORI_PREDEFINITI[0] as string, async () => telegramCli.daMarcatore())
        : undefined;
      try {
        if (avviaServizi) {
          await deps.memoria?.avvia();
          await deps.telegram?.avvia();
        }
        await avviaOnboardingSeServe();
        for (;;) {
          const riga = await t.chiedi(testiCli.prompt);
          if (riga === null) break;
          if (!(await gestisciRiga(riga))) break;
        }
        t.scrivi(testiCli.arrivederci + '\n');
      } finally {
        staccaMarcatore?.();
        if (avviaServizi) {
          await deps.telegram?.ferma().catch((e: unknown) => logger.avviso('cli.telegram_non_fermato', { errore: String(e) }));
          await deps.memoria?.ferma().catch((e: unknown) => logger.avviso('cli.memoria_non_fermata', { errore: String(e) }));
        }
        t.chiudi();
      }
    },
  };
}
