import { describe, expect, it } from 'vitest';
import {
  ALBA,
  ARCOBALENO,
  BAMBINO,
  ESPLOSIONE,
  FIORE,
  GAS,
  LAGO,
  M,
  N_BASE,
  NASCOSTO,
  NOTTE,
  OMINO,
  PIOGGIA,
  PRIMA_ID_MISCELA,
  PRIMA_MISCELA,
  VILLAGGIO,
} from '../src/motore/materiali.js';
import { C, CONSEGUENZE, E, ERE, vieDi } from '../src/motore/cose.js';
import { idMiscela, tratti } from '../src/motore/miscele.js';
import { descriviMiscela, etichette } from '../src/motore/nomi.js';
import { Mondo } from '../src/motore/mondo.js';
import { terreno } from '../src/motore/terreno.js';
import { extraDi, fotografa, impacchetta, ripristina, spacchetta } from '../src/salvataggio.js';
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

describe('il mestolo e le miscele', () => {
  it('una coppia già nota dà il suo risultato: terra e acqua, fango', () => {
    const m = mondo();
    riempi(m, 20, 50, 40, 59, M.TERRA);
    riempi(m, 20, 45, 40, 49, M.PIETRA);
    riempi(m, 20, 40, 40, 44, M.ACQUA);
    // acqua e pietra si toccano; la terra sotto la pietra no
    const nati = new Set<number>();
    for (let k = 0; k < 40; k++) m.mescola(30, 44, 3, nati);
    expect(m.visti.has(M.MUSCHIO)).toBe(true);
    expect(m.ricettario.size).toBe(0);
  });

  it('una coppia senza risultato scritto dà una miscela nuova, con nome, carattere e posto nel mondo', () => {
    const m = mondo();
    riempi(m, 20, 50, 40, 59, M.SABBIA);
    riempi(m, 20, 45, 40, 49, M.LEGNO);
    const nati = new Set<number>();
    for (let k = 0; k < 20; k++) m.mescola(30, 49, 6, nati);
    const id = idMiscela(M.SABBIA, M.LEGNO);
    expect(id).toBeGreaterThanOrEqual(PRIMA_ID_MISCELA);
    expect(idMiscela(M.LEGNO, M.SABBIA)).toBe(id);
    expect(m.visti.has(id)).toBe(true);
    const ricetta = m.ricettario.get(id)!;
    expect([ricetta.a, ricetta.b]).toEqual([M.SABBIA, M.LEGNO]);
    expect(ricetta.nome.split(' ').length).toBeGreaterThanOrEqual(2);
    const t = m.tipoPer(id);
    expect(t).toBeGreaterThanOrEqual(PRIMA_MISCELA);
    expect(quanti(m, t)).toBeGreaterThan(0);
    const s = m.sostanzaDi(id)!;
    expect(tratti(s).length).toBeGreaterThan(0);
    expect(etichette(s).length).toBeGreaterThan(1);
    expect(descriviMiscela(s).length).toBeGreaterThan(20);
    expect(m.generazione(id)).toBe(1);
    // nello stesso gesto la miscela appena nata non si rimescola con ciò che ha intorno
    expect(m.ricettario.size).toBe(1);
    // con gesti nuovi sì: una miscela nuova per gesto, fino alla seconda generazione
    for (let gesto = 0; gesto < 6; gesto++) {
      const prima = m.ricettario.size;
      const nati2 = new Set<number>();
      for (let k = 0; k < 30; k++) m.mescola(30, 49, 8, nati2);
      expect(m.ricettario.size - prima).toBeLessThanOrEqual(1);
    }
    expect(m.ricettario.size).toBeGreaterThan(1);
    expect(Math.max(...[...m.ricettario.keys()].map((k) => m.generazione(k)))).toBeGreaterThan(1);
    gira(m, 600);
  });

  it('la stessa coppia dà sempre la stessa miscela; coppie diverse danno miscele e nomi diversi', () => {
    const a = mondo();
    const b = mondo(60, 60, 99);
    const nomi = new Set<string>();
    let conTratti = 0;
    for (let x = 1; x < N_BASE; x++) {
      for (let y = x + 1; y < N_BASE; y++) {
        const id = a.registra(x, y);
        if (id < 0) continue;
        expect(b.registra(y, x)).toBe(id);
        expect(b.sostanzaDi(id)).toEqual(a.sostanzaDi(id));
        nomi.add(a.ricettario.get(id)!.nome);
        if (tratti(a.sostanzaDi(id)!).length > 0) conTratti++;
      }
    }
    expect(a.ricettario.size).toBeGreaterThan(400);
    expect(nomi.size).toBe(a.ricettario.size);
    expect(conTratti).toBe(a.ricettario.size);
    expect(a.registra(M.TERRA, M.TERRA)).toBe(-1);
    expect(a.registra(M.TERRA, M.ROCCIA)).toBe(-1);
  });

  it('le miscele si comportano secondo il loro carattere', () => {
    const m = mondo(80, 70);
    // cerco tra le miscele dei materiali una gassosa, una liquida e una polvere: devono muoversi come tali
    let gas = -1;
    let liquido = -1;
    let polvere = -1;
    for (let x = 1; x < N_BASE && (gas < 0 || liquido < 0 || polvere < 0); x++) {
      for (let y = x + 1; y < N_BASE; y++) {
        const id = m.registra(x, y);
        if (id < 0) continue;
        const s = m.sostanzaDi(id)!;
        if (s.vivo > 0.6 || s.corrode > 0.6 || s.esplode > 0.6) continue;
        if (s.stato === GAS && gas < 0) gas = id;
        if (s.stato === 2 && liquido < 0) liquido = id;
        if (s.stato === 1 && polvere < 0) polvere = id;
      }
    }
    expect(Math.min(gas, liquido, polvere)).toBeGreaterThan(0);
    const tg = m.tipoPer(gas);
    const tl = m.tipoPer(liquido);
    const tp = m.tipoPer(polvere);
    riempi(m, 60, 60, 79, 69, M.PIETRA);
    riempi(m, 30, 20, 40, 25, tp);
    riempi(m, 5, 20, 8, 39, tl);
    riempi(m, 55, 40, 58, 44, tg);
    gira(m, 500);
    for (let i = 0; i < m.tipo.length; i++) {
      const y = (i / m.w) | 0;
      if (m.tipo[i] === tp) expect(y).toBeGreaterThan(55);
    }
    const righe = new Set<number>();
    for (let i = 0; i < m.tipo.length; i++) if (m.tipo[i] === tl) righe.add((i / m.w) | 0);
    expect(righe.size).toBeLessThanOrEqual(4);
    expect(quanti(m, tg)).toBe(0);
  });

  it('nel mondo stanno al più 192 miscele diverse: una che non c’è più lascia il posto a una nuova', () => {
    const m = mondo(20, 20);
    let fatte = 0;
    for (let x = 1; x < N_BASE && fatte < 192; x++) {
      for (let y = x + 1; y < N_BASE && fatte < 192; y++) {
        const id = m.registra(x, y);
        if (id < 0) continue;
        const t = m.tipoPer(id);
        expect(t).toBeGreaterThanOrEqual(PRIMA_MISCELA);
        m.tipo[fatte % 400] = t;
        fatte++;
      }
    }
    expect(fatte).toBe(192);
    const altra = m.registra(M.DIAMANTE, M.FRUTTO);
    expect(m.tipoPer(altra)).toBe(-1);
    expect(m.pieno).toBe(true);
    m.tipo.fill(0);
    expect(m.tipoPer(altra)).toBeGreaterThanOrEqual(PRIMA_MISCELA);
    expect(m.pieno).toBe(false);
  });

  it('il salvataggio ricorda le miscele, i loro posti e quello che la pagina gli affida', () => {
    const m = mondo();
    riempi(m, 20, 50, 40, 59, M.SABBIA);
    riempi(m, 20, 45, 40, 49, M.LEGNO);
    for (let k = 0; k < 20; k++) m.mescola(30, 49, 6, new Set());
    const foto = JSON.parse(JSON.stringify(fotografa(m, { recenti: [1, 2] })));
    const copia = ripristina(foto)!;
    expect([...copia.tipo]).toEqual([...m.tipo]);
    expect([...copia.ricettario]).toEqual([...m.ricettario]);
    expect(copia.idTipo).toEqual(m.idTipo);
    expect([...copia.visti]).toEqual([...m.visti]);
    expect(extraDi(foto)).toEqual({ recenti: [1, 2] });
    gira(copia, 300);
  });

  it('nasce il primo bambino', () => {
    const m = mondo(100, 60);
    riempi(m, 0, 50, 99, 59, M.PIETRA);
    riempi(m, 10, 48, 30, 49, M.ACQUA);
    riempi(m, 9, 48, 9, 49, M.PIETRA);
    riempi(m, 31, 48, 31, 49, M.PIETRA);
    riempi(m, 40, 47, 90, 49, M.PIANTA);
    m.aggiungiOmino(35, 49);
    m.aggiungiOmino(36, 49);
    gira(m, 12000);
    expect(m.visti.has(BAMBINO)).toBe(true);
  });
});

