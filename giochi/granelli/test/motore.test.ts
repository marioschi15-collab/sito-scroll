import { describe, expect, it } from 'vitest';
import { M, N_MATERIALI, NASCOSTO, OMINO, VILLAGGIO } from '../src/motore/materiali.js';
import { Mondo } from '../src/motore/mondo.js';
import { terreno } from '../src/motore/terreno.js';
import { fotografa, impacchetta, ripristina, spacchetta } from '../src/salvataggio.js';
import { INIZIALI, SCOPERTE } from '../src/scoperte.js';

function mondo(w = 60, h = 60, seme = 7): Mondo {
  const m = new Mondo(w, h, seme);
  for (const t of INIZIALI) m.visti.add(t);
  return m;
}
function riempi(m: Mondo, x0: number, y0: number, x1: number, y1: number, t: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.metti(y * m.w + x, t);
}
function gira(m: Mondo, n: number): void {
  for (let i = 0; i < n; i++) m.passo();
}
function quanti(m: Mondo, t: number): number {
  let n = 0;
  for (const v of m.tipo) if (v === t) n++;
  return n;
}
/** Versa un materiale per un po', come farebbe un dito tenuto premuto. */
function versaPer(m: Mondo, x: number, y: number, t: number, tic: number, raggio = 3): void {
  for (let i = 0; i < tic; i++) {
    m.versa(x, y, raggio, t);
    m.passo();
  }
}

describe('i materiali da soli', () => {
  it('la terra cade e si ammucchia sul fondo', () => {
    const m = mondo();
    riempi(m, 28, 5, 32, 9, M.TERRA);
    gira(m, 120);
    expect(quanti(m, M.TERRA)).toBe(25);
    for (let y = 0; y < 40; y++) for (let x = 0; x < m.w; x++) expect(m.leggi(x, y)).toBe(M.VUOTO);
  });

  it('l’acqua si livella', () => {
    const m = mondo();
    riempi(m, 28, 30, 31, 49, M.ACQUA);
    gira(m, 600);
    const righe = new Set<number>();
    for (let i = 0; i < m.tipo.length; i++) if (m.tipo[i] === M.ACQUA) righe.add((i / m.w) | 0);
    expect(quanti(m, M.ACQUA)).toBe(80);
    expect(righe.size).toBeLessThanOrEqual(3);
  });

  it('il fuoco lasciato solo si spegne', () => {
    const m = mondo();
    riempi(m, 20, 40, 40, 50, M.FUOCO);
    gira(m, 400);
    expect(quanti(m, M.FUOCO)).toBe(0);
  });
});

