import { Cron } from 'croner';
import type { LavoroProgrammato, Logger, Scheduler } from '../contratti.js';

type NomeLavoro = LavoroProgrammato['nome'];

export interface OpzioniScheduler {
  logger: Logger;
  /** Orologio iniettabile (test). */
  adesso?: () => Date;
  /**
   * Per quanto tempo un lavoro saltato (PC in sospensione) resta "ancora utile" e va eseguito alla ripresa.
   * Predefiniti: brief 3 ore, riordino 6 ore, promemoria 1 ora.
   */
  finestreUtiliMs?: Partial<Record<NomeLavoro, number>>;
  /** Fuso orario IANA; assente = ora locale del PC. */
  fusoOrario?: string;
}

export interface StatoLavoro {
  nome: NomeLavoro;
  cron: string;
  attivo: boolean;
  inCorso: boolean;
  prossimaEsecuzione: Date | null;
  ultimaEsecuzione: Date | undefined;
}

export interface SchedulerEsteso extends Scheduler {
  lavori(): StatoLavoro[];
  /** Esegue subito un lavoro (es. pulsante "Fai il brief adesso"). */
  eseguiOra(nome: NomeLavoro): Promise<void>;
  rimuovi(nome: NomeLavoro): void;
}

export const FINESTRE_UTILI_MS: Record<NomeLavoro, number> = {
  brief_mattino: 3 * 60 * 60 * 1000,
  riordino_notturno: 6 * 60 * 60 * 1000,
  promemoria: 60 * 60 * 1000,
};

const MASSIME_ITERAZIONI = 5000;

interface Voce {
  lavoro: LavoroProgrammato;
  job?: Cron;
  ultimaEsecuzione?: Date;
  inCorso: boolean;
}

/**
 * L'ultima occorrenza del pattern nell'intervallo (da, a], oppure null.
 * Usa il calendario di croner, così vale la stessa lettura dell'espressione dei lavori veri.
 */
export function ultimaOccorrenzaTra(cron: string, da: Date, a: Date, fusoOrario?: string): Date | null {
  const pattern = new Cron(cron, { paused: true, ...(fusoOrario ? { timezone: fusoOrario } : {}) });
  try {
    let ultima: Date | null = null;
    let cursore: Date = da;
    for (let i = 0; i < MASSIME_ITERAZIONI; i++) {
      const prossima = pattern.nextRun(cursore);
      if (!prossima || prossima.getTime() > a.getTime()) break;
      ultima = prossima;
      cursore = prossima;
    }
    return ultima;
  } finally {
    pattern.stop();
  }
}

/** Scheduler dei lavori ricorrenti (docs/02 §3.1, §4): croner + recupero dopo il sonno. */
export function creaScheduler(opzioni: OpzioniScheduler): SchedulerEsteso {
  const { logger } = opzioni;
  const adesso = opzioni.adesso ?? (() => new Date());
  const finestre = { ...FINESTRE_UTILI_MS, ...opzioni.finestreUtiliMs };
  const voci = new Map<NomeLavoro, Voce>();
  let avviatoIl: Date | undefined;

  async function esegui(voce: Voce, motivo: 'orario' | 'ripresa' | 'manuale'): Promise<void> {
    if (voce.inCorso) {
      logger.avviso('scheduler.lavoro_gia_in_corso', { nome: voce.lavoro.nome, motivo });
      return;
    }
    voce.inCorso = true;
    const inizio = adesso();
    logger.info('scheduler.lavoro_inizio', { nome: voce.lavoro.nome, motivo });
    try {
      await voce.lavoro.esegui();
      voce.ultimaEsecuzione = adesso();
      logger.info('scheduler.lavoro_fine', { nome: voce.lavoro.nome, durataMs: adesso().getTime() - inizio.getTime() });
    } catch (errore) {
      logger.errore('scheduler.lavoro_errore', { nome: voce.lavoro.nome, errore: errore instanceof Error ? errore.message : String(errore) });
    } finally {
      voce.inCorso = false;
    }
  }

  function accendi(voce: Voce): void {
    if (voce.job || !voce.lavoro.attivo) return;
    voce.job = new Cron(
      voce.lavoro.cron,
      {
        protect: true,
        ...(opzioni.fusoOrario ? { timezone: opzioni.fusoOrario } : {}),
        catch: (e: unknown) => logger.errore('scheduler.cron_errore', { nome: voce.lavoro.nome, errore: e instanceof Error ? e.message : String(e) }),
      },
      () => { void esegui(voce, 'orario'); },
    );
  }

  function spegni(voce: Voce): void {
    voce.job?.stop();
    voce.job = undefined;
  }

  return {
    registra(lavoro) {
      // Valida subito l'espressione: un errore qui è di configurazione e deve emergere.
      new Cron(lavoro.cron, { paused: true }).stop();
      const esistente = voci.get(lavoro.nome);
      if (esistente) spegni(esistente);
      const voce: Voce = { lavoro, inCorso: false, ultimaEsecuzione: esistente?.ultimaEsecuzione };
      voci.set(lavoro.nome, voce);
      if (avviatoIl) accendi(voce);
      logger.info('scheduler.registrato', { nome: lavoro.nome, cron: lavoro.cron, attivo: lavoro.attivo });
    },

    rimuovi(nome) {
      const voce = voci.get(nome);
      if (!voce) return;
      spegni(voce);
      voci.delete(nome);
    },

    avvia() {
      if (avviatoIl) return;
      avviatoIl = adesso();
      for (const voce of voci.values()) accendi(voce);
      logger.info('scheduler.avviato', { lavori: [...voci.keys()] });
    },

    ferma() {
      for (const voce of voci.values()) spegni(voce);
      avviatoIl = undefined;
      logger.info('scheduler.fermato');
    },

    async eseguiOra(nome) {
      const voce = voci.get(nome);
      if (!voce) throw new Error(`lavoro non registrato: ${nome}`);
      await esegui(voce, 'manuale');
    },

    async ripresaDalSonno() {
      if (!avviatoIl) return;
      const ora = adesso();
      for (const voce of voci.values()) {
        if (!voce.lavoro.attivo) continue;
        const riferimento = Math.max(avviatoIl.getTime(), voce.ultimaEsecuzione?.getTime() ?? 0);
        const finestra = finestre[voce.lavoro.nome];
        const da = new Date(Math.max(riferimento, ora.getTime() - finestra));
        const saltata = ultimaOccorrenzaTra(voce.lavoro.cron, da, ora, opzioni.fusoOrario);
        if (!saltata) continue;
        logger.info('scheduler.recupero_dopo_sonno', { nome: voce.lavoro.nome, prevista: saltata.toISOString() });
        await esegui(voce, 'ripresa');
      }
    },

    lavori() {
      return [...voci.values()].map((v) => ({
        nome: v.lavoro.nome,
        cron: v.lavoro.cron,
        attivo: v.lavoro.attivo,
        inCorso: v.inCorso,
        prossimaEsecuzione: v.job?.nextRun() ?? null,
        ultimaEsecuzione: v.ultimaEsecuzione,
      }));
    },
  };
}
