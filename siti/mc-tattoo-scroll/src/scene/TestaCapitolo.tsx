// src/scene/TestaCapitolo.tsx — numero romano e titolo di un capitolo, che entrano con lo scorrimento.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';

interface Props {
  numero: string;
  titolo: string;
  p: MotionValue<number>;
  ridotto: boolean;
  /** Tratto della scena in cui il titolo entra. */
  entra?: readonly [number, number];
  esce?: readonly [number, number];
  className?: string;
}

export function TestaCapitolo({ numero, titolo, p, ridotto, entra = [0, 0.08], esce, className }: Props): ReactElement {
  const ingressi = esce ? [entra[0], entra[1], esce[0], esce[1]] : [entra[0], entra[1]];
  const y = useTransform(p, ingressi, esce ? ['110%', '0%', '0%', '-110%'] : ['110%', '0%']);
  const linea = useTransform(p, ingressi, esce ? [0, 1, 1, 0] : [0, 1]);
  const opacity = useTransform(p, ingressi, esce ? [1, 1, 1, 0] : [1, 1]);
  return (
    <header className={`testa-capitolo${className ? ` ${className}` : ''}`}>
      <motion.p className="testa-capitolo__numero etichetta" style={ridotto ? undefined : { opacity }}>
        <span>Capitolo {numero}</span>
        <motion.span className="testa-capitolo__linea" style={ridotto ? undefined : { scaleX: linea }} />
      </motion.p>
      <h2 className="testa-capitolo__titolo">
        <span className="testa-capitolo__maschera">
          <motion.span style={ridotto ? undefined : { y }} className="testa-capitolo__testo">
            {titolo}
          </motion.span>
        </span>
      </h2>
    </header>
  );
}
