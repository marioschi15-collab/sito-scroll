import type { ReactNode } from 'react';

interface Props {
  frazione: number;
  etichetta: string;
}

/** Barra di avanzamento 0-1 con etichetta per i lettori di schermo. */
export function Barra({ frazione, etichetta }: Props): ReactNode {
  const pct = Math.max(0, Math.min(100, Math.round(frazione * 100)));
  return (
    <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={etichetta}>
      <div className="barra__riempimento" style={{ width: `${pct}%` }} />
    </div>
  );
}
