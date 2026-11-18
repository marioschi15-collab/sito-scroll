import { describe, expect, it } from 'vitest';
import { FIORE, GAS, LIQUIDO, M, POLVERE, SOLIDO } from '../src/motore/materiali.js';
import { SOGLIA, faMale, tratti } from '../src/motore/miscele.js';
import { APPICCICA, FIORISCE, INDURISCE, PIOVE, STERILE, TINGE, VOLA } from '../src/motore/miscele-vive.js';
import type { Mondo } from '../src/motore/mondo.js';
import { PAROLE, etichette } from '../src/motore/nomi.js';
import { type Miscela, cercaMiscela, gira, mondo, primaGenerazione, quanti, riempi, versaPer } from './aiuti.js';

/** Una miscela che fa solo quello che si vuole provare: niente veleno, calore, vita, corrosione o botti di mezzo. */
const quieta = (x: Miscela): boolean =>
  !faMale(x.s) && x.s.vivo <= SOGLIA.vivo && x.s.esplode <= SOGLIA.esplode && x.s.brucia <= SOGLIA.brucia && x.s.calore >= -SOGLIA.calore;
const ha = (x: Miscela, c: string): boolean => (tratti(x.s) as string[]).includes(c);

/** Una miscela solida che non fa niente di suo oltre ai caratteri chiesti (niente vita, botti o corrosione). */
const solida = (x: Miscela): boolean => x.s.stato === SOLIDO && x.s.vivo <= SOGLIA.vivo && x.s.esplode <= SOGLIA.esplode && x.s.corrode <= SOGLIA.corrode;

