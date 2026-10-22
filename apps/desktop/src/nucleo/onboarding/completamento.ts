import path from 'node:path';
import {
  ConfigSchema,
  RispostaOnboardingSchema,
  RisposteSchema,
  StatoOnboardingSchema,
  type ImpostazioniOnboarding,
  type RispostaOnboarding,
  type Risposte,
  type StatoOnboarding as StatoOnboardingFile,
} from '@spalla/schema';
import type { Logger } from '../contratti.js';
import { assoluto, eOggetto, esiste, leggiJson, leggiTesto, rimuoviFile, scriviJson, scriviTesto } from './fs-util.js';
import { CARTELLA_RUOLI_ACCESI, RUOLI_SEMPRE_ACCESI, attivaRuolo, elencoRuoli } from './ruoli.js';
import { FILE_ONBOARDING, leggiStato, type LetturaStato } from './stato.js';
import { dataIso, istanteConFuso, oraBreve } from './tempo.js';
import { testiOnboarding as t } from './testi.js';

export interface OpzioniCompletamento {
  cartella: string;
  datiApp: string;
  adesso: Date;
  fuso: string;
  logger: Logger;
}

export interface EsitoCompletamento {
  /** RISPOSTE.json scritto da noi (l'assistente non l'aveva fatto). */
  risposteScritte: boolean;
  /** stato.json segnato completato in questa chiamata. */
  statoAggiornato: boolean;
  /** Riga aggiunta al diario di oggi (non c'era già). */
  diarioScritto: boolean;
  /** PRIMO-AVVIO.md rimosso in questa chiamata. */
  ritualeRimosso: boolean;
  /** Orari, buongiorno e voce copiati in datiApp/config.json. */
  impostazioniApplicate: boolean;
  /** L'utente ha chiesto Telegram (Q11): tocca all'app aprire il collegamento. */
  telegramRichiesto: boolean;
  /** Ruoli sempre accesi (critico, archivista) che l'assistente non aveva acceso e che l'app ha acceso al suo posto. */
  ruoliAccesiDallApp: string[];
}

/** Frase che identifica la riga di chiusura nel diario, per non scriverla due volte. */
const MARCA_DIARIO = 'Presentazioni completate';

/**
 * Chiude le presentazioni (contratti.ts `completa`): RISPOSTE.json da stato.json se manca, stato.json
 * `completato: true`, riga nel diario, via il rituale, impostazioni raccolte applicate a config.json.
 * Idempotente: una seconda chiamata non riscrive niente.
 */
export async function completaOnboarding(o: OpzioniCompletamento): Promise<EsitoCompletamento> {
  const lettura = leggiStato(o.cartella);
  if (lettura.tipo === 'non_valido') o.logger.avviso('onboarding.stato_non_leggibile', { problemi: lettura.problemi.length });

  const fileRisposte = assoluto(o.cartella, FILE_ONBOARDING.risposte);
  let risposte = leggiRisposteEsistenti(fileRisposte);
  let risposteScritte = false;
  if (!esiste(fileRisposte)) {
    risposte = costruisciRisposte(lettura, o.adesso, o.fuso);
    if (risposte) {
      scriviJson(fileRisposte, risposte);
      risposteScritte = true;
    } else {
      o.logger.avviso('onboarding.risposte_non_scritte', { motivo: 'nessuna risposta registrata in stato.json' });
    }
  }

  const statoAggiornato = segnaCompletato(o.cartella, lettura, o.adesso, o.fuso);
  const ruoliAccesiDallApp = await accendiRuoliFissi(o);
  const diarioScritto = scriviRigaDiario(o, lettura, risposte);
  const ritualeRimosso = rimuoviFile(assoluto(o.cartella, FILE_ONBOARDING.primoAvvio));

  const impostazioni = risposte?.impostazioni ?? (lettura.tipo === 'valido' ? lettura.stato.impostazioni : undefined);
  const impostazioniApplicate = impostazioni ? applicaImpostazioni(o.datiApp, impostazioni, o.logger) : false;

  const esito = {
    risposteScritte,
    statoAggiornato,
    diarioScritto,
    ritualeRimosso,
    impostazioniApplicate,
    telegramRichiesto: impostazioni?.telegram?.richiesto === true,
    ruoliAccesiDallApp,
  };
  o.logger.info('onboarding.completato', { ...esito });
  return esito;
}

