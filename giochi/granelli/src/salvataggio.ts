import { INIZIALI, eVoce, ingombroDi, misuraDi, tipoDi } from './contenuti/registro.js';
import { type Cosa, OSPITA } from './motore/cose.js';
import { CREATURE_MAX, type Creatura } from './motore/creature.js';
import type { Deposito } from './deposito.js';
import { M, N_BASE, N_TIPI, PRIMA_ID_MISCELA, PRIMA_MISCELA, TRONCO } from './motore/materiali.js';
import { Mondo } from './motore/mondo.js';
import type { Omino } from './motore/omini.js';

/** La chiave della partita nel deposito. */
export const CHIAVE = 'granelli-v1';
/**
 * La copia di riserva: la partita di prima, tenuta da parte prima di sovrascrivere un salvataggio che non si è
 * riusciti a leggere tutto, e prima di ricominciare.
 */
export const RISERVA = 'granelli-v1-riserva';

/** La fotografia di una partita: solo dati semplici, pronti per essere scritti come testo. */
export interface Salvato {
  v: 1 | 2;
  w: number;
  h: number;
  visti: number[];
  tipo: string;
  dato: string;
  tinta: string;
  omini: Omino[];
  tic: number;
  /**
   * Le miscele conosciute: numero, i due ingredienti, il nome, e 2 per quelle nate con le regole di adesso (nomi
   * parlanti e caratteri nuovi). Senza il 2 è una miscela delle partite di prima, che tiene le regole di allora.
   */
  ricette?: ([number, number, number, string] | [number, number, number, string, 2])[];
  /** Quale miscela occupa quale posto nelle celle di questo mondo. */
  posti?: [number, number][];
  /**
   * Le cose posate nel mondo (il numero d'ordine `n` manca nelle partite salvate prima che esistesse), con le idee
   * scritte sopra una costruzione (`sa`, solo nelle partite di adesso).
   */
  cose?: { id: number; x: number; y: number; n?: number; sa?: number[] }[];
  /** Le creature che vivono nel mondo: le partite di prima non ne hanno. */
  creature?: { id: number; x: number; y: number; dir: number }[];
  /** 1 se i tronchi degli alberi sono già segnati nel `dato` del legno (vedi TRONCO): nelle partite più vecchie no. */
  tronchi?: 1;
  /** Il tempo che fa: da che parte tira il vento, quanto ha piovuto di recente, quanto si vede l'arcobaleno. */
  vento?: number;
  pioggia?: number;
  arcobaleno?: number;
  /** Le coppie già provate unendo (solo che sono state provate: l'esito si ricalcola). Le partite di prima non le hanno. */
  provate?: [number, number][];
  /** L'istante prima del quale gli omini non (ri)compaiono. */
  prossimoArrivo?: number;
  /** Quello che la pagina vuole ricordare insieme alla partita (per esempio gli ultimi materiali usati). */
  extra?: unknown;
}

function inTesto(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return btoa(s);
}

/** Ricopia il testo di una griglia nelle celle; falso se non è un testo della misura giusta. */
function daTesto(s: unknown, in_: Uint8Array): boolean {
  if (typeof s !== 'string') return false;
  try {
    const b = atob(s);
    if (b.length !== in_.length) return false;
    for (let i = 0; i < b.length; i++) in_[i] = b.charCodeAt(i);
    return true;
  } catch {
    return false;
  }
}