describe('le scoperte', () => {
  it('acqua sul fuoco fa vapore', () => {
    const m = mondo();
    riempi(m, 20, 55, 40, 59, M.ACQUA);
    versaPer(m, 30, 53, M.FUOCO, 60);
    expect(m.visti.has(M.VAPORE)).toBe(true);
  });

  it('acqua sulla terra fa fango', () => {
    const m = mondo();
    riempi(m, 20, 50, 40, 59, M.TERRA);
    riempi(m, 25, 40, 35, 44, M.ACQUA);
    gira(m, 300);
    expect(quanti(m, M.FANGO)).toBeGreaterThan(10);
  });

  it('aria sulla terra fa sabbia, aria sul fango fa argilla', () => {
    const m = mondo();
    riempi(m, 5, 50, 25, 59, M.TERRA);
    riempi(m, 35, 50, 55, 59, M.FANGO);
    for (let i = 0; i < 200; i++) {
      m.versa(15, 47, 3, M.ARIA);
      m.versa(45, 47, 3, M.ARIA);
      m.passo();
    }
    expect(m.visti.has(M.SABBIA)).toBe(true);
    expect(m.visti.has(M.ARGILLA)).toBe(true);
  });

  it('fuoco insistito sulla terra fa lava; la lava con l’acqua fa pietra', () => {
    const m = mondo();
    riempi(m, 10, 50, 50, 59, M.TERRA);
    versaPer(m, 30, 47, M.FUOCO, 400);
    expect(m.visti.has(M.LAVA)).toBe(true);
    versaPer(m, 30, 40, M.ACQUA, 200);
    expect(m.visti.has(M.PIETRA)).toBe(true);
  });

  it('il vapore sale e diventa nuvola; la nuvola fa piovere', () => {
    const m = mondo();
    riempi(m, 20, 40, 40, 50, M.VAPORE);
    gira(m, 300);
    expect(m.visti.has(M.NUVOLA)).toBe(true);
    const prima = quanti(m, M.ACQUA);
    gira(m, 3000);
    expect(quanti(m, M.ACQUA)).toBeGreaterThan(prima);
  });

  it('il fulmine sulla sabbia fa vetro e incendia il legno', () => {
    const m = mondo();
    riempi(m, 0, 55, 29, 59, M.SABBIA);
    riempi(m, 30, 55, 59, 59, M.LEGNO);
    m.fulmine(15, 0);
    m.fulmine(45, 0);
    expect(m.visti.has(M.FULMINE)).toBe(true);
    expect(quanti(m, M.VETRO)).toBeGreaterThan(0);
    gira(m, 600);
    expect(m.visti.has(M.CENERE)).toBe(true);
    expect(quanti(m, M.FULMINE)).toBe(0);
  });

  it('una nuvola grande e fitta prima o poi scarica un fulmine', () => {
    const m = mondo(80, 80);
    for (let giro = 0; giro < 40 && !m.visti.has(M.FULMINE); giro++) {
      riempi(m, 5, 1, 74, 9, M.NUVOLA);
      gira(m, 300);
    }
    expect(m.visti.has(M.FULMINE)).toBe(true);
  });

  it('argilla cotta fa mattone', () => {
    const m = mondo();
    riempi(m, 20, 55, 40, 59, M.ARGILLA);
    versaPer(m, 30, 52, M.FUOCO, 200);
    expect(m.visti.has(M.MATTONE)).toBe(true);
  });

  it('dal fango nascono piante e alberi; bruciati lasciano cenere, e la cenere rende fertile la terra', () => {
    const m = mondo(80, 80);
    riempi(m, 0, 70, 79, 79, M.FANGO);
    gira(m, 6000);
    expect(m.visti.has(M.PIANTA)).toBe(true);
    expect(m.visti.has(M.LEGNO)).toBe(true);
    versaPer(m, 40, 66, M.FUOCO, 300, 6);
    gira(m, 600);
    expect(m.visti.has(M.CENERE)).toBe(true);
    expect(m.visti.has(M.FUMO)).toBe(true);
    riempi(m, 0, 40, 79, 44, M.TERRA);
    riempi(m, 0, 35, 79, 37, M.CENERE);
    gira(m, 600);
    expect(m.visti.has(M.HUMUS)).toBe(true);
  });

  it('aria nella nuvola fa neve; neve e acqua fanno ghiaccio; lava e neve fanno ossidiana', () => {
    const m = mondo();
    riempi(m, 10, 2, 50, 6, M.NUVOLA);
    riempi(m, 0, 57, 29, 59, M.ACQUA);
    riempi(m, 30, 57, 59, 59, M.PIETRA);
    versaPer(m, 30, 9, M.ARIA, 200, 4);
    expect(m.visti.has(M.NEVE)).toBe(true);
    riempi(m, 5, 40, 25, 42, M.NEVE);
    gira(m, 300);
    expect(m.visti.has(M.GHIACCIO)).toBe(true);
    riempi(m, 35, 50, 55, 52, M.NEVE);
    gira(m, 60);
    riempi(m, 35, 40, 55, 42, M.LAVA);
    gira(m, 300);
    expect(m.visti.has(M.OSSIDIANA)).toBe(true);
  });

  it('ogni voce del libro ha nome, indizio e ricetta; le iniziali non hanno indizio', () => {
    const ids = new Set(SCOPERTE.map((s) => s.id));
    expect(ids.size).toBe(SCOPERTE.length);
    for (const s of SCOPERTE) {
      expect(s.nome.length).toBeGreaterThan(0);
      expect(s.ricetta.length).toBeGreaterThan(0);
      if (!INIZIALI.includes(s.id)) expect(s.indizio.length).toBeGreaterThan(0);
    }
    // Ogni materiale che si può scoprire ha la sua voce; brace e roccia non sono scoperte e non ne hanno.
    for (let t = 1; t < N_MATERIALI; t++) expect(ids.has(t)).toBe(!NASCOSTO[t]);
  });
});