describe('i caratteri nuovi: ogni etichetta è un effetto vero', () => {
  it('per tutte le miscele di prima generazione, le etichette nuove e i comportamenti del mondo coincidono', () => {
    const m = mondo(20, 20);
    const viste = new Set<string>();
    for (const x of primaGenerazione(m)) {
      m.tipo.fill(0);
      const t = m.tipoPer(x.id);
      const e = etichette(x.s);
      for (const parola of e) viste.add(parola);
      const nome = m.ricettario.get(x.id)!.nome;
      expect((m.doti[t] & VOLA) !== 0, nome).toBe(e.includes(PAROLE.vola));
      expect((m.doti[t] & APPICCICA) !== 0, nome).toBe(e.includes(PAROLE.appiccica));
      expect((m.doti[t] & FIORISCE) !== 0, nome).toBe(e.includes(PAROLE.fiorisce));
      expect((m.doti[t] & TINGE) !== 0, nome).toBe(e.includes(PAROLE.tinge));
      expect((m.doti[t] & INDURISCE) !== 0, nome).toBe(e.includes(PAROLE.indurisce));
      expect((m.doti[t] & PIOVE) !== 0, nome).toBe(e.includes(PAROLE.piove));
      // Ogni carattere nuovo vale solo dove ha un effetto: un solido non vola, un gas non fa presa.
      if (x.s.stato === SOLIDO || x.s.stato === GAS) expect(e.includes(PAROLE.vola) || e.includes(PAROLE.appiccica), nome).toBe(false);
      if (x.s.stato !== LIQUIDO) expect(e.includes(PAROLE.tinge), nome).toBe(false);
      if (x.s.stato !== GAS) expect(e.includes(PAROLE.piove), nome).toBe(false);
      if (x.s.stato === GAS) expect(e.includes(PAROLE.indurisce), nome).toBe(false);
    }
    // Tutti i caratteri, vecchi e nuovi, si incontrano già tra le miscele di due materiali.
    for (const parola of Object.values(PAROLE)) expect(viste.has(parola), parola).toBe(true);
  });

  it('«Vola»: una polvere che vola sale fino all’altezza delle nuvole e lì resta sospesa', () => {
    const m = mondo(60, 80);
    const { x, t } = cercaMiscela(m, (c) => c.s.stato === POLVERE && ha(c, 'vola') && !ha(c, 'appiccica') && quieta(c));
    expect(etichette(x.s)).toContain('Vola');
    riempi(m, 0, 75, 59, 79, M.ROCCIA);
    riempi(m, 25, 66, 34, 74, t);
    gira(m, 900);
    expect(quanti(m, t)).toBe(90);
    for (let i = 0; i < m.tipo.length; i++) if (m.tipo[i] === t) expect((i / m.w) | 0).toBeLessThanOrEqual(m.fasciaNuvole + 12);
  });

  it('«Vola»: un liquido che vola sale anche attraverso l’acqua', () => {
    const m = mondo(40, 80);
    const { t } = cercaMiscela(m, (c) => c.s.stato === LIQUIDO && ha(c, 'vola') && quieta(c));
    riempi(m, 0, 75, 39, 79, M.ROCCIA);
    riempi(m, 0, 55, 39, 74, M.ACQUA);
    riempi(m, 15, 70, 24, 74, t);
    gira(m, 1200);
    let sotto = 0;
    for (let i = 0; i < m.tipo.length; i++) if (m.tipo[i] === t && ((i / m.w) | 0) >= 55) sotto++;
    expect(sotto).toBeLessThan(5);
  });

  it('«Si attacca»: sotto un soffitto di roccia resta appesa, mentre una polvere qualsiasi cade', () => {
    const m = mondo();
    const appiccicosa = cercaMiscela(m, (c) => c.s.stato === POLVERE && ha(c, 'appiccica') && !ha(c, 'vola') && quieta(c));
    const libera = cercaMiscela(m, (c) => c.s.stato === POLVERE && !ha(c, 'appiccica') && !ha(c, 'vola') && quieta(c));
    expect(etichette(appiccicosa.x.s)).toContain('Si attacca');
    riempi(m, 0, 10, 59, 12, M.ROCCIA);
    riempi(m, 0, 55, 59, 59, M.ROCCIA);
    riempi(m, 10, 13, 19, 13, appiccicosa.t);
    riempi(m, 40, 13, 49, 13, libera.t);
    gira(m, 300);
    for (let x = 10; x <= 19; x++) expect(m.tipo[13 * m.w + x]).toBe(appiccicosa.t);
    expect(quanti(m, libera.t)).toBe(10);
    for (let x = 40; x <= 49; x++) expect(m.tipo[13 * m.w + x]).not.toBe(libera.t);
  });

  it('«Fa fiorire»: l’erba che tocca sboccia, e il fiore è una scoperta', () => {
    const m = mondo();
    const { x, t } = cercaMiscela(m, (c) => (c.s.stato === SOLIDO || c.s.stato === POLVERE) && ha(c, 'fiorisce') && !ha(c, 'vola') && quieta(c) && c.s.fertile <= SOGLIA.fertile);
    expect(etichette(x.s)).toContain('Fa fiorire');
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 20, 47, 29, 49, t);
    for (let y = 47; y <= 49; y++) for (let k = 30; k <= 33; k++) m.metti(y * m.w + k, M.PIANTA, 0);
    for (let y = 47; y <= 49; y++) m.tinta[y * m.w + 30] = 0;
    gira(m, 400);
    let fiori = 0;
    for (let y = 47; y <= 49; y++) if (m.tinta[y * m.w + 30] > 238) fiori++;
    expect(fiori).toBeGreaterThan(0);
    expect(m.visti.has(FIORE)).toBe(true);
  });

  it('«Tinge l’acqua»: l’acqua che tocca prende il suo colore, un po’ alla volta, e poi si ferma', () => {
    const m = mondo(80, 60);
    const { x, t } = cercaMiscela(m, (c) => c.s.stato === LIQUIDO && ha(c, 'tinge') && !ha(c, 'vola') && quieta(c));
    expect(etichette(x.s)).toContain('Tinge l’acqua');
    riempi(m, 0, 50, 79, 59, M.ROCCIA);
    riempi(m, 0, 30, 79, 49, M.ACQUA);
    const acqua = quanti(m, M.ACQUA);
    versaPer(m, 40, 25, t, 4, 1);
    const versate = quanti(m, t);
    gira(m, 4000);
    const tinte = quanti(m, t);
    expect(tinte).toBeGreaterThan(versate * 2);
    expect(quanti(m, M.ACQUA)).toBeLessThan(acqua);
    gira(m, 4000);
    // Ogni cella tinge una volta sola, e la catena è corta: da un granello ne nascono al più STERILE.
    expect(quanti(m, t)).toBe(tinte);
    expect(tinte).toBeLessThanOrEqual(versate * (STERILE + 1));
  });

  it('«Fa pietra»: la sabbia che tocca diventa pietra, e lei si consuma', () => {
    const m = mondo();
    const { x, t } = cercaMiscela(m, (c) => (c.s.stato === SOLIDO || c.s.stato === POLVERE) && ha(c, 'indurisce') && !ha(c, 'vola') && quieta(c));
    expect(etichette(x.s)).toContain('Fa pietra');
    riempi(m, 0, 50, 59, 59, M.SABBIA);
    riempi(m, 25, 47, 34, 49, t);
    gira(m, 3000);
    expect(quanti(m, M.PIETRA)).toBeGreaterThan(10);
    expect(quanti(m, t)).toBeLessThan(30);
    // Non trasforma il mondo intero: la sabbia lontana resta sabbia.
    expect(quanti(m, M.SABBIA)).toBeGreaterThan(400);
  });

  it('«Fa piovere»: un gas che porta pioggia si fa nuvola, una cella per una cella', () => {
    const m = mondo(60, 80);
    const { x, t } = cercaMiscela(m, (c) => c.s.stato === GAS && ha(c, 'piove') && quieta(c));
    expect(etichette(x.s)).toContain('Fa piovere');
    riempi(m, 0, 75, 59, 79, M.ROCCIA);
    riempi(m, 20, 60, 39, 64, t);
    const versate = quanti(m, t);
    let nuvole = 0;
    for (let k = 0; k < 300; k++) {
      m.passo();
      nuvole = Math.max(nuvole, quanti(m, M.NUVOLA));
    }
    expect(nuvole).toBeGreaterThan(5);
    expect(nuvole).toBeLessThanOrEqual(versate);
    expect(m.visti.has(M.NUVOLA)).toBe(true);
  });
});

