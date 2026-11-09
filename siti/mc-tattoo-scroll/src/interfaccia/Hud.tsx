// src/interfaccia/Hud.tsx — i dettagli da macchina da presa sopra la storia: bande da cinema, mirini
// agli angoli, codice di tempo legato allo scorrimento, linea d'avanzamento a destra, grana.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import { useRegia } from '../regia/Regia.js';
import { CAPITOLI } from '../regia/capitoli.js';

/** La storia intera "dura" tre minuti di pellicola a 24 fotogrammi al secondo. */
const DURATA = 180;

function codice(v: number): string {
  const s = v * DURATA;
  const pad = (n: number): string => String(Math.floor(n)).padStart(2, '0');
  return `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}:${pad((s * 24) % 24)}`;
}

export function Hud(): ReactElement {
  const { avanzamento, attivo } = useRegia();
  const tempo = useTransform(avanzamento, codice);
  const scorriVia = useTransform(avanzamento, [0, 0.015], [1, 0]);
  const scena = String(attivo).padStart(2, '0');
  return (
    <div className="hud" aria-hidden="true">
      <div className="bande bande--su" />
      <div className="bande bande--giu" />
      <div className="grana" />
      <span className="mirino mirino--1" />
      <span className="mirino mirino--2" />
      <span className="mirino mirino--3" />
      <span className="mirino mirino--4" />
      <p className="hud__tempo etichetta">
        <span className="hud__scena">Sc {scena}</span>
        <motion.span>{tempo}</motion.span>
      </p>
      <motion.p className="hud__scorri etichetta" style={{ opacity: scorriVia }}>
        Scorri ↓
      </motion.p>
      <div className="hud__barra">
        <motion.span className="hud__riempi" style={{ scaleY: avanzamento }} />
        {CAPITOLI.map((c, i) => (
          <span key={c.id} className={`hud__tacca${i <= attivo ? ' hud__tacca--fatta' : ''}`} style={{ top: `${(i / (CAPITOLI.length - 1)) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
