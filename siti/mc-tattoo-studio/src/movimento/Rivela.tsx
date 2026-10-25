// src/movimento/Rivela.tsx — testo che si rivela parola per parola da sotto una maschera.
// Si usa SOLO per gli h2 delle sezioni e per il manifesto.
import { Fragment, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { motion, stagger as scaglionato } from 'motion/react';
import type { Variants } from 'motion/react';
import { STAGGER, T_RIVELA, VISTA_TITOLI } from './costanti.js';
import { useMovimentoRidotto } from './useMovimentoRidotto.js';
import { useQuotaRaggiungibile } from './useQuotaRaggiungibile.js';
import '../stili/etichetta.css';

export interface PropsRivela {
  /** Testo con le parti in corsivo tra asterischi: 'Indice degli *stili*'. */
  testo: string;
  as?: 'h2' | 'h3' | 'p'; // predefinito 'h2'
  id?: string;
  className?: string;
  tabIndex?: number;
  /** Aggiunge l'attributo data-titolo-sezione. */
  titoloSezione?: boolean;
  ritardo?: number; // s, predefinito 0
  stagger?: number; // s, predefinito STAGGER.parole (0,035)
  amount?: number; // predefinito VISTA_TITOLI.amount (0,6)
}

/** Un pezzo di parola: tutto dritto o tutto corsivo. */
interface Pezzo {
  testo: string;
  corsivo: boolean;
}

/**
 * Divide il testo in parole (separate da spazi) e ogni parola in pezzi dritti o corsivi.
 * Un asterisco apre o chiude il corsivo anche a metà parola: in '*vita*.' il punto resta dritto.
 */
function analizzaPezzi(testo: string): Pezzo[][] {
  const parole: Pezzo[][] = [];
  let corsivo = false;
  for (const grezza of testo.split(/\s+/)) {
    const pezzi: Pezzo[] = [];
    let attuale = '';
    for (const carattere of grezza) {
      if (carattere === '*') {
        if (attuale) pezzi.push({ testo: attuale, corsivo });
        attuale = '';
        corsivo = !corsivo;
      } else {
        attuale += carattere;
      }
    }
    if (attuale) pezzi.push({ testo: attuale, corsivo });
    if (pezzi.length > 0) parole.push(pezzi);
  }
  return parole;
}

/** Esportata per i test e per chi deve mostrare lo stesso testo senza animazione. */
export function analizzaCorsivo(testo: string): { parola: string; corsivo: boolean }[] {
  return analizzaPezzi(testo).map((pezzi) => ({
    parola: pezzi.map((p) => p.testo).join(''),
    // Una parola è in corsivo quando lo sono le sue lettere: la punteggiatura attaccata non conta.
    corsivo: pezzi.some((p) => p.corsivo && /[\p{L}\p{N}]/u.test(p.testo)),
  }));
}

/** Il testo intero senza animazione: le parti tra asterischi diventano <em>. */
function testoStatico(testo: string): ReactNode[] {
  return testo
    .split('*')
    .map((parte, i) =>
      parte === '' ? null : i % 2 === 1 ? <em key={i}>{parte}</em> : <Fragment key={i}>{parte}</Fragment>,
    );
}

const VARIANTI_PAROLA: Variants = {
  nascosta: { y: '110%' },
  visibile: { y: '0%', transition: T_RIVELA },
};

export function Rivela({
  testo,
  as = 'h2',
  id,
  className,
  tabIndex,
  titoloSezione = false,
  ritardo = 0,
  stagger = STAGGER.parole,
  amount = VISTA_TITOLI.amount,
}: PropsRivela): ReactElement {
  const ridotto = useMovimentoRidotto();
  // Con il testo molto ingrandito un titolo può essere più alto di innerHeight / amount: la soglia si adatta.
  const { rif, quota } = useQuotaRaggiungibile(amount);
  const parole = useMemo(() => analizzaPezzi(testo), [testo]);
  const variantiContenitore = useMemo<Variants>(
    () => ({
      nascosta: {},
      // Equivale a { staggerChildren: stagger, delayChildren: ritardo }, senza l'opzione deprecata in Motion 14.
      visibile: { transition: { delayChildren: scaglionato(stagger, { startDelay: ritardo }) } },
    }),
    [stagger, ritardo],
  );

  const Tag = as;
  const attributi = {
    id,
    className,
    tabIndex,
    ...(titoloSezione ? { 'data-titolo-sezione': '' } : {}),
  };

  if (ridotto) {
    return <Tag {...attributi}>{testoStatico(testo)}</Tag>;
  }

  return (
    <Tag {...attributi}>
      <span className="sr-only">{testo.replaceAll('*', '')}</span>
      <motion.span
        ref={rif}
        className="rivela"
        aria-hidden="true"
        variants={variantiContenitore}
        initial="nascosta"
        whileInView="visibile"
        viewport={{ once: true, amount: quota }}
      >
        {parole.map((pezzi, i) => (
          <Fragment key={i}>
            {i > 0 ? ' ' : null}
            <span className="rivela__maschera">
              <motion.span className="rivela__parola" variants={VARIANTI_PAROLA}>
                {pezzi.map((pezzo, j) =>
                  pezzo.corsivo ? <em key={j}>{pezzo.testo}</em> : <Fragment key={j}>{pezzo.testo}</Fragment>,
                )}
              </motion.span>
            </span>
          </Fragment>
        ))}
      </motion.span>
    </Tag>
  );
}
