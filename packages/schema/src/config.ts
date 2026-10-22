import { z } from 'zod';
import { OraSchema } from './comune.js';

/**
 * config.json dell'app (docs/05 §4.4). Ogni campo ha un predefinito: `ConfigSchema.parse({})` è una
 * configurazione completa e valida. Vive in `datiApp`, fuori dalla cartella di lavoro.
 */
/** Orari di silenzio (docs/05 Q10). */
export const OrariSchema = z.object({
  silenzio_da: OraSchema.default('21:00'),
  silenzio_a: OraSchema.default('08:00'),
  domenica: z.enum(['silenzio', 'normale']).default('silenzio'),
});

/** Buongiorno del mattino (docs/05 Q10b). */
export const BriefSchema = z.object({
  attivo: z.boolean().default(false),
  ora: OraSchema.default('08:00'),
  canale: z.enum(['telegram', 'desktop']).default('desktop'),
});

export const ConfigSchema = z.object({
  cervello: z
    .object({
      modalita: z.enum(['chiave_api', 'abbonamento']).default('chiave_api'),
      livello: z.enum(['economico', 'equilibrato', 'massima']).default('equilibrato'),
      /** Tetto mensile in euro; null = senza tetto. */
      tetto_mensile_eur: z.number().positive().nullable().default(25),
    })
    .prefault({}),
  telegram: z
    .object({
      attivo: z.boolean().default(false),
      /** Username del bot, con la chiocciola (es. "@spalla_7k3p_bot"); null se non collegato. */
      bot: z.string().regex(/^@[A-Za-z0-9_]{5,32}$/).nullable().default(null),
      risposte_vocali: z.boolean().default(false),
    })
    .prefault({}),
  voce: z
    .object({
      desktop: z.enum(['push_to_talk', 'spento']).default('spento'),
      modello_stt: z.enum(['da_scaricare', 'in_download', 'pronto', 'non_disponibile']).default('da_scaricare'),
      hotkey: z.string().min(1).default('Alt+Space'),
    })
    .prefault({}),
  orari: OrariSchema.prefault({}),
  brief: BriefSchema.prefault({}),
  riordino_notturno: z
    .object({
      attivo: z.boolean().default(true),
      ora: OraSchema.default('03:00'),
    })
    .prefault({}),
});
export type Config = z.infer<typeof ConfigSchema>;
export type ConfigParziale = z.input<typeof ConfigSchema>;

/** La configurazione di partenza (tutti i predefiniti). */
export const CONFIG_PREDEFINITA: Config = ConfigSchema.parse({});
