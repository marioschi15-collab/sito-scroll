/**
 * `window.spalla` (contratto.ts → ApiSpalla) costruito sopra un IPC minimo. Nessun import di Electron qui: il
 * preload passa `ipcRenderer` e `webUtils.getPathForFile`, le prove passano un IPC finto.
 *
 * Regole: solo `invoke` sui nomi del contratto e `on` sugli eventi del contratto; le funzioni di ascolto ricevono
 * soltanto i dati (mai l'evento IPC, che porterebbe con sé `sender`); ogni `on` restituisce la funzione per smettere.
 */
import type { ApiSpalla, NomeEvento, NomeInvoke } from '../ipc/contratto.js';

export interface IpcMinimo {
  invoke(canale: string, ...argomenti: unknown[]): Promise<unknown>;
  on(canale: string, ascoltatore: (evento: unknown, ...argomenti: unknown[]) => void): unknown;
  removeListener(canale: string, ascoltatore: (evento: unknown, ...argomenti: unknown[]) => void): unknown;
}

/** Electron aggiunge "Error invoking remote method 'x': Error: " ai messaggi: alla finestra arriva solo la frase. */
const PREFISSO_ERRORE = /^Error invoking remote method '[^']*':\s*(?:[A-Za-z]*Error:\s*)?/;

export function pulisciMessaggioErrore(messaggio: string): string {
  return messaggio.replace(PREFISSO_ERRORE, '');
}

export function creaApiSpalla(ipc: IpcMinimo, percorsoDiFile: (file: unknown) => string): ApiSpalla {
  async function invoca<T>(nome: NomeInvoke, ...argomenti: unknown[]): Promise<T> {
    try {
      return (await ipc.invoke(nome, ...argomenti)) as T;
    } catch (errore) {
      throw new Error(pulisciMessaggioErrore(errore instanceof Error ? errore.message : String(errore)));
    }
  }

  function ascolta<T>(nome: NomeEvento, cb: (dati: T) => void): () => void {
    const ascoltatore = (_evento: unknown, dati: unknown): void => cb(dati as T);
    ipc.on(nome, ascoltatore);
    return () => {
      ipc.removeListener(nome, ascoltatore);
    };
  }

  return {
    app: {
      stato: () => invoca('app.stato'),
      apriNelSistema: (percorsoRelativo) => invoca('app.apriNelSistema', percorsoRelativo),
      apriLink: (url) => invoca('app.apriLink', url),
      esportaTutto: () => invoca('app.esportaTutto'),
      chiudi: () => invoca('app.chiudi'),
    },
    onboarding: {
      stato: () => invoca('onboarding.stato'),
      prepara: () => invoca('onboarding.prepara'),
      completa: () => invoca('onboarding.completa'),
      risposte: () => invoca('onboarding.risposte'),
      ricomincia: (ampiezza) => invoca('onboarding.ricomincia', ampiezza),
    },
    chat: {
      invia: (avvio) => invoca('chat.invia', avvio),
      rispondi: (risposta) => invoca('chat.rispondi', risposta),
      nuovaSessione: () => invoca('chat.nuovaSessione'),
      interrompi: (scambioId) => invoca('chat.interrompi', scambioId),
    },
    permessi: {
      decidi: (id, decisione) => invoca('permessi.decidi', id, decisione),
      inAttesa: () => invoca('permessi.inAttesa'),
    },
    cervello: {
      collegaChiaveApi: (chiave, tettoMensileEur, livello) => invoca('cervello.collegaChiaveApi', chiave, tettoMensileEur, livello),
      rimuoviChiaveApi: () => invoca('cervello.rimuoviChiaveApi'),
      avviaPannelloLogin: () => invoca('cervello.avviaPannelloLogin'),
      chiudiPannelloLogin: () => invoca('cervello.chiudiPannelloLogin'),
      verifica: () => invoca('cervello.verifica'),
      cambiaModalita: (modalita) => invoca('cervello.cambiaModalita', modalita),
    },
    terminale: {
      scrivi: (dati) => invoca('terminale.scrivi', dati),
      ridimensiona: (colonne, righe) => invoca('terminale.ridimensiona', colonne, righe),
    },
    telegram: {
      stato: () => invoca('telegram.stato'),
      suggerimenti: () => invoca('telegram.suggerimenti'),
      collegaConToken: (token) => invoca('telegram.collegaConToken', token),
      collegaInDueTocchi: () => invoca('telegram.collegaInDueTocchi'),
      confermaPairing: (codice) => invoca('telegram.confermaPairing', codice),
      scollega: () => invoca('telegram.scollega'),
    },
    squadra: {
      elenco: () => invoca('squadra.elenco'),
      attiva: (nome) => invoca('squadra.attiva', nome),
      disattiva: (nome) => invoca('squadra.disattiva', nome),
    },
    memoria: {
      elenco: () => invoca('memoria.elenco'),
      leggi: (percorsoRelativo) => invoca('memoria.leggi', percorsoRelativo),
      cerca: (query) => invoca('memoria.cerca', query),
      contatori: () => invoca('memoria.contatori'),
      ricostruisciIndice: () => invoca('memoria.ricostruisciIndice'),
      riepilogoProfilo: () => invoca('memoria.riepilogoProfilo'),
    },
    impostazioni: {
      leggi: () => invoca('impostazioni.leggi'),
      salva: (impostazioni) => invoca('impostazioni.salva', impostazioni),
    },
    voce: {
      stato: () => invoca('voce.stato'),
      prepara: () => invoca('voce.prepara'),
    },
    allegati: {
      // Il percorso di un file trascinato si ricava solo qui (webUtils): la finestra non vede mai percorsi assoluti.
      aggiungi: async (file) => {
        const percorsi = Array.from(file, (f) => {
          try {
            return percorsoDiFile(f);
          } catch {
            return '';
          }
        }).filter((p) => p.length > 0);
        if (percorsi.length === 0) return [];
        return invoca<string[]>('allegati.aggiungi', percorsi);
      },
    },
    on: {
      eventoScambio: (cb) => ascolta('evento.eventoScambio', cb),
      domanda: (cb) => ascolta('evento.domanda', cb),
      permesso: (cb) => ascolta('evento.permesso', cb),
      permessoChiuso: (cb) => ascolta('evento.permessoChiuso', cb),
      terminaleDati: (cb) => ascolta('evento.terminaleDati', cb),
      terminaleStato: (cb) => ascolta('evento.terminaleStato', cb),
      telegramStato: (cb) => ascolta('evento.telegramStato', cb),
      statoApp: (cb) => ascolta('evento.statoApp', cb),
      voceAvanzamento: (cb) => ascolta('evento.voceAvanzamento', cb),
      notifica: (cb) => ascolta('evento.notifica', cb),
      apriSchermata: (cb) => ascolta('evento.apriSchermata', cb),
      domandaChiusa: (cb) => ascolta('evento.domandaChiusa', cb),
    },
  };
}
