import { useEffect, useRef, type ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';

interface Props {
  passo: number;
  totale: number;
  titolo: string;
  children: ReactNode;
}

/** Cornice comune delle schermate di S0: numero del passo, titolo (che prende il fuoco al cambio), contenuto. */
export function Cornice({ passo, totale, titolo, children }: Props): ReactNode {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    h1.current?.focus();
  }, [titolo]);
  return (
    <main className="procedura">
      <div className="procedura__corpo">
        <div className="procedura__passo">{finestra.s0.passo(passo, totale)}</div>
        <h1 ref={h1} tabIndex={-1}>
          {titolo}
        </h1>
        {children}
      </div>
    </main>
  );
}
