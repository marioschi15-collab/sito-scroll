import type { ReactNode } from 'react';
import { cervello, comuni } from '@spalla/it-copy';
import { Pulsante } from '../../componenti/Pulsante.js';
import { Cornice } from './Cornice.js';

interface Props {
  onAbbonamento(): void;
  onChiaveApi(): void;
  onConfronto(): void;
  onIndietro(): void;
}

/** Schermata 4: due pulsanti di pari peso, più il confronto per chi non ha nessuno dei due. */
export function Cervello({ onAbbonamento, onChiaveApi, onConfronto, onIndietro }: Props): ReactNode {
  return (
    <Cornice passo={4} totale={5} titolo={cervello.titolo}>
      <p>{cervello.sottotitolo}</p>
      <div className="scelte-pari">
        <Pulsante grande onClick={onAbbonamento}>
          {cervello.scelta.abbonamento}
        </Pulsante>
        <Pulsante grande onClick={onChiaveApi}>
          {cervello.scelta.chiaveApi}
        </Pulsante>
      </div>
      <Pulsante variante="discreto" onClick={onConfronto}>
        {cervello.scelta.nessuno}
      </Pulsante>
      <div className="procedura__piede">
        <Pulsante onClick={onIndietro}>{comuni.pulsanti.indietro}</Pulsante>
        <span />
      </div>
    </Cornice>
  );
}

export function Confronto({ onAbbonamento, onChiaveApi, onIndietro }: Omit<Props, 'onConfronto'>): ReactNode {
  const t = cervello.confronto;
  return (
    <Cornice passo={4} totale={5} titolo={t.titolo}>
      <div className="confronto">
        <div className="scheda scheda--piatta">{t.pro}</div>
        <div className="scheda scheda--piatta">{t.chiave}</div>
        <div className="scheda scheda--piatta">{t.max}</div>
      </div>
      <p>
        <strong>{t.consiglio}</strong>
      </p>
      <div className="scelte-pari">
        <Pulsante grande onClick={onAbbonamento}>
          {cervello.scelta.abbonamento}
        </Pulsante>
        <Pulsante grande onClick={onChiaveApi}>
          {cervello.scelta.chiaveApi}
        </Pulsante>
      </div>
      <div className="procedura__piede">
        <Pulsante onClick={onIndietro}>{comuni.pulsanti.indietro}</Pulsante>
        <span />
      </div>
    </Cornice>
  );
}
