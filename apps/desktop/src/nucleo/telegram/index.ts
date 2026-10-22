import { autoRetry } from '@grammyjs/auto-retry';
import { hydrateFiles, type FileApiFlavor, type FileFlavor } from '@grammyjs/files';
import { Bot, Context, GrammyError, InlineKeyboard, InputFile, type Api } from 'grammy';
import type { User } from 'grammy/types';
import path from 'node:path';
import type {
  Broker,
  CanaleConferme,
  CanaleMessaggi,
  DecisionePermesso,
  Dispatcher,
  DomandaUtente,
  EventoAssistente,
  Logger,
  MessaggioIn,
  Percorsi,
  RichiestaPermesso,
  VoiceService,
} from '../contratti.js';
import { cartellaInArrivo, estensioneDaMime, LIMITE_FILE_BYTE, nomeFileSicuro, percorsoLibero } from './allegati.js';
import { codificaCallback, decodificaCallback, type AmpiezzaRicomincia } from './callback.js';
import { creaCodaUscita, creaLimitatoreIngresso } from './coda-uscita.js';
import { creaConfermeTelegram, type MessaggioInviato, type TrasportoConferme } from './conferme.js';
import { creaDomandeTelegram } from './domande.js';
import { escapaHtml, PEZZI_PER_DOCUMENTO, preparaMessaggi } from './html.js';
import { creaGestorePairing } from './pairing.js';
import { creaTransformerRecupero } from './recupero.js';
import { creaArchivioStato, type StatoTelegram } from './stato.js';
import { completaTesti, type DatiStatoTelegram, type TestiTelegram } from './testi.js';
import { trascriviNotaVocale } from './vocali.js';

export { cartellaInArrivo, estensioneDaMime, LIMITE_FILE_BYTE, nomeFileSicuro, percorsoLibero } from './allegati.js';
export { creaProceduraBotFather, LINK_BOTFATHER, normalizzaToken, REGEX_TOKEN, suggerisciUsername, testiBotFatherDa } from './botfather.js';
export type { EsitoVerifica, OpzioniBotFather, ProceduraBotFather, TestiBotFather } from './botfather.js';
export { codificaCallback, decodificaCallback, interpretaConfermaTesto, MAX_CALLBACK_BYTE } from './callback.js';
export type { AmpiezzaRicomincia, DatiCallback } from './callback.js';
export { creaCodaUscita, creaLimitatoreIngresso, INTERVALLO_INVIO_MS } from './coda-uscita.js';
export { creaConfermeTelegram, schedaConferma, tastieraConferma } from './conferme.js';
export type { ConfermeTelegram, MessaggioInviato, TrasportoConferme } from './conferme.js';
export { base64url, cifraPerApp, daBase64url, decifraBusta, derivaChiaveAes, generaCoppiaEffimera, importaPubblica, INFO_HKDF, VERSIONE_BUSTA } from './crypto-coppia.js';
export type { BustaCifrata, ContenutoConsegna } from './crypto-coppia.js';
export { creaDomandeTelegram, tastieraDomanda, testoDomanda, TIMEOUT_DOMANDA_MS } from './domande.js';
export { escapaHtml, markdownAHtmlTelegram, MAX_MESSAGGIO, PEZZI_PER_DOCUMENTO, preparaMessaggi, spezzaTesto } from './html.js';
export { costruisciLink, creaClientManagedBots, ErroreCollegamento, generaNonce, REGEX_NONCE, usernameDaNonce } from './managed-bots.js';
export type { ClientManagedBots, Collegamento, OpzioniClientManagedBots } from './managed-bots.js';
export { ALFABETO_PAIRING, creaGestorePairing, generaCodicePairing, MAX_PAIRING_IN_ATTESA, normalizzaCodice, SCADENZA_PAIRING_MS } from './pairing.js';
export type { EsitoConferma, GestorePairing } from './pairing.js';
export { analizzaLotto, creaTransformerRecupero, SOGLIA_RECUPERO_MS } from './recupero.js';
export { creaArchivioStato, STATO_INIZIALE, StatoTelegramSchema } from './stato.js';
export type { ArchivioStato, PairingInAttesa, StatoTelegram } from './stato.js';
export { completaTesti, testiTelegramPredefiniti } from './testi.js';
export type { DatiStatoTelegram, TestiTelegram } from './testi.js';
export { SOGLIA_CONFIDENZA, trascriviNotaVocale } from './vocali.js';
export type { EsitoVocale, NotaVocale } from './vocali.js';

