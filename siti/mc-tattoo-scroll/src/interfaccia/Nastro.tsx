// src/interfaccia/Nastro.tsx — una fascia di testo che scorre da sola e accelera (e si inclina)
// con la velocità dello scorrimento.
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';

export function Nastro({ testo, velocita = 40 }: { testo: string; velocita?: number }): ReactElement {
  const { scrollY } = useScroll();
  const v = useVelocity(scrollY);
  const morbida = useSpring(v, { damping: 50, stiffness: 300 });
  const fattore = useTransform(morbida, [-2000, 0, 2000], [-4, 1, 6], { clamp: false });
  const inclina = useTransform(morbida, [-2500, 0, 2500], [-6, 0, 6]);
  const base = useMotionValue(0);
  const verso = useRef(1);
  useAnimationFrame((_, delta) => {
    const f = fattore.get();
    if (f < 0) verso.current = -1;
    else if (f > 0) verso.current = 1;
    let next = base.get() - verso.current * (velocita / 1000) * delta * Math.max(1, Math.abs(f)) * 0.1;
    // Il testo è ripetuto quattro volte: quando ne è passato un quarto si riparte, senza salti.
    if (next <= -25) next += 25;
    if (next > 0) next -= 25;
    base.set(next);
  });
  const x = useTransform(base, (b) => `${b}%`);
  return (
    <div className="nastro" aria-hidden="true">
      <motion.div className="nastro__riga" style={{ x, skewX: inclina }}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="nastro__pezzo">
            {testo}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
