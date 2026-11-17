import { ALTEZZA } from './cammino.js';
import { PER_ID, vociTrovate } from '../scoperte.js';
import { primiOmini } from './arrivi.js';
import { type Cosa, INGOMBRO } from './cose.js';
import { erePronte } from './ere.js';
import { SOGLIA_MISCELE, SOLO_NEL_MONDO, coppiaDAutore, esitoDi } from './esiti.js';
import { fenomeni } from './fenomeni.js';
import { Fonti } from './fonti.js';
import {
  ALBERO,
  BASE,
  BRUCIA,
  CIBO,
  ESPLOSIONE,
  FIORE,
  GAS,
  LIQUIDO,
  M,
  MORTALE,
  N_BASE,
  N_TIPI,
  NASCOSTO,
  NULLA,
  OMINO,
  PIOGGIA,
  POLVERE,
  PRIMA_ID_MISCELA,
  PRIMA_MISCELA,
  SOLIDO,
  STATO,
  type Sostanza,
  TEMPORALE,
  TRONCO,
} from './materiali.js';
import { SOGLIA, faMale, fondi, idMiscela, siMangia } from './miscele.js';
import { nomeMiscela } from './nomi.js';
import { type Fatto, type Omino, POPOLAZIONE_MAX, aggiornaOmini, nuovoOmino } from './omini.js';
import { type Posto, assestaCose, puoPosare, sgombra, sottoUnaCosa } from './posa.js';
import { type EsitoPorta, type Provenienza, porta } from './porta.js';
import { ACCENDI, RESTA } from './ricette.js';

/** Una scoperta appena avvenuta: cosa e dove (in celle), per far brillare il punto sullo schermo. */
export interface Novita {
  id: number;
  x: number;
  y: number;
}

/**
 * Un avviso del motore per la pagina, che lo mostra una volta sola: `miscele` vuol dire che il Libro è arrivato alla
 * dodicesima voce e da adesso due sostanze senza un esito scritto si mescolano.
 */
export type Annuncio = 'miscele';

/** La chiave di una coppia provata, uguale nei due ordini. Un testo e non `chiaveCoppia`: le miscele hanno numeri grandi. */
const chiaveProvata = (a: number, b: number): string => `${Math.min(a, b)}:${Math.max(a, b)}`;

/** Una miscela conosciuta: i suoi due ingredienti e il nome che le è toccato. */
export interface Ricetta {
  a: number;
  b: number;
  nome: string;
}

/** Ciò che nemmeno l'acido (o una miscela corrosiva) riesce a intaccare. */
const RESISTE = new Uint8Array(N_TIPI);
for (const t of [M.VUOTO, M.ROCCIA, M.VETRO, M.DIAMANTE, M.OSSIDIANA, M.BRACE]) RESISTE[t] = 1;

/** Ciò che non fa mai niente da solo: in un mondo grande è quasi tutto, e saltarlo fa andare veloce il resto. */
const FERMO = new Uint8Array(N_TIPI);
for (const t of [M.VUOTO, M.ROCCIA, M.PIETRA, M.VETRO, M.MATTONE, M.OSSIDIANA, M.GHIACCIO, M.METALLO, M.DIAMANTE, M.FUNGO]) FERMO[t] = 1;

/**
 * Ciò che lascia tranquilla l'acqua che lo tocca: lei non ci reagisce e non ci può entrare (altra acqua, oppure
 * polveri e solidi, tolti quelli che bagnati cambiano: terra, zolfo, pietra, metallo, brace).
 */
const QUIETA = new Uint8Array(N_TIPI);
for (let t = 0; t < N_BASE; t++) QUIETA[t] = STATO[t] === POLVERE || STATO[t] === SOLIDO ? 1 : 0;
for (const t of [M.TERRA, M.ZOLFO, M.PIETRA, M.METALLO, M.BRACE]) QUIETA[t] = 0;
QUIETA[M.ACQUA] = 1;

/** Il suolo su cui una cosa viva può allargarsi e una miscela fertile può far spuntare un germoglio. */
const SUOLO = new Uint8Array(N_TIPI);
for (const t of [M.TERRA, M.FANGO, M.HUMUS]) SUOLO[t] = 1;

/**
 * Una miscela viva si allarga a catena, e la catena è corta. Ogni cella porta un'età (nel suo `dato`): ogni volta
 * che prova ad allargarsi invecchia di uno; se ci riesce figlia una volta sola e poi resta com'è, e la figlia nasce
 * con l'età della madre più uno. Arrivata a questa età una cella non ci prova più: da un granello versato ne
 * nascono al più altrettanti, e dopo qualche minuto tutto è fermo, anche se la miscela è un liquido che scorrendo
 * troverebbe sempre posto nuovo.
 */
const STERILE = 8;

/** Le soglie del carattere di una miscela: le stesse che decidono le etichette mostrate nel Libro (vedi miscele.ts). */
const { calore: CALDO, veleno: VELENO, corrode: CORRODE, vivo: VIVO, fertile: FERTILE, esplode: ESPLODE, brucia: BRUCIA_BENE } = SOGLIA;

/** Ciò che anche ammucchiato lascia passare l'aria: sotto le foglie, la cenere o la neve il fuoco respira ancora. */
const ARIOSO = new Uint8Array(N_TIPI);
for (const t of [M.VUOTO, M.PIANTA, M.CENERE, M.NEVE, M.FRUTTO, M.FUNGO, M.MUSCHIO, M.ALGA]) ARIOSO[t] = 1;

/** Nel `dato` del carbone: è nato da legno sepolto. La brace del legno che gli brucia accanto non lo riaccende. */
const NATO_SEPOLTO = 1;

/**
 * Il mondo: una griglia di celle in cui ogni materiale segue poche regole semplici.
 * Tutto il resto (pioggia, incendi, boschi, temporali) nasce dall'incontro di quelle regole.
 */
export class Mondo {
  readonly w: number;
  readonly h: number;
  readonly tipo: Uint8Array;
  /** Un numero per cella: vita residua del fuoco, acqua nella nuvola, crescita della pianta… */
  readonly dato: Uint8Array;
  /** Un numero casuale per cella, fissato alla nascita: dà la grana ai colori, la quota alle nuvole, e alla brace ricorda se era legno. */
  readonly tinta: Uint8Array;
  private readonly fatto: Uint8Array;
  private giro = 0;
  /** Il seme dei numeri casuali, in una casella da 32 bit: tenuto in un campo normale, ogni tiro di dado lascerebbe un numero da buttare. */
  private readonly semi = new Int32Array(1);
  /** A che quota, al più, galleggiano le nuvole (in celle dalla cima del mondo). */
  private readonly fasciaNuvole: number;

