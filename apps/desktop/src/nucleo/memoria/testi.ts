import { TETTI_MEMORIA } from '@spalla/schema';

/** "4000" → "4.000" (migliaia all'italiana), senza dipendere dall'ICU di Node. */
export function formattaNumero(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function kb(byte: number): string {
  return `${Math.round(byte / 1024)} KB`;
}

/**
 * Messaggi restituiti all'assistente quando una scrittura supera un tetto (docs/03 §6, testo esatto).
 * Li legge il modello, non l'utente: deve correggere nello stesso turno. Quelli di SQUADRA e IDENTITA
 * completano la tabella di docs/03 §2 con lo stesso stile.
 */
export const testiMemoria = {
  tetti: {
    utente: `UTENTE.md supera ${formattaNumero(TETTI_MEMORIA.UTENTE_CARATTERI)} caratteri: unisci le direttive simili, segna come superate quelle vecchie e riscrivi.`,
    memoriaRighe: `MEMORIA.md supera ${TETTI_MEMORIA.MEMORIA_RIGHE} righe: sposta i dettagli in temi/ e riscrivi l'indice con una riga per ricordo.`,
    memoriaByte: `MEMORIA.md supera ${kb(TETTI_MEMORIA.MEMORIA_BYTE)}: sposta i dettagli in temi/ e riscrivi l'indice con una riga per ricordo.`,
    scheda: 'La scheda è troppo lunga: sposta la cronologia vecchia in archivio/ o dividi per argomento.',
    agenda: 'Agenda troppo lunga: archivia le voci spuntate.',
    anima: 'ANIMA.md è troppo lunga: la persona si descrive in dieci righe.',
    squadra: `SQUADRA.md supera ${TETTI_MEMORIA.SQUADRA_RIGHE} righe: una riga per ruolo, i dettagli vanno in temi/.`,
    identita: `IDENTITA.md supera ${TETTI_MEMORIA.IDENTITA_RIGHE} righe: tieni solo nome, utente, lingua ed emoji.`,
  },
  diario: {
    intestazione: (data: string) => `# Diario ${data}`,
  },
} as const;
