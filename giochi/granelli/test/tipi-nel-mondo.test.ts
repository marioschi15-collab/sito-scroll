import { describe, expect, it } from 'vitest';
import { costruzioni, idDi, ingombroDi } from '../src/contenuti/registro.js';
import { C, OSPITA } from '../src/motore/cose.js';
import { M, OMINO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import type { Omino } from '../src/motore/omini.js';
import { FUMETTO_PER, TIENE_PER } from '../src/motore/porta.js';
import { fotografa, ripristina } from '../src/salvataggio.js';
import { gira, mondo, riempi } from './aiuti.js';

const CACCIATORE = idDi('cacciatore');
const FABBRO = idDi('fabbro');
const DANZA = idDi('danza');
const FIACCOLA = idDi('fiaccola');
const MIELE = idDi('miele');

/** Un prato piano con un omino in piedi alla colonna 60 (e tutte le cose che servono già nel Libro). */
function conOmino(): { m: Mondo; o: Omino } {
  const m = mondo(120, 70);
  riempi(m, 0, 50, 119, 69, M.ROCCIA);
  for (const id of [C.UTENSILE, C.LANCIA, C.SCRITTURA, C.TEMPIO, C.CASA, FABBRO, DANZA, MIELE, FIACCOLA]) m.visti.add(id);
  m.aggiungiOmino(60, 49);
  return { m, o: m.omini[0] };
}

describe('ogni tipo di scoperta fa qualcosa nel mondo (la regola e) di porta)', () => {
  it('un oggetto portato su un omino lui lo tiene in mano, per un po’: non è un «niente», e la coppia non si ricorda', () => {
    const { m, o } = conOmino();
    expect(m.porta(FIACCOLA, 60, 48, 'gettone')).toEqual({ genere: 'dato', cosa: FIACCOLA, a: OMINO, x: 60, y: 49 });
    expect(o.tiene).toBe(FIACCOLA);
    expect(m.giaProvata(FIACCOLA, OMINO)).toBe(false);
    expect(o.nuvoletta).toBeUndefined();
    // Dopo un po' lo mette via.
    gira(m, TIENE_PER + 10);
    expect(o.tiene).toBeUndefined();
  });

  it('un oggetto portato sul vuoto o sul terreno si appoggia a terra come una figurina, piccolo, e non è un tetto', () => {
    const { m } = conOmino();
    expect(m.porta(MIELE, 20, 30, 'gettone')).toMatchObject({ genere: 'messa' });
    expect(m.porta(C.UTENSILE, 90, 49, 'gettone')).toMatchObject({ genere: 'messa' });
    expect(m.cose.map((c) => c.id)).toEqual([MIELE, C.UTENSILE]);
    gira(m, 60);
    expect(m.cose[0].y).toBe(49);
    const [lw, lh] = ingombroDi(MIELE)!;
    expect(lw).toBeLessThanOrEqual(6);
    expect(lh).toBeLessThanOrEqual(6);
    expect(OSPITA[MIELE]).toBeUndefined();
    expect(costruzioni()).not.toContain(MIELE);
    // È un bersaglio come le cose posate, e la Gomma lo toglie.
    const cosa = m.cose[0];
    expect(m.porta(C.UTENSILE, cosa.x + 1, cosa.y - 1, 'gettone')).toMatchObject({ genere: 'niente', con: MIELE });
    m.cancella(cosa.x + 1, cosa.y - 1, 2);
    expect(m.cose.map((c) => c.id)).toEqual([C.UTENSILE]);
    // E si salva con la partita.
    expect(ripristina(JSON.parse(JSON.stringify(fotografa(m))))!.cose.map((c) => c.id)).toEqual([C.UTENSILE]);
  });

  it('un mestiere portato su un omino: lui lo prende e ne porta il segno; sul vuoto va portato sopra qualcuno', () => {
    const { m, o } = conOmino();
    expect(m.porta(FABBRO, 60, 48, 'gettone')).toMatchObject({ genere: 'dato', cosa: FABBRO, a: OMINO });
    expect(o.mestiere).toBe(FABBRO);
    expect(m.porta(FABBRO, 20, 30, 'gettone')).toEqual({ genere: 'nonQui', perche: 'soloSopra' });
  });

  it('un omino a cui si porta la lancia diventa proprio lui il cacciatore, e la lancia la tiene in mano', () => {
    const { m, o } = conOmino();
    expect(m.porta(C.LANCIA, 60, 48, 'gettone')).toMatchObject({ genere: 'unione', nato: CACCIATORE, nuova: true });
    expect(o.mestiere).toBe(CACCIATORE);
    expect(o.tiene).toBe(C.LANCIA);
    // Anche una seconda volta, quando il Cacciatore è già nel Libro.
    m.aggiungiOmino(20, 49);
    const altro = m.omini[1];
    expect(m.porta(C.LANCIA, 20, 48, 'gettone')).toMatchObject({ genere: 'giaFatta', nato: CACCIATORE });
    expect(altro.mestiere).toBe(CACCIATORE);
  });

  it('un’idea portata su un omino compare in un fumetto e resta tra le cose che sa; su una costruzione resta scritta', () => {
    const { m, o } = conOmino();
    expect(m.porta(DANZA, 60, 48, 'gettone')).toMatchObject({ genere: 'dato', cosa: DANZA, a: OMINO });
    expect(o.sa).toEqual([DANZA]);
    expect(o.nuvoletta).toBe(DANZA);
    m.porta(C.SCRITTURA, 60, 48, 'gettone');
    m.porta(DANZA, 60, 48, 'gettone');
    expect(o.sa).toEqual([C.SCRITTURA, DANZA]);
    // Il fumetto se ne va; quello che sa, no.
    gira(m, FUMETTO_PER + 10);
    expect(o.nuvoletta).toBeUndefined();
    expect(o.sa).toEqual([C.SCRITTURA, DANZA]);
    // Su una costruzione (il tempio) resta scritta; sul vuoto no.
    expect(m.posa(C.TEMPIO, 25, 49)).toBe(true);
    const tempio = m.cose[0];
    expect(m.porta(C.SCRITTURA, tempio.x + 6, tempio.y - 3, 'gettone')).toMatchObject({ genere: 'dato', a: C.TEMPIO });
    expect(tempio.sa).toEqual([C.SCRITTURA]);
    expect(m.porta(DANZA, 100, 20, 'gettone')).toEqual({ genere: 'nonQui', perche: 'soloSopra' });
  });

  it('chi tiene, sa e fa qualcosa se lo ricorda nella partita salvata; quello che non torna si scarta', () => {
    const { m, o } = conOmino();
    m.porta(FIACCOLA, 60, 48, 'gettone');
    m.porta(FABBRO, 60, 48, 'gettone');
    m.porta(DANZA, 60, 48, 'gettone');
    expect(m.posa(C.TEMPIO, 25, 49)).toBe(true);
    m.porta(C.SCRITTURA, m.cose[0].x + 6, m.cose[0].y - 3, 'gettone');
    const copia = ripristina(JSON.parse(JSON.stringify(fotografa(m))))!;
    expect(copia.omini[0]).toMatchObject({ tiene: FIACCOLA, mestiere: FABBRO, sa: [DANZA] });
    expect(copia.omini[0].nuvoletta).toBeUndefined();
    expect(copia.cose[0].sa).toEqual([C.SCRITTURA]);
    // Numeri che non sono quello che dicono di essere: un mestiere che è una casa, un'idea che è un materiale.
    const foto = JSON.parse(JSON.stringify(fotografa(m)));
    Object.assign(foto.omini[0], { tiene: C.CASA, mestiere: M.TERRA, sa: [M.ACQUA, DANZA, 'x'] });
    foto.cose[0].sa = 'scrittura';
    const sporca = ripristina(foto)!;
    expect(sporca.omini[0].tiene).toBeUndefined();
    expect(sporca.omini[0].mestiere).toBeUndefined();
    expect(sporca.omini[0].sa).toEqual([DANZA]);
    expect(sporca.cose[0].sa).toBeUndefined();
    void o;
  });

  it('le partite salvate prima che esistessero creature, oggetti in mano e idee si aprono come prima', () => {
    const { m } = conOmino();
    const foto = JSON.parse(JSON.stringify(fotografa(m)));
    delete foto.creature;
    for (const om of foto.omini) for (const campo of ['tiene', 'tieneFino', 'sa', 'mestiere', 'nuvoletta', 'nuvolettaFino']) delete om[campo];
    foto.cose = [{ id: C.CAPANNA, x: 10, y: 49 }];
    const copia = ripristina(foto)!;
    expect(copia.creature).toEqual([]);
    expect(copia.omini.length).toBe(1);
    expect(copia.cose.map((c) => c.id)).toEqual([C.CAPANNA]);
  });
});
