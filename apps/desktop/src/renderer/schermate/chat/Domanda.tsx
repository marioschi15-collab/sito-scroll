import type { ReactNode } from 'react';
import { finestra, permessi } from '@spalla/it-copy';
import type { DomandaUtente } from '../../../nucleo/contratti.js';
import { Pulsante } from '../../componenti/Pulsante.js';

interface Props {
  domanda: DomandaUtente;
  risposta?: string[];
  /** Lo scambio è finito o fermato senza risposta: chip spente. */
  chiusa?: boolean;
  /** Scelte toccate (scelta multipla), tenute nello stato della chat: la casella in fondo le manda insieme al testo. */
  selezione?: string[];
  onSeleziona(etichette: string[]): void;
  onRispondi(risposte: string[]): void;
}

/**
 * Una domanda dell'assistente resa a chip (docs/05 §1.2). Nel riquadro solo le scelte: la risposta con parole
 * proprie si scrive nella casella in fondo alla chat, l'unica, che risponde alla domanda aperta (chatContesto.invia).
 * Prima c'era una seconda casella nel riquadro: nella prova su Windows del 25/10 due caselle confondevano.
 * - scelta singola: un tocco risponde;
 * - scelta multipla: si toccano le chip (al massimo `maxSelezioni`, se c'è) e si conferma; se invece si scrive
 *   nella casella in fondo, le scelte già toccate arrivano insieme al testo. Le scelte non si perdono mai.
 */
export function Domanda({ domanda, risposta, chiusa: chiusaSenzaRisposta, selezione = [], onSeleziona, onRispondi }: Props): ReactNode {
  const risposto = risposta !== undefined;
  const chiusa = risposto || chiusaSenzaRisposta === true;
  const massimo = domanda.multiSelezione ? domanda.maxSelezioni : undefined;
  const pieno = massimo !== undefined && selezione.length >= massimo;

  function tocca(etichetta: string): void {
    if (chiusa) return;
    if (!domanda.multiSelezione) {
      onRispondi([etichetta]);
      return;
    }
    if (selezione.includes(etichetta)) onSeleziona(selezione.filter((e) => e !== etichetta));
    else if (!pieno) onSeleziona([...selezione, etichetta]);
  }

  return (
    <div className="blocco-domanda" role="group" aria-label={domanda.intestazione ?? domanda.testo}>
      {domanda.intestazione ? <div className="blocco-domanda__intestazione">{domanda.intestazione}</div> : null}
      <p style={{ marginBottom: 6 }}>{domanda.testo}</p>
      {domanda.multiSelezione && !chiusa ? (
        <p className="attenuato piccolo">{massimo !== undefined ? finestra.chat.domanda.massimo(massimo) : permessi.domanda.sceltaMultipla}</p>
      ) : null}
      <div className="chip-gruppo">
        {domanda.opzioni.map((o) => {
          const scelta = risposto ? risposta.includes(o.etichetta) : selezione.includes(o.etichetta);
          return (
            <button
              key={o.etichetta}
              type="button"
              className="chip"
              aria-pressed={domanda.multiSelezione || risposto ? scelta : undefined}
              disabled={chiusa || (pieno && !scelta)}
              onClick={() => tocca(o.etichetta)}
            >
              <span>{o.etichetta}</span>
              {o.descrizione ? <span className="chip__descrizione">{o.descrizione}</span> : null}
            </button>
          );
        })}
      </div>
      {risposto ? (
        <p className="attenuato piccolo" style={{ margin: 0 }}>
          {finestra.chat.domanda.rispostaData(risposta)}
        </p>
      ) : chiusa ? (
        <p className="attenuato piccolo" style={{ margin: 0 }}>
          {finestra.chat.domanda.chiusa}
        </p>
      ) : (
        <div className="riga-azioni" style={{ marginTop: 4 }}>
          {domanda.multiSelezione ? (
            <Pulsante variante="primario" piccolo onClick={() => onRispondi(selezione)} disabled={selezione.length === 0}>
              {finestra.chat.domanda.confermaScelte}
            </Pulsante>
          ) : null}
          <span className="attenuato piccolo">{finestra.chat.domanda.suggerimento}</span>
        </div>
      )}
    </div>
  );
}
