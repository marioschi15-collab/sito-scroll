import type { AuthProvider } from '../contratti.js';
import { provaCollegamento, type EsitoProva, type OpzioniProva } from './prova-collegamento.js';
import type { StoreSegreti } from './store-segreti.js';
import { testiAuth } from './testi.js';

/** Nome con cui la chiave è salvata nello store dei segreti. */
export const NOME_SEGRETO_CHIAVE_API = 'chiave_api';

/** Controllo locale del formato, prima di qualunque chiamata (docs/05 §2.1). */
export function formatoChiaveValido(chiave: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(chiave.trim());
}

export interface AuthChiaveApi extends AuthProvider {
  haChiave(): Promise<boolean>;
  /** Salva la chiave (dopo il controllo del formato) nello store cifrato. */
  salvaChiave(chiave: string): Promise<void>;
  rimuoviChiave(): Promise<void>;
}

export function messaggioPerEsito(esito: EsitoProva, modalita: 'chiave_api' | 'abbonamento'): string {
  if (esito.ok) return testiAuth.collegato;
  switch (esito.codice) {
    case 'credenziali': return modalita === 'chiave_api' ? testiAuth.chiaveRifiutata : testiAuth.loginMancante;
    case 'limite': return testiAuth.limite;
    case 'rete': return testiAuth.rete;
    case 'tempo': return testiAuth.tempoScaduto;
    default: return testiAuth.generico(esito.dettaglio ?? '');
  }
}

/**
 * Modalità A — chiave API dell'utente (docs/02 §2.2): la chiave sta nello store cifrato e viene passata
 * al binario solo come variabile d'ambiente ANTHROPIC_API_KEY. Mai nei log.
 */
export function creaAuthChiaveApi(store: StoreSegreti, opzioni: OpzioniProva = {}): AuthChiaveApi {
  return {
    modalita: 'chiave_api',

    async haChiave() {
      return (await store.leggi(NOME_SEGRETO_CHIAVE_API)) !== undefined;
    },

    async salvaChiave(chiave) {
      const pulita = chiave.trim();
      if (!formatoChiaveValido(pulita)) throw new Error(testiAuth.chiaveFormato);
      await store.scrivi(NOME_SEGRETO_CHIAVE_API, pulita);
    },

    async rimuoviChiave() {
      await store.rimuovi(NOME_SEGRETO_CHIAVE_API);
    },

    async variabiliAmbiente(): Promise<Record<string, string>> {
      const chiave = await store.leggi(NOME_SEGRETO_CHIAVE_API);
      return chiave ? { ANTHROPIC_API_KEY: chiave } : {};
    },

    async verifica() {
      const chiave = await store.leggi(NOME_SEGRETO_CHIAVE_API);
      if (!chiave) return { ok: false, messaggio: testiAuth.chiaveMancante };
      if (!formatoChiaveValido(chiave)) return { ok: false, messaggio: testiAuth.chiaveFormato };
      const esito = await provaCollegamento({ ANTHROPIC_API_KEY: chiave }, opzioni);
      return { ok: esito.ok, messaggio: messaggioPerEsito(esito, 'chiave_api') };
    },
  };
}
