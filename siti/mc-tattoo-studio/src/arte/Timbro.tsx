// src/arte/Timbro.tsx — timbro circolare "PRONTO" che si posa sul biglietto dopo un invio valido (§5.9.5).
// Solo forma: posizione, entrata e uscita le decide chi lo usa (Prenota). È decorativo: la conferma è nel testo.
import { useId } from 'react';
import type { ReactElement } from 'react';
import '../stili/figura.css';

export interface PropsTimbro { className?: string }

/** Cerchio guida di raggio 49, percorso in senso orario dall'alto: lo segue la scritta. */
const GUIDA = 'M 60 11 a 49 49 0 1 1 0 98 a 49 49 0 1 1 0 -98';

export function Timbro({ className }: PropsTimbro): ReactElement {
  const idGuida = `${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-guida`;
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      className={className ? `timbro ${className}` : 'timbro'}
    >
      <defs>
        <path id={idGuida} d={GUIDA} />
      </defs>
      <g className="timbro__inchiostro">
        <circle className="timbro__anello" cx={60} cy={60} r={56} strokeWidth={2} />
        <circle className="timbro__anello" cx={60} cy={60} r={42} strokeWidth={1} />
        {/* dominant-baseline central: la scritta sta a metà della fascia tra i due anelli. */}
        <text className="timbro__giro" fontSize={9.5} dominantBaseline="central">
          <textPath href={`#${idGuida}`} textLength="300" lengthAdjust="spacing">
            PRONTO · M.C. TATTOO STUDIO ·
          </textPath>
        </text>
        <text className="timbro__sigla" x={60} y={70} fontSize={28} textAnchor="middle">
          M.C.
        </text>
      </g>
    </svg>
  );
}
