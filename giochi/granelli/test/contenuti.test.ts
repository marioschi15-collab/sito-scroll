import { describe, expect, it } from 'vitest';
import { controlla } from '../src/contenuti/controllo.js';
import { FILE } from '../src/contenuti/indice.js';
import { problemi, schede } from '../src/contenuti/registro.js';

/** I sei file della grande infornata (P8). */
const INFORNATA = ['natura', 'bottega', 'citta', 'macchine', 'moderno', 'cielo'];

describe('il controllo delle scoperte', () => {
  it('tutto il Libro: ogni voce si raggiunge dai quattro elementi, nessuna coppia ha due esiti, ogni scheda è completa', () => {
    const r = controlla();
    expect(r.errori).toEqual([]);
    expect(problemi()).toEqual([]);
    expect(r.conti.file).toEqual(['paese', 'campagna', ...INFORNATA]);
    // Le 145 voci di prima e le 315 della grande infornata: oltre quattrocento.
    expect(r.conti.voci).toBe(460);
    expect(schede().filter(([file]) => INFORNATA.includes(file)).length).toBe(315);
  });

  it('due voci non raccontano la stessa curiosità né hanno la stessa descrizione', () => {
    // Il casaro ripeteva la curiosità del formaggio: nel Libro, una accanto all'altra, sembravano un errore.
    for (const campo of ['sapevi', 'descrizione'] as const) {
      const visti = new Map<string, string>();
      for (const [, s] of schede()) {
        const testo = s[campo]?.trim().toLowerCase();
        if (!testo) continue;
        expect(visti.get(testo), `${s.chiave}: ${campo} uguale a quello di ${visti.get(testo)}`).toBeUndefined();
        visti.set(testo, s.chiave);
      }
    }
  });

  it('un file solo, come fa chi scrive le schede di una famiglia', () => {
    for (const file of Object.keys(FILE)) expect(controlla({ file }).errori, file).toEqual([]);
    expect(controlla({ file: 'non-esiste' }).errori.join(' ')).toMatch(/Non c'è un file di schede/);
  });
});
