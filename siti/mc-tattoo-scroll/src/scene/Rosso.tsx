// src/scene/Rosso.tsx — Capitolo V, "Fatto per durare": il colore arriva per ultimo. Sorge il sole dietro la
// carpa, le chiazze si riempiono, poi la camera si tuffa nel sole finché tutto lo schermo è rosso.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { motion, motionValue, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Finestra } from '../movimento/Finestra.js';
import { VISTA_INTERA, useCamera } from '../movimento/useCamera.js';
import type { Fotogramma } from '../movimento/useCamera.js';
import { Koi } from '../arte/Koi.js';
import { SOLE } from '../arte/koi.js';
import { TestaCapitolo } from './TestaCapitolo.js';
import { useRegia } from '../regia/Regia.js';
import { TAVOLOZZA } from '../regia/capitoli.js';

// Tempi della scena (4,8 schermate). Fino a 0,13 dissolvenza in entrata sopra la fine di "Mano ferma":
// per questo la camera parte dalla stessa figura intera.
const CAMERA: readonly Fotogramma[] = [
  { p: 0, ...VISTA_INTERA, r: 0 },
  { p: 0.2, ...VISTA_INTERA, r: 0 },
  { p: 0.52, s: 1, fx: 540, fy: 480, r: 0 },
  { p: 0.6, s: 1.15, fx: SOLE.c[0], fy: SOLE.c[1] + 40, r: 0 },
  { p: 0.8, s: 11, fx: SOLE.c[0] + 70, fy: SOLE.c[1] - 70, r: -6 },
  { p: 1, s: 11, fx: SOLE.c[0] + 70, fy: SOLE.c[1] - 70, r: -6 },
];

export function Rosso(): ReactElement {
  return <Scena id="rosso" pRidotto={0.56}>{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const { vai } = useRegia();
  const intero = useMemo(() => motionValue(1), []);
  const sole = useTransform(p, [0.2, 0.4], [0, 1]);
  const rosso = useTransform(p, [0.3, 0.56], [0, 1]);
  const camera = useCamera(p, CAMERA);
  const cameraOpacita = useTransform(p, [0.78, 0.84], [1, 0]);
  const titoloScala = useTransform(p, [0.82, 1], [0.86, 1]);
  return (
    <div className="rosso">
      <div className="rosso__inquadratura">
        <motion.div className="quadro rosso__camera" style={ridotto ? undefined : { ...camera, opacity: cameraOpacita }}>
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
        <TestaCapitolo numero="V" titolo="Fatto per durare" p={p} ridotto={ridotto} entra={[0.12, 0.19]} esce={ridotto ? undefined : [0.54, 0.6]} />
        <Finestra p={p} entra={[0.18, 0.25]} esce={ridotto ? undefined : [0.52, 0.58]} ridotto={ridotto} className="rosso__corpo">
          <p>
            Il colore arriva per ultimo: pieno, profondo, steso con cura. E prima di salutarti ti spieghiamo come curarlo,
            perché resti così.
          </p>
        </Finestra>
      </div>

      {!ridotto ? (
        <Finestra p={p} entra={[0.8, 0.88]} sfoca className="rosso__finale">
          <motion.p className="rosso__grande" style={{ scale: titoloScala }} aria-hidden="true">
            朱
          </motion.p>
          <p className="rosso__frase corsivo">E da quel giorno è tuo. Per sempre.</p>
          <button type="button" className="pulsante pulsante--chiaro" onClick={() => vai('finale')}>
            <span>Voglio il mio</span>
            <span className="pulsante__freccia" aria-hidden="true">→</span>
          </button>
        </Finestra>
      ) : null}
    </div>
  );
}
