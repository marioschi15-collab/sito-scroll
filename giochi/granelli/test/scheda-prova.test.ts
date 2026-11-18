import { describe, expect, it, vi } from 'vitest';
import type { Scheda } from '../src/contenuti/scheda.js';

/**
 * Una scheda di prova di ogni tipo che il motore sa già far vivere (un oggetto, una costruzione, un'era, un
 * fenomeno), scritta in un file di schede come farebbe un autore, senza toccare altro codice: deve funzionare
 * dappertutto. Il file e i suoi numeri si aggiungono solo per questa prova.
 */
const icona = (c: string): string[] => Array.from({ length: 12 }, (_, y) => (y < 2 || y > 9 ? '............' : `..${c.repeat(8)}..`));
const PROVA: Scheda[] = [
  {
    chiave: 'svolazzo',
    nome: 'Svolazzo',
    genere: 'm',
    numero: 's',
    articolo: 'l',
    famiglia: 'cose',
    tipo: 'oggetto',
    unioni: [['lancia', 'aria']],
    indizio: 'Una lancia leggera, data al vento.',
    descrizione: 'Un telaio leggero che il vento tiene in alto.',
    icona: icona('R'),
  },
  {
    chiave: 'torretta',
    nome: 'Torretta',
    genere: 'f',
    numero: 's',
    articolo: 'la',
    famiglia: 'cose',
    tipo: 'costruzione',
    unioni: [
      ['svolazzo', 'mura'],
      ['svolazzo', 'torre'],
    ],
    indizio: 'Uno svolazzo legato in cima alle mura.',
    descrizione: 'Una torre piccola con uno svolazzo sempre in volo.',
    figura: ['..RR..', '.SSSS.', '.SkkS.', '.SSSS.', '.SSSS.', 'dssssd'],
    finale: true,
  },
  {
    chiave: 'eta-del-vento',
    nome: 'Età del vento',
    genere: 'f',
    numero: 's',
    articolo: 'l',
    famiglia: 'ere',
    tipo: 'era',
    unioni: [],
    arrivaCon: 'torretta',
    dopo: 'medioevo',
    indizio: 'Comincia con la prima torretta.',
    descrizione: 'Il vento lavora per tutti.',
    icona: icona('C'),
  },
  {
    chiave: 'tramontana',
    nome: 'Tramontana',
    genere: 'f',
    numero: 's',
    articolo: 'la',
    famiglia: 'cielo',
    tipo: 'fenomeno',
    unioni: [],
    siVede: { materiale: 'neve', quante: 40 },
    indizio: 'Tanta neve, tutta insieme.',
    descrizione: 'Un vento freddo che scende dai monti.',
    icona: icona('W'),
    finale: true,
  },
  {
    chiave: 'turbine',
    nome: 'Turbine',
    genere: 'm',
    numero: 's',
    articolo: 'il',
    famiglia: 'cielo',
    tipo: 'fenomeno',
    unioni: [['ruota', 'sabbia']],
    indizio: 'Una ruota che gira sulla sabbia.',
    descrizione: 'La sabbia che si alza e gira su sé stessa.',
    icona: icona('t'),
    finale: true,
  },
];

vi.mock('../src/contenuti/numeri.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/numeri.js')>();
  return { ...vero, NUMERI: [...vero.NUMERI, ['svolazzo', 5000], ['torretta', 5001], ['eta-del-vento', 5002], ['tramontana', 5003], ['turbine', 5004]] };
});
vi.mock('../src/contenuti/indice.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/indice.js')>();
  return { FILE: { ...vero.FILE, prova: PROVA } };
});

const R = await import('../src/contenuti/registro.js');
const { controlla } = await import('../src/contenuti/controllo.js');
const { siUnisce, esitoDi } = await import('../src/motore/esiti.js');
const { C, E } = await import('../src/motore/cose.js');
const { M } = await import('../src/motore/materiali.js');
const { fotografa, ripristina } = await import('../src/salvataggio.js');
const { rispostaDiUnisci } = await import('../src/risposta.js');
const { gira, mondo, riempi } = await import('./aiuti.js');

