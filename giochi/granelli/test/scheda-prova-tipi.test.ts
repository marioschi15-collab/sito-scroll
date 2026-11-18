import { describe, expect, it, vi } from 'vitest';
import type { Scheda } from '../src/contenuti/scheda.js';

/**
 * Una scheda di prova per ogni tipo che vive nel mondo (una creatura, un mestiere, un'idea, un evento), scritta in un
 * file di schede come farebbe un autore e senza toccare altro codice: attraversa registro, Unisci, il mondo e il
 * salvataggio. Il file e i suoi numeri si aggiungono solo per questa prova.
 */
const icona = (c: string): string[] => Array.from({ length: 12 }, (_, y) => (y < 3 || y > 8 ? '............' : `...${c.repeat(6)}...`));
const base = { genere: 'm', numero: 's', articolo: 'il', indizio: 'Un indizio.', descrizione: 'Una prova.' } as const;
const PROVA: Scheda[] = [
  {
    ...base,
    chiave: 'riccio',
    nome: 'Riccio',
    famiglia: 'vita',
    tipo: 'creatura',
    muove: 'cammina',
    unioni: [['fungo', 'terra']],
    icona: icona('n'),
    figura: ['..nnn.', '.nnnnk', 'nnnnnn', '.b..b.'],
    finale: true,
  },
  { ...base, chiave: 'fischiatore', nome: 'Fischiatore', famiglia: 'genti', tipo: 'mestiere', unioni: [['omino', 'riccio']], icona: icona('A'), segno: ['.y.', 'yyy'], finale: true },
  { ...base, chiave: 'pazienza', nome: 'Pazienza', famiglia: 'cose', tipo: 'idea', unioni: [['riccio', 'muschio']], icona: icona('y'), finale: true },
  { ...base, chiave: 'grandinata', nome: 'Grandinata', famiglia: 'cielo', tipo: 'evento', evento: 'neve', unioni: [['riccio', 'nuvola']], icona: icona('W'), finale: true },
];

vi.mock('../src/contenuti/numeri.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/numeri.js')>();
  return { ...vero, NUMERI: [...vero.NUMERI, ['riccio', 960], ['fischiatore', 961], ['pazienza', 962], ['grandinata', 963]] };
});
vi.mock('../src/contenuti/indice.js', async (originale) => {
  const vero = await originale<typeof import('../src/contenuti/indice.js')>();
  return { FILE: { ...vero.FILE, prova: PROVA } };
});

const R = await import('../src/contenuti/registro.js');
const { controlla } = await import('../src/contenuti/controllo.js');
const { esitoDi } = await import('../src/motore/esiti.js');
const { M, OMINO } = await import('../src/motore/materiali.js');
const { fotografa, ripristina } = await import('../src/salvataggio.js');
const { gira, mondo, quanti, riempi } = await import('./aiuti.js');

const [RICCIO, FISCHIATORE, PAZIENZA, GRANDINATA] = [960, 961, 962, 963];

describe('ogni tipo, scritto in una scheda, vive nel mondo senza toccare altro codice', () => {
  it('il registro le legge: tipo, tavolozza, misura, segno, effetto', () => {
    expect(controlla({ file: 'prova' }).errori).toEqual([]);
    expect(R.tipoDi(RICCIO)).toBe('creatura');
    expect(R.misuraDi(RICCIO)).toEqual([3, 2]);
    expect(R.segnoDi(FISCHIATORE)).toEqual(['.y.', 'yyy']);
    expect(R.effettoDi(GRANDINATA)).toBe('neve');
    for (const id of [RICCIO, FISCHIATORE, PAZIENZA, GRANDINATA]) expect(R.voce(id)?.versabile, String(id)).toBe(true);
    // Nessuna delle quattro si posa come una costruzione.
    for (const id of [RICCIO, FISCHIATORE, PAZIENZA, GRANDINATA]) expect(R.ingombroDi(id)).toBeUndefined();
  });

  it('nascono unendo, in Unisci e nel mondo; e ognuna fa quello che fa il suo tipo', () => {
    expect(esitoDi(M.FUNGO, M.TERRA, 0)).toEqual({ genere: 'unione', id: RICCIO });
    const m = mondo(120, 70);
    riempi(m, 0, 50, 119, 69, M.ROCCIA);
    riempi(m, 20, 46, 40, 49, M.TERRA);
    m.visti.add(M.FUNGO).add(M.MUSCHIO).add(M.NUVOLA);
    // Il fungo portato sulla terra: nasce il riccio, che cammina lì.
    expect(m.porta(M.FUNGO, 30, 46, 'gettone')).toMatchObject({ genere: 'unione', nato: RICCIO, nuova: true });
    expect(m.creature.map((c) => c.id)).toEqual([RICCIO]);
    const riccio = m.creature[0];
    gira(m, 200);
    // Sta in piedi su qualcosa: la terra, o la roccia se intanto è sceso dal mucchio.
    expect([M.TERRA, M.ROCCIA]).toContain(m.tipo[(riccio.y + 1) * m.w + riccio.x]);
    // Un omino e il riccio: il mestiere nuovo, preso proprio da quell'omino.
    m.aggiungiOmino(90, 49);
    const o = m.omini[0];
    expect(m.porta(RICCIO, 90, 48, 'gettone')).toMatchObject({ genere: 'unione', nato: FISCHIATORE });
    expect(o.mestiere).toBe(FISCHIATORE);
    // Il muschio portato sul riccio: l'idea nuova; poi portata su un omino, lui la sa.
    m.creature[0].nuvoletta = undefined;
    expect(m.porta(M.MUSCHIO, riccio.x, riccio.y, 'gettone')).toMatchObject({ genere: 'unione', nato: PAZIENZA });
    expect(m.porta(PAZIENZA, 90, 48, 'gettone')).toMatchObject({ genere: 'dato', a: OMINO });
    expect(o.sa).toEqual([PAZIENZA]);
    // La nuvola sul riccio dà la grandinata, che portata nel cielo accade lì.
    expect(m.porta(M.NUVOLA, riccio.x, riccio.y, 'gettone')).toMatchObject({ genere: 'unione', nato: GRANDINATA });
    m.porta(GRANDINATA, 70, 30, 'gettone');
    gira(m, 300);
    expect(quanti(m, M.NEVE)).toBeGreaterThan(50);
    expect(m.eventi.length).toBe(0);
    // Tutto torna con la partita salvata.
    const copia = ripristina(JSON.parse(JSON.stringify(fotografa(m))))!;
    expect(copia.creature.map((c) => c.id)).toEqual([RICCIO]);
    expect(copia.omini[0]).toMatchObject({ mestiere: FISCHIATORE, sa: [PAZIENZA] });
    for (const id of [RICCIO, FISCHIATORE, PAZIENZA, GRANDINATA]) expect(copia.visti.has(id)).toBe(true);
  });
});
