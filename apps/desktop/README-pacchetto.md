# Pacchetto e installer di Spalla

Come la finestra Electron diventa un DMG (macOS) o un installer EXE (Windows). Decisioni in
[docs/02 §2.5 e §9](../../docs/02-architettura.md); istruzioni passo passo in
[docs/08 §10](../../docs/08-sviluppo.md#10-pacchetto-e-installer).

## File

| File | Cosa fa |
|---|---|
| `electron-builder.yml` | configurazione di electron-builder 26 (target, asar, firma, installer, fusibili) |
| `resources/icon.png` | icona segnaposto 1024×1024; electron-builder ne ricava `.icns`/`.ico` |
| `resources/entitlements.mac.plist` | entitlements dell'hardened runtime (JIT, rete in uscita, microfono) |
| `resources/dopo-pacchetto.cjs` | hook `afterPack`: rimette i `.gitkeep` dei modelli che electron-builder scarta |
| `../../scripts/genera-icone.mjs` | genera l'icona con ffmpeg (idempotente, `--forza` per rifarla) |
| `../../scripts/verifica-hash-binario.mjs` | prova che il binario di Claude Code nell'app è identico a quello pubblicato |
| `../../.github/workflows/release.yml` | build in CI su macOS arm64, macOS x64 e Windows x64, artefatti non firmati |

`resources/` è la cartella `buildResources`: electron-builder non la copia nell'app.

## Come si costruisce

```bash
pnpm install && pnpm build:packages
pnpm --filter @spalla/desktop exec electron-vite build
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm --filter @spalla/desktop exec electron-builder --mac --arm64 --publish never
# --x64 su un Mac Intel · --win su Windows · --linux dir per una prova veloce (Linux solo per sviluppo)
node ../../scripts/verifica-hash-binario.mjs release/mac-arm64/Spalla.app
```

Uscita in `apps/desktop/release/` (ignorata da git).

## Scelte

- **Binario di Claude Code, strada A** (docs/02 §2.5): il pacchetto per piattaforma dell'SDK
  (`@anthropic-ai/claude-agent-sdk-<piattaforma>-<arch>`) entra fra le dipendenze di produzione ed è messo in
  `app.asar.unpacked` con `asarUnpack` (spawn non funziona dentro `app.asar`). Nessuna modifica: niente ri-firma
  (`mac.signIgnore`, `win.signExts: ['!claude.exe']`), e `verifica-hash-binario.mjs` lo controlla. La Shell lo trova
  UNA volta con `src/main/binario.ts` (`trovaBinarioClaude` + `fuoriDaAsar`, che riscrive `app.asar` in
  `app.asar.unpacked`) e passa lo stesso percorso a `avviaNucleo({ percorsoEseguibile })`: così arriva come
  `pathToClaudeCodeExecutable` a ogni `query()` (chat, prova di collegamento, lavori di sfondo) e al pannello `/login`.
  Senza, l'SDK risolverebbe da sé il pacchetto dentro `app.asar` e ogni spawn fallirebbe con ENOTDIR.
- **Prova del pacchetto**: `Spalla --autoverifica` (senza finestra) avvia il binario con `--version` dallo stesso
  percorso e con lo stesso `spawn`, poi esce con 0 o 1. `release.yml` la esegue sull'app estratta di ogni piattaforma,
  dopo `pnpm typecheck && pnpm test && pnpm sicurezza` (job `verifiche`, richiesto da `pacchetto`).
  In alternativa a `extraResources` (citato in docs/02) si è scelto `asarUnpack`: stessa posizione "fuori
  dall'archivio", ma la risoluzione dei moduli dall'SDK continua a funzionare senza percorsi speciali.
- **Moduli nativi** (`better-sqlite3`, `node-pty`, `sherpa-onnx-node` e i suoi pacchetti per piattaforma) e ogni
  `*.node` in `asarUnpack`; `npmRebuild: true` li ricompila per l'ABI di Electron e l'architettura di destinazione.
- **File inclusi**: solo `out/**` (electron-vite) più le dipendenze di produzione. Esclusi `react`, `react-dom`,
  `scheduler`, `@xterm/*` (già nel bundle della finestra; il processo principale non li importa), i sorgenti C di
  SQLite e le mappe `.map`.
- **Modelli della cartella di lavoro** (`packages/workspace-templates/templates`): in `extraResources`
  (`<risorse>/workspace-templates/templates`) e non in `node_modules`, perché electron-builder scarta sempre i
  `.gitkeep` e con loro le cartelle vuote del modello; l'hook `dopo-pacchetto.cjs` li rimette (13 file) prima della
  firma. `cartellaTemplates()` di `@spalla/schema` risale da `app.asar/node_modules/@spalla/schema/dist` e li trova
  al sesto passo (`process.resourcesPath`).
- **Nome**: `extraMetadata.productName: Spalla`, così Electron usa "Spalla" per la cartella dei suoi dati e per il
  blocco a istanza singola fin dall'avvio (senza, sarebbe `@spalla/desktop`).
- **macOS**: un DMG per architettura (l'architettura la sceglie la riga di comando: fissarla nel file farebbe
  ignorare `--arm64`/`--x64`), hardened runtime, categoria Produttività, `NSMicrophoneUsageDescription` in
  italiano, notarizzazione automatica solo se in ambiente ci sono le credenziali Apple.
- **Windows**: NSIS assistito per l'utente (`oneClick: false`, `perMachine: false`, "solo per me" preselezionato,
  cartella non modificabile), in italiano (LCID 1040), collegamenti su scrivania e menu Start; i dati dell'utente
  non si cancellano mai disinstallando.
