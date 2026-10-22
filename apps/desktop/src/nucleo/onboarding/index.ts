import path from 'node:path';
import { cartellaTemplates } from '@spalla/schema';
import type { Logger, Onboarding, Percorsi, StatoOnboarding } from '../contratti.js';
import { completaOnboarding, type EsitoCompletamento } from './completamento.js';
import { assoluto, leggiTesto } from './fs-util.js';
import { componiMessaggioIniziale } from './messaggio.js';
import { componiRiepilogoProfilo } from './profilo.js';
import { attivaRuolo, disattivaRuolo, elencoRuoli, type EsitoRuolo, type OpzioniAttivazione } from './ruoli.js';
import { scriviConfigPredefinita, semina, sostituisciSegnaposto, type EsitoSemina, type Segnaposto } from './semina.js';
import { FILE_ONBOARDING, calcolaStato, leggiStato, ritualePresente } from './stato.js';
import { dataIso, fusoDiSistema, fusoValido } from './tempo.js';
import { validaCartella } from './validazione.js';

export { applicaImpostazioni, completaOnboarding, costruisciRisposte, type EsitoCompletamento, type OpzioniCompletamento } from './completamento.js';
export { contaCaratteri, contaRighe } from './fs-util.js';
export { LUNGHEZZA_RISPOSTA_RIEPILOGO, componiMessaggioIniziale, descriviRisposta, riepilogoRipresa, rigaDataOra } from './messaggio.js';
export { componiRiepilogoProfilo, leggiDirettive, riepilogoProfilo, type Direttiva } from './profilo.js';
export {
  CARTELLA_RUOLI_ACCESI,
  CARTELLA_RUOLI_SPENTI,
  MASSIMO_RUOLI_ACCESI,
  RUOLI_SEMPRE_ACCESI,
  attivaRuolo,
  compilaSegnapostoRuolo,
  disattivaRuolo,
  eMarcaSpento,
  elencoRuoli,
  haIntestazione,
  impostaAttivo,
  type EsitoRuolo,
  type OpzioniAttivazione,
} from './ruoli.js';
export {
  CARTELLE_ATTESE,
  ESTENSIONI_TESTO,
  FILE_ATTESI,
  contenutoStub,
  scriviConfigPredefinita,
  semina,
  sostituisciSegnaposto,
  type EsitoSemina,
  type OpzioniSemina,
  type Segnaposto,
} from './semina.js';
export { FILE_ONBOARDING, MARCA_DA_COMPILARE, calcolaStato, leggiStato, profiloCompilato, risposteValide, ritualePresente, type LetturaStato } from './stato.js';
export { dataIso, dataOraLunga, fusoDiSistema, fusoValido, istanteConFuso, oraBreve } from './tempo.js';
export { testiOnboarding } from './testi.js';
export {
  PROFONDITA_IMPORT,
  estraiImport,
  validaCartella,
  validaCompletamento,
  validaImport,
  validaRuoli,
  validaScheletro,
  validaSettings,
  validaStatoERisposte,
  validaTetti,
  type OpzioniValidazione,
} from './validazione.js';

export interface DipendenzeOnboarding {
  percorsi: Percorsi;
  logger: Logger;
  /** Cartella dei modelli; se assente si usa `cartellaTemplates()` di @spalla/schema. */
  templates?: string;
  /** Orologio iniettabile (test). */
  adesso?: () => Date;
  /** Fuso orario IANA dell'utente (es. "Europe/Rome"); predefinito quello del sistema. */
  fuso?: string;
  /** Valore di {{NOME_PRODOTTO}}; predefinito il nome della cartella di lavoro ("Spalla"). */
  nomeProdotto?: string;
}

export interface EsitoPreparazione extends EsitoSemina {
  /** datiApp/config.json creato con i predefiniti in questa chiamata. */
  configCreato: boolean;
}

/** `Onboarding` di contratti.ts più ciò che servirà a CLI, Telegram e finestra (riepilogo, squadra, dettagli). */
export interface OnboardingEsteso extends Onboarding {
  /** Come `prepara()`, ma dice cosa ha creato, saltato, escluso e quali modelli mancavano. */
  semina(): Promise<EsitoPreparazione>;
  /** Come `completa()`, con il dettaglio di cosa è stato scritto e se l'utente ha chiesto Telegram. */
  completaDettagliato(): Promise<EsitoCompletamento>;
  /** "Cosa sai di me?": le direttive di profilo/UTENTE.md in italiano semplice. */
  riepilogoProfilo(): Promise<string>;
  /** Accende un ruolo del catalogo (agents-spenti → agents). */
  attivaRuolo(nome: string, opzioni?: OpzioniAttivazione): Promise<EsitoRuolo>;
  /** Spegne un ruolo (agents → agents-spenti). */
  disattivaRuolo(nome: string): Promise<EsitoRuolo>;
  elencoRuoli(): { accesi: string[]; spenti: string[] };
}

