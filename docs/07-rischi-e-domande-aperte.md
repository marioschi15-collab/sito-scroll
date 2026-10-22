# 07 — Rischi e domande aperte

> Stato: design finale, 22 ottobre 2026. Registro dei rischi con mitigazioni e segnali di allarme; incertezze dichiarate con posizione scelta e piano di riserva; domande che solo il fondatore può chiudere; domande per Anthropic; incognite tecniche affidate agli spike; lista di sorveglianza mensile.

---

## 1. Come leggere il registro

- **Probabilità**: Bassa / Media / Alta, giudizio del team sulla base della ricerca del 21-22 ottobre 2026.
- **Impatto**: Basso / Medio / Alto, sul prodotto venduto (non sul prototipo).
- **Segnale**: cosa osserviamo per capire che il rischio si sta materializzando.
- **Chi**: F = fondatore, D = sviluppatore, L = legale esterno.

---

## 2. Registro dei rischi

### 2.1 Piattaforma e termini di Anthropic

| # | Rischio | P | I | Mitigazione | Segnale | Chi |
|---|---|---|---|---|---|---|
| R1 | Anthropic considera la modalità abbonamento "offrire il login claude.ai" e la blocca o la vieta, anche senza preavviso | Media | Alto | AuthProvider sostituibile; chiave API vendibile dal giorno 1; abbonamento sempre raggiungibile (mai disattivato: i termini vietano di togliere o limitare un metodo di accesso del binario) ma in beta chiusa commerciale con avviso e passaggio in un clic; lettera a contact-sales la settimana 1; nessuna vendita della modalità B prima della risposta | Errore di autenticazione lato server nelle sessioni beta; modifica della pagina legale; risposta negativa di sales | F, L |
| R2 | `--bare` diventa il default per `-p`/SDK: spegne CLAUDE.md, hook, skill, MCP, memoria e login abbonamento in un colpo | Media | Alto | Versioni di SDK e binario fissate per release; canarino notturno in CI; flag esplicita di non-bare appena documentata; nessun aggiornamento del binario senza test | Il canarino diventa rosso; nota di rilascio di Claude Code | D |
| R3 | I limiti Pro (finestra di 5 ore e limite settimanale, condivisi con le app Claude) non bastano per Telegram sempre acceso | Media | Medio | Misura in M4 (40 scambi/giorno × 3 giorni); contesto fisso ≤12k token; Haiku di notte; messaggio "in pausa fino alle..." con coda; consiglio Max o chiave API per uso intenso; Anthropic può aggiungere tetti a sua discrezione | Tasso di "limite raggiunto" nel pilota; reclami | D, F |
| R4 | Il manifesto di download del binario (strada C) cambia o viene limitato ai client ufficiali | Media | Medio | Strada A (pacchetto SDK incluso) come riserva automatica; controllo notturno del manifesto in CI; non si mirrorano mai i binari | Download fallito nel canarino | D |
| R5 | La notarizzazione o `signIgnore` non accettano il binario annidato (strada A) | Media | Medio | Spike S-A settimana 0; strada C come primaria | Esito dello spike | D |
| R6 | Anthropic porta nativamente l'intervista italiana, le squadre di ruoli o i vocali Telegram (minaccia sostitutiva: Cowork, Dispatch, Channels, memoria, dettatura) | Alta | Medio | Restare verticali: onboarding italiano, skill da PMI (forfettario, provvigioni, preventivi), memoria leggibile, vocali Telegram, assistenza in italiano; formati compatibili così "cavalchiamo" le loro funzioni; mai ri-brandizzare Claude Code | Annunci Anthropic; funzioni Channels fuori anteprima | F |
| R7 | Crediti API Max cambiano regole o scadenza (oggi: mensili, non trasferibili, solo titolare, solo chiave collegata) | Media | Basso | Non promettere mai "gratis con Max"; pagina prezzi aggiornata; contatore locale come verità | Modifica della pagina crediti | F |
| R8 | I prezzi del listino API o dei piani cambiano (es. Sonnet era previsto a $3/$15 poi annullato) | Media | Basso | Il contatore usa i prezzi dal `result` dell'SDK, non da costanti; pagina prezzi con "verificato il" | Delta tra contatore e fattura Anthropic >10% | D |

