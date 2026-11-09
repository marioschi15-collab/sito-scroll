// src/interfaccia/Precarica.tsx — il sipario d'apertura: un contatore che sale mentre una goccia rossa
// si allarga, poi il nero si alza. Con il movimento ridotto non compare.
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';

export function Precarica({ onFine }: { onFine: () => void }): ReactElement {
  const [visibile, setVisibile] = useState(true);
  const n = useMotionValue(0);
  const testo = useTransform(n, (v) => String(Math.round(v)).padStart(3, '0'));
  const goccia = useTransform(n, [0, 100], [0.15, 1]);
  useEffect(() => {
    const controlli = animate(n, 100, { duration: 1.9, ease: [0.65, 0, 0.35, 1] });
    void controlli.then(() => {
      setVisibile(false);
      onFine();
    });
    return () => controlli.stop();
  }, [n, onFine]);
  return (
    <AnimatePresence>
      {visibile ? (
        <motion.div
          className="precarica"
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 1, ease: [0.76, 0, 0.24, 1] } }}
          aria-hidden="true"
        >
          <motion.span className="precarica__goccia" style={{ scale: goccia }} />
          <p className="precarica__marchio">M.C.</p>
          <p className="precarica__riga etichetta">
            <span>Preparo l’inchiostro</span>
            <motion.span>{testo}</motion.span>
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
