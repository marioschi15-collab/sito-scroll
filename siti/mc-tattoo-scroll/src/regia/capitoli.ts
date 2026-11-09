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
  tappe: readonly Tappa[];
}

/** I pannelli della scena orizzontale "Gli stili", nell'ordine. */
export const COLORI_STILI = [
  { sfondo: T.carta, testo: T.inchiostro, accento: T.rosso },
  { sfondo: T.nero, testo: T.carta, accento: T.rosso },
  { sfondo: T.cenere, testo: T.inchiostro, accento: T.piombo },
  { sfondo: T.rosso, testo: T.carta, accento: T.nero },
  { sfondo: T.grafite, testo: T.carta, accento: T.rosso },
] as const;

function tappeStili(): Tappa[] {
  const n = COLORI_STILI.length;
  const out: Tappa[] = [];
  COLORI_STILI.forEach((c, i) => {
    const centro = 0.08 + (i / (n - 1)) * 0.84;
    out.push({ p: centro - 0.05, ...c }, { p: centro + 0.05, ...c });
  });
  return out;
}

export const CAPITOLI: readonly Capitolo[] = [
  {
    id: 'prologo',
    numero: '',
    titolo: 'Il vuoto',
    schermate: 2.6,
    tappe: [
      { p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      { p: 0.82, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      { p: 1, sfondo: T.carta, testo: T.inchiostro, accento: T.rosso },
    ],
  },
  {
    id: 'idea',
    numero: 'I',
    titolo: 'L’idea',
    schermate: 3.4,
    tappe: [
      { p: 0, sfondo: T.carta, testo: T.inchiostro, accento: T.rosso },
      { p: 1, sfondo: T.cenere, testo: T.inchiostro, accento: T.rosso },
    ],
  },
  {
    id: 'stencil',
    numero: 'II',
    titolo: 'Lo stencil',
    schermate: 3.2,
    tappe: [
      { p: 0, sfondo: T.piombo, testo: T.carta, accento: T.carta },
      { p: 0.4, sfondo: T.grafite, testo: T.carta, accento: T.cenere },
      { p: 1, sfondo: '#1C1C1C', testo: T.carta, accento: T.cenere },
    ],
  },
  {
    id: 'ago',
    numero: 'III',
    titolo: 'L’ago',
    schermate: 4.8,
    tappe: [
      { p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso, bande: 1 },
      { p: 0.88, sfondo: T.nero, testo: T.carta, accento: T.rosso, bande: 1 },
      { p: 1, sfondo: T.nero, testo: T.carta, accento: T.rosso, bande: 0 },
    ],
  },
  {
    id: 'rosso',
    numero: 'IV',
    titolo: 'Il rosso',
    schermate: 4.2,
    tappe: [
      { p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      { p: 0.62, sfondo: T.nero, testo: T.carta, accento: T.rosso },
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
      { p: 0.8, sfondo: T.rossoScuro, testo: T.carta, accento: T.nero },
      { p: 1, sfondo: T.rossoScuro, testo: T.carta, accento: T.nero },
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
