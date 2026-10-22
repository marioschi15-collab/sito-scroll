import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decodificaOggOpus, durataSecondi, FREQUENZA_CAMPIONAMENTO, mescolaInMono, ricampiona } from '../src/nucleo/voce/decodifica.js';
import { generaOggOpus } from './telegram-finto.js';

let cartella: string;
beforeAll(() => {
  cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-voce-'));
});
afterAll(() => fs.rmSync(cartella, { recursive: true, force: true }));

/** Stima della frequenza dal numero di passaggi per lo zero. */
function frequenzaStimata(pcm: Float32Array, hz: number): number {
  let passaggi = 0;
  for (let i = 1; i < pcm.length; i++) if ((pcm[i - 1] as number) < 0 !== (pcm[i] as number) < 0) passaggi++;
  return (passaggi / 2) * (hz / pcm.length);
}

describe('decodificaOggOpus (nota vocale → PCM 16 kHz mono)', () => {
  it('un secondo di sinusoide a 440 Hz diventa ~16000 campioni in [-1, 1] alla frequenza giusta', async () => {
    const ogg = generaOggOpus(cartella, { secondi: 1, hz: 440 });
    if (!ogg) return; // ffmpeg assente: il test non può generare il campione
    const pcm = await decodificaOggOpus(fs.readFileSync(ogg));
    expect(pcm).toBeInstanceOf(Float32Array);
    expect(pcm.length).toBeGreaterThan(FREQUENZA_CAMPIONAMENTO * 0.95);
    expect(pcm.length).toBeLessThan(FREQUENZA_CAMPIONAMENTO * 1.05);
    expect(durataSecondi(pcm)).toBeCloseTo(1, 1);
    let massimo = 0;
    for (const v of pcm) massimo = Math.max(massimo, Math.abs(v));
    expect(massimo).toBeLessThanOrEqual(1);
    expect(massimo).toBeGreaterThan(0.05);
    const stabile = pcm.subarray(FREQUENZA_CAMPIONAMENTO / 4, (FREQUENZA_CAMPIONAMENTO * 3) / 4);
    expect(frequenzaStimata(stabile, FREQUENZA_CAMPIONAMENTO)).toBeCloseTo(440, -1.5);
  });

  it('una nota stereo viene mescolata in un solo canale', async () => {
    const ogg = generaOggOpus(cartella, { secondi: 0.5, canali: 2, nome: 'stereo.ogg' });
    if (!ogg) return;
    const pcm = await decodificaOggOpus(fs.readFileSync(ogg));
    expect(pcm.length).toBeGreaterThan(FREQUENZA_CAMPIONAMENTO * 0.45);
    expect(pcm.length).toBeLessThan(FREQUENZA_CAMPIONAMENTO * 0.55);
  });

  it('dati non audio producono un errore chiaro', async () => {
    await expect(decodificaOggOpus(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).rejects.toThrow(/non decodificabile/);
  });
});

describe('aiuti: mono e ricampionamento', () => {
  it('mescolaInMono fa la media dei canali', () => {
    const mono = mescolaInMono([new Float32Array([1, 0.5]), new Float32Array([0, 0.5])], 2);
    expect([...mono]).toEqual([0.5, 0.5]);
    expect(mescolaInMono([], 0).length).toBe(0);
  });

  it('ricampiona 48 kHz → 16 kHz riducendo la lunghezza di tre volte', () => {
    const ingresso = new Float32Array(4800).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / 48000));
    const uscita = ricampiona(ingresso, 48000, 16000);
    expect(uscita.length).toBe(1600);
    expect(frequenzaStimata(uscita, 16000)).toBeCloseTo(440, -1.5);
    expect(ricampiona(ingresso, 16000, 16000)).toBe(ingresso);
  });
});
