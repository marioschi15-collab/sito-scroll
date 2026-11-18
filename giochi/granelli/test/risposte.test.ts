import { describe, expect, it } from 'vitest';
import { INIZIALI, idDi, voce } from '../src/contenuti/registro.js';
import { C } from '../src/motore/cose.js';
import { M, OMINO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { NIENTE } from '../src/indizi.js';
import { ADDIO_MESTOLO, UNISCI } from '../src/righe.js';
import { leggiRicordi } from '../src/ricordi.js';
import { rispostaDiUnisci } from '../src/risposta.js';
import { libroDa12, mondo, riempi } from './aiuti.js';

/** Il nome di una scoperta, come lo scrive il pannello (le miscele qui non servono). */
const nome = (id: number): string => voce(id)?.nome ?? '???';
/** Unisce due cose come il pannello Unisci, guardando il mezzo del mondo. */
const unisci = (m: Mondo, a: number, b: number, nienti = 0) => rispostaDiUnisci(m, a, b, m.w >> 1, nome, nienti);

describe('il pannello Unisci dice com’è andata', () => {
  it('mai un «niente» muto: una riga gentile che cambia a ogni «niente», e solo i «niente» contano per l’indizio', () => {
    const m = mondo();
    m.visti.add(C.UTENSILE).add(C.POZZO).add(C.VASO);
    const righe = [0, 1, 2].map((n) => unisci(m, C.UTENSILE, C.POZZO, n).sotto);
    expect(new Set(righe).size).toBe(3);
    for (const r of righe) expect(r.startsWith('Utensile + Pozzo: ')).toBe(true);
    expect(unisci(m, M.TERRA, M.ACQUA).niente).toBeUndefined();
  });

  it('una coppia già provata lo dice: «Già fatta: Fango», «Già provata: niente»', () => {
    const m = mondo();
    expect(unisci(m, M.TERRA, M.ACQUA)).toEqual({ titolo: 'Nuova scoperta!', id: M.FANGO, sotto: 'Terra + Acqua', nuova: true });
    expect(unisci(m, M.ACQUA, M.TERRA)).toEqual({ titolo: 'Già fatta:', id: M.FANGO, sotto: 'Acqua + Terra', nuova: false });
    m.visti.add(C.UTENSILE).add(C.POZZO);
    expect(unisci(m, C.UTENSILE, C.POZZO)).toEqual({ titolo: 'Niente, stavolta', id: null, sotto: `Utensile + Pozzo: ${NIENTE[0]}`, nuova: false, niente: true });
    expect(unisci(m, C.POZZO, C.UTENSILE, 1)).toEqual({ titolo: 'Già provata: niente', id: null, sotto: `Pozzo + Utensile: ${NIENTE[1]}`, nuova: false, niente: true });
    // Una cosa già nota, arrivata da un'altra coppia mai provata prima: la conosci già.
    m.visti.add(M.LAVA);
    expect(unisci(m, M.LAVA, M.ACQUA)).toMatchObject({ titolo: 'Nuova scoperta!', id: M.PIETRA });
    expect(unisci(m, M.LAVA, M.ARIA)).toMatchObject({ titolo: 'La conosci già', id: M.PIETRA });
  });

  it('due sostanze senza ricetta, prima della dodicesima voce: «per ora» non si uniscono, e la coppia non si ricorda', () => {
    const m = mondo();
    m.visti.add(M.SABBIA).add(M.LEGNO);
    expect(unisci(m, M.SABBIA, M.LEGNO)).toEqual({ titolo: 'Sabbia + Legno', id: null, sotto: UNISCI.perOra, nuova: false, niente: true });
    expect(UNISCI.perOra).toBe('Queste due, per ora, non si uniscono.');
    // Una seconda volta dice lo stesso: non è «già provata», perché per ora non conta.
    expect(unisci(m, M.SABBIA, M.LEGNO).sotto).toBe(UNISCI.perOra);
    libroDa12(m);
    expect(unisci(m, M.SABBIA, M.LEGNO)).toMatchObject({ titolo: 'Nuova miscela!', nuova: true });
    expect(unisci(m, M.LEGNO, M.SABBIA)).toMatchObject({ titolo: 'Già fatta:', nuova: false });
  });

  it('un mestiere: un omino con la lancia fa il cacciatore', () => {
    const m = mondo();
    m.visti.add(OMINO).add(C.LANCIA);
    expect(unisci(m, OMINO, C.LANCIA)).toEqual({ titolo: 'Nuova scoperta!', id: idDi('cacciatore'), sotto: 'Omino + Lancia', nuova: true });
  });

  it('capanna e frutto: dice se gli omini sono arrivati o se arriveranno vicino all’acqua', () => {
    const secco = mondo(80, 60);
    riempi(secco, 0, 50, 79, 59, M.ROCCIA);
    secco.visti.add(C.CAPANNA).add(M.FRUTTO);
    expect(unisci(secco, C.CAPANNA, M.FRUTTO)).toEqual({ titolo: 'Nuova scoperta!', id: OMINO, sotto: UNISCI.arriveranno, nuova: true });
    expect(secco.omini.length).toBe(0);
    // Con un laghetto lì accanto arrivano, anche se l'Omino è già nel Libro.
    riempi(secco, 50, 50, 70, 54, M.VUOTO);
    riempi(secco, 50, 50, 70, 54, M.ACQUA);
    expect(unisci(secco, M.FRUTTO, C.CAPANNA)).toEqual({ titolo: 'Frutto + Capanna', id: OMINO, sotto: UNISCI.arrivati, nuova: false });
    expect(secco.omini.length).toBe(2);
    // Con gli omini nel mondo è un'unione già fatta come le altre.
    expect(unisci(secco, C.CAPANNA, M.FRUTTO)).toMatchObject({ titolo: 'Già fatta:', id: OMINO });
    expect(secco.omini.length).toBe(2);
  });

  it('le frasi del pannello e il saluto al Mestolo sono brevi, in italiano semplice, senza gergo', () => {
    for (const frase of [...Object.values(UNISCI), ADDIO_MESTOLO]) {
      expect(frase.length).toBeLessThanOrEqual(130);
      expect(frase).toMatch(/^[A-Z]/);
      expect(frase).not.toMatch(/agente|prompt|token|\bapi\b|bug|sprite|render|errore|invalid/i);
    }
    expect(ADDIO_MESTOLO).toBe('Il Mestolo non c’è più. Le cose si uniscono nel pannello Unisci, e presto anche portandole una sopra l’altra nel mondo.');
  });
});

describe('i ricordi della pagina, e le partite che avevano il Mestolo', () => {
  it('una partita di prima con il Mestolo si apre: lo si saluta una volta, e la tavolozza resta', () => {
    const letti = leggiRicordi({ recenti: [M.FANGO, -2, M.TERRA], mestolo: true });
    expect(letti.avevaIlMestolo).toBe(true);
    // Il -2 era il Mestolo: nella tavolozza non c'è più (la pagina tiene solo le scoperte che si versano).
    expect(letti.ricordi).toEqual({ recenti: [M.FANGO, -2, M.TERRA] });
    // Riscritti, i ricordi non parlano più del Mestolo: il saluto non torna.
    expect(leggiRicordi(JSON.parse(JSON.stringify(letti.ricordi))).avevaIlMestolo).toBe(false);
  });

  it('niente ricordi, o ricordi sporchi: si parte dai quattro elementi, senza saluti', () => {
    for (const sporco of [null, undefined, 3, 'testo', { recenti: 'no' }, { mestolo: 'sì' }]) {
      const letti = leggiRicordi(sporco);
      expect(letti.avevaIlMestolo).toBe(false);
      expect(letti.ricordi.recenti.length).toBeGreaterThan(0);
    }
    expect(leggiRicordi(null).ricordi.recenti).toEqual([...INIZIALI]);
    expect(leggiRicordi({ recenti: [1, 'due', Number.NaN, 4] }).ricordi.recenti).toEqual([1, 4]);
    expect(leggiRicordi({ recenti: [], mestolo: false })).toEqual({ ricordi: { recenti: [] }, avevaIlMestolo: false });
  });
});
