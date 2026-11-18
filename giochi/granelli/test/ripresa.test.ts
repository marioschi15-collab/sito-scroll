import { describe, expect, it } from 'vitest';
import { idDi } from '../src/contenuti/registro.js';
import { C, E } from '../src/motore/cose.js';
import { M, PRIMA_ID_MISCELA } from '../src/motore/materiali.js';
import { Mondo } from '../src/motore/mondo.js';
import { INIZIALI } from '../src/scoperte.js';
import { type Salvato, fotografa, impacchetta, riprendi, ripristina } from '../src/salvataggio.js';
import { gira, libroDa12, mondo, riempi } from './aiuti.js';

/**
 * Una partita con un po' di tutto: un Libro con miscele, coppie provate, cose posate, due omini, una pecora.
 * Restituisce la fotografia già passata per il testo (come la si rilegge dal browser).
 */
function partitaPiena(): { m: Mondo; foto: Salvato } {
  const m = libroDa12(mondo(100, 60));
  riempi(m, 0, 50, 99, 59, M.ROCCIA);
  riempi(m, 10, 48, 20, 49, M.ACQUA);
  for (const id of [C.CAPANNA, C.FALO]) m.visti.add(id);
  m.posa(C.FALO, 40, 30);
  m.posa(C.CAPANNA, 60, 30);
  m.aggiungiOmino(30, 49);
  m.aggiungiOmino(35, 49);
  const pecora = idDi('pecora');
  m.visti.add(pecora);
  m.porta(pecora, 80, 45, 'gettone');
  // Due miscele, la seconda figlia della prima.
  const prima = m.registra(M.SABBIA, M.TERRA);
  const seconda = m.registra(prima, M.FUOCO);
  m.visti.add(prima);
  m.visti.add(seconda);
  m.ricordaProvata(M.TERRA, M.ACQUA);
  m.ricordaProvata(C.CAPANNA, M.FUOCO);
  gira(m, 50);
  expect(m.cose.length).toBe(2);
  expect(m.creature.length).toBe(1);
  expect(m.ricettario.size).toBe(2);
  return { m, foto: JSON.parse(impacchetta(m, { recenti: [M.TERRA] })) as Salvato };
}

/** Un mondo nuovo come quello del gioco, più piccolo: serve quando la griglia salvata non si legge. */
const nuovo = (): Mondo => {
  const m = new Mondo(80, 50, 3);
  for (const id of INIZIALI) m.visti.add(id);
  return m;
};

const ordinati = (s: Iterable<number>): number[] => [...s].sort((a, b) => a - b);

