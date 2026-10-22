# 01 — Visione e prodotto

> Stato: design finale, 22 ottobre 2026. Nome di lavoro: **Spalla** (provvisorio, vedi §9). Questo documento spiega *cosa* costruiamo e *perché*; il *come* è in [02-architettura.md](02-architettura.md).

---

## 1. In una frase

Spalla è un'applicazione per Mac e Windows che si installa con un doppio clic e che, al primo avvio, **si configura da sola intervistando l'utente in italiano per dieci minuti**: capisce che lavoro fa, quali strumenti usa, cosa gli ruba tempo, come vuole essere chiamato e con che tono, e da quelle risposte scrive profilo, memoria iniziale, regole della casa e la "squadra" di assistenti specializzati (segretaria, copywriter, cercatore clienti, contabile, analista, critico). Il cervello è il Claude dell'utente (il suo abbonamento o la sua chiave API, pagati direttamente ad Anthropic); la memoria è in file di testo sul suo computer; l'assistente risponde anche da Telegram, a testo e a nota vocale.

---

## 2. Il problema

Un freelance, un venditore o il titolare di un piccolo negozio italiano passa le sere a fare lavoro di segreteria che nessuno gli paga: follow-up ai clienti, preventivi sempre uguali, solleciti di pagamento, scadenze fiscali, post sui social, riconciliazioni in Excel. Gli strumenti di intelligenza artificiale generici (ChatGPT, Claude) aiutano frase per frase ma **non sanno chi sei**, non ricordano i tuoi clienti e non ti raggiungono in macchina.

Il mercato ha già dimostrato che questa persona è disposta a pagare per un "assistente che si ricorda tutto": iltuojarvis.com (Dennis Avarello Consulting s.r.l.s., Milano) vende esattamente questa promessa — voce, Telegram, squadra di agenti, memoria, "resta sul tuo computer" — con il Claude Pro del cliente come cervello (fonte: codice della pagina, https://raw.githubusercontent.com/dennisavarello/iltuojarvis/main/index.html). Il suo limite è strutturale: **accende ogni installazione a mano, in una videochiamata di un'ora, dieci posti a ottobre 2026** (così la pagina al 21/10/2026), a un prezzo una tantum non pubblicato ("niente prezzo, niente garanzia" è una nota nel codice sorgente della pagina).

Il nostro prodotto rimuove il fondatore dal ciclo: l'intervista di configurazione la fa l'AI stessa, ogni volta, per chiunque.

---

## 3. Per chi è

**Target v1**: liberi professionisti, agenti/venditori e titolari di micro-imprese italiane, **non tecnici**. Non hanno mai aperto un terminale, non sanno cos'è una API, hanno un portatile (spesso Windows con 8 GB di RAM), un iPhone o un Android, WhatsApp come canale principale con i clienti.

Quattro persone di riferimento che useremo in tutti i documenti:

| Persona | Lavoro | Cosa le ruba tempo | Cosa non farà mai |
|---|---|---|---|
| **Marco**, 38, Bologna | Agente immobiliare indipendente, collabora con un piccolo studio; 40 incarichi/contatti attivi; MacBook Air, iPhone | Rispondere ai lead dei portali entro pochi minuti, riepiloghi post-visita, follow-up, documenti per ogni incarico (APE, planimetrie), proposte in scadenza | Creare un account sviluppatore in inglese; copiare un token dal telefono senza una guida passo passo |
| **Giulia**, 41, Padova | Agente di commercio plurimandataria (forniture dentali), 60 studi, 3 mandanti, forfettaria; Windows 8 GB, auto | Follow-up dopo le visite, riconciliazione provvigioni, scadenze del forfettario | Tollerare la schermata "Windows ha protetto il PC"; pagare una bolletta che non sa prevedere |
| **Sara**, 34, Verona | Consulente/fotografa freelance, forfettaria, lavora da sola | Preventivi ripetitivi, rispondere ai lead su Instagram e WhatsApp, solleciti acconti, didascalie | Leggere documentazione |
| **Luca**, 52, Treviso | Titolare di un negozio con 3 dipendenti | Fornitori e ordini, turni, recensioni online, scadenze | Imparare un'interfaccia da sviluppatori |

Le frasi con cui queste persone descrivono il bisogno sono i nostri **test di accettazione**: "che mi ricordi le cose", "che mi scriva i messaggi con il mio tono", "che mi dica a chi non ho più scritto da un mese", "che mi tenga in ordine le scadenze", "che lo posso usare dalla macchina, a voce".

---

## 4. Cosa fa il prodotto (v1) e cosa non fa

### Fa

1. **Installazione a doppio clic**, firmata, senza terminale, senza porte aperte, senza altri account oltre a Claude e (facoltativo) Telegram.
2. **Onboarding conversazionale** di ~10 minuti, con al massimo 7 domande di profilo prima del **primo risultato utile** prodotto *durante* l'intervista con le parole dell'utente (es. tre messaggi di follow-up pronti da incollare su WhatsApp). Dettagli in [05-onboarding.md](05-onboarding.md).
3. **Memoria persistente e leggibile**: file Markdown (testo semplice) nella cartella dell'utente, che può aprire, correggere e cancellare; riordino notturno automatico. Dettagli in [03-memoria.md](03-memoria.md).
4. **Squadra di ruoli** (agenti): segretaria, copywriter, cercatore clienti, contabile, analista, critico, preventivista, archivista; accesi dall'onboarding in base al mestiere, al massimo tre all'inizio. Dettagli in [04-agenti.md](04-agenti.md).
5. **Telegram** come telecomando: testo, foto, documenti e **note vocali in ingresso** (trascritte in locale, in italiano); risposte a testo, a voce su richiesta; conferme con pulsanti per ogni azione rischiosa.
6. **Voce sul computer**: premi un tasto e parli (push-to-talk), trascrizione in locale; risposta vocale breve su Mac con le voci di sistema.
7. **Cervello = il Claude dell'utente**: chiave API Anthropic (modalità vendibile dal primo giorno) oppure abbonamento Claude Pro/Max tramite il login ufficiale di Claude Code. La seconda è sempre raggiungibile nell'app (non la nascondiamo né la disattiviamo: i termini di Anthropic lo vietano), ma resta in stato commerciale di «beta chiusa» — non pubblicizzata, non venduta, senza garanzie, con passaggio alla chiave API in un clic — finché Anthropic non conferma per iscritto (vedi [02-architettura.md §2](02-architettura.md)).
8. **Regole della casa** dette in italiano e applicate dal software: in v1 l'assistente **prepara ma non invia mai** nulla a terzi; ogni azione fuori dalla sua cartella chiede conferma.

**Scostamento dichiarato dal brief**: il brief chiede che l'onboarding scriva anche le *integrazioni*. In v1 l'unica integrazione configurata dall'intervista è Telegram (più l'attivazione delle skill in base agli strumenti dichiarati); Gmail, Calendar e Fatture in Cloud arrivano in v1.1 come "missioni" proposte dalla segretaria nella prima settimana ([05 §1.9](05-onboarding.md)). Motivo: una schermata di autorizzazione Google nei primi dieci minuti farebbe saltare il primo risultato, e poiché v1 non invia nulla un'integrazione in sola lettura varrebbe poco quel costo.

