/**
 * CONTRATTO IPC tra finestra (renderer), preload e processo principale/Nucleo (docs/02 §4: Shell ↔ Nucleo).
 *
 * - Il renderer vede SOLO `window.spalla` (esposto dal preload con contextBridge) con la forma `ApiSpalla`.
 * - Ogni richiesta è `invoke(nome, parametri)` validato con zod su entrambi i lati; ogni evento è `on(nome, callback)`.
 * - Nessun percorso assoluto, segreto o credenziale attraversa il confine verso il renderer, salvo dove indicato.
 * - I tipi del Nucleo (EventoAssistente, DomandaUtente, RichiestaPermesso, ...) vengono da ../nucleo/contratti.ts.
 */
import type {
  Canale,
  ContatoriMemoria,
  DecisionePermesso,
  DomandaUtente,
  EventoAssistente,
  LivelloModello,
  ModalitaCervello,
  RichiestaPermesso,
  RispostaUtente,
  RisultatoMemoria,
  StatoOnboarding,
} from '../nucleo/contratti.js';

// ---------------------------------------------------------------------------------------------------------
// Stato dell'app mostrato nella finestra
// ---------------------------------------------------------------------------------------------------------

export type SchermataIniziale = 'benvenuto' | 'privacy' | 'avvio' | 'cervello' | 'motore' | 'chat';

export interface StatoApp {
  /** Nome del prodotto (es. "Spalla") e, se già scelto, dell'assistente (es. "Bruno") e dell'utente. */
  prodotto: string;
  nomeAssistente?: string;
  nomeUtente?: string;
  versione: string;
  /** Dove si trova la cartella visibile (mostrata all'utente in Impostazioni/Privacy). */
  cartellaLavoro: string;
  cervello: { modalita?: ModalitaCervello; livello: LivelloModello; tettoMensileEur: number | null; collegato: boolean };
  onboarding: StatoOnboarding;
  telegram: { collegato: boolean; username?: string; inAttesaDiPairing: boolean };
  voce: { disponibile: boolean; motore?: string };
  /** Schermata da mostrare all'avvio, calcolata dal processo principale. */
  schermataIniziale: SchermataIniziale;
  /** Spesa del mese in euro (modalità chiave API) e se il tetto è stato raggiunto. */
  costi: { meseEur: number; sopraTetto: boolean };
}

// ---------------------------------------------------------------------------------------------------------
// Chat: uno "scambio" è una richiesta dell'utente con il suo flusso di eventi
// ---------------------------------------------------------------------------------------------------------

export interface AvvioScambio {
  /** Id generato dal renderer (uuid) per correlare gli eventi. */
  scambioId: string;
  testo: string;
  canale: Canale;
  /** Percorsi di allegati già copiati dal processo principale in lavoro/in-arrivo/ (vedi `allegati.aggiungi`). */
  allegati?: string[];
  /** Se true, il testo non è dell'utente ma il messaggio iniziale dell'onboarding (rituale). */
  rituale?: boolean;
}

export interface EventoScambio {
  scambioId: string;
  evento: EventoAssistente;
}

/** Una domanda dell'assistente che il renderer deve mostrare come chip; si risponde con `chat.rispondi`. */
export interface DomandaInAttesa {
  scambioId: string;
  domanda: DomandaUtente;
}

/** Una richiesta di permesso che il renderer deve mostrare come scheda; si decide con `permessi.decidi`. */
export interface PermessoInAttesa {
  richiesta: RichiestaPermesso;
}

// ---------------------------------------------------------------------------------------------------------
// Cervello (S0 schermata 4)
// ---------------------------------------------------------------------------------------------------------

export interface EsitoCollegamento {
  ok: boolean;
  /** Frase in italiano per l'utente. */
  messaggio: string;
  codice?: 'credenziali' | 'limite' | 'rete' | 'tempo' | 'formato' | 'altro';
}

export interface StatoPannelloLogin {
  /** True mentre il binario gira nel pannello terminale (xterm). */
  attivo: boolean;
  /** True quando il binario risulta collegato (una query di prova è riuscita). */
  collegato: boolean;
}

