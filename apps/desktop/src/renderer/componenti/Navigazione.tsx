import type { ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';
import { useStore, type Sezione } from '../stato/store.js';

const VOCI: Array<{ id: Sezione; etichetta: string; simbolo: string }> = [
  { id: 'chat', etichetta: finestra.navigazione.chat, simbolo: '💬' },
  { id: 'squadra', etichetta: finestra.navigazione.squadra, simbolo: '👥' },
  { id: 'memoria', etichetta: finestra.navigazione.memoria, simbolo: '📒' },
  { id: 'telegram', etichetta: finestra.navigazione.telegram, simbolo: '✈️' },
  { id: 'impostazioni', etichetta: finestra.navigazione.impostazioni, simbolo: '⚙️' },
  { id: 'presentazioni', etichetta: finestra.navigazione.presentazioni, simbolo: '🪞' },
];

/** Barra laterale delle sezioni. */
export function Navigazione(): ReactNode {
  const { sezione, vai, stato } = useStore();
  return (
    <nav className="nav" aria-label={finestra.navigazione.etichetta}>
      <div className="nav__marchio">
        {stato?.prodotto ?? 'Spalla'}
        {stato?.nomeAssistente ? <small>{stato.nomeAssistente}</small> : null}
      </div>
      {VOCI.map((v) => (
        <button key={v.id} type="button" className="nav__voce" aria-current={sezione === v.id ? 'page' : undefined} onClick={() => vai(v.id)}>
          <span aria-hidden="true">{v.simbolo}</span>
          <span className="nav__etichetta">{v.etichetta}</span>
        </button>
      ))}
      <div className="nav__spazio" />
      {stato ? <div className="nav__piede">{finestra.impostazioni.versione(stato.versione)}</div> : null}
    </nav>
  );
}
