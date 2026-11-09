// src/scene/Idea.tsx — Capitolo I, "L'idea": sulla carta bianca la carpa si disegna a pennello mentre
// la camera parte dall'occhio e si allontana fino a mostrare il foglio intero, con il sigillo rosso.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Finestra } from '../movimento/Finestra.js';
import { useCamera } from '../movimento/useCamera.js';
import type { Fotogramma } from '../movimento/useCamera.js';
import { Koi } from '../arte/Koi.js';
import { TestaCapitolo } from './TestaCapitolo.js';

const CAMERA: readonly Fotogramma[] = [
  { p: 0, s: 3.1, fx: 585, fy: 255, r: -4 },
  { p: 0.32, s: 2, fx: 520, fy: 420, r: -2 },
  { p: 0.68, s: 1.05, fx: 500, fy: 520, r: 0 },
  { p: 1, s: 0.98, fx: 500, fy: 520, r: 0 },
];

const NOTE = [
  { testo: 'più movimento nella coda', classe: 'idea__nota--1', da: 0.5 },
  { testo: 'il sole: rosso pieno ●', classe: 'idea__nota--2', da: 0.6 },
  { testo: 'spalla → avambraccio', classe: 'idea__nota--3', da: 0.7 },
] as const;

export function Idea(): ReactElement {
  return <Scena id="idea">{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const tratto = useTransform(p, [0.04, 0.86], [0, 1]);
  const camera = useCamera(p, CAMERA);
  const sigillo = useTransform(p, [0.86, 0.92], [0, 1]);
  const sigilloScala = useTransform(p, [0.86, 0.92], [1.6, 1]);
  const foglioY = useTransform(p, [0, 1], ['3%', '-3%']);
  return (
    <div className="idea">
      <div className="idea__testo">
        <TestaCapitolo numero="I" titolo="L’idea" p={p} ridotto={ridotto} />
        <Finestra p={p} entra={[0.06, 0.16]} ridotto={ridotto} className="idea__corpo">
          <p>
            Tutto comincia da una frase detta a voce bassa: un ricordo, un nome, una data. La ascoltiamo con calma, poi il
            pennello prova a darle una forma.
          </p>
        </Finestra>
        <Finestra p={p} entra={[0.42, 0.54]} ridotto={ridotto} className="idea__citazione">
          <p className="corsivo">«Una carpa che risale la corrente. Perché io non mi sono mai arreso.»</p>
        </Finestra>
      </div>

      <motion.div className="idea__foglio" style={ridotto ? undefined : { y: foglioY }}>
        <div className="idea__inquadratura">
          <motion.div className="idea__camera" style={ridotto ? undefined : camera}>
            <Koi tratto={tratto} titolo="Schizzo a pennello di una carpa koi che risale le onde" className="idea__koi" />
          </motion.div>
        </div>
        <motion.div className="idea__sigillo" style={{ opacity: sigillo, scale: sigilloScala }} aria-hidden="true">
          <span>M</span>
          <span>C</span>
        </motion.div>
        <span className="idea__pagina etichetta" aria-hidden="true">
          tav. 01 — sumi su carta
        </span>
        {NOTE.map((n) => (
          <Finestra key={n.classe} p={p} entra={[n.da, n.da + 0.08]} corsa={12} ridotto={ridotto} className={`idea__nota ${n.classe}`}>
            <span aria-hidden="true">{n.testo}</span>
          </Finestra>
        ))}
      </motion.div>
    </div>
  );
}
