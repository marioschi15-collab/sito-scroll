import type { ReactNode } from 'react';
import { comuni, onboarding } from '@spalla/it-copy';
import { Pulsante } from '../../componenti/Pulsante.js';
import { Cornice } from './Cornice.js';

export function Benvenuto({ onAvanti }: { onAvanti(): void }): ReactNode {
  const t = onboarding.s0.benvenuto;
  return (
    <Cornice passo={1} totale={5} titolo={t.titolo}>
      <p>{t.testo}</p>
      <div className="campo" style={{ maxWidth: 260 }}>
        <label className="campo__etichetta" htmlFor="lingua">
          {t.lingua}
        </label>
        <select id="lingua" className="selettore" defaultValue="it">
          <option value="it">{t.italiano}</option>
        </select>
      </div>
      <p className="attenuato piccolo">{comuni.poweredBy}</p>
      <div className="procedura__piede">
        <span />
        <Pulsante variante="primario" onClick={onAvanti}>
          {comuni.pulsanti.continua}
        </Pulsante>
      </div>
    </Cornice>
  );
}
