# Spalla (nome di lavoro) — assistente personale con onboarding automatico

> **Stato**: design finale approvato il 22 ottobre 2026; **prototipo in costruzione** (ottobre 2026). Il repository contiene la documentazione di prodotto e di architettura in italiano (`docs/01-07`) e il codice del prototipo: il "Nucleo" (motore con Agent SDK, memoria, ruoli, onboarding, Telegram, vocali) con un terminale di prova. La finestra Electron è il passo successivo. Come provarlo: `docs/08-sviluppo.md`.

## Cos'è

Un'applicazione per Mac e Windows, installabile con un doppio clic, che al primo avvio **si configura da sola intervistando l'utente in italiano per dieci minuti**: capisce che lavoro fa, quali strumenti usa, cosa gli ruba tempo, come vuole essere chiamato e con che tono, e da lì scrive profilo, memoria, regole della casa e la sua "squadra" di ruoli (segretaria, copywriter, cercatore clienti, contabile, analista, critico...). Il cervello è il Claude dell'utente — il suo abbonamento o la sua chiave API, pagati direttamente ad Anthropic — eseguito sul suo computer tramite il binario ufficiale di Claude Code, non modificato. La memoria è in file di testo che l'utente può aprire. L'assistente risponde anche da Telegram, a testo e a nota vocale.

Per chi: liberi professionisti, venditori e titolari di micro-imprese italiane, **non tecnici**. Il concorrente diretto, iltuojarvis.com, vende la stessa promessa installandola a mano in una videochiamata di un'ora; noi togliamo il fondatore dal ciclo.

## Indice dei documenti

| N. | Documento | Cosa risponde |
|---|---|---|
| 01 | [docs/01-visione-e-prodotto.md](docs/01-visione-e-prodotto.md) | Perché, per chi, contro chi; cosa fa e cosa non fa la v1; modello di business e prezzi; la rosa di cinque nomi con la raccomandazione; metriche |
| 02 | [docs/02-architettura.md](docs/02-architettura.md) | Come funziona: runtime e autenticazione con la posizione sui termini di Anthropic e il piano di riserva; diagramma; componenti; cartelle su disco (Mac e Windows); voce; Telegram; firma e aggiornamenti; sicurezza e privacy; **registro delle decisioni (ADR)** con le alternative scartate |
| 03 | [docs/03-memoria.md](docs/03-memoria.md) | Come ricorda: file, tetti, cosa entra nel contesto e quando, regole di scrittura, riordino notturno, privacy, con i file di esempio completi di un utente campione |
| 04 | [docs/04-agenti.md](docs/04-agenti.md) | La squadra: formato dei ruoli con un file di esempio completo, il coordinatore e la delega, il catalogo dei ruoli e quando l'onboarding li accende |
| 05 | [docs/05-onboarding.md](docs/05-onboarding.md) | I primi dieci minuti: principi, fasi, banca domande completa con le ramificazioni per mestiere, i file generati, il dialogo completo in italiano, i casi limite, come si cambia dopo |
| 06 | [docs/06-piano-prototipo.md](docs/06-piano-prototipo.md) | Il prototipo in 8 settimane: perimetro, stack, struttura del codice, spike della settimana 0, milestone con criteri di accettazione, protocollo con i primi 5 utenti, go/no-go, cosa resta fuori |
| 07 | [docs/07-rischi-e-domande-aperte.md](docs/07-rischi-e-domande-aperte.md) | Registro dei rischi con mitigazioni, incertezze dichiarate con posizione e riserva, domande per il fondatore, traccia della lettera ad Anthropic, lista di sorveglianza |
| 08 | [docs/08-sviluppo.md](docs/08-sviluppo.md) | Come installare, avviare il terminale di prova, eseguire i test; cosa funziona e cosa è ancora da fare |
| — | [docs/fonti.md](docs/fonti.md) | Tutte le fonti, per argomento, con una riga di nota e il livello di confidenza |

## Come leggerli

