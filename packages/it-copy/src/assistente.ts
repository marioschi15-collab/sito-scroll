import { comuni } from './comuni.js';

/** Etichetta di un ruolo del catalogo ("Segretaria") o il nome del file se è un ruolo dell'utente. */
export function etichettaRuolo(ruolo: string): string {
  return comuni.ruoli[ruolo] ?? ruolo;
}

/**
 * Righe che le interfacce mostrano mentre l'assistente lavora (eventi `strumento` di contratti.ts):
 * "Leggo memoria/agenda.md", "Passo il lavoro alla Segretaria". Mai gergo: niente nomi di strumenti.
 */
export const assistente = {
  strumenti: {
    leggere: (percorso: string): string => `Leggo ${percorso}`,
    scrivere: (percorso: string): string => `Scrivo ${percorso}`,
    modificare: (percorso: string): string => `Modifico ${percorso}`,
    cercareFile: 'Cerco tra i file',
    ricercaWeb: (cosa: string): string => `Cerco sul web: ${cosa}`,
    pagina: (indirizzo: string): string => `Apro ${indirizzo}`,
    comando: 'Eseguo un comando',
    /** `ruolo` è il nome del file del ruolo (es. "segretaria"); assente = un ruolo non riconosciuto. */
    delega: (ruolo?: string): string => (ruolo ? `Passo il lavoro ${comuni.chiAgisce.a(etichettaRuolo(ruolo))}` : 'Passo il lavoro a un ruolo'),
    domanda: 'Ti faccio una domanda',
    memoria: (cosa: string): string => (cosa ? `Cerco nella memoria: ${cosa}` : 'Cerco nella memoria'),
    procedura: 'Seguo una procedura',
    listaCose: 'Aggiorno la lista delle cose da fare',
    chiudoArgomento: "Chiudo l'argomento",
    /** Strumento non riconosciuto: niente nome tecnico verso l'utente. */
    generico: 'Uso uno strumento',
  },
  /** Risposta dello strumento di ricerca quando la memoria non ha nulla (la legge l'assistente, può riferirla). */
  memoriaVuota: 'Nessun ricordo trovato per questa ricerca.',
} as const;
