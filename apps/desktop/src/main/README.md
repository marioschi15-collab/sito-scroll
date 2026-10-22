# main — la Shell di Electron (processo principale), preload e IPC

Cosa fa: avvia Spalla come app da barra (tray), apre l'unica finestra, ospita il Nucleo e collega `window.spalla`
(contratto in `src/ipc/contratto.ts`) ai servizi del Nucleo. Docs: [02 §3-4, §6, §10](../../../../docs/02-architettura.md),
[05 §2](../../../../docs/05-onboarding.md).

```
finestra (React, sandbox) ──window.spalla──▶ preload ──ipcRenderer.invoke('gruppo.metodo')──▶ ipcMain.handle
        ▲                                                                                       │ zod (ipc/schemi.ts)
        └──────────── webContents.send('evento.<nome>') ◀── HostNucleo ◀── ponte IPC ◀──────────┘
                                                              │
                                                              ▼
                                              Nucleo (avviaNucleo, in questo processo)
```

## Come si avvia e si prova

| Comando (da `apps/desktop`) | Cosa fa |
|---|---|
| `pnpm dev:app` | `electron-vite dev`: finestra con aggiornamento a caldo (la CSP si allarga solo in sviluppo per il plugin React) |
| `pnpm build:app` | `electron-vite build` → `out/main/index.js` (ESM), `out/preload/index.cjs` (CommonJS), `out/renderer/` |
| `pnpm start:app` | `electron-vite preview`: la build appena fatta |
| `pnpm rebuild:electron` / `pnpm rebuild:node` | ricompila `better-sqlite3` per Electron / di nuovo per Node; di solito non serve più (vedi "Moduli nativi") |
| `pnpm smoke:finestra` | prova a fumo della finestra sotto xvfb con Playwright (`test/e2e/finestra-smoke.mjs`; `-- --onboarding` per il passaggio vero) |
| `pnpm exec vitest run test/ipc test/main` | prove di schemi, preload, host con Nucleo finto, zip, pannello, allegati, binario |
| `pnpm typecheck` | include `test/tsconfig.shell.json` (le prove di tipo: preload ≡ `ApiSpalla`, schemi ≡ `NomeInvoke`) |

`SPALLA_HOME=/tmp/prova pnpm dev:app` tiene tutto in una cartella di prova, come il terminale di sviluppo.

## File

