import { describe, expect, it } from 'vitest';
import { ALBA, ARCOBALENO, ESPLOSIONE, FIORE, LAGO, M, N_BASE, NASCOSTO, NOTTE, PIOGGIA } from '../src/motore/materiali.js';
import { INIZIALI, SCOPERTE } from '../src/scoperte.js';
import { gira, mondo, quanti, riempi, versaPer } from './aiuti.js';

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
      expect(s.descrizione.length).toBeGreaterThan(20);
      if (!INIZIALI.includes(s.id)) expect(s.indizio.length).toBeGreaterThan(0);
    }
    // Ogni materiale che si può scoprire ha la sua voce; brace e roccia non sono scoperte e non ne hanno.
    for (let t = 1; t < N_BASE; t++) expect(ids.has(t)).toBe(!NASCOSTO[t]);
    for (const s of SCOPERTE) for (const ricetta of s.nasce) for (const id of ricetta.con) expect(ids.has(id)).toBe(true);
  });
});

describe('le scoperte nuove', () => {
  it('il legno bruciato soffocato lascia carbone; carbone e fulmine fanno diamante', () => {
    const m = mondo();
    riempi(m, 20, 50, 40, 59, M.LEGNO);
    for (let x = 20; x <= 40; x++) m.accendi(59 * m.w + x);
    for (let x = 20; x <= 40; x++) m.accendi(55 * m.w + x);
    gira(m, 1500);
    expect(m.visti.has(M.CARBONE)).toBe(true);
    riempi(m, 5, 30, 12, 30, M.CARBONE);
    gira(m, 60);
    for (let x = 0; x < 20; x++) m.fulmine(x, 0);
    expect(m.visti.has(M.DIAMANTE)).toBe(true);
  });

  it('la lava tira fuori il metallo dalla pietra; il metallo bagnato arrugginisce', () => {
    const m = mondo();
    riempi(m, 10, 52, 50, 59, M.PIETRA);
    for (let giro = 0; giro < 6 && !m.visti.has(M.METALLO); giro++) {
      riempi(m, 10, 48, 50, 51, M.LAVA);
      gira(m, 400);
    }
    expect(m.visti.has(M.METALLO)).toBe(true);
    riempi(m, 10, 20, 50, 22, M.METALLO);
    riempi(m, 10, 17, 50, 19, M.ACQUA);
    gira(m, 1500);
    expect(m.visti.has(M.RUGGINE)).toBe(true);
  });

  it('cenere sulla lava fa zolfo; zolfo e acqua fanno acido; l’acido corrode la pietra ma non il vetro', () => {
    const m = mondo();
    riempi(m, 10, 56, 50, 59, M.LAVA);
    riempi(m, 10, 50, 50, 52, M.CENERE);
    gira(m, 200);
    expect(m.visti.has(M.ZOLFO)).toBe(true);
    const n = mondo();
    riempi(n, 10, 56, 50, 59, M.ZOLFO);
    riempi(n, 10, 50, 50, 54, M.ACQUA);
    gira(n, 400);
    expect(n.visti.has(M.ACIDO)).toBe(true);
    const k = mondo();
    riempi(k, 0, 50, 29, 59, M.PIETRA);
    riempi(k, 30, 50, 59, 59, M.VETRO);
    riempi(k, 0, 44, 59, 49, M.ACIDO);
    gira(k, 1500);
    expect(quanti(k, M.PIETRA)).toBeLessThan(300);
    expect(quanti(k, M.VETRO)).toBe(300);
  });

  it('carbone e zolfo fanno la polvere nera, che col fuoco esplode', () => {
    const m = mondo();
    riempi(m, 20, 56, 40, 59, M.CARBONE);
    riempi(m, 20, 52, 40, 55, M.ZOLFO);
    gira(m, 300);
    expect(m.visti.has(M.POLVERE_NERA)).toBe(true);
    const n = mondo();
    riempi(n, 0, 55, 59, 59, M.PIETRA);
    riempi(n, 20, 50, 40, 54, M.POLVERE_NERA);
    n.aggiungiOmino(30, 49);
    versaPer(n, 23, 48, M.FUOCO, 60, 2);
    gira(n, 200);
    expect(n.visti.has(ESPLOSIONE)).toBe(true);
    expect(n.botti.length).toBeGreaterThan(0);
    expect(quanti(n, M.POLVERE_NERA)).toBeLessThan(40);
    expect(n.omini.length).toBe(0);
  });

  it('la pietra bagnata fa muschio, il fondo fangoso alghe, il legno umido funghi', () => {
    const m = mondo(80, 60);
    riempi(m, 0, 54, 79, 59, M.PIETRA);
    riempi(m, 0, 50, 79, 53, M.ACQUA);
    gira(m, 4000);
    expect(m.visti.has(M.MUSCHIO)).toBe(true);
    const n = mondo(80, 60);
    riempi(n, 0, 54, 79, 59, M.FANGO);
    riempi(n, 0, 44, 79, 53, M.ACQUA);
    gira(n, 3000);
    expect(n.visti.has(M.ALGA)).toBe(true);
    const k = mondo(80, 60);
    riempi(k, 0, 56, 79, 59, M.FANGO);
    riempi(k, 0, 50, 79, 55, M.LEGNO);
    for (let x = 0; x < 80; x += 2) riempi(k, x, 50, x, 55, M.VUOTO);
    gira(k, 6000);
    expect(k.visti.has(M.FUNGO)).toBe(true);
  });

  it('gli alberi fanno fiori e frutti, e dai frutti caduti nascono altri alberi', () => {
    const m = mondo(100, 80);
    riempi(m, 0, 70, 99, 79, M.HUMUS);
    gira(m, 30000);
    expect(m.visti.has(FIORE)).toBe(true);
    expect(m.visti.has(M.FRUTTO)).toBe(true);
    const n = mondo();
    riempi(n, 0, 55, 59, 59, M.FANGO);
    riempi(n, 10, 50, 50, 50, M.FRUTTO);
    gira(n, 6000);
    expect(quanti(n, M.LEGNO)).toBeGreaterThan(0);
  });

  it('pioggia, lago, notte, alba e arcobaleno si scoprono quando succedono', () => {
    const m = mondo(80, 80);
    riempi(m, 0, 60, 79, 79, M.ACQUA);
    riempi(m, 5, 2, 74, 9, M.NUVOLA);
    gira(m, 600);
    expect(m.visti.has(PIOGGIA)).toBe(true);
    expect(m.visti.has(LAGO)).toBe(true);
    expect(m.visti.has(ARCOBALENO)).toBe(true);
    expect(m.arcobaleno).toBeGreaterThan(0);
    expect(m.visti.has(NOTTE)).toBe(false);
    m.tic = 9000;
    gira(m, 240);
    expect(m.visti.has(NOTTE)).toBe(true);
    m.tic = 14400;
    gira(m, 240);
    expect(m.visti.has(ALBA)).toBe(true);
  });
});

