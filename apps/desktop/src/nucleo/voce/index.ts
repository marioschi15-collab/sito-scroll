import fsp from 'node:fs/promises';
import path from 'node:path';
import type { Logger, Percorsi, Trascrizione, VoiceService } from '../contratti.js';
import { decodificaOggOpus, durataSecondi, FREQUENZA_CAMPIONAMENTO } from './decodifica.js';
import { ErroreDownload, estraiTarBz2, fileValido, scaricaConRipresa, type FunzioneFetch } from './download.js';
import { MODELLI_STT, MODELLO_VAD, percorsiModello, type ModelloStt, type MotoreVoce } from './modelli.js';
import {
  caricaSherpa,
  confidenzaDa,
  configRiconoscitore,
  configVad,
  filtraParlato,
  type ModuloSherpa,
  type RiconoscitoreSherpa,
  type VadSherpa,
} from './sherpa.js';
import { testiVocePredefiniti, type TestiVoce } from './testi.js';

export { decodificaOggOpus, durataSecondi, FREQUENZA_CAMPIONAMENTO, mescolaInMono, ricampiona } from './decodifica.js';
export { ErroreDownload, estraiTarBz2, fileValido, scaricaConRipresa, sha256File } from './download.js';
export type { FunzioneFetch, OpzioniDownload } from './download.js';
export { MODELLI_STT, MODELLO_VAD, percorsiModello } from './modelli.js';
export type { ModelloStt, MotoreVoce, Risorsa } from './modelli.js';
export { caricaSherpa, concatenaConPause, confidenzaDa, configRiconoscitore, configVad, filtraParlato } from './sherpa.js';
export type { ModuloSherpa, RiconoscitoreSherpa, RisultatoSherpa, VadSherpa } from './sherpa.js';
export { testiVocePredefiniti } from './testi.js';
export type { TestiVoce } from './testi.js';

/** Errore con messaggio già in italiano, da mostrare all'utente così com'è. */
export class ErroreVoce extends Error {
  constructor(messaggio: string, public readonly codice: 'spento' | 'motore_mancante' | 'modello_mancante' | 'modello_danneggiato' | 'download') {
    super(messaggio);
    this.name = 'ErroreVoce';
  }
}

export interface DipendenzeVoce {
  percorsi: Percorsi;
  logger: Logger;
  motore: MotoreVoce;
  testi?: TestiVoce;
  /** Iniettabili nei test. */
  fetch?: FunzioneFetch;
  caricaSherpa?: () => Promise<ModuloSherpa | undefined>;
  estrai?: (archivio: string, cartella: string) => Promise<void>;
  /** Dopo quanto il riconoscitore viene scaricato dalla memoria (docs/07 R17: 2 minuti). */
  inattivitaMs?: number;
  numThreads?: number;
}

export interface VoiceServiceEsteso extends VoiceService {
  readonly motore: MotoreVoce;
  /** Perché non è disponibile, in italiano; `undefined` se è pronto. */
  motivoNonDisponibile(): Promise<string | undefined>;
  /** Scarica il modello e il rilevatore se mancano (alias leggibile di `prepara`). */
  scaricaModelli(avanzamento?: (frazione: number, messaggio: string) => void): Promise<void>;
  /** Rilascia il riconoscitore dalla memoria. */
  rilascia(): void;
}

export const INATTIVITA_RICONOSCITORE_MS = 2 * 60 * 1000;

/**
 * Servizio voce (docs/02 §7, nel prototipo solo le note vocali Telegram): Silero VAD + riconoscitore sherpa-onnx
 * in locale, modelli scaricati in `percorsi.modelliVoce` solo quando l'utente attiva la voce.
 */