### Non fa (in v1, e lo diciamo sul sito)

- Non invia email/WhatsApp/post da solo (nessuna integrazione in scrittura verso terzi in v1; Gmail/Calendar arrivano in v1.1 e comunque "chiede sempre").
- Non ha una parola di attivazione ("Ehi Spalla"): si usa un tasto o Telegram. Le licenze dei motori di wake word italiani non sembrano permetterlo a un prezzo sensato: il piano gratuito di Picovoice risulta terminato il 30 giugno 2026 e i piani commerciali partirebbero da centinaia di dollari al mese (**confidenza bassa**: fonti secondarie, da confermare con Picovoice, vedi [02 §7](02-architettura.md)); openWakeWord non ha un modello italiano.
- Su Windows la voce in uscita è quella di sistema ("Microsoft Elsa", robotica) finché non chiudiamo la questione licenze dei motori locali migliori (vedi [07-rischi-e-domande-aperte.md](07-rischi-e-domande-aperte.md)).
- Non usa WhatsApp come canale: l'API ufficiale richiede un server nostro e costi per messaggio; le librerie non ufficiali violano i termini di WhatsApp e fanno bannare il numero del cliente (fonte: README di whatsapp-web.js e Baileys).
- Non funziona a PC spento: Telegram risponde solo quando il computer è acceso. Lo diciamo nel `/start` del bot.

---

## 5. Perché l'auto-onboarding è la proposta di valore

Nessuna delle funzioni elencate è, da sola, nostra: Claude Code di Anthropic ha già memoria automatica, sottoagenti, dettatura in italiano e perfino un canale Telegram in anteprima; OpenClaw e Hermes (open source) hanno 20 canali e memoria ibrida. Quello che manca a tutti, e che iltuojarvis vende con un'ora di fondatore, è **la prima mezz'ora di una persona non tecnica**. La nostra scommessa:

