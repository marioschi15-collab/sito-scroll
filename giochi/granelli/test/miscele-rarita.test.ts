import { describe, expect, it } from 'vitest';
import { FIRMATE, firmataDi } from '../src/motore/firmate.js';
import { M, N_BASE, type Sostanza, TRATTI } from '../src/motore/materiali.js';
import { CARATTERI, type Rarita, SOGLIA, funziona, margine, rarita, tratti } from '../src/motore/miscele.js';
import { descriviMiscela } from '../src/motore/nomi.js';
import { mondo, primaGenerazione } from './aiuti.js';

describe('la rarità delle miscele', () => {
  it('è stabile: la stessa coppia ha la stessa rarità in ogni mondo e a ogni ricalcolo', () => {
    const a = mondo(20, 20, 1);
    const b = mondo(40, 40, 77);
    for (const x of primaGenerazione(a)) {
      expect(b.registra(x.b, x.a)).toBe(x.id);
      expect(b.rarita(x.id)).toBe(a.rarita(x.id));
      expect(rarita(a.sostanzaDi(x.id)!)).toBe(a.rarita(x.id));
    }
  });

  it('tra le miscele di due materiali la maggior parte è comune, una su cinque rara, poche leggendarie', () => {
    const m = mondo(20, 20);
    const conto: Record<Rarita, number> = { comune: 0, rara: 0, leggendaria: 0 };
    const prima = primaGenerazione(m);
    for (const x of prima) conto[m.rarita(x.id)!]++;
    expect(conto.comune / prima.length).toBeGreaterThan(0.6);
    expect(conto.rara / prima.length).toBeGreaterThan(0.1);
    expect(conto.rara / prima.length).toBeLessThan(0.35);
    expect(conto.leggendaria).toBeGreaterThan(2);
    expect(conto.leggendaria / prima.length).toBeLessThan(0.06);
  });

  it('una leggendaria ha più caratteri di una comune: la rarità si legge dal carattere', () => {
    const m = mondo(20, 20);
    for (const x of primaGenerazione(m)) {
      const r = m.rarita(x.id);
      const n = tratti(x.s).length;
      if (r === 'leggendaria') expect(n).toBeGreaterThanOrEqual(3);
      if (r === 'comune') expect(n).toBeLessThanOrEqual(2);
    }
    expect(m.rarita(M.TERRA)).toBeNull();
  });
});

/** Tutti i tratti a zero: la base su cui si scrive il carattere di una miscela d'autore. */
const ZERO = Object.fromEntries(TRATTI.map((k) => [k, 0])) as Record<(typeof TRATTI)[number], number>;

describe('le miscele d’autore', () => {
  it('sono una cinquantina, ogni coppia una volta sola, e nascono davvero (nessuna ha già un altro esito)', () => {
    expect(FIRMATE.length).toBeGreaterThanOrEqual(45);
    const coppie = new Set<string>();
    const nomi = new Set<string>();
    const m = mondo(20, 20);
    for (const [a, b, f] of FIRMATE) {
      const chiave = `${Math.min(a, b)}:${Math.max(a, b)}`;
      expect(coppie.has(chiave), f.nome).toBe(false);
      coppie.add(chiave);
      expect(nomi.has(f.nome), f.nome).toBe(false);
      nomi.add(f.nome);
      expect(a < N_BASE && b < N_BASE, f.nome).toBe(true);
      const id = m.registra(b, a);
      expect(id, f.nome).toBeGreaterThan(0);
      expect(m.ricettario.get(id)!.nome).toBe(f.nome);
      expect(m.firmata(id)).toBe(f);
      expect(firmataDi(a, b)).toBe(f);
    }
  });

  it('hanno esattamente il carattere scritto a mano, e il loro racconto', () => {
    const m = mondo(20, 20);
    for (const [a, b, f] of FIRMATE) {
      const s = m.sostanzaDi(m.registra(a, b))!;
      expect(s.stato, f.nome).toBe(f.carattere.stato);
      // Ogni carattere scritto sopra la soglia c'è; nessun altro si mostra (chi scotta forte fa anche luce).
      const scritta: Sostanza = { ...s, ...ZERO, ...f.carattere, colore: s.colore };
      const attesi = new Set(CARATTERI.filter((c) => margine(scritta, c) > 0 && funziona(c, s.stato)));
      if ((f.carattere.calore ?? 0) > 0.6) attesi.add('luce');
      expect(new Set(tratti(s)), f.nome).toEqual(attesi);
      expect(tratti(s).length, f.nome).toBeGreaterThan(0);
      expect(descriviMiscela(s, f)).toBe(f.racconto);
      expect(f.racconto.endsWith('.'), f.nome).toBe(true);
      expect(/agente|prompt|token|API|bug|sprite|render|mestolo/i.test(f.racconto + f.nome), f.nome).toBe(false);
      if (f.carattere.colore) expect(s.colore).toEqual(f.carattere.colore);
    }
  });

  it('le miscele generate dei loro figli restano miscele come le altre (la stellina è solo per le coppie scritte)', () => {
    const m = mondo(20, 20);
    const terraNera = m.registra(M.TERRA, M.CARBONE);
    const figlia = m.registra(terraNera, M.SABBIA);
    expect(m.firmata(terraNera)?.nome).toBe('Terra nera');
    expect(m.firmata(figlia)).toBeUndefined();
    expect(m.ricettario.get(figlia)!.nome).not.toBe('Terra nera');
    expect(SOGLIA.fertile).toBeLessThan(m.sostanzaDi(terraNera)!.fertile);
  });
});
