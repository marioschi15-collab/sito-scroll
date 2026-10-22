import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ErroreDownload, fileValido, scaricaConRipresa, sha256File } from '../src/nucleo/voce/download.js';

let cartella: string;
const contenuto = crypto.randomBytes(300_000);
const hash = crypto.createHash('sha256').update(contenuto).digest('hex');

beforeAll(() => {
  cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-dl-'));
});
afterAll(() => fs.rmSync(cartella, { recursive: true, force: true }));

/** Server finto: onora Range, può interrompere il flusso dopo N byte alla prima richiesta. */
function serverFinto(opzioni: { interrompiDopo?: number; ignoraRange?: boolean; stato?: number } = {}) {
  const richieste: Array<{ range?: string }> = [];
  let interrotto = false;
  const fetchFinto = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const intestazioni = (init?.headers ?? {}) as Record<string, string>;
    richieste.push({ range: intestazioni.Range });
    if (opzioni.stato) return new Response(null, { status: opzioni.stato });
    let inizio = 0;
    let status = 200;
    if (intestazioni.Range && !opzioni.ignoraRange) {
      inizio = Number(/bytes=(\d+)-/.exec(intestazioni.Range)?.[1] ?? 0);
      if (inizio >= contenuto.length) return new Response(null, { status: 416 });
      status = 206;
    }
    const porzione = contenuto.subarray(inizio);
    const limite = !interrotto && opzioni.interrompiDopo !== undefined ? opzioni.interrompiDopo : porzione.length;
    const passo = 50_000;
    let inviati = 0;
    const corpo = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (inviati >= Math.min(limite, porzione.length)) {
          if (limite < porzione.length) {
            interrotto = true;
            controller.error(new Error('connessione caduta'));
          } else controller.close();
          return;
        }
        controller.enqueue(porzione.subarray(inviati, Math.min(inviati + passo, limite, porzione.length)));
        inviati += passo;
      },
    });
    return new Response(corpo, { status, headers: { 'content-length': String(porzione.length) } });
  }) as typeof fetch;
  return { fetchFinto, richieste };
}

describe('download con ripresa e SHA-256', () => {
  it('riprende dal .part con l\'header Range e verifica l\'hash', async () => {
    const destinazione = path.join(cartella, 'modello.bin');
    const server = serverFinto({ interrompiDopo: 120_000 });
    const avanzamenti: number[] = [];
    await expect(scaricaConRipresa({ url: 'https://x/modello.bin', destinazione, byteAttesi: contenuto.length, sha256: hash, fetch: server.fetchFinto, avanzamento: (f) => void avanzamenti.push(f) })).rejects.toBeInstanceOf(ErroreDownload);
    expect(fs.existsSync(`${destinazione}.part`)).toBe(true);
    const parziale = fs.statSync(`${destinazione}.part`).size;
    expect(parziale).toBeGreaterThan(0);
    expect(parziale).toBeLessThan(contenuto.length);

    await scaricaConRipresa({ url: 'https://x/modello.bin', destinazione, byteAttesi: contenuto.length, sha256: hash, fetch: server.fetchFinto, avanzamento: (f) => void avanzamenti.push(f) });
    expect(server.richieste[1]?.range).toBe(`bytes=${parziale}-`);
    expect(fs.existsSync(`${destinazione}.part`)).toBe(false);
    expect(await sha256File(destinazione)).toBe(hash);
    expect(avanzamenti.at(-1)).toBe(1);
    expect(avanzamenti.every((f, i, a) => i === 0 || f >= (a[i - 1] as number) || f < 0.5)).toBe(true);

    // già valido: nessuna richiesta
    const prima = server.richieste.length;
    await scaricaConRipresa({ url: 'https://x/modello.bin', destinazione, byteAttesi: contenuto.length, sha256: hash, fetch: server.fetchFinto });
    expect(server.richieste.length).toBe(prima);
    expect(await fileValido(destinazione, { byteAttesi: contenuto.length, sha256: hash })).toBe(true);
  });

  it('se il server ignora il Range ricomincia da zero e completa comunque', async () => {
    const destinazione = path.join(cartella, 'senza-range.bin');
    fs.writeFileSync(`${destinazione}.part`, Buffer.alloc(1000, 7));
    const server = serverFinto({ ignoraRange: true });
    await scaricaConRipresa({ url: 'https://x/m', destinazione, byteAttesi: contenuto.length, sha256: hash, fetch: server.fetchFinto });
    expect(await sha256File(destinazione)).toBe(hash);
  });

  it('un hash diverso scarta il file e segnala "hash"', async () => {
    const destinazione = path.join(cartella, 'corrotto.bin');
    const server = serverFinto();
    const errore = await scaricaConRipresa({ url: 'https://x/m', destinazione, sha256: 'ab'.repeat(32), fetch: server.fetchFinto }).catch((e: unknown) => e);
    expect(errore).toBeInstanceOf(ErroreDownload);
    expect((errore as ErroreDownload).motivo).toBe('hash');
    expect(fs.existsSync(destinazione)).toBe(false);
    expect(fs.existsSync(`${destinazione}.part`)).toBe(false);
  });

  it('dimensione diversa da quella attesa e risposte HTTP di errore', async () => {
    const destinazione = path.join(cartella, 'dimensione.bin');
    const errore = await scaricaConRipresa({ url: 'https://x/m', destinazione, byteAttesi: contenuto.length + 1, fetch: serverFinto().fetchFinto }).catch((e: unknown) => e);
    expect((errore as ErroreDownload).motivo).toBe('dimensione');
    const http = await scaricaConRipresa({ url: 'https://x/m', destinazione: path.join(cartella, 'http.bin'), fetch: serverFinto({ stato: 404 }).fetchFinto }).catch((e: unknown) => e);
    expect((http as ErroreDownload).motivo).toBe('http');
    const rete = await scaricaConRipresa({ url: 'https://x/m', destinazione: path.join(cartella, 'rete.bin'), fetch: (async () => Promise.reject(new Error('offline'))) as typeof fetch }).catch((e: unknown) => e);
    expect((rete as ErroreDownload).motivo).toBe('rete');
  });
});
