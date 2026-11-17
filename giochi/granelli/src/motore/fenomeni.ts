import {
  ALBA,
  ARCOBALENO,
  DESERTO,
  ERUZIONE,
  FORESTA,
  GHIACCIAIO,
  INCENDIO,
  LAGO,
  LUCCIOLE,
  M,
  NEVICATA,
  NOTTE,
} from './materiali.js';
import type { Mondo } from './mondo.js';
import { luceDelGiorno } from './tempo.js';

/** Quante celle di un materiale servono perché il mondo "abbia" un certo paesaggio. */
const PAESAGGI: readonly (readonly [number, number, number])[] = [
  [LAGO, M.ACQUA, 700],
  [FORESTA, M.LEGNO, 120],
  [DESERTO, M.SABBIA, 1500],
  [INCENDIO, M.BRACE, 50],
  [ERUZIONE, M.LAVA, 350],
  [GHIACCIAIO, M.GHIACCIO, 300],
  [NEVICATA, M.NEVE, 300],
];

/**
 * I fenomeni non sono materiali: sono cose che succedono quando il mondo arriva a un certo punto
 * (abbastanza acqua da fare un lago, la prima notte, la pioggia col sole). Si guarda ogni due secondi circa.
 */
export function fenomeni(m: Mondo): void {
  const cx = m.w >> 1;
  const alto = (m.h * 0.2) | 0;
  for (const [id, materiale, soglia] of PAESAGGI) {
    if (m.conta[materiale] >= soglia) m.scopri(id, cx, m.h >> 1);
  }
  const luce = luceDelGiorno(m.tic);
  if (luce < 0.08) {
    m.scopri(NOTTE, cx, alto);
    if (m.conta[M.PIANTA] >= 40) m.scopri(LUCCIOLE, cx, m.h >> 1);
  } else if (luce > 0.92 && m.visti.has(NOTTE)) m.scopri(ALBA, cx, alto);

  // L'arcobaleno: piove, ma c'è il sole.
  m.arcobaleno = Math.min(1, m.pioggia / 30) * Math.max(0, (luce - 0.6) / 0.4);
  if (m.arcobaleno > 0.5) m.scopri(ARCOBALENO, cx, alto);
  m.pioggia *= 0.85;
}
