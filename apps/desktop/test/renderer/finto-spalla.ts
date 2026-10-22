import { vi } from 'vitest';
import type { ApiSpalla, StatoApp } from '../../src/ipc/contratto.js';

type Ascoltatori = { [K in keyof ApiSpalla['on']]-?: Array<Parameters<NonNullable<ApiSpalla['on'][K]>>[0]> };

/** Stato dell'app di prova (S0 da fare, nessun nome ancora). */
export function statoDiProva(parziale: Partial<StatoApp> = {}): StatoApp {
  return {
    prodotto: 'Spalla',
    versione: '0.0.1',
    cartellaLavoro: '~/Spalla',
    cervello: { livello: 'equilibrato', tettoMensileEur: 25, collegato: false },
    onboarding: 'da_fare',
    telegram: { collegato: false, inAttesaDiPairing: false },
    voce: { disponibile: false },
    schermataIniziale: 'benvenuto',
    costi: { meseEur: 0, sopraTetto: false },
    ...parziale,
  };
}

export interface SpallaFinta {
  api: ApiSpalla;
  /** Emette un evento come farebbe il processo principale. */
  emetti<K extends keyof Ascoltatori>(nome: K, dato: Parameters<Ascoltatori[K][number]>[0]): void;
  ascoltatori: Ascoltatori;
}

/** Un `window.spalla` finto: ogni metodo è un vi.fn con un risultato ragionevole, gli eventi si emettono a mano. */
export function creaSpallaFinta(stato: StatoApp = statoDiProva()): SpallaFinta {
  const ascoltatori: Ascoltatori = {
    eventoScambio: [],
    domanda: [],
    permesso: [],
    permessoChiuso: [],
    terminaleDati: [],
    terminaleStato: [],
    telegramStato: [],
    statoApp: [],
    voceAvanzamento: [],
    notifica: [],
    apriSchermata: [],
    domandaChiusa: [],
  };
  const iscrivi =
    <K extends keyof Ascoltatori>(nome: K) =>
    (cb: Ascoltatori[K][number]) => {
      (ascoltatori[nome] as unknown[]).push(cb);
      return () => {
        const elenco = ascoltatori[nome] as unknown[];
        const i = elenco.indexOf(cb);
        if (i >= 0) elenco.splice(i, 1);
      };
    };

  const api: ApiSpalla = {
    app: {
      stato: vi.fn(async () => stato),
      apriNelSistema: vi.fn(async () => undefined),
      apriLink: vi.fn(async () => undefined),
      esportaTutto: vi.fn(async () => null),
      chiudi: vi.fn(async () => undefined),
    },
    onboarding: {
      stato: vi.fn(async () => stato.onboarding),
      prepara: vi.fn(async () => ({ messaggioIniziale: 'Leggi onboarding/PRIMO-AVVIO.md e comincia.' })),
      completa: vi.fn(async () => []),
      risposte: vi.fn(async () => []),
      ricomincia: vi.fn(async () => undefined),
    },
    chat: {
      invia: vi.fn(async () => undefined),
      rispondi: vi.fn(async () => undefined),
      nuovaSessione: vi.fn(async () => undefined),
      interrompi: vi.fn(async () => undefined),
    },
    permessi: { decidi: vi.fn(async () => undefined), inAttesa: vi.fn(async () => []) },
    cervello: {
      collegaChiaveApi: vi.fn(async () => ({ ok: true, messaggio: 'Collegato. Spalla può pensare.' })),
      rimuoviChiaveApi: vi.fn(async () => undefined),
      avviaPannelloLogin: vi.fn(async () => ({ attivo: false, collegato: false })),
      chiudiPannelloLogin: vi.fn(async () => undefined),
      verifica: vi.fn(async () => ({ ok: true, messaggio: 'Collegato.' })),
      cambiaModalita: vi.fn(async () => undefined),
    },
    terminale: { scrivi: vi.fn(async () => undefined), ridimensiona: vi.fn(async () => undefined) },
    telegram: {
      stato: vi.fn(async () => ({ collegato: false, proprietarioConfermato: false })),
      suggerimenti: vi.fn(async () => ({ nomeBot: 'Bruno di Marco', usernameSuggerito: 'bruno_marco_bot', linkBotFather: 'https://t.me/BotFather' })),
      collegaConToken: vi.fn(async () => ({ ok: true, messaggio: 'Trovato: @bruno_marco_bot.' })),
      collegaInDueTocchi: vi.fn(async () => ({ ok: true, messaggio: 'Collegato.' })),
      confermaPairing: vi.fn(async () => ({ ok: true, messaggio: 'Fatto.' })),
      scollega: vi.fn(async () => undefined),
    },
    squadra: { elenco: vi.fn(async () => []), attiva: vi.fn(async () => undefined), disattiva: vi.fn(async () => undefined) },
    memoria: {
      elenco: vi.fn(async () => []),
      leggi: vi.fn(async () => ''),
      cerca: vi.fn(async () => []),
      contatori: vi.fn(async () => ({ memoriaRighe: 9, memoriaByte: 400, utenteCaratteri: 120, schede: 2, diari: 3 })),
      ricostruisciIndice: vi.fn(async () => undefined),
      riepilogoProfilo: vi.fn(async () => 'Sei Marco, fai il commercialista.'),
    },
    impostazioni: {
      leggi: vi.fn(async () => ({
        cervello: { livello: 'equilibrato' as const, tettoMensileEur: 25 },
        orari: { silenzioDa: '21:00', silenzioA: '08:00', domenica: 'silenzio' as const },
        brief: { attivo: false, ora: '08:00', canale: 'desktop' as const },
        riordinoNotturno: { attivo: true, ora: '03:00' },
        voce: { desktop: 'spento' as const, risposteVocaliTelegram: false },
        avvioAutomatico: true,
      })),
      salva: vi.fn(async () => undefined),
    },
    voce: { stato: vi.fn(async () => ({ disponibile: false, inDownload: false })), prepara: vi.fn(async () => undefined) },
    on: {
      eventoScambio: iscrivi('eventoScambio'),
      domanda: iscrivi('domanda'),
      permesso: iscrivi('permesso'),
      permessoChiuso: iscrivi('permessoChiuso'),
      terminaleDati: iscrivi('terminaleDati'),
      terminaleStato: iscrivi('terminaleStato'),
      telegramStato: iscrivi('telegramStato'),
      statoApp: iscrivi('statoApp'),
      voceAvanzamento: iscrivi('voceAvanzamento'),
      notifica: iscrivi('notifica'),
      apriSchermata: iscrivi('apriSchermata'),
      domandaChiusa: iscrivi('domandaChiusa'),
    },
  };

  return {
    api,
    ascoltatori,
    emetti(nome, dato) {
      for (const cb of [...ascoltatori[nome]]) (cb as (d: unknown) => void)(dato);
    },
  };
}

/** Installa il finto su `window.spalla` (il setup lo toglie dopo ogni prova). */
export function installa(finto: SpallaFinta): SpallaFinta {
  (window as unknown as { spalla: ApiSpalla }).spalla = finto.api;
  return finto;
}