### 2.2 Tecnici

| # | Rischio | P | I | Mitigazione | Segnale | Chi |
|---|---|---|---|---|---|---|
| R9 | Il flusso `/login` del binario nel pannello terminale richiede passaggi non previsti (codice da incollare, sessione che scade) | Media | Medio | Pannello visibile (non pty nascosto) regge ogni variante; spike S-C; istruzioni in italiano accanto al pannello | Esito spike; ticket di assistenza "non riesco a collegare" | D |
| R10 | Trascrizione locale lenta o imprecisa su portatili Windows da 8 GB senza GPU | Media | Medio | Gara Parakeet/Whisper sul target reale (S-F); motore alternativo; trascrizione mostrata a vista; il testo funziona sempre; Voce Premium cloud in v1.1 | Errore >10% o latenza >5 s nel pilota | D |
| R11 | Licenza GPL-3 di espeak-ng/Piper nella voce in uscita Windows | Media | Medio | Nessuna TTS locale avanzata su Windows finché un legale non si esprime; voce di sistema OneCore come unica opzione; alternativa cloud | Parere legale | L, F |
| R12 | Identità TCC separata del binario su macOS: dinieghi silenziosi ("exited with code 1") | Media | Medio | Cartella nella home (non Documenti/Desktop); rilevamento del diniego e scheda con pulsante verso Impostazioni di Sistema; test su macOS pulito | Uscite con codice 1 nei log | D |
| R13 | Due processi (sessione principale e lavoro programmato) scrivono gli stessi file di memoria | Media | Medio | Il riordino gira solo quando la sessione principale è inattiva (lock di file); regola "leggi prima di scrivere"; indice derivato ricostruibile | Righe duplicate o perse nei file | D |
| R14 | Cicli di spesa: un ruolo che non termina, cascate di sotto-agenti | Media | Medio | `maxTurns` per ruolo, `maxBudgetUsd` per sessione programmata, profondità 1, 3 paralleli, tetto mensile che mette in pausa i lavori di sfondo | Sessione interrotta per budget; contatore sopra l'80% | D |
| R15 | Il deep link Managed Bots non si apre sui client Telegram desktop/web, o grammY non copre i metodi 9.6 | Media | Basso | Procedura BotFather sempre presente; chiamate dirette ai tre endpoint; test su tutti i client prima del lancio | Esito spike S-D | D |
| R16 | Aggiornamento di Electron, dell'SDK o dei moduli nativi rompe la build firmata | Media | Medio | Versioni fissate; build CI settimanale su entrambe le piattaforme; rollout graduale; versione precedente conservata per il rollback | Build rossa; crash dopo aggiornamento | D |
| R17 | Dimensione e RAM: ~500 MB su disco prima dei modelli vocali, ~1 GB di RAM durante la trascrizione | Media | Basso | Requisito minimo dichiarato (8 GB consigliati); riconoscitore scaricato dalla memoria dopo 2 minuti; modelli vocali solo se attivati | Reclami su macchine da 4 GB | D |

### 2.3 Prodotto e utenti

| # | Rischio | P | I | Mitigazione | Segnale | Chi |
|---|---|---|---|---|---|---|
| R18 | Abbandono alla schermata "crea la chiave API con carta di credito su un sito in inglese" | Alta | Alto | Schermata illustrata a 4 passi, video di 2 minuti, ramo Max con crediti, "Avvio assistito" a €79, contatore e tetto in euro; **misurare l'abbandono** (soglia go/no-go 30%); modalità abbonamento quando permessa | Imbuto S0 | F |
| R19 | L'intervista è troppo lunga o "da questionario" | Media | Alto | Sette domande massime prima del primo colpo; chip; "Vai con i consigliati"; il primo colpo dentro l'intervista; controllo di gergo; cronometro nel pilota | Mediana >12 minuti; abbandoni in S2-S3 | F |
| R20 | La memoria diventa stantia o sbagliata ed erode la fiducia | Media | Medio | File visibili; "correggi" a parole; riordino che sostituisce le direttive superate al posto; tetti; dubbi del riordino nel brief del mattino; "cosa sai di me?" | Correzioni ripetute dello stesso fatto | D, F |
| R21 | Assistenza umana oltre il margine (installazione, avvisi di sicurezza, "credito esaurito") | Media | Medio | Firma da subito; modalità "Aiuto" in cui l'assistente legge i propri log; FAQ per i due avvisi OS; misura dei minuti per utente nel pilota | Minuti/utente >10 nel mese 1 | F |
| R22 | Il brand resta debole rispetto a "Jarvis" nell'immaginario | Media | Basso | Nome caldo e pronunciabile; l'utente battezza il *suo* assistente; sito che mostra l'onboarding in 90 secondi | Tasso di conversione del sito | F |

