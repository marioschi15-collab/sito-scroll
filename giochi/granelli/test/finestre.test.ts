import { describe, expect, it } from 'vitest';
import { Coda } from '../src/coda.js';
import { eVoce, voci } from '../src/contenuti/registro.js';
import { festaDovuta } from '../src/feste.js';
import { PRIMA_ID_MISCELA, VILLAGGIO } from '../src/motore/materiali.js';
import { ARRIVA, NON_SALVATA, NON_SALVATA_BENVENUTO, RICOMINCIA, perderai } from '../src/righe.js';

/** Una fila con un registro di quello che è stato mostrato. */
function fila() {
  const mostrate: string[] = [];
  const coda = new Coda<string>((cosa) => mostrate.push(cosa));
  return { coda, mostrate };
}

describe('una finestra alla volta', () => {
  it('i messaggi aspettano che si chiuda quella aperta, e poi arrivano in ordine', () => {
    const { coda, mostrate } = fila();
    expect(coda.subito('Libro')).toBe(true);
    coda.aspetta('Villaggio');
    coda.aspetta('Età della pietra');
    coda.avanti();
    expect(mostrate).toEqual(['Libro']);
    expect(coda.inAttesa).toBe(2);
    coda.chiusa();
    coda.avanti();
    expect(mostrate).toEqual(['Libro', 'Villaggio']);
    coda.avanti();
    expect(mostrate).toEqual(['Libro', 'Villaggio']);
    coda.chiusa();
    coda.avanti();
    expect(mostrate).toEqual(['Libro', 'Villaggio', 'Età della pietra']);
    expect(coda.inAttesa).toBe(0);
  });

  it('una finestra chiesta da chi gioca non si apre sopra un’altra', () => {
    const { coda, mostrate } = fila();
    coda.aspetta('Benvenuto');
    coda.avanti();
    expect(coda.subito('Libro')).toBe(false);
    expect(coda.subito('Unisci')).toBe(false);
    expect(mostrate).toEqual(['Benvenuto']);
    coda.chiusa();
    expect(coda.subito('Libro')).toBe(true);
    expect(mostrate).toEqual(['Benvenuto', 'Libro']);
  });

  it('durante un gesto (un gettone in volo, il dito che versa) un messaggio aspetta che il dito si alzi', () => {
    const { coda, mostrate } = fila();
    coda.gesto(true);
    coda.aspetta('Età del bronzo');
    expect(coda.pronta).toBe(false);
    coda.avanti();
    expect(mostrate).toEqual([]);
    coda.gesto(false);
    expect(coda.pronta).toBe(true);
    coda.avanti();
    expect(mostrate).toEqual(['Età del bronzo']);
    // Ma chi gioca può aprire il Libro anche con un dito ancora sul mondo: l'ha chiesto lui.
    coda.chiusa();
    coda.gesto(true);
    expect(coda.subito('Libro')).toBe(true);
  });

  it('lo stesso messaggio non entra in fila due volte; «Riparti da zero» svuota la fila', () => {
    const { coda, mostrate } = fila();
    coda.subito('Unisci');
    coda.aspetta('Hai scoperto tutto!', 'tutto');
    coda.aspetta('Hai scoperto tutto!', 'tutto');
    coda.aspetta('Troppe miscele', 'pieno');
    expect(coda.inAttesa).toBe(2);
    coda.svuota();
    coda.chiusa();
    coda.avanti();
    expect(mostrate).toEqual(['Unisci']);
    expect(coda.occupata).toBe(false);
  });
});

describe('le feste', () => {
  it('«Hai scoperto tutto!» arriva con l’ultima voce del Libro, e non torna a ogni miscela dopo', () => {
    const tutte = voci().length;
    const ultima = voci().at(-1)!.id;
    expect(festaDovuta([ultima], tutte, tutte, eVoce, VILLAGGIO)).toBe('tutto');
    expect(festaDovuta([PRIMA_ID_MISCELA + 5], tutte, tutte, eVoce, VILLAGGIO)).toBeNull();
    expect(festaDovuta([ultima], tutte - 1, tutte, eVoce, VILLAGGIO)).toBeNull();
    expect(festaDovuta([VILLAGGIO], 30, tutte, eVoce, VILLAGGIO)).toBe('villaggio');
  });
});

describe('le parole per ricominciare e per chi non può salvare', () => {
  it('la seconda domanda dice quanto si perde, con le parole giuste', () => {
    expect(perderai(76, 2)).toBe('Perderai 76 scoperte e 2 miscele. Sicuro?');
    expect(perderai(1, 1)).toBe('Perderai 1 scoperta e 1 miscela. Sicuro?');
    expect(perderai(12, 0)).toBe('Perderai 12 scoperte. Sicuro?');
    expect(perderai(0, 3)).toBe('Perderai 3 miscele. Sicuro?');
    expect(perderai(0, 0)).toContain('non perdi niente');
  });

  it('niente gergo, e frasi brevi', () => {
    const frasi = [NON_SALVATA, NON_SALVATA_BENVENUTO, ...Object.values(RICOMINCIA), ...Object.values(ARRIVA), perderai(5, 5), perderai(0, 0)];
    for (const frase of frasi) {
      expect(frase.length).toBeLessThanOrEqual(120);
      expect(frase).not.toMatch(/agente|prompt|token|\bapi\b|bug|sprite|render|errore|localstorage|storage|cache/i);
    }
    // I due tasti della seconda domanda non si somigliano.
    expect(RICOMINCIA.tieni).not.toBe(RICOMINCIA.si);
  });
});
