import { describe, expect, it } from 'vitest';
import { creaCodaUscita, creaLimitatoreIngresso } from '../src/nucleo/telegram/coda-uscita.js';

describe('coda in uscita: 1 messaggio al secondo per chat', () => {
  it('distanzia gli invii della stessa chat e lascia correre chat diverse', async () => {
    let ora = 0;
    const attese: number[] = [];
    const coda = creaCodaUscita({
      adesso: () => ora,
      attendi: async (ms) => {
        attese.push(ms);
        ora += ms;
      },
    });
    const ordine: string[] = [];
    await Promise.all([
      coda.esegui(1, async () => void ordine.push('a1')),
      coda.esegui(1, async () => void ordine.push('a2')),
      coda.esegui(2, async () => void ordine.push('b1')),
      coda.esegui(1, async () => void ordine.push('a3')),
    ]);
    expect(ordine.filter((s) => s.startsWith('a'))).toEqual(['a1', 'a2', 'a3']);
    expect(attese).toEqual([1000, 1000]);
    expect(ora).toBe(2000);
  });

  it('un invio fallito non blocca i successivi', async () => {
    const coda = creaCodaUscita({ attendi: async () => undefined });
    await expect(coda.esegui(1, async () => Promise.reject(new Error('no')))).rejects.toThrow('no');
    expect(await coda.esegui(1, async () => 'ok')).toBe('ok');
  });
});

describe('limitatore in ingresso per utente', () => {
  it('ammette una raffica di 3 e poi 1 al secondo', () => {
    let ora = 0;
    const limitatore = creaLimitatoreIngresso({ adesso: () => ora });
    expect([1, 2, 3].map(() => limitatore.ammetti(5))).toEqual([true, true, true]);
    expect(limitatore.ammetti(5)).toBe(false);
    expect(limitatore.ammetti(6)).toBe(true);
    ora += 1000;
    expect(limitatore.ammetti(5)).toBe(true);
    expect(limitatore.ammetti(5)).toBe(false);
  });
});
