import { SOLO_NEL_MONDO, esitoDi, fenomenoDi } from './motore/esiti.js';
import { OMINO, PRIMA_ID_MISCELA } from './motore/materiali.js';
import type { Mondo } from './motore/mondo.js';
import { rigaDelNiente } from './indizi.js';
import { UNISCI } from './righe.js';

/** Quello che il pannello Unisci mostra dopo un'unione: un titolo, la cosa nata (se c'è), una riga sotto, e se è nuova. */
export interface Risposta {
  titolo: string;
  id: number | null;
  sotto: string;
  nuova: boolean;
  /** Le due cose non hanno dato niente (anche «per ora»): conta per l'indizio che arriva dopo tre «niente» di fila. */
  niente?: true;
}

/**
 * Unisce `a` e `b` nel mondo e dice come raccontarlo. Ciò che serve al racconto (la coppia era già provata? la cosa
 * nata era già nota? c'erano omini?) si guarda prima di unire, perché unire lo cambia. `colonna` è dove sta
 * guardando chi gioca (gli omini chiamati da un'unione arrivano lì vicino), `nome` dà il nome di una scoperta.
 * `nienti` è quanti «niente» ci sono stati prima di questo: sceglie la riga gentile, che così cambia ogni volta.
 */
export function rispostaDiUnisci(mondo: Mondo, a: number, b: number, colonna: number, nome: (id: number) => string, nienti = 0): Risposta {
  const provata = mondo.giaProvata(a, b);
  const esito = esitoDi(a, b, mondo.voci());
  const nota = new Set(mondo.visti);
  const senzaOmini = mondo.omini.length === 0;
  const nato = mondo.unisci(a, b, colonna);
  const insieme = `${nome(a)} + ${nome(b)}`;
  const nuova = nato > 0 && !nota.has(nato);
  if (nato === SOLO_NEL_MONDO) {
    // La via di un fenomeno: Unisci non lo regala. Se chi gioca lo ha già visto gli si dice quale, altrimenti resta un mistero.
    const fenomeno = fenomenoDi(a, b);
    return { titolo: insieme, id: mondo.visti.has(fenomeno) ? fenomeno : null, sotto: 'Questo succede solo nel mondo: guarda l’indizio nel Libro.', nuova: false };
  }
  if (nato < 0) {
    // Prima della dodicesima voce due sostanze senza ricetta aspettano: la coppia non si ricorda, e lo si dice.
    if (esito.genere === 'niente' && esito.perOra) return { titolo: insieme, id: null, sotto: UNISCI.perOra, nuova: false, niente: true };
    // Mai un «niente» muto: una riga gentile, ogni volta diversa.
    return { titolo: provata ? UNISCI.giaProvata : UNISCI.niente, id: null, sotto: `${insieme}: ${rigaDelNiente(nienti)}`, nuova: false, niente: true };
  }
  if (nato === OMINO && senzaOmini) {
    // La via dei primi omini: arrivano in due vicino all'acqua, oppure arriveranno quando l'acqua ci sarà.
    const sotto = mondo.omini.length > 0 ? UNISCI.arrivati : UNISCI.arriveranno;
    return { titolo: nuova ? 'Nuova scoperta!' : insieme, id: nato, sotto, nuova };
  }
  if (nuova) return { titolo: nato >= PRIMA_ID_MISCELA ? 'Nuova miscela!' : 'Nuova scoperta!', id: nato, sotto: insieme, nuova: true };
  return { titolo: provata ? UNISCI.giaFatta : 'La conosci già', id: nato, sotto: insieme, nuova: false };
}
