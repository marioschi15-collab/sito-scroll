// src/arte/Koi.tsx — la carpa che risale verso il sole, in tutte le sue vite: pennellate d'inchiostro
// che si tracciano, stencil che si stampa, chiazze rosse che si riempiono, sole che sorge.
// Ogni strato si accende solo se gli si passa il suo avanzamento (da 0 a 1).
import { useId, useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { koi, SOLE, chiazze, corpo } from './koi.js';
import type { Linea, Pennellata } from './koi.js';
import { TAVOLOZZA } from '../regia/capitoli.js';

export type Punta = (q: number) => { x: number; y: number };

export interface PropsKoi {
  tratto?: MotionValue<number>;
  inchiostro?: string;
  stencil?: MotionValue<number>;
  coloreStencil?: string;
  rosso?: MotionValue<number>;
  sole?: MotionValue<number> | number;
  /** Colore delle sagome (corpo e pinne) che coprono il sole dietro. */
  sagome?: string;
  pelle?: boolean;
  /** Riceve la funzione che dice dove si trova la punta del pennello/ago a un certo avanzamento. */
  onPunta?: (punta: Punta) => void;
  titolo?: string;
  className?: string;
}

const pulisci = (s: string): string => s.replace(/[^a-zA-Z0-9_-]/g, '');
const SCAGLIE = (l: Linea): boolean => l.quota !== undefined;

export function Koi(props: PropsKoi): ReactElement {
  const id = pulisci(useId());
  const { titolo, className } = props;
  return (
    <svg
      className={className}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      overflow="visible"
      role={titolo ? 'img' : undefined}
      aria-label={titolo}
      aria-hidden={titolo ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={`${id}-corpo`} clipPathUnits="userSpaceOnUse">
          <path d={corpo} />
        </clipPath>
        <filter id={`${id}-ruvido`} x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="30" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`${id}-bagliore`} x="-10%" y="-600%" width="120%" height="1300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <radialGradient id={`${id}-pelle`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#E6E4E0" />
          <stop offset="0.6" stopColor="#CFCDC9" />
          <stop offset="0.86" stopColor="#BDBDBD" stopOpacity="0.5" />
          <stop offset="1" stopColor="#6B6B6B" stopOpacity="0" />
        </radialGradient>
      </defs>

      {props.pelle ? <circle cx="560" cy="560" r="560" fill={`url(#${id}-pelle)`} /> : null}
      {props.sole !== undefined ? <Sole p={props.sole} /> : null}
      {props.sagome ? (
        <g fill={props.sagome}>
          {koi.sagome.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ) : null}
      {props.rosso ? <StratoRosso id={id} p={props.rosso} /> : null}
      {props.stencil ? <StratoStencil id={id} p={props.stencil} colore={props.coloreStencil ?? TAVOLOZZA.cenere} /> : null}
      {props.tratto ? <StratoInchiostro id={id} p={props.tratto} colore={props.inchiostro ?? TAVOLOZZA.inchiostro} onPunta={props.onPunta} /> : null}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------

function Sole({ p }: { p: MotionValue<number> | number }): ReactElement {
  return (
    <motion.circle
      cx={SOLE.c[0]}
      cy={SOLE.c[1]}
      r={SOLE.r}
      fill={TAVOLOZZA.rosso}
      style={{ scale: p, transformBox: 'fill-box', transformOrigin: 'center' }}
    />
  );
}

function StratoInchiostro({ id, p, colore, onPunta }: { id: string; p: MotionValue<number>; colore: string; onPunta?: PropsKoi['onPunta'] }): ReactElement {
  const guide = useRef<(SVGPathElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!onPunta) return;
    const lunghezze = guide.current.map((el) => (el ? el.getTotalLength() : 0));
    const ordine = koi.pennellate.map((pn, i) => ({ pn, i })).sort((a, b) => a.pn.da - b.pn.da);
    onPunta((q: number) => {
      let scelta = ordine[0]!;
      let t = 0;
      for (const o of ordine) {
        if (q >= o.pn.da) {
          scelta = o;
          t = Math.min(1, (q - o.pn.da) / Math.max(1e-6, o.pn.a - o.pn.da));
        }
        if (q >= o.pn.da && q < o.pn.a) break;
      }
      const el = guide.current[scelta.i];
      if (!el) return { x: 500, y: 500 };
      const pt = el.getPointAtLength(t * (lunghezze[scelta.i] ?? 0));
      return { x: pt.x, y: pt.y };
    });
  }, [onPunta]);

  return (
    <g>
      <g fill={colore}>
        {koi.pennellate.map((pn, i) => (
          <PennellataAnimata
            key={i}
            id={`${id}-p${i}`}
            pn={pn}
            p={p}
            rifGuida={(el) => {
              guide.current[i] = el;
            }}
          />
        ))}
      </g>
      <g fill="none" stroke={colore} strokeLinecap="round" strokeLinejoin="round">
        <g clipPath={`url(#${id}-corpo)`}>
          {koi.linee.filter(SCAGLIE).map((l, i) => (
            <LineaAnimata key={i} l={l} p={p} />
          ))}
        </g>
        {koi.linee
          .filter((l) => !SCAGLIE(l))
          .map((l, i) => (
            <LineaAnimata key={i} l={l} p={p} />
          ))}
      </g>
      <g fill={colore}>
        {koi.gocce.map((g, i) => (
          <Goccia key={i} cx={g.c[0]} cy={g.c[1]} r={g.r} da={g.da} p={p} />
        ))}
      </g>
    </g>
  );
}

function PennellataAnimata({ id, pn, p, rifGuida }: { id: string; pn: Pennellata; p: MotionValue<number>; rifGuida: (el: SVGPathElement | null) => void }): ReactElement {
  const pathLength = useTransform(p, [pn.da, pn.a], [0, 1]);
  const opacity = useTransform(p, [pn.da, pn.da + 0.003], [0, 1]);
  const r = pn.riquadro;
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x={r.x} y={r.y} width={r.w} height={r.h}>
        <motion.path
          ref={rifGuida}
          d={pn.guida}
          fill="none"
          stroke="#fff"
          strokeWidth={pn.larghezza * 2.6 + 6}
          strokeLinecap="butt"
          strokeLinejoin="round"
          style={{ pathLength, opacity }}
        />
      </mask>
      <path d={pn.d} mask={`url(#${id})`} />
    </>
  );
}

function LineaAnimata({ l, p }: { l: Linea; p: MotionValue<number> }): ReactElement {
  const q = l.quota ?? 1;
  const pathLength = useTransform(p, [l.da, l.a], [0, q]);
  const opacity = useTransform(p, [l.da, l.da + 0.003], [0, 1]);
  return <motion.path d={l.d} strokeWidth={l.spessore} style={{ pathLength, opacity }} />;
}

function Goccia({ cx, cy, r, da, p }: { cx: number; cy: number; r: number; da: number; p: MotionValue<number> }): ReactElement {
  const scale = useTransform(p, [da, da + 0.025], [0, 1]);
  return <motion.circle cx={cx} cy={cy} r={r} style={{ scale, transformBox: 'fill-box', transformOrigin: 'center' }} />;
}

function StratoStencil({ id, p, colore }: { id: string; p: MotionValue<number>; colore: string }): ReactElement {
  const altezza = useTransform(p, [0, 1], [0, 1040]);
  const barra = useTransform(p, [0, 1], [-20, 1020]);
  const barraVisibile = useTransform(p, [0, 0.03, 0.96, 1], [0, 1, 1, 0]);
  return (
    <g>
      <clipPath id={`${id}-scan`} clipPathUnits="userSpaceOnUse">
        <motion.rect x="-50" y="-20" width="1100" height={altezza} />
      </clipPath>
      <g clipPath={`url(#${id}-scan)`} fill="none" stroke={colore} strokeLinecap="round" strokeLinejoin="round">
        {koi.pennellate.map((pn, i) => (
          <path key={i} d={pn.guida} strokeWidth={2.4} />
        ))}
        <g clipPath={`url(#${id}-corpo)`} opacity="0.75">
          {koi.linee.filter(SCAGLIE).map((l, i) => (
            <path key={i} d={l.d} strokeWidth={1.4} />
          ))}
        </g>
        {koi.linee
          .filter((l) => !SCAGLIE(l))
          .map((l, i) => (
            <path key={i} d={l.d} strokeWidth={1.4} opacity="0.8" />
          ))}
        <g transform="translate(-3 2)" opacity="0.28">
          {koi.pennellate.map((pn, i) => (
            <path key={i} d={pn.guida} strokeWidth={1.2} />
          ))}
        </g>
      </g>
      <motion.g style={{ opacity: barraVisibile }}>
        <motion.rect x="-60" width="1120" height="14" y={barra} fill={colore} filter={`url(#${id}-bagliore)`} />
        <motion.rect x="-60" width="1120" height="2" y={barra} fill="#FFFFFF" />
      </motion.g>
    </g>
  );
}

function StratoRosso({ id, p }: { id: string; p: MotionValue<number> }): ReactElement {
  return (
    <g clipPath={`url(#${id}-corpo)`}>
      {chiazze.map((c, i) => (
        <Chiazza key={i} id={`${id}-c${i}`} filtro={`${id}-ruvido`} c={c} p={p} da={i * 0.16} />
      ))}
    </g>
  );
}

function Chiazza({ id, filtro, c, p, da }: { id: string; filtro: string; c: (typeof chiazze)[number]; p: MotionValue<number>; da: number }): ReactElement {
  const r = useTransform(p, [da, da + 0.45], [0, c.r * 1.9]);
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">
        <motion.circle cx={c.c[0]} cy={c.c[1]} r={r} fill="#fff" filter={`url(#${filtro})`} />
      </mask>
      <path d={c.d} fill={TAVOLOZZA.rosso} mask={`url(#${id})`} />
    </>
  );
}
