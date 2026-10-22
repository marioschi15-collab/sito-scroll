# runtime — il binario di Claude Code

Cosa fa (docs/02 §2.3, §2.5, §3.2):
- `creaRuntimeBinario(percorsi, opzioni?)` crea le cartelle necessarie (cartella di lavoro, dati app, `usage/`,
  `CLAUDE_CONFIG_DIR` isolato, indice, modelli, log, cartella dei segreti) e restituisce:
  - `ambiente()`: il blocco di variabili da **aggiungere** a `process.env` quando si avvia l'SDK
    (`CLAUDE_CONFIG_DIR`, `DISABLE_AUTOUPDATER`, `DISABLE_UPDATES`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`,
    `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=3`). Niente altro.
  - `percorsoEseguibile`: `undefined` nel prototipo = binario incluso nell'SDK (`pathToClaudeCodeExecutable` non serve).
- `usaConfigEreditata: true` (solo sviluppo ed E2E) lascia `CLAUDE_CONFIG_DIR` non impostato, così il binario
  usa il login già presente sulla macchina. In produzione è sempre `false`.
- `ambientePerBinario(runtime, variabiliAuth)`: l'ambiente completo da passare a `options.env` (che SOSTITUISCE
  l'ambiente). Con la configurazione isolata (produzione) parte da un ELENCO DI VARIABILI AMMESSE (`VARIABILI_AMMESSE`:
  PATH, HOME/USERPROFILE, APPDATA, TEMP/TMP/TMPDIR, SystemRoot/ComSpec/PATHEXT, LANG/LC_*, TERM, SHELL, proxy e
  certificati aziendali, DISPLAY/WAYLAND/DBUS per aprire il browser del login), poi `ambiente()` e le variabili di
  autenticazione scelte dall'utente. Nient'altro passa: né token di accesso ereditati (OAuth di Claude Code,
  `ANTHROPIC_AUTH_TOKEN`, Bedrock), né `CLAUDE_CODE_USE_*`, né `ANTHROPIC_BASE_URL`/`ANTHROPIC_CUSTOM_HEADERS` (la chiave
  va solo ad Anthropic), né `CLAUDE_CONFIG_DIR`/`CLAUDECODE` ereditati. Solo in sviluppo con `configEreditata` passa
  l'ambiente intero, meno `CLAUDE_CODE_SESSION_ID` e `ANTHROPIC_API_KEY`. Lo usano le sessioni (`agent/opzioni-sdk.ts`),
  la prova di collegamento (`auth/prova-collegamento.ts`) e il pannello `/login` della Shell, così non divergono.
- `percorsoEseguibile`: nell'app pacchettizzata la Shell lo passa SEMPRE (`avviaNucleo({ percorsoEseguibile })`, il
  binario in `app.asar.unpacked`); diventa `pathToClaudeCodeExecutable` di ogni `query()`.

Non legge mai dentro `CLAUDE_CONFIG_DIR`.

Test: `pnpm --filter @spalla/desktop exec vitest run test/runtime`.

Punti aperti: la strada C (download del binario con verifica dell'hash) si innesta qui impostando `percorsoEseguibile`.
