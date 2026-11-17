import { CONSEGUENZE, type Cosa, INGOMBRO, unione } from './cose.js';
import { fenomeni } from './fenomeni.js';
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
} from './materiali.js';
import { fondi, idMiscela } from './miscele.js';
import { nomeMiscela } from './nomi.js';
import { ALTEZZA, type Omino, POPOLAZIONE_MAX, aggiornaOmini, nuovoOmino } from './omini.js';
import { ACCENDI, DEL_MESTOLO, RESTA } from './ricette.js';

/** Una scoperta appena avvenuta: cosa e dove (in celle), per far brillare il punto sullo schermo. */
export interface Novita {
  id: number;
  x: number;
  y: number;
}

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

/** Segno che il Mestolo lascia tra le cose nate in un gesto: "in questo gesto una miscela nuova è già nata". */
const UNA_NUOVA = -1;

/** Ciò che il Mestolo non può fondere. */
const NON_SI_MESCOLA = new Uint8Array(N_TIPI);
for (const t of [M.VUOTO, M.ROCCIA, M.BRACE]) NON_SI_MESCOLA[t] = 1;

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
  /** Un numero casuale per cella, fissato alla nascita: dà la grana ai colori e la quota alle nuvole. */
  readonly tinta: Uint8Array;
  private readonly fatto: Uint8Array;
  private giro = 0;
  private seme: number;

  tic = 0;
  /** Direzione in cui il vento spinge le nuvole: cambia ogni tanto. */
  vento: 1 | -1 = 1;
  omini: Omino[] = [];
  /** Cosa è già stato scoperto, nell'ordine in cui è successo: materiali, fenomeni, miscele. */
  readonly visti = new Set<number>();
  /** Scoperte avvenute dall'ultima volta che qualcuno le ha lette. */
  novita: Novita[] = [];
  /** Dove sono morti degli omini dall'ultima volta che qualcuno ha guardato (in celle). */
  caduti: { x: number; y: number }[] = [];
  /** Dove sono nati dei bambini dall'ultima volta che qualcuno ha guardato (in celle). */
  nati: { x: number; y: number }[] = [];
  /** Le esplosioni avvenute dall'ultima volta che qualcuno ha guardato (in celle). */
  botti: { x: number; y: number; r: number }[] = [];
  /** Le invenzioni posate nel mondo. */
  cose: Cosa[] = [];
  /** Quante celle ci sono di ogni materiale: aggiornato ogni due secondi circa. */
  readonly conta = new Uint32Array(N_TIPI);
  /** Tic in cui gli omini potranno (ri)comparire. */
  prossimoArrivo = 0;
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
    this.seme = seme | 0 || 1;
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
    let s = this.seme;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.seme = s;
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
    this.brucia[t] = s.brucia > 0.55 ? 1 : 0;
    this.mortale[t] = s.calore > 0.75 || s.veleno > 0.7 || s.corrode > 0.6 ? 1 : 0;
    this.cibo[t] = s.nutre > 0.6 && s.veleno <= 0.55 && s.stato !== GAS ? 1 : 0;
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
    for (const [quando, allora] of CONSEGUENZE) if (quando === id) this.scopri(allora, x, y);
  }

  /**
   * Unisce due scoperte, come nei giochi di alchimia. Se la coppia è scritta a mano nasce quell'invenzione;
   * se sono due sostanze senza un risultato scritto nasce la loro miscela; altrimenti niente (-1).
   */
  unisci(a: number, b: number): number {
    if (a === b || !this.visti.has(a) || !this.visti.has(b)) return -1;
    let esito = unione(a, b);
    if (esito < 0) esito = this.registra(a, b);
    if (esito > 0) this.scopri(esito, this.w >> 1, this.h >> 1);
    return esito;
  }

  /** La cella più alta di una colonna su cui qualcosa può appoggiarsi (il primo punto che non è vuoto né gas). */
  suolo(x: number, da = 0): number {
    let y = Math.max(0, da);
    while (y < this.h && (this.tipo[y * this.w + x] === M.VUOTO || this.stato[this.tipo[y * this.w + x]] === GAS || this.tipo[y * this.w + x] === M.PIANTA)) y++;
    return y;
  }

  /** Posa un'invenzione nel mondo, centrata sulla colonna indicata e appoggiata a terra. */
  posa(id: number, x: number, y: number): boolean {
    const ingombro = INGOMBRO[id];
    if (!ingombro || !this.visti.has(id) || this.cose.length >= 120) return false;
    const sx = Math.max(0, Math.min(this.w - ingombro[0], x - (ingombro[0] >> 1)));
    this.cose.push({ id, x: sx, y: Math.max(ingombro[1], Math.min(this.h - 1, y)) });
    return true;
  }

  /** Le cose posate cadono finché non trovano qualcosa su cui appoggiarsi (basta il centro). */
  private assestaCose(): void {
    for (const c of this.cose) {
      const centro = c.x + (INGOMBRO[c.id][0] >> 1);
      const terra = this.suolo(centro, c.y - 2);
      if (terra - 1 > c.y) c.y = Math.min(terra - 1, c.y + 2);
      else if (terra - 1 < c.y - 1) c.y--;
    }
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
    if (this.esplode[t] > 0.6) {
      this.esplodi(j % this.w, (j / this.w) | 0, 3 + Math.round(this.esplode[t] * 3));
      return;
    }
    let durata = 22 + ((this.caso() * 30) | 0);
    if (t === M.LEGNO) durata = 110 + ((this.caso() * 120) | 0);
    else if (t === M.CARBONE) durata = 180 + ((this.caso() * 70) | 0);
    else if (t >= PRIMA_MISCELA) durata = 30 + (this.sostanze[t]?.brucia ?? 0.5) * 150 * (0.6 + this.caso() * 0.4);
    this.metti(j, M.BRACE, Math.min(255, durata | 0));
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
      this.caduti.push({ x: o.x, y: o.y - 1 });
      return false;
    });
  }

  /** Fa nascere un germoglio: erba bassa, oppure (più di rado) un albero. */
  private germoglia(j: number, fertile: boolean): void {
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
    }
    if (this.tic % 4 === 0 && this.cose.length > 0) this.assestaCose();
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
          if ((sotto === M.FANGO || sotto === M.HUMUS || sotto === M.TERRA) && this.caso() < 0.002) {
            this.metti(i, M.PIANTA, ALBERO + 6 + ((this.caso() * 8) | 0));
            return;
          }
        }
        if (this.caso() < 0.0004) this.svuota(i);
        return;
      }

      case M.ACQUA: {
        const j = this.vicino(i, x, y);
        if (j >= 0) {
          const v = tipo[j];
          if (v === M.FUOCO) {
            this.metti(j, M.VAPORE);
            if (this.caso() < 0.5) {
              this.svuota(i);
              return;
            }
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
            // La lava fonde la pietra e ne tira fuori il metallo.
            if (this.caso() < 0.008) this.metti(j, M.METALLO);
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
          // Ciò che brucia soffocato, senz'aria sopra, non diventa cenere: diventa carbone.
          const sopra = y > 0 ? tipo[i - w] : M.ROCCIA;
          const soffocato = sopra !== M.VUOTO && this.stato[sopra] !== GAS;
          this.metti(i, soffocato && this.caso() < 0.5 ? M.CARBONE : this.caso() < 0.6 ? M.CENERE : M.FUMO);
          return;
        }
        dato[i]--;
        if (y > 0 && tipo[i - w] === M.VUOTO && this.caso() < 0.3) {
          this.metti(i - w, M.FUOCO, 8 + ((this.caso() * 10) | 0));
        }
        const j = this.vicino(i, x, y);
        if (j >= 0 && this.brucia[tipo[j]] && this.caso() < 0.08) this.accendi(j);
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
            if (this.caso() < 0.5) this.metti(j, M.NUVOLA);
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
        if (y < this.h * 0.16) {
          this.metti(i, M.NUVOLA);
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
        const quota = 2 + (this.tinta[i] % Math.max(1, (this.h * 0.13) | 0));
        if (y > quota) {
          if (tipo[i - w] === M.VUOTO && this.caso() < 0.5) {
            this.scambia(i, i - w);
            return;
          }
        }
        if (this.caso() < 0.0015 && y < this.h - 1 && tipo[i + w] === M.VUOTO) {
          this.metti(i + w, M.ACQUA);
          this.pioggia++;
          this.scopri(PIOGGIA, x, y + 1);
          if (dato[i] <= 1) {
            this.svuota(i);
            return;
          }
          dato[i]--;
        }
        if (
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
        if (tipo[j] !== M.VUOTO) {
          dato[i] = 0;
          return;
        }
        this.metti(j, M.PIANTA, resto > 0 ? ALBERO + resto : 0);
        this.metti(i, M.LEGNO);
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
   */
  private aggiornaMiscela(i: number, x: number, y: number, t: number): void {
    const { tipo, dato, w } = this;
    const stato = this.stato[t];
    const j = this.vicino(i, x, y);
    if (j >= 0) {
      const v = tipo[j];
      const calore = this.calore[t];
      if (calore > 0.5) {
        if (this.brucia[v]) {
          if (this.caso() < 0.3) this.accendi(j);
        } else if (v === M.ACQUA) {
          if (this.caso() < 0.2) this.metti(j, M.VAPORE);
        } else if (v === M.NEVE || v === M.GHIACCIO) this.metti(j, M.ACQUA);
      } else if (calore < -0.5) {
        if (v === M.ACQUA) {
          if (this.caso() < 0.03) this.metti(j, M.GHIACCIO);
        } else if (v === M.FUOCO) this.svuota(j);
        else if (v === M.LAVA && this.caso() < 0.1) this.metti(j, M.PIETRA);
      }
      if (this.veleno[t] > 0.55 && (v === M.PIANTA || v === M.ALGA || v === M.MUSCHIO || v === M.FUNGO) && this.caso() < 0.1) {
        this.svuota(j);
      }
      if (this.corrode[t] > 0.6 && v !== t && !RESISTE[v] && (this.stato[v] === POLVERE || this.stato[v] === SOLIDO) && this.caso() < 0.04) {
        this.svuota(j);
        if (this.caso() < 0.5) {
          this.svuota(i);
          return;
        }
      }
      if (stato !== GAS && this.vivo[t] > 0.6 && dato[i] < 12 && this.caso() < 0.004) {
        // Si allarga come una cosa viva: sulla terra che tocca, o sul vuoto che ha qualcosa sotto su cui posarsi.
        if (v === M.TERRA || v === M.FANGO || v === M.HUMUS) this.metti(j, t, dato[i] + 1);
        else if (v === M.VUOTO && j + w < tipo.length && tipo[j + w] !== M.VUOTO && this.stato[tipo[j + w]] !== GAS) {
          this.metti(j, t, dato[i] + 1);
        }
      }
    }
    if (stato === POLVERE) {
      if (this.muoviPolvere(i, x, y, this.scorre[t], t)) return;
    } else if (stato === LIQUIDO) {
      if (this.caso() < 0.3 + 0.7 * this.scorre[t]) this.muoviLiquido(i, x, y, 1 + Math.round(this.scorre[t] * 4), t);
      return;
    } else if (stato === GAS) {
      if (dato[i] <= 1) {
        this.svuota(i);
        return;
      }
      dato[i]--;
      this.muoviGas(i, x, y, 0.75 - this.peso[t] * 4);
      return;
    }
    // Su una miscela fertile, come sul terriccio, spuntano le piante.
    if (this.fertile[t] > 0.6 && y > 1 && tipo[i - w] === M.VUOTO && tipo[i - 2 * w] === M.VUOTO && this.caso() < 0.0005) {
      this.germoglia(i - w, true);
    }
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
   * Il Mestolo: dove passa, due cose diverse che si toccano si fondono. Se la coppia ha già un suo risultato
   * (terra e acqua fanno fango) succede quello; altrimenti nasce una miscela nuova, che nessuno ha scritto.
   * `nati` raccoglie ciò che nasce durante lo stesso gesto: non si rimescola finché il dito non si alza,
   * altrimenti una sola passata fonderebbe tutto con tutto. E in un gesto nasce al più una miscela mai vista.
   */
  mescola(x: number, y: number, raggio: number, nati: Set<number>): void {
    const { tipo, w } = this;
    for (let dy = -raggio; dy <= raggio; dy++) {
      for (let dx = -raggio; dx <= raggio; dx++) {
        if (dx * dx + dy * dy > raggio * raggio || !this.dentro(x + dx, y + dy)) continue;
        const cx = x + dx;
        const cy = y + dy;
        const i = cy * w + cx;
        const a = tipo[i];
        if (NON_SI_MESCOLA[a] || nati.has(a) || this.caso() < 0.5) continue;
        const j = this.vicino(i, cx, cy);
        if (j < 0) continue;
        const b = tipo[j];
        if (b === a || NON_SI_MESCOLA[b] || nati.has(b)) continue;
        const nota = DEL_MESTOLO.get(a * 256 + b);
        if (nota) {
          this.trasforma(i, nota[0], nati);
          this.trasforma(j, nota[1], nati);
          continue;
        }
        // Una sola miscela mai vista per gesto: ogni scoperta merita il suo momento.
        const idA = Math.min(this.idTipo[a], this.idTipo[b]);
        const idB = Math.max(this.idTipo[a], this.idTipo[b]);
        const nuova = !this.visti.has(idMiscela(idA, idB));
        if (nuova && nati.has(UNA_NUOVA)) continue;
        const id = this.registra(idA, idB);
        const t = id < 0 ? -1 : this.tipoPer(id);
        if (t < 0) continue;
        if (nuova) nati.add(UNA_NUOVA);
        nati.add(t);
        this.metti(i, t);
        this.metti(j, t);
      }
    }
  }

  private trasforma(i: number, esito: number, nati: Set<number>): void {
    if (esito === RESTA) return;
    if (esito === ACCENDI) {
      this.accendi(i);
      return;
    }
    nati.add(esito);
    this.metti(i, esito);
  }

  /** La gomma: toglie tutto quello che trova nel cerchio, omini compresi. */
  cancella(x: number, y: number, raggio: number): void {
    for (let dy = -raggio; dy <= raggio; dy++) {
      for (let dx = -raggio; dx <= raggio; dx++) {
        if (dx * dx + dy * dy > raggio * raggio || !this.dentro(x + dx, y + dy)) continue;
        this.svuota((y + dy) * this.w + x + dx);
      }
    }
    this.cose = this.cose.filter((c) => {
      const [lw, lh] = INGOMBRO[c.id];
      return !(x >= c.x - raggio && x < c.x + lw + raggio && y <= c.y + raggio && y > c.y - lh - raggio);
    });
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
