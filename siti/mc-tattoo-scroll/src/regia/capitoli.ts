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

// ——— I dubbi: quattro domande, ognuna con il suo tratto di scena ———
export const DUBBI_INIZIO = 0.1;
export const DUBBI_PASSO = 0.195;
export const DUBBI_QUANTI = 4;
/** Dentro ogni dubbio (da 0 a 1): quando lo schermo passa dal nero al bianco e quando torna nero. */
export const DUBBIO_SVOLTA = [0.46, 0.58] as const;
export const DUBBIO_RITORNO = [0.9, 1] as const;

function tappeDubbi(): Tappa[] {
  const buio = { sfondo: T.nero, testo: T.carta, accento: T.rosso };
  const luce = { sfondo: T.carta, testo: T.inchiostro, accento: T.rosso };
  const out: Tappa[] = [
    // La scena nasce in dissolvenza sul rosso del gancio, poi cala il buio dei dubbi.
    { p: 0, sfondo: T.rosso, testo: T.carta, accento: T.nero },
    { p: 0.08, ...buio },
  ];
  for (let i = 0; i < DUBBI_QUANTI; i++) {
    const da = DUBBI_INIZIO + i * DUBBI_PASSO;
    out.push({ p: da + DUBBIO_SVOLTA[0] * DUBBI_PASSO, ...buio }, { p: da + DUBBIO_SVOLTA[1] * DUBBI_PASSO, ...luce });
    // Dopo l'ultima risposta resta la luce: da lì comincia il disegno.
    if (i < DUBBI_QUANTI - 1) out.push({ p: da + DUBBIO_RITORNO[0] * DUBBI_PASSO, ...luce }, { p: da + DUBBIO_RITORNO[1] * DUBBI_PASSO, ...buio });
  }
  return out;
}

/**
 * La storia: «Dal pensiero alla pelle». Non racconta il tatuaggio ma chi lo vuole: il desiderio,
 * i dubbi che lo fermano, la prova che può fidarsi, e la strada più corta per prenotare.
 */
export const CAPITOLI: readonly Capitolo[] = [
  {
    id: 'prologo',
    numero: '',
    titolo: 'Ce l’hai in testa',
    schermate: 3.4,
    tappe: [
      { p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      { p: 0.42, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      // Il sole ha già riempito lo schermo: il fondo diventa rosso sotto di lui.
      { p: 0.5, sfondo: T.rosso, testo: T.carta, accento: T.nero },
    ],
  },
  {
    id: 'dubbi',
    numero: 'I',
    titolo: 'I dubbi',
    schermate: 6.4,
    dissolvenza: true,
    tappe: tappeDubbi(),
  },
  {
    id: 'idea',
    numero: 'II',
    titolo: 'Su misura',
    schermate: 3.6,
    dissolvenza: true,
    tappe: [
      { p: 0, sfondo: T.carta, testo: T.inchiostro, accento: T.rosso },
      { p: 1, sfondo: T.cenere, testo: T.inchiostro, accento: T.rosso },
    ],
  },
  {
    id: 'stencil',
    numero: 'III',
    titolo: 'Lo provi addosso',
    schermate: 3.6,
    tappe: [
      { p: 0, sfondo: T.piombo, testo: T.carta, accento: T.carta },
      { p: 0.3, sfondo: T.grafite, testo: T.carta, accento: T.cenere },
      { p: 0.6, sfondo: '#1C1C1C', testo: T.carta, accento: T.cenere },
    ],
  },
  {
    id: 'ago',
    numero: 'IV',
    titolo: 'Mano ferma',
    schermate: 5,
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
    numero: 'V',
    titolo: 'Fatto per durare',
    schermate: 4.8,
    dissolvenza: true,
    tappe: [
      { p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      { p: 0.62, sfondo: T.nero, testo: T.carta, accento: T.rosso },
      { p: 0.78, sfondo: T.rosso, testo: T.carta, accento: T.nero },
      { p: 0.95, sfondo: T.rosso, testo: T.carta, accento: T.nero },
      // Si chiude al nero: da qui al bianco degli stili si passa solo per i grigi, mai per il rosa.
      { p: 1, sfondo: T.nero, testo: T.carta, accento: T.rosso },
    ],
  },
  {
    id: 'stili',
    numero: 'VI',
    titolo: 'Qual è il tuo?',
    schermate: 6,
    tappe: tappeStili(),
  },
  {
    id: 'rito',
    numero: 'VII',
    titolo: 'Tre passi',
    schermate: 3.8,
    tappe: [
      { p: 0, sfondo: T.carta, testo: T.inchiostro, accento: T.rosso },
      { p: 1, sfondo: T.bianco, testo: T.inchiostro, accento: T.rosso },
    ],
  },
  {
    id: 'finale',
    numero: 'VIII',
    titolo: 'Prenota',
    schermate: null,
    tappe: [{ p: 0, sfondo: T.nero, testo: T.carta, accento: T.rosso }],
  },
];

export function capitoloPerId(id: string): Capitolo {
  const c = CAPITOLI.find((x) => x.id === id);
  if (!c) throw new Error(`Capitolo sconosciuto: ${id}`);
  return c;
}
