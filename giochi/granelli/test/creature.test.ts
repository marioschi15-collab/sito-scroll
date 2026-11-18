import { describe, expect, it } from 'vitest';
import { idDi, misuraDi } from '../src/contenuti/registro.js';
import { cheCosaCe } from '../src/motore/bersaglio.js';
import { C } from '../src/motore/cose.js';
import { CREATURE_MAX, type Creatura, nasciCreatura } from '../src/motore/creature.js';
import { M } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { fotografa, ripristina } from '../src/salvataggio.js';
import { gira, mondo, riempi } from './aiuti.js';

const PECORA = idDi('pecora');
const UCCELLO = idDi('uccello');
const PESCE = idDi('pesce');
const RANA = idDi('rana');
const LANA = idDi('lana');

/** Un prato piano: roccia dalla riga 50 in giù, in un mondo largo 120. */
function piano(): Mondo {
  const m = mondo(120, 70);
  riempi(m, 0, 50, 119, 69, M.ROCCIA);
  return m;
}

/** Fa nascere una creatura e la restituisce (la prova fallisce se non può nascere). */
function nasci(m: Mondo, id: number, x: number, y: number): Creatura {
  const c = nasciCreatura(m, id, x, y);
  if (typeof c === 'string') throw new Error(`la creatura ${id} non è nata: ${c}`);
  return c;
}

/** Tutte le posizioni che una creatura tocca in `tic` istanti. */
function percorso(m: Mondo, c: Creatura, tic: number): { x: number; y: number }[] {
  const tappe: { x: number; y: number }[] = [];
  for (let k = 0; k < tic; k++) {
    m.passo();
    tappe.push({ x: c.x, y: c.y });
  }
  return tappe;
}

