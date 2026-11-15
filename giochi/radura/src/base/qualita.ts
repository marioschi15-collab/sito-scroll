/** Quanto dettaglio mostrare: un telefono regge meno fili d'erba e niente ombre. */
export interface Qualita {
  readonly telefono: boolean;
  readonly filiErba: number;
  readonly latoErba: number;
  readonly fiori: number;
  readonly ombre: boolean;
  readonly bagliore: boolean;
  readonly densitaPixel: number;
  readonly scintille: number;
  readonly fumo: number;
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
      telefono,
      filiErba: 42000,
      latoErba: 46,
      fiori: 3500,
      ombre: false,
      bagliore: false,
      densitaPixel: Math.min(window.devicePixelRatio, 1.5),
      scintille: 3500,
      fumo: 900,
    };
  }
  return {
    telefono,
    filiErba: 130000,
    latoErba: 68,
    fiori: 9000,
    ombre: true,
    bagliore: true,
    densitaPixel: Math.min(window.devicePixelRatio, 1.5),
    scintille: 9000,
    fumo: 2200,
  };
}
