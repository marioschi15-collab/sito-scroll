import { describe, expect, it } from 'vitest';
import { cheCosaCe } from '../src/motore/bersaglio.js';
import { C } from '../src/motore/cose.js';
import { M, OMINO, PRIMA_ID_MISCELA, TRONCO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { albero, libroDa12, mondo, riempi } from './aiuti.js';

/** Un piano di roccia nuda dalla riga 50 in giù, con capanna e casa già scoperte. */
function piano(): Mondo {
  const m = mondo(120, 70);
  riempi(m, 0, 50, 119, 69, M.ROCCIA);
  m.visti.add(C.CAPANNA).add(C.CASA);
  return m;
}

describe('che cosa c’è qui', () => {
  it('un omino davanti alla sua capanna vince la capanna, se il punto è sul suo corpo', () => {
    const m = piano();
    expect(m.posa(C.CAPANNA, 30, 40)).toBe(true);
    const c = m.cose[0];
    m.aggiungiOmino(c.x + 3, 49);
    const o = m.omini[0];
    expect(cheCosaCe(m, o.x, o.y - 1)).toMatchObject({ genere: 'omino', id: OMINO, rif: o });
    // Sulla capanna, lontano dal corpo dell'omino, il bersaglio è la capanna.
    expect(cheCosaCe(m, c.x + 8, c.y - 4)).toMatchObject({ genere: 'cosa', id: C.CAPANNA, rif: c });
  });

  it('il tetto di una casa con i suoi abitanti intorno è la casa', () => {
    const m = piano();
    expect(m.posa(C.CASA, 60, 40)).toBe(true);
    const c = m.cose[0];
    for (const dx of [-1, 2, 5, 8, 11]) m.aggiungiOmino(c.x + dx, 49);
    expect(cheCosaCe(m, c.x + 5, c.y - 7)).toMatchObject({ genere: 'cosa', id: C.CASA });
    // Fuori dalla casa, a qualche cella da un omino, il bersaglio torna l'omino più vicino.
    expect(cheCosaCe(m, c.x - 3, c.y - 6)).toMatchObject({ genere: 'omino' });
  });

  it('una cosa posata si prende anche a una cella dal suo bordo', () => {
    const m = piano();
    expect(m.posa(C.CAPANNA, 30, 40)).toBe(true);
    const c = m.cose[0];
    expect(cheCosaCe(m, c.x - 1, c.y - 2)).toMatchObject({ genere: 'cosa' });
    expect(cheCosaCe(m, c.x + 10, c.y - 5)).toMatchObject({ genere: 'cosa' });
    expect(cheCosaCe(m, c.x + 4, c.y - 6)).toMatchObject({ genere: 'cosa' });
    expect(cheCosaCe(m, c.x + 4, c.y - 8).genere).not.toBe('cosa');
  });

  it('un omino che dorme in casa non si vede e non è un bersaglio', () => {
    const m = piano();
    m.aggiungiOmino(80, 49);
    m.omini[0].dentro = 1;
    expect(cheCosaCe(m, 80, 48).genere).toBe('appoggio');
    expect(cheCosaCe(m, 80, 30).genere).toBe('vuoto');
  });

  it('la materia: la cella stessa, o la più vicina entro tre celle', () => {
    const m = piano();
    riempi(m, 10, 45, 20, 49, M.TERRA);
    expect(cheCosaCe(m, 15, 47)).toEqual({ genere: 'materia', id: M.TERRA, x: 15, y: 47 });
    // Due celle sopra la terra: si prende la terra subito sotto.
    expect(cheCosaCe(m, 15, 43)).toEqual({ genere: 'materia', id: M.TERRA, x: 15, y: 45 });
    // Più in alto di tre celle non c'è più niente.
    expect(cheCosaCe(m, 15, 40).genere).toBe('vuoto');
  });

  it('il tronco di un albero è legno, la chioma è pianta', () => {
    const m = piano();
    albero(m, 40, 6);
    expect(m.tipo[47 * m.w + 40]).toBe(M.LEGNO);
    expect(m.dato[47 * m.w + 40]).toBe(TRONCO);
    expect(cheCosaCe(m, 40, 47)).toMatchObject({ genere: 'materia', id: M.LEGNO });
    expect(cheCosaCe(m, 40, 42)).toMatchObject({ genere: 'materia', id: M.PIANTA });
  });

  it('roccia nuda e brace sono un appoggio, non un bersaglio; in cielo è vuoto', () => {
    const m = piano();
    expect(cheCosaCe(m, 50, 52).genere).toBe('appoggio');
    expect(cheCosaCe(m, 50, 48).genere).toBe('appoggio');
    riempi(m, 70, 47, 72, 49, M.BRACE);
    expect(cheCosaCe(m, 71, 48).genere).toBe('appoggio');
    expect(cheCosaCe(m, 50, 20)).toMatchObject({ genere: 'vuoto', id: -1 });
  });

  it('gas e fiamme contano solo se il punto è proprio su di loro', () => {
    const m = piano();
    m.metti(20 * m.w + 30, M.FUOCO, 200);
    m.metti(20 * m.w + 60, M.VAPORE, 200);
    expect(cheCosaCe(m, 30, 20)).toMatchObject({ genere: 'materia', id: M.FUOCO });
    expect(cheCosaCe(m, 31, 20).genere).toBe('vuoto');
    expect(cheCosaCe(m, 60, 20)).toMatchObject({ genere: 'materia', id: M.VAPORE });
    expect(cheCosaCe(m, 60, 22).genere).toBe('vuoto');
  });

  it('una miscela ha il suo numero grande, quello che chi gioca conosce', () => {
    const m = libroDa12(piano());
    const id = m.registra(M.SABBIA, M.LEGNO);
    const t = m.tipoPer(id);
    riempi(m, 10, 47, 14, 49, t);
    const b = cheCosaCe(m, 12, 48);
    expect(b.genere).toBe('materia');
    expect(b.id).toBe(id);
    expect(b.id).toBeGreaterThanOrEqual(PRIMA_ID_MISCELA);
  });
});
