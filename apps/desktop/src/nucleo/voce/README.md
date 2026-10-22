# voce — trascrizione locale delle note vocali (docs/02 §7)

Nel prototipo serve solo alle note vocali Telegram: niente push-to-talk, niente voce in uscita.

## Cosa fa

- `decodificaOggOpus(buffer) → Float32Array` a 16 kHz mono in [-1, 1] (`ogg-opus-decoder`, WASM, esce già a 16 kHz;
  `ricampiona` come rete di sicurezza).
- `creaVoiceService({ percorsi, logger, motore: 'sherpa-parakeet' | 'sherpa-whisper' | 'nessuno' })` implementa
  `VoiceService`:
  - `disponibile()` / `motivoNonDisponibile()`: motore spento, `sherpa-onnx-node` non caricabile (dipendenza
    opzionale, import dinamico) o modelli non scaricati — sempre con la frase italiana da mostrare.
  - `prepara(avanzamento)`: scarica in `percorsi.modelliVoce` il Silero VAD (`silero_vad.onnx`, 644 KB) e l'archivio
    del modello dai rilasci ufficiali di k2-fsa/sherpa-onnx (tag `asr-models`; il tag `vad-models` non esiste),
    con **ripresa** (`Range` sul `.part`) e **SHA-256** verificato (hash nel catalogo `modelli.ts`, calcolati il
    22/10/2026 sui file ufficiali); estrae il `.tar.bz2` con il `tar` di sistema (macOS, Linux, Windows 10+).
  - `trascrivi(pcm16k)`: Silero VAD (finestra 512) tiene solo il parlato → riconoscitore sherpa-onnx →
    `{ testo, confidenza, durataAudioSec, motore }`. La confidenza viene da `ys_log_probs` (Parakeet la fornisce).
    Il riconoscitore si scarica dalla memoria dopo 2 minuti di inattività (docs/07 R17).
- Catalogo: Parakeet-TDT-0.6B-v3 int8 (487 MB, CC-BY-4.0: attribuzione nelle Informazioni) e Whisper large-v3-turbo
  int8 (564 MB, MIT), con i nomi dei file dentro gli archivi.

Verificato dal vivo in questo contenitore (`sherpa-onnx-node` 1.13.8 linux-x64): Parakeet int8 trascrive i wav di
prova del modello in ~0,8 s per 7 s di audio dopo 6 s di caricamento, confidenza 0,93-0,99.

## Test

`pnpm --filter @spalla/desktop exec vitest run test/voce` — offline: la nota OGG/Opus viene generata con ffmpeg,
il download usa un `fetch` finto con `Range`, sherpa-onnx è sostituito da un modulo finto. Con
`SPALLA_MODELLI_VOCE=/cartella` (che contiene `silero_vad.onnx` e la cartella Parakeet estratta) gira anche la
trascrizione reale.

## Punti aperti

- Le frasi vengono da `@spalla/it-copy` (chiave `voce`); `testi.ts` tiene solo la forma `TestiVoce`.
- Gara Parakeet/Whisper su 20 vocali italiani (spike S-F): qui c'è solo l'infrastruttura.
- `tar` di sistema per il `.tar.bz2`: se nel pacchetto Electron si preferisce evitarlo, serve una libreria bzip2.
- Su Linux `sherpa-onnx-node` carica il binario senza `LD_LIBRARY_PATH` nel contenitore; da verificare nel pacchetto.
