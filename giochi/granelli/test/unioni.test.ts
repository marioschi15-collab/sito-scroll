import { describe, expect, it } from 'vitest';
import { eIngrediente, eRisultato, ingombroDi, unioneDi as unione, unioni, vieDi, voce as voceDi, voci } from '../src/contenuti/registro.js';
import { C } from '../src/motore/cose.js';
import { esitoDi, esitoNoto, fenomenoDi, siUnisce } from '../src/motore/esiti.js';
import { M, N_BASE, OMINO } from '../src/motore/materiali.js';
import { mondo } from './aiuti.js';

/** Le invenzioni di prima (dall'utensile al faro): ognuna deve servire a fare qualcos'altro. */
const INVENZIONI = Object.values(C);
/** Le voci nate con le unioni del P3: mestieri, persone e cose, ora schede del file `paese`, con un numero tra 230 e 299. */
const NUOVE = voci()
  .filter((v) => v.file === 'paese')
  .map((v) => v.id);
/** Tutte le unioni nuove: quelle delle voci nuove e la via dei primi omini (la capanna con un frutto). */
const UNIONI_NUOVE = [...NUOVE.flatMap((id) => vieDi(id).map(([a, b]) => [a, b, id] as const)), ...vieDi(OMINO).map(([a, b]) => [a, b, OMINO] as const)];

describe('le unioni nuove', () => {
  it('sono almeno trenta, e almeno dieci hanno per ingrediente un omino o una costruzione che si posa', () => {
    expect(UNIONI_NUOVE.length).toBeGreaterThanOrEqual(30);
    const conOmini = UNIONI_NUOVE.filter(([a, b]) => [a, b].some((id) => id === OMINO || ingombroDi(id) !== undefined));
    expect(conOmini.length).toBeGreaterThanOrEqual(10);
    expect(UNIONI_NUOVE.filter(([a, b]) => a === OMINO || b === OMINO).length).toBeGreaterThanOrEqual(10);
  });

  it('ogni invenzione entra in almeno un’unione come ingrediente: nessuna resta un vicolo cieco', () => {
    for (const id of INVENZIONI) expect(eIngrediente(id), voceDi(id)?.nome).toBe(true);
  });

  it('le voci nuove hanno un numero tra 230 e 299, il capitolo giusto, nome, indizio e descrizione in italiano semplice', () => {
    expect(NUOVE.length).toBe(35);
    const numeri = new Set<number>();
    for (const id of NUOVE) {
      expect(id).toBeGreaterThanOrEqual(230);
      expect(id).toBeLessThanOrEqual(299);
      expect(numeri.has(id)).toBe(false);
      numeri.add(id);
      const voce = voceDi(id)!;
      expect(voce, `voce ${id}`).toBeDefined();
      expect(voce.famiglia).toBe(id < 260 ? 'genti' : 'cose');
      for (const testo of [voce.nome, voce.indizio, voce.descrizione]) {
        expect(testo.length, voce.nome).toBeGreaterThanOrEqual(2);
        expect(testo).not.toMatch(/agente|prompt|token|\bapi\b|bug|sprite|render|mestolo/i);
      }
      expect(voce.descrizione).toMatch(/\.$/);
      // Tutte stanno nella tavolozza e si portano nel mondo, tranne i luoghi (il regno): si guardano, non si portano.
      expect(voce.versabile).toBe(voce.tipo !== 'luogo');
      // Si posano a terra le costruzioni e gli oggetti (come figurine); i mestieri vanno a un omino.
      expect(ingombroDi(id) !== undefined).toBe(voce.tipo === 'costruzione' || voce.tipo === 'oggetto');
      // Il Libro racconta come nascono: le stesse unioni scritte nella loro scheda.
      expect(voce.nasce.map((via) => via.con)).toEqual(vieDi(id));
    }
    // Ogni nome è unico in tutto il Libro.
    const nomi = voci().map((s) => s.nome);
    expect(new Set(nomi).size).toBe(nomi.length);
  });

  it('ogni voce nuova compare nello scaffale di Unisci, e nessuna delle sue coppie è presa per un fenomeno', () => {
    for (const id of [...NUOVE, OMINO]) {
      expect(siUnisce(id), voceDi(id)?.nome).toBe(true);
      expect(eRisultato(id)).toBe(true);
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
    for (const id of new Set(unioni().map(([, , r]) => r))) {
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