- **Linux**: AppImage (e `dir`) solo per sviluppo; esclusa la copia musl del binario.
- **Fusibili di Electron**: `runAsNode`, `NODE_OPTIONS` e `--inspect` spenti; cookie cifrati; app solo da
  `app.asar` con controllo d'integrità (macOS/Windows). `grantFileProtocolExtraPrivileges` resta acceso: la finestra
  si carica da `file://` con moduli ES.
- **Deep link**: schema `spalla://` registrato (`protocols`).
- **`appId: it.spalla.desktop`** è un segnaposto da fissare prima della prima release firmata. **`publish`** non è
  impostato: la CI usa `--publish never` e carica gli artefatti (docs/08 §10.3).

## Prove fatte (22 ottobre 2026, in questo container Linux)

- Schema: `electron-builder.yml` validato con `validateConfiguration` di app-builder-lib 26.15.3 (che rifiuta le
  chiavi sconosciute); `electron-builder --help` risponde.
- `electron-builder --linux dir -c.npmRebuild=false` (per non ricompilare i moduli nativi nel `node_modules`
  condiviso) su un `out/` appena costruito: build riuscita; dentro `app.asar` ci sono `out/main`, `out/preload`,
  `out/renderer`, l'SDK, `@spalla/schema` e `@spalla/it-copy` con `dist/`; in `app.asar.unpacked` solo i moduli
  nativi e `claude-agent-sdk-linux-x64` (niente copia musl); modelli con i 13 `.gitkeep` nelle risorse;
  `verifica-hash-binario.mjs` → hash identici (SHA-256 `356733f1…ad58`, 292 MB); fusibili applicati.
- Avvio dell'app pacchettizzata con `xvfb-run`: processo principale e finestra partono, la cartella dati è
  `~/.config/Spalla`; il Nucleo si ferma su `better-sqlite3` ("Module did not self-register"), come atteso con
  `npmRebuild=false` (modulo compilato per Node). In CI la ricompilazione per Electron è attiva.
- Dimensioni (Linux x64): `app.asar` 28 MB, `app.asar.unpacked` ~316 MB, di cui ~279 MB il binario di Claude Code.

## Punti aperti

- **Da provare in CI con certificati veri** (docs/02 §2.5, settimana 1): che la notarizzazione Apple accetti il
  binario firmato da Anthropic dentro la nostra app e che `signIgnore` lo lasci intatto anche con la firma vera.
- **NSIS**: con `oneClick: false` + `perMachine: false` compare la pagina "per me / per tutti" (preselezionato "per
  me"); per un'installazione per-utente senza domande serve `oneClick: true`.
- **ID dell'app su Windows**: `src/main/index.ts` usa `app.setAppUserModelId('app.spalla.desktop')`, mentre l'installer
  crea i collegamenti con l'`appId` `it.spalla.desktop`: vanno allineati (altrimenti le notifiche Windows non si
  legano al collegamento).
- **`macos-15-intel`**: se l'etichetta sparisce, riserva descritta in docs/08 §10.3 (`--x64` su arm64 con
  `supportedArchitectures`).
- **Aggiornamenti automatici** (docs/02 §9.3): servono `publish`, il target `zip` su macOS ed electron-updater.
- **Strada C** (download del binario al primo avvio) non è ancora nel pacchetto: con la C il pacchetto per piattaforma
  dell'SDK andrà escluso da `files`.