describe('lava e carbone', () => {
  it('una pozza di lava lasciata raffreddare diventa quasi tutta pietra: il metallo resta raro', () => {
    let metalloInTutto = 0;
    for (const seme of [1, 2, 3]) {
      const m = mondo(120, 80, seme);
      riempi(m, 0, 60, 119, 79, M.ROCCIA);
      riempi(m, 39, 50, 39, 59, M.ROCCIA);
      riempi(m, 80, 50, 80, 59, M.ROCCIA);
      riempi(m, 40, 52, 79, 59, M.LAVA);
      gira(m, 8000);
      expect(quanti(m, M.LAVA)).toBe(0);
      const pietra = quanti(m, M.PIETRA);
      const metallo = quanti(m, M.METALLO);
      expect(pietra + metallo).toBe(320);
      expect(pietra).toBeGreaterThan(320 * 0.8);
      expect(metallo).toBeLessThan(320 * 0.15);
      metalloInTutto += metallo;
    }
    // Raro, non introvabile: è ancora così che si scopre.
    expect(metalloInTutto).toBeGreaterThan(0);
  });

  it('il carbone nasce solo dalla brace sepolta: un albero che brucia all’aperto lascia cenere, non carbone', () => {
    for (const seme of [1, 2, 3, 4, 5]) {
      const m = mondo(60, 60, seme);
      riempi(m, 0, 55, 59, 59, M.ROCCIA);
      for (const x of [15, 30, 45]) {
        riempi(m, x, 40, x, 54, M.LEGNO);
        riempi(m, x - 2, 36, x + 2, 39, M.PIANTA);
        // acceso dal piede e dalla chioma, come dopo un fulmine
        m.accendi(54 * m.w + x);
        m.accendi(38 * m.w + x);
      }
      gira(m, 3000);
      expect(quanti(m, M.LEGNO), `seme ${seme}`).toBeLessThan(15);
      expect(quanti(m, M.BRACE), `seme ${seme}`).toBe(0);
      expect(m.visti.has(M.CENERE), `seme ${seme}`).toBe(true);
      expect(m.visti.has(M.CARBONE), `seme ${seme}`).toBe(false);
    }
  });

  it('il legno che brucia sepolto sotto la terra, invece, diventa tutto carbone, e il fuoco lì sotto si spegne', () => {
    const m = mondo();
    riempi(m, 10, 50, 50, 59, M.TERRA);
    riempi(m, 20, 54, 40, 56, M.LEGNO);
    // una catasta accesa da un capo solo: il fuoco la percorre tutta, sottoterra
    m.accendi(55 * m.w + 20);
    gira(m, 6000);
    expect(quanti(m, M.LEGNO)).toBe(0);
    expect(quanti(m, M.CARBONE)).toBe(63);
    // Carbone e brace non si riaccendono a vicenda all'infinito: finito il legno, sotto la terra non brucia più niente.
    expect(quanti(m, M.BRACE)).toBe(0);
    // Dissepolto e toccato da una fiamma vera, quel carbone brucia come ogni altro.
    for (let x = 10; x <= 50; x++) for (let y = 50; y <= 53; y++) m.svuota(y * m.w + x);
    versaPer(m, 30, 50, M.FUOCO, 300, 3);
    gira(m, 1500);
    expect(quanti(m, M.CARBONE)).toBeLessThan(40);
  });
});
