import { parse as parseYaml } from 'yaml';

export interface FrontmatterSeparato {
  /** Testo YAML tra i due separatori, senza i separatori. */
  yaml: string;
  /** Tutto ciò che segue il separatore di chiusura (il corpo Markdown), senza la prima riga vuota. */
  corpo: string;
}

/**
 * Separa frontmatter e corpo di un file Markdown. Segue la regola di Claude Code: il separatore
 * di apertura `---` deve essere la PRIMA riga del file, altrimenti il file non ha frontmatter (null).
 */
export function separaFrontmatter(markdown: string): FrontmatterSeparato | null {
  const testo = markdown.startsWith('﻿') ? markdown.slice(1) : markdown;
  const righe = testo.split(/\r?\n/);
  if (righe[0]?.trim() !== '---') return null;
  const chiusura = righe.findIndex((r, i) => i > 0 && r.trim() === '---');
  if (chiusura === -1) return null;
  return {
    yaml: righe.slice(1, chiusura).join('\n'),
    corpo: righe.slice(chiusura + 1).join('\n').replace(/^\n/, ''),
  };
}

/** Parse YAML "stretto": restituisce un oggetto semplice oppure lancia con un messaggio leggibile. */
export function parseYamlOggetto(yaml: string, contesto: string): Record<string, unknown> {
  let valore: unknown;
  try {
    valore = parseYaml(yaml, { strict: true });
  } catch (e) {
    throw new Error(`${contesto}: YAML non valido (${(e as Error).message.split('\n')[0]})`);
  }
  if (valore === null || typeof valore !== 'object' || Array.isArray(valore)) {
    throw new Error(`${contesto}: il YAML deve essere una mappa chiave: valore`);
  }
  return valore as Record<string, unknown>;
}