  tic = 0;
  /** Direzione in cui il vento spinge le nuvole: cambia ogni tanto. */
  vento: 1 | -1 = 1;
  omini: Omino[] = [];
  /** Cosa è già stato scoperto, nell'ordine in cui è successo: materiali, fenomeni, miscele. */
  readonly visti = new Set<number>();
  /** Scoperte avvenute dall'ultima volta che qualcuno le ha lette. */
  novita: Novita[] = [];
  /** Gli avvisi del motore per la pagina (vedi `Annuncio`), dall'ultima volta che qualcuno li ha letti. */
  annunci: Annuncio[] = [];
  /**
   * Le coppie già provate unendo (in Unisci o portando una cosa sopra un'altra): si ricorda solo CHE sono state
   * provate, non come è andata. L'esito si ricalcola ogni volta con `esitoDi`, così una coppia che oggi non dà
   * niente e domani ha un'unione scritta mostra quella nuova.
   */
  readonly provate = new Set<string>();
  /** Le nascite e le morti degli omini (con la causa) dall'ultima volta che qualcuno le ha lette. */
  fatti: Fatto[] = [];
  /** Le esplosioni avvenute dall'ultima volta che qualcuno ha guardato (in celle). */
  botti: { x: number; y: number; r: number }[] = [];
  /** Le invenzioni posate nel mondo. */
  cose: Cosa[] = [];
  /** Per ogni colonna, 1 se una cosa posata la copre: lì sotto non germoglia niente (lo tiene aggiornato `assestaCose`). */
  readonly coperta: Uint8Array;
  /** Dove si beve e dove si mangia, colonna per colonna: gli omini lo consultano quando hanno sete o fame. */
  readonly fonti: Fonti;
  /** Quante celle ci sono di ogni materiale: aggiornato ogni due secondi circa. */
  readonly conta = new Uint32Array(N_TIPI);
  /** Tic in cui gli omini potranno (ri)comparire. */
  prossimoArrivo = 0;
  /** Tic prima del quale il cielo non scarica un altro fulmine: anche il temporale più grosso prende fiato. */
  prossimoFulmine = 0;
  /** Quanto ha piovuto di recente: sale a ogni goccia, cala col tempo. */
  pioggia = 0;
  /** Quanto si vede l'arcobaleno in questo momento, da 0 a 1. */
  arcobaleno = 0;

  // ── Le miscele ──
  /** Tutte le miscele conosciute dal giocatore, per numero. */
  readonly ricettario = new Map<number, Ricetta>();
  /** Per ogni numero che una cella può contenere, quale scoperta rappresenta (0 se il posto è libero). */
  readonly idTipo: number[] = [];
  /** Il carattere di ciò che ogni cella può contenere (null per i posti liberi e per ciò che non si mescola). */
  readonly sostanze: (Sostanza | null)[] = [];
  /** Cambia ogni volta che una miscela prende o lascia un posto: chi disegna sa che deve aggiornare i colori. */
  versioneTipi = 0;
  /** Vero quando nel mondo ci sono già troppe miscele diverse e non c'è posto per un'altra. */
  pieno = false;
  private readonly tipoDiId = new Map<number, number>();
  private readonly ricordo = new Map<number, Sostanza>();

  // ── Il carattere di ogni tipo di cella: copie per questo mondo, perché le miscele cambiano da mondo a mondo ──
  readonly stato = STATO.slice();
  readonly brucia = BRUCIA.slice();
  readonly mortale = MORTALE.slice();
  readonly cibo = CIBO.slice();
  private readonly quieta = QUIETA.slice();
  readonly peso = new Float32Array(N_TIPI);
  readonly scorre = new Float32Array(N_TIPI);
  readonly calore = new Float32Array(N_TIPI);
  readonly fertile = new Float32Array(N_TIPI);
  readonly vivo = new Float32Array(N_TIPI);
  readonly veleno = new Float32Array(N_TIPI);
  readonly esplode = new Float32Array(N_TIPI);
  readonly corrode = new Float32Array(N_TIPI);

  constructor(w: number, h: number, seme = 12345) {
    this.w = w;
    this.h = h;
    const n = w * h;
    this.tipo = new Uint8Array(n);
    this.dato = new Uint8Array(n);
    this.tinta = new Uint8Array(n);
    this.fatto = new Uint8Array(n);
    this.coperta = new Uint8Array(w);
    this.fonti = new Fonti(w);
    this.semi[0] = seme | 0 || 1;
    this.fasciaNuvole = Math.max(1, (h * 0.13) | 0);
    for (let t = 0; t < N_TIPI; t++) {
      const s = t < N_BASE ? BASE[t] : null;
      this.idTipo.push(t < N_BASE ? t : 0);
      this.sostanze.push(s);
      this.peso[t] = s ? s.peso : 0.5;
      // Tra i materiali scritti a mano esplode da sola soltanto la polvere nera: gli altri hanno le loro regole.
      if (t === M.POLVERE_NERA) this.esplode[t] = 1;
    }
  }

  /** Numero casuale tra 0 e 1 (ripetibile a parità di seme: serve ai test). */
  caso(): number {
    let s = this.semi[0];
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.semi[0] = s;
    return (s >>> 0) / 4294967296;
  }

