// src/componenti/IntestazioneSezione.tsx — etichetta, titolo h2 che si rivela, introduzione ed eventuali extra.
// Il titolo ha id "titolo-<ancora>", tabIndex -1 e data-titolo-sezione: è lì che scorriA porta il focus.
import type { ReactElement, ReactNode } from 'react';
import { Entra } from '../movimento/Entra.js';
import { Rivela } from '../movimento/Rivela.js';
import { Etichetta } from './Etichetta.js';
import '../stili/etichetta.css';

export interface PropsIntestazioneSezione {
  ancora: string; // 'studio' → h2 con id 'titolo-studio'
  numero: string; // '01'
  etichetta: string; // 'Lo studio'
  titolo: string; // con *corsivo*
  intro?: string;
  className?: string;
  children?: ReactNode; // sotto l'intro (es. un link)
}

export function IntestazioneSezione({
  ancora,
  numero,
  etichetta,
  titolo,
  intro,
  className,
  children,
}: PropsIntestazioneSezione): ReactElement {
  return (
    <div className={className ? `intestazione ${className}` : 'intestazione'}>
      <Etichetta numero={numero} testo={etichetta} />
      <Rivela
        as="h2"
        id={`titolo-${ancora}`}
        className="t-h2 intestazione__titolo"
        tabIndex={-1}
        titoloSezione
        testo={titolo}
      />
      {intro ? (
        <Entra as="p" className="t-intro t-secondario intestazione__intro" ritardo={0.15}>
          {intro}
        </Entra>
      ) : null}
      {children !== undefined && children !== null && children !== false ? (
        <Entra ritardo={0.25}>{children}</Entra>
      ) : null}
    </div>
  );
}
