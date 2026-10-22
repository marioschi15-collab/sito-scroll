import crypto from 'node:crypto';
import type { PairingInAttesa, StatoTelegram } from './stato.js';

/** Minuscole e cifre senza l, o, 0 (si confondono al telefono e a voce). */
export const ALFABETO_PAIRING = 'abcdefghijkmnpqrstuvwxyz123456789';
export const LUNGHEZZA_CODICE = 6;
export const SCADENZA_PAIRING_MS = 60 * 60 * 1000;
export const MAX_PAIRING_IN_ATTESA = 3;

export function generaCodicePairing(lunghezza = LUNGHEZZA_CODICE): string {
  let codice = '';
  for (let i = 0; i < lunghezza; i++) codice += ALFABETO_PAIRING[crypto.randomInt(ALFABETO_PAIRING.length)];
  return codice;
}

/** Il codice come lo digita l'utente: spazi e maiuscole non contano; una "l" digitata vale come "1". */
export function normalizzaCodice(testo: string): string {
  return testo.trim().toLowerCase().replace(/[\s-]/g, '').replace(/l/g, '1');
}

export type EsitoConferma = { ok: true; pairing: PairingInAttesa } | { ok: false; motivo: 'non_valido' | 'scaduto' };

/**
 * Codici di collegamento (docs/02 §8.3): finché il bot non ha un proprietario, chi scrive riceve un codice
 * di 6 caratteri da digitare nell'app; massimo 3 in attesa, validi un'ora.
 */
export function creaGestorePairing(stato: StatoTelegram, adesso: () => number = Date.now) {
  function pulisci(): void {
    const limite = adesso() - SCADENZA_PAIRING_MS;
    stato.pairing = stato.pairing.filter((p) => p.creatoIl >= limite);
  }

  return {
    /** Codice per questo utente: riusa quello già in attesa, altrimenti ne crea uno nuovo (scartando il più vecchio). */
    richiedi(utente: { utenteId: number; chatId: number; nomeMostrato: string }): PairingInAttesa {
      pulisci();
      const esistente = stato.pairing.find((p) => p.utenteId === utente.utenteId);
      if (esistente) return esistente;
      let codice = generaCodicePairing();
      while (stato.pairing.some((p) => p.codice === codice)) codice = generaCodicePairing();
      const nuovo: PairingInAttesa = { codice, creatoIl: adesso(), ...utente };
      stato.pairing.push(nuovo);
      stato.pairing.sort((a, b) => a.creatoIl - b.creatoIl);
      while (stato.pairing.length > MAX_PAIRING_IN_ATTESA) stato.pairing.shift();
      return nuovo;
    },

    /** Conferma dal desktop: il codice giusto promuove l'utente a proprietario e svuota la lista. */
    conferma(codiceDigitato: string): EsitoConferma {
      const codice = normalizzaCodice(codiceDigitato);
      const limite = adesso() - SCADENZA_PAIRING_MS;
      const trovato = stato.pairing.find((p) => normalizzaCodice(p.codice) === codice);
      if (!trovato) return { ok: false, motivo: 'non_valido' };
      if (trovato.creatoIl < limite) {
        pulisci();
        return { ok: false, motivo: 'scaduto' };
      }
      if (!stato.proprietari.includes(trovato.utenteId)) stato.proprietari.push(trovato.utenteId);
      stato.pairing = [];
      return { ok: true, pairing: trovato };
    },

    inAttesa(): PairingInAttesa[] {
      pulisci();
      return [...stato.pairing];
    },
  };
}

export type GestorePairing = ReturnType<typeof creaGestorePairing>;
