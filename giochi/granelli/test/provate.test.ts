import { describe, expect, it, vi } from 'vitest';
import { C } from '../src/motore/cose.js';
import { esitoDi } from '../src/motore/esiti.js';
import { M } from '../src/motore/materiali.js';
import { idMiscela } from '../src/motore/miscele.js';
import { fotografa, ripristina } from '../src/salvataggio.js';
import { libroDa12, mondo, riempi } from './aiuti.js';

/**
 * Una versione futura del gioco che scrive un'unione nuova (utensile e pozzo: il vaso, per finta): accesa a metà
 * prova, simula chi aggiorna il gioco dopo aver già provato quella coppia.
 */
const futuro = vi.hoisted(() => ({ acceso: false }));
vi.mock('../src/motore/cose.js', async (originale) => {
  const vero = await originale<typeof import('../src/motore/cose.js')>();
  return {
    ...vero,
    unione: (a: number, b: number): number => {
      const coppia = [a, b].sort((x, y) => x - y).join(':');
      if (futuro.acceso && coppia === `${vero.C.UTENSILE}:${vero.C.POZZO}`) return vero.C.VASO;
      return vero.unione(a, b);
    },
  };
});

describe('le coppie provate', () => {
  it('si salvano e tornano con la partita; le voci sporche si scartano, le partite di prima si aprono', () => {
    const m = libroDa12();
    m.visti.add(C.UTENSILE).add(C.POZZO);
    m.unisci(M.TERRA, M.ACQUA);
    m.unisci(C.UTENSILE, C.POZZO);
    m.visti.add(M.SABBIA).add(M.LEGNO);
    const miscela = m.unisci(M.SABBIA, M.LEGNO);
    m.unisci(miscela, M.ACQUA);
    const foto = JSON.parse(JSON.stringify(fotografa(m)));
    expect(foto.provate).toHaveLength(4);
    const copia = ripristina(foto)!;
    expect([...copia.provate].sort()).toEqual([...m.provate].sort());
    expect(copia.giaProvata(M.ACQUA, M.TERRA)).toBe(true);
    expect(copia.giaProvata(M.ACQUA, idMiscela(M.SABBIA, M.LEGNO))).toBe(true);
    expect(copia.giaProvata(M.FUOCO, M.TERRA)).toBe(false);

    foto.provate = [[1, 2], 'a', [3], [4, null], [5, 6, 7], [Number.NaN, 1], null, [M.FUOCO, M.ARIA]];
    expect([...ripristina(foto)!.provate].sort()).toEqual(['1:2', '3:4']);
    foto.provate = 'tutte';
    expect(ripristina(foto)!.provate.size).toBe(0);
    delete foto.provate;
    expect(ripristina(foto)!.provate.size).toBe(0);
  });

  it('si ricorda che una coppia è stata provata, non come è andata: se poi riceve un’unione, si vede quella nuova', () => {
    const m = mondo(80, 60);
    riempi(m, 0, 50, 79, 59, M.ROCCIA);
    m.visti.add(C.UTENSILE).add(C.POZZO);
    expect(m.posa(C.POZZO, 40, 40)).toBe(true);
    expect(m.porta(C.UTENSILE, 40, 46, 'gettone')).toEqual({ genere: 'niente', con: C.POZZO });
    expect(m.giaProvata(C.UTENSILE, C.POZZO)).toBe(true);
    const salvata = JSON.stringify(fotografa(m));
    expect(salvata).not.toContain('niente');

    futuro.acceso = true;
    try {
      const dopo = ripristina(JSON.parse(salvata))!;
      expect(dopo.giaProvata(C.POZZO, C.UTENSILE)).toBe(true);
      expect(esitoDi(C.UTENSILE, C.POZZO, dopo.voci())).toEqual({ genere: 'unione', id: C.VASO });
      expect(dopo.porta(C.UTENSILE, 40, 46, 'gettone')).toMatchObject({ genere: 'unione', nato: C.VASO, nuova: true });
    } finally {
      futuro.acceso = false;
    }
  });
});