// ---------------------------------------------------------------------------------------------------------
// Telegram (docs/02 §8.2-8.3)
// ---------------------------------------------------------------------------------------------------------

export interface SuggerimentiTelegram {
  nomeBot: string;
  usernameSuggerito: string;
  /** Link t.me/newbot/... se il bot gestore è configurato (Managed Bots); altrimenti assente. */
  linkDueTocchi?: string;
  linkBotFather: string;
}

export interface StatoTelegram {
  collegato: boolean;
  username?: string;
  proprietarioConfermato: boolean;
  /** Codice di pairing ricevuto dal bot e in attesa di conferma nell'app. */
  pairingInAttesa?: { codice: string; nome: string; scadeAlle: string };
}

// ---------------------------------------------------------------------------------------------------------
// Squadra, memoria, impostazioni
// ---------------------------------------------------------------------------------------------------------

export interface RuoloVista {
  nome: string;
  etichetta: string;
  attivo: boolean;
  spiegazione: string;
  puoFareDaSolo: string;
  chiedeSempre: string;
}

export interface FileMemoriaVista {
  /** Relativo a cartellaLavoro. */
  percorso: string;
  titolo: string;
  modificato: string;
  byte: number;
}

export interface Impostazioni {
  cervello: { modalita?: ModalitaCervello; livello: LivelloModello; tettoMensileEur: number | null };
  orari: { silenzioDa: string; silenzioA: string; domenica: 'silenzio' | 'normale' };
  brief: { attivo: boolean; ora: string; canale: 'telegram' | 'desktop' };
  riordinoNotturno: { attivo: boolean; ora: string };
  voce: { desktop: 'spento' | 'push_to_talk'; risposteVocaliTelegram: boolean };
  avvioAutomatico: boolean;
}

export interface RispostaOnboardingVista {
  id: string;
  domanda: string;
  risposta: string;
}

// ---------------------------------------------------------------------------------------------------------
// L'API esposta al renderer: window.spalla
// ---------------------------------------------------------------------------------------------------------

export interface ApiSpalla {
  app: {
    stato(): Promise<StatoApp>;
    /** Apre una cartella o un file dentro cartellaLavoro con il programma di sistema (solo percorsi relativi). */
    apriNelSistema(percorsoRelativo: string): Promise<void>;
    apriLink(url: string): Promise<void>;
    /** Esporta tutto (zip) nella cartella scelta dall'utente; restituisce il percorso o null se annullato. */
    esportaTutto(): Promise<string | null>;
    chiudi(): Promise<void>;
  };

  onboarding: {
    stato(): Promise<StatoOnboarding>;
    /** Semina la cartella e restituisce il messaggio iniziale da inviare come primo scambio con `rituale: true`. */
    prepara(): Promise<{ messaggioIniziale: string }>;
    /** Il rituale è finito: valida e chiude. Restituisce i problemi (vuoto se tutto ok). */
    completa(): Promise<string[]>;
    risposte(): Promise<RispostaOnboardingVista[]>;
    /** Ri-onboarding a tre ampiezze (docs/05 §7). */
    ricomincia(ampiezza: 'presentazioni' | 'squadra' | 'tutto'): Promise<void>;
  };

  chat: {
    invia(avvio: AvvioScambio): Promise<void>;
    rispondi(risposta: RispostaUtente & { scambioId: string }): Promise<void>;
    nuovaSessione(): Promise<void>;
    /** Interrompe lo scambio in corso. */
    interrompi(scambioId: string): Promise<void>;
  };

  permessi: {
    decidi(id: string, decisione: DecisionePermesso): Promise<void>;
    inAttesa(): Promise<PermessoInAttesa[]>;
  };

  cervello: {
    /** Modalità chiave API: valida il formato, prova una richiesta minima, salva nel portachiavi. La chiave non torna mai al renderer. */
    collegaChiaveApi(chiave: string, tettoMensileEur: number | null, livello: LivelloModello): Promise<EsitoCollegamento>;
    rimuoviChiaveApi(): Promise<void>;
    /** Modalità abbonamento: avvia il binario in un pannello terminale; il renderer monta xterm e scambia dati con `terminale.*`. */
    avviaPannelloLogin(): Promise<StatoPannelloLogin>;
    chiudiPannelloLogin(): Promise<void>;
    /** Prova di collegamento nella modalità corrente. */
    verifica(): Promise<EsitoCollegamento>;
    cambiaModalita(modalita: ModalitaCervello): Promise<void>;
  };

