import { describe, expect, it } from 'vitest';
import { C } from '../src/motore/cose.js';
import { Anagrafe, GIORNO, lago, mondoVero, prato } from './aiuti.js';

describe('un paese in collina, nel mondo vero', () => {
  it.each([1, 6])('in cima a una collina con l’acqua in basso, dopo tre giorni è vivo e nessuno è morto di sete (seme %i)', (seme) => {
    const m = mondoVero(seme);
    m.visti.add(C.CAPANNA);
    const { x0, x1, pelo } = lago(m, 12);
    // La cima più alta tra cinquanta e centoventi colonne dal lago: lì la capanna e i primi quattro abitanti.
    let cima = -1;
    for (let x = Math.max(8, x0 - 120); x <= Math.min(m.w - 9, x1 + 120); x++) {
      if (x > x0 - 50 && x < x1 + 50) continue;
      if (cima < 0 || m.suolo(x) < m.suolo(cima)) cima = x;
    }
    prato(m, Math.min(cima, x0) - 20, x0 - 1);
    prato(m, x1 + 1, Math.max(cima, x1) + 20);
    let casa = -1;
    for (let d = 0; d < 25 && casa < 0; d++) {
      if (m.posa(C.CAPANNA, cima + d, 20)) casa = cima + d;
      else if (m.posa(C.CAPANNA, cima - d, 20)) casa = cima - d;
    }
    expect(casa).toBeGreaterThanOrEqual(0);
    // Una collina vera: la capanna sta almeno trenta celle più in alto del lago e a più di quaranta colonne dalla riva.
    expect(pelo - m.cose[0].y).toBeGreaterThanOrEqual(30);
    expect(Math.min(Math.abs(casa - x0), Math.abs(casa - x1))).toBeGreaterThan(40);
    for (let k = 0; k < 4; k++) m.aggiungiOmino(cima - 4 + k * 3, m.suolo(cima - 4 + k * 3) - 1);
    const anagrafe = new Anagrafe();
    let aCasa = 0;
    for (let terzo = 0; terzo < 9; terzo++) {
      anagrafe.gira(m, GIORNO / 3);
      // A notte fonda (alla fine del secondo terzo di ogni giorno) chi ha un posto dorme nella capanna.
      if (terzo % 3 === 1) aCasa += m.omini.filter((o) => o.dentro === m.cose[0].n).length;
    }
    expect(anagrafe.morti.sete).toBeUndefined();
    expect(anagrafe.morti.fame).toBeUndefined();
    expect(m.omini.length).toBeGreaterThanOrEqual(4);
    expect(aCasa).toBeGreaterThanOrEqual(6);
    // E il paese è rimasto il loro: nessuno ha traslocato sul lago.
    for (const o of m.omini) expect(Math.abs((o.casa as number) - casa)).toBeLessThanOrEqual(12);
  }, 120000);
});
