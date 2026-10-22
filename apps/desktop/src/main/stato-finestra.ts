import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { SchermataIniziale } from '../ipc/contratto.js';

/**
 * Il poco che la finestra ricorda fuori da config.json (datiApp/finestra.json): se l'utente ha già scelto la
 * modalità del cervello, se l'abbonamento ha superato la prova di collegamento, la scelta sull'avvio automatico
 * quando l'app non è pacchettizzata. Nessun segreto qui.
 */
const StatoFinestraSchema = z.object({
  versione: z.literal(1).default(1),
  modalitaScelta: z.enum(['chiave_api', 'abbonamento']).optional(),
  abbonamentoVerificato: z.boolean().optional(),
  avvioAutomatico: z.boolean().optional(),
  /** Il rituale ha finito le domande di profilo ([[FINE:PROFILO]]): niente più pulsante fisso dei consigliati. */
  profiloCompletato: z.boolean().optional(),
});

export type StatoFinestra = z.infer<typeof StatoFinestraSchema>;

export function fileStatoFinestra(datiApp: string): string {
  return path.join(datiApp, 'finestra.json');
}

export function leggiStatoFinestra(datiApp: string): StatoFinestra {
  try {
    const esito = StatoFinestraSchema.safeParse(JSON.parse(fs.readFileSync(fileStatoFinestra(datiApp), 'utf8')));
    if (esito.success) return esito.data;
  } catch {
    // assente o rotto: si riparte da zero (la finestra ripropone le schermate iniziali)
  }
  return { versione: 1 };
}

export function aggiornaStatoFinestra(datiApp: string, modifiche: Partial<Omit<StatoFinestra, 'versione'>>): StatoFinestra {
  const nuovo = StatoFinestraSchema.parse({ ...leggiStatoFinestra(datiApp), ...modifiche, versione: 1 });
  fs.mkdirSync(datiApp, { recursive: true });
  const file = fileStatoFinestra(datiApp);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(nuovo, null, 2) + '\n');
  fs.renameSync(`${file}.tmp`, file);
  return nuovo;
}

/**
 * Da quale schermata parte la finestra (docs/05 §2.1). Con il binario incluso nell'SDK non c'è download del motore,
 * quindi la schermata "motore" non serve (strada A): dalla scelta del cervello si va alla chat.
 */
export function calcolaSchermataIniziale(s: { modalitaScelta: boolean; collegato: boolean; motorePronto?: boolean }): SchermataIniziale {
  if (!s.modalitaScelta) return 'benvenuto';
  if (!s.collegato) return 'cervello';
  if (s.motorePronto === false) return 'motore';
  return 'chat';
}
