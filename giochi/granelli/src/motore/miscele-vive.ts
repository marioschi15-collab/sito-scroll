import { FIORE, GAS, LIQUIDO, M, N_TIPI, POLVERE, PRIMA_MISCELA, RESISTE, SOLIDO, type Sostanza } from './materiali.js';
import { SOGLIA, tratti } from './miscele.js';
import type { Mondo } from './mondo.js';

/**
 * Come si comporta una miscela nel mondo: non ha regole scritte apposta, segue il suo carattere. Se scotta accende
 * e fa evaporare, se è gelida ghiaccia, se è viva si allarga, se corrode mangia quello che tocca; e con i caratteri
 * nuovi vola, si attacca, fa fiorire, tinge l'acqua, fa presa o si fa nuvola. Le soglie sono quelle delle etichette
 * del Libro: ciò che l'etichetta promette, qui succede. Due miscele dal carattere opposto reagiscono da sole.
 */

/** I caratteri nuovi, uno per bit nel `doti` del Mondo: si leggono con un'operazione sola. */
export const VOLA = 1;
export const APPICCICA = 2;
export const FIORISCE = 4;
export const TINGE = 8;
export const INDURISCE = 16;
export const PIOVE = 32;

/** I bit dei caratteri nuovi che una sostanza mostra davvero (gli stessi delle etichette). */
export function dotiDi(s: Sostanza): number {
  let d = 0;
  for (const c of tratti(s)) {
    if (c === 'vola') d |= VOLA;
    else if (c === 'appiccica') d |= APPICCICA;
    else if (c === 'fiorisce') d |= FIORISCE;
    else if (c === 'tinge') d |= TINGE;
    else if (c === 'indurisce') d |= INDURISCE;
    else if (c === 'piove') d |= PIOVE;
  }
  return d;
}

/**
 * Una miscela che si allarga (viva, o che tinge l'acqua) lo fa a catena, e la catena è corta. Ogni cella porta
 * un'età (nel suo `dato`): ogni volta che prova ad allargarsi invecchia di uno; se ci riesce figlia una volta sola e
 * poi resta com'è, e la figlia nasce con l'età della madre più uno. Arrivata a questa età una cella non ci prova
 * più: da un granello versato ne nascono al più altrettanti, e dopo qualche minuto tutto è fermo, anche se la
 * miscela è un liquido che scorrendo troverebbe sempre posto nuovo.
 */
export const STERILE = 8;

/** Il suolo su cui una cosa viva può allargarsi e una miscela fertile può far spuntare un germoglio. */
const SUOLO = new Uint8Array(N_TIPI);
for (const t of [M.TERRA, M.FANGO, M.HUMUS]) SUOLO[t] = 1;

/** Ciò su cui una miscela che fa presa fa presa: diventa pietra. */
const FA_PRESA = new Uint8Array(N_TIPI);
for (const t of [M.TERRA, M.SABBIA, M.FANGO, M.HUMUS, M.CENERE, M.ARGILLA]) FA_PRESA[t] = 1;

const { calore: CALDO, veleno: VELENO, corrode: CORRODE, vivo: VIVO, fertile: FERTILE } = SOGLIA;

/**
 * Vero se una miscela fa qualcosa a chi le sta accanto: scotta o gela, avvelena, corrode, si allarga, fa fiorire,
 * tinge o fa presa. Le altre (che fanno luce, nutrono, bruciano se accese, fanno da terreno) non guardano i vicini:
 * in un mondo pieno di miscele ferme, saltare quel tiro di dado è un bel risparmio.
 */
export function agisce(s: Sostanza, doti: number): boolean {
  return (
    Math.abs(s.calore) > SOGLIA.calore ||
    s.veleno > SOGLIA.veleno ||
    s.corrode > SOGLIA.corrode ||
    (s.stato !== GAS && s.vivo > SOGLIA.vivo) ||
    (doti & (FIORISCE | TINGE | INDURISCE)) !== 0
  );
}

