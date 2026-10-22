# 06 — Piano del prototipo

> Stato: design finale, 22 ottobre 2026. Otto settimane, uno sviluppatore senior TypeScript/Electron a tempo pieno più il fondatore (contenuti italiani, test, reclutamento). Perimetro: **onboarding + un ruolo (copywriter) + Telegram**. Obiettivo: imparare, non lanciare.

---

## 1. Cosa vogliamo imparare (le cinque ipotesi)

| # | Ipotesi | Come la verifichiamo |
|---|---|---|
| H1 | Un utente non tecnico installa e completa l'onboarding **senza aiuto**, e il primo risultato arriva in ≤10 minuti | 5 utenti reclutati, osservati in silenzio; cronometro; trascrizioni |
| H2 | Il **terzo giorno** l'assistente usa correttamente ciò che ha imparato (memoria) | 10 fatti "piantati" nei primi due giorni; verifica al giorno 3 |
| H3 | **Telegram con note vocali** funziona dal telefono di un utente comune, con creazione del bot in due tocchi | Tasso di collegamento; 20 vocali italiani registrati in auto e in ufficio; latenza |
| H4 | La **modalità chiave API** è accettabile per il target (abbandono ≤30%) e il costo è prevedibile; **un piano Pro** basta per 40 scambi al giorno | Imbuto S0 misurato; registro costi; test di limite su un account Pro per 3 giorni |
| H5 | Si può **firmare e distribuire** l'app senza avvisi spaventosi su Mac e Windows, e la fornitura del binario funziona | Build firmate su macchine pulite; test CI delle due strade di fornitura (ADR-004) |

---

## 2. Perimetro

### Dentro

