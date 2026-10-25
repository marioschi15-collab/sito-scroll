import type { DomandaUtente, EventoAssistente, RichiestaPermesso } from '../../nucleo/contratti.js';

/**
 * Stato della chat: una lista di blocchi e lo scambio in corso. Riduttore puro, senza React, così si prova da solo.
 * - testo parziale → si appende al blocco assistente aperto dello stesso scambio (o se ne apre uno nuovo);
 * - testo completo (parziale: false) → sostituisce il blocco aperto e lo chiude;
 * - strumenti → righe attenuate; domande → chip; permessi → schede; fine/errore chiudono lo scambio.
 */

/** La richiesta di permesso come arriva nella finestra (senza AbortSignal né input grezzo, che restano nel processo principale). */
export type RichiestaPermessoVista = Pick<
  RichiestaPermesso,
  'id' | 'strumento' | 'descrizione' | 'anteprima' | 'dettaglio' | 'spiegazione' | 'ruolo' | 'canaleOrigine' | 'creataIl'
>;

export type Blocco =
  | { tipo: 'utente'; id: string; scambioId: string; testo: string; allegati?: string[] }
  | { tipo: 'assistente'; id: string; scambioId: string; testo: string; inCorso: boolean }
  | { tipo: 'strumento'; id: string; scambioId: string; descrizione: string; ruolo?: string }
  | {
      tipo: 'domanda';
      id: string;
      scambioId: string;
      domanda: DomandaUtente;
      risposta?: string[];
      /** Scelte toccate ma non ancora inviate (scelta multipla): vanno con il testo scritto, anche dalla casella in fondo. */
      selezione?: string[];
      /** Lo scambio è finito, fermato o chiuso senza risposta: le chip si spengono e il testo non va più qui. */
      chiusa?: boolean;
    }
  | { tipo: 'permesso'; id: string; richiesta: RichiestaPermessoVista; esito?: 'consenti' | 'nega' | 'ritirato' }
  | { tipo: 'fine'; id: string; scambioId: string; durataMs: number; costoUsd?: number }
  | { tipo: 'errore'; id: string; scambioId: string; messaggio: string }
  | { tipo: 'sistema'; id: string; testo: string; dettagli?: string[] };

export interface StatoChat {
  blocchi: Blocco[];
  /** Id dello scambio in corso (dal nostro invio a 'fine' o 'errore'). */
  scambioInCorso?: string;
  /** True quando lo scambio in corso è il rituale delle presentazioni (il testo non si mostra). */
  ritualeInCorso: boolean;
  contatore: number;
}

export type AzioneChat =
  | { tipo: 'invia'; scambioId: string; testo: string; allegati?: string[]; rituale?: boolean }
  | { tipo: 'evento'; scambioId: string; evento: EventoAssistente }
  | { tipo: 'domanda'; scambioId: string; domanda: DomandaUtente }
  | { tipo: 'permesso'; richiesta: RichiestaPermessoVista }
  | { tipo: 'permessoChiuso'; id: string }
  | { tipo: 'rispostaData'; domandaId: string; risposte: string[] }
  | { tipo: 'selezione'; domandaId: string; etichette: string[] }
  | { tipo: 'domandaChiusa'; domandaId: string }
  | { tipo: 'decisionePresa'; id: string; esito: 'consenti' | 'nega' }
  | { tipo: 'sistema'; testo: string; dettagli?: string[] }
  | { tipo: 'nuovoArgomento'; testo: string }
  | { tipo: 'interrotto'; scambioId: string };

export const STATO_CHAT_INIZIALE: StatoChat = { blocchi: [], ritualeInCorso: false, contatore: 0 };

function prossimoId(stato: StatoChat): [string, StatoChat] {
  const n = stato.contatore + 1;
  return [`b${n}`, { ...stato, contatore: n }];
}

function aggiungi(stato: StatoChat, crea: (id: string) => Blocco): StatoChat {
  const [id, s] = prossimoId(stato);
  return { ...s, blocchi: [...s.blocchi, crea(id)] };
}

/** Chiude i blocchi assistente ancora aperti dello scambio. */
function chiudiAperti(blocchi: Blocco[], scambioId: string): Blocco[] {
  return blocchi.map((b) => (b.tipo === 'assistente' && b.scambioId === scambioId && b.inCorso ? { ...b, inCorso: false } : b));
}

