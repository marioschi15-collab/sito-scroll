import { describe, expect, it } from 'vitest';
import { C } from '../src/motore/cose.js';
import { libera } from '../src/motore/cammino.js';
import { M, PRIMA_ID_MISCELA, PRIMA_MISCELA, TRONCO } from '../src/motore/materiali.js';
import { idMiscela } from '../src/motore/miscele.js';
import { type Salvato, extraDi, fotografa, impacchetta, ripristina, spacchetta } from '../src/salvataggio.js';
import { gira, mondo, quanti, riempi } from './aiuti.js';

describe('il salvataggio', () => {
  it('il salvataggio riporta lo stesso mondo', () => {
    const m = mondo();
    riempi(m, 10, 50, 50, 59, M.TERRA);
    riempi(m, 20, 30, 40, 35, M.ACQUA);
    m.aggiungiOmino(30, 20);
    gira(m, 100);
    const copia = spacchetta(impacchetta(m));
    expect(copia).not.toBeNull();
    expect([...copia!.tipo]).toEqual([...m.tipo]);
    expect([...copia!.dato]).toEqual([...m.dato]);
    expect([...copia!.visti].sort()).toEqual([...m.visti].sort());
    expect(copia!.omini).toEqual(m.omini);
    expect(ripristina(fotografa(m))?.omini).toEqual(m.omini);
    expect(ripristina({})).toBeNull();
    expect(ripristina(null)).toBeNull();
    expect(spacchetta('non è un salvataggio')).toBeNull();
    expect(spacchetta('{"v":1,"w":5,"h":5,"tipo":"AA==","dato":"","tinta":"","visti":[],"omini":[]}')).toBeNull();
  });

  it('il salvataggio ricorda le miscele, i loro posti e quello che la pagina gli affida', () => {
    const m = mondo();
    riempi(m, 20, 50, 40, 59, M.SABBIA);
    riempi(m, 20, 45, 40, 49, M.LEGNO);
    for (let k = 0; k < 20; k++) m.mescola(30, 49, 6, new Set());
    const foto = JSON.parse(JSON.stringify(fotografa(m, { recenti: [1, 2] })));
    const copia = ripristina(foto)!;
    expect([...copia.tipo]).toEqual([...m.tipo]);
    expect([...copia.ricettario]).toEqual([...m.ricettario]);
    expect(copia.idTipo).toEqual(m.idTipo);
    expect([...copia.visti]).toEqual([...m.visti]);
    expect(extraDi(foto)).toEqual({ recenti: [1, 2] });
    gira(copia, 300);
  });

  it('ricorda anche il tempo che fa, l’attesa degli omini, le cose posate e chi dorme in casa', () => {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.ROCCIA);
    for (const id of [C.CAPANNA, C.POZZO, C.CAMPO]) m.visti.add(id);
    m.posa(C.CAPANNA, 50, 49);
    m.posa(C.POZZO, 35, 49);
    m.posa(C.CAMPO, 65, 49);
    m.aggiungiOmino(47, 49);
    m.aggiungiOmino(53, 49);
    m.tic = 9200;
    gira(m, 900);
    expect(m.omini.filter((o) => o.dentro).length).toBe(2);
    m.vento = -1;
    m.pioggia = 12.5;
    m.arcobaleno = 0.4;
    m.prossimoArrivo = 11100;
    const copia = spacchetta(impacchetta(m))!;
    expect(copia.vento).toBe(-1);
    expect(copia.pioggia).toBe(12.5);
    expect(copia.arcobaleno).toBe(0.4);
    expect(copia.prossimoArrivo).toBe(11100);
    expect(copia.tic).toBe(m.tic);
    expect(copia.cose).toEqual(m.cose);
    expect(copia.omini).toEqual(m.omini);
    expect(copia.omini.filter((o) => o.dentro).length).toBe(2);
    gira(copia, 300);
  });

  it('un salvataggio di prima, senza i campi nuovi, si riapre come sempre', () => {
    const m = mondo();
    riempi(m, 10, 50, 50, 59, M.TERRA);
    riempi(m, 20, 30, 40, 35, M.ACQUA);
    gira(m, 100);
    const vecchio = JSON.parse(impacchetta(m)) as Partial<Salvato>;
    for (const campo of ['vento', 'pioggia', 'arcobaleno', 'prossimoArrivo'] as const) delete vecchio[campo];
    const copia = ripristina(vecchio)!;
    expect([...copia.tipo]).toEqual([...m.tipo]);
    expect([...copia.visti]).toEqual([...m.visti]);
    expect([copia.vento, copia.pioggia, copia.arcobaleno, copia.prossimoArrivo]).toEqual([1, 0, 0, 0]);
    // Ancora più vecchio: la prima versione non aveva nemmeno miscele, cose posate e ricordi della pagina.
    const primo = { ...vecchio, v: 1 as const };
    for (const campo of ['ricette', 'posti', 'cose', 'extra'] as const) delete primo[campo];
    const antico = ripristina(primo)!;
    expect([...antico.tipo]).toEqual([...m.tipo]);
    expect(antico.cose).toEqual([]);
    expect(antico.ricettario.size).toBe(0);
    gira(antico, 100);
  });

  it('se nei campi nuovi c’è scritto qualcosa di strano, la partita si riapre lo stesso', () => {
    const m = mondo();
    riempi(m, 10, 50, 50, 59, M.TERRA);
    const sporco = JSON.parse(impacchetta(m)) as Record<string, unknown>;
    Object.assign(sporco, { vento: 5, pioggia: -3, arcobaleno: 'tanto', prossimoArrivo: null });
    const copia = ripristina(sporco)!;
    expect([...copia.tipo]).toEqual([...m.tipo]);
    expect([copia.vento, copia.pioggia, copia.arcobaleno, copia.prossimoArrivo]).toEqual([1, 0, 0, 0]);
    Object.assign(sporco, { vento: '1', pioggia: Number.NaN, arcobaleno: 7, prossimoArrivo: 120.7 });
    const altra = ripristina(sporco)!;
    expect([altra.vento, altra.pioggia, altra.arcobaleno, altra.prossimoArrivo]).toEqual([1, 0, 1, 120]);
  });

  it('una miscela di una partita di prima, nata da una coppia che oggi ha il suo esito, resta nel Libro e si versa ancora', () => {
    const m = mondo();
    // Prima di questa versione, in Unisci terra e acqua davano una miscela: chi l'ha già nel Libro non deve perderla.
    const vecchia = idMiscela(M.TERRA, M.ACQUA);
    m.ricettario.set(vecchia, { a: M.TERRA, b: M.ACQUA, nome: 'Graniglia tossica' });
    m.visti.add(vecchia);
    const t = m.tipoPer(vecchia);
    expect(t).toBeGreaterThanOrEqual(PRIMA_MISCELA);
    riempi(m, 0, 55, 59, 59, M.ROCCIA);
    riempi(m, 20, 50, 30, 54, t);
    const copia = spacchetta(impacchetta(m))!;
    expect(copia.ricettario.get(vecchia)?.nome).toBe('Graniglia tossica');
    expect(copia.visti.has(vecchia)).toBe(true);
    expect(copia.sostanzaDi(vecchia)).not.toBeNull();
    expect(copia.tipoPer(vecchia)).toBe(t);
    expect(quanti(copia, t)).toBe(55);
    copia.versa(40, 40, 3, t);
    expect(quanti(copia, t)).toBeGreaterThan(55);
    gira(copia, 200);
    // Ma da oggi la stessa coppia dà il fango, e la vecchia miscela si può ancora fondere con altro.
    expect(copia.unisci(M.TERRA, M.ACQUA)).toBe(M.FANGO);
    expect(copia.registra(M.TERRA, M.ACQUA)).toBe(-1);
    expect(copia.registra(vecchia, M.FUOCO)).toBeGreaterThanOrEqual(PRIMA_ID_MISCELA);
  });

  it('ricorda i tronchi degli alberi, la casa e le abitudini di ogni omino, e il numero di ogni cosa posata', () => {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.ROCCIA);
    riempi(m, 5, 50, 15, 51, M.ACQUA);
    riempi(m, 60, 48, 90, 49, M.PIANTA);
    for (let y = 40; y <= 49; y++) m.metti(y * m.w + 30, M.LEGNO, TRONCO);
    riempi(m, 95, 46, 96, 49, M.LEGNO);
    for (const id of [C.CAPANNA, C.FALO]) m.visti.add(id);
    m.posa(C.FALO, 50, 30);
    m.posa(C.CAPANNA, 75, 30);
    m.cancella(50, 48, 1);
    m.posa(C.FALO, 52, 30);
    m.aggiungiOmino(45, 49);
    gira(m, 6000);
    const o = m.omini[0];
    expect([typeof o.casa, typeof o.bevuta, typeof o.pasto]).toEqual(['number', 'number', 'number']);
    expect(m.cose.map((c) => c.n)).toEqual([2, 3]);
    const copia = spacchetta(impacchetta(m))!;
    expect(copia.omini).toEqual(m.omini);
    expect(copia.cose).toEqual(m.cose);
    expect([...copia.dato]).toEqual([...m.dato]);
    expect(libera(copia, 30, 45)).toBe(true);
    expect(libera(copia, 95, 48)).toBe(false);
  });

  it('in una partita di prima i tronchi degli alberi smettono di essere muri, e chi dormiva in casa ci dorme ancora', () => {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.ROCCIA);
    for (const id of [C.CAPANNA, C.POZZO, C.CAMPO]) m.visti.add(id);
    m.posa(C.POZZO, 35, 49);
    m.posa(C.CAPANNA, 50, 49);
    m.posa(C.CAMPO, 65, 49);
    m.aggiungiOmino(47, 49);
    m.aggiungiOmino(53, 49);
    m.tic = 9200;
    gira(m, 900);
    expect(m.omini.filter((o) => o.dentro).length).toBe(2);
    // Com'era scritta una partita prima di questo lavoro: ogni legno aveva il dato a zero, le cose non avevano
    // numero, e chi dormiva ricordava la colonna della casa più uno. Gli omini non avevano ricordi.
    riempi(m, 20, 40, 20, 49, M.LEGNO);
    riempi(m, 80, 44, 84, 49, M.LEGNO);
    const vecchio = JSON.parse(impacchetta(m)) as Salvato;
    delete vecchio.tronchi;
    for (const c of vecchio.cose ?? []) delete c.n;
    const capanna = vecchio.cose?.find((c) => c.id === C.CAPANNA);
    for (const o of vecchio.omini) {
      o.dentro = (capanna?.x ?? 0) + 1;
      for (const campo of ['casa', 'bevuta', 'pasto', 'chiusa'] as const) delete o[campo];
    }
    const copia = ripristina(vecchio)!;
    // L'albero (un tronco largo una cella) ora lascia passare; la catasta larga cinque resta un muro.
    expect(libera(copia, 20, 45)).toBe(true);
    expect(libera(copia, 82, 47)).toBe(false);
    expect(copia.cose.map((c) => c.n)).toEqual([1, 2, 3]);
    expect(copia.omini.map((o) => o.dentro)).toEqual([2, 2]);
    gira(copia, 80);
    expect(copia.omini.filter((o) => o.dentro).length).toBe(2);
    // Al mattino escono, e da allora hanno una casa e delle abitudini come tutti.
    copia.tic = 14400 + 600;
    gira(copia, 3000);
    expect(copia.omini.length).toBe(2);
    for (const o of copia.omini) expect(typeof o.casa).toBe('number');
    // Una partita salvata adesso non viene ritoccata: un legno sottile messo da chi gioca resta un muro.
    const nuovo = mondo(60, 60);
    riempi(nuovo, 30, 40, 30, 49, M.LEGNO);
    expect(libera(spacchetta(impacchetta(nuovo))!, 30, 45)).toBe(false);
  });

  it('ricordi strani negli omini e numeri doppi nelle cose non impediscono di riaprire la partita', () => {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.ROCCIA);
    for (const id of [C.CAPANNA, C.FALO]) m.visti.add(id);
    m.posa(C.FALO, 20, 30);
    m.posa(C.CAPANNA, 60, 30);
    m.aggiungiOmino(40, 49);
    const sporco = JSON.parse(impacchetta(m)) as Salvato;
    Object.assign(sporco.omini[0], { casa: 'là', bevuta: -4, pasto: 5000, chiusa: null });
    for (const c of sporco.cose ?? []) c.n = 7;
    const copia = ripristina(sporco)!;
    const o = copia.omini[0];
    expect([o.casa, o.bevuta, o.pasto, o.chiusa]).toEqual([undefined, undefined, undefined, undefined]);
    expect(copia.cose.map((c) => c.n)).toEqual([1, 2]);
    gira(copia, 200);
    expect(copia.omini[0].casa).toBe(40);
  });
});
