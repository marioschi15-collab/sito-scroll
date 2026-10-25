// src/movimento/LineaCrescente.tsx — linea sottile che cresce in larghezza (scaleX) quando entra in vista.
import type { ReactElement } from 'react';
import { motion } from 'motion/react';
import { T_LINEA, VISTA } from './costanti.js';
import { useMovimentoRidotto } from './useMovimentoRidotto.js';
import '../stili/etichetta.css';

export interface PropsLineaCrescente {
  className?: string;
  ritardo?: number; // s, predefinito 0
  origine?: 'sinistra' | 'centro'; // predefinito 'sinistra'
}

export function LineaCrescente({ className, ritardo = 0, origine = 'sinistra' }: PropsLineaCrescente): ReactElement {
  const ridotto = useMovimentoRidotto();
  const classi = ['linea-crescente', origine === 'centro' ? 'linea-crescente--centro' : null, className]
    .filter(Boolean)
    .join(' ');
  return (
    <motion.span
      className={classi}
      aria-hidden="true"
      initial={ridotto ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={VISTA}
      transition={{ ...T_LINEA, delay: ritardo }}
    />
  );
}
