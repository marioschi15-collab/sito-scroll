// src/arte/disegniStili.tsx — i cinque piccoli disegni della scena "Gli stili", tutti originali e
// calcolati: si tracciano mentre il loro pannello arriva al centro (p da 0 a 1). Colore: currentColor.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { casuale, liscia } from './geometria.js';
import type { Pt } from './geometria.js';
import { TAVOLOZZA } from '../regia/capitoli.js';

interface PropsDisegno {
  p: MotionValue<number>;
  className?: string;
}

function Tratto({ d, p, da, a, w = 2, colore = 'currentColor' }: { d: string; p: MotionValue<number>; da: number; a: number; w?: number; colore?: string }): ReactElement {
  const pathLength = useTransform(p, [da, a], [0, 1]);
  const opacity = useTransform(p, [da, da + 0.01], [0, 1]);
  return (
    <motion.path d={d} fill="none" stroke={colore} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ pathLength, opacity }} />
  );
}

function Compare({ p, da, a, children }: { p: MotionValue<number>; da: number; a: number; children: ReactElement | ReactElement[] }): ReactElement {
  const opacity = useTransform(p, [da, a], [0, 1]);
  const scale = useTransform(p, [da, a], [0.6, 1]);
  return <motion.g style={{ opacity, scale, transformBox: 'fill-box', transformOrigin: 'center' }}>{children}</motion.g>;
}

const svgBase = { viewBox: '0 0 400 400', 'aria-hidden': true, focusable: 'false' } as const;

// ———————————————————————————— Giapponese: onda che si arriccia e sole ————————————————————————————
const ONDA = (() => {
  const creste: string[] = [];
  const spirale = (cx: number, cy: number, r: number, giri: number): Pt[] => {
    const out: Pt[] = [];
    for (let k = 0; k <= 60 * giri; k++) {
      const x = k / 60;
      const th = Math.PI + x * Math.PI * 2;
      const rr = r * (1 - 0.7 * (x / giri));
      out.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]);
    }
    return out;
  };
  creste.push(liscia([[20, 330], [70, 300], [120, 250], [150, 190], ...spirale(205, 175, 55, 1.15)]));
  creste.push(liscia([[20, 350], [90, 325], [150, 285], [190, 245], [240, 228], [290, 238]]));
  creste.push(liscia([[30, 372], [120, 352], [210, 318], [280, 300], [350, 312], [390, 330]]));
  // artigli di schiuma lungo la cresta
  const artigli: string[] = [];
  for (let i = 0; i < 6; i++) {
    const th = Math.PI * (1.05 + i * 0.13);
    const x = 205 + Math.cos(th) * 55;
    const y = 175 + Math.sin(th) * 55;
    artigli.push(liscia([[x, y], [x - 10 - i * 1.5, y - 14], [x - 4, y - 24]]));
  }
  // seigaiha: archi concentrici in basso
  const archi: string[] = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 6; c++) {
      const cx = 30 + c * 70 + (r % 2) * 35;
      const cy = 400 - r * 22;
      for (const rr of [32, 22, 12]) archi.push(`M${cx - rr} ${cy} A${rr} ${rr} 0 0 1 ${cx + rr} ${cy}`);
    }
  }
  return { creste, artigli, archi };
})();

export function DisegnoGiapponese({ p, className }: PropsDisegno): ReactElement {
  const sole = useTransform(p, [0.05, 0.4], [0, 1]);
  return (
    <svg className={className} {...svgBase}>
      <motion.circle cx="300" cy="105" r="62" fill={TAVOLOZZA.rosso} style={{ scale: sole, transformBox: 'fill-box', transformOrigin: 'center' }} />
      {ONDA.creste.map((d, i) => (
        <Tratto key={i} d={d} p={p} da={0.1 + i * 0.12} a={0.55 + i * 0.12} w={i === 0 ? 7 : 4} />
      ))}
      {ONDA.artigli.map((d, i) => (
        <Tratto key={`a${i}`} d={d} p={p} da={0.5 + i * 0.03} a={0.62 + i * 0.03} w={3} />
      ))}
      {ONDA.archi.map((d, i) => (
        <Tratto key={`s${i}`} d={d} p={p} da={0.55 + (i % 18) * 0.015} a={0.75 + (i % 18) * 0.015} w={2} />
      ))}
    </svg>
  );
}

