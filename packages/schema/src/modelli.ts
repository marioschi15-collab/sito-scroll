import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Cartella dei modelli dello spazio di lavoro (packages/workspace-templates/templates), trovata risalendo
 * dalla posizione di questo file (src/ o dist/) finché compare il pacchetto gemello. Il pacchetto
 * @spalla/workspace-templates non ha codice, quindi il punto di accesso è qui.
 */
export function cartellaTemplates(): string {
  const qui = path.dirname(fileURLToPath(import.meta.url));
  let cartella = qui;
  for (let i = 0; i < 8; i++) {
    const candidato = path.join(cartella, 'workspace-templates', 'templates');
    if (existsSync(path.join(candidato, 'CLAUDE.md'))) return candidato;
    const sopra = path.dirname(cartella);
    if (sopra === cartella) break;
    cartella = sopra;
  }
  throw new Error(`Cartella dei modelli non trovata risalendo da ${qui} (attesa packages/workspace-templates/templates)`);
}

/** Percorsi notevoli dentro i modelli, relativi alla cartella di lavoro. */
export const PERCORSI_MODELLI = {
  claudeMd: 'CLAUDE.md',
  settings: path.join('.claude', 'settings.json'),
  regole: path.join('.claude', 'rules'),
  ruoliAccesi: path.join('.claude', 'agents'),
  ruoliSpenti: path.join('.claude', 'agents-spenti'),
  skill: path.join('.claude', 'skills'),
  profilo: 'profilo',
  memoria: 'memoria',
  lavoro: 'lavoro',
  primoAvvio: path.join('onboarding', 'PRIMO-AVVIO.md'),
  domande: path.join('onboarding', 'domande.md'),
  stato: path.join('onboarding', 'stato.json'),
  risposte: path.join('onboarding', 'RISPOSTE.json'),
} as const;
