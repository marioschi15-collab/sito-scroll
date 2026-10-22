import type { Transformer } from 'grammy';
import type { Update } from 'grammy/types';

/** Oltre questa età del messaggio più vecchio in coda, il bot dice "Ero spento" (docs/02 §8.4). */
export const SOGLIA_RECUPERO_MS = 2 * 60 * 60 * 1000;

export interface OpzioniRecupero {
  /** Ultimo update già elaborato (persistito): quelli ≤ vengono scartati. */
  ultimoUpdateId: () => number | undefined;
  adesso?: () => number;
  sogliaMs?: number;
  /** Chiamato una volta per avvio, sul primo lotto non vuoto, se il messaggio più vecchio supera la soglia. */
  alRecupero: (dati: { messaggi: number; etaMs: number; chatId: number }) => void | Promise<void>;
}

/** Età in ms del messaggio più vecchio del lotto e conteggio dei messaggi (i callback non contano). */
export function analizzaLotto(updates: Update[], adesso: number): { messaggi: number; etaMs: number; chatId?: number } {
  let piuVecchio = Infinity;
  let messaggi = 0;
  let chatId: number | undefined;
  for (const u of updates) {
    const m = u.message ?? u.edited_message;
    if (!m) continue;
    messaggi++;
    if (m.date * 1000 < piuVecchio) {
      piuVecchio = m.date * 1000;
      chatId = m.chat.id;
    }
  }
  return { messaggi, etaMs: Number.isFinite(piuVecchio) ? Math.max(0, adesso - piuVecchio) : 0, chatId };
}

/**
 * Trasformatore API su `getUpdates`: scarta gli update già elaborati prima di un riavvio e, al primo lotto dopo
 * l'avvio, avvisa se il bot è rimasto spento a lungo. Va installato prima di `bot.start()`.
 */
export function creaTransformerRecupero(o: OpzioniRecupero): Transformer & { riavvia(): void } {
  const adesso = o.adesso ?? Date.now;
  const soglia = o.sogliaMs ?? SOGLIA_RECUPERO_MS;
  let primoLotto = true;

  const transformer: Transformer = async (prev, method, payload, signal) => {
    const risposta = await prev(method, payload, signal);
    if (method !== 'getUpdates' || !risposta.ok || !Array.isArray(risposta.result)) return risposta;
    const ultimo = o.ultimoUpdateId();
    const grezzi = risposta.result as Update[];
    const nuovi = ultimo === undefined ? grezzi : grezzi.filter((u) => u.update_id > ultimo);
    if (primoLotto && grezzi.length > 0) {
      primoLotto = false;
      const analisi = analizzaLotto(nuovi, adesso());
      if (analisi.messaggi > 0 && analisi.etaMs > soglia && analisi.chatId !== undefined) {
        try {
          await o.alRecupero({ messaggi: analisi.messaggi, etaMs: analisi.etaMs, chatId: analisi.chatId });
        } catch {
          /* l'avviso non deve bloccare il polling */
        }
      }
    }
    // Gli update scartati restano "visti" per grammY: l'offset avanza comunque grazie al lotto originale.
    return nuovi.length === grezzi.length ? risposta : ({ ...risposta, result: conservaOffset(grezzi, nuovi) } as typeof risposta);
  };

  return Object.assign(transformer, {
    riavvia() {
      primoLotto = true;
    },
  });
}

/**
 * Se filtriamo tutto, grammY non avanzerebbe l'offset e richiederebbe gli stessi update per sempre:
 * teniamo almeno un update "vuoto" con l'id più alto, che nessun gestore riconosce.
 */
function conservaOffset(grezzi: Update[], nuovi: Update[]): Update[] {
  if (nuovi.length > 0) return nuovi;
  const massimo = Math.max(...grezzi.map((u) => u.update_id));
  return [{ update_id: massimo } as Update];
}
