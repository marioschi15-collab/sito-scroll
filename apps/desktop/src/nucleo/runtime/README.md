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
  l'ambiente): `process.env` + `ambiente()` + variabili di autenticazione, **senza** `CLAUDE_CODE_SESSION_ID` (se Spalla
  gira dentro un'altra sessione di Claude Code il binario non deve ereditarne l'id) e **senza** una `ANTHROPIC_API_KEY`
  ereditata (il cervello usa solo la chiave scelta dall'utente o il login del binario). Lo usano sia le sessioni
  (`agent/opzioni-sdk.ts`) sia la prova di collegamento (`auth/prova-collegamento.ts`), così non divergono.

Non legge mai dentro `CLAUDE_CONFIG_DIR`.

Test: `pnpm --filter @spalla/desktop exec vitest run test/runtime`.

Punti aperti: la strada C (download del binario con verifica dell'hash) si innesta qui impostando `percorsoEseguibile`.
