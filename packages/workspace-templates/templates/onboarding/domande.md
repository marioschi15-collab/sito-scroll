# Banca domande dell'onboarding
_Ogni domanda ha un **id**, il **testo** come viene posto, il **tipo** (chip = una scelta; chip multiple = più scelte; testo = risposta libera; testo + chip = risposta libera con chip di aiuto), le **chip**, il **ramo** (per chi) e **scrive in** (la destinazione della risposta). L'assistente può riformulare il testo, mai cambiare la destinazione. Se l'utente risponde a tre domande in una, si saltano gli id già coperti. Le chip accettano da 2 a 4 opzioni per riquadro: oltre, si dividono in più riquadri (scelta multipla) o le prime quattro vanno nei pulsanti e le altre nel testo (scelta singola). La versione ordinata, letta dal software, è il blocco `yaml` in fondo: le due parti dicono la stessa cosa._

## 1. Comuni, prima del primo colpo (massimo 7)

| id | Domanda | Tipo | Chip | Scrive in |
|---|---|---|---|---|
| Q1 | Come vuoi che ti chiami? E ci diamo del tu? | testo + chip | [Del tu] [Del lei] | IDENTITA: utente, tu/lei |
| Q2 | E io come mi chiamo? Scegli tu: è il tuo assistente. | testo + chip | [Suggeriscimi 3 nomi] | IDENTITA: nome; ANIMA riga 1 |
| Q3 | Che tono preferisci quando ti scrivo e quando scrivo per te? | chip | [Diretto e pratico] [Caldo e informale] [Formale] [Un po' di ironia] | ANIMA: tono; UTENTE: direttiva tono; IDENTITA: emoji (dedotto "mai" se Diretto/Formale, chiesto altrimenti) |
| Q4 | Cosa fai per vivere? | chip | [Freelance / consulente] [Venditore / agente di commercio o immobiliare] [Titolare di piccola impresa o negozio] [Artigiano / professionista a progetto] [Altro: scrivilo] | **ramo**; UTENTE: lavoro |
| Q4a | *(di ramo, una riga)* Cosa vendi o offri, e a chi? | testo | — | UTENTE: lavoro |
| Q5 | Quali di queste cose ti rubano più tempo? Scegline fino a tre, o dimmelo con parole tue. | chip multiple (lista di ramo, §3) | — | UTENTE: priorità; SQUADRA (ruoli accesi); scelta dei tre primi colpi |
| Q6 | Che strumenti usi ogni giorno? | chip multiple | [WhatsApp] [Gmail] [Outlook] [Google Calendar] [Excel / Fogli] [Fatture in Cloud] [Aruba] [Instagram] [Facebook] [LinkedIn] [Un gestionale / CRM: quale?] [Altro] | UTENTE: strumenti; skill attivate; cartelle o programmi "da collegare" |

Dalla Q3 compare **[Vai con i consigliati]** (nel testo della bolla, perché le quattro chip del tono occupano i posti), che l'app tiene poi come pulsante fisso accanto alla casella fino a Q6 compresa. Se scelto, l'assistente compila le domande rimanenti con i predefiniti del ramo e li dice ad alta voce.

## 2. Comuni, dopo il primo colpo

| id | Domanda | Tipo | Chip | Scrive in |
|---|---|---|---|---|
| S4 | Basta domande. Facciamo una cosa vera, scegli: 1) … 2) … 3) … *(i tre primi colpi del ramo, §4)* | chip | [1] [2] [3] | lavoro/; MEMORIA prime righe; agenda prime voci; temi/ prime schede; RISPOSTE: S4 |
| Q7 | Ti va bene così o cambio qualcosa? *(sul primo risultato)* | chip | [Perfetto] [Più corto] [Più formale] [Riscrivi] | UTENTE: direttiva di feedback, oppure MEMORY.md del copywriter |
| Q8 | Ecco la squadra che accendo. Vuoi cambiare qualcosa? | chip | [Va bene così] [Spegni uno] [Aggiungi uno] | SQUADRA.md; spostamenti tra agents/ e agents-spenti/ |
| Q9 | Regole della casa: *(frase per frase, vedi PRIMO-AVVIO.md)* d'accordo? | chip | [D'accordo] [Voglio più libertà] [Voglio più controllo] | ANIMA: confini; .claude/rules/confini.md |
| Q10 | Quando NON devo disturbarti? | chip | [Sera dopo le 20] [Dopo le 21] [Weekend] [Domenica] [Mai, scrivi quando serve] | UTENTE: orari; impostazioni (orari di silenzio) |
| Q10b | E vuoi un buongiorno la mattina con le cose da fare? | chip | [Sì alle 8] [Sì alle 8:30] [Orario mio] [No] | UTENTE: orari; impostazioni (buongiorno) |
| Q11 | Vuoi scrivermi e mandarmi vocali da Telegram, anche dalla macchina? Sono due tocchi. | chip | [Sì, collega Telegram] [Dopo] | avvia il collegamento Telegram (S7) |
| Q12 | Vuoi parlarmi a voce anche al computer? Scarico un modello di ~700 MB, una volta sola. | chip | [Sì] [Solo testo per ora] | impostazioni (voce); download rinviato. *Nel prototipo si salta.* |
| Q13 | C'è un argomento di cui non devo tenere memoria? | testo + chip | [No] | CLAUDE.md blocco "Non memorizzare" |
| Q14 | Ecco cosa ho scritto di te, in breve: … Corretto? | chip | [Sì] [Correggi] | conferma; RISPOSTE.json |

