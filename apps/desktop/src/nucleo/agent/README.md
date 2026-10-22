# agent — il runtime dell'assistente

Cosa fa (docs/02 §3.1-3.2, §4; docs/03 §6-7; docs/04 §3): pilota il binario di Claude Code tramite `query()`
dell'Agent SDK e traduce ciò che succede negli `EventoAssistente` del contratto.

`creaAgentRuntime({ percorsi, auth, broker, runtime, logger, config, memoria?, query?, descriviRichiesta?, adesso?, cambioUsdEur? })`

- **Uno scambio = una `query()`** con prompt testuale. La **sessione principale** si riprende per id
  (`resume`), salvato in `datiApp/sessione.json`; una sessione al giorno (contesto fresco ogni mattina).
  `nuovaSessione()` la chiude. Gli scambi sulla principale sono serializzati; `sfondo` e `programmata` girano
  in sessioni separate: `maxTurns` (8 / 20), niente `Bash`, `maxBudgetUsd` (0,10 $ predefinito con chiave API,
  oppure `tettoUsd`), modello `haiku`, oppure `agent: ruolo` quando si passa `ruolo` (il modello lo decide il
  frontmatter del ruolo).
- **Opzioni SDK** (`opzioni-sdk.ts`): `cwd = cartellaLavoro`, `env = ambientePerBinario(runtime, auth)` (di `../runtime`:
  `process.env` più le variabili del binario e di autenticazione, **senza** `CLAUDE_CODE_SESSION_ID` né una
  `ANTHROPIC_API_KEY` ereditata per caso), `settingSources: ['project']`, `permissionMode: 'default'`, `allowedTools`
  con regole di percorso `./**` (mai nomi nudi), `includePartialMessages`, `hooks`, `mcpServers.spalla`. Mai `bypass`.
- **Protezioni fisse** (`protezioni.ts`, docs/02 §2.3 e §10.2): per OGNI sessione `disallowedTools` contiene
  `Edit(./.claude/settings.json)`, `Edit(./.claude/settings.local.json)`, `Edit(./.mcp.json)`, `Edit(./.claude/skills/**)`,
  `Edit(./.claude/hooks/**)` (una regola `Edit` copre anche Write e NotebookEdit; `Write(percorso)` non viene consultata
  dal binario) e `Read(//<configClaude>/**)`, `Read(//<segreti>)` con i percorsi veri (anche con `SPALLA_HOME`). Motivo:
  con `settingSources: ['project']` il binario usa `env`, `hooks`, comandi ausiliari e `.mcp.json` del progetto anche in
  una sessione SDK; se il modello potesse riscriverli, un contenuto ostile farebbe eseguire codice alla sessione dopo.
  Il settings.json dei modelli ripete le stesse regole e `scripts/verifica-sicurezza.mjs` fallisce se spariscono.
- **Eventi** (`eventi.ts`): i delta di testo → `testo` con `parziale: true`; il blocco completo → `parziale: false`
  (chi mostra lo streaming sostituisce i frammenti con il testo completo; Telegram usa solo i completi). `tool_use` →
  `strumento` con riga breve in italiano e `ruolo` quando agisce un sotto-agente; il testo dei ruoli non passa all'utente.
  Mai nomi tecnici: `Skill` → "Seguo una procedura", `TodoWrite`/`Task*` → "Aggiorno la lista delle cose da fare",
  `EndConversation` → "Chiudo l'argomento", tutto il resto → "Uso uno strumento" (il nome resta in `strumento.nome`).
- **Permessi** (`permessi.ts`): `canUseTool` → `Broker.chiedi()` con `RichiestaPermesso` (descrizione da
  `descriviRichiesta`, di norma quella del broker); `AskUserQuestion` → `DomandaUtente` per `opzioni.rispondiDomanda`,
  risposte rimandate come `answers`; senza interfaccia risponde "scegli tu". Il ruolo si ricava dall'`agentID` tramite
  il registro alimentato dagli hook `SubagentStart/SubagentStop`. Il `signal` dell'SDK viaggia in
  `richiesta.annullamento`: se la sessione si interrompe mentre si aspetta, `attendiDecisione()` nega subito e il
  canale ritira la scheda (terminale: la prossima riga non è una risposta; Telegram: via i pulsanti).
- **Hook** (`hooks.ts`): `PreToolUse` su `Write|Edit|NotebookEdit|MultiEdit` → nega (`permissionDecision: 'deny'`) le
  scritture sui percorsi protetti, anche con percorso relativo o maiuscole diverse (cintura e bretelle rispetto alle
  regole `deny`). `PostToolUse` sugli stessi strumenti sotto `profilo/` e `memoria/` → `memoria.controllaTetti()`
  (percorso risolto rispetto alla cartella di lavoro, confronto senza maiuscole); se c'è un messaggio →
  `{ decision: 'block', reason }`. `Stop` → `memoria.appendiDiario(canale, riga)`: la riga è `opzioni.rigaDiario` se
  chi invia la passa (il rituale: "Presentazioni iniziate"), altrimenti la prima riga del messaggio; niente per il
  canale `sistema` (brief e riordino scrivono le loro righe).
- **Server in-process `spalla`** (`server-memoria.ts`): strumento `memoria_cerca(query, k?)` (zod) → `memoria.cerca()`.
- **Costi** (`costi.ts`): da ogni `result`, in `datiApp/usage/AAAA-MM.json`; il `total_cost_usd` è cumulativo per
  sessione e alla ripresa riparte dal totale salvato, quindi si registra solo la differenza (che è anche il `costoUsd`
  dell'evento `fine`). `statoCosti()` confronta
  la spesa del mese (in dollari, cambio approssimato 0,92) con `cervello.tetto_mensile_eur`; con chiave API, sopra il
  tetto le sessioni `sfondo` e `programmata` non partono (evento `errore` con codice `budget`, docs/05 §2.1), mentre la
  conversazione principale continua con un avviso (`testo`) una volta al mese: chi paga con la chiave decide lui.
- **Errori** (`errori.ts`): `limite_raggiunto` (+ `riprovaAlle` ISO dal `rate_limit_event`), `credenziali`, `rete`,
  `budget`, `altro`, con frasi italiane. Dopo un `result` di errore l'SDK rilancia: l'eccezione viene assorbita.

Test: `pnpm --filter @spalla/desktop exec vitest run test/agent` (query finta iniettata).
E2E: `RUN_E2E=1 pnpm --filter @spalla/desktop exec vitest run test/agent-e2e` (serve un login o una chiave).

Punti aperti: il `Dispatcher` (coda per canale sopra `invia`) e i `LavoroProgrammato` del brief/riordino sono del
composition root; le frasi vengono da `@spalla/it-copy` (`errori`, `assistente`, `permessi.domanda`; `testi.ts` è solo l'adattatore di forma); il cambio
USD→EUR è una costante.