  dentro(x: number, y: number): boolean {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  /** Cosa c'è in una cella; fuori dai bordi il mondo è roccia. */
  leggi(x: number, y: number): number {
    return this.dentro(x, y) ? this.tipo[y * this.w + x] : M.ROCCIA;
  }

  // ── Miscele: chi sono, come nascono, dove stanno ─────────────────────────────

  /** Il carattere di una scoperta (materiale o miscela); null se non è una sostanza o non la si conosce. */
  sostanzaDi(id: number): Sostanza | null {
    if (id < PRIMA_ID_MISCELA) return id >= 0 && id < N_BASE ? BASE[id] : null;
    const pronta = this.ricordo.get(id);
    if (pronta) return pronta;
    const ricetta = this.ricettario.get(id);
    if (!ricetta) return null;
    const a = this.sostanzaDi(ricetta.a);
    const b = this.sostanzaDi(ricetta.b);
    if (!a || !b) return null;
    const s = fondi(a, b, id);
    this.ricordo.set(id, s);
    return s;
  }

  /** Di quante fusioni è figlia una scoperta: 0 per i materiali, 1 per la miscela di due materiali, e così via. */
  generazione(id: number): number {
    const ricetta = this.ricettario.get(id);
    return ricetta ? 1 + Math.max(this.generazione(ricetta.a), this.generazione(ricetta.b)) : 0;
  }

  /** Segna nel ricettario la miscela di due scoperte (se non c'è già) e ne restituisce il numero; -1 se non si può. */
  registra(primo: number, secondo: number): number {
    if (primo === secondo) return -1;
    // Sempre nello stesso ordine: terra con sabbia e sabbia con terra devono dare la stessa identica miscela.
    const a = Math.min(primo, secondo);
    const b = Math.max(primo, secondo);
    // Una coppia che ha già un esito scritto a mano dà quello, mai una miscela: terra e acqua fanno fango e basta.
    if (coppiaDAutore(a, b)) return -1;
    const sa = this.sostanzaDi(a);
    const sb = this.sostanzaDi(b);
    if (!sa || !sb) return -1;
    const id = idMiscela(a, b);
    if (!this.ricettario.has(id)) {
      const presi = new Set<string>();
      for (const r of this.ricettario.values()) presi.add(r.nome);
      this.ricettario.set(id, { a, b, nome: nomeMiscela(fondi(sa, sb, id), id, (n) => presi.has(n)) });
    }
    return id;
  }

  /**
   * Il numero da scrivere nelle celle per una certa scoperta. Un materiale ha il suo; una miscela prende un posto
   * libero (o lo toglie a una miscela di cui nel mondo non è rimasto nemmeno un granello). -1 se non c'è posto.
   */
  tipoPer(id: number): number {
    if (id < PRIMA_ID_MISCELA) return id > 0 && id < N_BASE && !NASCOSTO[id] ? id : -1;
    const gia = this.tipoDiId.get(id);
    if (gia !== undefined) return gia;
    if (!this.sostanzaDi(id)) return -1;
    let posto = -1;
    for (let t = PRIMA_MISCELA; t < N_TIPI; t++) {
      if (this.idTipo[t] === 0) {
        posto = t;
        break;
      }
    }
    if (posto < 0) {
      this.contaCelle();
      for (let t = PRIMA_MISCELA; t < N_TIPI; t++) {
        if (this.conta[t] === 0) {
          this.tipoDiId.delete(this.idTipo[t]);
          posto = t;
          break;
        }
      }
    }
    if (posto < 0) {
      this.pieno = true;
      return -1;
    }
    this.pieno = false;
    this.occupa(posto, id);
    return posto;
  }

  /** Dà a una miscela un posto preciso (serve a chi ricarica una partita salvata). */
  occupa(t: number, id: number): boolean {
    const s = this.sostanzaDi(id);
    if (!s || t < PRIMA_MISCELA || t >= N_TIPI) return false;
    this.idTipo[t] = id;
    this.tipoDiId.set(id, t);
    this.sostanze[t] = s;
    this.stato[t] = s.stato;
    // Fuoco, lava e fulmine "accendono" ciò che brucia e ciò che esplode: la differenza la fa `accendi`.
    this.brucia[t] = s.brucia > BRUCIA_BENE || s.esplode > ESPLODE ? 1 : 0;
    this.mortale[t] = faMale(s) ? 1 : 0;
    this.cibo[t] = siMangia(s) ? 1 : 0;
    // Una miscela liquida o gassosa può far posto all'acqua; una polvere o un solido no (e l'acqua non ci reagisce).
    this.quieta[t] = s.stato === POLVERE || s.stato === SOLIDO ? 1 : 0;
    this.peso[t] = s.peso;
    this.scorre[t] = s.scorre;
    this.calore[t] = s.calore;
    this.fertile[t] = s.fertile;
    this.vivo[t] = s.vivo;
    this.veleno[t] = s.veleno;
    this.esplode[t] = s.esplode;
    this.corrode[t] = s.corrode;
    this.versioneTipi++;
    return true;
  }

  // ── Mettere, togliere, spostare ──────────────────────────────────────────────

  private datoIniziale(t: number): number {
    switch (t) {
      case M.FUOCO:
        return 20 + ((this.caso() * 28) | 0);
      case M.ARIA:
        return 40 + ((this.caso() * 50) | 0);
      case M.VAPORE:
        return 150 + ((this.caso() * 100) | 0);
      case M.FUMO:
        return 50 + ((this.caso() * 70) | 0);
      case M.NUVOLA:
        return 3 + ((this.caso() * 4) | 0);
      case M.FULMINE:
        // Resta nel cielo un attimo in più del necessario, perché l'occhio faccia in tempo a vederlo.
        return 9;
      default:
        // Una miscela gassosa dura un po' e poi si dissolve.
        return t >= PRIMA_MISCELA && this.stato[t] === GAS ? 140 + ((this.caso() * 110) | 0) : 0;
    }
  }

  /** Mette un materiale in una cella e, se è la prima volta che compare, lo segna come scoperta. */
  metti(i: number, t: number, dato = -1): void {
    this.tipo[i] = t;
    this.dato[i] = dato < 0 ? this.datoIniziale(t) : dato;
    this.tinta[i] = (this.caso() * 256) | 0;
    this.fatto[i] = this.giro;
    if (t >= PRIMA_MISCELA) {
      if (!this.visti.has(this.idTipo[t])) this.scopri(this.idTipo[t], i % this.w, (i / this.w) | 0);
    } else if (!NASCOSTO[t] && !this.visti.has(t)) this.scopri(t, i % this.w, (i / this.w) | 0);
  }

  scopri(id: number, x: number, y: number): void {
    if (id <= 0 || this.visti.has(id)) return;
    this.visti.add(id);
    this.novita.push({ id, x, y });
    if (PER_ID.has(id) && vociTrovate(this.visti) === SOGLIA_MISCELE) this.annunci.push('miscele');
    // Le ere arrivano in ordine: quella che tocca adesso scatta, e con lei, a cascata, quelle che aspettavano.
    for (const era of erePronte(this.visti)) this.scopri(era, x, y);
  }

  /** Quante voci del Libro sono state trovate (le miscele non contano). */
  voci(): number {
    return vociTrovate(this.visti);
  }

  /** Segna che una coppia è stata provata unendo. */
  ricordaProvata(a: number, b: number): void {
    this.provate.add(chiaveProvata(a, b));
  }

  /** Vero se quella coppia (in qualsiasi ordine) è già stata provata. */
  giaProvata(a: number, b: number): boolean {
    return this.provate.has(chiaveProvata(a, b));
  }

  /**
   * Unisce due scoperte, come nei giochi di alchimia: l'esito lo decide `esitoDi`, lo stesso per Unisci e per il
   * mondo. Un'invenzione o una reazione del mondo nasce e si scopre; la via di un fenomeno non lo regala e risponde
   * SOLO_NEL_MONDO; due sostanze senza esito danno la loro miscela (solo da quando il Libro ha dodici voci);
   * altrimenti niente (-1). Si uniscono solo cose già scoperte. La coppia provata si ricorda, tranne i fenomeni e
   * le miscele che aspettano il Libro più pieno.
   * Quando nasce l'Omino e nel mondo non c'è nessuno, ne arrivano due vicino all'acqua, il più vicino possibile alla
   * colonna `x` (dove sta guardando chi gioca); se nel mondo non c'è acqua, l'Omino resta una scoperta.
   */
  unisci(a: number, b: number, x = this.w >> 1): number {
    if (a === b || !this.visti.has(a) || !this.visti.has(b)) return -1;
    const esito = esitoDi(a, b, this.voci());
    if (esito.genere === 'fenomeno') return SOLO_NEL_MONDO;
    if (esito.genere === 'niente' && esito.perOra) return -1;
    this.ricordaProvata(a, b);
    const nato = esito.genere === 'miscela' ? this.registra(a, b) : esito.id;
    // Gli omini che arrivano si scoprono dove arrivano: lì il mondo fa festa.
    if (nato === OMINO && this.omini.length === 0) primiOmini(this, Math.max(0, Math.min(this.w - 1, Math.round(x))), this.w);
    if (nato > 0) this.scopri(nato, this.w >> 1, this.h >> 1);
    return nato;
  }

  /**
   * Porta la scoperta `id` sopra il punto (x, y) del mondo, da un gettone o da una cosa del mondo tenuta con la Mano:
   * la mette lì, oppure la unisce con quello che c'è, con le stesse regole di Unisci (vedi porta.ts). Il punto può
   * arrivare con la virgola (dal dito, in pixel divisi per la scala): conta la cella che lo contiene.
   */
  porta(id: number, x: number, y: number, da: Provenienza): EsitoPorta {
    return porta(this, id, Math.floor(x), Math.floor(y), da);
  }

  /** La cella più alta di una colonna su cui qualcosa può appoggiarsi (il primo punto che non è vuoto né gas). */
  suolo(x: number, da = 0): number {
    let y = Math.max(0, da);
    while (y < this.h && (this.tipo[y * this.w + x] === M.VUOTO || this.stato[this.tipo[y * this.w + x]] === GAS || this.tipo[y * this.w + x] === M.PIANTA)) y++;
    return y;
  }

  /**
   * Dice se un'invenzione si può posare con il centro sulla colonna x, vicino alla riga y, e dove finirebbe: sul
   * terreno vero più alto sotto il suo ingombro (o sul pelo dell'acqua, per barca e ponte). Se non si può, dice perché.
   */
  puoPosare(id: number, x: number, y: number): Posto {
    return puoPosare(this, id, x, y);
  }

  /** Posa un'invenzione nel mondo, se lì può stare (vedi `puoPosare`). Le piante che trova al suo posto le toglie. */
  posa(id: number, x: number, y: number): boolean {
    const dove = puoPosare(this, id, x, y);
    if (!dove.si) return false;
    sgombra(this, id, dove.x, dove.y);
    // Ogni cosa ha un numero d'ordine tutto suo, anche dopo che altre sono state tolte.
    let n = 1;
    for (const c of this.cose) if (c.n >= n) n = c.n + 1;
    this.cose.push({ id, x: dove.x, y: dove.y, n });
    this.coperta.fill(1, dove.x, dove.x + INGOMBRO[id][0]);
    this.fonti.daRifare = true;
    return true;
  }

  svuota(i: number): void {
    this.tipo[i] = M.VUOTO;
    this.dato[i] = 0;
  }

  private scambia(a: number, b: number): void {
    const { tipo, dato, tinta, fatto } = this;
    const t = tipo[a];
    const d = dato[a];
    const c = tinta[a];
    tipo[a] = tipo[b];
    dato[a] = dato[b];
    tinta[a] = tinta[b];
    tipo[b] = t;
    dato[b] = d;
    tinta[b] = c;
    fatto[a] = this.giro;
    fatto[b] = this.giro;
  }

  /** Una delle quattro celle accanto, scelta a caso; -1 se cade fuori dal mondo. */
  private vicino(i: number, x: number, y: number): number {
    const r = (this.caso() * 4) | 0;
    if (r === 0) return y > 0 ? i - this.w : -1;
    if (r === 1) return y < this.h - 1 ? i + this.w : -1;
    if (r === 2) return x > 0 ? i - 1 : -1;
    return x < this.w - 1 ? i + 1 : -1;
  }

  /** Una polvere entra nel vuoto, nei gas e nei liquidi più leggeri di lei (su quelli più pesanti galleggia). */
  private entraPolvere(j: number, t: number): boolean {
    const v = this.tipo[j];
    const s = this.stato[v];
    return s === NULLA || s === GAS || (s === LIQUIDO && this.peso[t] >= this.peso[v] && this.caso() < 0.6);
  }

  /** Un liquido entra nel vuoto e nei gas, e scende sotto i liquidi più leggeri di lui. */
  private entraLiquido(j: number, t: number): boolean {
    const v = this.tipo[j];
    const s = this.stato[v];
    return s === NULLA || s === GAS || (s === LIQUIDO && this.peso[v] < this.peso[t] - 0.06 && this.caso() < 0.25);
  }

  /** Cade; se non può, scivola di lato con probabilità `scorre` (la sabbia scorre, il fango quasi no). */
  private muoviPolvere(i: number, x: number, y: number, scorre: number, t: number): boolean {
    if (y >= this.h - 1) return false;
    const giu = i + this.w;
    if (x > 0 && x < this.w - 1) {
      // Sepolta: sotto di lei, e sotto ai suoi lati, c'è solo roba che non cede (polvere o solido). Non può
      // muoversi, quindi non serve nemmeno tirare i dadi: in un mondo pieno di terra è quasi tutta così.
      const { stato, tipo } = this;
      const sotto = stato[tipo[giu]];
      if (sotto === POLVERE || sotto === SOLIDO) {
        const a = stato[tipo[giu - 1]];
        const b = stato[tipo[giu + 1]];
        if ((a === POLVERE || a === SOLIDO) && (b === POLVERE || b === SOLIDO)) return false;
      }
    }
    if (this.entraPolvere(giu, t)) {
      this.scambia(i, giu);
      return true;
    }
    if (this.caso() < scorre) {
      const d = this.caso() < 0.5 ? -1 : 1;
      for (let k = 0; k < 2; k++) {
        const dx = k === 0 ? d : -d;
        const nx = x + dx;
        if (nx < 0 || nx >= this.w) continue;
        if (this.stato[this.tipo[i + dx]] === SOLIDO) continue;
        if (this.entraPolvere(giu + dx, t)) {
          this.scambia(i, giu + dx);
          return true;
        }
      }
    }
    return false;
  }

  /** Cade, scivola in diagonale, oppure si allarga di lato fino a `spinta` celle per livellarsi. */
  private muoviLiquido(i: number, x: number, y: number, spinta: number, t: number): boolean {
    const w = this.w;
    if (y < this.h - 1) {
      const giu = i + w;
      if (this.entraLiquido(giu, t)) {
        this.scambia(i, giu);
        return true;
      }
      const d = this.caso() < 0.5 ? -1 : 1;
      for (let k = 0; k < 2; k++) {
        const dx = k === 0 ? d : -d;
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        if (this.entraLiquido(giu + dx, t) && this.entraLiquido(i + dx, t)) {
          this.scambia(i, giu + dx);
          return true;
        }
      }
    }
    const d = this.caso() < 0.5 ? -1 : 1;
    let meta = -1;
    for (let n = 1; n <= spinta; n++) {
      const nx = x + d * n;
      if (nx < 0 || nx >= w) break;
      const j = i + d * n;
      const s = this.stato[this.tipo[j]];
      if (s !== NULLA && s !== GAS) break;
      meta = j;
      if (y < this.h - 1 && this.entraLiquido(j + w, t)) break;
    }
    if (meta >= 0) {
      this.scambia(i, meta);
      return true;
    }
    return false;
  }

  /** Sale con probabilità `su`, altrimenti ondeggia di lato. */
  private muoviGas(i: number, x: number, y: number, su: number): boolean {
    const r = this.caso();
    if (r < su) {
      if (y > 0) {
        const d = r < su * 0.25 ? (this.caso() < 0.5 ? -1 : 1) : 0;
        const nx = x + d;
        if (nx >= 0 && nx < this.w && this.tipo[i - this.w + d] === M.VUOTO) {
          this.scambia(i, i - this.w + d);
          return true;
        }
        if (this.tipo[i - this.w] === M.VUOTO) {
          this.scambia(i, i - this.w);
          return true;
        }
      }
    }
    if (r > 0.6 || r < su) {
      const d = this.caso() < 0.5 ? -1 : 1;
      const nx = x + d;
      if (nx >= 0 && nx < this.w && this.tipo[i + d] === M.VUOTO) {
        this.scambia(i, i + d);
        return true;
      }
    }
    return false;
  }

  /** L'aria è un soffio: si sparpaglia in ogni direzione, anche verso il basso, e sale solo un poco. */
  private soffia(i: number, x: number, y: number): void {
    const r = this.caso();
    const dx = r < 0.4 ? -1 : r < 0.8 ? 1 : 0;
    const q = this.caso();
    const dy = q < 0.45 ? -1 : q < 0.75 ? 1 : 0;
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= this.w || ny < 0 || ny >= this.h) return;
    const j = ny * this.w + nx;
    if (this.tipo[j] === M.VUOTO) this.scambia(i, j);
  }

