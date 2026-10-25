// src/arte/tipi.ts — interfaccia comune delle illustrazioni (§5.9.1).
// Le opere (RosaEPugnale, Rondine, …) sono solo dati: li disegna e li anima sempre Disegno.tsx.
import type { MotionValue } from 'motion/react';

/** Testo dentro un disegno (lettering). Si rivela con una maschera, non con pathLength. */
export interface TestoDisegno {
  contenuto: string;
  x: number;
  y: number;
  /** font-size in unità del viewBox. */
  dimensione: number;
  ancora?: 'start' | 'middle' | 'end';   // predefinito 'middle'
  rotazione?: number;                     // gradi, attorno a (x, y)
}

/** Zona ombreggiata a linee parallele: `area` è un tracciato chiuso che ritaglia le linee. */
export interface Tratteggio {
  area: string;
  passo?: number;          // predefinito 5
  angolo?: 45 | -45;       // predefinito 45
}

/** I dati di un disegno. Ogni campo è un livello; l'ordine degli array è l'ordine di tracciatura. */
export interface DatiDisegno {
  id: string;
  /** '0 0 400 500' per le opere (4:5), '0 0 48 48' per le icone. */
  viewBox: string;
  /** Predefinito { contorno: 3, interno: 1.75 }. Fine line: { contorno: 1.5, interno: 1 }. Icone: { contorno: 1.5, interno: 1.5 }. */
  spessori?: { contorno: number; interno: number };
  /** Campiture grigie (fill var(--lavato)), sotto tutto. */
  lavati?: readonly string[];
  /** Campiture nere (fill var(--pieno), fill-rule evenodd: i sotto-tracciati interni sono buchi). */
  pieni?: readonly string[];
  tratteggi?: readonly Tratteggio[];
  /** Un solo tracciato di segmenti a lunghezza zero: "M x y h0 M x y h0 …" (colore --tratto). */
  puntini?: string;
  /** Stesso formato, colore --tratto-2 (toni chiari). */
  puntiniChiari?: string;
  /** Dettagli interni: si tracciano dopo i contorni. */
  interni?: readonly string[];
  /** Contorni principali: si tracciano per primi, in quest'ordine. */
  contorni: readonly string[];
  testi?: readonly TestoDisegno[];
}

/** Interfaccia comune di OGNI illustrazione (componenti in src/arte/). */
export interface PropsIllustrazione {
  /** Nome accessibile (role="img" + <title>). Ignorato se `decorativa`. */
  titolo: string;
  /** Predefinito true. false = disegno completo e fermo, senza alcuno stato iniziale. */
  animata?: boolean;
  /** Quando parte da solo: appena montato o appena entra in vista (predefinito). */
  quando?: 'in-vista' | 'subito';
  /** Se presente, il disegno segue questo valore (0..1) e non parte da solo. */
  progresso?: MotionValue<number>;
  /** Secondi totali (tratti + campiture). Predefinito TEMPI_DISEGNO.galleria.durata. */
  durata?: number;
  /** Secondi. Predefinito 0. */
  ritardo?: number;
  /** Copia stencil sfalsata che compare al passaggio del mouse o al focus del link/pulsante che lo contiene. */
  conStencil?: boolean;
  /** Punta dell'ago che segue il tratto mentre si disegna. */
  conAgo?: boolean;
  /** aria-hidden, nessun <title>. */
  decorativa?: boolean;
  className?: string;
}
