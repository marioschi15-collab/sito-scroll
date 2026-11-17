import { describe, expect, it } from 'vitest';
import { C, INGOMBRO } from '../src/motore/cose.js';
import { ALBERO, M, TRONCO } from '../src/motore/materiali.js';
import type { Mondo } from '../src/motore/mondo.js';
import { COSE_MAX } from '../src/motore/posa.js';
import { albero, gira, lago, mondo, mondoVero, quanti, riempi } from './aiuti.js';

const TUTTE = Object.keys(INGOMBRO).map(Number);

/** Un piano di roccia alla riga 60, con tutte le invenzioni già scoperte. */
function piano(w = 200): Mondo {
  const m = mondo(w, 90);
  riempi(m, 0, 60, w - 1, 89, M.ROCCIA);
  for (const id of TUTTE) m.visti.add(id);
  return m;
}

/** Il perché di un rifiuto (o 'si' se lì la cosa si può posare). */
function esito(m: Mondo, id: number, x: number, y: number): string {
  const dove = m.puoPosare(id, x, y);
  return dove.si ? 'si' : dove.perche;
}

/** Quante colonne dell'ingombro hanno il terreno subito sotto la cosa, e quanto è fondo il vuoto più fondo. */
function appoggio(m: Mondo, n: number): { rette: number; vuoto: number } {
  const c = m.cose[n];
  let rette = 0;
  let vuoto = 0;
  for (let x = c.x; x < c.x + INGOMBRO[c.id][0]; x++) {
    let y = c.y + 1;
    while (y < m.h && m.leggi(x, y) === M.VUOTO) y++;
    if (y === c.y + 1) rette++;
    vuoto = Math.max(vuoto, y - c.y - 1);
  }
  return { rette, vuoto };
}

