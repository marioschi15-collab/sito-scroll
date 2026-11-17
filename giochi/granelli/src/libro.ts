import { campione } from './disegno/colori.js';
import { SOGLIA_MISCELE } from './motore/esiti.js';
import { PRIMA_ID_MISCELA } from './motore/materiali.js';
import type { Mondo } from './motore/mondo.js';
import { descriviMiscela, etichette } from './motore/nomi.js';
import { el } from './pagina.js';
import { INIZIALI, PER_ID, SCOPERTE, SEZIONI, type Scoperta } from './scoperte.js';

/** Quello che il libro deve sapere del gioco per mostrarsi. */
export interface PerIlLibro {
  mondo: Mondo;
  /** Il giocatore ha scelto di usare questa cosa nel mondo. */
  usa: (id: number) => void;
}

const MISCELE = 'miscele';

/** Come si chiama una scoperta qualsiasi: una voce d'autore, oppure una miscela con il nome che le è toccato. */
export function nomeDi(mondo: Mondo, id: number): string {
  return PER_ID.get(id)?.nome ?? mondo.ricettario.get(id)?.nome ?? '???';
}

/** Il tondino con la grana di una scoperta, uguale a come appare nel mondo. */
export function tondino(mondo: Mondo, id: number, classe = 'pallino'): HTMLSpanElement {
  const e = el('span', classe);
  e.style.backgroundImage = `url(${campione(id, id >= PRIMA_ID_MISCELA ? mondo.sostanzaDi(id) : null)})`;
  return e;
}

/** Le voci d'autore che hanno questa cosa tra gli ingredienti. */
function figliDi(id: number): Scoperta[] {
  return SCOPERTE.filter((s) => s.id !== id && s.nasce.some((via) => via.con.includes(id)));
}

/**
 * Apre il libro delle scoperte: i capitoli, le voci di ogni capitolo, e per ogni voce una pagina che racconta
 * cos'è, come nasce e a cosa porta. Ogni nome è un collegamento: dal fango si va all'argilla, dall'argilla al
 * mattone, e così via, come in un'enciclopedia del proprio mondo.
 */
