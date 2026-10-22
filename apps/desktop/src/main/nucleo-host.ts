/**
 * HOST DEL NUCLEO (docs/02 §3-4): il punto in cui la Shell parla con il Nucleo.
 *
 * Nel prototipo il Nucleo gira NEL PROCESSO PRINCIPALE (`avviaNucleo` chiamato qui). L'obiettivo della v1 è un
 * `utilityProcess` isolato con IPC su MessagePort (ADR-012): per questo tutto passa da `HostNucleo`, un'interfaccia
 * fatta di chiamate già validate (`chiama(nome, argomenti)`) ed eventi (`emetti`), che si può spostare dietro una
 * porta senza toccare la finestra né i gestori IPC di Electron.
 *
 * Questo file NON importa Electron: ciò che serve del sistema (finestra attiva, dialoghi, notifiche, avvio al login)
 * arriva da `PiattaformaShell`. Così vitest lo prova con un Nucleo finto.
 */
import path from 'node:path';
import fsp from 'node:fs/promises';
import os from 'node:os';
import {
  cervello as testiCervello,
  cli as testiCli,
  errori as testiErrori,
  etichettaRuolo,
  onboarding as testiOnboarding,
  permessi as testiPermessi,
  principale,
} from '@spalla/it-copy';
import { MARCATORI_APP } from '@spalla/schema';
import type {
  ApiSpalla,
  EsitoCollegamento,
  NomeInvoke,
  PermessoInAttesa,
  StatoApp,
  StatoTelegram,
} from '../ipc/contratto.js';
import type { ArgomentiDi } from '../ipc/schemi.js';
import { CAMBIO_USD_EUR_PREDEFINITO } from '../nucleo/agent/index.js';
import { creaAuthChiaveApi, formatoChiaveValido, messaggioPerEsito, provaCollegamento, type EsitoProva, type OpzioniProva } from '../nucleo/auth/index.js';
import { aggiornaConfigurazione, leggiConfigurazione } from '../nucleo/configurazione.js';
import type {
  CanaleConferme,
  DecisionePermesso,
  DomandaUtente,
  EventoAssistente,
  Logger,
  MessaggioIn,
  ModalitaCervello,
  OpzioniInvio,
  Percorsi,
  RichiestaPermesso,
  RispostaUtente,
} from '../nucleo/contratti.js';
import { leggiIdentita } from '../nucleo/identita.js';
import type { Nucleo, OpzioniNucleo } from '../nucleo/index.js';
import { ambientePerBinario, type RuntimeBinario } from '../nucleo/runtime/index.js';
import type { EventoTelegram } from '../nucleo/telegram/index.js';
import { allegatiPerNucleo, copiaAllegati } from './allegati.js';
import { dataLocaleIso, scriviZip } from './esporta.js';
import { impostazioniDaConfig, modificheConfig, richiedeRiavvio } from './impostazioni.js';
import { elencoFileMemoria, leggiFileMemoria } from './memoria.js';
import { percorsoPrecedente, riapriPresentazioni, risposteOnboarding } from './onboarding.js';
import { creaPannelloLogin, type FunzioneSpawn, type PannelloLogin } from './pannello-login.js';
import { comeAprire, risolviDentro } from './percorsi-sicuri.js';
import { elencoRuoli, ruoloEsiste } from './squadra.js';
import { aggiornaStatoFinestra, calcolaSchermataIniziale, leggiStatoFinestra } from './stato-finestra.js';
import { creaPonteTelegram } from './telegram.js';

// ---------------------------------------------------------------------------------------------------------
// Tipi: gestori derivati dal contratto, eventi
// ---------------------------------------------------------------------------------------------------------

type MetodiApi = Omit<ApiSpalla, 'on' | 'allegati'> & { allegati: NonNullable<ApiSpalla['allegati']> };
type FunzioneDi<N extends NomeInvoke> = N extends `${infer G}.${infer M}`
  ? G extends keyof MetodiApi
    ? M extends keyof MetodiApi[G]
      ? MetodiApi[G][M]
      : never
    : never
  : never;

/** Ciò che ogni metodo restituisce alla finestra (dal contratto). */
export type RisultatoDi<N extends NomeInvoke> = FunzioneDi<N> extends (...a: never[]) => Promise<infer R> ? R : never;

/** Una funzione per metodo: argomenti già validati (schemi.ts), risultato del contratto. */
export type Gestori = { [N in NomeInvoke]: (...argomenti: ArgomentiDi<N>) => Promise<RisultatoDi<N>> };

export type NomeEventoBreve = keyof ApiSpalla['on'];
export type DatiEvento<E extends NomeEventoBreve> = Parameters<Parameters<NonNullable<ApiSpalla['on'][E]>>[0]>[0];
/** Manda un evento alla finestra (`webContents.send('evento.<nome>', dati)` nella Shell). */
export type Emetti = <E extends NomeEventoBreve>(nome: E, dati: DatiEvento<E>) => void;

/** Errore con un messaggio già in italiano per l'utente: attraversa il confine IPC così com'è. */
export class ErroreUtente extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'ErroreUtente';
  }
}

/** Ciò che serve del sistema operativo (Electron nella Shell, finto nelle prove). */
export interface PiattaformaShell {
  versione: string;
  nomeProdotto: string;
  /** True se la finestra è in primo piano. */
  finestraAttiva(): boolean;
  /** Apre file o cartella con il programma di sistema; restituisce '' se ok, altrimenti un messaggio d'errore. */
  apriPercorso(assoluto: string): Promise<string>;
  mostraNellaCartella(assoluto: string): void;
  apriLink(url: string): Promise<void>;
  /** Dialogo "Salva con nome" per lo zip; undefined se annullato. */
  scegliDestinazioneZip(nomeProposto: string): Promise<string | undefined>;
  avvioAutomatico(): boolean | undefined;
  impostaAvvioAutomatico(attivo: boolean): void;
  notificaSistema(titolo: string, testo: string): void;
  /** Nasconde la finestra (l'app resta nella barra). */
  nascondiFinestra(): void;
}