describe('le miscele reagiscono tra loro, da sole, secondo il carattere', () => {
  /** Due blocchi di miscela uno accanto all'altro, su un pavimento di roccia. */
  function accanto(m: Mondo, a: number, b: number): void {
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 20, 45, 29, 49, a);
    riempi(m, 30, 45, 39, 49, b);
  }

  it('calda contro gelida: quella gelida svapora in nebbia', () => {
    const m = mondo();
    const calda = cercaMiscela(m, (c) => solida(c) && c.s.calore > SOGLIA.calore && c.s.veleno <= SOGLIA.veleno).t;
    const gelida = cercaMiscela(m, (c) => solida(c) && c.s.calore < -SOGLIA.calore && c.s.brucia <= SOGLIA.brucia && c.s.veleno <= SOGLIA.veleno).t;
    accanto(m, calda, gelida);
    gira(m, 600);
    expect(quanti(m, gelida)).toBeLessThan(50);
    expect(m.visti.has(M.VAPORE)).toBe(true);
    expect(quanti(m, calda)).toBe(50);
  });

  it('velenosa contro viva: quella viva muore, e resta cenere', () => {
    const m = mondo();
    const velenosa = cercaMiscela(m, (c) => solida(c) && c.s.veleno > SOGLIA.veleno && c.s.calore <= SOGLIA.calore && !ha(c, 'indurisce')).t;
    const viva = cercaMiscela(m, (c) => c.s.stato === SOLIDO && c.s.vivo > SOGLIA.vivo && !faMale(c.s) && c.s.esplode <= SOGLIA.esplode && c.s.brucia <= SOGLIA.brucia).t;
    accanto(m, velenosa, viva);
    gira(m, 600);
    expect(quanti(m, M.CENERE)).toBeGreaterThan(0);
    expect(m.visti.has(M.CENERE)).toBe(true);
    expect(quanti(m, velenosa)).toBe(50);
  });

  it('calda contro esplosiva: il botto', () => {
    const m = mondo();
    const calda = cercaMiscela(m, (c) => solida(c) && c.s.calore > SOGLIA.calore && c.s.veleno <= SOGLIA.veleno).t;
    const esplosiva = cercaMiscela(m, (c) => c.s.stato === SOLIDO && c.s.esplode > SOGLIA.esplode && c.s.calore <= SOGLIA.calore && c.s.vivo <= SOGLIA.vivo).t;
    accanto(m, calda, esplosiva);
    gira(m, 300);
    expect(m.botti.length).toBeGreaterThan(0);
  });

  it('due miscele tranquille una accanto all’altra restano come sono', () => {
    const m = mondo();
    const una = cercaMiscela(m, (c) => solida(c) && quieta(c) && ha(c, 'luce') && !ha(c, 'indurisce') && !ha(c, 'fertile')).t;
    const altra = cercaMiscela(m, (c) => solida(c) && quieta(c) && ha(c, 'nutre') && !ha(c, 'indurisce') && !ha(c, 'fertile')).t;
    accanto(m, una, altra);
    gira(m, 600);
    expect([quanti(m, una), quanti(m, altra)]).toEqual([50, 50]);
  });
});
