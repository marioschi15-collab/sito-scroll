// src/movimento/Finestra.tsx — un blocco che compare (e, se serve, scompare) in un tratto della scena;
// Parole accende le parole di una frase una alla volta seguendo lo scorrimento.
import type { CSSProperties, ElementType, ReactElement, ReactNode } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';

interface PropsFinestra {
  p: MotionValue<number>;
  /** [inizio entrata, fine entrata] */
  entra: readonly [number, number];
  /** [inizio uscita, fine uscita]; senza, il blocco resta. */
  esce?: readonly [number, number];
  corsa?: number;
  sfoca?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  ridotto?: boolean;
  as?: 'div' | 'p' | 'li';
}

export function Finestra({ p, entra, esce, corsa = 40, sfoca = false, className, style, children, ridotto = false, as = 'div' }: PropsFinestra): ReactElement {
  const ingressi = esce ? [entra[0], entra[1], esce[0], esce[1]] : [entra[0], entra[1]];
  const opacity = useTransform(p, ingressi, esce ? [0, 1, 1, 0] : [0, 1]);
  const y = useTransform(p, ingressi, esce ? [corsa, 0, 0, -corsa] : [corsa, 0]);
  const filter = useTransform(p, ingressi, (esce ? [10, 0, 0, 10] : [10, 0]).map((v) => `blur(${sfoca ? v : 0}px)`));
  // Un blocco invisibile non deve ricevere clic né il fuoco.
  const visibility = useTransform(opacity, (o) => (o < 0.02 ? 'hidden' : 'visible'));
  if (ridotto) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }
  const M = as === 'p' ? motion.p : as === 'li' ? motion.li : motion.div;
  return (
    <M className={className} style={{ ...style, opacity, y, filter, visibility }}>
      {children}
    </M>
  );
}

interface PropsParole {
  p: MotionValue<number>;
  testo: string;
  da: number;
  a: number;
  spento?: number;
  as?: ElementType;
  className?: string;
  /** Parole da mettere in evidenza (confronto senza punteggiatura). */
  evidenzia?: readonly string[];
}

/** Le parole si accendono una dopo l'altra mentre p va da `da` ad `a`. */
export function Parole({ p, testo, da, a, spento = 0.18, as: Tag = 'p', className, evidenzia = [] }: PropsParole): ReactElement {
  const parole = testo.split(' ');
  const n = parole.length;
  return (
    <Tag className={className} aria-label={testo}>
      {parole.map((w, i) => {
        const s = da + ((a - da) * i) / n;
        const e = Math.min(1, s + ((a - da) / n) * 2.4);
        const pulita = w.replace(/[.,;:!?«»“”]/g, '');
        return (
          <Parola key={i} p={p} s={s} e={e} spento={spento} evidenza={evidenzia.includes(pulita)}>
            {w}
          </Parola>
        );
      })}
    </Tag>
  );
}

function Parola({ p, s, e, spento, evidenza, children }: { p: MotionValue<number>; s: number; e: number; spento: number; evidenza: boolean; children: ReactNode }): ReactElement {
  const opacity = useTransform(p, [s, e], [spento, 1]);
  return (
    <motion.span aria-hidden="true" className={evidenza ? 'parola parola--evidenza' : 'parola'} style={{ opacity }}>
      {children}{' '}
    </motion.span>
  );
}
