# cli — terminale di sviluppo (`pnpm dev`)

Cosa fa: la chat con l'assistente nel terminale, con le stesse regole della finestra che verrà: stesso `AgentRuntime`,
stesso Permission Broker, stesso Dispatcher, chip numerate per le domande, s/n per i permessi.

- `spalla-dev.ts` (punto d'ingresso di `pnpm dev`): calcola i percorsi (`SPALLA_HOME` li sposta tutti), chiede la modalità
  del cervello se `datiApp/config.json` non c'è (1 = incolla la chiave API, salvata nel deposito cifrato; 2 = abbonamento
  Claude, con l'avviso di beta), avvia il Nucleo (`nucleo/index.ts`: memoria, Broker, agente, onboarding, scheduler,
  Telegram se c'è un token), fa la prova di collegamento la prima volta, poi apre la chat. A fine sessione ferma il Nucleo.
  - `SPALLA_CONFIG_EREDITATA=1` lascia `CLAUDE_CONFIG_DIR` quello della macchina (login di Claude Code già presente):
    solo sviluppo. Senza, per l'abbonamento, il terminale stampa il comando `/login` da eseguire con la cartella isolata.
- `creaCli({ runtime, broker, terminale, logger, dispatcher?, onboarding?, telegramControllo?, memoria?, avviaServizi?, cartellaLavoro?, info? })`
  → `avvia()`, `gestisciRiga(riga)`, `canaleConferme`. Si registra come canale `desktop` del Broker e segna l'attività a ogni riga.
  Con `dispatcher` gli scambi passano dalla coda unica (anche quelli di Telegram) e il marcatore `[[APRI:TELEGRAM]]` del
  rituale apre la procedura guidata a fine scambio. Con `onboarding` non completato: `prepara()`, poi il
  `messaggioIniziale()` apre la prima sessione; a fine scambio controlla `stato()` e, quando diventa completato, mostra `valida()`.
  `avviaServizi: false` quando memoria e Telegram li avvia e ferma il Nucleo.
- Comandi: `/nuova` (chiude l'argomento), `/stato` (argomento, spesa del mese e tetto, presentazioni, Telegram e codici in
  attesa), `/memoria` e `/memoria ricostruisci` (contatori, indice), `/telegram` (procedura BotFather), `/telegram <riga di
  BotFather>` (collega), `/telegram <codice>` (conferma il telefono), `/aiuto`, `/esci`.
- `telegram-cli.ts`: la procedura BotFather nel terminale (`creaTelegramCli`) e il messaggio di sistema all'assistente
  dopo il collegamento chiesto dal rituale ("collegato come @…" oppure "non collegato: vai avanti come con [Dopo]").
- Resa degli eventi (`rendering.ts`): testo in streaming; strumenti come righe attenuate "· Leggo memoria/agenda.md"
  (con il ruolo tra parentesi quadre); `fine` con secondi, passi e dollari; `errore` in evidenza. Domande: opzioni numerate,
  risposta con numero/i o testo libero. Permessi (`canale-conferme-cli.ts`): scheda con anteprima e `Consenti? [s/n]`.
- `terminale.ts`: una sola domanda alla volta, in ordine, su `node:readline`; flussi iniettabili per i test.
- `logger.ts`: righe JSON in `percorsi.logs/spalla-AAAA-MM-GG.log`, senza contenuti; oscura ciò che somiglia a una chiave.
- `config-dev.ts`: lettura/scrittura tollerante della sola sezione `cervello` di `config.json` (il resto lo legge il Nucleo con `ConfigSchema`).
- `testi.ts`: adattatore di forma; le frasi vengono da `@spalla/it-copy` (`cli`, `cervello`, `permessi`).

Come provarlo: `SPALLA_HOME=/tmp/spalla-dev SPALLA_CONFIG_EREDITATA=1 pnpm dev` (usa il login già presente sul PC).
Il resto è in docs/08-sviluppo.md.

Test: `pnpm --filter @spalla/desktop exec vitest run test/cli` (terminale, resa, chip, conferme, `creaCli` con runtime finto,
onboarding, dispatcher + marcatore Telegram, `/telegram` e `/memoria` con controllo finto, config e logger).