| File | Ruolo |
|---|---|
| `index.ts` | ciclo di vita: istanza singola, `window-all-closed` senza uscita (resta nella barra), Dock nascosto con la finestra nascosta (Mac), `setAppUserModelId` (Windows), avvio al login solo se pacchettizzata (`--nascosto`), `powerMonitor` → `scheduler.ripresaDalSonno()`, `ferma()` ordinato all'uscita (massimo 10 s), tray con Apri/Stato/Esci, un `ipcMain.handle` per metodo, solo dalla nostra pagina |
| `finestra.ts` | `BrowserWindow` (min 980×680): `contextIsolation`, `sandbox`, niente Node, niente webview, nuove finestre negate (http/https nel browser), navigazione bloccata fuori dalla pagina, permessi del browser negati salvo la copia negli appunti |
| `nucleo-host.ts` | **`HostNucleo`**: tutti i metodi dell'API (`chiama(nome, argomenti)`), eventi (`emetti`), canale conferme "desktop", chat, riavvio del Nucleo. Non importa Electron: il sistema arriva da `PiattaformaShell` |
| `ipc-ponte.ts` | nome → validazione zod → `host.chiama`; errori: frase italiana voluta (`ErroreUtente`) o generica, dettaglio solo nel log |
| `pannello-login.ts` | node-pty con il binario di Claude Code per `/login` (abbonamento) |
| `binario.ts` | trova il binario incluso nell'SDK (`@anthropic-ai/claude-agent-sdk-<piattaforma>-<arch>[-musl]/claude`, risolto dall'SDK con `createRequire`; `app.asar` → `app.asar.unpacked`); riserva: `runtime.percorsoEseguibile` |
| `allegati.ts` | file trascinati → copia in `lavoro/in-arrivo/` (max 100 MB, 20 file, mai dalle cartelle dell'app) |
| `esporta.ts` | "Esporta tutto": zip della cartella di lavoro con uno scrittore ZIP minimo (deflate di `node:zlib`, nomi UTF-8) |
| `impostazioni.ts` | `config.json` (modulo `configurazione` del Nucleo) ↔ `Impostazioni` della finestra |
| `telegram.ts` | ponte verso `nucleo.controlloTelegram` (suggerimenti, collega, codice del telefono, scollega) |
| `squadra.ts`, `memoria.ts`, `onboarding.ts` | ruoli (frontmatter `spalla:`), file di `profilo/` e `memoria/` soltanto, "Come mi sono presentato" e ri-onboarding |
| `stato-finestra.ts` | `datiApp/finestra.json` (modalità scelta, abbonamento verificato, avvio automatico fuori build) e schermata iniziale |
| `percorsi-sicuri.ts`, `icona.ts` | percorsi relativi confinati (anche contro i collegamenti simbolici), icona della barra disegnata in codice |
| `../preload/api.ts`, `../preload/index.ts` | `window.spalla` su `ipcRenderer` (unico oggetto esposto); toglie il prefisso "Error invoking remote method…" dagli errori |
| `../ipc/schemi.ts` | uno schema zod per metodo, `NOMI_INVOKE`, `NOMI_EVENTO`, `validaArgomenti` |

## Scelte da sapere

- **Il Nucleo gira nel processo principale (prototipo).** La v1 lo sposta in un `utilityProcess` (ADR-012). Per questo
  la Shell parla solo con `HostNucleo` (`chiama`, eventi, `ripresaDalSonno`, `segnaAttivitaUtente`, `righeStato`):
  basta un'implementazione che inoltri le stesse chiamate su una `MessagePort`. Restano nella Shell solo le cose di
  sistema di `PiattaformaShell` (dialoghi, notifiche, avvio al login, apertura file e link).
- **Chat.** `chat.invia` risponde appena lo scambio è in coda: tutto il resto arriva con `evento.eventoScambio`
  (anche `domanda`/`permesso` come informazione nel flusso). Le domande a chip arrivano con `evento.domanda` e si
  risolvono con `chat.rispondi` (promesse in attesa per `scambioId`). Con `rituale: true` il testo lo compone il Nucleo
  (`messaggioIniziale()`), non la finestra. Gli scambi aperti dall'app (riga di sistema dopo Telegram) hanno id
  `sistema-…`. `chat.interrompi` ferma davvero la `query` (`OpzioniInvio.annullamento` → abort dell'SDK), chiude
  subito con un "no" domande e permessi aperti e avvisa la finestra (`evento.domandaChiusa`, facoltativo); finché lo
  scambio fermato non è chiuso, `canaleDesktop` nega da solo ogni nuova richiesta di quel lavoro senza mostrarla.
- **Permessi.** Il canale "desktop" è disponibile se la finestra è in primo piano o l'utente l'ha usata negli ultimi 5
  minuti. Le schede arrivano SOLO da `canaleDesktop` (quando il Broker sceglie la finestra): le richieste nel flusso
  dello scambio non diventano schede, così una richiesta andata su Telegram non mostra un [Consenti] inutile. La scheda
  arriva senza `input` grezzo né segnale di annullamento, ma con `dettaglio` (il comando della shell o il testo scritto,
  per intero fino a 16 KB, mostrato per primo) e `spiegazione` (quella del modello, a parte); oltre il limite il Broker
  nega senza chiedere. All'annullamento o allo scadere si chiude (`evento.permessoChiuso`). La finestra può solo
  consentire o negare: `inputAggiornato` viene scartato dallo schema.
- **Cervello.** La chiave si prova con una richiesta di una riga **prima** di salvarla (con il binario, non con una
  chiamata HTTPS diretta come in docs/05: punto aperto). Cambiare modalità, livello, tetto o impostazioni riavvia il
  Nucleo a coda libera (l'`AuthProvider` e la configurazione si leggono all'avvio).
- **Pannello `/login`.** È una sessione interattiva fuori dal Permission Broker, quindi: parte solo in modalità
  abbonamento e se non si è già collegati (`cervello.avviaPannelloLogin` rifiuta altrimenti), senza argomenti, in una
  cartella VUOTA dedicata (`<datiLocali>/collegamento`, non la cartella di lavoro: niente CLAUDE.md né impostazioni
  del progetto), con l'ambiente del Nucleo (`ambientePerBinario`: solo variabili di sistema ammesse, `CLAUDE_CONFIG_DIR`
  isolato, `DISABLE_*`, nessun accesso ereditato). Si chiude da solo appena la verifica riesce e comunque dopo 15
  minuti. Su Windows usa il `conpty.dll` di node-pty (`useConptyDll`): il kill predefinito fa un `fork()` che, con il
  fusibile runAsNode spento, rilancerebbe Spalla.exe. Non leggiamo mai i suoi file: una prova di una riga dice se il
  login è riuscito; l'esito si ricorda in `finestra.json`. Nella finestra i link si aprono nel browser di sistema e il
  link di accesso ha i pulsanti [Copia] e [Apri]; Ctrl+Maiusc+C copia la selezione.
- **Apri nel sistema.** `app.apriNelSistema` apre solo cartelle vere e documenti di un elenco (md, txt, pdf, docx,
  immagini, ...), controllando nome e file reale (collegamenti) e, su Mac/Linux, il bit di esecuzione; tutto il resto
  si mostra nella sua cartella (`percorsi-sicuri.ts`, `comeAprire`).
- **Niente percorsi assoluti verso la finestra**: `StatoApp.cartellaLavoro` e "Esporta" sono `~/…`, gli allegati sono
  relativi, il codice di pairing di Telegram non attraversa il confine (l'utente lo legge sul telefono e lo digita nel
  riquadro di conferma). Eccezione voluta: il comando di una scheda di permesso può contenere percorsi (serve a decidere).
- **Errori di validazione in italiano** (`fraseProblema` in `ipc/schemi.ts`): mai la frase inglese della libreria né
  il nome del campo.
- **Niente correttore ortografico** (`spellcheck: false`): su Windows/Linux scaricherebbe i dizionari da Google.
- **Zip senza dipendenze.** Limiti: 65 535 voci, 4 GB, niente ZIP64; collegamenti simbolici saltati.

## Moduli nativi (importante per `dev:app`)

`better-sqlite3` è compilato per Node (vitest). Electron 45 ha un ABI diverso (NODE_MODULE_VERSION 150) e per lui non
esistono ancora binari precompilati. L'indice della memoria lo gestisce da solo (`nucleo/memoria/sqlite.ts`): se il
modulo nativo non si carica, passa a `node:sqlite` (integrato in Electron 45, stessa SQLite con FTS5) e lo scrive nel
log (`memoria.motore_sqlite`). Quindi `dev:app`, `smoke:finestra` e un pacchetto con `npmRebuild=false` partono senza
ricompilare nulla; `pnpm rebuild:electron` resta per chi vuole il modulo nativo anche in sviluppo (poi
`pnpm rebuild:node` per tornare alle prove). `node-pty` e `sherpa-onnx-node` usano N-API e vanno bene per entrambi.

## Verificato in questo ambiente

`electron-vite build`; `smoke:finestra` sotto xvfb (pagina con solo `window.spalla`, Benvenuto → Cervello); il passaggio
vero `--onboarding` con il login della macchina (abbonamento → [Sono già collegato] → motore pronto → chat → rituale →
due domande e due schede di permesso); un pacchetto Linux `dir` avviato sotto xvfb con il Nucleo partito su
`node:sqlite`.

Cartella dei dati di Chromium (`userData`): fissata prima del blocco di istanza singola. Con `SPALLA_HOME` è
`<SPALLA_HOME>/electron`; in sviluppo `~/.config/Spalla (sviluppo)` (o equivalente); installata `~/.config/Spalla`.

## Punti aperti

- `utilityProcess` + MessagePort al posto del Nucleo nel processo principale (interfaccia già pronta).
- `safeStorage` al posto del deposito segreti a file (il Nucleo crea il suo `StoreSegreti` dentro `avviaNucleo`: serve
  un'opzione per iniettarlo).
- Prova della chiave via HTTPS diretta (Haiku) mentre il motore scarica (strada C); qui si usa il binario incluso.
- "Due tocchi" Telegram: risponde "non ancora disponibile" finché il bot gestore non è pubblicato.
- Hotkey globale, deep link `spalla://`, aggiornamenti automatici, icona definitiva (con la pacchettizzazione).
- Azioni di GitHub in `release.yml` fissate per tag, non per SHA: da fissare quando qualcuno con accesso le verifica.
- Prova del pacchetto su Windows che apra e chiuda il pannello `/login` e controlli che non parta una seconda istanza.
- Dominio dell'informativa (`LINK_INFORMATIVA_PRIVACY` in @spalla/it-copy, `https://spalla.it/privacy`): da confermare.
- `appId` di electron-builder e `ID_APP` di `index.ts` coincidono (`it.spalla.desktop`, segnaposto): se cambia uno,
  cambia l'altro.
- Solo sviluppo: `SPALLA_MAX_TURNI` (tetto di passi per scambio, `maxTurniPerScambio` dell'host) e lo stato
  `sviluppo.accessoEreditato` (con `SPALLA_CONFIG_EREDITATA=1`) che mostra [Sono già collegato] nella procedura S0.