export interface DipendenzeHost {
  percorsi: Percorsi;
  /** Avvia il Nucleo (nella Shell: `avviaNucleo` con il logger su file). */
  avviaNucleo(opzioni: Pick<OpzioniNucleo, 'suEventoTelegram' | 'suBrief'>): Promise<Nucleo>;
  piattaforma: PiattaformaShell;
  emetti: Emetti;
  /** Logger da usare prima che il Nucleo sia partito. */
  logger: Logger;
  /** Binario di Claude Code per il pannello di collegamento. */
  trovaBinario(riserva: string | undefined): string | undefined;
  /** Iniettabili nelle prove. */
  spawnPty?: FunzioneSpawn;
  prova?: (variabiliAuth: Record<string, string>, opzioni: OpzioniProva) => Promise<EsitoProva>;
  adesso?: () => number;
  /** Dopo quanto la finestra è "inattiva" per le conferme (docs/02 §6: 5 minuti). */
  inattivitaMs?: number;
  /** Solo sviluppo e prove: tetto di passi per ogni scambio della finestra (SPALLA_MAX_TURNI), per contenere i costi. */
  maxTurniPerScambio?: number;
}

export interface HostNucleo {
  avvia(): Promise<void>;
  ferma(): Promise<void>;
  /** Esegue un metodo dell'API con argomenti GIÀ validati da `validaArgomenti`. */
  chiama<N extends NomeInvoke>(nome: N, argomenti: ArgomentiDi<N>): Promise<RisultatoDi<N>>;
  ripresaDalSonno(): Promise<void>;
  /** Input dell'utente nella finestra (focus, tasti, clic): conta per la regola "desktop attivo da 5 minuti". */
  segnaAttivitaUtente(): void;
  /** Righe per la voce "Stato" del menu dell'icona. */
  righeStato(): Promise<string[]>;
  pronto(): boolean;
}

// ---------------------------------------------------------------------------------------------------------
// Pulizia di ciò che attraversa il confine verso la finestra
// ---------------------------------------------------------------------------------------------------------

/**
 * La richiesta come la vede la finestra: senza il segnale di annullamento (non clonabile) e senza l'input grezzo
 * dello strumento (può contenere percorsi assoluti e contenuti lunghi: per decidere bastano descrizione e anteprima).
 */
export function richiestaPerFinestra(r: RichiestaPermesso): RichiestaPermesso {
  const { annullamento: _annullamento, input: _input, ...resto } = r;
  return { ...resto, input: null };
}

export function eventoPerFinestra(e: EventoAssistente): EventoAssistente {
  return e.tipo === 'permesso' ? { tipo: 'permesso', richiesta: richiestaPerFinestra(e.richiesta) } : e;
}

