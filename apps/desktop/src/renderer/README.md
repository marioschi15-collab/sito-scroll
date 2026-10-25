# La finestra (renderer React)

L'interfaccia desktop di Spalla: React 19, nessuna libreria di componenti, nessuna risorsa remota. Parla **solo** con
`window.spalla` (forma `ApiSpalla` in `../ipc/contratto.ts`, esposta dal preload con `contextBridge`): niente Node,
niente rete, niente percorsi assoluti (`cartellaLavoro` arriva già come `~/…`, mostrata in Privacy e Impostazioni). Tutte le frasi
vengono da `@spalla/it-copy` (`finestra`, `onboarding`, `cervello`, `telegram`, `permessi`, `comuni`).

## Struttura

| Percorso | Cosa fa |
|---|---|
| `index.html` | Pagina con CSP stretta (`default-src 'none'`, script e stili solo `'self'`; stili in linea ammessi per React/xterm) |
| `main.tsx`, `App.tsx` | Avvio; `App` = `FornitoreStore` → S0 oppure navigazione + sezione attiva (la chat resta viva fra le sezioni) |
| `stato/api.ts` | Unico accesso a `window.spalla`; `apiAllegati()` (facoltativa), `nuovoId()`, `messaggioErrore()` |
| `stato/store.tsx` | Store minimo (`useReducer` + contesto): stato dell'app, sezione, notifiche, bozza per la chat; azioni stabili |
| `stato/chat.ts` | Riduttore puro della chat (provato da solo): delta → append, testo completo → sostituisce, strumenti, domande, permessi |
| `stato/chatContesto.tsx` | Collega gli eventi (`eventoScambio`, `domanda`, `permesso`, `permessoChiuso`) al riduttore; rituale delle presentazioni |
| `componenti/` | Pulsante, Avviso, Scelte (radio), Interruttore (`role="switch"`), Copiabile, Barra, Pagina, Navigazione, Notifiche, Terminale (xterm) |
| `schermate/s0/` | Procedura iniziale (docs/05 §2.1): Benvenuto → Privacy → Avvio → Cervello (chiave API / abbonamento / confronto) → Motore pronto |
| `schermate/chat/` | Chat, Ingresso (casella), Messaggio (bolle e righe), Domanda (chip), SchedaPermesso |
| `schermate/squadra/`, `memoria/`, `telegram/`, `impostazioni/`, `presentazioni/` | Le altre sezioni |
| `stili/` | `base.css` (variabili, tema chiaro/scuro con `prefers-color-scheme`, focus visibile), `componenti.css`, `schermate.css` |

## Comportamenti principali

