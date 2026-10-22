import type { ReactNode } from 'react';
import { etichettaRuolo, finestra } from '@spalla/it-copy';
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
      <span aria-hidden="true">· </span>
      {ruolo ? `${etichettaRuolo(ruolo)}: ` : ''}
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

/**
 * Cambio dollari → euro mostrato nella finestra: lo stesso `CAMBIO_USD_EUR` di @spalla/schema (che la finestra non
 * può importare: usa moduli di Node). Una prova li confronta.
 */
export const CAMBIO_VISTO = 0.92;

/**
 * Durata e, solo con la chiave API, la spesa di questa risposta in euro (docs/05 §1.10: costi detti onestamente).
 * Con l'abbonamento l'SDK riporta un costo teorico che l'utente non paga: non si mostra.
 */
export function RigaFine({ durataMs, costoUsd, conChiaveApi }: { durataMs: number; costoUsd?: number; conChiaveApi: boolean }): ReactNode {
  const costoEur = conChiaveApi && costoUsd !== undefined ? costoUsd * CAMBIO_VISTO : undefined;
  return <div className="riga-fine">{finestra.chat.fine(durataMs / 1000, costoEur)}</div>;
}
