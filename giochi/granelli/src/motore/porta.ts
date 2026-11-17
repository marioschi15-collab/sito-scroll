import { primiOmini } from './arrivi.js';
import { type Bersaglio, cheCosaCe } from './bersaglio.js';
import { ALTEZZA, posto } from './cammino.js';
import { INGOMBRO } from './cose.js';
import { REAZIONI, esitoDi } from './esiti.js';
import { M, N_BASE, OMINO, PRIMA_ID_MISCELA, TRONCO } from './materiali.js';
import type { Mondo } from './mondo.js';
import type { Divieto } from './posa.js';
import { ACCENDI, RESTA } from './ricette.js';

/** Da dove arriva la cosa portata: un gettone della tavolozza, oppure una cosa del mondo tenuta con la Mano. */
export type Provenienza = 'gettone' | 'mondo';

/**
 * Perché una cosa non si è messa lì: i divieti della posa, oppure `soloSopra` (si porta solo sopra un'altra cosa:
 * un utensile, la scrittura), `pieno` (non c'è posto per versarla), `troppi` (gli omini sono già tanti), `acqua`
 * (i primi omini chiamati da un'unione arrivano solo vicino all'acqua, e lì intorno non ce n'è).
 */
export type PercheNo = Divieto | 'soloSopra' | 'pieno' | 'troppi' | 'acqua';

/** Quello che è successo portando una cosa sopra un punto del mondo: la pagina lo racconta. */
export type EsitoPorta =
  /**
   * È nato qualcosa: `nuova` se è una scoperta mai vista; `posata` se è una costruzione che è nata nel mondo, in
   * (x, y); `pieno` se è una miscela per cui il mondo non ha più posto (resta una scoperta, senza celle).
   */
  | { genere: 'unione'; nato: number; nuova: boolean; con: number; x: number; y: number; posata: boolean; pieno?: true }
  /** Un'invenzione già scoperta: non nasce una seconda volta da sola. */
  | { genere: 'giaFatta'; nato: number; con: number }
  /** La cosa portata si è messa lì: versata, posata, nata. */
  | { genere: 'messa'; x: number; y: number }
  /** La via di un fenomeno: la cosa è stata messa lì, e il fenomeno va guardato nel mondo. */
  | { genere: 'nelMondo'; con: number; fenomeno: number }
  /** Le due cose non si uniscono (`perOra` se diventeranno una miscela quando il Libro sarà più pieno). */
  | { genere: 'niente'; con: number; perOra?: true }
  | { genere: 'nonQui'; perche: PercheNo }
  /** Una cosa del mondo riportata sul vuoto, sul terreno o su una sua uguale: torna dov'era, niente copie. */
  | { genere: 'torna' };

/** Quanto è larga una manciata (raggio in celle). */
const MANCIATA = 3;
/** Di quante celle, al più, si sale a cercare posto quando il punto è già pieno. */
const PIU_SU = 12;
/** Quante celle libere vuole una manciata per cadere in un punto (su 29 del cerchio). */
const LIBERE = 10;
/** Quante coppie di celle, al più, reagiscono in un gesto. */
const COPPIE_MAX = 30;
/** Quante celle versa, al più, il gettone attorno al bersaglio. */
const VERSATE_MAX = 12;
/** Fin dove si cerca un posto per una costruzione nata da un'unione (colonne dal punto). */
const ACCANTO = 12;
/** Fin dove si cerca la riva a cui far arrivare i primi omini chiamati da un'unione (colonne dal punto). */
const VERSO_L_ACQUA = 30;

const FIAMME = new Set<number>([M.FUOCO, M.LAVA, M.FULMINE]);

/** Ciò che si posa o nasce nel mondo: portato su un materiale non lo unisce, ci si mette sopra (il terreno non è un bersaglio). */
const siPosaONasce = (id: number): boolean => INGOMBRO[id] !== undefined || id === OMINO;

const nonQui = (perche: PercheNo): EsitoPorta => ({ genere: 'nonQui', perche });

/** Quante celle vuote ci sono nel cerchio di una manciata attorno a (x, y). */
function libere(m: Mondo, x: number, y: number): number {
  let n = 0;
  for (let dy = -MANCIATA; dy <= MANCIATA; dy++) {
    for (let dx = -MANCIATA; dx <= MANCIATA; dx++) {
      if (dx * dx + dy * dy <= MANCIATA * MANCIATA && m.dentro(x + dx, y + dy) && m.tipo[(y + dy) * m.w + x + dx] === M.VUOTO) n++;
    }
  }
  return n;
}

