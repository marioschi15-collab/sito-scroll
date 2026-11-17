import { describe, expect, it } from 'vitest';
import { C } from '../src/motore/cose.js';
import { M } from '../src/motore/materiali.js';
import { Anagrafe, GIORNO, albero, mondoVero, prato, quanti } from './aiuti.js';

describe('un paese nel bosco, nel mondo vero', () => {
  it.each([1, 3])('col pozzo in mezzo a un bosco fitto, dopo tre giorni è vivo e nessuno è morto di sete (seme %i)', (seme) => {
    const m = mondoVero(seme);
    for (const id of [C.POZZO, C.CAPANNA]) m.visti.add(id);
    const centro = m.w >> 1;
    // Terriccio ed erba per novanta celle da una parte e dall'altra, il pozzo in mezzo, una capanna accanto.
    prato(m, centro - 90, centro + 90);
    let pozzo = -1;
    for (let d = 0; d < 30 && pozzo < 0; d++) if (m.posa(C.POZZO, centro + d, 20)) pozzo = centro + d;
    let capanna = -1;
    for (let d = 12; d < 60 && capanna < 0; d++) if (m.posa(C.CAPANNA, centro - d, 20)) capanna = centro - d;
    expect(pozzo).toBeGreaterThanOrEqual(0);
    expect(capanna).toBeGreaterThanOrEqual(0);
    // Un albero ogni quattro-sei celle, alto da sei a dodici: prima di questo lavoro era una gabbia per ogni omino.
    let alberi = 0;
    for (let x = centro - 88; x <= centro + 88; x += 4 + (x % 3)) {
      if (m.coperta[x]) continue;
      albero(m, x, 6 + (x % 7));
      alberi++;
    }
    expect(alberi).toBeGreaterThan(20);
    for (let k = 0; k < 12; k++) m.aggiungiOmino(centro - 22 + k * 4, m.suolo(centro - 22 + k * 4) - 1);
    const anagrafe = new Anagrafe();
    anagrafe.gira(m, GIORNO);
    // Dopo un giorno intero non è morto nessuno: tutti e dodici hanno trovato il pozzo tra gli alberi.
    expect(anagrafe.morti).toEqual({});
    expect(m.omini.length).toBeGreaterThanOrEqual(9);
    anagrafe.gira(m, 2 * GIORNO);
    expect(quanti(m, M.LEGNO)).toBeGreaterThan(200);
    expect(anagrafe.morti.sete).toBeUndefined();
    expect(anagrafe.morti.fame).toBeUndefined();
    expect(m.omini.length).toBeGreaterThanOrEqual(4);
  }, 120000);
});
