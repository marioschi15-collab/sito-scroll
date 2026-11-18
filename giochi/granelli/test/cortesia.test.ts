import { describe, expect, it } from 'vitest';
import { idDi } from '../src/contenuti/registro.js';
import { C } from '../src/motore/cose.js';
import {
  ANNUSA,
  BEVE,
  DURATA_CORTESIA,
  GUARDA,
  PENSA,
  REAZIONI_DI_CORTESIA,
  SALTELLA,
  SCAPPA,
  STARNUTISCE,
  TREMA,
  reazioneA,
} from '../src/motore/cortesia.js';
import { nasciCreatura } from '../src/motore/creature.js';
import { M, OMINO } from '../src/motore/materiali.js';
import { gira, mondo, riempi } from './aiuti.js';

const PECORA = idDi('pecora');

function prato() {
  const m = mondo(120, 70);
  riempi(m, 0, 50, 119, 69, M.ROCCIA);
  return m;
}

describe('le reazioni di cortesia: mai un «niente» muto', () => {
  it('la tabella: ogni cosa portata ha la sua reazione, secondo che cos’è', () => {
    const m = prato();
    expect(new Set(REAZIONI_DI_CORTESIA).size).toBe(8);
    const attese: [number, number][] = [
      [M.FUOCO, SCAPPA],
      [M.LAVA, SCAPPA],
      [M.ACQUA, BEVE],
      [M.FRUTTO, ANNUSA],
      [C.PANE, ANNUSA],
      [idDi('miele'), ANNUSA],
      [C.RUOTA, GUARDA],
      [C.CASA, GUARDA],
      [M.SABBIA, STARNUTISCE],
      [M.FUMO, STARNUTISCE],
      [M.NEVE, TREMA],
      [M.GHIACCIO, TREMA],
      [PECORA, SALTELLA],
      [C.SCRITTURA, PENSA],
      [idDi('fabbro'), PENSA],
    ];
    for (const [id, r] of attese) expect(reazioneA(m, id), `reazione a ${id}`).toBe(r);
  });

  it('un omino a cui si porta l’acqua beve (gli passa la sete); col fuoco si gira e scappa; la reazione poi passa', () => {
    const m = prato();
    m.visti.add(M.SABBIA);
    m.aggiungiOmino(60, 49);
    const o = m.omini[0];
    o.sete = 200;
    expect(m.porta(M.SABBIA, 60, 48, 'gettone')).toEqual({ genere: 'niente', con: OMINO, reazione: STARNUTISCE });
    expect(m.giaProvata(M.SABBIA, OMINO)).toBe(true);
    expect(m.porta(M.ACQUA, 60, 48, 'gettone')).toMatchObject({ genere: 'niente', reazione: BEVE });
    expect(o.sete).toBe(0);
    expect(o.nuvoletta).toBe(BEVE);
    gira(m, DURATA_CORTESIA + 10);
    expect(o.nuvoletta).toBeUndefined();
    // Il fuoco portato addosso: si gira e corre via.
    const dir = o.dir;
    const x = o.x;
    m.porta(M.LAVA, o.x, o.y - 1, 'gettone');
    expect(o.dir).toBe(-dir);
    gira(m, 40);
    expect(Math.sign(o.x - x)).toBe(-dir);
    expect(Math.abs(o.x - x)).toBeGreaterThanOrEqual(4);
  });

  it('anche una creatura reagisce, e chi scappa corre davvero', () => {
    const m = prato();
    m.visti.add(PECORA).add(C.RUOTA);
    const pecora = nasciCreatura(m, PECORA, 60, 49);
    if (typeof pecora === 'string') throw new Error(pecora);
    expect(m.porta(C.RUOTA, 60, 48, 'gettone')).toMatchObject({ genere: 'niente', con: PECORA, reazione: GUARDA });
    expect(pecora.nuvoletta).toBe(GUARDA);
    const x = pecora.x;
    m.porta(M.FUOCO, 60, 47, 'gettone');
    expect(pecora.nuvoletta).toBe(SCAPPA);
    gira(m, 60);
    expect(Math.abs(pecora.x - x)).toBeGreaterThanOrEqual(6);
  });

  it('niente reazioni quando un’unione riesce o quando la cosa fa quello che fa il suo tipo', () => {
    const m = prato();
    m.visti.add(C.LANCIA).add(idDi('fiaccola'));
    m.aggiungiOmino(60, 49);
    const o = m.omini[0];
    m.porta(idDi('fiaccola'), 60, 48, 'gettone');
    expect(o.nuvoletta).toBeUndefined();
    m.porta(C.LANCIA, 60, 48, 'gettone');
    expect(o.nuvoletta).toBeUndefined();
  });
});
