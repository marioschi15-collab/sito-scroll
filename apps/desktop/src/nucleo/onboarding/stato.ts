import {
  PRIMO_AVVIO_COMPLETATO_PREFISSO,
  RisposteSchema,
  StatoOnboardingSchema,
  formattaProblemi,
  type StatoOnboarding as StatoOnboardingFile,
} from '@spalla/schema';
import type { StatoOnboarding } from '../contratti.js';
import { assoluto, eOggetto, leggiJson, leggiTesto } from './fs-util.js';

/** File notevoli della cartella di lavoro, relativi e con "/" (docs/02 §5.2). */
export const FILE_ONBOARDING = {
  primoAvvio: 'onboarding/PRIMO-AVVIO.md',
  domande: 'onboarding/domande.md',
  stato: 'onboarding/stato.json',
  risposte: 'onboarding/RISPOSTE.json',
  claudeMd: 'CLAUDE.md',
  settings: '.claude/settings.json',
  identita: 'profilo/IDENTITA.md',
  anima: 'profilo/ANIMA.md',
  utente: 'profilo/UTENTE.md',
  squadra: 'profilo/SQUADRA.md',
  memoria: 'memoria/MEMORIA.md',
  agenda: 'memoria/agenda.md',
  temi: 'memoria/temi',
  diario: 'memoria/diario',
} as const;

/** Inizio delle righe dei modelli che l'assistente deve sostituire durante le presentazioni. */
export const MARCA_DA_COMPILARE = '(da compilare';

export type LetturaStato =
  | { tipo: 'assente' }
  | { tipo: 'valido'; stato: StatoOnboardingFile }
  | { tipo: 'non_valido'; problemi: string[]; grezzo?: Record<string, unknown> };

/** onboarding/stato.json letto e validato con lo schema; se non valido, il JSON grezzo quando c'è. */
export function leggiStato(cartella: string): LetturaStato {
  const lettura = leggiJson(assoluto(cartella, FILE_ONBOARDING.stato));
  if (lettura.tipo === 'assente') return { tipo: 'assente' };
  if (lettura.tipo === 'non_valido') return { tipo: 'non_valido', problemi: [lettura.problema] };
  const esito = StatoOnboardingSchema.safeParse(lettura.valore);
  if (esito.success) return { tipo: 'valido', stato: esito.data };
  return { tipo: 'non_valido', problemi: formattaProblemi(esito.error), grezzo: eOggetto(lettura.valore) ? lettura.valore : undefined };
}

/** True se il rituale è ancora da fare: il file esiste e non è la riga "# Presentazioni completate…". */
export function ritualePresente(cartella: string): boolean {
  const testo = leggiTesto(assoluto(cartella, FILE_ONBOARDING.primoAvvio));
  if (testo === undefined) return false;
  const prima = testo.split(/\r?\n/).find((r) => r.trim().length > 0) ?? '';
  return !prima.trimStart().startsWith(PRIMO_AVVIO_COMPLETATO_PREFISSO);
}

/** True se onboarding/RISPOSTE.json esiste ED è valido: un file vuoto o troncato a metà non chiude le presentazioni. */
export function risposteValide(cartella: string): boolean {
  const lettura = leggiJson(assoluto(cartella, FILE_ONBOARDING.risposte));
  return lettura.tipo === 'valido' && RisposteSchema.safeParse(lettura.valore).success;
}

/** True se profilo/IDENTITA.md esiste e non ha più righe "(da compilare…)". */
export function profiloCompilato(cartella: string): boolean {
  const identita = leggiTesto(assoluto(cartella, FILE_ONBOARDING.identita));
  return identita !== undefined && !identita.includes(MARCA_DA_COMPILARE);
}

/**
 * Stato delle presentazioni (contratti.ts):
 * - completato: c'è un RISPOSTE.json valido, oppure stato.json dice completato, oppure il rituale non c'è più e IDENTITA.md è compilata;
 * - in_corso: c'è stato.json (anche se non leggibile: l'intervista è iniziata);
 * - da_fare: tutto il resto (compresa la cartella non ancora seminata).
 */
export function calcolaStato(cartella: string): StatoOnboarding {
  if (risposteValide(cartella)) return 'completato';
  const lettura = leggiStato(cartella);
  const completatoNelFile =
    (lettura.tipo === 'valido' && lettura.stato.completato) || (lettura.tipo === 'non_valido' && lettura.grezzo?.completato === true);
  if (completatoNelFile) return 'completato';
  if (!ritualePresente(cartella) && profiloCompilato(cartella)) return 'completato';
  if (lettura.tipo !== 'assente') return 'in_corso';
  return 'da_fare';
}
