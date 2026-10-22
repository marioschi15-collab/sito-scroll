import fsp from 'node:fs/promises';
import path from 'node:path';
import type { Logger, Trascrizione, VoiceService } from '../contratti.js';
import { decodificaOggOpus } from '../voce/decodifica.js';
import { LIMITE_FILE_BYTE } from './allegati.js';
import type { TestiTelegram } from './testi.js';

/** Sotto questa confidenza la risposta inizia con "Ho capito: …" (docs/02 §8.4). */
export const SOGLIA_CONFIDENZA = 0.7;

export interface DipendenzeVocale {
  voce?: VoiceService;
  testi: TestiTelegram;
  logger: Logger;
  /** Dove appoggiare il file OGG mentre lo decodifichiamo (poi viene cancellato). */
  cartellaTemporanea: string;
  scarica: (fileId: string, destinazione: string) => Promise<void>;
  limiteByte?: number;
  sogliaConfidenza?: number;
  adesso?: () => number;
}

export interface NotaVocale {
  file_id: string;
  file_size?: number;
  duration: number;
}

export type EsitoVocale =
  | { esito: 'ok'; testo: string; mostraTrascrizione: boolean; trascrizione: Trascrizione }
  | { esito: 'errore'; messaggio: string };

/** Scarica, decodifica (OGG/Opus → 16 kHz) e trascrive una nota vocale; ogni errore ha già la frase per l'utente. */
export async function trascriviNotaVocale(d: DipendenzeVocale, nota: NotaVocale): Promise<EsitoVocale> {
  const { testi, logger } = d;
  const limite = d.limiteByte ?? LIMITE_FILE_BYTE;
  const soglia = d.sogliaConfidenza ?? SOGLIA_CONFIDENZA;

  if (!d.voce || !(await d.voce.disponibile().catch(() => false))) return { esito: 'errore', messaggio: testi.notaVocale.motoreNonPronto };
  if (nota.file_size !== undefined && nota.file_size > limite) return { esito: 'errore', messaggio: testi.notaVocale.troppoLunga };

  await fsp.mkdir(d.cartellaTemporanea, { recursive: true });
  const temporaneo = path.join(d.cartellaTemporanea, `nota-${(d.adesso ?? Date.now)()}-${Math.random().toString(36).slice(2, 8)}.ogg`);
  try {
    await d.scarica(nota.file_id, temporaneo);
    const dati = await fsp.readFile(temporaneo);
    const pcm = await decodificaOggOpus(new Uint8Array(dati.buffer, dati.byteOffset, dati.byteLength));
    const trascrizione = await d.voce.trascrivi(pcm);
    const testo = trascrizione.testo.trim();
    if (testo.length === 0) return { esito: 'errore', messaggio: testi.notaVocale.nonCapita };
    const mostraTrascrizione = trascrizione.confidenza === undefined || trascrizione.confidenza < soglia;
    logger.info('telegram.nota_vocale', { durataSec: nota.duration, caratteri: testo.length, confidenza: trascrizione.confidenza, motore: trascrizione.motore });
    return { esito: 'ok', testo, mostraTrascrizione, trascrizione };
  } catch (errore) {
    logger.avviso('telegram.nota_vocale_fallita', { errore: errore instanceof Error ? errore.message : String(errore) });
    const messaggio = errore instanceof Error && errore.name === 'ErroreVoce' ? errore.message : testi.notaVocale.nonCapita;
    return { esito: 'errore', messaggio };
  } finally {
    await fsp.rm(temporaneo, { force: true }).catch(() => undefined);
  }
}
