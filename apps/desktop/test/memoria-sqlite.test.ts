import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '../src/nucleo/contratti.js';
import { spezzaInBlocchi } from '../src/nucleo/memoria/blocchi.js';
import { creaIndice, eErroreCorruzione } from '../src/nucleo/memoria/indice.js';
import { espressioniFts } from '../src/nucleo/memoria/query-fts.js';
import { apriDatabaseSql, azzeraSceltaMotore } from '../src/nucleo/memoria/sqlite.js';

/**
 * L'indice della memoria gira uguale sui due motori SQLite: better-sqlite3 (test, app pacchettizzata) e
 * node:sqlite (finestra Electron in sviluppo, quando il modulo nativo è compilato per Node e non per Electron).
 */
const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };

/** node:sqlite senza flag c'è da Node 22.13 (ed Electron 45): su un Node più vecchio si prova solo better-sqlite3. */
function nodeSqliteDisponibile(): boolean {
  try {
    return Boolean(process.getBuiltinModule?.('node:sqlite'));
  } catch {
    return false;
  }
}
const MOTORI = (['better-sqlite3', 'integrato'] as const).filter((m) => m === 'better-sqlite3' || nodeSqliteDisponibile());

describe.each(MOTORI)('indice della memoria con il motore %s', (motore) => {
  let cartella: string;
  const prima = process.env.SPALLA_SQLITE;

  beforeEach(() => {
    cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-sqlite-'));
    if (motore === 'integrato') process.env.SPALLA_SQLITE = 'integrato';
    else delete process.env.SPALLA_SQLITE;
    azzeraSceltaMotore();
  });
  afterEach(() => {
    if (prima === undefined) delete process.env.SPALLA_SQLITE;
    else process.env.SPALLA_SQLITE = prima;
    fs.rmSync(cartella, { recursive: true, force: true });
  });

  it('apre il motore richiesto', () => {
    const db = apriDatabaseSql(path.join(cartella, 'prova.sqlite'));
    expect(db.motore).toBe(motore);
    expect(db.controlloRapido()).toBe('ok');
    db.close();
  });

  it('indicizza, cerca con bm25 e estratto, rimuove, conta', () => {
    const indice = creaIndice({ file: path.join(cartella, 'indice.sqlite'), logger, adesso: () => new Date('2026-10-24T10:00:00Z') });
    const testo = '# Cliente Lamberti\n\nCerca un trilocale in via Saragozza, budget 300 mila.\n\n## Visite\n\nVisita fissata giovedì alle 18.\n';
    const blocchi = spezzaInBlocchi(testo, 'memoria/temi/cliente-lamberti.md');
    indice.indicizza('memoria/temi/cliente-lamberti.md', blocchi, Date.parse('2026-10-23T10:00:00Z'), testo.length, false);
    indice.indicizza('memoria/temi/altro.md', spezzaInBlocchi('# Altro\n\nNiente di utile qui.\n', 'memoria/temi/altro.md'), Date.now(), 30, false);

    const risultati = indice.cerca(espressioniFts('trilocale saragozza')!, 5);
    expect(risultati[0]?.file).toBe('memoria/temi/cliente-lamberti.md');
    expect(risultati[0]?.estratto).toMatch(/trilocale/i);
    expect(risultati[0]?.punteggio).toBeGreaterThan(0);
    expect(indice.statistiche()).toEqual({ file: 2, blocchi: blocchi.length + 1 });
    expect([...indice.elencoFile().keys()].sort()).toEqual(['memoria/temi/altro.md', 'memoria/temi/cliente-lamberti.md']);

    indice.rimuovi('memoria/temi/cliente-lamberti.md');
    expect(indice.cerca(espressioniFts('trilocale')!, 5)).toEqual([]);
    expect(indice.statistiche()).toEqual({ file: 1, blocchi: 1 });
    indice.chiudi();
  });

  it('una transazione che fallisce non lascia scritture a metà', () => {
    const db = apriDatabaseSql(path.join(cartella, 'tx.sqlite'));
    db.exec('CREATE TABLE t (x INTEGER PRIMARY KEY)');
    const ins = db.prepare('INSERT INTO t (x) VALUES (?)');
    expect(() =>
      db.transazione(() => {
        ins.run(1);
        ins.run(1);
      }),
    ).toThrow();
    expect(db.prepare('SELECT count(*) AS n FROM t').get()).toMatchObject({ n: 0 });
    db.close();
  });

  it('un file rovinato dà un errore riconosciuto come corruzione, e l\'indice si ripara', () => {
    const file = path.join(cartella, 'rotto.sqlite');
    fs.writeFileSync(file, 'questo non è un database SQLite '.repeat(200));
    let errore: unknown;
    try {
      const db = apriDatabaseSql(file);
      db.controlloRapido();
      db.close();
    } catch (e) {
      errore = e;
    }
    expect(eErroreCorruzione(errore)).toBe(true);

    const indice = creaIndice({ file, logger });
    indice.apri();
    expect(indice.statistiche()).toEqual({ file: 0, blocchi: 0 });
    indice.chiudi();
  });
});
