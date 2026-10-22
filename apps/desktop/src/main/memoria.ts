import fs from 'node:fs';
import path from 'node:path';
import type { FileMemoriaVista } from '../ipc/contratto.js';
import { relativoPosix, risolviDentro } from './percorsi-sicuri.js';

/**
 * Sezione Memoria della finestra (docs/03): elenco e lettura dei file di profilo/ e memoria/ SOLTANTO.
 * Ricerca, contatori e ricostruzione dell'indice passano dal MemoryService del Nucleo.
 */

export const CARTELLE_MEMORIA = ['profilo', 'memoria'] as const;
/** Oltre questa dimensione il file non si mostra nella finestra (si apre con il programma di sistema). */
export const LIMITE_LETTURA_BYTE = 512 * 1024;
const ESTENSIONI = new Set(['.md', '.txt', '.json']);

function titoloDa(file: string, testo: string): string {
  const intestazione = /^#\s+(.+)$/m.exec(testo.slice(0, 4096));
  return intestazione?.[1]?.trim() || path.basename(file, path.extname(file));
}

function leggiInizio(file: string, byte: number): string {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(byte);
    const letti = fs.readSync(fd, buffer, 0, byte, 0);
    return buffer.subarray(0, letti).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function* visita(cartella: string, profondita: number): Generator<string> {
  if (profondita > 6) return;
  let voci: fs.Dirent[];
  try {
    voci = fs.readdirSync(cartella, { withFileTypes: true });
  } catch {
    return;
  }
  for (const v of voci) {
    if (v.name.startsWith('.')) continue;
    const p = path.join(cartella, v.name);
    if (v.isDirectory()) yield* visita(p, profondita + 1);
    else if (v.isFile() && ESTENSIONI.has(path.extname(v.name).toLowerCase())) yield p;
  }
}

export function elencoFileMemoria(cartellaLavoro: string): FileMemoriaVista[] {
  const elenco: FileMemoriaVista[] = [];
  for (const sotto of CARTELLE_MEMORIA) {
    for (const file of visita(path.join(cartellaLavoro, sotto), 0)) {
      try {
        const info = fs.statSync(file);
        const testa = leggiInizio(file, 4096);
        elenco.push({ percorso: relativoPosix(cartellaLavoro, file), titolo: titoloDa(file, testa), modificato: info.mtime.toISOString(), byte: info.size });
      } catch {
        // sparito durante la lettura
      }
    }
  }
  return elenco.sort((a, b) => a.percorso.localeCompare(b.percorso));
}

/** True se il percorso relativo sta in una delle cartelle della memoria. */
export function inCartellaMemoria(relativo: string): boolean {
  const primo = relativo.split(/[\\/]+/)[0];
  return (CARTELLE_MEMORIA as readonly string[]).includes(primo ?? '');
}

export type EsitoLettura = { ok: true; testo: string } | { ok: false; motivo: 'non_consentito' | 'non_trovato' | 'troppo_grande' };

export function leggiFileMemoria(cartellaLavoro: string, relativo: string): EsitoLettura {
  if (!inCartellaMemoria(relativo)) return { ok: false, motivo: 'non_consentito' };
  const assoluto = risolviDentro(cartellaLavoro, relativo);
  if (!assoluto) return { ok: false, motivo: 'non_consentito' };
  // Anche dopo la risoluzione deve stare sotto profilo/ o memoria/.
  if (!inCartellaMemoria(relativoPosix(cartellaLavoro, assoluto))) return { ok: false, motivo: 'non_consentito' };
  try {
    const info = fs.statSync(assoluto);
    if (!info.isFile()) return { ok: false, motivo: 'non_trovato' };
    if (info.size > LIMITE_LETTURA_BYTE) return { ok: false, motivo: 'troppo_grande' };
    return { ok: true, testo: fs.readFileSync(assoluto, 'utf8') };
  } catch {
    return { ok: false, motivo: 'non_trovato' };
  }
}