1. **Il primo risultato arriva dentro l'intervista.** Dopo 7 domande l'assistente dice "basta domande, facciamo una cosa vera" e produce un artefatto che l'utente usa oggi, con il suo tono e i suoi nomi. È il momento in cui il prodotto smette di essere un software e diventa un collaboratore.
2. **Il terzo giorno si personalizza da sé.** Per il giorno 3 l'assistente deve dire qualcosa che può sapere solo perché ha lavorato con te (nomi dei clienti, la regola "lei con gli studi storici", il fatto che non scrivi dopo le 20). È il meccanismo di fidelizzazione.
3. **L'onboarding è un file, non un programma.** Il rituale di primo avvio è un documento Markdown che l'AI legge e segue (il precedente è `BOOTSTRAP.md` di OpenClaw: "è un rituale, non un cancello; non trasformarlo in un questionario"). Possiamo migliorarlo ogni settimana senza rilasciare una nuova versione dell'app.
4. **Zero-touch.** Nessun fondatore in call per impostazione predefinita; la call esiste come opzione a pagamento per chi la vuole (vedi §7).
5. **Trasparenza come prova.** Memoria e configurazione sono file che il cliente apre. È anche la nostra prova GDPR: "resta sul tuo computer" non è uno slogan, è l'architettura.

---

## 6. Posizionamento

### 6.1 Contro iltuojarvis.com (ottobre 2026)

