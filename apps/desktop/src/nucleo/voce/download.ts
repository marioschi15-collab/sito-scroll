import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const esegui = promisify(execFile);

export type FunzioneFetch = typeof fetch;

export interface OpzioniDownload {
  url: string;
  /** Percorso finale; durante il download si scrive in `<destinazione>.part`. */
  destinazione: string;
  /** Dimensione attesa in byte: serve per l'avanzamento e come controllo minimo. */
  byteAttesi?: number;
  /** SHA-256 esadecimale del file completo; se presente, un file diverso viene scartato. */
  sha256?: string;
  fetch?: FunzioneFetch;
  /** Avanzamento 0-1 (byte ricevuti / byte totali). */
  avanzamento?: (frazione: number) => void;
  signal?: AbortSignal;
}

export type MotivoErroreDownload = 'rete' | 'hash' | 'dimensione' | 'http';

export class ErroreDownload extends Error {
  constructor(
    public readonly motivo: MotivoErroreDownload,
    messaggio: string,
  ) {
    super(messaggio);
    this.name = 'ErroreDownload';
  }
}

/** SHA-256 di un file già su disco, a flusso (non carica tutto in memoria). */
export async function sha256File(percorso: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  for await (const pezzo of fs.createReadStream(percorso)) hash.update(pezzo as Buffer);
  return hash.digest('hex');
}

async function dimensioneFile(percorso: string): Promise<number> {
  try {
    return (await fsp.stat(percorso)).size;
  } catch {
    return 0;
  }
}

/**
 * Scarica un file grande con ripresa (header `Range` sul `.part` esistente) e verifica SHA-256.
 * Idempotente: se la destinazione esiste e il suo hash è giusto, non scarica nulla.
 */
export async function scaricaConRipresa(o: OpzioniDownload): Promise<void> {
  const fetchImpl = o.fetch ?? fetch;
  const parziale = `${o.destinazione}.part`;
  await fsp.mkdir(path.dirname(o.destinazione), { recursive: true });

  if (await fileValido(o.destinazione, o)) {
    o.avanzamento?.(1);
    return;
  }

  let giaScaricati = await dimensioneFile(parziale);
  const intestazioni: Record<string, string> = {};
  if (giaScaricati > 0) intestazioni.Range = `bytes=${giaScaricati}-`;

  let risposta: Response;
  try {
    risposta = await fetchImpl(o.url, { headers: intestazioni, signal: o.signal, redirect: 'follow' });
  } catch (errore) {
    throw new ErroreDownload('rete', errore instanceof Error ? errore.message : String(errore));
  }

  if (risposta.status === 416) {
    // Il server dice che il .part copre già tutto: passiamo alla verifica.
    await finalizza(parziale, o);
    return;
  }
  if (risposta.status === 200 && giaScaricati > 0) {
    // Il server non ha onorato il Range: si ricomincia da zero.
    await fsp.rm(parziale, { force: true });
    giaScaricati = 0;
  } else if (risposta.status !== 200 && risposta.status !== 206) {
    throw new ErroreDownload('http', `HTTP ${risposta.status} per ${o.url}`);
  }
  if (!risposta.body) throw new ErroreDownload('rete', 'risposta senza contenuto');

  const lunghezzaCorpo = Number(risposta.headers.get('content-length') ?? NaN);
  const totale = o.byteAttesi ?? (Number.isFinite(lunghezzaCorpo) ? giaScaricati + lunghezzaCorpo : undefined);

  const uscita = fs.createWriteStream(parziale, { flags: giaScaricati > 0 ? 'a' : 'w' });
  let ricevuti = giaScaricati;
  try {
    for await (const pezzo of risposta.body as AsyncIterable<Uint8Array>) {
      if (!uscita.write(pezzo)) await new Promise<void>((ok) => uscita.once('drain', () => ok()));
      ricevuti += pezzo.byteLength;
      if (totale) o.avanzamento?.(Math.min(1, ricevuti / totale));
    }
  } catch (errore) {
    throw new ErroreDownload('rete', errore instanceof Error ? errore.message : String(errore));
  } finally {
    await new Promise<void>((ok) => uscita.end(() => ok()));
  }

  await finalizza(parziale, o);
  o.avanzamento?.(1);
}

/** Verifica dimensione e hash del `.part`, poi lo rinomina sulla destinazione. */
async function finalizza(parziale: string, o: OpzioniDownload): Promise<void> {
  const dimensione = await dimensioneFile(parziale);
  if (o.byteAttesi !== undefined && dimensione !== o.byteAttesi) {
    // Un file più grande dell'atteso è corrotto; uno più piccolo è una ripresa interrotta che si completerà.
    if (dimensione > o.byteAttesi) await fsp.rm(parziale, { force: true });
    throw new ErroreDownload('dimensione', `attesi ${o.byteAttesi} byte, trovati ${dimensione}`);
  }
  if (o.sha256) {
    const hash = await sha256File(parziale);
    if (hash !== o.sha256.toLowerCase()) {
      await fsp.rm(parziale, { force: true });
      throw new ErroreDownload('hash', 'SHA-256 diverso da quello atteso');
    }
  }
  await fsp.rename(parziale, o.destinazione);
}

/** True se il file finale esiste ed è coerente con dimensione e hash attesi. */
export async function fileValido(percorso: string, attese: { byteAttesi?: number; sha256?: string }): Promise<boolean> {
  const dimensione = await dimensioneFile(percorso);
  if (dimensione === 0) return false;
  if (attese.byteAttesi !== undefined && dimensione !== attese.byteAttesi) return false;
  if (attese.sha256) return (await sha256File(percorso)) === attese.sha256.toLowerCase();
  return true;
}

/**
 * Estrae un archivio .tar.bz2 con il `tar` di sistema (presente su macOS, Linux e Windows 10+ come bsdtar).
 * Node non ha bzip2 integrato e non vogliamo una dipendenza nativa solo per questo.
 */
export async function estraiTarBz2(archivio: string, cartella: string): Promise<void> {
  await fsp.mkdir(cartella, { recursive: true });
  await esegui('tar', ['-xjf', archivio, '-C', cartella], { maxBuffer: 1024 * 1024 });
}
