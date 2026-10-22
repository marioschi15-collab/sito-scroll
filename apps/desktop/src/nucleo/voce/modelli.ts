import path from 'node:path';

/** Motori di trascrizione selezionabili (docs/02 §7: gara Parakeet/Whisper; 'nessuno' = voce spenta). */
export type MotoreVoce = 'sherpa-parakeet' | 'sherpa-whisper' | 'nessuno';

/** Un file da scaricare dai rilasci ufficiali di sherpa-onnx (https://github.com/k2-fsa/sherpa-onnx/releases). */
export interface Risorsa {
  /** Nome del file o dell'archivio nei rilasci. */
  nome: string;
  url: string;
  /** Dimensione attesa in byte (verificata il 22/10/2026 con una richiesta HEAD). */
  byte: number;
  /** SHA-256 del file scaricato; se assente si controlla solo la dimensione. */
  sha256?: string;
}

export interface ModelloStt extends Risorsa {
  /** Cartella creata dall'estrazione dell'archivio .tar.bz2. */
  cartella: string;
  tipo: 'nemo_transducer' | 'whisper';
  /** File relativi alla cartella. */
  file: { encoder: string; decoder: string; joiner?: string; tokens: string };
  licenza: string;
  /** Nome mostrato all'utente. */
  etichetta: string;
}

const RILASCI = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models';

/** Silero VAD (MIT, ~630 KB): mai mandare silenzio al riconoscitore. */
export const MODELLO_VAD: Risorsa = {
  nome: 'silero_vad.onnx',
  url: `${RILASCI}/silero_vad.onnx`,
  byte: 643854,
  sha256: '9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6',
};

export const MODELLI_STT: Record<Exclude<MotoreVoce, 'nessuno'>, ModelloStt> = {
  'sherpa-parakeet': {
    nome: 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2',
    url: `${RILASCI}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2`,
    byte: 487170055,
    sha256: '5793d0fd397c5778d2cf2126994d58e9d56b1be7c04d13c7a15bb1b4eafb16bf',
    cartella: 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8',
    tipo: 'nemo_transducer',
    file: { encoder: 'encoder.int8.onnx', decoder: 'decoder.int8.onnx', joiner: 'joiner.int8.onnx', tokens: 'tokens.txt' },
    licenza: 'CC-BY-4.0 (NVIDIA Parakeet-TDT-0.6B-v3: serve l\'attribuzione nelle Informazioni)',
    etichetta: 'Parakeet (veloce)',
  },
  'sherpa-whisper': {
    nome: 'sherpa-onnx-whisper-turbo.tar.bz2',
    url: `${RILASCI}/sherpa-onnx-whisper-turbo.tar.bz2`,
    byte: 563790207,
    sha256: 'b11acbbcd660b44a8e0df33724feb5aaa709cf65668f2823d59f656312544f22',
    cartella: 'sherpa-onnx-whisper-turbo',
    tipo: 'whisper',
    file: { encoder: 'turbo-encoder.int8.onnx', decoder: 'turbo-decoder.int8.onnx', tokens: 'turbo-tokens.txt' },
    licenza: 'MIT (OpenAI Whisper large-v3-turbo)',
    etichetta: 'Whisper (accurato)',
  },
};

/** Percorsi assoluti dei file di un motore dentro `modelliVoce`. */
export function percorsiModello(modelliVoce: string, motore: Exclude<MotoreVoce, 'nessuno'>) {
  const m = MODELLI_STT[motore];
  const base = path.join(modelliVoce, m.cartella);
  return {
    archivio: path.join(modelliVoce, m.nome),
    cartella: base,
    encoder: path.join(base, m.file.encoder),
    decoder: path.join(base, m.file.decoder),
    joiner: m.file.joiner ? path.join(base, m.file.joiner) : undefined,
    tokens: path.join(base, m.file.tokens),
    vad: path.join(modelliVoce, MODELLO_VAD.nome),
  };
}
