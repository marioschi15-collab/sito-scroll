import fs from 'node:fs';
import path from 'node:path';
import type { Canale } from '../contratti.js';
import { testiMemoria } from './testi.js';

/** La prima riga del messaggio nel diario è troncata a tanti caratteri (ADR-007). */
export const LIMITE_PRIMA_RIGA = 120;
export const CARTELLA_DIARIO = 'memoria/diario';

function due(n: number): string {
  return String(n).padStart(2, '0');
}

/** "AAAA-MM-GG" in ora locale. */
export function dataLocale(d: Date): string {
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

/** "hh:mm" in ora locale. */
export function oraLocale(d: Date): string {
  return `${due(d.getHours())}:${due(d.getMinutes())}`;
}

/** Percorso relativo del diario di un giorno: memoria/diario/AAAA-MM-GG.md */
export function fileDiario(d: Date): string {
  return `${CARTELLA_DIARIO}/${dataLocale(d)}.md`;
}

/** Prima riga non vuota, senza caratteri di controllo, spazi compattati, troncata a LIMITE_PRIMA_RIGA con "…". */
export function pulisciPrimaRiga(testo: string): string {
  const riga = testo
    .split(/\r?\n/)
    .map((r) => r.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim())
    .find((r) => r.length > 0) ?? '';
  const caratteri = Array.from(riga);
  return caratteri.length > LIMITE_PRIMA_RIGA ? `${caratteri.slice(0, LIMITE_PRIMA_RIGA - 1).join('')}…` : riga;
}

/** "- hh:mm [canale] prima riga" */
export function formattaRigaDiario(canale: Canale, primaRiga: string, quando: Date): string {
  return `- ${oraLocale(quando)} [${canale}] ${primaRiga}`;
}

export interface RichiestaDiario {
  cartellaLavoro: string;
  canale: Canale;
  primaRiga: string;
  adesso: () => Date;
}

/**
 * Appende la riga meccanica al diario di oggi (hook Stop, zero token). Crea cartella e intestazione se mancano.
 * Restituisce il percorso relativo del diario, o undefined se la prima riga era vuota (non si scrive niente).
 */
export async function appendiRigaDiario(r: RichiestaDiario): Promise<string | undefined> {
  const primaRiga = pulisciPrimaRiga(r.primaRiga);
  if (!primaRiga) return undefined;
  const quando = r.adesso();
  const relativo = fileDiario(quando);
  const assoluto = path.join(r.cartellaLavoro, relativo);
  await fs.promises.mkdir(path.dirname(assoluto), { recursive: true });

  let prefisso = '';
  try {
    const esistente = await fs.promises.readFile(assoluto, 'utf8');
    if (esistente.length > 0 && !esistente.endsWith('\n')) prefisso = '\n';
  } catch (errore) {
    if ((errore as NodeJS.ErrnoException).code !== 'ENOENT') throw errore;
    prefisso = `${testiMemoria.diario.intestazione(dataLocale(quando))}\n`;
  }
  await fs.promises.appendFile(assoluto, `${prefisso}${formattaRigaDiario(r.canale, primaRiga, quando)}\n`, 'utf8');
  return relativo;
}
