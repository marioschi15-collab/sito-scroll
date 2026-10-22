import Database from 'better-sqlite3';
import type { DatabaseSync, StatementSync } from 'node:sqlite';

/**
 * Il piccolo sottoinsieme di SQLite che serve all'indice della memoria, con due motori:
 * - `better-sqlite3` (predefinito): modulo nativo, compilato per la versione di Node che lo carica;
 * - `node:sqlite` (integrato in Node 22.13+ ed Electron 45): stessa libreria SQLite, FTS5 compreso.
 *
 * Perché due: lo stesso `node_modules` serve ai test (Node) e alla finestra (Electron), che hanno ABI diverse.
 * Se il modulo nativo non si carica (es. "Module did not self-register", NODE_MODULE_VERSION diversa) si passa
 * da soli al motore integrato, una volta per processo. L'app pacchettizzata ha il modulo ricompilato per Electron.
 * `SPALLA_SQLITE=integrato` forza il motore integrato (test e diagnosi).
 */

export interface IstruzioneSql {
  run(...parametri: unknown[]): unknown;
  get(...parametri: unknown[]): unknown;
  all(...parametri: unknown[]): unknown[];
}

export interface DatabaseSql {
  readonly motore: MotoreSql;
  prepare(sql: string): IstruzioneSql;
  exec(sql: string): void;
  /** `PRAGMA quick_check`: 'ok' se il file è sano. */
  controlloRapido(): string;
  /** Esegue `fn` in una transazione (BEGIN/COMMIT, ROLLBACK se lancia). */
  transazione<T>(fn: () => T): T;
  close(): void;
}

export type MotoreSql = 'better-sqlite3' | 'integrato';

let motoreScelto: MotoreSql | undefined;

/** Solo per i test: dimentica la scelta del motore fatta in questo processo. */
export function azzeraSceltaMotore(): void {
  motoreScelto = undefined;
}

export function motoreSqlAttuale(): MotoreSql | undefined {
  return motoreScelto;
}

/**
 * Apre (o crea) il database. `allaScelta` viene chiamata una volta sola, quando il processo ripiega sul motore
 * integrato, con il motivo (per il registro).
 */
export function apriDatabaseSql(file: string, allaScelta?: (motore: MotoreSql, motivo?: string) => void): DatabaseSql {
  if (process.env.SPALLA_SQLITE === 'integrato') return apriIntegrato(file);
  if (motoreScelto === 'integrato') return apriIntegrato(file);
  try {
    const db = new Database(file);
    motoreScelto = 'better-sqlite3';
    return avvolgiBetter(db);
  } catch (errore) {
    // Un errore di SQLite (file non apribile, permessi) resta un errore: si ripiega solo se manca il modulo nativo.
    if (errore instanceof Database.SqliteError) throw errore;
    motoreScelto = 'integrato';
    allaScelta?.('integrato', errore instanceof Error ? errore.message.split('\n')[0] : String(errore));
    return apriIntegrato(file);
  }
}

// ---------- better-sqlite3 ----------

function avvolgiBetter(db: Database.Database): DatabaseSql {
  return {
    motore: 'better-sqlite3',
    prepare: (sql) => db.prepare(sql),
    exec: (sql) => void db.exec(sql),
    controlloRapido: () => String(db.pragma('quick_check', { simple: true })),
    transazione: (fn) => db.transaction(fn)(),
    close: () => void db.close(),
  };
}

// ---------- node:sqlite ----------

interface ErroreSqliteNode {
  code?: string;
  errcode?: number;
  errstr?: string;
}

/** Nomi dei codici SQLite che l'indice distingue (eErroreCorruzione); gli altri restano SQLITE_ERROR. */
const CODICI: Record<number, string> = { 11: 'SQLITE_CORRUPT', 26: 'SQLITE_NOTADB', 522: 'SQLITE_IOERR_SHORT_READ', 5: 'SQLITE_BUSY', 14: 'SQLITE_CANTOPEN' };

/** Rende gli errori di node:sqlite simili a quelli di better-sqlite3 (`code` = 'SQLITE_…'). */
function traduci(errore: unknown): unknown {
  const e = errore as ErroreSqliteNode | undefined;
  if (!(errore instanceof Error) || typeof e?.errcode !== 'number') return errore;
  const codice = CODICI[e.errcode] ?? CODICI[e.errcode & 0xff] ?? 'SQLITE_ERROR';
  try {
    Object.defineProperty(errore, 'code', { value: codice, configurable: true, writable: true });
  } catch {
    // proprietà non ridefinibile: resta l'errore originale
  }
  return errore;
}

function protetto<T>(fn: () => T): T {
  try {
    return fn();
  } catch (errore) {
    throw traduci(errore);
  }
}

function caricaNodeSqlite(): typeof import('node:sqlite') {
  const modulo = process.getBuiltinModule?.('node:sqlite') as typeof import('node:sqlite') | undefined;
  if (!modulo) throw new Error('node:sqlite non disponibile in questa versione di Node');
  return modulo;
}

function avvolgiIstruzione(s: StatementSync): IstruzioneSql {
  type P = Parameters<StatementSync['run']>;
  return {
    run: (...p) => protetto(() => s.run(...(p as P))),
    get: (...p) => protetto(() => s.get(...(p as P))),
    all: (...p) => protetto(() => s.all(...(p as P))),
  };
}

function apriIntegrato(file: string): DatabaseSql {
  const { DatabaseSync: Db } = caricaNodeSqlite();
  const db: DatabaseSync = protetto(() => new Db(file));
  return {
    motore: 'integrato',
    prepare: (sql) => avvolgiIstruzione(protetto(() => db.prepare(sql))),
    exec: (sql) => protetto(() => db.exec(sql)),
    controlloRapido() {
      const riga = protetto(() => db.prepare('PRAGMA quick_check').get()) as Record<string, unknown> | undefined;
      return riga ? String(Object.values(riga)[0]) : '';
    },
    transazione<T>(fn: () => T): T {
      protetto(() => db.exec('BEGIN'));
      try {
        const esito = fn();
        protetto(() => db.exec('COMMIT'));
        return esito;
      } catch (errore) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // transazione già chiusa da SQLite
        }
        throw errore;
      }
    },
    close: () => protetto(() => db.close()),
  };
}
