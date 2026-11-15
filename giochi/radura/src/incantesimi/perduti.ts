import type { Incantesimo } from '../gioco.js';
import { creaDaRicetta, type Ricetta } from './officina.js';

/**
 * Gli incantesimi perduti: uno per ogni tipo di luogo del mondo, nascosto lì e segnalato da una colonna di luce.
 * Non si possono inventare nell'officina: alcuni sono più forti o più ampi di quanto l'officina permetta
 * (potenza e ampiezza 4). Chi li trova li tiene.
 */
const RICETTE: Readonly<Record<string, Ricetta>> = {
  borgo: { nome: 'Buon vicinato', simbolo: '🏡', colore: 0xffd86a, forma: 'tocco', effetti: ['rammenda', 'fiorisce'], potenza: 3, ampiezza: 4 },
  fattoria: { nome: 'Falce di vento', simbolo: '🌾', colore: 0xcfe07a, forma: 'onda', effetti: ['vortice', 'solleva'], potenza: 3, ampiezza: 2 },
  vedetta: { nome: 'Occhio di falco', simbolo: '🦅', colore: 0xfff06a, forma: 'cielo', effetti: ['folgora', 'scoppio'], potenza: 4, ampiezza: 1 },
  piramide: { nome: 'Sigillo del faraone', simbolo: '🔺', colore: 0xffb02e, forma: 'pioggia', effetti: ['cristalli', 'scoppio'], potenza: 3, ampiezza: 2 },
  tempio: { nome: 'Colonna di sole', simbolo: '🏛️', colore: 0xffe14a, forma: 'cielo', effetti: ['brucia', 'solleva', 'scoppio'], potenza: 3, ampiezza: 3 },
  casbah: { nome: 'Tempesta di sabbia', simbolo: '🏜️', colore: 0xe9c46a, forma: 'onda', effetti: ['vortice', 'scoppio'], potenza: 3, ampiezza: 3 },
  castello: { nome: 'Inverno eterno', simbolo: '🏰', colore: 0x9fd4ff, forma: 'pioggia', effetti: ['gela', 'cristalli'], potenza: 3, ampiezza: 4 },
  igloo: { nome: 'Fiato di neve', simbolo: '⛄', colore: 0xcfeaff, forma: 'palla', effetti: ['gela', 'bolla'], potenza: 3, ampiezza: 3 },
  guglia: { nome: 'Cuore di cristallo', simbolo: '🔷', colore: 0x6ff0ff, forma: 'cielo', effetti: ['cristalli', 'gela', 'folgora'], potenza: 4, ampiezza: 2 },
  palafitte: { nome: 'Marea dei lumi', simbolo: '🪷', colore: 0x4fe0c8, forma: 'onda', effetti: ['solleva', 'fiorisce', 'bolla'], potenza: 2, ampiezza: 3 },
  strega: { nome: 'Malocchio', simbolo: '🧿', colore: 0xa56bff, forma: 'tocco', effetti: ['risucchio', 'vortice', 'bolla'], potenza: 3, ampiezza: 3 },
  fortezza: { nome: 'Pugno d’ossidiana', simbolo: '🗿', colore: 0xc77dff, forma: 'palla', effetti: ['scoppio', 'solleva', 'brucia'], potenza: 4, ampiezza: 3 },
  altare: { nome: 'Ira del vulcano', simbolo: '🌋', colore: 0xff5a3a, forma: 'cielo', effetti: ['brucia', 'scoppio', 'solleva'], potenza: 4, ampiezza: 4 },
};

/** Per ogni tipo di luogo, l'incantesimo perduto che vi è nascosto. */
export const PERDUTI: Readonly<Record<string, Incantesimo>> = Object.fromEntries(
  Object.entries(RICETTE).map(([tipo, ricetta]) => [tipo, { ...creaDaRicetta(ricetta), raro: true }]),
);

const CHIAVE = 'radura-perduti';

/** I tipi di luogo di cui si è già trovato l'incantesimo, nell'ordine in cui sono stati trovati. */
export function leggiTrovati(): string[] {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) ?? '[]') as unknown[];
    return [...new Set(dati.filter((t): t is string => typeof t === 'string' && t in PERDUTI))];
  } catch {
    return [];
  }
}

export function salvaTrovati(trovati: readonly string[]): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(trovati));
  } catch {
    // Senza memoria del browser li si ritroverà la prossima volta.
  }
}
