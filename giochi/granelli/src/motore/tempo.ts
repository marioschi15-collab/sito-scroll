/** Quanti istanti dura un giorno intero del mondo (quattro minuti). */
export const DURATA_GIORNO = 14400;

/**
 * Dove siamo nel giro del giorno: 0 alba, 0.25 mezzogiorno, 0.5 tramonto, 0.75 mezzanotte.
 * Il mondo nasce di mattina: il giocatore vede subito i colori, e la prima notte arriva dopo un paio di minuti.
 */
export function faseDelGiorno(tic: number): number {
  return ((tic + DURATA_GIORNO * 0.1) % DURATA_GIORNO) / DURATA_GIORNO;
}

/** Quanta luce c'è: 1 in pieno giorno, 0 in piena notte, con alba e tramonto che sfumano dall'uno all'altro. */
export function luceDelGiorno(tic: number): number {
  const sole = Math.sin(faseDelGiorno(tic) * Math.PI * 2) + 0.3;
  const t = Math.max(0, Math.min(1, (sole + 0.3) / 0.6));
  return t * t * (3 - 2 * t);
}
