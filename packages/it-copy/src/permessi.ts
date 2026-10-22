/**
 * Frasi del Permission Broker (docs/02 §6): la scheda nomina chi agisce, dice cosa vuole fare, mostra un'anteprima
 * e offre due pulsanti. Stesse frasi nella finestra, nel terminale di sviluppo e su Telegram.
 */
export const permessi = {
  titolo: (chi: string): string => `${chi} chiede il permesso`,
  azioni: {
    leggere: (chi: string, percorso: string): string => `${chi} vuole leggere ${percorso}`,
    scrivere: (chi: string, percorso: string): string => `${chi} vuole scrivere in ${percorso}`,
    modificare: (chi: string, percorso: string): string => `${chi} vuole modificare ${percorso}`,
    /** Il comando, se c'è, va nell'anteprima: la frase resta corta. */
    eseguire: (chi: string, comando?: string): string =>
      comando ? `${chi} vuole eseguire un comando sul computer: ${comando}` : `${chi} vuole eseguire un comando sul computer`,
    aprirePagina: (chi: string, indirizzo: string): string => `${chi} vuole aprire la pagina ${indirizzo}`,
    cercareWeb: (chi: string, cosa: string): string => `${chi} vuole cercare sul web: «${cosa}»`,
    cercareFile: (chi: string, dove: string): string => `${chi} vuole cercare tra i file in ${dove}`,
    /** `aChi` arriva già con la preposizione (comuni.chiAgisce.a): "alla Segretaria". */
    delegare: (chi: string, aChi: string): string => `${chi} vuole passare il lavoro ${aChi}`,
    memoria: (chi: string): string => `${chi} vuole cercare nella memoria`,
    procedura: (chi: string): string => `${chi} vuole seguire una procedura`,
    listaCose: (chi: string): string => `${chi} vuole aggiornare la lista delle cose da fare`,
    chiudere: (chi: string): string => `${chi} vuole chiudere l'argomento`,
    /** Strumento non riconosciuto: niente nome tecnico verso l'utente (docs/04 §1, docs/05 §1.12). */
    generico: (chi: string): string => `${chi} vuole usare uno strumento`,
  },
  anteprima: 'Anteprima',
  pulsanti: { consenti: 'Consenti', nega: 'Nega', siFallo: 'Sì, fallo', no: 'No' },
  /** Frasi restituite all'assistente (le riferisce all'utente in italiano). */
  esiti: {
    consentito: 'Permesso concesso.',
    negatoDaUtente: 'L\'utente ha detto di no.',
    scaduto: 'Nessuna risposta entro il tempo previsto: non lo faccio.',
    negatoDaRegola: 'Questa azione non è permessa dalle regole della casa.',
    nessunCanale: 'Non c\'è nessuno a cui chiedere il permesso adesso: non lo faccio.',
    erroreCanale: 'Non sono riuscito a chiedere il permesso: non lo faccio.',
    terminaleChiuso: 'Terminale chiuso: nessuna conferma possibile, non lo faccio.',
    annullata: 'La richiesta non serve più: la conversazione si è interrotta prima della risposta.',
  },
  /** Riga aggiunta su Telegram sotto i pulsanti. */
  riservaTesto: (id: string): string => `Se i pulsanti non funzionano, rispondi "sì ${id}" oppure "no ${id}".`,
  richiestaVecchia: 'Questa richiesta non è più valida.',
  richiestaNonTua: 'Questa conferma non è per te.',
  /** Domande dell'assistente con opzioni (chip). */
  domanda: {
    scriviRisposta: 'Oppure scrivi la tua risposta.',
    sceltaMultipla: 'Puoi scegliere più di una risposta.',
    nessunaRisposta: 'Scegli tu.',
    /** Risposta data all'assistente quando nessuna interfaccia può raccogliere la scelta. */
    scegliTu: 'Scegli tu la soluzione che ti sembra migliore.',
  },
} as const;
