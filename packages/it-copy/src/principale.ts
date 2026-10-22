/**
 * Frasi del processo principale della finestra (Electron): icona nella barra, notifiche di sistema, esportazione,
 * allegati trascinati, pannello di collegamento, errori restituiti alla finestra attraverso il confine IPC.
 * Niente gergo verso l'utente: mai "agente", "prompt", "token", "MCP"; "API" solo in "chiave API".
 */
export const principale = {
  tray: {
    descrizione: (nomeProdotto: string): string => `${nomeProdotto} — il tuo assistente`,
    apri: 'Apri Spalla',
    stato: 'Stato',
    esci: 'Esci',
    /** Riga di stato nel menu dell'icona: presentazioni, Telegram, cervello. */
    riga: {
      presentazioni: { da_fare: 'Presentazioni da fare', in_corso: 'Presentazioni in corso', completato: 'Presentazioni fatte' },
      telegram: (username?: string): string => (username ? `Telegram: @${username}` : 'Telegram non collegato'),
      cervello: (collegato: boolean): string => (collegato ? 'Cervello collegato' : 'Cervello da collegare'),
      lavoro: (n: number): string => (n === 1 ? 'Un lavoro in corso' : `${n} lavori in corso`),
    },
  },
  notifiche: {
    permesso: { titolo: (chi: string): string => `${chi} chiede il permesso`, apri: 'Apri la finestra per rispondere.' },
    brief: { titolo: 'Buongiorno' },
    telegram: {
      titolo: 'Telegram',
      apriDallaChat: 'Il tuo assistente ti propone di collegare Telegram: trovi tutto nella sezione Telegram.',
      pairing: (nome: string): string => `${nome} ha scritto al bot: conferma il codice nella sezione Telegram.`,
      collegato: (username: string): string => `Telegram collegato come @${username}.`,
      scollegato: 'Telegram scollegato.',
    },
    pannello: {
      titolo: 'Collega il tuo Claude',
      chiuso: 'Pannello chiuso: controllo il collegamento…',
      collegato: 'Collegato. Spalla può pensare.',
      nonCollegato: 'Il collegamento non risulta ancora riuscito: riapri il pannello e completa /login.',
    },
    esporta: { titolo: 'Esportazione', fatto: (percorso: string): string => `Cartella esportata in ${percorso}.` },
    riavvio: 'Applico le nuove impostazioni…',
  },
  esporta: {
    titoloDialogo: 'Dove salvo la copia della cartella Spalla?',
    pulsante: 'Esporta',
    /** Nome proposto per il file zip: Spalla-AAAA-MM-GG.zip */
    nomeFile: (nomeProdotto: string, dataIso: string): string => `${nomeProdotto}-${dataIso}.zip`,
    filtroZip: 'Archivio compresso',
    fallito: 'Non sono riuscito a creare la copia. Controlla che ci sia spazio sul disco e riprova.',
  },
  allegati: {
    troppoGrande: (nome: string, mb: number): string => `${nome} è troppo grande (oltre ${mb} MB): non lo allego.`,
    nonLeggibile: (nome: string): string => `Non riesco a leggere ${nome}.`,
    nessuno: 'Nessun file da allegare.',
    copiato: (n: number): string => (n === 1 ? 'Ho messo il file in lavoro/in-arrivo.' : `Ho messo ${n} file in lavoro/in-arrivo.`),
  },
  pannello: {
    binarioNonTrovato: 'Non trovo il motore di Claude Code dentro Spalla: reinstalla l\'app oppure passa alla chiave API.',
    giaAperto: 'Il pannello è già aperto.',
    /** Il pannello si apre solo per collegare l'abbonamento, e solo se non è già collegato. */
    soloAbbonamento: 'Il pannello di collegamento serve solo per l\'abbonamento Claude: sceglilo prima nella schermata del cervello.',
    giaCollegato: 'Il tuo abbonamento è già collegato: il pannello non serve.',
    terminale: 'xterm-256color',
  },
  chat: {
    interrotto: 'Mi sono fermato. Il prossimo messaggio parte pulito.',
    scambioDuplicato: 'Questo messaggio è già in corso.',
    scambioSconosciuto: 'Questa conversazione non è più in corso.',
    domandaSconosciuta: 'Questa domanda non aspetta più una risposta.',
    nuovaSessione: 'Argomento chiuso: il prossimo messaggio parte da zero, con la memoria riletta dai file.',
    /** Va all'assistente (non all'utente) quando l'utente ferma lo scambio mentre c'era una domanda o un permesso in attesa. */
    motivoInterrotto: "L'utente ha interrotto questo lavoro dalla finestra: fermati qui e non riprovare.",
  },
  presentazioni: {
    /** Risposta del "primo colpo" (S4) nella pagina "Come mi sono presentato". */
    sceltaPrimoColpo: (n: number, file?: string): string => (file ? `Scelta ${n}: ${file}` : `Scelta ${n}`),
  },
  errori: {
    parametriNonValidi: (dettaglio: string): string => `Richiesta non valida: ${dettaglio}`,
    /** Il motivo per cui una richiesta della finestra non è valida, senza nomi di campi né parole inglesi. */
    validazione: {
      testoTroppoLungo: (n: number): string => `il testo è troppo lungo (massimo ${n.toLocaleString('it-IT')} caratteri).`,
      testoMancante: 'manca il testo.',
      testoTroppoCorto: (n: number): string => `il testo è troppo corto (almeno ${n} caratteri).`,
      troppiElementi: (n: number): string => `troppi elementi (massimo ${n}).`,
      pochiElementi: (n: number): string => `servono almeno ${n} elementi.`,
      numeroTroppoGrande: (n: number): string => `il numero è troppo grande (massimo ${n.toLocaleString('it-IT')}).`,
      numeroTroppoPiccolo: (n: number): string => `il numero è troppo piccolo (almeno ${n}).`,
      formato: 'un valore non è nel formato atteso.',
      scelta: 'un valore non è tra quelli ammessi.',
      generico: 'un valore non è valido.',
    },
    metodoSconosciuto: (nome: string): string => `Richiesta sconosciuta: ${nome}`,
    percorsoNonConsentito: 'Posso aprire solo file e cartelle dentro la cartella Spalla.',
    fileNonTrovato: (percorso: string): string => `Non trovo ${percorso}.`,
    fileTroppoGrande: (percorso: string): string => `${percorso} è troppo grande per essere mostrato qui: aprilo con il programma di sistema.`,
    linkNonConsentito: 'Posso aprire solo indirizzi web (http o https).',
    nucleoNonPronto: 'Spalla sta ancora partendo: riprova tra un momento.',
    occupato: 'Aspetta che l\'assistente finisca questo lavoro, poi riprova.',
    ruoloNonValido: (nome: string): string => `Il ruolo "${nome}" non esiste.`,
    telegramNonCollegato: 'Telegram non è collegato.',
    dueTocchiNonDisponibile: 'Il collegamento in due tocchi non è ancora disponibile: usa la procedura con BotFather qui sotto.',
    dueTocchiAnnullato: 'Collegamento annullato.',
    dueTocchiTempoScaduto: 'Telegram non ha risposto in tempo: riprova, oppure usa la procedura con BotFather.',
    voceNonDisponibile: 'La voce non è disponibile su questo computer.',
  },
  ricomincia: {
    /** Cartella in cui finiscono stato.json e RISPOSTE.json delle presentazioni precedenti. */
    cartellaArchivio: (dataIso: string): string => `onboarding/precedenti-${dataIso}`,
    nomeBackup: (nomeProdotto: string, dataIso: string): string => `${nomeProdotto}-backup-${dataIso}.zip`,
    nomeCartellaPrecedente: (nomeProdotto: string, dataIso: string): string => `${nomeProdotto}-precedente-${dataIso}`,
    fatto: {
      presentazioni: 'Presentazioni riaperte: il tuo assistente ti chiederà solo cosa è cambiato.',
      squadra: 'Squadra rimessa a zero: la scegliamo di nuovo insieme.',
      tutto: (backup: string): string => `Cartella nuova. La copia di prima è in ${backup}.`,
    },
  },
  stato: {
    /** Riepilogo per la voce "Stato" del menu dell'icona. */
    titolo: (nomeAssistente: string | undefined, nomeProdotto: string): string => (nomeAssistente ? `${nomeAssistente} (${nomeProdotto})` : nomeProdotto),
  },
} as const;
