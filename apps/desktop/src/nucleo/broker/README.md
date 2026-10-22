# broker — il Permission Broker

Cosa fa (docs/02 §6, ADR-013): trasforma ogni richiesta che l'SDK manda a `canUseTool` in una domanda
in italiano sul canale giusto e risponde consenti/nega. Nessuna via di aggiramento: in dubbio nega.

- `creaBroker({ logger, timeoutMs = 600000, inattivitaDesktopMs = 300000, adesso? })` → `Broker` più
  `inAttesa()`, `nuovoId()`, `canalePer(origine)`.
- **Instradamento**: richiesta nata su Telegram, oppure desktop inattivo da più di 5 minuti (nessuna
  `segnaAttivita('desktop')` recente) → canale `telegram` se `disponibile()`; altrimenti `desktop`; se nessun
  canale è disponibile → nega. Il timeout (10 minuti) → nega con frase in italiano. Se la richiesta porta
  `annullamento` (il `signal` dell'SDK, messo dal runtime dell'agente) e la sessione si interrompe, nega subito e toglie
  la richiesta dal registro; il canale riceve lo stesso segnale dentro la richiesta e ritira la scheda.
- **Id**: 6-8 caratteri da `crypto`, alfabeto senza `l`/`1`/`I`/`O`/`0`; unici tra le richieste in attesa.
- **Descrizioni**: `descriviRichiesta(strumento, input, ruolo?)` costruisce "Il Contabile vuole scrivere in
  ~/Fatture/nota.md" con anteprima (prime righe, comando, URL). Il broker la compila da solo se la richiesta
  arriva con `descrizione` vuota. Mai nomi tecnici nella scheda: `Skill` → "seguire una procedura", `TodoWrite`/`Task*`
  → "aggiornare la lista delle cose da fare", `EndConversation` → "chiudere l'argomento", sconosciuti → "usare uno
  strumento" (il nome resta in `richiesta.strumento` e nel log). Il ruolo lo rileva il runtime dell'agente (hook `SubagentStart` →
  `agentID` di `canUseTool`) e lo passa in `richiesta.ruolo`.
- Il registro delle richieste in attesa serve a interfacce e log; ogni richiesta e decisione finisce nel
  `Logger` senza contenuti.

Test: `pnpm --filter @spalla/desktop exec vitest run test/broker`.

Le frasi delle schede e dei motivi di rifiuto vengono da `@spalla/it-copy` (`permessi`, `comuni.chiAgisce`);
`testi.ts` espone solo i motivi con il nome usato dal modulo.
