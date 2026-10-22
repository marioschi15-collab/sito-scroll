# memoria — Memory Service

Cosa fa (docs/03): il Markdown in `profilo/` e `memoria/` è la verità; questo modulo ne tiene un **indice derivato**
(SQLite FTS5, `Percorsi.indiceMemoria`), lo tiene aggiornato osservando i file, impone i **tetti** per l'hook
`PostToolUse`, scrive la **riga meccanica del diario** per l'hook `Stop`, espone i **contatori** della scheda Memoria
e costruisce il **lavoro di riordino notturno** (archivista).

## Fabbriche

- `creaMemoryService({ percorsi, logger, adesso?, debounceMs?, intervalloPollingMs?, forzaPolling? })` → `MemoryServiceEsteso`
  (`MemoryService` di contratti.ts più `sincronizza()` e `statoIndice()`).
  - `avvia()` apre o ripara l'indice, sincronizza e accende l'osservatore; `ferma()` chiude tutto.
  - `cerca(query, k = 6)`: bm25 (pesi titolo 3, etichette 2, testo 1, contesto 0,5) × bonus di recenza lineare a 30 giorni
    (fino a +50%). Prima la lettura stretta (tutte le parole, AND), poi quella larga (OR con prefisso) per riempire fino a k.
  - `ricostruisciIndice()`: cancella il file sqlite e lo rifà dai Markdown.
  - `controllaTetti(fileRelativo, contenuto)`: `null` se ok, altrimenti il messaggio di docs/03 §6 (testi in `testi.ts`).
  - `appendiDiario(canale, primaRiga)`: `memoria/diario/AAAA-MM-GG.md`, intestazione `# Diario AAAA-MM-GG`,
    riga `- hh:mm [canale] <prima riga, max 120 caratteri>`.
  - `contatori()`: righe/byte di MEMORIA.md, caratteri di UTENTE.md, numero di schede e diari (letti dai file).
- `creaLavoroRiordino({ runtime, memoria, config, percorsi, logger, adesso?, sessioneAttiva?, tettoUsd? })` → `LavoroProgrammato`
  `riordino_notturno` (cron dall'ora di `config.riordino_notturno.ora`). `esegui()` apre una sessione `programmata`
  con `ruolo: 'archivista'` e `tettoUsd: 0.10`, canale `sistema`, con il messaggio di `costruisciPromptRiordino()`.
  Non parte se: il riordino è spento, la sessione principale è attiva (`sessioneAttiva()` oppure il segnale su file
  `datiLocali/runtime/sessione-principale.attiva` toccato negli ultimi 5 minuti), `.claude/agents/archivista.md` manca,
  un altro riordino tiene il lucchetto `datiLocali/runtime/riordino.lock`. Il `RIORDINO.log` lo scrive l'archivista.
  Nota (sub-agents.md): eseguito come agente principale, il ruolo riceve comunque `CLAUDE.md` e i suoi `@import`
  (`omitClaudeMd` vale solo come sotto-agente); il messaggio di apertura ripete le regole in forma operativa, non le
  sostituisce. A presentazioni finite l'onboarding accende critico e archivista se il rituale non l'ha fatto, così la
  notte non finisce in `ruolo_mancante`.
- `creaSegnaleAttivita(fileSessioneAttiva(percorsi))`: il composition root chiama `segna()` a ogni scambio della
  sessione principale (per esempio in `Broker.segnaAttivita` o nel Dispatcher), così il riordino non la disturba.

## File

| File | Cosa |
|---|---|
| `index.ts` | fabbrica del servizio, sincronizzazione (confronto data+dimensione), riparazione su corruzione |
| `indice.ts` | SQLite FTS5 (`unicode61 remove_diacritics 2`), schema versionato, ricerca con bonus di recenza |
| `sqlite.ts` | `apriDatabaseSql(file)`: `node:sqlite` sempre dentro Electron; `better-sqlite3` nelle prove con Node, oppure `node:sqlite` se il modulo nativo non si carica o con `SPALLA_SQLITE=integrato`; errori tradotti in `code: 'SQLITE_…'` |
| `blocchi.ts` | spezza un Markdown per intestazioni in blocchi ≤ 1.600 caratteri; etichette dal frontmatter |
| `query-fts.ts` | dalla domanda a un `MATCH` sicuro: parole tra virgolette, AND/OR/NOT, `-parola`, "frasi" |
| `scansione.ts` | elenco dei `.md` in `profilo/` e `memoria/` (archivio incluso, file nascosti esclusi) |
| `osservatore.ts` | `fs.watch` ricorsivo con debounce; ripiego su polling |
| `tetti.ts`, `testi.ts` | tetti di `@spalla/schema` e messaggi di docs/03 §6 |
| `diario.ts` | riga meccanica del diario |
| `contatori.ts` | numeri per la scheda Memoria |
| `lucchetto.ts` | lucchetto su file (pid + data, scadenza) e segnale di attività |
| `riordino.ts` | prompt dell'archivista e lavoro programmato |

## Come provare

```sh
cd /home/user/sito-scroll
pnpm --filter @spalla/schema build          # l'indice legge TETTI_MEMORIA da @spalla/schema (dist/)
pnpm --filter @spalla/desktop exec vitest run test/memoria
pnpm --filter @spalla/desktop exec tsc --noEmit -p tsconfig.json | grep src/nucleo/memoria
RUN_E2E=1 pnpm --filter @spalla/desktop exec vitest run test/memoria-riordino-e2e   # riordino vero con l'SDK (serve un login o una chiave)
```

I test usano una `SPALLA_HOME` temporanea, nessuna rete, nessuna credenziale. Quelli dell'osservatore aspettano fino a
15 secondi per evento (su Linux `fs.watch` ricorsivo risponde in meno di un secondo).

## Punti aperti

- `@spalla/schema` è importato a runtime (`TETTI_MEMORIA`): il pacchetto va compilato prima dei test del desktop
  (`pnpm -r build` o un alias di vitest verso `src/`), scelta del composition root.
- Il segnale "sessione principale attiva" va collegato dal composition root (`creaSegnaleAttivita(...).segna()`):
  senza, vale solo il callback `sessioneAttiva` passato a `creaLavoroRiordino`.
- Su Windows e macOS `fs.watch` ricorsivo è nativo; su altri sistemi parte il polling (5 s). Nessuna prova su Windows.
- Niente embedding (docs/03 §7): la ricerca è per parole; l'ordine dipende da bm25 su un corpo piccolo
  (idf vicina a zero quando una parola compare in tutti i blocchi), compensato dai pesi di colonna e dalla recenza.
