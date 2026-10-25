// src/movimento/costanti.ts — unica fonte dei tempi e delle curve di Motion.
// Gli stessi valori esistono come variabili CSS in token.css (--durata-*, --ease-*).
import type { SpringOptions, Transition, UseInViewOptions } from 'motion/react';

/** Curva cubic-bezier come la vuole Motion (BezierDefinition è readonly in Motion 14). */
export type CurvaBezier = readonly [number, number, number, number];

/** Comparse e rivelazioni: parte decisa, si posa morbida. */
export const EASE_USCITA: CurvaBezier = [0.22, 1, 0.36, 1];
/** Linee che si disegnano: accelera e rallenta come una mano. */
export const EASE_TRATTO: CurvaBezier = [0.65, 0, 0.35, 1];
/** Passaggio del mouse e piccoli riscontri. */
export const EASE_RAPIDA: CurvaBezier = [0.33, 1, 0.68, 1];
/** Uscite. */
export const EASE_VIA: CurvaBezier = [0.55, 0, 1, 0.45];

/** Durate in secondi. */
export const DURATA = {
  istante: 0.12,
  micro: 0.2,
  rapida: 0.3,
  media: 0.6,
  rivela: 0.8,
  lenta: 0.9,
  marchio: 1.2,
} as const;

/** Intervalli di stagger in secondi. */
export const STAGGER = {
  parole: 0.035,
  righe: 0.07,
  elementi: 0.1,
  impegni: 0.12,
  campi: 0.05,
  domande: 0.05,
  menu: 0.05,
  colonne: 0.08,
} as const;

/** Tempi dei disegni che si tracciano (secondi). La durata comprende tratti e campiture. */
export const TEMPI_DISEGNO = {
  apertura: { ritardo: 0.3, durata: 2.0 },
  galleria: { ritardo: 0.25, durata: 1.4 },
  icona: { ritardo: 0.15, durata: 0.9 },
  faseSchizzo: 1.0,
  faseStencil: 0.4,
  faseInchiostro: 1.2,
  faseGuarito: 0.6,
  faseIndietro: 0.3,
} as const;

/** Sul telefono le durate dei disegni si moltiplicano per questo valore. */
export const FATTORE_TELEFONO = 0.75;

/** Parte dell'avanzamento (0..1) dedicata ai tratti; il resto è per campiture, puntinato e testi. */
export const QUOTA_TRATTI = 0.8;

/** Transizioni a molla. */
export const MOLLA_LAYOUT: Transition = { type: 'spring', visualDuration: 0.45, bounce: 0 };
export const MOLLA_SCELTA: Transition = { type: 'spring', visualDuration: 0.3, bounce: 0 };
export const MOLLA_SCHEDA: Transition = { type: 'spring', visualDuration: 0.5, bounce: 0 };
export const MOLLA_BARRA: Transition = { type: 'spring', visualDuration: 0.35, bounce: 0 };
export const MOLLA_TOCCO: Transition = { type: 'spring', stiffness: 600, damping: 30, mass: 0.5 };
export const MOLLA_DECALCO: Transition = { type: 'spring', stiffness: 500, damping: 20 };
export const MOLLA_TIMBRO: Transition = { type: 'spring', stiffness: 700, damping: 24, mass: 0.8 };

/** Opzioni per useSpring. */
export const SEGUI_CURSORE: SpringOptions = { stiffness: 260, damping: 30, mass: 0.6 };
export const SEGUI_AVANZAMENTO: SpringOptions = { stiffness: 200, damping: 40, restDelta: 0.001 };
export const SEGUI_FILO: SpringOptions = { stiffness: 120, damping: 30, restDelta: 0.001 };

/** Transizioni tween ricorrenti. */
export const T_ENTRA: Transition = { duration: DURATA.media, ease: EASE_USCITA };
export const T_RIVELA: Transition = { duration: DURATA.rivela, ease: EASE_USCITA };
export const T_LINEA: Transition = { duration: DURATA.lenta, ease: EASE_TRATTO };
export const T_RAPIDA: Transition = { duration: DURATA.rapida, ease: EASE_RAPIDA };
export const T_MICRO: Transition = { duration: DURATA.micro, ease: EASE_RAPIDA };
export const T_USCITA: Transition = { duration: DURATA.micro, ease: EASE_VIA };

/** Opzioni di vista (prop `viewport` e useInView). Si anima sempre una volta sola. */
export const VISTA = { once: true, amount: 0.3 } as const;
export const VISTA_TITOLI = { once: true, amount: 0.6 } as const;
export const VISTA_DISEGNI: UseInViewOptions = { once: true, amount: 0.3 };

/** Media query usate in JavaScript (le stesse del CSS). */
export const MEDIA = {
  tablet: '(min-width: 640px)',
  desktop: '(min-width: 1024px)',
  puntatoreFine: '(hover: hover) and (pointer: fine)',
  ridotto: '(prefers-reduced-motion: reduce)',
} as const;

/** Spostamenti ricorrenti in px. */
export const SPOSTA = { entra: 16, entraCarta: 24, etichetta: 12, didascalia: 8, menu: 24 } as const;