- **S0**: il passo iniziale arriva da `StatoApp.schermataIniziale`. Chiave API: controllo locale del formato
  (`sk-ant-…`), poi solo `cervello.collegaChiaveApi(chiave, tetto, livello)`, che scrive la modalità SOLO se la chiave
  passa la prova (niente `cambiaModalita` prima: una chiave sbagliata non toglie l'abbonamento);
  predefiniti 25 € ed Equilibrato. Abbonamento: avviso di beta con [Continuo] [Preferisco la chiave API], poi
  `cervello.avviaPannelloLogin()` e il pannello xterm (`terminale.scrivi/ridimensiona`, `evento.terminaleDati/Stato`),
  [Ho finito, verifica] → `cervello.verifica()`. Nel pannello i link si aprono nel browser di sistema (`linkHandler`
  per OSC 8 e un fornitore di link per il testo semplice), il link di accesso ha [Copia il link di accesso] e [Apri il
  link nel browser], Ctrl+Maiusc+C (Cmd+C sul Mac) copia la selezione. Solo sviluppo: se `StatoApp.sviluppo.accessoEreditato` (con
  `SPALLA_CONFIG_EREDITATA=1`) l'avviso mostra anche [Sono già collegato], che salta il pannello
  (`cambiaModalita('abbonamento')` + `verifica()`). Alla fine `app.stato()` e si apre la chat.
- **Chat**: Invio invia, Maiusc+Invio va a capo, `/nuova` (o [Nuovo argomento]) chiama `chat.nuovaSessione()`. Se c'è
  una domanda APERTA dello scambio in corso, il testo scritto è la risposta (`chat.rispondi`), insieme alle chip già
  toccate. C'è una sola casella in tutta la chat: il riquadro della domanda ha solo le chip e il suggerimento di
  scrivere in fondo (mentre la domanda aspetta, il segnaposto lo dice). Scelta singola: un tocco risponde; multipla: si
  conferma, al massimo `maxSelezioni` se c'è («fino a tre»). Mentre l'assistente aspetta una risposta o un permesso
  non si mostra «Ci lavoro…», e la riga «Ti faccio una domanda» non compare (c'è già il riquadro). Le domande di uno
  scambio finito, fermato o chiuso (`evento.domandaChiusa`, facoltativo) si spengono e non ricevono più il testo.
  Permessi come schede con chi agisce, descrizione, il comando o il testo PER INTERO in un riquadro scorrevole, poi la
  spiegazione dell'assistente etichettata come sua, [Consenti] [Nega] (`permessi.decidi`; [Consenti] spento se il
  testo non è arrivato intero); all'apertura si caricano anche quelli già in attesa (`permessi.inAttesa`). File trascinati:
  `allegati.aggiungi` se il preload la espone, altrimenti un avviso. [Fermati] chiama `chat.interrompi` (che ferma
  davvero il lavoro). Sotto la risposta: durata e, solo con la chiave API, la spesa in euro.
- **Presentazioni**: se `onboarding !== 'completato'`, `onboarding.prepara()` e il messaggio iniziale come primo scambio
  con `rituale: true` (non mostrato). [Vai con i consigliati] diventa pulsante fisso accanto alla casella quando
  l'assistente l'ha offerto come chip (o dalla terza domanda) e invia esattamente quel testo; sparisce quando lo
  stato dice `profiloCompletato` (marcatore `[[FINE:PROFILO]]` del rituale), dopo l'uso o dopo 10 risposte. Quando lo stato diventa
  `completato` (dopo un `fine` o da `evento.statoApp`): "Presentazioni concluse." e `onboarding.completa()` una sola
  volta, con l'elenco dei problemi.
- **Sezioni**: Squadra (`squadra.elenco/attiva/disattiva`), Memoria (elenco a gruppi, lettura in monospazio, ricerca,
  contatori con i tetti di docs/03 §6, [Rimetti in ordine la ricerca], [Cosa sai di me?]), Telegram (due tocchi se
  c'è `linkDueTocchi`, procedura BotFather con i valori da copiare, controllo locale della riga, conferma del pairing
  con il codice DIGITATO dall'utente (la finestra non lo riceve), [No, non sono io] per nome e scadenza, [Scollega] con
  conferma), Impostazioni (cervello con avviso di beta, orari, buongiorno, riordino, voce con
  avanzamento da `evento.voceAvanzamento`, avvio, esporta, apri la cartella, versione), "Come mi sono presentato"
  (`onboarding.risposte`, [Ricomincia] a tre ampiezze; "tutto" chiede di scrivere "cancella").
- `evento.apriSchermata` (facoltativo) apre una sezione; `evento.notifica` mostra un avviso.

## Accessibilità

Tutto si usa da tastiera (pulsanti veri, radio nativi, `role="switch"`), il titolo di ogni schermata prende il fuoco,
focus sempre visibile sui controlli (non sui titoli, che lo ricevono via codice a ogni schermata), chat con `role="log"`, errori dei campi con `aria-invalid` e `role="alert"`, contrasto curato
in entrambi i temi, animazioni spente con `prefers-reduced-motion`.

## Prove

`pnpm --filter @spalla/desktop test:renderer` (vitest + jsdom + Testing Library, `vitest.renderer.config.ts`, file
`test/renderer*.test.tsx`, finto `window.spalla` in `test/renderer/finto-spalla.ts`): procedura S0 e controllo della
chiave, riduttore della chat (delta/blocco, chip, schede), chat completa con rituale e [Vai con i consigliati], stati
di Telegram, memoria, squadra, impostazioni, "Come mi sono presentato". Il controllo dei tipi è
`tsc -p src/renderer/tsconfig.json` (incluso in `pnpm typecheck`). Nella finestra vera:
`pnpm --filter @spalla/desktop smoke:finestra` (Playwright sotto xvfb, vedi docs/08 §5).

## Punti aperti

- Le icone della navigazione sono emoji: su Linux senza un font emoji compaiono come quadratini; da sostituire con SVG
  in linea.
- Il pacchetto JavaScript della pagina pesa circa 780 kB (xterm, 415 kB, è già separato e caricato solo quando serve).
