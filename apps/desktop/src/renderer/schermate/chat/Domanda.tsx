import { useState, type ReactNode } from 'react';
import { finestra, permessi } from '@spalla/it-copy';
import type { DomandaUtente } from '../../../nucleo/contratti.js';
import { Pulsante } from '../../componenti/Pulsante.js';

interface Props {
  domanda: DomandaUtente;
  risposta?: string[];
  onRispondi(risposte: string[]): void;
}

/**
 * Una domanda dell'assistente resa a chip: scelta singola (un tocco risponde) o multipla (si confermano le scelte).
 * Scrivere è sempre permesso: la casella in fondo alla chat risponde alla domanda in attesa.
 */
export function Domanda({ domanda, risposta, onRispondi }: Props): ReactNode {
  const [selezionate, setSelezionate] = useState<string[]>([]);
  const chiusa = risposta !== undefined;

  function tocca(etichetta: string): void {
    if (chiusa) return;
    if (!domanda.multiSelezione) {
      onRispondi([etichetta]);
      return;
    }
    setSelezionate((s) => (s.includes(etichetta) ? s.filter((e) => e !== etichetta) : [...s, etichetta]));
  }

  return (
    <div className="blocco-domanda" role="group" aria-label={domanda.intestazione ?? domanda.testo}>
      {domanda.intestazione ? <div className="blocco-domanda__intestazione">{domanda.intestazione}</div> : null}
      <p style={{ marginBottom: 6 }}>{domanda.testo}</p>
      {domanda.multiSelezione && !chiusa ? <p className="attenuato piccolo">{permessi.domanda.sceltaMultipla}</p> : null}
      <div className="chip-gruppo">
        {domanda.opzioni.map((o) => {
          const scelta = chiusa ? risposta.includes(o.etichetta) : selezionate.includes(o.etichetta);
          return (
            <button
              key={o.etichetta}
              type="button"
              className="chip"
              aria-pressed={domanda.multiSelezione || chiusa ? scelta : undefined}
              disabled={chiusa}
              onClick={() => tocca(o.etichetta)}
            >
              <span>{o.etichetta}</span>
              {o.descrizione ? <span className="chip__descrizione">{o.descrizione}</span> : null}
            </button>
          );
        })}
      </div>
      {chiusa ? (
        <p className="attenuato piccolo" style={{ margin: 0 }}>
          {finestra.chat.domanda.rispostaData(risposta)}
        </p>
      ) : domanda.multiSelezione ? (
        <div className="riga-azioni">
          <Pulsante variante="primario" piccolo disabled={selezionate.length === 0} onClick={() => onRispondi(selezionate)}>
            {finestra.chat.domanda.confermaScelte}
          </Pulsante>
          <span className="attenuato piccolo">{permessi.domanda.scriviRisposta}</span>
        </div>
      ) : (
        <p className="attenuato piccolo" style={{ margin: 0 }}>
          {permessi.domanda.scriviRisposta}
        </p>
      )}
    </div>
  );
}
