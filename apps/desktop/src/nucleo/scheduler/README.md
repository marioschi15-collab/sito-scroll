# scheduler — lavori programmati

Cosa fa (docs/02 §3.1, §4; docs/03 §8): esegue i lavori ricorrenti (`brief_mattino`, `riordino_notturno`,
`promemoria`) con `croner`, in ora locale, uno alla volta (`protect`), e recupera quelli saltati mentre il PC dormiva.

- `creaScheduler({ logger, adesso?, finestreUtiliMs?, fusoOrario? })` → `Scheduler` più `lavori()`,
  `eseguiOra(nome)`, `rimuovi(nome)`.
- `registra(lavoro)` valida subito l'espressione cron (5 campi) e, se lo scheduler è già avviato, la accende.
- `ripresaDalSonno()` (da collegare a `powerMonitor` "resume" nella Shell): per ogni lavoro attivo cerca
  un'occorrenza saltata **dopo** l'avvio dello scheduler e dopo l'ultima esecuzione, ma **entro la finestra utile**
  (brief 3 ore, riordino 6 ore, promemoria 1 ora): se c'è, lo esegue una sola volta. Un brief delle 08:00 recuperato
  alle 10:30 ha senso; alle 15:00 no.
- Nessun contenuto nei log: solo nome del lavoro, orari e durata.

Chi crea i `LavoroProgrammato` (brief con sessione SDK breve su Haiku e `maxBudgetUsd`, riordino con il ruolo
archivista) è il composition root: questo modulo non conosce l'SDK.

Test: `pnpm --filter @spalla/desktop exec vitest run test/scheduler`.
