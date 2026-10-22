import { query as querySdk } from '@anthropic-ai/claude-agent-sdk';
import type { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import crypto from 'node:crypto';
import type { AgentRuntime, EventoAssistente, MessaggioIn, OpzioniInvio, TipoSessione } from '../contratti.js';
import { chiaveMese, creaContatoreCosti } from './costi.js';
import { erroreDaEccezione, erroreDaRisultato, type EventoErrore } from './errori.js';
import { CodaEventi, traduciMessaggio } from './eventi.js';
import { creaHooks, creaRegistroRuoli, primaRigaDi } from './hooks.js';
import { costruisciOpzioni } from './opzioni-sdk.js';
import { creaCanUseTool } from './permessi.js';
import { creaServerSpalla } from './server-memoria.js';
import { creaArchivioSessione } from './sessione.js';
import { testiAgent } from './testi.js';
import type { DipendenzeAgentRuntime, FunzioneQuery } from './tipi.js';

export type { AmbienteBinario, ConfigCervello, ConfigRuntime, DescrittoreRichiesta, DipendenzeAgentRuntime, FunzioneQuery } from './tipi.js';
export { STRUMENTI_CONSENTITI, modelloPer, strumentiNegati, TETTO_PREDEFINITO_USD } from './opzioni-sdk.js';
export { PERCORSI_PROTETTI, percorsoAssolutoPerRegola, percorsoProtetto, regoleProtezioneCartella, regoleProtezioneCredenziali, relativoAllaCartella } from './protezioni.js';
export { attendiDecisione } from './permessi.js';
export { creaStrumentoMemoriaCerca, creaServerSpalla, NOME_STRUMENTO_MEMORIA_CERCA } from './server-memoria.js';
export { creaContatoreCosti, chiaveMese } from './costi.js';
export type { RegistroMese, VoceCosto } from './costi.js';
export { creaArchivioSessione } from './sessione.js';
export { codiceDaTesto, isoDaResetsAt, oraLocale } from './errori.js';
export { descriviStrumento } from './eventi.js';
export { primaRigaDi, percorsoRelativoSorvegliato, STRUMENTI_DI_SCRITTURA } from './hooks.js';
export { testiAgent } from './testi.js';

export const CAMBIO_USD_EUR_PREDEFINITO = 0.92;

/** Il testo che il binario riceve: etichetta di canale (docs/02 §3.1), testo, allegati. */
export function componiPrompt(m: MessaggioIn): string {
  const righe: string[] = [];
  if (m.canale !== 'desktop') righe.push(`[canale: ${m.canale}]`);
  righe.push(m.testo);
  if (m.allegati && m.allegati.length > 0) righe.push('', 'Allegati:', ...m.allegati.map((a) => `- ${a}`));
  return righe.join('\n');
}

/**
 * La riga meccanica del diario per questo scambio (ADR-007): quella passata da chi invia (es. il rituale),
 * altrimenti la prima riga del messaggio; niente per i lavori di sistema (brief e riordino scrivono le loro).
 */
export function rigaDiarioPer(m: MessaggioIn, invio: OpzioniInvio): string {
  if (invio.rigaDiario !== undefined) return invio.rigaDiario.trim();
  if (m.canale === 'sistema') return '';
  return primaRigaDi(m.testo);
}

/**
 * AgentRuntime (docs/02 §3.1-3.2, §4): una `query()` per ogni scambio; la sessione principale si riprende per id
 * (datiApp/sessione.json, una al giorno); sfondo e programmate girano in sessioni separate con tetto.
 */
export function creaAgentRuntime(deps: DipendenzeAgentRuntime): AgentRuntime {
  const { percorsi, auth, broker, runtime, logger, config } = deps;
  const query: FunzioneQuery = deps.query ?? (querySdk as FunzioneQuery);
  const adesso = deps.adesso ?? (() => new Date());
  const cambio = deps.cambioUsdEur ?? CAMBIO_USD_EUR_PREDEFINITO;
  const archivio = creaArchivioSessione(percorsi.datiApp, adesso);
  const costi = creaContatoreCosti(percorsi.datiApp, adesso);
  const registroRuoli = creaRegistroRuoli();
  const serverSpalla = deps.memoria ? creaServerSpalla(deps.memoria) : undefined;
  // Un solo scambio alla volta sulla sessione principale: gli altri aspettano in coda.
  let codaPrincipale: Promise<unknown> = Promise.resolve();
  // Il mese in cui si è già detto all'utente che il tetto è stato raggiunto: lo si dice una volta, non a ogni messaggio.
  let meseAvvisatoTetto: string | undefined;

  function tettoEur(): number | undefined {
    const t = config.cervello.tetto_mensile_eur;
    return typeof t === 'number' && t > 0 ? t : undefined;
  }

  function sopraTetto(): boolean {
    const tetto = tettoEur();
    return tetto !== undefined && costi.totaleMese() * cambio >= tetto;
  }

  async function esegui(messaggio: MessaggioIn, invio: OpzioniInvio, tipo: TipoSessione, emetti: (e: EventoAssistente) => void): Promise<void> {
    const inizio = adesso();
    if (config.cervello.modalita === 'chiave_api' && sopraTetto()) {
      // Docs/05 §2.1: raggiunto il tetto, si fermano i lavori di sfondo e programmati; la conversazione continua
      // (chi paga con la chiave decide lui), con un avviso una volta al mese.
      if (tipo !== 'principale') {
        emetti({ tipo: 'errore', codice: 'budget', messaggio: testiAgent.errori.tettoMensile(tettoEur() ?? 0) });
        return;
      }
      const mese = chiaveMese(inizio);
      if (meseAvvisatoTetto !== mese) {
        meseAvvisatoTetto = mese;
        emetti({ tipo: 'testo', testo: testiAgent.errori.tettoSoloSfondo(tettoEur() ?? 0), parziale: false });
      }
    }

    const variabiliAuth = await auth.variabiliAmbiente();
    const riprendi = tipo === 'principale' ? archivio.leggi()?.id : undefined;
    const abort = new AbortController();
    let sessioneId: string | undefined = riprendi;
    let erroreOsservato: EventoErrore | undefined;
    let risultato: SDKResultMessage | undefined;

    const contesto = {
      ruoloDi: registroRuoli.ruoloDi,
      suSessione: (id: string) => { sessioneId = id; },
      suErrore: (e: EventoErrore) => { erroreOsservato = e; },
    };
    const canUseTool = creaCanUseTool({
      broker,
      logger,
      canale: messaggio.canale,
      emetti,
      ruoloDi: registroRuoli.ruoloDi,
      nuovoId: () => crypto.randomBytes(4).toString('hex').slice(0, 7),
      descrivi: deps.descriviRichiesta,
      rispondiDomanda: invio.rispondiDomanda,
      adesso: () => adesso().getTime(),
    });
    const hooks = creaHooks({
      cartellaLavoro: percorsi.cartellaLavoro,
      logger,
      registroRuoli,
      memoria: deps.memoria,
      canale: messaggio.canale,
      primaRiga: rigaDiarioPer(messaggio, invio),
    });
    const options = costruisciOpzioni({
      percorsi, runtime, variabiliAuth, modalita: config.cervello.modalita, livello: config.cervello.livello,
      tipo, invio, riprendi, canUseTool, hooks, serverSpalla, abort, logger,
    });

    logger.info('agente.scambio_inizio', { tipo, canale: messaggio.canale, ripresa: Boolean(riprendi), ruolo: invio.ruolo });
    try {
      for await (const m of query({ prompt: componiPrompt(messaggio), options })) {
        if (m.type === 'result') {
          risultato = m;
          sessioneId = m.session_id;
          continue;
        }
        for (const evento of traduciMessaggio(m, percorsi.cartellaLavoro, contesto)) emetti(evento);
      }
    } catch (errore) {
      // Dopo un result di errore l'SDK rilancia: il result basta a spiegare l'accaduto.
      if (!risultato) {
        logger.errore('agente.eccezione', { tipo, errore: errore instanceof Error ? errore.message : String(errore) });
        emetti(erroreOsservato ?? erroreDaEccezione(errore));
        return;
      }
    }

    if (!risultato) {
      emetti(erroreOsservato ?? { tipo: 'errore', codice: 'altro', messaggio: testiAgent.errori.nessunaRisposta });
      return;
    }

    const usd = costi.registra({
      sessione: risultato.session_id, tipo, canale: messaggio.canale,
      totaleCumulativoUsd: risultato.total_cost_usd, turni: risultato.num_turns, durataMs: risultato.duration_ms,
    });
    if (tipo === 'principale') archivio.salva(risultato.session_id);
    logger.info('agente.scambio_fine', { tipo, esito: risultato.subtype, turni: risultato.num_turns, durataMs: risultato.duration_ms, usd, durataTotaleMs: adesso().getTime() - inizio.getTime() });

    if (risultato.subtype === 'success' && !risultato.is_error) {
      // costoUsd = spesa di QUESTO scambio (il total_cost_usd dell'SDK è cumulativo per sessione).
      emetti({ tipo: 'fine', sessioneId: risultato.session_id, durataMs: risultato.duration_ms, costoUsd: usd, turni: risultato.num_turns });
    } else {
      emetti(erroreDaRisultato(risultato, erroreOsservato));
    }
  }

  return {
    invia(messaggio, opzioni = {}) {
      const tipo: TipoSessione = opzioni.sessione ?? 'principale';
      const coda = new CodaEventi<EventoAssistente>();
      const lavoro = () => esegui(messaggio, opzioni, tipo, (e) => coda.push(e))
        .catch((errore) => { logger.errore('agente.errore_interno', { errore: errore instanceof Error ? errore.message : String(errore) }); coda.push(erroreDaEccezione(errore)); })
        .finally(() => coda.chiudi());
      if (tipo === 'principale') {
        codaPrincipale = codaPrincipale.then(lavoro, lavoro);
      } else {
        void lavoro();
      }
      return coda;
    },

    async nuovaSessione() {
      archivio.cancella();
      logger.info('agente.nuova_sessione');
    },

    sessioneCorrente() {
      return archivio.leggi()?.id;
    },

    async statoCosti() {
      const tetto = tettoEur();
      return { meseUsd: costi.totaleMese(), tettoEur: tetto, sopraTetto: sopraTetto() };
    },
  };
}
