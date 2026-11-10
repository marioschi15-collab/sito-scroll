// src/scene/Ago.tsx — Capitolo IV, "Mano ferma": la scena nasce in dissolvenza sullo stencil appena posato,
// poi la camera si avvicina, scendono le bande da cinema e l'inquadratura segue la punta dell'ago lungo
// la linea che si sta tracciando. Alla fine torna a figura intera, dove comincia "Il rosso".
import { useCallback, useRef } from 'react';
import type { ReactElement } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Finestra } from '../movimento/Finestra.js';
import { VISTA_INTERA, sposta } from '../movimento/useCamera.js';
import { Koi } from '../arte/Koi.js';
import type { Punta } from '../arte/Koi.js';
import { Macchinetta } from '../arte/Macchinetta.js';
import { TestaCapitolo } from './TestaCapitolo.js';
import { TAVOLOZZA } from '../regia/capitoli.js';
import { morbido } from '../arte/geometria.js';

const ZOOM = 3.6;
// Tempi della scena (5 schermate). Fino a 0,125 dissolvenza in entrata; da 0,875 in uscita.
const AVVICINA = [0.13, 0.21] as const;
const SEGUE = [0.21, 0.74] as const;
const ALLONTANA = [0.74, 0.86] as const;
/** Parte del disegno tracciata in primissimo piano (il resto, le onde, si chiude mentre ci si allontana). */
const QUOTA_VICINA = 0.7;

export function Ago(): ReactElement {
  return <Scena id="ago">{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

/** Avanzamento del disegno lungo la scena. */
function disegno(v: number): number {
  if (v <= SEGUE[0]) return 0;
  if (v < SEGUE[1]) return ((v - SEGUE[0]) / (SEGUE[1] - SEGUE[0])) * QUOTA_VICINA;
  return Math.min(1, QUOTA_VICINA + ((v - ALLONTANA[0]) / (ALLONTANA[1] - ALLONTANA[0])) * (1 - QUOTA_VICINA));
}

/** Quanto la camera è lontana: 1 figura intera, 0 primissimo piano. */
function lontananza(v: number): number {
  if (v < SEGUE[0]) return 1 - morbido((v - AVVICINA[0]) / (AVVICINA[1] - AVVICINA[0]));
  return morbido((v - ALLONTANA[0]) / (ALLONTANA[1] - ALLONTANA[0]));
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const punta = useRef<Punta | null>(null);
  const riceviPunta = useCallback((f: Punta) => {
    punta.current = f;
  }, []);

  const tratto = useTransform(p, disegno);
  const lontano = useTransform(p, lontananza);
  const fuocoX = useTransform(p, (v) => {
    const k = punta.current ? punta.current(disegno(v)) : { x: VISTA_INTERA.fx, y: VISTA_INTERA.fy };
    return k.x + (VISTA_INTERA.fx - k.x) * lontananza(v);
  });
  const fuocoY = useTransform(p, (v) => {
    const k = punta.current ? punta.current(disegno(v)) : { x: VISTA_INTERA.fx, y: VISTA_INTERA.fy };
    return k.y + (VISTA_INTERA.fy - k.y) * lontananza(v);
  });
  // La molla ammorbidisce i salti da una pennellata alla successiva.
  const fx = useSpring(fuocoX, { stiffness: 220, damping: 32, mass: 0.6 });
  const fy = useSpring(fuocoY, { stiffness: 220, damping: 32, mass: 0.6 });
  const scale = useTransform(lontano, (l) => ZOOM + (VISTA_INTERA.s - ZOOM) * l);
  const x = useTransform(() => sposta(scale.get(), fx.get(), 1000));
  const y = useTransform(() => sposta(scale.get(), fy.get(), 1000));

  const vicino = useTransform(lontano, (l) => 1 - l);
  const macchinaOpacita = useTransform(p, [SEGUE[0] - 0.03, SEGUE[0] + 0.01, SEGUE[1], SEGUE[1] + 0.04], [0, 1, 1, 0]);
  const macchinaVia = useTransform(p, [SEGUE[0] - 0.03, SEGUE[0] + 0.01, SEGUE[1], SEGUE[1] + 0.06], ['30%', '0%', '0%', '40%']);
  const macchinaSu = useTransform(macchinaVia, (v) => `-${v}`);
  const colpi = useTransform(p, (v) => Math.round(disegno(v) * 43210).toLocaleString('it-IT'));

  return (
    <div className="ago">
      <div className="ago__inquadratura">
        <motion.div className="quadro ago__camera" style={ridotto ? undefined : { scale, x, y }}>
          <Koi
            pelle
            stencil
            coloreStencil={TAVOLOZZA.piombo}
            tratto={tratto}
            onPunta={riceviPunta}
            titolo="La carpa ripassata con l’ago, linea dopo linea"
            className="ago__koi"
          />
        </motion.div>
      </div>
      {!ridotto ? <motion.div className="ago__vignetta" style={{ opacity: vicino }} aria-hidden="true" /> : null}

      {!ridotto ? (
        <motion.div className="ago__macchina" style={{ opacity: macchinaOpacita, x: macchinaVia, y: macchinaSu }} aria-hidden="true">
          <div className="ago__vibra">
            <Macchinetta />
          </div>
        </motion.div>
      ) : null}

      <div className="ago__testo">
        <TestaCapitolo numero="IV" titolo="Mano ferma" p={p} ridotto={ridotto} entra={[0.09, 0.15]} esce={ridotto ? undefined : [0.8, 0.86]} />
        <div className={ridotto ? 'ago__didascalie ago__didascalie--ridotte' : 'ago__didascalie'}>
          <Finestra p={p} entra={[0.22, 0.26]} esce={[0.36, 0.39]} ridotto={ridotto} className="ago__didascalia">
            <p>Materiale monouso, aperto davanti a te. Lo vedi con i tuoi occhi.</p>
          </Finestra>
          <Finestra p={p} entra={[0.4, 0.44]} esce={[0.54, 0.57]} ridotto={ridotto} className="ago__didascalia">
            <p>Serve una pausa? Ci fermiamo. Il ritmo della seduta lo decidi tu.</p>
          </Finestra>
          <Finestra p={p} entra={[0.58, 0.62]} esce={ridotto ? undefined : [0.73, 0.77]} ridotto={ridotto} className="ago__didascalia">
            <p>Linee pulite, tirate con calma. Fatte per restare belle negli anni.</p>
          </Finestra>
        </div>
      </div>

      <Finestra p={p} entra={[0.18, 0.22]} esce={ridotto ? undefined : [0.76, 0.82]} corsa={0} ridotto={ridotto} className="ago__lettura">
        <p className="etichetta" aria-hidden="true">
          <span className="ago__rec" /> Rec
        </p>
        <p className="etichetta" aria-hidden="true">Colpi</p>
        <motion.p className="ago__colpi" aria-hidden="true">{colpi}</motion.p>
      </Finestra>
    </div>
  );
}
