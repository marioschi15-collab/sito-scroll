/**
 * CONTRATTI del Nucleo: le interfacce tra i moduli (docs/02 §3-4).
 *
 * Regole:
 * - Ogni modulo implementa SOLO le interfacce qui sotto e importa gli altri moduli SOLO tramite queste.
 * - Nomi in italiano, coerenti con i documenti in docs/. Niente gergo verso l'utente finale: le stringhe
 *   mostrate all'utente vivono in @spalla/it-copy, non qui.
 * - Questo file cambia solo con una decisione esplicita (ADR in docs/02 §11). Aggiungere campi opzionali è ok.
 */

// ---------------------------------------------------------------------------------------------------------
// Tipi di base
// ---------------------------------------------------------------------------------------------------------

/** Da dove arriva un messaggio o dove va una risposta. */
export type Canale = 'desktop' | 'telegram' | 'voce' | 'sistema';

/** Modalità del cervello (docs/02 §2.2). */
export type ModalitaCervello = 'chiave_api' | 'abbonamento';

/** Livello di qualità/costo scelto dall'utente in modalità chiave API (docs/02 ADR-009). */
export type LivelloModello = 'economico' | 'equilibrato' | 'massima';

/** Tipo di sessione SDK (docs/02 §3.1). */
export type TipoSessione = 'principale' | 'sfondo' | 'programmata';

/** Percorsi su disco per utente (docs/02 §5.2-5.3). Tutti assoluti. */
export interface Percorsi {
  /** Cartella visibile all'utente, cwd dell'agente: ~/Spalla (Mac/Linux) o %USERPROFILE%\Spalla (Windows). */
  cartellaLavoro: string;
  /** Stato piccolo dell'app: config.json, telegram/state.json, usage/, licence.json. */
  datiApp: string;
  /** Stato grande o legato alla macchina: claude/ (CLAUDE_CONFIG_DIR), runtime/, indice/, models/, secrets, logs/. */
  datiLocali: string;
  /** CLAUDE_CONFIG_DIR del binario: la nostra app NON legge mai dentro (docs/02 §2.3 punto 2). */
  configClaude: string;
  /** File SQLite dell'indice FTS5 derivato. */
  indiceMemoria: string;
  /** Modelli vocali scaricati. */
  modelliVoce: string;
  /** Log rotanti senza contenuti dei prompt. */
  logs: string;
  /** File cifrato dei segreti (chiave API, token Telegram). */
  segreti: string;
}

// ---------------------------------------------------------------------------------------------------------
// Autenticazione (docs/02 §2)
// ---------------------------------------------------------------------------------------------------------

export interface AuthProvider {
  readonly modalita: ModalitaCervello;
  /**
   * Variabili d'ambiente da aggiungere al processo del binario. In modalità chiave API: { ANTHROPIC_API_KEY }.
   * In modalità abbonamento: {} (il binario usa il proprio login dentro CLAUDE_CONFIG_DIR; noi non lo tocchiamo).
   */
  variabiliAmbiente(): Promise<Record<string, string>>;
  /** Prova di collegamento, con messaggio in italiano per l'utente. */
  verifica(): Promise<{ ok: boolean; messaggio: string }>;
}

// ---------------------------------------------------------------------------------------------------------
// Permessi: Permission Broker (docs/02 §6)
// ---------------------------------------------------------------------------------------------------------

export interface RichiestaPermesso {
  /** Id breve e univoco (≤ 20 caratteri: finisce nel callback_data di Telegram, limite 64 byte). */
  id: string;
  /** Nome dello strumento Claude Code (es. "Write", "Bash", "WebFetch"). */
  strumento: string;
  /** Input dello strumento, così com'è. */
  input: unknown;
  /** Frase in italiano per l'utente: "Il Contabile vuole scrivere in ~/Fatture/nota.md". */
  descrizione: string;
  /** Anteprima breve (comando, percorso, prime righe), se utile. */
  anteprima?: string;
  /** Ruolo che agisce, se noto (es. "contabile"); altrimenti l'assistente principale. */
  ruolo?: string;
  /** Canale da cui è nata la richiesta dell'utente. */
  canaleOrigine: Canale;
  /** Momento della richiesta (ms epoch). */
  creataIl: number;
  /**
   * Segnale di annullamento della sessione che ha fatto la richiesta (tetto raggiunto, chiusura, errore):
   * quando scatta, chi mostra la scheda la ritira e il Broker nega. Assente = nessun annullamento possibile.
   */
  annullamento?: AbortSignal;
}

export type DecisionePermesso =
  | { esito: 'consenti'; inputAggiornato?: unknown }
  | { esito: 'nega'; motivo: string };

