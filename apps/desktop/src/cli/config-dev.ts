import fs from 'node:fs';
import path from 'node:path';
import type { ConfigRuntime } from '../nucleo/agent/index.js';
import type { LivelloModello, ModalitaCervello } from '../nucleo/contratti.js';

/**
 * Lettura/scrittura tollerante di datiApp/config.json per il terminale di sviluppo (docs/05 §4.4).
 * Lo schema completo è in @spalla/schema: qui serve solo la sezione `cervello`, e tutto il resto viene conservato.
 */
export type ConfigDev = ConfigRuntime & Record<string, unknown>;

const MODALITA: ModalitaCervello[] = ['chiave_api', 'abbonamento'];
const LIVELLI: LivelloModello[] = ['economico', 'equilibrato', 'massima'];

export function percorsoConfig(datiApp: string): string {
  return path.join(datiApp, 'config.json');
}

/** undefined se il file manca o non ha una modalità valida. */
export function leggiConfig(datiApp: string): ConfigDev | undefined {
  try {
    const dati = JSON.parse(fs.readFileSync(percorsoConfig(datiApp), 'utf8')) as Record<string, unknown>;
    const cervello = dati.cervello as Partial<ConfigRuntime['cervello']> | undefined;
    if (!cervello || !MODALITA.includes(cervello.modalita as ModalitaCervello)) return undefined;
    return {
      ...dati,
      cervello: {
        modalita: cervello.modalita as ModalitaCervello,
        livello: LIVELLI.includes(cervello.livello as LivelloModello) ? (cervello.livello as LivelloModello) : 'equilibrato',
        tetto_mensile_eur: typeof cervello.tetto_mensile_eur === 'number' ? cervello.tetto_mensile_eur : null,
      },
    };
  } catch {
    return undefined;
  }
}

export function scriviConfig(datiApp: string, config: ConfigDev): void {
  fs.mkdirSync(datiApp, { recursive: true });
  fs.writeFileSync(percorsoConfig(datiApp), JSON.stringify(config, null, 2) + '\n');
}

export function configIniziale(modalita: ModalitaCervello, esistente: Record<string, unknown> = {}): ConfigDev {
  return {
    ...esistente,
    cervello: { modalita, livello: 'equilibrato', tetto_mensile_eur: modalita === 'chiave_api' ? 25 : null },
  };
}
