import { INDIZIO, type Indizio, type Suggeritore } from './indizi.js';
import { nomeDi, tondino } from './libro.js';
import { coppiaDEsempio, siUnisce } from './motore/esiti.js';
import { PRIMA_ID_MISCELA } from './motore/materiali.js';
import type { Mondo } from './motore/mondo.js';
import { quadro } from './motore/suggerimenti.js';
import type { Finestre } from './finestre.js';
import { el, segnaResa } from './pagina.js';
import { rispostaDiUnisci } from './risposta.js';

/** Si può unire ad altro: i materiali, le miscele, le invenzioni, e anche gli omini e il villaggio. */
function unibile(mondo: Mondo, id: number): boolean {
  return id >= PRIMA_ID_MISCELA ? mondo.ricettario.has(id) : siUnisce(id);
}

/** La frase con cui Unisci si presenta: un esempio fatto con due cose che chi gioca ha davvero sullo scaffale. */
function invito(mondo: Mondo): string {
  const esempio = coppiaDEsempio(mondo.visti);
  const prova = esempio ? `Per esempio ${nomeDi(mondo, esempio[0]).toLowerCase()} e ${nomeDi(mondo, esempio[1]).toLowerCase()}. ` : '';
  return `${prova}Molte coppie danno qualcosa; alcune niente.`;
}

/**
 * Il pannello Unisci: si scelgono due scoperte e si guarda cosa ne nasce, come nei giochi di alchimia.
 * Qui nascono le invenzioni (utensile, capanna, ruota…), i mestieri (un omino con la lancia), i materiali che nel
 * mondo nascerebbero dall'incontro di quelle due cose (terra e acqua: fango) e, tra due sostanze rimaste senza un
 * risultato loro, le miscele. Una coppia già provata lo dice. `colonna` dice dove sta guardando chi gioca: gli
 * omini chiamati da un'unione arrivano lì vicino, se possono. `suggeritore` dà gli indizi (il tasto, e quello che
 * arriva da solo dopo tre «niente» di fila), gli stessi del mondo.
 */
export function apriUnisci(finestre: Finestre, mondo: Mondo, colonna: () => number, suggeritore: Suggeritore): void {
  // Il mondo continua a vivere sotto Unisci: le cose nate da un'unione (gli omini, una capanna) ci sono già.
  finestre.apri({ classe: 'libro unisci', fermaIlMondo: false, riempi: ({ scheda, chiudi }) => riempiUnisci(scheda, chiudi, mondo, colonna, suggeritore) });
}

function riempiUnisci(scheda: HTMLDivElement, chiudi: () => void, mondo: Mondo, colonna: () => number, suggeritore: Suggeritore): void {
  const testa = el('div', 'scheda-testa');
  const titoli = el('div', 'libro-titoli');
  titoli.append(el('h2', '', 'Unisci'), el('span', 'libro-conto', 'Tocca due cose: vediamo cosa ne nasce.'));
  const bIndizio = el('button', 'tasto tasto-indizio', INDIZIO.tasto);
  const bChiudi = el('button', 'tasto', 'Chiudi');
  bChiudi.addEventListener('click', chiudi);
  testa.append(titoli, bIndizio, bChiudi);

  const banco = el('div', 'banco');
  const esito = el('div', 'esito');
  // L'indizio, quando c'è: sotto l'esito, finché non si prova un'altra coppia.
  const consiglio = el('p', 'consiglio');
  consiglio.hidden = true;
  consiglio.setAttribute('role', 'status');
  const scaffale = el('div', 'libro-corpo');
  scheda.append(testa, banco, esito, consiglio, scaffale);

  function consiglia(indizio: Indizio | null, attendi = 0): void {
    consiglio.hidden = indizio === null;
    if (!indizio) return;
    consiglio.replaceChildren(el('span', 'consiglio-sopra', INDIZIO.tasto), el('span', '', indizio.testo));
    if (attendi > 0) consiglio.append(el('span', 'consiglio-sotto', INDIZIO.attendi(attendi)));
  }
  bIndizio.addEventListener('click', () => {
    const { indizio, attendi } = suggeritore.chiedi(mondo.visti, performance.now());
    consiglia(indizio, attendi);
  });

  let scelte: number[] = [];

  function posto(id: number | undefined): HTMLElement {
    if (id === undefined) return el('div', 'posto vuoto', '?');
    const b = el('button', 'posto');
    b.append(tondino(mondo, id, 'pallino grande'), el('span', '', nomeDi(mondo, id)));
    b.addEventListener('click', () => {
      scelte = scelte.filter((altro) => altro !== id);
      ridisegna();
    });
    return b;
  }

  function mostra(titolo: string, id: number | null, sotto: string, nuova: boolean, rara?: 'rara' | 'leggendaria'): void {
    esito.innerHTML = '';
    esito.className = nuova ? `esito nuova${rara ? ` ${rara}` : ''}` : 'esito';
    const testi = el('span', 'avviso-testi');
    testi.append(el('span', 'avviso-sopra', titolo));
    if (id !== null) testi.append(el('strong', '', nomeDi(mondo, id)));
    testi.append(el('span', 'avviso-sotto', sotto));
    if (id !== null) esito.append(tondino(mondo, id, 'pallino grande'));
    esito.append(testi);
  }

  function ridisegna(): void {
    banco.innerHTML = '';
    banco.append(posto(scelte[0]), el('span', 'piu', '+'), posto(scelte[1]));
    scaffale.innerHTML = '';
    const griglia = el('div', 'scaffale');
    const q = quadro(mondo.visti);
    for (const id of mondo.visti) {
      if (!unibile(mondo, id)) continue;
      const b = el('button', scelte.includes(id) ? 'gettone scelto' : 'gettone');
      b.append(tondino(mondo, id), el('span', '', nomeDi(mondo, id)));
      segnaResa(b, q, id);
      b.addEventListener('click', () => scegli(id));
      griglia.append(b);
    }
    scaffale.append(griglia);
  }

  function scegli(id: number): void {
    if (scelte.includes(id)) scelte = scelte.filter((altro) => altro !== id);
    else if (scelte.length < 2) scelte.push(id);
    else scelte = [id];
    if (scelte.length === 2) {
      const [a, b] = scelte;
      const r = rispostaDiUnisci(mondo, a, b, colonna(), (id) => nomeDi(mondo, id), suggeritore.nienteInTutto);
      mostra(r.titolo, r.id, r.sotto, r.nuova, r.rara);
      // Al terzo «niente» di fila arriva un indizio da solo, su una delle cose appena provate se si può.
      consiglia(suggeritore.dopo(a, b, r.niente === true, mondo.visti, performance.now()));
      scelte = [];
    }
    ridisegna();
  }

  mostra('Prova una coppia', null, invito(mondo), false);
  ridisegna();
}