- **Se hai venti minuti** (fondatore): `01` per intero, poi `02 §0` (le decisioni in dieci righe) e `02 §2` (termini di Anthropic), poi `07 §4` (le domande che devi chiudere tu).
- **Se devi decidere se investire**: `01 §6-7` (posizionamento e conti), `06 §8` (go/no-go), `07 §2-3` (rischi e incertezze).
- **Se sei lo sviluppatore**: `02` per intero (in particolare §3.2 e §11), poi `03`, `04`, `05 §3-4`, `06`.
- **Se scrivi i contenuti italiani** (il lavoro più importante del progetto): `05` per intero, `04 §2 e §5`, `03 §4 e §4.11`.

Ogni documento spiega i termini tecnici la prima volta che compaiono; il glossario principale è in `02 §1`. I diagrammi sono in Mermaid e si vedono direttamente su GitHub. Le affermazioni che dipendono da un fatto citano la fonte; i fatti con confidenza media o bassa sono segnalati come tali in `fonti.md`.

## Le decisioni chiave, in breve

1. **App desktop brandizzata** (Electron 45, firmata e notarizzata), non un plugin dentro il Claude dell'utente né un fork di OpenClaw.
2. **Binario ufficiale di Claude Code, mai modificato**, pilotato dall'Agent SDK; versioni fissate per ogni release; fornitura decisa da un test (download verificato vs pacchetto incluso).
3. **Autenticazione sostituibile**: chiave API vendibile dal primo giorno; abbonamento Claude tramite il login del binario stesso, **sempre raggiungibile nell'app** (i termini di Anthropic vietano di togliere, disattivare o limitare un metodo di accesso del binario) ma in stato commerciale di **«beta chiusa»** — non pubblicizzato, non venduto, senza garanzie, con passaggio alla chiave API in un clic — finché Anthropic non risponde per iscritto. Nessun nostro server vede mai prompt, token o chat.
4. **Onboarding come rituale in un file**: sette domande di profilo al massimo, poi un risultato utile fatto *dentro* l'intervista con le parole dell'utente; squadra di tre ruoli all'inizio.
5. **Memoria in Markdown** nella cartella home, con tetti imposti dal software, indice di ricerca derivato, riordino notturno; memoria automatica di Claude Code spenta (un solo sistema).
6. **Ruoli nel formato nativo di Claude Code** con metadati di prodotto; i file sono l'unica fonte; profondità di delega 1; Sonnet di default, Haiku per i lavori di casa, Opus mai di default.
7. **Telegram con un bot per utente** creato in due tocchi (Managed Bots), long polling dal PC, solo il proprietario può scrivere; note vocali trascritte in locale.
8. **v1 prepara e non invia mai**: ogni azione verso terzi o fuori dalla cartella passa da una conferma in italiano (app o pulsanti Telegram).
9. **Prezzo**: €29/mese o €290/anno, 14 giorni di prova; "Avvio assistito" €79; "Voce Premium" €19 in v1.1. Vendiamo software, mai consumo di AI.
10. **Onestà sul sito**: cosa la v1 non fa (invii automatici, parola di attivazione, WhatsApp, PC spento) è scritto in chiaro.

## Nome

"Spalla" è il nome di lavoro e la raccomandazione (rosa completa e verifiche in `01 §9`: Spalla, Socio, Fidato, Factotum, Ambra). Serve una ricerca di anteriorità UIBM/EUIPO prima del lancio. L'assistente personale, invece, lo battezza ogni utente durante l'onboarding.

## Convenzioni del repository

- Lingua: italiano. Termini tecnici in inglese solo dove non esiste un equivalente d'uso (hook, long polling, frontmatter), spiegati alla prima occorrenza.
- Nei documenti l'utente campione è **Marco**, agente immobiliare a Bologna, con l'assistente **Bruno**; le altre persone di riferimento (Giulia, Sara, Luca) sono in `01 §3`.
- Il codice del prototipo vivrà in `apps/`, `packages/`, `services/`, `plugin/`, `scripts/` secondo la struttura in `06 §4` (unica copia dell'albero; `02 §5.1` la richiama senza duplicarla); questi documenti restano in `docs/`.
- Le decisioni si cambiano aggiungendo un ADR in `02 §11`, non riscrivendo la storia.

## Prossimi passi (prime due settimane)

Costituzione della SRLS, iscrizione Apple Developer e richiesta Azure Artifact Signing, bot gestore Telegram, lettera ad Anthropic (contact-sales), ricerca marchio, reclutamento dei 5 tester, scrittura dei modelli italiani con lo sviluppatore. Lista completa in `06 §10`.
