// src/scene/Stencil.tsx — Capitolo III, "Lo provi addosso": una barra di luce stampa il disegno a rovescio,
// poi il foglio si gira e si appoggia sulla pelle. Alla fine il disegno si ferma esattamente
// nell'inquadratura da cui parte "L'ago": le due scene si fondono senza stacco.
import type { CSSProperties, ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Finestra } from '../movimento/Finestra.js';
import { VISTA_INTERA, sposta } from '../movimento/useCamera.js';
import { Koi } from '../arte/Koi.js';
import { TestaCapitolo } from './TestaCapitolo.js';

// Tempi della scena (3,6 schermate; da 0,81 comincia la dissolvenza verso "L'ago").
const STAMPA = [0.02, 0.4] as const;
const GIRO = [0.44, 0.64] as const;
const POSA = [0.64, 0.78] as const;

export function Stencil(): ReactElement {
  return <Scena id="stencil">{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const stampa = useTransform(p, [...STAMPA], [0, 1]);
  const giro = useTransform(p, [...GIRO], [180, 0]);
  const inclina = useTransform(p, [0, GIRO[0], GIRO[1]], [-12, -7, 0]);
  const scala = useTransform(p, [0, GIRO[0], GIRO[1], POSA[1]], [0.8, 0.86, 0.98, VISTA_INTERA.s]);
  const y = useTransform(p, [...POSA], ['0%', sposta(VISTA_INTERA.s, VISTA_INTERA.fy, 1000)]);
  // Durante la scena il foglio sta spostato per lasciare posto al testo; alla fine torna al centro.
  const scosta = useTransform(p, [...POSA], [1, 0]);
  const alone = useTransform(p, [...POSA], [1, 0]);
  const contorno = useTransform(p, [0.68, 0.78], [1, 0]);
  const percento = useTransform(p, (v) => {
    const k = Math.min(1, Math.max(0, (v - STAMPA[0]) / (STAMPA[1] - STAMPA[0])));
    return `${String(Math.round(k * 100)).padStart(3, '0')}%`;
  });
  const stato = useTransform(p, (v): string => (v < GIRO[0] ? 'stampa di prova' : v < GIRO[1] ? 'si appoggia' : 'sulla tua pelle'));
  const xParola = useTransform(p, [0, 1], ['8%', '-22%']);

  return (
    <div className="stencil">
      <motion.p className="stencil__parola" style={{ x: xParola, opacity: ridotto ? 1 : contorno }} aria-hidden="true">
        Prova
      </motion.p>

      <div className="stencil__palco3d">
        <motion.div className="stencil__scosta" style={ridotto ? undefined : ({ '--k': scosta } as unknown as CSSProperties)}>
          <motion.div
            className="quadro stencil__foglio"
            style={ridotto ? undefined : { rotateY: giro, rotate: inclina, scale: scala, y }}
          >
            <motion.span className="stencil__alone" style={ridotto ? undefined : { opacity: alone }} />
            <Koi stencil={stampa} titolo="Lo stencil della carpa, a linee sottili" className="stencil__koi" />
          </motion.div>
        </motion.div>
      </div>

      <motion.div className="stencil__testo" style={ridotto ? undefined : { opacity: contorno }}>
        <TestaCapitolo numero="III" titolo="Lo provi addosso" p={p} ridotto={ridotto} />
        <Finestra p={p} entra={[0.03, 0.1]} ridotto={ridotto} className="stencil__corpo">
          <p>
            Prima di un solo punto d’inchiostro, il disegno si appoggia sulla tua pelle. Ti guardi allo specchio: più su,
            più grande, più piccolo. Si sposta finché non è al posto giusto. Decidi tu.
          </p>
        </Finestra>
      </motion.div>

      <motion.div className="stencil__lettura" style={ridotto ? undefined : { opacity: contorno }} aria-hidden="true">
        <p className="etichetta">Prova sulla pelle</p>
        <motion.p className="stencil__percento">{percento}</motion.p>
        <motion.p className="etichetta stencil__stato">{stato}</motion.p>
      </motion.div>
    </div>
  );
}
