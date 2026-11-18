/** I materiali del mondo. Ogni cella della griglia contiene uno di questi numeri (o il numero di una miscela). */
export const M = {
  VUOTO: 0,
  TERRA: 1,
  ACQUA: 2,
  FUOCO: 3,
  ARIA: 4,
  VAPORE: 5,
  FANGO: 6,
  SABBIA: 7,
  LAVA: 8,
  PIETRA: 9,
  NUVOLA: 10,
  FULMINE: 11,
  VETRO: 12,
  ARGILLA: 13,
  MATTONE: 14,
  PIANTA: 15,
  LEGNO: 16,
  CENERE: 17,
  FUMO: 18,
  NEVE: 19,
  GHIACCIO: 20,
  HUMUS: 21,
  OSSIDIANA: 22,
  /** Materia che sta bruciando: non è una scoperta, è uno stato di passaggio di ciò che brucia. */
  BRACE: 23,
  /** La roccia nuda di cui è fatto il mondo appena nato: non si scopre e non si versa, c'è e basta. */
  ROCCIA: 24,
  CARBONE: 25,
  METALLO: 26,
  RUGGINE: 27,
  ZOLFO: 28,
  POLVERE_NERA: 29,
  ACIDO: 30,
  DIAMANTE: 31,
  MUSCHIO: 32,
  ALGA: 33,
  FUNGO: 34,
  FRUTTO: 35,
} as const;

/** Quanti sono i materiali scritti a mano. */
export const N_BASE = 36;
/** Da questo numero in su, la cella contiene una miscela: ogni mondo ne può ospitare 192 diverse. */
export const PRIMA_MISCELA = 64;
/** Quanti numeri diversi può contenere una cella. */
export const N_TIPI = 256;

/** Scoperte che non sono materiali della griglia: abitanti, fiori, fenomeni. */
export const OMINO = 100;
export const VILLAGGIO = 101;
export const BAMBINO = 102;
export const FIORE = 103;
export const PIOGGIA = 110;
export const ARCOBALENO = 111;
export const NOTTE = 112;
export const ALBA = 113;
export const LAGO = 114;
export const FORESTA = 115;
export const DESERTO = 116;
export const INCENDIO = 117;
export const ERUZIONE = 118;
export const GHIACCIAIO = 119;
export const NEVICATA = 120;
export const ESPLOSIONE = 121;
export const TEMPORALE = 122;
export const LUCCIOLE = 123;
/**
 * Quante celle di un materiale servono perché il mondo "abbia" un certo paesaggio: [scoperta, materiale, celle].
 * Questi sono quelli di prima delle schede; tutti insieme (con `siVede` delle schede) li dà `paesaggi()` di
 * contenuti/registro.ts.
 */
export const PAESAGGI_DI_PRIMA: readonly (readonly [number, number, number])[] = [
  [LAGO, M.ACQUA, 700],
  [FORESTA, M.LEGNO, 120],
  [DESERTO, M.SABBIA, 1500],
  [INCENDIO, M.BRACE, 50],
  [ERUZIONE, M.LAVA, 350],
  [GHIACCIAIO, M.GHIACCIO, 300],
  [NEVICATA, M.NEVE, 300],
];
/** Da questo numero in su, una scoperta è una miscela: il numero dipende solo dai due ingredienti. */
export const PRIMA_ID_MISCELA = 1_000_000;

/** Come si comporta un materiale quando è lasciato a sé stesso. */
export const NULLA = 0;
export const POLVERE = 1;
export const LIQUIDO = 2;
export const GAS = 3;
export const SOLIDO = 4;

/**
 * Il carattere di una sostanza, in numeri. Per i materiali scritti a mano serve soprattutto a decidere che cosa
 * nasce quando li si fonde con qualcos'altro; per le miscele decide anche come si comportano nel mondo.
 */
export interface Sostanza {
  stato: number;
  colore: readonly [number, number, number];
  /** Da 0 (leggerissima) a 1 (pesantissima). */
  peso: number;
  /** Da 0 (ferma, vischiosa) a 1 (scorre liberamente). */
  scorre: number;
  /** Da -1 (gelida) a 1 (rovente). */
  calore: number;
  brucia: number;
  luce: number;
  fertile: number;
  /** Quanto tende ad allargarsi da sola, come una cosa viva. */
  vivo: number;
  veleno: number;
  nutre: number;
  esplode: number;
  corrode: number;
}

/** I tratti che si ereditano mescolando (oltre a stato, colore, peso e scorrevolezza). */
export const TRATTI = ['calore', 'brucia', 'luce', 'fertile', 'vivo', 'veleno', 'nutre', 'esplode', 'corrode'] as const;

export const STATO = new Uint8Array(N_TIPI);
/** Il carattere dei materiali scritti a mano (null per quelli che non si possono mescolare). */
export const BASE: (Sostanza | null)[] = new Array<Sostanza | null>(N_BASE).fill(null);

