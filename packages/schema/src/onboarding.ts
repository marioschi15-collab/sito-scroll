import { z } from 'zod';
import { FaseSchema, IdDomandaSchema, IstanteSchema, NomeRuoloSchema, RamoSchema } from './comune.js';
import { BriefSchema, OrariSchema } from './config.js';

/** Una risposta registrata: testo (stringa o elenco) oppure, per il primo colpo (S4), scelta + file. */
export const RispostaOnboardingSchema = z
  .object({
    id: IdDomandaSchema,
    testo: z.union([z.string(), z.array(z.string())]).optional(),
    ramo: RamoSchema.optional(),
    scelta: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    file: z.string().optional(),
    /** True se l'assistente ha dedotto la risposta da un'altra invece di fare la domanda. */
    dedotta: z.boolean().optional(),
    quando: IstanteSchema.optional(),
  })
  .refine((r) => r.testo !== undefined || r.scelta !== undefined, {
    error: 'una risposta ha "testo" oppure "scelta"',
  });
export type RispostaOnboarding = z.infer<typeof RispostaOnboardingSchema>;

/**
 * Impostazioni raccolte dall'intervista che finiscono in config.json (fuori dalla cartella di lavoro):
 * l'assistente le scrive in stato.json/RISPOSTE.json e l'app le applica.
 */
export const ImpostazioniOnboardingSchema = z.object({
  orari: OrariSchema.partial().optional(),
  brief: BriefSchema.partial().optional(),
  telegram: z.object({ richiesto: z.boolean().optional() }).optional(),
  voce: z.object({ desktop: z.enum(['push_to_talk', 'spento']).optional() }).optional(),
});
export type ImpostazioniOnboarding = z.infer<typeof ImpostazioniOnboardingSchema>;

export const SquadraSceltaSchema = z.object({
  accesi: z.array(NomeRuoloSchema).max(5),
  spenti: z.array(NomeRuoloSchema),
});

/** onboarding/stato.json: lo stato dell'intervista, riscritto dopo ogni risposta (docs/05 §1.13). */
export const StatoOnboardingSchema = z.object({
  versione: z.literal(1),
  iniziato_il: IstanteSchema,
  aggiornato_il: IstanteSchema,
  fase: FaseSchema,
  ramo: RamoSchema.optional(),
  prossima_domanda: IdDomandaSchema.nullable().optional(),
  completato: z.boolean(),
  /** True se l'utente ha scelto "Salta tutto, facciamo dopo": il rituale riprende alla prossima pausa. */
  rinviato: z.boolean().default(false),
  risposte: z.array(RispostaOnboardingSchema),
  impostazioni: ImpostazioniOnboardingSchema.optional(),
  squadra: SquadraSceltaSchema.optional(),
});
export type StatoOnboarding = z.infer<typeof StatoOnboardingSchema>;

/** onboarding/RISPOSTE.json: scritto una volta alla fine; alimenta la pagina "Come mi sono presentato" (docs/05 §4.7). */
export const RisposteSchema = z.object({
  completato_il: IstanteSchema,
  durata_minuti: z.number().min(0),
  ramo: RamoSchema.optional(),
  risposte: z.array(RispostaOnboardingSchema).min(1),
  impostazioni: ImpostazioniOnboardingSchema.optional(),
  squadra: SquadraSceltaSchema.optional(),
});
export type Risposte = z.infer<typeof RisposteSchema>;

/** Scritte che l'assistente mette da sole su una riga per far agire l'app (docs/05 S7). */
export const MARCATORI_APP = {
  /** Apre il collegamento Telegram (due tocchi o procedura guidata). */
  APRI_TELEGRAM: '[[APRI:TELEGRAM]]',
} as const;

/** Prima riga che il rituale lascia in PRIMO-AVVIO.md quando non può cancellarlo: l'app lo rimuove. */
export const PRIMO_AVVIO_COMPLETATO_PREFISSO = '# Presentazioni completate';
