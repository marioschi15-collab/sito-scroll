import { describe, expect, it } from 'vitest';
import { cheCosaCe } from '../src/motore/bersaglio.js';
import { idDi, ingombroDi } from '../src/contenuti/registro.js';
import { C } from '../src/motore/cose.js';
import { ESPLOSIONE, INCENDIO, M, N_TIPI, OMINO, PRIMA_MISCELA, TRONCO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { albero, gira, libroDa12, mondo, primaGenerazione, quanti, riempi } from './aiuti.js';

/** Un piano di roccia nuda dalla riga 50 in giù, largo `w`. */
function piano(w = 120): Mondo {
  const m = mondo(w, 70);
  riempi(m, 0, 50, w - 1, 69, M.ROCCIA);
  return m;
}

/** Quante celle di tronco ha il mondo: un albero tolto o tagliato le fa calare. */
function tronchi(m: Mondo): number {
  let n = 0;
  for (let i = 0; i < m.tipo.length; i++) if (m.tipo[i] === M.LEGNO && m.dato[i] === TRONCO) n++;
  return n;
}

describe('portare una cosa sopra un’altra', () => {
  it('acqua portata sulla terra: nel mondo nasce il fango, e il Fango è scoperto', () => {
    const m = piano();
    riempi(m, 30, 44, 60, 49, M.TERRA);
    const esito = m.porta(M.ACQUA, 45, 44, 'gettone');
    expect(esito).toMatchObject({ genere: 'unione', nato: M.FANGO, nuova: true, con: M.TERRA });
    expect(quanti(m, M.FANGO)).toBeGreaterThanOrEqual(4);
    expect(m.visti.has(M.FANGO)).toBe(true);
    expect(m.giaProvata(M.TERRA, M.ACQUA)).toBe(true);
    // Una seconda volta il fango non è più nuovo, ma nasce lo stesso: è una reazione del mondo.
    const prima = quanti(m, M.FANGO);
    expect(m.porta(M.ACQUA, 35, 44, 'gettone')).toMatchObject({ genere: 'unione', nato: M.FANGO, nuova: false });
    expect(quanti(m, M.FANGO)).toBeGreaterThan(prima);
  });

  it('acqua sulla roccia nuda: si versa lì, senza rifiuti e senza ricordare niente', () => {
    const m = piano();
    expect(m.porta(M.ACQUA, 40, 50, 'gettone')).toMatchObject({ genere: 'messa' });
    expect(quanti(m, M.ACQUA)).toBeGreaterThan(0);
    expect(m.provate.size).toBe(0);
    // Anche in pieno cielo.
    expect(m.porta(M.TERRA, 80, 10, 'gettone')).toEqual({ genere: 'messa', x: 80, y: 10 });
    expect(quanti(m, M.TERRA)).toBeGreaterThan(0);
  });

  it('nel pieno di un mucchio la manciata cade nella prima fascia libera più su', () => {
    const m = piano();
    riempi(m, 20, 35, 60, 49, M.SABBIA);
    const esito = m.porta(M.SABBIA, 40, 45, 'gettone');
    expect(esito.genere).toBe('messa');
    if (esito.genere === 'messa') expect(esito.y).toBeLessThan(40);
  });

  it('pietra portata sul legno fa l’utensile, che non si posa: resta una scoperta', () => {
    const m = piano();
    m.visti.add(M.PIETRA).add(M.LEGNO);
    riempi(m, 30, 45, 40, 49, M.LEGNO);
    const legno = quanti(m, M.LEGNO);
    expect(m.porta(M.PIETRA, 35, 45, 'gettone')).toMatchObject({ genere: 'unione', nato: C.UTENSILE, nuova: true, posata: false });
    expect(m.visti.has(C.UTENSILE)).toBe(true);
    expect(quanti(m, M.LEGNO)).toBe(legno);
  });

  it('legno portato su un albero: la capanna nasce accanto, e l’albero resta intero', () => {
    const m = piano();
    albero(m, 60, 7);
    const prima = tronchi(m);
    const esito = m.porta(M.LEGNO, 60, 41, 'gettone');
    expect(esito).toMatchObject({ genere: 'unione', nato: C.CAPANNA, nuova: true, con: M.PIANTA, posata: true });
    expect(m.cose.length).toBe(1);
    const c = m.cose[0];
    // Accanto: non sopra il tronco né a meno di tre celle da lui, e non lontano dal punto.
    expect(c.x > 63 || c.x + ingombroDi(C.CAPANNA)![0] - 1 < 57).toBe(true);
    expect(Math.abs(c.x + 5 - 60)).toBeLessThanOrEqual(12 + 5);
    expect(tronchi(m)).toBe(prima);
    // Una capanna c'è già: la stessa unione non ne fa nascere un'altra.
    expect(m.porta(M.LEGNO, 60, 41, 'gettone')).toEqual({ genere: 'giaFatta', nato: C.CAPANNA, con: M.PIANTA });
    expect(m.cose.length).toBe(1);
  });

  it('se accanto all’albero non c’è posto, la capanna resta solo una scoperta', () => {
    const m = piano(20);
    albero(m, 10, 7);
    expect(m.porta(M.LEGNO, 10, 41, 'gettone')).toMatchObject({ genere: 'unione', nato: C.CAPANNA, posata: false });
    expect(m.visti.has(C.CAPANNA)).toBe(true);
    expect(m.cose.length).toBe(0);
    expect(tronchi(m)).toBe(7);
  });

  it('una casa portata sulla terra versata si posa: il terreno non si unisce', () => {
    const m = piano();
    m.visti.add(C.CASA);
    riempi(m, 30, 46, 70, 49, M.TERRA);
    expect(m.porta(C.CASA, 50, 46, 'gettone')).toMatchObject({ genere: 'messa' });
    expect(m.cose.map((c) => c.id)).toEqual([C.CASA]);
    expect(m.provate.size).toBe(0);
  });

  it('una barca portata sull’acqua si posa sull’acqua', () => {
    const m = piano();
    m.visti.add(C.BARCA);
    riempi(m, 20, 50, 80, 55, M.VUOTO);
    riempi(m, 20, 50, 80, 55, M.ACQUA);
    expect(m.porta(C.BARCA, 50, 50, 'gettone')).toMatchObject({ genere: 'messa' });
    expect(m.cose.map((c) => c.id)).toEqual([C.BARCA]);
  });

  it('un omino portato sulla terra nasce lì, anche se il punto è dentro il mucchio', () => {
    const m = piano();
    riempi(m, 30, 45, 50, 49, M.TERRA);
    expect(m.porta(OMINO, 40, 47, 'gettone')).toMatchObject({ genere: 'messa', x: 40 });
    expect(m.omini.length).toBe(1);
    expect(m.omini[0].y).toBeLessThan(45);
    expect(m.provate.size).toBe(0);
  });

  it('fuoco portato sul legno fa il falò, senza incendiare il bosco intorno', () => {
    const m = piano();
    for (const x of [40, 46, 52]) albero(m, x, 6);
    riempi(m, 44, 47, 48, 49, M.LEGNO);
    const esito = m.porta(M.FUOCO, 46, 47, 'gettone');
    expect(esito).toMatchObject({ genere: 'unione', nato: C.FALO, nuova: true });
    expect(quanti(m, M.FUOCO) + quanti(m, M.BRACE)).toBe(0);
    gira(m, 300);
    expect(quanti(m, M.FUOCO) + quanti(m, M.BRACE) + quanti(m, M.CENERE)).toBe(0);
    expect(m.visti.has(INCENDIO)).toBe(false);
  });

  it('la via di un fenomeno non si regala: la cosa si mette lì, e il mondo fa il resto', () => {
    const m = piano();
    riempi(m, 40, 46, 50, 49, M.POLVERE_NERA);
    expect(m.porta(M.FUOCO, 45, 46, 'gettone')).toEqual({ genere: 'nelMondo', con: M.POLVERE_NERA, fenomeno: ESPLOSIONE });
    expect(m.visti.has(ESPLOSIONE)).toBe(false);
    expect(m.giaProvata(M.FUOCO, M.POLVERE_NERA)).toBe(false);
    gira(m, 60);
    expect(m.visti.has(ESPLOSIONE)).toBe(true);
  });

  it('le miscele: «per ora niente» prima della dodicesima voce, poi una miscela vera nel mondo', () => {
    const m = piano();
    m.visti.add(M.SABBIA).add(M.LEGNO);
    riempi(m, 40, 45, 50, 49, M.LEGNO);
    expect(m.porta(M.SABBIA, 45, 45, 'gettone')).toEqual({ genere: 'niente', con: M.LEGNO, perOra: true });
    expect(m.provate.size).toBe(0);
    expect(m.ricettario.size).toBe(0);
    libroDa12(m);
    const esito = m.porta(M.SABBIA, 45, 45, 'gettone');
    expect(esito).toMatchObject({ genere: 'unione', nuova: true, posata: false });
    if (esito.genere !== 'unione') return;
    expect(m.ricettario.has(esito.nato)).toBe(true);
    expect(quanti(m, m.tipoPer(esito.nato))).toBeGreaterThanOrEqual(6);
    expect(m.giaProvata(M.LEGNO, M.SABBIA)).toBe(true);
  });

  it('se il mondo non ha più posto per una miscela nuova, nasce lo stesso come scoperta', () => {
    const m = libroDa12(piano());
    const tutte = primaGenerazione(m);
    // Ogni posto per le miscele preso da una miscela che ha almeno un granello nel mondo.
    for (let t = PRIMA_MISCELA, k = 0; t < N_TIPI; t++, k++) {
      m.occupa(t, tutte[k].id);
      m.tipo[(k % 100) + 10 + (60 + ((k / 100) | 0)) * m.w] = t;
    }
    const nuova = tutte[N_TIPI - PRIMA_MISCELA];
    m.visti.add(nuova.a).add(nuova.b);
    riempi(m, 40, 45, 50, 49, nuova.b);
    const esito = m.porta(nuova.a, 45, 45, 'gettone');
    expect(esito).toMatchObject({ genere: 'unione', nato: nuova.id, pieno: true });
    expect(m.visti.has(nuova.id)).toBe(true);
  });

  it('un utensile sul pozzo non fa niente, e la coppia si ricorda', () => {
    const m = piano();
    m.visti.add(C.POZZO).add(C.UTENSILE);
    expect(m.posa(C.POZZO, 50, 40)).toBe(true);
    expect(m.porta(C.UTENSILE, 50, 46, 'gettone')).toEqual({ genere: 'niente', con: C.POZZO });
    expect(m.giaProvata(C.POZZO, C.UTENSILE)).toBe(true);
  });

  it('ciò che non si versa né si posa va portato sopra un’altra cosa', () => {
    const m = piano();
    const fabbro = idDi('fabbro');
    m.visti.add(fabbro).add(C.SCRITTURA);
    expect(m.porta(fabbro, 50, 30, 'gettone')).toEqual({ genere: 'nonQui', perche: 'soloSopra' });
    expect(m.porta(C.SCRITTURA, 50, 30, 'gettone')).toEqual({ genere: 'nonQui', perche: 'soloSopra' });
    // Una costruzione dove non può stare dice perché, come la posa.
    m.visti.add(C.BARCA);
    expect(m.porta(C.BARCA, 50, 30, 'gettone')).toEqual({ genere: 'nonQui', perche: 'asciutto' });
  });

  it('una cosa del mondo portata sul vuoto, sul terreno o su una sua uguale torna dov’era: niente copie', () => {
    const m = piano();
    m.visti.add(C.CAPANNA);
    riempi(m, 30, 46, 70, 49, M.TERRA);
    const terra = quanti(m, M.TERRA);
    expect(m.porta(M.TERRA, 80, 20, 'mondo')).toEqual({ genere: 'torna' });
    expect(m.porta(M.TERRA, 50, 46, 'mondo')).toEqual({ genere: 'torna' });
    expect(m.porta(C.CAPANNA, 50, 46, 'mondo')).toEqual({ genere: 'torna' });
    expect(m.porta(M.ACQUA, 100, 49, 'mondo')).toEqual({ genere: 'torna' });
    expect(quanti(m, M.TERRA)).toBe(terra);
    expect(quanti(m, M.ACQUA)).toBe(0);
    expect(m.cose.length).toBe(0);
    // Sopra un'altra cosa invece unisce, come un gettone.
    expect(m.porta(M.ACQUA, 50, 46, 'mondo')).toMatchObject({ genere: 'unione', nato: M.FANGO });
  });

  it('un punto con la virgola (dal dito) vale la cella che lo contiene; fuori dal mondo non nasce nessuno', () => {
    const m = piano();
    m.visti.add(M.PIETRA).add(M.LEGNO);
    riempi(m, 30, 45, 40, 49, M.LEGNO);
    expect(cheCosaCe(m, 35.7, 45.4)).toMatchObject({ genere: 'materia', id: M.LEGNO, x: 35, y: 45 });
    expect(m.porta(M.PIETRA, 35.6, 45.3, 'gettone')).toMatchObject({ genere: 'unione', nato: C.UTENSILE });
    expect(m.porta(M.ACQUA, 80.5, 30.9, 'gettone')).toEqual({ genere: 'messa', x: 80, y: 30 });
    expect(m.porta(OMINO, -4, 30, 'gettone')).toEqual({ genere: 'nonQui', perche: 'pieno' });
    expect(m.omini.length).toBe(0);
  });
});
