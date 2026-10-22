# @spalla/workspace-templates — i modelli italiani di ~/Spalla

Pacchetto **senza codice**: la cartella `templates/` rispecchia lo spazio di lavoro dell'utente (`~/Spalla`, docs/02 §5.2) e viene copiata **così com'è** dall'onboarding (`Onboarding.prepara()`, modulo E). Il punto di accesso dal codice è `cartellaTemplates()` in `@spalla/schema`.

## Cosa c'è

| Percorso | Cosa | Fonte |
|---|---|---|
| `CLAUDE.md` | Regole operative (<150 righe): `@import` dei sei file sempre caricati, linee rosse, canali, memoria, squadra, blocco "Non memorizzare" | docs/05 §4.1, docs/03 §4.11, docs/04 §3.1 |
| `.claude/settings.json` | `allow` con `./**` (mai `/Users/...`), `ask: ["Bash"]`, `deny` su cartella del binario, `secrets.bin`, sui file che il binario usa anche in una sessione SDK (`Edit(./.claude/settings.json)`, `settings.local.json`, `.mcp.json`, `skills/**`, `hooks/**`; mai `Write(...)`: il binario non la consulta) e sui comandi shell più pericolosi nella forma usuale (una regola con `\|` dentro non combacia mai); `env` profondità 1 / 3 paralleli | docs/05 §4.3 |
| `.claude/rules/confini.md`, `canali.md` | Linee rosse della casa; registro per canale (Telegram/voce brevi, niente tabelle) | docs/05 §4.2, docs/02 §10 |
| `.claude/agents/.gitkeep` | Ruoli **accesi**: vuoto nei modelli, l'onboarding copia qui | docs/04 §2 |
| `.claude/agents-spenti/<ruolo>.md` | **Tutti gli 8 ruoli** del catalogo: segretaria, copywriter, contabile, cercatore-clienti, analista, critico, preventivista, archivista. Frontmatter nativo + blocco `spalla:`; corpo generico con `{{NOME_UTENTE}}` e `{{MESTIERE}}` | docs/04 §2.1, §4 |
| `.claude/skills/<nome>/SKILL.md` | follow-up-post-visita, risposta-lead-portale, agenda-giorno, promemoria, preventivo, sollecito-pagamento | docs/04 §1 |
| `profilo/*.md` | IDENTITA, ANIMA, UTENTE, SQUADRA: starter con righe "(da compilare durante le presentazioni)" | docs/03 §4 |
| `memoria/MEMORIA.md`, `agenda.md`, `temi/ diario/ archivio/` | Indice vuoto con frontmatter, agenda vuota con il formato in commento | docs/03 §2 |
| `lavoro/**` | messaggi, riferimenti, preventivi, liste, report, in-arrivo, cestino, annunci, fatture/bozze (solo `.gitkeep`) | docs/02 §5.2 |
| `onboarding/PRIMO-AVVIO.md` | Il rituale completo che l'assistente riceve come primo messaggio | docs/05 §4.8 espanso |
| `onboarding/domande.md` | Banca domande: tabelle leggibili + **un solo** blocco ```yaml (`domande`, `primi_colpi`, `squadre`) | docs/05 §3, docs/04 §4.2 |

## Segnaposto

- `{{DATA_OGGI}}` (AAAA-MM-GG) e `{{NOME_PRODOTTO}}` (predefinito "Spalla"): li sostituisce **l'app** alla semina, in ogni file di testo (compaiono in CLAUDE.md, settings.json, profilo, memoria, ruoli, PRIMO-AVVIO, domande).
- `{{NOME_UTENTE}}` e `{{MESTIERE}}`: solo nei **corpi dei ruoli**; li sostituisce **l'assistente** quando copia un ruolo da `agents-spenti/` ad `agents/` (istruzioni in PRIMO-AVVIO.md §S5 e in CLAUDE.md "Squadra"). I ruoli spenti conservano i segnaposto.
- Il test `packages/schema/src/modelli.test.ts` verifica che non ci siano altri segnaposto.

## Convenzioni che il resto del codice deve conoscere

- **Ruoli**: `creato_il: "{{DATA_OGGI}}"` è tra virgolette (altrimenti YAML lo legge come mappa). Nei modelli `attivo: false`; l'assistente mette `attivo: true` quando accende. Il **critico** e l'**archivista** vengono copiati in `agents/` per tutti i rami: il critico non occupa uno dei tre posti; l'archivista deve stare in `agents/` perché il lavoro programmato lo avvia come agente principale (`options.agent`, che richiede un agente definito nelle impostazioni del progetto).
- **Telegram da chat**: alla Q11 l'assistente mette da solo su una riga `[[APRI:TELEGRAM]]` (`MARCATORI_APP.APRI_TELEGRAM` in @spalla/schema): l'app lo toglie dal testo, apre il collegamento e risponde con un messaggio di sistema.
- **Impostazioni fuori cartella** (orari, buongiorno, Telegram, voce): l'assistente non può scrivere `config.json`; le mette in `onboarding/stato.json` → `impostazioni` (e in `RISPOSTE.json`); l'app le applica (`ImpostazioniOnboardingSchema`).
- **Fine del rituale**: l'assistente riscrive il file con la sola riga `# Presentazioni completate il AAAA-MM-GG` (`PRIMO_AVVIO_COMPLETATO_PREFISSO`), senza comandi di shell né conferme: `Onboarding.completa()` lo rimuove. Il segnale autorevole resta `stato.json.completato === true`.
- **Chip**: lo strumento delle domande accetta 2-4 opzioni per riquadro (sdk-docs/agent-sdk_user-input.md). domande.md conserva le liste complete di docs/05; il rituale spiega come dividerle. `intestazione` ≤ 12 caratteri.
- **Variante prototipo** (docs/06 §2): PRIMO-AVVIO.md salta Q12 e non promette il buongiorno (salva `brief.attivo: false`). Il blocco "Variante prototipo" si toglie quando il brief di M4 è dentro.
- `Write(./**)` è in `allow` come da docs/05 §4.3; permissions.md dice che le regole con percorso per `Write` non vengono consultate (vale `Edit(./**)`) e producono un avviso all'avvio: innocuo, ma da ripulire quando i documenti verranno aggiornati.

## Come si prova

```sh
pnpm --filter @spalla/schema test   # valida ogni ruolo, le skill, domande.md, CLAUDE.md, settings.json e i tetti dei file
```
