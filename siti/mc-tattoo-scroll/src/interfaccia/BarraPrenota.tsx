// src/interfaccia/BarraPrenota.tsx — il pulsante per prenotare che accompagna tutta la storia:
// compare dopo l'apertura (che ha già il suo) e sparisce quando si arriva al modulo.
import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRegia } from '../regia/Regia.js';
import { CAPITOLI } from '../regia/capitoli.js';
import { studio } from '../dati/studio.js';

export function BarraPrenota(): ReactElement {
  const { attivo, vai } = useRegia();
  const visibile = attivo >= 1 && attivo < CAPITOLI.length - 1;
  return (
    <AnimatePresence>
      {visibile ? (
        <motion.div
          className="barra-prenota"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <button type="button" className="barra-prenota__pulsante" onClick={() => vai('finale')}>
            <span className="barra-prenota__punto" aria-hidden="true" />
            <span>Prenota la consulenza</span>
            <span className="barra-prenota__sotto">
              {studio.primaDataLibera ? `Prima data libera: ${studio.primaDataLibera}` : studio.promesse[0]}
            </span>
            <span className="pulsante__freccia" aria-hidden="true">→</span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
