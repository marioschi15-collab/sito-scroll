import { cervello, cli, onboarding, permessi } from '@spalla/it-copy';

/**
 * Frasi del terminale di sviluppo: la fonte è `cli` di @spalla/it-copy (più `cervello` e `permessi`).
 * Qui solo la forma che i file del terminale usano. "Chiave API" è l'unico termine tecnico ammesso.
 */
export const testiCli = {
  intestazione: cli.avvio.intestazione,
  comandiBrevi: cli.avvio.comandiBrevi,
  prompt: cli.prompt.tu,
  promptScelta: cli.sceltaModalita.scelta,
  modalita: cli.modalita,
  sceltaModalita: cli.sceltaModalita,
  chiaveApi: cli.chiaveApi,
  abbonamento: {
    avviso: cervello.abbonamento.avvisoBeta,
    comeCollegare: cli.abbonamento.comeCollegare,
  },
  verifica: cli.verifica,
  onboarding: { ...cli.onboarding, diarioIniziate: onboarding.diario.iniziate },
  stato: {
    sessione: cli.stato.sessione,
    spesa: cli.stato.spesaMese,
    onboarding: cli.stato.onboarding,
    telegram: cli.stato.telegram,
    telegramInAttesa: cli.stato.telegramInAttesa,
    memoriaDettaglio: cli.stato.memoriaDettaglio,
    memoriaRighe: cli.stato.memoria,
    memoriaContatori: cli.stato.memoriaContatori,
    indiceRicostruito: cli.stato.indiceRicostruito,
  },
  nuovaSessione: cli.nuovaSessione,
  comandoSconosciuto: cli.comandi.sconosciuto,
  comandi: cli.comandi,
  arrivederci: cli.uscita,
  domanda: {
    suggerimentoSingola: cli.chip.istruzioni,
    suggerimentoMultipla: cli.chip.istruzioniMulti,
  },
  permesso: {
    titolo: cli.conferma.titolo,
    domanda: cli.conferma.domanda,
    negato: permessi.esiti.negatoDaUtente,
    terminaleChiuso: permessi.esiti.terminaleChiuso,
    annullata: cli.conferma.annullata,
    motivoAnnullata: permessi.esiti.annullata,
  },
  fine: cli.fine.riepilogo,
  errore: cli.errore,
  inAttesa: cli.prompt.penso,
  telegram: cli.telegram,
} as const;
