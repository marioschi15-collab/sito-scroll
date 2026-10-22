import type { webcrypto } from 'node:crypto';
import { REGEX_TOKEN } from './botfather.js';
import { decifraBusta, generaCoppiaEffimera, type BustaCifrata, type ContenutoConsegna } from './crypto-coppia.js';

export const REGEX_NONCE = /^[a-z0-9]{8,16}$/;
export const INTERVALLO_SONDAGGIO_MS = 2000;
export const TIMEOUT_COLLEGAMENTO_MS = 10 * 60 * 1000;

export interface OpzioniClientManagedBots {
  /** URL base del nostro Worker, es. https://bot-gestore.spalla.example */
  urlGestore: string;
  /** Username del bot gestore (senza @), quello che compare in t.me/newbot/<gestore>/... */
  botGestore: string;
  /** Prefisso dello username del bot utente (minuscolo, [a-z0-9_]). */
  prefisso?: string;
  fetch?: typeof fetch;
  crypto?: webcrypto.Crypto;
  attendi?: (ms: number) => Promise<void>;
  intervalloMs?: number;
  timeoutMs?: number;
}

export interface Collegamento {
  nonce: string;
  username: string;
  /** Deep link da aprire sul telefono: t.me/newbot/<gestore>/<username>?name=<nome>. */
  link: string;
  /** Attende che il Worker consegni il token (sondaggio GET /pair/<nonce>), poi lo decifra. */
  attendi(signal?: AbortSignal): Promise<ContenutoConsegna>;
}

export class ErroreCollegamento extends Error {
  constructor(
    public readonly codice: 'rete' | 'gestore' | 'timeout' | 'annullato' | 'busta',
    messaggio: string,
  ) {
    super(messaggio);
    this.name = 'ErroreCollegamento';
  }
}

export function generaNonce(c: webcrypto.Crypto = globalThis.crypto as unknown as webcrypto.Crypto, lunghezza = 10): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = c.getRandomValues(new Uint8Array(lunghezza));
  let s = '';
  for (const b of bytes) s += alfabeto[b % alfabeto.length];
  return s;
}

/** Username del bot utente: `<prefisso>_<nonce>_bot`, come lo riconosce il Worker. */
export function usernameDaNonce(nonce: string, prefisso = 'spalla'): string {
  return `${prefisso}_${nonce}_bot`;
}

export function costruisciLink(botGestore: string, username: string, nome: string): string {
  return `https://t.me/newbot/${encodeURIComponent(botGestore)}/${encodeURIComponent(username)}?name=${encodeURIComponent(nome)}`;
}

/**
 * Lato app della creazione del bot in due tocchi (docs/02 §8.2): nonce + chiave effimera registrati sul Worker,
 * link da aprire, sondaggio del risultato, decifratura del token. Il Worker non vede mai messaggi.
 */
export function creaClientManagedBots(o: OpzioniClientManagedBots) {
  const fetchImpl = o.fetch ?? fetch;
  const c = o.crypto ?? (globalThis.crypto as unknown as webcrypto.Crypto);
  const attendi = o.attendi ?? ((ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)));
  const intervalloMs = o.intervalloMs ?? INTERVALLO_SONDAGGIO_MS;
  const timeoutMs = o.timeoutMs ?? TIMEOUT_COLLEGAMENTO_MS;
  const base = o.urlGestore.replace(/\/+$/g, '');

  return {
    async avviaCollegamento(dati: { nomeAssistente: string; nomeUtente: string }): Promise<Collegamento> {
      const nonce = generaNonce(c);
      const username = usernameDaNonce(nonce, o.prefisso);
      const { coppia, pubblicaBase64url } = await generaCoppiaEffimera(c);

      let registrazione: Response;
      try {
        registrazione = await fetchImpl(`${base}/pair`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nonce, chiave_pubblica: pubblicaBase64url }),
        });
      } catch (errore) {
        throw new ErroreCollegamento('rete', errore instanceof Error ? errore.message : String(errore));
      }
      if (!registrazione.ok) throw new ErroreCollegamento('gestore', `registrazione rifiutata: HTTP ${registrazione.status}`);

      const link = costruisciLink(o.botGestore, username, `${dati.nomeAssistente} di ${dati.nomeUtente}`);
      return {
        nonce,
        username,
        link,
        attendi: async (signal) => {
          const scadenza = Date.now() + timeoutMs;
          while (Date.now() < scadenza) {
            if (signal?.aborted) throw new ErroreCollegamento('annullato', 'collegamento annullato');
            let risposta: Response;
            try {
              risposta = await fetchImpl(`${base}/pair/${nonce}`, { method: 'GET', signal });
            } catch (errore) {
              if (signal?.aborted) throw new ErroreCollegamento('annullato', 'collegamento annullato');
              throw new ErroreCollegamento('rete', errore instanceof Error ? errore.message : String(errore));
            }
            if (risposta.status === 200) {
              const busta = (await risposta.json()) as BustaCifrata;
              let contenuto: ContenutoConsegna;
              try {
                contenuto = await decifraBusta(busta, coppia.privateKey, nonce, c);
              } catch (errore) {
                throw new ErroreCollegamento('busta', errore instanceof Error ? errore.message : String(errore));
              }
              if (!REGEX_TOKEN.test(contenuto.token)) throw new ErroreCollegamento('busta', 'token con formato inatteso');
              return contenuto;
            }
            if (risposta.status !== 202 && risposta.status !== 404) {
              throw new ErroreCollegamento('gestore', `HTTP ${risposta.status} dal gestore`);
            }
            await attendi(intervalloMs);
          }
          throw new ErroreCollegamento('timeout', 'nessuna conferma entro il tempo previsto');
        },
      };
    },
  };
}

export type ClientManagedBots = ReturnType<typeof creaClientManagedBots>;
