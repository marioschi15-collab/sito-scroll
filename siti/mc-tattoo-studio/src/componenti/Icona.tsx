// src/componenti/Icona.tsx — icone a linea 24×24 che prendono colore e misura dal testo (currentColor, 1em).
import type { ReactElement } from 'react';
import '../stili/pulsante.css';

export type NomeIcona =
  | 'freccia-destra'
  | 'freccia-su'
  | 'freccia-esterna'
  | 'piu'
  | 'chiudi'
  | 'chat'
  | 'busta'
  | 'telefono';

export interface PropsIcona {
  nome: NomeIcona;
  className?: string;
}

const TRACCIATI: Readonly<Record<NomeIcona, string>> = {
  'freccia-destra': 'M4 12h15 M13 6l6 6-6 6',
  'freccia-su': 'M12 20V5 M6 11l6-6 6 6',
  'freccia-esterna': 'M7 17L17 7 M9 7h8v8',
  piu: 'M5 12h14 M12 5v14',
  chiudi: 'M6 6l12 12 M18 6L6 18',
  chat: 'M5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V5.5A1.5 1.5 0 0 1 5.5 4z',
  busta: 'M3 6h18v12H3z M3 7l9 6 9-6',
  telefono:
    'M7 3h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L21 13.5V17a2 2 0 0 1-2 2A16 16 0 0 1 5 5a2 2 0 0 1 2-2z',
};

export function Icona({ nome, className }: PropsIcona): ReactElement {
  return (
    <svg
      className={className ? `icona ${className}` : 'icona'}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRACCIATI[nome]} />
    </svg>
  );
}
