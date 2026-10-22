import { useState, type ReactNode } from 'react';
import { comuni, onboarding } from '@spalla/it-copy';
import { Pulsante } from '../../componenti/Pulsante.js';
import { spalla } from '../../stato/api.js';
import { Cornice } from './Cornice.js';

export function Avvio({ onAvanti, onIndietro }: { onAvanti(): void; onIndietro(): void }): ReactNode {
  const t = onboarding.s0.avvioAutomatico;
  const [automatico, setAutomatico] = useState(true);
  const [notifiche, setNotifiche] = useState<string | null>(null);

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

  async function permettiNotifiche(): Promise<void> {
    try {
      const N = (globalThis as { Notification?: { requestPermission?: () => Promise<string> } }).Notification;
      const esito = N && N.requestPermission ? await N.requestPermission() : 'default';
      setNotifiche(esito === 'granted' ? comuni.pulsanti.fatto : esito);
    } catch {
      setNotifiche(comuni.pulsanti.fatto);
    }
  }

  return (
    <Cornice passo={3} totale={5} titolo={t.titolo}>
      <p>{t.testo}</p>
      <label className="spunta">
        <input type="checkbox" checked={automatico} onChange={(e) => setAutomatico(e.target.checked)} />
        <span>{t.attiva}</span>
      </label>
      <div className="riga-azioni">
        <Pulsante onClick={() => void permettiNotifiche()} disabled={notifiche !== null}>
          {t.notifiche}
        </Pulsante>
        {notifiche ? <span className="attenuato piccolo">{notifiche === comuni.pulsanti.fatto ? comuni.pulsanti.fatto : ''}</span> : null}
      </div>
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
