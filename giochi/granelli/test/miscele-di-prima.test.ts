import { describe, expect, it } from 'vitest';
import { M, PRIMA_ID_MISCELA, PRIMA_MISCELA, type Sostanza } from '../src/motore/materiali.js';
import { idMiscela } from '../src/motore/miscele.js';
import { fotografa, ricopiaRicette, ripristina } from '../src/salvataggio.js';
import { gira, mondo, quanti, riempi } from './aiuti.js';

/**
 * Sette miscele com'erano prima dei nomi parlanti (cinque di due materiali e due di seconda generazione), copiate
 * dal gioco di allora: numero, ingredienti, nome e carattere, arrotondato al milionesimo.
 */
const DI_PRIMA: { id: number; a: number; b: number; nome: string; s: Partial<Sostanza> }[] = [
  { id: 4017530638, a: 1, b: 7, nome: 'Rena mordente', s: { stato: 1, colore: [198, 195, 64], peso: 0.6, scorre: 0.958556, calore: 0, brucia: 0, luce: 0, fertile: 0.038981, vivo: 0, veleno: 0, nutre: 0.556996, esplode: 0, corrode: 0.829419 } },
  { id: 1921066883, a: 2, b: 17, nome: 'Nettare algido', s: { stato: 2, colore: [109, 221, 241], peso: 0.315024, scorre: 0.869869, calore: -0.610515, brucia: 0.376848, luce: 0, fertile: 0.389698, vivo: 0, veleno: 0, nutre: 0.453735, esplode: 0, corrode: 0 } },
  { id: 2485284202, a: 3, b: 26, nome: 'Marmo stellato', s: { stato: 4, colore: [237, 214, 171], peso: 0.736006, scorre: 0, calore: 0.68061, brucia: 0, luce: 0.96581, fertile: 0, vivo: 0, veleno: 0, nutre: 0, esplode: 0, corrode: 0 } },
  { id: 2779418995, a: 4, b: 31, nome: 'Cristallo stoppaccioso', s: { stato: 4, colore: [158, 194, 250], peso: 0.381378, scorre: 0, calore: 0, brucia: 0.845982, luce: 0.351751, fertile: 0, vivo: 0, veleno: 0, nutre: 0, esplode: 0, corrode: 0 } },
  { id: 753521418, a: 19, b: 32, nome: 'Pulviscolo algido', s: { stato: 1, colore: [160, 213, 186], peso: 0.328353, scorre: 0.5, calore: -0.552608, brucia: 0.034376, luce: 0, fertile: 0.377766, vivo: 0.067715, veleno: 0, nutre: 0, esplode: 0, corrode: 0 } },
  { id: 3511481149, a: 1921066883, b: 4017530638, nome: 'Siero vorace', s: { stato: 2, colore: [184, 231, 135], peso: 0.407209, scorre: 0.920298, calore: -0.392592, brucia: 0.016376, luce: 0, fertile: 0.303318, vivo: 0, veleno: 0.613777, nutre: 0.526347, esplode: 0, corrode: 0.64982 } },
  { id: 2798121279, a: 35, b: 2485284202, nome: 'Cristallo radioso', s: { stato: 4, colore: [247, 209, 130], peso: 0.534332, scorre: 0, calore: 0.461579, brucia: 0.267194, luce: 0.962464, fertile: 0.278473, vivo: 0, veleno: 0.604588, nutre: 0.403621, esplode: 0, corrode: 0 } },
];

/** Una partita salvata allora: le ricette con quattro voci, senza il segno delle regole nuove. */
function salvataggioDiPrima() {
  const m = mondo();
  const foto = JSON.parse(JSON.stringify(fotografa(m)));
  foto.ricette = DI_PRIMA.map((r) => [r.id, r.a, r.b, r.nome]);
  foto.visti = [...foto.visti, ...DI_PRIMA.map((r) => r.id)];
  return foto;
}

const arrotonda = (s: Sostanza): Record<string, unknown> => {
  const fuori: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) fuori[k] = typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v;
  return fuori;
};

describe('le miscele delle partite di prima', () => {
  it('si riaprono con lo stesso nome e lo stesso identico carattere di allora', () => {
    const m = ripristina(salvataggioDiPrima())!;
    for (const r of DI_PRIMA) {
      const ricetta = m.ricettario.get(r.id)!;
      expect(ricetta.nome).toBe(r.nome);
      expect(ricetta.prima).toBe(true);
      expect(m.visti.has(r.id)).toBe(true);
      expect(arrotonda(m.sostanzaDi(r.id)!)).toMatchObject(r.s);
      // I caratteri nuovi allora non c'erano.
      const s = m.sostanzaDi(r.id)!;
      expect([s.vola, s.appiccica, s.fiorisce, s.tinge, s.indurisce, s.piove]).toEqual([0, 0, 0, 0, 0, 0]);
    }
  });

  it('si versano e si comportano come allora, e restano «di prima» anche dopo un altro salvataggio', () => {
    const m = ripristina(salvataggioDiPrima())!;
    const vecchia = DI_PRIMA[2].id;
    const t = m.tipoPer(vecchia);
    expect(t).toBeGreaterThanOrEqual(PRIMA_MISCELA);
    riempi(m, 0, 55, 59, 59, M.ROCCIA);
    riempi(m, 20, 50, 29, 54, t);
    gira(m, 200);
    expect(quanti(m, t)).toBe(50);
    // Una miscela nuova nata dopo segue le regole nuove, e il salvataggio lo ricorda con il 2 in fondo.
    const nuova = m.registra(vecchia, M.SABBIA);
    expect(nuova).toBe(idMiscela(vecchia, M.SABBIA));
    expect(m.ricettario.get(nuova)!.prima).toBeUndefined();
    const foto = JSON.parse(JSON.stringify(fotografa(m)));
    const scritte = new Map<number, unknown[]>(foto.ricette.map((r: unknown[]) => [r[0] as number, r]));
    expect(scritte.get(vecchia)).toHaveLength(4);
    expect(scritte.get(nuova)).toEqual([nuova, Math.min(vecchia, M.SABBIA), Math.max(vecchia, M.SABBIA), m.ricettario.get(nuova)!.nome, 2]);
    const di_nuovo = ripristina(foto)!;
    expect(di_nuovo.ricettario.get(vecchia)!.prima).toBe(true);
    expect(di_nuovo.ricettario.get(nuova)!.prima).toBeUndefined();
    expect(di_nuovo.sostanzaDi(nuova)).toEqual(m.sostanzaDi(nuova));
    expect(arrotonda(di_nuovo.sostanzaDi(vecchia)!)).toMatchObject(DI_PRIMA[2].s);
  });

  it('una ricetta con un segno sconosciuto in fondo si scarta, senza toccare le altre', () => {
    const m = mondo();
    const buona = idMiscela(M.TERRA, M.SABBIA);
    const fuori = ricopiaRicette(m, [[buona, M.TERRA, M.SABBIA, 'Rena mordente'], [idMiscela(M.ACQUA, M.SABBIA), M.ACQUA, M.SABBIA, 'Strana', 7]]);
    expect(fuori).toBe(1);
    expect(m.ricettario.get(buona)?.prima).toBe(true);
    expect(PRIMA_ID_MISCELA).toBeLessThan(buona);
  });
});
