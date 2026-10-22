import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Logger } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import { creaVoiceService, ErroreVoce, MODELLI_STT, MODELLO_VAD, percorsiModello, testiVocePredefiniti as testi, type ModuloSherpa } from '../src/nucleo/voce/index.js';
import { concatenaConPause, confidenzaDa, configRiconoscitore, configVad } from '../src/nucleo/voce/sherpa.js';

const logger: Logger = { info: () => undefined, avviso: () => undefined, errore: () => undefined };
let radice: string;
beforeAll(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-vs-'));
});
afterAll(() => fs.rmSync(radice, { recursive: true, force: true }));

function percorsi() {
  const precedente = process.env.SPALLA_HOME;
  process.env.SPALLA_HOME = radice;
  const p = calcolaPercorsi();
  if (precedente === undefined) delete process.env.SPALLA_HOME;
  else process.env.SPALLA_HOME = precedente;
  return p;
}

/** sherpa-onnx finto: il VAD tiene tutto ciò che supera una soglia, il riconoscitore "legge" la lunghezza. */
function sherpaFinto(opzioni: { parlato?: boolean } = {}): ModuloSherpa & { costruzioni: string[] } {
  const costruzioni: string[] = [];
  class Vad {
    private campioni: Float32Array[] = [];
    constructor(public config: Record<string, unknown>) {
      costruzioni.push('vad');
    }
    acceptWaveform(c: Float32Array) {
      if (opzioni.parlato !== false) this.campioni.push(c);
    }
    isEmpty() {
      return this.campioni.length === 0;
    }
    front() {
      return { start: 0, samples: this.campioni[0] as Float32Array };
    }
    pop() {
      this.campioni.shift();
    }
    flush() {}
    reset() {
      this.campioni = [];
    }
  }
  class OfflineRecognizer {
    constructor(public config: Record<string, unknown>) {
      costruzioni.push('riconoscitore');
    }
    createStream() {
      const stato = { campioni: 0 };
      return { acceptWaveform: (o: { samples: Float32Array }) => void (stato.campioni += o.samples.length), stato };
    }
    decode() {}
    getResult(s: { stato: { campioni: number } }) {
      return { text: ` ricordami di chiamare la Lamberti (${s.stato.campioni}) `, ys_log_probs: [-0.1, -0.2, -0.3] };
    }
  }
  return { OfflineRecognizer: OfflineRecognizer as unknown as ModuloSherpa['OfflineRecognizer'], Vad: Vad as unknown as ModuloSherpa['Vad'], costruzioni };
}

