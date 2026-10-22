import { describe, expect, it } from 'vitest';
import { permessi, telegram } from '@spalla/it-copy';
import { completaTesti, testiTelegramPredefiniti, type TestiTelegram } from '../src/nucleo/telegram/testi.js';
import { creaDomandeTelegram, tastieraDomanda } from '../src/nucleo/telegram/domande.js';

describe('testi del canale: la fonte è @spalla/it-copy', () => {
  it('`{ ...telegram, permessi }` di it-copy copre tutte le chiavi che il canale usa', () => {
    const daItCopy: TestiTelegram = completaTesti({ ...telegram, permessi });
    const chiavi = (o: unknown, prefisso = ''): string[] =>
      o && typeof o === 'object' && !Array.isArray(o) ? Object.entries(o).flatMap(([k, v]) => chiavi(v, prefisso ? `${prefisso}.${k}` : k)) : [prefisso];
    const attese = chiavi(testiTelegramPredefiniti).filter((k) => !k.startsWith('altro.'));
    const presenti = new Set(chiavi(daItCopy));
    for (const k of attese) expect(presenti.has(k), k).toBe(true);
    expect(daItCopy.start('Bruno', 'Marco', 'https://esempio.it/p')).toMatch(/Informativa: https:\/\/esempio\.it\/p/);
    expect(daItCopy.pairing.codice('k7m2xq')).toContain('k7m2xq');
    expect(daItCopy.permessi.riservaTesto('k7m2xq')).toContain('k7m2xq');
    expect(daItCopy.eroSpento(2)).toBe(telegram.eroSpento(2));
    // le frasi che it-copy non ha ancora restano dalla riserva
    expect(daItCopy.altro.soloDalComputer).toBe(testiTelegramPredefiniti.altro.soloDalComputer);
  });

  it('la tastiera delle domande non ha righe vuote', () => {
    const domanda = { id: 'q1', testo: 'Tono?', opzioni: [{ etichetta: 'A' }, { etichetta: 'B' }], multiSelezione: true };
    const righe = tastieraDomanda(domanda, testiTelegramPredefiniti).inline_keyboard;
    expect(righe.map((r) => r.length)).toEqual([1, 1, 1]);
    expect(righe[2]?.[0]).toMatchObject({ text: 'Fatto', callback_data: 'd:q1:fine' });
    expect(typeof creaDomandeTelegram).toBe('function');
  });
});
