import { TETTI_MEMORIA } from '@spalla/schema';
import { normalizzaRelativo } from './scansione.js';
import { testiMemoria } from './testi.js';

/** Righe di un testo: la riga vuota finale dopo l'ultimo "a capo" non conta. */
export function contaRighe(testo: string): number {
  if (testo === '') return 0;
  const righe = testo.split(/\r?\n/);
  if (righe[righe.length - 1] === '') righe.pop();
  return righe.length;
}

/** Caratteri come li conta una persona (code point), non unità UTF-16. */
export function contaCaratteri(testo: string): number {
  return Array.from(testo).length;
}

export function contaByte(testo: string): number {
  return Buffer.byteLength(testo, 'utf8');
}

/**
 * Tetti imposti dall'hook PostToolUse (docs/03 §6): null se la scrittura va bene, altrimenti il messaggio
 * in italiano da restituire all'assistente. Il confronto dei percorsi ignora maiuscole/minuscole (dischi Mac e Windows).
 */
export function controllaTetti(fileRelativo: string, contenuto: string): string | null {
  const rel = normalizzaRelativo(fileRelativo).toLowerCase();
  switch (rel) {
    case 'profilo/utente.md':
      return contaCaratteri(contenuto) > TETTI_MEMORIA.UTENTE_CARATTERI ? testiMemoria.tetti.utente : null;
    case 'profilo/anima.md':
      return contaCaratteri(contenuto) > TETTI_MEMORIA.ANIMA_CARATTERI ? testiMemoria.tetti.anima : null;
    case 'profilo/squadra.md':
      return contaRighe(contenuto) > TETTI_MEMORIA.SQUADRA_RIGHE ? testiMemoria.tetti.squadra : null;
    case 'profilo/identita.md':
      return contaRighe(contenuto) > TETTI_MEMORIA.IDENTITA_RIGHE ? testiMemoria.tetti.identita : null;
    case 'memoria/memoria.md':
      if (contaRighe(contenuto) > TETTI_MEMORIA.MEMORIA_RIGHE) return testiMemoria.tetti.memoriaRighe;
      if (contaByte(contenuto) > TETTI_MEMORIA.MEMORIA_BYTE) return testiMemoria.tetti.memoriaByte;
      return null;
    case 'memoria/agenda.md':
      return contaRighe(contenuto) > TETTI_MEMORIA.AGENDA_RIGHE ? testiMemoria.tetti.agenda : null;
    default:
      if (rel.startsWith('memoria/temi/') && rel.endsWith('.md')) {
        return contaRighe(contenuto) > TETTI_MEMORIA.SCHEDA_RIGHE ? testiMemoria.tetti.scheda : null;
      }
      return null;
  }
}
