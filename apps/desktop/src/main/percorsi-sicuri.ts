import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

/**
 * Percorsi che arrivano dalla finestra: sempre relativi alla cartella di lavoro e mai fuori da essa,
 * nemmeno attraverso un collegamento simbolico (docs/02 §10).
 */

/** True se `assoluto` è `base` stessa o sta sotto `base` (confronto dopo `path.resolve`). */
export function stessoOSotto(base: string, assoluto: string): boolean {
  const rel = path.relative(path.resolve(base), path.resolve(assoluto));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Risolve un percorso relativo dentro `base`; `undefined` se esce dalla cartella (anche tramite collegamenti
 * simbolici, quando il file esiste). Non controlla che il file esista.
 */
export function risolviDentro(base: string, relativo: string): string | undefined {
  if (!relativo || path.isAbsolute(relativo) || /^[A-Za-z]:/.test(relativo) || relativo.includes('\u0000')) return undefined;
  const assoluto = path.resolve(base, relativo);
  if (!stessoOSotto(base, assoluto)) return undefined;
  try {
    const reale = fs.realpathSync(assoluto);
    const baseReale = fs.realpathSync(base);
    if (!stessoOSotto(baseReale, reale)) return undefined;
  } catch {
    // Il file non esiste (ancora): basta il controllo lessicale.
  }
  return assoluto;
}

/** Percorso relativo con le barre "/" (anche su Windows), per mostrarlo alla finestra. */
export function relativoPosix(base: string, assoluto: string): string {
  return path.relative(base, assoluto).split(path.sep).join('/');
}

/** Estensioni che il sistema eseguirebbe invece di aprire: dalla finestra si apre la cartella che le contiene. */
const ESEGUIBILI = new Set([
  '.app', '.command', '.sh', '.bash', '.zsh', '.csh', '.ksh', '.fish', '.tool', '.terminal', '.workflow', '.pkg', '.dmg', '.scpt', '.applescript',
  '.exe', '.com', '.bat', '.cmd', '.msi', '.msix', '.appx', '.ps1', '.psm1', '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.hta', '.scr', '.pif',
  '.lnk', '.url', '.reg', '.cpl', '.jar', '.desktop', '.run', '.bin', '.appimage', '.py', '.pl', '.rb',
]);

export function eEseguibile(percorso: string): boolean {
  return ESEGUIBILI.has(path.extname(percorso).toLowerCase());
}

/**
 * Documenti che la finestra può aprire con il programma di sistema. Tutto il resto (eseguibili, collegamenti,
 * immagini disco, .webloc/.scf/.library-ms/.appref-ms, file senza estensione, ...) si MOSTRA nella sua cartella.
 * Elenco di ciò che è ammesso, non di ciò che è vietato: un'estensione dimenticata resta chiusa.
 */
export const DOCUMENTI_APRIBILI: ReadonlySet<string> = new Set([
  '.md', '.txt', '.json', '.csv', '.pdf', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp', '.rtf',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic',
]);

/**
 * Che cosa fare di un percorso (già risolto dentro la cartella di lavoro) chiesto dalla finestra (docs/02 §10):
 * - 'apri': una cartella vera (non un pacchetto come «X.app») o un documento dell'elenco, controllando l'estensione
 *   sia del nome sia del file reale (un collegamento «report.pdf» che punta a «x.command» non si apre) e, su
 *   Mac e Linux, che il file non sia eseguibile;
 * - 'mostra': tutto il resto, che si mostra nella cartella che lo contiene.
 * Lancia un errore se il percorso non esiste.
 */
export async function comeAprire(assoluto: string, piattaforma: NodeJS.Platform = process.platform): Promise<'apri' | 'mostra'> {
  const reale = await fsp.realpath(assoluto);
  const info = await fsp.stat(reale);
  if (info.isDirectory()) return eEseguibile(assoluto) || eEseguibile(reale) ? 'mostra' : 'apri';
  if (!info.isFile()) return 'mostra';
  const estensioni = [path.extname(assoluto).toLowerCase(), path.extname(reale).toLowerCase()];
  if (!estensioni.every((e) => DOCUMENTI_APRIBILI.has(e))) return 'mostra';
  if (piattaforma !== 'win32' && (info.mode & 0o111) !== 0) return 'mostra';
  return 'apri';
}