/**
 * Critico e archivista devono essere accesi a presentazioni finite (docs/04 §4.1): se il rituale non li ha copiati,
 * il riordino notturno fallirebbe ogni notte con "ruolo mancante". L'app li accende con segnaposto generici
 * (nome e mestiere veri stanno nel profilo, che il ruolo legge comunque). Nomi dei ruoli accesi, vuoto se nulla da fare.
 */
async function accendiRuoliFissi(o: OpzioniCompletamento): Promise<string[]> {
  const accesi: string[] = [];
  for (const nome of RUOLI_SEMPRE_ACCESI) {
    if (esiste(assoluto(o.cartella, `${CARTELLA_RUOLI_ACCESI}/${nome}.md`))) continue;
    try {
      const esito = await attivaRuolo(o.cartella, nome, { ...t.ruoliFissi, dataOggi: dataIso(o.adesso, o.fuso) });
      if (esito.cambiato) accesi.push(nome);
      o.logger.info('onboarding.ruolo_fisso_acceso', { ruolo: nome });
    } catch (errore) {
      o.logger.avviso('onboarding.ruolo_fisso_non_acceso', { ruolo: nome, errore: errore instanceof Error ? errore.message : String(errore) });
    }
  }
  return accesi;
}

function leggiRisposteEsistenti(file: string): Risposte | undefined {
  const lettura = leggiJson(file);
  if (lettura.tipo !== 'valido') return undefined;
  const esito = RisposteSchema.safeParse(lettura.valore);
  return esito.success ? esito.data : undefined;
}

interface BaseRisposte {
  iniziato_il?: unknown;
  ramo?: unknown;
  risposte: unknown[];
  impostazioni?: unknown;
  squadra?: unknown;
}

/** RISPOSTE.json a partire da stato.json (anche parzialmente valido): undefined se non c'è nessuna risposta. */
export function costruisciRisposte(lettura: LetturaStato, adesso: Date, fuso: string): Risposte | undefined {
  let base: BaseRisposte;
  if (lettura.tipo === 'valido') base = lettura.stato;
  else if (lettura.tipo === 'non_valido' && lettura.grezzo && Array.isArray(lettura.grezzo.risposte)) base = lettura.grezzo as unknown as BaseRisposte;
  else return undefined;

  const risposte: RispostaOnboarding[] = [];
  for (const grezza of base.risposte) {
    const esito = RispostaOnboardingSchema.safeParse(grezza);
    if (!esito.success) continue;
    const { quando: _quando, ...resto } = esito.data;
    risposte.push(resto);
  }
  if (risposte.length === 0) return undefined;

  const inizio = typeof base.iniziato_il === 'string' ? Date.parse(base.iniziato_il) : Number.NaN;
  const durata = Number.isFinite(inizio) ? Math.max(0, Math.round((adesso.getTime() - inizio) / 60_000)) : 0;
  const comune = { completato_il: istanteConFuso(adesso, fuso), durata_minuti: durata, risposte };
  const completo = RisposteSchema.safeParse({ ...comune, ramo: base.ramo, impostazioni: base.impostazioni, squadra: base.squadra });
  if (completo.success) return completo.data;
  const minimo = RisposteSchema.safeParse(comune);
  return minimo.success ? minimo.data : undefined;
}

