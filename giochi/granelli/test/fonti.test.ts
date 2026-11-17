import { describe, expect, it } from 'vitest';
import { C } from '../src/motore/cose.js';
import { M } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { albero, gira, mondo, quanti, riempi } from './aiuti.js';

/** Un piano di roccia alla riga 50 con uno stagno a filo del terreno tra le colonne 70 e 95. */
function piano(): Mondo {
  const m = mondo(200, 60);
  riempi(m, 0, 50, 199, 59, M.ROCCIA);
  riempi(m, 70, 50, 95, 51, M.ACQUA);
  for (const id of [C.POZZO, C.CAMPO, C.CASA]) m.visti.add(id);
  return m;
}

describe('dove si beve e dove si mangia', () => {
  it('il mondo sa qual è l’acqua più vicina a ogni colonna, a qualunque distanza', () => {
    const m = piano();
    gira(m, 1);
    expect(m.fonti.bere(0)).toBe(70);
    expect(m.fonti.bere(69)).toBe(70);
    expect(m.fonti.bere(80)).toBe(80);
    expect(m.fonti.bere(199)).toBe(95);
    // Chi ha trovato la strada chiusa da una parte guarda dall'altra, se da quella c'è qualcosa.
    riempi(m, 150, 50, 160, 51, M.ACQUA);
    gira(m, 120);
    expect(m.fonti.bere(120)).toBe(95);
    expect(m.fonti.bere(120, -1)).toBe(150);
    expect(m.fonti.bere(120, 1)).toBe(95);
    expect(m.fonti.bere(10, -1)).toBe(70);
    expect(m.fonti.bere(180, 1)).toBe(160);
  });

  it('una goccia che cade non è una fonte; l’acqua sotto la chioma di un albero sì', () => {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.ROCCIA);
    m.metti(20 * m.w + 30, M.ACQUA);
    gira(m, 1);
    expect(m.fonti.bere(30)).toBe(-1);
    riempi(m, 0, 0, 99, 49, M.VUOTO);
    riempi(m, 60, 50, 70, 51, M.ACQUA);
    albero(m, 59, 8);
    gira(m, 120);
    expect(m.fonti.acqua[61]).toBe(1);
    expect(m.fonti.bere(0)).toBe(60);
  });

  it('la pioggia e la neve che cadono sopra uno stagno non lo nascondono', () => {
    const m = piano();
    gira(m, 1);
    // Gocce e fiocchi a mezz'aria proprio sopra lo stagno, nel momento in cui il mondo si guarda intorno.
    for (let x = 70; x <= 95; x++) m.metti((20 + (x % 7)) * m.w + x, x % 2 ? M.ACQUA : M.NEVE);
    m.fonti.aggiorna(m);
    for (let x = 70; x <= 95; x++) expect(m.fonti.acqua[x]).toBe(1);
    expect(m.fonti.bere(0)).toBe(70);
    expect(m.fonti.bere(199)).toBe(95);
  });

  it('un pozzo vale come acqua e un campo come cibo, appena posati e finché ci sono', () => {
    const m = mondo(200, 60);
    riempi(m, 0, 50, 199, 59, M.ROCCIA);
    for (const id of [C.POZZO, C.CAMPO]) m.visti.add(id);
    gira(m, 1);
    expect(m.fonti.bere(100)).toBe(-1);
    expect(m.fonti.mangiare(100)).toBe(-1);
    m.posa(C.POZZO, 40, 30);
    m.posa(C.CAMPO, 150, 30);
    gira(m, 1);
    expect(m.fonti.bere(199)).toBe(40);
    expect(m.fonti.mangiare(0)).toBe(150);
    // A portata di mano: quattro colonne dal pozzo, sei dal campo.
    expect([m.fonti.pozzo[36], m.fonti.pozzo[44], m.fonti.pozzo[45]]).toEqual([49, 49, -1]);
    expect([m.fonti.campo[144], m.fonti.campo[156], m.fonti.campo[157]]).toEqual([49, 49, -1]);
    m.cancella(40, 47, 2);
    gira(m, 1);
    expect(m.fonti.bere(199)).toBe(-1);
  });

  it('il cibo conta se si raggiunge da terra: l’erba sì, la chioma di un albero no', () => {
    const m = mondo(200, 60);
    riempi(m, 0, 50, 199, 59, M.ROCCIA);
    albero(m, 40, 9);
    riempi(m, 150, 48, 152, 49, M.PIANTA);
    gira(m, 1);
    expect(m.fonti.mangiare(40)).toBe(150);
    expect(m.fonti.mangiare(199)).toBe(152);
  });
});

describe('gli arrivi', () => {
  /** Un prato con uno stagno a filo del terreno, piante lontane dall'acqua e un riparo di pietra. */
  function prato(): Mondo {
    const m = mondo(160, 60);
    riempi(m, 0, 50, 159, 59, M.ROCCIA);
    riempi(m, 60, 50, 90, 53, M.ACQUA);
    riempi(m, 120, 47, 155, 49, M.PIANTA);
    riempi(m, 0, 46, 9, 49, M.PIETRA);
    return m;
  }

  it('arrivano vicino all’acqua, a qualche cella l’uno dall’altro, e non sulle piante lontane', () => {
    for (const seme of [1, 2, 3, 4, 5, 6]) {
      const m = prato();
      // Ogni prova tira i suoi dadi: si parte da una colonna a caso diversa.
      for (let k = 0; k < seme * 7; k++) m.caso();
      // Si guarda nell'istante stesso in cui compaiono, prima che facciano un passo.
      for (let k = 0; k < 240 && m.omini.length === 0; k++) m.passo();
      expect(m.omini.length).toBe(2);
      const [a, b] = m.omini;
      expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(3);
      expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(5);
      for (const o of m.omini) {
        const distanza = o.x < 60 ? 60 - o.x : o.x - 90;
        expect(distanza).toBeGreaterThanOrEqual(3);
        expect(distanza).toBeLessThanOrEqual(10);
        expect(o.casa).toBe(o.x);
        expect(m.leggi(o.x, o.y + 1)).toBe(M.ROCCIA);
      }
    }
  });

  it('non arrivano dove dall’acqua li separa un muro; tolto il muro, arrivano', () => {
    const m = prato();
    // Uno steccato di pietra alto sei celle tutto intorno allo stagno.
    riempi(m, 56, 44, 57, 49, M.PIETRA);
    riempi(m, 93, 44, 94, 49, M.PIETRA);
    gira(m, 1200);
    expect(quanti(m, M.ACQUA)).toBeGreaterThan(100);
    expect(m.omini.length).toBe(0);
    riempi(m, 93, 44, 94, 49, M.VUOTO);
    gira(m, 240);
    expect(m.omini.length).toBe(2);
    for (const o of m.omini) expect(o.x).toBeGreaterThan(92);
  });

  it('arrivano anche vicino a un pozzo, se l’acqua del mondo non si raggiunge', () => {
    const m = prato();
    riempi(m, 56, 44, 57, 49, M.PIETRA);
    riempi(m, 93, 44, 94, 49, M.PIETRA);
    m.visti.add(C.POZZO);
    m.posa(C.POZZO, 30, 30);
    gira(m, 240);
    expect(m.omini.length).toBe(2);
    for (const o of m.omini) expect(Math.abs(o.x - 30)).toBeLessThanOrEqual(10);
  });
});