// ———————————————————————————— Blackwork: geometria sacra ————————————————————————————
const GEO = (() => {
  const cx = 200;
  const cy = 200;
  const cerchi = [150, 118, 64, 22].map((r) => `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`);
  const petali: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = a + Math.PI / 12;
    const c = a - Math.PI / 12;
    const P = (ang: number, r: number): string => `${(cx + Math.cos(ang) * r).toFixed(1)} ${(cy + Math.sin(ang) * r).toFixed(1)}`;
    petali.push(`M${P(b, 64)} Q${P(a, 150)} ${P(a, 118)} Q${P(a, 150)} ${P(c, 64)}`);
  }
  const triangoli = [0, Math.PI].map((rot) => {
    const pts = [0, 1, 2].map((k) => {
      const a = rot - Math.PI / 2 + (k * Math.PI * 2) / 3;
      return `${(cx + Math.cos(a) * 118).toFixed(1)} ${(cy + Math.sin(a) * 118).toFixed(1)}`;
    });
    return `M${pts[0]} L${pts[1]} L${pts[2]} Z`;
  });
  const punti: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    punti.push({ x: cx + Math.cos(a) * 168, y: cy + Math.sin(a) * 168, r: i % 3 === 0 ? 4 : 2.2 });
  }
  return { cerchi, petali, triangoli, punti };
})();

export function DisegnoBlackwork({ p, className }: PropsDisegno): ReactElement {
  const pieno = useTransform(p, [0.55, 0.85], [0, 1]);
  return (
    <svg className={className} {...svgBase}>
      {GEO.cerchi.map((d, i) => (
        <Tratto key={i} d={d} p={p} da={0.05 + i * 0.06} a={0.35 + i * 0.06} w={i === 0 ? 3 : 2} />
      ))}
      {GEO.triangoli.map((d, i) => (
        <Tratto key={`t${i}`} d={d} p={p} da={0.3 + i * 0.08} a={0.6 + i * 0.08} w={2} />
      ))}
      {GEO.petali.map((d, i) => (
        <Tratto key={`p${i}`} d={d} p={p} da={0.35 + i * 0.025} a={0.6 + i * 0.025} w={2.4} />
      ))}
      <motion.circle cx="200" cy="200" r="22" fill="currentColor" style={{ opacity: pieno }} />
      <Compare p={p} da={0.7} a={0.95}>
        <g fill="currentColor">
          {GEO.punti.map((q, i) => (
            <circle key={i} cx={q.x} cy={q.y} r={q.r} />
          ))}
        </g>
      </Compare>
    </svg>
  );
}

