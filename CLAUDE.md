# Spalla — istruzioni per Claude Code

Assistente personale per liberi professionisti, venditori e piccoli imprenditori italiani **non tecnici**: app desktop
(Electron) che al primo avvio intervista l'utente e si configura da sola. Il cervello è il Claude dell'utente, eseguito
sul suo PC tramite il binario ufficiale di Claude Code (mai modificato) pilotato dall'Agent SDK. Si comanda anche da
Telegram, a testo e a vocali. Nome di lavoro: Spalla.

Il fondatore **non programma**: spiegagli le cose in italiano semplice, senza gergo, e chiedigli conferma solo per
decisioni di prodotto. Le decisioni tecniche le prendi tu, seguendo i documenti.

## Dove sta cosa

- `docs/01-07`: visione, architettura (con le decisioni ADR in `02 §11`), memoria, ruoli, onboarding, piano, rischi.
  Sono la fonte di verità: se il codice deve divergere, aggiorna il documento nello stesso commit.
- `docs/08-sviluppo.md`: come si installa, avvia, prova e impacchetta.
- `apps/desktop/src/nucleo/`: il motore (agent, auth, broker, memoria, onboarding, telegram, voce, scheduler).
  Interfacce tra i moduli: `nucleo/contratti.ts`.
- `apps/desktop/src/main`, `preload`, `ipc`, `renderer`: la finestra. Contratto IPC: `src/ipc/contratto.ts`.
- `packages/workspace-templates/templates/`: i file italiani che diventano la cartella `~/Spalla` dell'utente
  (CLAUDE.md dell'assistente, ruoli, skill, rituale `onboarding/PRIMO-AVVIO.md`, banca domande).
- `packages/it-copy`: TUTTE le frasi mostrate all'utente. `packages/schema`: schemi zod condivisi.
- `services/manager-bot`: Worker Cloudflare per creare il bot Telegram in due tocchi.

## Comandi

Su Windows usa PowerShell; le variabili d'ambiente si scrivono `$env:NOME="valore"; comando`.

```powershell
pnpm install
pnpm typecheck            # compila i pacchetti e controlla i tipi
pnpm test                 # tutti i test (Nucleo, finestra, schema, testi, worker)
pnpm sicurezza            # controllo anti-credenziali e regole di permesso
# La finestra in sviluppo, con i dati in una cartella di prova e il login di Claude Code già presente sul PC:
$env:SPALLA_HOME="$env:TEMP\spalla-dev"; $env:SPALLA_CONFIG_EREDITATA="1"; pnpm --filter @spalla/desktop dev:app
# Il terminale di sviluppo (stesso motore, senza finestra):
$env:SPALLA_HOME="$env:TEMP\spalla-dev"; $env:SPALLA_CONFIG_EREDITATA="1"; pnpm dev
```

Per ricominciare le presentazioni da zero basta cancellare la cartella indicata da `SPALLA_HOME`.
Gli installer si costruiscono su GitHub con il workflow `Release` (`.github/workflows/release.yml`), non in locale.

## Regole che non si toccano

- Il binario di Claude Code non si modifica, non si ri-firma, non va dentro `app.asar`. La nostra app non legge mai le
  sue credenziali, non usa `CLAUDE_CODE_OAUTH_TOKEN` né `setup-token`, non usa mai `bypassPermissions`
  (`pnpm sicurezza` lo controlla). Il login dell'abbonamento passa solo dal `/login` del binario.
- Regole di permesso con percorso: `./**` è relativo alla cartella di lavoro; `/percorso` NON è assoluto (è relativo alla
  cartella delle impostazioni); l'assoluto si scrive `//percorso`.
- Durante le presentazioni la sessione principale non ha la shell (Bash/PowerShell): l'assistente legge e scrive i file
  solo con gli strumenti dei file. Un comando come `cat` o `sed` mostra all'utente una scheda incomprensibile.
- Verso l'utente mai gergo: niente "agente", "prompt", "token", "MCP", "API" (salvo la schermata della chiave API).
  Le frasi nuove vanno in `packages/it-copy`, che ha un test anti-gergo.
- La v1 prepara e non invia: nessuna email, messaggio o pagamento parte senza il sì dell'utente.
- Dentro Electron la memoria usa `node:sqlite`; `better-sqlite3` è solo per i test con Node (non si compila per
  Electron 45). Gli installer non ricompilano moduli nativi (`npmRebuild: false`).

## Come lavorare

- Branch di lavoro: `claude/claude-code-intro-1uji96`. Prima di committare: `pnpm typecheck`, `pnpm test`,
  `pnpm sicurezza` verdi. Messaggi di commit in italiano, che dicono cosa cambia e perché.
- Ogni difetto trovato provando l'app diventa anche un test, quando si può.
- Codice: TypeScript strict ESM, import relativi con suffisso `.js`, nomi di dominio in italiano, moduli piccoli.
