/** Testi del bot Telegram (docs/02 §8). Brevi, niente tabelle, una domanda alla volta. */
export const telegram = {
  /** Elenco per setMyCommands, in italiano. */
  comandi: [
    { comando: 'start', descrizione: 'Chi sono e la privacy' },
    { comando: 'aiuto', descrizione: 'Cosa posso fare qui' },
    { comando: 'voce', descrizione: 'Risposte vocali: on oppure off' },
    { comando: 'stato', descrizione: 'Computer acceso? Ultimo buongiorno, spesa del mese' },
    { comando: 'nuova', descrizione: 'Chiudi l\'argomento e ricomincia da zero' },
    { comando: 'ricomincia', descrizione: 'Rifai le presentazioni, la squadra o tutto' },
    { comando: 'stop', descrizione: 'Fermati' },
  ],
  /** /start: presentazione, come funziona, privacy (riga obbligatoria con il link all'informativa). */
  start: (nomeAssistente: string, nomeUtente: string, linkPrivacy: string): string =>
    [
      `Ciao ${nomeUtente}, sono ${nomeAssistente}. Qui rispondo solo a te: a testo e a nota vocale.`,
      'Rispondo solo quando il tuo computer è acceso: lì vivono la mia memoria e il tuo Claude.',
      'Prima di fare qualcosa fuori dalla cartella Spalla o verso altre persone ti chiedo conferma con due pulsanti.',
      `Privacy: quello che scrivi qui va dal tuo telefono al tuo computer e da lì al tuo Claude; nessun nostro server lo legge. Informativa: ${linkPrivacy}`,
    ].join('\n'),
  /** /start da uno sconosciuto: nulla. Gli sconosciuti si scartano in silenzio (docs/02 §8.5). */
  aiuto: (nomeAssistente: string): string =>
    [
      `Cosa posso fare qui, ${nomeAssistente} in tasca:`,
      '- Scrivimi o mandami una nota vocale: la trascrivo e rispondo.',
      '- Mandami una foto o un documento: lo salvo nella cartella "in arrivo" e lo guardo.',
      '- "Cosa ho oggi", "ricordami di…", "scrivi a…", "quanto mi deve…": lavoro come al computer, ma in breve.',
      '- /voce on per avere le risposte anche a voce; /stato per sapere se il computer è acceso; /nuova per cambiare argomento.',
      'Non mando niente a nessuno: preparo, tu invii.',
    ].join('\n'),
  stato: (dati: { pcAcceso: boolean; ultimoBrief?: string; spesaMeseEur?: number; tettoEur?: number | null }): string => {
    const righe = [dati.pcAcceso ? 'Computer acceso, sono qui.' : 'Il computer risulta spento o in pausa.'];
    righe.push(dati.ultimoBrief ? `Ultimo buongiorno: ${dati.ultimoBrief}.` : 'Nessun buongiorno inviato finora.');
    if (dati.spesaMeseEur !== undefined) {
      const tetto = dati.tettoEur ? ` su ${dati.tettoEur} €` : '';
      righe.push(`Spesa del mese: ${dati.spesaMeseEur.toFixed(2).replace('.', ',')} €${tetto}.`);
    }
    return righe.join('\n');
  },
  nuova: 'Argomento chiuso. Ripartiamo da zero, con la memoria riletta dai file.',
  stop: 'Mi fermo. Scrivimi quando vuoi.',
  voce: {
    accesa: 'D\'ora in poi ti rispondo anche a voce. /voce off per tornare al solo testo.',
    spenta: 'Torno a rispondere solo a testo.',
    nonDisponibile: 'La voce in uscita non è ancora pronta su questo computer: per ora rispondo a testo.',
    uso: 'Scrivi /voce on oppure /voce off.',
  },
  /** Collegamento del bot (docs/02 §8.2-8.3). */
  pairing: {
    creaBot: (nomeAssistente: string, nomeUtente: string): string => `Crea il bot ${nomeAssistente} di ${nomeUtente}?`,
    nomeSuggerito: (nomeAssistente: string, nomeUtente: string): string => `${nomeAssistente} di ${nomeUtente}`,
    fatto: (username: string): string => `Fatto! Apri Telegram e scrivi "ciao" a @${username}.`,
    collegato: (username: string): string => `Collegato: su Telegram sono @${username} e rispondo solo a te.`,
    primoMessaggio: 'Finché non mi scrivi tu per primo, Telegram non mi lascia iniziare.',
    seiTu: (nomeMostrato: string): string => `È arrivato un messaggio da ${nomeMostrato}. Sei tu?`,
    codice: (codice: string): string => `Per collegarti, scrivi questo codice nell'app sul computer: ${codice}`,
    /** Riga obbligatoria (termini per sviluppatori di Telegram, docs/02 §8.4): va mostrata già con il codice, prima del collegamento. */
    privacy: (linkPrivacy: string): string =>
      `Privacy: quello che scrivi qui va dal tuo telefono al tuo computer e da lì al tuo Claude; nessun nostro server lo legge. Informativa: ${linkPrivacy}`,
    codiceNonValido: 'Il codice non è giusto. Ricontrolla le sei lettere e i numeri sul telefono.',
    codiceScaduto: 'Il codice è scaduto: scrivi di nuovo "ciao" al bot per averne uno nuovo.',
    nonAutorizzato: 'Questo bot risponde solo al suo proprietario.',
    secondoUtente: 'Un secondo utente si aggiunge solo dall\'app, dalle impostazioni (massimo 10).',
  },
  /** Procedura BotFather di riserva (docs/02 §8.3). */
  botfather: {
    titolo: 'Colleghiamo Telegram in tre minuti',
    passi: [
      'Apri BotFather su Telegram e scrivi /newbot.',
      'Quando chiede il nome, incolla quello suggerito qui sotto.',
      'Quando chiede lo username, incolla quello suggerito: deve finire con "bot".',
      'BotFather risponde con una riga lunga con due punti nel mezzo: copiala e incollala qui.',
    ],
    apriBotFather: 'Apri BotFather',
    incollaCodice: 'Incolla qui la riga che ti ha dato BotFather',
    codiceNonValido: 'Questa riga non sembra giusta: ricopiala da BotFather, è lunga e ha due punti nel mezzo.',
    verificaInCorso: 'Controllo…',
    verificaOk: (username: string): string => `Trovato: @${username}. Ora scrivi "ciao" al tuo assistente su Telegram.`,
    verificaFallita: 'Telegram non riconosce questa riga. Riprova a copiarla, oppure scegli [Dopo].',
    dopo: 'Dopo',
  },
  /** Alla ripresa dopo un PC spento, se il messaggio più vecchio in coda ha più di 2 ore. */
  eroSpento: (n: number): string =>
    n === 1 ? 'Ero spento: ho ricevuto 1 messaggio, lo leggo ora.' : `Ero spento: ho ricevuto ${n} messaggi, li leggo ora.`,
  ciLavoro: 'Ci lavoro, circa un minuto.',
  rispostaLunga: 'La risposta è lunga: te la mando anche come file.',
  conferme: {
    siFallo: 'Sì, fallo',
    no: 'No',
    fatto: 'Fatto.',
    nonLoFaccio: 'Va bene, non lo faccio.',
    scaduta: 'Tempo scaduto: non l\'ho fatto.',
    annullata: 'Non serve più: la richiesta è stata annullata.',
  },
  notaVocale: {
    troppoLunga: 'La nota vocale è troppo lunga (oltre 20 MB): mandamene una più corta.',
    hoCapito: (testo: string): string => `Ho capito: <i>${testo}</i>`,
    nonCapita: 'Non sono riuscito a capire la nota vocale. Puoi riprovare, o scrivermi?',
    motoreNonPronto: 'Non riesco ancora ad ascoltare le note vocali su questo computer: scrivimi, oppure attiva la voce dalle impostazioni.',
  },
  allegati: {
    ricevuto: (nomeFile: string): string => `Ricevuto ${nomeFile}: lo guardo.`,
    troppoGrande: 'Il file è troppo grande (oltre 20 MB): non riesco a scaricarlo.',
    tipoNonGestito: 'Questo tipo di file non lo so leggere, per ora.',
  },
  gruppi: 'Nei gruppi non lavoro: scrivimi in privato.',
  altraCopiaAttiva: 'Un\'altra copia di Spalla è attiva (su un altro computer?). Ne può girare una sola.',
  ricomincia: {
    domanda: 'Cosa vuoi rifare?',
    opzioni: { presentazioni: 'Solo le presentazioni', squadra: 'Solo la squadra', tutto: 'Tutto' },
    tuttoConferma: 'Per rifare tutto scrivi la parola "cancella". Prima faccio una copia di sicurezza della cartella.',
    tuttoAnnullato: 'Va bene, non cancello niente.',
    nota: 'Il collegamento Telegram e il tuo Claude restano come sono.',
  },
  /** Frasi brevi del canale fuori dai blocchi sopra. */
  altro: {
    soloDalComputer: 'Questo per ora si fa dal computer, nelle impostazioni.',
    fileNonScaricato: 'Non sono riuscito a scaricare il file: puoi rimandarlo?',
    erroreGenerico: 'Qualcosa è andato storto da questa parte. Riprova tra poco.',
    annulla: 'Annulla',
    fattoScelta: 'Fatto',
    tempoScaduto: 'Tempo scaduto.',
    /** Testo consegnato all'assistente quando arriva un allegato senza didascalia. */
    fotoSenzaDidascalia: 'Ti ho mandato una foto da Telegram: guardala e dimmi cosa ci vedi di utile.',
    documentoSenzaDidascalia: 'Ti ho mandato un documento da Telegram: leggilo e dimmi in breve cosa contiene.',
  },
} as const;