## 3. Ramificazioni per mestiere

**Venditore / agente** (di commercio, immobiliare, assicurativo, rappresentante)

| id | Domanda | Chip | Scrive in |
|---|---|---|---|
| Q4a | Cosa vendi e a chi, in una riga? | testo | UTENTE: lavoro |
| Q4b *(dopo il primo colpo, o dedotta)* | Quanti clienti o contatti attivi hai, più o meno? | [<20] [20-100] [>100] | peso di analista e cercatore |
| Q4c *(solo se emergono fatture o provvigioni)* | Lavori per una o più aziende? Chi fa le fatture? | [Una] [Più di una] / [Io] [Il commercialista] | contabile acceso o spento; skill "provvigioni" |
| Q5 chip | [Rispondere ai contatti/lead] [Follow-up dopo visite o incontri] [Preventivi] [Trovare nuovi clienti] [Documenti da raccogliere] [Riconciliare provvigioni] [Scadenze fiscali] [Agenda e spostamenti] | — |

**Freelance / consulente** (consulenti, fotografi, grafici, formatori, avvocati, commercialisti)

| id | Domanda | Chip | Scrive in |
|---|---|---|---|
| Q4a | Che servizio offri e a che tipo di cliente? | testo | UTENTE: lavoro |
| Q4b | Lavori a progetto, a ore o in abbonamento? | [A progetto] [A ore] [In abbonamento] [Dipende] | preventivista e contabile |
| Q4c *(solo se fatture tra i ladri di tempo)* | Regime fiscale? | [Forfettario] [Ordinario] [Non lo so, lo sa il commercialista] | contabile (vocabolario "chiedi al commercialista") |
| Q5 chip | [Preventivi e trattative] [Fatture e pagamenti in ritardo] [Rispondere alle richieste] [Trovare clienti] [Scrivere contenuti e post] [Organizzare le consegne] [Email] | — |

**Titolare di piccola impresa o negozio**

| id | Domanda | Chip | Scrive in |
|---|---|---|---|
| Q4a | Che attività è e quante persone ci lavorano? | testo + [Solo io] [2-5] [6-15] | UTENTE: lavoro; nota "un confine di fiducia per installazione, secondo utente dopo" |
| Q4b | Hai clienti abituali o di passaggio? | [Abituali] [Di passaggio] [Entrambi] | segretaria (rubrica) |
| Q4c | Fai preventivi scritti? | [Sì, tanti] [Qualche volta] [No] | preventivista |
| Q5 chip | [Preventivi] [Fornitori e ordini] [Turni e personale] [Social e promozioni] [Fatture e scadenze] [Rispondere ai clienti] [Recensioni online] | — |

**Artigiano / professionista a progetto**: come il freelance (preventivista, copywriter, contabile) con il preventivista per primo; vocabolario "sopralluoghi", "cantiere".

| id | Domanda | Chip | Scrive in |
|---|---|---|---|
| Q4a | Che lavori fai e per chi: privati, imprese, condomini? | testo | UTENTE: lavoro |
| Q4b | Lavori a preventivo chiuso o a ore e a misura? | [A preventivo] [A ore o a misura] [Dipende] | preventivista |
| Q4c *(solo se fatture tra i ladri di tempo)* | Regime fiscale? | [Forfettario] [Ordinario] [Non lo so, lo sa il commercialista] | contabile |
| Q5 chip | [Preventivi e sopralluoghi] [Fatture e pagamenti in ritardo] [Rispondere alle richieste] [Fornitori e materiali] [Organizzare cantieri e consegne] [Trovare clienti] [Documenti e certificazioni] | — |

**Dipendente** (caso limite): squadra ridotta (segretaria, copywriter), contabile nascosto, nessuna domanda fiscale.

| id | Domanda | Chip | Scrive in |
|---|---|---|---|
| Q4a | Che lavoro fai e in che tipo di azienda? | testo | UTENTE: lavoro |
| Q5 chip | [Email e messaggi] [Riunioni e appuntamenti] [Scrivere documenti e riepiloghi] [Scadenze e promemoria] [Organizzare la settimana] | — |

