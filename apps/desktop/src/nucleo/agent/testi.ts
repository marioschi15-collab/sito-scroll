import { assistente, errori, permessi } from '@spalla/it-copy';

/**
 * Frasi del runtime dell'assistente, prese da @spalla/it-copy (`errori`, `assistente`, `permessi`).
 * Resta qui solo ciò che legge il modello e non l'utente (la descrizione dello strumento di ricerca, il motivo
 * di un rifiuto imposto dal software).
 */
export const testiAgent = {
  errori: {
    limite: (oraLocale?: string): string => errori.limiteRaggiunto(oraLocale),
    credenziali: errori.credenziali,
    rete: errori.rete,
    /** Tetto di spesa della singola esecuzione (maxBudgetUsd). */
    budget: errori.tettoLavoro,
    /** Tetto mensile scelto dall'utente (modalità chiave API): ferma i lavori di sfondo e programmati. */
    tettoMensile: (tettoEur: number): string => errori.budget(tettoEur),
    /** Tetto mensile raggiunto, detto una volta nella conversazione principale, che continua. */
    tettoSoloSfondo: (tettoEur: number): string => errori.tettoSoloSfondo(tettoEur),
    turni: errori.passiEsauriti,
    altro: errori.altro,
    nessunaRisposta: errori.nessunaRisposta,
  },
  permessi: {
    /** Risposta all'assistente quando la sessione si interrompe mentre si aspetta una conferma. */
    annullata: permessi.esiti.annullata,
  },
  /** Risposta alle domande quando nessuna interfaccia può raccogliere la scelta dell'utente. */
  scegliTu: permessi.domanda.scegliTu,
  strumenti: assistente.strumenti,
  memoriaCerca: {
    /** Per il modello: descrizione dello strumento MCP `memoria_cerca`. */
    descrizione:
      'Cerca nella memoria di lavoro (profilo, schede, agenda, diari, archivio) i passaggi più pertinenti. Restituisce fino a k risultati con il percorso del file da leggere per intero.',
    nessunRisultato: assistente.memoriaVuota,
  },
  protezione: {
    /** Per il modello: perché una scrittura è stata rifiutata dal software (hook PreToolUse). */
    fileProtetto: (file: string): string =>
      `${file} fa parte delle impostazioni del software e non si modifica dalla conversazione, qualunque sia il motivo. Se l'utente vuole cambiarlo, digli di farlo dalle impostazioni dell'app.`,
  },
} as const;