function sceltaFuso(richiesto: string | undefined, logger: Logger): string {
  if (richiesto === undefined) return fusoDiSistema();
  if (fusoValido(richiesto)) return richiesto;
  logger.avviso('onboarding.fuso_non_valido', { fuso: richiesto });
  return fusoDiSistema();
}

/**
 * Onboarding (docs/05): semina ~/Spalla dai modelli, dice in che stato sono le presentazioni, compone il
 * primo messaggio (rituale + data/ora + ripresa), valida i file generati e chiude. Non parla con il modello:
 * legge e scrive solo file dentro la cartella di lavoro e datiApp/config.json.
 */
export function creaOnboarding(deps: DipendenzeOnboarding): OnboardingEsteso {
  const { percorsi, logger } = deps;
  const cartella = percorsi.cartellaLavoro;
  const adesso = deps.adesso ?? ((): Date => new Date());
  const fuso = sceltaFuso(deps.fuso, logger);
  const nomeProdotto = deps.nomeProdotto ?? (path.basename(cartella) || 'Spalla');
  let templates: string | undefined = deps.templates;

  function cartellaModelli(): string {
    if (!templates) templates = cartellaTemplates();
    return templates;
  }

  function segnaposto(): Segnaposto {
    return { dataOggi: dataIso(adesso(), fuso), nomeProdotto };
  }

  function stato(): StatoOnboarding {
    return calcolaStato(cartella);
  }

  async function seminaCartella(): Promise<EsitoPreparazione> {
    // A presentazioni finite il rituale non deve tornare: la sua assenza fa parte dello stato "completato".
    const escludi = stato() === 'completato' ? new Set([FILE_ONBOARDING.primoAvvio]) : undefined;
    const esito = semina({ templates: cartellaModelli(), destinazione: cartella, segnaposto: segnaposto(), escludi, logger });
    const configCreato = scriviConfigPredefinita(percorsi.datiApp);
    for (const file of esito.mancanti) logger.avviso('onboarding.modello_mancante', { file });
    logger.info('onboarding.semina', {
      creati: esito.creati.length,
      saltati: esito.saltati.length,
      esclusi: esito.esclusi.length,
      mancanti: esito.mancanti.length,
      configCreato,
    });
    return { ...esito, configCreato };
  }

  async function messaggioIniziale(): Promise<string> {
    const lettura = leggiStato(cartella);
    let rituale = ritualePresente(cartella) ? leggiTesto(assoluto(cartella, FILE_ONBOARDING.primoAvvio)) : undefined;
    if (rituale === undefined && stato() !== 'completato') {
      // Rituale sparito a metà intervista: lo si riprende dai modelli, senza riscriverlo su disco.
      try {
        const modello = leggiTesto(assoluto(cartellaModelli(), FILE_ONBOARDING.primoAvvio));
        if (modello !== undefined) rituale = sostituisciSegnaposto(modello, segnaposto());
      } catch (errore) {
        logger.avviso('onboarding.modelli_non_trovati', { errore: errore instanceof Error ? errore.message : String(errore) });
      }
    }
    if (lettura.tipo === 'non_valido') logger.avviso('onboarding.stato_non_leggibile', { problemi: lettura.problemi.length });
    return componiMessaggioIniziale({ rituale, lettura, adesso: adesso(), fuso });
  }

  async function valida(): Promise<string[]> {
    const problemi = validaCartella({ cartella, completato: stato() === 'completato' });
    logger.info('onboarding.validazione', { problemi: problemi.length });
    return problemi;
  }

  async function completaDettagliato(): Promise<EsitoCompletamento> {
    return completaOnboarding({ cartella, datiApp: percorsi.datiApp, adesso: adesso(), fuso, logger });
  }

  return {
    stato: async () => stato(),
    prepara: async () => {
      await seminaCartella();
    },
    semina: seminaCartella,
    messaggioIniziale,
    valida,
    completa: async () => {
      await completaDettagliato();
    },
    completaDettagliato,
    riepilogoProfilo: async () => componiRiepilogoProfilo(cartella),
    attivaRuolo: async (nome, opzioni) => {
      const esito = await attivaRuolo(cartella, nome, { dataOggi: dataIso(adesso(), fuso), ...opzioni });
      logger.info('onboarding.ruolo_acceso', { ruolo: nome, cambiato: esito.cambiato });
      return esito;
    },
    disattivaRuolo: async (nome) => {
      const esito = await disattivaRuolo(cartella, nome);
      logger.info('onboarding.ruolo_spento', { ruolo: nome, cambiato: esito.cambiato });
      return esito;
    },
    elencoRuoli: () => elencoRuoli(cartella),
  };
}
