/**
 * Facciata tipizzata e minima su `sherpa-onnx-node` (dipendenza opzionale, CommonJS, caricata con import dinamico):
 * se il pacchetto o il binario nativo mancano, il servizio voce lo dice in italiano invece di andare in errore.
 */
import type { ModelloStt } from './modelli.js';

export interface RisultatoSherpa {
  text: string;
  tokens?: string[];
  timestamps?: number[];
  ys_log_probs?: number[];
  lang?: string;
}

export interface StreamOffline {
  acceptWaveform(onda: { samples: Float32Array; sampleRate: number }): void;
}

export interface RiconoscitoreSherpa {
  createStream(): StreamOffline;
  decode(stream: StreamOffline): void;
  getResult(stream: StreamOffline): RisultatoSherpa;
}

export interface VadSherpa {
  acceptWaveform(campioni: Float32Array): void;
  isEmpty(): boolean;
  front(): { start: number; samples: Float32Array };
  pop(): void;
  flush(): void;
  reset(): void;
}

export interface ModuloSherpa {
  OfflineRecognizer: new (config: Record<string, unknown>) => RiconoscitoreSherpa;
  Vad: new (config: Record<string, unknown>, bufferSecondi: number) => VadSherpa;
  version?: string;
}

const NOME_PACCHETTO = 'sherpa-onnx-node';

/** Carica il modulo nativo; `undefined` se non installato o non caricabile su questa macchina. */
export async function caricaSherpa(logger?: { avviso(evento: string, dati?: Record<string, unknown>): void }): Promise<ModuloSherpa | undefined> {
  try {
    // Nome in variabile: TypeScript non cerca tipi per il pacchetto (è opzionale e senza .d.ts).
    const modulo = (await import(NOME_PACCHETTO)) as { default?: unknown } & Record<string, unknown>;
    const radice = (modulo.default ?? modulo) as Partial<ModuloSherpa>;
    if (typeof radice.OfflineRecognizer !== 'function' || typeof radice.Vad !== 'function') return undefined;
    return radice as ModuloSherpa;
  } catch (errore) {
    logger?.avviso('voce.sherpa_non_caricabile', { errore: errore instanceof Error ? errore.message : String(errore) });
    return undefined;
  }
}

/** Configurazione del riconoscitore per il modello scelto (nomi dei campi: sherpa-onnx-node/types.js). */
export function configRiconoscitore(modello: ModelloStt, file: { encoder: string; decoder: string; joiner?: string; tokens: string }, numThreads = 2): Record<string, unknown> {
  const comune = { tokens: file.tokens, numThreads, provider: 'cpu', debug: 0 };
  if (modello.tipo === 'whisper') {
    return {
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        ...comune,
        whisper: { encoder: file.encoder, decoder: file.decoder, language: 'it', task: 'transcribe', tailPaddings: -1 },
      },
      decodingMethod: 'greedy_search',
    };
  }
  return {
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      ...comune,
      transducer: { encoder: file.encoder, decoder: file.decoder, joiner: file.joiner ?? '' },
      modelType: 'nemo_transducer',
    },
    decodingMethod: 'greedy_search',
  };
}

/** Configurazione del Silero VAD a 16 kHz (finestra 512 campioni = 32 ms). */
export function configVad(percorsoModello: string): Record<string, unknown> {
  return {
    sileroVad: {
      model: percorsoModello,
      threshold: 0.5,
      minSilenceDuration: 0.25,
      minSpeechDuration: 0.25,
      maxSpeechDuration: 20,
      windowSize: 512,
    },
    sampleRate: 16000,
    numThreads: 1,
    provider: 'cpu',
    debug: 0,
  };
}

export const FINESTRA_VAD = 512;

/**
 * Tiene solo i tratti parlati: il riconoscitore non deve mai vedere silenzio (docs/02 §7).
 * Restituisce i segmenti concatenati con 100 ms di silenzio tra l'uno e l'altro; vuoto se non c'è parlato.
 */
export function filtraParlato(vad: VadSherpa, pcm16k: Float32Array): Float32Array {
  vad.reset();
  for (let i = 0; i < pcm16k.length; i += FINESTRA_VAD) {
    const finestra = pcm16k.subarray(i, Math.min(i + FINESTRA_VAD, pcm16k.length));
    if (finestra.length === FINESTRA_VAD) vad.acceptWaveform(finestra);
    else {
      const riempita = new Float32Array(FINESTRA_VAD);
      riempita.set(finestra);
      vad.acceptWaveform(riempita);
    }
  }
  vad.flush();
  const segmenti: Float32Array[] = [];
  while (!vad.isEmpty()) {
    segmenti.push(vad.front().samples);
    vad.pop();
  }
  return concatenaConPause(segmenti, 1600);
}

export function concatenaConPause(segmenti: Float32Array[], pausaCampioni: number): Float32Array {
  if (segmenti.length === 0) return new Float32Array(0);
  const totale = segmenti.reduce((somma, s) => somma + s.length, 0) + pausaCampioni * (segmenti.length - 1);
  const uscita = new Float32Array(totale);
  let posizione = 0;
  segmenti.forEach((s, i) => {
    uscita.set(s, posizione);
    posizione += s.length + (i < segmenti.length - 1 ? pausaCampioni : 0);
  });
  return uscita;
}

/** Confidenza 0-1 dalle log-probabilità dei token, se il modello le fornisce. */
export function confidenzaDa(risultato: RisultatoSherpa): number | undefined {
  const lp = risultato.ys_log_probs;
  if (!lp || lp.length === 0) return undefined;
  const media = lp.reduce((s, v) => s + v, 0) / lp.length;
  if (!Number.isFinite(media)) return undefined;
  return Math.min(1, Math.max(0, Math.exp(media)));
}
