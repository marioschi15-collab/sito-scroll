/** "4000" → "4.000" (migliaia all'italiana), senza dipendere dall'ICU di Node. */
function formattaNumero(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Cornice dell'onboarding (docs/05): schermate di S0, pulsanti fissi, ripresa, "Come mi sono presentato", /ricomincia. */
export const onboarding = {
  benvenuto: 'Ciao. Sono il tuo nuovo assistente e per ora non so niente di te.',
  pulsantiFissi: {
    vaiConsigliati: 'Vai con i consigliati',
    saltaTutto: 'Salta tutto, facciamo dopo',
  },
  ripresa: {
    domanda: 'Riprendiamo da dove eravamo?',
    dueMinuti: 'Hai due minuti per finire le presentazioni?',
    notificaTreGiorni: 'Finiamo di presentarci? Due minuti.',
    rinviato: 'Va bene, facciamo dopo. Te lo ripropongo alla prossima pausa.',
  },
  s0: {
    benvenuto: { titolo: 'Benvenuto', testo: 'In dieci minuti ti faccio conoscere il tuo nuovo assistente e gli faccio fare subito una cosa utile.', lingua: 'Lingua', italiano: 'Italiano' },
    privacy: {
      titolo: 'Privacy, in una schermata',
      dove: 'I tuoi file stanno nella cartella Spalla sul tuo computer. Puoi aprirli, correggerli e cancellarli quando vuoi.',
      anthropic: 'Quello che scrivi all\'assistente va ai server di Anthropic sotto il tuo accordo con Anthropic (il tuo abbonamento o la tua chiave).',
      noi: 'Noi non vediamo niente: né le conversazioni, né la memoria, né i tuoi file.',
      clienti: 'Dei tuoi clienti l\'assistente ricorda solo quello che gli dici tu di ricordare; mai dati sanitari o bancari.',
      link: 'Leggi l\'informativa completa',
      accetto: 'Ho capito, continua',
    },
    avvioAutomatico: {
      titolo: 'Sempre pronto',
      testo: 'Spalla parte quando accendi il computer e resta nella barra in alto (Mac) o in basso (Windows), così Telegram e il buongiorno del mattino funzionano da soli.',
      attiva: 'Avvia Spalla all\'accensione',
      notifiche: 'Permetti le notifiche',
      permessiMac: 'Il sistema ti chiederà alcuni permessi (notifiche, accesso alle cartelle): servono per lavorare, non mandiamo niente a nessuno.',
    },
    pronto: { titolo: 'Tutto pronto', testo: 'Ora parli con il tuo assistente. La prima parola è sua.' },
  },
  cartella: {
    creata: (percorso: string): string => `Ho creato la cartella ${percorso}: lì vivranno memoria e lavoro.`,
    esistente: (percorso: string): string => `La cartella ${percorso} esiste già e contiene dei file.`,
    scelta: { nuova: 'Usa una cartella nuova', unisci: 'Unisci (con copia di sicurezza)' },
    disco: 'Il disco non è cifrato: ti consiglio di attivare FileVault (Mac) o BitLocker (Windows) dalle impostazioni di sistema. Lo trovi anche in Impostazioni → Sicurezza.',
  },
  stato: { daFare: 'Presentazioni da fare', inCorso: 'Presentazioni in corso', completato: 'Presentazioni completate' },
  validazione: {
    tuttoOk: 'Profilo e squadra in ordine.',
    problemi: (n: number): string => (n === 1 ? 'Ho trovato un problema nei file del profilo:' : `Ho trovato ${n} problemi nei file del profilo:`),
    correggo: 'Lo sistemo io',
  },
  riepilogo: {
    comeMiSonoPresentato: 'Come mi sono presentato',
    sottotitolo: 'Le domande e le risposte della prima conversazione, che hanno dato forma al tuo assistente.',
    squadra: 'La squadra',
    cambia: 'Cambia',
    vuoto: 'Le presentazioni non sono ancora finite.',
    completatoIl: (data: string, minuti: number): string => `Completate il ${data} in ${minuti} minuti.`,
  },
  ricomincia: {
    titolo: 'Ricominciamo?',
    domanda: 'Cosa vuoi rifare?',
    presentazioni: { etichetta: 'Solo le presentazioni', nota: 'ti chiedo solo cosa è cambiato; la memoria resta' },
    squadra: { etichetta: 'Solo la squadra', nota: 'rifaccio i ruoli dal catalogo; le loro memorie restano' },
    tutto: { etichetta: 'Tutto', nota: 'cartella nuova e presentazioni da capo; prima una copia di sicurezza' },
    tuttoConferma: 'Per rifare tutto scrivi "cancella".',
    copiaSicurezza: (percorso: string): string => `Copia di sicurezza salvata in ${percorso}.`,
    nota: 'Il collegamento Telegram e il tuo Claude non cambiano.',
  },
  telegram: {
    apertura: 'Apro il collegamento con Telegram: due tocchi sul telefono.',
    inCorso: 'Aspetto la conferma da Telegram…',
    riuscito: (username: string): string => `Collegato: su Telegram sono @${username} e rispondo solo a te.`,
    fallito: 'Il collegamento non è riuscito. Possiamo riprovare dopo, dalle impostazioni.',
  },
  /** Le otto fasi del rituale (docs/05 §2), come le vede l'utente. */
  fasi: {
    S1: 'Presentazioni',
    S2: 'Il tuo lavoro',
    S3: 'La tua giornata',
    S4: 'Il primo colpo',
    S5: 'La squadra',
    S6: 'Regole della casa',
    S7: 'Telegram e voce',
    S8: 'Chiusura',
  },
  /** Errori del modulo (cartella dei modelli, nomi dei ruoli). */
  errori: {
    modelliNonTrovati: (percorso: string): string => `La cartella dei modelli non esiste: ${percorso}`,
    nomeRuoloNonValido: (nome: string): string => `Nome di ruolo non valido: "${nome}" (solo minuscole, cifre e trattini)`,
    ruoloSconosciuto: (nome: string): string => `Ruolo sconosciuto: "${nome}" (non è né tra i ruoli accesi né tra quelli spenti)`,
    ruoloSenzaIntestazione: (file: string): string => `${file}: il file del ruolo non inizia con l'intestazione ("---")`,
    ruoloSenzaAttivo: (file: string): string => `${file}: nel blocco "spalla" manca la riga "attivo"`,
  },
  /** Problemi trovati da `valida()` sui file generati (li legge l'utente). */
  problemi: {
    fileMancante: (file: string): string => `${file}: il file manca`,
    fileSenzaIntestazione: (file: string): string => `${file}: il file non inizia con l'intestazione del ruolo ("---")`,
    ruoloNonValido: (file: string, dettagli: readonly string[]): string => `${file}: ${dettagli.join('; ')}`,
    nomeDiverso: (file: string, nome: string): string => `${file}: il nome scritto dentro ("${nome}") non corrisponde al nome del file`,
    nomeDuplicato: (cartella: string, nome: string, file: readonly string[]): string =>
      `${cartella}: due ruoli con lo stesso nome "${nome}" (${file.join(', ')})`,
    accesoMaSpento: (file: string): string => `${file}: è tra i ruoli accesi ma dentro c'è "attivo: false"`,
    spentoMaAcceso: (file: string): string => `${file}: è tra i ruoli spenti ma dentro c'è "attivo: true"`,
    segnapostoNelRuolo: (file: string): string => `${file}: contiene ancora i segnaposto {{NOME_UTENTE}} o {{MESTIERE}} da sostituire`,
    troppiAccesi: (n: number, massimo: number): string =>
      `.claude/agents: ${n} ruoli accesi oltre a critico e archivista; il massimo è ${massimo} (regola dei tre)`,
    mancaRuoloSempreAcceso: (nome: string): string => `.claude/agents/${nome}.md: manca, ma questo ruolo deve essere sempre acceso`,
    importNonRisolto: (file: string, riferimento: string, destinazione: string): string =>
      `${file}: richiama "@${riferimento}" ma il file ${destinazione} non esiste`,
    troppeRighe: (file: string, righe: number, tetto: number): string => `${file}: ${righe} righe, il tetto è ${tetto}`,
    troppiCaratteri: (file: string, caratteri: number, tetto: number): string =>
      `${file}: ${formattaNumero(caratteri)} caratteri, il tetto è ${formattaNumero(tetto)}`,
    troppiByte: (file: string, kb: number, tettoKb: number): string => `${file}: ${kb} KB, il tetto è ${tettoKb} KB`,
    jsonNonValido: (file: string, dettaglio: string): string => `${file}: non è un JSON valido (${dettaglio})`,
    schemaNonValido: (file: string, dettagli: readonly string[]): string => `${file}: ${dettagli.join('; ')}`,
    settingsSenzaPermessi: (file: string): string => `${file}: manca la sezione "permissions"`,
    settingsListaNonValida: (file: string, chiave: string): string => `${file}: "permissions.${chiave}" deve essere un elenco`,
    settingsPercorsoAssoluto: (file: string, regola: string): string =>
      `${file}: la regola "${regola}" usa un percorso assoluto con una sola barra; dentro la cartella si scrive "./**"`,
    daCompilare: (file: string): string => `${file}: contiene ancora righe "(da compilare durante le presentazioni)"`,
  },
  /** Riga del diario scritta a presentazioni concluse. */
  diario: {
    intestazione: (data: string): string => `# Diario ${data}`,
    completato: (squadra: string, primoLavoro: string): string =>
      `Presentazioni completate: profilo, squadra (${squadra}), primo lavoro: ${primoLavoro}.`,
    nessunRuolo: 'nessun ruolo acceso',
    nessunLavoro: 'nessuno',
    /** Riga del diario per il primo messaggio del rituale (al posto del titolo del file, che è per l'assistente). */
    iniziate: 'Presentazioni iniziate',
  },
  /** "Cosa sai di me?": il profilo raccontato in italiano semplice. */
  profilo: {
    vuoto: 'Non so ancora niente di te: le presentazioni non sono finite.',
    mancano: (voci: string): string => `Mancano ancora: ${voci}.`,
    mioNome: (nome: string): string => `Mi chiamo ${nome}.`,
    utente: (riga: string): string => `Tu: ${riga}.`,
    intestazione: 'Ecco cosa so di te:',
    fonte: {
      onboarding: 'dalle presentazioni',
      conversazione: 'da una conversazione',
      archivista: 'dal riordino notturno',
    } as Record<string, string>,
    superate: (n: number): string =>
      n === 1
        ? 'Nel tempo ho aggiornato una preferenza: la versione vecchia resta segnata come superata.'
        : `Nel tempo ho aggiornato ${n} preferenze: le versioni vecchie restano segnate come superate.`,
  },
} as const;