/** Un numero vero, finito e non negativo (in un salvataggio può esserci scritto di tutto). */
function numeroBuono(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/** Un oggetto qualsiasi (non null, non una lista): le voci di una lista salvata devono esserlo. */
function oggetto(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function fotografa(m: Mondo, extra?: unknown): Salvato {
  const posti: [number, number][] = [];
  for (let t = PRIMA_MISCELA; t < N_TIPI; t++) if (m.idTipo[t] > 0) posti.push([t, m.idTipo[t]]);
  return {
    v: 2,
    w: m.w,
    h: m.h,
    visti: [...m.visti],
    tipo: inTesto(m.tipo),
    dato: inTesto(m.dato),
    tinta: inTesto(m.tinta),
    omini: m.omini.map((o) => ({ ...o })),
    tic: m.tic,
    ricette: [...m.ricettario].map(([id, r]) => (r.prima ? [id, r.a, r.b, r.nome] : [id, r.a, r.b, r.nome, 2])),
    posti,
    cose: m.cose.map((c) => (c.sa ? { id: c.id, x: c.x, y: c.y, n: c.n, sa: [...c.sa] } : { id: c.id, x: c.x, y: c.y, n: c.n })),
    creature: m.creature.map((c) => ({ id: c.id, x: c.x, y: c.y, dir: c.dir })),
    tronchi: 1,
    vento: m.vento,
    pioggia: m.pioggia,
    arcobaleno: m.arcobaleno,
    prossimoArrivo: m.prossimoArrivo,
    provate: [...m.provate].map((k) => k.split(':').map(Number) as [number, number]),
    extra,
  };
}

/**
 * Ricopia in un mondo le miscele conosciute. Una ricetta entra solo se è scritta bene e i suoi due ingredienti sono
 * già noti (un materiale, o una miscela entrata prima): così un ordine sbagliato o un giro di ricette che si
 * chiamano a vicenda non rompono niente. Restituisce quante ricette sono rimaste fuori.
 */
export function ricopiaRicette(m: Mondo, ricette: readonly unknown[]): number {
  const buone: [number, number, number, string, boolean][] = [];
  for (const r of ricette) {
    // Quattro voci: una miscela delle partite di prima; cinque, con il 2 in fondo: una nata con le regole di adesso.
    if (!Array.isArray(r) || (r.length !== 4 && (r.length !== 5 || r[4] !== 2))) continue;
    const [id, a, b, nome] = r as unknown[];
    if (!Number.isInteger(id) || (id as number) < PRIMA_ID_MISCELA || !Number.isInteger(a) || !Number.isInteger(b)) continue;
    if (typeof nome !== 'string') continue;
    buone.push([id as number, a as number, b as number, nome, r.length === 4]);
  }
  const noto = (id: number): boolean => (id >= PRIMA_ID_MISCELA ? m.ricettario.has(id) : id >= 0 && id < N_BASE);
  // Si ripassa la lista finché entra qualcosa: un figlio scritto prima dei genitori entra al giro dopo.
  let resto = buone;
  let dentro = 0;
  for (let entrate = 1; entrate > 0 && resto.length > 0; ) {
    const ancora: typeof resto = [];
    entrate = 0;
    for (const r of resto) {
      if (!m.ricettario.has(r[0]) && noto(r[1]) && noto(r[2])) {
        m.ricettario.set(r[0], r[4] ? { a: r[1], b: r[2], nome: r[3], prima: true } : { a: r[1], b: r[2], nome: r[3] });
        entrate++;
      } else ancora.push(r);
    }
    dentro += entrate;
    resto = ancora;
  }
  return ricette.length - dentro;
}

/**
 * Nelle partite salvate quando ogni legno era un muro, riconosce i tronchi degli alberi (legno largo una cella sola:
 * col dito non si riesce a versarne di così sottile) e li segna, così gli omini di quel mondo non restano chiusi.
 */
function segnaTronchi(m: Mondo): void {
  const { tipo, dato, w } = m;
  for (let i = 0; i < tipo.length; i++) {
    if (tipo[i] !== M.LEGNO) continue;
    const x = i % w;
    if ((x > 0 && tipo[i - 1] === M.LEGNO) || (x < w - 1 && tipo[i + 1] === M.LEGNO)) continue;
    dato[i] = TRONCO;
  }
}

/**
 * Le cose posate di una fotografia che sono ancora cose del Libro e stanno nel mondo, ognuna con il suo numero
 * d'ordine (e se i numeri mancavano o si ripetevano, quelli nuovi). `scarti` conta le voci sporche lasciate fuori.
 */
function cosePosate(lista: unknown[], m: Mondo): { cose: Cosa[]; rinumerate: boolean; scarti: number } {
  const buone: { id: number; x: number; y: number; n?: unknown; sa?: unknown }[] = [];
  for (const c of lista) {
    if (!oggetto(c)) continue;
    const { id, x, y } = c;
    if (!numeroBuono(id) || !Number.isInteger(x) || !Number.isInteger(y) || ingombroDi(id) === undefined) continue;
    if (!m.dentro(x as number, y as number)) continue;
    buone.push({ id, x: x as number, y: y as number, n: c.n, sa: c.sa });
  }
  const numeri = new Set(buone.map((c) => c.n));
  const rinumerate = numeri.size !== buone.length || buone.some((c) => !Number.isInteger(c.n) || (c.n as number) < 1);
  return {
    cose: buone.map((c, k) => {
      const cosa: Cosa = { id: c.id, x: c.x, y: c.y, n: rinumerate ? k + 1 : (c.n as number) };
      const sa = ideeBuone(c.sa);
      if (sa) cosa.sa = sa;
      return cosa;
    }),
    rinumerate,
    scarti: lista.length - buone.length,
  };
}

/** Le idee che qualcuno sa, se sono davvero idee del Libro; undefined se non ce n'è nessuna buona. */
function ideeBuone(v: unknown): number[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const sa = v.filter((id): id is number => numeroBuono(id) && tipoDi(id) === 'idea');
  return sa.length > 0 ? sa : undefined;
}

/** Le creature di una fotografia che sono ancora creature del Libro e stanno nel mondo; al più quaranta. */
function creatureBuone(lista: unknown[], m: Mondo): Creatura[] {
  const buone: Creatura[] = [];
  for (const c of lista) {
    if (buone.length >= CREATURE_MAX || !oggetto(c)) continue;
    const { id, x, y, dir } = c;
    if (!numeroBuono(id) || !numeroBuono(x) || !numeroBuono(y) || misuraDi(id) === undefined) continue;
    if (!m.dentro(Math.floor(x), Math.floor(y))) continue;
    buone.push({ id, x: Math.floor(x), y: Math.floor(y), dir: dir === -1 ? -1 : 1 });
  }
  return buone;
}

/** I numeri senza i quali un omino non vive (la sete, la fame, l'età…), con il valore di un omino appena arrivato. */
const DI_UN_OMINO = { sete: 0, fame: 0, eta: 0, apnea: 0, sepolto: 0, attesa: 300 } as const;

/**
 * Un omino di una fotografia, se è un omino che sta nel mondo: i numeri che mancano o sono sporchi tornano quelli di
 * un omino appena arrivato (con la sete scritta male non morirebbe mai), e i ricordi che non hanno senso in questo
 * mondo (colonne che non esistono, cose che non sono del Libro) si dimenticano. Null se non è un omino.
 */
function ominoPulito(v: unknown, m: Mondo): Omino | null {
  if (!oggetto(v) || !numeroBuono(v.x) || !numeroBuono(v.y)) return null;
  const x = Math.floor(v.x);
  const y = Math.floor(v.y);
  if (!m.dentro(x, y)) return null;
  const copia = { ...v, x, y } as unknown as Omino;
  for (const [campo, nuovo] of Object.entries(DI_UN_OMINO) as [keyof typeof DI_UN_OMINO, number][]) {
    if (!numeroBuono(copia[campo])) copia[campo] = nuovo;
  }
  copia.dir = copia.dir === -1 ? -1 : 1;
  if (!Number.isInteger(copia.aspetto) || copia.aspetto < 0 || copia.aspetto > 255) copia.aspetto = (x * 37 + y) & 255;
  if (copia.stato !== 0 && copia.stato !== 1 && copia.stato !== 2) copia.stato = 0;
  if (!Number.isInteger(copia.dentro) || (copia.dentro as number) < 0) delete copia.dentro;
  for (const campo of ['casa', 'bevuta', 'pasto'] as const) {
    const n = copia[campo];
    if (numeroBuono(n) && n < m.w) copia[campo] = Math.floor(n);
    else delete copia[campo];
  }
  if (typeof copia.chiusa !== 'number' || !Number.isFinite(copia.chiusa)) delete copia.chiusa;
  // Quello che tiene in mano, che sa e che fa: solo se è davvero un oggetto, un'idea, un mestiere del Libro.
  if (!numeroBuono(copia.tiene) || tipoDi(copia.tiene) !== 'oggetto' || !numeroBuono(copia.tieneFino)) {
    delete copia.tiene;
    delete copia.tieneFino;
  }
  const sa = ideeBuone(copia.sa);
  if (sa) copia.sa = sa;
  else delete copia.sa;
  if (!numeroBuono(copia.mestiere) || tipoDi(copia.mestiere) !== 'mestiere') delete copia.mestiere;
  // La nuvoletta dura due secondi: alla ripresa non c'è più.
  delete copia.nuvoletta;
  delete copia.nuvolettaFino;
  return copia;
}

/** Il mondo con la griglia scritta nella fotografia; null se non si legge o non è delle misure dichiarate. */
function grigliaDi(d: Partial<Record<keyof Salvato, unknown>>): Mondo | null {
  const { w, h } = d;
  if (!Number.isInteger(w) || !Number.isInteger(h)) return null;
  const [larga, alta] = [w as number, h as number];
  if (larga <= 0 || alta <= 0 || larga * alta > 400000) return null;
  const m = new Mondo(larga, alta, (Date.now() & 0x7fffffff) || 1);
  return daTesto(d.tipo, m.tipo) && daTesto(d.dato, m.dato) && daTesto(d.tinta, m.tinta) ? m : null;
}

/** Una partita ripresa da una fotografia, e se è tornata tutta com'era. */
export interface Ripresa {
  mondo: Mondo;
  /** Falso se qualcosa non si è potuto leggere ed è rimasto fuori: la griglia, una cosa, un omino, una ricetta… */
  intatta: boolean;
}

/**
 * Ricostruisce una partita da una fotografia, campo per campo: una voce sporca (un null tra le cose, un omino senza
 * posizione, una ricetta storta) si scarta da sola, senza portarsi dietro il resto. Se la griglia non si legge
 * (rovinata, o di misure diverse) il Libro si tiene lo stesso in un mondo nuovo, fatto da `nuovo`. Le scoperte hanno
 * sempre i quattro elementi. Null se non è una fotografia di Granelli, o se non ne resta niente che valga la pena.
 */
export function riprendi(dati: unknown, nuovo?: () => Mondo): Ripresa | null {
  if (!oggetto(dati) || (dati.v !== 1 && dati.v !== 2)) return null;
  const d = dati as Partial<Record<keyof Salvato, unknown>>;
  let scarti = 0;
  /** Un pezzo della fotografia: se lancia un errore, quel pezzo resta fuori e il resto si legge lo stesso. */
  const pezzo = (fai: () => number | void): void => {
    try {
      scarti += fai() || 0;
    } catch {
      scarti++;
    }
  };

  // La griglia: se non torna, un mondo nuovo che tiene solo il Libro.
  const griglia = grigliaDi(d);
  if (!griglia && !nuovo) return null;
  const m = griglia ?? nuovo!();
  if (!griglia) {
    m.visti.clear();
    scarti++;
  }

  // Il Libro: le miscele, poi le scoperte (solo voci del Libro, materiali e miscele di cui si conosce la ricetta).
  if (Array.isArray(d.ricette)) {
    const ricette = d.ricette;
    pezzo(() => ricopiaRicette(m, ricette));
  } else if (d.ricette !== undefined) scarti++;
  if (Array.isArray(d.visti)) {
    for (const id of d.visti as unknown[]) {
      const buona = Number.isInteger(id) && (id as number) > 0 && (eVoce(id as number) || (id as number) < N_BASE || m.ricettario.has(id as number));
      if (buona) m.visti.add(id as number);
      else scarti++;
    }
  } else scarti++;
  for (const id of INIZIALI) m.visti.add(id);
  if (Array.isArray(d.provate)) {
    for (const p of d.provate as unknown[]) {
      if (Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) m.ricordaProvata(p[0], p[1]);
      else scarti++;
    }
  }
  // Senza griglia, se del Libro non resta niente oltre ai quattro elementi, non c'è niente da riprendere.
  if (!griglia) {
    const tenuto = m.visti.size > INIZIALI.length || m.ricettario.size > 0 || m.provate.size > 0;
    return tenuto ? { mondo: m, intatta: false } : null;
  }

  // Il mondo com'era: le miscele al loro posto, le cose posate, gli omini, le creature, il tempo che fa.
  if (Array.isArray(d.posti)) {
    for (const p of d.posti as unknown[]) {
      const buono = Array.isArray(p) && p.length === 2 && Number.isInteger(p[0]) && m.ricettario.has(p[1]) && m.occupa(p[0], p[1]);
      if (!buono) scarti++;
    }
  }
  pezzo(() => {
    // Una cella che contiene un numero senza significato (un posto di miscela rimasto vuoto) torna vuota.
    for (let i = 0; i < m.tipo.length; i++) {
      const t = m.tipo[i];
      if (t >= N_BASE && m.idTipo[t] === 0) m.tipo[i] = 0;
    }
    if (d.tronchi !== 1) segnaTronchi(m);
  });
  if (Array.isArray(d.omini)) {
    for (const o of d.omini as unknown[]) {
      const pulito = ominoPulito(o, m);
      if (pulito) m.omini.push(pulito);
      else scarti++;
    }
  } else if (d.omini !== undefined) scarti++;
  if (Array.isArray(d.cose)) {
    const lista = d.cose;
    pezzo(() => {
      const { cose, rinumerate, scarti } = cosePosate(lista, m);
      m.cose = cose;
      // Una volta chi dormiva in casa ricordava la colonna della casa più uno: ora ricorda il suo numero d'ordine.
      if (rinumerate) {
        for (const o of m.omini) {
          if (o.dentro) o.dentro = cose.find((c) => OSPITA[c.id] && c.x + 1 === o.dentro)?.n ?? 0;
        }
      }
      return scarti;
    });
  }
  if (Array.isArray(d.creature)) {
    const lista = d.creature;
    pezzo(() => {
      m.creature = creatureBuone(lista, m);
      return Math.max(0, Math.min(lista.length, CREATURE_MAX) - m.creature.length);
    });
  }
  if (numeroBuono(d.tic)) m.tic = Math.floor(d.tic);
  // Il tempo che fa e l'attesa degli omini: i salvataggi di prima non li hanno, e allora valgono quelli di un mondo nuovo.
  if (d.vento === 1 || d.vento === -1) m.vento = d.vento;
  if (numeroBuono(d.pioggia)) m.pioggia = d.pioggia;
  if (numeroBuono(d.arcobaleno)) m.arcobaleno = Math.min(1, d.arcobaleno);
  if (numeroBuono(d.prossimoArrivo)) m.prossimoArrivo = Math.floor(d.prossimoArrivo);
  return { mondo: m, intatta: scarti === 0 };
}

/** Ricostruisce il mondo da una fotografia (vedi `riprendi`); null se non è una fotografia valida. */
export function ripristina(dati: unknown, nuovo?: () => Mondo): Mondo | null {
  return riprendi(dati, nuovo)?.mondo ?? null;
}

/** Quello che la pagina aveva chiesto di ricordare insieme alla partita. */
export function extraDi(dati: unknown): unknown {
  return oggetto(dati) ? dati.extra : undefined;
}

export function impacchetta(m: Mondo, extra?: unknown): string {
  return JSON.stringify(fotografa(m, extra));
}

/** Il testo salvato come dati; null se non è un testo leggibile. */
export function leggiTesto(testo: string | null): unknown {
  if (testo === null) return null;
  try {
    return JSON.parse(testo);
  } catch {
    return null;
  }
}

/** Ricostruisce il mondo da un testo salvato; null se il testo non è un salvataggio valido. */
export function spacchetta(testo: string): Mondo | null {
  return ripristina(leggiTesto(testo));
}

/** Scrive la partita nel deposito; falso se non ci è riuscito. */
export function salva(deposito: Deposito, m: Mondo, extra?: unknown): boolean {
  return deposito.scrivi(CHIAVE, impacchetta(m, extra));
}

/**
 * Tiene da parte una copia della partita nella chiave di riserva: quella scritta nel deposito, oppure, se si passa
 * un mondo, la sua fotografia di adesso.
 */
export function tieniDaParte(deposito: Deposito, m?: Mondo, extra?: unknown): boolean {
  const testo = m ? impacchetta(m, extra) : deposito.leggi(CHIAVE);
  return testo !== null && deposito.scrivi(RISERVA, testo);
}

/** La partita trovata nel deposito all'avvio. */
export interface Trovata {
  /** I dati letti (null se non c'era niente o non era un testo leggibile). */
  dati: unknown;
  ripresa: Ripresa | null;
}

/**
 * Legge la partita dal deposito. Se c'era un testo ma non è tornato tutto (o niente), prima che il gioco lo
 * sovrascriva se ne tiene una copia di riserva: magari una versione futura saprà leggerlo.
 */
export function carica(deposito: Deposito, nuovo?: () => Mondo): Trovata {
  const testo = deposito.leggi(CHIAVE);
  const dati = leggiTesto(testo);
  const ripresa = riprendi(dati, nuovo);
  if (testo !== null && !ripresa?.intatta) deposito.scrivi(RISERVA, testo);
  return { dati, ripresa };
}
