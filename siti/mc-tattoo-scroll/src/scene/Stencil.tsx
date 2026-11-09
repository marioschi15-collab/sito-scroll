// src/scene/Stencil.tsx — Capitolo II, "Lo stencil": una barra di luce stampa il disegno a rovescio,
// poi il foglio si gira e si appoggia sulla pelle. Lo sfondo scende dal grigio al quasi nero.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Finestra } from '../movimento/Finestra.js';
import { Koi } from '../arte/Koi.js';
import { TestaCapitolo } from './TestaCapitolo.js';

export function Stencil(): ReactElement {
  return <Scena id="stencil">{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const stampa = useTransform(p, [0.06, 0.5], [0, 1]);
  const giro = useTransform(p, [0.56, 0.86], [180, 0]);
  const inclina = useTransform(p, [0, 0.56, 0.86], [-14, -8, 0]);
  const scala = useTransform(p, [0, 0.56, 0.86, 1], [0.82, 0.9, 1.04, 1.1]);
  const ombra = useTransform(p, [0.56, 0.86], [0.1, 0.55]);
  const percento = useTransform(p, (v) => `${String(Math.round(Math.min(1, Math.max(0, (v - 0.06) / 0.44)) * 100)).padStart(3, '0')}%`);
  const stato = useTransform(p, (v): string => (v < 0.56 ? 'stampa a specchio' : v < 0.86 ? 'trasferimento' : 'sulla pelle'));
  const xParola = useTransform(p, [0, 1], ['8%', '-22%']);
  const filtroOmbra = useTransform(ombra, (o) => `drop-shadow(0 30px 60px rgb(0 0 0 / ${o}))`);

  return (
    <div className="stencil">
      <motion.p className="stencil__parola" style={{ x: xParola }} aria-hidden="true">
        Stencil
      </motion.p>

      <div className="stencil__palco3d">
        <motion.div
          className="stencil__foglio"
          style={ridotto ? undefined : { rotateY: giro, rotate: inclina, scale: scala, filter: filtroOmbra }}
        >
          <Koi stencil={stampa} titolo="Lo stencil della carpa, a linee sottili" className="stencil__koi" />
        </motion.div>
      </div>

      <div className="stencil__testo">
        <TestaCapitolo numero="II" titolo="Lo stencil" p={p} ridotto={ridotto} />
        <Finestra p={p} entra={[0.08, 0.18]} ridotto={ridotto} className="stencil__corpo">
          <p>
            Il disegno diventa una mappa: viene stampato a rovescio su carta da trasferimento e appoggiato sulla pelle. Prima
            di un solo punto d’inchiostro, ti guardi allo specchio e decidi tu.
          </p>
        </Finestra>
      </div>

      <div className="stencil__lettura" aria-hidden="true">
        <p className="etichetta">Trasferimento</p>
        <motion.p className="stencil__percento">{percento}</motion.p>
        <motion.p className="etichetta stencil__stato">{stato}</motion.p>
      </div>
    </div>
  );
}