function descrivi(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Percorso scelto dall'utente, con la home abbreviata in "~" (la finestra non riceve percorsi assoluti di sistema). */
export function percorsoLeggibile(assoluto: string, home = os.homedir()): string {
  const rel = path.relative(home, assoluto);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? `~/${rel.split(path.sep).join('/')}` : path.basename(assoluto);
}

// ---------------------------------------------------------------------------------------------------------
// Host in-process
// ---------------------------------------------------------------------------------------------------------

interface ScambioAperto {
  interrotto: boolean;
  canale: MessaggioIn['canale'];
  /** [Fermati]: ferma davvero la query dell'SDK (OpzioniInvio.annullamento). */
  controllo: AbortController;
  domande: Map<string, (r: RispostaUtente) => void>;
}

interface PermessoAperto {
  richiesta: RichiestaPermesso;
  chiudi(d: DecisionePermesso): void;
}

const INATTIVITA_PREDEFINITA_MS = 5 * 60 * 1000;

export function creaHostNucleo(deps: DipendenzeHost): HostNucleo {
  const { percorsi, piattaforma, emetti } = deps;
  const cartella = percorsi.cartellaLavoro;
  const adesso = deps.adesso ?? Date.now;
  const prova = deps.prova ?? provaCollegamento;
  const inattivitaMs = deps.inattivitaMs ?? INATTIVITA_PREDEFINITA_MS;
  const ponteTelegram = creaPonteTelegram({ adesso });

  let nucleo: Nucleo | undefined;
  let avvio: Promise<Nucleo> | undefined;
  let riavvio: Promise<void> | undefined;
  let riavvioRichiesto = false;
  let fermato = false;
  let ultimaAttivita = Number.NEGATIVE_INFINITY;
  /** Il rituale ha aperto la sezione Telegram ([[APRI:TELEGRAM]]): l'esito va detto all'assistente. */
  let telegramDaRituale = false;
  let contatoreSistema = 0;
  let voceInDownload = false;
  let voceFrazione: number | undefined;
  let ultimoRuntime: RuntimeBinario | undefined;

  const scambi = new Map<string, ScambioAperto>();
  const permessi = new Map<string, PermessoAperto>();

  const logger = (): Logger => nucleo?.logger ?? deps.logger;

  async function richiedi(): Promise<Nucleo> {
    if (nucleo) return nucleo;
    if (avvio) return avvio;
    throw new ErroreUtente(principale.errori.nucleoNonPronto);
  }

  function occupato(): boolean {
    return scambi.size > 0 || (nucleo?.dispatcher.inCoda() ?? 0) > 0;
  }

  // ----- conferme sul desktop (docs/02 §6) -----

  function desktopDisponibile(): boolean {
    return piattaforma.finestraAttiva() || adesso() - ultimaAttivita < inattivitaMs;
  }

  /** C'è uno scambio della finestra fermato con [Fermati] che non ha ancora finito di chiudersi. */
  function scambioFinestraFermato(): boolean {
    for (const s of scambi.values()) if (s.interrotto && (s.canale === 'desktop' || s.canale === 'voce')) return true;
    return false;
  }

  const canaleDesktop: CanaleConferme = {
    nome: 'desktop',
    disponibile: desktopDisponibile,
    chiediConferma(richiesta, timeoutMs) {
      // L'utente ha detto [Fermati]: nessuna nuova scheda per quel lavoro, nemmeno se l'SDK chiede ancora qualcosa.
      if ((richiesta.canaleOrigine === 'desktop' || richiesta.canaleOrigine === 'voce') && scambioFinestraFermato()) {
        return Promise.resolve({ esito: 'nega', motivo: principale.chat.motivoInterrotto });
      }
      return new Promise<DecisionePermesso>((risolvi) => {
        const id = richiesta.id;
        const suAnnullamento = (): void => chiudi({ esito: 'nega', motivo: testiPermessi.esiti.annullata });
        const timer = setTimeout(() => chiudi({ esito: 'nega', motivo: testiPermessi.esiti.scaduto }), timeoutMs);
        function chiudi(d: DecisionePermesso): void {
          if (permessi.get(id)?.richiesta !== richiesta) return;
          permessi.delete(id);
          clearTimeout(timer);
          richiesta.annullamento?.removeEventListener('abort', suAnnullamento);
          emetti('permessoChiuso', id);
          risolvi(d);
        }
        permessi.set(id, { richiesta, chiudi });
        if (richiesta.annullamento?.aborted) return suAnnullamento();
        richiesta.annullamento?.addEventListener('abort', suAnnullamento, { once: true });
        emetti('permesso', { richiesta: richiestaPerFinestra(richiesta) });
        if (!piattaforma.finestraAttiva()) {
          const chi = richiesta.ruolo ? etichettaRuolo(richiesta.ruolo) : (nucleo ? leggiIdentita(cartella).nomeAssistente : undefined) ?? piattaforma.nomeProdotto;
          piattaforma.notificaSistema(principale.notifiche.permesso.titolo(chi), principale.notifiche.permesso.apri);
        }
      });
    },
  };

  // ----- scambi di chat -----

  /** Chiude con un "fermati" le domande ancora aperte dello scambio e lo dice alla finestra (chip spente). */
  function chiudiDomande(scambioId: string, scambio: ScambioAperto): void {
    for (const [id, risolvi] of scambio.domande) {
      risolvi({ id, risposte: [principale.chat.motivoInterrotto] });
      emetti('domandaChiusa', { scambioId, id });
    }
    scambio.domande.clear();
  }

  function avviaScambio(n: Nucleo, scambioId: string, messaggio: MessaggioIn, extra: Pick<OpzioniInvio, 'rigaDiario'> = {}): void {
    const scambio: ScambioAperto = { interrotto: false, canale: messaggio.canale, controllo: new AbortController(), domande: new Map() };
    scambi.set(scambioId, scambio);
    const consegna = async (evento: EventoAssistente): Promise<void> => {
      // Le schede di permesso arrivano SOLO da canaleDesktop (quando il Broker sceglie la finestra): se la richiesta
      // è andata su Telegram, una scheda qui mostrerebbe un [Consenti] che non decide nulla.
      if (evento.tipo === 'permesso') return;
      if (!scambio.interrotto) emetti('eventoScambio', { scambioId, evento: eventoPerFinestra(evento) });
    };
    const rispondiDomanda = (domanda: DomandaUtente): Promise<RispostaUtente> =>
      new Promise((risolvi) => {
        if (scambio.interrotto) return risolvi({ id: domanda.id, risposte: [principale.chat.motivoInterrotto] });
        scambio.domande.set(domanda.id, risolvi);
        emetti('domanda', { scambioId, domanda });
      });
    void n.dispatcher
      .gestisci(messaggio, consegna, {
        rispondiDomanda,
        annullamento: scambio.controllo.signal,
        ...(deps.maxTurniPerScambio ? { maxTurni: deps.maxTurniPerScambio } : {}),
        ...extra,
      })
      .catch((errore: unknown) => {
        logger().errore('finestra.scambio_fallito', { errore: descrivi(errore) });
        if (!scambio.interrotto) emetti('eventoScambio', { scambioId, evento: { tipo: 'errore', codice: 'altro', messaggio: testiErrori.altro } });
      })
      .finally(() => {
        chiudiDomande(scambioId, scambio);
        scambi.delete(scambioId);
        void emettiStatoApp();
      });
  }

  /** Una riga dell'app per l'assistente (es. "Telegram collegato"): scambio di sistema mostrato nella chat. */
  function inviaSistema(n: Nucleo, testo: string): void {
    contatoreSistema += 1;
    avviaScambio(n, `sistema-${adesso().toString(36)}-${contatoreSistema}`, { testo, canale: 'sistema' });
  }

  // ----- stato -----

  function modalitaScelta(n: Nucleo, haChiave: boolean): ModalitaCervello | undefined {
    const finestra = leggiStatoFinestra(percorsi.datiApp);
    if (finestra.modalitaScelta) return finestra.modalitaScelta;
    // Chi ha già usato il terminale di sviluppo con una chiave salvata non rifà la scelta.
    const lettura = leggiConfigurazione(percorsi.datiApp);
    return lettura.presente && n.config.cervello.modalita === 'chiave_api' && haChiave ? 'chiave_api' : undefined;
  }

  async function calcolaStatoApp(n: Nucleo): Promise<StatoApp> {
    const finestra = leggiStatoFinestra(percorsi.datiApp);
    const config = leggiConfigurazione(percorsi.datiApp).config;
    const haChiave = await creaAuthChiaveApi(n.store).haChiave().catch(() => false);
    const modalita = modalitaScelta(n, haChiave);
    const collegato =
      modalita === 'chiave_api' ? haChiave : modalita === 'abbonamento' ? finestra.abbonamentoVerificato === true || n.runtimeBinario.configEreditata : false;
    const identita = leggiIdentita(cartella);
    const costi = await n.agente.statoCosti().catch(() => ({ meseUsd: 0, sopraTetto: false }));
    const telegram = ponteTelegram.stato(n);
    return {
      prodotto: piattaforma.nomeProdotto,
      ...(identita.nomeAssistente ? { nomeAssistente: identita.nomeAssistente } : {}),
      ...(identita.nomeUtente ? { nomeUtente: identita.nomeUtente } : {}),
      versione: piattaforma.versione,
      // "~/Spalla": la finestra non riceve percorsi assoluti di sistema; per aprirla c'è app.apriNelSistema('.').
      cartellaLavoro: percorsoLeggibile(cartella),
      cervello: { ...(modalita ? { modalita } : {}), livello: config.cervello.livello, tettoMensileEur: config.cervello.tetto_mensile_eur, collegato },
      onboarding: await n.onboarding.stato(),
      ...(finestra.profiloCompletato ? { profiloCompletato: true } : {}),
      telegram: { collegato: telegram.collegato, ...(telegram.username ? { username: telegram.username } : {}), inAttesaDiPairing: telegram.pairingInAttesa !== undefined },
      voce: { disponibile: await n.voce.disponibile().catch(() => false), motore: n.voce.motore },
      schermataIniziale: calcolaSchermataIniziale({ modalitaScelta: modalita !== undefined, collegato }),
      costi: { meseEur: Math.round(costi.meseUsd * CAMBIO_USD_EUR_PREDEFINITO * 100) / 100, sopraTetto: costi.sopraTetto },
      ...(n.runtimeBinario.configEreditata ? { sviluppo: { accessoEreditato: true } } : {}),
    };
  }

  async function emettiStatoApp(): Promise<void> {
    if (!nucleo) return;
    try {
      emetti('statoApp', await calcolaStatoApp(nucleo));
    } catch (e) {
      logger().avviso('finestra.stato_non_calcolato', { errore: descrivi(e) });
    }
  }

  function emettiTelegram(): void {
    if (nucleo) emetti('telegramStato', ponteTelegram.stato(nucleo));
  }

  function notifica(titolo: string, testo: string, livello: 'info' | 'avviso' | 'errore' = 'info', diSistema = false): void {
    emetti('notifica', { titolo, testo, livello });
    if (diSistema && !piattaforma.finestraAttiva()) piattaforma.notificaSistema(titolo, testo);
  }

  // ----- ciclo di vita del Nucleo -----

  function suEventoTelegram(e: EventoTelegram): void {
    ponteTelegram.suEvento(e);
    if (e.tipo === 'pairing_richiesto') notifica(principale.notifiche.telegram.titolo, principale.notifiche.telegram.pairing(e.nomeMostrato), 'info', true);
    emettiTelegram();
  }

  async function avviaInterno(): Promise<Nucleo> {
    const n = await deps.avviaNucleo({
      suEventoTelegram,
      suBrief: (testo) => notifica(principale.notifiche.brief.titolo, testo, 'info', true),
    });
    ultimoRuntime = n.runtimeBinario;
    n.broker.registraCanale(canaleDesktop);
    n.dispatcher.suMarcatore(MARCATORI_APP.APRI_TELEGRAM, () => {
      telegramDaRituale = true;
      emetti('apriSchermata', { schermata: 'telegram' });
      if (!piattaforma.finestraAttiva()) piattaforma.notificaSistema(principale.notifiche.telegram.titolo, principale.notifiche.telegram.apriDallaChat);
    });
    n.dispatcher.suMarcatoreVisto(MARCATORI_APP.FINE_PROFILO, () => {
      // Fine delle domande di profilo: via il pulsante fisso dei consigliati, subito (il rituale continua).
      aggiornaStatoFinestra(percorsi.datiApp, { profiloCompletato: true });
      void emettiStatoApp();
    });
    n.dispatcher.dopoScambio(() => {
      // Le impostazioni cambiate durante uno scambio si applicano a coda libera.
      if (riavvioRichiesto && !fermato) setTimeout(() => riavviaQuandoLibero(), 0);
    });
    nucleo = n;
    return n;
  }

  /** Ferma e riavvia il Nucleo (nuova configurazione, nuova modalità del cervello); `inMezzo` gira a Nucleo fermo. */
  function riavvia(inMezzo?: () => Promise<void>): Promise<void> {
    // Un riavvio con un'operazione "a Nucleo fermo" non si fonde con quello già in corso: si accoda.
    if (riavvio) return inMezzo ? riavvio.catch(() => undefined).then(() => riavvia(inMezzo)) : riavvio;
    riavvioRichiesto = false;
    const vecchio = nucleo;
    nucleo = undefined;
    let erroreInMezzo: unknown;
    avvio = (async () => {
      if (vecchio) await vecchio.ferma().catch((e: unknown) => deps.logger.avviso('finestra.nucleo_non_fermato', { errore: descrivi(e) }));
      // Se l'operazione fallisce il Nucleo riparte comunque: l'app non deve restare senza motore.
      if (inMezzo) await inMezzo().catch((e: unknown) => { erroreInMezzo = e; });
      return avviaInterno();
    })();
    riavvio = avvio
      .then(async () => {
        logger().info('finestra.nucleo_riavviato', {});
        await emettiStatoApp();
        emettiTelegram();
        if (erroreInMezzo !== undefined) throw erroreInMezzo;
      })
      .finally(() => {
        riavvio = undefined;
      });
    return riavvio;
  }

  function riavviaQuandoLibero(): void {
    if (fermato) return;
    if (occupato()) {
      riavvioRichiesto = true;
      return;
    }
    void riavvia().catch((e: unknown) => {
      deps.logger.errore('finestra.riavvio_fallito', { errore: descrivi(e) });
      notifica(piattaforma.nomeProdotto, testiErrori.altro, 'errore');
    });
  }

  // ----- pannello di collegamento (abbonamento) -----

  function variabiliRuntime(): RuntimeBinario | undefined {
    return nucleo?.runtimeBinario ?? ultimoRuntime;
  }

  async function provaModalita(modalita: ModalitaCervello, variabiliAuth: Record<string, string>): Promise<EsitoCollegamento> {
    const runtime = variabiliRuntime();
    const esito = await prova(variabiliAuth, { ...(runtime ? { runtime } : {}), cwd: cartella });
    const risultato: EsitoCollegamento = { ok: esito.ok, messaggio: messaggioPerEsito(esito, modalita), ...(esito.codice ? { codice: esito.codice } : {}) };
    if (modalita === 'abbonamento') aggiornaStatoFinestra(percorsi.datiApp, { abbonamentoVerificato: esito.ok });
    return risultato;
  }

  // Il pannello gira in una cartella vuota tutta sua, non in quella dell'utente: è una sessione interattiva fuori dal
  // Permission Broker e non deve caricare CLAUDE.md o le impostazioni del progetto (le credenziali stanno in CLAUDE_CONFIG_DIR).
  const cartellaPannello = path.join(percorsi.datiLocali, 'collegamento');
  const pannello: PannelloLogin = creaPannelloLogin({
    trovaBinario: () => deps.trovaBinario(variabiliRuntime()?.percorsoEseguibile),
    ambiente: () => ambientePerBinario(variabiliRuntime(), {}),
    cartella: cartellaPannello,
    preparaCartella: async () => {
      await fsp.mkdir(cartellaPannello, { recursive: true });
    },
    verifica: async () => {
      const esito = await provaModalita('abbonamento', {});
      void emettiStatoApp();
      return esito;
    },
    suDati: (dati) => emetti('terminaleDati', dati),
    suStato: (s) => emetti('terminaleStato', s),
    logger: { info: (e, d) => logger().info(e, d), avviso: (e, d) => logger().avviso(e, d), errore: (e, d) => logger().errore(e, d) },
    testi: { binarioNonTrovato: principale.pannello.binarioNonTrovato, terminale: principale.pannello.terminale },
    ...(deps.spawnPty ? { spawn: deps.spawnPty } : {}),
  });

  // ----- gestori dell'API -----

  const gestori: Gestori = {
    // app
    'app.stato': async () => calcolaStatoApp(await richiedi()),
    'app.apriNelSistema': async (relativo) => {
      const assoluto = risolviDentro(cartella, relativo);
      if (!assoluto) throw new ErroreUtente(principale.errori.percorsoNonConsentito);
      let modo: 'apri' | 'mostra';
      try {
        modo = await comeAprire(assoluto);
      } catch {
        throw new ErroreUtente(principale.errori.fileNonTrovato(relativo));
      }
      // Solo cartelle e documenti noti si aprono: il resto (eseguibili, collegamenti, file senza estensione) si
      // mostra nella sua cartella, così dalla finestra non si lancia mai un programma.
      if (modo === 'mostra') {
        piattaforma.mostraNellaCartella(assoluto);
        return;
      }
      const errore = await piattaforma.apriPercorso(assoluto);
      if (errore) throw new ErroreUtente(principale.errori.fileNonTrovato(relativo));
    },
    'app.apriLink': async (url) => {
      await piattaforma.apriLink(url);
    },
    'app.esportaTutto': async () => {
      const nome = principale.esporta.nomeFile(piattaforma.nomeProdotto, dataLocaleIso(new Date(adesso())));
      const destinazione = await piattaforma.scegliDestinazioneZip(nome);
      if (!destinazione) return null;
      try {
        const esito = await scriviZip(cartella, destinazione);
        logger().info('finestra.esportato', { file: esito.file, byte: esito.byte, saltati: esito.saltati.length });
      } catch (e) {
        logger().errore('finestra.esportazione_fallita', { errore: descrivi(e) });
        throw new ErroreUtente(principale.esporta.fallito);
      }
      return percorsoLeggibile(destinazione);
    },
    'app.chiudi': async () => {
      piattaforma.nascondiFinestra();
    },

    // onboarding
    'onboarding.stato': async () => (await richiedi()).onboarding.stato(),
    'onboarding.prepara': async () => {
      const n = await richiedi();
      await n.onboarding.prepara();
      return { messaggioIniziale: await n.onboarding.messaggioIniziale() };
    },
    'onboarding.completa': async () => {
      const n = await richiedi();
      const problemi = await n.onboarding.valida();
      if ((await n.onboarding.stato()) !== 'completato') {
        // Chiusura chiesta dall'utente: il Nucleo la farebbe da solo a fine rituale. Riavvio a coda libera, così il
        // Nucleo non la ripete.
        await n.onboarding.completa();
        riavviaQuandoLibero();
      }
      void emettiStatoApp();
      return problemi;
    },
    'onboarding.risposte': async () => risposteOnboarding(cartella, principale.presentazioni.sceltaPrimoColpo),
    'onboarding.ricomincia': async (ampiezza) => {
      const n = await richiedi();
      if (occupato()) throw new ErroreUtente(principale.errori.occupato);
      if (ampiezza === 'squadra') {
        for (const r of elencoRuoli(cartella, etichettaRuolo)) {
          // L'archivista resta: tiene in ordine la memoria di notte (docs/03 §8).
          if (r.attivo && r.nome !== 'archivista') await n.onboarding.disattivaRuolo(r.nome);
        }
        notifica(piattaforma.nomeProdotto, principale.ricomincia.fatto.squadra);
      } else if (ampiezza === 'presentazioni') {
        aggiornaStatoFinestra(percorsi.datiApp, { profiloCompletato: false });
        riapriPresentazioni(cartella, { adesso: new Date(adesso()), nomeProdotto: piattaforma.nomeProdotto, cartellaArchivio: principale.ricomincia.cartellaArchivio });
        await n.agente.nuovaSessione();
        await riavvia();
        notifica(piattaforma.nomeProdotto, principale.ricomincia.fatto.presentazioni);
      } else {
        aggiornaStatoFinestra(percorsi.datiApp, { profiloCompletato: false });
        const precedente = percorsoPrecedente(cartella, (d) => principale.ricomincia.nomeCartellaPrecedente(piattaforma.nomeProdotto, d), new Date(adesso()));
        await n.agente.nuovaSessione();
        try {
          await riavvia(async () => {
            await fsp.rename(cartella, precedente);
          });
        } catch (e) {
          logger().errore('finestra.ricomincia_fallito', { errore: descrivi(e) });
          throw new ErroreUtente(testiErrori.altro);
        }
        notifica(piattaforma.nomeProdotto, principale.ricomincia.fatto.tutto(path.basename(precedente)));
      }
      void emettiStatoApp();
    },

    // chat
    'chat.invia': async (avvio) => {
      const n = await richiedi();
      if (scambi.has(avvio.scambioId)) throw new ErroreUtente(principale.chat.scambioDuplicato);
      segnaAttivitaUtente();
      let testo = avvio.testo;
      const extra: Pick<OpzioniInvio, 'rigaDiario'> = {};
      if (avvio.rituale) {
        // Il testo del rituale lo compone il Nucleo, non la finestra: nessun "rituale" scritto da fuori.
        if ((await n.onboarding.stato()) === 'da_fare') await n.agente.nuovaSessione();
        testo = await n.onboarding.messaggioIniziale();
        extra.rigaDiario = testiOnboarding.diario.iniziate;
      }
      const allegati = await allegatiPerNucleo(avvio.allegati, cartella);
      if (telegramDaRituale && !n.controlloTelegram.attivo()) {
        // L'utente è tornato in chat senza collegare Telegram: lo diciamo all'assistente prima del suo messaggio.
        telegramDaRituale = false;
        inviaSistema(n, testiCli.telegram.sistemaNonCollegato);
      }
      avviaScambio(n, avvio.scambioId, { testo, canale: avvio.canale, ...(allegati.length > 0 ? { allegati } : {}) }, extra);
    },
    'chat.rispondi': async (risposta) => {
      const scambio = scambi.get(risposta.scambioId);
      const risolvi = scambio?.domande.get(risposta.id);
      if (!scambio || !risolvi) throw new ErroreUtente(principale.chat.domandaSconosciuta);
      scambio.domande.delete(risposta.id);
      segnaAttivitaUtente();
      risolvi({ id: risposta.id, risposte: risposta.risposte });
    },
    'chat.nuovaSessione': async () => {
      const n = await richiedi();
      await n.agente.nuovaSessione();
      notifica(piattaforma.nomeProdotto, principale.chat.nuovaSessione);
    },
    'chat.interrompi': async (scambioId) => {
      const scambio = scambi.get(scambioId);
      if (!scambio || scambio.interrotto) return;
      scambio.interrotto = true;
      // Domande e permessi aperti si chiudono subito con un "no"; poi si ferma davvero la query dell'SDK.
      chiudiDomande(scambioId, scambio);
      for (const p of [...permessi.values()]) {
        if (p.richiesta.canaleOrigine === 'desktop' || p.richiesta.canaleOrigine === 'voce') p.chiudi({ esito: 'nega', motivo: principale.chat.motivoInterrotto });
      }
      scambio.controllo.abort();
      logger().info('finestra.scambio_interrotto', {});
    },

    // permessi
    'permessi.decidi': async (id, decisione) => {
      const p = permessi.get(id);
      segnaAttivitaUtente();
      if (!p) {
        emetti('permessoChiuso', id);
        return;
      }
      p.chiudi(decisione.esito === 'consenti' ? { esito: 'consenti' } : { esito: 'nega', motivo: decisione.motivo.trim() || testiPermessi.esiti.negatoDaUtente });
    },
    'permessi.inAttesa': async () => [...permessi.values()].map((p): PermessoInAttesa => ({ richiesta: richiestaPerFinestra(p.richiesta) })),

    // cervello
    'cervello.collegaChiaveApi': async (chiave, tetto, livello) => {
      const pulita = chiave.trim();
      if (!formatoChiaveValido(pulita)) return { ok: false, messaggio: testiCervello.verifica.chiaveFormato, codice: 'formato' };
      const n = await richiedi();
      // Prova con la chiave appena incollata PRIMA di salvarla: una chiave rifiutata non resta nel deposito.
      const esito = await provaModalita('chiave_api', { ANTHROPIC_API_KEY: pulita });
      if (!esito.ok) return esito;
      await creaAuthChiaveApi(n.store).salvaChiave(pulita);
      const nuova = aggiornaConfigurazione(percorsi.datiApp, { cervello: { modalita: 'chiave_api', livello, tetto_mensile_eur: tetto } }, logger());
      aggiornaStatoFinestra(percorsi.datiApp, { modalitaScelta: 'chiave_api' });
      // Modalità, livello e tetto si leggono all'avvio del Nucleo.
      if (richiedeRiavvio(n.config, nuova)) riavviaQuandoLibero();
      else void emettiStatoApp();
      return esito;
    },
    'cervello.rimuoviChiaveApi': async () => {
      const n = await richiedi();
      await creaAuthChiaveApi(n.store).rimuoviChiave();
      void emettiStatoApp();
    },
    'cervello.avviaPannelloLogin': async () => {
      // Il renderer non è fidato: il pannello (fuori dal Broker) si apre solo quando serve davvero.
      if (pannello.stato().attivo) return pannello.stato();
      const n = await richiedi();
      const finestra = leggiStatoFinestra(percorsi.datiApp);
      if ((finestra.modalitaScelta ?? n.config.cervello.modalita) !== 'abbonamento') throw new ErroreUtente(principale.pannello.soloAbbonamento);
      if (finestra.abbonamentoVerificato === true || n.runtimeBinario.configEreditata) throw new ErroreUtente(principale.pannello.giaCollegato);
      return pannello.avvia();
    },
    'cervello.chiudiPannelloLogin': async () => {
      await pannello.chiudi();
    },
    'cervello.verifica': async () => {
      const n = await richiedi();
      const modalita = leggiStatoFinestra(percorsi.datiApp).modalitaScelta ?? n.config.cervello.modalita;
      let esito: EsitoCollegamento;
      if (modalita === 'abbonamento') {
        esito = await pannello.verifica();
      } else {
        // Senza chiave salvata non si prova: il binario potrebbe trovare un altro accesso e dire "collegato" a torto.
        const variabili = await creaAuthChiaveApi(n.store).variabiliAmbiente();
        esito = variabili.ANTHROPIC_API_KEY
          ? await provaModalita('chiave_api', variabili)
          : { ok: false, messaggio: testiCervello.verifica.chiaveMancante, codice: 'credenziali' };
      }
      void emettiStatoApp();
      return esito;
    },
    'cervello.cambiaModalita': async (modalita) => {
      const n = await richiedi();
      aggiornaStatoFinestra(percorsi.datiApp, { modalitaScelta: modalita });
      if (leggiConfigurazione(percorsi.datiApp, logger()).config.cervello.modalita !== modalita) {
        aggiornaConfigurazione(percorsi.datiApp, { cervello: { modalita } }, logger());
      }
      // Il Nucleo sceglie l'AuthProvider all'avvio: cambiare modalità vuol dire riavviarlo (a coda libera).
      if (n.config.cervello.modalita !== modalita) riavviaQuandoLibero();
    },

    // terminale
    'terminale.scrivi': async (dati) => {
      pannello.scrivi(dati);
    },
    'terminale.ridimensiona': async (colonne, righe) => {
      pannello.ridimensiona(colonne, righe);
    },

    // telegram
    'telegram.stato': async (): Promise<StatoTelegram> => ponteTelegram.stato(await richiedi()),
    'telegram.suggerimenti': async () => {
      const n = await richiedi();
      const id = leggiIdentita(cartella);
      return ponteTelegram.suggerimenti(n, { nomeAssistente: id.nomeAssistente ?? piattaforma.nomeProdotto, nomeUtente: id.nomeUtente ?? '' });
    },
    'telegram.collegaConToken': async (riga) => {
      const n = await richiedi();
      const { username, ...esito } = await ponteTelegram.collegaConToken(n, riga);
      emettiTelegram();
      void emettiStatoApp();
      if (esito.ok && username) {
        notifica(principale.notifiche.telegram.titolo, principale.notifiche.telegram.collegato(username));
        if (telegramDaRituale) {
          telegramDaRituale = false;
          inviaSistema(n, testiCli.telegram.sistemaCollegato(username));
        }
      }
      return esito;
    },
    'telegram.collegaInDueTocchi': async () => ({ ok: false, messaggio: principale.errori.dueTocchiNonDisponibile, codice: 'altro' }),
    'telegram.confermaPairing': async (codice) => {
      const esito = await ponteTelegram.confermaPairing(await richiedi(), codice);
      emettiTelegram();
      void emettiStatoApp();
      return esito;
    },
    'telegram.scollega': async () => {
      await ponteTelegram.scollega(await richiedi());
      notifica(principale.notifiche.telegram.titolo, principale.notifiche.telegram.scollegato);
      emettiTelegram();
      riavviaQuandoLibero();
    },

    // squadra
    'squadra.elenco': async () => elencoRuoli(cartella, etichettaRuolo),
    'squadra.attiva': async (nome) => {
      const n = await richiedi();
      if (!ruoloEsiste(cartella, nome)) throw new ErroreUtente(principale.errori.ruoloNonValido(nome));
      const id = leggiIdentita(cartella);
      await n.onboarding.attivaRuolo(nome, { ...(id.nomeUtente ? { nomeUtente: id.nomeUtente } : {}) });
    },
    'squadra.disattiva': async (nome) => {
      const n = await richiedi();
      if (!ruoloEsiste(cartella, nome)) throw new ErroreUtente(principale.errori.ruoloNonValido(nome));
      await n.onboarding.disattivaRuolo(nome);
    },

    // memoria
    'memoria.elenco': async () => elencoFileMemoria(cartella),
    'memoria.leggi': async (relativo) => {
      const esito = leggiFileMemoria(cartella, relativo);
      if (esito.ok) return esito.testo;
      if (esito.motivo === 'troppo_grande') throw new ErroreUtente(principale.errori.fileTroppoGrande(relativo));
      if (esito.motivo === 'non_trovato') throw new ErroreUtente(principale.errori.fileNonTrovato(relativo));
      throw new ErroreUtente(principale.errori.percorsoNonConsentito);
    },
    'memoria.cerca': async (query) => (query.trim() ? (await richiedi()).memoria.cerca(query.trim()) : []),
    'memoria.contatori': async () => (await richiedi()).memoria.contatori(),
    'memoria.ricostruisciIndice': async () => (await richiedi()).memoria.ricostruisciIndice(),
    'memoria.riepilogoProfilo': async () => (await richiedi()).onboarding.riepilogoProfilo(),

    // impostazioni
    'impostazioni.leggi': async () => {
      const config = leggiConfigurazione(percorsi.datiApp, logger()).config;
      const finestra = leggiStatoFinestra(percorsi.datiApp);
      return impostazioniDaConfig(config, piattaforma.avvioAutomatico() ?? finestra.avvioAutomatico ?? false, finestra.modalitaScelta);
    },
    'impostazioni.salva': async (impostazioni) => {
      const prima = leggiConfigurazione(percorsi.datiApp, logger()).config;
      const dopo = aggiornaConfigurazione(percorsi.datiApp, modificheConfig(impostazioni), logger());
      const finestra = leggiStatoFinestra(percorsi.datiApp);
      if ((piattaforma.avvioAutomatico() ?? finestra.avvioAutomatico) !== impostazioni.avvioAutomatico) {
        piattaforma.impostaAvvioAutomatico(impostazioni.avvioAutomatico);
        aggiornaStatoFinestra(percorsi.datiApp, { avvioAutomatico: impostazioni.avvioAutomatico });
      }
      if (richiedeRiavvio(prima, dopo)) {
        notifica(piattaforma.nomeProdotto, principale.notifiche.riavvio);
        riavviaQuandoLibero();
      } else {
        void emettiStatoApp();
      }
    },

    // voce
    'voce.stato': async () => {
      const n = await richiedi();
      return {
        disponibile: await n.voce.disponibile().catch(() => false),
        motore: n.voce.motore,
        inDownload: voceInDownload,
        ...(voceFrazione !== undefined ? { frazione: voceFrazione } : {}),
      };
    },
    'voce.prepara': async () => {
      const n = await richiedi();
      if (voceInDownload) return;
      voceInDownload = true;
      try {
        await n.voce.scaricaModelli((frazione, messaggio) => {
          voceFrazione = frazione;
          emetti('voceAvanzamento', { frazione, messaggio });
        });
      } catch (e) {
        logger().avviso('finestra.voce_non_preparata', { errore: descrivi(e) });
        throw new ErroreUtente((await n.voce.motivoNonDisponibile().catch(() => undefined)) ?? principale.errori.voceNonDisponibile);
      } finally {
        voceInDownload = false;
        voceFrazione = undefined;
        void emettiStatoApp();
      }
    },

    // allegati
    'allegati.aggiungi': async (sorgenti) => {
      const esito = await copiaAllegati(sorgenti, {
        cartellaLavoro: cartella,
        vietate: [percorsi.datiApp, percorsi.datiLocali, percorsi.configClaude, path.dirname(percorsi.segreti)],
        testi: principale.allegati,
        adesso: () => new Date(adesso()),
      });
      if (esito.saltati.length > 0) notifica(piattaforma.nomeProdotto, esito.saltati.join('\n'), 'avviso');
      return esito.copiati;
    },
  };

  function segnaAttivitaUtente(): void {
    ultimaAttivita = adesso();
    nucleo?.broker.segnaAttivita('desktop');
  }

  return {
    pronto: () => nucleo !== undefined,

    async avvia() {
      fermato = false;
      if (!avvio) avvio = avviaInterno();
      await avvio;
      await emettiStatoApp();
    },

    async ferma() {
      fermato = true;
      for (const p of [...permessi.values()]) p.chiudi({ esito: 'nega', motivo: testiPermessi.esiti.annullata });
      for (const [id, s] of scambi) {
        s.interrotto = true;
        chiudiDomande(id, s);
        s.controllo.abort();
      }
      await pannello.chiudi().catch(() => undefined);
      if (riavvio) await riavvio.catch(() => undefined);
      const n = nucleo ?? (await avvio?.catch(() => undefined));
      nucleo = undefined;
      avvio = undefined;
      await n?.ferma();
    },

    async chiama(nome, argomenti) {
      const gestore = gestori[nome] as (...a: unknown[]) => Promise<RisultatoDi<typeof nome>>;
      return gestore(...(argomenti as unknown[]));
    },

    async ripresaDalSonno() {
      await nucleo?.scheduler.ripresaDalSonno();
    },

    segnaAttivitaUtente,

    async righeStato() {
      if (!nucleo) return [principale.errori.nucleoNonPronto];
      const s = await calcolaStatoApp(nucleo);
      const righe = [
        principale.stato.titolo(s.nomeAssistente, s.prodotto),
        principale.tray.riga.presentazioni[s.onboarding],
        principale.tray.riga.telegram(s.telegram.username),
        principale.tray.riga.cervello(s.cervello.collegato),
      ];
      const inCoda = nucleo.dispatcher.inCoda();
      if (inCoda > 0) righe.push(principale.tray.riga.lavoro(inCoda));
      return righe;
    },
  };
}
