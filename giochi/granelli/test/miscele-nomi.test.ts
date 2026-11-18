import { describe, expect, it } from 'vitest';
import { doteDi } from '../src/motore/fusione.js';
import { M, N_BASE } from '../src/motore/materiali.js';
import { tratti } from '../src/motore/miscele.js';
import { AGGETTIVI, COLORI, carattereDelNome, formeDi } from '../src/motore/nomi.js';
import { RADICI } from '../src/motore/radici.js';
import { type Miscela, mondo, primaGenerazione } from './aiuti.js';
import type { Mondo } from '../src/motore/mondo.js';

/** Le miscele di prima generazione e un bel campione di seconda (ognuna di prima con un materiale su tre). */
function campione(m: Mondo): Miscela[] {
  const prima = primaGenerazione(m);
  const tutte = [...prima];
  for (const p of prima) {
    for (let b = 1; b < N_BASE; b += 3) {
      const id = m.registra(p.id, b);
      if (id >= 0) tutte.push({ id, a: Math.min(p.id, b), b: Math.max(p.id, b), s: m.sostanzaDi(id)! });
    }
  }
  return tutte;
}

const TUTTE_LE_RADICI = Object.values(RADICI).flatMap((r) => r ?? []).sort((a, b) => b.length - a.length);
const NUMERO = /^(II|III|IV|V|VI|VII|VIII|IX|X|\d+)$/;

/**
 * Smonta un nome generato in forma, radice e aggettivi: «Resina di muschio gelida verde II» dà la forma Resina,
 * la radice «di muschio» e gli aggettivi «gelida», «verde».
 */
function smonta(nome: string): { forma: string; radice: string; aggettivi: string } | null {
  const spazio = nome.indexOf(' ');
  const forma = nome.slice(0, spazio);
  const resto = nome.slice(spazio + 1);
  const radice = TUTTE_LE_RADICI.find((r) => resto.startsWith(`${r} `));
  if (!radice) return null;
  const parole = resto.slice(radice.length + 1).split(' ');
  if (NUMERO.test(parole[parole.length - 1])) parole.pop();
  return { forma, radice, aggettivi: parole.join(' ') };
}

