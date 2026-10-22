import type { ReactNode } from 'react';
import { comuni, onboarding } from '@spalla/it-copy';
import { Pulsante } from '../../componenti/Pulsante.js';
import { spalla } from '../../stato/api.js';
import { Cornice } from './Cornice.js';

/** Indirizzo dell'informativa: lo apre il processo principale nel browser di sistema. */
export const LINK_INFORMATIVA = 'https://spalla.it/privacy';

export function Privacy({ cartella, onAvanti, onIndietro }: { cartella?: string; onAvanti(): void; onIndietro(): void }): ReactNode {
  const t = onboarding.s0.privacy;
  return (
    <Cornice passo={2} totale={5} titolo={t.titolo}>
      <ul className="elenco-privacy">
        <li>
          <strong>{t.dove}</strong>
          {cartella ? <code className="attenuato">{cartella}</code> : null}
        </li>
        <li>{t.anthropic}</li>
        <li>{t.noi}</li>
        <li>{t.clienti}</li>
      </ul>
      <Pulsante variante="discreto" onClick={() => void spalla().app.apriLink(LINK_INFORMATIVA)}>
        {t.link}
      </Pulsante>
      <div className="procedura__piede">
        <Pulsante onClick={onIndietro}>{comuni.pulsanti.indietro}</Pulsante>
        <Pulsante variante="primario" onClick={onAvanti}>
          {t.accetto}
        </Pulsante>
      </div>
    </Cornice>
  );
}