function base(t: number, stato: number, colore: [number, number, number], tratti: Partial<Sostanza> = {}): void {
  STATO[t] = stato;
  BASE[t] = { stato, colore, peso: 0.5, scorre: 0.5, calore: 0, brucia: 0, luce: 0, fertile: 0, vivo: 0, veleno: 0, nutre: 0, esplode: 0, corrode: 0, ...tratti };
}
base(M.TERRA, POLVERE, [150, 98, 64], { peso: 0.6, scorre: 0.35, fertile: 0.35 });
base(M.ACQUA, LIQUIDO, [58, 140, 230], { peso: 0.5, scorre: 0.9, calore: -0.15 });
base(M.FUOCO, GAS, [255, 150, 40], { peso: 0.05, calore: 1, luce: 1 });
base(M.ARIA, GAS, [215, 235, 250], { peso: 0.02, scorre: 1 });
base(M.VAPORE, GAS, [232, 240, 246], { peso: 0.05, calore: 0.4 });
base(M.FANGO, POLVERE, [96, 68, 50], { peso: 0.65, scorre: 0.08, fertile: 0.6 });
base(M.SABBIA, POLVERE, [236, 208, 146], { peso: 0.6, scorre: 1 });
base(M.LAVA, LIQUIDO, [255, 110, 24], { peso: 0.9, scorre: 0.2, calore: 1, luce: 0.8 });
base(M.PIETRA, SOLIDO, [136, 144, 156], { peso: 0.9 });
base(M.NUVOLA, GAS, [250, 252, 255], { peso: 0.03, calore: -0.2 });
base(M.FULMINE, GAS, [255, 252, 220], { peso: 0.02, calore: 0.9, luce: 1, esplode: 0.5 });
base(M.VETRO, SOLIDO, [176, 232, 238], { peso: 0.7, luce: 0.15 });
base(M.ARGILLA, POLVERE, [196, 124, 96], { peso: 0.7, scorre: 0 });
base(M.MATTONE, SOLIDO, [188, 70, 50], { peso: 0.8 });
base(M.PIANTA, SOLIDO, [74, 180, 82], { peso: 0.2, brucia: 0.8, vivo: 0.55, nutre: 0.6, fertile: 0.2 });
base(M.LEGNO, SOLIDO, [118, 80, 48], { peso: 0.4, brucia: 0.7 });
base(M.CENERE, POLVERE, [176, 176, 180], { peso: 0.2, scorre: 0.8, fertile: 0.5 });
base(M.FUMO, GAS, [92, 92, 104], { peso: 0.04, veleno: 0.2 });
base(M.NEVE, POLVERE, [248, 251, 255], { peso: 0.2, scorre: 0.5, calore: -0.8 });
base(M.GHIACCIO, SOLIDO, [182, 226, 252], { peso: 0.45, calore: -0.9 });
base(M.HUMUS, POLVERE, [70, 50, 34], { peso: 0.55, scorre: 0.35, fertile: 0.9 });
base(M.OSSIDIANA, SOLIDO, [52, 42, 72], { peso: 0.9, luce: 0.1 });
base(M.CARBONE, POLVERE, [44, 42, 48], { peso: 0.55, scorre: 0.5, brucia: 0.9, calore: 0.1 });
base(M.METALLO, SOLIDO, [168, 176, 190], { peso: 1 });
base(M.RUGGINE, POLVERE, [176, 88, 44], { peso: 0.7, scorre: 0.5, veleno: 0.2 });
base(M.ZOLFO, POLVERE, [226, 210, 64], { peso: 0.55, scorre: 0.7, brucia: 0.6, veleno: 0.5, esplode: 0.4 });
base(M.POLVERE_NERA, POLVERE, [58, 56, 64], { peso: 0.55, scorre: 0.8, brucia: 0.9, esplode: 1 });
base(M.ACIDO, LIQUIDO, [150, 226, 60], { peso: 0.55, scorre: 0.8, corrode: 1, veleno: 0.8 });
base(M.DIAMANTE, SOLIDO, [196, 240, 255], { peso: 0.8, luce: 0.5 });
base(M.MUSCHIO, SOLIDO, [96, 150, 70], { peso: 0.5, vivo: 0.8, fertile: 0.4, brucia: 0.5 });
base(M.ALGA, SOLIDO, [40, 150, 110], { peso: 0.4, vivo: 0.7, nutre: 0.5 });
base(M.FUNGO, SOLIDO, [214, 80, 70], { peso: 0.3, nutre: 0.8, veleno: 0.2, vivo: 0.4, brucia: 0.4 });
base(M.FRUTTO, POLVERE, [232, 60, 60], { peso: 0.3, scorre: 0.3, nutre: 1, fertile: 0.4, brucia: 0.3 });
STATO[M.BRACE] = SOLIDO;
STATO[M.ROCCIA] = SOLIDO;

/** Materiali che esistono nel mondo ma non sono scoperte: non entrano nel libro né nella tavolozza. */
export const NASCOSTO = new Uint8Array(N_TIPI);
NASCOSTO[M.VUOTO] = 1;
NASCOSTO[M.BRACE] = 1;
NASCOSTO[M.ROCCIA] = 1;

/** Brucia se toccato dal fuoco. */
export const BRUCIA = new Uint8Array(N_TIPI);
for (const t of [M.PIANTA, M.LEGNO, M.CARBONE, M.ZOLFO, M.POLVERE_NERA, M.MUSCHIO, M.FUNGO, M.FRUTTO]) BRUCIA[t] = 1;

/** Uccide un omino che lo tocca. */
export const MORTALE = new Uint8Array(N_TIPI);
for (const t of [M.FUOCO, M.LAVA, M.BRACE, M.FULMINE, M.ACIDO]) MORTALE[t] = 1;

/** Un omino lo può mangiare. */
export const CIBO = new Uint8Array(N_TIPI);
for (const t of [M.PIANTA, M.FRUTTO, M.FUNGO]) CIBO[t] = 1;

/** Una pianta con questo valore (o più) nel suo dato sta crescendo come albero. */
export const ALBERO = 100;
/**
 * Nel `dato` del legno: questa cella è il tronco di un albero cresciuto da sé. Per gli omini è uno sfondo, ci
 * passano davanti; e una costruzione non ci si appoggia sopra. Il legno versato da chi gioca (dato 0) resta un muro.
 */
export const TRONCO = 1;
