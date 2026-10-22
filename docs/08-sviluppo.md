# 08 — Sviluppo: come si installa, si avvia e si prova il prototipo

> Stato: prototipo "Nucleo + terminale di sviluppo", 22 ottobre 2026. La shell Electron non c'è ancora: tutto quello
> che la finestra farà passa oggi da un terminale (`pnpm dev`) che usa gli stessi servizi, lo stesso Permission Broker e
> le stesse regole. Le decisioni di architettura sono in [02](02-architettura.md); qui c'è solo il "come si fa girare".

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
terminale stampa il comando `CLAUDE_CONFIG_DIR=… claude /login` da eseguire a parte (il pannello xterm arriverà con
Electron).

## 3. Variabili d'ambiente

| Variabile | Effetto |
|---|---|
| `SPALLA_HOME` | Sposta cartella di lavoro, dati dell'app e dati locali sotto questa cartella (sviluppo e test). |
| `SPALLA_CONFIG_EREDITATA=1` | Lascia `CLAUDE_CONFIG_DIR` quello della macchina: il binario trova il login di Claude Code già fatto. Solo sviluppo/E2E; in produzione la cartella è sempre isolata. |
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
```

Per un modulo solo: `pnpm --filter @spalla/desktop exec vitest run test/<modulo>` (`runtime`, `auth`, `broker`,
`scheduler`, `agent`, `cli`, `memoria`, `telegram`, `voce`, `onboarding`, `nucleo`). I pacchetti:
`pnpm --filter @spalla/schema test`, `pnpm --filter @spalla/it-copy test`, `pnpm --filter @spalla/manager-bot test`.

Numeri al 22 ottobre 2026: 264 test desktop (+1 E2E con `RUN_E2E=1`), 35 schema, 11 it-copy, 7 Worker; tutti verdi.
La prova `smoke:onboarding` in questo ambiente: due scambi, 22 passi, 0,34 $, `profilo/IDENTITA.md` con "Bruno".

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
apps/desktop/test/       vitest per modulo; test/e2e/onboarding-smoke.ts
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
| Modalità chiave API (deposito cifrato, contatore mensile in euro con tetto) e abbonamento (login ereditato) | il pannello `/login` isolato è Electron-only |
| Permission Broker: schede in italiano nel terminale, pulsanti su Telegram, timeout 10 minuti, ruolo che agisce | mai bypass, nemmeno per i lavori programmati |
| Domande con opzioni (AskUserQuestion → chip numerate; su Telegram pulsanti) | testo libero sempre permesso |
| Memoria: indice FTS5 con bonus di recenza, osservatore dei file, tetti (hook), diario (hook Stop), `memoria_cerca` | indice ricostruibile, schema versionato |
| Onboarding: semina, rituale come primo messaggio, ripresa, chiusura automatica, validazione dei file, ruoli acceso/spento | prova E2E `smoke:onboarding` |
| Telegram: pairing con codice, allowlist, conferme, domande, note vocali (con i modelli scaricati), allegati in `lavoro/in-arrivo`, recupero dopo spegnimento | un solo proprietario; `/ricomincia` e `/stop` rispondono "si fa dal computer" |
| Riordino notturno con l'archivista (sessione programmata, tetto 0,10 $) | parte solo se `.claude/agents/archivista.md` esiste (lo copia il rituale a S5; se non l'ha fatto, lo accende l'app a presentazioni finite). Prova vera: `RUN_E2E=1 pnpm --filter @spalla/desktop exec vitest run test/memoria-riordino-e2e` |
| Marcatore `[[APRI:TELEGRAM]]` del rituale → procedura guidata → messaggio di sistema all'assistente | |

| Segnaposto o fuori perimetro | Stato |
|---|---|
| Shell Electron (finestre, tray, hotkey, notifiche, `powerMonitor`, `safeStorage`, avvio al login, aggiornamenti) | non iniziata; il Nucleo è pensato per girare in un `utilityProcess` |
| Buongiorno del mattino (`brief_mattino`) | base funzionante in `nucleo/brief.ts`, spenta (`config.brief.attivo: false`, docs/06 §2); al canale desktop arriva solo via `suBrief` |
| Voce al computer (push-to-talk, TTS, risposte vocali su Telegram) | fuori perimetro; `/voce on` risponde "non disponibile" |
| Managed Bots "due tocchi" | client + Worker pronti e testati, non collegati al terminale (manca il deploy del Worker e la finestra) |
| Deposito segreti | AES-256-GCM con chiave derivata da utente@macchina: segnaposto di `safeStorage` |
| Secondo utente Telegram, `/ricomincia` a tre ampiezze, pagina "Come mi sono presentato" | API pronte (`aggiungiProprietario`, `attivaRuolo`/`disattivaRuolo`, `RISPOSTE.json`), nessuna interfaccia |
| Fornitura del binario (strada C: download verificato) | si usa il binario incluso nell'SDK |

## 8. Cose da sapere

- **Cartella "non fidata".** In una sessione SDK il binario non mostra mai la finestra di fiducia e **non usa** le regole
  `permissions.allow` di `.claude/settings.json` (documentazione dei permessi, "What runs before you trust a folder"):
  lo scrive sul suo stderr (nel log come `binario.stderr`). Hook, blocco `env`, `deny` e `ask` restano in vigore. Non è
  un problema per il prototipo: la stessa lista `allow` viene passata dall'SDK con `allowedTools` (docs/02 §3.2). Resta
  da decidere per Electron se e come marcare la cartella come fidata senza toccare la cartella di configurazione del
  binario (vedi [07](07-rischi-e-domande-aperte.md)).
- **Sessione dentro una sessione.** Se il terminale gira dentro un'altra sessione di Claude Code (es. da uno strumento di
  sviluppo), il binario erediterebbe `CLAUDE_CODE_SESSION_ID`: il runtime la toglie dall'ambiente del binario.
- **Avviso `CLAUDE_SDK_CAN_USE_TOOL_SHADOWED`.** Voluto: le regole nude (Glob, Grep, WebSearch, WebFetch, Agent,
  AskUserQuestion, `memoria_cerca`) non passano dal Broker (docs/02 §3.2). Il terminale lo manda nel log.
- **`Write(./**)`** è accettata ma, per la documentazione dei permessi, è `Edit(./**)` la regola che governa anche Write.
- **Le frasi.** Tutto ciò che l'utente legge sta in `packages/it-copy/src`; i `testi.ts` dei moduli sono solo adattatori
  di forma. Un test (`gergo.test.ts`) vieta "agente", "prompt", "token", "MCP", "API" (salvo "chiave API").

## 9. Prossimi passi (M3-M4 del piano, [06](06-piano-prototipo.md))

1. **Shell Electron**: `utilityProcess` che chiama `avviaNucleo`, IPC su MessagePort con schemi zod, finestra chat
   (React) che consuma `Dispatcher.gestisci` con un `rispondiDomanda` a chip e un `CanaleConferme` "desktop"; tray;
   `powerMonitor.on('resume') → scheduler.ripresaDalSonno()`; `safeStorage` al posto del deposito a file; pannello
   xterm.js per `/login` nella cartella isolata; schermate S0 con i testi di `it-copy.cervello` e `it-copy.onboarding.s0`.
2. **Telegram "due tocchi"**: deploy del Worker, `creaClientManagedBots().avviaCollegamento()` dalla schermata
   Telegram, `canale.aggiungiProprietario(id)` alla consegna; `/ricomincia` e `/stop` cablati (`attivaRuolo`,
   `nuovaSessione`, interruzione della `query`).
3. **Voce**: schermata che chiama `VoiceService.prepara()` con la barra di avanzamento; confronto Parakeet/Whisper
   sugli audio italiani (spike S-F).
4. **Buongiorno del mattino**: accendere `brief_mattino` dalle impostazioni e mostrarlo nella finestra (desktop) o su
   Telegram; rispettare gli orari di silenzio.
5. **Pipeline**: build firmate, `electron-builder`, strada C per il binario, migrazione dei modelli di spazio di lavoro
   all'aggiornamento.
