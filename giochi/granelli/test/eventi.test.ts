import { describe, expect, it, vi } from 'vitest';
import type { Scheda } from '../src/contenuti/scheda.js';

/**
 * Gli eventi portati nel mondo: accadono lì per qualche secondo, con uno dei sei effetti pronti, e poi finiscono.
 * Le schede vere ne hanno due (l'acquazzone e la bufera); per provarli tutti e sei, qui si aggiungono quattro schede
 * di prova, solo per questo file.
 */
const icona = Array.from({ length: 12 }, () => '....cc......');
const evento = (chiave: string, nome: string, effetto: Scheda['evento']): Scheda => ({
  chiave,
  nome,
  genere: 'm',
  numero: 's',
  articolo: 'il',
  famiglia: 'cielo',
  tipo: 'evento',
  evento: effetto,
  unioni: [['aria', chiave === 'soffione' ? 'sabbia' : chiave === 'saetta' ? 'vetro' : chiave === 'sussulto' ? 'pietra' : 'diamante']],
  indizio: 'Un indizio.',
  descrizione: 'Una prova.',
  icona,
  finale: true,
});
const PROVA = [evento('soffione', 'Soffione', 'vento'), evento('saetta', 'Saetta', 'lampi'), evento('sussulto', 'Sussulto', 'scossa'), evento('raggio', 'Raggio', 'luce')];

vi.mock('../src/contenuti/numeri.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/numeri.js')>();
  return { ...vero, NUMERI: [...vero.NUMERI, ['soffione', 950], ['saetta', 951], ['sussulto', 952], ['raggio', 953]] };
});
vi.mock('../src/contenuti/indice.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/indice.js')>();
  return { FILE: { ...vero.FILE, prova: PROVA } };
});

const { idDi } = await import('../src/contenuti/registro.js');
const { DURATA_EVENTO, RAGGIO_EVENTO, accade } = await import('../src/motore/eventi.js');
const { M } = await import('../src/motore/materiali.js');
const { contaFulmini, gira, mondo, quanti, riempi } = await import('./aiuti.js');

const ACQUAZZONE = idDi('acquazzone');
const BUFERA = idDi('bufera');

function cielo() {
  const m = mondo(120, 80);
  riempi(m, 0, 60, 119, 79, M.ROCCIA);
  for (const id of [ACQUAZZONE, BUFERA, 950, 951, 952, 953]) m.visti.add(id);
  return m;
}

describe('un evento portato nel mondo accade lì, per qualche secondo, e poi finisce', () => {
  it('l’acquazzone fa piovere sopra il punto, non altrove, e smette', () => {
    const m = cielo();
    expect(m.porta(ACQUAZZONE, 60, 50, 'gettone')).toMatchObject({ genere: 'messa' });
    expect(accade(m, 'pioggia')).toBe(true);
    // Piove dal cielo sopra il punto, non altrove (poi, a terra, l'acqua scorre dove vuole).
    gira(m, 30);
    let lontano = 0;
    for (let i = 0; i < m.tipo.length; i++) if (m.tipo[i] === M.ACQUA && Math.abs((i % m.w) - 60) > RAGGIO_EVENTO) lontano++;
    expect(quanti(m, M.ACQUA)).toBeGreaterThan(10);
    expect(lontano).toBe(0);
    gira(m, DURATA_EVENTO);
    expect(accade(m, 'pioggia')).toBe(false);
    const acqua = quanti(m, M.ACQUA);
    expect(acqua).toBeGreaterThan(100);
    gira(m, 300);
    expect(quanti(m, M.ACQUA)).toBe(acqua);
  });

  it('la bufera fa nevicare; portata su una cosa con cui non si unisce, accade lo stesso (non è un «niente»)', () => {
    const m = cielo();
    riempi(m, 50, 55, 70, 59, M.SABBIA);
    expect(m.porta(BUFERA, 60, 56, 'gettone')).toMatchObject({ genere: 'dato', cosa: BUFERA, a: M.SABBIA });
    expect(m.giaProvata(BUFERA, M.SABBIA)).toBe(false);
    gira(m, DURATA_EVENTO);
    expect(quanti(m, M.NEVE)).toBeGreaterThan(100);
  });

  it('il vento spinge di lato la sabbia leggera; i lampi fanno cadere fulmini; la scossa fa scivolare; la luce scioglie la neve', () => {
    const vento = cielo();
    riempi(vento, 55, 40, 65, 44, M.SABBIA);
    vento.porta(950, 60, 42, 'gettone');
    const dir = vento.eventi[0].dir;
    gira(vento, 60);
    let oltre = 0;
    for (let i = 0; i < vento.tipo.length; i++) if (vento.tipo[i] === M.SABBIA && ((i % vento.w) - 60) * dir > 5) oltre++;
    expect(oltre).toBeGreaterThan(0);

    const lampi = cielo();
    const fulmini = contaFulmini(lampi);
    lampi.porta(951, 60, 50, 'gettone');
    gira(lampi, DURATA_EVENTO);
    expect(fulmini()).toBeGreaterThanOrEqual(4);
    expect(lampi.eventi.length).toBe(0);

    const scossa = cielo();
    // Una torre di sabbia appoggiata a un muretto: la scossa la fa franare di lato.
    riempi(scossa, 58, 40, 59, 59, M.ROCCIA);
    riempi(scossa, 60, 40, 61, 59, M.SABBIA);
    scossa.porta(952, 60, 50, 'gettone');
    expect(accade(scossa, 'scossa')).toBe(true);
    gira(scossa, 120);
    let franata = 0;
    for (let i = 0; i < scossa.tipo.length; i++) if (scossa.tipo[i] === M.SABBIA && i % scossa.w > 61) franata++;
    expect(franata).toBeGreaterThan(0);

    const luce = cielo();
    riempi(luce, 50, 55, 70, 59, M.NEVE);
    const neve = quanti(luce, M.NEVE);
    luce.porta(953, 60, 54, 'gettone');
    gira(luce, DURATA_EVENTO);
    expect(quanti(luce, M.NEVE)).toBeLessThan(neve);
  });

  it('al più tre insieme: il quarto fa finire il più vecchio', () => {
    const m = cielo();
    for (let k = 0; k < 4; k++) m.porta(ACQUAZZONE, 20 + k * 25, 50, 'gettone');
    expect(m.eventi.length).toBe(3);
    expect(m.eventi[0].x).toBe(45);
  });
});
