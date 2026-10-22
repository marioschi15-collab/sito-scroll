# auth — chi paga il cervello

Cosa fa (docs/02 §2.2-2.3, ADR-002/003): due `AuthProvider` di pari dignità.

- `creaStoreSegreti(percorsi.segreti, { identita? })` — deposito cifrato a riposo (AES-256-GCM, chiave
  derivata con scrypt da `utente@macchina`). **Segnaposto** per Electron `safeStorage` (Keychain/DPAPI): stessa
  interfaccia `leggi/scrivi/rimuovi/elenco`, altra implementazione nella shell. Il file non contiene mai testo in chiaro.
- `creaAuthChiaveApi(store, opzioni?)` — modalità chiave API: `salvaChiave()` (controllo del formato `sk-ant-…`),
  `variabiliAmbiente()` → `{ ANTHROPIC_API_KEY }`, `verifica()` → prova di collegamento con messaggio in italiano.
- `creaAuthAbbonamento(opzioni?)` — modalità abbonamento: `variabiliAmbiente()` → `{}` (il login lo fa il binario
  con `/login`, dentro il suo `CLAUDE_CONFIG_DIR`); `verifica()` → stessa prova.
- `provaCollegamento(variabili, { runtime?, query?, cwd?, timeoutMs? })` — una `query()` di una riga senza
  strumenti, `settingSources: []`, `persistSession: false`, `maxTurns: 1`; osserva solo se arriva un `result`
  e classifica l'errore (credenziali / limite / rete / tempo / altro). `query` è iniettabile nei test. L'ambiente è
  `ambientePerBinario()` di `../runtime`, lo stesso delle sessioni vere: niente `CLAUDE_CODE_SESSION_ID` ereditato
  (il sintomo "la prova adotta la sessione esterna" nel terminale di sviluppo), niente chiave trovata per caso.

Cosa NON fa, per contratto (docs/02 §2.3 punto 2): non apre il file delle credenziali del binario, non imposta
variabili di token di abbonamento, non usa `setup-token`. Il test `test/auth-sicurezza.test.ts` lo verifica
con un grep su tutto `apps/desktop/src` (stesse regole di `scripts/verifica-sicurezza.mjs`).

Test: `pnpm --filter @spalla/desktop exec vitest run test/auth`.

Punti aperti: il pannello terminale xterm.js per `/login` è della shell Electron (fuori dal prototipo CLI); dal
terminale di sviluppo l'utente esegue `/login` con il binario della propria installazione (vedi `src/cli/README.md`).
Le frasi vengono da `@spalla/it-copy` (`cervello.verifica`); `testi.ts` le ri-esporta con il nome usato dal modulo.
