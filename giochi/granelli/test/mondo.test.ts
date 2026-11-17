import { describe, expect, it } from 'vitest';
import { M, N_BASE, NASCOSTO } from '../src/motore/materiali.js';
import { terreno } from '../src/motore/terreno.js';
import { gira, mondo, quanti, riempi } from './aiuti.js';

describe('il mondo appena nato', () => {
  it('ha un fondo di sola roccia, con il cielo libero sopra, e la roccia non è una scoperta', () => {
    for (const [w, h] of [
      [140, 215],
      [267, 112],
    ]) {
      const m = mondo(w, h, 11);
      terreno(m);
      let roccia = 0;
      for (const t of m.tipo) {
        if (t === M.ROCCIA) roccia++;
        else expect(t).toBe(M.VUOTO);
      }
      expect(roccia).toBeGreaterThan(w * 2);
      expect(roccia).toBeLessThan(w * h * 0.6);
      expect(m.novita.length).toBe(0);
      expect(m.visti.has(M.ROCCIA)).toBe(false);
      // Ogni colonna è piena dal fondo fino alla sua cima, e tra una colonna e l'altra il gradino è al più di due celle.
      const cime: number[] = [];
      for (let x = 0; x < w; x++) {
        let y = 0;
        while (m.leggi(x, y) === M.VUOTO) y++;
        for (let sotto = y; sotto < h; sotto++) expect(m.leggi(x, sotto)).toBe(M.ROCCIA);
        expect(y).toBeGreaterThan(h * 0.3);
        cime.push(y);
      }
      for (let x = 1; x < w; x++) expect(Math.abs(cime[x] - cime[x - 1])).toBeLessThanOrEqual(2);
    }
  });

  it('due mondi nati da semi diversi hanno profili diversi; la roccia regge quello che le cade sopra', () => {
    const a = mondo(140, 215, 1);
    const b = mondo(140, 215, 2);
    terreno(a);
    terreno(b);
    expect([...a.tipo]).not.toEqual([...b.tipo]);
    const rocciaPrima = quanti(a, M.ROCCIA);
    riempi(a, 20, 20, 120, 30, M.SABBIA);
    riempi(a, 20, 35, 120, 40, M.ACQUA);
    riempi(a, 60, 45, 80, 48, M.LAVA);
    gira(a, 600);
    expect(quanti(a, M.ROCCIA)).toBe(rocciaPrima);
    expect(quanti(a, M.SABBIA)).toBeGreaterThan(800);
  });
});

describe('tenuta', () => {
  it('un minestrone di tutto, per migliaia di istanti, non rompe il mondo', () => {
    const m = mondo(90, 70, 99);
    terreno(m);
    for (let giro = 0; giro < 6000; giro++) {
      if (giro % 5 === 0) {
        const t = 1 + ((m.caso() * (N_BASE - 1)) | 0);
        if (!NASCOSTO[t]) m.versa((m.caso() * m.w) | 0, (m.caso() * m.h) | 0, 4, t);
        if (giro % 50 === 0) m.mescola((m.caso() * m.w) | 0, (m.caso() * m.h) | 0, 5, new Set());
      }
      if (giro % 400 === 0) m.aggiungiOmino((m.caso() * m.w) | 0, 5);
      if (giro % 900 === 0) m.cancella((m.caso() * m.w) | 0, (m.caso() * m.h) | 0, 6);
      m.passo();
    }
    for (const t of m.tipo) expect(t < N_BASE || m.idTipo[t] > 0).toBe(true);
    for (const o of m.omini) expect(m.dentro(o.x, o.y)).toBe(true);
  });

  it('un passo del mondo resta veloce anche con il mondo pieno di cose che si muovono', () => {
    const m = mondo(280, 160, 5);
    riempi(m, 0, 100, 279, 159, M.SABBIA);
    riempi(m, 0, 60, 279, 90, M.ACQUA);
    riempi(m, 0, 20, 279, 30, M.VAPORE);
    gira(m, 30);
    const t0 = performance.now();
    gira(m, 200);
    const perPasso = (performance.now() - t0) / 200;
    // Su un computer è intorno al millisecondo: il limite largo serve a scoprire un rallentamento grave, non a cronometrare.
    expect(perPasso).toBeLessThan(15);
  });
});
