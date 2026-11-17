import { describe, expect, it } from 'vitest';
import { C, CONSEGUENZE, E, ERE, RISULTATI, unione, vieDi } from '../src/motore/cose.js';
import { SOLO_NEL_MONDO, coppiaDEsempio, esitoNoto, fenomenoDi, siUnisce } from '../src/motore/esiti.js';
import { BRUCIA, ESPLOSIONE, INCENDIO, M, N_BASE, NASCOSTO, PRIMA_ID_MISCELA, PRIMA_MISCELA, TEMPORALE } from '../src/motore/materiali.js';
import { idMiscela } from '../src/motore/miscele.js';
import type { Mondo } from '../src/motore/mondo.js';
import { ACCENDI, COPPIE } from '../src/motore/ricette.js';
import { fotografa, ripristina } from '../src/salvataggio.js';
import { INIZIALI, SCOPERTE, vociTrovate } from '../src/scoperte.js';
import { gira, libroDa12, mondo, quanti, riempi } from './aiuti.js';

describe('unire due scoperte', () => {
  it('pietra e legno fanno l’utensile, e con lui comincia l’età della pietra', () => {
    const m = mondo();
    expect(m.unisci(M.PIETRA, M.LEGNO)).toBe(-1);
    m.visti.add(M.PIETRA).add(M.LEGNO);
    expect(m.unisci(M.LEGNO, M.PIETRA)).toBe(C.UTENSILE);
    expect(m.visti.has(C.UTENSILE)).toBe(true);
    expect(m.visti.has(E.PIETRA)).toBe(true);
    expect(m.novita.map((n) => n.id)).toEqual([C.UTENSILE, E.PIETRA]);
    // due materiali senza un'unione scritta danno la loro miscela, ma solo da quando il Libro ha dodici voci;
    // un'invenzione con qualcosa a caso, niente
    m.visti.add(M.SABBIA);
    expect(m.unisci(M.SABBIA, M.LEGNO)).toBe(-1);
    expect(m.giaProvata(M.SABBIA, M.LEGNO)).toBe(false);
    libroDa12(m);
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

describe('Unisci conosce le reazioni del mondo', () => {
  /** Un mondo in cui tutti i materiali e tutte le invenzioni sono già noti: ogni coppia si può provare. */
  function saputo(): Mondo {
    const m = mondo(40, 40);
    for (const voce of SCOPERTE) if (siUnisce(voce.id)) m.visti.add(voce.id);
    return m;
  }

  it('terra e acqua fanno fango, come nel mondo: le coppie dei primi minuti danno ciò che il Libro racconta', () => {
    const m = mondo();
    expect(m.unisci(M.TERRA, M.ACQUA)).toBe(M.FANGO);
    expect(m.unisci(M.TERRA, M.FUOCO)).toBe(M.LAVA);
    expect(m.unisci(M.ACQUA, M.FUOCO)).toBe(M.VAPORE);
    expect(m.unisci(M.TERRA, M.ARIA)).toBe(M.SABBIA);
    expect(m.unisci(M.LAVA, M.ACQUA)).toBe(M.PIETRA);
    expect(m.unisci(M.VAPORE, M.ARIA)).toBe(M.NUVOLA);
    expect(m.unisci(M.FUOCO, M.ARIA)).toBe(M.FUMO);
    // Sono scoperte del Libro, nell'ordine in cui sono nate; nessuna miscela.
    expect(m.novita.map((n) => n.id)).toEqual([M.FANGO, M.LAVA, M.VAPORE, M.SABBIA, M.PIETRA, M.NUVOLA, M.FUMO]);
    expect(m.ricettario.size).toBe(0);
    expect([...m.visti].every((id) => id < PRIMA_ID_MISCELA)).toBe(true);
    // L'ordine in cui si scelgono le due cose non conta, e una coppia già provata dà la stessa cosa.
    expect(m.unisci(M.ACQUA, M.TERRA)).toBe(M.FANGO);
    expect(m.unisci(M.ARIA, M.ACQUA)).toBe(M.VAPORE);
    expect(m.novita.length).toBe(7);
  });

  it('per ogni coppia di ricette.ts, portata una sopra l’altra nel mondo, le celle cambiano davvero; Unisci dà lo stesso esito, e mai una miscela', () => {
    for (const [a, b, primo, secondo, inUnisci] of COPPIE) {
      const coppia = `${a} + ${b}`;
      const invenzione = unione(a, b);
      const accende = primo === ACCENDI || secondo === ACCENDI;
      const materia = primo > 0 ? primo : secondo;
      // Ciò che brucia, nella coppia: l'altra è la fiamma.
      const brucia = [a, b].find((x) => x !== M.FUOCO && x !== M.LAVA && x !== M.FULMINE) ?? a;
      // Nel mondo: un blocco di una delle due, e l'altra portata sopra; in almeno uno dei due versi le celle cambiano.
      const versi = [
        [a, b],
        [b, a],
      ].map(([gettone, sotto]) => {
        const m = saputo();
        riempi(m, 10, 20, 29, 24, sotto);
        const prima = quanti(m, accende ? brucia : materia);
        m.porta(gettone, 20, 20, 'gettone');
        if (accende) gira(m, 20);
        // Né un verso né l'altro fanno mai una miscela.
        expect(m.ricettario.size, coppia).toBe(0);
        expect(m.tipo.some((t) => t >= PRIMA_MISCELA), coppia).toBe(false);
        // Dove la coppia è anche un'invenzione (legno e fuoco: il falò) nasce quella, e le celle possono restare come sono.
        if (invenzione >= 0) return m.visti.has(invenzione);
        if (accende) return quanti(m, brucia) < prima || m.botti.length > 0;
        return quanti(m, materia) > prima;
      });
      expect(versi, coppia).toContain(true);

      // In Unisci: la stessa cosa. Dove la coppia è anche un'invenzione (legno e fuoco: il falò) Unisci dà quella;
      // di ciò che brucia Unisci mostra quello che resta (o dice che l'esplosione va vista nel mondo).
      const u = saputo();
      const esito = u.unisci(a, b);
      expect(u.unisci(b, a), coppia).toBe(esito);
      expect(u.ricettario.size, coppia).toBe(0);
      expect(esito, coppia).not.toBe(-1);
      if (invenzione >= 0) expect(esito, coppia).toBe(invenzione);
      else if (accende) expect(esito, coppia).toBe(inUnisci! < N_BASE ? inUnisci : SOLO_NEL_MONDO);
      else expect(esito, coppia).toBe(materia);
    }
  });

  it('tutto ciò che brucia ha la sua riga con il fuoco, con la lava e con il fulmine', () => {
    for (let t = 1; t < N_BASE; t++) {
      if (!BRUCIA[t]) continue;
      for (const fiamma of [M.FUOCO, M.LAVA, M.FULMINE]) {
        expect(esitoNoto(t, fiamma) >= 0 || fenomenoDi(t, fiamma) >= 0, `${t} + ${fiamma}`).toBe(true);
      }
    }
  });

  it('le vie dei fenomeni non vengono regalate: succedono solo nel mondo', () => {
    const m = saputo();
    expect(m.unisci(M.POLVERE_NERA, M.FUOCO)).toBe(SOLO_NEL_MONDO);
    expect(m.unisci(M.LAVA, M.POLVERE_NERA)).toBe(SOLO_NEL_MONDO);
    expect(fenomenoDi(M.FUOCO, M.POLVERE_NERA)).toBe(ESPLOSIONE);
    expect(m.visti.has(ESPLOSIONE)).toBe(false);
    expect(m.novita.length).toBe(0);
    expect(m.ricettario.size).toBe(0);
    // Vale per ogni fenomeno o paesaggio del Libro che nasce da due cose: Unisci non lo scopre al posto del mondo.
    let provati = 0;
    for (const voce of SCOPERTE) {
      // Ciò che nasce da un'unione scritta (l'Omino, alla capanna con un frutto) non è un fenomeno: lo dà Unisci.
      if (voce.id < N_BASE || voce.sezione === 'cose' || voce.sezione === 'ere' || RISULTATI.has(voce.id)) continue;
      for (const via of voce.nasce) {
        if (via.con.length !== 2) continue;
        const n = mondo();
        for (const id of via.con) n.visti.add(id);
        const esito = n.unisci(via.con[0], via.con[1]);
        expect(esito, voce.nome).not.toBe(voce.id);
        expect(esito, voce.nome).toBeLessThan(PRIMA_ID_MISCELA);
        expect(n.visti.has(voce.id), voce.nome).toBe(false);
        provati++;
      }
    }
    expect(provati).toBeGreaterThanOrEqual(3);
    expect(fenomenoDi(TEMPORALE, M.FUOCO)).toBe(-1);
    // Legno e fuoco sono anche la via dell'incendio, ma in Unisci vince l'invenzione: il falò.
    expect(m.unisci(M.LEGNO, M.FUOCO)).toBe(C.FALO);
    expect(m.visti.has(INCENDIO)).toBe(false);
  });

  it('ogni materiale del Libro che nasce da due ingredienti si ottiene anche in Unisci, piante e legno compresi', () => {
    const m = saputo();
    const ottenibili = new Set<number>();
    for (let a = 1; a < N_BASE; a++) {
      for (let b = a + 1; b < N_BASE; b++) {
        if (!NASCOSTO[a] && !NASCOSTO[b] && (unione(a, b) >= 0 || esitoNoto(a, b) >= 0)) ottenibili.add(m.unisci(a, b));
      }
    }
    for (const voce of SCOPERTE) {
      if (voce.id >= N_BASE || INIZIALI.includes(voce.id)) continue;
      if (voce.nasce.some((via) => via.con.length === 2)) expect(ottenibili.has(voce.id), voce.nome).toBe(true);
    }
    // Ciò che nel mondo nasce col tempo ha la sua coppia anche se il Libro lo racconta con un ingrediente solo.
    for (const id of [M.PIANTA, M.LEGNO, M.FUNGO, M.MUSCHIO, M.ALGA, M.FRUTTO, M.CARBONE, M.CENERE, M.FUMO]) expect(ottenibili.has(id), `materiale ${id}`).toBe(true);
    expect(m.ricettario.size).toBe(0);
  });

  it('partendo dai quattro elementi, con il solo Unisci si arriva all’utensile e all’età della pietra', () => {
    const m = mondo();
    for (let giro = 0; giro < 12; giro++) {
      const miei = [...m.visti].filter(siUnisce);
      for (const a of miei) for (const b of miei) if (a < b && (unione(a, b) >= 0 || esitoNoto(a, b) >= 0)) m.unisci(a, b);
    }
    for (const id of [M.FANGO, M.ALGA, M.PIANTA, M.CENERE, M.HUMUS, M.LEGNO, M.PIETRA, C.UTENSILE, E.PIETRA, C.CAPANNA, C.FALO]) {
      expect(m.visti.has(id), `scoperta ${id}`).toBe(true);
    }
    expect(m.ricettario.size).toBe(0);
  });

  it('una coppia che ha già un esito scritto a mano non dà mai una miscela, nemmeno chiedendola apposta', () => {
    const m = saputo();
    expect(m.registra(M.TERRA, M.ACQUA)).toBe(-1);
    expect(m.registra(M.ACQUA, M.TERRA)).toBe(-1);
    expect(m.registra(M.PIETRA, M.LEGNO)).toBe(-1);
    expect(m.registra(M.POLVERE_NERA, M.FUOCO)).toBe(-1);
    expect(m.registra(M.LEGNO, M.ACQUA)).toBe(-1);
    for (const [a, b] of COPPIE) expect(m.registra(a, b), `${a} + ${b}`).toBe(-1);
    expect(m.ricettario.size).toBe(0);
    // Le coppie davvero senza esito restano miscele, anche quelle fatte con un'altra miscela.
    const miscela = m.registra(M.SABBIA, M.LEGNO);
    expect(miscela).toBe(idMiscela(M.SABBIA, M.LEGNO));
    expect(m.registra(miscela, M.TERRA)).toBeGreaterThanOrEqual(PRIMA_ID_MISCELA);
    expect(m.unisci(M.SABBIA, M.ACQUA)).toBe(idMiscela(M.SABBIA, M.ACQUA));
  });

  it('pietra portata dove c’è il legno scopre l’utensile, come Unisci, e lascia le celle come sono', () => {
    const m = mondo();
    riempi(m, 20, 50, 40, 59, M.PIETRA);
    riempi(m, 20, 45, 40, 49, M.LEGNO);
    expect(m.porta(M.PIETRA, 30, 45, 'gettone')).toMatchObject({ genere: 'unione', nato: C.UTENSILE });
    expect(m.visti.has(C.UTENSILE)).toBe(true);
    expect(m.visti.has(E.PIETRA)).toBe(true);
    expect(quanti(m, M.PIETRA)).toBe(21 * 10);
    expect(quanti(m, M.LEGNO)).toBe(21 * 5);
    expect(m.ricettario.size).toBe(0);
  });

  it('dove una coppia è insieme una reazione del mondo e un’invenzione, portandole una sull’altra nasce l’invenzione e, se non distrugge, avviene la reazione', () => {
    // Per ogni invenzione che nasce da due materiali: portati uno sull'altro nel mondo la scoprono, proprio come in Unisci.
    let anche = 0;
    for (const [a, b, invenzione] of Object.values(C).flatMap((id) => vieDi(id).map(([x, y]) => [x, y, id] as const))) {
      if (a >= N_BASE || b >= N_BASE) continue;
      const m = mondo();
      riempi(m, 10, 35, 49, 39, b);
      m.porta(a, 30, 35, 'gettone');
      expect(m.visti.has(invenzione), `${a} + ${b}`).toBe(true);
      expect(m.ricettario.size, `${a} + ${b}`).toBe(0);
      if (esitoNoto(a, b) >= 0) anche++;
    }
    // Pietra e acqua (pozzo e muschio), legno e fuoco (falò e fiamme), legno e pianta (capanna e frutto).
    expect(anche).toBe(3);
    const m = mondo();
    riempi(m, 10, 35, 49, 39, M.ACQUA);
    m.porta(M.PIETRA, 30, 35, 'gettone');
    expect(m.visti.has(C.POZZO)).toBe(true);
    expect(m.visti.has(M.MUSCHIO)).toBe(true);
    expect(quanti(m, M.MUSCHIO)).toBeGreaterThan(0);
  });

  it('ciò che nel mondo nasce col tempo, portato sopra nasce subito: un germoglio sul terriccio bagnato', () => {
    const m = mondo();
    riempi(m, 10, 55, 50, 59, M.HUMUS);
    m.porta(M.ACQUA, 30, 55, 'gettone');
    expect(m.visti.has(M.PIANTA)).toBe(true);
    // È un germoglio vero, che cresce da sé: dopo un po' di piante ce ne sono di più.
    const subito = quanti(m, M.PIANTA) + quanti(m, M.LEGNO);
    expect(subito).toBeGreaterThan(0);
    gira(m, 1500);
    expect(quanti(m, M.PIANTA) + quanti(m, M.LEGNO)).toBeGreaterThan(subito);
  });

  it('le miscele non sono voci del Libro: non contano per le dodici voci', () => {
    const m = mondo();
    m.visti.add(M.SABBIA);
    for (const altra of [M.ACQUA, M.FUOCO, M.FANGO]) {
      m.visti.add(altra);
      // Prima della dodicesima voce Unisci non mescola, e una miscela fatta nascere apposta non cambia il conto.
      expect(m.unisci(M.SABBIA, altra)).toBe(-1);
      const miscela = m.registra(M.SABBIA, altra);
      expect(miscela).toBeGreaterThanOrEqual(PRIMA_ID_MISCELA);
      m.scopri(miscela, 0, 0);
    }
    // quattro elementi, sabbia, fango e tre miscele: nove scoperte, ma solo due voci nuove del Libro
    expect(m.visti.size).toBe(9);
    expect(vociTrovate(m.visti)).toBe(6);
    expect(m.unisci(M.TERRA, M.FUOCO)).toBe(M.LAVA);
    expect(vociTrovate(m.visti)).toBe(7);
  });

  it('l’esempio che Unisci suggerisce è fatto di cose possedute, e porta a qualcosa di nuovo finché c’è', () => {
    expect(coppiaDEsempio(new Set(INIZIALI))).toEqual([M.TERRA, M.ACQUA]);
    expect(coppiaDEsempio(new Set([M.TERRA]))).toBeNull();
    const m = mondo();
    for (let giro = 0; giro < 12; giro++) {
      const esempio = coppiaDEsempio(m.visti)!;
      expect(m.visti.has(esempio[0]) && m.visti.has(esempio[1])).toBe(true);
      const prima = m.visti.size;
      expect(m.unisci(esempio[0], esempio[1])).toBeGreaterThan(0);
      expect(m.visti.size).toBeGreaterThan(prima);
    }
    expect(m.ricettario.size).toBe(0);
    // Quando non c'è più niente di nuovo da suggerire, resta comunque una coppia vera e già nota.
    const tutto = new Set(SCOPERTE.map((voce) => voce.id));
    const nota = coppiaDEsempio(tutto)!;
    expect(tutto.has(nota[0]) && tutto.has(nota[1])).toBe(true);
  });
});