describe('le creature vivono nel mondo', () => {
  it('chi cammina cade a terra e ci cammina sopra, girandosi davanti a un muro', () => {
    const m = piano();
    riempi(m, 70, 40, 72, 49, M.ROCCIA);
    const pecora = nasci(m, PECORA, 60, 30);
    const tappe = percorso(m, pecora, 1200);
    // Arriva a terra e resta sul prato: i piedi sulla riga 49, mai dentro il muro.
    expect(tappe.at(-1)!.y).toBe(49);
    const xs = new Set(tappe.slice(200).map((t) => t.x));
    expect(xs.size).toBeGreaterThan(5);
    expect(Math.max(...xs)).toBeLessThan(70);
  });

  it('chi cammina non entra nell’acqua fonda', () => {
    const m = piano();
    riempi(m, 40, 50, 119, 58, M.VUOTO);
    riempi(m, 40, 50, 119, 58, M.ACQUA);
    const pecora = nasci(m, PECORA, 20, 49);
    const tappe = percorso(m, pecora, 2000);
    expect(Math.max(...tappe.map((t) => t.x))).toBeLessThan(40);
  });

  it('chi vola sta in aria, non dentro i solidi, e si muove', () => {
    const m = piano();
    const uccello = nasci(m, UCCELLO, 60, 30);
    const tappe = percorso(m, uccello, 1200);
    const xs = new Set(tappe.map((t) => t.x));
    expect(xs.size).toBeGreaterThan(10);
    // Per la maggior parte del tempo sta sopra il terreno, e non entra mai nella roccia.
    expect(tappe.filter((t) => t.y < 46).length).toBeGreaterThan(tappe.length / 2);
    expect(tappe.every((t) => m.tipo[t.y * m.w + t.x] !== M.ROCCIA)).toBe(true);
  });

  it('chi nuota resta nell’acqua; fuori dall’acqua, dopo un po’, muore', () => {
    const m = piano();
    // Una vasca: l'acqua tra due pareti di roccia, che non si sparge sul prato.
    riempi(m, 29, 38, 29, 49, M.ROCCIA);
    riempi(m, 90, 38, 90, 49, M.ROCCIA);
    riempi(m, 30, 40, 89, 49, M.ACQUA);
    const pesce = nasci(m, PESCE, 60, 45);
    const tappe = percorso(m, pesce, 1200);
    expect(new Set(tappe.map((t) => t.x)).size).toBeGreaterThan(5);
    expect(tappe.every((t) => m.tipo[t.y * m.w + t.x] === M.ACQUA)).toBe(true);
    // Si toglie l'acqua: il pesce resta all'asciutto e non ce la fa.
    riempi(m, 30, 40, 89, 49, M.VUOTO);
    gira(m, 400);
    expect(m.creature.length).toBe(0);
    expect(m.sparite.length).toBe(1);
    // E dove l'acqua non c'è, un pesce non nasce.
    expect(nasciCreatura(m, PESCE, 60, 45)).toBe('senzAcqua');
  });

  it('il fuoco e la lava le uccidono', () => {
    for (const fiamma of [M.FUOCO, M.LAVA]) {
      const m = piano();
      nasci(m, PECORA, 60, 49);
      nasci(m, UCCELLO, 30, 40);
      riempi(m, 56, 46, 64, 49, fiamma);
      riempi(m, 27, 37, 33, 42, fiamma);
      gira(m, 12);
      expect(m.creature.length, `nel ${fiamma}`).toBe(0);
    }
  });

  it('sono al più quaranta', () => {
    const m = piano();
    for (let k = 0; k < CREATURE_MAX; k++) nasci(m, PECORA, 5 + k * 2, 49);
    expect(nasciCreatura(m, PECORA, 60, 49)).toBe('affollato');
    expect(m.porta(PECORA, 60, 30, 'gettone')).toEqual({ genere: 'nonQui', perche: 'affollato' });
  });

  it('sono bersagli come gli omini: portandoci sopra qualcosa si uniscono', () => {
    const m = piano();
    m.visti.add(PECORA).add(C.UTENSILE);
    const pecora = nasci(m, PECORA, 60, 49);
    const [, h] = misuraDi(PECORA)!;
    expect(cheCosaCe(m, 60, 49 - (h >> 1))).toMatchObject({ genere: 'creatura', id: PECORA, rif: pecora });
    // Anche a qualche cella di distanza, se lì non c'è altro.
    expect(cheCosaCe(m, 64, 43)).toMatchObject({ genere: 'creatura', id: PECORA });
    expect(m.porta(C.UTENSILE, 60, 48, 'gettone')).toMatchObject({ genere: 'unione', nato: LANA, nuova: true });
    expect(m.visti.has(LANA)).toBe(true);
    // La pecora non viene tolta.
    expect(m.creature).toContain(pecora);
  });

  it('un gettone di creatura portato sul vuoto o sul terreno la fa nascere lì; nata da un’unione, nasce dove si è unito', () => {
    const m = piano();
    m.visti.add(PECORA).add(PESCE);
    expect(m.porta(PECORA, 30, 20, 'gettone')).toMatchObject({ genere: 'messa' });
    expect(m.creature.map((c) => c.id)).toEqual([PECORA]);
    // Il pesce portato sul fango: nasce la rana, proprio lì.
    riempi(m, 80, 46, 95, 49, M.FANGO);
    const esito = m.porta(PESCE, 88, 47, 'gettone');
    expect(esito).toMatchObject({ genere: 'unione', nato: RANA, posata: true });
    expect(m.creature.map((c) => c.id)).toContain(RANA);
    expect(Math.abs(m.creature.find((c) => c.id === RANA)!.x - 88)).toBeLessThanOrEqual(2);
    // Dal mondo (tenuta con la Mano) e riportata sul vuoto, torna dov'era: niente copie.
    expect(m.porta(PECORA, 30, 20, 'mondo')).toEqual({ genere: 'torna' });
    expect(m.creature.length).toBe(2);
  });

  it('la Gomma le toglie, e si salvano con la partita', () => {
    const m = piano();
    nasci(m, PECORA, 30, 49);
    riempi(m, 60, 40, 89, 49, M.ACQUA);
    nasci(m, PESCE, 70, 45);
    const copia = ripristina(JSON.parse(JSON.stringify(fotografa(m))))!;
    expect(copia.creature.map((c) => [c.id, c.x, c.y])).toEqual(m.creature.map((c) => [c.id, c.x, c.y]));
    // Una fotografia sporca: un numero che non è una creatura, una fuori dal mondo, un campo storto.
    const foto = JSON.parse(JSON.stringify(fotografa(m)));
    foto.creature.push({ id: C.CASA, x: 5, y: 5, dir: 1 }, { id: PECORA, x: 9999, y: 5, dir: 1 }, { id: PECORA, x: 'a', y: 5 });
    expect(ripristina(foto)!.creature.length).toBe(2);
    m.cancella(30, 47, 3);
    expect(m.creature.map((c) => c.id)).toEqual([PESCE]);
  });
});
