// src/scene/Manifesto.tsx — intermezzo su fondo rosso: le parole si accendono una alla volta.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Parole } from '../movimento/Finestra.js';

const TESTO =
  'Non facciamo tatuaggi in serie. Disegniamo un segno alla volta, per una persona alla volta, e ci prendiamo tutto il tempo che serve perché sia tuo per sempre.';

export function Manifesto(): ReactElement {
  return (
    <Scena id="manifesto" etichetta="Il nostro modo di lavorare">
      {(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}
    </Scena>
  );
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const giro = useTransform(p, [0, 1], [0, 120]);
  const firma = useTransform(p, [0.8, 0.9], [0, 1]);
  return (
    <div className="manifesto">
      <motion.svg className="manifesto__cerchio" viewBox="0 0 200 200" style={{ rotate: giro }} aria-hidden="true">
        <defs>
          <path id="manifesto-giro" d="M100 18 A82 82 0 1 1 99.9 18" />
        </defs>
        <text className="manifesto__giro">
          <textPath href="#manifesto-giro">Un segno alla volta · Una persona alla volta · Solo su appuntamento ·</textPath>
        </text>
      </motion.svg>
      <p className="manifesto__etichetta etichetta">Manifesto</p>
      {ridotto ? (
        <p className="manifesto__testo">{TESTO}</p>
      ) : (
        <Parole p={p} testo={TESTO} da={0.08} a={0.78} className="manifesto__testo" evidenzia={['segno', 'persona', 'sempre']} />
      )}
      <motion.p className="manifesto__firma corsivo" style={ridotto ? undefined : { opacity: firma }}>
        — M.C.
      </motion.p>
    </div>
  );
}
