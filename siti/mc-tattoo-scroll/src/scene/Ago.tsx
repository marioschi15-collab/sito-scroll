// src/scene/Ago.tsx — Capitolo III, "L'ago": bande da cinema, primissimo piano. La camera segue la
// punta dell'ago lungo la linea che si sta tracciando; alla fine si allontana e mostra il disegno intero.
import { useCallback, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { motion, motionValue, useSpring, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Finestra } from '../movimento/Finestra.js';
import { sposta } from '../movimento/useCamera.js';
import { Koi } from '../arte/Koi.js';
import type { Punta } from '../arte/Koi.js';
import { Macchinetta } from '../arte/Macchinetta.js';
import { TestaCapitolo } from './TestaCapitolo.js';
import { TAVOLOZZA } from '../regia/capitoli.js';
import { morbido } from '../arte/geometria.js';

const ZOOM = 3.6;
const FINE_SEGUITO = 0.8;

export function Ago(): ReactElement {
  return <Scena id="ago">{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

/** Avanzamento del disegno: lento e seguito dalla camera fino a FINE_SEGUITO, poi le onde si chiudono. */
const disegno = (v: number): number => {
  if (v < 0.04) return 0;
  if (v < FINE_SEGUITO) return ((v - 0.04) / (FINE_SEGUITO - 0.04)) * 0.7;
  return Math.min(1, 0.7 + ((v - FINE_SEGUITO) / 0.16) * 0.3);
};

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const punta = useRef<Punta | null>(null);
  const riceviPunta = useCallback((f: Punta) => {
    punta.current = f;
  }, []);

  const tratto = useTransform(p, disegno);
  // Quanto la camera è "lontana": 0 primissimo piano, 1 disegno intero.
  const lontano = useTransform(p, (v) => morbido((v - FINE_SEGUITO) / 0.15));
  const fuocoX = useTransform(p, (v) => {
    const k = punta.current ? punta.current(disegno(v)) : { x: 500, y: 500 };
    const l = morbido((v - FINE_SEGUITO) / 0.15);
    return k.x + (500 - k.x) * l;
  });
  const fuocoY = useTransform(p, (v) => {
    const k = punta.current ? punta.current(disegno(v)) : { x: 500, y: 500 };
    const l = morbido((v - FINE_SEGUITO) / 0.15);
    return k.y + (540 - k.y) * l;
  });
  const fx = useSpring(fuocoX, { stiffness: 220, damping: 32, mass: 0.6 });
  const fy = useSpring(fuocoY, { stiffness: 220, damping: 32, mass: 0.6 });
  const scale = useTransform(lontano, (l) => ZOOM + (0.92 - ZOOM) * l);
  const x = useTransform(() => sposta(scale.get(), fx.get(), 1000));
  const y = useTransform(() => sposta(scale.get(), fy.get(), 1000));

  const macchinaOpacita = useTransform(p, [0.02, 0.06, FINE_SEGUITO, FINE_SEGUITO + 0.05], [0, 1, 1, 0]);
  const macchinaVia = useTransform(p, [FINE_SEGUITO, FINE_SEGUITO + 0.08], ['0%', '40%']);
  const macchinaSu = useTransform(macchinaVia, (v) => `-${v}`);
  const stencilFermo = useMemo(() => motionValue(1), []);
  const colpi = useTransform(p, (v) => Math.round(Math.max(0, v - 0.04) * 61840).toLocaleString('it-IT'));

  return (
    <div className="ago">
      <div className="ago__luce" aria-hidden="true" />
      <div className="ago__inquadratura">
        <motion.div className="ago__camera" style={ridotto ? undefined : { scale, x, y }}>
          <Koi
            pelle
            stencil={stencilFermo}
            coloreStencil={TAVOLOZZA.piombo}
            tratto={tratto}
            onPunta={riceviPunta}
            titolo="La carpa ripassata con l’ago, linea dopo linea"
            className="ago__koi"
          />
        </motion.div>
      </div>
      <div className="ago__vignetta" aria-hidden="true" />

      {!ridotto ? (
        <motion.div className="ago__macchina" style={{ opacity: macchinaOpacita, x: macchinaVia, y: macchinaSu }} aria-hidden="true">
          <div className="ago__vibra">
            <Macchinetta />
          </div>
        </motion.div>
      ) : null}

      <div className="ago__testo">
        <TestaCapitolo numero="III" titolo="L’ago" p={p} ridotto={ridotto} />
        <div className={ridotto ? 'ago__didascalie ago__didascalie--ridotte' : 'ago__didascalie'}>
          <Finestra p={p} entra={[0.06, 0.12]} esce={[0.3, 0.36]} ridotto={ridotto} className="ago__didascalia">
            <p>Aghi e cartucce monouso, aperti davanti a te.</p>
          </Finestra>
          <Finestra p={p} entra={[0.36, 0.42]} esce={[0.58, 0.64]} ridotto={ridotto} className="ago__didascalia">
            <p>Si tende la pelle, si respira, si segue la traccia. Una linea pulita non si improvvisa.</p>
          </Finestra>
          <Finestra p={p} entra={[0.64, 0.7]} esce={ridotto ? undefined : [0.84, 0.9]} ridotto={ridotto} className="ago__didascalia">
            <p>Migliaia di colpi al minuto. Una sola linea, quella giusta.</p>
          </Finestra>
        </div>
      </div>

      <div className="ago__lettura" aria-hidden="true">
        <p className="etichetta">
          <span className="ago__rec" /> Rec
        </p>
        <p className="etichetta">Colpi</p>
        <motion.p className="ago__colpi">{colpi}</motion.p>
      </div>
    </div>
  );
}
