// src/componenti/GruppoScelte.tsx — pillole a scelta singola con l'evidenza che scivola sulla voce scelta.
// Modo 'radio' (predefinito) per il modulo: veri radio, le frecce si muovono tra le opzioni.
// Modo 'pulsanti' per i filtri: button con aria-pressed.
import type { ReactElement } from 'react';
import { motion } from 'motion/react';
import { MOLLA_SCELTA } from '../movimento/costanti.js';
import '../stili/scelte.css';

export interface Scelta<V extends string> {
  valore: V;
  etichetta: string;
}

export interface PropsGruppoScelte<V extends string> {
  /** Nome del gruppo: `name` dei radio, prefisso degli id, layoutId `scelta-${nome}`. Unico nella pagina. */
  nome: string;
  legenda: string;
  legendaNascosta?: boolean;
  scelte: readonly Scelta<V>[];
  valore: V | null;
  onCambia: (valore: V) => void;
  /** 'radio' (predefinito) per il modulo; 'pulsanti' (button aria-pressed) per i filtri. */
  modo?: 'radio' | 'pulsanti';
  idDescrizione?: string;
  className?: string;
}

/** L'evidenza piena sotto la voce scelta: una sola per gruppo, scivola grazie al layoutId condiviso. */
function Evidenza({ nome }: { nome: string }): ReactElement {
  return <motion.span layoutId={`scelta-${nome}`} className="scelte__evidenza" transition={MOLLA_SCELTA} />;
}

export function GruppoScelte<V extends string>({
  nome,
  legenda,
  legendaNascosta = false,
  scelte,
  valore,
  onCambia,
  modo = 'radio',
  idDescrizione,
  className,
}: PropsGruppoScelte<V>): ReactElement {
  const classi = ['scelte', `scelte--${modo}`, className].filter(Boolean).join(' ');

  if (modo === 'pulsanti') {
    const idLegenda = `${nome}-legenda`;
    return (
      <div className={classi} role="group" aria-labelledby={idLegenda} aria-describedby={idDescrizione}>
        <p id={idLegenda} className={legendaNascosta ? 'sr-only' : 'scelte__legenda t-etichetta t-secondario'}>
          {legenda}
        </p>
        <div className="scelte__elenco">
          {scelte.map((scelta) => {
            const selezionata = scelta.valore === valore;
            return (
              <button
                key={scelta.valore}
                type="button"
                className="scelte__voce"
                data-scelta={selezionata}
                aria-pressed={selezionata}
                onClick={() => onCambia(scelta.valore)}
              >
                {selezionata ? <Evidenza nome={nome} /> : null}
                <span className="scelte__testo">{scelta.etichetta}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <fieldset className={classi} aria-describedby={idDescrizione}>
      <legend className={legendaNascosta ? 'sr-only' : 'scelte__legenda'}>{legenda}</legend>
      <div className="scelte__elenco">
        {scelte.map((scelta) => {
          const selezionata = scelta.valore === valore;
          // Il radio sta DENTRO la sua etichetta: niente id né htmlFor. Un id come "stile-tradizionale"
          // esiste già nell'indice degli stili, e con un id doppio l'etichetta non comanderebbe più il radio.
          return (
            <label key={scelta.valore} className="scelte__voce" data-scelta={selezionata}>
              <input
                type="radio"
                className="sr-only"
                name={nome}
                value={scelta.valore}
                checked={selezionata}
                onChange={() => onCambia(scelta.valore)}
              />
              {selezionata ? <Evidenza nome={nome} /> : null}
              <span className="scelte__testo">{scelta.etichetta}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
