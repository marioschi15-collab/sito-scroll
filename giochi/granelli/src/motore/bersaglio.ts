import { ALTEZZA } from './cammino.js';
import { type Cosa, INGOMBRO } from './cose.js';
import { GAS, NASCOSTO, NULLA, OMINO } from './materiali.js';
import type { Mondo } from './mondo.js';
import type { Omino } from './omini.js';

/**
 * Che cosa c'è in un punto del mondo, per chi ci porta sopra un'altra cosa: un omino, una cosa posata, un
 * materiale (con il numero della scoperta che chi gioca conosce: le miscele con il loro numero grande), oppure
 * solo terreno che non è una scoperta (la roccia nuda, la brace: lì ci si appoggia e basta), oppure il vuoto.
 * (x, y) è la cella del bersaglio: per la materia quella trovata, che può essere accanto al punto.
 */
export type Bersaglio =
  | { genere: 'omino'; id: number; x: number; y: number; rif: Omino }
  | { genere: 'cosa'; id: number; x: number; y: number; rif: Cosa }
  | { genere: 'materia'; id: number; x: number; y: number }
  | { genere: 'appoggio'; id: -1; x: number; y: number }
  | { genere: 'vuoto'; id: -1; x: number; y: number };

/** Entro quante celle dal punto un omino vince su tutto: il dito è proprio sul suo corpo. */
const SUL_CORPO = 2;
/** Entro quante celle dal punto un omino è il bersaglio, se lì non c'è una cosa posata. */
const VICINO = 6;
/** Entro quante celle si cerca la materia, quando il punto cade proprio accanto. */
const INTORNO = 3;

/** Il quadrato della distanza tra il punto e il corpo di un omino (alto tre celle, dai piedi alla testa). */
function distanzaDalCorpo(o: Omino, x: number, y: number): number {
  const dx = x - o.x;
  const testa = o.y - ALTEZZA + 1;
  const dy = y < testa ? testa - y : y > o.y ? y - o.y : 0;
  return dx * dx + dy * dy;
}

/** L'omino visibile (non chiuso in casa a dormire) col corpo più vicino al punto, entro `raggio` celle; null se non c'è. */
function ominoVicino(m: Mondo, x: number, y: number, raggio: number): Omino | null {
  let migliore: Omino | null = null;
  let dMin = raggio * raggio;
  for (const o of m.omini) {
    if (o.dentro) continue;
    const d = distanzaDalCorpo(o, x, y);
    if (d <= dMin) {
      dMin = d;
      migliore = o;
    }
  }
  return migliore;
}

/** La cosa posata il cui ingombro contiene il punto, o gli passa a una cella; null se non c'è. */
function cosaSotto(m: Mondo, x: number, y: number): Cosa | null {
  for (const c of m.cose) {
    const [lw, lh] = INGOMBRO[c.id];
    if (x >= c.x - 1 && x <= c.x + lw && y >= c.y - lh && y <= c.y + 1) return c;
  }
  return null;
}

/** La scoperta che una cella rappresenta, se è materia su cui portare qualcosa; -1 se è roccia, brace, vuoto. */
function materiaDi(m: Mondo, i: number): number {
  const t = m.tipo[i];
  if (NASCOSTO[t]) return -1;
  // Il tronco di un albero è legno e la chioma è pianta: la cella lo dice già da sé.
  return m.idTipo[t] > 0 ? m.idTipo[t] : -1;
}

/**
 * Che cosa c'è qui, nell'ordine: (1) un omino col corpo entro 2 celle dal punto; (2) una cosa posata che contiene
 * il punto (o gli passa a una cella); (3) un omino entro 6 celle; (4) la materia della cella, o la più vicina entro
 * 3 celle (gas e fiamme contano solo se il punto è proprio su di loro); (5) appoggio, se intorno c'è soltanto
 * terreno che non è una scoperta; (6) il vuoto. Gli omini che dormono in casa non si vedono e non sono bersagli.
 */
export function cheCosaCe(m: Mondo, px: number, py: number): Bersaglio {
  // Il punto può arrivare con la virgola (dal dito): conta la cella che lo contiene, se no gli indici non tornano.
  const x = Math.floor(px);
  const y = Math.floor(py);
  const sulCorpo = ominoVicino(m, x, y, SUL_CORPO);
  if (sulCorpo) return { genere: 'omino', id: OMINO, x: sulCorpo.x, y: sulCorpo.y, rif: sulCorpo };
  const cosa = cosaSotto(m, x, y);
  if (cosa) return { genere: 'cosa', id: cosa.id, x, y, rif: cosa };
  const vicino = ominoVicino(m, x, y, VICINO);
  if (vicino) return { genere: 'omino', id: OMINO, x: vicino.x, y: vicino.y, rif: vicino };

  if (m.dentro(x, y)) {
    const qui = materiaDi(m, y * m.w + x);
    if (qui > 0) return { genere: 'materia', id: qui, x, y };
  }
  let dMin = INTORNO * INTORNO + 1;
  let bx = -1;
  let by = -1;
  let id = -1;
  let terreno = false;
  for (let dy = -INTORNO; dy <= INTORNO; dy++) {
    for (let dx = -INTORNO; dx <= INTORNO; dx++) {
      const d = dx * dx + dy * dy;
      if (d > INTORNO * INTORNO || !m.dentro(x + dx, y + dy)) continue;
      const i = (y + dy) * m.w + x + dx;
      const stato = m.stato[m.tipo[i]];
      if (stato === NULLA || stato === GAS) continue;
      const qui = materiaDi(m, i);
      if (qui < 0) {
        terreno = true;
        continue;
      }
      if (d < dMin) {
        dMin = d;
        bx = x + dx;
        by = y + dy;
        id = qui;
      }
    }
  }
  if (id > 0) return { genere: 'materia', id, x: bx, y: by };
  return { genere: terreno || !m.dentro(x, y) ? 'appoggio' : 'vuoto', id: -1, x, y };
}
