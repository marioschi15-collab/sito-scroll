import fs from 'node:fs';
import path from 'node:path';

/** Le cartelle della memoria che entrano nell'indice (docs/03 §7). */
export const CARTELLE_INDICIZZATE = ['profilo', 'memoria'] as const;
/** L'archivio è indicizzato ma mai caricato nel contesto (docs/03 §2). */
export const CARTELLA_ARCHIVIO = 'memoria/archivio/';
/** File più grandi di così non sono memoria: vengono saltati (e segnalati nel log). */
export const DIMENSIONE_MASSIMA_FILE = 2 * 1024 * 1024;

export interface FileTrovato {
  /** Relativo alla cartella di lavoro, con "/" anche su Windows. */
  file: string;
  assoluto: string;
  modificatoMs: number;
  dimensione: number;
}

export function normalizzaRelativo(fileRelativo: string): string {
  return fileRelativo.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function eInArchivio(fileRelativo: string): boolean {
  return normalizzaRelativo(fileRelativo).startsWith(CARTELLA_ARCHIVIO);
}

/** Solo Markdown non nascosto dentro profilo/ o memoria/. */
export function eFileIndicizzabile(fileRelativo: string): boolean {
  const rel = normalizzaRelativo(fileRelativo);
  if (!/\.md$/i.test(rel)) return false;
  if (rel.split('/').some((parte) => parte.startsWith('.'))) return false;
  return CARTELLE_INDICIZZATE.some((c) => rel.startsWith(`${c}/`));
}

/** Elenca i Markdown di profilo/ e memoria/ con data e dimensione, in ordine stabile. Cartelle assenti = elenco vuoto. */
export function scansionaMemoria(cartellaLavoro: string): FileTrovato[] {
  const trovati: FileTrovato[] = [];
  for (const cartella of CARTELLE_INDICIZZATE) visita(path.join(cartellaLavoro, cartella), cartella, trovati);
  trovati.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  return trovati;
}

function visita(assoluta: string, relativa: string, trovati: FileTrovato[]): void {
  let voci: fs.Dirent[];
  try {
    voci = fs.readdirSync(assoluta, { withFileTypes: true });
  } catch {
    return;
  }
  for (const voce of voci) {
    if (voce.name.startsWith('.')) continue;
    const assoluto = path.join(assoluta, voce.name);
    const rel = `${relativa}/${voce.name}`;
    if (voce.isDirectory()) {
      visita(assoluto, rel, trovati);
      continue;
    }
    if (!voce.isFile() || !eFileIndicizzabile(rel)) continue;
    try {
      const stat = fs.statSync(assoluto);
      trovati.push({ file: rel, assoluto, modificatoMs: Math.round(stat.mtimeMs), dimensione: stat.size });
    } catch {
      // sparito tra readdir e stat: lo prenderà la prossima sincronizzazione
    }
  }
}
