import type { ReactNode } from 'react';
import { cervello, finestra, onboarding } from '@spalla/it-copy';
import { Pulsante } from '../../componenti/Pulsante.js';
import { Cornice } from './Cornice.js';

/** Schermata 5: il motore è pronto (il binario è incluso: nessun download da aspettare nel prototipo). */
export function Motore({ onFine }: { onFine(): void }): ReactNode {
  const t = onboarding.s0.pronto;
  return (
    <Cornice passo={5} totale={5} titolo={t.titolo}>
      <p>{cervello.motore.pronto}</p>
      <p>{t.testo}</p>
      <div className="procedura__piede">
        <span />
        <Pulsante variante="primario" onClick={onFine}>
          {finestra.s0.motore.continua}
        </Pulsante>
      </div>
    </Cornice>
  );
}
