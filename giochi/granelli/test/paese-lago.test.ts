import { describe, expect, it } from 'vitest';
import { M } from '../src/motore/materiali.js';
import { Anagrafe, GIORNO, lago, mondoVero, prato, quanti, riempi } from './aiuti.js';

describe('un paese sul lago, nel mondo vero', () => {
  it.each([1, 2, 3])('con lago e piante ma senza pozzo, dopo tre giorni è vivo e nessuno è morto di sete (seme %i)', (seme) => {
    const m = mondoVero(seme);
    // Il lago nella conca, terriccio ed erba sulle due rive, e un riparo di pietra: gli omini arrivano da soli.
    const { x0, x1 } = lago(m, 12);
    prato(m, x0 - 70, x0 - 1);
    prato(m, x1 + 1, x1 + 70);
    const riparo = x1 + 20;
    riempi(m, riparo, m.suolo(riparo) - 6, riparo + 5, m.suolo(riparo) - 1, M.PIETRA);
    const anagrafe = new Anagrafe();
    anagrafe.gira(m, 3 * GIORNO);
    // In tre giorni sul terriccio è cresciuto un bosco: i tronchi non hanno chiuso nessuno.
    expect(quanti(m, M.LEGNO)).toBeGreaterThan(60);
    expect(anagrafe.morti.sete).toBeUndefined();
    expect(anagrafe.morti.fame).toBeUndefined();
    expect(anagrafe.nati).toBeGreaterThanOrEqual(3);
    expect(m.omini.length).toBeGreaterThanOrEqual(4);
    // Il paese è rimasto intorno al suo lago.
    for (const o of m.omini) expect(o.x > x0 - 90 && o.x < x1 + 90).toBe(true);
  }, 120000);
});
