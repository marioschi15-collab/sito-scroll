import { describe, expect, it } from 'vitest';
import {
  chiaveDi,
  conseguenze,
  costruzioni,
  ere,
  idDi,
  ingombroDaFigura,
  ingombroDi,
  numeri,
  paesaggi,
  schede,
  tipoDi,
  vociDelCapitolo,
  voce,
  voci,
} from '../src/contenuti/registro.js';
import { TIPI_DI_PRIMA } from '../src/contenuti/tipi.js';
import { C, CONSEGUENZE_DI_PRIMA, E, ERE_DI_PRIMA, INGOMBRO_DI_PRIMA } from '../src/motore/cose.js';
import * as K from '../src/motore/materiali.js';
import { fotografa, ripristina } from '../src/salvataggio.js';
import { mondo, riempi } from './aiuti.js';

const { M } = K;

/** I sei file della grande infornata (P8): ognuno con il suo blocco di cento numeri. */
const BLOCCHI: Record<string, number> = { natura: 600, bottega: 700, citta: 800, macchine: 900, moderno: 1000, cielo: 1100 };
/**
 * La prima e l'ultima chiave di ogni blocco della grande infornata, e quante sono: fissate per sempre come quelle di
 * prima (i salvataggi contengono i numeri). Dentro un blocco i numeri sono senza buchi, quindi bastano queste.
 */
const BLOCCHI_FISSI: Record<string, readonly [string, string, number]> = {
  natura: ['seme', 'coniglio', 60],
  bottega: ['ascia', 'cuoco', 60],
  citta: ['papiro', 'cavaliere', 55],
  macchine: ['rinascimento', 'ingegnere', 55],
  moderno: ['eta-moderna', 'passi-sulla-luna', 50],
  cielo: ['sole', 'stormo', 35],
};

/**
 * I numeri di oggi, fissati per sempre: i salvataggi contengono questi numeri, e una partita salvata deve ritrovare
 * le stesse scoperte. Se una di queste righe cambia, le partite di chi gioca si guastano.
 */
const NUMERI_DI_OGGI: Record<string, number> = {
  terra: M.TERRA, acqua: M.ACQUA, fuoco: M.FUOCO, aria: M.ARIA, vapore: M.VAPORE, fango: M.FANGO, sabbia: M.SABBIA,
  lava: M.LAVA, pietra: M.PIETRA, nuvola: M.NUVOLA, fulmine: M.FULMINE, vetro: M.VETRO, argilla: M.ARGILLA,
  mattone: M.MATTONE, pianta: M.PIANTA, legno: M.LEGNO, cenere: M.CENERE, fumo: M.FUMO, neve: M.NEVE,
  ghiaccio: M.GHIACCIO, terriccio: M.HUMUS, ossidiana: M.OSSIDIANA, brace: M.BRACE, roccia: M.ROCCIA,
  carbone: M.CARBONE, metallo: M.METALLO, ruggine: M.RUGGINE, zolfo: M.ZOLFO, 'polvere-nera': M.POLVERE_NERA,
  acido: M.ACIDO, diamante: M.DIAMANTE, muschio: M.MUSCHIO, alga: M.ALGA, fungo: M.FUNGO, frutto: M.FRUTTO,
  omino: K.OMINO, villaggio: K.VILLAGGIO, bambino: K.BAMBINO, fiore: K.FIORE, pioggia: K.PIOGGIA,
  arcobaleno: K.ARCOBALENO, notte: K.NOTTE, alba: K.ALBA, lago: K.LAGO, foresta: K.FORESTA, deserto: K.DESERTO,
  incendio: K.INCENDIO, eruzione: K.ERUZIONE, ghiacciaio: K.GHIACCIAIO, nevicata: K.NEVICATA,
  esplosione: K.ESPLOSIONE, temporale: K.TEMPORALE, lucciole: K.LUCCIOLE,
  utensile: C.UTENSILE, falo: C.FALO, capanna: C.CAPANNA, lancia: C.LANCIA, ruota: C.RUOTA, vaso: C.VASO,
  campo: C.CAMPO, pane: C.PANE, pozzo: C.POZZO, casa: C.CASA, fornace: C.FORNACE, bronzo: C.BRONZO, spada: C.SPADA,
  carro: C.CARRO, barca: C.BARCA, strada: C.STRADA, mura: C.MURA, torre: C.TORRE, tempio: C.TEMPIO,
  scrittura: C.SCRITTURA, moneta: C.MONETA, mulino: C.MULINO, castello: C.CASTELLO, citta: C.CITTA,
  mercato: C.MERCATO, libro: C.LIBRO, ferro: C.FERRO, aratro: C.ARATRO, ponte: C.PONTE, faro: C.FARO,
  // Le voci nate con le unioni del P3: i loro numeri erano in cose.ts, ora solo in numeri.ts.
  cacciatore: 230, contadino: 231, pescatore: 232, vasaio: 233, fornaio: 234, fabbro: 235, guerriero: 236,
  maestro: 237, mercante: 238, mugnaio: 239, 'guardiano-del-faro': 240, re: 241, artigiano: 242, carrettiere: 243,
  famiglia: 244, cantastorie: 245, viandante: 246, cittadino: 247, 'custode-del-tempio': 248, regno: 249,
  secchio: 260, fiaccola: 261, minestra: 262, farina: 263, focaccia: 264, veliero: 265, focolare: 266, fattoria: 267,
  porto: 268, raccolto: 269, biblioteca: 270, bottega: 271, orto: 272, frutteto: 273, accampamento: 274,
  'eta-della-pietra': E.PIETRA, 'fuoco-domato': E.FUOCO_DOMATO, agricoltura: E.AGRICOLTURA,
  'eta-del-bronzo': E.BRONZO, 'nasce-la-scrittura': E.NASCE_SCRITTURA, 'eta-antica': E.ANTICA,
  'eta-del-ferro': E.FERRO, commercio: E.COMMERCIO, medioevo: E.MEDIOEVO,
};

