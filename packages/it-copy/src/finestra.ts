/** Motori di riconoscimento della voce (id tecnici del Nucleo) → come li vede l'utente. Un id sconosciuto non si mostra. */
export const NOMI_MOTORI_VOCE: Readonly<Record<string, string>> = {
  'sherpa-parakeet': 'riconoscimento veloce sul computer',
  'sherpa-whisper': 'riconoscimento accurato sul computer',
};

/**
 * Frasi della finestra desktop (renderer React): navigazione, chat, squadra, memoria, Telegram, impostazioni,
 * "Come mi sono presentato". Le schermate di S0 e del cervello stanno in `onboarding.s0` e `cervello`.
 * Niente gergo verso l'utente: mai "agente", "prompt", "token", "MCP"; "API" solo in "chiave API".
 */
export const finestra = {
  navigazione: {
    etichetta: 'Sezioni',
    chat: 'Chat',
    squadra: 'Squadra',
    memoria: 'Memoria',
    telegram: 'Telegram',
    impostazioni: 'Impostazioni',
    presentazioni: 'Come mi sono presentato',
  },
  generale: {
    caricamento: 'Un momento…',
    errore: 'Qualcosa è andato storto. Riprova tra poco.',
    nonDisponibile: 'Questa funzione non è ancora disponibile in questa finestra.',
    chiudiAvviso: 'Chiudi l\'avviso',
    senzaCollegamento: 'La finestra non è collegata al resto dell\'app: riavvia Spalla.',
  },
  s0: {
    passo: (n: number, totale: number): string => `Passo ${n} di ${totale}`,
    cervello: {
      scelto: (modalita: 'chiave_api' | 'abbonamento'): string =>
        modalita === 'chiave_api' ? 'Collegamento con la chiave API.' : 'Collegamento con il tuo abbonamento Claude.',
      collega: 'Collega',
      hoFinitoVerifica: 'Ho finito, verifica',
      pannelloInAvvio: 'Apro il pannello…',
      pannelloChiuso: 'Il pannello si è chiuso.',
      tornaAllaScelta: 'Torna alla scelta',
      /** Solo sviluppo (SPALLA_CONFIG_EREDITATA=1): salta il pannello, il login della macchina è già pronto. */
      giaCollegatoSviluppo: 'Sono già collegato',
    },
    motore: { continua: 'Inizia a parlare con il tuo assistente' },
  },
  /** Pannello di collegamento (terminale nella finestra). */
  terminale: {
    copiaLink: 'Copia il link di accesso',
    apriLink: 'Apri il link nel browser',
    linkCopiato: 'Link copiato: incollalo nel browser.',
    suggerimentoCopia: 'Per copiare dal pannello: seleziona il testo e premi Ctrl+Maiusc+C (Cmd+C sul Mac).',
  },
  chat: {
    assistenteSenzaNome: 'Il tuo assistente',
    tu: 'Tu',
    segnaposto: 'Scrivi qui. Invio per inviare, Maiusc+Invio per andare a capo.',
    /** Segnaposto della casella mentre una domanda aspetta risposta: il testo scritto risponde a quella domanda. */
    segnapostoDomanda: 'Scrivi qui la tua risposta, oppure tocca una scelta qui sopra.',
    invia: 'Invia',
    interrompi: 'Fermati',
    nuovoArgomento: 'Nuovo argomento',
    nuovoArgomentoNota: 'Chiude l\'argomento: il prossimo messaggio riparte da zero, con la memoria riletta dai file. Puoi anche scrivere /nuova.',
    etichettaCasella: 'Il tuo messaggio',
    vuota: (nome: string): string => `Scrivi qui sotto: ${nome} ti risponde. Puoi trascinare dei file nella finestra.`,
    argomentoChiuso: 'Argomento chiuso: il prossimo messaggio parte da zero, con la memoria riletta dai file.',
    staScrivendo: 'Sta scrivendo…',
    inCorso: 'Ci lavoro…',
    presentazioniInCorso: 'Presentazioni in corso: la prima parola è del tuo assistente.',
    presentazioniConcluse: 'Presentazioni concluse.',
    presentazioniProblemi: (n: number): string =>
      n === 1 ? 'Ho trovato una cosa da sistemare nei file:' : `Ho trovato ${n} cose da sistemare nei file:`,
    /** Riga sotto la risposta. La spesa (in euro) c'è solo con la chiave API: con l'abbonamento non si paga a risposta. */
    fine: (durataSec: number, costoEur?: number): string => {
      const parti = [`${durataSec.toFixed(1).replace('.', ',')} s`];
      if (costoEur !== undefined) parti.push(costoEur < 0.01 ? 'meno di 0,01 €' : `circa ${costoEur.toFixed(2).replace('.', ',')} €`);
      return parti.join(' · ');
    },
    domanda: {
      confermaScelte: 'Conferma le scelte',
      rispostaData: (risposte: readonly string[]): string => `Hai risposto: ${risposte.join(', ')}`,
      inAttesa: 'Aspetto la tua risposta qui sotto.',
      /** Sotto le chip: si risponde anche con parole proprie, nella casella in fondo (una sola casella in tutta la chat). */
      suggerimento: 'Oppure scrivi la tua risposta nella casella qui sotto.',
      massimo: (n: number): string => `Puoi sceglierne al massimo ${n}.`,
      chiusa: 'Questa domanda non aspetta più una risposta.',
    },
    permesso: {
      consentito: 'Hai consentito.',
      negato: 'Hai detto di no.',
      ritirato: 'La richiesta non serve più.',
      /** Motivo passato all'assistente quando l'utente preme [Nega] nella finestra. */
      motivoNegato: 'L\'utente ha detto di no dalla finestra.',
    },
    allegati: {
      trascina: 'Lascia qui i file da allegare',
      aggiunti: (n: number): string => (n === 1 ? '1 file allegato' : `${n} file allegati`),
      rimuovi: 'Togli l\'allegato',
      nonDisponibile:
        'Gli allegati trascinati nella finestra arrivano nella prossima versione: per ora salva il file nella cartella Spalla, in lavoro/in-arrivo, e dimmelo.',
    },
    messaggi: 'Conversazione',
  },
  squadra: {
    titolo: 'La squadra',
    sottotitolo: 'I ruoli che il tuo assistente può chiamare in aiuto. Accendi quelli che ti servono: gli altri restano a disposizione.',
    acceso: 'Acceso',
    spento: 'Spento',
    interruttore: (etichetta: string): string => `Accendi o spegni ${etichetta}`,
    puoDaSola: 'Può fare da sola:',
    chiedeSempre: 'Chiede sempre prima di:',
    vuoto: 'Nessun ruolo ancora: la squadra nasce durante le presentazioni.',
  },
  memoria: {
    titolo: 'Memoria',
    sottotitolo: 'Quello che il tuo assistente ricorda vive in questi file. Puoi leggerli qui e correggerli con lui.',
    elenco: 'File della memoria',
    gruppi: { profilo: 'Profilo', memoria: 'Memoria', temi: 'Schede', diario: 'Diario', altro: 'Altro' },
    cerca: 'Cerca nella memoria',
    cercaSegnaposto: 'Un nome, un cliente, un argomento…',
    cercaPulsante: 'Cerca',
    visore: 'Lettura del file',
    risultati: (n: number): string => (n === 0 ? 'Nessun ricordo trovato.' : n === 1 ? '1 ricordo trovato' : `${n} ricordi trovati`),
    chiudiRicerca: 'Chiudi la ricerca',
    ricostruisci: 'Rimetti in ordine la ricerca',
    ricostruito: 'Ricerca nella memoria rimessa in ordine.',
    cosaSai: 'Cosa sai di me?',
    chiediCorrezione: (nome: string): string => `Chiedi a ${nome} di correggere`,
    testoCorrezione: (file: string): string => `Vorrei correggere qualcosa in ${file}: `,
    contatori: {
      etichetta: 'Quanto è piena la memoria',
      memoria: (righe: number, tetto: number): string => `memoria: ${righe}/${tetto} righe`,
      profilo: (caratteri: number, tetto: number): string => `profilo: ${caratteri}/${tetto} caratteri`,
      schede: (n: number): string => (n === 1 ? '1 scheda' : `${n} schede`),
      diari: (n: number): string => (n === 1 ? '1 giorno di diario' : `${n} giorni di diario`),
    },
    scegliFile: 'Scegli un file a sinistra per leggerlo.',
    apriNelSistema: 'Apri con il programma di sistema',
    modificato: (data: string): string => `Ultima modifica: ${data}`,
    vuoto: 'La memoria è ancora vuota: si riempie lavorando insieme.',
  },
  telegram: {
    titolo: 'Telegram',
    sottotitolo: 'Il tuo assistente in tasca: scrivi o manda una nota vocale, ti risponde quando il computer è acceso.',
    stato: {
      collegato: (username: string): string => `Collegato come @${username}`,
      collegatoSenzaNome: 'Collegato',
      nonCollegato: 'Non collegato',
      soloTe: 'Risponde solo a te.',
      aspettaCiao: 'Aspetta che tu gli scriva "ciao" dal telefono: ti manderà un codice da confermare qui.',
    },
    dueTocchi: 'Collega in due tocchi',
    dueTocchiAttesa: 'Aspetto la conferma da Telegram: completa i due tocchi sul telefono.',
    collega: 'Collega',
    dueTocchiNota: 'Si apre Telegram sul telefono o sul computer: due tocchi e il bot è pronto.',
    oppure: 'Oppure, con BotFather',
    comando: 'Comando da scrivere',
    nomeSuggerito: 'Nome suggerito',
    usernameSuggerito: 'Username suggerito',
    copia: (cosa: string): string => `Copia ${cosa}`,
    pairing: {
      titolo: 'Qualcuno ha scritto al bot',
      testo: (nome: string): string => `${nome} ha scritto al bot e ha ricevuto un codice. Se sei tu, scrivi qui il codice che vedi su Telegram.`,
      etichettaCodice: 'Codice ricevuto su Telegram',
      codiceVuoto: 'Scrivi il codice che il bot ti ha mandato su Telegram.',
      scade: (ora: string): string => `Il codice vale fino alle ${ora}.`,
      conferma: 'Sì, sono io',
      ignora: 'No, non sono io',
    },
    scollega: 'Scollega',
    scollegaConferma: 'Scollegare Telegram? Il bot smette di rispondere; potrai ricollegarlo quando vuoi.',
    scollegato: 'Telegram scollegato.',
  },
  impostazioni: {
    titolo: 'Impostazioni',
    salva: 'Salva',
    salvato: 'Impostazioni salvate.',
    cervello: {
      titolo: 'Il cervello',
      modalita: 'Collegamento',
      chiaveApi: 'Con la chiave API Anthropic',
      abbonamento: 'Abbonamento Claude',
      beta: 'in beta',
      collegato: 'Collegato',
      nonCollegato: 'Non collegato',
      livello: 'Qualità',
      tetto: 'Tetto mensile',
      spesa: (eur: number, tetto: number | null): string =>
        tetto === null
          ? `Questo mese: ${eur.toFixed(2).replace('.', ',')} €, senza tetto.`
          : `Questo mese: ${eur.toFixed(2).replace('.', ',')} € su ${tetto} €.`,
      sopraTetto: 'Tetto raggiunto: i lavori di sfondo sono fermi.',
      cambiaModalita: 'Cambia collegamento',
      rimuoviChiave: 'Rimuovi la chiave',
      verifica: 'Prova il collegamento',
      verificaInCorso: 'Controllo il collegamento…',
    },
    orari: {
      titolo: 'Orari di silenzio',
      nota: 'Negli orari di silenzio niente notifiche né messaggi su Telegram: li trovi al risveglio.',
      da: 'Dalle',
      a: 'Alle',
      domenica: 'La domenica',
      silenzio: 'Silenzio tutto il giorno',
      normale: 'Come gli altri giorni',
    },
    brief: {
      titolo: 'Il buongiorno del mattino',
      nota: 'Tre cose da fare, le scadenze della settimana, chi aspetta una risposta.',
      attivo: 'Ricevi il buongiorno',
      ora: 'All\'ora',
      canale: 'Dove',
      desktop: 'Sul computer',
      telegram: 'Su Telegram',
    },
    riordino: {
      titolo: 'Riordino notturno',
      nota: 'Di notte l\'Archivista mette in ordine la memoria: schede, diario, cose vecchie in archivio.',
      attivo: 'Riordina la memoria di notte',
      ora: 'All\'ora',
    },
    voce: {
      titolo: 'Voce',
      desktop: 'Al computer',
      spento: 'Spenta',
      pushToTalk: 'Tieni premuto per parlare',
      telegramVocali: 'Risposte vocali su Telegram',
      scarica: 'Scarica il modello per la voce',
      inDownload: 'Scarico il modello…',
      pronta: (motore?: string): string => {
        const nome = motore ? NOMI_MOTORI_VOCE[motore] : undefined;
        return nome ? `Voce pronta (${nome}).` : 'Voce pronta.';
      },
      nonPronta: 'Il modello per capire la voce non è ancora scaricato.',
    },
    avvio: { titolo: 'Avvio', automatico: 'Avvia Spalla all\'accensione del computer' },
    dati: {
      titolo: 'I tuoi dati',
      cartella: 'Cartella di lavoro',
      apriCartella: 'Apri la cartella',
      esporta: 'Esporta tutto',
      esportato: (percorso: string): string => `Esportato in ${percorso}.`,
      esportaAnnullato: 'Esportazione annullata.',
    },
    versione: (versione: string): string => `Spalla, versione ${versione}`,
  },
  presentazioni: {
    domanda: 'Domanda',
    risposta: 'Risposta',
    ricomincia: 'Ricomincia',
    scegliAmpiezza: 'Scegli cosa rifare',
    confermaCancella: 'Scrivi "cancella" per confermare',
    parolaCancella: 'cancella',
    avvia: 'Ricomincia adesso',
    avviato: 'Va bene: ricominciamo dalla chat.',
  },
} as const;
