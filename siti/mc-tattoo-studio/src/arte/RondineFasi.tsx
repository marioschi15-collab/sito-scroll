// src/arte/RondineFasi.tsx — la rondine di "Come funziona" nelle quattro fasi (§5.9.4):
// 1 schizzo a matita, 2 stencil tratteggiato, 3 inchiostro (contorni con l'ago), 4 guarito (disegno completo).
// Due SVG sovrapposti con lo stesso viewBox: sotto schizzo e stencil (decorativi), sopra l'inchiostro,
// che è il Disegno della rondine guidato da un solo valore (pInchiostro).
import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react';
import type { MotionValue, Transition } from 'motion/react';
import { EASE_RAPIDA, EASE_TRATTO, EASE_USCITA, QUOTA_TRATTI, TEMPI_DISEGNO, VISTA_DISEGNI } from '../movimento/costanti.js';
import { useMovimentoRidotto } from '../movimento/useMovimentoRidotto.js';
import { Disegno } from './Disegno.js';
import { datiRondine } from './Rondine.js';
import '../stili/figura.css';

export type FaseRondine = 1 | 2 | 3 | 4;
export interface PropsRondineFasi {
  fase: FaseRondine;
  titolo: string;
  animata?: boolean;       // predefinito true
  decorativa?: boolean;
  className?: string;
}

/** Le due copie sfalsate dello schizzo: linee ripassate a mano. */
const COPIE_SCHIZZO = ['translate(1.4 -0.8) rotate(0.4 200 250)', 'translate(-0.9 0.6)'] as const;
/** Opacità dello stencil in ogni fase. */
const OPACITA_STENCIL: Readonly<Record<FaseRondine, number>> = { 1: 0, 2: 1, 3: 0.35, 4: 0 };
/** Traguardo dell'inchiostro in ogni fase: 0 niente, QUOTA_TRATTI solo i tratti, 1 anche campiture e puntinato. */
const TRAGUARDO_INCHIOSTRO: Readonly<Record<FaseRondine, number>> = { 1: 0, 2: 0, 3: QUOTA_TRATTI, 4: 1 };
/** Ogni cambio di opacità di schizzo e stencil dura TEMPI_DISEGNO.faseStencil (0,4 s). */
const T_LIVELLO: Transition = { duration: TEMPI_DISEGNO.faseStencil, ease: EASE_RAPIDA };

/** Tempi del passaggio dell'inchiostro da un traguardo all'altro. */
function transizioneInchiostro(da: number, a: number): Transition {
  // In discesa (si torna su con lo scorrimento): rapido.
  if (a < da) return { duration: TEMPI_DISEGNO.faseIndietro, ease: EASE_RAPIDA };
  // Da 0,8 a 1: entrano campiture e puntinato ("Guarito").
  if (da >= QUOTA_TRATTI) return { duration: TEMPI_DISEGNO.faseGuarito, ease: EASE_USCITA };
  // Fino a 0,8 (fase 3), oppure salto diretto da 2 a 4: 1,2 s.
  return { duration: TEMPI_DISEGNO.faseInchiostro, ease: EASE_TRATTO };
}

export function RondineFasi({ fase, titolo, animata = true, decorativa = false, className }: PropsRondineFasi): ReactElement {
  const ridotto = useMovimentoRidotto();
  const anima = animata && !ridotto;
  const rif = useRef<HTMLSpanElement>(null);

  // Già al primo disegno vale il traguardo della fase: nessuno stato iniziale da recuperare.
  const pInchiostro = useMotionValue(TRAGUARDO_INCHIOSTRO[fase]);
  useEffect(() => {
    const traguardo = TRAGUARDO_INCHIOSTRO[fase];
    if (!anima) {
      pInchiostro.jump(traguardo);
      return;
    }
    const attuale = pInchiostro.get();
    if (attuale === traguardo) return;
    const controlli = animate(pInchiostro, traguardo, transizioneInchiostro(attuale, traguardo));
    return () => controlli.stop();
  }, [fase, anima, pInchiostro]);

  // Lo schizzo si traccia una volta, la prima volta che il pannello entra in vista.
  const pSchizzo = useMotionValue(0);
  const inVista = useInView(rif, VISTA_DISEGNI);
  useEffect(() => {
    if (!anima || !inVista) return;
    const controlli = animate(pSchizzo, 1, { duration: TEMPI_DISEGNO.faseSchizzo, ease: EASE_TRATTO });
    return () => controlli.stop();
  }, [anima, inVista, pSchizzo]);

  return (
    <span ref={rif} className={className ? `rondine-fasi ${className}` : 'rondine-fasi'}>
      <svg
        className="rondine-fasi__livello"
        viewBox={datiRondine.viewBox}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {anima ? (
          <>
            <motion.g className="rondine-fasi__schizzo" initial={false} animate={{ opacity: fase === 1 ? 1 : 0 }} transition={T_LIVELLO}>
              <SchizzoAnimato p={pSchizzo} />
            </motion.g>
            <motion.g className="rondine-fasi__stencil" initial={false} animate={{ opacity: OPACITA_STENCIL[fase] }} transition={T_LIVELLO}>
              <Stencil />
            </motion.g>
          </>
        ) : (
          // Senza animazione ogni livello è subito nel suo stato finale; i livelli invisibili non si disegnano.
          <>
            {fase === 1 ? (
              <g className="rondine-fasi__schizzo">
                <SchizzoStatico />
              </g>
            ) : null}
            {OPACITA_STENCIL[fase] > 0 ? (
              <g className="rondine-fasi__stencil" opacity={OPACITA_STENCIL[fase]}>
                <Stencil />
              </g>
            ) : null}
          </>
        )}
      </svg>
      <Disegno
        dati={datiRondine}
        progresso={pInchiostro}
        conAgo={anima}
        titolo={titolo}
        decorativa={decorativa}
        className="rondine-fasi__livello"
      />
    </span>
  );
}

/** I tratti che lo schizzo ripassa: contorni e interni. */
const TRATTI_SCHIZZO: readonly string[] = [...datiRondine.contorni, ...(datiRondine.interni ?? [])];

function SchizzoStatico(): ReactElement {
  return (
    <>
      {COPIE_SCHIZZO.map((trasforma) => (
        <g key={trasforma} transform={trasforma}>
          {TRATTI_SCHIZZO.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ))}
    </>
  );
}

/** Tutti i tratti dello schizzo seguono lo stesso pSchizzo; a 0 sono nascosti (niente puntini delle terminazioni). */
function SchizzoAnimato({ p }: { p: MotionValue<number> }): ReactElement {
  const iniziato = useTransform(p, (v) => (v > 0 ? 1 : 0));
  return (
    <motion.g style={{ opacity: iniziato }}>
      {COPIE_SCHIZZO.map((trasforma) => (
        <g key={trasforma} transform={trasforma}>
          {TRATTI_SCHIZZO.map((d, i) => (
            <motion.path key={i} d={d} style={{ pathLength: p }} />
          ))}
        </g>
      ))}
    </motion.g>
  );
}

/** Solo i contorni, tratteggiati dal CSS (stroke-dasharray): mai animati con pathLength. */
function Stencil(): ReactElement {
  return (
    <>
      {datiRondine.contorni.map((d: string, i: number) => (
        <path key={i} d={d} />
      ))}
    </>
  );
}