/** I numeri delle scoperte nuove della prima infornata (src/contenuti/campagna.ts): fissati anche loro. */
const NUMERI_NUOVI: Record<string, number> = {
  lombrico: 500, ape: 501, uccello: 502, pesce: 503, rana: 504, pecora: 505, miele: 506, lana: 507, rete: 508,
  flauto: 509, arnia: 510, spaventapasseri: 511, ovile: 512, apicoltore: 513, pastore: 514, tessitore: 515,
  musica: 516, danza: 517, acquazzone: 518, bufera: 519,
};

describe('i numeri delle scoperte', () => {
  it('quelli di oggi non cambiano mai, e la tavola non ne ha altri sotto il 500', () => {
    for (const [chiave, n] of Object.entries(NUMERI_DI_OGGI)) expect(idDi(chiave), chiave).toBe(n);
    const sotto500 = numeri().filter(([, n]) => n < 500);
    expect(sotto500.length).toBe(Object.keys(NUMERI_DI_OGGI).length);
    // Ogni voce del Libro ha una chiave, e chiave e numero vanno e tornano.
    for (const v of voci()) {
      expect(chiaveDi(v.id), v.nome).toBe(v.chiave);
      expect(idDi(v.chiave)).toBe(v.id);
    }
    expect(voci().length).toBe(460);
  });

  it('quelli della prima infornata nemmeno: da 500, nell’ordine in cui sono nati', () => {
    for (const [chiave, n] of Object.entries(NUMERI_NUOVI)) expect(idDi(chiave), chiave).toBe(n);
    expect(numeri().filter(([, n]) => n >= 500 && n < 600).map(([chiave]) => chiave)).toEqual(Object.keys(NUMERI_NUOVI));
  });

  it('la grande infornata ha sei blocchi di cento numeri, uno per file, e ogni scheda sta nel blocco del suo file', () => {
    const nuovi = numeri().filter(([, n]) => n >= 600);
    for (const [chiave, n] of nuovi) expect(n, chiave).toBeLessThan(1200);
    // Dentro ogni blocco i numeri crescono senza buchi: le chiavi dell'indice, poi quelle aggiunte in fondo.
    for (const base of Object.values(BLOCCHI)) {
      const blocco = nuovi.map(([, n]) => n).filter((n) => n >= base && n < base + 100);
      expect(blocco.length).toBeGreaterThan(0);
      expect(blocco).toEqual(blocco.map((_, i) => base + i));
    }
    for (const v of voci()) {
      if (v.file === undefined || !(v.file in BLOCCHI)) continue;
      expect(v.id >= BLOCCHI[v.file] && v.id < BLOCCHI[v.file] + 100, `${v.nome} (${v.file})`).toBe(true);
    }
    for (const [file, [prima, ultima, quante]] of Object.entries(BLOCCHI_FISSI)) {
      expect(idDi(prima), file).toBe(BLOCCHI[file]);
      expect(idDi(ultima), file).toBe(BLOCCHI[file] + quante - 1);
      expect(schede().filter(([f]) => f === file).length, file).toBe(quante);
    }
  });

  it('i numeri dalle schede nuove partono da 500 e non toccano i posti speciali (miscele, ere, cose)', () => {
    for (const [, n] of numeri()) if (n >= 500) expect(n).toBeLessThan(K.PRIMA_ID_MISCELA);
    expect(idDi('non-esiste')).toBe(-1);
  });

  it('una partita salvata prima delle schede si riapre con le stesse voci e le stesse cose posate', () => {
    // Una fotografia scritta a mano come quelle di allora: un mestiere, una cosa del paese e una capanna posata.
    const m = mondo(80, 60);
    riempi(m, 0, 50, 79, 59, M.PIETRA);
    const foto = JSON.parse(JSON.stringify(fotografa(m)));
    foto.v = 1;
    foto.visti = [...foto.visti, C.CAPANNA, 230, 265, 274, E.PIETRA];
    foto.cose = [
      { id: C.CAPANNA, x: 10, y: 49 },
      { id: 999, x: 40, y: 49 },
    ];
    delete foto.provate;
    delete foto.tronchi;
    const copia = ripristina(foto)!;
    expect(copia).not.toBeNull();
    expect(voce(230)?.nome).toBe('Cacciatore');
    expect(voce(265)?.nome).toBe('Veliero');
    expect(voce(274)?.nome).toBe('Accampamento');
    expect([...copia.visti].filter((id) => voce(id) === undefined)).toEqual([]);
    // La capanna resta; un numero che non è niente viene lasciato fuori.
    expect(copia.cose.map((c) => c.id)).toEqual([C.CAPANNA]);
  });
});