**Altro (testo libero)**: l'assistente classifica nel ramo più vicino e **lo dice** ("Ti tratto come un consulente: correggimi se sbaglio" [Giusto] [No, sono più un venditore]); se non riesce, usa il ramo `comune` con la lista generica di Q5: [Rispondere a clienti e richieste] [Preventivi] [Fatture e pagamenti] [Trovare clienti] [Scrivere contenuti e post] [Agenda e scadenze] [Documenti da raccogliere] [Email].

## 4. I tre primi colpi, per ramo

| Ramo | 1 | 2 | 3 |
|---|---|---|---|
| Venditore / agente | Tre follow-up per contatti che non senti da giorni (servono 3 nomi) | Un modello di messaggio di risposta ai contatti nuovi, nel tuo tono | Le scadenze delle prossime quattro settimane messe in fila (le dici tu) |
| Freelance / consulente | Un preventivo da una descrizione a voce o scritta | Un sollecito gentile per una fattura scaduta | Tre post dal tuo ultimo lavoro |
| Titolare | La risposta a una recensione o a un messaggio difficile | Un preventivo dal listino | Le scadenze del mese messe in fila |
| Artigiano | Un preventivo da una descrizione (o da un sopralluogo appena fatto) | Un sollecito gentile per una fattura scaduta | Cantieri e consegne delle prossime settimane messi in fila |
| Dipendente | Una email difficile riscritta | La settimana messa in fila | Il riepilogo di un documento o degli appunti di una riunione |
| Comune (ramo non chiaro) | Un messaggio difficile riscritto | Un preventivo o una proposta da una descrizione | Le scadenze delle prossime settimane messe in fila |

"Non so cosa farti fare" → il colpo 3 (scadenze o settimana in fila), che non richiede nomi.

## 5. Squadre predefinite per ramo (regola dei tre: al massimo tre accesi; critico e riordino notturno sempre presenti)

| Ramo | Accesi all'inizio | Candidati (solo se un posto è libero) | Disponibili ma spenti |
|---|---|---|---|
| Venditore / agente | segretaria, copywriter, cercatore-clienti | contabile se forfettario o provvigioni tra i ladri di tempo (non se "fa tutto il commercialista"); analista se >20 contatti o >1 mandante | preventivista (+ i candidati non accesi, con la frase per accenderli) |
| Freelance / consulente | copywriter, preventivista, contabile | cercatore-clienti se "Trovare clienti" tra i ladri di tempo | segretaria, analista |
| Titolare | segretaria, contabile, copywriter | preventivista se "Sì, tanti" alla Q4c | analista, cercatore-clienti |
| Artigiano | preventivista, copywriter, contabile | — | segretaria, cercatore-clienti, analista |
| Dipendente | segretaria, copywriter | — | cercatore-clienti, analista, preventivista; contabile nascosto |
| Comune | segretaria, copywriter | — | tutti gli altri |

Il **critico** non occupa un posto: è uno strumento del coordinatore, sempre acceso. L'**archivista** (riordino notturno) è sempre acceso ma non è un ruolo che l'utente chiama.

---

