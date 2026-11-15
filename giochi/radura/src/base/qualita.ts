/** Quanto dettaglio mostrare. Si parte alti: se il dispositivo fatica, il gioco alleggerisce da solo (vedi main). */
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
  /** Se vero, il gioco abbassa da solo il dettaglio quando i fotogrammi al secondo scendono troppo. */
  readonly siAdatta: boolean;
}

export type Grafica = 'automatica' | 'alta' | 'leggera';
const CHIAVE = 'radura-grafica';

export function graficaScelta(): Grafica {
  try {
    const v = localStorage.getItem(CHIAVE);
    if (v === 'alta' || v === 'leggera') return v;
  } catch {
    // Senza memoria del browser si resta su "automatica".
  }
  return 'automatica';
}

export function ricordaGrafica(g: Grafica): void {
  try {
    localStorage.setItem(CHIAVE, g);
  } catch {
    // Pazienza: varrà solo per questa partita.
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
  const grafica = graficaScelta();
  if (grafica === 'leggera') {
    return {
      telefono, filiErba: 42000, latoErba: 46, fiori: 3500, ombre: false, latoOmbre: 1024, bagliore: false,
      densitaPixel: Math.min(window.devicePixelRatio, 1.5), scintille: 3500, fumo: 900, siAdatta: false,
    };
  }
  if (telefono) {
    return {
      telefono, filiErba: 90000, latoErba: 58, fiori: 6500, ombre: true, latoOmbre: 1536, bagliore: true,
      densitaPixel: Math.min(window.devicePixelRatio, 2), scintille: 6000, fumo: 1500, siAdatta: grafica === 'automatica',
    };
  }
  return {
    telefono, filiErba: 150000, latoErba: 72, fiori: 10000, ombre: true, latoOmbre: 2048, bagliore: true,
    densitaPixel: Math.min(window.devicePixelRatio, 2), scintille: 9000, fumo: 2200, siAdatta: grafica === 'automatica',
  };
}
