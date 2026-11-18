import { describe, expect, it } from 'vitest';
import { INIZIALI, voce, voci } from '../src/contenuti/registro.js';
import { esitoDi } from '../src/motore/esiti.js';
import { C } from '../src/motore/cose.js';
import { M, OMINO } from '../src/motore/materiali.js';
import { type Coppia, calcola, coppieScritte, quadro, resaDi, scegliCoppia, voceVicina } from '../src/motore/suggerimenti.js';

/** Il Libro scoperto fino a metà, nell'ordine in cui il Libro lo mostra (le ere arrivano da sole: restano fuori). */
function libroAMeta(): Set<number> {
  const visti = new Set<number>(INIZIALI);
  const tutte = voci().filter((v) => v.tipo !== 'era');
  for (const v of tutte.slice(0, tutte.length >> 1)) visti.add(v.id);
  return visti;
}

/** Vero se la coppia dà, secondo l'esito unico del gioco, una voce del Libro che manca ancora. */
function daUnaVoceNuova(a: number, b: number, visti: ReadonlySet<number>): boolean {
  const e = esitoDi(a, b, 99);
  return (e.genere === 'unione' || e.genere === 'materia' || e.genere === 'fenomeno') && voce(e.id) !== undefined && !visti.has(e.id);
}

describe('il modulo dei suggerimenti', () => {
  it('conosce tutte le coppie scritte, una volta sola, con l’esito che dà il gioco', () => {
    const coppie = coppieScritte();
    const chiavi = new Set(coppie.map((c) => `${Math.min(c.a, c.b)}:${Math.max(c.a, c.b)}`));
    expect(chiavi.size).toBe(coppie.length);
    for (const c of coppie) {
      const e = esitoDi(c.a, c.b, 99);
      expect(e.id, `${voce(c.a)?.nome} + ${voce(c.b)?.nome}`).toBe(c.nato);
      expect(c.nelMondo).toBe(e.genere === 'fenomeno');
    }
    const ha = (a: number, b: number, nato: number): boolean => coppie.some((c) => ((c.a === a && c.b === b) || (c.a === b && c.b === a)) && c.nato === nato);
    expect(ha(M.TERRA, M.ACQUA, M.FANGO)).toBe(true);
    expect(ha(M.FRUTTO, C.CAPANNA, OMINO)).toBe(true);
  });

  it('all’inizio: le coppie dei quattro elementi, tutte da provare, e i quattro gettoni col puntino', () => {
    const q = quadro(new Set(INIZIALI));
    const nati = new Set(q.daProvare.map((c) => c.nato));
    for (const id of [M.FANGO, M.SABBIA, M.VAPORE, M.FUMO]) expect(nati.has(id)).toBe(true);
    for (const c of q.daProvare) expect(INIZIALI.includes(c.a) && INIZIALI.includes(c.b)).toBe(true);
    for (const id of INIZIALI) expect(resaDi(q, id)).toBe('daProvare');
  });

  it('su un Libro a metà, il puntino c’è esattamente sui gettoni che hanno una coppia nuova con cose possedute', () => {
    const visti = libroAMeta();
    const q = quadro(visti);
    const miei = [...visti];
    let conPuntino = 0;
    for (const v of miei) {
      const atteso = miei.some((w) => w !== v && daUnaVoceNuova(v, w, visti));
      expect(resaDi(q, v) === 'daProvare', voce(v)?.nome).toBe(atteso);
      if (atteso) conPuntino++;
    }
    expect(conPuntino).toBeGreaterThan(3);
    // Mai una coppia da provare con una cosa che non si ha, o con un esito già noto.
    for (const c of q.daProvare) expect(visti.has(c.a) && visti.has(c.b) && !visti.has(c.nato)).toBe(true);
  });

  it('il puntino sparisce quando il gettone ha dato tutto, e lascia il segno discreto', () => {
    const visti = new Set<number>(INIZIALI);
    // Si scopre, una dopo l'altra, ogni cosa che l'aria fa nascere: alla fine l'aria ha dato tutto.
    for (let giri = 0; giri < 200 && resaDi(quadro(visti), M.ARIA) !== 'finito'; giri++) {
      const q = quadro(visti);
      const sua = coppieScritte().find((c) => (c.a === M.ARIA || c.b === M.ARIA) && !visti.has(c.nato));
      expect(resaDi(q, M.ARIA)).not.toBe('finito');
      if (!sua) break;
      visti.add(sua.a).add(sua.b).add(sua.nato);
    }
    const q = quadro(visti);
    expect(resaDi(q, M.ARIA)).toBe('finito');
    expect(q.daProvare.some((c) => c.a === M.ARIA || c.b === M.ARIA)).toBe(false);
  });

  it('i quattro modi di essere di un gettone, su coppie finte', () => {
    const coppie: Coppia[] = [
      { a: 1, b: 2, nato: 10, nelMondo: false },
      { a: 1, b: 3, nato: 11, nelMondo: false },
      { a: 4, b: 5, nato: 12, nelMondo: false },
      { a: 4, b: 6, nato: 13, nelMondo: false },
    ];
    const q = calcola(coppie, new Set([1, 2, 4, 5, 12, 99]));
    expect(q.daProvare).toEqual([coppie[0]]);
    expect(resaDi(q, 1)).toBe('daProvare');
    expect(resaDi(q, 2)).toBe('daProvare');
    expect(resaDi(q, 3)).toBe('aspetta');
    expect(resaDi(q, 5)).toBe('finito');
    expect(resaDi(q, 4)).toBe('aspetta');
    expect(resaDi(q, 99)).toBe('nessuna');
  });

  it('sceglie prima una coppia con le cose appena provate, poi le unioni da fare, poi le cose più nuove', () => {
    const coppie: Coppia[] = [
      { a: 1, b: 2, nato: 10, nelMondo: false },
      { a: 3, b: 4, nato: 11, nelMondo: false },
      { a: 4, b: 5, nato: 12, nelMondo: true },
    ];
    const q = calcola(coppie, new Set([1, 2, 3, 4, 5]));
    expect(scegliCoppia(q)).toBe(coppie[1]);
    expect(scegliCoppia(q, [9, 2])).toBe(coppie[0]);
    expect(scegliCoppia(q, [], coppie[1])).toBe(coppie[0]);
    expect(scegliCoppia(calcola(coppie, new Set([1]))) ).toBeNull();
  });

  it('quando con le cose possedute non c’è niente di scritto, indica la voce più vicina; se è tutto scoperto, nessuna', () => {
    const lago = voci().find((v) => v.nome === 'Lago')!;
    const quasiTutto = new Set(voci().filter((v) => v.id !== lago.id).map((v) => v.id));
    expect(quadro(quasiTutto).daProvare).toEqual([]);
    expect(voceVicina(quasiTutto)).toBe(lago.id);
    expect(voceVicina(new Set(voci().map((v) => v.id)))).toBe(-1);
  });

  it('risponde in pochi millesimi anche con cinquecento voci', () => {
    // Cinquecento voci finte, ognuna con quattro coppie: duemila coppie scritte, metà Libro scoperto.
    let seme = 7;
    const caso = (n: number): number => {
      seme = (seme * 1103515245 + 12345) & 0x7fffffff;
      return seme % n;
    };
    const coppie: Coppia[] = [];
    for (let id = 1; id <= 500; id++) for (let k = 0; k < 4; k++) coppie.push({ a: caso(500) + 1, b: caso(500) + 1, nato: 1000 + caso(500), nelMondo: k === 3 });
    const visti = new Set<number>();
    for (let id = 1; id <= 500; id += 2) visti.add(id);
    for (let id = 1000; id < 1250; id++) visti.add(id);
    calcola(coppie, visti);
    const giri = 50;
    const inizio = performance.now();
    for (let k = 0; k < giri; k++) {
      const q = calcola(coppie, visti);
      scegliCoppia(q, [3, 5]);
    }
    const ms = (performance.now() - inizio) / giri;
    expect(ms).toBeLessThan(3);
    // E con il Libro vero, intero, dalla prima chiamata.
    const tutto = new Set(voci().map((v) => v.id));
    const t0 = performance.now();
    quadro(tutto);
    voceVicina(tutto);
    expect(performance.now() - t0).toBeLessThan(20);
  });
});
