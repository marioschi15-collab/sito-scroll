import { OggOpusDecoder } from 'ogg-opus-decoder';

/** Frequenza di campionamento richiesta dai motori vocali (VAD e STT): 16 kHz mono. */
export const FREQUENZA_CAMPIONAMENTO = 16000;

/** Opzioni del decodificatore: il tipo pubblicato non dichiara `sampleRate`, la libreria lo accetta (README). */
type OpzioniDecoder = ConstructorParameters<typeof OggOpusDecoder>[0] & { sampleRate?: number };

/**
 * OGG/Opus (nota vocale Telegram) → PCM Float32 mono a 16 kHz, in [-1, 1].
 * Il decodificatore WASM esce già a 16 kHz; se mai rispondesse con un'altra frequenza, ricampioniamo noi.
 */
export async function decodificaOggOpus(dati: Uint8Array): Promise<Float32Array> {
  const opzioni: OpzioniDecoder = { sampleRate: FREQUENZA_CAMPIONAMENTO };
  const decoder = new OggOpusDecoder(opzioni);
  await decoder.ready;
  try {
    const esito = await decoder.decodeFile(dati);
    if (esito.samplesDecoded === 0) {
      const dettaglio = esito.errors[0]?.message ?? 'nessun campione';
      throw new Error(`audio non decodificabile: ${dettaglio}`);
    }
    const mono = mescolaInMono(esito.channelData, esito.samplesDecoded);
    const frequenza: number = esito.sampleRate;
    return frequenza === FREQUENZA_CAMPIONAMENTO ? mono : ricampiona(mono, frequenza, FREQUENZA_CAMPIONAMENTO);
  } finally {
    decoder.free();
  }
}

/** Media dei canali (una nota vocale è mono, ma non ci fidiamo). */
export function mescolaInMono(canali: Float32Array[], campioni: number): Float32Array {
  const primo = canali[0];
  if (!primo) return new Float32Array(0);
  if (canali.length === 1) return primo.length === campioni ? primo : primo.subarray(0, campioni);
  const uscita = new Float32Array(campioni);
  for (const canale of canali) {
    for (let i = 0; i < campioni; i++) uscita[i] = (uscita[i] as number) + (canale[i] ?? 0);
  }
  const n = canali.length;
  for (let i = 0; i < campioni; i++) uscita[i] = (uscita[i] as number) / n;
  return uscita;
}

/** Ricampionamento lineare: basta per la voce (il decodificatore esce già alla frequenza giusta). */
export function ricampiona(pcm: Float32Array, da: number, a: number): Float32Array {
  if (da === a || pcm.length === 0) return pcm;
  const rapporto = da / a;
  const lunghezza = Math.max(1, Math.round(pcm.length / rapporto));
  const uscita = new Float32Array(lunghezza);
  for (let i = 0; i < lunghezza; i++) {
    const posizione = i * rapporto;
    const indice = Math.floor(posizione);
    const frazione = posizione - indice;
    const a0 = pcm[indice] ?? 0;
    const a1 = pcm[indice + 1] ?? a0;
    uscita[i] = a0 + (a1 - a0) * frazione;
  }
  return uscita;
}

/** Durata in secondi di un PCM a 16 kHz. */
export function durataSecondi(pcm: Float32Array, frequenza = FREQUENZA_CAMPIONAMENTO): number {
  return pcm.length / frequenza;
}
