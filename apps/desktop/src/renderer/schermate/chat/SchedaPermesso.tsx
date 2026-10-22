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

/** Scheda di permesso (docs/02 §6): chi agisce, cosa vuole fare, anteprima, [Consenti] [Nega]. */
export function SchedaPermesso({ richiesta, esito, onDecidi }: Props): ReactNode {
  const chi = chiAgisce(richiesta.ruolo);
  return (
    <div className="scheda-permesso" role="group" aria-label={permessi.titolo(chi)}>
      <div className="scheda-permesso__chi">{permessi.titolo(chi)}</div>
      <p style={{ margin: '4px 0 0', fontWeight: 550 }}>{richiesta.descrizione}</p>
      {richiesta.anteprima ? (
        <>
          <span className="attenuato piccolo">{permessi.anteprima}</span>
          <pre>{richiesta.anteprima}</pre>
        </>
      ) : null}
      {esito ? (
        <p className="attenuato piccolo" style={{ margin: '8px 0 0' }}>
          {esito === 'consenti' ? finestra.chat.permesso.consentito : esito === 'nega' ? finestra.chat.permesso.negato : finestra.chat.permesso.ritirato}
        </p>
      ) : (
        <div className="riga-azioni">
          <Pulsante variante="primario" onClick={() => onDecidi('consenti')}>
            {permessi.pulsanti.consenti}
          </Pulsante>
          <Pulsante onClick={() => onDecidi('nega')}>{permessi.pulsanti.nega}</Pulsante>
        </div>
      )}
    </div>
  );
}
