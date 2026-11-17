/** I materiali del mondo. Ogni cella della griglia contiene uno di questi numeri. */
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
  /** Materia che sta bruciando: non è una scoperta, è uno stato di passaggio di piante e legno. */
  BRACE: 23,
  /** La roccia nuda di cui è fatto il mondo appena nato: non si scopre e non si versa, c'è e basta. */
  ROCCIA: 24,
} as const;

export const N_MATERIALI = 25;

/** Scoperte che non sono materiali della griglia. */
export const OMINO = 100;
export const VILLAGGIO = 101;

/** Come si comporta un materiale quando è lasciato a sé stesso. */
export const NULLA = 0;
export const POLVERE = 1;
export const LIQUIDO = 2;
export const GAS = 3;
export const SOLIDO = 4;

export const STATO = new Uint8Array(N_MATERIALI);
STATO[M.TERRA] = POLVERE;
STATO[M.ACQUA] = LIQUIDO;
STATO[M.FUOCO] = GAS;
STATO[M.ARIA] = GAS;
STATO[M.VAPORE] = GAS;
STATO[M.FANGO] = POLVERE;
STATO[M.SABBIA] = POLVERE;
STATO[M.LAVA] = LIQUIDO;
STATO[M.PIETRA] = SOLIDO;
STATO[M.NUVOLA] = GAS;
STATO[M.FULMINE] = GAS;
STATO[M.VETRO] = SOLIDO;
STATO[M.ARGILLA] = POLVERE;
STATO[M.MATTONE] = SOLIDO;
STATO[M.PIANTA] = SOLIDO;
STATO[M.LEGNO] = SOLIDO;
STATO[M.CENERE] = POLVERE;
STATO[M.FUMO] = GAS;
STATO[M.NEVE] = POLVERE;
STATO[M.GHIACCIO] = SOLIDO;
STATO[M.HUMUS] = POLVERE;
STATO[M.OSSIDIANA] = SOLIDO;
STATO[M.BRACE] = SOLIDO;
STATO[M.ROCCIA] = SOLIDO;

/** Materiali che esistono nel mondo ma non sono scoperte: non entrano nel libro né nella tavolozza. */
export const NASCOSTO = new Uint8Array(N_MATERIALI);
NASCOSTO[M.VUOTO] = 1;
NASCOSTO[M.BRACE] = 1;
NASCOSTO[M.ROCCIA] = 1;

/** Brucia se toccato dal fuoco. */
export const BRUCIA = new Uint8Array(N_MATERIALI);
BRUCIA[M.PIANTA] = 1;
BRUCIA[M.LEGNO] = 1;

/** Uccide un omino che lo tocca. */
export const MORTALE = new Uint8Array(N_MATERIALI);
MORTALE[M.FUOCO] = 1;
MORTALE[M.LAVA] = 1;
MORTALE[M.BRACE] = 1;
MORTALE[M.FULMINE] = 1;

/** Una pianta con questo valore (o più) nel suo dato sta crescendo come albero. */
export const ALBERO = 100;
