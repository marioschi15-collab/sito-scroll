/**
 * NUCLEO — composition root (docs/02 §3-4): costruisce e collega i servizi di lunga durata e restituisce le maniglie
 * alle interfacce (terminale di sviluppo oggi, shell Electron domani). Qui, e solo qui, i moduli si incontrano.
 */
import { LINK_INFORMATIVA_PRIVACY, permessi as testiPermessi, telegram as testiTelegram } from '@spalla/it-copy';
import type { Config } from '@spalla/schema';
import { creaAgentRuntime, CAMBIO_USD_EUR_PREDEFINITO, type FunzioneQuery } from './agent/index.js';
import { creaAuthAbbonamento, creaAuthChiaveApi, creaStoreSegreti, type StoreSegreti } from './auth/index.js';
import { creaLavoroBrief, type LavoroBrief } from './brief.js';
import { creaBroker, descriviRichiesta, type BrokerEsteso } from './broker/index.js';
import { leggiConfigurazione, aggiornaConfigurazione } from './configurazione.js';
import type { AgentRuntime, AuthProvider, Logger, Percorsi } from './contratti.js';
import { creaControlloTelegram, NOME_SEGRETO_TOKEN_TELEGRAM, type ControlloTelegram } from './controllo-telegram.js';
import { creaDispatcher, type DispatcherEsteso } from './dispatcher.js';
import { leggiIdentita } from './identita.js';
import { creaLavoroRiordino, creaMemoryService, creaSegnaleAttivita, fileSessioneAttiva, type LavoroRiordino, type MemoryServiceEsteso } from './memoria/index.js';
import { creaOnboarding, type OnboardingEsteso } from './onboarding/index.js';
import { creaRuntimeBinario, type RuntimeBinario } from './runtime/index.js';
import { creaScheduler, type SchedulerEsteso } from './scheduler/index.js';
import { creaCanaleTelegram, type CanaleTelegram, type EventoTelegram } from './telegram/index.js';
import { creaVoiceService, type VoiceServiceEsteso } from './voce/index.js';
import { creaLoggerFile } from '../cli/logger.js';

export { creaDispatcher, type DispatcherEsteso, type EsitoScambio } from './dispatcher.js';
export { creaFiltroMarcatori, MARCATORI_PREDEFINITI, type FiltroMarcatori } from './marcatori.js';
export { creaLavoroBrief, costruisciPromptBrief, TETTO_BRIEF_USD, type LavoroBrief } from './brief.js';
export { leggiConfigurazione, aggiornaConfigurazione, percorsoConfigurazione } from './configurazione.js';
export { leggiIdentita, type Identita } from './identita.js';
export { creaControlloTelegram, NOME_SEGRETO_TOKEN_TELEGRAM, type ControlloTelegram, type PairingInAttesa } from './controllo-telegram.js';

export interface OpzioniNucleo {
  percorsi: Percorsi;
  /** Sviluppo: errori anche su stderr; con SPALLA_CONFIG_EREDITATA=1 il binario usa il login di Claude Code della macchina. */
  modalitaDev?: boolean;
  /** Configurazione già letta; altrimenti si legge datiApp/config.json (predefiniti per i campi mancanti). */
  config?: Config;
  logger?: Logger;
  nomeProdotto?: string;
  /** Solo sviluppo/E2E: lascia CLAUDE_CONFIG_DIR ereditato. Predefinito: modalitaDev && SPALLA_CONFIG_EREDITATA=1. */
  usaConfigEreditata?: boolean;
  /**
   * Percorso del binario di Claude Code da dare all'SDK (query, prova di collegamento, lavori di sfondo).
   * Nell'app pacchettizzata è OBBLIGATORIO: senza, l'SDK risolve da sé il pacchetto per piattaforma dentro
   * app.asar e lo spawn fallisce (ENOTDIR). La Shell lo calcola con trovaBinarioClaude (già fuori da app.asar).
   */
  percorsoEseguibile?: string;
  /** Token del bot; altrimenti dai segreti, poi da TELEGRAM_BOT_TOKEN. */
  tokenTelegram?: string;
  /** False per non avviare Telegram anche se c'è un token (prove). */
  avviaTelegram?: boolean;
  /** Link all'informativa privacy per /start di Telegram. */
  linkPrivacy?: string;
  suEventoTelegram?: (evento: EventoTelegram) => void;
  /** Riceve il testo del buongiorno quando non va su Telegram (canale desktop o telefono non collegato). */
  suBrief?: (testo: string) => void;
  /** Iniettabili nelle prove. */
  query?: FunzioneQuery;
  adesso?: () => Date;
  motoreVoce?: 'sherpa-parakeet' | 'sherpa-whisper' | 'nessuno';
}