export function creaVoiceService(deps: DipendenzeVoce): VoiceServiceEsteso {
  const { percorsi, logger, motore } = deps;
  const testi = deps.testi ?? testiVocePredefiniti;
  const carica = deps.caricaSherpa ?? (() => caricaSherpa(logger));
  const estrai = deps.estrai ?? estraiTarBz2;
  const inattivitaMs = deps.inattivitaMs ?? INATTIVITA_RICONOSCITORE_MS;

  let sherpaPromessa: Promise<ModuloSherpa | undefined> | undefined;
  let riconoscitore: RiconoscitoreSherpa | undefined;
  let vad: VadSherpa | undefined;
  let timerRilascio: NodeJS.Timeout | undefined;

  function modello(): ModelloStt | undefined {
    return motore === 'nessuno' ? undefined : MODELLI_STT[motore];
  }

  function sherpa(): Promise<ModuloSherpa | undefined> {
    sherpaPromessa ??= carica();
    return sherpaPromessa;
  }

  async function fileModelloPresenti(): Promise<boolean> {
    if (motore === 'nessuno') return false;
    const p = percorsiModello(percorsi.modelliVoce, motore);
    const richiesti = [p.encoder, p.decoder, p.tokens, ...(p.joiner ? [p.joiner] : [])];
    const esiti = await Promise.all(richiesti.map((f) => fsp.stat(f).then((s) => s.size > 0).catch(() => false)));
    return esiti.every(Boolean);
  }

  async function motivoNonDisponibile(): Promise<string | undefined> {
    if (motore === 'nessuno') return testi.motoreSpento;
    if (!(await sherpa())) return testi.motoreMancante;
    const vadOk = await fileValido(path.join(percorsi.modelliVoce, MODELLO_VAD.nome), { byteAttesi: MODELLO_VAD.byte });
    if (!vadOk || !(await fileModelloPresenti())) return testi.modelloMancante;
    return undefined;
  }

  async function prepara(avanzamento?: (frazione: number, messaggio: string) => void): Promise<void> {
    const m = modello();
    if (!m || motore === 'nessuno') throw new ErroreVoce(testi.motoreSpento, 'spento');
    const p = percorsiModello(percorsi.modelliVoce, motore);
    await fsp.mkdir(percorsi.modelliVoce, { recursive: true });
    avanzamento?.(0, testi.preparazione.inizio);

    try {
      // 1) Rilevatore di parlato (piccolo): 0-5 % della barra.
      avanzamento?.(0, testi.preparazione.rilevatore);
      await scaricaConRipresa({
        url: MODELLO_VAD.url,
        destinazione: p.vad,
        byteAttesi: MODELLO_VAD.byte,
        sha256: MODELLO_VAD.sha256,
        fetch: deps.fetch,
        avanzamento: (f) => avanzamento?.(f * 0.05, testi.preparazione.rilevatore),
      });

      // 2) Modello di riconoscimento (grande): 5-95 %, poi estrazione.
      if (!(await fileModelloPresenti())) {
        const megabyte = Math.round(m.byte / 1_000_000);
        const etichetta = testi.preparazione.modello(m.etichetta, megabyte);
        avanzamento?.(0.05, etichetta);
        await scaricaConRipresa({
          url: m.url,
          destinazione: p.archivio,
          byteAttesi: m.byte,
          sha256: m.sha256,
          fetch: deps.fetch,
          avanzamento: (f) => avanzamento?.(0.05 + f * 0.9, f >= 1 ? testi.preparazione.verifica : etichetta),
        });
        avanzamento?.(0.96, testi.preparazione.estrazione);
        await estrai(p.archivio, percorsi.modelliVoce);
        if (!(await fileModelloPresenti())) throw new ErroreVoce(testi.modelloDanneggiato, 'modello_danneggiato');
        await fsp.rm(p.archivio, { force: true });
      }
      logger.info('voce.modelli_pronti', { motore });
      avanzamento?.(1, testi.preparazione.fatto);
    } catch (errore) {
      if (errore instanceof ErroreVoce) throw errore;
      if (errore instanceof ErroreDownload) {
        logger.avviso('voce.download_fallito', { motivo: errore.motivo, dettaglio: errore.message });
        throw new ErroreVoce(errore.motivo === 'hash' ? testi.erroreHash : testi.erroreDownload, 'download');
      }
      logger.errore('voce.preparazione_fallita', { errore: errore instanceof Error ? errore.message : String(errore) });
      throw new ErroreVoce(testi.erroreDownload, 'download');
    }
  }

  function rilascia(): void {
    if (timerRilascio) clearTimeout(timerRilascio);
    timerRilascio = undefined;
    riconoscitore = undefined;
    vad = undefined;
  }

  function programmaRilascio(): void {
    if (timerRilascio) clearTimeout(timerRilascio);
    timerRilascio = setTimeout(() => {
      rilascia();
      logger.info('voce.riconoscitore_rilasciato');
    }, inattivitaMs);
    timerRilascio.unref?.();
  }

  async function motori(): Promise<{ riconoscitore: RiconoscitoreSherpa; vad: VadSherpa }> {
    const motivo = await motivoNonDisponibile();
    if (motivo) {
      const codice = motore === 'nessuno' ? 'spento' : motivo === testi.motoreMancante ? 'motore_mancante' : 'modello_mancante';
      throw new ErroreVoce(motivo, codice);
    }
    const modulo = (await sherpa()) as ModuloSherpa;
    const m = modello() as ModelloStt;
    const p = percorsiModello(percorsi.modelliVoce, motore as Exclude<MotoreVoce, 'nessuno'>);
    if (!riconoscitore) {
      const inizio = Date.now();
      riconoscitore = new modulo.OfflineRecognizer(
        configRiconoscitore(m, { encoder: p.encoder, decoder: p.decoder, joiner: p.joiner, tokens: p.tokens }, deps.numThreads ?? 2),
      );
      logger.info('voce.riconoscitore_caricato', { motore, ms: Date.now() - inizio });
    }
    vad ??= new modulo.Vad(configVad(p.vad), 60);
    return { riconoscitore, vad };
  }

  async function trascrivi(pcm16k: Float32Array): Promise<Trascrizione> {
    const { riconoscitore: r, vad: v } = await motori();
    programmaRilascio();
    const durataAudioSec = durataSecondi(pcm16k);
    const parlato = filtraParlato(v, pcm16k);
    if (parlato.length === 0) {
      logger.info('voce.nessun_parlato', { durataAudioSec });
      return { testo: '', confidenza: 1, durataAudioSec, motore };
    }
    const inizio = Date.now();
    const stream = r.createStream();
    stream.acceptWaveform({ samples: parlato, sampleRate: FREQUENZA_CAMPIONAMENTO });
    r.decode(stream);
    const risultato = r.getResult(stream);
    const testo = risultato.text.trim();
    const confidenza = confidenzaDa(risultato);
    logger.info('voce.trascritto', { motore, durataAudioSec, parlatoSec: durataSecondi(parlato), ms: Date.now() - inizio, caratteri: testo.length });
    return { testo, ...(confidenza !== undefined ? { confidenza } : {}), durataAudioSec, motore };
  }

  return {
    motore,
    disponibile: async () => (await motivoNonDisponibile()) === undefined,
    motivoNonDisponibile,
    prepara,
    scaricaModelli: prepara,
    trascrivi,
    rilascia,
  };
}
