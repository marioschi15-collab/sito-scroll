import type { ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';

interface Props {
  livello?: 'info' | 'ok' | 'attenzione' | 'errore';
  titolo?: string;
  children: ReactNode;
  onChiudi?: () => void;
}

/** Riquadro di avviso in linea: informazione, esito positivo, attenzione o errore. */
export function Avviso({ livello = 'info', titolo, children, onChiudi }: Props): ReactNode {
  const ruolo = livello === 'errore' || livello === 'attenzione' ? 'alert' : 'status';
  return (
    <div className={`avviso avviso--${livello}`} role={ruolo}>
      <div className="avviso__testo">
        {titolo ? <strong className="notifica__titolo">{titolo}</strong> : null}
        {children}
      </div>
      {onChiudi ? (
        <button type="button" className="avviso__chiudi" onClick={onChiudi} aria-label={finestra.generale.chiudiAvviso}>
          ×
        </button>
      ) : null}
    </div>
  );
}
