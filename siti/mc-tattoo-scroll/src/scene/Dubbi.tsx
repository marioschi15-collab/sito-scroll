// src/scene/Dubbi.tsx — Capitolo I, "I dubbi": le quattro paure che tengono le persone lontane da uno
// studio di tatuaggi. Ogni domanda arriva nel buio, una pennellata rossa la cancella, lo schermo
// diventa bianco e arriva la risposta. Poi di nuovo buio, per il dubbio successivo.
//
// ATTENZIONE: le risposte sono promesse fatte al cliente. Il titolare deve confermarle una per una.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { TestaCapitolo } from './TestaCapitolo.js';
import { DUBBI_INIZIO, DUBBI_PASSO, DUBBIO_RITORNO, DUBBIO_SVOLTA, TAVOLOZZA } from '../regia/capitoli.js';
import { casuale, pennellata } from '../arte/geometria.js';
import type { Pt } from '../arte/geometria.js';

interface Dubbio {
  domanda: string;
  risposta: string;
  dettaglio: string;
  /** Dove sta il blocco nell'inquadratura: ogni dubbio ha la sua. */
  lato: 'sinistra' | 'destra' | 'centro';
  inclina: number;
}

export const DUBBI: readonly Dubbio[] = [
  {
    domanda: 'E se poi mi stanco?',
    risposta: 'Lo disegniamo insieme.',
    dettaglio: 'Non si tatua niente che tu non abbia visto, provato sulla pelle e approvato. Finché non dici «è lui», si ritocca.',
    lato: 'sinistra',
    inclina: -2,
  },
  {
    domanda: 'E se fa male?',
    risposta: 'Si va al tuo ritmo.',
    dettaglio: 'Si sente, non te lo nascondiamo. Ma ci fermiamo ogni volta che vuoi: la seduta la guidi tu.',
    lato: 'destra',
    inclina: 2,
  },
  {
    domanda: 'E se non è sicuro?',
    risposta: 'Tutto monouso, aperto davanti a te.',
    dettaglio: 'Aghi e cartucce nuovi per ogni persona, superfici sanificate a ogni seduta. Puoi guardare ogni passaggio.',
    lato: 'sinistra',
    inclina: -1.5,
  },
  {
    domanda: 'E se costa troppo?',
    risposta: 'Il prezzo lo sai prima.',
    dettaglio: 'Alla consulenza ti diamo un preventivo chiaro. Decidi con calma, senza impegno e senza sorprese dopo.',
    lato: 'centro',
    inclina: 0,
  },
];

