import { describe, expect, it } from 'vitest';
import { libera, quotaDelPasso } from '../src/motore/cammino.js';
import { C } from '../src/motore/cose.js';
import { ALBERO, M, TRONCO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { type Omino, PASSEGGIO } from '../src/motore/omini.js';
import { Anagrafe, GIORNO, gira, mondo, quanti, riempi } from './aiuti.js';

/** Un piano di roccia con uno stagno a filo del terreno tra le colonne 70 e 95, e un omino alla colonna 50. */
function pianoConStagno(): Mondo {
  const m = mondo(120, 60);
  riempi(m, 0, 50, 119, 59, M.ROCCIA);
  riempi(m, 70, 50, 95, 51, M.ACQUA);
  m.aggiungiOmino(50, 49);
  return m;
}

describe('i tronchi non sono muri', () => {
  it('un omino passa davanti al tronco di un albero e arriva a bere', () => {
    const m = pianoConStagno();
    for (let y = 42; y <= 49; y++) m.metti(y * m.w + 60, M.LEGNO, TRONCO);
    expect(libera(m, 60, 49)).toBe(true);
    // Senza bere si muore a 7.200 istanti: chi è ancora vivo dopo, ha passato il tronco.
    gira(m, 9000);
    expect(m.omini.length).toBe(1);
    expect(m.omini[0].bevuta).toBeGreaterThanOrEqual(66);
  });

  it('un muro di legno largo due celle, messo da chi gioca, lo ferma ancora', () => {
    const m = pianoConStagno();
    riempi(m, 60, 42, 61, 49, M.LEGNO);
    expect(libera(m, 60, 49)).toBe(false);
    const anagrafe = new Anagrafe();
    let oltre = 0;
    for (let k = 0; k < 9000; k++) {
      m.passo();
      for (const o of m.omini) oltre = Math.max(oltre, o.x);
    }
    anagrafe.leggi(m);
    expect(oltre).toBeLessThan(60);
    expect(m.omini.length).toBe(0);
    expect(anagrafe.morti.sete).toBe(1);
  });

  it('un albero che cresce lascia un tronco segnato; il legno versato col dito no', () => {
    const m = mondo(60, 60);
    riempi(m, 0, 50, 59, 59, M.HUMUS);
    m.metti(49 * m.w + 20, M.PIANTA, ALBERO + 10);
    gira(m, 3000);
    let tronco = 0;
    for (let i = 0; i < m.tipo.length; i++) {
      if (m.tipo[i] !== M.LEGNO) continue;
      expect(m.dato[i]).toBe(TRONCO);
      tronco++;
    }
    expect(tronco).toBeGreaterThanOrEqual(8);
    m.versa(45, 30, 3, M.LEGNO);
    expect(m.dato[30 * m.w + 45]).toBe(0);
    expect(libera(m, 45, 30)).toBe(false);
  });

  it('l’albero col tronco segnato brucia come prima, e la Gomma lo taglia', () => {
    const m = mondo(60, 60);
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    for (let y = 40; y <= 49; y++) m.metti(y * m.w + 20, M.LEGNO, TRONCO);
    for (let y = 40; y <= 49; y++) m.metti(y * m.w + 40, M.LEGNO, TRONCO);
    m.accendi(49 * m.w + 20);
    gira(m, 3000);
    // Quello acceso è bruciato tutto (all'aperto resta cenere, non carbone); l'altro è intatto finché non lo si taglia.
    for (let y = 40; y <= 49; y++) expect(m.leggi(20, y)).not.toBe(M.LEGNO);
    expect(quanti(m, M.CARBONE)).toBe(0);
    expect(quanti(m, M.LEGNO)).toBe(10);
    m.cancella(40, 45, 2);
    expect(quanti(m, M.LEGNO)).toBe(5);
  });
});

describe('gradini e dirupi', () => {
  it('un gradino alto cinque celle si scavalca, uno di sei ferma', () => {
    const m = mondo(60, 60);
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 31, 45, 59, 49, M.ROCCIA);
    expect(quotaDelPasso(m, 30, 49, 1, false)).toBe(44);
    riempi(m, 31, 44, 59, 44, M.ROCCIA);
    expect(quotaDelPasso(m, 30, 49, 1, false)).toBe(-1);
    // Serve spazio sopra la testa: sotto un soffitto basso non ci si arrampica.
    riempi(m, 31, 44, 59, 44, M.VUOTO);
    riempi(m, 30, 43, 30, 43, M.ROCCIA);
    expect(quotaDelPasso(m, 30, 49, 1, false)).toBe(-1);
  });

  it('passeggiando non si scende dove non si risale; scappando sì, e in acqua ci si tuffa', () => {
    const m = mondo(60, 60);
    riempi(m, 0, 50, 59, 59, M.ROCCIA);
    riempi(m, 0, 45, 29, 49, M.ROCCIA);
    // Dal ripiano (piedi a 44) al piano di sotto (piedi a 49) sono cinque celle: si scende, come si risale.
    expect(quotaDelPasso(m, 29, 44, 1, false)).toBe(44);
    riempi(m, 0, 44, 29, 44, M.ROCCIA);
    expect(quotaDelPasso(m, 29, 43, 1, false)).toBe(-1);
    expect(quotaDelPasso(m, 29, 43, 1, true)).toBe(43);
    riempi(m, 30, 48, 59, 49, M.ACQUA);
    expect(quotaDelPasso(m, 29, 43, 1, false)).toBe(43);
  });

  it('una sponda alta quanto la terra trattenuta dall’erba non è una trappola: l’omino la risale e va a bere', () => {
    const m = pianoConStagno();
    // Tra l'omino e lo stagno il terreno sale di cinque celle in un colpo solo, e poi ridiscende allo stesso modo.
    riempi(m, 58, 45, 66, 49, M.ROCCIA);
    gira(m, 9000);
    expect(m.omini.length).toBe(1);
    expect(m.omini[0].bevuta).toBeGreaterThanOrEqual(66);
  });
});