type Ctx = FileFlavor<Context>;

/** Eventi per l'interfaccia desktop (schermata Telegram delle impostazioni). */
export type EventoTelegram =
  | { tipo: 'pairing_richiesto'; codice: string; nomeMostrato: string; utenteId: number }
  | { tipo: 'collegato'; utenteId: number; nomeMostrato: string }
  | { tipo: 'conflitto' }
  | { tipo: 'sconosciuto_scartato'; totale: number }
  | { tipo: 'fermato'; motivo: 'conflitto' | 'token' | 'richiesta' };

export interface ComandiTelegram {
  /** /nuova: chiude l'argomento (AgentRuntime.nuovaSessione). */
  nuovaSessione?: () => Promise<void>;
  /** /stato: dati per la riga di stato. */
  stato?: () => Promise<DatiStatoTelegram>;
  /** /ricomincia: ri-onboarding a tre ampiezze (docs/05 §7). */
  ricomincia?: (ampiezza: Exclude<AmpiezzaRicomincia, 'annulla'>) => Promise<void>;
  /** /stop: interrompe il lavoro in corso. */
  stop?: () => Promise<void>;
  /** /voce on|off: risposte vocali (config.telegram.risposte_vocali). Assente = voce in uscita non disponibile. */
  risposteVocali?: { leggi(): boolean; scrivi(attive: boolean): Promise<void> };
}

export interface DipendenzeTelegram {
  token: string;
  percorsi: Percorsi;
  dispatcher: Dispatcher;
  broker: Broker;
  voce?: VoiceService;
  logger: Logger;
  /** `{ ...testi.telegram, permessi: testi.permessi }` da @spalla/it-copy; mancanze coperte dalla riserva. */
  testi?: Partial<TestiTelegram>;
  /** Nome dell'assistente, dell'utente e link all'informativa per /start e /aiuto. */
  profilo?: () => { nomeAssistente: string; nomeUtente?: string; linkPrivacy: string };
  comandi?: ComandiTelegram;
  onEvento?: (evento: EventoTelegram) => void;
  /** Dopo quanto tempo di lavoro si manda "Ci lavoro, circa un minuto" (default 20 s). */
  ritardoAvvisoLungoMs?: number;
  /** Limitatore in ingresso per utente (docs/02 §8.4): default 1 al secondo con raffica di 3. */
  limiteIngresso?: { alSecondo?: number; raffica?: number };
  /** Iniettabili nei test. */
  bot?: Bot;
  scaricaFile?: (fileId: string, destinazione: string) => Promise<void>;
  adesso?: () => number;
  attendi?: (ms: number) => Promise<void>;
  intervalloTypingMs?: number;
}

export interface StatoCanaleTelegram {
  attivo: boolean;
  botUsername?: string;
  proprietari: number[];
  pairingInAttesa: number;
  sconosciutiScartati: number;
  conflitto: boolean;
}

export interface CanaleTelegram extends CanaleMessaggi, CanaleConferme {
  nome: 'telegram';
  /** Il codice digitato nell'app dal desktop: promuove chi lo ha ricevuto a proprietario. */
  confermaPairing(codice: string): Promise<{ ok: boolean; messaggio: string }>;
  /** Aggiunge un proprietario noto (es. dalla consegna Managed Bots, docs/02 §8.2). */
  aggiungiProprietario(utenteId: number): Promise<void>;
  /** Un messaggio dell'app al proprietario (es. il buongiorno del mattino). False se nessun telefono è collegato. */
  inviaAlProprietario(markdown: string): Promise<boolean>;
  stato(): StatoCanaleTelegram;
}

export const PERCORSO_STATO = ['telegram', 'state.json'] as const;
export const INTERVALLO_TYPING_MS = 4000;
export const RITARDO_AVVISO_LUNGO_MS = 20_000;

function nomeMostrato(u: User): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : String(u.id));
}

function descriviErrore(errore: unknown): string {
  return errore instanceof Error ? errore.message : String(errore);
}

/**
 * Canale Telegram (docs/02 §8): un bot per utente, long polling con grammY, allowlist per id numerico,
 * conferme del Permission Broker con pulsanti, note vocali trascritte in locale, foto e documenti in `lavoro/in-arrivo/`.
 */