/** Mette lì la cosa portata: versa una manciata, posa una costruzione, fa nascere un omino o cadere un fulmine. */
function metti(m: Mondo, id: number, x: number, y: number): EsitoPorta {
  if (INGOMBRO[id]) {
    const dove = m.puoPosare(id, x, y);
    if (!dove.si) return nonQui(dove.perche);
    m.posa(id, x, y);
    return { genere: 'messa', x: dove.x + (INGOMBRO[id][0] >> 1), y: dove.y };
  }
  if (id === OMINO) {
    if (!m.dentro(x, 0)) return nonQui('pieno');
    // Nel terreno non si nasce: si sale fino al primo posto dove un omino sta in piedi (poi cade da sé).
    let piedi = Math.min(m.h - 1, y);
    while (piedi > ALTEZZA && !posto(m, x, piedi)) piedi--;
    const prima = m.omini.length;
    m.aggiungiOmino(x, piedi);
    return m.omini.length > prima ? { genere: 'messa', x, y: piedi } : nonQui('troppi');
  }
  if (id === M.FULMINE) {
    m.fulmine(x, Math.max(0, y - PIU_SU));
    return { genere: 'messa', x, y };
  }
  const t = m.tipoPer(id);
  if (t < 0) return nonQui(id >= PRIMA_ID_MISCELA ? 'pieno' : 'soloSopra');
  for (let su = 0; su <= PIU_SU && y - su >= 0; su++) {
    if (libere(m, x, y - su) < LIBERE) continue;
    m.versa(x, y - su, MANCIATA, t);
    return { genere: 'messa', x, y: y - su };
  }
  return nonQui('pieno');
}

/**
 * Versa il gettone (un materiale, già col suo tipo di cella `ta`) a contatto con la materia del bersaglio: nelle
 * celle vuote vicine che toccano una sua cella, al più 12. Restituisce le celle versate.
 */
function versaAccanto(m: Mondo, ta: number, b: Bersaglio): number[] {
  const { w, tipo } = m;
  const tb = tipo[b.y * w + b.x];
  const versate: number[] = [];
  const r = MANCIATA + 1;
  for (let dy = -r; dy <= r && versate.length < VERSATE_MAX; dy++) {
    for (let dx = -r; dx <= r && versate.length < VERSATE_MAX; dx++) {
      const x = b.x + dx;
      const y = b.y + dy;
      if (dx * dx + dy * dy > r * r || x < 1 || x >= w - 1 || y < 1 || y >= m.h - 1) continue;
      const i = y * w + x;
      if (tipo[i] !== M.VUOTO) continue;
      if (tipo[i - 1] === tb || tipo[i + 1] === tb || tipo[i - w] === tb || tipo[i + w] === tb) versate.push(i);
    }
  }
  for (const i of versate) m.metti(i, ta);
  return versate;
}

/** Il tipo di cella del gettone, se è un materiale che si versa a contatto col bersaglio; -1 altrimenti. */
function daVersare(m: Mondo, id: number, b: Bersaglio): number {
  return id > 0 && id < N_BASE && b.genere === 'materia' ? m.tipoPer(id) : -1;
}

/**
 * Il gettone (un materiale) versato a contatto con la materia del bersaglio, e la reazione tra le due fatta subito,
 * senza tirare dadi: ogni cella versata che tocca una cella del bersaglio cambia come dice REAZIONI (al più 30
 * coppie). Il fuoco accende solo se il gettone è una fiamma. `soloSeResta`: la reazione si fa solo se il bersaglio
 * resta com'è e niente prende fuoco (per le invenzioni: l'unione non distrugge quello su cui si è portato il
 * gettone, e per bruciare si versa). Vero se qualcosa ha reagito.
 */
