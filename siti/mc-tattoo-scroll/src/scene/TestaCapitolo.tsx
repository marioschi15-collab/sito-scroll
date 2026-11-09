// src/scene/TestaCapitolo.tsx — numero romano e titolo di un capitolo.
// Due modi di entrare: seguendo lo scorrimento (scene in dissolvenza, dove serve un momento preciso)
// oppure da solo, appena il titolo è in vista (scene che salgono dal basso).
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';

interface Props {
  numero: string;
  titolo: string;
  p: MotionValue<number>;
  ridotto: boolean;
  /** Tratto della scena in cui il titolo entra. Senza, entra da solo quando è in vista. */
  entra?: readonly [number, number];
  esce?: readonly [number, number];
  className?: string;
}

const CURVA = [0.22, 1, 0.36, 1] as const;

export function TestaCapitolo({ numero, titolo, p, ridotto, entra, esce, className }: Props): ReactElement {
  // Senza `entra` questi valori non vengono usati: restano solo perché gli hook non possono mancare.
  const e = entra ?? ([0, 0.001] as const);
  const ingressi = esce ? [e[0], e[1], esce[0], esce[1]] : [e[0], e[1]];
  const y = useTransform(p, ingressi, esce ? ['110%', '0%', '0%', '-110%'] : ['110%', '0%']);
  const linea = useTransform(p, ingressi, esce ? [0, 1, 1, 0] : [0, 1]);
  const opacity = useTransform(p, ingressi, esce ? [0, 1, 1, 0] : [0, 1]);
  const classe = `testa-capitolo${className ? ` ${className}` : ''}`;

  if (ridotto) {
    return (
      <header className={classe}>
        <p className="testa-capitolo__numero etichetta">
          <span>Capitolo {numero}</span>
          <span className="testa-capitolo__linea" />
        </p>
        <h2 className="testa-capitolo__titolo">{titolo}</h2>
      </header>
    );
  }

  // Entrata "a tempo": la innesca l'intestazione (che non si sposta), non il testo dentro la maschera.
  const aTempo = entra === undefined;
  return (
    <motion.header
      className={classe}
      {...(aTempo ? { initial: 'giu', whileInView: 'su', viewport: { amount: 0.6 } } : {})}
    >
      <motion.p className="testa-capitolo__numero etichetta" style={aTempo ? undefined : { opacity }}>
        <span>Capitolo {numero}</span>
        <motion.span
          className="testa-capitolo__linea"
          style={aTempo ? undefined : { scaleX: linea }}
          variants={aTempo ? { giu: { scaleX: 0 }, su: { scaleX: 1, transition: { duration: 1.2, ease: CURVA, delay: 0.15 } } } : undefined}
        />
      </motion.p>
      <h2 className="testa-capitolo__titolo">
        <span className="testa-capitolo__maschera">
          <motion.span
            className="testa-capitolo__testo"
            style={aTempo ? undefined : { y }}
            variants={aTempo ? { giu: { y: '110%' }, su: { y: '0%', transition: { duration: 1.2, ease: CURVA } } } : undefined}
          >
            {titolo}
          </motion.span>
        </span>
      </h2>
    </motion.header>
  );
}
