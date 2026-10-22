import type { AuthProvider } from '../contratti.js';
import { messaggioPerEsito } from './chiave-api.js';
import { provaCollegamento, type OpzioniProva } from './prova-collegamento.js';

/**
 * Modalità B — abbonamento Claude dell'utente (docs/02 §2.2, §2.3, ADR-003).
 * Il login lo fa il binario stesso (`/login` nel pannello terminale visibile), dentro il suo
 * CLAUDE_CONFIG_DIR: noi non aggiungiamo variabili e non leggiamo nulla. Verifichiamo solo che una
 * richiesta di una riga riceva risposta.
 */
export function creaAuthAbbonamento(opzioni: OpzioniProva = {}): AuthProvider {
  return {
    modalita: 'abbonamento',
    async variabiliAmbiente() {
      return {};
    },
    async verifica() {
      const esito = await provaCollegamento({}, opzioni);
      return { ok: esito.ok, messaggio: messaggioPerEsito(esito, 'abbonamento') };
    },
  };
}
