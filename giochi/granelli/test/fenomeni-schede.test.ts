import { describe, expect, it } from 'vitest';
import { idDi, ingombroDi, muoveDi, schede, tipoDi, voce, voci } from '../src/contenuti/registro.js';
import { nasciCreatura } from '../src/motore/creature.js';
import { SOLO_NEL_MONDO, siUnisce } from '../src/motore/esiti.js';
import { M, N_BASE, NASCOSTO, OMINO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { staAGalla } from '../src/motore/posa.js';
import { mondo, riempi } from './aiuti.js';

/**
 * I fenomeni scritti nelle schede (il sole, la nebbia, l'eclissi… della grande infornata) non si regalano in Unisci:
 * si scoprono portando una delle due cose sull'altra dentro il mondo. Qui si controlla che questo si possa fare
 * davvero: una delle due deve stare nel mondo come bersaglio (un materiale, una cosa posata o appoggiata, un omino,
 * una creatura) e l'altra arrivarci sopra come gettone con un tocco. Oggi il tocco porta così solo oggetti, creature,
 * mestieri, idee ed eventi (un materiale si versa, una costruzione si posa, e la notte o l'alba non stanno nella
 * tavolozza): ogni fenomeno deve avere almeno una via così.
 */
const COL_TOCCO = new Set<string | undefined>(['oggetto', 'creatura', 'mestiere', 'idea', 'evento']);

/** Un mondo in cui tutto ciò che si unisce è già noto, con un piano di roccia alla riga 50. */
function saputo(): Mondo {
  const m = mondo(120, 70);
  riempi(m, 0, 50, 119, 69, M.ROCCIA);
  for (const v of voci()) if (siUnisce(v.id)) m.visti.add(v.id);
  return m;
}

/** Mette nel mondo il bersaglio e dice dove toccarlo; null se quella scoperta nel mondo non può stare. */
function bersaglio(m: Mondo, id: number): [number, number] | null {
  if (id > 0 && id < N_BASE && !NASCOSTO[id]) {
    riempi(m, 40, 42, 60, 49, id);
    return [50, 45];
  }
  const ingombro = ingombroDi(id);
  if (ingombro) {
    if (staAGalla(id)) riempi(m, 20, 50, 80, 56, M.ACQUA);
    if (!m.posa(id, 50, 45)) return null;
    const c = m.cose[0];
    return [c.x + (ingombro[0] >> 1), c.y - (ingombro[1] >> 1)];
  }
  if (id === OMINO) {
    m.aggiungiOmino(50, 49);
    return [50, 48];
  }
  if (tipoDi(id) === 'creatura') {
    if (muoveDi(id) === 'nuota') riempi(m, 40, 44, 60, 49, M.ACQUA);
    const c = nasciCreatura(m, id, 50, 47);
    return typeof c === 'string' ? null : [c.x, c.y];
  }
  return null;
}

const VIE = schede().flatMap(([, s]) => (s.tipo === 'fenomeno' ? s.unioni.map(([a, b]) => [idDi(a), idDi(b), idDi(s.chiave)] as const) : []));

describe('i fenomeni delle schede si scoprono nel mondo', () => {
  it('ce ne sono, e ognuno ha almeno una via', () => {
    expect(VIE.length).toBeGreaterThan(20);
  });

  it('ogni fenomeno ha almeno una via da fare nel mondo, con un tocco del gettone sopra una cosa che c’è', () => {
    const fattibili = new Set<number>();
    for (const [a, b, fenomeno] of VIE) {
      const nati = [
        [a, b],
        [b, a],
      ].map(([gettone, sotto]) => {
        if (!voce(gettone)?.versabile || !COL_TOCCO.has(tipoDi(gettone))) return false;
        const m = saputo();
        m.visti.add(a).add(b).delete(fenomeno);
        const punto = bersaglio(m, sotto);
        if (!punto) return false;
        const e = m.porta(gettone, punto[0], punto[1], 'gettone');
        return e.genere === 'nelMondo' && e.fenomeno === fenomeno && m.visti.has(fenomeno);
      });
      if (nati.includes(true)) fattibili.add(fenomeno);
      // In Unisci, invece, «succede solo nel mondo».
      const m = saputo();
      m.visti.add(a).add(b);
      expect(m.unisci(a, b), `${a} + ${b}`).toBe(SOLO_NEL_MONDO);
    }
    const senzaVia = [...new Set(VIE.map(([, , f]) => f))].filter((f) => !fattibili.has(f)).map((f) => voce(f)?.nome);
    expect(senzaVia).toEqual([]);
  });
});
