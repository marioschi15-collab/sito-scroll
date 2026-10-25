// src/movimento/Entra.tsx — l'elemento che entra in vista salendo di qualche pixel in dissolvenza,
// da solo (Entra) oppure a gruppi con stagger (EntraGruppo + EntraFiglio).
import { useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { motion, stagger as scaglionato } from 'motion/react';
import type { Variants } from 'motion/react';
import { DURATA, EASE_USCITA, SPOSTA, STAGGER, T_ENTRA, VISTA } from './costanti.js';
import { useMovimentoRidotto } from './useMovimentoRidotto.js';
import { useQuotaRaggiungibile } from './useQuotaRaggiungibile.js';

type TagEntra = 'div' | 'p' | 'span' | 'li' | 'ul' | 'ol' | 'dl' | 'section' | 'h3' | 'figure' | 'form';

/** Il componente Motion di ogni tag ammesso. */
const TAG = {
  div: motion.div,
  p: motion.p,
  span: motion.span,
  li: motion.li,
  ul: motion.ul,
  ol: motion.ol,
  dl: motion.dl,
  section: motion.section,
  h3: motion.h3,
  figure: motion.figure,
  form: motion.form,
} as const satisfies Record<TagEntra, unknown>;

export interface PropsEntra {
  as?: TagEntra; // predefinito 'div'
  ritardo?: number; // s, predefinito 0
  y?: number; // px, predefinito SPOSTA.entra (16)
  durata?: number; // s, predefinito DURATA.media
  className?: string;
  id?: string;
  children: ReactNode;
}

export function Entra({
  as = 'div',
  ritardo = 0,
  y = SPOSTA.entra,
  durata = DURATA.media,
  className,
  id,
  children,
}: PropsEntra): ReactElement {
  const ridotto = useMovimentoRidotto();
  const { rif, quota } = useQuotaRaggiungibile(VISTA.amount);
  const Tag = TAG[as];
  return (
    <Tag
      ref={rif}
      className={className}
      id={id}
      initial={ridotto ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: VISTA.once, amount: quota }}
      transition={{ duration: durata, ease: EASE_USCITA, delay: ritardo }}
    >
      {children}
    </Tag>
  );
}

export interface PropsEntraGruppo {
  as?: TagEntra; // predefinito 'div'
  stagger?: number; // s, predefinito STAGGER.elementi
  ritardo?: number; // s, delayChildren, predefinito 0
  amount?: number; // predefinito VISTA.amount
  className?: string;
  id?: string;
  children: ReactNode;
}

export function EntraGruppo({
  as = 'div',
  stagger = STAGGER.elementi,
  ritardo = 0,
  amount = VISTA.amount,
  className,
  id,
  children,
}: PropsEntraGruppo): ReactElement {
  const ridotto = useMovimentoRidotto();
  const varianti = useMemo<Variants>(
    () => ({
      nascosto: {},
      // Equivale a { staggerChildren: stagger, delayChildren: ritardo }, senza l'opzione deprecata in Motion 14.
      visibile: { transition: { delayChildren: scaglionato(stagger, { startDelay: ritardo }) } },
    }),
    [stagger, ritardo],
  );
  const { rif, quota } = useQuotaRaggiungibile(amount);
  const Tag = TAG[as];
  return (
    <Tag
      ref={rif}
      className={className}
      id={id}
      variants={varianti}
      initial={ridotto ? false : 'nascosto'}
      whileInView="visibile"
      viewport={{ once: true, amount: quota }}
    >
      {children}
    </Tag>
  );
}

export interface PropsEntraFiglio {
  as?: TagEntra; // predefinito 'div'
  className?: string;
  children: ReactNode;
}

export function EntraFiglio({ as = 'div', className, children }: PropsEntraFiglio): ReactElement {
  const Tag = TAG[as];
  return (
    <Tag className={className} variants={VARIANTI_FIGLIO}>
      {children}
    </Tag>
  );
}

export const VARIANTI_FIGLIO: Variants = {
  nascosto: { opacity: 0, y: SPOSTA.entra },
  visibile: { opacity: 1, y: 0, transition: T_ENTRA },
};
