import { graficaScelta, ricordaGrafica, type Grafica } from './base/qualita.js';
import type { Incantesimo } from './gioco.js';
import { pesiZone, ZONE, type Luogo } from './mondo/zone.js';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

/** Quanti metri si vedono sulla mappa, dal centro al bordo, e quanti ne copre lo sfondo dipinto. */
const VISTA_MAPPA = 420;
const SFONDO = 700;

const COME_TASTIERA =
  '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> per camminare · mouse per guardare · clic per lanciare<br />' +
  '<kbd>1</kbd>–<kbd>0</kbd>, <kbd>Q</kbd>/<kbd>E</kbd> o rotella per cambiare incantesimo · <kbd>C</kbd> inventane uno · <kbd>Spazio</kbd> salta · <kbd>Maiusc</kbd> corri · <kbd>R</kbd> ricostruisci';
const COME_DITA =
  'Pollice sinistro per camminare, destro per guardarti intorno.<br />Spingi il pollice più lontano per correre. Scorri la barra in basso, tocca un incantesimo e tieni premuto ✦ per lanciarlo. Con ＋ ne inventi uno tuo.<br />Se non senti i suoni, togli il silenzioso.';

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
  private bottoni: HTMLButtonElement[] = [];
  private veli: HTMLElement[] = [];
  private magie: readonly Incantesimo[] = [];
  onOfficina: () => void = () => undefined;
  onGrafica: (scelta: Grafica) => void = () => undefined;
  private spegniNome = 0;
  private spegniAnnuncio = 0;
  private readonly annuncio = el('annuncio');
  private readonly mappa = el<HTMLCanvasElement>('mappa');
  private readonly sfondoMappa = document.createElement('canvas');
  onScelta: (indice: number) => void = () => undefined;
  onEntra: () => void = () => undefined;

  constructor(magie: readonly Incantesimo[], telefono: boolean) {
    document.body.classList.toggle('dita', telefono);
    el('come').innerHTML = telefono ? COME_DITA : COME_TASTIERA;
    el('magie').addEventListener('scroll', () => this.segnaFine(), { passive: true });
    window.addEventListener('resize', () => this.segnaFine());
    this.impostaMagie(magie);
    this.entra.addEventListener('click', () => this.onEntra());
    // La scelta della grafica vale subito, senza ricaricare (dove il browser non lascia salvare, ricaricando si perderebbe).
    const nomi: Record<Grafica, string> = {
      automatica: 'Grafica: automatica (si adatta al dispositivo)',
      alta: 'Grafica: sempre al massimo',
      leggera: 'Grafica: leggera (per dispositivi lenti)',
    };
    const ordine: Grafica[] = ['automatica', 'alta', 'leggera'];
    const pulsante = el<HTMLButtonElement>('grafica');
    pulsante.textContent = nomi[graficaScelta()];
    pulsante.addEventListener('click', () => {
      const prossima = ordine[(ordine.indexOf(graficaScelta()) + 1) % ordine.length]!;
      ricordaGrafica(prossima);
      pulsante.textContent = nomi[prossima];
      this.onGrafica(prossima);
    });
  }

  /** Ridisegna la barra: gli incantesimi di sempre, quelli inventati, e in fondo il pulsante dell'officina. */
  impostaMagie(magie: readonly Incantesimo[]): void {
    this.magie = magie;
    this.bottoni = [];
    this.veli = [];
    const barra = el('magie');
    barra.replaceChildren();
    magie.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'magia';
      b.title = `${m.nome}: ${m.cosaFa}`;
      b.setAttribute('aria-label', m.nome);
      b.style.setProperty('--tinta', `#${m.colore.toString(16).padStart(6, '0')}`);
      b.innerHTML = `${m.simbolo}<i></i><small>${i < 10 ? (i + 1) % 10 : ''}</small>`;
      b.addEventListener('click', () => {
        this.onScelta(i);
        b.blur();
      });
      barra.append(b);
      this.bottoni.push(b);
      this.veli.push(b.querySelector('i')!);
    });
    const crea = document.createElement('button');
    crea.type = 'button';
    crea.className = 'magia crea';
    crea.title = 'Inventa un incantesimo';
    crea.setAttribute('aria-label', 'Inventa un incantesimo');
    crea.textContent = '＋';
    crea.addEventListener('click', () => {
      this.onOfficina();
      crea.blur();
    });
    this.crea?.remove();
    this.crea = crea;
    el('barra').append(crea);
    this.segnaFine();
  }

  private crea: HTMLElement | null = null;

  /** Toglie la sfumatura a destra della barra quando si è arrivati in fondo (o quando non c'è niente da scorrere). */
  private segnaFine(): void {
    const m = el('magie');
    m.classList.toggle('fine', m.scrollLeft + m.clientWidth >= m.scrollWidth - 2);
  }

  private centroMappaX = NaN;
  private centroMappaZ = NaN;

  /** Dipinge lo sfondo della mappa attorno a un punto: ogni terra con il colore del suo suolo. */
  private dipingiSfondo(x: number, z: number): void {
    const lato = 48;
    this.centroMappaX = x;
    this.centroMappaZ = z;
    this.sfondoMappa.width = this.sfondoMappa.height = lato;
    const c = this.sfondoMappa.getContext('2d')!;
    const punti = c.createImageData(lato, lato);
    const pesi = new Float32Array(5);
    const terre = ZONE.map((zona) => [(zona.terra >> 16) & 255, (zona.terra >> 8) & 255, zona.terra & 255]);
    for (let j = 0; j < lato; j++) {
      for (let i = 0; i < lato; i++) {
        pesiZone(x + ((i + 0.5) / lato - 0.5) * 2 * SFONDO, z + ((j + 0.5) / lato - 0.5) * 2 * SFONDO, pesi);
        const k = (j * lato + i) * 4;
        for (let canale = 0; canale < 3; canale++) {
          let v = 0;
          for (let n = 0; n < ZONE.length; n++) v += terre[n]![canale]! * pesi[n]!;
          punti.data[k + canale] = v;
        }
        punti.data[k + 3] = 255;
      }
    }
    c.putImageData(punti, 0, 0);
  }

  /**
   * Ridisegna la mappa. Chi gioca sta sempre al centro e il nord è in alto; attorno si vedono le terre vicine
   * e i luoghi (pieni se già scoperti).
   */
  disegnaMappa(x: number, z: number, imbardata: number, luoghi: readonly Luogo[], scoperti: ReadonlySet<string>): void {
    const c = this.mappa.getContext('2d');
    if (!c) return;
    // Lo sfondo copre più del visibile: lo si ridipinge solo quando ci si è spostati di un bel po'.
    if (!(Math.hypot(x - this.centroMappaX, z - this.centroMappaZ) < SFONDO - VISTA_MAPPA - 20)) this.dipingiSfondo(x, z);
    const lato = this.mappa.width;
    const scala = lato / (2 * VISTA_MAPPA);
    c.imageSmoothingEnabled = true;
    const latoSfondo = 2 * SFONDO * scala;
    c.drawImage(
      this.sfondoMappa,
      lato / 2 + (this.centroMappaX - SFONDO - x) * scala, lato / 2 + (this.centroMappaZ - SFONDO - z) * scala,
      latoSfondo, latoSfondo,
    );
    for (const l of luoghi) {
      c.beginPath();
      c.arc(lato / 2 + (l.x - x) * scala, lato / 2 + (l.z - z) * scala, 5, 0, Math.PI * 2);
      if (scoperti.has(l.chiave)) {
        c.fillStyle = '#fff';
        c.fill();
      } else {
        c.strokeStyle = 'rgba(255,255,255,.6)';
        c.lineWidth = 1.5;
        c.stroke();
      }
    }
    c.save();
    c.translate(lato / 2, lato / 2);
    c.rotate(-imbardata);
    c.beginPath();
    c.moveTo(0, -11);
    c.lineTo(7, 8);
    c.lineTo(0, 4);
    c.lineTo(-7, 8);
    c.closePath();
    c.fillStyle = '#ffd24a';
    c.strokeStyle = '#1d1a14';
    c.lineWidth = 2;
    c.fill();
    c.stroke();
    c.restore();
  }

  /** Una scritta grande in mezzo allo schermo, che svanisce da sola: una zona nuova, un luogo trovato. */
  annuncia(titolo: string, sotto: string): void {
    this.annuncio.querySelector('b')!.textContent = titolo;
    this.annuncio.querySelector('span')!.textContent = sotto;
    this.annuncio.style.opacity = '1';
    window.clearTimeout(this.spegniAnnuncio);
    this.spegniAnnuncio = window.setTimeout(() => (this.annuncio.style.opacity = '0'), 3500);
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
    this.bottoni[indice]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    this.nome.querySelector('b')!.textContent = m.nome;
    this.nome.querySelector('span')!.textContent = m.cosaFa;
    this.nome.style.opacity = '1';
    window.clearTimeout(this.spegniNome);
    this.spegniNome = window.setTimeout(() => (this.nome.style.opacity = '0'), 3200);
    this.pulsanteLancia.style.setProperty('--tinta', `#${m.colore.toString(16).padStart(6, '0')}`);
  }

  /** Mostra quanto manca prima di poter rilanciare ogni incantesimo (0 = pronto, 1 = appena lanciato). */
  ricariche(quote: readonly number[]): void {
    quote.forEach((q, i) => this.veli[i] && (this.veli[i].style.transform = `scaleY(${q.toFixed(3)})`));
  }

  scriviStato(testo: string): void {
    this.stato.textContent = testo;
  }
}
