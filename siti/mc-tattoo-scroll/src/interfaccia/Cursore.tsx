// src/interfaccia/Cursore.tsx — puntatore su misura (solo con il mouse): un punto preciso e un anello
// che lo insegue e si allarga sopra link e pulsanti.
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export function Cursore(): ReactElement | null {
  const [attivo, setAttivo] = useState(false);
  const [sopra, setSopra] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ax = useSpring(x, { stiffness: 260, damping: 26, mass: 0.5 });
  const ay = useSpring(y, { stiffness: 260, damping: 26, mass: 0.5 });

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine) and (hover: hover)');
    if (!fine.matches) return;
    setAttivo(true);
    document.documentElement.classList.add('cursore-proprio');
    const muovi = (e: PointerEvent): void => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      setSopra(Boolean(t?.closest('a, button')));
    };
    window.addEventListener('pointermove', muovi, { passive: true });
    return () => {
      window.removeEventListener('pointermove', muovi);
      document.documentElement.classList.remove('cursore-proprio');
    };
  }, [x, y]);

  if (!attivo) return null;
  return (
    <div className="cursore" aria-hidden="true">
      <motion.span className="cursore__punto" style={{ x, y }} />
      <motion.span className="cursore__anello" style={{ x: ax, y: ay }} animate={{ scale: sopra ? 2.2 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} />
    </div>
  );
}