  /** Pannello terminale per /login del binario (xterm.js nel renderer, node-pty nel processo principale). */
  terminale: {
    scrivi(dati: string): Promise<void>;
    ridimensiona(colonne: number, righe: number): Promise<void>;
  };

  telegram: {
    stato(): Promise<StatoTelegram>;
    suggerimenti(): Promise<SuggerimentiTelegram>;
    /** Procedura BotFather: incolla il token; il processo principale lo valida (getMe) e lo salva nel portachiavi. */
    collegaConToken(token: string): Promise<EsitoCollegamento>;
    /** Managed Bots: apre il link in due tocchi e attende la consegna del token dal bot gestore. */
    collegaInDueTocchi(): Promise<EsitoCollegamento>;
    confermaPairing(codice: string): Promise<EsitoCollegamento>;
    scollega(): Promise<void>;
  };

  squadra: {
    elenco(): Promise<RuoloVista[]>;
    attiva(nome: string): Promise<void>;
    disattiva(nome: string): Promise<void>;
  };

  memoria: {
    elenco(): Promise<FileMemoriaVista[]>;
    leggi(percorsoRelativo: string): Promise<string>;
    cerca(query: string): Promise<RisultatoMemoria[]>;
    contatori(): Promise<ContatoriMemoria>;
    ricostruisciIndice(): Promise<void>;
    /** "Cosa sai di me?" in italiano semplice. */
    riepilogoProfilo(): Promise<string>;
  };

  impostazioni: {
    leggi(): Promise<Impostazioni>;
    salva(impostazioni: Impostazioni): Promise<void>;
  };

  voce: {
    stato(): Promise<{ disponibile: boolean; motore?: string; inDownload: boolean; frazione?: number }>;
    prepara(): Promise<void>;
  };

  /** Eventi dal processo principale. Restituiscono una funzione per annullare l'iscrizione. */
  on: {
    eventoScambio(cb: (e: EventoScambio) => void): () => void;
    domanda(cb: (d: DomandaInAttesa) => void): () => void;
    permesso(cb: (p: PermessoInAttesa) => void): () => void;
    permessoChiuso(cb: (id: string) => void): () => void;
    terminaleDati(cb: (dati: string) => void): () => void;
    terminaleStato(cb: (s: StatoPannelloLogin) => void): () => void;
    telegramStato(cb: (s: StatoTelegram) => void): () => void;
    statoApp(cb: (s: StatoApp) => void): () => void;
    voceAvanzamento(cb: (p: { frazione: number; messaggio: string }) => void): () => void;
    notifica(cb: (n: { titolo: string; testo: string; livello: 'info' | 'avviso' | 'errore' }) => void): () => void;
  };
}

/** Nomi dei canali IPC (invoke) e degli eventi (send), derivati dall'API: "gruppo.metodo". */
export type NomeInvoke =
  | `app.${keyof ApiSpalla['app']}`
  | `onboarding.${keyof ApiSpalla['onboarding']}`
  | `chat.${keyof ApiSpalla['chat']}`
  | `permessi.${keyof ApiSpalla['permessi']}`
  | `cervello.${keyof ApiSpalla['cervello']}`
  | `terminale.${keyof ApiSpalla['terminale']}`
  | `telegram.${keyof ApiSpalla['telegram']}`
  | `squadra.${keyof ApiSpalla['squadra']}`
  | `memoria.${keyof ApiSpalla['memoria']}`
  | `impostazioni.${keyof ApiSpalla['impostazioni']}`
  | `voce.${keyof ApiSpalla['voce']}`;

export type NomeEvento = `evento.${keyof ApiSpalla['on']}`;

declare global {
  interface Window {
    spalla: ApiSpalla;
  }
}
