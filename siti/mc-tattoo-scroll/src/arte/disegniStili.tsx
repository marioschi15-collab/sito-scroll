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

// ———————————————————————————— Blackwork: rosone a neri pieni ————————————————————————————
const GEO = (() => {
  const cx = 200;
  const cy = 200;
  const P = (ang: number, r: number): string => `${(cx + Math.cos(ang) * r).toFixed(1)} ${(cy + Math.sin(ang) * r).toFixed(1)}`;
  const cerchio = (r: number): string => `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  const stella = (punte: number, fuori: number, dentro: number, rot: number): string => {
    let d = '';
    for (let i = 0; i < punte * 2; i++) {
      const a = rot + (i / (punte * 2)) * Math.PI * 2;
      d += `${i === 0 ? 'M' : 'L'}${P(a, i % 2 === 0 ? fuori : dentro)}`;
    }
    return `${d}Z`;
  };
  // Stella nera a dodici punte con il cuore vuoto; dentro, una stella più piccola piena.
  const stellaGrande = `${stella(12, 132, 78, -Math.PI / 2)} ${cerchio(58)}`;
  const stellaPiccola = stella(6, 44, 20, -Math.PI / 2);
  const cerchi = [156, 146].map(cerchio);
  const raggi: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / 12) * Math.PI * 2;
    raggi.push(`M${P(a, 82)} L${P(a, 144)}`);
  }
  const punti: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    punti.push({ x: cx + Math.cos(a) * 172, y: cy + Math.sin(a) * 172, r: i % 4 === 0 ? 4.4 : 1.9 });
  }
  return { stellaGrande, stellaPiccola, cerchi, raggi, punti };
})();

export function DisegnoBlackwork({ p, className }: PropsDisegno): ReactElement {
  const pieno = useTransform(p, [0.42, 0.7], [0, 1]);
  const cuore = useTransform(p, [0.6, 0.85], [0, 1]);
  return (
    <svg className={className} {...svgBase}>
      {GEO.cerchi.map((d, i) => (
        <Tratto key={i} d={d} p={p} da={0.04 + i * 0.05} a={0.36 + i * 0.05} w={i === 0 ? 4 : 1.5} />
      ))}
      <Tratto d={GEO.stellaGrande} p={p} da={0.12} a={0.5} w={2} />
      <motion.path d={GEO.stellaGrande} fill="currentColor" fillRule="evenodd" style={{ opacity: pieno }} />
      {GEO.raggi.map((d, i) => (
        <Tratto key={`r${i}`} d={d} p={p} da={0.4 + i * 0.012} a={0.56 + i * 0.012} w={1.5} />
      ))}
      <motion.path d={GEO.stellaPiccola} fill="currentColor" style={{ scale: cuore, opacity: cuore, transformBox: 'fill-box', transformOrigin: 'center' }} />
      <Compare p={p} da={0.72} a={0.95}>
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

// ———————————————————————————— Dotwork: una luna fatta solo di punti ————————————————————————————
// Niente contorno: la forma nasce dalla densità dei punti, più fitti dove batte la luce.
const LUNA = (() => {
  const c = casuale(21);
  const cx = 200;
  const cy = 200;
  const R = 128;
  const FASCE = 12;
  const fasce: { x: string; y: string; r: string }[][] = Array.from({ length: FASCE }, () => []);
  // tre "mari" più scuri sulla superficie
  const mari = [
    { x: -0.3, y: -0.25, r: 0.3 },
    { x: 0.2, y: 0.1, r: 0.24 },
    { x: -0.1, y: 0.42, r: 0.2 },
  ];
  let quanti = 0;
  let tentativi = 0;
  while (quanti < 2600 && tentativi < 60000) {
    tentativi++;
    const nx = c() * 2 - 1;
    const ny = c() * 2 - 1;
    const d2 = nx * nx + ny * ny;
    if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2);
    // luce da sinistra in alto, con un filo di luce radente sul bordo in ombra
    let luce = Math.max(0, -0.62 * nx - 0.5 * ny + 0.6 * nz);
    luce = Math.pow(luce, 1.5) + 0.05 + 0.16 * Math.pow(1 - nz, 3);
    for (const m of mari) {
      const dm = Math.hypot(nx - m.x, ny - m.y) / m.r;
      if (dm < 1) luce *= 0.4 + 0.6 * dm * dm;
    }
    if (c() > luce) continue;
    const fascia = Math.min(FASCE - 1, Math.floor(((nx + ny + 2) / 4) * FASCE));
    fasce[fascia]!.push({ x: (cx + nx * R).toFixed(1), y: (cy + ny * R).toFixed(1), r: (0.55 + c() * 0.95).toFixed(2) });
    quanti++;
  }
  // anello di punti e qualche stella lontana
  const anello = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2;
    const x = cx + Math.cos(a) * 168;
    const y = cy + Math.sin(a) * 168 * 0.32 + 6;
    return { x: x.toFixed(1), y: y.toFixed(1), r: i % 6 === 0 ? '1.8' : '0.9', dietro: Math.sin(a) < 0, coperto: Math.hypot(x - cx, y - cy) < R + 4 };
  }).filter((q) => !(q.dietro && q.coperto));
  const stelle = Array.from({ length: 26 }, () => ({ x: (10 + c() * 380).toFixed(1), y: (10 + c() * 380).toFixed(1), r: (0.5 + c() * 0.9).toFixed(2) })).filter(
    (q) => Math.hypot(+q.x - cx, +q.y - cy) > R + 26,
  );
  return { fasce, anello, stelle };
})();

export function DisegnoDotwork({ p, className }: PropsDisegno): ReactElement {
  return (
    <svg className={className} {...svgBase}>
      <g fill="currentColor">
        <Compare p={p} da={0.05} a={0.3}>
          <g opacity="0.7">
            {LUNA.stelle.map((q, i) => (
              <circle key={i} cx={q.x} cy={q.y} r={q.r} />
            ))}
          </g>
        </Compare>
        <Compare p={p} da={0.55} a={0.8}>
          <g opacity="0.55">
            {LUNA.anello.filter((q) => q.dietro).map((q, i) => (
              <circle key={i} cx={q.x} cy={q.y} r={q.r} />
            ))}
          </g>
        </Compare>
        {LUNA.fasce.map((fascia, k) => (
          <Fascia key={k} p={p} da={0.1 + k * 0.045} punti={fascia} />
        ))}
        <Compare p={p} da={0.6} a={0.85}>
          <g>
            {LUNA.anello.filter((q) => !q.dietro).map((q, i) => (
              <circle key={i} cx={q.x} cy={q.y} r={q.r} />
            ))}
          </g>
        </Compare>
      </g>
      <Compare p={p} da={0.82} a={0.96}>
        <circle cx="332" cy="92" r="7" fill={TAVOLOZZA.rosso} />
      </Compare>
    </svg>
  );
}

/** Una fascia della luna: compare tutta insieme, da in alto a sinistra verso in basso a destra. */
function Fascia({ p, da, punti }: { p: MotionValue<number>; da: number; punti: readonly { x: string; y: string; r: string }[] }): ReactElement {
  const opacity = useTransform(p, [da, da + 0.14], [0, 1]);
  return (
    <motion.g style={{ opacity }}>
      {punti.map((q, i) => (
        <circle key={i} cx={q.x} cy={q.y} r={q.r} />
      ))}
    </motion.g>
  );
}
