// src/movimento/Scena.tsx — una scena della storia: una sezione alta più schermate con dentro un
// "palco" che resta fermo mentre si scorre. I figli ricevono l'avanzamento della scena (da 0 a 1).
import { useCallback, useMemo, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { motionValue, useScroll } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { useRegia } from '../regia/Regia.js';
import { capitoloPerId } from '../regia/capitoli.js';

interface PropsScena {
  id: string;
  className?: string;
  /** Avanzamento da usare con il movimento ridotto (predefinito 1: scena completa e ferma). */
  pRidotto?: number;
  /** Nome della sezione per i lettori di schermo. */
  etichetta?: string;
  children: (p: MotionValue<number>, ridotto: boolean) => ReactNode;
}

export function Scena({ id, className, pRidotto = 1, etichetta, children }: PropsScena): ReactElement {
  const cap = capitoloPerId(id);
  const { registra, ridotto } = useRegia();
  const rif = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: rif, offset: ['start start', 'end end'] });
  const fisso = useMemo(() => motionValue(pRidotto), [pRidotto]);

  const aggancia = useCallback(
    (el: HTMLElement | null) => {
      rif.current = el;
      registra(id, el);
    },
    [id, registra],
  );

  const bloccata = !ridotto && cap.schermate !== null;
  return (
    <section
      ref={aggancia}
      id={id}
      aria-label={etichetta ?? (cap.numero ? `Capitolo ${cap.numero}: ${cap.titolo}` : cap.titolo)}
      className={`scena scena--${id}${bloccata ? ' scena--bloccata' : ''}${className ? ` ${className}` : ''}`}
      style={bloccata ? { height: `${(cap.schermate ?? 1) * 100}svh` } : undefined}
    >
      <div className="palco">{children(ridotto ? fisso : scrollYProgress, ridotto)}</div>
    </section>
  );
}
