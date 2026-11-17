import { describe, expect, it } from 'vitest';
import { M, POLVERE, TEMPORALE } from '../src/motore/materiali.js';
import { terreno } from '../src/motore/terreno.js';
import { acquaInGiro, conca, contaFulmini, contaTiri, gira, mondo, primaGenerazione, quanti, riempi, versaPer } from './aiuti.js';

describe('i conti dell’acqua', () => {
  it('una nuvola nata dal vapore porta una goccia sola; quelle versate col dito restano generose', () => {
    const m = mondo(60, 100);
    riempi(m, 20, 40, 40, 50, M.VAPORE);
    gira(m, 150);
    expect(quanti(m, M.NUVOLA)).toBeGreaterThan(100);
    expect(acquaInGiro(m)).toBe(231);
    for (let giro = 0; giro < 40 && quanti(m, M.NUVOLA) + quanti(m, M.VAPORE) > 0; giro++) {
      gira(m, 500);
      // Mai più acqua di quanta ne è salita (un fulmine, passando, può solo disperderne un po').
      expect(acquaInGiro(m)).toBeLessThanOrEqual(231);
    }
    expect(quanti(m, M.NUVOLA) + quanti(m, M.VAPORE)).toBe(0);
    expect(quanti(m, M.ACQUA)).toBeGreaterThan(200);

    const n = mondo(60, 100);
    riempi(n, 20, 5, 39, 9, M.NUVOLA);
    gira(n, 12000);
    expect(quanti(n, M.ACQUA)).toBeGreaterThan(250);
  });

  it('il fuoco che fa vapore consuma l’acqua che lo spegne', () => {
    const m = mondo(80, 100);
    riempi(m, 10, 94, 69, 99, M.ACQUA);
    for (let giro = 0; giro < 6; giro++) {
      versaPer(m, 40, 90, M.FUOCO, 100, 3);
      expect(acquaInGiro(m)).toBeLessThanOrEqual(360);
    }
    expect(m.visti.has(M.VAPORE)).toBe(true);
    gira(m, 8000);
    expect(acquaInGiro(m)).toBeLessThanOrEqual(360);
    expect(quanti(m, M.ACQUA)).toBeGreaterThan(150);
  });

  it('l’aria asciuga: un soffio sopra uno stagno ne fa salire il vapore, senza creare acqua', () => {
    const m = mondo();
    riempi(m, 0, 55, 59, 59, M.ACQUA);
    versaPer(m, 30, 52, M.ARIA, 200, 3);
    expect(m.visti.has(M.VAPORE)).toBe(true);
    expect(quanti(m, M.ACQUA)).toBeLessThan(300);
    expect(acquaInGiro(m)).toBeLessThanOrEqual(300);
  });

  it('un temporale grosso finisce: 60.000 istanti dopo una gran versata di vapore l’acqua non è cresciuta e il cielo tace', () => {
    const m = mondo(260, 150, 3);
    terreno(m);
    for (let k = 0; k < 300; k++) {
      m.versa(130 + (k % 60) - 30, 45, 6, M.VAPORE);
      m.passo();
    }
    const versato = acquaInGiro(m);
    expect(versato).toBeGreaterThan(2000);
    const fulmini = contaFulmini(m);
    let aMeta = 0;
    for (let k = 1; k <= 60000; k++) {
      m.passo();
      if (k % 5000 === 0) expect(acquaInGiro(m)).toBeLessThanOrEqual(versato);
      if (k === 30000) aMeta = fulmini();
    }
    // Il bel temporale c'è stato (lampi, pioggia), ma è finito: niente nuvole, niente più fulmini.
    expect(m.visti.has(TEMPORALE)).toBe(true);
    expect(fulmini()).toBeGreaterThan(0);
    expect(fulmini()).toBeLessThanOrEqual(20);
    expect(fulmini() - aMeta).toBe(0);
    expect(quanti(m, M.NUVOLA) + quanti(m, M.VAPORE)).toBe(0);
    expect(quanti(m, M.ACQUA)).toBeGreaterThan(versato * 0.8);
  });

  it('i fulmini naturali hanno un freno: anche sotto un cielo tutto coperto ne scocca al più uno ogni quattro secondi', () => {
    const m = mondo(200, 80);
    const fulmini = contaFulmini(m);
    for (let giro = 0; giro < 20; giro++) {
      riempi(m, 1, 1, 198, 9, M.NUVOLA);
      gira(m, 300);
    }
    expect(fulmini()).toBeGreaterThan(3);
    expect(fulmini()).toBeLessThanOrEqual(6000 / 240 + 1);
  });

  it('una miscela che scotta, caduta in uno stagno, non lo fa bollire per sempre', () => {
    const m = mondo(120, 120, 5);
    const calda = primaGenerazione(m).find((x) => x.s.stato === POLVERE && x.s.calore > 0.5 && x.s.corrode <= 0.6 && x.s.vivo <= 0.6 && x.s.brucia <= 0.55 && x.s.esplode <= 0.6)!;
    const t = m.tipoPer(calda.id);
    conca(m, 110, 90);
    riempi(m, 1, 100, 118, 109, M.ACQUA);
    riempi(m, 50, 80, 69, 84, t);
    const acqua = acquaInGiro(m);
    const fulmini = contaFulmini(m);
    for (let giro = 0; giro < 8; giro++) {
      gira(m, 5000);
      expect(acquaInGiro(m)).toBeLessThanOrEqual(acqua);
    }
    // Ha fatto vapore (scotta davvero), ma bollendo si è consumata: lo stagno è tornato tranquillo.
    expect(m.visti.has(M.VAPORE)).toBe(true);
    expect(quanti(m, t)).toBeLessThan(10);
    expect(quanti(m, M.VAPORE) + quanti(m, M.NUVOLA)).toBe(0);
    expect(quanti(m, M.ACQUA)).toBeGreaterThan(acqua * 0.3);
    expect(fulmini()).toBeLessThanOrEqual(10);
  });
});

