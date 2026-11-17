import { INIZIALI } from './scoperte.js';

/** Quello che la pagina ricorda insieme alla partita. */
export interface Ricordi {
  /** Le cose della tavolozza, dalla più recente. */
  recenti: number[];
}

/** I ricordi letti da una partita salvata, e se quella partita aveva il Mestolo (che non c'è più). */
export interface RicordiLetti {
  ricordi: Ricordi;
  /**
   * Vero se la partita di prima aveva il Mestolo: chi gioca va salutato una volta, con la Mano in mano. I ricordi
   * riscritti dopo non lo dicono più, così il saluto non torna.
   */
  avevaIlMestolo: boolean;
}

/**
 * Legge i ricordi della pagina salvati con la partita (`extra` del salvataggio). Qualunque cosa ci sia scritta, anche
 * niente o un dato sporco, ne escono ricordi buoni: le voci della tavolozza che non sono numeri si scartano.
 */
export function leggiRicordi(extra: unknown): RicordiLetti {
  const dati = extra !== null && typeof extra === 'object' ? (extra as { recenti?: unknown; mestolo?: unknown }) : {};
  const recenti = Array.isArray(dati.recenti) ? dati.recenti.filter((id): id is number => typeof id === 'number' && Number.isFinite(id)) : [...INIZIALI];
  return { ricordi: { recenti }, avevaIlMestolo: dati.mestolo === true };
}