  // ── Fuoco, fulmini, esplosioni ───────────────────────────────────────────────

  /** Dà fuoco a qualcosa che brucia: più è buon combustibile, più a lungo arde. Ciò che esplode, esplode. */
  accendi(j: number): void {
    const t = this.tipo[j];
    if (this.esplode[t] > ESPLODE) {
      this.esplodi(j % this.w, (j / this.w) | 0, 3 + Math.round(this.esplode[t] * 3));
      return;
    }
    let durata = 22 + ((this.caso() * 30) | 0);
    if (t === M.LEGNO) durata = 110 + ((this.caso() * 120) | 0);
    else if (t === M.CARBONE) durata = 180 + ((this.caso() * 70) | 0);
    else if (t >= PRIMA_MISCELA) durata = 30 + (this.sostanze[t]?.brucia ?? 0.5) * 150 * (0.6 + this.caso() * 0.4);
    this.metti(j, M.BRACE, Math.min(255, durata | 0));
    // La brace ricorda nel bit più basso della sua tinta se era legno: solo quella, sepolta, diventa carbone.
    if (t === M.LEGNO) this.tinta[j] |= 1;
    else this.tinta[j] &= 254;
  }

  /** Un'esplosione: spazza via quello che c'è intorno (la roccia no) e lascia fuoco e fumo. */
  esplodi(x: number, y: number, r: number): void {
    this.scopri(ESPLOSIONE, x, y);
    this.botti.push({ x, y, r });
    const cuore = r * r * 0.4;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > r * r || !this.dentro(x + dx, y + dy)) continue;
        const j = (y + dy) * this.w + x + dx;
        if (this.tipo[j] === M.ROCCIA) continue;
        if (d2 <= cuore || this.caso() < 0.45) this.metti(j, M.FUOCO, 10 + ((this.caso() * 20) | 0));
        else if (this.caso() < 0.3) this.metti(j, M.FUMO);
        else this.svuota(j);
      }
    }
    const r2 = (r + 1) * (r + 1);
    this.omini = this.omini.filter((o) => {
      if ((o.x - x) * (o.x - x) + (o.y - 1 - y) * (o.y - 1 - y) > r2) return true;
      this.fatti.push({ cosa: 'morto', causa: 'fuoco', x: o.x, y: o.y - 1 });
      return false;
    });
  }

  /** Fa nascere un germoglio: erba bassa, oppure (più di rado) un albero. Sotto una cosa posata non spunta niente. */
  private germoglia(j: number, fertile: boolean): void {
    if (sottoUnaCosa(this, j % this.w, (j / this.w) | 0)) return;
    const albero = this.caso() < (fertile ? 0.35 : 0.15);
    this.metti(j, M.PIANTA, albero ? ALBERO + 6 + ((this.caso() * 8) | 0) : 1 + ((this.caso() * 4) | 0));
  }

  /** Un fulmine scende a zig-zag da (x, y) finché non colpisce qualcosa. */
  fulmine(x: number, y: number): void {
    const { w, h, tipo } = this;
    let cx = x;
    for (let cy = Math.max(0, y); cy < h; cy++) {
      const i = cy * w + cx;
      const t = tipo[i];
      const s = this.stato[t];
      if (s === NULLA || s === GAS) {
        if (t !== M.NUVOLA) this.metti(i, M.FULMINE);
        const d = ((this.caso() * 3) | 0) - 1;
        if (cx + d >= 0 && cx + d < w) cx += d;
        continue;
      }
      this.colpisci(cx, cy);
      return;
    }
  }

  private colpisci(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > 5 || !this.dentro(x + dx, y + dy)) continue;
        const j = (y + dy) * this.w + x + dx;
        const t = this.tipo[j];
        if (t === M.SABBIA) this.metti(j, M.VETRO);
        else if (t === M.CARBONE) this.metti(j, M.DIAMANTE);
        else if (this.brucia[t]) this.accendi(j);
        else if (t === M.ACQUA && this.caso() < 0.5) this.metti(j, M.VAPORE);
        else if ((t === M.NEVE || t === M.GHIACCIO) && this.caso() < 0.5) this.metti(j, M.ACQUA);
      }
    }
  }

  // ── Il tempo che passa ───────────────────────────────────────────────────────

  /** Fa avanzare il mondo di un istante. */
  passo(): void {
    this.tic++;
    this.giro = (this.giro + 1) & 255;
    const { w, h, tipo, fatto } = this;
    const giro = this.giro;
    const daSinistra = (this.tic & 1) === 0;
    for (let y = h - 1; y >= 0; y--) {
      const riga = y * w;
      for (let k = 0; k < w; k++) {
        const x = daSinistra ? k : w - 1 - k;
        const i = riga + x;
        const t = tipo[i];
        if (FERMO[t] || fatto[i] === giro) continue;
        this.aggiorna(i, x, y, t);
      }
    }
    if (this.tic % 2400 === 0 && this.caso() < 0.5) this.vento = this.vento === 1 ? -1 : 1;
    if (this.tic % 120 === 0) {
      this.contaCelle();
      fenomeni(this);
      this.fonti.daRifare = true;
    }
    if (this.tic % 4 === 0) assestaCose(this);
    // Dove si beve e dove si mangia: ogni due secondi circa, e subito se una cosa è stata posata o tolta.
    if (this.fonti.daRifare) this.fonti.aggiorna(this);
    aggiornaOmini(this);
  }

  /** Conta quante celle ci sono di ogni tipo. */
  contaCelle(): void {
    const { conta, tipo } = this;
    conta.fill(0);
    for (let i = 0; i < tipo.length; i++) conta[tipo[i]]++;
  }

  private aggiorna(i: number, x: number, y: number, t: number): void {
    const { tipo, dato, w } = this;
    switch (t) {
      case M.TERRA:
        this.muoviPolvere(i, x, y, 0.35, t);
        return;

      case M.SABBIA:
        this.muoviPolvere(i, x, y, 1, t);
        return;

      case M.FANGO:
      case M.HUMUS: {
        if (this.muoviPolvere(i, x, y, t === M.FANGO ? 0.08 : 0.35, t)) return;
        if (t === M.FANGO && y > 1) {
          const sopra = tipo[i - w];
          // Sotto uno specchio d'acqua il fango si approfondisce di qualche cella: la riva si vede.
          if (y < this.h - 1 && tipo[i + w] === M.TERRA && this.caso() < 0.01) {
            if (sopra === M.ACQUA || tipo[i - 2 * w] === M.ACQUA) this.metti(i + w, M.FANGO);
          }
          // Sul fondo fangoso di uno stagno crescono le alghe.
          if (sopra === M.ACQUA && tipo[i - 2 * w] === M.ACQUA && this.caso() < 0.0004) {
            this.metti(i - w, M.ALGA, 2 + ((this.caso() * 6) | 0));
            return;
          }
        }
        // La vita: un germoglio spunta dove il terreno umido (o fertile) ha cielo aperto sopra.
        if (y > 1 && tipo[i - w] === M.VUOTO && tipo[i - 2 * w] === M.VUOTO) {
          if (this.caso() < (t === M.FANGO ? 0.00006 : 0.0005)) this.germoglia(i - w, t === M.HUMUS);
        }
        return;
      }

      case M.CENERE: {
        const j = this.vicino(i, x, y);
        if (j >= 0 && tipo[j] === M.TERRA && this.caso() < 0.1) {
          this.metti(j, M.HUMUS);
          this.svuota(i);
          return;
        }
        if (this.caso() < 0.7) this.muoviPolvere(i, x, y, 0.8, t);
        return;
      }

      case M.NEVE: {
        const j = this.vicino(i, x, y);
        if (j >= 0 && tipo[j] === M.ACQUA && this.caso() < 0.15) {
          this.metti(j, M.GHIACCIO);
          this.metti(i, M.GHIACCIO);
          return;
        }
        if (this.caso() < 0.5) this.muoviPolvere(i, x, y, 0.5, t);
        return;
      }

      case M.ARGILLA:
        if (y < this.h - 1 && this.entraPolvere(i + w, t)) this.scambia(i, i + w);
        return;

      case M.CARBONE: {
        // Carbone e zolfo, insieme, fanno la polvere nera.
        const j = this.vicino(i, x, y);
        if (j >= 0 && tipo[j] === M.ZOLFO && this.caso() < 0.2) {
          this.metti(j, M.POLVERE_NERA);
          this.metti(i, M.POLVERE_NERA);
          return;
        }
        this.muoviPolvere(i, x, y, 0.5, t);
        return;
      }

      case M.RUGGINE:
        this.muoviPolvere(i, x, y, 0.5, t);
        return;

      case M.ZOLFO:
        this.muoviPolvere(i, x, y, 0.7, t);
        return;

      case M.POLVERE_NERA:
        this.muoviPolvere(i, x, y, 0.8, t);
        return;

      case M.FRUTTO: {
        // Resta appeso al ramo per un po'; poi cade, e se trova buona terra ne nasce un albero.
        const d = dato[i];
        if (d > 0) {
          if (this.caso() < 0.1) dato[i] = d - 1;
          return;
        }
        if (this.muoviPolvere(i, x, y, 0.3, t)) return;
        if (y < this.h - 1) {
          const sotto = tipo[i + w];
          if ((sotto === M.FANGO || sotto === M.HUMUS || sotto === M.TERRA) && this.caso() < 0.002 && !sottoUnaCosa(this, x, y)) {
            this.metti(i, M.PIANTA, ALBERO + 6 + ((this.caso() * 8) | 0));
            return;
          }
        }
        if (this.caso() < 0.0004) this.svuota(i);
        return;
      }

      case M.ACQUA: {
        // Chiusa tra altra acqua e cose che la lasciano tranquilla (sotto e ai lati; sopra anche niente) non può
        // muoversi e non ha niente con cui reagire: si salta subito. Un mare fermo, o il velo d'acqua di una
        // pozzanghera sulla roccia, così non costano quasi nulla.
        if (x > 0 && x < w - 1 && y > 0 && y < this.h - 1) {
          const quieta = this.quieta;
          if (quieta[tipo[i + w]] && quieta[tipo[i - 1]] && quieta[tipo[i + 1]]) {
            const sopra = tipo[i - w];
            if (sopra === M.VUOTO || quieta[sopra]) return;
          }
        }
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (v === M.FUOCO) {
            // L'acqua che spegne un fuoco se ne va in vapore: una cella d'acqua, una di vapore. I conti tornano,
            // e il cielo non può restituire più acqua di quanta ne ha presa.
            this.metti(j, M.VAPORE);
            this.svuota(i);
            return;
          } else if (v === M.LAVA) {
            this.metti(j, M.PIETRA);
            this.metti(i, M.VAPORE);
            return;
          } else if (v === M.BRACE) {
            this.metti(j, M.CENERE);
            this.metti(i, M.VAPORE);
            return;
          } else if (v === M.TERRA) {
            if (this.caso() < 0.12) {
              this.metti(j, M.FANGO);
              this.svuota(i);
              return;
            }
          } else if (v === M.ZOLFO) {
            // Lo zolfo sciolto nell'acqua diventa acido.
            if (this.caso() < 0.05) {
              this.metti(j, M.ACIDO);
              this.metti(i, M.ACIDO);
              return;
            }
          } else if (v === M.PIETRA) {
            // La pietra bagnata, col tempo, si copre di muschio.
            if (this.caso() < 0.0008) this.metti(j, M.MUSCHIO, 0);
          } else if (v === M.METALLO) {
            if (this.caso() < 0.002) this.metti(j, M.RUGGINE);
          }
        }
        this.muoviLiquido(i, x, y, 4, t);
        return;
      }

      case M.ACIDO: {
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (v === M.ACQUA) {
            // Nell'acqua, piano piano, si diluisce.
            if (this.caso() < 0.02) {
              this.metti(i, M.ACQUA);
              return;
            }
          } else if (!RESISTE[v] && (this.stato[v] === POLVERE || this.stato[v] === SOLIDO) && this.caso() < 0.04) {
            this.svuota(j);
            if (this.caso() < 0.5) {
              if (this.caso() < 0.3) this.metti(i, M.FUMO);
              else this.svuota(i);
              return;
            }
          }
        }
        this.muoviLiquido(i, x, y, 3, t);
        return;
      }

      case M.LAVA: {
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (this.brucia[v]) this.accendi(j);
          else if (v === M.SABBIA) {
            if (this.caso() < 0.05) this.metti(j, M.VETRO);
          } else if (v === M.NEVE || v === M.GHIACCIO) {
            this.metti(j, M.VAPORE);
            this.metti(i, M.OSSIDIANA);
            return;
          } else if (v === M.ARGILLA) {
            if (this.caso() < 0.1) this.metti(j, M.MATTONE);
          } else if (v === M.FANGO) {
            if (this.caso() < 0.1) this.metti(j, M.TERRA);
          } else if (v === M.PIETRA) {
            // La lava fonde la pietra e ne tira fuori il metallo: di rado, perché una pozza che si raffredda
            // deve restare quasi tutta pietra.
            if (this.caso() < 0.0003) this.metti(j, M.METALLO);
          } else if (v === M.CENERE) {
            if (this.caso() < 0.2) this.metti(j, M.ZOLFO);
          } else if (v === M.ARIA) {
            if (this.caso() < 0.2) {
              this.svuota(j);
              this.metti(i, M.PIETRA);
              return;
            }
          } else if (v === M.VUOTO && j === i - w && this.caso() < 0.01) {
            this.metti(j, M.FUOCO, 6 + ((this.caso() * 8) | 0));
          }
        }
        // Lasciata in pace, la lava si raffredda da sola e diventa pietra.
        if (this.caso() < 0.0015) {
          this.metti(i, M.PIETRA);
          return;
        }
        if (this.caso() < 0.35) this.muoviLiquido(i, x, y, 1, t);
        return;
      }

      case M.FUOCO: {
        if (dato[i] <= 1) {
          if (this.caso() < 0.2) this.metti(i, M.FUMO);
          else this.svuota(i);
          return;
        }
        dato[i]--;
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (this.brucia[v]) {
            if (this.caso() < 0.5) this.accendi(j);
          } else if (v === M.ACQUA) {
            // Il fuoco si spegne in vapore e l'acqua che l'ha spento non c'è più (vedi il caso dell'acqua).
            this.svuota(j);
            this.metti(i, M.VAPORE);
            return;
          } else if (v === M.TERRA) {
            if (this.caso() < 0.05) this.metti(j, M.LAVA);
          } else if (v === M.FANGO) {
            if (this.caso() < 0.1) this.metti(j, M.TERRA);
          } else if (v === M.ARGILLA) {
            if (this.caso() < 0.08) this.metti(j, M.MATTONE);
          } else if (v === M.NEVE || v === M.GHIACCIO) {
            this.metti(j, M.ACQUA);
            this.svuota(i);
            return;
          }
        }
        this.muoviGas(i, x, y, 0.7);
        return;
      }

      case M.BRACE: {
        if (dato[i] <= 1) {
          // Il legno che brucia soffocato non diventa cenere: diventa carbone. Soffocato vuol dire sepolto
          // davvero: un albero che brucia all'aperto, con tutta la sua chioma, lascia solo cenere e fumo.
          if ((this.tinta[i] & 1) === 1 && this.sepolta(x, y)) this.metti(i, M.CARBONE, NATO_SEPOLTO);
          else this.metti(i, this.caso() < 0.6 ? M.CENERE : M.FUMO);
          return;
        }
        dato[i]--;
        if (y > 0 && tipo[i - w] === M.VUOTO && this.caso() < 0.3) {
          this.metti(i - w, M.FUOCO, 8 + ((this.caso() * 10) | 0));
        }
        const j = this.vicino(i, x, y);
        // La brace attacca il fuoco a ciò che ha accanto. Solo la brace del legno non riaccende il carbone nato
        // lì sotto insieme a lei: altrimenti una catasta sepolta brucerebbe in tondo senza fine (legno, carbone,
        // brace, carbone…). Una fiamma vera, o la brace di altro carbone, lo accendono come sempre.
        if (j >= 0 && this.brucia[tipo[j]] && !(tipo[j] === M.CARBONE && dato[j] === NATO_SEPOLTO && (this.tinta[i] & 1) === 1) && this.caso() < 0.08) {
          this.accendi(j);
        }
        return;
      }

      case M.ARIA: {
        if (dato[i] <= 1) {
          this.svuota(i);
          return;
        }
        dato[i]--;
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (v === M.TERRA) {
            if (this.caso() < 0.25) {
              this.metti(j, M.SABBIA);
              this.svuota(i);
              return;
            }
          } else if (v === M.FANGO) {
            if (this.caso() < 0.3) {
              this.metti(j, M.ARGILLA);
              this.svuota(i);
              return;
            }
          } else if (v === M.VAPORE) {
            if (this.caso() < 0.5) this.metti(j, M.NUVOLA, 1);
          } else if (v === M.ACQUA) {
            // L'aria asciuga: un soffio sull'acqua ne porta via un po', come vapore.
            if (this.caso() < 0.04) {
              this.metti(j, M.VAPORE);
              this.svuota(i);
              return;
            }
          } else if (v === M.FUOCO || v === M.BRACE) {
            // L'aria alimenta il fuoco: la fiammata corre lungo il soffio.
            this.metti(i, M.FUOCO, 14 + ((this.caso() * 14) | 0));
            return;
          } else if (v === M.NUVOLA) {
            if (this.caso() < 0.2) {
              this.metti(j, M.NEVE);
              this.svuota(i);
              return;
            }
          } else if (v === M.LAVA && this.caso() < 0.2) {
            this.metti(j, M.PIETRA);
            this.svuota(i);
            return;
          }
        }
        this.soffia(i, x, y);
        return;
      }

      case M.VAPORE: {
        // Arrivato in alto, il vapore si raccoglie in nuvola; se resta intrappolato, torna acqua.
        // Una cella di vapore fa una nuvola che porta una goccia sola: tanta acqua è salita, tanta ne ricade.
        if (y < this.h * 0.16) {
          this.metti(i, M.NUVOLA, 1);
          return;
        }
        if (dato[i] <= 1) {
          this.metti(i, M.ACQUA);
          return;
        }
        dato[i]--;
        this.muoviGas(i, x, y, 0.8);
        return;
      }

      case M.FUMO:
        if (dato[i] <= 1) {
          this.svuota(i);
          return;
        }
        dato[i]--;
        this.muoviGas(i, x, y, 0.6);
        return;

      case M.NUVOLA: {
        const quota = 2 + (this.tinta[i] % this.fasciaNuvole);
        if (y > quota) {
          if (tipo[i - w] === M.VUOTO && this.caso() < 0.5) {
            this.scambia(i, i - w);
            return;
          }
        }
        // Piove dalla pancia della nuvola: chi ha altra nuvola sotto di sé non tira nemmeno il dado.
        if (y < this.h - 1 && tipo[i + w] === M.VUOTO && this.caso() < 0.0015) {
          this.metti(i + w, M.ACQUA);
          this.pioggia++;
          this.scopri(PIOGGIA, x, y + 1);
          if (dato[i] <= 1) {
            this.svuota(i);
            return;
          }
          dato[i]--;
        }
        // Il fulmine scocca dal cuore di una nuvola grande e fitta. Dopo ogni scarica il cielo intero prende fiato
        // per qualche secondo: un temporale tuona e lampeggia, ma non diventa una mitragliata senza fine.
        if (
          this.tic >= this.prossimoFulmine &&
          this.caso() < 0.00005 &&
          x > 0 &&
          x < w - 1 &&
          y > 0 &&
          tipo[i - 1] === M.NUVOLA &&
          tipo[i + 1] === M.NUVOLA &&
          tipo[i - w] === M.NUVOLA &&
          tipo[i + w] === M.NUVOLA
        ) {
          // Fulmini e pioggia insieme: è un temporale.
          if (this.pioggia > 6) this.scopri(TEMPORALE, x, y);
          this.prossimoFulmine = this.tic + 240 + ((this.caso() * 240) | 0);
          this.fulmine(x, y + 1);
          return;
        }
        if (this.caso() < 0.06) {
          const d = this.caso() < 0.8 ? this.vento : -this.vento;
          const nx = x + d;
          if (nx >= 0 && nx < w && tipo[i + d] === M.VUOTO) this.scambia(i, i + d);
        }
        return;
      }

      case M.FULMINE: {
        if (dato[i] <= 1) {
          this.svuota(i);
          return;
        }
        dato[i]--;
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (v === M.SABBIA) this.metti(j, M.VETRO);
          else if (v === M.CARBONE) this.metti(j, M.DIAMANTE);
          else if (this.brucia[v]) this.accendi(j);
        }
        return;
      }

      case M.PIANTA: {
        const d = dato[i];
        if (d === 0) {
          // Sotto le foglie di una chioma, ogni tanto, matura un frutto.
          if (y < this.h - 1 && tipo[i + w] === M.VUOTO && this.caso() < 0.00006) {
            this.metti(i + w, M.FRUTTO, 100 + ((this.caso() * 150) | 0));
          }
          return;
        }
        if (d === ALBERO || y === 0 || this.caso() >= 0.02) return;
        if (d < ALBERO) {
          // Erba: uno stelo che sale di qualche cella; in cima, qualche volta, sboccia un fiore.
          if (tipo[i - w] === M.VUOTO) {
            this.metti(i - w, M.PIANTA, d - 1);
            if (d === 1 && this.tinta[i - w] > 238) this.scopri(FIORE, x, y - 1);
          }
          dato[i] = 0;
          return;
        }
        // Albero: la punta sale, e dietro di sé lascia il tronco.
        const resto = d - ALBERO - 1;
        let dx = 0;
        if (this.caso() < 0.15) dx = this.caso() < 0.5 ? -1 : 1;
        if (x + dx < 0 || x + dx >= w || tipo[i - w + dx] !== M.VUOTO) dx = 0;
        const j = i - w + dx;
        // Trova chiuso, oppure salirebbe dentro una costruzione: l'albero si ferma qui.
        if (tipo[j] !== M.VUOTO || sottoUnaCosa(this, x + dx, y - 1)) {
          dato[i] = 0;
          return;
        }
        this.metti(j, M.PIANTA, resto > 0 ? ALBERO + resto : 0);
        // Il tronco di un albero è uno sfondo per gli omini, non un muro: lo dice il suo dato.
        this.metti(i, M.LEGNO, TRONCO);
        if (resto <= 0) this.chioma(x + dx, y - 1);
        return;
      }

      case M.LEGNO:
        // Sul legno che tocca l'umido spuntano i funghi.
        if (this.caso() < 0.0006) {
          const j = this.vicino(i, x, y);
          if (j >= 0 && (tipo[j] === M.FANGO || tipo[j] === M.ACQUA || tipo[j] === M.HUMUS)) {
            const k = this.vicino(i, x, y);
            if (k >= 0 && tipo[k] === M.VUOTO) this.metti(k, M.FUNGO);
          }
        }
        return;

      case M.MUSCHIO:
        // Il muschio si allarga sulla pietra vicina, ma non all'infinito.
        if (dato[i] < 10 && this.caso() < 0.002) {
          const j = this.vicino(i, x, y);
          if (j >= 0 && tipo[j] === M.PIETRA) this.metti(j, M.MUSCHIO, dato[i] + 1);
        }
        return;

      case M.ALGA: {
        const d = dato[i];
        if (d > 0 && y > 0 && this.caso() < 0.02) {
          if (tipo[i - w] === M.ACQUA) this.metti(i - w, M.ALGA, d - 1);
          dato[i] = 0;
        }
        return;
      }

      default:
        if (t >= PRIMA_MISCELA) this.aggiornaMiscela(i, x, y, t);
    }
  }

  /**
   * Come si comporta una miscela: non ha regole scritte apposta, segue il suo carattere. Se scotta accende e fa
   * evaporare, se è gelida ghiaccia, se è viva si allarga, se corrode mangia quello che tocca, e così via.
   * Le soglie sono quelle delle etichette del Libro: ciò che l'etichetta promette, qui succede.
   */
  private aggiornaMiscela(i: number, x: number, y: number, t: number): void {
    const { tipo, dato, w } = this;
    const stato = this.stato[t];
    const j = this.vicino(i, x, y);
    if (j >= 0) {
      const v = tipo[j];
      const calore = this.calore[t];
      if (calore > CALDO) {
        // Accende quello che tocca (non sé stessa: una miscela rovente che brucia o esplode aspetta una fiamma vera).
        if (this.brucia[v]) {
          if (v !== t && this.caso() < 0.3) this.accendi(j);
        } else if (v === M.ACQUA) {
          if (this.caso() < 0.2) {
            this.metti(j, M.VAPORE);
            // Far bollire l'acqua costa: ogni tanto la miscela si spegne in uno sbuffo di fumo. Così nessuno
            // stagno bolle per sempre, e il temporale che ne nasce prima o poi finisce.
            if (this.caso() < 0.15) {
              this.metti(i, M.FUMO);
              return;
            }
          }
        } else if (v === M.NEVE || v === M.GHIACCIO) this.metti(j, M.ACQUA);
      } else if (calore < -CALDO) {
        if (v === M.ACQUA) {
          if (this.caso() < 0.03) this.metti(j, M.GHIACCIO);
        } else if (v === M.FUOCO) this.svuota(j);
        else if (v === M.LAVA && this.caso() < 0.1) this.metti(j, M.PIETRA);
      }
      if (this.veleno[t] > VELENO && (v === M.PIANTA || v === M.ALGA || v === M.MUSCHIO || v === M.FUNGO) && this.caso() < 0.1) {
        this.svuota(j);
      }
      if (this.corrode[t] > CORRODE && v !== t && !RESISTE[v] && (this.stato[v] === POLVERE || this.stato[v] === SOLIDO) && this.caso() < 0.04) {
        this.svuota(j);
        if (this.caso() < 0.5) {
          this.svuota(i);
          return;
        }
      }
      if (stato !== GAS && this.vivo[t] > VIVO && dato[i] < STERILE && this.caso() < 0.004) {
        // Si allarga come una cosa viva: sulla terra che tocca, o sul vuoto che ha qualcosa sotto su cui posarsi.
        // Chi ha figliato non figlia più, e chi ci prova a vuoto invecchia (vedi STERILE): la catena si ferma da sola.
        if (SUOLO[v] || (v === M.VUOTO && j + w < tipo.length && tipo[j + w] !== M.VUOTO && this.stato[tipo[j + w]] !== GAS)) {
          this.metti(j, t, dato[i] + 1);
          dato[i] = STERILE;
        } else dato[i]++;
      }
    }
    const fertile = this.fertile[t] > FERTILE;
    if (stato === POLVERE) {
      if (this.muoviPolvere(i, x, y, this.scorre[t], t)) return;
    } else if (stato === LIQUIDO) {
      if (fertile && this.germogliaSulSuolo(i, y)) return;
      if (this.caso() < 0.3 + 0.7 * this.scorre[t]) this.muoviLiquido(i, x, y, 1 + Math.round(this.scorre[t] * 4), t);
      return;
    } else if (stato === GAS) {
      if (dato[i] <= 1) {
        this.svuota(i);
        return;
      }
      dato[i]--;
      if (fertile && this.germogliaSulSuolo(i, y)) return;
      this.muoviGas(i, x, y, 0.75 - this.peso[t] * 4);
      return;
    }
    // Su una miscela fertile che sta ferma, come sul terriccio, spuntano le piante.
    if (fertile && y > 1 && tipo[i - w] === M.VUOTO && tipo[i - 2 * w] === M.VUOTO && this.caso() < 0.0005) {
      this.germoglia(i - w, true);
    }
  }

  /**
   * Una miscela fertile che scorre o che vola non fa da terreno: bagna (o sfiora) la terra che ha sotto e, a cielo
   * aperto, ci lascia un germoglio al proprio posto. Vero se è successo.
   */
  private germogliaSulSuolo(i: number, y: number): boolean {
    const { tipo, w } = this;
    if (y < 1 || y >= this.h - 1 || !SUOLO[tipo[i + w]] || tipo[i - w] !== M.VUOTO || this.caso() >= 0.002) return false;
    this.germoglia(i, true);
    return true;
  }

  /**
   * Vero se a quella cella non arriva aria da nessuna delle otto parti. Lasciano passare l'aria il vuoto, i gas, ciò
   * che è arioso (foglie, cenere, neve…) e la brace di tutto ciò che non è legno: coprono davvero terra, sabbia,
   * pietra, lava, altro legno e la sua brace. Fuori dal mondo è chiuso.
   */
  private sepolta(x: number, y: number): boolean {
    const { tipo, w, h } = this;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx === 0 && dy === 0) || nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const j = ny * w + nx;
        const t = tipo[j];
        if (ARIOSO[t] || this.stato[t] === GAS || (t === M.BRACE && (this.tinta[j] & 1) === 0)) return false;
      }
    }
    return true;
  }

  private chioma(x: number, y: number): void {
    const r = 2 + ((this.caso() * 2) | 0);
    for (let dy = -r; dy <= 1; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + 1 || !this.dentro(x + dx, y + dy)) continue;
        const j = (y + dy) * this.w + x + dx;
        if (this.tipo[j] === M.VUOTO && this.caso() < 0.85) {
          this.metti(j, M.PIANTA, 0);
          if (this.tinta[j] > 238) this.scopri(FIORE, x + dx, y + dy);
        }
      }
    }
  }

  // ── I gesti del giocatore ────────────────────────────────────────────────────

  /**
   * Versa un materiale in un cerchio. I granelli cadono solo dove c'è posto,
   * così non si cancella per sbaglio quello che c'è già.
   */
  versa(x: number, y: number, raggio: number, t: number): void {
    if (t <= 0 || t >= N_TIPI) return;
    const stato = this.stato[t];
    const fitto = stato === SOLIDO ? 1 : stato === LIQUIDO ? 0.5 : stato === POLVERE ? 0.35 : 0.3;
    for (let dy = -raggio; dy <= raggio; dy++) {
      for (let dx = -raggio; dx <= raggio; dx++) {
        if (dx * dx + dy * dy > raggio * raggio || !this.dentro(x + dx, y + dy)) continue;
        const i = (y + dy) * this.w + x + dx;
        if (this.tipo[i] === M.VUOTO && this.caso() < fitto) this.metti(i, t);
      }
    }
  }

  /**
   * Cambia una cella come dice una reazione del mondo: resta com'è, prende fuoco, o diventa un'altra cosa (la pianta
   * nasce come germoglio).
   */
  trasforma(i: number, esito: number): void {
    if (esito === RESTA) return;
    if (esito === ACCENDI) {
      this.accendi(i);
      return;
    }
    // Una pianta fatta nascere da una reazione è un germoglio che poi cresce da sé, non una foglia ferma a mezz'aria.
    if (esito === M.PIANTA) this.germoglia(i, true);
    else this.metti(i, esito);
  }

  /** La gomma: toglie tutto quello che trova nel cerchio, omini compresi. */
  cancella(x: number, y: number, raggio: number): void {
    for (let dy = -raggio; dy <= raggio; dy++) {
      for (let dx = -raggio; dx <= raggio; dx++) {
        if (dx * dx + dy * dy > raggio * raggio || !this.dentro(x + dx, y + dy)) continue;
        this.svuota((y + dy) * this.w + x + dx);
      }
    }
    const prima = this.cose.length;
    this.cose = this.cose.filter((c) => {
      const [lw, lh] = INGOMBRO[c.id];
      return !(x >= c.x - raggio && x < c.x + lw + raggio && y <= c.y + raggio && y > c.y - lh - raggio);
    });
    if (this.cose.length !== prima) this.fonti.daRifare = true;
    // Un omino sparisce se la gomma passa su un punto qualsiasi del suo corpo.
    const r2 = (raggio + 1) * (raggio + 1);
    this.omini = this.omini.filter((o) => {
      for (let k = 0; k < ALTEZZA; k++) {
        if ((o.x - x) * (o.x - x) + (o.y - k - y) * (o.y - k - y) <= r2) return false;
      }
      return true;
    });
  }

  /** Posa un omino con i piedi nel punto indicato (se è per aria, cadrà fino a terra da solo). */
  aggiungiOmino(x: number, y: number): void {
    if (x < 0 || x >= this.w || this.omini.length >= POPOLAZIONE_MAX + 6) return;
    const piedi = Math.max(ALTEZZA - 1, Math.min(this.h - 1, y));
    this.omini.push(nuovoOmino(this, x, piedi, 300 + ((this.caso() * 300) | 0)));
    this.scopri(OMINO, x, piedi - 1);
  }
}
