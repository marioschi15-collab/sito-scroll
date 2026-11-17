import { describe, expect, it } from 'vitest';
import { C } from '../src/motore/cose.js';
import { M } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import type { Causa, Fatto } from '../src/motore/omini.js';
import { LUTTO, NON_SI_POSA, PAUSA_LUTTI, annuncioDiLutto } from '../src/righe.js';
import { gira, mondo, riempi } from './aiuti.js';

/** Un piano di roccia con un omino solo, alla colonna 30. */
function conUnOmino(): Mondo {
  const m = mondo(80, 60);
  riempi(m, 0, 50, 79, 59, M.ROCCIA);
  m.aggiungiOmino(30, 49);
  return m;
}

/** Fa girare il mondo finché non succede qualcosa agli omini (o scade il tempo) e dice che cosa. */
function primoFatto(m: Mondo, tic: number): Fatto | undefined {
  for (let k = 0; k < tic && m.fatti.length === 0; k++) m.passo();
  return m.fatti[0];
}

describe('nascite e morti si sanno, con la causa', () => {
  it('di sete, dove non c’è acqua', () => {
    const m = conUnOmino();
    riempi(m, 0, 47, 79, 49, M.PIANTA);
    expect(primoFatto(m, 9000)).toMatchObject({ cosa: 'morto', causa: 'sete' });
    expect(m.omini.length).toBe(0);
  });

  it('di fame, dove c’è da bere ma non da mangiare', () => {
    const m = conUnOmino();
    riempi(m, 20, 50, 40, 51, M.ACQUA);
    expect(primoFatto(m, 12000)).toMatchObject({ cosa: 'morto', causa: 'fame' });
  });

  it('nel fuoco, e in un’esplosione', () => {
    const m = conUnOmino();
    riempi(m, 28, 47, 32, 49, M.LAVA);
    expect(primoFatto(m, 40)).toMatchObject({ cosa: 'morto', causa: 'fuoco', x: 30 });
    const botto = conUnOmino();
    botto.esplodi(31, 48, 4);
    expect(botto.fatti).toEqual([{ cosa: 'morto', causa: 'fuoco', x: 30, y: 48 }]);
  });

  it('avvelenato, toccando l’acido', () => {
    const m = conUnOmino();
    riempi(m, 31, 50, 33, 50, M.ACIDO);
    expect(primoFatto(m, 40)).toMatchObject({ cosa: 'morto', causa: 'veleno' });
  });

  it('annegato, chiuso sott’acqua', () => {
    const m = conUnOmino();
    // Una vasca di pietra piena d'acqua fino al coperchio: non può risalire a prendere fiato.
    riempi(m, 27, 44, 33, 49, M.ACQUA);
    riempi(m, 26, 43, 34, 43, M.PIETRA);
    riempi(m, 26, 44, 26, 49, M.PIETRA);
    riempi(m, 34, 44, 34, 49, M.PIETRA);
    expect(primoFatto(m, 600)).toMatchObject({ cosa: 'morto', causa: 'annegato' });
  });

  it('sepolto, sotto qualcosa che gli è caduto addosso', () => {
    const m = conUnOmino();
    riempi(m, 26, 30, 34, 49, M.SABBIA);
    riempi(m, 25, 30, 25, 49, M.PIETRA);
    riempi(m, 35, 30, 35, 49, M.PIETRA);
    expect(primoFatto(m, 600)).toMatchObject({ cosa: 'morto', causa: 'sepolto' });
  });

  it('di vecchiaia, e non tutti nello stesso giorno', () => {
    const m = mondo(200, 60);
    riempi(m, 0, 50, 199, 59, M.ROCCIA);
    for (const id of [C.POZZO, C.CAMPO]) m.visti.add(id);
    m.posa(C.POZZO, 95, 40);
    m.posa(C.CAMPO, 106, 40);
    // Otto omini della stessa età: i primi muoiono prima del terzo giorno, gli ultimi dopo.
    for (let k = 0; k < 8; k++) m.aggiungiOmino(80 + k * 5, 49);
    const morti: number[] = [];
    for (let k = 0; k < 60000; k++) {
      m.passo();
      for (const f of m.fatti) {
        if (f.cosa !== 'morto') continue;
        expect(f.causa).toBe('vecchiaia');
        morti.push(m.tic);
      }
      m.fatti.length = 0;
    }
    expect(morti.length).toBeGreaterThanOrEqual(8);
    expect(morti[7] - morti[0]).toBeGreaterThan(8000);
  });

  it('e si sa anche di ogni bambino che nasce', () => {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.ROCCIA);
    riempi(m, 10, 50, 30, 51, M.ACQUA);
    riempi(m, 40, 47, 90, 49, M.PIANTA);
    m.aggiungiOmino(35, 49);
    m.aggiungiOmino(38, 49);
    gira(m, 12000);
    const nati = m.fatti.filter((f) => f.cosa === 'nato');
    expect(nati.length).toBeGreaterThanOrEqual(1);
    expect(m.fatti.filter((f) => f.cosa === 'morto')).toEqual([]);
  });
});

describe('le righe che la pagina dice a chi gioca', () => {
  const CAUSE: Causa[] = ['sete', 'fame', 'fuoco', 'veleno', 'annegato', 'sepolto', 'vecchiaia'];

  it('un lutto si annuncia con la sua causa, ma al più uno ogni tanto', () => {
    expect(annuncioDiLutto('sete', 5000, -Infinity)).toBe('Un omino è morto di sete: manca l’acqua vicino al paese.');
    expect(annuncioDiLutto('fame', 5000 + PAUSA_LUTTI - 1, 5000)).toBe('');
    expect(annuncioDiLutto('fame', 5000 + PAUSA_LUTTI, 5000)).toBe(LUTTO.fame);
    // La vecchiaia non è una disgrazia da annunciare.
    expect(annuncioDiLutto('vecchiaia', 5000, -Infinity)).toBe('');
  });

  it('ogni causa e ogni rifiuto ha la sua frase: breve, in italiano semplice, senza gergo', () => {
    const frasi = [...CAUSE.map((c) => LUTTO[c]), ...Object.values(NON_SI_POSA)].filter((f) => f !== '');
    expect(frasi.length).toBe(CAUSE.length - 1 + Object.keys(NON_SI_POSA).length - 1);
    expect(new Set(frasi).size).toBe(frasi.length);
    for (const frase of frasi) {
      expect(frase.length).toBeLessThanOrEqual(90);
      expect(frase).toMatch(/^[A-Z].*\.$/);
      expect(frase).not.toMatch(/agente|prompt|token|\bapi\b|bug|sprite|render|errore|invalid/i);
    }
    expect(NON_SI_POSA.pende).toBe('Qui pende troppo: cerca un punto più piano.');
    expect(NON_SI_POSA.troppe).toContain('120');
  });
});