export interface Nucleo {
  percorsi: Percorsi;
  config: Config;
  logger: Logger;
  runtimeBinario: RuntimeBinario;
  store: StoreSegreti;
  auth: AuthProvider;
  memoria: MemoryServiceEsteso;
  broker: BrokerEsteso;
  agente: AgentRuntime;
  onboarding: OnboardingEsteso;
  scheduler: SchedulerEsteso;
  dispatcher: DispatcherEsteso;
  voce: VoiceServiceEsteso;
  lavori: { riordino: LavoroRiordino; brief: LavoroBrief };
  /** Il canale Telegram, se un token è stato trovato o collegato dopo. */
  telegram(): CanaleTelegram | undefined;
  controlloTelegram: ControlloTelegram;
  /** Ferma scheduler, Telegram, voce e memoria. */
  ferma(): Promise<void>;
}

const LINK_PRIVACY_PREDEFINITO = LINK_INFORMATIVA_PRIVACY;

function descriviErrore(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Costruisce il Nucleo e avvia i servizi: memoria (indice + osservatore), scheduler (riordino notturno, buongiorno)
 * e, se c'è un token, Telegram. L'agente non viene chiamato finché un canale non manda un messaggio.
 */
export async function avviaNucleo(opzioni: OpzioniNucleo): Promise<Nucleo> {
  const { percorsi } = opzioni;
  const modalitaDev = opzioni.modalitaDev === true;
  const nomeProdotto = opzioni.nomeProdotto ?? 'Spalla';
  const adesso = opzioni.adesso ?? (() => new Date());
  const usaConfigEreditata = opzioni.usaConfigEreditata ?? (modalitaDev && process.env.SPALLA_CONFIG_EREDITATA === '1');

  // Cartelle e ambiente del binario per primi: tutto il resto scrive lì sotto.
  const runtimeBinario = creaRuntimeBinario(percorsi, {
    usaConfigEreditata,
    ...(opzioni.percorsoEseguibile ? { percorsoEseguibile: opzioni.percorsoEseguibile } : {}),
  });
  const logger = opzioni.logger ?? creaLoggerFile(percorsi.logs, { ancheSuStderr: modalitaDev, adesso });

  const lettura = opzioni.config ? undefined : leggiConfigurazione(percorsi.datiApp, logger);
  const config = opzioni.config ?? (lettura as NonNullable<typeof lettura>).config;
  if (lettura && lettura.problemi.length > 0) logger.avviso('nucleo.config_con_problemi', { problemi: lettura.problemi.length });

  const store = creaStoreSegreti(percorsi.segreti);
  const auth: AuthProvider =
    config.cervello.modalita === 'chiave_api'
      ? creaAuthChiaveApi(store, { runtime: runtimeBinario, cwd: percorsi.cartellaLavoro })
      : creaAuthAbbonamento({ runtime: runtimeBinario, cwd: percorsi.cartellaLavoro });

  const memoria = creaMemoryService({ percorsi, logger, adesso });
  await memoria.avvia();

  const broker = creaBroker({ logger });
  const agente = creaAgentRuntime({
    percorsi, auth, broker, runtime: runtimeBinario, logger, config, memoria, descriviRichiesta, adesso,
    ...(opzioni.query ? { query: opzioni.query } : {}),
  });
  const onboarding = creaOnboarding({ percorsi, logger, nomeProdotto, adesso });

  // Un solo scambio alla volta sulla sessione principale, da qualunque canale; il riordino notturno vede il segnale.
  const segnale = creaSegnaleAttivita(fileSessioneAttiva(percorsi));
  const dispatcher = creaDispatcher({ runtime: agente, broker, logger, segnaleAttivita: segnale, adesso: () => adesso().getTime() });

  // Presentazioni: quando l'assistente ha finito il rituale (PRIMO-AVVIO.md sparito, stato.json completato),
  // l'app chiude la pratica: RISPOSTE.json, diario, impostazioni (orari, buongiorno, voce) in config.json.
  let onboardingChiuso = (await onboarding.stato()) === 'completato';
  dispatcher.dopoScambio(async (scambio) => {
    if (onboardingChiuso || scambio.tipo !== 'principale') return;
    if ((await onboarding.stato()) !== 'completato') return;
    const esito = await onboarding.completaDettagliato();
    onboardingChiuso = true;
    logger.info('nucleo.onboarding_chiuso', { ...esito });
  });

  // Voce: nel prototipo solo per le note vocali Telegram; i modelli si scaricano dalle impostazioni (prepara()).
  const voce = creaVoiceService({ percorsi, logger, motore: opzioni.motoreVoce ?? 'sherpa-parakeet' });

  // Telegram: canale opzionale, avviabile anche dopo (procedura BotFather dal terminale o dalla finestra).
  let telegram: CanaleTelegram | undefined;
  const controllo = creaControlloTelegram({
    store,
    logger,
    canale: () => telegram,
    avviaCanale: async (token) => {
      if (telegram) await telegram.ferma().catch((e: unknown) => logger.avviso('telegram.non_fermato', { errore: descriviErrore(e) }));
      telegram = undefined;
      const canale = creaCanale(token);
      await canale.avvia();
      telegram = canale;
      try {
        aggiornaConfigurazione(percorsi.datiApp, { telegram: { attivo: true, bot: canale.stato().botUsername ? `@${canale.stato().botUsername}` : null } }, logger);
      } catch (e) {
        logger.avviso('nucleo.config_non_aggiornata', { errore: descriviErrore(e) });
      }
      return canale;
    },
  });

  function creaCanale(token: string): CanaleTelegram {
    return creaCanaleTelegram({
      token,
      percorsi,
      dispatcher,
      broker,
      voce,
      logger,
      testi: { ...testiTelegram, permessi: testiPermessi },
      profilo: () => {
        const id = leggiIdentita(percorsi.cartellaLavoro);
        return { nomeAssistente: id.nomeAssistente ?? nomeProdotto, nomeUtente: id.nomeUtente, linkPrivacy: opzioni.linkPrivacy ?? LINK_PRIVACY_PREDEFINITO };
      },
      comandi: {
        nuovaSessione: () => agente.nuovaSessione(),
        stato: async () => {
          const costi = await agente.statoCosti();
          const ultimo = brief.ultimoEsito();
          return {
            pcAcceso: true,
            ultimoBrief: ultimo?.esito === 'fatto' ? ultimo.quando.slice(0, 16).replace('T', ' alle ') : undefined,
            spesaMeseEur: config.cervello.modalita === 'chiave_api' ? costi.meseUsd * CAMBIO_USD_EUR_PREDEFINITO : undefined,
            tettoEur: config.cervello.tetto_mensile_eur,
          };
        },
      },
      onEvento: (e) => {
        controllo.suEvento(e);
        opzioni.suEventoTelegram?.(e);
      },
    });
  }

  // Lavori programmati: riordino notturno (docs/03 §8) e buongiorno (base, spenta nel prototipo: docs/06 §2).
  const scheduler = creaScheduler({ logger, adesso });
  const riordino = creaLavoroRiordino({ runtime: agente, memoria, config, percorsi, logger, adesso, sessioneAttiva: () => segnale.attivaDiRecente() });
  const brief = creaLavoroBrief({
    runtime: agente, config, logger, adesso,
    consegna: async (testo, canale) => {
      // Su Telegram arriva al proprietario; al computer lo riceve l'interfaccia (terminale o finestra) tramite suBrief.
      const suTelegram = canale === 'telegram' && telegram ? await telegram.inviaAlProprietario(testo).catch(() => false) : false;
      if (!suTelegram) opzioni.suBrief?.(testo);
      logger.info('brief.consegnato', { canale, telegram: suTelegram, caratteri: testo.length });
    },
  });
  scheduler.registra(riordino);
  scheduler.registra(brief);
  scheduler.avvia();

  if (opzioni.avviaTelegram !== false) {
    const token = opzioni.tokenTelegram ?? (await store.leggi(NOME_SEGRETO_TOKEN_TELEGRAM).catch(() => undefined)) ?? process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      try {
        const canale = creaCanale(token);
        await canale.avvia();
        telegram = canale;
      } catch (e) {
        logger.errore('nucleo.telegram_non_avviato', { errore: descriviErrore(e) });
      }
    }
  }

  logger.info('nucleo.avviato', {
    modalita: config.cervello.modalita,
    configEreditata: runtimeBinario.configEreditata,
    telegram: Boolean(telegram),
    onboarding: await onboarding.stato(),
    lavori: scheduler.lavori().filter((l) => l.attivo).map((l) => l.nome),
  });

  return {
    percorsi, config, logger, runtimeBinario, store, auth, memoria, broker, agente, onboarding, scheduler, dispatcher, voce,
    lavori: { riordino, brief },
    telegram: () => telegram,
    controlloTelegram: controllo,
    async ferma() {
      scheduler.ferma();
      if (telegram) await telegram.ferma().catch((e: unknown) => logger.avviso('telegram.non_fermato', { errore: descriviErrore(e) }));
      voce.rilascia();
      await memoria.ferma().catch((e: unknown) => logger.avviso('memoria.non_fermata', { errore: descriviErrore(e) }));
      logger.info('nucleo.fermato');
    },
  };
}