export function creaCanaleTelegram(deps: DipendenzeTelegram): CanaleTelegram {
  const { percorsi, dispatcher, broker, logger } = deps;
  const testi = completaTesti(deps.testi);
  const adesso = deps.adesso ?? Date.now;
  const archivio = creaArchivioStato(path.join(percorsi.datiApp, ...PERCORSO_STATO));
  const stato: StatoTelegram = archivio.stato;
  const pairing = creaGestorePairing(stato, adesso);
  const coda = creaCodaUscita({ adesso, attendi: deps.attendi });
  const limitatore = creaLimitatoreIngresso({ adesso, ...deps.limiteIngresso });
  const bot = (deps.bot ?? new Bot(deps.token)) as unknown as Bot<Ctx>;
  const ritardoAvvisoLungoMs = deps.ritardoAvvisoLungoMs ?? RITARDO_AVVISO_LUNGO_MS;
  const intervalloTypingMs = deps.intervalloTypingMs ?? INTERVALLO_TYPING_MS;

  let inEsecuzione = false;
  let conflitto = false;
  let polling: Promise<void> | undefined;
  const lavoriPerChat = new Map<number, Promise<void>>();
  const ultimoCodiceInviato = new Map<number, number>();
  const ultimoAvvisoGruppo = new Map<number, number>();
  const cancellaInAttesa = new Set<number>();
  const timerAttivi = new Set<NodeJS.Timeout>();

  // --- Trasformatori API: ritenta su 429/5xx, aggiunge download ai File, scarta i doppioni e segnala l'arretrato.
  bot.api.config.use(autoRetry({ maxRetryAttempts: 3, maxDelaySeconds: 60 }));
  bot.api.config.use(hydrateFiles(bot.token));
  const recupero = creaTransformerRecupero({
    ultimoUpdateId: () => stato.ultimoUpdateId,
    adesso,
    alRecupero: async ({ messaggi, chatId }) => {
      if (!eProprietario(chatId)) return;
      logger.info('telegram.recupero_arretrato', { messaggi });
      await inviaTesto(chatId, testi.eroSpento(messaggi));
    },
  });
  bot.api.config.use(recupero);

  bot.catch((errore) => {
    logger.errore('telegram.errore_gestore', { errore: descriviErrore(errore.error), update: errore.ctx.update.update_id });
  });

  // --- Invio
  function eProprietario(utenteId: number): boolean {
    return stato.proprietari.includes(utenteId);
  }

  function chatProprietario(): number | undefined {
    // Nelle chat private l'id della chat coincide con quello dell'utente.
    return stato.proprietari[0];
  }

  async function inviaHtml(chatId: number, html: string, tastiera?: InlineKeyboard): Promise<MessaggioInviato> {
    return coda.esegui(chatId, async () => {
      try {
        const m = await bot.api.sendMessage(chatId, html, { parse_mode: 'HTML', ...(tastiera ? { reply_markup: tastiera } : {}) });
        return { chatId, messageId: m.message_id };
      } catch (errore) {
        if (errore instanceof GrammyError && errore.error_code === 400 && /parse entities/i.test(errore.description)) {
          // HTML non gradito a Telegram: si manda il testo nudo piuttosto che niente.
          logger.avviso('telegram.html_rifiutato', { descrizione: errore.description });
          const m = await bot.api.sendMessage(chatId, html.replace(/<[^>]+>/g, ''), tastiera ? { reply_markup: tastiera } : undefined);
          return { chatId, messageId: m.message_id };
        }
        throw errore;
      }
    });
  }

  function inviaTesto(chatId: number, testo: string): Promise<MessaggioInviato> {
    return inviaHtml(chatId, escapaHtml(testo));
  }

  /** Risposta dell'assistente: HTML, pezzi ≤ 4096, oltre 3 pezzi anche come file .md (docs/02 §8.4). */
  async function rispondi(chatId: number, markdown: string): Promise<void> {
    const pezzi = preparaMessaggi(markdown);
    for (const pezzo of pezzi) await inviaHtml(chatId, pezzo);
    if (pezzi.length > PEZZI_PER_DOCUMENTO) {
      const data = new Date(adesso());
      const nome = `risposta-${data.toISOString().slice(0, 16).replace(/[T:]/g, '-')}.md`;
      await coda.esegui(chatId, () => bot.api.sendDocument(chatId, new InputFile(Buffer.from(markdown, 'utf8'), nome), { caption: testi.rispostaLunga }));
    }
  }

  const trasporto: TrasportoConferme & { aggiornaTastiera(m: MessaggioInviato, html: string, tastiera: InlineKeyboard): Promise<void> } = {
    invia: inviaHtml,
    togliTastiera: async (m) => {
      await bot.api.editMessageReplyMarkup(m.chatId, m.messageId);
    },
    rispondiCallback: async (callbackId, testo) => {
      await bot.api.answerCallbackQuery(callbackId, { text: testo.slice(0, 200) });
    },
    aggiornaTastiera: async (m, html, tastiera) => {
      await bot.api.editMessageText(m.chatId, m.messageId, html, { parse_mode: 'HTML', reply_markup: tastiera });
    },
  };

  const conferme = creaConfermeTelegram({ trasporto, chatProprietario, eProprietario, testi, logger, adesso });
  const domande = creaDomandeTelegram({ trasporto, eProprietario, testi, logger });

  const scaricaFile =
    deps.scaricaFile ??
    (async (fileId: string, destinazione: string) => {
      // hydrateFiles aggiunge `download` ai File restituiti dall'API.
      const file = await (bot.api as FileApiFlavor<Api>).getFile(fileId);
      await file.download(destinazione);
    });

  // --- Indicatore "sta scrivendo" ogni 4 s mentre l'assistente lavora.
  function avviaTyping(chatId: number): () => void {
    const manda = () => void bot.api.sendChatAction(chatId, 'typing').catch(() => undefined);
    manda();
    const timer = setInterval(manda, intervalloTypingMs);
    timerAttivi.add(timer);
    return () => {
      clearInterval(timer);
      timerAttivi.delete(timer);
    };
  }

  /**
   * Un lavoro alla volta per chat, senza bloccare il middleware: grammY elabora gli update in sequenza, quindi
   * se aspettassimo qui la risposta dell'assistente, il pulsante di conferma (o la risposta a una domanda)
   * non verrebbe mai letto. I gestori chiamano `inCoda` senza attenderla.
   */
  function inCoda(chatId: number, lavoro: () => Promise<void>): Promise<void> {
    const precedente = lavoriPerChat.get(chatId) ?? Promise.resolve();
    const prossimo = precedente
      .catch(() => undefined)
      .then(lavoro)
      .catch((errore: unknown) => logger.errore('telegram.lavoro_fallito', { errore: descriviErrore(errore) }));
    lavoriPerChat.set(chatId, prossimo);
    return prossimo;
  }

  /** Il cuore: consegna il messaggio all'assistente e riporta la risposta nella chat. */
  async function lavora(chatId: number, messaggio: MessaggioIn, prefissoHtml?: string): Promise<void> {
    const fermaTyping = avviaTyping(chatId);
    const blocchi: string[] = [];
    let avvisoLungo: MessaggioInviato | undefined;
    let ultimoAggiornamento = 0;
    const timerLungo = setTimeout(() => {
      inviaTesto(chatId, testi.ciLavoro)
        .then((m) => {
          avvisoLungo = m;
        })
        .catch(() => undefined);
    }, ritardoAvvisoLungoMs);
    timerLungo.unref?.();
    timerAttivi.add(timerLungo);

    const consegna = async (evento: EventoAssistente): Promise<void> => {
      switch (evento.tipo) {
        case 'testo':
          if (!evento.parziale && evento.testo.trim()) blocchi.push(evento.testo);
          break;
        case 'strumento':
          if (avvisoLungo && adesso() - ultimoAggiornamento > 3000) {
            ultimoAggiornamento = adesso();
            const m = avvisoLungo;
            await bot.api.editMessageText(m.chatId, m.messageId, `${testi.ciLavoro}\n${evento.descrizione}`).catch(() => undefined);
          }
          break;
        case 'errore':
          blocchi.push(evento.messaggio);
          break;
        case 'fine':
          logger.info('telegram.scambio_concluso', { durataMs: evento.durataMs, costoUsd: evento.costoUsd });
          break;
        default:
          break;
      }
    };

    try {
      await dispatcher.gestisci(messaggio, consegna, { rispondiDomanda: (domanda: DomandaUtente) => domande.chiedi(chatId, domanda) });
    } catch (errore) {
      logger.errore('telegram.dispatcher_fallito', { errore: descriviErrore(errore) });
      blocchi.push(testi.altro.erroreGenerico);
    } finally {
      clearTimeout(timerLungo);
      timerAttivi.delete(timerLungo);
      fermaTyping();
    }

    const testo = blocchi.join('\n\n').trim();
    const pezzi = testo.length > 0 ? preparaMessaggi(testo) : [];
    if (prefissoHtml) {
      if (pezzi.length === 0) await inviaHtml(chatId, prefissoHtml);
      else {
        const primo = `${prefissoHtml}\n\n${pezzi[0]}`;
        await inviaHtml(chatId, primo.length <= 4096 ? primo : prefissoHtml);
        if (primo.length > 4096) await inviaHtml(chatId, pezzi[0] as string);
      }
      for (const pezzo of pezzi.slice(1)) await inviaHtml(chatId, pezzo);
      if (pezzi.length > PEZZI_PER_DOCUMENTO) await rispondiComeDocumento(chatId, testo);
      return;
    }
    if (pezzi.length === 0) await inviaTesto(chatId, testi.conferme.fatto);
    else await rispondi(chatId, testo);
  }

  async function rispondiComeDocumento(chatId: number, markdown: string): Promise<void> {
    const data = new Date(adesso());
    const nome = `risposta-${data.toISOString().slice(0, 16).replace(/[T:]/g, '-')}.md`;
    await coda.esegui(chatId, () => bot.api.sendDocument(chatId, new InputFile(Buffer.from(markdown, 'utf8'), nome), { caption: testi.rispostaLunga }));
  }

  // --- Cancello d'ingresso: doppioni, gruppi, allowlist, pairing, limitatore.
  bot.use(async (ctx, next) => {
    const updateId = ctx.update.update_id;
    if (stato.ultimoUpdateId !== undefined && updateId <= stato.ultimoUpdateId) return;
    stato.ultimoUpdateId = updateId;
    archivio.salvaPresto();

    const da = ctx.from;
    const chat = ctx.chat;
    if (!da || !chat) return;

    if (chat.type !== 'private') {
      const ultimo = ultimoAvvisoGruppo.get(chat.id) ?? 0;
      if (ctx.message && adesso() - ultimo > 60 * 60 * 1000) {
        ultimoAvvisoGruppo.set(chat.id, adesso());
        await inviaTesto(chat.id, testi.gruppi).catch(() => undefined);
      }
      return;
    }

    if (eProprietario(da.id)) {
      if (!limitatore.ammetti(da.id)) {
        stato.ingressoLimitato++;
        archivio.salvaPresto();
        logger.avviso('telegram.ingresso_limitato', { totale: stato.ingressoLimitato });
        return;
      }
      broker.segnaAttivita('telegram');
      await next();
      return;
    }

    if (stato.proprietari.length === 0) {
      if (!ctx.message) return;
      const richiesta = pairing.richiedi({ utenteId: da.id, chatId: chat.id, nomeMostrato: nomeMostrato(da) });
      await archivio.salva();
      const ultimo = ultimoCodiceInviato.get(da.id) ?? 0;
      if (adesso() - ultimo > 60_000) {
        ultimoCodiceInviato.set(da.id, adesso());
        // La riga sulla privacy va mostrata già qui (docs/02 §8.4): /start potrebbe non arrivare mai dopo il collegamento.
        await inviaTesto(chat.id, `${testi.pairing.codice(richiesta.codice)}\n${testi.pairing.privacy(profilo(da).linkPrivacy)}`).catch(() => undefined);
      }
      logger.info('telegram.pairing_richiesto', { utenteId: da.id });
      deps.onEvento?.({ tipo: 'pairing_richiesto', codice: richiesta.codice, nomeMostrato: richiesta.nomeMostrato, utenteId: da.id });
      return;
    }

    // Sconosciuto con un proprietario già presente: silenzio e conteggio (docs/02 §8.5).
    stato.sconosciutiScartati++;
    archivio.salvaPresto();
    logger.info('telegram.sconosciuto_scartato', { totale: stato.sconosciutiScartati });
    deps.onEvento?.({ tipo: 'sconosciuto_scartato', totale: stato.sconosciutiScartati });
  });

  // --- Pulsanti
  bot.on('callback_query:data', async (ctx) => {
    const dati = decodificaCallback(ctx.callbackQuery.data);
    const callbackId = ctx.callbackQuery.id;
    const utenteId = ctx.callbackQuery.from.id;
    if (!dati) {
      await ctx.answerCallbackQuery({ text: testi.permessi.richiestaVecchia }).catch(() => undefined);
      return;
    }
    if (dati.tipo === 'permesso') {
      await conferme.gestisciCallback(callbackId, utenteId, dati);
      return;
    }
    if (dati.tipo === 'domanda') {
      await domande.gestisciCallback(callbackId, utenteId, dati);
      return;
    }
    await ctx.answerCallbackQuery().catch(() => undefined);
    const messaggio = ctx.callbackQuery.message;
    if (messaggio) await bot.api.editMessageReplyMarkup(messaggio.chat.id, messaggio.message_id).catch(() => undefined);
    await gestisciRicomincia(utenteId, dati.ampiezza);
  });

  async function gestisciRicomincia(chatId: number, ampiezza: AmpiezzaRicomincia): Promise<void> {
    if (ampiezza === 'annulla') {
      await inviaTesto(chatId, testi.ricomincia.tuttoAnnullato);
      return;
    }
    if (ampiezza === 'tutto') {
      cancellaInAttesa.add(chatId);
      await inviaTesto(chatId, `${testi.ricomincia.tuttoConferma}\n${testi.ricomincia.nota}`);
      return;
    }
    await eseguiRicomincia(chatId, ampiezza);
  }

  async function eseguiRicomincia(chatId: number, ampiezza: Exclude<AmpiezzaRicomincia, 'annulla'>): Promise<void> {
    const azione = deps.comandi?.ricomincia;
    if (!azione) {
      await inviaTesto(chatId, testi.altro.soloDalComputer);
      return;
    }
    try {
      await azione(ampiezza);
      await inviaTesto(chatId, `${testi.conferme.fatto} ${testi.ricomincia.nota}`);
    } catch (errore) {
      logger.errore('telegram.ricomincia_fallito', { ampiezza, errore: descriviErrore(errore) });
      await inviaTesto(chatId, testi.altro.erroreGenerico);
    }
  }

  // --- Comandi (setMyCommands in avvia)
  function profilo(da: User) {
    const p = deps.profilo?.();
    return { nomeAssistente: p?.nomeAssistente ?? 'Spalla', nomeUtente: p?.nomeUtente ?? da.first_name, linkPrivacy: p?.linkPrivacy ?? '—' };
  }

  bot.command('start', async (ctx) => {
    const p = profilo(ctx.from as User);
    await inviaTesto(ctx.chat.id, testi.start(p.nomeAssistente, p.nomeUtente, p.linkPrivacy));
  });
  bot.command('aiuto', async (ctx) => {
    await inviaTesto(ctx.chat.id, testi.aiuto(profilo(ctx.from as User).nomeAssistente));
  });
  bot.command('voce', async (ctx) => {
    const argomento = ctx.match.trim().toLowerCase();
    const vocali = deps.comandi?.risposteVocali;
    if (argomento === 'on') {
      if (!vocali) return void (await inviaTesto(ctx.chat.id, testi.voce.nonDisponibile));
      await vocali.scrivi(true);
      return void (await inviaTesto(ctx.chat.id, testi.voce.accesa));
    }
    if (argomento === 'off') {
      await vocali?.scrivi(false);
      return void (await inviaTesto(ctx.chat.id, testi.voce.spenta));
    }
    await inviaTesto(ctx.chat.id, testi.voce.uso);
  });
  bot.command('stato', async (ctx) => {
    let dati: DatiStatoTelegram = { pcAcceso: true };
    try {
      dati = (await deps.comandi?.stato?.()) ?? dati;
    } catch (errore) {
      logger.avviso('telegram.stato_non_disponibile', { errore: descriviErrore(errore) });
    }
    await inviaTesto(ctx.chat.id, testi.stato(dati));
  });
  bot.command('stop', async (ctx) => {
    await deps.comandi?.stop?.().catch((errore: unknown) => logger.avviso('telegram.stop_fallito', { errore: descriviErrore(errore) }));
    await inviaTesto(ctx.chat.id, testi.stop);
  });
  bot.command('nuova', async (ctx) => {
    const azione = deps.comandi?.nuovaSessione;
    if (!azione) return void (await inviaTesto(ctx.chat.id, testi.altro.soloDalComputer));
    await azione();
    await inviaTesto(ctx.chat.id, testi.nuova);
  });
  bot.command('ricomincia', async (ctx) => {
    if (!deps.comandi?.ricomincia) return void (await inviaTesto(ctx.chat.id, testi.altro.soloDalComputer));
    const tastiera = new InlineKeyboard()
      .text(testi.ricomincia.opzioni.presentazioni, codificaCallback({ tipo: 'ricomincia', ampiezza: 'presentazioni' }))
      .row()
      .text(testi.ricomincia.opzioni.squadra, codificaCallback({ tipo: 'ricomincia', ampiezza: 'squadra' }))
      .row()
      .text(testi.ricomincia.opzioni.tutto, codificaCallback({ tipo: 'ricomincia', ampiezza: 'tutto' }))
      .row()
      .text(testi.altro.annulla, codificaCallback({ tipo: 'ricomincia', ampiezza: 'annulla' }));
    await inviaHtml(ctx.chat.id, escapaHtml(testi.ricomincia.domanda), tastiera);
  });

  // --- Testo
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id;
    const utenteId = ctx.from.id;
    const testo = ctx.message.text;

    if (conferme.gestisciTesto(utenteId, testo)) return;
    if (cancellaInAttesa.has(chatId)) {
      cancellaInAttesa.delete(chatId);
      if (testo.trim().toLowerCase() === 'cancella') await eseguiRicomincia(chatId, 'tutto');
      else await inviaTesto(chatId, testi.ricomincia.tuttoAnnullato);
      return;
    }
    if (domande.rispondiConTesto(chatId, testo)) return;
    if (testo.startsWith('/')) {
      await inviaTesto(chatId, testi.aiuto(profilo(ctx.from).nomeAssistente));
      return;
    }
    void inCoda(chatId, () => lavora(chatId, { testo, canale: 'telegram', utenteId: String(utenteId) }));
  });

  // --- Note vocali (docs/02 §8.4)
  bot.on('message:voice', async (ctx) => {
    const chatId = ctx.chat.id;
    const utenteId = ctx.from.id;
    const nota = ctx.message.voice;
    void inCoda(chatId, async () => {
      const fermaTyping = avviaTyping(chatId);
      let esito;
      try {
        esito = await trascriviNotaVocale(
          { voce: deps.voce, testi, logger, cartellaTemporanea: path.join(percorsi.datiLocali, 'tmp'), scarica: scaricaFile, adesso },
          { file_id: nota.file_id, file_size: nota.file_size, duration: nota.duration },
        );
      } finally {
        fermaTyping();
      }
      if (esito.esito === 'errore') {
        await inviaTesto(chatId, esito.messaggio);
        return;
      }
      const prefisso = esito.mostraTrascrizione ? testi.notaVocale.hoCapito(escapaHtml(esito.testo)) : undefined;
      await lavora(chatId, { testo: esito.testo, canale: 'telegram', utenteId: String(utenteId) }, prefisso);
    });
  });

  // --- Foto e documenti → lavoro/in-arrivo/
  async function salvaEConsegna(chatId: number, utenteId: number, file: { file_id: string; file_size?: number; nome: string; mime?: string }, didascalia: string | undefined, testoRiserva: string): Promise<void> {
    if (file.file_size !== undefined && file.file_size > LIMITE_FILE_BYTE) {
      await inviaTesto(chatId, testi.allegati.troppoGrande);
      return;
    }
    const nome = nomeFileSicuro(file.nome, `allegato${estensioneDaMime(file.mime, '')}`, new Date(adesso()));
    const destinazione = await percorsoLibero(cartellaInArrivo(percorsi.cartellaLavoro), nome);
    try {
      await scaricaFile(file.file_id, destinazione);
    } catch (errore) {
      logger.avviso('telegram.allegato_non_scaricato', { errore: descriviErrore(errore) });
      await inviaTesto(chatId, testi.altro.fileNonScaricato);
      return;
    }
    logger.info('telegram.allegato_salvato', { byte: file.file_size, estensione: path.extname(destinazione) });
    await inviaTesto(chatId, testi.allegati.ricevuto(path.basename(destinazione)));
    void inCoda(chatId, () => lavora(chatId, { testo: didascalia?.trim() || testoRiserva, canale: 'telegram', utenteId: String(utenteId), allegati: [destinazione] }));
  }

  bot.on('message:photo', async (ctx) => {
    const foto = ctx.message.photo[ctx.message.photo.length - 1];
    if (!foto) return;
    await salvaEConsegna(ctx.chat.id, ctx.from.id, { file_id: foto.file_id, file_size: foto.file_size, nome: 'foto.jpg', mime: 'image/jpeg' }, ctx.message.caption, testi.altro.fotoSenzaDidascalia);
  });
  bot.on('message:document', async (ctx) => {
    const d = ctx.message.document;
    await salvaEConsegna(ctx.chat.id, ctx.from.id, { file_id: d.file_id, file_size: d.file_size, nome: d.file_name ?? `documento${estensioneDaMime(d.mime_type, '')}`, mime: d.mime_type }, ctx.message.caption, testi.altro.documentoSenzaDidascalia);
  });
  bot.on('message', async (ctx) => {
    await inviaTesto(ctx.chat.id, testi.allegati.tipoNonGestito);
  });

  // --- Ciclo di vita
  async function gestisciErrorePolling(errore: unknown): Promise<void> {
    if (errore instanceof GrammyError && errore.error_code === 409) {
      conflitto = true;
      logger.errore('telegram.conflitto', { descrizione: errore.description });
      deps.onEvento?.({ tipo: 'conflitto' });
      const chatId = chatProprietario();
      if (chatId !== undefined) await inviaTesto(chatId, testi.altraCopiaAttiva).catch(() => undefined);
      deps.onEvento?.({ tipo: 'fermato', motivo: 'conflitto' });
      return;
    }
    if (errore instanceof GrammyError && errore.error_code === 401) {
      logger.errore('telegram.token_rifiutato');
      deps.onEvento?.({ tipo: 'fermato', motivo: 'token' });
      return;
    }
    logger.errore('telegram.polling_interrotto', { errore: descriviErrore(errore) });
  }

  const canale: CanaleTelegram = {
    nome: 'telegram',

    async avvia() {
      if (inEsecuzione) return;
      await bot.init();
      stato.botUsername = bot.botInfo.username;
      await archivio.salva();
      try {
        await bot.api.setMyCommands(testi.comandi.map((c) => ({ command: c.comando, description: c.descrizione })));
      } catch (errore) {
        logger.avviso('telegram.comandi_non_impostati', { errore: descriviErrore(errore) });
      }
      broker.registraCanale(canale);
      recupero.riavvia();
      conflitto = false;
      inEsecuzione = true;
      polling = bot
        .start({
          allowed_updates: ['message', 'callback_query'],
          onStart: (me) => logger.info('telegram.avviato', { username: me.username, proprietari: stato.proprietari.length }),
        })
        .catch((errore: unknown) => gestisciErrorePolling(errore))
        .finally(() => {
          inEsecuzione = false;
        });
    },

    async ferma() {
      conferme.annullaTutte();
      domande.annullaTutte();
      for (const t of timerAttivi) clearTimeout(t);
      timerAttivi.clear();
      if (bot.isRunning()) await bot.stop();
      await polling?.catch(() => undefined);
      polling = undefined;
      inEsecuzione = false;
      await archivio.svuota();
      deps.onEvento?.({ tipo: 'fermato', motivo: 'richiesta' });
    },

    disponibile: () => inEsecuzione && !conflitto && stato.proprietari.length > 0,

    chiediConferma(richiesta: RichiestaPermesso, timeoutMs: number): Promise<DecisionePermesso> {
      return conferme.chiediConferma(richiesta, timeoutMs);
    },

    async confermaPairing(codice: string) {
      const esito = pairing.conferma(codice);
      if (!esito.ok) {
        return { ok: false, messaggio: esito.motivo === 'scaduto' ? testi.pairing.codiceScaduto : testi.pairing.codiceNonValido };
      }
      await archivio.salva();
      logger.info('telegram.pairing_confermato', { utenteId: esito.pairing.utenteId });
      deps.onEvento?.({ tipo: 'collegato', utenteId: esito.pairing.utenteId, nomeMostrato: esito.pairing.nomeMostrato });
      const username = stato.botUsername ?? '';
      await inviaTesto(esito.pairing.chatId, testi.pairing.collegato(username)).catch(() => undefined);
      return { ok: true, messaggio: testi.pairing.collegato(username) };
    },

    async aggiungiProprietario(utenteId: number) {
      if (!Number.isInteger(utenteId)) throw new RangeError('id utente non valido');
      if (!stato.proprietari.includes(utenteId)) stato.proprietari.push(utenteId);
      stato.pairing = [];
      await archivio.salva();
      logger.info('telegram.proprietario_aggiunto', { utenteId });
    },

    async inviaAlProprietario(markdown: string) {
      const chatId = chatProprietario();
      if (chatId === undefined || !inEsecuzione) return false;
      await rispondi(chatId, markdown);
      return true;
    },

    stato: () => ({
      attivo: inEsecuzione,
      botUsername: stato.botUsername,
      proprietari: [...stato.proprietari],
      pairingInAttesa: pairing.inAttesa().length,
      sconosciutiScartati: stato.sconosciutiScartati,
      conflitto,
    }),
  };

  return canale;
}
