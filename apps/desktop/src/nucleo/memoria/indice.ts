import fs from 'node:fs';
import path from 'node:path';
import type { Logger, RisultatoMemoria } from '../contratti.js';
import type { Blocco } from './blocchi.js';
import type { EspressioniFts } from './query-fts.js';
import { apriDatabaseSql, type DatabaseSql, type IstruzioneSql } from './sqlite.js';

/** Cambiarla fa ripartire l'indice da zero al prossimo avvio (è derivato: non si perde nulla). */
export const VERSIONE_SCHEMA = '1';
/** Un ricordo di ieri batte uno uguale di sei mesi fa: bonus lineare che si azzera dopo 30 giorni (docs/03 §7). */
export const FINESTRA_RECENZA_MS = 30 * 86_400_000;
/** Un blocco modificato oggi vale fino al 50% in più di uno identico ma vecchio. */
export const BONUS_RECENZA_MASSIMO = 0.5;
/** Pesi bm25 per colonna: titolo, testo, etichette, contesto. */
const PESI_BM25 = '3.0, 1.0, 2.0, 0.5';
const TOKEN_ESTRATTO = 48;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (chiave TEXT PRIMARY KEY, valore TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS file_indicizzati (
  file TEXT PRIMARY KEY,
  modificato_ms INTEGER NOT NULL,
  dimensione INTEGER NOT NULL,
  blocchi INTEGER NOT NULL,
  archivio INTEGER NOT NULL DEFAULT 0
);
CREATE VIRTUAL TABLE IF NOT EXISTS blocchi USING fts5(
  titolo, testo, etichette, contesto,
  file UNINDEXED, modificato UNINDEXED, modificato_ms UNINDEXED, archivio UNINDEXED, ordine UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);
`;

export interface VoceIndice {
  modificatoMs: number;
  dimensione: number;
}

export interface OpzioniIndice {
  /** Percorso del file SQLite (Percorsi.indiceMemoria). */
  file: string;
  logger: Logger;
  /** Orologio iniettabile per il bonus di recenza (test). */
  adesso?: () => Date;
}

export interface Indice {
  /** Apre il file; se manca lo crea, se è corrotto o di una versione vecchia lo rifà da zero. */
  apri(): void;
  chiudi(): void;
  aperto(): boolean;
  /** Chiude, cancella i file su disco e riapre vuoto. */
  azzera(): void;
  elencoFile(): Map<string, VoceIndice>;
  indicizza(file: string, blocchi: Blocco[], modificatoMs: number, dimensione: number, archivio: boolean): void;
  rimuovi(file: string): void;
  cerca(espressioni: EspressioniFts, k: number): RisultatoMemoria[];
  statistiche(): { file: number; blocchi: number };
}

interface Istruzioni {
  elencoFile: IstruzioneSql;
  cancellaBlocchi: IstruzioneSql;
  inserisciBlocco: IstruzioneSql;
  salvaFile: IstruzioneSql;
  cancellaFile: IstruzioneSql;
  cerca: IstruzioneSql;
  conta: IstruzioneSql;
}

interface RigaRicerca {
  file: string;
  titolo: string;
  modificato: string;
  ordine: number;
  estratto: string | null;
  punteggio: number;
}

class ErroreVersione extends Error {}

/** True per gli errori che indicano un file SQLite rovinato: si ripara ricostruendo (docs/03 §7). */
export function eErroreCorruzione(errore: unknown): boolean {
  const codice = (errore as { code?: unknown } | undefined)?.code;
  return typeof codice === 'string' && (codice.startsWith('SQLITE_CORRUPT') || codice === 'SQLITE_NOTADB' || codice === 'SQLITE_IOERR_SHORT_READ');
}

/** Cancella il file dell'indice e i suoi compagni (-journal, -wal, -shm). */
export function cancellaFileIndice(file: string): void {
  for (const suffisso of ['', '-journal', '-wal', '-shm']) {
    try {
      fs.rmSync(file + suffisso, { force: true });
    } catch {
      // niente da cancellare o non nostro
    }
  }
}

export function creaIndice(opzioni: OpzioniIndice): Indice {
  const { file, logger } = opzioni;
  const adesso = opzioni.adesso ?? (() => new Date());
  let db: DatabaseSql | undefined;
  let istruzioni: Istruzioni | undefined;

  function apriGrezzo(): DatabaseSql {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    return apriDatabaseSql(file, (motore, motivo) => logger.info('memoria.motore_sqlite', { motore, motivo: motivo ?? '' }));
  }

  function prepara(d: DatabaseSql): Istruzioni {
    return {
      elencoFile: d.prepare('SELECT file, modificato_ms AS modificatoMs, dimensione FROM file_indicizzati'),
      cancellaBlocchi: d.prepare('DELETE FROM blocchi WHERE file = ?'),
      inserisciBlocco: d.prepare(
        'INSERT INTO blocchi (titolo, testo, etichette, contesto, file, modificato, modificato_ms, archivio, ordine) VALUES (@titolo, @testo, @etichette, @contesto, @file, @modificato, @modificatoMs, @archivio, @ordine)',
      ),
      salvaFile: d.prepare(
        'INSERT OR REPLACE INTO file_indicizzati (file, modificato_ms, dimensione, blocchi, archivio) VALUES (@file, @modificatoMs, @dimensione, @blocchi, @archivio)',
      ),
      cancellaFile: d.prepare('DELETE FROM file_indicizzati WHERE file = ?'),
      cerca: d.prepare(`
        SELECT file, modificato, ordine,
               CASE WHEN contesto <> '' THEN contesto || ' › ' || titolo ELSE titolo END AS titolo,
               snippet(blocchi, 1, '', '', '…', ${TOKEN_ESTRATTO}) AS estratto,
               (-bm25(blocchi, ${PESI_BM25})) * (1.0 + @bonus * max(0.0, min(1.0, 1.0 - (@adesso - modificato_ms) / @finestra))) AS punteggio
        FROM blocchi
        WHERE blocchi MATCH @espressione
        ORDER BY punteggio DESC, modificato_ms DESC
        LIMIT @k`),
      conta: d.prepare('SELECT (SELECT count(*) FROM file_indicizzati) AS file, (SELECT count(*) FROM blocchi) AS blocchi'),
    };
  }

  function versioneSalvata(d: DatabaseSql): string | undefined {
    const riga = d.prepare('SELECT valore FROM meta WHERE chiave = ?').get('versione') as { valore: string } | undefined;
    return riga?.valore;
  }

  function scriviVersione(d: DatabaseSql): void {
    d.prepare('INSERT OR REPLACE INTO meta (chiave, valore) VALUES (?, ?)').run('versione', VERSIONE_SCHEMA);
  }

  function apri(): void {
    if (db) return;
    let d: DatabaseSql | undefined;
    try {
      d = apriGrezzo();
      if (d.controlloRapido() !== 'ok') throw new Error('quick_check non superato');
      d.exec(SCHEMA);
      const versione = versioneSalvata(d);
      if (versione === undefined) scriviVersione(d);
      else if (versione !== VERSIONE_SCHEMA) throw new ErroreVersione(versione);
    } catch (errore) {
      try {
        d?.close();
      } catch {
        // già chiuso
      }
      cancellaFileIndice(file);
      d = apriGrezzo();
      d.exec(SCHEMA);
      scriviVersione(d);
      if (errore instanceof ErroreVersione) logger.info('memoria.indice_rifatto', { motivo: 'versione', da: errore.message, a: VERSIONE_SCHEMA });
      else logger.avviso('memoria.indice_riparato', { errore: errore instanceof Error ? errore.message : String(errore) });
    }
    db = d;
    istruzioni = prepara(d);
  }

  function chiudi(): void {
    if (!db) return;
    try {
      db.close();
    } finally {
      db = undefined;
      istruzioni = undefined;
    }
  }

  function richiedi(): Istruzioni {
    if (!istruzioni) apri();
    return istruzioni!;
  }

  function eseguiRicerca(espressione: string, k: number): RigaRicerca[] {
    return richiedi().cerca.all({
      espressione,
      k,
      adesso: adesso().getTime(),
      finestra: FINESTRA_RECENZA_MS,
      bonus: BONUS_RECENZA_MASSIMO,
    }) as RigaRicerca[];
  }

  return {
    apri,
    chiudi,
    aperto: () => db !== undefined,

    azzera() {
      chiudi();
      cancellaFileIndice(file);
      apri();
    },

    elencoFile() {
      const mappa = new Map<string, VoceIndice>();
      for (const riga of richiedi().elencoFile.all() as Array<{ file: string; modificatoMs: number; dimensione: number }>) {
        mappa.set(riga.file, { modificatoMs: riga.modificatoMs, dimensione: riga.dimensione });
      }
      return mappa;
    },

    indicizza(fileRel, blocchi, modificatoMs, dimensione, archivio) {
      const s = richiedi();
      const modificato = new Date(modificatoMs).toISOString();
      db!.transazione(() => {
        s.cancellaBlocchi.run(fileRel);
        for (const b of blocchi) {
          s.inserisciBlocco.run({ titolo: b.titolo, testo: b.testo, etichette: b.etichette, contesto: b.contesto, file: fileRel, modificato, modificatoMs, archivio: archivio ? 1 : 0, ordine: b.ordine });
        }
        s.salvaFile.run({ file: fileRel, modificatoMs, dimensione, blocchi: blocchi.length, archivio: archivio ? 1 : 0 });
      });
    },

    rimuovi(fileRel) {
      const s = richiedi();
      db!.transazione(() => {
        s.cancellaBlocchi.run(fileRel);
        s.cancellaFile.run(fileRel);
      });
    },

    cerca(espressioni, k) {
      if (k <= 0) return [];
      const righe = eseguiRicerca(espressioni.stretta, k);
      if (righe.length < k && espressioni.larga !== espressioni.stretta) {
        const viste = new Set(righe.map((r) => `${r.file}#${r.ordine}`));
        for (const r of eseguiRicerca(espressioni.larga, k + righe.length)) {
          if (righe.length >= k) break;
          const chiave = `${r.file}#${r.ordine}`;
          if (viste.has(chiave)) continue;
          viste.add(chiave);
          righe.push(r);
        }
      }
      return righe.map((r) => ({ file: r.file, titolo: r.titolo, estratto: r.estratto ?? '', punteggio: r.punteggio, modificato: r.modificato }));
    },

    statistiche() {
      return richiedi().conta.get() as { file: number; blocchi: number };
    },
  };
}