describe('il mondo appena nato', () => {
  it('ha un fondo di sola roccia, con il cielo libero sopra, e la roccia non è una scoperta', () => {
    for (const [w, h] of [
      [140, 215],
      [267, 112],
    ]) {
      const m = mondo(w, h, 11);
      terreno(m);
      let roccia = 0;
      for (const t of m.tipo) {
        if (t === M.ROCCIA) roccia++;
        else expect(t).toBe(M.VUOTO);
      }
      expect(roccia).toBeGreaterThan(w * 2);
      expect(roccia).toBeLessThan(w * h * 0.25);
      expect(m.novita.length).toBe(0);
      expect(m.visti.has(M.ROCCIA)).toBe(false);
      // Ogni colonna è piena dal fondo fino alla sua cima, e tra una colonna e l'altra il gradino è al più di due celle.
      const cime: number[] = [];
      for (let x = 0; x < w; x++) {
        let y = 0;
        while (m.leggi(x, y) === M.VUOTO) y++;
        for (let sotto = y; sotto < h; sotto++) expect(m.leggi(x, sotto)).toBe(M.ROCCIA);
        expect(y).toBeGreaterThan(h * 0.7);
        cime.push(y);
      }
      for (let x = 1; x < w; x++) expect(Math.abs(cime[x] - cime[x - 1])).toBeLessThanOrEqual(2);
    }
  });

  it('due mondi nati da semi diversi hanno profili diversi; la roccia regge quello che le cade sopra', () => {
    const a = mondo(140, 215, 1);
    const b = mondo(140, 215, 2);
    terreno(a);
    terreno(b);
    expect([...a.tipo]).not.toEqual([...b.tipo]);
    const rocciaPrima = quanti(a, M.ROCCIA);
    riempi(a, 20, 20, 120, 40, M.SABBIA);
    riempi(a, 20, 50, 120, 60, M.ACQUA);
    riempi(a, 60, 70, 80, 75, M.LAVA);
    gira(a, 600);
    expect(quanti(a, M.ROCCIA)).toBe(rocciaPrima);
    expect(quanti(a, M.SABBIA)).toBeGreaterThan(1500);
  });
});

