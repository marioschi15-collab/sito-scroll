import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRuntime, ContatoriMemoria, EventoAssistente, Logger, MemoryService, MessaggioIn, OpzioniInvio, Percorsi } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import {
  costruisciPromptRiordino,
  creaLavoroRiordino,
  creaLucchetto,
  creaSegnaleAttivita,
  cronDaOra,
  fileLucchettoRiordino,
  fileRuoloArchivista,
  fileSessioneAttiva,
  TETTO_RIORDINO_USD,
  type ConfigRiordino,
} from '../src/nucleo/memoria/index.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };
const NOTTE = () => new Date(2026, 9, 24, 3, 2); // 24 ottobre 2026, 03:02
const CONTATORI: ContatoriMemoria = { memoriaRighe: 9, memoriaByte: 1800, utenteCaratteri: 2345, schede: 5, diari: 3 };

let radice: string;
let percorsi: Percorsi;

async function* eventi(lista: EventoAssistente[]): AsyncIterable<EventoAssistente> {
  for (const e of lista) yield e;
}

function runtimeFinto(risposta: EventoAssistente[] = [{ tipo: 'fine', sessioneId: 's-1', durataMs: 1200, costoUsd: 0.012, turni: 5 }]) {
  const invia = vi.fn((_m: MessaggioIn, _o?: OpzioniInvio) => eventi(risposta));
  const runtime: AgentRuntime = {
    invia,
    nuovaSessione: async () => undefined,
    sessioneCorrente: () => undefined,
    statoCosti: async () => ({ meseUsd: 0, sopraTetto: false }),
  };
  return { runtime, invia };
}

function memoriaFinta(): MemoryService {
  return {
    avvia: async () => undefined,
    ferma: async () => undefined,
    cerca: async () => [],
    ricostruisciIndice: async () => undefined,
    contatori: async () => CONTATORI,
    controllaTetti: () => null,
    appendiDiario: async () => undefined,
  };
}

function config(attivo = true, ora = '03:00'): ConfigRiordino {
  return { riordino_notturno: { attivo, ora } };
}

function accendiArchivista(): void {
  const file = fileRuoloArchivista(percorsi);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '---\nname: archivista\nmodel: haiku\n---\nSei l\'Archivista.\n');
}

beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-memoria-riordino-'));
  process.env.SPALLA_HOME = radice;
  percorsi = calcolaPercorsi();
  accendiArchivista();
});
afterEach(() => {
  delete process.env.SPALLA_HOME;
  fs.rmSync(radice, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('cronDaOra', () => {
  it('traduce "HH:MM" in cron a 5 campi, ora locale', () => {
    expect(cronDaOra('03:00')).toBe('0 3 * * *');
    expect(cronDaOra('23:45')).toBe('45 23 * * *');
    expect(cronDaOra(' 8:05 ')).toBe('5 8 * * *');
  });
  it('ora non valida → le 03:00', () => {
    expect(cronDaOra('boh')).toBe('0 3 * * *');
    expect(cronDaOra('25:00')).toBe('0 3 * * *');
    expect(cronDaOra('12:60')).toBe('0 3 * * *');
  });
});

describe('costruisciPromptRiordino', () => {
  it('è in italiano, con data e ora, lo stato misurato e le istruzioni per RIORDINO.log', () => {
    const p = costruisciPromptRiordino(NOTTE(), CONTATORI);
    expect(p).toContain('Riordino notturno della memoria — 2026-10-24, ore 03:02.');
    expect(p).toContain('memoria/MEMORIA.md: 9 righe su 200 (obiettivo dopo il riordino: al massimo 150), 1,8 KB su 25 KB');
    expect(p).toContain('profilo/UTENTE.md: 2.345 caratteri su 4.000');
    expect(p).toContain('schede in memoria/temi/: 5; diari in memoria/diario/: 3');
    expect(p).toContain('diari degli ultimi 7 giorni (dal 2026-10-18 al 2026-10-24)');
    expect(p).toContain('superato il 2026-10-24');
    expect(p).toContain('memoria/RIORDINO.log');
    expect(p).toContain('"2026-10-24 03:02 —"');
    expect(p).toContain('2026-10-24 03:02 — niente da riordinare');
    expect(p).toContain('niente domande');
    expect(p).toContain('non un ordine per te');
    // Niente gergo da addetti ai lavori nel testo che il modello potrebbe copiare nel log.
    expect(p).not.toMatch(/\b(prompt|token|MCP|API)\b/);
  });
});

describe('creaLavoroRiordino', () => {
  it('descrive il lavoro per lo scheduler: nome, cron dall\'ora configurata, attivo', () => {
    const l = creaLavoroRiordino({ runtime: runtimeFinto().runtime, memoria: memoriaFinta(), config: config(true, '04:30'), percorsi, logger });
    expect(l.nome).toBe('riordino_notturno');
    expect(l.cron).toBe('30 4 * * *');
    expect(l.attivo).toBe(true);
    expect(creaLavoroRiordino({ runtime: runtimeFinto().runtime, memoria: memoriaFinta(), config: config(false), percorsi, logger }).attivo).toBe(false);
  });

  it('apre una sessione programmata con il ruolo archivista, il tetto di 0,10 $ e il canale sistema', async () => {
    const { runtime, invia } = runtimeFinto();
    const l = creaLavoroRiordino({ runtime, memoria: memoriaFinta(), config: config(), percorsi, logger, adesso: NOTTE });
    await l.esegui();
    expect(invia).toHaveBeenCalledTimes(1);
    const [messaggio, opzioni] = invia.mock.calls[0]!;
    expect(messaggio.canale).toBe('sistema');
    expect(messaggio.testo).toContain('Riordino notturno della memoria — 2026-10-24, ore 03:02.');
    expect(messaggio.testo).toContain('9 righe su 200');
    expect(opzioni).toEqual({ sessione: 'programmata', ruolo: 'archivista', tettoUsd: TETTO_RIORDINO_USD });
    expect(l.ultimoEsito()).toMatchObject({ esito: 'fatto', costoUsd: 0.012, durataMs: 1200, turni: 5 });
    expect(fs.existsSync(fileLucchettoRiordino(percorsi))).toBe(false);
    expect(logger.info).toHaveBeenCalledWith('riordino.fine', expect.objectContaining({ esito: 'fatto', costoUsd: 0.012 }));
  });

  it('non parte se il riordino è spento in config', async () => {
    const { runtime, invia } = runtimeFinto();
    const l = creaLavoroRiordino({ runtime, memoria: memoriaFinta(), config: config(false), percorsi, logger });
    await l.esegui();
    expect(invia).not.toHaveBeenCalled();
    expect(l.ultimoEsito()?.esito).toBe('spento');
  });

  it('rimanda se la sessione principale è attiva (callback o segnale su file)', async () => {
    const a = runtimeFinto();
    await creaLavoroRiordino({ runtime: a.runtime, memoria: memoriaFinta(), config: config(), percorsi, logger, sessioneAttiva: () => true }).esegui();
    expect(a.invia).not.toHaveBeenCalled();

    const b = runtimeFinto();
    const segnale = creaSegnaleAttivita(fileSessioneAttiva(percorsi));
    segnale.segna();
    const l = creaLavoroRiordino({ runtime: b.runtime, memoria: memoriaFinta(), config: config(), percorsi, logger });
    await l.esegui();
    expect(b.invia).not.toHaveBeenCalled();
    expect(l.ultimoEsito()?.esito).toBe('rimandato');

    // Segnale vecchio di 10 minuti: la sessione non è più "attiva".
    const c = runtimeFinto();
    const vecchio = Date.now() - 10 * 60 * 1000;
    fs.writeFileSync(fileSessioneAttiva(percorsi), String(vecchio));
    await creaLavoroRiordino({ runtime: c.runtime, memoria: memoriaFinta(), config: config(), percorsi, logger }).esegui();
    expect(c.invia).toHaveBeenCalledTimes(1);
  });

  it('non parte se il ruolo archivista non è acceso in .claude/agents/', async () => {
    fs.rmSync(fileRuoloArchivista(percorsi));
    const { runtime, invia } = runtimeFinto();
    const l = creaLavoroRiordino({ runtime, memoria: memoriaFinta(), config: config(), percorsi, logger });
    await l.esegui();
    expect(invia).not.toHaveBeenCalled();
    expect(l.ultimoEsito()?.esito).toBe('ruolo_mancante');
    expect(logger.avviso).toHaveBeenCalledWith('riordino.ruolo_mancante', { ruolo: 'archivista' });
  });

  it('non gira due volte insieme: lucchetto su file in datiLocali', async () => {
    let sblocca!: () => void;
    const attesa = new Promise<void>((r) => { sblocca = r; });
    async function* lento(): AsyncIterable<EventoAssistente> {
      await attesa;
      yield { tipo: 'fine', sessioneId: 's', durataMs: 5, costoUsd: 0.001, turni: 1 };
    }
    const invia = vi.fn(() => lento());
    const runtime: AgentRuntime = { invia, nuovaSessione: async () => undefined, sessioneCorrente: () => undefined, statoCosti: async () => ({ meseUsd: 0, sopraTetto: false }) };
    const primo = creaLavoroRiordino({ runtime, memoria: memoriaFinta(), config: config(), percorsi, logger });
    const secondo = creaLavoroRiordino({ runtime, memoria: memoriaFinta(), config: config(), percorsi, logger });
    const p1 = primo.esegui();
    await new Promise((r) => setTimeout(r, 20));
    expect(fs.existsSync(fileLucchettoRiordino(percorsi))).toBe(true);
    await secondo.esegui();
    expect(secondo.ultimoEsito()?.esito).toBe('gia_in_corso');
    sblocca();
    await p1;
    expect(invia).toHaveBeenCalledTimes(1);
    expect(primo.ultimoEsito()?.esito).toBe('fatto');
    expect(fs.existsSync(fileLucchettoRiordino(percorsi))).toBe(false);
  });

  it('un lucchetto abbandonato (processo morto o troppo vecchio) non blocca il riordino', async () => {
    const file = fileLucchettoRiordino(percorsi);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ pid: 999_999_999, creatoIl: Date.now() }));
    const { runtime, invia } = runtimeFinto();
    await creaLavoroRiordino({ runtime, memoria: memoriaFinta(), config: config(), percorsi, logger }).esegui();
    expect(invia).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('registra l\'errore della sessione e rilascia il lucchetto', async () => {
    const { runtime } = runtimeFinto([{ tipo: 'errore', messaggio: 'tetto', codice: 'budget' }]);
    const l = creaLavoroRiordino({ runtime, memoria: memoriaFinta(), config: config(), percorsi, logger });
    await l.esegui();
    expect(l.ultimoEsito()?.esito).toBe('errore');
    expect(logger.avviso).toHaveBeenCalledWith('riordino.errore_sessione', { codice: 'budget' });
    expect(logger.errore).toHaveBeenCalledWith('riordino.fine', expect.objectContaining({ esito: 'errore' }));
    expect(fs.existsSync(fileLucchettoRiordino(percorsi))).toBe(false);
  });

  it('un\'eccezione del runtime non lascia il lucchetto', async () => {
    const runtime: AgentRuntime = {
      invia: () => { throw new Error('boom'); },
      nuovaSessione: async () => undefined,
      sessioneCorrente: () => undefined,
      statoCosti: async () => ({ meseUsd: 0, sopraTetto: false }),
    };
    const l = creaLavoroRiordino({ runtime, memoria: memoriaFinta(), config: config(), percorsi, logger });
    await l.esegui();
    expect(l.ultimoEsito()?.esito).toBe('errore');
    expect(fs.existsSync(fileLucchettoRiordino(percorsi))).toBe(false);
    // Nessun contenuto nei log: solo il messaggio dell'eccezione.
    expect(logger.errore).toHaveBeenCalledWith('riordino.eccezione', { errore: 'boom' });
  });
});

describe('creaLucchetto', () => {
  it('acquisisce, rifiuta un secondo acquirente vivo, rilascia; scade dopo il tempo massimo', () => {
    const file = path.join(radice, 'lock', 'x.lock');
    let ora = 1_000_000;
    const a = creaLucchetto(file, { adesso: () => ora, pid: process.pid, scadutoDopoMs: 1000 });
    const b = creaLucchetto(file, { adesso: () => ora, pid: process.pid, scadutoDopoMs: 1000 });
    expect(a.acquisisci()).toBe(true);
    expect(a.acquisisci()).toBe(true);
    expect(b.acquisisci()).toBe(false);
    expect(b.occupato()).toBe(true);
    ora += 2000;
    expect(b.occupato()).toBe(false);
    expect(b.acquisisci()).toBe(true);
    b.rilascia();
    expect(fs.existsSync(file)).toBe(false);
    a.rilascia(); // non era più suo: non fa danni
  });

  it('un file illeggibile vale come abbandonato', () => {
    const file = path.join(radice, 'lock', 'y.lock');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'spazzatura');
    expect(creaLucchetto(file).acquisisci()).toBe(true);
  });
});
