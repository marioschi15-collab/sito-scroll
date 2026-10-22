import type { ReactNode } from 'react';
import { useStore } from '../stato/store.js';
import { Avviso } from './Avviso.js';

/** Avvisi flottanti dal processo principale e dalle schermate (`evento.notifica`). */
export function Notifiche(): ReactNode {
  const { notifiche, chiudiNotifica } = useStore();
  if (notifiche.length === 0) return null;
  const livello = (l: string): 'info' | 'ok' | 'attenzione' | 'errore' => (l === 'avviso' ? 'attenzione' : l === 'errore' ? 'errore' : l === 'ok' ? 'ok' : 'info');
  return (
    <div className="notifiche" aria-live="polite">
      {notifiche.map((n) => (
        <Avviso key={n.id} livello={livello(n.livello)} titolo={n.titolo} onChiudi={() => chiudiNotifica(n.id)}>
          {n.testo}
        </Avviso>
      ))}
    </div>
  );
}
