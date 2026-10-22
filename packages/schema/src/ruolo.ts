import { z } from 'zod';
import { CanaleSchema, DataSchema, NomeSkillSchema, SEGNAPOSTO, StrumentoSchema } from './comune.js';
import { ErroreSchema, formattaProblemi, type Esito } from './errori.js';
import { parseYamlOggetto, separaFrontmatter } from './frontmatter.js';

/** `tools: Read, Write` (stringa) oppure lista YAML → sempre lista di strumenti ammessi. */
const ListaStrumentiSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(StrumentoSchema).min(1));

const ListaSkillSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(NomeSkillSchema));

/** Blocco `spalla:` — metadati di prodotto ignorati da Claude Code, letti da app e onboarding (docs/04 §2). */
export const MetadatiSpallaSchema = z.strictObject({
  etichetta: z.string().min(1),
  ruolo: z.enum(['organizzazione', 'comunicazione', 'amministrazione', 'commerciale', 'analisi', 'controllo', 'preventivi', 'memoria']),
  attivo: z.boolean(),
  canali: z.array(CanaleSchema).min(1),
  costo_stimato: z.enum(['basso', 'medio', 'alto']),
  creato_da: z.enum(['onboarding', 'utente', 'sistema']),
  creato_il: z.union([DataSchema, z.literal(SEGNAPOSTO.DATA_OGGI)]),
  spiegazione_utente: z.string().min(10),
  puo_fare_da_solo: z.string().min(3),
  chiede_sempre: z.string().min(3),
});
export type MetadatiSpalla = z.infer<typeof MetadatiSpallaSchema>;

/**
 * Frontmatter di un ruolo: campi nativi dei sotto-agenti di Claude Code (sub-agents.md, "Frontmatter reference")
 * più il blocco `spalla:`. Stretto: un campo scritto male (es. `maxturns`) è un errore, perché Claude Code lo
 * ignorerebbe in silenzio. `permissionMode` è limitato alle modalità che chiedono conferma (docs/02 §10).
 */
export const FrontmatterRuoloSchema = z.strictObject({
  name: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, { error: 'name: solo minuscole, cifre e trattini (es. cercatore-clienti)' }),
  description: z.string().min(20, { error: 'description: scrivi quando usare il ruolo, nel vocabolario dell\'utente' }),
  tools: ListaStrumentiSchema.optional(),
  disallowedTools: ListaStrumentiSchema.optional(),
  model: z.enum(['sonnet', 'haiku', 'opus', 'inherit']).optional(),
  effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).optional(),
  maxTurns: z.number().int().min(1).max(50).optional(),
  memory: z.enum(['project', 'user', 'local']).optional(),
  skills: ListaSkillSchema.optional(),
  color: z.enum(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']).optional(),
  omitClaudeMd: z.boolean().optional(),
  permissionMode: z.enum(['default', 'acceptEdits', 'plan']).optional(),
  background: z.boolean().optional(),
  isolation: z.literal('worktree').optional(),
  autoCompactWindow: z.number().int().min(100_000).max(1_000_000).optional(),
  initialPrompt: z.string().optional(),
  mcpServers: z.unknown().optional(),
  hooks: z.unknown().optional(),
  experimental: z.record(z.string(), z.unknown()).optional(),
  spalla: MetadatiSpallaSchema,
});
export type FrontmatterRuolo = z.infer<typeof FrontmatterRuoloSchema>;

export interface Ruolo {
  frontmatter: FrontmatterRuolo;
  /** Il prompt di sistema del ruolo (Markdown dopo il frontmatter). */
  corpo: string;
}

/** Versione senza eccezioni di `parseRuolo`. */
export function provaParseRuolo(markdown: string): Esito<Ruolo> {
  const parti = separaFrontmatter(markdown);
  if (!parti) {
    return { ok: false, problemi: ['il file deve iniziare con una riga "---" seguita dal frontmatter e chiusa da "---"'] };
  }
  let grezzo: Record<string, unknown>;
  try {
    grezzo = parseYamlOggetto(parti.yaml, 'frontmatter');
  } catch (e) {
    return { ok: false, problemi: [(e as Error).message] };
  }
  const esito = FrontmatterRuoloSchema.safeParse(grezzo);
  if (!esito.success) return { ok: false, problemi: formattaProblemi(esito.error) };
  const corpo = parti.corpo.trim();
  if (corpo.length < 50) return { ok: false, problemi: ['corpo: il prompt del ruolo è vuoto o troppo corto'] };
  return { ok: true, valore: { frontmatter: esito.data, corpo: parti.corpo } };
}

/** Legge un file ruolo (.claude/agents/ o agents-spenti/) e restituisce frontmatter validato e corpo. Lancia ErroreSchema. */
export function parseRuolo(markdown: string): Ruolo {
  const esito = provaParseRuolo(markdown);
  if (!esito.ok) throw new ErroreSchema('Ruolo non valido', esito.problemi);
  return esito.valore;
}

/** True se il corpo contiene ancora i segnaposto che l'onboarding deve sostituire quando accende il ruolo. */
export function haSegnapostoDaCompilare(corpo: string): boolean {
  return corpo.includes(SEGNAPOSTO.NOME_UTENTE) || corpo.includes(SEGNAPOSTO.MESTIERE);
}
