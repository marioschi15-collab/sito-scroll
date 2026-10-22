# 08 — Sviluppo: come si installa, si avvia e si prova il prototipo

> Stato: prototipo "Nucleo + finestra Electron + terminale di sviluppo", 22 ottobre 2026. La finestra (§2-bis) e il
> terminale (`pnpm dev`, §2) usano gli stessi servizi, lo stesso Permission Broker e le stesse regole. Le decisioni di
> architettura sono in [02](02-architettura.md); qui c'è solo il "come si fa girare".

## 1. Prerequisiti

- Node 22 e pnpm 10 (`corepack enable` basta: il `packageManager` è dichiarato nel `package.json` della radice).
- Un cervello: **un login di Claude Code già presente sulla macchina** (modalità abbonamento, solo con
  `SPALLA_CONFIG_EREDITATA=1`) oppure **una chiave API Anthropic** (modalità chiave API, incollata al primo avvio).
- Facoltativi: `ffmpeg` (solo per generare l'OGG di prova dei test voce; senza, quel test salta), `tar` con bzip2 (per
  estrarre i modelli vocali, presente su macOS/Linux/Windows 10+).

```bash
pnpm install
pnpm build:packages        # compila @spalla/schema e @spalla/it-copy in dist/ (il desktop li importa da lì)
```

`pnpm typecheck`, `pnpm test` e `pnpm dev` dalla radice eseguono da soli `build:packages` prima di partire.

## 2. Il terminale di sviluppo (`pnpm dev`)

```bash
SPALLA_HOME=/tmp/spalla-dev SPALLA_CONFIG_EREDITATA=1 pnpm dev
```

Cosa succede, in ordine:

1. **Percorsi.** Con `SPALLA_HOME` tutto finisce sotto quella cartella (`Spalla/` = cartella di lavoro, `dati-app/`,
   `dati-locali/`). Senza, valgono i percorsi veri di [02 §5](02-architettura.md): `~/Spalla`, `~/.config/spalla`,
   `~/.local/share/spalla` su Linux; `Application Support` su macOS; `AppData` su Windows.
