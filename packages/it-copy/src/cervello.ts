/**
 * Schermate del cervello (docs/05 §2.1, schermata 4): le due modalità con pari peso, la chiave API passo per passo,
 * l'abbonamento con l'avviso di beta. Qui la parola "API" è inevitabile e viene spiegata.
 */
export const cervello = {
  titolo: 'Il cervello',
  sottotitolo: 'Spalla pensa con Claude, l\'intelligenza artificiale di Anthropic, usando il tuo account. Scegli come collegarlo.',
  scelta: {
    abbonamento: 'Ho un abbonamento Claude (Pro, Max, Team)',
    chiaveApi: 'Ho una chiave API Anthropic',
    nessuno: 'Non ho nessuno dei due: cosa mi conviene?',
  },
  confronto: {
    titolo: 'Cosa ti conviene',
    pro: 'Claude Pro: circa 20 € al mese, con limiti di uso (una finestra di 5 ore e un tetto settimanale, condivisi con le app Claude).',
    chiave: 'Chiave API: paghi Anthropic solo per quello che usi; Spalla tiene un contatore in euro e un tetto mensile che scegli tu.',
    max: 'Claude Max: da 100 $ al mese, con crediti mensili che coprono anche l\'uso con la chiave.',
    consiglio: 'Se usi Spalla ogni giorno con Telegram sempre acceso, la chiave API o Max sono la scelta più tranquilla.',
  },
  chiaveApi: {
    titolo: 'Collega una chiave API',
    cosE: 'Una chiave API è una lunga password che identifica il tuo account Anthropic "a consumo".',
    percheServe: [
      'Spalla pensa con Claude, l\'intelligenza artificiale di Anthropic.',
      'Paghi Anthropic direttamente solo per quello che usi.',
      'Noi non vediamo mai la tua chiave né le tue conversazioni.',
    ],
    apriPagina: 'Apri la pagina di Anthropic',
    passi: [
      'Registrati, o entra con il tuo account.',
      'Aggiungi un metodo di pagamento oppure ricarica 5-20 $.',
      'Vai su "API Keys".',
      'Premi "Create key", chiamala "Spalla" e copiala.',
    ],
    incolla: 'Incolla la chiave',
    segnaposto: 'sk-ant-…',
    formatoNonValido: 'Questa non sembra una chiave Anthropic: di solito inizia con "sk-ant-". Ricopiala dalla pagina.',
    verificaInCorso: 'Provo a collegarmi…',
    collegato: 'Collegato. Spalla può pensare.',
    nonCollegato: 'Non riesco a collegarmi con questa chiave. Controlla di averla copiata tutta e che il tuo account abbia credito.',
    senzaCredito: 'La chiave funziona ma non ha credito: apri la pagina Billing di Anthropic e ricarica. Ti aspetto qui.',
    tetto: {
      domanda: 'Quanto vuoi spendere al mese?',
      opzioni: [
        { valore: 10, etichetta: '10 €' },
        { valore: 25, etichetta: '25 €', nota: 'consigliato' },
        { valore: 50, etichetta: '50 €' },
        { valore: null, etichetta: 'Senza tetto' },
      ],
      nota: 'Il contatore è sul tuo computer. Quando ti avvicini al tetto te lo dico; raggiunto il tetto, i lavori di sfondo si fermano.',
    },
    qualita: {
      domanda: 'Qualità',
      opzioni: [
        { valore: 'equilibrato', etichetta: 'Equilibrato', nota: 'consigliato' },
        { valore: 'economico', etichetta: 'Economico', nota: 'più veloce, meno accurato' },
        { valore: 'massima', etichetta: 'Massima', nota: 'costa circa il doppio' },
      ],
    },
    notaMax: 'Hai Claude Max? Collega il tuo piano a un\'organizzazione nella Console di Anthropic: i crediti mensili coprono anche Spalla.',
    dovePrivacy: 'La chiave resta nel portachiavi del tuo computer. Non finisce mai nei nostri server né nei file di Spalla.',
  },
  abbonamento: {
    titolo: 'Collega il tuo Claude',
    avvisoBeta:
      'Questa modalità è in beta: funziona, ma dipende dalla politica di Anthropic e non ha garanzie. Puoi passare alla chiave API in un clic, senza perdere nulla.',
    continuo: 'Continuo',
    preferiscoChiave: 'Preferisco la chiave API',
    collega: 'Collega il tuo Claude',
    etichettaPannello: 'Questo è Claude Code di Anthropic. Scrivi /login e premi Invio: si aprirà il tuo browser.',
    attesaMotore: 'Sto scaricando il motore: il pannello si apre appena è pronto.',
    verificaInCorso: 'Controllo il collegamento…',
    collegato: 'Collegato.',
    nonCollegato: 'Il collegamento non è riuscito. Riprova con /login nel pannello, oppure passa alla chiave API.',
    nonConsentito: 'Anthropic non consente questa modalità per Spalla: usa la chiave API. Il resto non cambia.',
    limiti: 'Con l\'abbonamento valgono i limiti del tuo piano: quando li raggiungi, Spalla ti dice a che ora riparte.',
  },
  motore: {
    scarico: (mb: number): string => `Sto scaricando il motore (${mb} MB)…`,
    stima: (secondi: number): string => `circa ${secondi} secondi`,
    pronto: 'Motore pronto.',
    fallito: 'Non riesco a scaricare il motore. Controlla la connessione e riprova.',
  },
  /** Esito della prova di collegamento (AuthProvider.verifica), valido per entrambe le modalità. */
  verifica: {
    collegato: 'Collegato. Spalla può pensare.',
    chiaveMancante: 'Nessuna chiave API salvata: incollala nella schermata di collegamento.',
    chiaveFormato: 'La chiave non ha il formato atteso (inizia con sk-ant-): controlla di averla copiata tutta.',
    chiaveRifiutata: 'Anthropic non riconosce questa chiave: controllala o creane una nuova.',
    loginMancante: 'Il tuo Claude non è collegato: premi «Collega il tuo Claude» e completa l\'accesso.',
    limite: 'Il tuo Claude è in pausa per il limite di utilizzo: riprova più tardi.',
    rete: 'Non riesco a raggiungere Anthropic: controlla la connessione a internet.',
    tempoScaduto: 'La prova di collegamento non ha risposto in tempo: riprova.',
    generico: (dettaglio: string): string => `La prova di collegamento non è riuscita${dettaglio ? ` (${dettaglio})` : ''}.`,
  },
} as const;