describe('dove una costruzione può stare', () => {
  it('due case nello stesso punto non si sovrappongono, e nemmeno un castello sopra una casa', () => {
    const m = piano();
    expect(m.posa(C.CASA, 95, 40)).toBe(true);
    expect(m.posa(C.CASA, 95, 40)).toBe(false);
    expect(esito(m, C.CASA, 95, 40)).toBe('occupato');
    expect(esito(m, C.CASTELLO, 99, 59)).toBe('occupato');
    expect(esito(m, C.FALO, 90, 20)).toBe('occupato');
    expect(m.cose.length).toBe(1);
    // Di fianco sì, anche a contatto: due tratti di mura fanno un muro solo.
    expect(m.posa(C.MURA, 105, 40)).toBe(true);
    expect(m.posa(C.MURA, 113, 40)).toBe(true);
    expect(m.cose.map((c) => [c.x, c.y])).toEqual([
      [90, 59],
      [101, 59],
      [109, 59],
    ]);
  });

  it('si posa a terra dovunque si tocchi: dal cielo scende, da dentro la roccia risale', () => {
    const m = piano();
    expect(m.puoPosare(C.CASA, 50, 5)).toEqual({ si: true, x: 45, y: 59 });
    expect(m.puoPosare(C.CASA, 50, 59)).toEqual({ si: true, x: 45, y: 59 });
    expect(m.puoPosare(C.CASA, 50, 75)).toEqual({ si: true, x: 45, y: 59 });
    // Ai bordi del mondo resta dentro.
    expect(m.puoPosare(C.CASA, 0, 30)).toEqual({ si: true, x: 0, y: 59 });
    expect(m.puoPosare(C.CASA, 199, 30)).toEqual({ si: true, x: 189, y: 59 });
    // Ciò che non si conosce ancora, o non è una cosa da posare, non si posa.
    const nuovo = mondo(200, 90);
    riempi(nuovo, 0, 60, 199, 89, M.ROCCIA);
    expect(esito(nuovo, C.CASA, 50, 30)).toBe('ignota');
    expect(esito(m, C.UTENSILE, 50, 30)).toBe('ignota');
  });

  it('una casa sull’orlo di un dirupo non resta a sbalzo: lì non si posa', () => {
    const m = piano();
    riempi(m, 100, 60, 199, 77, M.VUOTO);
    for (let x = 80; x <= 120; x++) {
      const dove = m.puoPosare(C.CASA, x, 40);
      // O sta tutta sul piano, o tutta in fondo al dirupo: a cavallo dell'orlo, mai.
      if (dove.si) expect(dove.x + 11 <= 100 || dove.x >= 100).toBe(true);
      else expect(dove.perche).toBe('pende');
    }
    expect(esito(m, C.CASA, 100, 40)).toBe('pende');
    expect(m.posa(C.CASA, 100, 40)).toBe(false);
    expect(m.posa(C.CASA, 94, 40)).toBe(true);
    expect(appoggio(m, 0)).toEqual({ rette: 11, vuoto: 0 });
    expect(m.puoPosare(C.CASA, 110, 40)).toEqual({ si: true, x: 105, y: 77 });
  });

  it('su un pendio dolce si appoggia al punto più alto; su uno ripido non si posa', () => {
    const dolce = piano();
    // Dalla colonna 80 il terreno scende di una cella ogni quattro colonne: sotto una casa larga 11, di due o tre celle.
    for (let x = 80; x < 200; x++) riempi(dolce, x, 60, x, 59 + Math.min(20, Math.floor((x - 80) / 4)), M.VUOTO);
    expect(dolce.posa(C.CASA, 100, 40)).toBe(true);
    const c = dolce.cose[0];
    let alto = dolce.h;
    for (let x = c.x; x < c.x + 11; x++) alto = Math.min(alto, dolce.suolo(x));
    expect(c.y).toBe(alto - 1);
    expect(appoggio(dolce, 0).vuoto).toBeLessThanOrEqual(3);
    gira(dolce, 200);
    expect(dolce.cose[0].y).toBe(alto - 1);

    const ripido = piano();
    // Qui scende di una cella ogni due colonne: sotto la casa sarebbero cinque.
    for (let x = 80; x < 200; x++) riempi(ripido, x, 60, x, 59 + Math.min(20, Math.floor((x - 80) / 2)), M.VUOTO);
    expect(esito(ripido, C.CASA, 100, 40)).toBe('pende');
    // Una cosa stretta, sullo stesso pendio, ci sta.
    expect(esito(ripido, C.FALO, 100, 40)).toBe('si');
  });

  it('sul terreno vero del gioco ogni cosa posata ha la terra sotto, e mai più di tre celle di vuoto', () => {
    for (const seme of [1, 2, 3]) {
      const m = mondoVero(seme);
      for (const id of TUTTE) m.visti.add(id);
      let posate = 0;
      for (let x = 6; x < m.w - 6; x += 5) {
        if (!m.posa(C.CASA, x, 20)) continue;
        const { rette, vuoto } = appoggio(m, posate++);
        expect(rette).toBeGreaterThanOrEqual(1);
        expect(vuoto).toBeLessThanOrEqual(3);
      }
      expect(posate).toBeGreaterThan(5);
      const quote = m.cose.map((c) => c.y);
      gira(m, 300);
      expect(m.cose.map((c) => c.y)).toEqual(quote);
    }
  });

  it('barca e ponte solo sull’acqua, tutto il resto solo all’asciutto', () => {
    const m = mondoVero(5);
    for (const id of TUTTE) m.visti.add(id);
    const { x0, x1, pelo } = lago(m, 12);
    const mezzo = (x0 + x1) >> 1;
    const asciutto = x1 + 30;
    expect(esito(m, C.BARCA, asciutto, 20)).toBe('asciutto');
    expect(esito(m, C.PONTE, asciutto, 20)).toBe('asciutto');
    // A galla: lo scafo pesca una cella, il resto sta sopra il pelo dell'acqua.
    expect(m.puoPosare(C.BARCA, mezzo, 20)).toEqual({ si: true, x: mezzo - 4, y: pelo });
    // Anche toccando sott'acqua, la barca finisce a galla.
    expect(m.puoPosare(C.BARCA, mezzo, pelo + 5)).toEqual({ si: true, x: mezzo - 4, y: pelo });
    for (const id of TUTTE) {
      if (id === C.BARCA || id === C.PONTE) continue;
      expect(esito(m, id, mezzo, 20)).toBe('bagnato');
    }
    expect(m.posa(C.CASA, mezzo, 20)).toBe(false);
    expect(m.posa(C.BARCA, mezzo, 20)).toBe(true);
    gira(m, 400);
    expect(Math.abs(m.cose[0].y - pelo)).toBeLessThanOrEqual(1);
  });

  it('una pozzanghera non impedisce di costruire; l’acqua fonda sì', () => {
    const m = piano();
    // L'acqua appena versata su un piano si stende in un velo di due o tre celle: lì si costruisce lo stesso.
    riempi(m, 40, 57, 60, 59, M.ACQUA);
    expect(m.puoPosare(C.CASA, 50, 30)).toEqual({ si: true, x: 45, y: 59 });
    riempi(m, 40, 56, 60, 56, M.ACQUA);
    expect(esito(m, C.CASA, 50, 30)).toBe('bagnato');
    // E dove l'acqua è fonda solo sotto un angolo della casa, va ancora bene.
    expect(esito(m, C.CASA, 63, 30)).toBe('si');
  });

  it('la neve e la cenere che stanno cadendo non impediscono di costruire; quelle posate sono terreno', () => {
    const m = piano();
    // Un fiocco per aria sopra il punto scelto e un po' di cenere a mezz'aria: non sono terreno.
    m.metti(40 * m.w + 52, M.NEVE);
    m.metti(55 * m.w + 47, M.CENERE);
    expect(m.puoPosare(C.CASA, 50, 30)).toEqual({ si: true, x: 45, y: 59 });
    // Due celle di neve posata, invece, alzano la casa di due.
    riempi(m, 100, 58, 130, 59, M.NEVE);
    expect(m.puoPosare(C.CASA, 115, 30)).toEqual({ si: true, x: 110, y: 57 });
  });

  it('sotto un soffitto basso ci sta solo ciò che è abbastanza basso', () => {
    const m = piano();
    // Una tettoia di pietra a cinque celle da terra: sotto, il falò (alto quattro) ci sta, la casa (alta otto) no.
    riempi(m, 40, 53, 60, 54, M.PIETRA);
    expect(esito(m, C.CASA, 50, 58)).toBe('stretto');
    expect(m.puoPosare(C.FALO, 50, 58)).toEqual({ si: true, x: 48, y: 59 });
    // Toccando sopra la tettoia, la casa si posa sul tetto di pietra.
    expect(m.puoPosare(C.CASA, 50, 30)).toEqual({ si: true, x: 45, y: 52 });
  });

  it('le piante dentro l’ingombro si tolgono alla posa', () => {
    const m = piano();
    riempi(m, 40, 57, 60, 59, M.PIANTA);
    albero(m, 50, 9);
    albero(m, 70, 9);
    m.metti(59 * m.w + 52, M.FUNGO);
    m.metti(58 * m.w + 53, M.FRUTTO, 200);
    // Un albero non fa da terreno: la casa si posa a terra, non in cima al tronco.
    expect(m.puoPosare(C.CASA, 50, 30)).toEqual({ si: true, x: 45, y: 59 });
    expect(m.posa(C.CASA, 50, 30)).toBe(true);
    for (let x = 45; x <= 55; x++) for (let y = 0; y <= 59; y++) expect(m.leggi(x, y)).toBe(M.VUOTO);
    // Un albero che sta nell'ingombro solo col piede se ne va tutto: non resta un ciuffo di foglie sospeso.
    riempi(m, 150, 57, 170, 59, M.VUOTO);
    for (let k = 0; k < 9; k++) m.metti((59 - k) * m.w + 160 + (k >> 1), M.LEGNO, TRONCO);
    riempi(m, 162, 48, 166, 50, M.PIANTA);
    // Anche i frutti e i funghi della chioma: tolte le foglie, non restano appesi al cielo.
    m.metti(47 * m.w + 164, M.FRUTTO, 200);
    m.metti(49 * m.w + 167, M.FUNGO);
    expect(m.posa(C.FALO, 160, 30)).toBe(true);
    expect(quanti(m, M.LEGNO)).toBe(9);
    for (let x = 156; x <= 168; x++) for (let y = 40; y <= 59; y++) expect(m.leggi(x, y)).toBe(M.VUOTO);
    // Fuori dall'ingombro resta tutto: l'erba accanto e l'altro albero.
    expect(m.leggi(44, 59)).toBe(M.PIANTA);
    expect(m.leggi(56, 59)).toBe(M.PIANTA);
    expect(m.leggi(70, 55)).toBe(M.LEGNO);
    // La chioma di un albero vicino che sporge sopra il tetto resta attaccata al suo albero.
    albero(m, 30, 12);
    expect(m.posa(C.FALO, 26, 30)).toBe(true);
    expect(m.leggi(28, 46)).toBe(M.PIANTA);
    expect(m.leggi(30, 50)).toBe(M.LEGNO);
    // Il legno messo da chi gioca, invece, è terreno: ci si costruisce sopra.
    riempi(m, 120, 56, 140, 59, M.LEGNO);
    expect(m.puoPosare(C.CASA, 130, 30)).toEqual({ si: true, x: 125, y: 55 });
  });

  it(`al tetto di ${COSE_MAX} cose non se ne posano altre, e si sa perché`, () => {
    const m = piano(1400);
    for (let k = 0; k < COSE_MAX; k++) expect(m.posa(C.FALO, 5 + k * 6, 30)).toBe(true);
    expect(m.cose.length).toBe(COSE_MAX);
    expect(esito(m, C.FALO, 1300, 30)).toBe('troppe');
    expect(m.posa(C.FALO, 1300, 30)).toBe(false);
    m.cancella(7, 58, 1);
    expect(m.cose.length).toBe(COSE_MAX - 1);
    expect(m.posa(C.FALO, 1300, 30)).toBe(true);
    // Ogni cosa ha il suo numero d'ordine, anche dopo che una è stata tolta.
    expect(new Set(m.cose.map((c) => c.n)).size).toBe(COSE_MAX);
  });
});

