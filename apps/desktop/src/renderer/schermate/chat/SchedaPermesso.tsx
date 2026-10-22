import type { ReactNode } from 'react';
import { comuni, etichettaRuolo, finestra, permessi } from '@spalla/it-copy';
import { Pulsante } from '../../componenti/Pulsante.js';
import type { RichiestaPermessoVista } from '../../stato/chat.js';

interface Props {
  richiesta: RichiestaPermessoVista;
  esito?: 'consenti' | 'nega' | 'ritirato';
  onDecidi(esito: 'consenti' | 'nega'): void;
}

/** Chi agisce, come lo vede l'utente: "L'assistente", "La Segretaria", "Il ruolo «fornitori»". */
export function chiAgisce(ruolo?: string): string {
  if (!ruolo) return comuni.chiAgisce.assistente;
  const etichetta = etichettaRuolo(ruolo);
  return etichetta === ruolo && !comuni.ruoli[ruolo] ? comuni.chiAgisce.ruoloGenerico(ruolo) : comuni.chiAgisce.ruolo(etichetta);
}

/**
 * Scheda di permesso (docs/02 §6): chi agisce, cosa vuole fare, il testo ESATTO dell'azione per intero (comando della
 * shell, contenuto scritto) in un riquadro scorrevole, poi la spiegazione dell'assistente etichettata come sua,
 * [Consenti] [Nega]. Se il testo non è arrivato per intero, [Consenti] resta spento.
 */
export function SchedaPermesso({ richiesta, esito, onDecidi }: Props): ReactNode {
  const chi = chiAgisce(richiesta.ruolo);
  const d = richiesta.dettaglio;
  const idDettaglio = `permesso-dettaglio-${richiesta.id}`;
  return (
    <div className="scheda-permesso" role="group" aria-label={permessi.titolo(chi)}>
      <div className="scheda-permesso__chi">{permessi.titolo(chi)}</div>
      <p style={{ margin: '4px 0 0', fontWeight: 550 }}>{richiesta.descrizione}</p>
      {d ? (
        <>
          <span className="attenuato piccolo" id={idDettaglio}>
            {d.tipo === 'comando' ? permessi.dettaglio.comando : permessi.dettaglio.contenuto}
          </span>
          {/* Scorrevole e raggiungibile da tastiera: nulla del comando resta nascosto dietro un "…". */}
          <pre className="scheda-permesso__dettaglio" tabIndex={0} aria-labelledby={idDettaglio}>
            {d.testo}
          </pre>
          {d.troncato ? <p className="scheda-permesso__avviso">{permessi.dettaglio.troppoLungo}</p> : null}
        </>
      ) : richiesta.anteprima ? (
        <>
          <span className="attenuato piccolo">{permessi.anteprima}</span>
          <pre>{richiesta.anteprima}</pre>
        </>
      ) : null}
      {richiesta.spiegazione ? (
        <p className="scheda-permesso__spiegazione">
          <span className="attenuato piccolo">{permessi.dettaglio.spiegazione}: </span>
          {richiesta.spiegazione}
        </p>
      ) : null}
      {esito ? (
        <p className="attenuato piccolo" style={{ margin: '8px 0 0' }}>
          {esito === 'consenti' ? finestra.chat.permesso.consentito : esito === 'nega' ? finestra.chat.permesso.negato : finestra.chat.permesso.ritirato}
        </p>
      ) : (
        <div className="riga-azioni">
          <Pulsante variante="primario" onClick={() => onDecidi('consenti')} disabled={d?.troncato === true}>
            {permessi.pulsanti.consenti}
          </Pulsante>
          <Pulsante onClick={() => onDecidi('nega')}>{permessi.pulsanti.nega}</Pulsante>
        </div>
      )}
    </div>
  );
}
