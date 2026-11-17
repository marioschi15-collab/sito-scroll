import { describe, expect, it } from 'vitest';
import { C, INGOMBRO, vieDi } from '../src/motore/cose.js';
import { SOGLIA_MISCELE, SOLO_NEL_MONDO, esitoDi, siUnisce } from '../src/motore/esiti.js';
import { M, N_BASE, NASCOSTO, OMINO, VILLAGGIO } from '../src/motore/materiali.js';
import { idMiscela } from '../src/motore/miscele.js';
import type { Mondo } from '../src/motore/mondo.js';
import { staAGalla } from '../src/motore/posa.js';
import type { EsitoPorta } from '../src/motore/porta.js';
import { ACCENDI, COPPIE } from '../src/motore/ricette.js';
import { SCOPERTE } from '../src/scoperte.js';
import { libroDa12, mondo, quanti, riempi } from './aiuti.js';

/** Tutte le coppie scritte a mano: le unioni delle invenzioni e le reazioni del mondo. */
const TUTTE: [number, number][] = [
  ...Object.values(C).flatMap((id) => vieDi(id)),
  ...COPPIE.map(([a, b]) => [a, b] as [number, number]),
];

/** Un mondo in cui ogni scoperta che si unisce è già nota, con un piano di roccia alla riga 50. */
function saputo(): Mondo {
  const m = mondo(120, 70);
  riempi(m, 0, 50, 119, 69, M.ROCCIA);
  for (const voce of SCOPERTE) if (siUnisce(voce.id)) m.visti.add(voce.id);
  return m;
}

/** Quello che Unisci risponde per un esito di `esitoDi`. */
function inUnisci(a: number, b: number, voci: number): number {
  const e = esitoDi(a, b, voci);
  return e.genere === 'fenomeno' ? SOLO_NEL_MONDO : e.id;
}

/** La scoperta che il mondo ha dato portando una cosa (SOLO_NEL_MONDO per un fenomeno); null se non ha unito. */
function nato(e: EsitoPorta): number | null {
  if (e.genere === 'unione' || e.genere === 'giaFatta') return e.nato;
  if (e.genere === 'nelMondo') return SOLO_NEL_MONDO;
  return null;
}

/**
 * Mette nel mondo il bersaglio (un blocco di materiale, una costruzione posata, un omino) e dice dove toccarlo;
 * null se quella scoperta nel mondo non può stare.
 */
function bersaglio(m: Mondo, id: number): [number, number] | null {
  if (id > 0 && id < N_BASE && !NASCOSTO[id]) {
    riempi(m, 40, 42, 60, 49, id);
    return [50, 45];
  }
  if (INGOMBRO[id]) {
    if (staAGalla(id)) {
      riempi(m, 20, 50, 80, 56, M.VUOTO);
      riempi(m, 20, 50, 80, 56, M.ACQUA);
    }
    if (!m.posa(id, 50, 45)) return null;
    const c = m.cose[0];
    return [c.x + (INGOMBRO[id][0] >> 1), c.y - (INGOMBRO[id][1] >> 1)];
  }
  if (id === OMINO) {
    m.aggiungiOmino(50, 49);
    return [50, 48];
  }
  return null;
}

describe('un esito solo, per Unisci, per il mondo e per il Mestolo', () => {
  it('per ogni coppia scritta, unisci() ed esitoDi danno lo stesso esito, nei due ordini', () => {
    const voci = saputo().voci();
    for (const [a, b] of TUTTE) {
      const m = saputo();
      const atteso = inUnisci(a, b, voci);
      expect(atteso, `${a} + ${b}`).not.toBe(-1);
      expect(m.unisci(a, b), `${a} + ${b}`).toBe(atteso);
      expect(m.unisci(b, a), `${b} + ${a}`).toBe(atteso);
      expect(inUnisci(b, a, voci), `${b} + ${a}`).toBe(atteso);
    }
  });

  it('per ogni coppia scritta, portare una cosa sopra l’altra nel mondo dà lo stesso esito, almeno in un verso', () => {
    const voci = saputo().voci();
    let soloGettoni = 0;
    for (const [a, b] of TUTTE) {
      const atteso = inUnisci(a, b, voci);
      let provati = 0;
      const visti: (number | null)[] = [];
      for (const [gettone, sotto] of [
        [a, b],
        [b, a],
      ]) {
        const m = saputo();
        const punto = bersaglio(m, sotto);
        if (!punto) continue;
        provati++;
        visti.push(nato(m.porta(gettone, punto[0], punto[1], 'gettone')));
      }
      if (provati === 0) {
        // Due cose che nel mondo non stanno (bronzo e utensile): si uniscono solo gettone su gettone.
        soloGettoni++;
        continue;
      }
      expect(visti, `${a} + ${b}`).toContain(atteso);
    }
    expect(soloGettoni).toBeLessThanOrEqual(3);
  });

  it('per ogni coppia di due materiali, anche il Mestolo scopre la stessa cosa', () => {
    const voci = saputo().voci();
    for (const [a, b] of TUTTE) {
      if (a >= N_BASE || b >= N_BASE) continue;
      const coppia = COPPIE.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
      const accende = coppia !== undefined && (coppia[2] === ACCENDI || coppia[3] === ACCENDI);
      const atteso = inUnisci(a, b, voci);
      const m = mondo();
      riempi(m, 10, 15, 29, 19, a);
      riempi(m, 10, 20, 29, 24, b);
      for (let k = 0; k < 30; k++) m.mescola(20, 19, 5, new Set());
      // Ciò che brucia, sotto il Mestolo, prende fuoco: quello che resta arriva col tempo.
      if (atteso >= C.UTENSILE || !accende) expect(m.visti.has(atteso), `${a} + ${b}`).toBe(true);
      else expect(quanti(m, M.BRACE) > 0 || m.botti.length > 0, `${a} + ${b}`).toBe(true);
    }
  });

  it('esitoDi è uguale nei due ordini e non cambia chiedendolo più volte', () => {
    for (let a = 1; a < N_BASE; a++) {
      for (let b = 1; b < N_BASE; b++) {
        expect(esitoDi(a, b, 20)).toEqual(esitoDi(b, a, 20));
        expect(esitoDi(a, b, 20)).toEqual(esitoDi(a, b, 20));
      }
    }
  });
});

