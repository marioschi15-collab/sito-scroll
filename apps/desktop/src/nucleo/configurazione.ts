import fs from 'node:fs';
import path from 'node:path';
import { ConfigSchema, formattaProblemi, type Config, type ConfigParziale } from '@spalla/schema';
import type { Logger } from './contratti.js';

export interface LetturaConfigurazione {
  config: Config;
  /** Il file esisteva ed era leggibile. */
  presente: boolean;
  /** Problemi trovati (file illeggibile o campi non validi): la configurazione usata è quella con i predefiniti. */
  problemi: string[];
}

export function percorsoConfigurazione(datiApp: string): string {
  return path.join(datiApp, 'config.json');
}

function eOggetto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Legge datiApp/config.json con lo schema di @spalla/schema (docs/05 §4.4): ogni campo mancante prende il predefinito.
 * Se il file è rotto si parte dai predefiniti (conservando, se possibile, la sezione `cervello`) e si segnala.
 */
export function leggiConfigurazione(datiApp: string, logger?: Logger): LetturaConfigurazione {
  const file = percorsoConfigurazione(datiApp);
  let grezzo: unknown;
  try {
    grezzo = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (errore) {
    const mancante = (errore as NodeJS.ErrnoException).code === 'ENOENT';
    if (!mancante) logger?.avviso('config.non_leggibile', { errore: errore instanceof Error ? errore.message : String(errore) });
    return { config: ConfigSchema.parse({}), presente: false, problemi: mancante ? [] : ['config.json non è un JSON valido'] };
  }
  const esito = ConfigSchema.safeParse(grezzo);
  if (esito.success) return { config: esito.data, presente: true, problemi: [] };

  const problemi = formattaProblemi(esito.error);
  logger?.avviso('config.non_valida', { problemi: problemi.length });
  // Si salva il salvabile: la sezione cervello da sola, altrimenti tutto predefinito.
  const cervello = eOggetto(grezzo) && eOggetto(grezzo.cervello) ? ConfigSchema.shape.cervello.safeParse(grezzo.cervello) : undefined;
  const config = cervello?.success ? ConfigSchema.parse({ cervello: cervello.data }) : ConfigSchema.parse({});
  return { config, presente: true, problemi };
}

/** Riscrive config.json unendo `modifiche` a ciò che c'è (un livello per sezione) e validando il risultato. */
export function aggiornaConfigurazione(datiApp: string, modifiche: ConfigParziale, logger?: Logger): Config {
  const attuale = leggiConfigurazione(datiApp, logger).config as unknown as Record<string, unknown>;
  const unito: Record<string, unknown> = { ...attuale };
  for (const [sezione, valore] of Object.entries(modifiche)) {
    const esistente = attuale[sezione];
    unito[sezione] = eOggetto(esistente) && eOggetto(valore) ? { ...esistente, ...valore } : valore;
  }
  const config = ConfigSchema.parse(unito);
  fs.mkdirSync(datiApp, { recursive: true });
  fs.writeFileSync(percorsoConfigurazione(datiApp), JSON.stringify(config, null, 2) + '\n');
  return config;
}
