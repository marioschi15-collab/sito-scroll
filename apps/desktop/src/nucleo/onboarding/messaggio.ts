import type { RispostaOnboarding, StatoOnboarding as StatoOnboardingFile } from '@spalla/schema';
import type { LetturaStato } from './stato.js';
import { dataIso, dataOraLunga } from './tempo.js';
import { testiOnboarding as t } from './testi.js';

/** Quanto di ogni risposta mostriamo nel riepilogo di ripresa. */
export const LUNGHEZZA_RISPOSTA_RIEPILOGO = 60;

/** La riga con data, ora, fuso e lingua che accompagna il rituale (contratti.ts: "più l'ora e la data"). */
export function rigaDataOra(adesso: Date, fuso: string): string {
  return t.messaggio.rigaData(dataOraLunga(adesso, fuso), dataIso(adesso, fuso), fuso);
}

function accorcia(testo: string): string {
  const caratteri = Array.from(testo.replace(/\s+/g, ' ').trim());
  return caratteri.length > LUNGHEZZA_RISPOSTA_RIEPILOGO
    ? `${caratteri.slice(0, LUNGHEZZA_RISPOSTA_RIEPILOGO - 1).join('')}…`
    : caratteri.join('');
}

/** "Q1 «Marco, del tu»", "Q5 «a, b, c»", "S4 (primo colpo 1: lavoro/…)" */
export function descriviRisposta(r: RispostaOnboarding): string {
  if (r.scelta !== undefined) return `${r.id} (primo colpo ${r.scelta}${r.file ? `: ${r.file}` : ''})`;
  const testo = Array.isArray(r.testo) ? r.testo.join(', ') : (r.testo ?? '');
  return `${r.id} «${accorcia(testo)}»${r.dedotta ? ' (dedotta)' : ''}`;
}

/** Il riepilogo che fa riprendere l'assistente dalla domanda giusta (docs/05 §1.13 e §6 "Interruzione"). */
export function riepilogoRipresa(stato: StatoOnboardingFile): string {
  const righe: string[] = [];
  const dove = [t.messaggio.ripresa.fase(stato.fase, t.fasi[stato.fase])];
  if (stato.ramo) dove.push(t.messaggio.ripresa.ramo(stato.ramo));
  righe.push(`${t.messaggio.ripresa.intestazione} ${dove.join(', ')}.`);
  righe.push(
    stato.risposte.length === 0
      ? t.messaggio.ripresa.nessunaRisposta
      : `${t.messaggio.ripresa.risposte(stato.risposte.length)} ${stato.risposte.map(descriviRisposta).join('; ')}.`,
  );
  if (stato.squadra && stato.squadra.accesi.length > 0) righe.push(t.messaggio.ripresa.squadra(stato.squadra.accesi.join(', ')));
  righe.push(
    stato.prossima_domanda ? `${t.messaggio.ripresa.prossima(stato.prossima_domanda)} ${t.messaggio.ripresa.nonRifare}` : t.messaggio.ripresa.fine,
  );
  if (stato.rinviato) righe.push(t.messaggio.ripresa.rinviato);
  return righe.join('\n');
}

export interface IngredientiMessaggio {
  /** Testo di onboarding/PRIMO-AVVIO.md; undefined se il rituale non c'è più. */
  rituale: string | undefined;
  lettura: LetturaStato;
  adesso: Date;
  fuso: string;
}

/** Rituale + riga di data/ora + (se l'intervista era iniziata) il riepilogo di ripresa. */
export function componiMessaggioIniziale(i: IngredientiMessaggio): string {
  const parti = [(i.rituale ?? t.messaggio.ritualeMancante).trimEnd(), '', rigaDataOra(i.adesso, i.fuso)];
  if (i.lettura.tipo === 'valido' && !i.lettura.stato.completato) parti.push('', riepilogoRipresa(i.lettura.stato));
  else if (i.lettura.tipo === 'non_valido') parti.push('', t.messaggio.statoNonLeggibile(i.lettura.problemi[0] ?? '?'));
  return `${parti.join('\n')}\n`;
}