### 2.4 Business e legale

| # | Rischio | P | I | Mitigazione | Segnale | Chi |
|---|---|---|---|---|---|---|
| R23 | Un singolo italiano non può ottenere Azure Artifact Signing; con OV i nuovi editori vedono SmartScreen a ogni release | Alta se ditta individuale | Alto | Costituire la SRLS prima dell'iscrizione; OV di riserva; Microsoft Store (ri-firmato) in v1.1 | Rifiuto di iscrizione | F |
| R24 | Conflitto di marchio sul nome | Bassa-Media | Medio | Rosa di 5 nomi con verifiche rapide fatte; ricerca UIBM/EUIPO prima del lancio; deposito figurativo in classe 9/42 | Esito ricerca | F, L |
| R25 | L'utente conserva dati sensibili dei suoi clienti e noi veniamo coinvolti | Bassa | Medio | Regola di esclusione dei dati sanitari; "vuoi che lo ricordi?"; cifratura disco suggerita; modelli GDPR; architettura senza percorso dei contenuti | Richieste di clienti finali | F, L |
| R26 | Il bot gestore Telegram (che può rigenerare i token) viene percepito come rischio o compromesso | Bassa | Medio | Dichiarazione esplicita; token cancellato dopo la consegna; Worker minimale con revisione di sicurezza; procedura BotFather per chi vuole indipendenza totale | Domande dei clienti; audit | D |
| R27 | Pirateria del contenuto (i modelli sono Markdown copiabili; il plugin è pubblico) | Media | Basso | Il valore è negli aggiornamenti, nell'assistenza e nelle skill italiane, non nella segretezza; licenza con tolleranza; il plugin pubblico è una scelta | — | F |
| R28 | Costi di assistenza e certificati rendono €29 insufficiente | Bassa | Medio | Margine lordo ≈85-90%; rivedere dopo 100 utenti; "Avvio assistito" come ricavo accessorio | Minuti di assistenza per utente | F |

### 2.5 Sicurezza

| # | Rischio | P | I | Mitigazione | Segnale | Chi |
|---|---|---|---|---|---|---|
| R29 | Prompt injection via Telegram, pagine web o documenti porta ad azioni non volute | Media | Alto | v1 prepara e non invia; linee rosse in ogni ruolo; conferme legate a id di richiesta; configurazione non modificabile da contenuti; critico sopra soglia; registro delle azioni | Un'azione verso terzi senza conferma nel pilota (deve essere 0) | D |
| R30 | Token Telegram o chiave API trafugati dal PC | Bassa | Alto | Solo portachiavi; mai nei log; "Rigenera token"; una fuga colpisce un utente, non tutti | Attività del bot non riconosciuta | D |
| R31 | Catena di fornitura: dipendenza npm compromessa, skill di terzi | Bassa | Alto | Versioni fissate, `npm audit`, nessun marketplace di skill di terzi in v1, checksum degli hook | Avvisi di sicurezza | D |

---

## 3. Incertezze dichiarate: posizione scelta e riserva

