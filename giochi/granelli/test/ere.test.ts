import { describe, expect, it } from 'vitest';
import { conseguenze, ere, unioni, voci } from '../src/contenuti/registro.js';
import { C, E } from '../src/motore/cose.js';
import { erePronte } from '../src/motore/ere.js';
import { M, N_BASE, OMINO, VILLAGGIO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { fotografa, ripristina } from '../src/salvataggio.js';
import { mondo } from './aiuti.js';

/** Gli eventi delle conseguenze che non sono ere della scala: arrivano solo dopo l'Età della pietra. */
const ERE = ere();
const EVENTI = conseguenze()
  .map(([, allora]) => allora)
  .filter((id) => !ERE.includes(id));

/** Lancia un errore se nel mondo c'è un'era senza la precedente, o un evento senza l'Età della pietra. */
function inOrdine(m: Mondo): void {
  for (let k = 1; k < ERE.length; k++) if (m.visti.has(ERE[k])) expect(m.visti.has(ERE[k - 1]), `era ${ERE[k]}`).toBe(true);
  for (const id of EVENTI) if (m.visti.has(id)) expect(m.visti.has(E.PIETRA), `evento ${id}`).toBe(true);
  // E sono arrivate nell'ordine giusto: nella coda delle novità ogni era viene dopo la precedente.
  const arrivi = m.novita.map((n) => n.id);
  for (let k = 1; k < ERE.length; k++) {
    if (arrivi.includes(ERE[k])) expect(arrivi.indexOf(ERE[k - 1])).toBeLessThan(arrivi.indexOf(ERE[k]));
  }
}

/** Un generatore di numeri a caso con seme fisso: la stessa prova rifà sempre la stessa storia. */
function dadi(seme: number): () => number {
  let s = seme;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

describe('le ere arrivano in ordine', () => {
  it('con sole pietra e mattone, mura, torre e castello non portano al Medioevo', () => {
    const m = mondo();
    m.visti.add(M.PIETRA).add(M.MATTONE);
    expect(m.unisci(M.PIETRA, M.MATTONE)).toBe(C.MURA);
    expect(m.unisci(C.MURA, M.PIETRA)).toBe(C.TORRE);
    expect(m.unisci(C.TORRE, C.MURA)).toBe(C.CASTELLO);
    expect(m.visti.has(C.CASTELLO)).toBe(true);
    for (const id of [...ERE, ...EVENTI]) expect(m.visti.has(id), `${id}`).toBe(false);
    // Con il primo utensile arriva l'Età della pietra; il Medioevo aspetta ancora bronzo, ferro ed età antica.
    m.visti.add(M.LEGNO);
    expect(m.unisci(M.PIETRA, M.LEGNO)).toBe(C.UTENSILE);
    expect(m.visti.has(E.PIETRA)).toBe(true);
    expect(m.visti.has(E.MEDIOEVO)).toBe(false);
  });

  it('un’era arrivata in anticipo aspetta, e scatta a cascata appena arriva la precedente', () => {
    const m = mondo();
    for (const id of [C.CASTELLO, C.TEMPIO, C.FERRO, C.BRONZO, C.FALO, C.MERCATO]) m.scopri(id, 0, 0);
    expect(m.novita.map((n) => n.id)).toEqual([C.CASTELLO, C.TEMPIO, C.FERRO, C.BRONZO, C.FALO, C.MERCATO]);
    m.scopri(C.UTENSILE, 0, 0);
    const dopo = m.novita.slice(7).map((n) => n.id);
    expect(dopo.filter((id) => ERE.includes(id))).toEqual([E.PIETRA, E.BRONZO, E.FERRO, E.ANTICA, E.MEDIOEVO]);
    expect(dopo).toContain(E.FUOCO_DOMATO);
    expect(dopo).toContain(E.COMMERCIO);
    inOrdine(m);
  });

  it('il fuoco domato, l’agricoltura e la scrittura vengono dopo l’Età della pietra', () => {
    const m = mondo();
    m.visti.add(M.LEGNO).add(M.PIETRA);
    expect(m.unisci(M.LEGNO, M.FUOCO)).toBe(C.FALO);
    expect(m.visti.has(E.FUOCO_DOMATO)).toBe(false);
    m.unisci(M.PIETRA, M.LEGNO);
    expect(m.visti.has(E.PIETRA) && m.visti.has(E.FUOCO_DOMATO)).toBe(true);
    expect(erePronte(m.visti)).toEqual([]);
  });

  it('nessuna sequenza di unioni, a caso con seme fisso, apre un’era prima della precedente', () => {
    const coppie = unioni().map(([a, b]) => [a, b] as const);
    let finoAlMedioevo = 0;
    for (let seme = 1; seme <= 60; seme++) {
      const caso = dadi(seme);
      const m = mondo();
      // Tutti i materiali, gli omini e il villaggio: le invenzioni si fanno solo unendo.
      for (const voce of voci()) if (voce.id < N_BASE || voce.id === OMINO || voce.id === VILLAGGIO) m.visti.add(voce.id);
      for (let mossa = 0; mossa < 200; mossa++) {
        const [a, b] = coppie[(caso() * coppie.length) | 0];
        if (!m.visti.has(a) || !m.visti.has(b)) continue;
        m.unisci(a, b);
        inOrdine(m);
      }
      if (m.visti.has(E.MEDIOEVO)) finoAlMedioevo++;
    }
    // La prova non è vuota: molte storie arrivano davvero fino in fondo.
    expect(finoAlMedioevo).toBeGreaterThan(20);
  });

  it('le partite salvate con ere già raggiunte le tengono, e quelle in attesa scattano al momento giusto', () => {
    // Una partita di prima: il Medioevo arrivato in tre mosse, senza le ere precedenti.
    const vecchia = mondo();
    for (const id of [M.PIETRA, M.MATTONE, C.MURA, C.TORRE, C.CASTELLO, E.MEDIOEVO]) vecchia.visti.add(id);
    const m = ripristina(JSON.parse(JSON.stringify(fotografa(vecchia))))!;
    expect(m.visti.has(E.MEDIOEVO)).toBe(true);
    // Un bronzo fatto quando le ere non avevano ancora un ordine: l'Età del bronzo arriva dopo quella della pietra.
    const attesa = mondo();
    for (const id of [M.PIETRA, M.LEGNO, C.BRONZO]) attesa.visti.add(id);
    const n = ripristina(JSON.parse(JSON.stringify(fotografa(attesa))))!;
    expect(n.visti.has(E.BRONZO)).toBe(false);
    n.unisci(M.PIETRA, M.LEGNO);
    expect(n.visti.has(E.PIETRA) && n.visti.has(E.BRONZO)).toBe(true);
  });
});
