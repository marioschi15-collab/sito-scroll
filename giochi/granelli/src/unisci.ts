import { nomeDi, tondino } from './libro.js';
import { OMINO, PRIMA_ID_MISCELA, VILLAGGIO } from './motore/materiali.js';
import type { Mondo } from './motore/mondo.js';
import { el } from './pagina.js';
import { PER_ID } from './scoperte.js';

/** Si può unire ad altro: i materiali, le miscele, le invenzioni, e anche gli omini e il villaggio. */
function unibile(mondo: Mondo, id: number): boolean {
  if (id === OMINO || id === VILLAGGIO) return true;
  if (id >= PRIMA_ID_MISCELA) return mondo.ricettario.has(id);
  return mondo.sostanzaDi(id) !== null || PER_ID.get(id)?.sezione === 'cose';
}

/**
 * Il pannello Unisci: si scelgono due scoperte e si guarda cosa ne nasce, come nei giochi di alchimia.
 * Qui nascono le invenzioni (utensile, capanna, ruota…) e, tra due materiali senza un risultato loro, le miscele.
 */
export function apriUnisci(app: HTMLElement, mondo: Mondo): void {
  const velo = el('div', 'velo');
  const scheda = el('div', 'scheda libro unisci');
  velo.append(scheda);
  const chiudi = (): void => velo.remove();
  velo.addEventListener('click', (e) => {
    if (e.target === velo) chiudi();
  });

  const testa = el('div', 'scheda-testa');
  const titoli = el('div', 'libro-titoli');
  titoli.append(el('h2', '', 'Unisci'), el('span', 'libro-conto', 'Tocca due cose: vediamo cosa ne nasce.'));
  const bChiudi = el('button', 'tasto', 'Chiudi');
  bChiudi.addEventListener('click', chiudi);
  testa.append(titoli, bChiudi);

  const banco = el('div', 'banco');
  const esito = el('div', 'esito');
  const scaffale = el('div', 'libro-corpo');
  scheda.append(testa, banco, esito, scaffale);

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

  function mostra(titolo: string, id: number | null, sotto: string, nuova: boolean): void {
    esito.innerHTML = '';
    esito.className = nuova ? 'esito nuova' : 'esito';
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
    for (const id of mondo.visti) {
      if (!unibile(mondo, id)) continue;
      const b = el('button', scelte.includes(id) ? 'gettone scelto' : 'gettone');
      b.append(tondino(mondo, id), el('span', '', nomeDi(mondo, id)));
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
      const nota = new Set(mondo.visti);
      const nato = mondo.unisci(a, b);
      const insieme = `${nomeDi(mondo, a)} + ${nomeDi(mondo, b)}`;
      if (nato < 0) mostra('Niente da fare', null, `${insieme}: queste due non si uniscono.`, false);
      else if (nota.has(nato)) mostra('La conosci già', nato, insieme, false);
      else mostra(nato >= PRIMA_ID_MISCELA ? 'Nuova miscela!' : 'Nuova scoperta!', nato, insieme, true);
      scelte = [];
    }
    ridisegna();
  }

  mostra('Prova una coppia', null, 'Per esempio pietra e legno. Molte coppie danno qualcosa; alcune niente.', false);
  ridisegna();
  app.append(velo);
}
