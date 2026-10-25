// src/componenti/AvvisoBreve.tsx — una pillola che compare in basso per qualche secondo ("Messaggio copiato").
// Il contenitore role="status" è sempre montato, così i lettori di schermo leggono ogni nuovo avviso.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { T_RAPIDA, T_USCITA } from '../movimento/costanti.js';
import { useMovimentoRidotto } from '../movimento/useMovimentoRidotto.js';
import '../stili/avviso.css';

export interface PropsAvvisoBreve {
  messaggio: string | null;
  onScaduto: () => void;
  durata?: number; // ms, predefinito 2500
}

export function AvvisoBreve({ messaggio, onScaduto, durata = 2500 }: PropsAvvisoBreve): ReactElement {
  const ridotto = useMovimentoRidotto();

  // onScaduto può cambiare a ogni disegno del genitore: il timer non deve ripartire per questo.
  const rifScaduto = useRef(onScaduto);
  useLayoutEffect(() => {
    rifScaduto.current = onScaduto;
  });

  useEffect(() => {
    if (messaggio === null) return;
    const timer = window.setTimeout(() => rifScaduto.current(), durata);
    return () => window.clearTimeout(timer);
  }, [messaggio, durata]);

  return createPortal(
    <div role="status" aria-live="polite" className="avviso">
      <AnimatePresence mode="wait">
        {messaggio !== null ? (
          <motion.p
            key={messaggio}
            className="avviso__pillola t-piccolo"
            initial={{ opacity: 0, y: ridotto ? 0 : 16 }}
            animate={{ opacity: 1, y: 0, transition: T_RAPIDA }}
            exit={{ opacity: 0, transition: T_USCITA }}
          >
            {messaggio}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
