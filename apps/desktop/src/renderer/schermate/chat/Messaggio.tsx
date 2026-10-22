import type { ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';
import type { Blocco } from '../../stato/chat.js';

type BloccoUtente = Extract<Blocco, { tipo: 'utente' }>;
type BloccoAssistente = Extract<Blocco, { tipo: 'assistente' }>;

export function MessaggioUtente({ blocco }: { blocco: BloccoUtente }): ReactNode {
  return (
    <div className="messaggio messaggio--utente">
      <span className="messaggio__mittente">{finestra.chat.tu}</span>
      {blocco.testo}
      {blocco.allegati && blocco.allegati.length > 0 ? (
        <span className="messaggio__allegati">{finestra.chat.allegati.aggiunti(blocco.allegati.length)}</span>
      ) : null}
    </div>
  );
}

export function MessaggioAssistente({ blocco, nome }: { blocco: BloccoAssistente; nome: string }): ReactNode {
  return (
    <div className={`messaggio messaggio--assistente${blocco.inCorso ? ' in-corso' : ''}`}>
      <span className="messaggio__mittente">{nome}</span>
      {blocco.testo}
    </div>
  );
}

export function RigaStrumento({ descrizione, ruolo }: { descrizione: string; ruolo?: string }): ReactNode {
  return (
    <div className="riga-strumento">
      · {ruolo ? `[${ruolo}] ` : ''}
      {descrizione}
    </div>
  );
}

export function RigaSistema({ testo, dettagli }: { testo: string; dettagli?: string[] }): ReactNode {
  return (
    <div className="riga-sistema">
      {testo}
      {dettagli && dettagli.length > 0 ? (
        <ul style={{ textAlign: 'left', margin: '6px auto 0', maxWidth: 560 }}>
          {dettagli.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function RigaFine({ durataMs, costoUsd }: { durataMs: number; costoUsd?: number }): ReactNode {
  return <div className="riga-fine">{finestra.chat.fine(durataMs / 1000, costoUsd)}</div>;
}
