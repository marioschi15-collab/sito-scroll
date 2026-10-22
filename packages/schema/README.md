# @spalla/schema — schemi zod dei file di Spalla

Valida i file che l'assistente e l'app si scambiano: ruoli, banca domande, `config.json`, `stato.json`, `RISPOSTE.json`. Solo schemi e parser: la validazione di una cartella intera (`valida()`) è del modulo onboarding (E).

## Esporta

| Nome | Cosa |
|---|---|
| `FrontmatterRuoloSchema`, `MetadatiSpallaSchema`, `parseRuolo(md)`, `provaParseRuolo(md)`, `haSegnapostoDaCompilare(corpo)` | Frontmatter nativo dei sotto-agenti (stretto: un campo scritto male è un errore) + blocco `spalla:`. `tools`/`disallowedTools` accettano stringa o lista e tornano sempre lista di `STRUMENTI_AMMESSI`. `permissionMode` ammette solo `default`, `acceptEdits`, `plan`. |
| `DomandeSchema`, `DomandaSchema`, `parseDomande(md)`, `provaParseDomande(md)`, `estraiBloccoYaml(md)`, `domandePerRamo(banca, ramo)` | Estrae l'**unico** blocco ```yaml di `onboarding/domande.md` e lo valida: `domande[]` (id, fase, ramo, tipo, intestazione ≤12, testo, chip[], scrive_in[], nota), `primi_colpi` (3 per ramo), `squadre` (≤3 accesi per ramo). Unicità di (ramo, id); le comuni Q1-Q6 sono obbligatorie. |
| `ConfigSchema`, `OrariSchema`, `BriefSchema`, `CONFIG_PREDEFINITA` | `config.json` (docs/05 §4.4); `ConfigSchema.parse({})` è una configurazione completa. |
| `StatoOnboardingSchema`, `RisposteSchema`, `RispostaOnboardingSchema`, `ImpostazioniOnboardingSchema`, `SquadraSceltaSchema` | `onboarding/stato.json` e `RISPOSTE.json` nel formato descritto in PRIMO-AVVIO.md (gli esempi del rituale sono validati nei test). |
| `MARCATORI_APP.APRI_TELEGRAM`, `PRIMO_AVVIO_COMPLETATO_PREFISSO` | Convenzioni tra rituale e app (vedi README di workspace-templates). |
| `cartellaTemplates()`, `PERCORSI_MODELLI` | Trova `packages/workspace-templates/templates` risalendo da `import.meta.url` (funziona da `src/` e da `dist/`). |
| `RAMI`, `FASI`, `RUOLI_CATALOGO`, `SKILL_CATALOGO`, `STRUMENTI_AMMESSI`, `CANALI`, `SEGNAPOSTO`, `DataSchema`, `OraSchema`, `IstanteSchema`, `IdDomandaSchema` | Vocabolario condiviso. |
| `TETTI_MEMORIA` | Tetti dei file di memoria (docs/03 §6). |
| `ErroreSchema`, `formattaProblemi`, `Esito<T>`, `separaFrontmatter`, `parseYamlOggetto` | Errori con problemi in italiano (`z.config(locales.it())` viene impostato all'import di questo pacchetto), utilità frontmatter. |

Le funzioni `parse*` lanciano `ErroreSchema` (con `problemi: string[]`); le `provaParse*` restituiscono `{ ok, valore | problemi }`.

## Come si usa

```ts
import { cartellaTemplates, parseRuolo, parseDomande, ConfigSchema } from '@spalla/schema';
const modelli = cartellaTemplates();
const ruolo = parseRuolo(readFileSync(join(modelli, '.claude/agents-spenti/copywriter.md'), 'utf8'));
const banca = parseDomande(readFileSync(join(modelli, 'onboarding/domande.md'), 'utf8'));
const config = ConfigSchema.parse(JSON.parse(testoConfig));
```

## Prove

```sh
pnpm --filter @spalla/schema typecheck
pnpm --filter @spalla/schema test   # modelli.test.ts valida TUTTI i modelli; schema.test.ts gli schemi
```

## Punti aperti
- `yaml` è stato aggiunto come dipendenza (lo chiede la build-spec).
- Gli schemi di `stato.json`/`RISPOSTE.json` sono volutamente non stretti (l'assistente può aggiungere campi); quello dei ruoli è stretto.