describe('il registro', () => {
  it('ogni voce di prima ha il suo tipo, come dice la tavola delle voci di oggi', () => {
    for (const v of voci()) if (v.file === undefined) expect(TIPI_DI_PRIMA[v.chiave], v.nome).toBeDefined();
    expect(Object.keys(TIPI_DI_PRIMA).length).toBe(voci().filter((v) => v.file === undefined).length);
    // costruzione = quelle che si posavano già; oggetto, idea, luogo come nella tavola
    for (const id of Object.keys(INGOMBRO_DI_PRIMA).map(Number)) expect(tipoDi(id)).toBe('costruzione');
    for (const id of [C.UTENSILE, C.LANCIA, C.RUOTA, C.VASO, C.PANE, C.BRONZO, C.SPADA, C.MONETA, C.LIBRO, C.FERRO, C.ARATRO]) {
      expect(tipoDi(id), voce(id)?.nome).toBe('oggetto');
    }
    expect(tipoDi(C.SCRITTURA)).toBe('idea');
    expect(tipoDi(C.CITTA)).toBe('luogo');
    expect(tipoDi(K.VILLAGGIO)).toBe('luogo');
    for (let t = 1; t < K.N_BASE; t++) if (voce(t)) expect(tipoDi(t)).toBe('materia');
    for (const id of Object.values(E)) expect(tipoDi(id)).toBe('era');
    expect(tipoDi(K.OMINO)).toBe('omino');
    // I mestieri del P3 sono mestieri, il regno un luogo.
    expect(tipoDi(idDi('fabbro'))).toBe('mestiere');
    expect(tipoDi(idDi('regno'))).toBe('luogo');
  });

  it('come si nominano: genere, numero e articolo vanno d’accordo', () => {
    expect(voce(C.MURA)).toMatchObject({ articolo: 'le', genere: 'f', numero: 'p' });
    expect(voce(M.ZOLFO)).toMatchObject({ articolo: 'lo', genere: 'm', numero: 's' });
    expect(voce(C.UTENSILE)).toMatchObject({ articolo: 'l', genere: 'm', numero: 's' });
    expect(voce(idDi('famiglia'))).toMatchObject({ articolo: 'la', genere: 'f', numero: 's' });
    for (const v of voci()) {
      if (v.articolo === 'la' || v.articolo === 'le') expect(v.genere, v.nome).toBe('f');
      if (v.articolo === 'il' || v.articolo === 'lo') expect(v.genere, v.nome).toBe('m');
    }
  });

  it('scrive le tavole del motore: ingombri, ere, conseguenze, paesaggi', () => {
    // Le costruzioni di prima tengono il loro ingombro; quelle delle schede lo ricavano dalla figura.
    for (const [id, i] of Object.entries(INGOMBRO_DI_PRIMA)) expect(ingombroDi(Number(id))).toEqual(i);
    const veliero = idDi('veliero');
    expect(ingombroDi(veliero)).toEqual(ingombroDaFigura(voce(veliero)!.figura!));
    expect(ingombroDaFigura(['abc', 'abcde', 'a'])).toEqual([3, 2]);
    // Quelle della grande infornata si contano a parte (sono 72).
    const diPrima = costruzioni().filter((id) => !((voce(id)?.file ?? '') in BLOCCHI));
    expect(diPrima.length).toBe(Object.keys(INGOMBRO_DI_PRIMA).length + 12);
    expect(costruzioni().length - diPrima.length).toBe(72);
    // Gli oggetti si appoggiano a terra, piccoli quanto la loro figura (o la loro icona senza il bordo vuoto); non
    // sono costruzioni. Le idee e i mestieri non si posano.
    expect(ingombroDi(C.UTENSILE)).toEqual([5, 4]);
    expect(ingombroDi(C.STRADA)).toEqual([5, 2]);
    expect(ingombroDi(idDi('secchio'))).toEqual([5, 5]);
    expect(costruzioni()).not.toContain(C.UTENSILE);
    for (const id of [C.SCRITTURA, idDi('fabbro'), idDi('musica')]) expect(ingombroDi(id)).toBeUndefined();
    // Le ere, le conseguenze e i paesaggi di prima vengono per primi; quelli delle schede (le ere nuove) dopo.
    expect(ere().slice(0, ERE_DI_PRIMA.length)).toEqual(ERE_DI_PRIMA);
    expect(conseguenze().slice(0, CONSEGUENZE_DI_PRIMA.length)).toEqual(CONSEGUENZE_DI_PRIMA);
    expect(paesaggi().slice(0, K.PAESAGGI_DI_PRIMA.length)).toEqual(K.PAESAGGI_DI_PRIMA);
  });

  it('il Libro mostra le schede nel loro capitolo, dopo le voci di prima', () => {
    const genti = vociDelCapitolo('genti').map((v) => v.nome);
    expect(genti.slice(0, 4)).toEqual(['Omino', 'Bambino', 'Villaggio', 'Cacciatore']);
    expect(genti).toContain('Regno');
    const cose = vociDelCapitolo('cose').map((v) => v.nome);
    expect(cose[0]).toBe('Utensile');
    expect(cose.indexOf('Faro')).toBeLessThan(cose.indexOf('Secchio'));
  });
});