/** Un posto dove chiedere conferma all'utente (finestra desktop, CLI di sviluppo, Telegram). */
export interface CanaleConferme {
  nome: Canale;
  /** True se l'utente è "qui" (es. desktop attivo negli ultimi 5 minuti, bot Telegram collegato). */
  disponibile(): boolean;
  /** Mostra la richiesta e attende la decisione. Può rifiutare con timeout (il Broker nega). */
  chiediConferma(richiesta: RichiestaPermesso, timeoutMs: number): Promise<DecisionePermesso>;
}

export interface Broker {
  /** Instrada la richiesta al canale giusto (docs/02 §6): origine Telegram o desktop inattivo → Telegram; altrimenti desktop. */
  chiedi(richiesta: RichiestaPermesso): Promise<DecisionePermesso>;
  registraCanale(canale: CanaleConferme): void;
  /** Segnala attività dell'utente su un canale (per la regola "desktop inattivo da 5 minuti"). */
  segnaAttivita(canale: Canale): void;
}

// ---------------------------------------------------------------------------------------------------------
// Domande all'utente (AskUserQuestion → chip) e flusso dei messaggi (docs/05 §1.2)
// ---------------------------------------------------------------------------------------------------------

export interface OpzioneDomanda {
  etichetta: string;
  descrizione?: string;
}

export interface DomandaUtente {
  id: string;
  testo: string;
  /** Titolo breve della domanda (dall'SDK: header), se presente. */
  intestazione?: string;
  opzioni: OpzioneDomanda[];
  multiSelezione: boolean;
}

export interface RispostaUtente {
  id: string;
  /** Etichette scelte oppure testo libero (sempre permesso). */
  risposte: string[];
}

export interface MessaggioIn {
  testo: string;
  canale: Canale;
  /** Percorsi locali di allegati già salvati (foto, documenti, audio trascritto). */
  allegati?: string[];
  /** Id dell'utente sul canale (es. from.id Telegram), per il registro. */
  utenteId?: string;
}

/** Eventi che il runtime emette verso le interfacce mentre l'assistente lavora. */
export type EventoAssistente =
  | { tipo: 'testo'; testo: string; parziale: boolean }
  | { tipo: 'strumento'; nome: string; descrizione: string; ruolo?: string }
  | { tipo: 'domanda'; domanda: DomandaUtente }
  | { tipo: 'permesso'; richiesta: RichiestaPermesso }
  | { tipo: 'fine'; sessioneId: string; durataMs: number; costoUsd?: number; turni?: number }
  | { tipo: 'errore'; messaggio: string; codice?: 'limite_raggiunto' | 'credenziali' | 'rete' | 'budget' | 'altro'; riprovaAlle?: string };

export interface OpzioniInvio {
  sessione?: TipoSessione;
  /** Come rispondere alle domande dell'assistente (AskUserQuestion). Se assente, il runtime risponde "scegli tu". */
  rispondiDomanda?: (domanda: DomandaUtente) => Promise<RispostaUtente>;
  /** Tetto di spesa per questa esecuzione (solo sessioni di sfondo/programmate, modalità chiave API). */
  tettoUsd?: number;
  /** Ruolo da eseguire come agente principale (es. "archivista" per il riordino notturno). */
  ruolo?: string;
  /** Numero massimo di passi (giri di strumenti) per questa esecuzione; assente = predefiniti del tipo di sessione. */
  maxTurni?: number;
  /** Riga del diario per questo scambio al posto della prima riga del messaggio (es. "Presentazioni iniziate" per il rituale). */
  rigaDiario?: string;
}

// ---------------------------------------------------------------------------------------------------------
// Runtime dell'agente (docs/02 §3.1-3.2)
// ---------------------------------------------------------------------------------------------------------

export interface AgentRuntime {
  /** Invia un messaggio e restituisce gli eventi in streaming fino a 'fine' o 'errore'. */
  invia(messaggio: MessaggioIn, opzioni?: OpzioniInvio): AsyncIterable<EventoAssistente>;
  /** Chiude l'argomento: la prossima richiesta apre una sessione principale nuova (memoria ricaricata dai file). */
  nuovaSessione(): Promise<void>;
  /** Id della sessione principale corrente, se esiste. */
  sessioneCorrente(): string | undefined;
  /** Spesa del mese (dai messaggi result dell'SDK) e tetto scelto dall'utente. */
  statoCosti(): Promise<{ meseUsd: number; tettoEur?: number; sopraTetto: boolean }>;
}

// ---------------------------------------------------------------------------------------------------------
// Memoria (docs/03)
// ---------------------------------------------------------------------------------------------------------