| Incertezza | Cosa sappiamo | Posizione | Riserva |
|---|---|---|---|
| **La modalità abbonamento è permessa?** | La pagina legale vieta di "offrire il login claude.ai" ma permette all'utente di accedere al binario non modificato "anche dove una piattaforma ospita Claude Code"; l'SDK dice "salvo approvazione preventiva"; l'articolo di supporto dice che le "app di terzi" usano ancora i limiti dell'abbonamento. Il testo non decide il nostro caso | Costruirla **esattamente** come il binario l'offre (pannello visibile, nessuna lettura di credenziali), non pubblicizzarla né venderla (beta chiusa) senza mai disattivarla, chiedere per iscritto | Chiave API come unica modalità venduta; prezzi e messaggi già pronti |
| **Pro basta?** | Nessun budget pubblico per piano; limiti condivisi con le app Claude | Misurare in M4 | Consigliare Max o chiave API per uso con Telegram sempre acceso |
| **Fornitura del binario** | Due strade possibili, entrambe con un passo non verificato | Test CI settimana 1, poi la vincente (preferenza alla C) | L'altra come riserva automatica |
| **Qualità STT italiana su CPU** | Benchmark di terzi solo per Whisper; Parakeet non verificato per l'italiano | Gara su audio reale | Motore alternativo; trascrizione a vista; cloud premium |
| **Managed Bots sui client desktop** | Funzione di aprile 2026, documentazione ufficiale non raggiunta nella ricerca | Testare su tutti i client | BotFather guidato |
| **TTS Windows e GPL** | espeak-ng è GPL-3; Piper è GPL-3; Kokoro usa espeak-ng per l'italiano | Nessuna TTS locale avanzata su Windows senza parere legale | Voce di sistema; cloud |
| **Durata della coda Telegram a PC spento** | Non verificata (si cita spesso 24 ore) | Progettare il messaggio di recupero indipendentemente dalla durata | — |
| **Prezzi dei piani Claude** | Estratti con confidenza media ($20 Pro mensile, $17 annuale, Max "da $100") | Ricontrollare prima di pubblicare qualsiasi cifra | — |

---

## 4. Domande aperte per il fondatore

Decisioni che il design non può prendere al posto suo. Per ciascuna: cosa serve decidere, entro quando, cosa cambia.

1. **Nome del prodotto**: confermare "Spalla" (o "Socio") e ordinare la ricerca di anteriorità. *Entro la settimana 2*: serve per dominio, bot gestore, bundle id dell'app, certificati.
2. **Forma societaria e tempi**: costituire la SRLS prima del pilota (necessaria per Azure Artifact Signing e per accettare i Termini commerciali come società) o lanciare i pilota con certificato di prova e costituirla entro M5? *Entro la settimana 1.*
3. **Modalità da vendere al lancio se Anthropic non risponde entro 8 settimane**: solo chiave API (coerente con il design) oppure attendere la risposta e rinviare il lancio? Il design presume la prima.
4. **Prezzo**: confermare €29/mese - €290/anno, "Avvio assistito" €79, "Voce Premium" €19 (v1.1). Alternativa: €24/mese con aggiunte a pagamento (upsell). Il pilota raccoglie la disponibilità a pagare.
5. **Chi scrive i modelli italiani** (CLAUDE.md, ANIMA, rituale, domande.md, catalogo ruoli): è il lavoro più importante e il più "del fondatore". Serve tempo dedicato nelle settimane 1-3.
6. **Rami da coprire nel prototipo**: venditore/agente e freelance sono nel perimetro; titolare di negozio e artigiano usano i predefiniti. Confermare o scambiare in base ai tester reclutati.
7. **Tester**: chi sono i 5, come li raggiungiamo, quale compenso. Almeno uno con Windows a 8 GB e due con Android.
8. **Il primo ruolo**: copywriter (produce il primo colpo di ogni ramo, nessuna integrazione) o segretaria (brief del mattino, abitudine)? Il design sceglie il copywriter con la segretaria come stretch; da confermare.
9. **"Avvio assistito"**: lo fa il fondatore in persona nei primi mesi? Quanti slot a settimana? È anche il miglior strumento di ricerca utente.
10. **Merchant of record**: Paddle di default, Stripe Tax di riserva se Paddle rifiuta la categoria (fatturazione italiana, IVA UE, recesso digitale). Confermare e aprire il conto entro M5.
11. **Canale plugin pubblico**: gratuito (acquisizione e assicurazione) o a licenza? Il design lo propone gratuito con il contenuto identico; conferma.
12. **Pubblico Pro vs Max**: la comunicazione sul sito deve dire chiaramente che con Pro la modalità abbonamento è "in beta chiusa: funziona, ma senza garanzie e senza pubblicità" e che la chiave API costa ~20-45 $/mese? Sì nel design ("onestà"); conferma del tono commerciale.
13. **Dati di pilota**: siamo disposti a leggere le trascrizioni e i file esportati dei tester (con consenso) per migliorare il rituale? Il protocollo lo presume.
14. **Lettera ad Anthropic**: chi firma (la società), in che lingua (inglese), con quale livello di dettaglio tecnico (il design propone la lista §2.3 di [02](02-architettura.md) per intero).

