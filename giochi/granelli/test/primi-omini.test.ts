import { describe, expect, it } from 'vitest';
import { cercaApprodo } from '../src/motore/arrivi.js';
import { ingombroDi } from '../src/contenuti/registro.js';
import { C } from '../src/motore/cose.js';
import { BAMBINO, M, OMINO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { NON_QUI } from '../src/righe.js';
import { Anagrafe, lago, mondo, mondoVero, prato, riempi } from './aiuti.js';

/** Un mondo vero con il lago nella conca, erba sulle due rive e una capanna posata su una riva (la destra, se c'è posto). */
function rivaConCapanna(seme = 1): { m: Mondo; punto: [number, number]; lago: { x0: number; x1: number } } {
  const m = mondoVero(seme);
  const { x0, x1 } = lago(m, 12);
  prato(m, x0 - 60, x0 - 1);
  prato(m, x1 + 1, x1 + 60);
  m.visti.add(C.CAPANNA).add(M.FRUTTO);
  for (let d = 12; d < 50; d++) {
    for (const x of [x1 + d, x0 - d]) {
      if (!m.posa(C.CAPANNA, x, m.suolo(x) - 1)) continue;
      const c = m.cose[0];
      return { m, punto: [c.x + (ingombroDi(C.CAPANNA)![0] >> 1), c.y - 2], lago: { x0, x1 } };
    }
  }
  throw new Error('sulle rive non c’è posto per la capanna');
}

describe('i primi omini arrivano unendo: un tetto e un frutto', () => {
  it('un frutto portato sulla capanna fa arrivare due omini vivi, vicini tra loro e all’acqua, e il paese cresce', () => {
    const { m, punto } = rivaConCapanna();
    const esito = m.porta(M.FRUTTO, punto[0], punto[1], 'gettone');
    expect(esito).toMatchObject({ genere: 'unione', nato: OMINO, nuova: true, con: C.CAPANNA, posata: true });
    expect(m.visti.has(OMINO)).toBe(true);
    expect(m.omini.length).toBe(2);
    const [a, b] = m.omini;
    expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(3);
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(5);
    // Vicino al punto, e a pochi passi dall'acqua.
    expect(Math.abs(a.x - punto[0])).toBeLessThanOrEqual(30);
    for (const o of m.omini) expect(Math.abs(m.fonti.bere(o.x) - o.x)).toBeLessThanOrEqual(10);
    // Gli arrivi da soli si mettono in pausa, come quando arrivano da sé.
    expect(m.prossimoArrivo).toBeGreaterThan(m.tic);
    // Con acqua e piante il paese cresce: nasce un bambino, e i due di prima sono ancora vivi.
    const anagrafe = new Anagrafe();
    anagrafe.gira(m, 6000);
    expect(anagrafe.nati).toBeGreaterThanOrEqual(1);
    expect(m.visti.has(BAMBINO)).toBe(true);
    expect(anagrafe.morti.sete).toBeUndefined();
    expect(anagrafe.morti.fame).toBeUndefined();
    expect(m.omini.length).toBeGreaterThanOrEqual(3);
  }, 60000);

  it('dove non c’è acqua l’Omino si scopre lo stesso, e l’esito dice che arriveranno vicino all’acqua', () => {
    const m = mondo(120, 70);
    riempi(m, 0, 50, 119, 69, M.ROCCIA);
    m.visti.add(C.CAPANNA).add(M.FRUTTO);
    expect(m.posa(C.CAPANNA, 60, 49)).toBe(true);
    expect(m.porta(M.FRUTTO, 60, 46, 'gettone')).toEqual({ genere: 'nonQui', perche: 'acqua' });
    expect(NON_QUI.acqua).toBe('Arriveranno vicino all’acqua.');
    expect(m.visti.has(OMINO)).toBe(true);
    expect(m.omini.length).toBe(0);
    // Appena c'è un lago lì accanto, la stessa unione li fa arrivare: l'Omino già noto non la rende inutile.
    riempi(m, 70, 50, 100, 55, M.VUOTO);
    riempi(m, 70, 50, 100, 55, M.ACQUA);
    expect(m.porta(M.FRUTTO, 60, 46, 'gettone')).toMatchObject({ genere: 'unione', nato: OMINO, nuova: false, posata: true });
    expect(m.omini.length).toBe(2);
  });

  it('con gli omini già nel mondo l’unione è già fatta: non ne arrivano altri', () => {
    const m = mondo(120, 70);
    riempi(m, 0, 50, 119, 69, M.ROCCIA);
    riempi(m, 80, 50, 110, 55, M.VUOTO);
    riempi(m, 80, 50, 110, 55, M.ACQUA);
    m.visti.add(C.CAPANNA).add(M.FRUTTO);
    expect(m.posa(C.CAPANNA, 40, 49)).toBe(true);
    m.aggiungiOmino(10, 49);
    expect(m.porta(M.FRUTTO, 40, 46, 'gettone')).toEqual({ genere: 'giaFatta', nato: OMINO, con: C.CAPANNA });
    expect(m.omini.length).toBe(1);
  });

  it('se gli omini sono tutti morti, un frutto sulla capanna ne fa arrivare altri due', () => {
    const { m, punto } = rivaConCapanna();
    m.visti.add(OMINO);
    expect(m.porta(M.FRUTTO, punto[0], punto[1], 'gettone')).toMatchObject({ genere: 'unione', nato: OMINO, nuova: false });
    expect(m.omini.length).toBe(2);
  });

  it('anche dal pannello Unisci: capanna e frutto fanno arrivare due omini, vicino a dove si guarda', () => {
    const { m, lago: acqua } = rivaConCapanna(3);
    expect(m.unisci(C.CAPANNA, M.FRUTTO, acqua.x0 - 20)).toBe(OMINO);
    expect(m.omini.length).toBe(2);
    // Sulla riva sinistra, quella più vicina a dove si guardava.
    for (const o of m.omini) expect(o.x).toBeLessThan(acqua.x0);
    expect(m.giaProvata(M.FRUTTO, C.CAPANNA)).toBe(true);
    // E l'Omino si scopre dove sono arrivati, non nel mezzo del mondo.
    const festa = m.novita.find((n) => n.id === OMINO)!;
    expect(Math.abs(festa.x - m.omini[0].x)).toBeLessThanOrEqual(1);
  });

  it('cercaApprodo cerca dalla colonna più vicina, entro il raggio, e senza acqua non trova niente', () => {
    const { m, lago: acqua } = rivaConCapanna();
    m.fonti.aggiorna(m);
    const destra = cercaApprodo(m, acqua.x1 + 25, 30)!;
    expect(destra.x).toBeGreaterThan(acqua.x1);
    expect(destra.x).toBeLessThanOrEqual(acqua.x1 + 10);
    expect(cercaApprodo(m, acqua.x1 + 80, 10)).toBeNull();
    const secco = mondo(80, 60);
    riempi(secco, 0, 50, 79, 59, M.ROCCIA);
    secco.fonti.aggiorna(secco);
    expect(cercaApprodo(secco, 40, 80)).toBeNull();
  });
});
