import { describe, expect, it } from 'vitest';
import { C, G, INGOMBRO, INGREDIENTI, RISULTATI, unione, vieDi } from '../src/motore/cose.js';
import { esitoDi, esitoNoto, fenomenoDi, siUnisce } from '../src/motore/esiti.js';
import { M, N_BASE, OMINO } from '../src/motore/materiali.js';
import { PER_ID, SCOPERTE } from '../src/scoperte.js';
import { mondo } from './aiuti.js';

/** Le invenzioni di prima (dall'utensile al faro): ognuna deve servire a fare qualcos'altro. */
const INVENZIONI = Object.values(C).filter((id) => id < 230);
/** Le voci nate con le unioni nuove: mestieri, persone e cose, tutte con un numero tra 230 e 299. */
const NUOVE = [...Object.values(G), ...Object.values(C).filter((id) => id >= 230)];
/** Tutte le unioni nuove: quelle delle voci nuove e la via dei primi omini (la capanna con un frutto). */
const UNIONI_NUOVE = [...NUOVE.flatMap((id) => vieDi(id).map(([a, b]) => [a, b, id] as const)), ...vieDi(OMINO).map(([a, b]) => [a, b, OMINO] as const)];

describe('le unioni nuove', () => {
  it('sono almeno trenta, e almeno dieci hanno per ingrediente un omino o una costruzione che si posa', () => {
    expect(UNIONI_NUOVE.length).toBeGreaterThanOrEqual(30);
    const conOmini = UNIONI_NUOVE.filter(([a, b]) => [a, b].some((id) => id === OMINO || INGOMBRO[id] !== undefined));
    expect(conOmini.length).toBeGreaterThanOrEqual(10);
    expect(UNIONI_NUOVE.filter(([a, b]) => a === OMINO || b === OMINO).length).toBeGreaterThanOrEqual(10);
  });

  it('ogni invenzione entra in almeno un’unione come ingrediente: nessuna resta un vicolo cieco', () => {
    for (const id of INVENZIONI) expect(INGREDIENTI.has(id), PER_ID.get(id)?.nome).toBe(true);
  });

  it('le voci nuove hanno un numero tra 230 e 299, il capitolo giusto, nome, indizio e descrizione in italiano semplice', () => {
    const numeri = new Set<number>();
    for (const id of NUOVE) {
      expect(id).toBeGreaterThanOrEqual(230);
      expect(id).toBeLessThanOrEqual(299);
      expect(numeri.has(id)).toBe(false);
      numeri.add(id);
      const voce = PER_ID.get(id)!;
      expect(voce, `voce ${id}`).toBeDefined();
      expect(voce.sezione).toBe(Object.values(G).includes(id as never) ? 'genti' : 'cose');
      for (const testo of [voce.nome, voce.indizio, voce.descrizione]) {
        expect(testo.length, voce.nome).toBeGreaterThanOrEqual(2);
        expect(testo).not.toMatch(/agente|prompt|token|\bapi\b|bug|sprite|render|mestolo/i);
      }
      expect(voce.descrizione).toMatch(/\.$/);
      // Per ora sono gettoni: non si versano e non si posano.
      expect(voce.versabile).toBe(false);
      // Il Libro racconta come nascono: le stesse unioni scritte in cose.ts.
      expect(voce.nasce.map((via) => via.con)).toEqual(vieDi(id));
    }
    // Ogni nome è unico in tutto il Libro.
    const nomi = SCOPERTE.map((s) => s.nome);
    expect(new Set(nomi).size).toBe(nomi.length);
  });

  it('ogni voce nuova compare nello scaffale di Unisci, e nessuna delle sue coppie è presa per un fenomeno', () => {
    for (const id of [...NUOVE, OMINO]) {
      expect(siUnisce(id), PER_ID.get(id)?.nome).toBe(true);
      expect(RISULTATI.has(id)).toBe(true);
      for (const [a, b] of vieDi(id)) {
        expect(fenomenoDi(a, b), `${a} + ${b}`).toBe(-1);
        expect(esitoDi(a, b, 0)).toEqual({ genere: 'unione', id });
        expect(esitoDi(b, a, 200)).toEqual({ genere: 'unione', id });
      }
    }
  });

  it('dal pannello Unisci danno davvero la loro voce, partendo da cose possedute', () => {
    for (const [a, b, id] of UNIONI_NUOVE) {
      const m = mondo();
      m.visti.add(a).add(b);
      expect(m.unisci(a, b), `${a} + ${b}`).toBe(id);
      expect(m.visti.has(id)).toBe(true);
      expect(m.giaProvata(b, a)).toBe(true);
    }
  });

  it('nessuna coppia è scritta due volte, e le unioni nuove non tolgono niente a quelle di prima', () => {
    const chiavi = new Set<string>();
    for (const id of [...RISULTATI]) {
      for (const [a, b] of vieDi(id)) {
        const chiave = `${Math.min(a, b)}:${Math.max(a, b)}`;
        expect(chiavi.has(chiave), chiave).toBe(false);
        chiavi.add(chiave);
        expect(unione(a, b)).toBe(id);
      }
    }
    // Una reazione del mondo tra due materiali resta tale: le unioni nuove non hanno due materiali come ingredienti.
    for (const [a, b] of UNIONI_NUOVE) expect(a < N_BASE && b < N_BASE, `${a} + ${b}`).toBe(false);
    for (const [a, b] of UNIONI_NUOVE) expect(esitoNoto(a, b), `${a} + ${b}`).toBe(-1);
    // Un utensile sul pozzo, invece, resta una coppia senza esito (le prove di porta() ci contano).
    expect(unione(C.UTENSILE, C.POZZO)).toBe(-1);
    expect(unione(OMINO, M.PIETRA)).toBe(-1);
  });
});
