// src/regia/capitoli.ts — la sceneggiatura: ordine delle scene, quanto si scorre in ognuna e i colori.
// Tavolozza rigorosa: nero, grigi, bianco carta e un solo rosso giapponese.
// Le "tappe" dicono che colori deve avere la pagina in un punto della scena (p da 0 a 1):
// la regia le fonde e le scrive nelle variabili CSS --sfondo, --testo, --accento, --bande.

export const TAVOLOZZA = {
  nero: '#0A0A0A',
  inchiostro: '#111111',
  grafite: '#2B2B2B',
  piombo: '#6B6B6B',
  nebbia: '#BDBDBD',
  cenere: '#E6E4E0',
  carta: '#F4F2EE',
  bianco: '#FFFFFF',
  rosso: '#C8102E',
  rossoScuro: '#8E0B20',
} as const;

const T = TAVOLOZZA;

export interface Tappa {
  p: number;
  sfondo: string;
  testo: string;
  accento: string;
  /** Bande nere da cinema: 0 nessuna, 1 formato panoramico. */
  bande?: number;
}

export interface Capitolo {
  id: string;
  /** "I", "II"… oppure stringa vuota per prologo e intermezzo. */
  numero: string;
  titolo: string;
  /** Altezza di scorrimento in schermate. Null: la scena segue il proprio contenuto. */
  schermate: number | null;
  /**
   * La scena entra in dissolvenza sopra la fine della precedente, invece di salire dal basso:
   * serve per le riprese continue (la carpa resta ferma sullo schermo da un capitolo all'altro).
   */
  dissolvenza?: boolean;
  tappe: readonly Tappa[];
}

/** Schermate in cui due scene in dissolvenza restano ferme una sopra l'altra. */
export const SOVRAPPOSTE = 0.5;

/**
 * I pannelli della scena orizzontale "Gli stili", nell'ordine.
 * Regola della tavolozza: il rosso confina solo con colori scuri. Fuso con il bianco darebbe un rosa
 * che non fa parte del sito; fuso con il nero dà solo rossi più profondi.
 */
export const COLORI_STILI = [
  { sfondo: T.carta, testo: T.inchiostro, accento: T.rosso }, // Giapponese
  { sfondo: T.nero, testo: T.carta, accento: T.rosso }, // Fine line
  { sfondo: T.rosso, testo: T.carta, accento: T.nero }, // Lettering
  { sfondo: T.grafite, testo: T.carta, accento: T.rosso }, // Dotwork
  { sfondo: T.cenere, testo: T.inchiostro, accento: T.rosso }, // Blackwork
] as const;

export const STILI_INIZIO = 0.08;
export const STILI_FINE = 0.92;
export const centroStile = (i: number): number => STILI_INIZIO + (i / (COLORI_STILI.length - 1)) * (STILI_FINE - STILI_INIZIO);

function tappeStili(): Tappa[] {
  const out: Tappa[] = [];
  // Ogni pannello tiene il suo colore quasi fino a metà strada: il cambio è uno stacco rapido,
  // proprio mentre il confine tra due pannelli attraversa il centro dello schermo.
  const tenuta = ((STILI_FINE - STILI_INIZIO) / (COLORI_STILI.length - 1)) * 0.4;
  COLORI_STILI.forEach((c, i) => {
    out.push({ p: centroStile(i) - tenuta, ...c }, { p: centroStile(i) + tenuta, ...c });
  });
  return out;
}

export const CAPITOLI: readonly Capitolo[] = [
  {
    id: 'prologo',
    numero: '',
    titolo: 'Il vuoto',
    schermate: 3.2,
    tappe: [
      { p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      // Resta nero finché la carta non ha coperto tutto; poi "L'idea", in dissolvenza, porta il bianco.
      { p: 0.74, sfondo: T.nero, testo: T.carta, accento: T.rosso },
    ],
  },
  {
    id: 'idea',
    numero: 'I',
    titolo: 'L’idea',
    schermate: 3.8,
    dissolvenza: true,
    tappe: [
      { p: 0, sfondo: T.carta, testo: T.inchiostro, accento: T.rosso },
      { p: 1, sfondo: T.cenere, testo: T.inchiostro, accento: T.rosso },
    ],
  },
  {
    id: 'stencil',
    numero: 'II',
    titolo: 'Lo stencil',
    schermate: 3.6,
    tappe: [
      { p: 0, sfondo: T.piombo, testo: T.carta, accento: T.carta },
      { p: 0.3, sfondo: T.grafite, testo: T.carta, accento: T.cenere },
      { p: 0.6, sfondo: '#1C1C1C', testo: T.carta, accento: T.cenere },
    ],
  },
  {
    id: 'ago',
    numero: 'III',
    titolo: 'L’ago',
    schermate: 5.2,
    dissolvenza: true,
    tappe: [
      { p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso, bande: 0 },
      { p: 0.13, sfondo: T.nero, testo: T.carta, accento: T.rosso, bande: 0 },
      { p: 0.21, sfondo: T.nero, testo: T.carta, accento: T.rosso, bande: 1 },
      { p: 0.74, sfondo: T.nero, testo: T.carta, accento: T.rosso, bande: 1 },
      { p: 0.86, sfondo: T.nero, testo: T.carta, accento: T.rosso, bande: 0 },
    ],
  },
  {
    id: 'rosso',
    numero: 'IV',
    titolo: 'Il rosso',
    schermate: 4.6,
    dissolvenza: true,
    tappe: [
      { p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      { p: 0.68, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      { p: 0.84, sfondo: T.rosso, testo: T.carta, accento: T.nero },
      { p: 1, sfondo: T.rosso, testo: T.carta, accento: T.nero },
    ],
  },
  {
    id: 'manifesto',
    numero: '',
    titolo: 'Manifesto',
    schermate: 2.8,
    tappe: [
      { p: 0, sfondo: T.rosso, testo: T.carta, accento: T.nero },
      { p: 0.7, sfondo: T.rossoScuro, testo: T.carta, accento: T.nero },
      // Si chiude al nero: da qui al bianco degli stili si passa solo per i grigi.
      { p: 1, sfondo: T.nero, testo: T.carta, accento: T.rosso },
    ],
  },
  {
    id: 'stili',
    numero: 'V',
    titolo: 'Gli stili',
    schermate: 6,
    tappe: tappeStili(),
  },
  {
    id: 'rito',
    numero: 'VI',
    titolo: 'Il rito',
    schermate: 4.4,
    tappe: [
      { p: 0, sfondo: T.carta, testo: T.inchiostro, accento: T.rosso },
      { p: 1, sfondo: T.bianco, testo: T.inchiostro, accento: T.rosso },
    ],
  },
  {
    id: 'finale',
    numero: 'VII',
    titolo: 'Il tuo segno',
    schermate: null,
    tappe: [{ p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso }],
  },
];

export function capitoloPerId(id: string): Capitolo {
  const c = CAPITOLI.find((x) => x.id === id);
  if (!c) throw new Error(`Capitolo sconosciuto: ${id}`);
  return c;
}