describe('un paese a cui tornare', () => {
  it('chi ha sete va all’acqua anche se è lontanissima e molto più in basso', () => {
    const m = mondo(420, 190);
    // Un pendio lungo trecento celle: in cima l'omino, in fondo (novanta celle più giù) lo stagno.
    const cima = (x: number): number => (x < 50 ? 150 : Math.max(60, 150 - Math.floor((x - 50) * 0.3)));
    for (let x = 0; x < m.w; x++) riempi(m, x, cima(x), x, m.h - 1, M.ROCCIA);
    riempi(m, 10, 150, 40, 151, M.ACQUA);
    m.aggiungiOmino(330, cima(330) - 1);
    const anagrafe = new Anagrafe();
    anagrafe.gira(m, 9000);
    expect(anagrafe.morti.sete).toBeUndefined();
    expect(m.omini.length).toBe(1);
    expect(m.omini[0].bevuta).toBeLessThanOrEqual(42);
  });

  it('senza bisogni passeggia vicino a casa, e non si perde ai bordi del mondo', () => {
    const m = mondo(420, 60);
    riempi(m, 0, 50, 419, 59, M.ROCCIA);
    for (const id of [C.POZZO, C.CAMPO]) m.visti.add(id);
    m.posa(C.POZZO, 205, 40);
    m.posa(C.CAMPO, 216, 40);
    for (let k = 0; k < 3; k++) m.aggiungiOmino(206 + k * 3, 49);
    const case_ = m.omini.map((o) => o.casa as number);
    let lontano = 0;
    const anagrafe = new Anagrafe();
    for (let k = 0; k < 2 * GIORNO; k++) {
      m.passo();
      // I bambini nati intanto hanno la casa dei genitori: vale per tutti.
      for (const o of m.omini) lontano = Math.max(lontano, Math.abs(o.x - (o.casa as number)));
      if (k % 1000 === 0) anagrafe.leggi(m);
    }
    expect(case_).toEqual([206, 209, 212]);
    // Una cinquantina di celle: al bordo ci si gira, e scavalcando un compagno si può finire un paio di celle più in là.
    expect(lontano).toBeLessThanOrEqual(PASSEGGIO + 3);
    expect(anagrafe.morti.sete).toBeUndefined();
    expect(anagrafe.morti.fame).toBeUndefined();
    expect(m.omini.length).toBeGreaterThanOrEqual(3);
  });

  it('va a bere lontano, torna a casa e la notte dorme nella sua capanna', () => {
    const m = mondo(300, 60);
    riempi(m, 0, 50, 299, 59, M.ROCCIA);
    riempi(m, 20, 50, 40, 51, M.ACQUA);
    for (const id of [C.CAPANNA, C.CAMPO]) m.visti.add(id);
    m.posa(C.CAPANNA, 200, 40);
    m.posa(C.CAMPO, 215, 40);
    m.aggiungiOmino(185, 49);
    const o = m.omini[0];
    expect(o.casa).toBe(185);
    let bevute = 0;
    let aCasaDopoAverBevuto = false;
    let dormite = 0;
    let setePrima = 0;
    for (let k = 0; k < 2 * GIORNO; k++) {
      m.passo();
      if (o.sete < setePrima) bevute++;
      setePrima = o.sete;
      if (bevute > 0 && Math.abs(o.x - 200) <= 20) aCasaDopoAverBevuto = true;
      if (o.dentro === m.cose[0].n) dormite++;
    }
    expect(m.omini).toEqual([o]);
    expect(bevute).toBeGreaterThanOrEqual(3);
    expect(aCasaDopoAverBevuto).toBe(true);
    expect(dormite).toBeGreaterThan(2000);
    // Da quando ci ha dormito, casa sua è la capanna (il suo centro), non più il punto in cui è comparso.
    expect(o.casa).toBe(200);
  });

  it('se il mondo non gli mostra altra acqua, torna a bere dove ha bevuto l’ultima volta', () => {
    const m = mondo(420, 60);
    riempi(m, 0, 50, 419, 59, M.ROCCIA);
    // Uno stagno sotto una tettoia di pietra: dal cielo non si vede, e l'elenco delle fonti non lo conosce.
    riempi(m, 90, 50, 110, 51, M.ACQUA);
    riempi(m, 84, 40, 116, 41, M.PIETRA);
    m.visti.add(C.CAMPO);
    m.posa(C.CAMPO, 300, 40);
    // L'omino ci beve una volta, poi va a vivere duecento celle più in là, accanto al suo campo.
    m.aggiungiOmino(100, 49);
    const o = m.omini[0];
    o.sete = 100;
    gira(m, 16);
    expect(m.fonti.bere(100)).toBe(-1);
    expect(o.bevuta).toBe(100);
    o.casa = 300;
    let lontano = false;
    let bevute = 0;
    let setePrima = o.sete;
    for (let k = 0; k < GIORNO; k++) {
      m.passo();
      if (o.x > 250) lontano = true;
      if (lontano && o.sete < setePrima) bevute++;
      setePrima = o.sete;
    }
    expect(lontano).toBe(true);
    expect(m.omini).toEqual([o]);
    expect(bevute).toBeGreaterThanOrEqual(1);
    expect(o.bevuta).toBeGreaterThanOrEqual(88);
    expect(o.bevuta).toBeLessThanOrEqual(112);
  });

  it('se da una parte la strada è chiusa, cerca da bere dall’altra', () => {
    const m = mondo(200, 60);
    riempi(m, 0, 50, 199, 59, M.ROCCIA);
    // Lo stagno vicino sta dietro un muro di pietra troppo alto; quello lontano, dall'altra parte, è libero.
    riempi(m, 120, 50, 130, 51, M.ACQUA);
    riempi(m, 112, 40, 113, 49, M.PIETRA);
    riempi(m, 10, 50, 20, 51, M.ACQUA);
    // Ha già sete, ed è a due passi dal muro: lo stagno più vicino è quello che non può raggiungere.
    m.aggiungiOmino(105, 49);
    const o = m.omini[0];
    o.sete = 320;
    let alMuro = false;
    for (let k = 0; k < 3000; k++) {
      m.passo();
      if (o.x === 111) alMuro = true;
    }
    // Ha provato dalla parte più vicina, ha trovato il muro e, invece di restarci davanti, è andato dall'altra.
    expect(alMuro).toBe(true);
    expect(m.omini).toEqual([o]);
    expect(o.bevuta).toBeLessThanOrEqual(22);
  });
});

