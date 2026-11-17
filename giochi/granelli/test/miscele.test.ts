import { describe, expect, it } from 'vitest';
import { ESPLOSIONE, GAS, LIQUIDO, M, N_BASE, POLVERE, PRIMA_ID_MISCELA, PRIMA_MISCELA, SOLIDO } from '../src/motore/materiali.js';
import { SOGLIA, faMale, idMiscela, siMangia, tratti } from '../src/motore/miscele.js';
import type { Mondo } from '../src/motore/mondo.js';
import { descriviMiscela, etichette } from '../src/motore/nomi.js';
import { type Miscela, conca, gira, mondo, primaGenerazione, quanti, riempi, versaPer } from './aiuti.js';

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
});

describe('ogni etichetta di una miscela è un effetto vero nel mondo', () => {
  /** La prima miscela di prima generazione con un certo carattere, e il numero con cui sta nelle celle. */
  function cerca(m: Mondo, adatta: (x: Miscela) => boolean): { x: Miscela; t: number } {
    const x = primaGenerazione(m).find(adatta);
    if (!x) throw new Error('nessuna miscela di prima generazione ha questo carattere');
    return { x, t: m.tipoPer(x.id) };
  }
  /** Una miscela tranquilla: non fa male, non si allarga, non brucia e non esplode. */
  const quieta = (x: Miscela): boolean => !faMale(x.s) && x.s.vivo <= SOGLIA.vivo && x.s.brucia <= SOGLIA.brucia && x.s.esplode <= SOGLIA.esplode;
  const ferma = (x: Miscela): boolean => x.s.stato === SOLIDO || x.s.stato === POLVERE;

  it('per tutte le miscele di prima generazione, etichette e comportamento hanno le stesse soglie', () => {
    const m = mondo(20, 20);
    const viste = new Set<string>();
    for (const x of primaGenerazione(m)) {
      m.tipo.fill(0);
      const t = m.tipoPer(x.id);
      const e = etichette(x.s);
      for (const parola of e) viste.add(parola);
      const nome = m.ricettario.get(x.id)!.nome;
      // Fuoco, lava e fulmine toccano ciò che brucia e ciò che esplode; fa male ciò che scotta, avvelena o corrode.
      expect(m.brucia[t] === 1, nome).toBe(e.includes('Brucia') || e.includes('Esplode'));
      expect(m.mortale[t] === 1, nome).toBe(e.includes('Scotta') || e.includes('Velenosa') || e.includes('Corrode'));
      expect(m.cibo[t] === 1, nome).toBe(e.includes('Si mangia'));
      expect(e.includes('Si mangia') && m.mortale[t] === 1, nome).toBe(false);
      expect(m.esplode[t] > SOGLIA.esplode, nome).toBe(e.includes('Esplode'));
      expect(m.vivo[t] > SOGLIA.vivo, nome).toBe(e.includes('Si allarga'));
      expect(m.fertile[t] > SOGLIA.fertile, nome).toBe(e.includes('Fertile'));
      expect(m.veleno[t] > SOGLIA.veleno, nome).toBe(e.includes('Velenosa'));
      expect(m.corrode[t] > SOGLIA.corrode, nome).toBe(e.includes('Corrode'));
      expect(m.calore[t] > SOGLIA.calore, nome).toBe(e.includes('Scotta'));
      expect(m.calore[t] < -SOGLIA.calore, nome).toBe(e.includes('Gela'));
      expect(siMangia(x.s), nome).toBe(e.includes('Si mangia'));
      // Un gas non si allarga come una cosa viva: l'etichetta non deve mai prometterlo.
      if (x.s.stato === GAS) expect(e.includes('Si allarga'), nome).toBe(false);
    }
    for (const parola of ['Scotta', 'Gela', 'Fa luce', 'Brucia', 'Esplode', 'Fertile', 'Si allarga', 'Velenosa', 'Si mangia', 'Corrode']) {
      expect(viste.has(parola), parola).toBe(true);
    }
  });

  it('«Esplode»: salta davvero con il fuoco, con la lava e con il fulmine, anche se non è infiammabile', () => {
    for (const fiamma of ['fuoco', 'lava', 'fulmine']) {
      const m = mondo();
      const { x, t } = cerca(m, (c) => c.s.stato === POLVERE && c.s.esplode > SOGLIA.esplode && c.s.brucia <= SOGLIA.brucia && c.s.calore <= SOGLIA.calore);
      expect(etichette(x.s)).toContain('Esplode');
      riempi(m, 0, 55, 59, 59, M.ROCCIA);
      riempi(m, 20, 51, 39, 54, t);
      gira(m, 30);
      expect(quanti(m, t)).toBe(80);
      if (fiamma === 'fuoco') versaPer(m, 30, 48, M.FUOCO, 120, 2);
      else if (fiamma === 'lava') {
        riempi(m, 26, 46, 33, 49, M.LAVA);
        gira(m, 300);
      } else {
        for (let cx = 22; cx <= 38; cx += 4) m.fulmine(cx, 40);
        gira(m, 30);
      }
      expect(m.visti.has(ESPLOSIONE), fiamma).toBe(true);
      expect(m.botti.length, fiamma).toBeGreaterThan(0);
      expect(quanti(m, t), fiamma).toBeLessThan(60);
    }
  });

  it('«Esplode» e «Scotta» insieme: non salta da sola, aspetta una fiamma vera', () => {
    const m = mondo();
    const { t } = cerca(m, (c) => c.s.stato !== GAS && c.s.esplode > SOGLIA.esplode && c.s.calore > SOGLIA.calore && c.s.vivo <= SOGLIA.vivo && c.s.corrode <= SOGLIA.corrode);
    riempi(m, 0, 55, 59, 59, M.ROCCIA);
    riempi(m, 20, 51, 39, 54, t);
    gira(m, 600);
    expect(m.botti.length).toBe(0);
    expect(quanti(m, t)).toBe(80);
    versaPer(m, 30, 48, M.FUOCO, 120, 2);
    expect(m.botti.length).toBeGreaterThan(0);
  });

  it('«Si allarga»: un liquido vivo cresce un poco e poi si ferma, senza mangiarsi il mondo', () => {
    const m = mondo(160, 100, 4);
    const { t } = cerca(m, (c) => c.s.stato === LIQUIDO && c.s.vivo > SOGLIA.vivo);
    conca(m, 80, 40);
    riempi(m, 1, 77, 158, 79, M.TERRA);
    riempi(m, 60, 60, 84, 69, t);
    const versate = quanti(m, t);
    expect(versate).toBe(250);
    gira(m, 6000);
    // Viva lo è davvero: si è allargata, e si è presa un po' della terra che bagnava. Ma non tutta.
    expect(quanti(m, t)).toBeGreaterThan(versate * 1.5);
    expect(quanti(m, M.TERRA)).toBeGreaterThan(158 * 3 * 0.4);
    gira(m, 6000);
    const dopo = quanti(m, t);
    gira(m, 6000);
    // Ogni cella figlia una volta sola e la catena è corta: prima, scorrendo, non smetteva mai (250 celle ne facevano 4.850).
    expect(quanti(m, t)).toBe(dopo);
    expect(dopo).toBeLessThan(versate * 4);
  });

  it('«Si allarga»: anche un solido vivo copre la terra vicina e poi si ferma', () => {
    const m = mondo(100, 60, 4);
    const { t } = cerca(m, (c) => c.s.stato === SOLIDO && c.s.vivo > SOGLIA.vivo && !faMale(c.s) && c.s.esplode <= SOGLIA.esplode);
    riempi(m, 0, 50, 99, 59, M.TERRA);
    riempi(m, 45, 48, 54, 49, t);
    gira(m, 12000);
    const cresciuta = quanti(m, t);
    expect(cresciuta).toBeGreaterThan(20);
    // Da ogni granello nascono al più otto discendenti.
    expect(cresciuta).toBeLessThanOrEqual(20 * 9);
    gira(m, 6000);
    expect(quanti(m, t)).toBe(cresciuta);
  });

  it('«Velenosa»: anche appena sopra la soglia fa morire le piante e l’omino che la tocca', () => {
    const m = mondo();
    const { x, t } = cerca(m, (c) => ferma(c) && c.s.veleno > SOGLIA.veleno && c.s.veleno <= 0.7 && c.s.calore <= SOGLIA.calore && c.s.corrode <= SOGLIA.corrode && c.s.vivo <= SOGLIA.vivo && c.s.fertile <= SOGLIA.fertile);
    expect(etichette(x.s)).toContain('Velenosa');
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 20, 47, 29, 49, t);
    riempi(m, 30, 47, 30, 49, M.PIANTA);
    m.aggiungiOmino(19, 49);
    gira(m, 600);
    expect(m.omini.length).toBe(0);
    expect(quanti(m, M.PIANTA)).toBe(0);
  });

  it('«Scotta»: anche appena sopra la soglia accende il legno, fa evaporare l’acqua e uccide l’omino che la tocca', () => {
    const m = mondo();
    const { x, t } = cerca(m, (c) => c.s.stato === SOLIDO && c.s.calore > SOGLIA.calore && c.s.calore <= 0.75 && c.s.veleno <= SOGLIA.veleno && c.s.corrode <= SOGLIA.corrode && c.s.vivo <= SOGLIA.vivo && c.s.brucia <= SOGLIA.brucia && c.s.esplode <= SOGLIA.esplode);
    expect(etichette(x.s)).toContain('Scotta');
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 20, 47, 29, 49, t);
    riempi(m, 30, 47, 34, 49, M.LEGNO);
    riempi(m, 10, 44, 19, 49, M.ACQUA);
    riempi(m, 9, 44, 9, 49, M.ROCCIA);
    m.aggiungiOmino(22, 46);
    gira(m, 600);
    expect(m.omini.length).toBe(0);
    expect(quanti(m, M.LEGNO)).toBeLessThan(15);
    expect(m.visti.has(M.VAPORE)).toBe(true);
  });

  it('«Gela»: ghiaccia l’acqua che tocca', () => {
    const m = mondo();
    const { t } = cerca(m, (c) => c.s.stato === SOLIDO && c.s.calore < -SOGLIA.calore && !faMale(c.s) && c.s.vivo <= SOGLIA.vivo);
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 20, 47, 29, 49, t);
    riempi(m, 30, 47, 39, 49, M.ACQUA);
    riempi(m, 40, 47, 40, 49, M.ROCCIA);
    gira(m, 1500);
    expect(m.visti.has(M.GHIACCIO)).toBe(true);
  });

  it('«Brucia»: prende fuoco', () => {
    const m = mondo();
    const { t } = cerca(m, (c) => c.s.stato === SOLIDO && c.s.brucia > SOGLIA.brucia && c.s.esplode <= SOGLIA.esplode && !faMale(c.s) && c.s.vivo <= SOGLIA.vivo);
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 20, 45, 39, 49, t);
    versaPer(m, 30, 42, M.FUOCO, 200, 2);
    gira(m, 1200);
    expect(quanti(m, t)).toBeLessThan(50);
    expect(m.botti.length).toBe(0);
  });

  it('«Corrode»: mangia la pietra che tocca, e si consuma', () => {
    const m = mondo();
    const { t } = cerca(m, (c) => c.s.stato !== GAS && c.s.corrode > SOGLIA.corrode && c.s.vivo <= SOGLIA.vivo && c.s.calore <= SOGLIA.calore && c.s.esplode <= SOGLIA.esplode);
    riempi(m, 0, 50, 59, 59, M.PIETRA);
    riempi(m, 20, 45, 39, 49, t);
    gira(m, 3000);
    expect(quanti(m, M.PIETRA)).toBeLessThan(600);
    expect(quanti(m, t)).toBeLessThan(100);
  });

  it('«Si mangia»: un omino affamato la mangia, anche se è un gas', () => {
    for (const stato of [SOLIDO, GAS]) {
      const m = mondo();
      const { x, t } = cerca(m, (c) => c.s.stato === stato && siMangia(c.s) && quieta(c));
      expect(etichette(x.s)).toContain('Si mangia');
      riempi(m, 0, 50, 59, 59, M.ROCCIA);
      m.aggiungiOmino(30, 49);
      m.omini[0].fame = 400;
      if (stato === GAS) versaPer(m, 30, 48, t, 16, 2);
      else {
        riempi(m, 31, 49, 32, 49, t);
        gira(m, 16);
      }
      expect(m.omini.length, `stato ${stato}`).toBe(1);
      expect(m.omini[0].fame, `stato ${stato}`).toBeLessThan(100);
    }
  });

  it('«Fertile»: su una miscela ferma spuntano le piante; una che scorre o che vola le fa spuntare dalla terra che tocca', () => {
    // ferma (polvere o solido): fa da terreno
    const a = mondo();
    const fermaFertile = cerca(a, (c) => ferma(c) && c.s.fertile > SOGLIA.fertile && quieta(c));
    riempi(a, 0, 50, 59, 59, M.ROCCIA);
    riempi(a, 5, 47, 54, 49, fermaFertile.t);
    gira(a, 6000);
    expect(a.visti.has(M.PIANTA)).toBe(true);
    // liquida e gassosa: bagna (o sfiora) la terra e ci lascia un germoglio
    for (const stato of [LIQUIDO, GAS]) {
      const m = mondo();
      const { x, t } = cerca(m, (c) => c.s.stato === stato && c.s.fertile > SOGLIA.fertile && c.s.corrode <= SOGLIA.corrode);
      expect(etichette(x.s)).toContain('Fertile');
      riempi(m, 0, 50, 59, 59, M.TERRA);
      versaPer(m, 30, 47, t, 600, 3);
      gira(m, 600);
      expect(m.visti.has(M.PIANTA), `stato ${stato}`).toBe(true);
    }
  });

  it('il racconto di una miscela dice che galleggia solo se può muoversi', () => {
    const m = mondo(20, 20);
    let leggere = 0;
    for (const x of primaGenerazione(m)) {
      const galleggia = descriviMiscela(x.s).includes('galleggia');
      if (galleggia) leggere++;
      if (x.s.stato === SOLIDO || x.s.stato === GAS) expect(galleggia).toBe(false);
    }
    expect(leggere).toBeGreaterThan(0);
  });
});