function segnaCompletato(cartella: string, lettura: LetturaStato, adesso: Date, fuso: string): boolean {
  const file = assoluto(cartella, FILE_ONBOARDING.stato);
  const ora = istanteConFuso(adesso, fuso);
  if (lettura.tipo === 'valido') {
    if (lettura.stato.completato) return false;
    scriviJson(file, { ...lettura.stato, fase: 'S8', prossima_domanda: null, completato: true, aggiornato_il: ora });
    return true;
  }
  if (lettura.tipo === 'non_valido' && lettura.grezzo) {
    if (lettura.grezzo.completato === true) return false;
    scriviJson(file, { ...lettura.grezzo, fase: 'S8', completato: true, aggiornato_il: ora });
    return true;
  }
  const minimo: StatoOnboardingFile = {
    versione: 1,
    iniziato_il: ora,
    aggiornato_il: ora,
    fase: 'S8',
    prossima_domanda: null,
    completato: true,
    rinviato: false,
    risposte: [],
  };
  scriviJson(file, StatoOnboardingSchema.parse(minimo));
  return true;
}

/** Appende "- HH:MM [sistema] Presentazioni completate: …" al diario di oggi (stesso formato del Memory Service). */
function scriviRigaDiario(o: OpzioniCompletamento, lettura: LetturaStato, risposte: Risposte | undefined): boolean {
  const data = dataIso(o.adesso, o.fuso);
  const file = assoluto(o.cartella, `${FILE_ONBOARDING.diario}/${data}.md`);
  const esistente = leggiTesto(file);
  if (esistente?.includes(MARCA_DIARIO)) return false;

  const accesi = elencoRuoli(o.cartella).accesi.filter((n) => !RUOLI_SEMPRE_ACCESI.includes(n));
  // Il primo colpo (S4) può stare nel RISPOSTE.json dell'assistente oppure, se lì manca, in stato.json.
  const fonti = [risposte?.risposte ?? [], lettura.tipo === 'valido' ? lettura.stato.risposte : []];
  const primoColpo = fonti.flat().find((r) => r.id === 'S4');
  const riga = `- ${oraBreve(o.adesso, o.fuso)} [sistema] ${t.diario.completato(accesi.join(', ') || t.diario.nessunRuolo, primoColpo?.file ?? t.diario.nessunLavoro)}`;

  let prefisso = '';
  if (esistente === undefined) prefisso = `${t.diario.intestazione(data)}\n`;
  else if (esistente.length > 0 && !esistente.endsWith('\n')) prefisso = '\n';
  scriviTesto(file, `${esistente ?? ''}${prefisso}${riga}\n`);
  return true;
}

/**
 * Copia in datiApp/config.json ciò che l'assistente non può scrivere da solo: orari di silenzio, buongiorno,
 * voce (ImpostazioniOnboardingSchema). Conserva tutto il resto del file (cervello, chiavi sconosciute).
 * False se il file esistente non è leggibile o non rispetta ConfigSchema: non si distrugge mai la configurazione.
 */
export function applicaImpostazioni(datiApp: string, imp: ImpostazioniOnboarding, logger: Logger): boolean {
  const file = path.join(datiApp, 'config.json');
  const lettura = leggiJson(file);
  if (lettura.tipo === 'non_valido') {
    logger.avviso('onboarding.config_non_leggibile', { problema: lettura.problema });
    return false;
  }
  const grezzo = lettura.tipo === 'valido' && eOggetto(lettura.valore) ? lettura.valore : {};
  const base = ConfigSchema.safeParse(grezzo);
  if (!base.success) {
    logger.avviso('onboarding.config_non_valida', { problemi: base.error.issues.length });
    return false;
  }
  const config = base.data;
  const nuovo = {
    ...grezzo,
    ...config,
    orari: { ...config.orari, ...(imp.orari ?? {}) },
    brief: { ...config.brief, ...(imp.brief ?? {}) },
    voce: { ...config.voce, ...(imp.voce?.desktop ? { desktop: imp.voce.desktop } : {}) },
  };
  const verifica = ConfigSchema.safeParse(nuovo);
  if (!verifica.success) {
    logger.avviso('onboarding.config_non_valida', { problemi: verifica.error.issues.length });
    return false;
  }
  scriviJson(file, nuovo);
  return true;
}