export function aggiornaMiscela(m: Mondo, i: number, x: number, y: number, t: number): void {
  const { tipo, dato, w } = m;
  const stato = m.stato[t];
  const doti = m.doti[t];
  const j = m.agisce[t] ? m.vicino(i, x, y) : -1;
  if (j >= 0) {
    const v = tipo[j];
    const calore = m.calore[t];
    if (calore > CALDO) {
      // Accende quello che tocca (non sé stessa: una miscela rovente che brucia o esplode aspetta una fiamma vera).
      // Anche un'altra miscela esplosiva: calda contro esplosiva fa il botto.
      if (m.brucia[v]) {
        if (v !== t && m.caso() < 0.3) m.accendi(j);
      } else if (v === M.ACQUA) {
        if (m.caso() < 0.2) {
          m.metti(j, M.VAPORE);
          // Far bollire l'acqua costa: ogni tanto la miscela si spegne in uno sbuffo di fumo. Così nessuno
          // stagno bolle per sempre, e il temporale che ne nasce prima o poi finisce.
          if (m.caso() < 0.15) {
            m.metti(i, M.FUMO);
            return;
          }
        }
      } else if (v === M.NEVE || v === M.GHIACCIO) m.metti(j, M.ACQUA);
      else if (v >= PRIMA_MISCELA && m.calore[v] < -CALDO && m.caso() < 0.1) {
        // Calda contro gelida: quella gelida svapora in nebbia, una cella per una cella.
        m.metti(j, M.VAPORE);
        return;
      }
    } else if (calore < -CALDO) {
      if (v === M.ACQUA) {
        if (m.caso() < 0.03) m.metti(j, M.GHIACCIO);
      } else if (v === M.FUOCO) m.svuota(j);
      else if (v === M.LAVA && m.caso() < 0.1) m.metti(j, M.PIETRA);
    }
    if (m.veleno[t] > VELENO) {
      if ((v === M.PIANTA || v === M.ALGA || v === M.MUSCHIO || v === M.FUNGO) && m.caso() < 0.1) m.svuota(j);
      // Velenosa contro viva: quella viva muore, e resta un po' di cenere.
      else if (v >= PRIMA_MISCELA && v !== t && m.vivo[v] > VIVO && m.veleno[v] <= VELENO && m.caso() < 0.1) m.metti(j, M.CENERE);
    }
    if (m.corrode[t] > CORRODE && v !== t && !RESISTE[v] && (m.stato[v] === POLVERE || m.stato[v] === SOLIDO) && m.caso() < 0.04) {
      m.svuota(j);
      if (m.caso() < 0.5) {
        m.svuota(i);
        return;
      }
    }
    if (stato !== GAS && m.vivo[t] > VIVO && dato[i] < STERILE && m.caso() < 0.004) {
      // Si allarga come una cosa viva: sulla terra che tocca, o sul vuoto che ha qualcosa sotto su cui posarsi.
      // Chi ha figliato non figlia più, e chi ci prova a vuoto invecchia (vedi STERILE): la catena si ferma da sola.
      if (SUOLO[v] || (v === M.VUOTO && j + w < tipo.length && tipo[j + w] !== M.VUOTO && m.stato[tipo[j + w]] !== GAS)) {
        m.metti(j, t, dato[i] + 1);
        dato[i] = STERILE;
      } else dato[i]++;
    }
    if (doti !== 0 && conLeDoti(m, i, j, t, v, doti)) return;
  }
  if (doti & VOLA) {
    sali(m, i, x, y, t);
    return;
  }
  if (doti & APPICCICA && attaccata(m, i, x, y, t)) return;
  const fertile = m.fertile[t] > FERTILE;
  if (stato === POLVERE) {
    if (m.muoviPolvere(i, x, y, m.scorre[t], t)) return;
  } else if (stato === LIQUIDO) {
    if (fertile && germogliaSulSuolo(m, i, y)) return;
    if (m.caso() < 0.3 + 0.7 * m.scorre[t]) m.muoviLiquido(i, x, y, 1 + Math.round(m.scorre[t] * 4), t);
    return;
  } else if (stato === GAS) {
    if (dato[i] <= 1) {
      m.svuota(i);
      return;
    }
    dato[i]--;
    // Un gas che porta pioggia si fa nuvola: lassù quasi subito, più in basso ogni tanto. Una cella per una cella,
    // e la nuvola ha una goccia sola: l'acqua non nasce dal nulla.
    if (doti & PIOVE && m.caso() < (y <= m.fasciaNuvole + 6 ? 0.05 : 0.004)) {
      m.metti(i, M.NUVOLA, 1);
      return;
    }
    if (fertile && germogliaSulSuolo(m, i, y)) return;
    m.muoviGas(i, x, y, 0.75 - m.peso[t] * 4);
    return;
  }
  // Su una miscela fertile che sta ferma, come sul terriccio, spuntano le piante.
  if (fertile && y > 1 && tipo[i - w] === M.VUOTO && tipo[i - 2 * w] === M.VUOTO && m.caso() < 0.0005) {
    m.germoglia(i - w, true);
  }
}

