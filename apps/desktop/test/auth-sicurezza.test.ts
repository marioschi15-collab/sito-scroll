import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Controllo "mai le credenziali del binario" (docs/02 §2.3 punto 2, §10.2; stesse regole di
 * scripts/verifica-sicurezza.mjs). Le stringhe vietate sono composte a pezzi per non comparire
 * nemmeno qui come testo intero.
 */
const radiceSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

const VIETATE: Array<{ nome: string; testo: string }> = [
  { nome: 'file delle credenziali del binario', testo: ['.credentials', '.json'].join('') },
  { nome: 'token di abbonamento passato dal nostro codice', testo: ['CLAUDE_CODE_', 'OAUTH_TOKEN'].join('') },
  { nome: 'setup-token del binario', testo: ['setup', '-token'].join('') },
  { nome: 'modalità senza permessi', testo: ['bypass', 'Permissions'].join('') },
  { nome: 'interruttore dei permessi', testo: ['allowDangerously', 'SkipPermissions'].join('') },
  { nome: 'helper di chiavi che passi credenziali', testo: ['apiKey', 'Helper'].join('') },
];

function fileSorgente(cartella: string): string[] {
  const esito: string[] = [];
  for (const voce of fs.readdirSync(cartella, { withFileTypes: true })) {
    const p = path.join(cartella, voce.name);
    if (voce.isDirectory()) esito.push(...fileSorgente(p));
    else if (/\.(ts|tsx|mts|js|mjs|json)$/.test(voce.name)) esito.push(p);
  }
  return esito;
}

describe('sicurezza: il nostro codice non tocca le credenziali del binario', () => {
  it('nessun file sotto apps/desktop/src contiene riferimenti vietati', () => {
    const file = fileSorgente(radiceSrc);
    expect(file.length).toBeGreaterThan(0);
    const problemi: string[] = [];
    for (const f of file) {
      const testo = fs.readFileSync(f, 'utf8');
      for (const v of VIETATE) {
        if (testo.includes(v.testo)) problemi.push(`${path.relative(radiceSrc, f)}: ${v.nome}`);
      }
    }
    expect(problemi).toEqual([]);
  });
});
