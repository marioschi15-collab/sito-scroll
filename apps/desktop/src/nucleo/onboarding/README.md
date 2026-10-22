# onboarding — semina, stato, primo messaggio, validazione, chiusura (docs/05)

Cosa fa: prepara la cartella di lavoro dell'utente dai modelli di `@spalla/workspace-templates`, dice in che
stato sono le presentazioni, compone il **primo messaggio** della prima sessione (il rituale `PRIMO-AVVIO.md` più
data/ora e, se l'intervista era iniziata, il riepilogo di ripresa), **valida** i file che l'assistente ha scritto e
**chiude** le presentazioni. Non parla con il modello e non usa l'SDK: legge e scrive solo file dentro
`Percorsi.cartellaLavoro` e `datiApp/config.json`. Tutto il lavoro vero (le domande, i file di profilo, la squadra)
lo fa l'assistente seguendo il rituale: qui c'è la cornice meccanica che lo rende ripetibile e verificabile.

## Fabbrica

`creaOnboarding({ percorsi, logger, templates?, adesso?, fuso?, nomeProdotto? })` → `OnboardingEsteso`
(`Onboarding` di contratti.ts più qualche metodo in più).

| Metodo | Cosa fa |
|---|---|
| `stato()` | `completato` se c'è un `onboarding/RISPOSTE.json` **valido** (`RisposteSchema`: uno vuoto o troncato non chiude le presentazioni), o `stato.json` dice `completato: true`, o il rituale non c'è più (anche riscritto come `# Presentazioni completate…`) e `profilo/IDENTITA.md` non ha più "(da compilare"; `in_corso` se c'è `stato.json` (anche illeggibile); altrimenti `da_fare`. |
| `prepara()` / `semina()` | Copia l'albero dei modelli **senza mai sovrascrivere** (idempotente), sostituisce `{{DATA_OGGI}}` e `{{NOME_PRODOTTO}}` nei file di testo (`{{NOME_UTENTE}}` e `{{MESTIERE}}` restano all'assistente), garantisce cartelle e scheletro (`FILE_ATTESI`: un modello assente diventa uno stub con commento TODO, segnalato in `mancanti` e nel log), scrive `datiApp/config.json` con `CONFIG_PREDEFINITA` se manca. A presentazioni finite non fa tornare `PRIMO-AVVIO.md`. `semina()` restituisce `creati / saltati / esclusi / mancanti / configCreato`. |
| `messaggioIniziale()` | Il testo di `onboarding/PRIMO-AVVIO.md` (se sparito a metà intervista, quello dei modelli) + la riga "Adesso: giovedì 22 ottobre 2026 alle ore 09:41 (fuso orario Europe/Rome; lingua: italiano). Nei file … scrivi la data come 2026-10-22." + con `stato.json` valido e non completato: "Riprendiamo da dove eravamo: fase S3 (La tua giornata), ramo venditore. Risposte già registrate (6): Q1 «…»; … Prossima domanda: Q6. Non rifare le domande già fatte…", con la nota "Hai due minuti…" se `rinviato`. Con `stato.json` illeggibile lo dice all'assistente. |
| `valida()` | Problemi in italiano, vuoto se tutto ok: ruoli in `.claude/agents/` e `agents-spenti/` (FrontmatterRuoloSchema: strumenti ammessi, modello tra sonnet/haiku/opus/inherit, campi scritti bene; `name` uguale al file e unico nella cartella; `attivo` coerente con la cartella; niente segnaposto nei ruoli accesi; regola dei tre); `@import` di `CLAUDE.md` risolti (regole di memory.md: niente codice, spazi con `\ `, `@~/`, fino a 4 salti, relativi al file che li contiene); tetti `TETTI_MEMORIA`; `settings.json` (JSON, `permissions`, niente percorsi assoluti a una barra); `stato.json`/`RISPOSTE.json` secondo schema; a presentazioni finite anche "(da compilare" rimasto nel profilo e critico/archivista accesi. Il segnaposto `spento il AAAA-MM-GG` senza intestazione è tollerato (Claude Code lo ignora). |
| `completa()` / `completaDettagliato()` | Scrive `RISPOSTE.json` da `stato.json` se l'assistente non l'ha fatto (anche da uno stato solo in parte valido), segna `stato.json` `completato: true` (lo crea minimo se manca), appende al diario di oggi `- HH:MM [sistema] Presentazioni completate: profilo, squadra (…), primo lavoro: …` (una sola volta), elimina `PRIMO-AVVIO.md` (il rituale non usa più `rm`: lo riscrive come `# Presentazioni completate il …` e tocca all'app toglierlo), accende critico e archivista se il rituale non l'ha fatto (`ruoliAccesiDallApp`, con segnaposto generici: il riordino notturno non deve fallire per un ruolo mancante), applica `impostazioni` (orari, buongiorno, voce) a `config.json` conservando tutto il resto. Restituisce anche `telegramRichiesto` (Q11): tocca al composition root aprire il collegamento. Idempotente. |
| `riepilogoProfilo()` | "Cosa sai di me?": le direttive attive di `profilo/UTENTE.md` in italiano semplice con la provenienza ("dalle presentazioni, 22/10/2026"), nome dell'assistente e come chiamare l'utente da `IDENTITA.md`, le superate contate, le voci ancora da compilare elencate. |
| `attivaRuolo(nome, { nomeUtente?, mestiere? })` / `disattivaRuolo(nome)` / `elencoRuoli()` | Spostano il file tra `agents-spenti/` e `agents/` riscrivendo solo la riga `attivo` del blocco `spalla` (commenti e resto intatti) e, se forniti, i segnaposto del corpo. Idempotenti; nomi validati (`^[a-z0-9][a-z0-9-]*$`). Serviranno a "/ricomincia squadra". |

Funzioni libere esportate da `index.ts` per chi non vuole la fabbrica: `riepilogoProfilo(cartella)`, `attivaRuolo(cartella, nome, opz?)`,
`disattivaRuolo(cartella, nome)`, `elencoRuoli(cartella)`, `calcolaStato(cartella)`, `validaCartella({ cartella, completato })`,
`semina(...)`, `completaOnboarding(...)`, `estraiImport(markdown)`, `leggiDirettive(markdown)`, le funzioni di data (`dataIso`, `istanteConFuso`…).

## File

| File | Cosa |
|---|---|
| `index.ts` | fabbrica `creaOnboarding`, tipi `DipendenzeOnboarding` / `OnboardingEsteso`, ri-esportazioni |
| `semina.ts` | copia idempotente, segnaposto, `FILE_ATTESI` e stub, `config.json` predefinito |
| `stato.ts` | `FILE_ONBOARDING`, lettura di `stato.json`, `calcolaStato` |
| `messaggio.ts` | riga di data/ora, riepilogo di ripresa, composizione del primo messaggio |
| `validazione.ts` | tutti i controlli di `valida()` (`estraiImport` compreso) |
| `completamento.ts` | `RISPOSTE.json`, `stato.json`, diario, rituale, impostazioni → `config.json` |
| `ruoli.ts` | accendi/spegni ruoli, `impostaAttivo`, `RUOLI_SEMPRE_ACCESI`, regola dei tre |
| `profilo.ts` | direttive di `UTENTE.md` e riepilogo "cosa sai di me?" |
| `tempo.ts` | date nel fuso dell'utente (Intl), istanti ISO con scostamento |
| `fs-util.ts`, `testi.ts` | aiuti su file; tutte le frasi italiane del modulo |

## Come provare

```sh
cd /home/user/sito-scroll
pnpm --filter @spalla/schema build                 # il modulo importa @spalla/schema da dist/
pnpm --filter @spalla/desktop exec vitest run test/onboarding
pnpm --filter @spalla/desktop exec tsc --noEmit -p tsconfig.json | grep src/nucleo/onboarding
```

I test usano una `SPALLA_HOME` temporanea e una piccola cartella di modelli in `test/fixtures/onboarding-templates/`
(volutamente incompleta: 3 ruoli su 8, così si provano gli stub); un gruppo di test usa anche i modelli veri di
`packages/workspace-templates` e verifica che la cartella seminata sia valida 10/10 anche con la squadra accesa.
Orologio e fuso sono iniettati (`adesso`, `fuso`): niente dipendenza dall'ora del computer.

## Punti aperti

- Le frasi per l'utente (problemi, profilo, diario, errori, fasi) vengono da `@spalla/it-copy` (`onboarding.*`); in
  `testi.ts` restano solo le righe per l'assistente (data, ripresa) e il contenuto dei file segnaposto.
- `attivaRuolo`/`disattivaRuolo` **spostano** i file (come chiesto); il rituale e `CLAUDE.md` dicono invece all'assistente di
  **copiare** (il ruolo spento resta in `agents-spenti/` con i segnaposto) e di spegnere lasciando `spento il AAAA-MM-GG`.
  `valida()` accetta entrambe le convenzioni: unicità dei nomi per cartella, `attivo` coerente con la cartella, segnaposto tollerato.
- Gli `@import` relativi si risolvono rispetto al file che li contiene (memory.md): un `@memoria/…` dentro `profilo/UTENTE.md`
  punterebbe a `profilo/memoria/…`. I modelli non lo fanno; da sapere se mai si aggiungessero import ai file di profilo.
- `completa()` applica a `config.json` le impostazioni raccolte (orari, buongiorno, voce): è ciò che il README dei modelli
  chiede all'app, oltre al commento di contratti.ts. `telegram.richiesto` non tocca il file: va nel risultato.
- "(da compilare" rimasto in `CLAUDE.md` (blocco "Non memorizzare", Q13 con risposta "No") non è segnalato: solo i quattro file di profilo.
- Oggi tutti i 40 file attesi esistono nei modelli (`mancanti: []` con i modelli veri); gli stub servono solo come rete di sicurezza.
