import type { EsitoCollegamento, StatoPannelloLogin } from '../ipc/contratto.js';
import type { Logger } from '../nucleo/contratti.js';

/**
 * Pannello di collegamento dell'abbonamento (docs/02 §2.3, docs/05 §2.1 schermata 4): il binario di Claude Code,
 * NON modificato e senza argomenti, gira in uno pseudo-terminale (node-pty) con l'ambiente del Nucleo
 * (CLAUDE_CONFIG_DIR isolato, DISABLE_*). L'utente scrive /login nel pannello (xterm.js nella finestra); il login lo
 * fa il binario nel suo CLAUDE_CONFIG_DIR, che noi non leggiamo mai. Per sapere se è riuscito facciamo una prova di
 * una riga (`verifica`) quando il pannello si chiude o quando l'utente lo chiede.
 *
 * Il pannello è una sessione interattiva FUORI dal Permission Broker: per questo
 * - parte in una cartella VUOTA dedicata (non la cartella di lavoro: niente CLAUDE.md né .claude/settings.json del
 *   progetto, niente domanda di fiducia sulla cartella dell'utente salvata nella configurazione isolata);
 * - si chiude da solo appena la verifica riesce, e comunque dopo `durataMassimaMs` (15 minuti);
 * - chi lo usa (nucleo-host.ts) lo apre solo in modalità abbonamento e se non si è già collegati.
 */

/** Il minimo di node-pty che usiamo (iniettabile nelle prove). */
export interface PtyMinimo {
  onData(cb: (dati: string) => void): unknown;
  onExit(cb: (e: { exitCode: number; signal?: number }) => void): unknown;
  write(dati: string): void;
  resize(colonne: number, righe: number): void;
  kill(segnale?: string): void;
}

export type FunzioneSpawn = (
  file: string,
  argomenti: string[],
  /**
   * `useConptyDll` (solo Windows): usa il conpty.dll incluso in node-pty. Con quello di sistema `kill()` fa un
   * `fork()` di un aiutante, che con il fusibile runAsNode spento rilancerebbe Spalla.exe (seconda istanza, finestra
   * che riappare) e potrebbe lasciare vivo claude.exe.
   */
  opzioni: { name: string; cols: number; rows: number; cwd: string; env: Record<string, string>; useConptyDll?: boolean },
) => PtyMinimo;

export interface DipendenzePannello {
  /** Percorso del binario (vedi binario.ts); undefined = non trovato. */
  trovaBinario(): string | undefined;
  /** Ambiente completo del binario (variabili di sistema ammesse + variabili del runtime del Nucleo). */
  ambiente(): Record<string, string>;
  /** Cartella VUOTA dedicata in cui gira il binario (mai la cartella di lavoro dell'utente). */
  cartella: string;
  /** Crea la cartella se manca (nella Shell: mkdir); assente nelle prove. */
  preparaCartella?: () => Promise<void>;
  /** Dopo quanto il pannello si chiude da solo (predefinito 15 minuti). */
  durataMassimaMs?: number;
  /** Piattaforma (iniettabile nelle prove); predefinita process.platform. */
  piattaforma?: NodeJS.Platform;
  /** Prova di collegamento in modalità abbonamento. */
  verifica(): Promise<EsitoCollegamento>;
  suDati(dati: string): void;
  suStato(stato: StatoPannelloLogin): void;
  logger: Logger;
  testi: { binarioNonTrovato: string; terminale: string };
  /** node-pty; predefinito: import dinamico di 'node-pty' (modulo nativo, caricato solo quando serve). */
  spawn?: FunzioneSpawn;
}

export interface PannelloLogin {
  avvia(): Promise<StatoPannelloLogin>;
  scrivi(dati: string): void;
  ridimensiona(colonne: number, righe: number): void;
  /** Chiude il binario (se gira) e verifica il collegamento. */
  chiudi(): Promise<StatoPannelloLogin>;
  /** Prova di collegamento su richiesta; aggiorna `collegato`. */
  verifica(): Promise<EsitoCollegamento>;
  stato(): StatoPannelloLogin;
}

