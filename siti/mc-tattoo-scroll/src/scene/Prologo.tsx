// src/scene/Prologo.tsx — il gancio: parla a chi guarda. «Ce l'hai in testa da anni.» nel buio, con
// un punto rosso; scorrendo il sole cresce fino a riempire lo schermo e sul rosso arriva l'invito:
// «È ora di portarlo sulla pelle.», con il pulsante per prenotare già lì.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Rivela } from '../movimento/Rivela.js';
import { Finestra } from '../movimento/Finestra.js';
import { usePronto } from '../regia/Pronto.js';
import { useRegia } from '../regia/Regia.js';
import { studio } from '../dati/studio.js';

export function Prologo(): ReactElement {
  return (
    <Scena id="prologo" pRidotto={0} etichetta="Apertura">
      {(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}
    </Scena>
  );
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const pronto = usePronto();
  const { vai } = useRegia();
  // La scena dura 3,4 schermate; da 0,79 comincia la dissolvenza verso "I dubbi".
  const scalaSole = useTransform(p, [0, 0.14, 0.46], [1, 1.1, 9]);
  const opacitaSole = useTransform(p, [0.5, 0.56], [1, 0]);
  const xRiga1 = useTransform(p, [0.04, 0.34], ['0vw', '-24vw']);
  const xRiga2 = useTransform(p, [0.04, 0.34], ['0vw', '24vw']);
  const scalaTitolo = useTransform(p, [0.04, 0.34], [1, 1.2]);
  const opacitaTitolo = useTransform(p, [0.12, 0.3], [1, 0]);
  const opacitaPiede = useTransform(p, [0, 0.08], [1, 0]);
  const giroKanji = useTransform(p, [0, 0.4], [0, -40]);
  const scalaInvito = useTransform(p, [0.36, 0.5, 1], [0.9, 1, 1.05]);

  const invito = (
    <>
      <p className="prologo__seconda">
        È ora di portarlo
        <br />
        <em>sulla pelle.</em>
      </p>
      <div className="prologo__azioni">
        <button type="button" className="pulsante pulsante--chiaro" onClick={() => vai('finale')}>
          <span>Prenota una consulenza</span>
          <span className="pulsante__freccia" aria-hidden="true">→</span>
        </button>
        <p className="prologo__promessa">{studio.promesse[0]} · oppure scorri: ti togliamo ogni dubbio ↓</p>
      </div>
    </>
  );

  return (
    <div className="prologo">
      <motion.div className="prologo__sole" style={ridotto ? undefined : { scale: scalaSole, opacity: opacitaSole }} aria-hidden="true" />

      <motion.h1 className="prologo__titolo" style={ridotto ? undefined : { scale: scalaTitolo, opacity: opacitaTitolo }}>
        <motion.span className="prologo__riga" style={ridotto ? undefined : { x: xRiga1 }}>
          <Rivela testo="Ce l’hai in testa" subito pronto={pronto} ritardo={0.15} />
        </motion.span>
        <motion.span className="prologo__riga prologo__riga--due" style={ridotto ? undefined : { x: xRiga2 }}>
          <Rivela testo="da anni." subito pronto={pronto} ritardo={0.4} corsivo={['anni']} />
        </motion.span>
      </motion.h1>

      {ridotto ? (
        <div className="prologo__invito prologo__invito--fermo">{invito}</div>
      ) : (
        <Finestra p={p} entra={[0.36, 0.48]} corsa={60} className="prologo__invito">
          <motion.div style={{ scale: scalaInvito }}>{invito}</motion.div>
        </Finestra>
      )}

      <motion.p className="prologo__kanji" style={{ y: giroKanji, opacity: opacitaTitolo }} aria-hidden="true">
        墨 · 針 · 朱
      </motion.p>

      <motion.div className="prologo__piede" style={{ opacity: opacitaPiede }}>
        <p className="etichetta">M.C. Tattoo Studio — tatuaggi su misura</p>
        <p className="prologo__sotto">Un disegno, un nome, una data. Scorri: questa storia è la tua.</p>
        <span className="prologo__scorri etichetta" aria-hidden="true">
          Scorri
          <span className="prologo__linea" />
        </span>
      </motion.div>
    </div>
  );
}
