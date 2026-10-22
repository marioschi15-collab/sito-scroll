import fs from 'node:fs';
import path from 'node:path';
import type { ContatoriMemoria, Logger, MemoryService, Percorsi, RisultatoMemoria } from '../contratti.js';
import { spezzaInBlocchi } from './blocchi.js';
import { contaMemoria } from './contatori.js';
import { appendiRigaDiario } from './diario.js';
import { creaIndice, eErroreCorruzione, type Indice } from './indice.js';
import { creaOsservatore, type ModoOsservazione, type Osservatore } from './osservatore.js';
import { espressioniFts } from './query-fts.js';
import { CARTELLE_INDICIZZATE, DIMENSIONE_MASSIMA_FILE, eInArchivio, scansionaMemoria } from './scansione.js';
import { controllaTetti } from './tetti.js';

export { CARATTERI_PER_BLOCCO, spezzaInBlocchi, spezzaTesto, separaFrontmatter, etichetteDaFrontmatter, type Blocco } from './blocchi.js';
export { contaMemoria, contaMarkdown } from './contatori.js';
export { LIMITE_PRIMA_RIGA, appendiRigaDiario, dataLocale, fileDiario, formattaRigaDiario, oraLocale, pulisciPrimaRiga } from './diario.js';
export { BONUS_RECENZA_MASSIMO, FINESTRA_RECENZA_MS, VERSIONE_SCHEMA, cancellaFileIndice, creaIndice, eErroreCorruzione, type Indice } from './indice.js';
export { creaLucchetto, creaSegnaleAttivita, FINESTRA_ATTIVITA_MS, SCADENZA_LUCCHETTO_MS, type Lucchetto, type SegnaleAttivita } from './lucchetto.js';
export { creaOsservatore, DEBOUNCE_PREDEFINITO_MS, POLLING_PREDEFINITO_MS, type ModoOsservazione, type Osservatore } from './osservatore.js';
export { espressioniFts, tokenizza, type EspressioniFts } from './query-fts.js';
export {
  creaLavoroRiordino,
  cronDaOra,
  costruisciPromptRiordino,
  fileLucchettoRiordino,
  fileRuoloArchivista,
  fileSessioneAttiva,
  OBIETTIVO_RIGHE_INDICE,
  RUOLO_ARCHIVISTA,
  TETTO_RIORDINO_USD,
  type ConfigRiordino,
  type DipendenzeRiordino,
  type EsitoRiordino,
  type LavoroRiordino,
} from './riordino.js';
export { CARTELLE_INDICIZZATE, eFileIndicizzabile, eInArchivio, normalizzaRelativo, scansionaMemoria } from './scansione.js';
export { contaByte, contaCaratteri, contaRighe, controllaTetti } from './tetti.js';
export { testiMemoria, formattaNumero } from './testi.js';

export const RISULTATI_PREDEFINITI = 6;
const RISULTATI_MASSIMI = 50;

export interface OpzioniMemoryService {
  percorsi: Percorsi;
  logger: Logger;
  /** Orologio iniettabile (diario, bonus di recenza). */
  adesso?: () => Date;
  debounceMs?: number;
  intervalloPollingMs?: number;
  forzaPolling?: boolean;
}

export interface StatoIndice {
  file: number;
  blocchi: number;
  osservazione: ModoOsservazione;
}

export interface MemoryServiceEsteso extends MemoryService {
  /** Confronta i file su disco con l'indice e aggiorna solo ciò che è cambiato. */
  sincronizza(): Promise<void>;
  statoIndice(): Promise<StatoIndice>;
}

/**
 * Memory Service (docs/03): indice FTS5 derivato dai Markdown di profilo/ e memoria/, osservatore con debounce,
 * tetti per l'hook PostToolUse, riga meccanica del diario per l'hook Stop, contatori per la scheda Memoria.
 * Il Markdown resta la verità: l'indice si può cancellare e rifare in qualsiasi momento.
 */
