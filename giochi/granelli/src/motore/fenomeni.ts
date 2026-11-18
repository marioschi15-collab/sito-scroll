import { paesaggi } from '../contenuti/registro.js';
import { ALBA, ARCOBALENO, LUCCIOLE, M, NOTTE } from './materiali.js';
import type { Mondo } from './mondo.js';
import { luceDelGiorno } from './tempo.js';

/**
 * I fenomeni non sono materiali: sono cose che succedono quando il mondo arriva a un certo punto
 * (abbastanza acqua da fare un lago, la prima notte, la pioggia col sole). Si guarda ogni due secondi circa.
 */
export function fenomeni(m: Mondo): void {
  const cx = m.w >> 1;
  const alto = (m.h * 0.2) | 0;
  // I paesaggi (lago, foresta, deserto… e quelli delle schede, con `siVede`): basta averne abbastanza celle.
  for (const [id, materiale, soglia] of paesaggi()) {
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