describe('una partita salvata si riapre anche con qualche dato sporco', () => {
  it('una partita pulita torna intatta', () => {
    const { m, foto } = partitaPiena();
    const r = riprendi(foto, nuovo)!;
    expect(r.intatta).toBe(true);
    expect(ordinati(r.mondo.visti)).toEqual(ordinati(m.visti));
    expect(r.mondo.cose).toEqual(m.cose);
    expect(r.mondo.omini).toEqual(m.omini);
    expect(r.mondo.creature.length).toBe(1);
    expect([...r.mondo.provate].sort()).toEqual([...m.provate].sort());
  });

  it('un salvataggio del primo formato, scritto a mano, si riapre', () => {
    // Com'era scritta una partita della prima versione: un mondo 4x3, quattro elementi più il fango, un omino senza
    // i campi arrivati dopo (niente casa, niente apnea, niente stato), nessuna miscela, nessuna cosa posata.
    const testo = `{"v":1,"w":4,"h":3,"visti":[1,2,3,4,6],"tipo":"AAAAAAABBgEYGBgY","dato":"AAAAAAAAAAAAAAAA","tinta":"AAAAAAAAAAAAAAAA","omini":[{"x":1,"y":1,"dir":1,"sete":10,"fame":20,"eta":300,"attesa":0,"aspetto":17}],"tic":1234}`;
    const r = riprendi(JSON.parse(testo), nuovo)!;
    expect(r).not.toBeNull();
    const m = r.mondo;
    expect([m.w, m.h]).toEqual([4, 3]);
    expect([...m.tipo]).toEqual([0, 0, 0, 0, 0, 1, 6, 1, 24, 24, 24, 24]);
    expect(ordinati(m.visti)).toEqual([1, 2, 3, 4, 6]);
    expect(m.tic).toBe(1234);
    expect(m.omini).toHaveLength(1);
    const o = m.omini[0];
    expect([o.x, o.y, o.sete, o.fame, o.eta, o.aspetto]).toEqual([1, 1, 10, 20, 300, 17]);
    // I campi che quella versione non aveva arrivano con i valori di un omino appena nato: la sete non è NaN.
    expect([o.apnea, o.sepolto, o.stato]).toEqual([0, 0, 0]);
    gira(m, 50);
    expect(Number.isFinite(m.omini[0]?.sete ?? 0)).toBe(true);
  });

  it('se la griglia non si legge (misure diverse, testo rovinato) il Libro resta, in un mondo nuovo', () => {
    const { m, foto } = partitaPiena();
    for (const sporca of [
      { ...foto, w: foto.w + 1 },
      { ...foto, h: 0 },
      { ...foto, tipo: 'questo non è un mondo' },
      { ...foto, dato: null },
      { ...foto, tinta: foto.tinta.slice(8) },
    ]) {
      const r = riprendi(sporca, nuovo)!;
      expect(r).not.toBeNull();
      expect(r.intatta).toBe(false);
      expect([r.mondo.w, r.mondo.h]).toEqual([80, 50]);
      expect(ordinati(r.mondo.visti)).toEqual(ordinati(m.visti));
      expect([...r.mondo.ricettario]).toEqual([...m.ricettario]);
      expect(r.mondo.giaProvata(M.ACQUA, M.TERRA)).toBe(true);
      // Le cose e gli omini stavano in quel mondo: in uno nuovo non hanno posto.
      expect([r.mondo.cose.length, r.mondo.omini.length, r.mondo.creature.length]).toEqual([0, 0, 0]);
    }
    // Senza un mondo nuovo da offrire, una griglia illeggibile resta illeggibile.
    expect(ripristina({ ...foto, w: foto.w + 1 })).toBeNull();
  });

  it('un null dentro cose, omini, creature, ricette, coppie e posti si scarta da solo, senza perdere il Libro', () => {
    const { m, foto } = partitaPiena();
    const campi = ['cose', 'omini', 'creature', 'ricette', 'provate', 'posti'] as const;
    for (const campo of campi) {
      const sporca = JSON.parse(JSON.stringify(foto)) as Record<string, unknown[]>;
      expect(Array.isArray(sporca[campo]), campo).toBe(true);
      sporca[campo] = [null, ...sporca[campo], 7, 'x', [1], { x: 'a' }];
      const r = riprendi(sporca, nuovo)!;
      expect(r, campo).not.toBeNull();
      expect(r.intatta, campo).toBe(false);
      // Il mondo è quello di prima, con tutto il resto.
      expect([...r.mondo.tipo], campo).toEqual([...m.tipo]);
      expect(ordinati(r.mondo.visti), campo).toEqual(ordinati(m.visti));
      expect(r.mondo.ricettario.size, campo).toBe(2);
      expect(r.mondo.cose, campo).toEqual(m.cose);
      expect(r.mondo.omini.length, campo).toBe(2);
      expect(r.mondo.creature.length, campo).toBe(1);
      expect(r.mondo.giaProvata(M.TERRA, M.ACQUA), campo).toBe(true);
      gira(r.mondo, 30);
    }
    // Anche quando un campo intero non è nemmeno una lista.
    const tutta = { ...foto, cose: 5, omini: 'tanti', creature: {}, ricette: null, provate: 'sì', posti: 0 } as unknown;
    const r = riprendi(tutta, nuovo)!;
    expect(ordinati(r.mondo.visti).filter((id) => id < PRIMA_ID_MISCELA)).toEqual(ordinati(m.visti).filter((id) => id < PRIMA_ID_MISCELA));
    expect([r.mondo.cose.length, r.mondo.omini.length, r.mondo.creature.length]).toEqual([0, 0, 0]);
  });

  it('le scoperte sporche si scartano una a una, e i quattro elementi ci sono sempre', () => {
    const { m, foto } = partitaPiena();
    const r = riprendi({ ...foto, visti: ['a', {}, -3, 99999, 1e9, 2.5, null, C.FALO, E.PIETRA] }, nuovo)!;
    expect(r.intatta).toBe(false);
    expect(ordinati(r.mondo.visti)).toEqual(ordinati([...INIZIALI, C.FALO, E.PIETRA]));
    // Una miscela resta tra le scoperte solo se si conosce la sua ricetta.
    const miscele = [...m.ricettario.keys()];
    const s = riprendi({ ...foto, visti: [...miscele, 1e9 + 7] }, nuovo)!;
    expect(ordinati(s.mondo.visti)).toEqual(ordinati([...INIZIALI, ...miscele]));
    expect(ordinati(riprendi({ ...foto, visti: [] }, nuovo)!.mondo.visti)).toEqual(ordinati(INIZIALI));
  });

  it('gli omini sporchi tornano omini veri; quelli senza posizione si scartano', () => {
    const { foto } = partitaPiena();
    const [primo, secondo] = foto.omini as unknown as Record<string, unknown>[];
    Object.assign(primo, { sete: Number.NaN, fame: 'molta', eta: -5, apnea: null, aspetto: 900, stato: 7, dir: 0, dentro: 'casa' });
    delete secondo.x;
    const r = riprendi(foto, nuovo)!;
    expect(r.intatta).toBe(false);
    expect(r.mondo.omini).toHaveLength(1);
    const o = r.mondo.omini[0];
    expect([o.sete, o.fame, o.eta, o.apnea, o.stato, o.dir, o.dentro]).toEqual([0, 0, 0, 0, 0, 1, undefined]);
    expect(o.aspetto).toBeGreaterThanOrEqual(0);
    expect(o.aspetto).toBeLessThan(256);
  });

  it('le ricette scritte in disordine entrano lo stesso; quelle che si chiamano in giro no', () => {
    const { m, foto } = partitaPiena();
    const ricette = foto.ricette!;
    const [prima, seconda] = ricette;
    // La figlia scritta prima della madre: entra al secondo giro.
    const r = riprendi({ ...foto, ricette: [seconda, prima] }, nuovo)!;
    expect(r.mondo.ricettario.size).toBe(2);
    expect(r.mondo.sostanzaDi(seconda[0])).not.toBeNull();
    expect(r.intatta).toBe(true);
    // Due ricette che hanno per ingrediente l'una l'altra: nessuna delle due entra, e il mondo non si inceppa.
    const giro: [number, number, number, string][] = [
      [PRIMA_ID_MISCELA + 11, PRIMA_ID_MISCELA + 12, M.TERRA, 'Una'],
      [PRIMA_ID_MISCELA + 12, PRIMA_ID_MISCELA + 11, M.ACQUA, 'Altra'],
    ];
    const g = riprendi({ ...foto, ricette: [...ricette, ...giro], visti: [...foto.visti, PRIMA_ID_MISCELA + 11] }, nuovo)!;
    expect(g.intatta).toBe(false);
    expect(g.mondo.ricettario.size).toBe(2);
    expect(g.mondo.visti.has(PRIMA_ID_MISCELA + 11)).toBe(false);
    expect(ordinati(g.mondo.visti)).toEqual(ordinati(m.visti));
  });

  it('quello che non è una partita di Granelli resta null', () => {
    for (const dati of [null, undefined, 3, 'testo', [], {}, { v: 3 }, { visti: [1, 2] }]) expect(riprendi(dati, nuovo)).toBeNull();
    // Senza griglia e con un Libro di soli quattro elementi non c'è niente da riprendere.
    expect(riprendi({ v: 2, w: 1, h: 1, tipo: '', dato: '', tinta: '', visti: [1, 2, 3, 4] }, nuovo)).toBeNull();
    // La fotografia di adesso, invece, si riprende sempre intatta.
    expect(riprendi(fotografa(mondo()), nuovo)?.intatta).toBe(true);
  });
});
