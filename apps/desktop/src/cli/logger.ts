import fs from 'node:fs';
import path from 'node:path';
import type { Logger } from '../nucleo/contratti.js';

/** Oscura ciò che somiglia a una chiave API o a un token di bot, se mai finisse nei dati di log. */
export function oscura(valore: unknown): unknown {
  if (typeof valore === 'string') {
    return valore
      .replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, 'sk-ant-…')
      .replace(/\b\d{6,}:[A-Za-z0-9_-]{30,}\b/g, '<token>');
  }
  if (Array.isArray(valore)) return valore.map(oscura);
  if (valore && typeof valore === 'object') {
    return Object.fromEntries(Object.entries(valore as Record<string, unknown>).map(([k, v]) => [k, oscura(v)]));
  }
  return valore;
}

/**
 * Logger su file (righe JSON, un file al giorno in `percorsi.logs`) senza contenuti dei messaggi:
 * i moduli passano solo nomi di eventi e dati tecnici (docs/02 §5.2 "logs/ rotanti senza contenuti dei prompt").
 */
export function creaLoggerFile(cartellaLogs: string, opzioni: { ancheSuStderr?: boolean; adesso?: () => Date } = {}): Logger {
  const adesso = opzioni.adesso ?? (() => new Date());
  fs.mkdirSync(cartellaLogs, { recursive: true });

  function scrivi(livello: 'info' | 'avviso' | 'errore', evento: string, dati?: Record<string, unknown>): void {
    const ora = adesso();
    const riga = JSON.stringify({ t: ora.toISOString(), livello, evento, ...(dati ? { dati: oscura(dati) } : {}) });
    const file = path.join(cartellaLogs, `spalla-${ora.toISOString().slice(0, 10)}.log`);
    try {
      fs.appendFileSync(file, riga + '\n');
    } catch {
      /* il log non deve mai fermare l'app */
    }
    if (opzioni.ancheSuStderr && livello === 'errore') process.stderr.write(riga + '\n');
  }

  return {
    info: (evento, dati) => scrivi('info', evento, dati),
    avviso: (evento, dati) => scrivi('avviso', evento, dati),
    errore: (evento, dati) => scrivi('errore', evento, dati),
  };
}