- App Electron 45 con tray, finestra chat, schermate S0 (lingua con avvio del download, privacy, avvio automatico, cervello, motore pronto), Impostazioni minime, scheda Memoria minima (elenco file + apri), pagina "Come mi sono presentato".
- **AuthProvider con entrambe le modalità**: chiave API (portachiavi, contatore costi in euro, tetto) e abbonamento (pannello terminale visibile, sempre raggiungibile da "Collega il tuo Claude" con l'avviso di beta chiusa: nessun flag che lo spenga).
- **Fornitura del binario**: download verificato (strada C) **e** pacchetto incluso (strada A), decisi dal test CI della settimana 1; `CLAUDE_CONFIG_DIR` isolato; versioni fissate.
- **Spazio di lavoro**: modelli in italiano, `CLAUDE.md`, rituale `PRIMO-AVVIO.md`, `domande.md` completa per i rami **venditore/agente** e **freelance** (gli altri due rami usano i predefiniti), generazione e validazione dei file, `stato.json`, `RISPOSTE.json`.
- **Variante prototipo del rituale**: `PRIMO-AVVIO.md` e `domande.md` del prototipo saltano Q12 (la voce al computer è fuori perimetro) e non promettono il brief del mattino ("domani alle 8 ti mando...") finché lo stretch segretaria + brief di M4 non è dentro; Q10b (orario del buongiorno) viene posta ugualmente e salvata in `config.json` con `brief.attivo=false`, così il brief si accende senza ri-onboarding quando arriva.
- **Memoria**: file di profilo e memoria, hook dei tetti, diario (hook + modello), indice FTS5 e strumento `memoria_cerca`; **riordino notturno** con l'archivista su Haiku (sessione programmata semplice: ore 03:00 o alla ripresa).
- **Un ruolo: copywriter** (produce il primo colpo di ogni ramo e non richiede integrazioni), con `memory: project` e riferimento di tono; il **critico** come sola lettura invocato sopra soglia (è una chiamata del coordinatore, non un ruolo "attivo" per l'utente). *Stretch (obiettivo facoltativo), solo se M1-M3 chiudono in tempo*: segretaria + `agenda.md` + brief del mattino.
- **Telegram**: Managed Bots con bot gestore (Worker) + procedura BotFather di riserva; long polling grammY; allowlist proprietario; testo in/out con spezzettamento; foto/documenti in `lavoro/in-arrivo/`; **note vocali in ingresso** (ogg-opus-decoder → VAD → STT locale, gara Parakeet/Whisper); **risposte a testo** (voce in uscita fuori perimetro); conferme con pulsanti inline legate a id; recupero dopo sospensione.
- **Permission Broker** in app e Telegram.
- **Firma**: iscrizione Apple e Azure avviata la settimana 1; build notarizzate per i pilota; su Windows certificato di prova fino alla costituzione della SRLS (avviso SmartScreen e blocco di Smart App Control attesi e documentati: con SAC attivo il certificato di prova non basta, [02 §9.2](02-architettura.md)).
- **Lettera ad Anthropic** (contact-sales) inviata la settimana 1.
- **Plugin pubblico** con gli stessi modelli (settimana 1-2) come veicolo dei primissimi pilota tecnici.

### Fuori (esplicitamente, vedi §9)

Voce in uscita (TTS) su entrambi i sistemi; push-to-talk desktop (solo le note vocali Telegram); gli altri ruoli (segretaria solo come stretch); Gmail/Calendar/Fatture in Cloud; Voce Premium; Microsoft Store; rollout graduale degli aggiornamenti; scheda Squadra con grafica; cartella cifrata; secondo utente Telegram; WhatsApp; parola di attivazione; embedding vettoriali.

---

## 3. Stack tecnico

| Area | Scelta | Versione / nota |
|---|---|---|
| Shell desktop | Electron | 45.x (Chromium 156, Node 24.22, solo 64 bit) |
| Build e installer | electron-builder + electron-updater | DMG arm64 e x64 separati; NSIS per-utente; `asarUnpack` per i moduli nativi; `extraResources` + `signIgnore` per il binario (strada A) |
| Linguaggio | TypeScript ovunque (main, Nucleo, renderer, Worker) | — |
| Interfaccia | React + Vite | chip da `AskUserQuestion`, chat in streaming |
| Cervello | `@anthropic-ai/claude-agent-sdk` + binario Claude Code | 0.3.x; il binario arriva come dipendenza opzionale `@anthropic-ai/claude-agent-sdk-<piattaforma>` (es. `-darwin-arm64`; nome verificato su npm il 22/10/2026, vedi [02 §2.5](02-architettura.md)); **versione fissata per release**; `pathToClaudeCodeExecutable` |
| Processo di servizio | Electron `utilityProcess` ("Nucleo") con IPC MessagePort validato (zod) | — |
| Memoria / indice | `better-sqlite3` con FTS5 (tokenizer `unicode61`) | server MCP in-process per `memoria_cerca` |
| Telegram | grammY 1.46 + plugin auto-retry e files; chiamate dirette ai metodi Managed Bots (9.6) se grammY non li copre | long polling |
| Bot gestore | Cloudflare Worker + KV (TTL 10 min), regione UE | solo creazione bot; nessun contenuto |
| Voce (note Telegram) | `sherpa-onnx-node` 1.13.8 (Silero VAD + Parakeet-TDT-0.6B-v3 int8) e `@fugood/whisper.node` (large-v3-turbo q5_0) per la gara | `ogg-opus-decoder` 1.7.x per l'audio; niente ffmpeg |
| Segreti | Electron `safeStorage` (Keychain / DPAPI) | — |
| Scheduler | `croner` + `powerMonitor` | — |
| Pannello login abbonamento | xterm.js + node-pty | sempre raggiungibile da "Collega il tuo Claude", con avviso di beta chiusa (nessun flag) |
| CI | GitHub Actions (runner macOS e Windows) | build, firma, notarizzazione, canarino `--bare`, controllo manifesto, test "mai leggere le credenziali" |
| Licenze/pagamenti | nessuno nel prototipo (pilota gratuito); merchant of record Paddle (Stripe Tax di riserva), conto aperto entro M5 | — |

---

## 4. Struttura del repository del codice

Copia **unica e autorevole** dell'albero (il README e [02 §5.1](02-architettura.md) rimandano qui). Memoria, Telegram e voce sono moduli del Nucleo sia nel prototipo sia nella v1; l'estrazione in pacchetti separati è prevista solo quando avranno un secondo consumatore.

```
spalla/
├── apps/desktop/
│   ├── src/main/               # Shell: finestre, tray, hotkey, power, updater, deep link, avvio Nucleo
│   ├── src/nucleo/
│   │   ├── runtime/            # provisioning binario (download+hash | extraResources), versioni, rollback
│   │   ├── auth/               # AuthProvider: chiave-api.ts, abbonamento.ts (pannello), interfaccia comune
│   │   ├── agent/              # AgentRuntime: sessioni SDK, coda per canale, contatore costi, maxBudgetUsd
│   │   ├── broker/             # Permission Broker: canUseTool → UI/Telegram, timeout, registro
│   │   ├── memoria/            # parsing, hook tetti, hook diario, indice FTS5, memoria_cerca (MCP), riordino
│   │   ├── telegram/           # grammY bridge, Managed Bots client, BotFather wizard, vocali, spezzettamento
│   │   ├── voce/               # decodifica Opus, VAD, STT (sherpa | whisper), download modelli
│   │   ├── onboarding/         # semina workspace, stato.json, validazione schema, RISPOSTE.json
│   │   └── scheduler/          # croner, powerMonitor, lavori programmati
│   ├── src/renderer/           # React: onboarding (S0), chat, impostazioni, memoria, "come mi sono presentato"
│   ├── src/preload/
│   ├── resources/              # icone, entitlements.plist
│   └── electron-builder.yml
├── packages/
│   ├── workspace-templates/    # CLAUDE.md, profilo/*.tmpl, catalogo ruoli, skill, PRIMO-AVVIO.md, domande.md, settings.json
│   ├── schema/                 # zod: frontmatter ruoli, config.json, impostazioni, tetti memoria
│   └── it-copy/                # tutte le stringhe italiane dell'interfaccia e dell'onboarding
├── plugin/                     # .claude-plugin/plugin.json + skills/ agents/ hooks/ (stesso contenuto dei modelli)
├── services/manager-bot/       # Cloudflare Worker: consegna Managed Bots
├── scripts/                    # verifica hash binario, controllo manifesto, canarino --bare, grep anti-credenziali
├── docs/                       # questi documenti
└── .github/workflows/
```

---

## 5. Settimana 0: tre giorni di spike (prove tecniche brevi, una domanda ciascuna)

Ogni spike finisce con una nota di un paragrafo in `docs/spikes.md` (sì/no, prova, conseguenza). Nessuno è lungo; tutti sono bloccanti.

| Spike | Domanda | Se no |
|---|---|---|
| S-A | La notarizzazione Apple accetta un eseguibile annidato firmato da Anthropic in `extraResources` con `signIgnore`? E `signIgnore` lo lascia intatto (hash identico a quello del binario nel pacchetto `@anthropic-ai/claude-agent-sdk-<piattaforma>` scaricato da npm, l'unico nome da usare: [02 §2.5](02-architettura.md))? | Strada C obbligatoria |
| S-B | Il manifesto di download del binario è stabile e verificabile (GPG + SHA-256) per le ultime 5 versioni? Il download funziona su una rete lenta con ripresa, e la schermata S0 aspetta correttamente il completamento prima di aprire la chat ([05 §2](05-onboarding.md))? | Strada A obbligatoria; se entrambe falliscono, fermarsi e riprogettare la fornitura |
| S-C | Il flusso `/login` del binario nel pannello xterm.js completa l'accesso con `CLAUDE_CONFIG_DIR` isolato, e una `query()` successiva funziona senza che la nostra app legga nulla? Richiede un codice da incollare? | Documentare il flusso reale; la modalità B resta solo nel pannello visibile |
| S-D | La schermata `t.me/newbot/<gestore>/<username>?name=` si apre su Telegram Desktop Windows/macOS, Web, iOS, Android? grammY espone i metodi 9.6? | Procedura BotFather come primaria; Managed Bots solo da mobile |
| S-E | Un account **Pro** regge 40 scambi/giorno (Sonnet, contesto ~12k token) per 3 giorni senza colpire la finestra di 5 ore né il limite settimanale? | La pagina prezzi consiglia Max o chiave API per uso con Telegram sempre acceso; misura registrata |
| S-F | Parakeet vs Whisper-turbo su 20 vocali italiani (auto, ufficio): tasso di errore, punteggiatura, latenza su un portatile Intel 8 GB senza GPU | Il perdente resta come motore alternativo selezionabile (a parità di qualità vince Parakeet, più veloce su CPU: [02 §7](02-architettura.md)); se entrambi >10% di errore, la trascrizione mostra sempre "Ho capito: ..." |
| S-G | Il canarino `--bare`: una `query()` con le opzioni di §3.2 di [02](02-architettura.md) carica CLAUDE.md, hook e MCP sulla versione fissata? Il test fallisce se il default cambia? | Il test entra in CI dal giorno 1 |

---

## 6. Milestone (8 settimane) e criteri di accettazione

| Milestone | Settimane | Contenuto | Accettazione (misurabile) |
|---|---|---|---|
| **M1 — Runtime e cervello** | 1-2 | Shell + Nucleo + SDK "hello world"; provisioning del binario (strada scelta dagli spike); `CLAUDE_CONFIG_DIR`; entrambe le modalità di autenticazione; schermate S0; iscrizioni Apple/Azure avviate; **lettera a Anthropic inviata**; plugin pubblicato | Un Mac e una VM Windows **puliti** completano "Collega il tuo Claude" in entrambe le modalità senza terminale; il pannello `/login` dell'abbonamento è raggiungibile senza alcuna configurazione nascosta (test CI); un test CI prova che il nostro processo **non apre mai** `.credentials.json` né imposta `CLAUDE_CODE_OAUTH_TOKEN`; l'hash del binario scaricato corrisponde a quello pubblicato; una chiave non valida mostra l'errore in italiano; il canarino `--bare` è verde |
| **M2 — Onboarding, memoria, copywriter** | 3-4 | Modelli italiani; rituale + `domande.md` (rami venditore e freelance); generazione e validazione; chat; hook tetti; diario; indice FTS5 + `memoria_cerca`; copywriter + critico; riordino notturno | Tre persone di prova (agente immobiliare, agente di commercio, consulente) producono IDENTITA/ANIMA/UTENTE/SQUADRA/CLAUDE.md/`copywriter.md`/MEMORIA/agenda **validi 10/10**; primo risultato con ≤7 domande; `PRIMO-AVVIO.md` cancellato; "cosa sai di me?" restituisce le direttive; una scrittura oltre tetto viene bloccata e riscritta 5/5; un fatto di 10 giorni prima si trova con `memoria_cerca`; la ripresa dopo chiusura cade sulla domanda giusta 5/5; zero parole di gergo nelle trascrizioni |
| **M3 — Telegram** | 5-6 | Worker gestore + Managed Bots; BotFather di riserva; long polling; allowlist; indicatore "sta scrivendo"; spezzettamento; conferme inline; foto/documenti; **vocali in ingresso** con il motore vincitore della gara; recupero dopo sospensione | Collegamento in ≤2 tocchi su iOS e Android (desktop documentato); BotFather funziona; un secondo account Telegram viene scartato (100%); andata-ritorno testo p50 ≤10 s per una bozza semplice; un vocale italiano di 40 s trascritto con ≤10% di errore su 20 campioni; conferme da telefono funzionano, i callback vecchi sono ignorati; dopo sospensione/riattivazione il polling riprende entro 60 s con il messaggio di recupero |
| **M4 — Terzo giorno e limiti** | 7 | Uso reale per 3 giorni via Telegram da parte dei 5 utenti; registrazione costi; test limiti Pro; (stretch: segretaria + brief) | Al giorno 3 l'assistente usa ≥8 dei 10 fatti piantati; un utente Pro a 40 scambi/giorno o non tocca mai il limite o vede "in pausa fino alle..." con consegna in coda (il tasso reale viene **registrato** per decidere il piano consigliato); la spesa dell'utente con chiave API è nel contatore in euro e corrisponde al conto Anthropic ±10%; nessuna sessione supera il suo `maxBudgetUsd`; ≥7 giorni di uptime nel tray senza riavvio manuale |
| **M5 — Pacchetto e prontezza legale** | 8 | Build firmate e notarizzate (DMG arm64+x64), NSIS firmato (certificato di prova se la SRLS non c'è ancora); aggiornamento da N a N+1; privacy policy e policy del bot in italiano; nomi in rosa e ricerca marchi ordinata; relazione del pilota | Su un macOS 15 pulito nessun dialogo "sviluppatore non identificato"; su Windows 11 pulito il criterio "nessun blocco Smart App Control" vale **solo per il build firmato in produzione** (Artifact Signing o OV): con il certificato di prova sono attesi il blocco di Smart App Control (senza eccezioni possibili, [02 §9.2](02-architettura.md)) e l'avviso SmartScreen, da documentare per i tester e da verificare su una VM con SAC disattivato; l'aggiornamento automatico funziona; nessun percorso di codice legge le credenziali del binario (revisione); testo "Powered by Claude" e licenze (Apache/MIT/CC-BY per Parakeet) in Informazioni; lettera ad Anthropic protocollata (risposta non richiesta per il "go") |

---

## 7. Protocollo con i primi 5 utenti

**Reclutamento**: 5 persone non tecniche, italiane, con partita IVA o piccola attività: 2 venditori/agenti (di cui un agente immobiliare), 2 freelance (es. consulente, fotografo), 1 titolare di negozio; 3 su Mac, 2 su Windows (uno con 8 GB di RAM); almeno 2 con Android. Compenso: licenza gratuita a vita del prodotto + buono. Tutti firmano un consenso al trattamento dei dati del test e sanno che le trascrizioni saranno lette.

**Giorno 0 (osservato, 30 minuti, in presenza o condivisione schermo, il fondatore in silenzio)**
1. Scarica dal sito, installa, S0 con la propria modalità (chi ha Pro usa la beta abbonamento; chi no crea la chiave API con carta propria: noi rimborsiamo la ricarica di 10 € in buono).
2. Onboarding completo; cronometro a ogni fase; conteggio domande; momenti di esitazione annotati.
3. Collegamento Telegram dal proprio telefono.
4. Domande finali: "Il profilo è giusto?" (giusto / quasi / no), "Cosa non hai capito?", "Lo useresti domani?".

**Giorni 1-3 (da soli)**
- Ogni mattina il fondatore manda via Telegram del tester (non del bot) un compito realistico da far fare all'assistente, con 3-4 fatti nuovi da "piantare" (nome di un cliente, una regola di tono, un orario).
- Il tester usa l'assistente come vuole; il diario e il registro costi raccolgono i dati; nessuna telemetria oltre i file locali, che il tester ci invia con "Esporta tutto" alla fine (consenso).
- Giorno 3: il fondatore chiede al tester di fare all'assistente 10 domande preparate; si contano i fatti usati correttamente.

**Cosa registriamo**: tempo a ogni fase; domande prima del primo colpo; esitazioni; abbandono in S0 e dove; esito del collegamento Telegram; errori di trascrizione sui vocali; latenze; limiti Pro raggiunti e quando; euro spesi; richieste di aiuto umano (minuti); frasi testuali dei tester ("che mi scriva come scrivo io").

**Questionario finale** (5 minuti): utilità del primo colpo (1-5); fiducia nella memoria (1-5); "quanto pagheresti al mese" (aperta) e "pagheresti 29 €?" (sì/no); cosa manca di più; cosa toglieresti.

---

## 8. Go/no-go per passare alla v1 vendibile

Si procede se **tutte** valgono:
1. M2 e M4 accettate (onboarding senza aiuto, memoria al giorno 3).
2. Abbandono alla schermata chiave API ≤30% **oppure** risposta positiva di Anthropic sulla modalità abbonamento.
3. ≥3 dei 5 tester direbbero sì a 29 €/mese.
4. Vocali Telegram: ≤10% di errore sul motore scelto, o accettato esplicitamente dai tester con la trascrizione a vista.
5. Firma Windows di produzione disponibile (SRLS costituita e iscritta ad Azure Artifact Signing, o certificato OV acquistato).
6. Nessun incidente di sicurezza nel pilota (messaggi da sconosciuti elaborati = 0; azioni verso terzi senza conferma = 0).

Se fallisce il punto 2 ma non gli altri: investire prima nell'"Avvio assistito" e nel messaggio sui crediti Max, poi riprovare la misura.

---

## 9. Fuori perimetro: cosa e perché

| Elemento | Perché non ora | Quando |
|---|---|---|
| Voce in uscita (TTS) | Su Mac è banale ma non è ciò che testiamo; su Windows è bloccata dalla questione licenze espeak-ng (GPL) | v1 (Mac), dopo parere legale (Windows) |
| Push-to-talk desktop | Le note vocali Telegram usano lo stesso motore e sono il caso d'uso principale ("dalla macchina") | v1 |
| Segretaria, contabile, cercatore, analista, preventivista | Il prototipo prova il meccanismo con un ruolo; il copywriter copre il primo colpo di ogni ramo | v1 (segretaria come stretch M4) |
| Gmail / Google Calendar / Fatture in Cloud | Richiedono schermate di autorizzazione e integrazioni in scrittura; v1 prepara, non invia | v1.1 |
| Voce Premium (Deepgram) | Richiede proxy a consumo, DPA, contabilità per utente | v1.1 |
| Microsoft Store | L'MSIX di electron-builder è beta; prima stabilizzare l'NSIS | v1.1 |
| Scheda Squadra grafica, esplora-memoria completo | Cosmetico per le ipotesi del prototipo | v1 |
| Secondo utente Telegram, gruppi | Un confine di fiducia; complica l'allowlist | v1.1 |
| WhatsApp | API ufficiale richiede webhook pubblico e costi per messaggio; librerie non ufficiali violano i termini | Da rivalutare dopo v1 con un BSP italiano, solo come livello ospitato opzionale |
| Parola di attivazione | Licenze Picovoice; nessun modello italiano libero | v2 |
| Embedding vettoriali | FTS5 basta sul testo di lavoro; evita un modello da 300 MB | v2 se un pilota lo richiede |
| Cartella cifrata | FileVault/BitLocker coprono il caso "portatile rubato" | v2 |

---

## 10. Cosa deve fare il fondatore nelle prime due settimane

1. Costituire (o avviare) la **SRLS**: serve per Azure Artifact Signing (solo organizzazioni UE), per accettare i Termini commerciali di Anthropic come società, per il merchant of record.
2. Iscriversi all'**Apple Developer Program** (€99/anno) come organizzazione (serve il numero D-U-N-S, gratuito, fino a 5 giorni) o come persona per i build dei pilota.
3. Aprire un account **Azure** a consumo e richiedere **Artifact Signing** appena la SRLS esiste; in parallelo preventivo per un certificato **OV** di riserva.
4. Creare il **bot gestore** su Telegram (BotFather, "Bot Management Mode") e un account Cloudflare.
5. Inviare la **lettera a Anthropic** (contact-sales) con il testo di [02 §2.3 punto 7](02-architettura.md): archivio della data di invio.
6. Ordinare la **ricerca di anteriorità** del marchio (Spalla / Socio) e prenotare i domini.
7. Reclutare i **5 tester** e preparare i compiti dei giorni 1-3.
8. Scrivere con lo sviluppatore i **modelli italiani** (CLAUDE.md, ANIMA, rituale, domande.md, catalogo ruoli): è il lavoro più importante e nessuno lo può fare meglio del fondatore.
9. Bozza di **privacy policy**, **policy del bot Telegram**, **informativa modello** per i clienti degli utenti.
10. Aprire il conto presso il **merchant of record** per il lancio della v1: Paddle di default, Stripe Tax solo se Paddle rifiuta la categoria.

---

## 11. Rischi del piano (rimando)

I rischi tecnici e di prodotto sono nel registro di [07-rischi-e-domande-aperte.md](07-rischi-e-domande-aperte.md). I tre che possono far slittare il piano di settimane: la fornitura del binario (S-A/S-B), il flusso di login dell'abbonamento (S-C) e la qualità della trascrizione su Windows a 8 GB (S-F). Per questo sono spike della settimana 0 e non scoperte della settimana 5.
