/**
 * Messaggi per gli errori dell'assistente (EventoAssistente.codice in contratti.ts) e per i limiti del cervello.
 * Si mostrano così come sono, su ogni canale. Sempre: cosa è successo, cosa succede ai messaggi, cosa può fare l'utente.
 */
export const errori = {
  /** Limite del piano Claude raggiunto (docs/02 §2.3 punto 8). `riprovaAlle` è un orario già formattato, es. "16:30". */
  limiteRaggiunto: (riprovaAlle?: string): string =>
    riprovaAlle
      ? `Claude è in pausa fino alle ${riprovaAlle} per il limite del tuo piano. Questo messaggio non l'ho letto: rimandamelo dopo quell'ora.`
      : "Claude è in pausa per il limite del tuo piano. Questo messaggio non l'ho letto: riprova tra poco.",
  limiteSuggerimento: 'Se succede spesso, puoi passare a Claude Max o a una chiave API dalle impostazioni.',
  credenziali: 'Non riesco a collegarmi al tuo Claude. Apri le impostazioni e ricollega il tuo account o la tua chiave.',
  chiaveSenzaCredito: 'La tua chiave non ha credito: apri la pagina Billing di Anthropic e ricarica. Ti aspetto qui, non si perde nulla.',
  rete: "Non c'è connessione. Questo messaggio non l'ho letto: riprova tra poco, appena torna la rete.",
  /** Tetto mensile scelto dall'utente raggiunto (modalità chiave API). */
  budget: (tettoEur: number): string =>
    `Hai raggiunto il tetto di spesa del mese che hai scelto (${tettoEur} €). I lavori di sfondo si fermano; per continuare alza il tetto dalle impostazioni.`,
  /** Tetto mensile raggiunto, ma la conversazione continua: si fermano solo i lavori di sfondo e quelli programmati. */
  tettoSoloSfondo: (tettoEur: number): string =>
    `Hai raggiunto il tetto di spesa del mese che hai scelto (${tettoEur} €): i lavori di sfondo e il buongiorno del mattino sono fermi finché non lo alzi dalle impostazioni. Qui continuo a risponderti.`,
  budgetVicino: (speso: number, tettoEur: number): string =>
    `Questo mese hai speso ${speso.toFixed(2).replace('.', ',')} € su ${tettoEur} €: siamo vicini al tetto.`,
  /** Tetto di spesa di un singolo lavoro di sfondo o programmato. */
  tettoLavoro: 'Ho raggiunto il tetto di spesa previsto per questo lavoro e mi sono fermato.',
  /** Numero massimo di passi di un lavoro esaurito. */
  passiEsauriti: 'Ho esaurito i passi previsti per questo lavoro e mi sono fermato.',
  nessunaRisposta: 'Non ho ricevuto nessuna risposta. Riprova tra poco.',
  altro: 'Qualcosa è andato storto. Riprova tra poco; se succede ancora, in Impostazioni → Aiuto trovi cosa è successo.',
  ruoloImpantanato: (etichetta: string): string => `${etichetta} si è impantanato: riprovo in modo più semplice.`,
  altraCopiaAttiva: 'Un\'altra copia di Spalla è attiva (su un altro computer?). Ne può girare una sola per volta.',
  pcSpento: 'Rispondo solo quando il computer è acceso.',
  fileMemoriaRotto: (file: string, riga: number): string =>
    `Ho trovato un errore in ${file}, riga ${riga}. Ho ripristinato la versione precedente; la tua modifica è nell'archivio.`,
} as const;