export interface RisultatoMemoria {
  /** Percorso relativo a cartellaLavoro, es. "memoria/temi/cliente-lamberti.md". */
  file: string;
  titolo: string;
  estratto: string;
  punteggio: number;
  /** ISO 8601 dell'ultima modifica del file. */
  modificato: string;
}

export interface ContatoriMemoria {
  memoriaRighe: number;
  memoriaByte: number;
  utenteCaratteri: number;
  schede: number;
  diari: number;
}

export interface MemoryService {
  /** Crea/ripara l'indice e inizia a osservare memoria/ e profilo/. */
  avvia(): Promise<void>;
  ferma(): Promise<void>;
  /** Ricerca full-text (bm25 + bonus di recenza 30 giorni), k risultati (default 6). */
  cerca(query: string, k?: number): Promise<RisultatoMemoria[]>;
  ricostruisciIndice(): Promise<void>;
  contatori(): Promise<ContatoriMemoria>;
  /** Verifica dei tetti dopo una scrittura: null se ok, altrimenti il messaggio in italiano da restituire all'assistente. */
  controllaTetti(fileRelativo: string, contenuto: string): string | null;
  /** Appende la riga meccanica al diario di oggi (hook Stop, zero token): "- hh:mm [canale] <prima riga>". */
  appendiDiario(canale: Canale, primaRiga: string): Promise<void>;
}

// ---------------------------------------------------------------------------------------------------------
// Voce (docs/02 §7) — nel prototipo solo trascrizione delle note vocali Telegram
// ---------------------------------------------------------------------------------------------------------

export interface Trascrizione {
  testo: string;
  /** 0-1 se il motore la fornisce. */
  confidenza?: number;
  durataAudioSec: number;
  motore: string;
}

export interface VoiceService {
  /** True se un motore e un modello sono pronti (scaricati). */
  disponibile(): Promise<boolean>;
  /** Scarica il modello scelto con avanzamento 0-1. */
  prepara(avanzamento?: (frazione: number, messaggio: string) => void): Promise<void>;
  /** Audio PCM mono 16 kHz Float32 (-1..1) → testo italiano. */
  trascrivi(pcm16k: Float32Array): Promise<Trascrizione>;
}

// ---------------------------------------------------------------------------------------------------------
// Canali messaggi (Telegram, CLI, finestra)
// ---------------------------------------------------------------------------------------------------------

export interface CanaleMessaggi {
  nome: Canale;
  avvia(): Promise<void>;
  ferma(): Promise<void>;
}

/** Ciò che un canale usa per far lavorare l'assistente: lo stesso runtime per tutti i canali. */
export interface Dispatcher {
  /** Mette in coda il messaggio sulla sessione principale e consegna gli eventi al canale chiamante. */
  gestisci(messaggio: MessaggioIn, consegna: (evento: EventoAssistente) => Promise<void>, opzioni?: OpzioniInvio): Promise<void>;
}

// ---------------------------------------------------------------------------------------------------------
// Onboarding (docs/05)
// ---------------------------------------------------------------------------------------------------------

export type StatoOnboarding = 'da_fare' | 'in_corso' | 'completato';

export interface Onboarding {
  stato(): Promise<StatoOnboarding>;
  /** Semina ~/Spalla dai modelli (idempotente: non sovrascrive file esistenti). */
  prepara(): Promise<void>;
  /** Il primo messaggio utente della prima sessione: il rituale PRIMO-AVVIO.md più l'ora e la data. */
  messaggioIniziale(): Promise<string>;
  /** Valida i file generati (schema): elenco di problemi in italiano, vuoto se tutto ok. */
  valida(): Promise<string[]>;
  /** Chiude: scrive RISPOSTE.json se manca, registra nel diario, segna completato. */
  completa(): Promise<void>;
}

// ---------------------------------------------------------------------------------------------------------
// Lavori programmati (docs/02 §3.1)
// ---------------------------------------------------------------------------------------------------------

export interface LavoroProgrammato {
  nome: 'brief_mattino' | 'riordino_notturno' | 'promemoria';
  /** Espressione cron a 5 campi, ora locale. */
  cron: string;
  attivo: boolean;
  esegui(): Promise<void>;
}

export interface Scheduler {
  registra(lavoro: LavoroProgrammato): void;
  avvia(): void;
  ferma(): void;
  /** Da chiamare alla ripresa dal sonno: esegue una volta i lavori saltati ancora utili. */
  ripresaDalSonno(): Promise<void>;
}

// ---------------------------------------------------------------------------------------------------------
// Log (senza contenuti dei prompt)
// ---------------------------------------------------------------------------------------------------------

export interface Logger {
  info(evento: string, dati?: Record<string, unknown>): void;
  avviso(evento: string, dati?: Record<string, unknown>): void;
  errore(evento: string, dati?: Record<string, unknown>): void;
}
