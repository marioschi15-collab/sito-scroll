// src/movimento/Scena.tsx — una scena della storia: una sezione alta più schermate con dentro un
// "palco" che resta fermo mentre si scorre. I figli ricevono l'avanzamento della scena (da 0 a 1).
// Le scene "in dissolvenza" si sovrappongono alla fine della precedente: mentre una sfuma l'altra
// compare nello stesso punto, così il disegno resta sullo schermo da un capitolo all'altro.
import { useCallback, useMemo, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { motion, motionValue, useScroll, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { useRegia } from '../regia/Regia.js';
import { CAPITOLI, SOVRAPPOSTE } from '../regia/capitoli.js';

interface PropsScena {
  id: string;
  className?: string;
  /** Avanzamento da usare con il movimento ridotto (predefinito 1: scena completa e ferma). */
  pRidotto?: number;
  /** Nome della sezione per i lettori di schermo. */
  etichetta?: string;
  children: (p: MotionValue<number>, ridotto: boolean) => ReactNode;
}

/** Quota della dissolvenza in cui ognuna delle due scene cambia opacità (il resto è tenuta). */
const QUOTA = 0.6;

export function Scena({ id, className, pRidotto = 1, etichetta, children }: PropsScena): ReactElement {
  const indice = CAPITOLI.findIndex((c) => c.id === id);
  const cap = CAPITOLI[indice];
  if (!cap) throw new Error(`Capitolo sconosciuto: ${id}`);
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
  const entra = bloccata && cap.dissolvenza === true;
  const esce = bloccata && CAPITOLI[indice + 1]?.dissolvenza === true;
  // Parte dell'avanzamento occupata da una dissolvenza.
  const k = SOVRAPPOSTE / Math.max(0.5, (cap.schermate ?? 2) - 1);
  const opacity = useTransform(scrollYProgress, (v) => {
    let o = 1;
    if (entra) o = Math.min(o, v / (k * QUOTA));
    if (esce) o = Math.min(o, (1 - v) / (k * QUOTA));
    return Math.max(0, Math.min(1, o));
  });
  const visibility = useTransform(opacity, (o) => (o <= 0.001 ? 'hidden' : 'visible'));

  return (
    <section
      ref={aggancia}
      id={id}
      aria-label={etichetta ?? (cap.numero ? `Capitolo ${cap.numero}: ${cap.titolo}` : cap.titolo)}
      className={`scena scena--${id}${bloccata ? ' scena--bloccata' : ''}${className ? ` ${className}` : ''}`}
      style={
        bloccata
          ? { height: `${(cap.schermate ?? 1) * 100}svh`, marginTop: entra ? `${-(1 + SOVRAPPOSTE) * 100}svh` : undefined }
          : undefined
      }
    >
      <motion.div className="palco" style={entra || esce ? { opacity, visibility } : undefined}>
        {children(ridotto ? fisso : scrollYProgress, ridotto)}
      </motion.div>
    </section>
  );
}