```yaml
versione: 1
# tipi: chip (una scelta) | chip_multiple (più scelte) | testo (risposta libera) | testo_chip (testo libero con chip di aiuto)
# rami: comune | venditore | freelance | titolare | artigiano | dipendente
# fasi: S1 presentazioni | S2 lavoro | S3 giornata | S4 primo colpo | S5 squadra | S6 regole della casa | S7 telegram e voce | S8 chiusura
domande:
  - id: Q1
    fase: S1
    ramo: comune
    tipo: testo_chip
    intestazione: "Nome"
    testo: "Come vuoi che ti chiami? E ci diamo del tu?"
    chip: ["Del tu", "Del lei"]
    scrive_in: ["profilo/IDENTITA.md#utente", "profilo/IDENTITA.md#tu_lei"]
    nota: "Se l'utente scrive in modo formale, proponi [Del lei] per primo."
  - id: Q2
    fase: S1
    ramo: comune
    tipo: testo_chip
    intestazione: "Il mio nome"
    testo: "E io come mi chiamo? Scegli tu: è il tuo assistente."
    chip: ["Suggeriscimi 3 nomi"]
    scrive_in: ["profilo/IDENTITA.md#nome", "profilo/ANIMA.md#riga1"]
    nota: "Mai scegliere il nome da solo. Se chiede suggerimenti: tre nomi italiani corti, poi sceglie l'utente. Marchi famosi (Jarvis, Alexa, Siri): soprannome privato, spiegazione, alternativa vicina."
  - id: Q3
    fase: S1
    ramo: comune
    tipo: chip
    intestazione: "Tono"
    testo: "Che tono preferisci quando ti scrivo e quando scrivo per te?"
    chip: ["Diretto e pratico", "Caldo e informale", "Formale", "Un po' di ironia"]
    scrive_in: ["profilo/ANIMA.md#tono", "profilo/UTENTE.md#tono", "profilo/IDENTITA.md#emoji"]
    nota: "Da qui «Vai con i consigliati»: nel testo della bolla e come pulsante fisso dell'app fino a Q6. Emoji: «mai» se Diretto o Formale; altrimenti chiedi nella stessa bolla."
  - id: Q4
    fase: S2
    ramo: comune
    tipo: chip
    intestazione: "Lavoro"
    testo: "Cosa fai per vivere?"
    chip: ["Freelance / consulente", "Venditore / agente di commercio o immobiliare", "Titolare di piccola impresa o negozio", "Artigiano / professionista a progetto", "Altro: scrivilo"]
    scrive_in: ["ramo", "profilo/UTENTE.md#lavoro"]
    nota: "Le prime quattro nei pulsanti, «Altro» nel testo. Con «Altro» classifica nel ramo più vicino e dillo: «Ti tratto come un consulente: correggimi se sbaglio» [Giusto] [No, sono più un venditore]. Dipendente → ramo dipendente."
  - id: Q4a
    fase: S2
    ramo: comune
    tipo: testo
    intestazione: "Cosa fai"
    testo: "Cosa vendi o offri, e a chi? In una riga."
    chip: []
    scrive_in: ["profilo/UTENTE.md#lavoro"]
    nota: "Versione generica: ogni ramo ha la sua Q4a qui sotto."
  - id: Q5
    fase: S3
    ramo: comune
    tipo: chip_multiple
    intestazione: "Ruba tempo"
    testo: "Quali di queste cose ti rubano più tempo? Scegline fino a tre, o dimmelo con parole tue."
    chip: ["Rispondere a clienti e richieste", "Preventivi", "Fatture e pagamenti", "Trovare clienti", "Scrivere contenuti e post", "Agenda e scadenze", "Documenti da raccogliere", "Email"]
    scrive_in: ["profilo/UTENTE.md#priorita", "profilo/SQUADRA.md", "primi_colpi"]
    nota: "Lista generica (ramo comune o «Altro»); ogni ramo ha la sua Q5 qui sotto. Due riquadri a scelta multipla da 4."
  - id: Q6
    fase: S3
    ramo: comune
    tipo: chip_multiple
    intestazione: "Strumenti"
    testo: "Che strumenti usi ogni giorno?"
    chip: ["WhatsApp", "Gmail", "Outlook", "Google Calendar", "Excel / Fogli", "Fatture in Cloud", "Aruba", "Instagram", "Facebook", "LinkedIn", "Un gestionale / CRM: quale?", "Altro"]
    scrive_in: ["profilo/UTENTE.md#strumenti", "skill", "profilo/UTENTE.md#da_collegare"]
    nota: "Tre riquadri a scelta multipla: «Messaggi e posta» (WhatsApp, Gmail, Outlook, Google Calendar), «Lavoro» (Excel / Fogli, Fatture in Cloud, Aruba, Un gestionale / CRM), «Social» (Instagram, Facebook, LinkedIn, Altro). Nessun collegamento durante le presentazioni."
  - id: S4
    fase: S4
    ramo: comune
    tipo: chip
    intestazione: "Primo colpo"
    testo: "Basta domande. Facciamo una cosa vera, scegli: 1) …; 2) …; 3) …"
    chip: ["1", "2", "3"]
    scrive_in: ["lavoro/", "memoria/MEMORIA.md", "memoria/agenda.md", "memoria/temi/", "onboarding/RISPOSTE.json#S4"]
    nota: "I tre colpi sono in primi_colpi per ramo, detti con le parole dell'utente. Indeciso → colpo 3. Le domande operative dentro il colpo non contano nel tetto delle sette."
  - id: Q7
    fase: S4
    ramo: comune
    tipo: chip
    intestazione: "Va bene?"
    testo: "Ti va bene così o cambio qualcosa?"
    chip: ["Perfetto", "Più corto", "Più formale", "Riscrivi"]
    scrive_in: ["profilo/UTENTE.md#feedback", ".claude/agent-memory/copywriter/MEMORY.md"]
    nota: "Regola stabile (es. «lei al primo contatto») → UTENTE.md; solo stile dei testi → memoria del copywriter."
  - id: Q8
    fase: S5
    ramo: comune
    tipo: chip
    intestazione: "Squadra"
    testo: "Ecco la squadra che accendo. Vuoi cambiare qualcosa?"
    chip: ["Va bene così", "Spegni uno", "Aggiungi uno"]
    scrive_in: ["profilo/SQUADRA.md", ".claude/agents/", ".claude/agents-spenti/"]
    nota: "Prima del chip: un ruolo per riga, in grassetto, con cosa fa, nel vocabolario dell'utente; poi gli spenti con il motivo; poi il critico."
  - id: Q9
    fase: S6
    ramo: comune
    tipo: chip
    intestazione: "Regole"
    testo: "Regole della casa, dimmi se sei d'accordo: leggo e scrivo solo nella cartella {{NOME_PRODOTTO}}; cerco sul web liberamente; non mando mai niente a nessuno e non cancello niente senza il tuo sì; se mi chiedi di aprire un'altra cartella o un programma, te lo chiedo prima ogni volta; prima di proporti un prezzo, un preventivo sopra 1.000 € o il primo messaggio a un cliente nuovo, passo dal Critico."
    chip: ["D'accordo", "Voglio più libertà", "Voglio più controllo"]
    scrive_in: ["profilo/ANIMA.md#confini", ".claude/rules/confini.md"]
    nota: "«Più libertà» → soglia del critico [Solo sopra 3.000 €] [Solo per clienti nuovi] [Mai, decido io]; «Più controllo» → critico su ogni testo e cifra, soglia 500 €, «vuoi che lo ricordi?» prima di salvare fatti su terzi. settings.json non si tocca."
  - id: Q10
    fase: S6
    ramo: comune
    tipo: chip
    intestazione: "Silenzio"
    testo: "Quando NON devo disturbarti?"
    chip: ["Sera dopo le 20", "Dopo le 21", "Weekend", "Domenica", "Mai, scrivi quando serve"]
    scrive_in: ["profilo/UTENTE.md#orari", "onboarding/stato.json#impostazioni.orari"]
    nota: "Le prime quattro nei pulsanti, «Mai» nel testo. Più scelte insieme sono normali («dopo le 21 e la domenica»). silenzio_a predefinito 08:00."
  - id: Q10b
    fase: S6
    ramo: comune
    tipo: chip
    intestazione: "Buongiorno"
    testo: "E vuoi un buongiorno la mattina con le cose da fare?"
    chip: ["Sì alle 8", "Sì alle 8:30", "Orario mio", "No"]
    scrive_in: ["profilo/UTENTE.md#orari", "onboarding/stato.json#impostazioni.brief"]
    nota: "Prototipo: salva l'orario con brief.attivo false e non promettere «domani alle 8»."
  - id: Q11
    fase: S7
    ramo: comune
    tipo: chip
    intestazione: "Telegram"
    testo: "Vuoi scrivermi e mandarmi vocali da Telegram, anche dalla macchina? Sono due tocchi."
    chip: ["Sì, collega Telegram", "Dopo"]
    scrive_in: ["onboarding/stato.json#impostazioni.telegram", "app:apri-telegram"]
    nota: "«Sì» → riga [[APRI:TELEGRAM]] da sola nella risposta; l'app apre il collegamento e conferma con un messaggio di sistema. Dire: rispondo solo a te, scrivi tu per primo, solo a computer acceso."
  - id: Q12
    fase: S7
    ramo: comune
    tipo: chip
    intestazione: "Voce"
    testo: "Vuoi parlarmi a voce anche al computer? Scarico un modello di circa 700 MB, una volta sola."
    chip: ["Sì", "Solo testo per ora"]
    scrive_in: ["onboarding/stato.json#impostazioni.voce"]
    nota: "Prototipo: SALTARE (la voce al computer è fuori perimetro). Nessun download durante le presentazioni."
  - id: Q13
    fase: S8
    ramo: comune
    tipo: testo_chip
    intestazione: "Da escludere"
    testo: "C'è un argomento di cui non devo tenere memoria?"
    chip: ["No"]
    scrive_in: ["CLAUDE.md#non_memorizzare"]
    nota: "Con le parole dell'utente; ripetere in una frase. Dati sanitari/legali di terzi: regola scritta anche se l'utente dice «no»."
  - id: Q14
    fase: S8
    ramo: comune
    tipo: chip
    intestazione: "Corretto?"
    testo: "Ecco cosa ho scritto di te, in breve: … Corretto?"
    chip: ["Sì", "Correggi"]
    scrive_in: ["onboarding/RISPOSTE.json"]
    nota: "Un solo paragrafo con le parole dell'utente. «Correggi» → chiedi cosa, correggi, rileggi solo la riga cambiata."

  # --- ramo venditore / agente ---
  - id: Q4a
    fase: S2
    ramo: venditore
    tipo: testo
    intestazione: "Cosa e a chi"
    testo: "Cosa vendi e a chi, in una riga?"
    chip: []
    scrive_in: ["profilo/UTENTE.md#lavoro"]
  - id: Q4b
    fase: S4
    ramo: venditore
    tipo: chip
    intestazione: "Contatti"
    testo: "Quanti clienti o contatti attivi hai, più o meno?"
    chip: ["<20", "20-100", ">100"]
    scrive_in: ["profilo/UTENTE.md#lavoro", "profilo/SQUADRA.md#candidati"]
    nota: "Dopo il primo colpo, o dedotta («una quarantina di contatti»). Pesa analista e cercatore."
  - id: Q4c
    fase: S4
    ramo: venditore
    tipo: chip
    intestazione: "Fatture"
    testo: "Lavori per una o più aziende? Chi fa le fatture?"
    chip: ["Una", "Più di una", "Io", "Il commercialista"]
    scrive_in: ["profilo/UTENTE.md#lavoro", "profilo/SQUADRA.md#candidati"]
    nota: "Solo se emergono fatture o provvigioni. Due riquadri nello stesso messaggio: aziende (Una / Più di una) e fatture (Io / Il commercialista). Contabile acceso o spento; skill provvigioni."
  - id: Q5
    fase: S3
    ramo: venditore
    tipo: chip_multiple
    intestazione: "Ruba tempo"
    testo: "Quali di queste cose ti rubano più tempo? Scegline fino a tre, o dimmelo con parole tue."
    chip: ["Rispondere ai contatti/lead", "Follow-up dopo visite o incontri", "Preventivi", "Trovare nuovi clienti", "Documenti da raccogliere", "Riconciliare provvigioni", "Scadenze fiscali", "Agenda e spostamenti"]
    scrive_in: ["profilo/UTENTE.md#priorita", "profilo/SQUADRA.md", "primi_colpi"]
    nota: "Due riquadri da 4."

  # --- ramo freelance / consulente ---
  - id: Q4a
    fase: S2
    ramo: freelance
    tipo: testo
    intestazione: "Servizio"
    testo: "Che servizio offri e a che tipo di cliente?"
    chip: []
    scrive_in: ["profilo/UTENTE.md#lavoro"]
  - id: Q4b
    fase: S2
    ramo: freelance
    tipo: chip
    intestazione: "Come lavori"
    testo: "Lavori a progetto, a ore o in abbonamento?"
    chip: ["A progetto", "A ore", "In abbonamento", "Dipende"]
    scrive_in: ["profilo/UTENTE.md#lavoro"]
    nota: "Pesa preventivista e contabile. Si può dedurre dalla Q4a."
  - id: Q4c
    fase: S4
    ramo: freelance
    tipo: chip
    intestazione: "Regime"
    testo: "Regime fiscale?"
    chip: ["Forfettario", "Ordinario", "Non lo so, lo sa il commercialista"]
    scrive_in: ["profilo/UTENTE.md#lavoro"]
    nota: "Solo se fatture tra i ladri di tempo. Vocabolario del contabile: «chiedi al commercialista»."
  - id: Q5
    fase: S3
    ramo: freelance
    tipo: chip_multiple
    intestazione: "Ruba tempo"
    testo: "Quali di queste cose ti rubano più tempo? Scegline fino a tre, o dimmelo con parole tue."
    chip: ["Preventivi e trattative", "Fatture e pagamenti in ritardo", "Rispondere alle richieste", "Trovare clienti", "Scrivere contenuti e post", "Organizzare le consegne", "Email"]
    scrive_in: ["profilo/UTENTE.md#priorita", "profilo/SQUADRA.md", "primi_colpi"]

  # --- ramo titolare di piccola impresa o negozio ---
  - id: Q4a
    fase: S2
    ramo: titolare
    tipo: testo_chip
    intestazione: "Attività"
    testo: "Che attività è e quante persone ci lavorano?"
    chip: ["Solo io", "2-5", "6-15"]
    scrive_in: ["profilo/UTENTE.md#lavoro"]
    nota: "Un confine di fiducia per installazione: il secondo utente si aggiunge dopo dalle impostazioni."
  - id: Q4b
    fase: S2
    ramo: titolare
    tipo: chip
    intestazione: "Clienti"
    testo: "Hai clienti abituali o di passaggio?"
    chip: ["Abituali", "Di passaggio", "Entrambi"]
    scrive_in: ["profilo/UTENTE.md#lavoro"]
    nota: "Pesa la segretaria (rubrica)."
  - id: Q4c
    fase: S2
    ramo: titolare
    tipo: chip
    intestazione: "Preventivi"
    testo: "Fai preventivi scritti?"
    chip: ["Sì, tanti", "Qualche volta", "No"]
    scrive_in: ["profilo/UTENTE.md#lavoro", "profilo/SQUADRA.md#candidati"]
    nota: "«Sì, tanti» → preventivista candidato."
  - id: Q5
    fase: S3
    ramo: titolare
    tipo: chip_multiple
    intestazione: "Ruba tempo"
    testo: "Quali di queste cose ti rubano più tempo? Scegline fino a tre, o dimmelo con parole tue."
    chip: ["Preventivi", "Fornitori e ordini", "Turni e personale", "Social e promozioni", "Fatture e scadenze", "Rispondere ai clienti", "Recensioni online"]
    scrive_in: ["profilo/UTENTE.md#priorita", "profilo/SQUADRA.md", "primi_colpi"]

  # --- ramo artigiano / professionista a progetto ---
  - id: Q4a
    fase: S2
    ramo: artigiano
    tipo: testo
    intestazione: "Lavori"
    testo: "Che lavori fai e per chi: privati, imprese, condomini?"
    chip: []
    scrive_in: ["profilo/UTENTE.md#lavoro"]
    nota: "Vocabolario: sopralluoghi, cantiere, consegne."
  - id: Q4b
    fase: S2
    ramo: artigiano
    tipo: chip
    intestazione: "Come lavori"
    testo: "Lavori a preventivo chiuso o a ore e a misura?"
    chip: ["A preventivo", "A ore o a misura", "Dipende"]
    scrive_in: ["profilo/UTENTE.md#lavoro"]
  - id: Q4c
    fase: S4
    ramo: artigiano
    tipo: chip
    intestazione: "Regime"
    testo: "Regime fiscale?"
    chip: ["Forfettario", "Ordinario", "Non lo so, lo sa il commercialista"]
    scrive_in: ["profilo/UTENTE.md#lavoro"]
    nota: "Solo se fatture tra i ladri di tempo."
  - id: Q5
    fase: S3
    ramo: artigiano
    tipo: chip_multiple
    intestazione: "Ruba tempo"
    testo: "Quali di queste cose ti rubano più tempo? Scegline fino a tre, o dimmelo con parole tue."
    chip: ["Preventivi e sopralluoghi", "Fatture e pagamenti in ritardo", "Rispondere alle richieste", "Fornitori e materiali", "Organizzare cantieri e consegne", "Trovare clienti", "Documenti e certificazioni"]
    scrive_in: ["profilo/UTENTE.md#priorita", "profilo/SQUADRA.md", "primi_colpi"]

  # --- ramo dipendente (caso limite) ---
  - id: Q4a
    fase: S2
    ramo: dipendente
    tipo: testo
    intestazione: "Lavoro"
    testo: "Che lavoro fai e in che tipo di azienda?"
    chip: []
    scrive_in: ["profilo/UTENTE.md#lavoro"]
    nota: "Nessuna domanda fiscale; contabile nascosto."
  - id: Q5
    fase: S3
    ramo: dipendente
    tipo: chip_multiple
    intestazione: "Ruba tempo"
    testo: "Quali di queste cose ti rubano più tempo? Scegline fino a tre, o dimmelo con parole tue."
    chip: ["Email e messaggi", "Riunioni e appuntamenti", "Scrivere documenti e riepiloghi", "Scadenze e promemoria", "Organizzare la settimana"]
    scrive_in: ["profilo/UTENTE.md#priorita", "profilo/SQUADRA.md", "primi_colpi"]

primi_colpi:
  venditore:
    - numero: 1
      titolo: "Tre follow-up per contatti che non senti da giorni"
      serve: "tre nomi, cosa è in sospeso con ciascuno, tu o lei"
      produce: "lavoro/messaggi/AAAA-MM-GG-follow-up-3-contatti.md"
      skill: follow-up-post-visita
    - numero: 2
      titolo: "Un modello di messaggio di risposta ai contatti nuovi, nel tuo tono"
      serve: "da quali portali o canali arrivano e cosa chiedono di solito"
      produce: "lavoro/messaggi/modello-risposta-contatti.md"
      skill: risposta-lead-portale
    - numero: 3
      titolo: "Le scadenze delle prossime quattro settimane messe in fila (le dici tu)"
      serve: "le scadenze a voce, una per una"
      produce: "memoria/agenda.md"
      skill: promemoria
  freelance:
    - numero: 1
      titolo: "Un preventivo da una descrizione a voce o scritta"
      serve: "cosa, per chi, le tue tariffe o un listino, acconto abituale"
      produce: "lavoro/preventivi/AAAA-MM-GG-<cliente>-<lavoro>.md"
      skill: preventivo
    - numero: 2
      titolo: "Un sollecito gentile per una fattura scaduta"
      serve: "numero, data e importo della fattura; il cliente; tu o lei"
      produce: "lavoro/messaggi/AAAA-MM-GG-sollecito-<cliente>.md"
      skill: sollecito-pagamento
    - numero: 3
      titolo: "Tre post dal tuo ultimo lavoro"
      serve: "cosa hai fatto, per chi (se si può dire), su quale social"
      produce: "lavoro/annunci/AAAA-MM-GG-post-<argomento>.md"
      skill: null
  titolare:
    - numero: 1
      titolo: "La risposta a una recensione o a un messaggio difficile"
      serve: "il testo ricevuto, incollato"
      produce: "lavoro/messaggi/AAAA-MM-GG-risposta-<chi>.md"
      skill: null
    - numero: 2
      titolo: "Un preventivo dal listino"
      serve: "il listino o le voci con i prezzi, il cliente"
      produce: "lavoro/preventivi/AAAA-MM-GG-<cliente>-<lavoro>.md"
      skill: preventivo
    - numero: 3
      titolo: "Le scadenze del mese messe in fila"
      serve: "le scadenze a voce, una per una"
      produce: "memoria/agenda.md"
      skill: promemoria
  artigiano:
    - numero: 1
      titolo: "Un preventivo da una descrizione o da un sopralluogo appena fatto"
      serve: "cosa va fatto, misure o quantità, le tue tariffe, acconto abituale"
      produce: "lavoro/preventivi/AAAA-MM-GG-<cliente>-<lavoro>.md"
      skill: preventivo
    - numero: 2
      titolo: "Un sollecito gentile per una fattura scaduta"
      serve: "numero, data e importo della fattura; il cliente"
      produce: "lavoro/messaggi/AAAA-MM-GG-sollecito-<cliente>.md"
      skill: sollecito-pagamento
    - numero: 3
      titolo: "Cantieri e consegne delle prossime settimane messi in fila"
      serve: "i cantieri o i lavori aperti con le date"
      produce: "memoria/agenda.md"
      skill: promemoria
  dipendente:
    - numero: 1
      titolo: "Una email difficile riscritta"
      serve: "il testo da riscrivere o la situazione, a chi va"
      produce: "lavoro/messaggi/AAAA-MM-GG-email-<a-chi>.md"
      skill: null
    - numero: 2
      titolo: "La settimana messa in fila"
      serve: "impegni e scadenze a voce"
      produce: "memoria/agenda.md"
      skill: promemoria
    - numero: 3
      titolo: "Il riepilogo di un documento o degli appunti di una riunione"
      serve: "il testo incollato o il file in lavoro/in-arrivo/"
      produce: "lavoro/report/AAAA-MM-GG-riepilogo-<argomento>.md"
      skill: null
  comune:
    - numero: 1
      titolo: "Un messaggio difficile riscritto"
      serve: "il testo o la situazione, a chi va, tu o lei"
      produce: "lavoro/messaggi/AAAA-MM-GG-<a-chi>.md"
      skill: null
    - numero: 2
      titolo: "Un preventivo o una proposta da una descrizione"
      serve: "cosa, per chi, le cifre dell'utente"
      produce: "lavoro/preventivi/AAAA-MM-GG-<cliente>-<lavoro>.md"
      skill: preventivo
    - numero: 3
      titolo: "Le scadenze delle prossime settimane messe in fila"
      serve: "le scadenze a voce, una per una"
      produce: "memoria/agenda.md"
      skill: promemoria

squadre:
  venditore:
    accesi: [segretaria, copywriter, cercatore-clienti]
    candidati:
      - ruolo: contabile
        se: "forfettario o provvigioni tra i ladri di tempo; non se «fa tutto il commercialista» e nessun ladro di tempo è fiscale"
      - ruolo: analista
        se: "più di 20 contatti o più di un mandante"
    spenti: [preventivista]
    nota: "Regola dei tre: un candidato si accende solo se uno dei tre posti è libero; altrimenti è proposto spento con la frase per accenderlo («accendi l'analista quando mi dai un file»)."
  freelance:
    accesi: [copywriter, preventivista, contabile]
    candidati:
      - ruolo: cercatore-clienti
        se: "«Trovare clienti» tra i ladri di tempo"
    spenti: [segretaria, analista]
  titolare:
    accesi: [segretaria, contabile, copywriter]
    candidati:
      - ruolo: preventivista
        se: "«Sì, tanti» alla Q4c"
    spenti: [analista, cercatore-clienti]
  artigiano:
    accesi: [preventivista, copywriter, contabile]
    candidati: []
    spenti: [segretaria, cercatore-clienti, analista]
    nota: "Come il freelance, con il preventivista per primo."
  dipendente:
    accesi: [segretaria, copywriter]
    candidati: []
    spenti: [cercatore-clienti, analista, preventivista]
    nascosti: [contabile]
  comune:
    accesi: [segretaria, copywriter]
    candidati: []
    spenti: [contabile, cercatore-clienti, analista, preventivista]
  sempre:
    - ruolo: critico
      perche: "strumento del coordinatore, non occupa un posto; invocato sopra la soglia scelta"
    - ruolo: archivista
      perche: "riordino notturno programmato; non è un ruolo che l'utente chiama"
```
