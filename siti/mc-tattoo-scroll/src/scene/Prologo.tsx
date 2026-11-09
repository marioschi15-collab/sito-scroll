// src/scene/Prologo.tsx — "Il vuoto": buio, una goccia rossa, il titolo. Scorrendo il sole cresce
// e dal suo centro si apre la carta bianca su cui nascerà il disegno.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Rivela } from '../movimento/Rivela.js';
import { usePronto } from '../regia/Pronto.js';
import { TAVOLOZZA } from '../regia/capitoli.js';
import { macchia } from '../arte/geometria.js';

export function Prologo(): ReactElement {
  return (
    <Scena id="prologo" pRidotto={0}>
      {(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}
    </Scena>
  );
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const pronto = usePronto();
  // La scena dura 3,2 schermate e l'ultimo tratto (da 0,77) è la dissolvenza verso "L'idea":
  // per allora la carta deve aver già coperto tutto.
  const scalaSole = useTransform(p, [0, 0.2, 0.56], [1, 1.08, 3.2]);
  const xRiga1 = useTransform(p, [0.04, 0.42], ['0vw', '-22vw']);
  const xRiga2 = useTransform(p, [0.04, 0.42], ['0vw', '22vw']);
  const scalaTitolo = useTransform(p, [0.04, 0.42], [1, 1.18]);
  const opacitaTitolo = useTransform(p, [0.16, 0.38], [1, 0]);
  const opacitaPiede = useTransform(p, [0, 0.08], [1, 0]);
  // La carta si apre come una macchia d'inchiostro dal bordo irregolare (raggio 100 a scala 1).
  const macchiaCarta = useMemo(() => macchia(5, 0.15), []);
  const iride = useTransform(p, [0.4, 0.76], [0, 0.74]);
  const irideGiro = useTransform(p, [0.4, 0.76], [-30, 10]);
  const giroKanji = useTransform(p, [0, 0.5], [0, -40]);

  return (
    <div className="prologo">
      <motion.div className="prologo__sole" style={{ scale: scalaSole }} aria-hidden="true" />
      <svg className="prologo__iride" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g transform="translate(50 50)">
          <motion.path d={macchiaCarta} fill={TAVOLOZZA.carta} style={{ scale: iride, rotate: irideGiro }} />
        </g>
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