// ———————————————————————————— Fine line: ramo di ciliegio ————————————————————————————
const RAMO = (() => {
  const ramo = liscia([[40, 360], [110, 300], [170, 270], [230, 210], [290, 170], [360, 120]]);
  const rametti = [
    liscia([[170, 270], [180, 230], [205, 200]]),
    liscia([[230, 210], [262, 222], [300, 228]]),
    liscia([[110, 300], [100, 262], [112, 230]]),
    liscia([[290, 170], [292, 132], [312, 104]]),
  ];
  const fiore = (cx: number, cy: number, r: number, rot: number): string[] =>
    Array.from({ length: 5 }, (_, k) => {
      const a = rot + (k / 5) * Math.PI * 2;
      const tip: Pt = [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      const s1: Pt = [cx + Math.cos(a - 0.5) * r * 0.75, cy + Math.sin(a - 0.5) * r * 0.75];
      const s2: Pt = [cx + Math.cos(a + 0.5) * r * 0.75, cy + Math.sin(a + 0.5) * r * 0.75];
      const notch: Pt = [cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82];
      return `M${cx} ${cy} Q${s1[0].toFixed(1)} ${s1[1].toFixed(1)} ${tip[0].toFixed(1)} ${tip[1].toFixed(1)} L${notch[0].toFixed(1)} ${notch[1].toFixed(1)} L${(tip[0] + Math.cos(a + 0.3) * 2).toFixed(1)} ${(tip[1] + Math.sin(a + 0.3) * 2).toFixed(1)} Q${s2[0].toFixed(1)} ${s2[1].toFixed(1)} ${cx} ${cy}`;
    });
  const fiori = [
    { c: [205, 196] as Pt, r: 26, rot: 0.2 },
    { c: [304, 228] as Pt, r: 22, rot: 1.1 },
    { c: [112, 226] as Pt, r: 20, rot: 0.6 },
    { c: [316, 100] as Pt, r: 24, rot: 2.0 },
    { c: [365, 118] as Pt, r: 14, rot: 0.9 },
  ];
  const c = casuale(9);
  const petaliCaduti = Array.from({ length: 5 }, () => {
    const x = 60 + c() * 250;
    const y = 60 + c() * 120;
    return `M${x.toFixed(1)} ${y.toFixed(1)} q6 -7 12 0 q-6 7 -12 0`;
  });
  return { ramo, rametti, fiori: fiori.map((f) => ({ ...f, d: fiore(f.c[0], f.c[1], f.r, f.rot) })), petaliCaduti };
})();

export function DisegnoFineLine({ p, className }: PropsDisegno): ReactElement {
  return (
    <svg className={className} {...svgBase}>
      <Tratto d={RAMO.ramo} p={p} da={0.02} a={0.35} w={1.6} />
      {RAMO.rametti.map((d, i) => (
        <Tratto key={i} d={d} p={p} da={0.2 + i * 0.05} a={0.4 + i * 0.05} w={1.2} />
      ))}
      {RAMO.fiori.map((f, i) =>
        f.d.map((d, k) => <Tratto key={`${i}-${k}`} d={d} p={p} da={0.38 + i * 0.07 + k * 0.012} a={0.55 + i * 0.07 + k * 0.012} w={1} />),
      )}
      <Compare p={p} da={0.65} a={0.85}>
        <g fill={TAVOLOZZA.rosso}>
          {RAMO.fiori.map((f, i) => (
            <circle key={i} cx={f.c[0]} cy={f.c[1]} r={2.6} />
          ))}
        </g>
      </Compare>
      {RAMO.petaliCaduti.map((d, i) => (
        <Tratto key={`c${i}`} d={d} p={p} da={0.75 + i * 0.03} a={0.9 + i * 0.02} w={1} />
      ))}
    </svg>
  );
}

// ———————————————————————————— Lettering: una parola a pennello ————————————————————————————
export function DisegnoLettering({ p, className }: PropsDisegno): ReactElement {
  const larghezza = useTransform(p, [0.08, 0.6], [0, 400]);
  const svolazzo = liscia([[40, 300], [120, 318], [220, 296], [300, 310], [372, 286]]);
  return (
    <svg className={className} {...svgBase}>
      <clipPath id="lettering-svela">
        <motion.rect x="0" y="0" height="400" width={larghezza} />
      </clipPath>
      <g clipPath="url(#lettering-svela)">
        <text x="196" y="178" textAnchor="middle" className="disegno-lettering__parola" fill="currentColor">
          Amor
        </text>
        <text x="226" y="282" textAnchor="middle" className="disegno-lettering__parola disegno-lettering__parola--corsivo" fill="currentColor">
          fati
        </text>
      </g>
      <Tratto d={svolazzo} p={p} da={0.55} a={0.85} w={3} />
      <Compare p={p} da={0.8} a={0.95}>
        <circle cx="372" cy="286" r="6" fill={TAVOLOZZA.nero} />
      </Compare>
    </svg>
  );
}

// ———————————————————————————— Dotwork: luna fatta di punti ————————————————————————————
const LUNA = (() => {
  const c = casuale(21);
  const punti: { x: number; y: number; r: number; k: number }[] = [];
  const cx = 200;
  const cy = 200;
  const R = 130;
  while (punti.length < 1300) {
    const x = cx - R + c() * R * 2;
    const y = cy - R + c() * R * 2;
    const d = Math.hypot(x - cx, y - cy) / R;
    if (d > 1) continue;
    // luce da sinistra in alto: più punti a destra in basso
    const z = Math.sqrt(1 - d * d);
    const nx = (x - cx) / R;
    const ny = (y - cy) / R;
    const luce = Math.max(0, -0.6 * nx - 0.5 * ny + 0.62 * z);
    const ombra = 1 - luce;
    if (c() > Math.pow(ombra, 1.6) * 0.95 + 0.04) continue;
    punti.push({ x, y, r: 1 + c() * 1.4, k: (x - cx + R) / (2 * R) });
  }
  return punti;
})();

export function DisegnoDotwork({ p, className }: PropsDisegno): ReactElement {
  return (
    <svg className={className} {...svgBase}>
      <Tratto d="M200 70 A130 130 0 1 1 199.9 70" p={p} da={0.02} a={0.3} w={1.4} />
      <g fill="currentColor">
        {Array.from({ length: 10 }, (_, fascia) => (
          <Compare key={fascia} p={p} da={0.2 + fascia * 0.06} a={0.32 + fascia * 0.06}>
            <g>
              {LUNA.filter((q) => Math.min(9, Math.floor(q.k * 10)) === fascia).map((q, i) => (
                <circle key={i} cx={q.x.toFixed(1)} cy={q.y.toFixed(1)} r={q.r.toFixed(2)} />
              ))}
            </g>
          </Compare>
        ))}
      </g>
      <Compare p={p} da={0.8} a={0.95}>
        <circle cx="330" cy="330" r="9" fill={TAVOLOZZA.rosso} />
      </Compare>
    </svg>
  );
}