function reagisci(m: Mondo, id: number, b: Bersaglio, soloSeResta: boolean): boolean {
  const ta = daVersare(m, id, b);
  if (ta < 0) return false;
  const { w, tipo } = m;
  const tb = tipo[b.y * w + b.x];
  const reazione = REAZIONI.get(ta * 256 + tb);
  if (!reazione) return false;
  const [ra, rb] = reazione;
  if (soloSeResta && (rb !== RESTA || ra === ACCENDI)) return false;
  const fiamma = FIAMME.has(id);
  let coppie = 0;
  for (const i of versaAccanto(m, ta, b)) {
    for (const j of [i - w, i + w, i - 1, i + 1]) {
      if (coppie >= COPPIE_MAX) return true;
      if (tipo[i] !== ta || tipo[j] !== tb) continue;
      coppie++;
      if (ra !== ACCENDI || fiamma) m.trasforma(i, ra);
      if (rb !== ACCENDI || fiamma) m.trasforma(j, rb);
    }
  }
  return coppie > 0;
}

/**
 * Quando nessuna cella ha potuto reagire (il bersaglio è chiuso da tutte le parti), le celle del bersaglio più
 * vicine diventano direttamente la cosa nata: chi ha unito deve vederla nel mondo.
 */
function diventa(m: Mondo, b: Bersaglio, nato: number, quante: number): void {
  if (b.genere !== 'materia') return;
  const t = m.tipoPer(nato);
  if (t < 0) return;
  const tb = m.tipo[b.y * m.w + b.x];
  let fatte = 0;
  for (let r = 0; r <= 2 && fatte < quante; r++) {
    for (let dy = -r; dy <= r && fatte < quante; dy++) {
      for (let dx = -r; dx <= r && fatte < quante; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !m.dentro(b.x + dx, b.y + dy)) continue;
        const i = (b.y + dy) * m.w + b.x + dx;
        if (m.tipo[i] !== tb) continue;
        m.trasforma(i, t);
        fatte++;
      }
    }
  }
}

/**
 * Le colonne che una costruzione nata da un'unione non deve coprire: quelle del bersaglio (per un albero, tre celle
 * per parte attorno al tronco), così posandola non si toglie la cosa su cui si è portato il gettone.
 */
function zona(m: Mondo, b: Bersaglio): [number, number] {
  if (b.genere === 'cosa') return [b.rif.x, b.rif.x + INGOMBRO[b.rif.id][0] - 1];
  if (b.genere === 'omino') return [b.x, b.x];
  let z0 = b.x - 3;
  let z1 = b.x + 3;
  for (let x = Math.max(0, b.x - 3); x <= Math.min(m.w - 1, b.x + 3); x++) {
    for (let y = Math.max(0, b.y - 8); y <= Math.min(m.h - 1, b.y + 8); y++) {
      const i = y * m.w + x;
      if (m.tipo[i] !== M.LEGNO || m.dato[i] !== TRONCO) continue;
      z0 = Math.min(z0, x - 3);
      z1 = Math.max(z1, x + 3);
      break;
    }
  }
  return [z0, z1];
}

/** Posa la costruzione appena nata nel posto libero più vicino al punto, senza coprire il bersaglio; null se non c'è posto. */
function posaAccanto(m: Mondo, id: number, b: Bersaglio, x: number, y: number): { x: number; y: number } | null {
  const lw = INGOMBRO[id][0];
  const [z0, z1] = zona(m, b);
  for (let d = (lw >> 1) + 1; d <= ACCANTO; d++) {
    for (const lato of [1, -1]) {
      const dove = m.puoPosare(id, x + lato * d, y);
      if (!dove.si || (dove.x <= z1 && dove.x + lw - 1 >= z0)) continue;
      m.posa(id, x + lato * d, y);
      return { x: dove.x + (lw >> 1), y: dove.y };
    }
  }
  return null;
}

/**
 * L'unione che chiama gli omini (un tetto e un frutto). Finché nel mondo non ce n'è nessuno ne arrivano due, vicino
 * all'acqua più vicina al punto, anche se l'Omino è già nel Libro: è la via dei primi omini, e deve funzionare
 * anche per chi li ha persi. L'Omino si scopre comunque; se lì intorno non c'è acqua, l'esito dice che arriveranno
 * vicino all'acqua. Con gli omini già nel mondo è un'unione come le altre: già nota, non ne fa arrivare altri.
 */
