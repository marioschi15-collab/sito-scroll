# nucleo — composition root (`avviaNucleo`)

Cosa fa: costruisce e collega tutti i servizi di lunga durata del Nucleo (docs/02 §3-4) e restituisce le maniglie alle
interfacce. È l'unico posto in cui i moduli si incontrano: ognuno di loro conosce solo `contratti.ts`.

```ts
const nucleo = await avviaNucleo({ percorsi: calcolaPercorsi(), modalitaDev: true });
await nucleo.dispatcher.gestisci({ testo: 'ciao', canale: 'desktop' }, async (evento) => mostra(evento), { rispondiDomanda });
await nucleo.ferma();
```

## Cosa costruisce, in ordine

1. `creaRuntimeBinario` (cartelle, variabili del binario; `usaConfigEreditata` solo in sviluppo/E2E).
2. Logger su file (`cli/logger.ts`), o quello passato.
3. `config.json` con `ConfigSchema` (`configurazione.ts`: predefiniti per i campi mancanti, file rotto → predefiniti e avviso).
4. Deposito segreti e `AuthProvider` (chiave API o abbonamento, da `config.cervello.modalita`).
5. `MemoryService` (indice + osservatore), avviato subito. L'indice usa `node:sqlite` dentro Electron (sempre) e
   `better-sqlite3` nelle prove con Node, con ripiego su `node:sqlite` se il modulo nativo non si carica (`memoria/sqlite.ts`).
6. Permission Broker e `AgentRuntime` (con `descriviRichiesta` del broker e la memoria per hook e `memoria_cerca`).
7. Onboarding (`creaOnboarding`), senza seminare: lo fa l'interfaccia con `prepara()` prima del primo messaggio.
8. **Dispatcher** (`dispatcher.ts`): coda unica sulla sessione principale per tutti i canali; eventi al canale chiamante;
   toglie dal testo i marcatori per l'app (`marcatori.ts`, es. `[[APRI:TELEGRAM]]`) e avvisa chi li ascolta a fine
   scambio, a coda libera; segna il file "sessione principale attiva" per il riordino notturno; `dopoScambio` chiude le
   presentazioni (`onboarding.completaDettagliato()`) quando `stato()` diventa `completato`.
9. Voce (`creaVoiceService`, solo per le note vocali Telegram; i modelli si scaricano con `prepara()`).
10. Telegram (`creaCanaleTelegram`) se c'è un token: dai segreti (`token_telegram`), poi da `TELEGRAM_BOT_TOKEN`.
    `controlloTelegram` (`controllo-telegram.ts`) permette di collegarlo dopo: verifica la riga di BotFather, salva il
    token, avvia il canale, aggiorna `config.json`, tiene i codici di pairing in attesa.
11. Scheduler con `riordino_notturno` (memoria) e `brief_mattino` (`brief.ts`: base funzionante, spenta finché
    `config.brief.attivo` è false, docs/06 §2).

`ferma()` spegne scheduler, Telegram, voce e memoria.

## File

| File | Ruolo |
|---|---|
| `index.ts` | `avviaNucleo(opzioni): Promise<Nucleo>` e le ri-esportazioni |
| `dispatcher.ts` | `creaDispatcher({ runtime, broker, logger, segnaleAttivita?, marcatori? })` → `gestisci`, `suMarcatore` (a fine scambio), `suMarcatoreVisto` (subito, appena il marcatore compare: es. `[[FINE:PROFILO]]` durante il rituale), `dopoScambio`, `inCoda` |
| `marcatori.ts` | `creaFiltroMarcatori()`: toglie i marcatori anche in streaming (trattiene un possibile inizio) |
| `configurazione.ts` | `leggiConfigurazione(datiApp)`, `aggiornaConfigurazione(datiApp, modifiche)` |
| `controllo-telegram.ts` | `creaControlloTelegram(...)`: collega, conferma il codice, suggerimenti BotFather |
| `brief.ts` | `creaLavoroBrief({ runtime, config, logger, consegna? })`, `costruisciPromptBrief` |
| `identita.ts` | `leggiIdentita(cartellaLavoro)`: nome dell'assistente e dell'utente da `profilo/IDENTITA.md` |

## Opzioni utili

`config` (già letta), `logger`, `usaConfigEreditata`, `tokenTelegram`, `avviaTelegram: false`, `linkPrivacy`,
`suEventoTelegram` (codici di pairing), `suBrief` (testo del buongiorno quando non va su Telegram), `query` e `adesso`
(iniettabili nelle prove), `motoreVoce: 'nessuno'` (prove).

## Chi lo chiama

- Il terminale di sviluppo (`cli/spalla-dev.ts`, `pnpm dev`).
- La finestra Electron: `main/index.ts` calcola UNA volta il binario (`trovaBinarioClaude`, fuori da `app.asar`) e lo
  passa ad `avviaNucleo({ percorsoEseguibile })`: senza, nell'app pacchettizzata ogni `query()` fallirebbe (ENOTDIR).
  Poi passa `avviaNucleo` a `creaHostNucleo` (`main/nucleo-host.ts`) con
  `modalitaDev = !app.isPackaged`, il logger su file e `nomeProdotto`. L'host registra il `CanaleConferme` "desktop",
  ascolta il marcatore `[[APRI:TELEGRAM]]`, traduce `window.spalla` in chiamate al Nucleo (`dispatcher.gestisci` con un
  `rispondiDomanda` a chip) e riavvia il Nucleo a coda libera quando cambiano cervello, chiave o impostazioni.
  Il Nucleo gira nel processo principale (prototipo); `HostNucleo` è la cucitura per l'`utilityProcess` (ADR-012).

## Prove

`pnpm --filter @spalla/desktop exec vitest run test/nucleo` (filtro marcatori, dispatcher con coda ed errori, configurazione,
identità, brief, `avviaNucleo` con una `query` finta che attraversa il vero `AgentRuntime`). La prova end-to-end delle
presentazioni è `apps/desktop/test/e2e/onboarding-smoke.ts` (`pnpm smoke:onboarding`, serve un login).

## Punti aperti

- `/ricomincia` (ri-onboarding a tre ampiezze) e `/stop` non sono cablati: il canale Telegram risponde "si fa dal computer".
- Il buongiorno al canale desktop arriva solo tramite `suBrief` (il terminale di sviluppo non lo mostra: la finestra lo farà).
- Il logger vive ancora in `cli/logger.ts` (il Nucleo e la shell Electron lo importano da lì).
- Il deposito segreti è il segnaposto AES-256-GCM di `auth/`; con Electron si passa a `safeStorage` (stessa interfaccia).