describe('creaVoiceService', () => {
  it('motore "nessuno": non disponibile, con il motivo in italiano; trascrivi rifiuta', async () => {
    const voce = creaVoiceService({ percorsi: percorsi(), logger, motore: 'nessuno' });
    expect(await voce.disponibile()).toBe(false);
    expect(await voce.motivoNonDisponibile()).toBe(testi.motoreSpento);
    await expect(voce.trascrivi(new Float32Array(16000))).rejects.toBeInstanceOf(ErroreVoce);
    await expect(voce.prepara()).rejects.toMatchObject({ codice: 'spento' });
  });

  it('senza sherpa-onnx-node installato lo dice chiaramente', async () => {
    const voce = creaVoiceService({ percorsi: percorsi(), logger, motore: 'sherpa-parakeet', caricaSherpa: async () => undefined });
    expect(await voce.motivoNonDisponibile()).toBe(testi.motoreMancante);
    await expect(voce.trascrivi(new Float32Array(1600))).rejects.toMatchObject({ codice: 'motore_mancante', message: testi.motoreMancante });
  });

  it('prepara scarica il rilevatore e il modello (fetch e tar finti), poi trascrive con VAD e riconoscitore', async () => {
    const p = percorsi();
    const vad = Buffer.alloc(MODELLO_VAD.byte, 1);
    // il catalogo ha l'hash vero del file ufficiale: nel test lo sostituiamo con un file finto dallo stesso peso
    const modello = MODELLI_STT['sherpa-parakeet'];
    const archivio = Buffer.from('archivio finto');
    const scaricati: string[] = [];
    const fetchFinto = (async (url: RequestInfo | URL) => {
      scaricati.push(String(url));
      if (String(url) === MODELLO_VAD.url) return new Response(vad, { status: 200, headers: { 'content-length': String(vad.length) } });
      if (String(url) === modello.url) return new Response(archivio, { status: 200, headers: { 'content-length': String(archivio.length) } });
      return new Response(null, { status: 404 });
    }) as typeof fetch;
    const sherpa = sherpaFinto();
    const voce = creaVoiceService({
      percorsi: p,
      logger,
      motore: 'sherpa-parakeet',
      caricaSherpa: async () => sherpa,
      fetch: fetchFinto,
      estrai: async (_archivio, cartella) => {
        const dove = path.join(cartella, modello.cartella);
        fs.mkdirSync(dove, { recursive: true });
        for (const f of Object.values(modello.file)) fs.writeFileSync(path.join(dove, f), 'x');
      },
      inattivitaMs: 50,
    });
    // Nel test il modello finto non ha il peso e l'hash veri: il servizio li controlla, quindi li aggiriamo
    // scrivendo direttamente i file del modello e lasciando a prepara() solo il rilevatore.
    const pm = percorsiModello(p.modelliVoce, 'sherpa-parakeet');
    fs.mkdirSync(pm.cartella, { recursive: true });
    for (const f of [pm.encoder, pm.decoder, pm.joiner as string, pm.tokens]) fs.writeFileSync(f, 'x');

    expect(await voce.motivoNonDisponibile()).toBe(testi.modelloMancante);
    const avanzamenti: Array<[number, string]> = [];
    // il rilevatore finto non ha l'hash ufficiale: ci aspettiamo l'errore "hash", con la frase per l'utente
    await expect(voce.prepara((f, m) => void avanzamenti.push([f, m]))).rejects.toMatchObject({ codice: 'download', message: testi.erroreHash });
    expect(scaricati).toEqual([MODELLO_VAD.url]);
    expect(avanzamenti[0]?.[1]).toBe(testi.preparazione.inizio);

    // con il rilevatore già presente (peso giusto) il servizio è pronto
    fs.writeFileSync(pm.vad, vad);
    expect(await voce.disponibile()).toBe(true);
    const pcm = new Float32Array(16000 * 2).fill(0.1);
    const t = await voce.trascrivi(pcm);
    expect(t.testo).toMatch(/^ricordami di chiamare la Lamberti \(\d+\)$/);
    expect(t.motore).toBe('sherpa-parakeet');
    expect(t.durataAudioSec).toBe(2);
    expect(t.confidenza).toBeCloseTo(Math.exp(-0.2), 5);
    expect(sherpa.costruzioni).toEqual(['riconoscitore', 'vad']);
    await voce.trascrivi(pcm);
    expect(sherpa.costruzioni).toHaveLength(2); // riusa il riconoscitore
    await new Promise((ok) => setTimeout(ok, 120));
    await voce.trascrivi(pcm);
    expect(sherpa.costruzioni).toHaveLength(4); // dopo l'inattività lo ricarica
  });

  it('senza parlato (VAD vuoto) restituisce testo vuoto senza chiamare il riconoscitore', async () => {
    const p = percorsi();
    const pm = percorsiModello(p.modelliVoce, 'sherpa-whisper');
    fs.mkdirSync(pm.cartella, { recursive: true });
    for (const f of [pm.encoder, pm.decoder, pm.tokens]) fs.writeFileSync(f, 'x');
    fs.writeFileSync(pm.vad, Buffer.alloc(MODELLO_VAD.byte, 1));
    const voce = creaVoiceService({ percorsi: p, logger, motore: 'sherpa-whisper', caricaSherpa: async () => sherpaFinto({ parlato: false }) });
    const t = await voce.trascrivi(new Float32Array(16000));
    expect(t.testo).toBe('');
    expect(t.confidenza).toBe(1);
  });
});