describe('i nomi delle miscele parlano', () => {
  const m = mondo(20, 20);
  const tutte = campione(m);
  const generate = tutte.filter((x) => !m.firmata(x.id));

  it('ogni nome è forma + radice di un genitore + aggettivi, con il genere giusto, su un campione largo', () => {
    expect(generate.length).toBeGreaterThan(2500);
    for (const x of generate) {
      const nome = m.ricettario.get(x.id)!.nome;
      const pezzi = smonta(nome);
      expect(pezzi, nome).not.toBeNull();
      const { forma, radice, aggettivi } = pezzi!;
      const trovata = formeDi(x.s.stato).find(([f]) => f === forma);
      expect(trovata, `${nome}: forma adatta allo stato`).toBeDefined();
      const g = trovata![1] === 'm' ? 0 : 1;
      // Gli aggettivi del genere della forma: uno del carattere o del colore, poi al più il colore.
      const buoni = [...Object.values(AGGETTIVI).flat(), ...COLORI].map((a) => a[g]).sort((a, b) => b.length - a.length);
      let resto = aggettivi;
      let quanti = 0;
      while (resto.length > 0) {
        const a = buoni.find((b) => resto === b || resto.startsWith(`${b} `));
        expect(a, `${nome}: «${resto}» non va d'accordo con «${forma}»`).toBeDefined();
        resto = resto.slice(a!.length).trimStart();
        quanti++;
      }
      expect(quanti, nome).toBeGreaterThanOrEqual(1);
      expect(quanti, nome).toBeLessThanOrEqual(2);
      // La radice è quella del genitore che conta di più: uno dei due materiali da cui la miscela discende.
      expect(RADICI[x.s.radice], nome).toContain(radice);
      expect(radice.endsWith(` ${forma.toLowerCase()}`), nome).toBe(false);
    }
  });

  it('la radice viene da uno dei due genitori, e l’aggettivo dice un carattere che la miscela ha davvero', () => {
    for (const x of primaGenerazione(m)) {
      if (m.firmata(x.id)) continue;
      expect([x.a, x.b]).toContain(x.s.radice);
      const nome = m.ricettario.get(x.id)!.nome;
      const spicca = carattereDelNome(x.s);
      if (spicca === null) continue;
      expect(tratti(x.s), nome).toContain(spicca);
      expect(AGGETTIVI[spicca].some(([ma, fe]) => nome.includes(` ${ma}`) || nome.includes(` ${fe}`)), nome).toBe(true);
    }
  });

  it('quattro volte su cinque il carattere si indovina dai genitori; la quinta sorprende', () => {
    let previste = 0;
    let generateDiPrima = 0;
    for (const x of primaGenerazione(m)) {
      if (m.firmata(x.id)) continue;
      generateDiPrima++;
      const dai = new Set([...doteDi(x.a), ...doteDi(x.b)]);
      const t = tratti(x.s);
      // Chi scotta fa anche luce: è il fuoco, non una sorpresa.
      if (t.every((c) => dai.has(c) || (c === 'luce' && t.includes('caldo')))) previste++;
    }
    expect(previste / generateDiPrima).toBeGreaterThan(0.72);
    expect(previste / generateDiPrima).toBeLessThan(0.92);
  });

  it('il carattere che dà l’aggettivo è quello che la radice non porta: muschio e neve, «Grandine di neve viva»', () => {
    const n = mondo(20, 20);
    const id = n.registra(M.MUSCHIO, M.NEVE);
    const x = n.sostanzaDi(id)!;
    expect(n.ricettario.get(id)!.nome).toBe('Grandine di neve viva');
    expect(x.radice).toBe(M.NEVE);
    // Il gelo viene dalla neve (la radice), la vita dal muschio: l'aggettivo racconta l'altro genitore.
    expect(tratti(x)).toEqual(['freddo', 'vivo']);
    expect(carattereDelNome(x)).toBe('vivo');
  });

  it('stessi genitori, stessa miscela e stesso nome, in qualunque ordine e in qualunque mondo', () => {
    for (const [a, b] of [[M.TERRA, M.SABBIA], [M.FUOCO, M.METALLO], [M.MUSCHIO, M.NEVE], [M.ZOLFO, M.ALGA], [M.FUMO, M.FRUTTO]]) {
      const uno = mondo(20, 20, 1);
      const due = mondo(30, 30, 99);
      const id = uno.registra(a, b);
      expect(due.registra(b, a)).toBe(id);
      expect(due.sostanzaDi(id)).toEqual(uno.sostanzaDi(id));
      expect(due.ricettario.get(id)!.nome).toBe(uno.ricettario.get(id)!.nome);
    }
  });

  it('i nomi restano diversi tra loro anche con migliaia di miscele', () => {
    const nomi = new Set([...m.ricettario.values()].map((r) => r.nome));
    expect(nomi.size).toBe(m.ricettario.size);
  });

  it('le tavole dei nomi sono scritte bene: ogni carattere ha i suoi aggettivi e ogni stato le sue forme', () => {
    for (const [c, lista] of Object.entries(AGGETTIVI)) {
      expect(lista.length, c).toBeGreaterThanOrEqual(3);
      for (const [ma, fe] of lista) {
        // Il femminile di un aggettivo in -o finisce in -a; gli altri restano uguali.
        if (ma.endsWith('o')) expect(fe, ma).toBe(`${ma.slice(0, -1)}a`);
        else expect(fe, ma).toBe(ma);
      }
    }
    for (const stato of [1, 2, 3, 4]) {
      const forme = formeDi(stato);
      expect(forme.filter(([, , c]) => c === undefined).length).toBeGreaterThanOrEqual(6);
      // Un nome in -a è femminile, tranne quelli che vengono dal greco come il miasma.
      for (const [f, g] of forme) expect(f.endsWith('a') && g === 'm' && f !== 'Miasma', f).toBe(false);
    }
  });
});
