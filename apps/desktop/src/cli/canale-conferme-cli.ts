import { permessi } from '@spalla/it-copy';
import type { CanaleConferme, DecisionePermesso, RichiestaPermesso } from '../nucleo/contratti.js';
import type { Terminale } from './terminale.js';
import { testiCli } from './testi.js';

/** Risposta s/n del terminale → decisione. Qualunque cosa diversa da sì è un no. */
export function interpretaConferma(riga: string | null): DecisionePermesso {
  const r = (riga ?? '').trim().toLowerCase();
  if (r === 's' || r === 'si' || r === 'sì' || r === 'y' || r === 'yes') return { esito: 'consenti' };
  return { esito: 'nega', motivo: riga === null ? testiCli.permesso.terminaleChiuso : testiCli.permesso.negato };
}

/**
 * Il canale "desktop" del Permission Broker nel terminale di sviluppo (docs/02 §6): mostra la scheda in italiano
 * con l'anteprima e chiede s/n. Disponibile finché il terminale è aperto; l'inattività la gestisce il Broker.
 */
export function creaCanaleConfermeCli(t: Terminale): CanaleConferme {
  return {
    nome: 'desktop',
    disponibile: () => !t.chiuso,
    async chiediConferma(richiesta: RichiestaPermesso) {
      t.scrivi('\n' + t.evidenzia(testiCli.permesso.titolo(richiesta.id)) + '\n');
      t.scrivi(`${richiesta.descrizione}\n`);
      // Il testo esatto (comando, contenuto) per intero e per primo; la spiegazione dell'assistente a parte.
      const daMostrare = richiesta.dettaglio?.testo ?? richiesta.anteprima;
      if (daMostrare) {
        for (const riga of daMostrare.split('\n')) t.scrivi(t.attenua(`    ${riga}`) + '\n');
      }
      if (richiesta.spiegazione) t.scrivi(t.attenua(`  ${permessi.dettaglio.spiegazione}: ${richiesta.spiegazione}`) + '\n');
      const riga = await t.chiedi(testiCli.permesso.domanda, richiesta.annullamento);
      if (riga === null && richiesta.annullamento?.aborted) {
        // La sessione si è interrotta: la domanda è stata ritirata, la prossima riga non è una risposta a questa scheda.
        t.scrivi(t.attenua(testiCli.permesso.annullata) + '\n');
        return { esito: 'nega', motivo: testiCli.permesso.motivoAnnullata };
      }
      return interpretaConferma(riga);
    },
  };
}
