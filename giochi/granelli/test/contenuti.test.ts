import { describe, expect, it } from 'vitest';
import { controlla } from '../src/contenuti/controllo.js';
import { problemi } from '../src/contenuti/registro.js';

describe('il controllo delle scoperte', () => {
  it('tutto il Libro: ogni voce si raggiunge dai quattro elementi, nessuna coppia ha due esiti, ogni scheda è completa', () => {
    const r = controlla();
    expect(r.errori).toEqual([]);
    expect(problemi()).toEqual([]);
    expect(r.conti.file).toContain('paese');
    expect(r.conti.file).toEqual(['paese', 'campagna']);
    expect(r.conti.voci).toBe(145);
    // I vicoli ciechi delle voci di prima sono un rapporto, non un errore: la grande infornata li porterà a zero.
    expect(r.avvisi.join(' ')).toMatch(/Voci di prima che entrano in meno di 2 unioni scritte/);
  });

  it('un file solo, come fa chi scrive le schede di una famiglia', () => {
    for (const file of ['paese', 'campagna']) expect(controlla({ file }).errori, file).toEqual([]);
    expect(controlla({ file: 'non-esiste' }).errori.join(' ')).toMatch(/Non c'è un file di schede/);
  });
});
