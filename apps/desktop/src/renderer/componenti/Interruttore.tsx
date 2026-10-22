import type { ReactNode } from 'react';

interface Props {
  acceso: boolean;
  etichetta: string;
  /** Etichetta per chi usa un lettore di schermo, se quella visibile non basta. */
  etichettaAria?: string;
  disabilitato?: boolean;
  onCambia(acceso: boolean): void;
}

/** Interruttore acceso/spento accessibile (role="switch", tastiera: Spazio e Invio). */
export function Interruttore({ acceso, etichetta, etichettaAria, disabilitato, onCambia }: Props): ReactNode {
  return (
    <label className="interruttore">
      <button
        type="button"
        role="switch"
        aria-checked={acceso}
        aria-label={etichettaAria ?? etichetta}
        className="interruttore__pista"
        disabled={disabilitato}
        onClick={() => onCambia(!acceso)}
      />
      <span>{etichetta}</span>
    </label>
  );
}
