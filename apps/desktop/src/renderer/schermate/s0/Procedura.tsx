import { useState, type ReactNode } from 'react';
import type { SchermataIniziale } from '../../../ipc/contratto.js';
import { useStore } from '../../stato/store.js';
import { Abbonamento } from './Abbonamento.js';
import { Avvio } from './Avvio.js';
import { Benvenuto } from './Benvenuto.js';
import { Cervello, Confronto } from './Cervello.js';
import { ChiaveApi } from './ChiaveApi.js';
import { Motore } from './Motore.js';
import { Privacy } from './Privacy.js';

export type PassoS0 = 'benvenuto' | 'privacy' | 'avvio' | 'cervello' | 'confronto' | 'chiaveApi' | 'abbonamento' | 'motore';

function passoDaIniziale(s: SchermataIniziale): PassoS0 {
  return s === 'chat' ? 'motore' : s;
}

/** La procedura iniziale S0 (docs/05 §2.1): cinque schermate, con le diramazioni del cervello. */
export function Procedura({ passoIniziale }: { passoIniziale: SchermataIniziale }): ReactNode {
  const store = useStore();
  const [passo, setPasso] = useState<PassoS0>(passoDaIniziale(passoIniziale));
  const cartella = store.stato?.cartellaLavoro;

  async function fine(): Promise<void> {
    await store.aggiornaStato();
    store.proceduraFinita();
  }

  switch (passo) {
    case 'benvenuto':
      return <Benvenuto onAvanti={() => setPasso('privacy')} />;
    case 'privacy':
      return <Privacy cartella={cartella} onAvanti={() => setPasso('avvio')} onIndietro={() => setPasso('benvenuto')} />;
    case 'avvio':
      return <Avvio onAvanti={() => setPasso('cervello')} onIndietro={() => setPasso('privacy')} />;
    case 'cervello':
      return (
        <Cervello
          onAbbonamento={() => setPasso('abbonamento')}
          onChiaveApi={() => setPasso('chiaveApi')}
          onConfronto={() => setPasso('confronto')}
          onIndietro={() => setPasso('avvio')}
        />
      );
    case 'confronto':
      return <Confronto onAbbonamento={() => setPasso('abbonamento')} onChiaveApi={() => setPasso('chiaveApi')} onIndietro={() => setPasso('cervello')} />;
    case 'chiaveApi':
      return <ChiaveApi onCollegato={() => setPasso('motore')} onIndietro={() => setPasso('cervello')} />;
    case 'abbonamento':
      return <Abbonamento onCollegato={() => setPasso('motore')} onPreferiscoChiave={() => setPasso('chiaveApi')} onIndietro={() => setPasso('cervello')} />;
    case 'motore':
      return <Motore onFine={() => void fine()} />;
  }
}
