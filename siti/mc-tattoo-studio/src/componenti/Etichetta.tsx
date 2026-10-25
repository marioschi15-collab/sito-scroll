// src/componenti/Etichetta.tsx — l'etichetta numerata delle sezioni: una linea che cresce e, sotto, "01 — Lo studio".
import type { ReactElement } from 'react';
import { motion } from 'motion/react';
import { LineaCrescente } from '../movimento/LineaCrescente.js';
import { EASE_USCITA, VISTA } from '../movimento/costanti.js';
import { useMovimentoRidotto } from '../movimento/useMovimentoRidotto.js';
import '../stili/etichetta.css';

export interface PropsEtichetta {
  numero: string;
  testo: string;
  className?: string;
}

export function Etichetta({ numero, testo, className }: PropsEtichetta): ReactElement {
  const ridotto = useMovimentoRidotto();
  return (
    <div className={className ? `etichetta ${className}` : 'etichetta'}>
      <LineaCrescente />
      <motion.p
        className="etichetta__testo t-etichetta t-secondario"
        initial={ridotto ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VISTA}
        transition={{ duration: 0.4, delay: 0.2, ease: EASE_USCITA }}
      >
        {`${numero} — ${testo}`}
      </motion.p>
    </div>
  );
}
