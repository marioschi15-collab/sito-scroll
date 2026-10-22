import fs from 'node:fs';
import path from 'node:path';
import { PRIMO_AVVIO_COMPLETATO_PREFISSO } from '@spalla/schema';

/**
 * True se le presentazioni sono ancora in corso: onboarding/PRIMO-AVVIO.md esiste e non è stato riscritto con
 * la riga "# Presentazioni completate…" (docs/05 §1.1). Serve a togliere la shell durante il rituale: per leggere e
 * scrivere i file del profilo bastano gli strumenti dei file, e una scheda "vuole eseguire un comando" con `sed`
 * o `cat` nei primi minuti spaventa chi non è tecnico.
 */
export function presentazioniInCorso(cartellaLavoro: string): boolean {
  let testo: string;
  try {
    testo = fs.readFileSync(path.join(cartellaLavoro, 'onboarding', 'PRIMO-AVVIO.md'), 'utf8');
  } catch {
    return false;
  }
  const prima = testo.split(/\r?\n/).find((riga) => riga.trim().length > 0) ?? '';
  return !prima.trimStart().startsWith(PRIMO_AVVIO_COMPLETATO_PREFISSO);
}
