// src/componenti/Pulsante.tsx — il pulsante del sito: un vero <a> (con href) oppure un <button>.
// Niente motion.a o motion.button: gli stati sono in CSS (solo transform e opacity), così i tipi
// degli attributi HTML restano puliti.
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import { Icona } from './Icona.js';
import type { NomeIcona } from './Icona.js';
import '../stili/pulsante.css';

export type VariantePulsante = 'primario' | 'secondario' | 'testo';

interface PropsComuni {
  variante?: VariantePulsante; // predefinito 'primario'
  dimensione?: 'normale' | 'piccola'; // 52px / 44px di altezza minima
  icona?: NomeIcona; // dopo il testo
  iconaPrima?: NomeIcona; // prima del testo
  larga?: boolean; // width: 100%
  className?: string;
  children: ReactNode;
}

export type PropsPulsanteLink = PropsComuni & {
  href: string;
  /** Apre in una nuova scheda: target="_blank", rel="noopener noreferrer", testo nascosto " (si apre in una nuova scheda)". */
  esterno?: boolean;
  ref?: Ref<HTMLAnchorElement>;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'>;

export type PropsPulsanteAzione = PropsComuni & {
  href?: undefined;
  ref?: Ref<HTMLButtonElement>;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

export type PropsPulsante = PropsPulsanteLink | PropsPulsanteAzione;

function classiPulsante(
  variante: VariantePulsante,
  dimensione: 'normale' | 'piccola',
  larga: boolean,
  className: string | undefined,
): string {
  return [
    'pulsante',
    `pulsante--${variante}`,
    dimensione === 'piccola' ? 'pulsante--piccola' : null,
    larga ? 'pulsante--larga' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

interface PropsContenuto {
  icona: NomeIcona | undefined;
  iconaPrima: NomeIcona | undefined;
  esterno: boolean;
  children: ReactNode;
}

function Contenuto({ icona, iconaPrima, esterno, children }: PropsContenuto): ReactElement {
  return (
    <>
      {iconaPrima ? (
        <Icona nome={iconaPrima} className={`pulsante__icona pulsante__icona--${iconaPrima}`} />
      ) : null}
      <span className="pulsante__testo">
        {children}
        {esterno ? <span className="sr-only"> (si apre in una nuova scheda)</span> : null}
      </span>
      {icona ? <Icona nome={icona} className={`pulsante__icona pulsante__icona--${icona}`} /> : null}
    </>
  );
}

export function Pulsante(props: PropsPulsante): ReactElement {
  if (props.href !== undefined) {
    const {
      variante = 'primario',
      dimensione = 'normale',
      icona,
      iconaPrima,
      larga = false,
      className,
      children,
      href,
      esterno = false,
      ref,
      ...resto
    } = props;
    return (
      <a
        {...resto}
        {...(esterno ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        ref={ref}
        href={href}
        className={classiPulsante(variante, dimensione, larga, className)}
      >
        <Contenuto icona={icona} iconaPrima={iconaPrima} esterno={esterno}>
          {children}
        </Contenuto>
      </a>
    );
  }

  const {
    variante = 'primario',
    dimensione = 'normale',
    icona,
    iconaPrima,
    larga = false,
    className,
    children,
    href: _senzaIndirizzo,
    type = 'button',
    ref,
    ...resto
  } = props;
  return (
    <button {...resto} ref={ref} type={type} className={classiPulsante(variante, dimensione, larga, className)}>
      <Contenuto icona={icona} iconaPrima={iconaPrima} esterno={false}>
        {children}
      </Contenuto>
    </button>
  );
}
