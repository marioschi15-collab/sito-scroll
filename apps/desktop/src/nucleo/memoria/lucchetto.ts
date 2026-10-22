import fs from 'node:fs';
import path from 'node:path';

/** Un lucchetto su file (creazione atomica con "wx"): serve a non far girare due riordini insieme. */
export interface Lucchetto {
  /** True se ora è nostro; false se un altro processo vivo lo tiene. */
  acquisisci(): boolean;
  rilascia(): void;
  /** True se qualcuno (vivo) lo tiene, noi compresi. */
  occupato(): boolean;
}

export interface OpzioniLucchetto {
  /** Dopo tanto il lucchetto è considerato abbandonato anche se il processo sembra vivo. */
  scadutoDopoMs?: number;
  adesso?: () => number;
  pid?: number;
}

interface ContenutoLucchetto {
  pid: number;
  creatoIl: number;
}

export const SCADENZA_LUCCHETTO_MS = 2 * 60 * 60 * 1000;

function processoVivo(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (errore) {
    return (errore as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export function creaLucchetto(file: string, opzioni: OpzioniLucchetto = {}): Lucchetto {
  const scadutoDopoMs = opzioni.scadutoDopoMs ?? SCADENZA_LUCCHETTO_MS;
  const adesso = opzioni.adesso ?? (() => Date.now());
  const pid = opzioni.pid ?? process.pid;
  let nostro = false;

  function leggi(): ContenutoLucchetto | undefined {
    try {
      const dati = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<ContenutoLucchetto>;
      if (typeof dati.pid !== 'number' || typeof dati.creatoIl !== 'number') return undefined;
      return { pid: dati.pid, creatoIl: dati.creatoIl };
    } catch {
      return undefined;
    }
  }

  /** Un lucchetto senza contenuto leggibile, con processo morto o troppo vecchio non vale più. */
  function abbandonato(): boolean {
    if (!fs.existsSync(file)) return false;
    const c = leggi();
    if (!c) return true;
    if (adesso() - c.creatoIl > scadutoDopoMs) return true;
    return c.pid !== pid && !processoVivo(c.pid);
  }

  function provaCreare(): boolean {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      fs.writeFileSync(file, JSON.stringify({ pid, creatoIl: adesso() } satisfies ContenutoLucchetto), { flag: 'wx' });
      return true;
    } catch (errore) {
      if ((errore as NodeJS.ErrnoException).code === 'EEXIST') return false;
      throw errore;
    }
  }

  return {
    acquisisci() {
      if (nostro) return true;
      if (provaCreare()) return (nostro = true);
      if (!abbandonato()) return false;
      fs.rmSync(file, { force: true });
      return (nostro = provaCreare());
    },

    rilascia() {
      if (!nostro) return;
      nostro = false;
      const c = leggi();
      if (c && c.pid !== pid) return; // nel frattempo l'ha preso qualcun altro
      fs.rmSync(file, { force: true });
    },

    occupato() {
      return fs.existsSync(file) && !abbandonato();
    },
  };
}

/**
 * Segnale di attività della sessione principale: un file toccato a ogni scambio. Il riordino non parte se è stato
 * toccato di recente (stessa finestra dei 5 minuti del Broker). Chi lo tocca è il composition root.
 */
export interface SegnaleAttivita {
  segna(): void;
  attivaDiRecente(): boolean;
  cancella(): void;
}

export const FINESTRA_ATTIVITA_MS = 5 * 60 * 1000;

export function creaSegnaleAttivita(file: string, opzioni: { finestraMs?: number; adesso?: () => number } = {}): SegnaleAttivita {
  const finestraMs = opzioni.finestraMs ?? FINESTRA_ATTIVITA_MS;
  const adesso = opzioni.adesso ?? (() => Date.now());
  return {
    segna() {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, String(adesso()), 'utf8');
    },
    attivaDiRecente() {
      try {
        const quando = Number(fs.readFileSync(file, 'utf8').trim());
        return Number.isFinite(quando) && adesso() - quando < finestraMs;
      } catch {
        return false;
      }
    },
    cancella() {
      fs.rmSync(file, { force: true });
    },
  };
}