async function spawnNodePty(): Promise<FunzioneSpawn> {
  const modulo = (await import('node-pty')) as unknown as { spawn?: FunzioneSpawn; default?: { spawn: FunzioneSpawn } };
  const spawn = modulo.spawn ?? modulo.default?.spawn;
  if (!spawn) throw new Error('node-pty senza spawn');
  return spawn;
}

export const DURATA_MASSIMA_PANNELLO_MS = 15 * 60 * 1000;

export function creaPannelloLogin(deps: DipendenzePannello): PannelloLogin {
  let pty: PtyMinimo | undefined;
  let scadenza: ReturnType<typeof setTimeout> | undefined;
  let collegato = false;
  let dimensioni = { colonne: 100, righe: 30 };
  let verificaInCorso: Promise<EsitoCollegamento> | undefined;

  const stato = (): StatoPannelloLogin => ({ attivo: pty !== undefined, collegato });
  const avvisa = (): void => deps.suStato(stato());

  /** Termina il binario senza nuove verifiche (chi chiama decide se verificare). */
  function termina(): boolean {
    const processo = pty;
    if (scadenza) clearTimeout(scadenza);
    scadenza = undefined;
    if (!processo) return false;
    pty = undefined;
    try {
      processo.kill();
    } catch {
      // già uscito
    }
    return true;
  }

  async function verifica(): Promise<EsitoCollegamento> {
    if (verificaInCorso) return verificaInCorso;
    verificaInCorso = (async () => {
      try {
        const esito = await deps.verifica();
        collegato = esito.ok;
        deps.logger.info('pannello.verifica', { ok: esito.ok, codice: esito.codice });
        // Collegati: il pannello non serve più e non deve restare aperto (è fuori dal Permission Broker).
        if (esito.ok && termina()) deps.logger.info('pannello.chiuso_dopo_verifica', {});
        return esito;
      } finally {
        verificaInCorso = undefined;
        avvisa();
      }
    })();
    return verificaInCorso;
  }

  const pannello: PannelloLogin = {
    stato,
    verifica,

    async avvia() {
      if (pty) return stato();
      const binario = deps.trovaBinario();
      if (!binario) throw new Error(deps.testi.binarioNonTrovato);
      const spawn = deps.spawn ?? (await spawnNodePty());
      await deps.preparaCartella?.();
      // Nessun argomento: il binario parte nella sua interfaccia normale, dove l'utente scrive /login.
      const processo = spawn(binario, [], {
        name: deps.testi.terminale,
        cols: dimensioni.colonne,
        rows: dimensioni.righe,
        cwd: deps.cartella,
        env: deps.ambiente(),
        ...((deps.piattaforma ?? process.platform) === 'win32' ? { useConptyDll: true } : {}),
      });
      pty = processo;
      scadenza = setTimeout(() => {
        deps.logger.info('pannello.scaduto', {});
        void pannello.chiudi();
      }, deps.durataMassimaMs ?? DURATA_MASSIMA_PANNELLO_MS);
      scadenza.unref?.();
      processo.onData((dati) => deps.suDati(dati));
      processo.onExit(({ exitCode }) => {
        if (pty !== processo) return;
        pty = undefined;
        if (scadenza) clearTimeout(scadenza);
        scadenza = undefined;
        deps.logger.info('pannello.uscito', { codice: exitCode });
        avvisa();
        // L'utente ha chiuso il binario (/exit o Ctrl+C): controlliamo se il login è riuscito.
        void verifica().catch((e: unknown) => deps.logger.avviso('pannello.verifica_fallita', { errore: e instanceof Error ? e.message : String(e) }));
      });
      deps.logger.info('pannello.avviato', {});
      avvisa();
      return stato();
    },

    scrivi(dati) {
      pty?.write(dati);
    },

    ridimensiona(colonne, righe) {
      dimensioni = { colonne, righe };
      try {
        pty?.resize(colonne, righe);
      } catch {
        // il processo è appena uscito
      }
    },

    async chiudi() {
      if (termina()) {
        avvisa();
        // Il pannello era aperto: controlliamo se il login è riuscito (senza pannello aperto non serve una prova).
        await verifica().catch(() => undefined);
      }
      return stato();
    },
  };
  return pannello;
}
