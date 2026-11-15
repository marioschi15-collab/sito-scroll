import type { Incantesimo } from './gioco.js';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const COME_TASTIERA =
  '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> per camminare · mouse per guardare · clic per lanciare<br />' +
  '<kbd>1</kbd>–<kbd>7</kbd> o rotella per cambiare incantesimo · <kbd>Spazio</kbd> salta · <kbd>Maiusc</kbd> corri · <kbd>R</kbd> ricostruisci';
const COME_DITA =
  'Pollice sinistro per camminare, destro per guardarti intorno.<br />Tocca un incantesimo in basso e tieni premuto ✦ per lanciarlo.';

/** Tutto ciò che sta sopra l'immagine del gioco: barra degli incantesimi, scritte, pulsanti, schermata d'ingresso. */
export class Interfaccia {
  readonly tela = el<HTMLCanvasElement>('tela');
  readonly leva = el('leva');
  readonly pomello = el('pomello');
  readonly pulsanteLancia = el<HTMLButtonElement>('lancia');
  readonly pulsanteSalta = el<HTMLButtonElement>('salta');
  readonly pulsanteRicostruisci = el<HTMLButtonElement>('ricostruisci');
  private readonly inizio = el('inizio');
  private readonly entra = el<HTMLButtonElement>('entra');
  private readonly nome = el('nome');
  private readonly stato = el('stato');
  private readonly bottoni: HTMLButtonElement[] = [];
  private readonly veli: HTMLElement[] = [];
  private spegniNome = 0;
  onScelta: (indice: number) => void = () => undefined;
  onEntra: () => void = () => undefined;

  constructor(private readonly magie: readonly Incantesimo[], telefono: boolean) {
    document.body.classList.toggle('dita', telefono);
    el('come').innerHTML = telefono ? COME_DITA : COME_TASTIERA;
    const barra = el('barra');
    magie.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'magia';
      b.title = `${m.nome}: ${m.cosaFa}`;
      b.setAttribute('aria-label', m.nome);
      b.style.setProperty('--tinta', `#${m.colore.toString(16).padStart(6, '0')}`);
      b.innerHTML = `${m.simbolo}<i></i><small>${i + 1}</small>`;
      b.addEventListener('click', () => {
        this.onScelta(i);
        b.blur();
      });
      barra.append(b);
      this.bottoni.push(b);
      this.veli.push(b.querySelector('i')!);
    });
    this.entra.addEventListener('click', () => this.onEntra());
  }

  pronto(): void {
    this.entra.disabled = false;
    this.entra.textContent = 'Entra nella radura';
  }

  mostraIngresso(mostra: boolean): void {
    this.inizio.classList.toggle('via', !mostra);
    if (mostra) this.entra.textContent = 'Riprendi';
  }

  scegli(indice: number): void {
    const m = this.magie[indice]!;
    this.bottoni.forEach((b, i) => b.classList.toggle('scelta', i === indice));
    this.nome.querySelector('b')!.textContent = m.nome;
    this.nome.querySelector('span')!.textContent = m.cosaFa;
    this.nome.style.opacity = '1';
    window.clearTimeout(this.spegniNome);
    this.spegniNome = window.setTimeout(() => (this.nome.style.opacity = '0'), 3200);
    this.pulsanteLancia.style.setProperty('--tinta', `#${m.colore.toString(16).padStart(6, '0')}`);
  }

  /** Mostra quanto manca prima di poter rilanciare ogni incantesimo (0 = pronto, 1 = appena lanciato). */
  ricariche(quote: readonly number[]): void {
    quote.forEach((q, i) => (this.veli[i]!.style.transform = `scaleY(${q.toFixed(3)})`));
  }

  scriviStato(testo: string): void {
    this.stato.textContent = testo;
  }
}