/** Fa fiorire, tinge l'acqua o fa presa sulla cella vicina `j`. Vero se la miscela ha finito il suo turno. */
function conLeDoti(m: Mondo, i: number, j: number, t: number, v: number, doti: number): boolean {
  const { dato } = m;
  if (doti & FIORISCE && v === M.PIANTA && dato[j] === 0 && m.tinta[j] <= 238 && m.caso() < 0.03) {
    // Un fiore è un ciuffo d'erba con la tinta alta (vedi il pittore): sboccia lì, e la prima volta è una scoperta.
    m.tinta[j] = 239 + ((m.caso() * 17) | 0);
    m.scopri(FIORE, j % m.w, (j / m.w) | 0);
    return false;
  }
  if (doti & TINGE && v === M.ACQUA && dato[i] < STERILE && m.caso() < 0.02) {
    // Tinge l'acqua: la cella d'acqua prende il suo colore. Anche qui la catena è corta (vedi STERILE).
    m.metti(j, t, dato[i] + 1);
    dato[i] = STERILE;
    return true;
  }
  if (doti & INDURISCE && FA_PRESA[v] && m.caso() < 0.02) {
    // Fa presa: la terra diventa pietra, e una volta su due anche lei. Così non trasforma il mondo intero.
    m.metti(j, M.PIETRA);
    if (m.caso() < 0.5) {
      m.metti(i, M.PIETRA);
      return true;
    }
  }
  return false;
}

/**
 * Più leggera dell'aria: sale (anche attraverso l'acqua), scivola di lato sotto i soffitti, e arrivata all'altezza
 * delle nuvole resta lì sospesa, ondeggiando piano.
 */
function sali(m: Mondo, i: number, x: number, y: number, t: number): void {
  const { tipo, w } = m;
  if (y <= m.fasciaNuvole) {
    if (m.caso() < 0.04) {
      const d = m.caso() < 0.5 ? -1 : 1;
      if (x + d >= 0 && x + d < w && tipo[i + d] === M.VUOTO) m.sposta(i, i + d);
    }
    return;
  }
  const passa = (k: number): boolean => {
    const s = m.stato[tipo[k]];
    return s === 0 || s === GAS || (s === LIQUIDO && tipo[k] !== t && m.caso() < 0.5);
  };
  if (passa(i - w)) {
    m.sposta(i, i - w);
    return;
  }
  const d = m.caso() < 0.5 ? -1 : 1;
  for (let k = 0; k < 2; k++) {
    const dx = k === 0 ? d : -d;
    if (x + dx < 0 || x + dx >= w) continue;
    if (passa(i - w + dx) && m.caso() < 0.3 + 0.7 * m.scorre[t]) {
      m.sposta(i, i - w + dx);
      return;
    }
  }
  if (m.stato[t] === LIQUIDO && x + d >= 0 && x + d < w && tipo[i + d] === M.VUOTO && m.caso() < m.scorre[t]) m.sposta(i, i + d);
}

/** Appiccicosa: resta dov'è se tocca una parete, un soffitto o il suolo (polvere o solido che non sia lei stessa). */
function attaccata(m: Mondo, i: number, x: number, y: number, t: number): boolean {
  const { tipo, w, h } = m;
  if (x === 0 || x === w - 1 || y === 0) return true;
  const presa = (k: number): boolean => {
    const v = tipo[k];
    const s = m.stato[v];
    return v !== t && (s === SOLIDO || s === POLVERE);
  };
  return presa(i - w) || presa(i - 1) || presa(i + 1) || (y < h - 1 && presa(i + w));
}

/**
 * Una miscela fertile che scorre o che vola non fa da terreno: bagna (o sfiora) la terra che ha sotto e, a cielo
 * aperto, ci lascia un germoglio al proprio posto. Vero se è successo.
 */
function germogliaSulSuolo(m: Mondo, i: number, y: number): boolean {
  const { tipo, w } = m;
  // A cielo aperto: sopra c'è il vuoto, o un altro sbuffo di gas (un gas fertile versato arriva a nuvole fitte).
  if (y < 1 || y >= m.h - 1 || !SUOLO[tipo[i + w]] || (tipo[i - w] !== M.VUOTO && m.stato[tipo[i - w]] !== GAS) || m.caso() >= 0.002) return false;
  m.germoglia(i, true);
  return true;
}
