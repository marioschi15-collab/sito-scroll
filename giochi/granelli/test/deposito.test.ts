import { describe, expect, it } from 'vitest';
import { Custode, OGNI } from '../src/custode.js';
import { type Spazio, apriDeposito, depositoInMemoria } from '../src/deposito.js';
import { M } from '../src/motore/materiali.js';
import { CHIAVE, RISERVA, carica, impacchetta, salva, tieniDaParte } from '../src/salvataggio.js';
import { libroDa12, mondo, riempi } from './aiuti.js';

/** Uno spazio del browser finto, che si può rompere in vari modi. */
function spazio(guasto: 'niente' | 'scrive' | 'finge' | 'pieno' = 'niente'): Spazio & { dati: Map<string, string> } {
  const dati = new Map<string, string>();
  return {
    dati,
    getItem: (k) => dati.get(k) ?? null,
    setItem: (k, v) => {
      if (guasto === 'scrive') throw new Error('SecurityError');
      if (guasto === 'finge') return;
      if (guasto === 'pieno' && k !== 'granelli-prova' && v.length > 50) throw new Error('QuotaExceededError');
      dati.set(k, v);
    },
    removeItem: (k) => void dati.delete(k),
  };
}

describe('il deposito: dove resta la partita', () => {
  it('nel browser che lascia salvare scrive e rilegge, e non lascia in giro la chiave di prova', () => {
    const s = spazio();
    const d = apriDeposito(() => s);
    expect(d.salvabile).toBe(true);
    expect(d.scrivi('a', 'uno')).toBe(true);
    expect(d.leggi('a')).toBe('uno');
    expect(d.leggi('b')).toBeNull();
    expect([...s.dati.keys()]).toEqual(['a']);
  });

  it('dove il browser vieta di salvare (anche solo chiedere lo spazio lancia un errore) non si rompe niente', () => {
    for (const d of [
      apriDeposito(() => {
        throw new Error('SecurityError: accesso negato');
      }),
      apriDeposito(() => spazio('scrive')),
      apriDeposito(() => spazio('finge')),
    ]) {
      expect(d.salvabile).toBe(false);
      // Si gioca lo stesso: finché la pagina è aperta, quello che si scrive si rilegge.
      expect(d.scrivi(CHIAVE, 'partita')).toBe(true);
      expect(d.leggi(CHIAVE)).toBe('partita');
      // E l'avvio trova semplicemente una partita nuova.
      expect(carica(depositoInMemoria())).toEqual({ dati: null, ripresa: null });
    }
  });

  it('se lo spazio finisce durante la partita, lo dice e tiene l’ultima versione in memoria', () => {
    const s = spazio('pieno');
    const d = apriDeposito(() => s);
    expect(d.salvabile).toBe(true);
    expect(d.scrivi('a', 'corto')).toBe(true);
    expect(d.scrivi('a', 'x'.repeat(80))).toBe(false);
    expect(d.salvabile).toBe(false);
    expect(d.leggi('a')).toBe('x'.repeat(80));
    expect(s.dati.get('a')).toBe('corto');
    // Se poi si riesce di nuovo a scrivere, si torna a salvare davvero.
    expect(d.scrivi('a', 'ancora')).toBe(true);
    expect(d.salvabile).toBe(true);
    expect(d.leggi('a')).toBe('ancora');
  });
});

describe('la copia di riserva', () => {
  it('un salvataggio che non si legge tutto viene messo da parte prima che il gioco lo sovrascriva', () => {
    const m = libroDa12(mondo());
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    const buono = impacchetta(m);
    for (const rovinato of ['{non è una partita', JSON.stringify({ ...JSON.parse(buono), cose: [null] })]) {
      const d = apriDeposito(() => spazio());
      d.scrivi(CHIAVE, rovinato);
      const trovata = carica(d);
      expect(d.leggi(RISERVA)).toBe(rovinato);
      // Il gioco può salvare sopra: la copia resta.
      salva(d, m);
      expect(d.leggi(CHIAVE)).not.toBe(rovinato);
      expect(d.leggi(RISERVA)).toBe(rovinato);
      if (rovinato.startsWith('{non')) expect(trovata.ripresa).toBeNull();
      else expect(trovata.ripresa?.mondo.visti.size).toBe(m.visti.size);
    }
    // Un salvataggio buono non tocca la riserva.
    const d = apriDeposito(() => spazio());
    d.scrivi(CHIAVE, buono);
    expect(carica(d).ripresa?.intatta).toBe(true);
    expect(d.leggi(RISERVA)).toBeNull();
  });

  it('prima di ricominciare si tiene da parte la partita di adesso', () => {
    const m = libroDa12(mondo());
    const d = apriDeposito(() => spazio());
    expect(tieniDaParte(d)).toBe(false);
    salva(d, m, { recenti: [1] });
    expect(tieniDaParte(d)).toBe(true);
    expect(d.leggi(RISERVA)).toBe(d.leggi(CHIAVE));
    m.visti.add(M.FANGO);
    expect(tieniDaParte(d, m, { recenti: [2] })).toBe(true);
    expect(JSON.parse(d.leggi(RISERVA)!).visti).toContain(M.FANGO);
  });
});

/** Un custode con un orologio finto: `scritte` conta le scritture, `avanza` fa passare il tempo. */
function custodeFinto() {
  let ora = 10_000;
  let attese: { quando: number; fai: () => void }[] = [];
  const scritte: number[] = [];
  const c = new Custode({
    ora: () => ora,
    richiama: (fai, ms) => attese.push({ quando: ora + ms, fai }),
    scrivi: () => scritte.push(ora),
  });
  // Il tempo passa: ogni richiamo scatta proprio nel suo istante, come farebbe l'orologio della pagina.
  const avanza = (ms: number): void => {
    const fine = ora + ms;
    for (;;) {
      const prossima = attese.filter((a) => a.quando <= fine).sort((a, b) => a.quando - b.quando)[0];
      if (!prossima) break;
      attese = attese.filter((a) => a !== prossima);
      ora = prossima.quando;
      prossima.fai();
    }
    ora = fine;
  };
  return { c, scritte, avanza };
}

describe('il custode: quando salvare', () => {
  it('dieci richieste in un secondo diventano due scritture: subito la prima, dopo due secondi il resto', () => {
    const { c, scritte, avanza } = custodeFinto();
    for (let k = 0; k < 10; k++) {
      c.chiedi();
      avanza(100);
    }
    expect(scritte).toEqual([10_000]);
    expect(c.daScrivere).toBe(true);
    avanza(OGNI);
    expect(scritte).toEqual([10_000, 10_000 + OGNI]);
    expect(c.daScrivere).toBe(false);
    avanza(10 * OGNI);
    expect(scritte.length).toBe(2);
  });

  it('durante un gesto non si scrive; alla fine del gesto sì', () => {
    const { c, scritte, avanza } = custodeFinto();
    c.gesto(true);
    c.chiedi();
    avanza(5 * OGNI);
    expect(scritte).toEqual([]);
    c.gesto(false);
    expect(scritte.length).toBe(1);
  });

  it('quando la pagina va via si scrive subito, anche a metà di un gesto e anche senza richieste', () => {
    const { c, scritte } = custodeFinto();
    c.chiedi();
    c.gesto(true);
    c.chiedi();
    c.subito();
    expect(scritte.length).toBe(2);
    c.subito();
    expect(scritte.length).toBe(3);
  });
});
