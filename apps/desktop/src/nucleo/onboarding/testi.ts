import { onboarding } from '@spalla/it-copy';
import type { FaseOnboarding } from '@spalla/schema';

/**
 * Frasi del modulo onboarding. Quelle per l'utente (problemi di validazione, riepilogo del profilo, riga del diario,
 * errori) vengono da @spalla/it-copy (`onboarding`); restano qui solo le righe che legge l'assistente nel primo
 * messaggio (data, ripresa) e il contenuto dei file segnaposto.
 * Niente gergo: "ruolo", "intestazione del file", "strumenti"; mai "agente", "frontmatter", "tools".
 */
export const testiOnboarding = {
  errori: onboarding.errori,
  stub: (file: string): string => `TODO: modello mancante nei template (${file}); da completare.`,
  /** Valori dei segnaposto quando è l'app ad accendere critico e archivista a fine presentazioni (li legge solo il ruolo). */
  ruoliFissi: {
    nomeUtente: 'chi usa questa cartella',
    mestiere: 'il cui mestiere è descritto in profilo/UTENTE.md',
  },
  messaggio: {
    rigaData: (lunga: string, iso: string, fuso: string): string =>
      `Adesso: ${lunga} (fuso orario ${fuso}; lingua: italiano). Nei file e nei nomi dei file scrivi la data come ${iso}.`,
    ritualeMancante:
      "Il file onboarding/PRIMO-AVVIO.md non c'è più: le presentazioni risultano già fatte. Lavora con i file di profilo che trovi in profilo/.",
    ripresa: {
      intestazione: 'Riprendiamo da dove eravamo:',
      fase: (fase: string, nome: string): string => `fase ${fase} (${nome})`,
      ramo: (ramo: string): string => `ramo ${ramo}`,
      risposte: (n: number): string => (n === 1 ? 'Risposta già registrata (1):' : `Risposte già registrate (${n}):`),
      nessunaRisposta: 'Nessuna risposta registrata finora.',
      squadra: (accesi: string): string => `Squadra già scelta: ${accesi}.`,
      prossima: (id: string): string => `Prossima domanda: ${id}.`,
      fine: 'Non resta nessuna domanda: chiudi le presentazioni (S8).',
      nonRifare: 'Non rifare le domande già fatte: riparti dalla prossima.',
      rinviato: "L'utente aveva rinviato: chiedi prima «Hai due minuti per finire le presentazioni?».",
    },
    statoNonLeggibile: (problema: string): string =>
      `Lo stato salvato in onboarding/stato.json non è leggibile (${problema}): rileggi i file in profilo/ per capire cosa sai già, poi riscrivilo nel formato previsto.`,
  },
  fasi: onboarding.fasi satisfies Record<FaseOnboarding, string>,
  problemi: onboarding.problemi,
  diario: onboarding.diario,
  profilo: onboarding.profilo,
} as const;