describe('le miscele aspettano il Libro più pieno', () => {
  it('due sostanze senza esito scritto: «per ora niente» fino all’undicesima voce, la miscela dalla dodicesima', () => {
    expect(esitoDi(M.SABBIA, M.LEGNO, SOGLIA_MISCELE - 1)).toEqual({ genere: 'niente', id: -1, perOra: true });
    expect(esitoDi(M.SABBIA, M.LEGNO, SOGLIA_MISCELE)).toEqual({ genere: 'miscela', id: idMiscela(M.SABBIA, M.LEGNO) });
    // Le coppie scritte a mano non diventano mai miscele; quello che non è una sostanza non si mescola mai.
    expect(esitoDi(M.TERRA, M.ACQUA, 200)).toEqual({ genere: 'materia', id: M.FANGO });
    expect(esitoDi(OMINO, M.PIETRA, 200)).toEqual({ genere: 'niente', id: -1 });
    expect(esitoDi(C.UTENSILE, C.POZZO, 3)).toEqual({ genere: 'niente', id: -1 });
    expect(esitoDi(VILLAGGIO, M.ACQUA, 200)).toEqual({ genere: 'niente', id: -1 });
  });

  it('alla dodicesima voce il mondo lo annuncia, una volta sola', () => {
    const m = mondo();
    for (const id of [M.FANGO, M.SABBIA, M.LAVA, M.VAPORE, M.PIETRA, M.FUMO, M.ARGILLA]) m.scopri(id, 0, 0);
    expect(m.voci()).toBe(SOGLIA_MISCELE - 1);
    expect(m.annunci).toEqual([]);
    m.scopri(M.MATTONE, 0, 0);
    expect(m.annunci).toEqual(['miscele']);
    m.scopri(M.VETRO, 0, 0);
    m.scopri(idMiscela(M.SABBIA, M.LEGNO), 0, 0);
    expect(m.annunci).toEqual(['miscele']);
  });

  it('in Unisci la coppia «per ora niente» non si ricorda; le altre sì, tranne le vie dei fenomeni', () => {
    const m = mondo();
    m.visti.add(M.SABBIA).add(M.LEGNO).add(M.POLVERE_NERA).add(C.UTENSILE).add(C.POZZO);
    expect(m.unisci(M.SABBIA, M.LEGNO)).toBe(-1);
    expect(m.giaProvata(M.SABBIA, M.LEGNO)).toBe(false);
    expect(m.unisci(M.POLVERE_NERA, M.FUOCO)).toBe(SOLO_NEL_MONDO);
    expect(m.giaProvata(M.POLVERE_NERA, M.FUOCO)).toBe(false);
    expect(m.unisci(C.POZZO, C.UTENSILE)).toBe(-1);
    expect(m.giaProvata(C.UTENSILE, C.POZZO)).toBe(true);
    expect(m.unisci(M.ACQUA, M.TERRA)).toBe(M.FANGO);
    expect(m.giaProvata(M.TERRA, M.ACQUA)).toBe(true);
    libroDa12(m);
    expect(m.unisci(M.SABBIA, M.LEGNO)).toBe(idMiscela(M.SABBIA, M.LEGNO));
    expect(m.giaProvata(M.LEGNO, M.SABBIA)).toBe(true);
    // Una miscela con una miscela: la chiave regge anche i numeri grandi.
    const miscela = idMiscela(M.SABBIA, M.LEGNO);
    expect(m.unisci(miscela, M.TERRA)).toBeGreaterThan(0);
    expect(m.giaProvata(M.TERRA, miscela)).toBe(true);
    expect(m.giaProvata(M.ACQUA, miscela)).toBe(false);
  });
});
