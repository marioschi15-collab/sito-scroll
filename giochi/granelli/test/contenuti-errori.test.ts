import { describe, expect, it, vi } from 'vitest';
import type { Scheda } from '../src/contenuti/scheda.js';

/**
 * Un file di schede scritto male apposta, con i suoi numeri: il controllo deve trovare ogni errore e dire quale.
 * I moduli veri (numeri.ts, indice.ts) restano come sono: qui se ne aggiunge un pezzo solo per questa prova.
 */
const ICONA = Array.from({ length: 12 }, () => '.....yy.....');
const base = (chiave: string, nome: string, altro: Partial<Scheda> = {}): Scheda => ({
  chiave,
  nome,
  genere: 'm',
  numero: 's',
  articolo: 'il',
  famiglia: 'cose',
  tipo: 'oggetto',
  unioni: [],
  indizio: 'Un indizio.',
  descrizione: 'Una descrizione.',
  icona: ICONA,
  ...altro,
});
const SBAGLIATE: Scheda[] = [
  // Si raggiunge, ma non serve a fare niente: un vicolo cieco.
  base('cieco', 'Cieco', { unioni: [['lancia', 'aria']] }),
  // Nasce da una coppia già scritta (pietra e legno fanno l'utensile).
  base('doppione', 'Doppione', { unioni: [['pietra', 'legno']] }),
  // Nasce da due cose che non ci sono mai: non si raggiunge.
  base('irraggiungibile', 'Irraggiungibile', { unioni: [['cieco', 'mai-scritto']] }),
  // Un evento che non dice cosa fa, con articolo e genere che non vanno d'accordo, e l'icona storta.
  base('evento-muto', 'Evento muto', { tipo: 'evento', articolo: 'la', unioni: [['ruota', 'aria']], icona: ['yy'] }),
  // Una coppia che è una reazione del mondo (terra e acqua: il fango).
  base('fango-finto', 'Fango finto', { unioni: [['terra', 'acqua']], finale: true }),
  // Una chiave che non ha un numero.
  base('senza-numero', 'Senza numero', { unioni: [['ruota', 'vaso']] }),
  // Una costruzione senza figura, una materia, una parola da tecnici.
  base('casetta', 'Casetta', { tipo: 'costruzione', icona: undefined, unioni: [['casa', 'aria']], finale: true }),
  base('melma', 'Melma', { tipo: 'materia', unioni: [['fango', 'vaso']], finale: true }),
  base('gergo', 'Gergo', { descrizione: 'Un bug nel mondo.', unioni: [['carro', 'aria']], finale: true }),
  // Scritta bene: le «api» sono quelle del miele, e la brace (che non è una voce del Libro) si può guardare.
  base('sciame', 'Sciame', {
    tipo: 'fenomeno',
    descrizione: 'Tante api insieme, sopra la brace.',
    siVede: { materiale: 'brace', quante: 10 },
    finale: true,
  }),
];

vi.mock('../src/contenuti/numeri.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/numeri.js')>();
  const chiavi = ['cieco', 'doppione', 'irraggiungibile', 'evento-muto', 'fango-finto', 'casetta', 'melma', 'gergo', 'mai-scritto'];
  // L'ultima riga torna indietro: i numeri nuovi devono crescere sempre.
  return { ...vero, NUMERI: [...vero.NUMERI, ...chiavi.map((k, i) => [k, 500 + i] as const), ['indietro', 505] as const, ['sciame', 520] as const] };
});
vi.mock('../src/contenuti/indice.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/indice.js')>();
  return { FILE: { ...vero.FILE, sbagliate: SBAGLIATE } };
});

const { controlla } = await import('../src/contenuti/controllo.js');

describe('il controllo trova le schede scritte male', () => {
  const r = controlla();
  const trova = (parti: RegExp): void => {
    expect(
      r.errori.some((e) => parti.test(e)),
      `nessun errore come ${parti}:\n${r.errori.join('\n')}`,
    ).toBe(true);
  };

  it('vicoli ciechi, doppioni, irraggiungibili, chiavi senza numero', () => {
    trova(/«Cieco» entra in una sola unione come ingrediente/);
    trova(/«Doppione» entra in nessuna unione come ingrediente/);
    trova(/La coppia .*Pietra.*Legno.* è scritta 2 volte/);
    trova(/«Irraggiungibile» non si raggiunge/);
    trova(/«senza-numero».*non ha un numero in numeri\.ts/);
    trova(/terra \+ acqua .* è già una reazione del mondo/);
    trova(/il numero 505 \(«indietro»\) non è in coda/);
    trova(/In numeri\.ts il numero 505 è dato a due chiavi/);
  });

  it('schede incomplete: evento senza effetto, articolo sbagliato, icona storta, costruzione senza figura, materia, gergo', () => {
    trova(/«Evento muto».*ogni evento dice il suo effetto/);
    trova(/«Evento muto».*articolo «la» e genere «m»/);
    trova(/«Evento muto».*l'icona deve essere di 12 righe/);
    trova(/«Casetta».*una costruzione ha bisogno della sua figura/);
    trova(/«Melma».*una scheda non può essere materia/);
    trova(/«Gergo».*c'è una parola da tecnici/);
    expect(r.errori.filter((e) => e.includes('Sciame'))).toEqual([]);
  });

  it('con un file solo, le chiavi già numerate ma senza scheda contano come esistenti', () => {
    const solo = controlla({ file: 'sbagliate' });
    // «mai-scritto» ha un numero ma nessuna scheda: per chi scrive un file solo è di qualcun altro, e c'è.
    expect(solo.errori.some((e) => /usa «mai-scritto», che non c'è/.test(e))).toBe(false);
    expect(solo.errori.some((e) => /«Irraggiungibile» non si raggiunge/.test(e))).toBe(false);
    expect(r.errori.some((e) => /usa «mai-scritto», che non c'è/.test(e))).toBe(true);
    // E ogni voce nuova deve entrare in un'unione del suo stesso file.
    expect(solo.errori.some((e) => /«Doppione» non entra in nessuna unione del suo file/.test(e))).toBe(true);
  });
});
