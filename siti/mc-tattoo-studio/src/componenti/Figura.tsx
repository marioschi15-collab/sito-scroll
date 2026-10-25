// src/componenti/Figura.tsx — riquadro 4:5 fisso che mostra un disegno o una foto (§5.7).
// Le sezioni passano sempre da qui (e da Media in dati/lavori.ts): quando arrivano le foto vere
// basta cambiare i dati, nessun componente. È uno <span> perché sta anche dentro i <button> della galleria.
import type { ReactElement } from 'react';
import { motion } from 'motion/react';
import type { Media } from '../dati/lavori.js';
import { DURATA, EASE_USCITA, VISTA } from '../movimento/costanti.js';
import { useMovimentoRidotto } from '../movimento/useMovimentoRidotto.js';
import '../stili/figura.css';

export interface PropsFigura {
  media: Media;
  /** Testo alternativo; per i disegni diventa il <title> dello SVG. */
  titolo: string;
  animata?: boolean;                  // predefinito true; viene comunque spenta con movimento ridotto
  quando?: 'in-vista' | 'subito';     // predefinito 'in-vista'
  durata?: number;
  ritardo?: number;
  conStencil?: boolean;
  conAgo?: boolean;
  decorativa?: boolean;               // aria-hidden, alt=""
  className?: string;
}

const DIMENSIONI_FOTO = '(min-width: 1024px) 30vw, 50vw';
const FOTO_NASCOSTA = { opacity: 0, scale: 1.04 } as const;
const FOTO_VISIBILE = { opacity: 1, scale: 1 } as const;

export function Figura({
  media,
  titolo,
  animata = true,
  quando = 'in-vista',
  durata,
  ritardo,
  conStencil,
  conAgo,
  decorativa,
  className,
}: PropsFigura): ReactElement {
  const ridotto = useMovimentoRidotto();
  const anima = animata && !ridotto;

  if (media.tipo === 'disegno') {
    const { Illustrazione } = media;
    return (
      <span className={classi('figura figura--disegno', className)}>
        <Illustrazione
          titolo={titolo}
          animata={anima}
          quando={quando}
          durata={durata}
          ritardo={ritardo}
          conStencil={conStencil}
          conAgo={conAgo}
          decorativa={decorativa}
        />
      </span>
    );
  }

  const attributi = {
    className: 'figura__foto',
    src: media.src,
    srcSet: media.srcSet,
    sizes: DIMENSIONI_FOTO,
    alt: decorativa ? '' : titolo,
    width: media.larghezza,
    height: media.altezza,
    loading: quando === 'subito' ? 'eager' : 'lazy',
    decoding: 'async',
  } as const;
  const transizione = { duration: DURATA.rivela, ease: EASE_USCITA, delay: ritardo ?? 0 };

  return (
    <span className={classi('figura figura--foto', className)}>
      {!anima ? (
        <img {...attributi} />
      ) : quando === 'subito' ? (
        <motion.img {...attributi} initial={FOTO_NASCOSTA} animate={FOTO_VISIBILE} transition={transizione} />
      ) : (
        <motion.img {...attributi} initial={FOTO_NASCOSTA} whileInView={FOTO_VISIBILE} viewport={VISTA} transition={transizione} />
      )}
    </span>
  );
}

function classi(base: string, aggiunta: string | undefined): string {
  return aggiunta ? `${base} ${aggiunta}` : base;
}
