import { describe, expect, it } from 'vitest';
import { C } from '../src/motore/cose.js';
import { BAMBINO, M, OMINO, VILLAGGIO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { gira, mondo, riempi } from './aiuti.js';

describe('gli omini', () => {
  function giardino(): Mondo {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.PIETRA);
    riempi(m, 10, 48, 30, 49, M.ACQUA);
    riempi(m, 9, 48, 9, 49, M.PIETRA);
    riempi(m, 31, 48, 31, 49, M.PIETRA);
    riempi(m, 40, 47, 90, 49, M.PIANTA);
    return m;
  }

  it('arrivano da soli quando ci sono acqua, piante e pietra', () => {
    const m = giardino();
    riempi(m, 40, 44, 90, 46, M.PIANTA);
    riempi(m, 10, 43, 30, 47, M.ACQUA);
    riempi(m, 9, 43, 9, 47, M.PIETRA);
    riempi(m, 31, 43, 31, 47, M.PIETRA);
    gira(m, 400);
    expect(m.visti.has(OMINO)).toBe(true);
    expect(m.omini.length).toBeGreaterThanOrEqual(2);
  });

  it('non arrivano in un mondo vuoto', () => {
    const m = mondo();
    gira(m, 600);
    expect(m.omini.length).toBe(0);
  });

  it('vivono, si moltiplicano e fondano un villaggio', () => {
    const m = giardino();
    m.aggiungiOmino(35, 49);
    m.aggiungiOmino(36, 49);
    gira(m, 20000);
    expect(m.omini.length).toBeGreaterThan(0);
    expect(m.visti.has(VILLAGGIO)).toBe(true);
    for (const o of m.omini) expect(m.dentro(o.x, o.y)).toBe(true);
  });

  it('muoiono nel fuoco e senza acqua', () => {
    const m = mondo();
    riempi(m, 0, 50, 59, 59, M.PIETRA);
    m.aggiungiOmino(30, 49);
    riempi(m, 26, 46, 34, 49, M.LAVA);
    gira(m, 40);
    expect(m.omini.length).toBe(0);
    m.aggiungiOmino(10, 49);
    riempi(m, 20, 40, 40, 49, M.PIETRA);
    gira(m, 9000);
    expect(m.omini.length).toBe(0);
  });

  it('nasce il primo bambino', () => {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.PIETRA);
    riempi(m, 10, 48, 30, 49, M.ACQUA);
    riempi(m, 9, 48, 9, 49, M.PIETRA);
    riempi(m, 31, 48, 31, 49, M.PIETRA);
    riempi(m, 40, 47, 90, 49, M.PIANTA);
    m.aggiungiOmino(35, 49);
    m.aggiungiOmino(36, 49);
    gira(m, 12000);
    expect(m.visti.has(BAMBINO)).toBe(true);
  });
});

describe('gli omini e le loro case', () => {
  function paese(): Mondo {
    const m = mondo(140, 60);
    riempi(m, 0, 50, 139, 59, M.ROCCIA);
    for (const id of [C.CAPANNA, C.POZZO, C.CAMPO, C.FALO, C.CASA]) m.visti.add(id);
    return m;
  }

  it('con un pozzo e un campo vivono anche senza acqua né piante', () => {
    const m = paese();
    m.posa(C.POZZO, 40, 40);
    m.posa(C.CAMPO, 70, 40);
    m.aggiungiOmino(55, 49);
    m.aggiungiOmino(56, 49);
    gira(m, 12000);
    expect(m.omini.length).toBeGreaterThanOrEqual(2);
  });

  it('di notte entrano in casa finché c’è posto, e al mattino escono', () => {
    const m = paese();
    m.posa(C.CAPANNA, 60, 40);
    m.posa(C.POZZO, 40, 40);
    m.posa(C.CAMPO, 85, 40);
    for (let i = 0; i < 5; i++) m.aggiungiOmino(50 + i * 4, 49);
    gira(m, 200);
    expect(m.omini.filter((o) => o.dentro).length).toBe(0);
    m.tic = 9200;
    gira(m, 1500);
    // la capanna ne ospita tre: gli altri due restano fuori
    expect(m.omini.filter((o) => o.dentro).length).toBe(3);
    m.tic = 14400 + 600;
    gira(m, 200);
    expect(m.omini.filter((o) => o.dentro).length).toBe(0);
    // se la casa sparisce mentre dormono, tornano fuori
    m.tic = 9200;
    gira(m, 1500);
    m.cose = m.cose.filter((cosa) => cosa.id !== C.CAPANNA);
    gira(m, 100);
    expect(m.omini.filter((o) => o.dentro).length).toBe(0);
  });

  it('senza tetti il paese si ferma a sei; con le case cresce', () => {
    const m = paese();
    m.posa(C.POZZO, 40, 40);
    m.posa(C.CAMPO, 85, 40);
    for (let i = 0; i < 4; i++) m.aggiungiOmino(55 + i * 3, 49);
    gira(m, 40000);
    expect(m.omini.length).toBeLessThanOrEqual(6);
    expect(m.omini.length).toBeGreaterThanOrEqual(4);
    m.posa(C.CASA, 60, 40);
    m.posa(C.CAPANNA, 110, 40);
    gira(m, 40000);
    expect(m.omini.length).toBeGreaterThan(6);
  });
});
