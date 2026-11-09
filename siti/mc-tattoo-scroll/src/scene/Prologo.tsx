// src/scene/Prologo.tsx — "Il vuoto": buio, una goccia rossa, il titolo. Scorrendo il sole cresce
// e dal suo centro si apre la carta bianca su cui nascerà il disegno.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Rivela } from '../movimento/Rivela.js';
import { usePronto } from '../regia/Pronto.js';
import { TAVOLOZZA } from '../regia/capitoli.js';

export function Prologo(): ReactElement {
  return (
    <Scena id="prologo" pRidotto={0}>
      {(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}
    </Scena>
  );
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const pronto = usePronto();
  const scalaSole = useTransform(p, [0, 0.22, 0.62], [1, 1.08, 3.2]);
  const xRiga1 = useTransform(p, [0.04, 0.5], ['0vw', '-22vw']);
  const xRiga2 = useTransform(p, [0.04, 0.5], ['0vw', '22vw']);
  const scalaTitolo = useTransform(p, [0.04, 0.5], [1, 1.18]);
  const opacitaTitolo = useTransform(p, [0.18, 0.46], [1, 0]);
  const opacitaPiede = useTransform(p, [0, 0.12], [1, 0]);
  const iride = useTransform(p, [0.55, 0.97], [0, 82]);
  const giroKanji = useTransform(p, [0, 0.6], [0, -40]);

  return (
    <div className="prologo">
      <motion.div className="prologo__sole" style={{ scale: scalaSole }} aria-hidden="true" />
      <svg className="prologo__iride" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <filter id="prologo-bordo" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="3" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <motion.circle cx="50" cy="50" r={iride} fill={TAVOLOZZA.carta} filter="url(#prologo-bordo)" />
      </svg>

      <motion.h1 className="prologo__titolo" style={ridotto ? undefined : { scale: scalaTitolo, opacity: opacitaTitolo }}>
        <motion.span className="prologo__riga" style={ridotto ? undefined : { x: xRiga1 }}>
          <Rivela testo="Ogni segno" subito pronto={pronto} ritardo={0.15} />
        </motion.span>
        <motion.span className="prologo__riga prologo__riga--due" style={ridotto ? undefined : { x: xRiga2 }}>
          <Rivela testo="ha una storia." subito pronto={pronto} ritardo={0.35} corsivo={['storia']} />
        </motion.span>
      </motion.h1>

      <motion.p className="prologo__kanji" style={{ y: giroKanji, opacity: opacitaTitolo }} aria-hidden="true">
        墨 · 針 · 朱
      </motion.p>

      <motion.div className="prologo__piede" style={{ opacity: opacitaPiede }}>
        <p className="etichetta">M.C. Tattoo Studio — tatuaggi su misura</p>
        <p className="prologo__invito">
          Scorri e guarda nascere un tatuaggio,
          <br />
          dall’idea alla pelle, in sette capitoli.
        </p>
        <span className="prologo__scorri etichetta" aria-hidden="true">
          Scorri
          <span className="prologo__linea" />
        </span>
      </motion.div>
    </div>
  );
}
