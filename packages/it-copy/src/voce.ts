/** Frasi del servizio voce (docs/02 §7): trascrizione delle note vocali, download del modello. */
export const voce = {
  motoreSpento: 'La trascrizione delle note vocali è spenta: puoi attivarla dalle impostazioni, voce.',
  motoreMancante: 'Su questo computer manca il componente per ascoltare le note vocali. Reinstalla Spalla oppure scrivimi a testo.',
  modelloMancante: 'Il modello per capire la voce non è ancora scaricato: attiva la voce dalle impostazioni e aspetta il download.',
  modelloDanneggiato: 'Il modello per capire la voce risulta danneggiato: scaricalo di nuovo dalle impostazioni.',
  nessunaVoce: 'Nella nota vocale non ho sentito parole.',
  preparazione: {
    inizio: 'Preparo la voce…',
    rilevatore: 'Scarico il rilevatore di parlato (meno di 1 MB)…',
    modello: (nome: string, megabyte: number): string => `Scarico il modello ${nome} (circa ${megabyte} MB), una volta sola…`,
    estrazione: 'Sistemo i file del modello…',
    verifica: 'Controllo che il download sia integro…',
    fatto: 'Voce pronta.',
  },
  erroreDownload: 'Non riesco a scaricare il modello della voce: controlla la connessione e riprova.',
  erroreHash: 'Il file scaricato non corrisponde a quello atteso: lo riscarico la prossima volta.',
} as const;
