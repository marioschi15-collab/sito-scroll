// src/scene/Rosso.tsx — Capitolo IV, "Il rosso": il colore arriva per ultimo. Sorge il sole dietro la
// carpa, le chiazze si riempiono, poi la camera si tuffa nel sole finché tutto lo schermo è rosso.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { motion, motionValue, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Finestra } from '../movimento/Finestra.js';
import { useCamera } from '../movimento/useCamera.js';
import type { Fotogramma } from '../movimento/useCamera.js';
import { Koi } from '../arte/Koi.js';
import { SOLE } from '../arte/koi.js';
import { TestaCapitolo } from './TestaCapitolo.js';
import { TAVOLOZZA } from '../regia/capitoli.js';

const CAMERA: readonly Fotogramma[] = [
  { p: 0, s: 0.86, fx: 520, fy: 520, r: 3 },
  { p: 0.5, s: 1, fx: 540, fy: 480, r: 0 },
  { p: 0.62, s: 1.15, fx: SOLE.c[0], fy: SOLE.c[1] + 40, r: 0 },
  { p: 0.86, s: 11, fx: SOLE.c[0] + 70, fy: SOLE.c[1] - 70, r: -6 },
  { p: 1, s: 11, fx: SOLE.c[0] + 70, fy: SOLE.c[1] - 70, r: -6 },
];

export function Rosso(): ReactElement {
  return <Scena id="rosso" pRidotto={0.55}>{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const intero = useMemo(() => motionValue(1), []);
  const sole = useTransform(p, [0.06, 0.32], [0, 1]);
  const rosso = useTransform(p, [0.22, 0.56], [0, 1]);
  const camera = useCamera(p, CAMERA);
  const cameraOpacita = useTransform(p, [0.84, 0.9], [1, 0]);
  const titoloScala = useTransform(p, [0.8, 1], [0.86, 1]);
  return (
    <div className="rosso">
      <div className="rosso__inquadratura">
        <motion.div className="rosso__camera" style={ridotto ? undefined : { ...camera, opacity: cameraOpacita }}>
          <Koi
            pelle
            sagome={TAVOLOZZA.carta}
            sole={sole}
            rosso={rosso}
            tratto={intero}
            titolo="La carpa finita: chiazze rosse sul corpo e il sole rosso alle spalle"
            className="rosso__koi"
          />
        </motion.div>
      </div>

      <div className="rosso__testo">
        <TestaCapitolo numero="IV" titolo="Il rosso" p={p} ridotto={ridotto} esce={ridotto ? undefined : [0.56, 0.62]} />
        <Finestra p={p} entra={[0.08, 0.16]} esce={ridotto ? undefined : [0.54, 0.6]} ridotto={ridotto} className="rosso__corpo">
          <p>
            Un solo colore, scelto con cura. Il rosso giapponese entra per ultimo: pieno, profondo, steso a strati finché la
            pelle lo trattiene.
          </p>
        </Finestra>
      </div>

      {!ridotto ? (
        <Finestra p={p} entra={[0.8, 0.9]} sfoca className="rosso__finale">
          <motion.p className="rosso__grande" style={{ scale: titoloScala }} aria-hidden="true">
            朱
          </motion.p>
          <p className="rosso__frase corsivo">Il colore arriva per ultimo, come il sole all’alba.</p>
        </Finestra>
      ) : null}
    </div>
  );
}
