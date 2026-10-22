# @spalla/it-copy — le stringhe italiane dell'interfaccia

Tutto ciò che l'utente legge fuori dai file Markdown dello spazio di lavoro: terminale di sviluppo, Telegram, schede dei permessi, errori e limiti, schermate del cervello, cornice dell'onboarding. Oggetti `const` tipizzati; le frasi con parti variabili sono funzioni.

| Export | Contenuto | Fonte |
|---|---|---|
| `comuni` | Pulsanti ("Sì, fallo", "No", "Dopo"...), etichette dei ruoli, "chi agisce" per le conferme, livelli del cervello | docs/02 §6, docs/04 |
| `errori` | Limite raggiunto con ora di ripresa, credenziali, chiave senza credito, rete, tetto di spesa, ruolo impantanato, altra copia attiva | docs/02 §2.3-2.4, §8.4, docs/05 §6 |
| `permessi` | Scheda del Permission Broker: "La Segretaria vuole scrivere in …", pulsanti, esiti, riserva a testo "sì <id>" | docs/02 §6 |
| `telegram` | Comandi per `setMyCommands`, `/start` con la riga privacy e "solo a computer acceso", `/aiuto`, `/stato`, pairing (Managed Bots e BotFather), "Ero spento: ho ricevuto N messaggi", note vocali, allegati, 409, `/ricomincia` | docs/02 §8, docs/01 §4 |
| `cli` | Terminale di sviluppo: avvio, prompt, chip come opzioni numerate, conferme s/n, comandi, riepilogo di fine turno | build-spec |
| `cervello` | Schermata 4 di S0: le due modalità, chiave API (perché serve, 4 passi, verifica, tetto, qualità), abbonamento (avviso beta, pannello `/login`), motore; `verifica` = esiti della prova di collegamento | docs/05 §2.1, docs/02 §2.2 |
| `onboarding` | Benvenuto, pulsanti fissi, ripresa, schermate S0 (privacy, avvio automatico), "Come mi sono presentato", `/ricomincia`; più `fasi`, `errori`, `problemi` (validazione dei file), `diario`, `profilo` ("cosa sai di me?") | docs/05 |
| `assistente` | Righe mostrate mentre l'assistente lavora ("Leggo memoria/agenda.md", "Passo il lavoro alla Segretaria") | contratti.ts (eventi `strumento`) |
| `voce` | Trascrizione delle note vocali e download del modello | docs/02 §7 |
| `testi` | Oggetto unico con tutto (mantiene `testi.benvenuto`) | — |

## Chi le usa
I moduli di `apps/desktop/src/nucleo/*` e `apps/desktop/src/cli` importano da qui: ogni `testi.ts` di modulo è solo un adattatore di forma (stessi nomi di prima, valori da questo pacchetto). Il pacchetto esporta da `dist/`: `pnpm build:packages` (incluso in `pnpm typecheck`, `pnpm test`, `pnpm dev`) lo compila.

## Regola
Niente gergo verso l'utente: mai "agente", "prompt", "token", "MCP", "hook"; "API" solo in `cervello` (schermata della chiave) e nell'espressione "chiave API". `src/gergo.test.ts` lo verifica su ogni stringa, chiamando le funzioni con argomenti di prova.

```sh
pnpm --filter @spalla/it-copy typecheck && pnpm --filter @spalla/it-copy test
```
