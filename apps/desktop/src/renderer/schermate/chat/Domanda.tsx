import { useId, useState, type FormEvent, type ReactNode } from 'react';
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
 * Una domanda dell'assistente resa a chip, con una casella nel riquadro (docs/05 §1.2):
 * - scelta singola: un tocco risponde; se nella casella c'è del testo, chip e testo arrivano insieme
 *   (Q1 «Come ti chiamo? Del tu?» → «Del tu, Marco»);
 * - scelta multipla: si toccano le chip (al massimo `maxSelezioni`, se c'è) e si conferma; il testo si aggiunge;
 * - Invio nella casella risponde con il testo (e le scelte già toccate). Le scelte non si perdono mai.
 */
export function Domanda({ domanda, risposta, chiusa: chiusaSenzaRisposta, selezione = [], onSeleziona, onRispondi }: Props): ReactNode {
  const [testo, setTesto] = useState('');
  const idCampo = useId();
  const risposto = risposta !== undefined;
  const chiusa = risposto || chiusaSenzaRisposta === true;
  const massimo = domanda.multiSelezione ? domanda.maxSelezioni : undefined;
  const pieno = massimo !== undefined && selezione.length >= massimo;

  function conTesto(scelte: string[]): string[] {
    const t = testo.trim();
    return t ? [...scelte, t] : scelte;
  }

  function tocca(etichetta: string): void {
    if (chiusa) return;
    if (!domanda.multiSelezione) {
      onRispondi(conTesto([etichetta]));
      return;
    }
    if (selezione.includes(etichetta)) onSeleziona(selezione.filter((e) => e !== etichetta));
    else if (!pieno) onSeleziona([...selezione, etichetta]);
  }

  function inviaTesto(e: FormEvent): void {
    e.preventDefault();
    if (chiusa) return;
    const risposte = conTesto(domanda.multiSelezione ? selezione : []);
    if (risposte.length > 0) onRispondi(risposte);
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
        <form className="blocco-domanda__risposta" onSubmit={inviaTesto} noValidate>
          <label className="campo__etichetta piccolo" htmlFor={idCampo}>
            {finestra.chat.domanda.campo}
          </label>
          <div className="riga-azioni" style={{ marginTop: 4 }}>
            <input
              id={idCampo}
              className="ingresso"
              type="text"
              value={testo}
              maxLength={2000}
              onChange={(e) => setTesto(e.target.value)}
              aria-describedby={`${idCampo}-nota`}
            />
            {domanda.multiSelezione ? (
              <Pulsante variante="primario" piccolo type="submit" disabled={selezione.length === 0 && !testo.trim()}>
                {finestra.chat.domanda.confermaScelte}
              </Pulsante>
            ) : (
              <Pulsante piccolo type="submit" disabled={!testo.trim()}>
                {finestra.chat.domanda.invia}
              </Pulsante>
            )}
          </div>
          <span id={`${idCampo}-nota`} className="attenuato piccolo">
            {domanda.multiSelezione ? permessi.domanda.scriviRisposta : finestra.chat.domanda.suggerimentoCampo}
          </span>
        </form>
      )}
    </div>
  );
}