| | iltuojarvis.com | Spalla |
|---|---|---|
| Installazione | Videochiamata di un'ora con il fondatore, "nessun codice", 10 posti a ottobre 2026 | Installer firmato a doppio clic, intervista AI di 10 minuti, posti illimitati |
| Prezzo | Una tantum, non pubblicato, "niente garanzia", più Claude Pro a parte | **€29/mese o €290/anno**, trasparente, 14 giorni di prova; più Claude (Pro/Max o chiave API, scelta dell'utente) |
| Cervello | Claude Pro dell'utente; runtime non dichiarato | Il Claude dell'utente tramite il binario Claude Code **non modificato** pubblicato da Anthropic; modalità documentate; anche chiave API |
| Personalizzazione | "Cucito su di te" a mano, in call | Scritta dall'AI dall'intervista; modificabile a parole; riordinata ogni notte |
| Agenti | Analista, Copywriter, Cacciatore di clienti, Costruttore di siti, Contabile, Contraddittorio | Segretaria, copywriter, cercatore clienti, contabile, analista, critico, preventivista, archivista; squadra per mestiere, massimo 3 attivi all'inizio |
| Memoria | "Si ricorda tutto" (formato non dichiarato) | File Markdown che l'utente apre; tetti di dimensione; riordino notturno con registro leggibile |
| Telegram | Testo + vocali, risponde a voce | Testo + vocali in ingresso; risposta a voce solo su richiesta (voce di sistema, fuori dal prototipo); creazione del bot in due tocchi (Telegram Managed Bots); solo il proprietario può scrivergli, imposto anche lato Telegram |
| Voce | "Come nel film" (una demo usava voce Gemini) | Trascrizione locale gratuita; voce di sistema; voce cloud premium come aggiunta |
| Privacy | Dichiarazione "restano sul tuo computer"; la privacy policy cita Google e Meta come responsabili | Nessun percorso dei contenuti attraverso i nostri server, per costruzione; modelli GDPR per i clienti dell'utente |
| Scala | Limitata dal tempo del fondatore | Zero-touch |

Cosa fa meglio lui oggi: un essere umano in call vende e rassicura. La nostra risposta è il primo risultato dentro l'intervista e l'opzione "Avvio assistito" (§7).

### 6.2 Contro le alternative gratuite e native

| Alternativa | Cosa offre | Perché non basta al nostro target | Cosa impariamo |
|---|---|---|---|
| **OpenClaw** (MIT, ~393k stelle) | Gateway sul PC, 20+ canali, memoria ibrida, rituale di primo avvio, multi-agente | Installazione da terminale "non per principianti"; nel 2026 oltre 30.000 istanze esposte, bypass di autenticazione, centinaia di pacchetti malevoli nel registro skill; Anthropic ha bloccato il suo uso dell'abbonamento (fonti in [fonti.md](fonti.md)) | I formati dei file (SOUL/USER/MEMORY/diario), il rituale BOOTSTRAP, le "linee rosse", pairing + allowlist su Telegram |
| **Hermes Agent** (Nous, MIT) | Stessi file, FTS5, gateway Telegram/WhatsApp/Signal, trascrizione vocali | Installazione da terminale; provider non Anthropic di default | FTS5 per la ricerca in memoria |
| **Claude nativo** (Desktop, Cowork, Dispatch, Channels, memoria automatica, dettatura) | Tutto a costo zero oltre l'abbonamento, mantenuto da Anthropic | Nessuna intervista italiana, nessuna squadra di ruoli preconfigurata, UX da sviluppatori, funzioni in anteprima, niente vocali Telegram | È la piattaforma su cui costruiamo *e* la principale minaccia sostitutiva: restiamo compatibili con i suoi file |
| **Zo Computer** (cloud, da $18/mese) | Sempre acceso, nessuna installazione | Cervello e dati non sul PC dell'utente: contraddice la promessa | — |
| **AndyTrust/Jarvis** (GPL, solo Mac) | Assistente su Claude Code con intervista `/inizia` | Solo terminale, solo Mac | Conferma che il bisogno di "intervista" esiste anche tra gli sviluppatori italiani |

---

## 7. Modello di business e ipotesi di prezzo

### 7.1 Chi paga cosa

Vendiamo **software**, mai consumo di AI: i termini di Anthropic vietano di "pagare, rivendere o intermediare l'uso di Claude per conto degli utenti finali" (https://code.claude.com/docs/en/legal-and-compliance.md). Il cliente paga Anthropic direttamente per il cervello e noi per l'applicazione.

| Voce | Prezzo | Note |
|---|---|---|
| **Spalla** | €29/mese oppure €290/anno (+IVA, detraibile per chi ha partita IVA) | App, onboarding, tutti i ruoli, voce locale, Telegram, aggiornamenti, assistenza via email. 14 giorni di prova. Uso personale su 2 PC. |
| **Avvio assistito** (opzionale) | €79 una tantum | Videochiamata di 30 minuti *dopo* l'onboarding AI, per chi vuole un umano. Converte il pubblico di iltuojarvis senza renderlo il percorso predefinito. |
| **Voce Premium** (v1.1, opzionale) | €19/mese | Trascrizione e voce cloud in italiano di qualità alta (Deepgram Nova-3 + Aura-2) dietro un nostro proxy a consumo, con tetto di uso equo (10 ore di parlato + 200.000 caratteri di voce al mese). Costo stimato per noi $9-10 al tetto (fonti: https://deepgram.com/pricing). |
| **Cervello** (pagato ad Anthropic) | Claude Pro ~$20/mese (o $17 annuale); Max da $100/mese; oppure chiave API a consumo | Prezzi dalla pagina pubblica, estratti con confidenza media: da ricontrollare prima di pubblicarli (https://claude.com/pricing). |

Totale per Marco con Claude Pro: ≈ €49/mese tutto compreso.

### 7.2 Quanto costa il cervello in modalità chiave API (stime da validare nel prototipo)

Una **chiave API** è una lunga password che identifica un account Anthropic "a consumo": si paga per milione di token (frammenti di testo) letti e scritti. Prezzi verificati (https://platform.claude.com/docs/en/about-claude/pricing), in dollari per milione di token in ingresso/uscita:

| Modello | Prezzo | Uso che ne facciamo |
|---|---|---|
| Haiku 5.5 | $0,10 / $0,50 fino a 100k token di prompt; $0,50 / $2,50 oltre | Riordino notturno della memoria, brief del mattino ("Economico") |
| Sonnet 5.5 | $2 / $10 | Predefinito per l'assistente e per i ruoli ("Equilibrato") |
| Opus 5.5 | $4 / $20 | Solo su richiesta esplicita ("Massima"), mai di default |

Due fatti che cambiano i conti: le letture ripetute del contesto fisso (profilo, memoria) costano **0,05x** se cadono nella cache di 5 minuti (la scrittura in cache costa 1,25x), e i modelli dalla 4.7 in su usano un tokenizzatore che produce **~30% di token in più** per lo stesso testo. Per un utente tipico (40 scambi al giorno con ≤12k token di contesto fisso più messaggio e risposta, ≈ 14k token per scambio) la stima su Sonnet 5.5 va da **~$20/mese** se gli scambi sono ravvicinati (cache calda) a **~$40-45/mese** se sono sparsi nella giornata (cache fredda, premio di scrittura). Per questo l'app ha un **contatore locale di spesa** in euro con un tetto che l'utente sceglie; il numero vero lo misuriamo con i primi utenti.

Chi ha **Claude Max** riceve dal 7 ottobre 2026 crediti API mensili ($100 per Max 5x, $200 per Max 20x: cifre verificate) che coprono l'Agent SDK quando si usa la propria chiave Console collegata; i crediti scadono ogni mese, valgono solo per il titolare e non sono trasferibili (https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers). Il prezzo dei piani Max ("da $100/mese"; quello del 20x non compariva nel testo estratto dalla pagina prezzi) è **da ricontrollare** come gli altri prezzi dei piani. Per un cliente Max la modalità chiave API è quindi di fatto compresa nel suo abbonamento, che però costa da $100 al mese in su. **Claude Pro non ha crediti**: per il cliente da €20/mese ha senso economico solo la modalità abbonamento, che dipende dalla risposta di Anthropic (vedi [02-architettura.md §2](02-architettura.md)).

### 7.3 Economia unitaria

- **Costo marginale per utente attivo/mese**: banda per gli aggiornamenti (~90 MB per release con la strada C, dove il binario di Claude Code lo serve Anthropic; fino a ~250 MB se si spedisce il pacchetto incluso, [02 §2.5](02-architettura.md)), chiamate al bot gestore Telegram e alla verifica licenza (frazioni di centesimo), commissioni del merchant of record (~5%), assistenza. Nessun costo di inferenza né di voce nel piano base. **Margine lordo ≈ 85-90%**.
- **Costi fissi annui** (certificati di firma, hosting aggiornamenti, CI): ≈ €220-600/anno (dettaglio in [02 §9.4](02-architettura.md)), più la società (SRLS, necessaria anche per il certificato di firma Windows).
- **La vera voce di costo è l'assistenza.** Obiettivo: ≤10 minuti umani per nuovo utente nel primo mese, ≤3 minuti/mese dopo. Lo otteniamo con l'onboarding AI, con una modalità "Aiuto" in cui l'assistente legge i propri log e spiega in italiano ("Claude è in pausa fino alle 16:30", "Telegram non risponde perché il PC era spento") e con una FAQ per i due avvisi di sicurezza dei sistemi operativi.
- **Fatturazione**: tramite merchant of record (il "rivenditore fiscale" che fattura al posto nostro, glossario in [02 §1](02-architettura.md)): **Paddle** di default, Stripe Tax come riserva se Paddle rifiuta la categoria; così IVA/OSS e diritto di recesso non diventano la nostra contabilità a 50 utenti.
- **Leve contro l'abbandono**: il brief del mattino su Telegram (abitudine), il riepilogo settimanale "cosa ho fatto per te" (ore risparmiate, messaggi preparati, scadenze intercettate), la personalizzazione del terzo giorno. Obiettivo tasso di abbandono mensile (churn) <5%.

### 7.4 Canale secondario: il plugin per chi usa già Claude Code

Gli stessi file del prodotto (modelli di spazio di lavoro, skill, agenti, rituale di onboarding) vengono pubblicati come **plugin di Claude Code** in un marketplace pubblico, per chi già usa Claude Code e vuole la squadra italiana senza la nostra app. Costo marginale zero, serve da veicolo per i primi pilota (settimana 1) e da assicurazione: se Anthropic restringesse la via "SDK + abbonamento", il contenuto del prodotto sopravvive come plugin. Il plugin **non** include Telegram né voce (richiederebbero funzioni di Claude Code in anteprima che un terzo non può distribuire).

---

## 8. Vincoli legali in una pagina

1. Il prodotto **non** si chiama né contiene "Claude", "Claude Code" o "Anthropic" nel nome, nel logo o nel dominio; può dire in testo semplice "Spalla funziona con Claude" e "Powered by Claude" (https://code.claude.com/docs/en/agent-sdk/overview.md).
2. Il binario di Claude Code viene eseguito **esattamente come pubblicato da Anthropic**, senza modifiche, senza togliere, nascondere o disattivare alcun metodo di accesso: nessun interruttore di configurazione spegne il login dell'abbonamento, nemmeno per i clienti paganti.
3. Non intermediamo mai credenziali né uso: il login all'abbonamento avviene nel flusso di Anthropic, la chiave API resta sul dispositivo, nessun nostro server vede prompt o token.
4. La modalità abbonamento resta in «beta chiusa» finché Anthropic non risponde per iscritto: uno stato **commerciale** (non pubblicizzata, non venduta, senza garanzie, con avviso esplicito e passaggio alla chiave API in un clic), non un blocco tecnico; la lettera parte la prima settimana del prototipo.
5. La società accetta i Termini commerciali di Anthropic per l'uso dell'Agent SDK.

Dettaglio e citazioni testuali in [02-architettura.md §2](02-architettura.md).

---

## 9. Nome del prodotto: rosa di cinque

Vincoli: italiano o pronunciabile in italiano, nessun riferimento Marvel/DC ("Jarvis" è escluso), niente "Claude/Anthropic", funziona detto a voce ("chiedilo a ..."), registrabile nelle classi 9/42 (software). Verifiche web rapide del 22 ottobre 2026, **non** ricerche di marchio: prima del lancio serve una ricerca formale UIBM/EUIPO.

| # | Nome | Perché | Verifica rapida | Giudizio |
|---|---|---|---|---|
| 1 | **Spalla** | "La tua spalla": il braccio destro, chi ti copre; caldo, da lavoro, due sillabe, si dice bene in macchina ("chiedilo a Spalla") | Nessuna app o prodotto AI con questo nome; parola generica (spalla, salume), quindi tutela nel solo uso figurato in classe 9/42 | **Consigliato** |
| 2 | **Socio** | "Il tuo socio": il partner che il lavoratore autonomo non ha; parla direttamente a chi ha la partita IVA | Nessun assistente AI trovato; esiste "Socio Labs" (eventi, USA) e l'omofono "SOCi" (USA): rischio moderato fuori Italia, basso in Italia | Buona alternativa |
| 3 | **Fidato** | "Il tuo fidato": la fiducia come promessa ("niente esce a nome tuo senza il tuo sì") | Nessun software trovato (solo una "FIDAT Srl" di saldatura, non correlata) | Pulito, un po' meno caldo |
| 4 | **Factotum** | Latino d'uso comune ("il factotum dell'ufficio"), culturalmente italiano (Rossini, "Largo al factotum"); descrive la squadra che fa tutto | Nessuna azienda AI con questo nome; omonimo uno strumento di autenticazione Plan 9 e un "Factor" agent (2026), distinguibili | Dignitoso; leggera sfumatura servile in inglese |
| 5 | **Ambra** | Memoria conservata nella resina; nome femminile comune, dolce da pronunciare a voce | Nessun assistente AI; marchi attesi in altre classi (cosmetica, moda), quindi registrare in 9/42 | Evocativo, meno descrittivo |

**Scartati dopo le verifiche**: Nestore (collisione con il progetto europeo H2020 "NESTORE", coach per anziani, partner CNR); Vico (Vicoland, "VICO AI Video Generator"); Zefiro (Zefi.ai, startup italiana); Sesto ("Sesto: AI Music Generator"); Olmo (OLMo, famiglia di modelli Ai2); Tobia (TOBi di Vodafone); Virgilio, Argo, Mastro, Lume, Faro, Dante, Pronto (marchi affermati).

**Raccomandazione**: **Spalla** come nome del prodotto. L'assistente personale, invece, lo battezza l'utente durante l'onboarding (Bruno, Teo, Nina...): il marchio è del prodotto, il nome è del cliente. Passi: (1) ricerca di anteriorità UIBM/EUIPO classi 9 e 42 su "Spalla" e "Socio"; (2) verifica domini `.it`/`.com`/`.app`; (3) deposito del marchio figurativo prima del lancio pubblico.

---

## 10. Metriche di successo

| Metrica | Obiettivo prototipo (5 utenti) | Obiettivo v1 (primi 100) |
|---|---|---|
| Installazione → primo messaggio dell'assistente senza aiuto umano | 5/5 | ≥90% |
| Tempo dal doppio clic al primo risultato utile | ≤15 min per tutti, ≤10 min per 3/5 | mediana ≤10 min |
| Domande di profilo prima del primo risultato | ≤7 | ≤7 |
| Profilo generato giudicato "giusto/quasi giusto" | ≥4/5 | ≥80% |
| Giorno 3: fatti usati correttamente in conversazione | ≥8 su 10 piantati | — |
| Ritenzione a 30 giorni | — | ≥70% |
| Minuti di assistenza umana per nuovo utente (mese 1) | misurare | ≤10 |
| Messaggi Telegram da sconosciuti elaborati | 0 | 0 |
| Azioni verso terzi eseguite senza conferma | 0 | 0 |
| Tasso di abbandono mensile (churn) | — | <5% |
| Onestà: il sito dichiara cosa v1 non fa | sì | sì |
