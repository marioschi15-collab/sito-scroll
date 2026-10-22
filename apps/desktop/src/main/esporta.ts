import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * "Esporta tutto" (docs/03, docs/10: i dati sono dell'utente): uno zip della cartella di lavoro.
 * Nessuna dipendenza nuova: un piccolo scrittore ZIP (deflate di node:zlib, nomi UTF-8, senza ZIP64) che basta per
 * una cartella di documenti. Limiti: 65 535 voci e 4 GB in tutto; i file oltre 4 GB e i collegamenti simbolici sono
 * saltati (un collegamento potrebbe portare fuori dalla cartella).
 */

export interface EsitoZip {
  file: number;
  cartelle: number;
  byte: number;
  saltati: string[];
}

const LIMITE_32 = 0xffffffff;
const MAX_VOCI = 0xffff;
const FLAG_UTF8 = 0x0800;

let tabellaCrc: Uint32Array | undefined;

/** CRC-32 (quello di zlib se c'è: Node ≥ 22.2; altrimenti a tabella). */
export function crc32(dati: Uint8Array): number {
  const nativo = (zlib as unknown as { crc32?: (d: Uint8Array) => number }).crc32;
  if (typeof nativo === 'function') return nativo(dati) >>> 0;
  if (!tabellaCrc) {
    tabellaCrc = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tabellaCrc[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < dati.length; i++) crc = (tabellaCrc[(crc ^ (dati[i] as number)) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dataDos(d: Date): { ora: number; data: number } {
  const anno = Math.max(1980, d.getFullYear());
  return {
    ora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    data: ((anno - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

interface Voce {
  nome: Buffer;
  metodo: 0 | 8;
  crc: number;
  compressa: number;
  originale: number;
  ora: number;
  data: number;
  offset: number;
  cartella: boolean;
}

async function* visita(cartella: string, base: string, escludi: (assoluto: string) => boolean, saltati: string[]): AsyncGenerator<{ assoluto: string; relativo: string; cartella: boolean }> {
  const voci = await fsp.readdir(cartella, { withFileTypes: true });
  voci.sort((a, b) => a.name.localeCompare(b.name));
  for (const v of voci) {
    const assoluto = path.join(cartella, v.name);
    if (escludi(assoluto)) continue;
    const relativo = path.relative(base, assoluto).split(path.sep).join('/');
    if (v.isSymbolicLink()) {
      saltati.push(relativo);
      continue;
    }
    if (v.isDirectory()) {
      yield { assoluto, relativo, cartella: true };
      yield* visita(assoluto, base, escludi, saltati);
    } else if (v.isFile()) {
      yield { assoluto, relativo, cartella: false };
    }
  }
}

/**
 * Scrive `destinazione` (zip) con tutto il contenuto di `cartella`, sotto la radice `radice/` (predefinita: il nome
 * della cartella). Scrive prima in un file ".parziale" e lo rinomina alla fine.
 */
export async function scriviZip(cartella: string, destinazione: string, opzioni: { radice?: string } = {}): Promise<EsitoZip> {
  const radice = (opzioni.radice ?? path.basename(cartella)).replace(/[\\/]+/g, '_');
  const parziale = `${destinazione}.parziale`;
  const destinazioneAssoluta = path.resolve(destinazione);
  const escludi = (assoluto: string): boolean => {
    const a = path.resolve(assoluto);
    return a === destinazioneAssoluta || a === path.resolve(parziale) || path.basename(a) === '.DS_Store';
  };
  const esito: EsitoZip = { file: 0, cartelle: 0, byte: 0, saltati: [] };
  const voci: Voce[] = [];
  const fh = await fsp.open(parziale, 'w');
  let offset = 0;

  async function scrivi(b: Buffer): Promise<void> {
    await fh.write(b, 0, b.length);
    offset += b.length;
  }

  async function aggiungi(nomeZip: string, dati: Buffer | undefined, mtime: Date): Promise<void> {
    if (voci.length >= MAX_VOCI) throw new Error('troppi file per uno zip senza ZIP64');
    const nome = Buffer.from(nomeZip, 'utf8');
    const cartellaVoce = dati === undefined;
    const originale = dati ?? Buffer.alloc(0);
    const crc = cartellaVoce ? 0 : crc32(originale);
    let metodo: 0 | 8 = 0;
    let corpo = originale;
    if (!cartellaVoce && originale.length > 0) {
      const compresso = zlib.deflateRawSync(originale, { level: 6 });
      if (compresso.length < originale.length) {
        metodo = 8;
        corpo = compresso;
      }
    }
    if (offset + 30 + nome.length + corpo.length > LIMITE_32) throw new Error('archivio oltre 4 GB');
    const { ora, data } = dataDos(mtime);
    const intestazione = Buffer.alloc(30);
    intestazione.writeUInt32LE(0x04034b50, 0);
    intestazione.writeUInt16LE(20, 4);
    intestazione.writeUInt16LE(FLAG_UTF8, 6);
    intestazione.writeUInt16LE(metodo, 8);
    intestazione.writeUInt16LE(ora, 10);
    intestazione.writeUInt16LE(data, 12);
    intestazione.writeUInt32LE(crc, 14);
    intestazione.writeUInt32LE(corpo.length, 18);
    intestazione.writeUInt32LE(originale.length, 22);
    intestazione.writeUInt16LE(nome.length, 26);
    intestazione.writeUInt16LE(0, 28);
    voci.push({ nome, metodo, crc, compressa: corpo.length, originale: originale.length, ora, data, offset, cartella: cartellaVoce });
    await scrivi(intestazione);
    await scrivi(nome);
    if (corpo.length > 0) await scrivi(corpo);
  }

  try {
    await aggiungi(`${radice}/`, undefined, (await fsp.stat(cartella)).mtime);
    for await (const v of visita(cartella, cartella, escludi, esito.saltati)) {
      const info = await fsp.stat(v.assoluto);
      if (v.cartella) {
        await aggiungi(`${radice}/${v.relativo}/`, undefined, info.mtime);
        esito.cartelle++;
        continue;
      }
      if (info.size >= LIMITE_32) {
        esito.saltati.push(v.relativo);
        continue;
      }
      await aggiungi(`${radice}/${v.relativo}`, await fsp.readFile(v.assoluto), info.mtime);
      esito.file++;
      esito.byte += info.size;
    }

    const inizioDirectory = offset;
    for (const v of voci) {
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0);
      c.writeUInt16LE((3 << 8) | 20, 4); // creato su Unix, versione 2.0: i permessi stanno negli attributi esterni
      c.writeUInt16LE(20, 6);
      c.writeUInt16LE(FLAG_UTF8, 8);
      c.writeUInt16LE(v.metodo, 10);
      c.writeUInt16LE(v.ora, 12);
      c.writeUInt16LE(v.data, 14);
      c.writeUInt32LE(v.crc, 16);
      c.writeUInt32LE(v.compressa, 20);
      c.writeUInt32LE(v.originale, 24);
      c.writeUInt16LE(v.nome.length, 28);
      c.writeUInt16LE(0, 30);
      c.writeUInt16LE(0, 32);
      c.writeUInt16LE(0, 34);
      c.writeUInt16LE(0, 36);
      c.writeUInt32LE(v.cartella ? ((0o40755 << 16) | 0x10) >>> 0 : (0o100644 << 16) >>> 0, 38);
      c.writeUInt32LE(v.offset, 42);
      await scrivi(c);
      await scrivi(v.nome);
    }
    const fine = Buffer.alloc(22);
    fine.writeUInt32LE(0x06054b50, 0);
    fine.writeUInt16LE(0, 4);
    fine.writeUInt16LE(0, 6);
    fine.writeUInt16LE(voci.length, 8);
    fine.writeUInt16LE(voci.length, 10);
    fine.writeUInt32LE(offset - inizioDirectory, 12);
    fine.writeUInt32LE(inizioDirectory, 16);
    fine.writeUInt16LE(0, 20);
    await scrivi(fine);
    await fh.close();
    await fsp.rename(parziale, destinazione);
    return esito;
  } catch (errore) {
    await fh.close().catch(() => undefined);
    await fsp.rm(parziale, { force: true }).catch(() => undefined);
    throw errore;
  }
}

/** Data locale AAAA-MM-GG per il nome proposto del file. */
export function dataLocaleIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
