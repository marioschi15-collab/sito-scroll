import type { AgentRuntime, LavoroProgrammato, Logger } from './contratti.js';
import { cronDaOra } from './memoria/index.js';

/** La parte di config.json che serve al buongiorno (docs/05 §4.4 `brief`). Strutturale: l'oggetto di @spalla/schema va bene. */
export interface ConfigBrief {
  brief: { attivo: boolean; ora: string; canale: 'telegram' | 'desktop' };
}

export interface EsitoBrief {
  quando: string;
  esito: 'fatto' | 'errore' | 'spento' | 'vuoto';
  canale?: 'telegram' | 'desktop';
  costoUsd?: number;
  durataMs?: number;
}

export interface DipendenzeBrief {
  runtime: AgentRuntime;
  config: ConfigBrief;
  logger: Logger;
  /** Dove va il testo del buongiorno (Telegram se collegato, altrimenti il canale desktop). */
  consegna?: (testo: string, canale: 'telegram' | 'desktop') => Promise<void>;
  adesso?: () => Date;
  tettoUsd?: number;
}

export interface LavoroBrief extends LavoroProgrammato {
  nome: 'brief_mattino';
  ultimoEsito(): EsitoBrief | undefined;
}

export const TETTO_BRIEF_USD = 0.05;

function dataLocale(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Il messaggio che apre la sessione del buongiorno (docs/02 §3.1, regole di canale "Sistema" in canali.md). */
export function costruisciPromptBrief(oggi: Date): string {
  const data = dataLocale(oggi);
  return [
    `Buongiorno del mattino — ${data}.`,
    '',
    "Prepara il buongiorno per l'utente, come dicono le regole del canale «sistema»: massimo 6 righe, niente domande (nessuno risponde adesso).",
    'Leggi memoria/agenda.md, memoria/MEMORIA.md e il diario di ieri e di oggi se esistono (memoria/diario/).',
    'Scrivi: le tre cose da fare oggi; le scadenze entro 7 giorni; chi aspetta una risposta da più di 24 ore. Se manca un dato, mettilo in una riga "Da chiedere:".',
    "Rispondi solo con il testo del buongiorno, nel tono dell'utente, senza titoli né tabelle. Non modificare nessun file.",
  ].join('\n');
}

/**
 * Il lavoro programmato "brief_mattino" (docs/02 §3.1). Nel prototipo è una base funzionante ma spenta per
 * impostazione (docs/06 §2: il buongiorno è fuori perimetro): si accende da config.json `brief.attivo`.
 */
export function creaLavoroBrief(deps: DipendenzeBrief): LavoroBrief {
  const { runtime, config, logger } = deps;
  const adesso = deps.adesso ?? (() => new Date());
  const tettoUsd = deps.tettoUsd ?? TETTO_BRIEF_USD;
  let ultimo: EsitoBrief | undefined;

  function registra(esito: EsitoBrief): void {
    ultimo = esito;
    const { quando: _q, ...dati } = esito;
    if (esito.esito === 'errore') logger.errore('brief.fine', dati);
    else logger.info('brief.fine', dati);
  }

  async function esegui(): Promise<void> {
    const inizio = adesso();
    const quando = inizio.toISOString();
    if (!config.brief.attivo) return registra({ quando, esito: 'spento' });

    const blocchi: string[] = [];
    let costoUsd: number | undefined;
    let errore = false;
    for await (const e of runtime.invia({ testo: costruisciPromptBrief(inizio), canale: 'sistema' }, { sessione: 'programmata', tettoUsd })) {
      if (e.tipo === 'testo' && !e.parziale && e.testo.trim()) blocchi.push(e.testo.trim());
      else if (e.tipo === 'fine') costoUsd = e.costoUsd;
      else if (e.tipo === 'errore') errore = true;
    }
    const durataMs = adesso().getTime() - inizio.getTime();
    if (errore) return registra({ quando, esito: 'errore', costoUsd, durataMs });
    const testo = blocchi.join('\n\n').trim();
    if (!testo) return registra({ quando, esito: 'vuoto', costoUsd, durataMs });
    await deps.consegna?.(testo, config.brief.canale);
    registra({ quando, esito: 'fatto', canale: config.brief.canale, costoUsd, durataMs });
  }

  return {
    nome: 'brief_mattino',
    cron: cronDaOra(config.brief.ora),
    attivo: config.brief.attivo,
    esegui,
    ultimoEsito: () => ultimo,
  };
}