function chiamaGliOmini(m: Mondo, con: number, x: number, y: number, nuova: boolean): EsitoPorta {
  if (m.omini.length > 0) {
    if (!nuova) return { genere: 'giaFatta', nato: OMINO, con };
    m.scopri(OMINO, x, y);
    return { genere: 'unione', nato: OMINO, nuova, con, x, y, posata: false };
  }
  const dove = primiOmini(m, x, VERSO_L_ACQUA);
  m.scopri(OMINO, x, y);
  if (!dove) return nonQui('acqua');
  return { genere: 'unione', nato: OMINO, nuova, con, x: dove.x, y: dove.y - 1, posata: true };
}

/**
 * Porta la scoperta `id` sopra il punto (x, y) del mondo. Le regole, nell'ordine:
 * a) una cosa del mondo (tenuta con la Mano) riportata sul vuoto, sul terreno o su una sua uguale torna dov'era;
 * b) sul vuoto, su un appoggio o su una cosa uguale la cosa si mette lì (versata, posata, nata);
 * c) una cosa che si posa o nasce (costruzione, omino) portata su un materiale ci si mette sopra: non lo unisce;
 * d) altrimenti decide `esitoDi`, come in Unisci: invenzione nuova (nasce accanto, se si posa), invenzione già
 *    fatta, i primi omini (arrivano in due vicino all'acqua), reazione del mondo (le celle cambiano davvero), via di un fenomeno (la cosa si mette lì e si guarda),
 *    miscela (dalla dodicesima voce del Libro), niente. Le coppie provate in (d) si ricordano, tranne i fenomeni
 *    e le miscele che aspettano il Libro più pieno.
 * La cosa su cui si porta il gettone non viene mai tolta.
 */
export function porta(m: Mondo, id: number, x: number, y: number, da: Provenienza): EsitoPorta {
  const b = cheCosaCe(m, x, y);
  const sulVuoto = b.genere === 'vuoto' || b.genere === 'appoggio' || b.id === id;
  const sulTerreno = b.genere === 'materia' && siPosaONasce(id);
  if (da === 'mondo' && (sulVuoto || sulTerreno)) return { genere: 'torna' };
  if (sulVuoto || sulTerreno) return metti(m, id, x, y);

  const esito = esitoDi(id, b.id, m.voci());
  if (esito.genere === 'fenomeno') {
    // A contatto, perché succeda davvero: la polvere nera deve toccare la fiamma.
    const ta = daVersare(m, id, b);
    if (ta < 0 || versaAccanto(m, ta, b).length === 0) metti(m, id, x, y);
    return { genere: 'nelMondo', con: b.id, fenomeno: esito.id };
  }
  if (esito.genere === 'niente') {
    if (!esito.perOra) m.ricordaProvata(id, b.id);
    return esito.perOra ? { genere: 'niente', con: b.id, perOra: true } : { genere: 'niente', con: b.id };
  }
  m.ricordaProvata(id, b.id);
  const nuova = !m.visti.has(esito.id);

  if (esito.genere === 'unione') {
    if (esito.id === OMINO) return chiamaGliOmini(m, b.id, x, y, nuova);
    if (!nuova) return { genere: 'giaFatta', nato: esito.id, con: b.id };
    m.scopri(esito.id, x, y);
    // Se la coppia è anche una reazione del mondo (pietra e acqua) succede pure quella, se non brucia e non distrugge.
    reagisci(m, id, b, true);
    const posata = INGOMBRO[esito.id] ? posaAccanto(m, esito.id, b, x, y) : null;
    return { genere: 'unione', nato: esito.id, nuova, con: b.id, x: posata?.x ?? x, y: posata?.y ?? y, posata: posata !== null };
  }

  if (esito.genere === 'materia') {
    if (!reagisci(m, id, b, false)) diventa(m, b, esito.id, 6);
    m.scopri(esito.id, x, y);
    return { genere: 'unione', nato: esito.id, nuova, con: b.id, x, y, posata: false };
  }

  // Una miscela: una manciata di celle del bersaglio diventa lei. Se il mondo non ha più posto, resta una scoperta.
  const miscela = m.registra(id, b.id);
  if (miscela < 0) return { genere: 'niente', con: b.id };
  const t = m.tipoPer(miscela);
  m.scopri(miscela, x, y);
  if (t < 0) return { genere: 'unione', nato: miscela, nuova, con: b.id, x, y, posata: false, pieno: true };
  diventa(m, b, miscela, VERSATE_MAX);
  return { genere: 'unione', nato: miscela, nuova, con: b.id, x, y, posata: false };
}
