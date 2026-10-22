import { z } from 'zod';

/** Rami dell'onboarding (docs/05 §3.3). "comune" vale per tutti o per il ramo non riconosciuto. */
export const RAMI = ['comune', 'venditore', 'freelance', 'titolare', 'artigiano', 'dipendente'] as const;
export const RamoSchema = z.enum(RAMI);
export type Ramo = z.infer<typeof RamoSchema>;

/** Fasi dell'onboarding (docs/05 §2). */
export const FASI = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] as const;
export const FaseSchema = z.enum(FASI);
export type FaseOnboarding = z.infer<typeof FaseSchema>;

/** Catalogo dei ruoli (docs/04 §4): i nomi dei file in .claude/agents-spenti/. */
export const RUOLI_CATALOGO = [
  'segretaria',
  'copywriter',
  'contabile',
  'cercatore-clienti',
  'analista',
  'critico',
  'preventivista',
  'archivista',
] as const;
export const NomeRuoloSchema = z.enum(RUOLI_CATALOGO);
export type NomeRuolo = z.infer<typeof NomeRuoloSchema>;

/** Skill spedite nei modelli (.claude/skills/<nome>/SKILL.md). */
export const SKILL_CATALOGO = [
  'follow-up-post-visita',
  'risposta-lead-portale',
  'agenda-giorno',
  'promemoria',
  'preventivo',
  'sollecito-pagamento',
] as const;
export const NomeSkillSchema = z.enum(SKILL_CATALOGO);
export type NomeSkill = z.infer<typeof NomeSkillSchema>;

/** Strumenti che un ruolo può nominare in `tools`/`disallowedTools` (build-spec). */
export const STRUMENTI_AMMESSI = [
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'WebSearch',
  'WebFetch',
  'Bash',
  'mcp__spalla__memoria_cerca',
] as const;
export const StrumentoSchema = z.enum(STRUMENTI_AMMESSI);
export type StrumentoRuolo = z.infer<typeof StrumentoSchema>;

/** Canali (allineati a `Canale` in contratti.ts). */
export const CANALI = ['desktop', 'telegram', 'voce', 'sistema'] as const;
export const CanaleSchema = z.enum(CANALI);

/** Id di una domanda della banca: Q1, Q4a, Q10b… oppure S4 (il primo colpo). */
export const IdDomandaSchema = z.string().regex(/^(Q\d{1,2}[a-z]?|S[1-8])$/, {
  error: 'id di domanda non valido (atteso Q1, Q4a, Q10b… oppure S4)',
});

/** Data AAAA-MM-GG. */
export const DataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'data attesa nel formato AAAA-MM-GG' });
/** Ora HH:MM (24 ore). */
export const OraSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'ora attesa nel formato HH:MM' });
/** Istante ISO 8601 con fuso (es. 2026-10-22T18:41:00+02:00) o Z. */
export const IstanteSchema = z.iso.datetime({ offset: true, local: true });

/** Segnaposto dei modelli: i primi due li sostituisce l'app alla semina, gli altri due l'assistente durante le presentazioni. */
export const SEGNAPOSTO = {
  DATA_OGGI: '{{DATA_OGGI}}',
  NOME_PRODOTTO: '{{NOME_PRODOTTO}}',
  NOME_UTENTE: '{{NOME_UTENTE}}',
  MESTIERE: '{{MESTIERE}}',
} as const;
