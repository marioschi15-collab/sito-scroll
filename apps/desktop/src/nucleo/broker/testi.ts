import { permessi } from '@spalla/it-copy';

/** Motivi di rifiuto restituiti all'assistente: da @spalla/it-copy (`permessi.esiti`). Le frasi delle schede sono in descrizioni.ts. */
export const testiBroker = {
  motivi: {
    tempoScaduto: permessi.esiti.scaduto,
    nessunCanale: permessi.esiti.nessunCanale,
    erroreCanale: permessi.esiti.erroreCanale,
    annullata: permessi.esiti.annullata,
    troppoLungo: permessi.esiti.troppoLungo,
  },
} as const;
