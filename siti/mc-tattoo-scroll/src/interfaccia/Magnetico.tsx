// src/interfaccia/Magnetico.tsx — un collegamento che viene leggermente "attirato" dal puntatore.
import { useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { motion, useSpring } from 'motion/react';

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
  esterno?: boolean;
}

export function Magnetico({ href, className, children, esterno = false }: Props): ReactElement {
  const rif = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 220, damping: 18 });
  const y = useSpring(0, { stiffness: 220, damping: 18 });
  return (
    <motion.a
      ref={rif}
      href={href}
      className={className}
      style={{ x, y }}
      {...(esterno ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !rif.current) return;
        const r = rif.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.28);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.36);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.a>
  );
}