export function Dubbi(): ReactElement {
  return <Scena id="dubbi">{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const indice = useTransform(p, (v) => {
    const i = Math.min(DUBBI.length - 1, Math.max(0, Math.floor((v - DUBBI_INIZIO) / DUBBI_PASSO)));
    return `${String(i + 1).padStart(2, '0')} / ${String(DUBBI.length).padStart(2, '0')}`;
  });

  if (ridotto) {
    return (
      <div className="dubbi dubbi--ridotti">
        <TestaCapitolo numero="I" titolo="I dubbi" p={p} ridotto />
        <ol className="dubbi__elenco">
          {DUBBI.map((d) => (
            <li key={d.domanda}>
              <p className="dubbi__domanda-piccola">{d.domanda}</p>
              <h3>{d.risposta}</h3>
              <p>{d.dettaglio}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="dubbi">
      <div className="dubbi__testa">
        <TestaCapitolo numero="I" titolo="I dubbi" p={p} ridotto={false} entra={[0.04, 0.09]} />
        <motion.p className="dubbi__conta etichetta" aria-hidden="true">
          {indice}
        </motion.p>
      </div>
      <ol className="dubbi__palco">
        {DUBBI.map((d, i) => (
          <BloccoDubbio key={d.domanda} d={d} i={i} p={p} ultimo={i === DUBBI.length - 1} />
        ))}
      </ol>
    </div>
  );
}

function BloccoDubbio({ d, i, p, ultimo }: { d: Dubbio; i: number; p: MotionValue<number>; ultimo: boolean }): ReactElement {
  const da = DUBBI_INIZIO + i * DUBBI_PASSO;
  /** Punto della scena che corrisponde a una frazione (0–1) di questo dubbio. */
  const t = (x: number): number => da + x * DUBBI_PASSO;
  const fine = ultimo ? [0.94, 1] : DUBBIO_RITORNO;

  // La domanda: entra, la camera le si avvicina piano, poi sale e rimpicciolisce per far posto alla risposta.
  const opacita = useTransform(p, [t(0), t(0.1), t(fine[0] - 0.02), t(fine[1] - 0.02)], [0, 1, 1, 0]);
  const visibility = useTransform(opacita, (o) => (o < 0.02 ? 'hidden' : 'visible'));
  const zoom = useTransform(p, [t(0), t(DUBBIO_SVOLTA[0])], [0.94, 1.05]);
  const entraY = useTransform(p, [t(0), t(0.1)], [70, 0]);
  const domandaScala = useTransform(p, [t(DUBBIO_SVOLTA[0]), t(DUBBIO_SVOLTA[1] + 0.06)], [1, 0.36]);
  const domandaOpacita = useTransform(p, [t(DUBBIO_SVOLTA[0]), t(DUBBIO_SVOLTA[1] + 0.06)], [1, 0.55]);
  // La pennellata rossa che cancella il dubbio.
  const taglio = useTransform(p, [t(0.28), t(DUBBIO_SVOLTA[0] + 0.02)], [100, 0]);
  const ritaglio = useTransform(taglio, (v) => `inset(-20% ${v}% -20% 0)`);
  // La risposta.
  const rispostaOpacita = useTransform(p, [t(DUBBIO_SVOLTA[1]), t(DUBBIO_SVOLTA[1] + 0.1)], [0, 1]);
  const rispostaY = useTransform(p, [t(DUBBIO_SVOLTA[1]), t(DUBBIO_SVOLTA[1] + 0.12)], [80, 0]);
  const dettaglioOpacita = useTransform(p, [t(DUBBIO_SVOLTA[1] + 0.08), t(DUBBIO_SVOLTA[1] + 0.18)], [0, 1]);

  const segno = useMemo(() => {
    const c = casuale(40 + i * 13);
    const punti: Pt[] = Array.from({ length: 28 }, (_, k) => {
      const x = k / 27;
      return [x * 1000, 60 + 26 * Math.sin(x * 3.1 + i) * (0.4 + c() * 0.3) - x * 26];
    });
    return pennellata(punti, 74, (s) => (0.5 + 0.5 * Math.sin(Math.PI * Math.pow(s, 0.6))) * (1 - 0.5 * s * s) + 0.06 * Math.sin(s * 40));
  }, [i]);

  return (
    <motion.li className={`dubbio dubbio--${d.lato}`} style={{ opacity: opacita, visibility, scale: zoom, y: entraY, rotate: d.inclina }}>
      <motion.p className="dubbio__domanda" style={{ scale: domandaScala, opacity: domandaOpacita }}>
        <span className="dubbio__testo-domanda">{d.domanda}</span>
        <motion.svg className="dubbio__segno" viewBox="0 0 1000 120" preserveAspectRatio="none" style={{ clipPath: ritaglio }} aria-hidden="true">
          <path d={segno} fill={TAVOLOZZA.rosso} />
        </motion.svg>
      </motion.p>
      <motion.h3 className="dubbio__risposta" style={{ opacity: rispostaOpacita, y: rispostaY }}>
        {d.risposta}
      </motion.h3>
      <motion.p className="dubbio__dettaglio" style={{ opacity: dettaglioOpacita }}>
        {d.dettaglio}
      </motion.p>
    </motion.li>
  );
}