---

## 5. Domande per Anthropic (traccia della lettera a contact-sales)

1. **La domanda centrale**: la nostra app desktop avvia il binario non modificato di Claude Code sul PC dell'utente tramite l'Agent SDK; l'utente accede con `/login` nel terminale del binario stesso (browser di Anthropic); la nostra app non legge, conserva né trasmette credenziali; entrambi i metodi (abbonamento e chiave API) restano disponibili e nessuna configurazione nostra ne disattiva uno; vendiamo solo software. Questo rientra in *"an end user signing in to the unmodified Claude Code binary with their own Claude subscription, including where a platform hosts Claude Code"* oppure in *"offering claude.ai login into their own applications"* che richiede approvazione preventiva?
2. Se richiede approvazione: quali condizioni (dichiarazioni all'utente, limiti, revisione) la renderebbero concedibile per un prodotto venduto a professionisti italiani?
3. Come si riconcilia l'articolo 15036540 ("third-party apps with your subscription limits") con la pagina legale? Cosa intende Anthropic per "third-party apps"?
4. `--bare` diventerà il default per `-p`: esisterà una flag documentata per mantenere il comportamento attuale negli host SDK?
5. Esiste un punto di integrazione supportato per scaricare le release firmate del binario (manifesto), o la via consigliata è il pacchetto per piattaforma dell'SDK?
6. Il nostro uso di "Spalla funziona con Claude Code di Anthropic" e "Powered by Claude" in testo semplice è conforme al branding?

---

## 6. Incognite tecniche affidate agli spike (settimana 0)

Vedi [06-piano-prototipo.md §5](06-piano-prototipo.md): S-A notarizzazione/`signIgnore`; S-B stabilità del manifesto; S-C flusso `/login` nel pannello; S-D Managed Bots sui client; S-E limiti Pro a 40 scambi/giorno; S-F gara STT su CPU; S-G canarino `--bare`. Più tre da chiudere durante M2-M3: la conferma, alla versione fissata, della sintassi dei pattern di permesso già verificata sulla documentazione del 22 ottobre 2026 (`./**` relativo alla cartella di lavoro; `/percorso` relativo alla cartella delle impostazioni, **non** assoluto; `//percorso` assoluto; `~/percorso` dalla home, [05 §4.3](05-onboarding.md)); la resa delle bolle vocali MP3 vs OGG/Opus sui client Telegram; il comportamento di `powerMonitor` su Windows con sospensione moderna (Modern Standby).

---

## 7. Lista di sorveglianza mensile

| Cosa | Dove | Perché |
|---|---|---|
| Pagina legale di Claude Code | https://code.claude.com/docs/en/legal-and-compliance.md | Divieti e carve-out sull'autenticazione |
| Articolo di supporto 15036540 | https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan | Stato dell'uso dell'SDK con abbonamento |
| Pagina headless | https://code.claude.com/docs/en/headless.md | Default di `--bare` |
| Note di rilascio SDK e binario | npm `@anthropic-ai/claude-agent-sdk`; docs | Decidere quando alzare la versione fissata |
| Pagina crediti API per abbonati | https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers | Regole e importi dei crediti Max |
| Listino API | https://platform.claude.com/docs/en/about-claude/pricing | Prezzi e cache |
| Channels e plugin Telegram ufficiale | https://code.claude.com/docs/en/channels.md | Se escono dall'anteprima o aggiungono vocali/WhatsApp, cambia il confronto |
| Bot API Telegram (changelog) | https://core.telegram.org/bots/api-changelog | Managed Bots, limiti |
| Azure Artifact Signing (idoneità, prezzi) | https://learn.microsoft.com/en-us/azure/trusted-signing/quickstart | Firma Windows |
| iltuojarvis.com | repository GitHub Pages | Prezzo, funzioni, canali |
