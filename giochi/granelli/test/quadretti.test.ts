import { describe, expect, it } from 'vitest';
import { rifila } from '../src/contenuti/registro.js';
import { dimezza } from '../src/disegno/quadretti.js';

describe('i disegni a quadretti', () => {
  it('rifila toglie le righe e le colonne vuote intorno', () => {
    expect(rifila(['.....', '..ab.', '..c..', '.....'])).toEqual(['ab', 'c.']);
    expect(rifila(['...', '...'])).toEqual([]);
  });

  it('dimezza fa una cosa piccola sempre a quadretti netti: ogni 2x2 prende il colore che ci compare di più', () => {
    expect(dimezza(['aabb', 'aabb', 'cc..', 'cd..'])).toEqual(['ab', 'c.']);
    // Un quadretto solo, in mezzo al vuoto, sparisce; due bastano.
    expect(dimezza(['a...', '....', '..bb', '....'])).toEqual(['b']);
    // Un'icona di 12x12 diventa al più di 6x6.
    const icona = Array.from({ length: 12 }, () => 'yyyyyyyyyyyy');
    expect(dimezza(icona)).toEqual(Array.from({ length: 6 }, () => 'yyyyyy'));
  });
});
