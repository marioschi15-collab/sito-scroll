/**
 * Quanto dettaglio preparare. Si prepara sempre il massimo che ha senso per il dispositivo; poi, al volo,
 * il gioco ne mostra di meno se il dispositivo fatica o se chi gioca sceglie la grafica leggera (vedi main).
 */
export interface Qualita {
  readonly telefono: boolean;
  readonly filiErba: number;
  readonly latoErba: number;
  readonly fiori: number;
  readonly ombre: boolean;
  readonly latoOmbre: number;
  readonly bagliore: boolean;
  readonly densitaPixel: number;
  readonly scintille: number;
  readonly fumo: number;
  /** Se falso (lo usano le prove), il gioco non tocca mai il dettaglio da solo. */
  readonly siAdatta: boolean;
}

export type Grafica = 'automatica' | 'alta' | 'leggera';
const CHIAVE = 'radura-grafica';

let sceltaAdesso: Grafica | null = null;

export function graficaScelta(): Grafica {
  if (sceltaAdesso) return sceltaAdesso;
  try {
    const v = localStorage.getItem(CHIAVE);
    if (v === 'alta' || v === 'leggera') return v;
  } catch {
    // Senza memoria del browser si resta su "automatica".
  }
  return 'automatica';
}

/** Ricorda la scelta: per questa partita di sicuro, per le prossime solo se il browser lascia salvare. */
export function ricordaGrafica(g: Grafica): void {
  sceltaAdesso = g;
  try {
    localStorage.setItem(CHIAVE, g);
  } catch {
    // Pazienza: varrà solo per questa partita.
  }
}

/** Quanti gradini di alleggerimento servivano l'ultima volta su questo dispositivo (0 se non si sa). */
export function gradiniRicordati(): number {
  try {
    const n = Number(localStorage.getItem('radura-gradini'));
    return Number.isFinite(n) ? Math.max(0, Math.min(7, Math.round(n))) : 0;
  } catch {
    return 0;
  }
}

export function ricordaGradini(n: number): void {
  try {
    localStorage.setItem('radura-gradini', String(n));
  } catch {
    // Pazienza.
  }
}

export function scegliQualita(): Qualita {
  // Le prove automatiche possono imporre valori più leggeri (lì non c'è una vera scheda grafica).
  const forzata = (window as unknown as { raduraQualita?: Partial<Qualita> }).raduraQualita;
  return { ...qualitaDelDispositivo(), ...forzata };
}

function qualitaDelDispositivo(): Qualita {
  const telefono =
    window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (telefono) {
    return {
      telefono, filiErba: 90000, latoErba: 58, fiori: 6500, ombre: true, latoOmbre: 1536, bagliore: true,
      densitaPixel: Math.min(window.devicePixelRatio, 2), scintille: 6000, fumo: 1500, siAdatta: true,
    };
  }
  return {
    telefono, filiErba: 190000, latoErba: 80, fiori: 12000, ombre: true, latoOmbre: 2048, bagliore: true,
    densitaPixel: Math.min(window.devicePixelRatio, 2), scintille: 9000, fumo: 2200, siAdatta: true,
  };
}
