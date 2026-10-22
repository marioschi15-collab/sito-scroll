/** Stringhe del terminale di sviluppo (apps/desktop/src/cli). È la finestra provvisoria: stessi testi dell'app, resi in testo. */
export const cli = {
  avvio: {
    titolo: (nomeProdotto: string, versione: string): string => `${nomeProdotto} — versione di sviluppo ${versione}`,
    /** Riga di apertura del terminale: prodotto e modalità del cervello già resa in parole. */
    intestazione: (nomeProdotto: string, modalita: string): string => `${nomeProdotto} — terminale di sviluppo · cervello: ${modalita}`,
    cartella: (percorso: string): string => `Cartella di lavoro: ${percorso}`,
    preparo: 'Preparo la cartella con i modelli…',
    cartellaPronta: 'Cartella pronta.',
    cartellaEsistente: 'Cartella già presente: non tocco i tuoi file.',
    cervello: (modalita: 'chiave_api' | 'abbonamento'): string =>
      modalita === 'chiave_api' ? 'Cervello: chiave API Anthropic.' : 'Cervello: il tuo abbonamento Claude.',
    telegramAttivo: (username: string): string => `Telegram collegato: @${username}.`,
    telegramSpento: 'Telegram non collegato (imposta TELEGRAM_BOT_TOKEN o usa /telegram).',
    primoAvvio: 'Prima volta: facciamo le presentazioni. Scrivi "salta" se hai fretta.',
    ripresa: 'Le presentazioni non sono finite: riprendiamo da dove eravamo.',
    pronto: 'Scrivi un messaggio e premi Invio. /aiuto per i comandi.',
    comandiBrevi: 'Comandi: /nuova (nuovo argomento), /stato, /telegram, /memoria, /aiuto, /esci',
  },
  /** Nome breve della modalità del cervello. */
  modalita: {
    chiave_api: 'chiave API',
    abbonamento: 'abbonamento Claude',
  },
  /** Prima configurazione: come collegare il cervello. */
  sceltaModalita: {
    titolo: 'Come vuoi collegare il cervello?',
    chiaveApi: '1) Ho una chiave API Anthropic',
    abbonamento: '2) Ho un abbonamento Claude (Pro, Max, Team)',
    nonValida: 'Scrivi 1 oppure 2.',
    scelta: 'Scelta: ',
  },
  chiaveApi: {
    incolla: 'Incolla la chiave API (inizia con sk-ant-): ',
    salvata: 'Chiave salvata nel deposito cifrato.',
    nonValida: 'La chiave non ha il formato atteso: riprova.',
  },
  abbonamento: {
    comeCollegare: (comando: string): string =>
      `Se non hai ancora collegato il tuo Claude, in un altro terminale esegui:\n  ${comando}\ne completa l'accesso nel browser. Poi torna qui.`,
  },
  verifica: { inCorso: 'Controllo il collegamento…' },
  prompt: {
    tu: '> ',
    assistente: (nome: string): string => `${nome} › `,
    assistenteSenzaNome: 'Assistente › ',
    penso: '… ci lavoro',
    strumento: (descrizione: string, ruolo?: string): string => (ruolo ? `  · [${ruolo}] ${descrizione}` : `  · ${descrizione}`),
  },
  /** Le chip di una domanda, rese come opzioni numerate. */
  chip: {
    istruzioni: 'Scegli con il numero, oppure scrivi la risposta:',
    istruzioniMulti: 'Scegli uno o più numeri separati da virgola, oppure scrivi la risposta:',
    opzione: (n: number, etichetta: string, descrizione?: string): string =>
      descrizione ? `  ${n}) ${etichetta} — ${descrizione}` : `  ${n}) ${etichetta}`,
    nonValida: 'Non ho capito la scelta: scrivi un numero dell\'elenco, oppure la tua risposta.',
    pulsanteFisso: (etichetta: string): string => `  (in qualsiasi momento: "${etichetta.toLowerCase()}")`,
  },
  conferma: {
    titolo: (id: string): string => `Richiesta di permesso [${id}]`,
    domanda: 'Consenti? [s/n] ',
    tastoSi: 's',
    tastoNo: 'n',
    consentito: 'Va bene, procedo.',
    negato: 'Non lo faccio.',
    scaduta: 'Nessuna risposta: non lo faccio.',
    annullata: 'Richiesta annullata: non serve più una risposta.',
  },
  comandi: {
    intestazione: 'Comandi del terminale:',
    elenco: [
      { comando: '/aiuto', descrizione: 'questo elenco' },
      { comando: '/nuova', descrizione: 'chiude l\'argomento e ne apre uno nuovo, con la memoria riletta dai file' },
      { comando: '/stato', descrizione: 'argomento in corso, spesa del mese, presentazioni, Telegram' },
      { comando: '/memoria', descrizione: 'contatori della memoria e ricostruzione dell\'indice' },
      { comando: '/telegram', descrizione: 'collega Telegram (procedura guidata) o conferma il codice del telefono' },
      { comando: '/ricomincia', descrizione: 'rifai le presentazioni, la squadra o tutto' },
      { comando: '/esci', descrizione: 'chiude il programma' },
    ],
    sconosciuto: (comando: string): string => `Comando "${comando}" sconosciuto. /aiuto per l'elenco.`,
    note: [
      'Alle domande con opzioni rispondi con il numero (o più numeri separati da virgola) oppure scrivendo liberamente.',
      'Alle richieste di permesso rispondi s (sì) oppure n (no).',
    ],
  },
  fine: {
    riepilogo: (durataSec: number, costoUsd?: number, turni?: number): string => {
      const parti = [`${durataSec.toFixed(1).replace('.', ',')} s`];
      if (turni !== undefined) parti.push(`${turni} ${turni === 1 ? 'passo' : 'passi'}`);
      if (costoUsd !== undefined) parti.push(`${(costoUsd < 0.01 ? costoUsd.toFixed(4) : costoUsd.toFixed(3)).replace('.', ',')} $`);
      return `— fatto in ${parti.join(' · ')}`;
    },
  },
  errore: (messaggio: string): string => `! ${messaggio}`,
  stato: {
    spesaMese: (usd: number, tettoEur?: number | null, sopraTetto?: boolean): string =>
      tettoEur
        ? `Spesa del mese: ${usd.toFixed(2).replace('.', ',')} $ (tetto ${tettoEur} €${sopraTetto ? ', RAGGIUNTO' : ''})`
        : `Spesa del mese: ${usd.toFixed(2).replace('.', ',')} $`,
    sessione: (id?: string): string => (id ? `Argomento in corso: ${id}` : 'Nessun argomento in corso: il prossimo messaggio ne apre uno nuovo.'),
    memoria: (righe: number, tetto: number): string => `Memoria: ${righe}/${tetto} righe`,
    memoriaDettaglio: (file: number, blocchi: number, osservazione: string): string =>
      `Indice della memoria: ${file} file, ${blocchi} passaggi (aggiornamento: ${osservazione}).`,
    memoriaContatori: (schede: number, diari: number, utenteCaratteri: number, utenteTetto: number): string =>
      `Schede: ${schede} · diari: ${diari} · profilo utente: ${utenteCaratteri}/${utenteTetto} caratteri`,
    indiceRicostruito: 'Indice della memoria ricostruito.',
    onboarding: (stato: 'da_fare' | 'in_corso' | 'completato'): string =>
      ({ da_fare: 'Presentazioni: da fare', in_corso: 'Presentazioni: in corso', completato: 'Presentazioni: completate' })[stato],
    telegram: (username?: string): string => (username ? `Telegram: collegato come @${username}` : 'Telegram: non collegato'),
    telegramInAttesa: (n: number): string => `Telegram: ${n} ${n === 1 ? 'telefono aspetta' : 'telefoni aspettano'} il codice (/telegram <codice>)`,
  },
  onboarding: {
    inizio: 'Prima volta: facciamo le presentazioni.',
    ripresa: 'Le presentazioni non sono finite: riprendiamo da dove eravamo.',
    completato: 'Presentazioni concluse.',
    problemi: (n: number): string => `Ho trovato ${n} ${n === 1 ? 'cosa da sistemare' : 'cose da sistemare'} nei file:`,
  },
  nuovaSessione: 'Argomento chiuso: il prossimo messaggio parte da zero, con la memoria riletta dai file.',
  /** Collegamento di Telegram dal terminale: procedura BotFather e codice del telefono. */
  telegram: {
    giaCollegato: (username: string): string => `Telegram è già collegato come @${username}.`,
    chiesto: 'Hai chiesto di collegare Telegram: facciamolo adesso, oppure premi Invio per rimandare.',
    incolla: 'Riga di BotFather (Invio per rimandare): ',
    verifico: 'Controllo…',
    salvato: (username: string): string => `Collegato a @${username}. Ora apri Telegram e scrivi "ciao" a @${username}: ti risponderà con un codice.`,
    codice: 'Codice ricevuto sul telefono (Invio per rimandare): ',
    inAttesaCodice: (codice: string, nome: string): string => `Telegram: ${nome} ha scritto al bot. Se sei tu, conferma con: /telegram ${codice}`,
    confermato: (username: string): string => `Fatto: su Telegram @${username} risponde solo a te.`,
    rimandato: 'Va bene, Telegram lo colleghi quando vuoi con /telegram.',
    nonDisponibile: 'Il collegamento Telegram non è disponibile in questo terminale.',
    avvioFallito: (motivo: string): string => `Telegram non è partito: ${motivo}`,
    uso: 'Uso: /telegram (procedura guidata), /telegram <riga di BotFather>, /telegram <codice del telefono>.',
    /** Messaggi di sistema per l'assistente, dopo il collegamento (docs/05 S7: "collegato come @..."). */
    sistemaCollegato: (username: string): string => `Telegram collegato come @${username}: l'utente deve scrivere per primo al bot; il bot risponde solo a lui e solo con il computer acceso.`,
    sistemaNonCollegato: 'Telegram non è stato collegato adesso: l\'utente lo farà dalle impostazioni. Vai avanti come con [Dopo].',
  },
  uscita: 'A presto.',
} as const;
