import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

/** Richiesta di collegamento di uno sconosciuto quando il bot non ha ancora un proprietario (docs/02 §8.3). */
export const PairingInAttesaSchema = z.object({
  codice: z.string().min(4).max(12),
  utenteId: z.number().int(),
  chatId: z.number().int(),
  nomeMostrato: z.string().default(''),
  creatoIl: z.number().int(),
});
export type PairingInAttesa = z.infer<typeof PairingInAttesaSchema>;

/** `datiApp/telegram/state.json`: allowlist per id numerico, codici in attesa, username del bot, ultimo update. */
export const StatoTelegramSchema = z.object({
  versione: z.literal(1).default(1),
  proprietari: z.array(z.number().int()).default([]),
  pairing: z.array(PairingInAttesaSchema).default([]),
  botUsername: z.string().optional(),
  ultimoUpdateId: z.number().int().optional(),
  sconosciutiScartati: z.number().int().nonnegative().default(0),
  ingressoLimitato: z.number().int().nonnegative().default(0),
});
export type StatoTelegram = z.infer<typeof StatoTelegramSchema>;

/** Stato iniziale nuovo a ogni chiamata (gli array non vanno condivisi tra istanze). */
export function statoVuoto(): StatoTelegram {
  return StatoTelegramSchema.parse({});
}

export const STATO_INIZIALE: Readonly<StatoTelegram> = Object.freeze(statoVuoto());

export interface ArchivioStato {
  readonly percorso: string;
  stato: StatoTelegram;
  /** Scrive subito, in modo atomico. */
  salva(): Promise<void>;
  /** Scrittura raggruppata (per gli aggiornamenti frequenti come l'ultimo update). */
  salvaPresto(): void;
  /** Attende l'eventuale scrittura in sospeso. */
  svuota(): Promise<void>;
}

/** Legge lo stato dal disco (file mancante o corrotto → stato iniziale) e lo riscrive quando cambia. */
export function creaArchivioStato(percorso: string, opzioni: { ritardoMs?: number } = {}): ArchivioStato {
  const ritardoMs = opzioni.ritardoMs ?? 500;
  let timer: NodeJS.Timeout | undefined;
  let inCorso: Promise<void> = Promise.resolve();

  const archivio: ArchivioStato = {
    percorso,
    stato: leggi(percorso),
    salva() {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      inCorso = inCorso.then(() => scrivi(percorso, archivio.stato)).catch(() => undefined);
      return inCorso;
    },
    salvaPresto() {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void archivio.salva();
      }, ritardoMs);
      timer.unref?.();
    },
    async svuota() {
      if (timer) await archivio.salva();
      await inCorso;
    },
  };
  return archivio;
}

function leggi(percorso: string): StatoTelegram {
  try {
    const grezzo = JSON.parse(fs.readFileSync(percorso, 'utf8')) as unknown;
    const esito = StatoTelegramSchema.safeParse(grezzo);
    return esito.success ? esito.data : statoVuoto();
  } catch {
    return statoVuoto();
  }
}

async function scrivi(percorso: string, stato: StatoTelegram): Promise<void> {
  await fsp.mkdir(path.dirname(percorso), { recursive: true });
  const temporaneo = `${percorso}.tmp`;
  await fsp.writeFile(temporaneo, JSON.stringify(stato, null, 2) + '\n', 'utf8');
  await fsp.rename(temporaneo, percorso);
}