export function apriLibro(app: HTMLElement, dati: PerIlLibro, voceIniziale?: number): void {
  const { mondo } = dati;
  const visti = mondo.visti;
  const ordine = [...visti];
  const miscele = ordine.filter((id) => id >= PRIMA_ID_MISCELA);
  const trovate = SCOPERTE.filter((s) => visti.has(s.id)).length;
  /** Da quante voci in su anche le cose senza una ricetta si uniscono, e nascono le miscele. */
  const siMescola = trovate >= SOGLIA_MISCELE;

  const velo = el('div', 'velo');
  const scheda = el('div', 'scheda libro');
  velo.append(scheda);
  const chiudi = (): void => velo.remove();
  velo.addEventListener('click', (e) => {
    if (e.target === velo) chiudi();
  });

  const testa = el('div', 'scheda-testa');
  const titoli = el('div', 'libro-titoli');
  titoli.append(
    el('h2', '', 'Libro delle scoperte'),
    el('span', 'libro-conto', `${trovate} di ${SCOPERTE.length} scoperte${miscele.length ? ` · ${miscele.length} miscele` : ''}`),
  );
  const bChiudi = el('button', 'tasto', 'Chiudi');
  bChiudi.addEventListener('click', chiudi);
  testa.append(titoli, bChiudi);
  const linguette = el('div', 'linguette');
  const corpo = el('div', 'libro-corpo');
  scheda.append(testa, linguette, corpo);

  let capitolo = SEZIONI[0][0];

  /** Un nome con il suo tondino: se la cosa è nota porta alla sua pagina, altrimenti resta un mistero. */
  function etichetta(id: number): HTMLElement {
    if (!visti.has(id)) return el('span', 'gettone ignoto', '???');
    const b = el('button', 'gettone');
    b.append(tondino(mondo, id), el('span', '', nomeDi(mondo, id)));
    b.addEventListener('click', () => pagina(id));
    return b;
  }

  function fila(ids: readonly number[], separatore: string): HTMLElement {
    const riga = el('div', 'gettoni');
    ids.forEach((id, n) => {
      if (n > 0 && separatore) riga.append(el('span', 'piu', separatore));
      riga.append(etichetta(id));
    });
    return riga;
  }

  function blocco(titolo: string, ...contenuto: (HTMLElement | null)[]): HTMLElement {
    const b = el('section', 'blocco');
    b.append(el('h3', '', titolo), ...contenuto.filter((c): c is HTMLElement => c !== null));
    return b;
  }

  /** La pagina di una voce: cos'è, come nasce, a cosa porta, con chi è stata fusa. */
  function pagina(id: number): void {
    const voce = PER_ID.get(id);
    const ricetta = mondo.ricettario.get(id);
    const sostanza = mondo.sostanzaDi(id);
    corpo.innerHTML = '';
    corpo.scrollTop = 0;
    scheda.scrollTop = 0;
    const indietro = el('button', 'tasto indietro', '‹ Indietro');
    indietro.addEventListener('click', () => elenco());
    const intestazione = el('div', 'voce-testa');
    const titoli2 = el('div', 'voce-titoli');
    const capitoloNome = ricetta ? 'Miscela' : (SEZIONI.find(([chiave]) => chiave === voce?.sezione)?.[1] ?? '');
    titoli2.append(el('span', 'voce-capitolo', capitoloNome), el('h2', '', nomeDi(mondo, id)));
    const cartellini = el('div', 'cartellini');
    if (sostanza) for (const parola of etichette(sostanza)) cartellini.append(el('span', 'cartellino', parola));
    if (ricetta) cartellini.append(el('span', 'cartellino', `Generazione ${mondo.generazione(id)}`));
    titoli2.append(cartellini);
    intestazione.append(tondino(mondo, id, 'pallino enorme'), titoli2);
    corpo.append(indietro, intestazione);

    corpo.append(el('p', 'voce-racconto', voce ? voce.descrizione : sostanza ? descriviMiscela(sostanza) : ''));

    if (ricetta) corpo.append(blocco('Nasce da', fila([ricetta.a, ricetta.b], '+'), el('p', 'nota', 'Nata unendo queste due cose.')));
    else if (voce && voce.nasce.length > 0) {
      corpo.append(
        blocco(
          'Come nasce',
          ...voce.nasce.map((via) => {
            const riga = fila(via.con, '+');
            if (via.nota) riga.append(el('span', 'nota', via.nota));
            return riga;
          }),
        ),
      );
    } else if (voce) corpo.append(blocco('Come nasce', el('p', 'nota', 'È uno dei quattro elementi: c’è dall’inizio.')));

    const figli = figliDi(id);
    if (figli.length > 0) {
      const noti = figli.filter((s) => visti.has(s.id));
      const ignoti = figli.length - noti.length;
      corpo.append(
        blocco(
          'A cosa porta',
          noti.length > 0 ? fila(noti.map((s) => s.id), '') : null,
          ignoti > 0 ? el('p', 'nota', ignoti === 1 ? `${noti.length ? 'E c’è ancora' : 'C’è'} una cosa da scoprire.` : `${noti.length ? 'E ci sono ancora' : 'Ci sono'} ${ignoti} cose da scoprire.`) : null,
        ),
      );
    }

    if (sostanza) {
      const fuse = miscele.filter((m) => {
        const r = mondo.ricettario.get(m);
        return r !== undefined && (r.a === id || r.b === id);
      });
      corpo.append(
        blocco(
          'Miscele',
          fuse.length > 0 ? fila(fuse, '') : null,
          el('p', 'nota', siMescola ? 'Unita a una cosa che non ha una ricetta con lei, dà una miscela nuova: ogni coppia la sua.' : 'Quando il Libro avrà dodici voci, si potrà unire anche alle cose che non hanno una ricetta con lei.'),
        ),
      );
    }

    const piede = el('div', 'voce-piede');
    piede.append(el('span', 'nota', INIZIALI.includes(id) ? 'Con te dall’inizio.' : `Scoperta n. ${ordine.indexOf(id) + 1 - INIZIALI.length}`));
    if (ricetta || voce?.versabile) {
      const usa = el('button', 'tasto pieno', 'Usa nel mondo');
      usa.addEventListener('click', () => {
        dati.usa(id);
        chiudi();
      });
      piede.append(usa);
    }
    corpo.append(piede);
  }

  function cartella(id: number, trovata: boolean, sotto: string): HTMLElement {
    const b = el(trovata ? 'button' : 'div', trovata ? 'voce' : 'voce ignota');
    const testi = el('span', 'voce-testi');
    testi.append(el('strong', '', trovata ? nomeDi(mondo, id) : '???'), el('span', '', sotto));
    b.append(trovata ? tondino(mondo, id, 'pallino grande') : el('span', 'pallino grande', '?'), testi);
    if (trovata) b.addEventListener('click', () => pagina(id));
    return b;
  }

  /** L'elenco delle voci del capitolo scelto. */
  function elenco(): void {
    corpo.innerHTML = '';
    linguette.innerHTML = '';
    for (const [chiave, nome] of [...SEZIONI, [MISCELE, 'Miscele'] as const]) {
      const voci = SCOPERTE.filter((s) => s.sezione === chiave);
      const conto = chiave === MISCELE ? `${miscele.length}` : `${voci.filter((s) => visti.has(s.id)).length}/${voci.length}`;
      const b = el('button', chiave === capitolo ? 'linguetta attiva' : 'linguetta');
      b.append(el('span', '', nome), el('span', 'linguetta-conto', conto));
      b.addEventListener('click', () => {
        capitolo = chiave;
        elenco();
      });
      linguette.append(b);
    }
    const pagine = el('div', 'pagine');
    if (capitolo === MISCELE) {
      corpo.append(
        el(
          'p',
          'libro-premessa',
          siMescola
            ? 'Unisci due cose che non hanno una ricetta: nasce una miscela nuova, con il suo nome e il suo carattere. Poi unisci le miscele tra loro. Non finiscono mai.'
            : 'Questo capitolo si apre quando il Libro avrà dodici voci: da lì anche le cose senza una ricetta si uniscono, e nasce una miscela nuova.',
        ),
      );
      for (const id of [...miscele].reverse()) {
        const r = mondo.ricettario.get(id);
        pagine.append(cartella(id, true, r ? `${nomeDi(mondo, r.a)} + ${nomeDi(mondo, r.b)}` : ''));
      }
    } else {
      for (const s of SCOPERTE) {
        if (s.sezione !== capitolo) continue;
        const trovata = visti.has(s.id);
        pagine.append(cartella(s.id, trovata, trovata ? s.descrizione.split('. ')[0].replace(/[.:]$/, '') + '.' : s.indizio));
      }
    }
    corpo.append(pagine);
  }

  if (voceIniziale !== undefined && visti.has(voceIniziale)) {
    capitolo = PER_ID.get(voceIniziale)?.sezione ?? MISCELE;
    elenco();
    pagina(voceIniziale);
  } else elenco();
  app.append(velo);
}
