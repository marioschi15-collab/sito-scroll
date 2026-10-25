// src/arte/Disegno.tsx — il motore unico che disegna ogni illustrazione (§5.9.2, §6).
// Due versioni con gli stessi livelli:
// - statica: tracciati SVG normali, completa e ferma, senza alcuno stato iniziale
//   (animata={false} o movimento ridotto: miniature, scheda, anteprima);
// - animata: un solo avanzamento p (0..1). Nei primi QUOTA_TRATTI si tracciano contorni e poi interni,
//   ognuno in un intervallo proporzionale alla sua lunghezza (velocità costante); poi entrano in dissolvenza
//   campiture e puntinato, e il lettering si svela da sinistra. Si animano solo pathLength e opacity
//   (più la posizione dell'ago e la larghezza della maschera dei testi).
import { useEffect, useEffectEvent, useId, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { EASE_TRATTO, QUOTA_TRATTI, TEMPI_DISEGNO, VISTA_DISEGNI } from '../movimento/costanti.js';
import { useMovimentoRidotto } from '../movimento/useMovimentoRidotto.js';
import { lineeTratteggio, misuraLunghezze, misuraRiquadro, puntoSulTracciato } from '../utilita/geometria.js';
import type { Riquadro } from '../utilita/geometria.js';
import type { DatiDisegno, PropsIllustrazione, TestoDisegno } from './tipi.js';
import '../stili/figura.css';

export interface PropsDisegno extends PropsIllustrazione { dati: DatiDisegno }

/** Spessori di tradizionale e blackwork, in unità del viewBox (§6.1). */
const SPESSORI_PREDEFINITI = { contorno: 3, interno: 1.75 } as const;
/** Il lettering si svela da sinistra nell'ultimo quarto dell'avanzamento. */
const INIZIO_TESTI = 0.75;
/** Attesa massima dei font prima di tracciare un disegno con lettering (ms). */
const ATTESA_FONT = 500;
/** Raggi dell'ago, in unità del viewBox. */
const RAGGIO_ALONE = 9;
const RAGGIO_PUNTA = 3.5;

type Spessori = NonNullable<DatiDisegno['spessori']>;

/** Un tratto da tracciare: occupa l'intervallo [da, a] dell'avanzamento, dentro [0, QUOTA_TRATTI]. */
interface Tratto {
  d: string;
  w: number;
  lunghezza: number;
  da: number;
  a: number;
}

interface PropsInterne extends PropsDisegno {
  uid: string;
}

export function Disegno(props: PropsDisegno): ReactElement {
  const ridotto = useMovimentoRidotto();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // Con un progresso esterno (RondineFasi) il disegno segue sempre quel valore, anche con movimento ridotto.
  const statico = props.progresso === undefined && (props.animata === false || ridotto);
  return statico ? <DisegnoStatico {...props} uid={uid} /> : <DisegnoAnimato {...props} uid={uid} ridotto={ridotto} />;
}

/* ---------- Versione statica ---------- */

function DisegnoStatico({ dati, titolo, conStencil, decorativa, className, uid }: PropsInterne): ReactElement {
  const sp = dati.spessori ?? SPESSORI_PREDEFINITI;
  const linee = useLineeTratteggi(dati);
  const testi = dati.testi ?? [];
  return (
    <svg
      className={classiSvg(conStencil, className)}
      viewBox={dati.viewBox}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      {...attributiAccessibili(uid, decorativa)}
    >
      {decorativa ? null : <title id={`${uid}-titolo`}>{titolo}</title>}
      {linee.length > 0 ? (
        <defs>
          <RitagliTratteggi dati={dati} uid={uid} />
        </defs>
      ) : null}
      {conStencil ? <CopiaStencil contorni={dati.contorni} spessore={sp.contorno} /> : null}
      <g className="disegno__campiture">
        <Campiture dati={dati} uid={uid} linee={linee} />
      </g>
      <g className="disegno__tratti">
        {(dati.interni ?? []).map((d, i) => (
          <path key={`i${i}`} d={d} strokeWidth={sp.interno} />
        ))}
        {dati.contorni.map((d, i) => (
          <path key={`c${i}`} d={d} strokeWidth={sp.contorno} />
        ))}
      </g>
      {testi.length > 0 ? (
        <g className="disegno__testi">
          <Testi testi={testi} />
        </g>
      ) : null}
    </svg>
  );
}

/* ---------- Versione animata ---------- */

function DisegnoAnimato({
  dati,
  titolo,
  quando = 'in-vista',
  progresso,
  durata = TEMPI_DISEGNO.galleria.durata,
  ritardo = 0,
  conStencil,
  conAgo,
  decorativa,
  className,
  uid,
  ridotto,
}: PropsInterne & { ridotto: boolean }): ReactElement {
  const rifSvg = useRef<SVGSVGElement>(null);
  const interno = useMotionValue(0);
  const p = progresso ?? interno;
  const sp = dati.spessori ?? SPESSORI_PREDEFINITI;
  const linee = useLineeTratteggi(dati);
  const testi = dati.testi ?? [];
  const haTesti = testi.length > 0;
  const vista = useMemo(() => leggiViewBox(dati.viewBox), [dati.viewBox]);

  // Partenza: solo senza progresso esterno, al montaggio ('subito') o all'entrata in vista.
  const inVista = useInView(rifSvg, VISTA_DISEGNI);
  const autonomo = progresso === undefined;
  const parte = autonomo && (quando === 'subito' || inVista);

  // Le lunghezze si misurano solo quando il disegno può avanzare: prima p vale 0 e ogni tratto è nascosto,
  // qualunque sia il suo intervallo. Così le tessere fuori schermo non costano nulla al caricamento.
  const misura = !autonomo || parte;
  const tratti = useMemo(() => calcolaTratti(dati, sp, misura), [dati, sp, misura]);

  // Durata e ritardo si leggono al momento della partenza: se cambiano dopo (es. la galleria passa da 3 a 2
  // colonne), il tracciato già partito non ricomincia.
  const traccia = useEffectEvent((giaAtteso: number) =>
    // L'attesa dei font si sconta dal ritardo: la durata totale resta ritardo + durata.
    animate(interno, 1, { duration: durata, delay: Math.max(0, ritardo - giaAtteso), ease: EASE_TRATTO }),
  );
  useEffect(() => {
    if (!parte) return;
    let attivo = true;
    let controlli: { stop: () => void } | undefined;
    const inizio = performance.now();
    const avvia = (): void => {
      if (attivo) controlli = traccia((performance.now() - inizio) / 1000);
    };
    if (haTesti && 'fonts' in document) {
      void Promise.race([document.fonts.ready, attesa(ATTESA_FONT)]).then(avvia, avvia);
    } else {
      avvia();
    }
    return () => {
      attivo = false;
      controlli?.stop();
    };
  }, [parte, haTesti]);

  // Campiture e puntinato: solo dissolvenza, mai pathLength. Testi: maschera che si allarga da sinistra.
  const opacitaCampiture = useTransform(p, [QUOTA_TRATTI, 1], [0, 1]);
  const larghezzaRivelata = useTransform(p, [INIZIO_TESTI, 1], [0, vista.larghezza]);

  // Ago: segue il tratto attivo, un solo calcolo per fotogramma; sparisce fuori da (0, QUOTA_TRATTI).
  const agoAttivo = conAgo === true && !ridotto;
  const ax = useMotionValue(0);
  const ay = useMotionValue(0);
  const opacitaAgo = useMotionValue(0);
  useMotionValueEvent(p, 'change', (v) => {
    if (!agoAttivo) return;
    const tratto = v > 0 && v < QUOTA_TRATTI ? tratti.find((t) => v >= t.da && v < t.a) : undefined;
    const punto = tratto ? puntoSulTracciato(tratto.d, (tratto.lunghezza * (v - tratto.da)) / (tratto.a - tratto.da)) : null;
    if (!punto) {
      opacitaAgo.set(0);
      return;
    }
    ax.set(punto.x);
    ay.set(punto.y);
    opacitaAgo.set(1);
  });

  // L'ordine di tracciatura è contorni → interni; nel DOM gli interni stanno sotto i contorni.
  const contorni = tratti.slice(0, dati.contorni.length);
  const interni = tratti.slice(dati.contorni.length);

  return (
    <svg
      ref={rifSvg}
      className={classiSvg(conStencil, className)}
      viewBox={dati.viewBox}
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      {...attributiAccessibili(uid, decorativa)}
    >
      {decorativa ? null : <title id={`${uid}-titolo`}>{titolo}</title>}
      {linee.length > 0 || haTesti ? (
        <defs>
          <RitagliTratteggi dati={dati} uid={uid} />
          {haTesti ? (
            <mask id={`${uid}-maschera`}>
              {/* In una maschera il bianco significa "visibile": è l'unico colore scritto fuori da token.css. */}
              <motion.rect x={vista.x} y={vista.y} height={vista.altezza} width={larghezzaRivelata} fill="#fff" />
            </mask>
          ) : null}
        </defs>
      ) : null}
      {conStencil ? <CopiaStencil contorni={dati.contorni} spessore={sp.contorno} /> : null}
      <motion.g className="disegno__campiture" style={{ opacity: opacitaCampiture }}>
        <Campiture dati={dati} uid={uid} linee={linee} />
      </motion.g>
      <g className="disegno__tratti">
        {interni.map((t, i) => (
          <TrattoAnimato key={`i${i}`} d={t.d} w={t.w} da={t.da} a={t.a} p={p} />
        ))}
        {contorni.map((t, i) => (
          <TrattoAnimato key={`c${i}`} d={t.d} w={t.w} da={t.da} a={t.a} p={p} />
        ))}
      </g>
      {haTesti ? (
        <g className="disegno__testi" mask={`url(#${uid}-maschera)`}>
          <Testi testi={testi} />
        </g>
      ) : null}
      {agoAttivo ? (
        <motion.g className="disegno__ago" style={{ opacity: opacitaAgo }}>
          <motion.circle className="disegno__ago-alone" cx={ax} cy={ay} r={RAGGIO_ALONE} />
          <motion.circle className="disegno__ago-punta" cx={ax} cy={ay} r={RAGGIO_PUNTA} />
        </motion.g>
      ) : null}
    </svg>
  );
}

/** Un tratto che si disegna mentre p attraversa [da, a]. */
function TrattoAnimato({ d, w, da, a, p }: { d: string; w: number; da: number; a: number; p: MotionValue<number> }): ReactElement {
  const pathLength = useTransform(p, [da, a], [0, 1], { clamp: true });
  const opacity = useTransform(p, (v) => (v > da ? 1 : 0)); // nasconde il puntino della terminazione rotonda a lunghezza 0
  return <motion.path d={d} strokeWidth={w} style={{ pathLength, opacity }} />;
}

/* ---------- Livelli comuni alle due versioni ---------- */

/** Copia dei contorni, sempre statica: la mostra il CSS al passaggio del mouse o al focus. */
function CopiaStencil({ contorni, spessore }: { contorni: readonly string[]; spessore: number }): ReactElement {
  return (
    <g className="disegno__stencil" aria-hidden="true" strokeWidth={spessore}>
      {contorni.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

/** Lavati → pieni → tratteggi → puntini chiari → puntini, dal basso verso l'alto. */
function Campiture({ dati, uid, linee }: { dati: DatiDisegno; uid: string; linee: readonly string[] }): ReactElement {
  return (
    <>
      {(dati.lavati ?? []).map((d, i) => (
        <path key={`l${i}`} className="disegno__lavato" d={d} />
      ))}
      {(dati.pieni ?? []).map((d, i) => (
        <path key={`p${i}`} className="disegno__pieno" d={d} />
      ))}
      {linee.map((d, i) => (
        <path key={`t${i}`} className="disegno__tratteggio" d={d} clipPath={`url(#${idRitaglio(uid, i)})`} />
      ))}
      {dati.puntiniChiari ? <path className="disegno__puntini disegno__puntini--chiari" d={dati.puntiniChiari} /> : null}
      {dati.puntini ? <path className="disegno__puntini" d={dati.puntini} /> : null}
    </>
  );
}

/** Le aree chiuse che ritagliano le linee di ciascun tratteggio. */
function RitagliTratteggi({ dati, uid }: { dati: DatiDisegno; uid: string }): ReactElement {
  return (
    <>
      {(dati.tratteggi ?? []).map((t, i) => (
        <clipPath key={i} id={idRitaglio(uid, i)}>
          <path d={t.area} />
        </clipPath>
      ))}
    </>
  );
}

function Testi({ testi }: { testi: readonly TestoDisegno[] }): ReactElement {
  return (
    <>
      {testi.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={t.y}
          fontSize={t.dimensione}
          textAnchor={t.ancora ?? 'middle'}
          transform={t.rotazione ? `rotate(${t.rotazione} ${t.x} ${t.y})` : undefined}
        >
          {t.contenuto}
        </text>
      ))}
    </>
  );
}

/* ---------- Calcoli ---------- */

/** Le linee di ogni tratteggio, calcolate sul riquadro della sua area (misura in cache). */
function useLineeTratteggi(dati: DatiDisegno): readonly string[] {
  const tratteggi = dati.tratteggi;
  return useMemo(
    () => (tratteggi ?? []).map((t) => lineeTratteggio(misuraRiquadro(t.area), t.passo, t.angolo)),
    [tratteggi],
  );
}

/**
 * Tracciatura a velocità costante: contorni e poi interni, ognuno con un intervallo proporzionale
 * alla sua lunghezza (getTotalLength) dentro [0, QUOTA_TRATTI]. Senza misure ogni tratto ha la stessa quota.
 */
function calcolaTratti(dati: DatiDisegno, sp: Spessori, misura: boolean): readonly Tratto[] {
  const lista = [
    ...dati.contorni.map((d) => ({ d, w: sp.contorno })),
    ...(dati.interni ?? []).map((d) => ({ d, w: sp.interno })),
  ];
  const lunghezze = misura ? misuraLunghezze(dati.id, lista.map((t) => t.d)) : lista.map(() => 0);
  const totale = lunghezze.reduce((somma, l) => somma + l, 0);
  const pesi = totale > 0 ? lunghezze : lunghezze.map(() => 1);
  const sommaPesi = pesi.reduce((somma, l) => somma + l, 0) || 1;
  let cumulata = 0;
  return lista.map((t, i) => {
    const da = (QUOTA_TRATTI * cumulata) / sommaPesi;
    cumulata += pesi[i] ?? 0;
    const a = (QUOTA_TRATTI * cumulata) / sommaPesi;
    // Un intervallo mai vuoto: useTransform non accetta [da, da].
    return { d: t.d, w: t.w, lunghezza: lunghezze[i] ?? 0, da, a: Math.max(a, da + 1e-6) };
  });
}

function leggiViewBox(viewBox: string): Riquadro {
  const n = viewBox.trim().split(/[\s,]+/).map(Number);
  if (n.length !== 4 || !n.every(Number.isFinite)) return { x: 0, y: 0, larghezza: 400, altezza: 500 };
  return { x: n[0] ?? 0, y: n[1] ?? 0, larghezza: n[2] ?? 400, altezza: n[3] ?? 500 };
}

function classiSvg(conStencil: boolean | undefined, className: string | undefined): string {
  return ['disegno', conStencil ? 'disegno--stencil' : null, className].filter(Boolean).join(' ');
}

/** role="img" con il <title> come nome, oppure nascosto ai lettori di schermo se decorativo. */
function attributiAccessibili(
  uid: string,
  decorativa: boolean | undefined,
): { 'aria-hidden': true } | { role: 'img'; 'aria-labelledby': string } {
  return decorativa ? { 'aria-hidden': true } : { role: 'img', 'aria-labelledby': `${uid}-titolo` };
}

function idRitaglio(uid: string, indice: number): string {
  return `${uid}-tratteggio-${indice}`;
}

function attesa(ms: number): Promise<void> {
  return new Promise((risolvi) => {
    setTimeout(risolvi, ms);
  });
}