2. **Prima volta: il cervello.** Il terminale chiede `1` (chiave API: la incolli e finisce nel deposito cifrato
   `dati-locali/secrets.bin`) oppure `2` (abbonamento Claude, con l'avviso di beta). La scelta va in
   `dati-app/config.json` (sezione `cervello`); le altre sezioni prendono i predefiniti di `@spalla/schema`.
3. **Il Nucleo parte** (`apps/desktop/src/nucleo/index.ts`): memoria (indice SQLite + osservatore), Permission Broker,
   agente, onboarding, scheduler (riordino notturno alle 03:00; buongiorno spento), Telegram se c'è un token.
4. **Prova di collegamento** la prima volta: "Collegato. Spalla può pensare." oppure il motivo in italiano.
5. **Presentazioni.** Se `Spalla/onboarding/PRIMO-AVVIO.md` c'è ancora, il terminale semina la cartella dai modelli
   (`packages/workspace-templates/templates`), apre una sessione nuova e manda il rituale come primo messaggio.
   Le domande con opzioni arrivano come elenchi numerati: rispondi con il numero oppure scrivendo. Alla domanda su
   Telegram, se dici di sì, parte la procedura guidata (vedi §4) e l'assistente riceve un messaggio di sistema con
   l'esito. Quando il rituale finisce (`PRIMO-AVVIO.md` sparisce, `stato.json` dice completato) l'app chiude la
   pratica: `RISPOSTE.json`, riga nel diario, orari e buongiorno in `config.json`, e mostra gli eventuali problemi
   trovati dalla validazione dei file.
6. **Chat.** Testo in streaming, strumenti come righe attenuate ("· Leggo memoria/agenda.md"), permessi come scheda
   `Consenti? [s/n]`, fine scambio con secondi e dollari.

Comandi: `/nuova` (chiude l'argomento: la prossima riga apre una sessione nuova con la memoria riletta dai file),
`/stato` (argomento, spesa del mese e tetto, presentazioni, Telegram), `/memoria` (contatori e indice;
`/memoria ricostruisci`), `/telegram` (vedi §4), `/aiuto`, `/esci`.

Con l'abbonamento **senza** `SPALLA_CONFIG_EREDITATA=1` il binario usa la cartella isolata `dati-locali/claude`: il
terminale stampa il comando `CLAUDE_CONFIG_DIR=… claude /login` da eseguire a parte (nella finestra c'è il pannello
xterm, §2-bis).

## 2-bis. La finestra (`pnpm dev:app`)

```bash
pnpm build:packages                                                    # una volta: schema e it-copy compilati
SPALLA_HOME=/tmp/spalla-dev pnpm --filter @spalla/desktop dev:app      # electron-vite dev: ricarica a caldo della pagina
SPALLA_HOME=/tmp/spalla-dev SPALLA_CONFIG_EREDITATA=1 pnpm --filter @spalla/desktop dev:app   # con il login della macchina
pnpm --filter @spalla/desktop build:app                                # build di produzione in apps/desktop/out/
pnpm --filter @spalla/desktop start:app                                # avvia la build di out/ (electron-vite preview)
```

Come è fatta (dettagli nei README di `apps/desktop/src/main`, `src/preload`, `src/renderer`):

- **Processo principale** (`src/main/index.ts`): istanza singola, icona nella barra (l'app resta lì quando chiudi la
  finestra; "Esci" dal menu dell'icona), sospensione/ripresa, avvio al login (solo app pacchettizzata). Il Nucleo gira
  qui dentro (prototipo) dietro `HostNucleo` (`src/main/nucleo-host.ts`), la cucitura per il futuro `utilityProcess`.
- **IPC**: il contratto è `src/ipc/contratto.ts` (`window.spalla`); ogni metodo è un `ipcMain.handle('gruppo.metodo')`
  accettato solo dalla nostra pagina, con gli argomenti validati da zod (`src/ipc/schemi.ts`). Eventi:
  `evento.<nome>`. La finestra non riceve mai segreti, input grezzi degli strumenti o percorsi assoluti fuori dalla
  cartella di lavoro.
- **Preload** (`src/preload`, CommonJS in sandbox): espone solo `window.spalla`.
- **Pagina** (`src/renderer`, React 19): procedura S0 (benvenuto, privacy, avvio automatico, cervello con chiave API o
  abbonamento e pannello `/login` in xterm.js, motore pronto), chat con streaming, chip, schede di permesso, allegati
  trascinati, [Vai con i consigliati]; Squadra, Memoria, Telegram, Impostazioni, "Come mi sono presentato". Tema chiaro
  e scuro con `prefers-color-scheme`; CSP stretta in `index.html` (in sviluppo electron-vite la allarga solo per la
  ricarica a caldo).
- **SQLite nella finestra.** Dentro Electron (finestra e app installata) l'indice della memoria usa sempre
  `node:sqlite`, integrato in Electron 45 (SQLite 3.53 con FTS5, `unicode61` e `bm25`; nel log `memoria.motore_sqlite`).
  `better-sqlite3` è solo una dipendenza di sviluppo per le prove con Node e il terminale: non entra nell'installer e
  non va mai ricompilato per Electron (non supporta ancora Electron 45). `node-pty` (pannello `/login`) e
  `sherpa-onnx-node` usano N-API e arrivano già compilati per piattaforma: nessuna ricompilazione.
- **Scorciatoia di sviluppo.** Con `SPALLA_CONFIG_EREDITATA=1` (solo app non pacchettizzata) la schermata
  dell'abbonamento mostra **[Sono già collegato]**: salta il pannello e prova subito il collegamento con il login
  della macchina. `SPALLA_MAX_TURNI=8` limita i passi di ogni scambio della finestra.

## 3. Variabili d'ambiente

| Variabile | Effetto |
|---|---|
| `SPALLA_HOME` | Sposta cartella di lavoro, dati dell'app e dati locali sotto questa cartella (sviluppo e test). Nella finestra anche i dati di Chromium (`<SPALLA_HOME>/electron`), così una prova non si scontra con l'app aperta. |
| `SPALLA_CONFIG_EREDITATA=1` | Lascia `CLAUDE_CONFIG_DIR` quello della macchina: il binario trova il login di Claude Code già fatto. Solo sviluppo/E2E; in produzione la cartella è sempre isolata. Nella finestra abilita [Sono già collegato]. |
| `SPALLA_MAX_TURNI` | Solo finestra in sviluppo: tetto di passi per ogni scambio (prove a costo contenuto). |
| `SPALLA_SQLITE=integrato` | Forza `node:sqlite` per l'indice della memoria (prove e diagnosi; di solito la scelta è automatica). |
| `ANTHROPIC_API_KEY` | Nella prova `smoke:onboarding`: se presente, la prova usa la modalità chiave API con questa chiave. Nel terminale la chiave si incolla al primo avvio e vive nel deposito cifrato, non nell'ambiente. |
| `TELEGRAM_BOT_TOKEN` | Token del bot: il Nucleo lo usa se nel deposito segreti non c'è ancora un token (`token_telegram`). In alternativa `/telegram`. |
| `RUN_E2E=1` | Abilita i test che parlano davvero con Anthropic (`test/agent-e2e.test.ts`). |
| `SMOKE_VERBOSE=1`, `SMOKE_TIENI=1` | Nella prova delle presentazioni: log dettagliato; non cancellare la cartella temporanea alla fine. |
| `SPALLA_MODELLI_VOCE` | Cartella con `silero_vad.onnx` e il modello Parakeet estratto: abilita il test di trascrizione reale. |

## 4. Telegram dal terminale

Due strade, come in [02 §8](02-architettura.md):

- **Token già in mano** (`TELEGRAM_BOT_TOKEN` o `/telegram <riga di BotFather>`): il Nucleo verifica la riga con
  `getMe`, salva il token nel deposito cifrato, avvia il bot in long polling e scrive `telegram.attivo`/`telegram.bot`
  in `config.json`.
- **Procedura guidata** (`/telegram` senza argomenti, o la domanda Q11 del rituale): il terminale stampa i passi di
  BotFather con nome e username suggeriti; incolli la riga di BotFather; il bot parte.

Poi il telefono: scrivi "ciao" al bot, ricevi un codice di sei caratteri, confermalo con `/telegram <codice>`. Da lì il
bot risponde solo a quel numero (allowlist per id numerico, [02 §8.5](02-architettura.md)), le conferme del Permission
Broker arrivano con i pulsanti [Sì, fallo] [No] quando scrivi da Telegram o il computer è inattivo da 5 minuti, le note
vocali vengono trascritte in locale se i modelli sono stati scaricati (`VoiceService.prepara()`: oggi solo da codice,
non c'è ancora una schermata). La consegna "due tocchi" con i Managed Bots esiste come client e come Worker
(`services/manager-bot`) ma non è collegata al terminale.

## 5. Prove

```bash
pnpm typecheck              # tsc su tutti i pacchetti (prima compila schema e it-copy)
pnpm test                   # vitest ovunque: offline, senza credenziali, SPALLA_HOME temporaneo
pnpm sicurezza              # scripts/verifica-sicurezza.mjs: niente lettura delle credenziali del binario, niente bypass
pnpm test:e2e               # come pnpm test più agent-e2e (una riga attraverso il vero binario; serve un login)
pnpm smoke:onboarding       # le presentazioni vere: rituale + tre risposte di Marco (docs/05 §5), controlla IDENTITA.md
pnpm --filter @spalla/desktop test:renderer          # solo la pagina (jsdom + Testing Library); già dentro pnpm test
pnpm --filter @spalla/desktop smoke:finestra         # la finestra vera, senza schermo (xvfb-run da sola su Linux)
pnpm --filter @spalla/desktop smoke:finestra -- --onboarding   # passaggio vero fino alla chat (serve un login, vedi sotto)
```

`smoke:finestra` (`apps/desktop/test/e2e/finestra-smoke.mjs`, Playwright `_electron`) fa la build, avvia l'app con
`SPALLA_HOME` temporaneo, controlla che la pagina veda solo `window.spalla` (niente `require`/`process`), va da
Benvenuto a Cervello e salva `finestra-benvenuto.png` e `finestra-cervello.png` (`--uscita <cartella>`, predefinita
`<tmp>/spalla-finestra-smoke`; `--tieni` lascia la cartella di prova; il log del processo principale finisce accanto alle
immagini). Con `--onboarding` imposta `SPALLA_CONFIG_EREDITATA=1` e `SPALLA_MAX_TURNI=8`, sceglie l'abbonamento, usa
[Sono già collegato], apre la chat, lascia partire il rituale, consente i permessi che chiede, risponde "Marco" e
"Del tu" alle prime due domande e salva `finestra-chat.png`.

Per un modulo solo: `pnpm --filter @spalla/desktop exec vitest run test/<modulo>` (`runtime`, `auth`, `broker`,
`scheduler`, `agent`, `cli`, `memoria`, `telegram`, `voce`, `onboarding`, `nucleo`). I pacchetti:
`pnpm --filter @spalla/schema test`, `pnpm --filter @spalla/it-copy test`, `pnpm --filter @spalla/manager-bot test`.

Numeri al 22 ottobre 2026: 327 test desktop Node (+3 E2E con `RUN_E2E=1`) e 37 della pagina, 36 schema, 13 it-copy,
7 Worker; tutti verdi. La prova `smoke:onboarding` in questo ambiente: due scambi, 22 passi, 0,34 $, `profilo/IDENTITA.md`
con "Bruno". `smoke:finestra` passa sotto `xvfb-run` (Electron 45); con `--onboarding` il rituale fa le prime due
domande nella finestra e chiede due permessi per comandi di sola lettura/modifica nella cartella.

## 6. Dove sta cosa

```
apps/desktop/src/nucleo/
  contratti.ts           le interfacce tra i moduli (si cambiano solo con un ADR)
  percorsi.ts            calcolaPercorsi(): cartelle per sistema operativo, SPALLA_HOME
  index.ts               avviaNucleo(): il composition root (vedi README nella cartella)
  dispatcher.ts          coda unica sulla sessione principale, eventi al canale chiamante, marcatori per l'app
  runtime/  auth/  agent/  broker/  scheduler/   motore (B): binario, cervello, sessioni SDK, permessi, cron
  memoria/               indice FTS5, tetti, diario, riordino notturno (C)
  telegram/  voce/       bot grammY, pairing, BotFather, Managed Bots; trascrizione sherpa-onnx (D)
  onboarding/            semina, stato, messaggio iniziale, validazione, chiusura, ruoli (E)
apps/desktop/src/cli/    terminale di sviluppo: pnpm dev, resa degli eventi, /telegram, logger su file
apps/desktop/src/ipc/    contratto.ts (window.spalla) e schemi.ts (zod, lato processo principale)
apps/desktop/src/main/   processo principale Electron: finestra, barra, HostNucleo, ponte IPC, pannello /login, esporta
apps/desktop/src/preload/   window.spalla (sandbox, CommonJS)
apps/desktop/src/renderer/  la pagina React: S0, chat, sezioni
apps/desktop/test/       vitest per modulo (+ renderer-*.test.tsx in jsdom); test/e2e/onboarding-smoke.ts, finestra-smoke.mjs
packages/schema/         zod: ruoli, domande, config.json, stato.json, RISPOSTE.json, tetti, percorso dei modelli
packages/it-copy/        TUTTE le frasi italiane mostrate all'utente (i moduli le importano da qui)
packages/workspace-templates/templates/   ~/Spalla iniziale: CLAUDE.md, settings.json, ruoli, skill, PRIMO-AVVIO.md
services/manager-bot/    Cloudflare Worker per la consegna del token con i Managed Bots
scripts/verifica-sicurezza.mjs
```

Dati per utente (con `SPALLA_HOME=/tmp/spalla-dev`): `/tmp/spalla-dev/Spalla` (cartella di lavoro),
`/tmp/spalla-dev/dati-app/{config.json, sessione.json, usage/, telegram/state.json}`,
`/tmp/spalla-dev/dati-locali/{claude/, indice/memoria.sqlite, runtime/, models/, secrets.bin, logs/}`.
I log sono righe JSON senza contenuti dei messaggi; chiavi e token vengono oscurati se mai ci finissero.

## 7. Cosa funziona e cosa è ancora un segnaposto

| Funziona oggi | Note |
|---|---|
| Chat nel terminale con streaming, strumenti, fine scambio con costo | sessione principale ripresa per id, una al giorno |
| Modalità chiave API (deposito cifrato, contatore mensile in euro con tetto) e abbonamento (login ereditato) | nella finestra: pannello `/login` isolato in xterm.js, prova della chiave prima di salvarla |
| Finestra Electron: S0, chat (streaming, chip, schede di permesso, allegati, rituale, [Vai con i consigliati]), Squadra, Memoria, Telegram (BotFather e pairing), Impostazioni (esporta tutto, cartella, voce), "Come mi sono presentato"; barra con menu e stato | prove della pagina in jsdom, `smoke:finestra` sotto xvfb, pacchetto Linux `dir` avviato |
| Permission Broker: schede in italiano nel terminale, pulsanti su Telegram, timeout 10 minuti, ruolo che agisce | mai bypass, nemmeno per i lavori programmati |
| Domande con opzioni (AskUserQuestion → chip numerate; su Telegram pulsanti) | testo libero sempre permesso |
| Memoria: indice FTS5 con bonus di recenza, osservatore dei file, tetti (hook), diario (hook Stop), `memoria_cerca` | indice ricostruibile, schema versionato |
| Onboarding: semina, rituale come primo messaggio, ripresa, chiusura automatica, validazione dei file, ruoli acceso/spento | prova E2E `smoke:onboarding` |
| Telegram: pairing con codice, allowlist, conferme, domande, note vocali (con i modelli scaricati), allegati in `lavoro/in-arrivo`, recupero dopo spegnimento | un solo proprietario; `/ricomincia` e `/stop` rispondono "si fa dal computer" |
| Riordino notturno con l'archivista (sessione programmata, tetto 0,10 $) | parte solo se `.claude/agents/archivista.md` esiste (lo copia il rituale a S5; se non l'ha fatto, lo accende l'app a presentazioni finite). Prova vera: `RUN_E2E=1 pnpm --filter @spalla/desktop exec vitest run test/memoria-riordino-e2e` |
| Marcatore `[[APRI:TELEGRAM]]` del rituale → procedura guidata → messaggio di sistema all'assistente | |

| Segnaposto o fuori perimetro | Stato |
|---|---|
| Shell Electron: Nucleo in un `utilityProcess` con MessagePort | per ora nel processo principale, dietro `HostNucleo` (ADR-012) |
| `safeStorage` | non collegato: il deposito segreti resta quello a file (serve un'opzione di iniezione in `avviaNucleo`) |
| Scorciatoia globale, link `spalla://`, aggiornamenti automatici, icona definitiva | fuori da questo passo (`spalla://` è solo dichiarato nel pacchetto) |
| Interrompere davvero uno scambio ([Fermati]) | la finestra smette di mostrare gli eventi e risponde/nega ciò che è in attesa; manca un `interrompi` nell'AgentRuntime |
| Prova diretta della chiave su HTTPS (Haiku) mentre il motore si scarica | la prova passa dal binario incluso (strada A) |
| Buongiorno del mattino (`brief_mattino`) | base funzionante in `nucleo/brief.ts`, spenta (`config.brief.attivo: false`, docs/06 §2); al canale desktop arriva solo via `suBrief` |
| Voce al computer (push-to-talk, TTS, risposte vocali su Telegram) | fuori perimetro; `/voce on` risponde "non disponibile" |
| Managed Bots "due tocchi" | client + Worker pronti e testati; la finestra mostra il percorso ma risponde "non ancora disponibile" (manca il deploy del Worker) |
| Deposito segreti | AES-256-GCM con chiave derivata da utente@macchina: segnaposto di `safeStorage` |
| Secondo utente Telegram | API pronta (`aggiungiProprietario`), nessuna interfaccia |
| Fornitura del binario (strada C: download verificato) | si usa il binario incluso nell'SDK |

## 8. Cose da sapere

- **Cartella "non fidata".** In una sessione SDK il binario non mostra mai la finestra di fiducia e **non usa** le regole
  `permissions.allow` di `.claude/settings.json` (documentazione dei permessi, "What runs before you trust a folder"):
  lo scrive sul suo stderr (nel log come `binario.stderr`). Hook, blocco `env`, `deny` e `ask` restano in vigore. Non è
  un problema per il prototipo: la stessa lista `allow` viene passata dall'SDK con `allowedTools` (docs/02 §3.2). Resta
  da decidere per Electron se e come marcare la cartella come fidata senza toccare la cartella di configurazione del
  binario (vedi [07](07-rischi-e-domande-aperte.md)). `Bash` è in `ask`: se durante il rituale il modello usa un
  comando (es. `cat` o `sed` su un file della cartella) invece di Read/Edit, nella finestra compare una scheda di
  permesso; è il comportamento voluto, ma conviene spingere il rituale verso Read/Edit.
- **Sessione dentro una sessione.** Se il terminale gira dentro un'altra sessione di Claude Code (es. da uno strumento di
  sviluppo), il binario erediterebbe `CLAUDE_CODE_SESSION_ID`: il runtime la toglie dall'ambiente del binario.
- **Avviso `CLAUDE_SDK_CAN_USE_TOOL_SHADOWED`.** Voluto: le regole nude (Glob, Grep, WebSearch, WebFetch, Agent,
  AskUserQuestion, `memoria_cerca`) non passano dal Broker (docs/02 §3.2). Il terminale lo manda nel log.
- **`Write(./**)`** è accettata ma, per la documentazione dei permessi, è `Edit(./**)` la regola che governa anche Write.
- **Le frasi.** Tutto ciò che l'utente legge sta in `packages/it-copy/src`; i `testi.ts` dei moduli sono solo adattatori
  di forma. Un test (`gergo.test.ts`) vieta "agente", "prompt", "token", "MCP", "API" (salvo "chiave API").

## 9. Prossimi passi (M3-M4 del piano, [06](06-piano-prototipo.md))

1. **Shell Electron, seconda metà**: spostare il Nucleo in un `utilityProcess` (MessagePort, stessi schemi zod);
   `safeStorage` al posto del deposito a file; `interrompi` vero nell'AgentRuntime; scorciatoia globale e `spalla://`;
   prova in una finestra vera su macOS e Windows (finora solo Linux sotto xvfb).
2. **Telegram "due tocchi"**: deploy del Worker, `creaClientManagedBots().avviaCollegamento()` dalla schermata
   Telegram, `canale.aggiungiProprietario(id)` alla consegna; `/ricomincia` e `/stop` cablati (`attivaRuolo`,
   `nuovaSessione`, interruzione della `query`).
3. **Voce**: schermata che chiama `VoiceService.prepara()` con la barra di avanzamento; confronto Parakeet/Whisper
   sugli audio italiani (spike S-F).
4. **Buongiorno del mattino**: accendere `brief_mattino` dalle impostazioni e mostrarlo nella finestra (desktop) o su
   Telegram; rispettare gli orari di silenzio.
5. **Pipeline**: build firmate, `electron-builder`, strada C per il binario, migrazione dei modelli di spazio di lavoro
   all'aggiornamento.

## 10. Pacchetto e installer

> Configurazione: `apps/desktop/electron-builder.yml`; dettagli e scelte in
> [`apps/desktop/README-pacchetto.md`](../apps/desktop/README-pacchetto.md). Decisioni in [02 §2.5 e §9](02-architettura.md).

Nel prototipo il binario di Claude Code viaggia **dentro l'installer** (strada A di 02 §2.5): il pacchetto per
piattaforma dell'SDK (`@anthropic-ai/claude-agent-sdk-<piattaforma>-<arch>`) viene copiato **senza modifiche** in
`app.asar.unpacked` (fuori dall'archivio, perché `spawn()` non può eseguire file dentro `app.asar`) e non viene mai
ri-firmato: `mac.signIgnore` su macOS, `win.signExts: ['!claude.exe']` su Windows.

| Piattaforma | Cosa esce in `apps/desktop/release/` | Note |
|---|---|---|
| macOS Apple Silicon | `Spalla-<versione>-mac-arm64.dmg` | hardened runtime, entitlements in `resources/entitlements.mac.plist` |
| macOS Intel | `Spalla-<versione>-mac-x64.dmg` | DMG separato, niente universale (02 §9.1) |
| Windows x64 | `Spalla-<versione>-win-x64-setup.exe` | NSIS per l'utente, in italiano, senza diritti di amministratore |
| Linux x64 | `Spalla-<versione>-linux-x86_64.AppImage` o cartella `linux-unpacked` | **solo per sviluppo e prove** |

### 10.1 Costruire in locale

Si costruisce sulla piattaforma (e architettura) di destinazione: pnpm installa solo il binario di Claude Code e i
moduli nativi della macchina su cui gira.

```bash
pnpm install
pnpm build:packages                                        # @spalla/schema e @spalla/it-copy in dist/
pnpm --filter @spalla/desktop exec electron-vite build     # out/main, out/preload, out/renderer

# poi, a seconda della macchina:
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm --filter @spalla/desktop exec electron-builder --mac --arm64 --publish never   # oppure --x64 su un Mac Intel
pnpm --filter @spalla/desktop exec electron-builder --win --publish never                                         # su Windows
pnpm --filter @spalla/desktop exec electron-builder --linux dir --publish never                                   # prova veloce: solo la cartella, niente installer
```

- **Moduli nativi.** `npmRebuild: false`: electron-builder non ricompila nulla e non tocca `node_modules`, quindi
  `pnpm test` continua a funzionare dopo un pacchetto. Motivo: i moduli nativi dell'app (`node-pty`, `sherpa-onnx-node`)
  usano N-API e hanno binari precompilati per Mac e Windows; `better-sqlite3` non è nell'app (§2-bis). La prima
  release del 22 ottobre falliva proprio qui: la ricompilazione di `better-sqlite3` per Electron 45 non compila.
  Prova del 22 ottobre con `npmRebuild: false`: `linux-unpacked` costruito, `--autoverifica` OK (binario di Claude
  Code fuori da `app.asar`), avvio sotto `xvfb-run` con Nucleo partito e memoria sul motore integrato.
- **Icona.** `apps/desktop/resources/icon.png` (1024×1024, segnaposto) si rigenera con `node scripts/genera-icone.mjs --forza`
  (serve `ffmpeg`); electron-builder ne ricava `.icns` e `.ico` da solo.
- **Modelli della cartella di lavoro.** Viaggiano in `extraResources` (`<risorse>/workspace-templates/templates`),
  dove `cartellaTemplates()` li trova risalendo da `node_modules/@spalla/schema`; l'hook `resources/dopo-pacchetto.cjs`
  rimette i `.gitkeep` che electron-builder scarta sempre.

### 10.2 Il binario è davvero "non modificato"?

```bash
node scripts/verifica-hash-binario.mjs apps/desktop/release/mac-arm64/Spalla.app   # o release/win-unpacked, release/linux-unpacked
# opzioni: --piattaforma darwin|win32|linux  --arch arm64|x64  (predefinite: quelle della macchina)
```

Lo script calcola lo SHA-256 del binario nel pacchetto dell'SDK in `node_modules` e di quello trovato nell'app, li
confronta e controlla che stia in `app.asar.unpacked`; su macOS stampa anche chi lo ha firmato (`codesign`). Esce con 0
se coincidono, 1 se il binario è stato toccato, 2 se manca qualcosa. Gira anche nella CI di release.

### 10.3 Il flusso di release (`.github/workflows/release.yml`)

- **Quando parte**: a mano (Actions → Release → Run workflow) o con un tag `v*` (es. `git tag v0.1.0 && git push --tags`).
- **Su cosa**: `macos-latest` (arm64), `macos-15-intel` (x64), `windows-latest` (x64). Se l'etichetta Intel non fosse
  più disponibile, la riserva è costruire l'x64 su `macos-latest` con `--x64`, aggiungendo
  `supportedArchitectures: { os: [darwin], cpu: [arm64, x64] }` in `pnpm-workspace.yaml` perché pnpm scarichi anche il
  binario x64 (lo script di verifica se ne accorge se manca).
- **Passi**: `pnpm install --frozen-lockfile` → build dei pacchetti `@spalla/*` → `electron-vite build` →
  `electron-builder --<mac|win> --<arch> --publish never` → verifica dell'hash del binario → caricamento di DMG/EXE come
  artefatti (`actions/upload-artifact@v4`, 14 giorni) → riepilogo della corsa con dimensioni, esito della verifica e
  avviso sulle build non firmate.
- **Nessun segreto richiesto**: `CSC_IDENTITY_AUTO_DISCOVERY=false`, quindi niente firma. Su macOS Sequoia e successivi
  l'utente deve passare da Impostazioni di Sistema → Privacy e sicurezza → "Apri comunque"; su Windows compare
  SmartScreen ("Ulteriori informazioni" → "Esegui comunque") e Smart App Control blocca l'app senza eccezioni (02 §9.2).
  Sono pacchetti per prove interne.
- **Niente pubblicazione**: `publish` non è impostato in `electron-builder.yml`. Con gli aggiornamenti automatici
  (02 §9.3) si aggiungerà il provider `github` (prototipo) o `generic` su Cloudflare R2 (v1), più il target `zip` su
  macOS che serve a electron-updater.

### 10.4 Quando arrivano i certificati: dove mettere i segreti

Si aggiungono in GitHub → Settings → Secrets and variables → Actions, poi nel job di release si toglie
`CSC_IDENTITY_AUTO_DISCOVERY: 'false'` e si passano come variabili d'ambiente (es. `CSC_LINK: ${{ secrets.CSC_LINK }}`),
solo sulle righe della matrice che li usano.

| Piattaforma | Segreti | A cosa servono |
|---|---|---|
| macOS (firma) | `CSC_LINK` (certificato "Developer ID Application" `.p12` in base64), `CSC_KEY_PASSWORD` | firma dell'app con hardened runtime |
| macOS (notarizzazione) | `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` — oppure `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` | `mac.notarize` non è impostato: electron-builder notarizza da solo quando trova queste variabili |
| Windows (preferito) | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | Azure Artifact Signing; in `electron-builder.yml` va aggiunto `win.azureSignOptions` con `publisherName`, `endpoint`, `certificateProfileName`, `codeSigningAccountName` |
| Windows (riserva) | `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` | certificato OV in file; con un HSM in cloud (es. SimplySign) serve invece uno strumento di firma dedicato |

Da verificare con la prima build firmata (02 §2.5, settimana 1): che la notarizzazione Apple accetti il binario di
Claude Code firmato da Anthropic dentro la nostra app e che `signIgnore` lo lasci intatto (lo dice
`verifica-hash-binario.mjs`).
