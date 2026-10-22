import { voce } from '@spalla/it-copy';

/** Frasi del servizio voce (docs/02 §7): la fonte è `voce` di @spalla/it-copy; qui la forma che il modulo accetta. */
export interface TestiVoce {
  motoreSpento: string;
  motoreMancante: string;
  modelloMancante: string;
  modelloDanneggiato: string;
  nessunaVoce: string;
  preparazione: {
    inizio: string;
    rilevatore: string;
    modello: (nome: string, megabyte: number) => string;
    estrazione: string;
    verifica: string;
    fatto: string;
  };
  erroreDownload: string;
  erroreHash: string;
}

export const testiVocePredefiniti: TestiVoce = voce;
