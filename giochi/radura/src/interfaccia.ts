import type { Incantesimo } from './gioco.js';
import { LUOGHI, pesiZone, RAGGIO_GIOCO, ZONE } from './mondo/zone.js';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const COME_TASTIERA =
  '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> per camminare · mouse per guardare · clic per lanciare<br />' +
  '<kbd>1</kbd>–<kbd>0</kbd>, <kbd>Q</kbd>/<kbd>E</kbd> o rotella per cambiare incantesimo · <kbd>Spazio</kbd> salta · <kbd>Maiusc</kbd> corri · <kbd>R</kbd> ricostruisci';
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
  private spegniAnnuncio = 0;
  private readonly annuncio = el('annuncio');
  private readonly mappa = el<HTMLCanvasElement>('mappa');
  private readonly sfondoMappa = document.createElement('canvas');
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
      b.innerHTML = `${m.simbolo}<i></i><small>${i < 10 ? (i + 1) % 10 : ''}</small>`;
      b.addEventListener('click', () => {
        this.onScelta(i);
        b.blur();
      });
      barra.append(b);
      this.bottoni.push(b);
      this.veli.push(b.querySelector('i')!);
    });
    this.entra.addEventListener('click', () => this.onEntra());
    this.preparaMappa();
  }

  /** Dipinge una volta sola lo sfondo della mappa: ogni zona con il colore della sua terra. */
  private preparaMappa(): void {
    const lato = 104;
    this.sfondoMappa.width = this.sfondoMappa.height = lato;
    const c = this.sfondoMappa.getContext('2d')!;
    const punti = c.createImageData(lato, lato);
    const pesi = new Float32Array(5);
    const terre = ZONE.map((z) => [(z.terra >> 16) & 255, (z.terra >> 8) & 255, z.terra & 255]);
    for (let j = 0; j < lato; j++) {
      for (let i = 0; i < lato; i++) {
        const x = ((i + 0.5) / lato - 0.5) * 2 * (RAGGIO_GIOCO + 12);
        const z = ((j + 0.5) / lato - 0.5) * 2 * (RAGGIO_GIOCO + 12);
        pesiZone(x, z, pesi);
        const k = (j * lato + i) * 4;
        const fuori = Math.hypot(x, z) > RAGGIO_GIOCO;
        for (let canale = 0; canale < 3; canale++) {
          let v = 0;
          for (let n = 0; n < ZONE.length; n++) v += terre[n]![canale]! * pesi[n]!;
          punti.data[k + canale] = fuori ? v * 0.35 : v;
        }
        punti.data[k + 3] = 255;
      }
    }
    c.putImageData(punti, 0, 0);
  }

  /** Ridisegna la mappa: i luoghi (pieni se già scoperti) e la freccia di chi gioca. Il nord è in alto. */
  disegnaMappa(x: number, z: number, imbardata: number, scoperti: ReadonlySet<number>): void {
    const c = this.mappa.getContext('2d');
    if (!c) return;
    const lato = this.mappa.width;
    const scala = lato / (2 * (RAGGIO_GIOCO + 12));
    c.imageSmoothingEnabled = true;
    c.drawImage(this.sfondoMappa, 0, 0, lato, lato);
    LUOGHI.forEach((l, i) => {
      c.beginPath();
      c.arc(lato / 2 + l.x * scala, lato / 2 + l.z * scala, 4.5, 0, Math.PI * 2);
      if (scoperti.has(i)) {
        c.fillStyle = '#fff';
        c.fill();
      } else {
        c.strokeStyle = 'rgba(255,255,255,.55)';
        c.lineWidth = 1.5;
        c.stroke();
      }
    });
    c.save();
    c.translate(lato / 2 + x * scala, lato / 2 + z * scala);
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
