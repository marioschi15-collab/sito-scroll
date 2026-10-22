import { describe, expect, it } from 'vitest';
import { ALFABETO_PAIRING, creaGestorePairing, generaCodicePairing, MAX_PAIRING_IN_ATTESA, normalizzaCodice, SCADENZA_PAIRING_MS } from '../src/nucleo/telegram/pairing.js';
import { STATO_INIZIALE, type StatoTelegram } from '../src/nucleo/telegram/stato.js';

function statoNuovo(): StatoTelegram {
  return { ...STATO_INIZIALE, proprietari: [], pairing: [] };
}

describe('codici di collegamento', () => {
  it('6 caratteri, senza l, o, 0', () => {
    expect(ALFABETO_PAIRING).not.toMatch(/[lo0]/);
    for (let i = 0; i < 200; i++) {
      const c = generaCodicePairing();
      expect(c).toHaveLength(6);
      expect(c).toMatch(/^[a-km-np-z1-9]{6}$/);
    }
  });

  it('richiedi riusa il codice dello stesso utente e tiene al massimo 3 in attesa (scarta il più vecchio)', () => {
    let ora = 1_000_000;
    const stato = statoNuovo();
    const gestore = creaGestorePairing(stato, () => ora);
    const a = gestore.richiedi({ utenteId: 1, chatId: 1, nomeMostrato: 'A' });
    expect(gestore.richiedi({ utenteId: 1, chatId: 1, nomeMostrato: 'A' }).codice).toBe(a.codice);
    ora += 1000;
    gestore.richiedi({ utenteId: 2, chatId: 2, nomeMostrato: 'B' });
    ora += 1000;
    gestore.richiedi({ utenteId: 3, chatId: 3, nomeMostrato: 'C' });
    ora += 1000;
    gestore.richiedi({ utenteId: 4, chatId: 4, nomeMostrato: 'D' });
    expect(gestore.inAttesa()).toHaveLength(MAX_PAIRING_IN_ATTESA);
    expect(gestore.inAttesa().map((p) => p.utenteId)).toEqual([2, 3, 4]);
    expect(gestore.conferma(a.codice)).toEqual({ ok: false, motivo: 'non_valido' });
  });

  it('conferma promuove a proprietario e svuota la lista; il codice scade dopo un\'ora', () => {
    let ora = 1_000_000;
    const stato = statoNuovo();
    const gestore = creaGestorePairing(stato, () => ora);
    const p = gestore.richiedi({ utenteId: 42, chatId: 42, nomeMostrato: 'Marco' });
    gestore.richiedi({ utenteId: 43, chatId: 43, nomeMostrato: 'Altro' });
    expect(gestore.conferma('xxxxxx')).toEqual({ ok: false, motivo: 'non_valido' });
    const esito = gestore.conferma(` ${p.codice.toUpperCase()} `);
    expect(esito.ok).toBe(true);
    expect(stato.proprietari).toEqual([42]);
    expect(stato.pairing).toEqual([]);

    const q = creaGestorePairing(stato, () => ora).richiedi({ utenteId: 7, chatId: 7, nomeMostrato: 'Tardi' });
    ora += SCADENZA_PAIRING_MS + 1;
    expect(creaGestorePairing(stato, () => ora).conferma(q.codice)).toEqual({ ok: false, motivo: 'scaduto' });
    expect(stato.proprietari).toEqual([42]);
  });

  it('normalizza spazi, maiuscole e la "l" digitata per "1"', () => {
    expect(normalizzaCodice(' AB1-2cd ')).toBe('ab12cd');
    expect(normalizzaCodice('abl2cd')).toBe('ab12cd');
  });
});