/** Spegne le domande rimaste senza risposta dello scambio (tutte se `scambioId` è undefined). */
function chiudiDomande(blocchi: Blocco[], scambioId: string | undefined): Blocco[] {
  return blocchi.map((b) => (b.tipo === 'domanda' && !b.risposta && !b.chiusa && (scambioId === undefined || b.scambioId === scambioId) ? { ...b, chiusa: true } : b));
}

function ultimo(stato: StatoChat): Blocco | undefined {
  return stato.blocchi[stato.blocchi.length - 1];
}

function testo(stato: StatoChat, scambioId: string, evento: { testo: string; parziale: boolean }): StatoChat {
  const u = ultimo(stato);
  const aperto = u && u.tipo === 'assistente' && u.scambioId === scambioId && u.inCorso ? u : undefined;
  if (evento.parziale) {
    if (aperto) {
      const blocchi = stato.blocchi.slice(0, -1);
      blocchi.push({ ...aperto, testo: aperto.testo + evento.testo });
      return { ...stato, blocchi };
    }
    if (!evento.testo) return stato;
    return aggiungi(stato, (id) => ({ tipo: 'assistente', id, scambioId, testo: evento.testo, inCorso: true }));
  }
  // Testo completo: sostituisce i frammenti e chiude il blocco.
  if (aperto) {
    const blocchi = stato.blocchi.slice(0, -1);
    blocchi.push({ ...aperto, testo: evento.testo, inCorso: false });
    return { ...stato, blocchi };
  }
  if (!evento.testo.trim()) return stato;
  return aggiungi(stato, (id) => ({ tipo: 'assistente', id, scambioId, testo: evento.testo, inCorso: false }));
}

function domanda(stato: StatoChat, scambioId: string, d: DomandaUtente): StatoChat {
  // Una sola scheda per domanda: la stessa può arrivare sia come evento sia come "domanda in attesa".
  const esiste = stato.blocchi.some((b) => b.tipo === 'domanda' && b.domanda.id === d.id);
  if (esiste) return stato;
  const s = { ...stato, blocchi: chiudiAperti(stato.blocchi, scambioId) };
  return aggiungi(s, (id) => ({ tipo: 'domanda', id, scambioId, domanda: d }));
}

function permesso(stato: StatoChat, r: RichiestaPermessoVista): StatoChat {
  const esiste = stato.blocchi.some((b) => b.tipo === 'permesso' && b.richiesta.id === r.id);
  if (esiste) return stato;
  const s = stato.scambioInCorso ? { ...stato, blocchi: chiudiAperti(stato.blocchi, stato.scambioInCorso) } : stato;
  return aggiungi(s, (id) => ({ tipo: 'permesso', id, richiesta: r }));
}