/** I sorgenti come testo, per guardare chi importa cosa. */
const CONTENUTI = import.meta.glob<string>('../src/contenuti/*.ts', { query: '?raw', import: 'default', eager: true });
const MOTORE = import.meta.glob<string>('../src/motore/*.ts', { query: '?raw', import: 'default', eager: true });
const nomeDi = (percorso: string): string => percorso.split('/').at(-1)!;

describe('nessun giro di import', () => {
  it('le schede sono solo dati: importano soltanto dalla loro cartella', () => {
    expect(Object.keys(CONTENUTI).length).toBeGreaterThanOrEqual(8);
    for (const [percorso, testo] of Object.entries(CONTENUTI)) {
      const nome = nomeDi(percorso);
      if (nome === 'registro.ts' || nome === 'controllo.ts') continue;
      for (const [, da] of testo.matchAll(/from '([^']+)'/g)) expect(da.startsWith('./'), `${nome}: ${da}`).toBe(true);
    }
  });

  it('il registro costruisce le sue tavole alla prima chiamata, non quando si carica', () => {
    const testo = CONTENUTI['../src/contenuti/registro.ts'];
    // L'unico punto che chiama costruisci() è dentro t(), che a sua volta si chiama solo dalle funzioni.
    expect(testo.match(/costruisci\(\)/g)?.length).toBe(2);
    expect(testo).toMatch(/const t = \(\): Tavole => \(tavole \?\?= costruisci\(\)\);/);
    // E i moduli del motore che leggono il registro lo fanno nelle funzioni: nessuno lo chiama al caricamento.
    for (const [percorso, motore] of Object.entries(MOTORE)) {
      const file = nomeDi(percorso);
      for (const riga of motore.split('\n')) {
        // Una funzione che lo legge va bene (si chiama dopo); un valore calcolato al caricamento no.
        if (riga.includes('=>')) continue;
        if (/^(const|let|export const) .*= .*\b(voci|ere|conseguenze|paesaggi|ingombroDi|unioneDi|vociTrovate|aGalla|eVoce)\(/.test(riga)) {
          throw new Error(`${file} legge il registro al caricamento: ${riga}`);
        }
      }
    }
  });
});
