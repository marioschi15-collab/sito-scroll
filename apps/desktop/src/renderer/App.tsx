import { useEffect, type ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';
import { Avviso } from './componenti/Avviso.js';
import { Navigazione } from './componenti/Navigazione.js';
import { Notifiche } from './componenti/Notifiche.js';
import { Chat } from './schermate/chat/Chat.js';
import { Impostazioni } from './schermate/impostazioni/Impostazioni.js';
import { Memoria } from './schermate/memoria/Memoria.js';
import { Presentazioni } from './schermate/presentazioni/Presentazioni.js';
import { Procedura } from './schermate/s0/Procedura.js';
import { Squadra } from './schermate/squadra/Squadra.js';
import { Telegram } from './schermate/telegram/Telegram.js';
import { spalla, spallaDisponibile } from './stato/api.js';
import { FornitoreChat } from './stato/chatContesto.js';
import { FornitoreStore, useStore, type Sezione } from './stato/store.js';

function SezioneAttiva({ sezione }: { sezione: Sezione }): ReactNode {
  switch (sezione) {
    case 'chat':
      return <Chat />;
    case 'squadra':
      return <Squadra />;
    case 'memoria':
      return <Memoria />;
    case 'telegram':
      return <Telegram />;
    case 'impostazioni':
      return <Impostazioni />;
    case 'presentazioni':
      return <Presentazioni />;
  }
}

/** L'app dopo S0: navigazione a sinistra, sezione a destra; la chat resta viva anche nelle altre sezioni. */
function Principale(): ReactNode {
  const { sezione, vai } = useStore();

  // Il processo principale può chiedere di aprire una sezione (es. il rituale ha scritto [[APRI:TELEGRAM]]).
  useEffect(() => {
    if (!spallaDisponibile()) return;
    const iscrivi = spalla().on.apriSchermata;
    if (typeof iscrivi !== 'function') return;
    return iscrivi(({ schermata }) => vai(schermata));
  }, [vai]);

  return (
    <FornitoreChat>
      <div className="app">
        <Navigazione />
        <main className="contenuto" id="contenuto">
          <SezioneAttiva sezione={sezione} />
        </main>
      </div>
    </FornitoreChat>
  );
}

function Radice(): ReactNode {
  const { stato, inProcedura, passoIniziale, erroreAvvio } = useStore();
  if (erroreAvvio && !stato) {
    return (
      <div className="procedura">
        <div className="procedura__corpo">
          <Avviso livello="errore">{erroreAvvio}</Avviso>
        </div>
      </div>
    );
  }
  if (!stato) {
    return (
      <div className="procedura" role="status">
        <p className="attenuato">{finestra.generale.caricamento}</p>
      </div>
    );
  }
  return inProcedura ? <Procedura passoIniziale={passoIniziale} /> : <Principale />;
}

export function App(): ReactNode {
  return (
    <FornitoreStore>
      <Radice />
      <Notifiche />
    </FornitoreStore>
  );
}