describe('ognuno al suo posto', () => {
  it('due omini non restano mai fermi nella stessa cella, nemmeno al pozzo, al falò o davanti a casa', () => {
    const m = mondo(160, 60);
    riempi(m, 0, 50, 159, 59, M.ROCCIA);
    for (const id of [C.POZZO, C.CAMPO, C.FALO, C.CAPANNA]) m.visti.add(id);
    m.posa(C.POZZO, 60, 40);
    m.posa(C.CAMPO, 100, 40);
    m.posa(C.FALO, 80, 40);
    m.posa(C.CAPANNA, 120, 40);
    // Tutti nello stesso punto, come una volta arrivavano i primi due.
    for (let k = 0; k < 10; k++) m.aggiungiOmino(80, 49);
    gira(m, 40);
    // Ogni omino ha il suo numero, per riconoscere una coppia da un momento all'altro.
    const numeri = new WeakMap<Omino, number>();
    let prossimo = 0;
    const numero = (o: Omino): number => {
      if (!numeri.has(o)) numeri.set(o, prossimo++);
      return numeri.get(o) as number;
    };
    let insieme = 0;
    let fermi = 0;
    let prima = new Set<string>();
    for (let k = 0; k < 2 * GIORNO; k++) {
      m.passo();
      if (m.tic % 8 !== 0) continue;
      const adesso = new Set<string>();
      const svegli = m.omini.filter((o) => !o.dentro);
      for (let a = 0; a < svegli.length; a++) {
        for (let b = a + 1; b < svegli.length; b++) {
          if (svegli[a].x !== svegli[b].x || Math.abs(svegli[a].y - svegli[b].y) >= 3) continue;
          const coppia = `${numero(svegli[a])}/${numero(svegli[b])}`;
          insieme++;
          adesso.add(coppia);
          if (prima.has(coppia)) fermi++;
        }
      }
      prima = adesso;
    }
    // Capita di ritrovarsi insieme per un momento (un bambino appena nato): mai di restarci.
    expect(fermi).toBe(0);
    expect(insieme).toBeLessThan(20);
    expect(m.omini.length).toBeGreaterThanOrEqual(6);
  });

  it('chi si ritrova nella cella di un altro si scosta, anche quando non avrebbe motivo di muoversi', () => {
    const m = mondo(160, 60);
    riempi(m, 0, 50, 159, 59, M.ROCCIA);
    m.visti.add(C.FALO);
    m.posa(C.FALO, 80, 40);
    // È notte, e intorno al falò si sta fermi: quattro omini lasciati cadere nello stesso punto, a tre passi dal fuoco.
    m.tic = 9200;
    for (let k = 0; k < 4; k++) m.aggiungiOmino(77, 49);
    gira(m, 80);
    expect(new Set(m.omini.map((o) => o.x)).size).toBe(4);
    // E restano tutti lì intorno, a scaldarsi.
    for (const o of m.omini) expect(Math.abs(o.x - 80)).toBeLessThanOrEqual(8);
  });
});