describe('una scheda nuova funziona dappertutto, senza toccare altro codice', () => {
  it('il controllo la accetta, e ha il suo numero in coda (qui da 5000, dopo quelli veri)', () => {
    expect(controlla().errori).toEqual([]);
    expect(controlla({ file: 'prova' }).errori).toEqual([]);
    expect(R.idDi('svolazzo')).toBe(5000);
    expect(R.voce(5000)).toMatchObject({ nome: 'Svolazzo', tipo: 'oggetto', file: 'prova' });
    expect(R.voci().filter((v) => v.file === 'prova').length).toBe(5);
  });

  it('compare nel Libro, nel suo capitolo, e nello scaffale di Unisci', () => {
    expect(R.vociDelCapitolo('cose').map((v) => v.nome)).toContain('Svolazzo');
    expect(R.vociDelCapitolo('ere').at(-1)?.nome).toBe('Età del vento');
    expect(R.vociDelCapitolo('cielo').map((v) => v.nome)).toContain('Tramontana');
    expect(siUnisce(5000)).toBe(true);
    expect(siUnisce(5001)).toBe(true);
    expect(R.voce(5000)?.nasce).toEqual([{ con: [C.LANCIA, M.ARIA] }]);
    // Il disegno di riserva segue il tipo, non il numero: un oggetto da 5000 in su non diventa uno stendardo d'era.
    expect(R.haStendardo(5000)).toBe(false);
    expect(R.haStendardo(5002)).toBe(true);
    expect(R.haStendardo(E.MEDIOEVO)).toBe(true);
    expect(R.haStendardo(C.CAPANNA)).toBe(false);
  });

  it('si unisce in Unisci e portandola nel mondo; la costruzione nasce posata, e l’era arriva al suo turno', () => {
    expect(esitoDi(C.LANCIA, M.ARIA, 0)).toEqual({ genere: 'unione', id: 5000 });
    const m = mondo(120, 70);
    riempi(m, 0, 50, 119, 69, M.ROCCIA);
    m.visti.add(C.LANCIA).add(C.MURA).add(C.TORRE);
    const r = rispostaDiUnisci(m, C.LANCIA, M.ARIA, 60, (id) => R.voce(id)?.nome ?? '?');
    expect(r).toMatchObject({ titolo: 'Nuova scoperta!', id: 5000, nuova: true });
    // Una torre posata nel mondo, e lo svolazzo portato sopra: nasce la torretta, posata lì accanto.
    m.visti.add(C.TORRE);
    expect(m.posa(C.TORRE, 40, 40)).toBe(true);
    const torre = m.cose[0];
    const esito = m.porta(5000, torre.x + 3, torre.y - 6, 'gettone');
    expect(esito).toMatchObject({ genere: 'unione', nato: 5001, nuova: true, posata: true });
    expect(m.cose.map((c) => c.id)).toContain(5001);
    expect(R.ingombroDi(5001)).toEqual([3, 3]);
    // L'era viene subito dopo il Medioevo (anche quando le ere della grande infornata ci sono): la torretta da sola non basta.
    expect(R.ere()[R.ere().indexOf(E.MEDIOEVO) + 1]).toBe(5002);
    expect(m.visti.has(5002)).toBe(false);
    for (const id of [E.PIETRA, E.BRONZO, E.FERRO, E.ANTICA]) m.visti.add(id);
    m.visti.add(C.TORRE).add(C.CASTELLO);
    m.scopri(E.MEDIOEVO, 0, 0);
    expect(m.visti.has(5002)).toBe(true);
    // Nel salvataggio è un numero come gli altri: si riapre con la sua voce e la sua costruzione.
    const copia = ripristina(JSON.parse(JSON.stringify(fotografa(m))))!;
    expect(copia.visti.has(5000) && copia.visti.has(5001) && copia.visti.has(5002)).toBe(true);
    expect(copia.cose.map((c) => c.id)).toContain(5001);
  });

  it('un fenomeno con le sue unioni non si regala in Unisci, ma si scopre portandone la coppia nel mondo', () => {
    expect(esitoDi(C.RUOTA, M.SABBIA, 0)).toEqual({ genere: 'fenomeno', id: 5004 });
    const m = mondo(60, 60);
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 20, 44, 39, 49, M.SABBIA);
    m.visti.add(C.RUOTA).add(M.SABBIA);
    expect(rispostaDiUnisci(m, C.RUOTA, M.SABBIA, 30, (id) => R.voce(id)?.nome ?? '?')).toMatchObject({ id: null, nuova: false });
    expect(m.visti.has(5004)).toBe(false);
    expect(m.porta(C.RUOTA, 30, 46, 'gettone')).toMatchObject({ genere: 'nelMondo', fenomeno: 5004 });
    expect(m.visti.has(5004)).toBe(true);
  });

  it('un fenomeno con «siVede» si scopre guardando il mondo', () => {
    const m = mondo(60, 60);
    riempi(m, 0, 55, 59, 59, M.ROCCIA);
    riempi(m, 5, 45, 54, 54, M.NEVE);
    gira(m, 200);
    expect(m.visti.has(5003)).toBe(true);
  });
});
