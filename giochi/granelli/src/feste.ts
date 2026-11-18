/**
 * Quale festa merita un gruppo di scoperte appena arrivate: «Hai scoperto tutto!» quando arriva l'ultima voce del
 * Libro (una volta sola: le miscele nate dopo non sono voci e non la ripetono), «È nato un villaggio!» quando nasce il
 * villaggio, altrimenti nessuna. `eVoce` dice se un numero è una voce del Libro.
 */
export function festaDovuta(
  nuove: readonly number[],
  trovate: number,
  totale: number,
  eVoce: (id: number) => boolean,
  villaggio: number,
): 'tutto' | 'villaggio' | null {
  if (trovate === totale && nuove.some(eVoce)) return 'tutto';
  return nuove.includes(villaggio) ? 'villaggio' : null;
}
