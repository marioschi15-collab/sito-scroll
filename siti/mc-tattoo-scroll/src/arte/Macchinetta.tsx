// src/arte/Macchinetta.tsx — la macchinetta a penna del tatuatore, vista di tre quarti.
// La punta dell'ago è nell'angolo in basso a sinistra del disegno (0, 400): la scena la allinea
// al centro dello schermo, dove la camera tiene la linea che si sta tracciando.
import type { ReactElement } from 'react';
import { TAVOLOZZA } from '../regia/capitoli.js';

export function Macchinetta({ className }: { className?: string }): ReactElement {
  const T = TAVOLOZZA;
  return (
    <svg className={className} viewBox="0 0 400 400" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="macchinetta-metallo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A3A3A" />
          <stop offset="0.35" stopColor="#9A9A9A" />
          <stop offset="0.5" stopColor="#E6E4E0" />
          <stop offset="0.65" stopColor="#7A7A7A" />
          <stop offset="1" stopColor="#1C1C1C" />
        </linearGradient>
        <linearGradient id="macchinetta-cartuccia" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#BDBDBD" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#F4F2EE" stopOpacity="0.8" />
          <stop offset="1" stopColor="#6B6B6B" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g transform="rotate(-45 0 400)">
        {/* ago */}
        <rect x="0" y="398.6" width="34" height="2.8" rx="1.4" fill="#D9D9D9" />
        {/* cartuccia trasparente */}
        <path d="M30 392 L96 386 L96 414 L30 408 Z" fill="url(#macchinetta-cartuccia)" stroke="#E6E4E0" strokeWidth="1" />
        <rect x="96" y="382" width="10" height="36" rx="3" fill={T.rosso} />
        {/* impugnatura zigrinata */}
        <rect x="106" y="380" width="96" height="40" rx="8" fill="url(#macchinetta-metallo)" />
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1={112 + i * 6.5} y1="382" x2={112 + i * 6.5} y2="418" stroke="#111" strokeOpacity="0.35" strokeWidth="1.4" />
        ))}
        {/* corpo motore */}
        <rect x="202" y="374" width="150" height="52" rx="14" fill="#1C1C1C" stroke="#3A3A3A" />
        <rect x="214" y="380" width="126" height="6" rx="3" fill="#E6E4E0" opacity="0.25" />
        <circle cx="330" cy="400" r="6" fill={T.rosso} />
        <rect x="352" y="388" width="40" height="24" rx="6" fill="#2B2B2B" />
        <path d="M392 400 C430 400 440 420 470 430" stroke="#2B2B2B" strokeWidth="8" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
