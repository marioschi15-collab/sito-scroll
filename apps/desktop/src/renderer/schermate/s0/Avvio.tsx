import { useState, type ReactNode } from 'react';
import { comuni, onboarding } from '@spalla/it-copy';
import { Pulsante } from '../../componenti/Pulsante.js';
import { spalla } from '../../stato/api.js';
import { Cornice } from './Cornice.js';

/**
 * S0 schermata 3 (docs/05 §2): avvio automatico. Niente pulsante "Permetti le notifiche": la finestra non può
 * chiederle (le notifiche le manda il processo principale, e il sistema chiede il permesso alla prima che arriva).
 * Resta la frase che spiega i permessi che il sistema chiederà.
 */
export function Avvio({ onAvanti, onIndietro }: { onAvanti(): void; onIndietro(): void }): ReactNode {
  const t = onboarding.s0.avvioAutomatico;
  const [automatico, setAutomatico] = useState(true);

  async function continua(): Promise<void> {
    try {
      const api = spalla();
      const attuali = await api.impostazioni.leggi();
      if (attuali.avvioAutomatico !== automatico) await api.impostazioni.salva({ ...attuali, avvioAutomatico: automatico });
    } catch {
      // l'impostazione si può cambiare dopo, dalle Impostazioni
    }
    onAvanti();
  }

  return (
    <Cornice passo={3} totale={5} titolo={t.titolo}>
      <p>{t.testo}</p>
      <label className="spunta">
        <input type="checkbox" checked={automatico} onChange={(e) => setAutomatico(e.target.checked)} />
        <span>{t.attiva}</span>
      </label>
      <p className="attenuato piccolo" style={{ marginTop: 16 }}>
        {t.permessiMac}
      </p>
      <div className="procedura__piede">
        <Pulsante onClick={onIndietro}>{comuni.pulsanti.indietro}</Pulsante>
        <Pulsante variante="primario" onClick={() => void continua()}>
          {comuni.pulsanti.continua}
        </Pulsante>
      </div>
    </Cornice>
  );
}
