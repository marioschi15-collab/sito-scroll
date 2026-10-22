import fs from 'node:fs';
import path from 'node:path';

/** Percorso assoluto da uno relativo scritto con "/" (indipendente dal sistema operativo). */
export function assoluto(cartella: string, relativo: string): string {
  return path.join(cartella, ...relativo.split('/'));
}

/** Percorso relativo con "/" (per messaggi e log), dato un assoluto dentro la cartella. */
export function relativoPosix(cartella: string, file: string): string {
  return path.relative(cartella, file).split(path.sep).join('/');
}

export function esiste(p: string): boolean {
  return fs.existsSync(p);
}

function eAssente(errore: unknown): boolean {
  return (errore as NodeJS.ErrnoException).code === 'ENOENT';
}

/** Contenuto UTF-8 del file, oppure undefined se non esiste. */
export function leggiTesto(p: string): string | undefined {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (errore) {
    if (eAssente(errore)) return undefined;
    throw errore;
  }
}

export function scriviTesto(p: string, contenuto: string): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contenuto, 'utf8');
}

export function assicuraCartella(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

/** True se il file c'era ed è stato rimosso. */
export function rimuoviFile(p: string): boolean {
  try {
    fs.unlinkSync(p);
    return true;
  } catch (errore) {
    if (eAssente(errore)) return false;
    throw errore;
  }
}

export type LetturaJson =
  | { tipo: 'assente' }
  | { tipo: 'valido'; valore: unknown }
  | { tipo: 'non_valido'; problema: string };

export function leggiJson(p: string): LetturaJson {
  const testo = leggiTesto(p);
  if (testo === undefined) return { tipo: 'assente' };
  try {
    return { tipo: 'valido', valore: JSON.parse(testo) as unknown };
  } catch (errore) {
    return { tipo: 'non_valido', problema: (errore as Error).message };
  }
}

/** JSON leggibile (due spazi, a-capo finale): lo stesso formato che chiediamo all'assistente. */
export function scriviJson(p: string, valore: unknown): void {
  scriviTesto(p, `${JSON.stringify(valore, null, 2)}\n`);
}

/** Nomi dei file .md della cartella (non ricorsivo, ordinati); [] se la cartella manca. */
export function elencaMarkdown(cartella: string): string[] {
  try {
    return fs
      .readdirSync(cartella, { withFileTypes: true })
      .filter((v) => v.isFile() && v.name.endsWith('.md'))
      .map((v) => v.name)
      .sort();
  } catch (errore) {
    if (eAssente(errore)) return [];
    throw errore;
  }
}

/** Righe di un testo: l'a-capo finale non conta come riga in più. */
export function contaRighe(testo: string): number {
  if (testo.length === 0) return 0;
  const righe = testo.split(/\r?\n/);
  if (righe[righe.length - 1] === '') righe.pop();
  return righe.length;
}

/** Caratteri (punti di codice, non byte). */
export function contaCaratteri(testo: string): number {
  return Array.from(testo).length;
}

export function eOggetto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