describe('una cosa posata scende soltanto', () => {
  it('un albero non solleva una casa: sotto e dentro l’ingombro non germoglia e non cresce niente', () => {
    const m = mondo(120, 90);
    riempi(m, 0, 60, 119, 89, M.HUMUS);
    m.visti.add(C.CASA);
    expect(m.posa(C.CASA, 60, 30)).toBe(true);
    const { x, y } = m.cose[0];
    // Un germoglio d'albero finito proprio sotto il centro della casa (come un frutto caduto lì prima), e uno accanto.
    m.metti(y * m.w + 60, M.PIANTA, ALBERO + 10);
    m.metti(y * m.w + x - 6, M.PIANTA, ALBERO + 10);
    gira(m, 20000);
    expect(m.cose[0].y).toBe(y);
    let dentro = 0;
    let fuori = 0;
    let troncoAccanto = 0;
    for (let cx = 0; cx < m.w; cx++) {
      for (let cy = 0; cy <= y; cy++) {
        const t = m.leggi(cx, cy);
        if (t !== M.LEGNO && t !== M.PIANTA) continue;
        // Dentro l'ingombro: le otto righe della casa, da un muro all'altro.
        if (cx >= x && cx < x + 11 && cy > y - 8) dentro++;
        else if (cx < x - 12 || cx > x + 22) fuori++;
        else if (t === M.LEGNO && cx < x) troncoAccanto++;
      }
    }
    // Sul terriccio intorno il prato è cresciuto e l'albero accanto pure; dove sta la casa c'è solo il germoglio di prima.
    expect(fuori).toBeGreaterThan(50);
    expect(troncoAccanto).toBeGreaterThanOrEqual(8);
    expect(dentro).toBe(1);
  });

  it('una casa rimasta in cima a un tronco (in una partita di prima) torna a terra', () => {
    const m = piano();
    for (let yy = 52; yy <= 59; yy++) m.metti(yy * m.w + 95, M.LEGNO, TRONCO);
    m.cose.push({ id: C.CASA, x: 90, y: 51, n: 1 });
    gira(m, 100);
    expect(m.cose[0].y).toBe(59);
  });

  it('la sabbia che le cade addosso non la solleva, e nemmeno l’acqua', () => {
    const m = piano();
    m.posa(C.CASA, 100, 40);
    m.posa(C.FORNACE, 60, 40);
    riempi(m, 85, 10, 115, 45, M.SABBIA);
    riempi(m, 50, 30, 70, 50, M.ACQUA);
    gira(m, 600);
    expect(quanti(m, M.SABBIA)).toBeGreaterThan(900);
    expect(m.cose.map((c) => c.y)).toEqual([59, 59]);
  });

  it('se il terreno sotto cede scende, e quando torna non risale', () => {
    const m = piano();
    riempi(m, 80, 56, 120, 59, M.TERRA);
    m.posa(C.CASA, 100, 40);
    expect(m.cose[0].y).toBe(55);
    // Tolta metà della terra, resta dov'è: l'altra metà la regge ancora.
    riempi(m, 95, 56, 99, 59, M.VUOTO);
    gira(m, 50);
    expect(m.cose[0].y).toBeLessThanOrEqual(56);
    // Tolta tutta, scende fino alla roccia.
    riempi(m, 80, 50, 120, 59, M.VUOTO);
    gira(m, 50);
    expect(m.cose[0].y).toBe(59);
    riempi(m, 80, 57, 120, 59, M.TERRA);
    gira(m, 200);
    expect(m.cose[0].y).toBe(59);
  });

  it('la barca segue il pelo dell’acqua, in su e in giù; la pioggia non la solleva', () => {
    const m = mondo(120, 90);
    riempi(m, 0, 70, 119, 89, M.ROCCIA);
    riempi(m, 0, 40, 9, 69, M.ROCCIA);
    riempi(m, 110, 40, 119, 69, M.ROCCIA);
    riempi(m, 10, 60, 109, 69, M.ACQUA);
    m.visti.add(C.BARCA);
    expect(m.posa(C.BARCA, 60, 30)).toBe(true);
    expect(m.cose[0].y).toBe(60);
    // Piove: gocce che attraversano la barca, per un bel po'. Il lago quasi non cambia, e la barca non si muove.
    for (let k = 0; k < 400; k++) {
      if (k % 8 === 0) m.metti(45 * m.w + 56 + ((k >> 3) % 9), M.ACQUA);
      m.passo();
      expect(m.cose[0].y).toBe(60);
    }
    // Il lago sale di quattro celle: la barca resta a galla.
    riempi(m, 10, 56, 109, 59, M.ACQUA);
    gira(m, 200);
    expect(m.cose[0].y).toBeLessThanOrEqual(57);
    expect(m.cose[0].y).toBeGreaterThanOrEqual(55);
    // Il lago se ne va: la barca si posa sul fondo.
    riempi(m, 10, 40, 109, 69, M.VUOTO);
    gira(m, 100);
    expect(m.cose[0].y).toBe(69);
  });
});