export function riduttoreChat(stato: StatoChat, azione: AzioneChat): StatoChat {
  switch (azione.tipo) {
    case 'invia': {
      const base: StatoChat = { ...stato, scambioInCorso: azione.scambioId, ritualeInCorso: Boolean(azione.rituale) };
      if (azione.rituale) return base; // il rituale è per l'assistente, non si mostra
      return aggiungi(base, (id) => ({
        tipo: 'utente',
        id,
        scambioId: azione.scambioId,
        testo: azione.testo,
        ...(azione.allegati && azione.allegati.length > 0 ? { allegati: azione.allegati } : {}),
      }));
    }
    case 'evento': {
      const { scambioId, evento } = azione;
      switch (evento.tipo) {
        case 'testo':
          return testo(stato, scambioId, evento);
        case 'strumento': {
          const s = { ...stato, blocchi: chiudiAperti(stato.blocchi, scambioId) };
          // La domanda si vede già come riquadro con le chip: la riga "Ti faccio una domanda" sarebbe un doppione.
          if (evento.nome === 'AskUserQuestion') return s;
          return aggiungi(s, (id) => ({
            tipo: 'strumento',
            id,
            scambioId,
            descrizione: evento.descrizione,
            ...(evento.ruolo ? { ruolo: evento.ruolo } : {}),
          }));
        }
        case 'domanda':
          return domanda(stato, scambioId, evento.domanda);
        case 'permesso':
          return permesso(stato, evento.richiesta);
        case 'fine': {
          const chiuso: StatoChat = {
            ...stato,
            blocchi: chiudiDomande(chiudiAperti(stato.blocchi, scambioId), scambioId),
            scambioInCorso: stato.scambioInCorso === scambioId ? undefined : stato.scambioInCorso,
            ritualeInCorso: stato.scambioInCorso === scambioId ? false : stato.ritualeInCorso,
          };
          return aggiungi(chiuso, (id) => ({
            tipo: 'fine',
            id,
            scambioId,
            durataMs: evento.durataMs,
            ...(evento.costoUsd !== undefined ? { costoUsd: evento.costoUsd } : {}),
          }));
        }
        case 'errore': {
          const chiuso: StatoChat = {
            ...stato,
            blocchi: chiudiDomande(chiudiAperti(stato.blocchi, scambioId), scambioId),
            scambioInCorso: stato.scambioInCorso === scambioId ? undefined : stato.scambioInCorso,
            ritualeInCorso: stato.scambioInCorso === scambioId ? false : stato.ritualeInCorso,
          };
          return aggiungi(chiuso, (id) => ({ tipo: 'errore', id, scambioId, messaggio: evento.messaggio }));
        }
      }
      return stato;
    }
    case 'domanda':
      return domanda(stato, azione.scambioId, azione.domanda);
    case 'permesso':
      return permesso(stato, azione.richiesta);
    case 'permessoChiuso':
      return {
        ...stato,
        blocchi: stato.blocchi.map((b) => (b.tipo === 'permesso' && b.richiesta.id === azione.id && !b.esito ? { ...b, esito: 'ritirato' } : b)),
      };
    case 'rispostaData':
      return {
        ...stato,
        blocchi: stato.blocchi.map((b) => (b.tipo === 'domanda' && b.domanda.id === azione.domandaId ? { ...b, risposta: azione.risposte } : b)),
      };
    case 'decisionePresa':
      return {
        ...stato,
        blocchi: stato.blocchi.map((b) => (b.tipo === 'permesso' && b.richiesta.id === azione.id ? { ...b, esito: azione.esito } : b)),
      };
    case 'sistema':
      return aggiungi(stato, (id) => ({ tipo: 'sistema', id, testo: azione.testo, ...(azione.dettagli ? { dettagli: azione.dettagli } : {}) }));
    case 'selezione':
      return {
        ...stato,
        blocchi: stato.blocchi.map((b) => (b.tipo === 'domanda' && b.domanda.id === azione.domandaId && !b.risposta && !b.chiusa ? { ...b, selezione: azione.etichette } : b)),
      };
    case 'domandaChiusa':
      return {
        ...stato,
        blocchi: stato.blocchi.map((b) => (b.tipo === 'domanda' && b.domanda.id === azione.domandaId && !b.risposta ? { ...b, chiusa: true } : b)),
      };
    case 'nuovoArgomento':
      return aggiungi({ ...stato, blocchi: chiudiDomande(stato.blocchi, undefined), scambioInCorso: undefined, ritualeInCorso: false }, (id) => ({
        tipo: 'sistema',
        id,
        testo: azione.testo,
      }));
    case 'interrotto':
      return {
        ...stato,
        blocchi: chiudiDomande(chiudiAperti(stato.blocchi, azione.scambioId), azione.scambioId),
        scambioInCorso: stato.scambioInCorso === azione.scambioId ? undefined : stato.scambioInCorso,
        ritualeInCorso: false,
      };
  }
}

/**
 * La domanda ancora aperta più recente, se c'è: senza risposta, non chiusa, e dello scambio in corso (o di uno
 * scambio dell'app quando l'utente non ne ha uno in corso). Una domanda di uno scambio finito non "ruba" il messaggio.
 */
export function domandaInAttesa(stato: StatoChat): Extract<Blocco, { tipo: 'domanda' }> | undefined {
  for (let i = stato.blocchi.length - 1; i >= 0; i--) {
    const b = stato.blocchi[i];
    if (b && b.tipo === 'domanda' && !b.risposta && !b.chiusa && (stato.scambioInCorso === undefined || b.scambioId === stato.scambioInCorso)) return b;
  }
  return undefined;
}