describe('configurazioni sherpa-onnx', () => {
  it('Parakeet è un transducer NeMo, Whisper usa encoder/decoder con lingua italiana', () => {
    const p = configRiconoscitore(MODELLI_STT['sherpa-parakeet'], { encoder: 'e', decoder: 'd', joiner: 'j', tokens: 't' });
    expect(p).toMatchObject({ modelConfig: { transducer: { encoder: 'e', decoder: 'd', joiner: 'j' }, modelType: 'nemo_transducer', tokens: 't' } });
    const w = configRiconoscitore(MODELLI_STT['sherpa-whisper'], { encoder: 'e', decoder: 'd', tokens: 't' });
    expect(w).toMatchObject({ modelConfig: { whisper: { encoder: 'e', decoder: 'd', language: 'it', task: 'transcribe' } } });
    expect(configVad('/m/silero_vad.onnx')).toMatchObject({ sileroVad: { model: '/m/silero_vad.onnx', windowSize: 512 }, sampleRate: 16000 });
  });

  it('confidenza dalle log-probabilità e concatenazione con pause', () => {
    expect(confidenzaDa({ text: 'x' })).toBeUndefined();
    expect(confidenzaDa({ text: 'x', ys_log_probs: [] })).toBeUndefined();
    expect(confidenzaDa({ text: 'x', ys_log_probs: [0, 0] })).toBe(1);
    const unito = concatenaConPause([new Float32Array([1, 1]), new Float32Array([2])], 2);
    expect([...unito]).toEqual([1, 1, 0, 0, 2]);
    expect(concatenaConPause([], 10).length).toBe(0);
  });

  it('il catalogo punta ai rilasci ufficiali di sherpa-onnx con hash dichiarati', () => {
    expect(MODELLO_VAD.url).toMatch(/^https:\/\/github\.com\/k2-fsa\/sherpa-onnx\/releases\/download\/asr-models\/silero_vad\.onnx$/);
    expect(MODELLO_VAD.sha256).toMatch(/^[0-9a-f]{64}$/);
    for (const m of Object.values(MODELLI_STT)) {
      expect(m.url).toMatch(/^https:\/\/github\.com\/k2-fsa\/sherpa-onnx\/releases\/download\/asr-models\/.+\.tar\.bz2$/);
      expect(m.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(m.byte).toBeGreaterThan(100_000_000);
    }
  });
});

/**
 * Prova dal vivo (saltata senza modelli): SPALLA_MODELLI_VOCE=/cartella con silero_vad.onnx e la cartella del modello
 * Parakeet estratta; trascrive un file WAV di prova del modello stesso.
 */
describe.skipIf(!process.env.SPALLA_MODELLI_VOCE)('trascrizione reale con sherpa-onnx-node', () => {
  it('trascrive test_wavs/es.wav con il modello Parakeet', async () => {
    const modelli = process.env.SPALLA_MODELLI_VOCE as string;
    const voce = creaVoiceService({ percorsi: { ...percorsi(), modelliVoce: modelli }, logger, motore: 'sherpa-parakeet' });
    expect(await voce.disponibile()).toBe(true);
    const wav = fs.readFileSync(path.join(modelli, MODELLI_STT['sherpa-parakeet'].cartella, 'test_wavs', 'es.wav'));
    const dati = wav.subarray(44);
    const pcm = new Float32Array(Math.floor(dati.length / 2));
    for (let i = 0; i < pcm.length; i++) pcm[i] = dati.readInt16LE(i * 2) / 32768;
    const t = await voce.trascrivi(pcm);
    expect(t.testo.toLowerCase()).toContain('país');
    expect(t.confidenza).toBeGreaterThan(0.5);
    voce.rilascia();
  }, 120_000);
});