describe('gli omini', () => {
  function giardino(): Mondo {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.PIETRA);
    riempi(m, 10, 48, 30, 49, M.ACQUA);
    riempi(m, 9, 48, 9, 49, M.PIETRA);
    riempi(m, 31, 48, 31, 49, M.PIETRA);
    riempi(m, 40, 47, 90, 49, M.PIANTA);
    return m;
  }

  it('arrivano da soli quando ci sono acqua, piante e pietra', () => {
    const m = giardino();
    riempi(m, 40, 44, 90, 46, M.PIANTA);
    riempi(m, 10, 43, 30, 47, M.ACQUA);
    riempi(m, 9, 43, 9, 47, M.PIETRA);
    riempi(m, 31, 43, 31, 47, M.PIETRA);
    gira(m, 400);
    expect(m.visti.has(OMINO)).toBe(true);
    expect(m.omini.length).toBeGreaterThanOrEqual(2);
  });

  it('non arrivano in un mondo vuoto', () => {
    const m = mondo();
    gira(m, 600);
    expect(m.omini.length).toBe(0);
  });

  it('vivono, si moltiplicano e fondano un villaggio', () => {
    const m = giardino();
    m.aggiungiOmino(35, 49);
    m.aggiungiOmino(36, 49);
    gira(m, 20000);
    expect(m.omini.length).toBeGreaterThan(0);
    expect(m.visti.has(VILLAGGIO)).toBe(true);
    for (const o of m.omini) expect(m.dentro(o.x, o.y)).toBe(true);
  });

  it('muoiono nel fuoco e senza acqua', () => {
    const m = mondo();
    riempi(m, 0, 50, 59, 59, M.PIETRA);
    m.aggiungiOmino(30, 49);
    riempi(m, 26, 46, 34, 49, M.LAVA);
    gira(m, 40);
    expect(m.omini.length).toBe(0);
    m.aggiungiOmino(10, 49);
    riempi(m, 20, 40, 40, 49, M.PIETRA);
    gira(m, 9000);
    expect(m.omini.length).toBe(0);
  });
});

describe('tenuta', () => {
  it('un minestrone di tutto, per migliaia di istanti, non rompe il mondo', () => {
    const m = mondo(90, 70, 99);
    terreno(m);
    for (let giro = 0; giro < 6000; giro++) {
      if (giro % 5 === 0) {
        const t = 1 + ((m.caso() * (N_MATERIALI - 1)) | 0);
        if (!NASCOSTO[t]) m.versa((m.caso() * m.w) | 0, (m.caso() * m.h) | 0, 4, t);
      }
      if (giro % 400 === 0) m.aggiungiOmino((m.caso() * m.w) | 0, 5);
      if (giro % 900 === 0) m.cancella((m.caso() * m.w) | 0, (m.caso() * m.h) | 0, 6);
      m.passo();
    }
    for (const t of m.tipo) expect(t).toBeLessThan(N_MATERIALI);
    for (const o of m.omini) expect(m.dentro(o.x, o.y)).toBe(true);
  });

  it('il salvataggio riporta lo stesso mondo', () => {
    const m = mondo();
    riempi(m, 10, 50, 50, 59, M.TERRA);
    riempi(m, 20, 30, 40, 35, M.ACQUA);
    m.aggiungiOmino(30, 20);
    gira(m, 100);
    const copia = spacchetta(impacchetta(m));
    expect(copia).not.toBeNull();
    expect([...copia!.tipo]).toEqual([...m.tipo]);
    expect([...copia!.dato]).toEqual([...m.dato]);
    expect([...copia!.visti].sort()).toEqual([...m.visti].sort());
    expect(copia!.omini).toEqual(m.omini);
    expect(ripristina(fotografa(m))?.omini).toEqual(m.omini);
    expect(ripristina({})).toBeNull();
    expect(ripristina(null)).toBeNull();
    expect(spacchetta('non è un salvataggio')).toBeNull();
    expect(spacchetta('{"v":1,"w":5,"h":5,"tipo":"AA==","dato":"","tinta":"","visti":[],"omini":[]}')).toBeNull();
  });

  it('un passo del mondo resta veloce anche con il mondo pieno di cose che si muovono', () => {
    const m = mondo(280, 160, 5);
    riempi(m, 0, 100, 279, 159, M.SABBIA);
    riempi(m, 0, 60, 279, 90, M.ACQUA);
    riempi(m, 0, 20, 279, 30, M.VAPORE);
    gira(m, 30);
    const t0 = performance.now();
    gira(m, 200);
    const perPasso = (performance.now() - t0) / 200;
    // Su un computer è intorno al millisecondo: il limite largo serve a scoprire un rallentamento grave, non a cronometrare.
    expect(perPasso).toBeLessThan(15);
  });
});
