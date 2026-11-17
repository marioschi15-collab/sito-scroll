import { CONSEGUENZE, E, ERE } from './cose.js';

/**
 * Le ere arrivano in ordine. Un'era della scala ERE scatta solo se quella prima c'è già: se la sua invenzione
 * arriva in anticipo (il castello prima del bronzo), l'invenzione resta e l'era aspetta il suo turno. I grandi
 * eventi che non sono ere (il fuoco domato, l'agricoltura, la scrittura, il commercio) vengono dopo l'Età della pietra.
 */
function puoArrivare(allora: number, visti: ReadonlySet<number>): boolean {
  const k = ERE.indexOf(allora);
  if (k === 0) return true;
  if (k > 0) return visti.has(ERE[k - 1]);
  return visti.has(E.PIETRA);
}

/**
 * Le ere e gli eventi che possono scattare adesso: la loro invenzione è già scoperta, loro ancora no, e tocca a
 * loro. Non guarda come ci si è arrivati: una partita salvata con un'invenzione «in anticipo» ritrova la sua era
 * in attesa, e chi scopre la precedente la fa scattare. Per la cascata (bronzo, poi ferro, poi antica…) basta
 * chiamarla di nuovo dopo ogni scoperta.
 */
export function erePronte(visti: ReadonlySet<number>): number[] {
  const pronte: number[] = [];
  for (const [quando, allora] of CONSEGUENZE) {
    if (visti.has(quando) && !visti.has(allora) && puoArrivare(allora, visti)) pronte.push(allora);
  }
  return pronte;
}
