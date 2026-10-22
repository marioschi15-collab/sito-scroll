/** Limite di Telegram: 1 messaggio al secondo per chat (docs/02 §8.4). */
export const INTERVALLO_INVIO_MS = 1000;

export interface OpzioniCoda {
  intervalloMs?: number;
  adesso?: () => number;
  attendi?: (ms: number) => Promise<void>;
}

/** Coda in uscita per chat: un invio alla volta, distanziati di almeno `intervalloMs`. */
export function creaCodaUscita(opzioni: OpzioniCoda = {}) {
  const intervalloMs = opzioni.intervalloMs ?? INTERVALLO_INVIO_MS;
  const adesso = opzioni.adesso ?? Date.now;
  const attendi = opzioni.attendi ?? ((ms: number) => new Promise<void>((ok) => setTimeout(ok, ms)));
  const perChat = new Map<number, { ultimo: number; coda: Promise<unknown> }>();

  return {
    esegui<T>(chatId: number, invio: () => Promise<T>): Promise<T> {
      const voce = perChat.get(chatId) ?? { ultimo: -Infinity, coda: Promise.resolve() };
      perChat.set(chatId, voce);
      const promessa = voce.coda
        .catch(() => undefined)
        .then(async () => {
          const attesa = voce.ultimo + intervalloMs - adesso();
          if (attesa > 0) await attendi(attesa);
          voce.ultimo = adesso();
          return invio();
        });
      voce.coda = promessa;
      return promessa;
    },
    /** Quante chat hanno una coda viva (diagnostica). */
    chatAttive(): number {
      return perChat.size;
    },
  };
}

export type CodaUscita = ReturnType<typeof creaCodaUscita>;

/** Limitatore in ingresso per utente (docs/02 §8.4: 1 al secondo, con una piccola raffica ammessa). */
export function creaLimitatoreIngresso(opzioni: { alSecondo?: number; raffica?: number; adesso?: () => number } = {}) {
  const alSecondo = opzioni.alSecondo ?? 1;
  const raffica = opzioni.raffica ?? 3;
  const adesso = opzioni.adesso ?? Date.now;
  const gettoni = new Map<number, { quanti: number; aggiornato: number }>();
  return {
    /** True se il messaggio può passare. */
    ammetti(utenteId: number): boolean {
      const ora = adesso();
      const voce = gettoni.get(utenteId) ?? { quanti: raffica, aggiornato: ora };
      voce.quanti = Math.min(raffica, voce.quanti + ((ora - voce.aggiornato) / 1000) * alSecondo);
      voce.aggiornato = ora;
      gettoni.set(utenteId, voce);
      if (voce.quanti < 1) return false;
      voce.quanti -= 1;
      return true;
    },
  };
}