export function creaMemoryService(opzioni: OpzioniMemoryService): MemoryServiceEsteso {
  const { percorsi, logger } = opzioni;
  const adesso = opzioni.adesso ?? (() => new Date());
  const indice: Indice = creaIndice({ file: percorsi.indiceMemoria, logger, adesso });
  const osservatore: Osservatore = creaOsservatore({
    cartelle: CARTELLE_INDICIZZATE.map((c) => path.join(percorsi.cartellaLavoro, c)),
    suCambiamento: () => sincronizzaOra(),
    logger,
    debounceMs: opzioni.debounceMs,
    intervalloPollingMs: opzioni.intervalloPollingMs,
    forzaPolling: opzioni.forzaPolling,
  });
  let pronto = false;

  function assicuraPronto(): void {
    if (pronto) return;
    indice.apri();
    sincronizzaOra();
    pronto = true;
  }

  /** Tutto sincrono (better-sqlite3 e fs sync): nessun intreccio tra osservatore, ricerche e ricostruzioni. */
  function sincronizzaOra(): void {
    const inizio = Date.now();
    const suDisco = scansionaMemoria(percorsi.cartellaLavoro);
    const inIndice = indice.elencoFile();
    let aggiornati = 0;
    let rimossi = 0;
    const visti = new Set<string>();

    for (const f of suDisco) {
      visti.add(f.file);
      const voce = inIndice.get(f.file);
      if (voce && voce.modificatoMs === f.modificatoMs && voce.dimensione === f.dimensione) continue;
      if (f.dimensione > DIMENSIONE_MASSIMA_FILE) {
        logger.avviso('memoria.file_troppo_grande', { file: f.file, byte: f.dimensione });
        continue;
      }
      let contenuto: string;
      try {
        contenuto = fs.readFileSync(f.assoluto, 'utf8');
      } catch {
        continue; // sparito nel frattempo
      }
      indice.indicizza(f.file, spezzaInBlocchi(contenuto, f.file), f.modificatoMs, f.dimensione, eInArchivio(f.file));
      aggiornati++;
    }
    for (const file of inIndice.keys()) {
      if (visti.has(file)) continue;
      indice.rimuovi(file);
      rimossi++;
    }
    if (aggiornati > 0 || rimossi > 0) logger.info('memoria.sincronizzata', { aggiornati, rimossi, durataMs: Date.now() - inizio });
  }

  function ricostruisciOra(): void {
    indice.azzera();
    sincronizzaOra();
    pronto = true;
    logger.info('memoria.indice_ricostruito', indice.statistiche());
  }

  function cercaOra(query: string, k: number): RisultatoMemoria[] {
    const espressioni = espressioniFts(query);
    if (!espressioni) return [];
    try {
      return indice.cerca(espressioni, k);
    } catch (errore) {
      if (!eErroreCorruzione(errore)) {
        logger.avviso('memoria.ricerca_fallita', { errore: errore instanceof Error ? errore.message : String(errore) });
        return [];
      }
      logger.avviso('memoria.indice_corrotto', { errore: errore instanceof Error ? errore.message : String(errore) });
      ricostruisciOra();
      return indice.cerca(espressioni, k);
    }
  }

  return {
    async avvia() {
      assicuraPronto();
      osservatore.avvia();
      logger.info('memoria.avviata', indice.statistiche());
    },

    async ferma() {
      osservatore.ferma();
      indice.chiudi();
      pronto = false;
    },

    async cerca(query, k = RISULTATI_PREDEFINITI) {
      assicuraPronto();
      const quanti = Math.max(0, Math.min(RISULTATI_MASSIMI, Math.trunc(k)));
      return cercaOra(query, quanti);
    },

    async ricostruisciIndice() {
      ricostruisciOra();
    },

    async sincronizza() {
      assicuraPronto();
      sincronizzaOra();
    },

    async contatori(): Promise<ContatoriMemoria> {
      return contaMemoria(percorsi.cartellaLavoro);
    },

    controllaTetti,

    async appendiDiario(canale, primaRiga) {
      await appendiRigaDiario({ cartellaLavoro: percorsi.cartellaLavoro, canale, primaRiga, adesso });
    },

    async statoIndice() {
      assicuraPronto();
      return { ...indice.statistiche(), osservazione: osservatore.modo() };
    },
  };
}
