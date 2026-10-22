import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Deposito dei segreti cifrato a riposo (chiave API, token Telegram).
 *
 * PROTOTIPO: un file JSON cifrato con AES-256-GCM e una chiave derivata (scrypt) dall'utente del
 * sistema e dal nome della macchina. Nella shell Electron sarà sostituito da `safeStorage`
 * (Keychain su Mac, DPAPI su Windows): stessa interfaccia, altra implementazione (docs/02 §4, §10.2).
 */
export interface StoreSegreti {
  leggi(nome: string): Promise<string | undefined>;
  scrivi(nome: string, valore: string): Promise<void>;
  rimuovi(nome: string): Promise<void>;
  elenco(): Promise<string[]>;
}

export interface OpzioniStoreSegreti {
  /** Materiale per derivare la chiave; predefinito utente@macchina. Iniettabile nei test. */
  identita?: string;
}

interface FileSegreti {
  versione: 1;
  sale: string;
  iv: string;
  tag: string;
  dati: string;
}

const LUNGHEZZA_CHIAVE = 32;
const LUNGHEZZA_IV = 12;

function identitaPredefinita(): string {
  let utente = 'utente';
  try { utente = os.userInfo().username; } catch { /* alcuni ambienti senza passwd */ }
  return `${utente}@${os.hostname()}`;
}

function derivaChiave(identita: string, sale: Buffer): Promise<Buffer> {
  return new Promise((risolvi, rifiuta) => {
    crypto.scrypt(identita, sale, LUNGHEZZA_CHIAVE, (errore, chiave) => (errore ? rifiuta(errore) : risolvi(chiave)));
  });
}

export class ErroreSegreti extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'ErroreSegreti';
  }
}

export function creaStoreSegreti(percorsoFile: string, opzioni: OpzioniStoreSegreti = {}): StoreSegreti {
  const identita = opzioni.identita ?? identitaPredefinita();
  // Scritture serializzate: due chiamate concorrenti non devono perdersi a vicenda.
  let coda: Promise<unknown> = Promise.resolve();

  async function leggiTutto(): Promise<Record<string, string>> {
    let grezzo: string;
    try {
      grezzo = await fs.readFile(percorsoFile, 'utf8');
    } catch (errore) {
      if ((errore as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw errore;
    }
    let file: FileSegreti;
    try {
      file = JSON.parse(grezzo) as FileSegreti;
    } catch {
      throw new ErroreSegreti('file dei segreti illeggibile');
    }
    if (file.versione !== 1) throw new ErroreSegreti('versione del file dei segreti non supportata');
    const chiave = await derivaChiave(identita, Buffer.from(file.sale, 'base64'));
    const decifratore = crypto.createDecipheriv('aes-256-gcm', chiave, Buffer.from(file.iv, 'base64'));
    decifratore.setAuthTag(Buffer.from(file.tag, 'base64'));
    try {
      const chiaro = Buffer.concat([decifratore.update(Buffer.from(file.dati, 'base64')), decifratore.final()]);
      return JSON.parse(chiaro.toString('utf8')) as Record<string, string>;
    } catch {
      throw new ErroreSegreti('file dei segreti non decifrabile (altro utente o altra macchina?)');
    }
  }

  async function scriviTutto(segreti: Record<string, string>): Promise<void> {
    const sale = crypto.randomBytes(16);
    const iv = crypto.randomBytes(LUNGHEZZA_IV);
    const chiave = await derivaChiave(identita, sale);
    const cifratore = crypto.createCipheriv('aes-256-gcm', chiave, iv);
    const dati = Buffer.concat([cifratore.update(JSON.stringify(segreti), 'utf8'), cifratore.final()]);
    const file: FileSegreti = {
      versione: 1,
      sale: sale.toString('base64'),
      iv: iv.toString('base64'),
      tag: cifratore.getAuthTag().toString('base64'),
      dati: dati.toString('base64'),
    };
    await fs.mkdir(path.dirname(percorsoFile), { recursive: true });
    const temporaneo = `${percorsoFile}.tmp`;
    await fs.writeFile(temporaneo, JSON.stringify(file), { mode: 0o600 });
    await fs.rename(temporaneo, percorsoFile);
  }

  function inCoda<T>(lavoro: () => Promise<T>): Promise<T> {
    const esito = coda.then(lavoro, lavoro);
    coda = esito.catch(() => undefined);
    return esito;
  }

  return {
    leggi: (nome) => inCoda(async () => (await leggiTutto())[nome]),
    elenco: () => inCoda(async () => Object.keys(await leggiTutto()).sort()),
    scrivi: (nome, valore) => inCoda(async () => {
      const tutti = await leggiTutto();
      tutti[nome] = valore;
      await scriviTutto(tutti);
    }),
    rimuovi: (nome) => inCoda(async () => {
      const tutti = await leggiTutto();
      if (!(nome in tutti)) return;
      delete tutti[nome];
      await scriviTutto(tutti);
    }),
  };
}