describe('ciò che sta fermo non costa', () => {
  it('un mare fermo resta fermo, e non tira dadi', () => {
    const m = mondo(300, 140, 9);
    conca(m, 130, 20);
    riempi(m, 1, 30, 298, 129, M.ACQUA);
    gira(m, 20);
    const prima = m.tipo.slice();
    const tiri = contaTiri(m);
    gira(m, 300);
    let cambiate = 0;
    for (let i = 0; i < prima.length; i++) if (m.tipo[i] !== prima[i]) cambiate++;
    expect(cambiate).toBe(0);
    expect(quanti(m, M.ACQUA)).toBe(298 * 100);
    // Trentamila celle d'acqua ferma: prima ognuna tirava tre dadi a ogni istante.
    expect(tiri()).toBeLessThan(300);
  });

  it('il velo d’acqua di una pozzanghera sulla roccia sta fermo anche lui', () => {
    const m = mondo(120, 40, 9);
    conca(m, 30, 20);
    riempi(m, 1, 29, 118, 29, M.ACQUA);
    gira(m, 20);
    const tiri = contaTiri(m);
    gira(m, 100);
    expect(quanti(m, M.ACQUA)).toBe(118);
    expect(tiri()).toBeLessThan(100);
  });

  it('l’acqua sulla terra, sulla pietra o accanto al fuoco invece reagisce come prima', () => {
    const m = mondo();
    riempi(m, 0, 50, 59, 59, M.TERRA);
    riempi(m, 0, 47, 59, 49, M.ACQUA);
    gira(m, 600);
    expect(quanti(m, M.FANGO)).toBeGreaterThan(50);
    const n = mondo();
    riempi(n, 0, 50, 59, 59, M.PIETRA);
    riempi(n, 0, 40, 59, 49, M.ACQUA);
    gira(n, 6000);
    expect(n.visti.has(M.MUSCHIO)).toBe(true);
  });

  it('la terra sepolta non tira dadi, e una frana cade come prima', () => {
    const m = mondo(200, 100, 9);
    riempi(m, 0, 40, 199, 99, M.TERRA);
    gira(m, 50);
    const tiri = contaTiri(m);
    gira(m, 100);
    expect(quanti(m, M.TERRA)).toBe(200 * 60);
    // Dodicimila celle ammucchiate: prima tiravano due dadi a testa a ogni istante, ora solo quelle ai bordi del mondo.
    expect(tiri() / 100).toBeLessThan(400);
    // Tolto l'appoggio, la terra sopra frana subito: chi era sepolto non resta appeso.
    for (let x = 80; x < 120; x++) for (let y = 60; y < 100; y++) m.svuota(y * m.w + x);
    gira(m, 400);
    let appese = 0;
    for (let x = 80; x < 120; x++) if (m.leggi(x, 99) === M.VUOTO) appese++;
    expect(appese).toBe(0);
    expect(quanti(m, M.TERRA)).toBe(200 * 60 - 40 * 40);
  });
});
