import { permessi, telegram } from '@spalla/it-copy';

/**
 * Frasi italiane del canale Telegram (docs/02 §8). La fonte è `telegram` e `permessi` di @spalla/it-copy:
 * qui c'è la forma che il canale usa (`TestiTelegram`) e il predefinito costruito da it-copy; l'integratore
 * può passare `testi` parziali per sovrascrivere singole frasi.
 */
export interface DatiStatoTelegram {
  pcAcceso: boolean;
  ultimoBrief?: string;
  spesaMeseEur?: number;
  tettoEur?: number | null;
}

export interface TestiTelegram {
  comandi: ReadonlyArray<{ comando: string; descrizione: string }>;
  start: (nomeAssistente: string, nomeUtente: string, linkPrivacy: string) => string;
  aiuto: (nomeAssistente: string) => string;
  stato: (dati: DatiStatoTelegram) => string;
  nuova: string;
  stop: string;
  voce: { accesa: string; spenta: string; nonDisponibile: string; uso: string };
  pairing: {
    collegato: (username: string) => string;
    codice: (codice: string) => string;
    privacy: (linkPrivacy: string) => string;
    codiceNonValido: string;
    codiceScaduto: string;
    nonAutorizzato: string;
  };
  eroSpento: (n: number) => string;
  ciLavoro: string;
  rispostaLunga: string;
  conferme: { siFallo: string; no: string; fatto: string; nonLoFaccio: string; scaduta: string; annullata: string };
  notaVocale: { troppoLunga: string; hoCapito: (testo: string) => string; nonCapita: string; motoreNonPronto: string };
  allegati: { ricevuto: (nomeFile: string) => string; troppoGrande: string; tipoNonGestito: string };
  gruppi: string;
  altraCopiaAttiva: string;
  ricomincia: {
    domanda: string;
    opzioni: { presentazioni: string; squadra: string; tutto: string };
    tuttoConferma: string;
    tuttoAnnullato: string;
    nota: string;
  };
  /** Da `permessi` di @spalla/it-copy. */
  permessi: {
    riservaTesto: (id: string) => string;
    richiestaVecchia: string;
    richiestaNonTua: string;
    domanda: { scriviRisposta: string; sceltaMultipla: string; nessunaRisposta: string };
  };
  /** Frasi brevi fuori dai blocchi sopra (`telegram.altro` di it-copy). */
  altro: {
    soloDalComputer: string;
    fileNonScaricato: string;
    erroreGenerico: string;
    annulla: string;
    fattoScelta: string;
    tempoScaduto: string;
    /** Testo consegnato all'assistente quando arriva un allegato senza didascalia. */
    fotoSenzaDidascalia: string;
    documentoSenzaDidascalia: string;
  };
}

/** La fonte delle frasi è @spalla/it-copy: `telegram` più `permessi`. */
export const testiTelegramPredefiniti: TestiTelegram = { ...telegram, permessi };

/** Unisce i testi passati dall'integratore con la riserva, chiave per chiave (così `altro` può mancare). */
export function completaTesti(parziali?: Partial<TestiTelegram>): TestiTelegram {
  if (!parziali) return testiTelegramPredefiniti;
  const esito: Record<string, unknown> = { ...testiTelegramPredefiniti };
  for (const [chiave, valore] of Object.entries(parziali)) {
    if (valore === undefined) continue;
    const base = (testiTelegramPredefiniti as unknown as Record<string, unknown>)[chiave];
    esito[chiave] =
      base && typeof base === 'object' && !Array.isArray(base) && typeof valore === 'object' && !Array.isArray(valore)
        ? { ...(base as object), ...(valore as object) }
        : valore;
  }
  return esito as unknown as TestiTelegram;
}
