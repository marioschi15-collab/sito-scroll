import { Coda } from './coda.js';
import { el } from './pagina.js';

/** Una finestra aperta: la scheda da riempire e il modo di chiuderla. */
export interface Finestra {
  scheda: HTMLDivElement;
  chiudi: () => void;
}

/** Come è fatta una finestra: chi la chiede la descrive, e il modulo la apre quando tocca a lei. */
export interface Modello {
  /** Le classi della scheda oltre a `scheda`: 'messaggio', 'libro', 'libro unisci'. */
  classe: string;
  /** Riempie la scheda: il primo titolo (h2) diventa il nome della finestra, il primo tasto prende il fuoco. */
  riempi: (f: Finestra) => void;
  /** Se il mondo si ferma finché la finestra è aperta (sì, se non si dice altro). */
  fermaIlMondo?: boolean;
  /** Si può chiudere toccando fuori o con Esc (sì, se non si dice altro). */
  siChiudeDaSola?: boolean;
  /** Da chiamare quando la finestra si chiude, in qualunque modo. */
  dopo?: () => void;
}

/** Quanto aspetta un messaggio in fila dopo che si è chiusa una finestra o è finito un gesto: il tocco si posa. */
const RESPIRO = 350;

let contaTitoli = 0;

/**
 * Tutte le finestre del gioco passano da qui: il Libro, Unisci, i messaggi. Ce n'è una sola aperta alla volta, e i
 * messaggi aspettano il loro turno (vedi `Coda`). Una finestra aperta si presenta a chi usa un lettore di schermo
 * (finestra di dialogo con il suo titolo), prende il fuoco e lo restituisce a chi l'ha aperta, rende inerte il resto
 * della pagina, si chiude con Esc o toccando fuori.
 */
export class Finestre {
  private readonly coda: Coda<Modello>;
  private corrente: { modello: Modello; chiudi: () => void } | null = null;
  private timer = 0;

  /**
   * `primaDiAprire` si chiama un attimo prima di aprire ogni finestra: il gioco ci chiude il gesto in corso, perché
   * con il resto della pagina inerte il dito alzato non arriverebbe più al mondo.
   */
  constructor(
    private readonly app: HTMLElement,
    private readonly primaDiAprire: () => void = () => {},
  ) {
    this.coda = new Coda((m) => this.mostra(m));
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.corrente && this.corrente.modello.siChiudeDaSola !== false) this.corrente.chiudi();
    });
  }

  /** Vero se una finestra è aperta. */
  get aperta(): boolean {
    return this.corrente !== null;
  }

  /** Vero se la finestra aperta ferma il mondo. */
  get fermaIlMondo(): boolean {
    return this.corrente !== null && this.corrente.modello.fermaIlMondo !== false;
  }

  /** Una finestra chiesta da chi gioca: si apre adesso, se non ce n'è un'altra. */
  apri(modello: Modello): boolean {
    return this.coda.subito(modello);
  }

  /** Un messaggio del gioco: si apre quando non c'è nessun'altra finestra e nessun gesto in corso. */
  aspetta(modello: Modello, chiave?: string): void {
    this.coda.aspetta(modello, chiave);
    this.avanti(0);
  }

  /** Un dito comincia o finisce un gesto sul mondo: finché dura, i messaggi aspettano. */
  gesto(inCorso: boolean): void {
    this.coda.gesto(inCorso);
    if (!inCorso) this.avanti(RESPIRO);
  }

  /** Chiude la finestra aperta, se c'è. */
  chiudi(): void {
    this.corrente?.chiudi();
  }

  /** Dimentica i messaggi che aspettavano: dopo «Riparti da zero» non valgono più. */
  svuota(): void {
    this.coda.svuota();
  }

  private avanti(ms: number): void {
    clearTimeout(this.timer);
    if (!this.coda.pronta) return;
    if (ms === 0) this.coda.avanti();
    else this.timer = window.setTimeout(() => this.coda.avanti(), ms);
  }

  /** Il resto della pagina (barra, mondo, tavolozza, avvisi) non si tocca e non prende il fuoco. */
  private inerte(si: boolean, tranne?: Element): void {
    for (const figlio of this.app.children) if (figlio !== tranne) (figlio as HTMLElement).inert = si;
  }

  private mostra(modello: Modello): void {
    this.primaDiAprire();
    const velo = el('div', 'velo');
    const scheda = el('div', `scheda ${modello.classe}`);
    scheda.setAttribute('role', 'dialog');
    scheda.setAttribute('aria-modal', 'true');
    velo.append(scheda);
    const daQui = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let chiusa = false;
    const chiudi = (): void => {
      if (chiusa) return;
      chiusa = true;
      velo.remove();
      this.inerte(false);
      this.corrente = null;
      this.coda.chiusa();
      modello.dopo?.();
      if (daQui?.isConnected && daQui !== document.body) daQui.focus({ preventScroll: true });
      this.avanti(RESPIRO);
    };
    velo.addEventListener('click', (e) => {
      if (e.target === velo && modello.siChiudeDaSola !== false) chiudi();
    });
    this.corrente = { modello, chiudi };
    modello.riempi({ scheda, chiudi });
    const titolo = scheda.querySelector('h2');
    if (titolo) {
      if (!titolo.id) titolo.id = `finestra-titolo-${++contaTitoli}`;
      scheda.setAttribute('aria-labelledby', titolo.id);
    }
    this.app.append(velo);
    this.inerte(true, velo);
    scheda.querySelector('button')?.focus({ preventScroll: true });
  }
}