describe('unire due scoperte', () => {
  it('pietra e legno fanno l’utensile, e con lui comincia l’età della pietra', () => {
    const m = mondo();
    expect(m.unisci(M.PIETRA, M.LEGNO)).toBe(-1);
    m.visti.add(M.PIETRA).add(M.LEGNO);
    expect(m.unisci(M.LEGNO, M.PIETRA)).toBe(C.UTENSILE);
    expect(m.visti.has(C.UTENSILE)).toBe(true);
    expect(m.visti.has(E.PIETRA)).toBe(true);
    expect(m.novita.map((n) => n.id)).toEqual([C.UTENSILE, E.PIETRA]);
    // due materiali senza un'unione scritta danno la loro miscela; un'invenzione con qualcosa a caso, niente
    m.visti.add(M.SABBIA);
    expect(m.unisci(M.SABBIA, M.LEGNO)).toBe(idMiscela(M.SABBIA, M.LEGNO));
    expect(m.unisci(C.UTENSILE, M.SABBIA)).toBe(-1);
    expect(m.unisci(M.PIETRA, M.PIETRA)).toBe(-1);
  });

  it('ogni invenzione si può raggiungere partendo dai quattro elementi, e ha la sua voce nel libro', () => {
    const raggiunte = new Set<number>([...INIZIALI]);
    // quello che il mondo dei granelli sa far nascere da sé
    for (const s of SCOPERTE) if (s.sezione !== 'cose' && s.sezione !== 'ere') raggiunte.add(s.id);
    for (let giro = 0; giro < 12; giro++) {
      for (const id of Object.values(C)) if (vieDi(id).some(([a, b]) => raggiunte.has(a) && raggiunte.has(b))) raggiunte.add(id);
    }
    for (const id of Object.values(C)) {
      expect(raggiunte.has(id), `invenzione ${id}`).toBe(true);
      expect(SCOPERTE.some((s) => s.id === id)).toBe(true);
    }
    for (const id of Object.values(E)) expect(SCOPERTE.some((s) => s.id === id)).toBe(true);
    for (const id of ERE) expect(CONSEGUENZE.some(([, allora]) => allora === id)).toBe(true);
  });

  it('una cosa posata cade fino a terra, si salva con la partita e la gomma la toglie', () => {
    const m = mondo(80, 60);
    riempi(m, 0, 50, 79, 59, M.PIETRA);
    expect(m.posa(C.CAPANNA, 40, 20)).toBe(false);
    m.visti.add(C.CAPANNA).add(C.UTENSILE);
    expect(m.posa(C.UTENSILE, 40, 20)).toBe(false);
    expect(m.posa(C.CAPANNA, 40, 20)).toBe(true);
    gira(m, 200);
    expect(m.cose[0].y).toBe(49);
    const copia = ripristina(JSON.parse(JSON.stringify(fotografa(m))))!;
    expect(copia.cose).toEqual(m.cose);
    // con una capanna, acqua e piante arrivano gli omini anche senza pietra messa dal giocatore
    riempi(m, 0, 50, 79, 59, M.ROCCIA);
    riempi(m, 5, 45, 30, 49, M.ACQUA);
    riempi(m, 4, 45, 4, 49, M.ROCCIA);
    riempi(m, 31, 45, 31, 49, M.ROCCIA);
    riempi(m, 50, 47, 78, 49, M.PIANTA);
    gira(m, 400);
    expect(m.omini.length).toBeGreaterThanOrEqual(2);
    m.cancella(40, 47, 3);
    expect(m.cose.length).toBe(0);
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
      expect(roccia).toBeLessThan(w * h * 0.6);
      expect(m.novita.length).toBe(0);
      expect(m.visti.has(M.ROCCIA)).toBe(false);
      // Ogni colonna è piena dal fondo fino alla sua cima, e tra una colonna e l'altra il gradino è al più di due celle.
      const cime: number[] = [];
      for (let x = 0; x < w; x++) {
        let y = 0;
        while (m.leggi(x, y) === M.VUOTO) y++;
        for (let sotto = y; sotto < h; sotto++) expect(m.leggi(x, sotto)).toBe(M.ROCCIA);
        expect(y).toBeGreaterThan(h * 0.3);
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
    riempi(a, 20, 20, 120, 30, M.SABBIA);
    riempi(a, 20, 35, 120, 40, M.ACQUA);
    riempi(a, 60, 45, 80, 48, M.LAVA);
    gira(a, 600);
    expect(quanti(a, M.ROCCIA)).toBe(rocciaPrima);
    expect(quanti(a, M.SABBIA)).toBeGreaterThan(800);
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
        const t = 1 + ((m.caso() * (N_BASE - 1)) | 0);
        if (!NASCOSTO[t]) m.versa((m.caso() * m.w) | 0, (m.caso() * m.h) | 0, 4, t);
        if (giro % 50 === 0) m.mescola((m.caso() * m.w) | 0, (m.caso() * m.h) | 0, 5, new Set());
      }
      if (giro % 400 === 0) m.aggiungiOmino((m.caso() * m.w) | 0, 5);
      if (giro % 900 === 0) m.cancella((m.caso() * m.w) | 0, (m.caso() * m.h) | 0, 6);
      m.passo();
    }
    for (const t of m.tipo) expect(t < N_BASE || m.idTipo[t] > 0).toBe(true);
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
