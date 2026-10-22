import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanUseTool, HookCallback, Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AuthProvider, Broker, DecisionePermesso, DomandaUtente, EventoAssistente, Logger, MemoryService, Percorsi, RichiestaPermesso } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import { creaRuntimeBinario } from '../src/nucleo/runtime/index.js';
import { descriviRichiesta } from '../src/nucleo/broker/index.js';
import { domandaUtenteDa, massimoDalTesto } from '../src/nucleo/agent/permessi.js';
import {
  componiPrompt,
  creaAgentRuntime,
  creaStrumentoMemoriaCerca,
  descriviStrumento,
  percorsoAssolutoPerRegola,
  type ConfigRuntime,
  type DipendenzeAgentRuntime,
  type FunzioneQuery,
} from '../src/nucleo/agent/index.js';

// --- costruttori di messaggi SDK (forme da agent-sdk_typescript.md) -------------------------------------------

const S = 'sess-0001';
function init(session_id = S): SDKMessage {
  return { type: 'system', subtype: 'init', session_id, uuid: 'u-init', apiKeySource: 'none', claude_code_version: 'test', cwd: '/', tools: [], mcp_servers: [], model: 'sonnet', permissionMode: 'default', slash_commands: [], output_style: 'default', skills: [], plugins: [] } as unknown as SDKMessage;
}
function delta(text: string): SDKMessage {
  return { type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }, parent_tool_use_id: null, uuid: 'u-d', session_id: S } as unknown as SDKMessage;
}
function assistente(content: unknown[], extra: Record<string, unknown> = {}): SDKMessage {
  return { type: 'assistant', message: { id: 'm1', type: 'message', role: 'assistant', model: 'sonnet', content, stop_reason: 'end_turn', stop_sequence: null, usage: {} }, parent_tool_use_id: null, uuid: 'u-a', session_id: S, ...extra } as unknown as SDKMessage;
}
function risultato(total_cost_usd = 0.012, session_id = S, extra: Record<string, unknown> = {}): SDKMessage {
  return { type: 'result', subtype: 'success', is_error: false, result: 'fatto', session_id, uuid: 'u-r', duration_ms: 1500, duration_api_ms: 1200, num_turns: 2, stop_reason: 'end_turn', total_cost_usd, usage: {}, modelUsage: {}, permission_denials: [], ...extra } as unknown as SDKMessage;
}
function risultatoErrore(subtype: string, errors: string[] = [], extra: Record<string, unknown> = {}): SDKMessage {
  return { type: 'result', subtype, is_error: true, session_id: S, uuid: 'u-re', duration_ms: 10, duration_api_ms: 5, num_turns: 1, stop_reason: null, total_cost_usd: 0.001, usage: {}, modelUsage: {}, permission_denials: [], errors, ...extra } as unknown as SDKMessage;
}

type Copione = (options: Options, prompt: string) => AsyncGenerator<SDKMessage>;
function queryFinta(copione: Copione, catture: Options[] = []): FunzioneQuery {
  return ({ prompt, options }) => {
    catture.push(options as Options);
    return copione(options as Options, prompt as string);
  };
}
async function* semplice(): AsyncGenerator<SDKMessage> {
  yield init();
  yield delta('Ciao');
  yield delta(' Marco');
  yield assistente([{ type: 'text', text: 'Ciao Marco' }, { type: 'tool_use', id: 't1', name: 'Read', input: { file_path: `${cartellaLavoro()}/memoria/agenda.md` } }]);
  yield risultato();
}

async function raccogli(it: AsyncIterable<EventoAssistente>): Promise<EventoAssistente[]> {
  const eventi: EventoAssistente[] = [];
  for await (const e of it) eventi.push(e);
  return eventi;
}

// --- ambiente di prova ---------------------------------------------------------------------------------------

let radice: string;
let percorsi: Percorsi;
const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };
function cartellaLavoro() { return percorsi.cartellaLavoro; }

beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-agent-'));
  process.env.SPALLA_HOME = radice;
  percorsi = calcolaPercorsi();
});
afterEach(() => {
  delete process.env.SPALLA_HOME;
  fs.rmSync(radice, { recursive: true, force: true });
});

const authChiave: AuthProvider = { modalita: 'chiave_api', variabiliAmbiente: async () => ({ ANTHROPIC_API_KEY: 'sk-ant-test' }), verifica: async () => ({ ok: true, messaggio: 'ok' }) };
const authAbbonamento: AuthProvider = { modalita: 'abbonamento', variabiliAmbiente: async () => ({}), verifica: async () => ({ ok: true, messaggio: 'ok' }) };

function brokerFinto(decisione: 'consenti' | 'nega' = 'consenti') {
  const chiedi = vi.fn(async (r: RichiestaPermesso) => (decisione === 'consenti' ? { esito: 'consenti' as const } : { esito: 'nega' as const, motivo: 'No, grazie.' }));
  const broker: Broker = { chiedi, registraCanale: vi.fn(), segnaAttivita: vi.fn() };
  return { broker, chiedi };
}

function memoriaFinta(tetto: string | null = null) {
  const controllaTetti = vi.fn(() => tetto);
  const appendiDiario = vi.fn(async () => undefined);
  const cerca = vi.fn(async () => [{ file: 'memoria/temi/lamberti.md', titolo: 'Sig.ra Lamberti', estratto: 'Trilocale via Saragozza', punteggio: 1, modificato: '2026-10-20T10:00:00.000Z' }]);
  const memoria: MemoryService = { avvia: async () => undefined, ferma: async () => undefined, cerca, ricostruisciIndice: async () => undefined, contatori: async () => ({ memoriaRighe: 0, memoriaByte: 0, utenteCaratteri: 0, schede: 0, diari: 0 }), controllaTetti, appendiDiario };
  return { memoria, controllaTetti, appendiDiario, cerca };
}

function crea(sovrascrivi: Partial<DipendenzeAgentRuntime> = {}, config: ConfigRuntime = { cervello: { modalita: 'chiave_api', livello: 'equilibrato', tetto_mensile_eur: 25 } }) {
  const runtime = creaRuntimeBinario(percorsi);
  return creaAgentRuntime({ percorsi, auth: authChiave, broker: brokerFinto().broker, runtime, logger, config, descriviRichiesta: descriviRichiesta, ...sovrascrivi });
}

// --- test ------------------------------------------------------------------------------------------------------

describe('flusso di uno scambio', () => {
  it('traduce i messaggi in eventi, chiude con fine, salva sessione e costi', async () => {
    const catture: Options[] = [];
    const agente = crea({ query: queryFinta(semplice, catture) });
    const eventi = await raccogli(agente.invia({ testo: 'Ciao', canale: 'desktop' }));
    expect(eventi).toEqual([
      { tipo: 'testo', testo: 'Ciao', parziale: true },
      { tipo: 'testo', testo: ' Marco', parziale: true },
      { tipo: 'testo', testo: 'Ciao Marco', parziale: false },
      { tipo: 'strumento', nome: 'Read', descrizione: 'Leggo memoria/agenda.md' },
      { tipo: 'fine', sessioneId: S, durataMs: 1500, costoUsd: 0.012, turni: 2 },
    ]);
    expect(agente.sessioneCorrente()).toBe(S);
    const sessione = JSON.parse(fs.readFileSync(path.join(percorsi.datiApp, 'sessione.json'), 'utf8'));
    expect(sessione.id).toBe(S);
    const mese = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const usage = JSON.parse(fs.readFileSync(path.join(percorsi.datiApp, 'usage', `${mese}.json`), 'utf8'));
    expect(usage.totaleUsd).toBeCloseTo(0.012, 6);
    expect(usage.voci).toHaveLength(1);
    expect(usage.voci[0]).toMatchObject({ sessione: S, tipo: 'principale', canale: 'desktop', usd: 0.012 });
    expect(catture[0]?.resume).toBeUndefined();
  });

  it('riprende la sessione principale per id e conta solo la spesa aggiunta', async () => {
    const catture: Options[] = [];
    const agente = crea({ query: queryFinta(async function* () { yield init(); yield risultato(catture.length === 1 ? 0.01 : 0.025); }, catture) });
    await raccogli(agente.invia({ testo: 'uno', canale: 'desktop' }));
    await raccogli(agente.invia({ testo: 'due', canale: 'telegram' }));
    expect(catture[1]?.resume).toBe(S);
    const stato = await agente.statoCosti();
    expect(stato.meseUsd).toBeCloseTo(0.025, 6);
    expect(stato.tettoEur).toBe(25);
    expect(stato.sopraTetto).toBe(false);
  });

  it('nuovaSessione apre un contesto fresco', async () => {
    const catture: Options[] = [];
    const agente = crea({ query: queryFinta(semplice, catture) });
    await raccogli(agente.invia({ testo: 'uno', canale: 'desktop' }));
    await agente.nuovaSessione();
    expect(agente.sessioneCorrente()).toBeUndefined();
    await raccogli(agente.invia({ testo: 'due', canale: 'desktop' }));
    expect(catture[1]?.resume).toBeUndefined();
  });

  it('serializza gli scambi sulla sessione principale', async () => {
    const ordine: string[] = [];
    const agente = crea({
      query: queryFinta(async function* (_o, prompt) {
        ordine.push(`inizio ${prompt}`);
        await new Promise((r) => setTimeout(r, 20));
        ordine.push(`fine ${prompt}`);
        yield init();
        yield risultato();
      }),
    });
    await Promise.all([raccogli(agente.invia({ testo: 'A', canale: 'desktop' })), raccogli(agente.invia({ testo: 'B', canale: 'desktop' }))]);
    expect(ordine).toEqual(['inizio A', 'fine A', 'inizio B', 'fine B']);
  });

  it('[Fermati]: l\'annullamento ferma la query dell\'SDK (abort), niente errore all\'utente, la sessione resta; già fermato in coda = non parte', async () => {
    const catture: Options[] = [];
    const controllo = new AbortController();
    const agente = crea({
      query: queryFinta(async function* (opzioni) {
        yield init('sess-ferma');
        yield delta('Lavoro...');
        controllo.abort();
        // L'SDK, ricevuto l'abort, interrompe il flusso con un'eccezione.
        if (opzioni.abortController?.signal.aborted) throw new Error('Operation aborted');
        yield risultato();
      }, catture),
    });
    const eventi = await raccogli(agente.invia({ testo: 'vai', canale: 'desktop' }, { annullamento: controllo.signal }));
    expect(catture[0]?.abortController?.signal.aborted).toBe(true);
    expect(eventi.map((e) => e.tipo)).toEqual(['testo']);
    expect(agente.sessioneCorrente()).toBe('sess-ferma');

    const giaFermato = new AbortController();
    giaFermato.abort();
    expect(await raccogli(agente.invia({ testo: 'in coda', canale: 'desktop' }, { annullamento: giaFermato.signal }))).toEqual([]);
    expect(catture).toHaveLength(1);
  });

  it('il testo dei ruoli non arriva all\'utente; lo strumento porta il nome del ruolo', async () => {
    const agente = crea({
      query: queryFinta(async function* (options) {
        yield init();
        const avvio = options.hooks?.SubagentStart?.[0]?.hooks[0] as HookCallback;
        await avvio({ hook_event_name: 'SubagentStart', agent_id: 'ag-1', agent_type: 'copywriter', session_id: S, transcript_path: '', cwd: '/' }, undefined, { signal: new AbortController().signal });
        yield assistente([{ type: 'text', text: 'bozza interna' }, { type: 'tool_use', id: 't', name: 'Write', input: { file_path: `${cartellaLavoro()}/lavoro/messaggi/x.md`, content: '' } }], { parent_tool_use_id: 'tool-agent', agent_id: 'ag-1' });
        yield risultato();
      }),
    });
    const eventi = await raccogli(agente.invia({ testo: 'scrivi', canale: 'desktop' }));
    expect(eventi.filter((e) => e.tipo === 'testo')).toEqual([]);
    expect(eventi[0]).toEqual({ tipo: 'strumento', nome: 'Write', descrizione: 'Scrivo lavoro/messaggi/x.md', ruolo: 'copywriter' });
  });
});

describe('opzioni passate all\'SDK (docs/02 §3.2)', () => {
  it('sessione principale', async () => {
    const catture: Options[] = [];
    const { memoria } = memoriaFinta();
    const agente = crea({ query: queryFinta(semplice, catture), memoria });
    await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    const o = catture[0]!;
    expect(o.cwd).toBe(percorsi.cartellaLavoro);
    expect(o.env?.CLAUDE_CONFIG_DIR).toBe(percorsi.configClaude);
    expect(o.env?.ANTHROPIC_API_KEY).toBe('sk-ant-test');
    expect(o.env?.DISABLE_UPDATES).toBe('1');
    expect(o.env?.CLAUDE_CODE_DISABLE_AUTO_MEMORY).toBe('1');
    expect(o.env?.PATH).toBe(process.env.PATH);
    expect(o.settingSources).toEqual(['project']);
    expect(o.permissionMode).toBe('default');
    expect(o.allowedTools).toEqual(['Read(./**)', 'Write(./**)', 'Edit(./**)', 'WebSearch', 'WebFetch', 'Agent', 'mcp__spalla__memoria_cerca']);
    // Nessun nome nudo che legga file: Glob e Grep passano da canUseTool (vedi "Glob e Grep fuori cartella").
    expect(o.allowedTools).not.toContain('Glob');
    expect(o.allowedTools).not.toContain('Grep');
    expect(o.includePartialMessages).toBe(true);
    expect(o.model).toBe('sonnet');
    expect(o.maxBudgetUsd).toBeUndefined();
    expect(o.pathToClaudeCodeExecutable).toBeUndefined();
    expect(typeof o.canUseTool).toBe('function');
    expect(o.mcpServers?.spalla).toMatchObject({ type: 'sdk', name: 'spalla' });
    expect(o.hooks?.PostToolUse?.[0]?.matcher).toBe('Write|Edit|NotebookEdit|MultiEdit');
    expect(o.hooks?.PreToolUse?.[0]?.matcher).toBe('Write|Edit|NotebookEdit|MultiEdit');
    expect(o.hooks?.Stop).toHaveLength(1);
    expect(o.hooks?.SubagentStart).toHaveLength(1);
    // Le impostazioni che il binario usa anche in una sessione SDK e le credenziali non si toccano, con ogni modalità (docs/02 §10.2).
    expect(o.disallowedTools).toEqual([
      'Edit(./.claude/settings.json)', 'Edit(./.claude/settings.local.json)', 'Edit(./.mcp.json)', 'Edit(./.claude/skills/**)', 'Edit(./.claude/hooks/**)',
      `Read(${percorsoAssolutoPerRegola(percorsi.configClaude)}/**)`, `Read(${percorsoAssolutoPerRegola(percorsi.segreti)})`,
    ]);
    expect(o.disallowedTools).not.toContain('Bash');
    expect(o.disallowedTools?.at(-2)).toMatch(/^Read\(\/\/[^/]/); // due barre: assoluto dal disco, non dalla cartella delle impostazioni
  });

  it('sessione principale durante le presentazioni: niente shell (né Bash né PowerShell); dopo, la shell torna', async () => {
    const catture: Options[] = [];
    const agente = crea({ query: queryFinta(semplice, catture) });
    const rituale = path.join(cartellaLavoro(), 'onboarding', 'PRIMO-AVVIO.md');
    fs.mkdirSync(path.dirname(rituale), { recursive: true });

    fs.writeFileSync(rituale, '# PRIMO AVVIO — rituale, non questionario\n');
    await raccogli(agente.invia({ testo: 'ciao', canale: 'desktop' }));
    expect(catture[0]?.disallowedTools?.slice(0, 2)).toEqual(['Bash', 'PowerShell']);
    expect(catture[0]?.disallowedTools).toContain('Edit(./.claude/settings.json)');

    fs.writeFileSync(rituale, '# Presentazioni completate il 2026-10-22\n');
    await raccogli(agente.invia({ testo: 'ciao', canale: 'desktop' }));
    expect(catture[1]?.disallowedTools).not.toContain('Bash');
    expect(catture[1]?.disallowedTools).not.toContain('PowerShell');

    fs.rmSync(rituale);
    await raccogli(agente.invia({ testo: 'ciao', canale: 'desktop' }));
    expect(catture[2]?.disallowedTools).not.toContain('Bash');
  });

  it('sessione programmata: haiku, senza shell, con tetto e turni; con ruolo usa l\'agente', async () => {
    const catture: Options[] = [];
    const agente = crea({ query: queryFinta(semplice, catture) });
    await raccogli(agente.invia({ testo: 'brief', canale: 'sistema' }, { sessione: 'programmata' }));
    await raccogli(agente.invia({ testo: 'riordina', canale: 'sistema' }, { sessione: 'programmata', ruolo: 'archivista', tettoUsd: 0.05 }));
    expect(catture[0]).toMatchObject({ model: 'haiku', maxTurns: 8, maxBudgetUsd: 0.1 });
    expect(catture[0]?.disallowedTools?.[0]).toBe('Bash');
    expect(catture[0]?.disallowedTools).toContain('Edit(./.claude/settings.json)');
    expect(catture[1]?.disallowedTools).toContain('Edit(./.claude/skills/**)');
    expect(catture[0]?.resume).toBeUndefined();
    expect(catture[1]).toMatchObject({ agent: 'archivista', maxBudgetUsd: 0.05 });
    expect(catture[1]?.model).toBeUndefined();
    // La sessione principale non è stata toccata.
    expect(agente.sessioneCorrente()).toBeUndefined();
  });

  it('con l\'abbonamento: nessuna chiave (nemmeno una ereditata dall\'ambiente), sonnet, nessun tetto predefinito', async () => {
    const catture: Options[] = [];
    const prima = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-trovata-per-caso-nell-ambiente';
    try {
      const agente = crea({ query: queryFinta(semplice, catture), auth: authAbbonamento }, { cervello: { modalita: 'abbonamento', livello: 'massima' } });
      await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
      await raccogli(agente.invia({ testo: 'x', canale: 'sistema' }, { sessione: 'sfondo' }));
    } finally {
      if (prima === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prima;
    }
    expect(catture[0]?.env?.ANTHROPIC_API_KEY).toBeUndefined();
    expect(catture[0]?.env?.CLAUDE_CONFIG_DIR).toBe(percorsi.configClaude);
    expect(catture[0]?.model).toBe('sonnet');
    expect(catture[1]?.maxBudgetUsd).toBeUndefined();
    expect(catture[1]?.maxTurns).toBe(20);
  });

  it('maxTurni esplicito vince sui predefiniti, in ogni tipo di sessione; l\'id della sessione esterna non passa', async () => {
    const catture: Options[] = [];
    const prima = process.env.CLAUDE_CODE_SESSION_ID;
    process.env.CLAUDE_CODE_SESSION_ID = 'sessione-di-claude-code-esterna';
    try {
      const agente = crea({ query: queryFinta(semplice, catture) });
      await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }, { maxTurni: 12 }));
      await raccogli(agente.invia({ testo: 'x', canale: 'sistema' }, { sessione: 'programmata', maxTurni: 3 }));
      await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    } finally {
      if (prima === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
      else process.env.CLAUDE_CODE_SESSION_ID = prima;
    }
    expect(catture.map((o) => o.maxTurns)).toEqual([12, 3, undefined]);
    expect(Object.keys(catture[0]?.env ?? {})).not.toContain('CLAUDE_CODE_SESSION_ID');
    expect(catture[0]?.env?.PATH).toBe(process.env.PATH);
  });

  it('livello economico/massima con chiave API', async () => {
    const catture: Options[] = [];
    await raccogli(crea({ query: queryFinta(semplice, catture) }, { cervello: { modalita: 'chiave_api', livello: 'massima' } }).invia({ testo: 'x', canale: 'desktop' }));
    await raccogli(crea({ query: queryFinta(semplice, catture) }, { cervello: { modalita: 'chiave_api', livello: 'economico' } }).invia({ testo: 'x', canale: 'desktop' }));
    expect(catture.map((c) => c.model)).toEqual(['opus', 'haiku']);
  });
});

describe('permessi e domande', () => {
  function conCanUseTool(usa: (c: CanUseTool) => Promise<unknown>) {
    return queryFinta(async function* (options) {
      yield init();
      await usa(options.canUseTool as CanUseTool);
      yield risultato();
    });
  }
  const ctxTool = { signal: new AbortController().signal, toolUseID: 'tu1', requestId: 'r1' };

  it('canUseTool → Broker: consenti con input aggiornato, evento permesso descritto in italiano', async () => {
    const { broker, chiedi } = brokerFinto('consenti');
    let esito: unknown;
    const agente = crea({ broker, query: conCanUseTool(async (c) => { esito = await c('Write', { file_path: '/tmp/fuori.md', content: 'x' }, ctxTool); }) });
    const eventi = await raccogli(agente.invia({ testo: 'x', canale: 'telegram' }));
    expect(esito).toEqual({ behavior: 'allow', updatedInput: { file_path: '/tmp/fuori.md', content: 'x' } });
    const richiesta = chiedi.mock.calls[0]?.[0] as RichiestaPermesso;
    expect(richiesta.canaleOrigine).toBe('telegram');
    expect(richiesta.descrizione).toBe("L'assistente vuole scrivere in /tmp/fuori.md");
    expect(richiesta.id).toMatch(/^[0-9a-f]{7}$/);
    expect(eventi[0]).toEqual({ tipo: 'permesso', richiesta });
  });

  it('Glob e Grep: dentro la cartella di lavoro senza scheda; fuori (o "~", o un modello che esce) → Broker', async () => {
    const { broker, chiedi } = brokerFinto('nega');
    const esiti: Record<string, unknown> = {};
    const agente = crea({
      broker,
      query: conCanUseTool(async (c) => {
        esiti.grepQui = await c('Grep', { pattern: 'fattura' }, ctxTool);
        esiti.grepSotto = await c('Grep', { pattern: 'x', path: 'memoria/temi' }, ctxTool);
        esiti.globQui = await c('Glob', { pattern: '**/*.md' }, ctxTool);
        esiti.grepHome = await c('Grep', { pattern: 'password', path: '~' }, ctxTool);
        esiti.grepFuori = await c('Grep', { pattern: 'x', path: '/Users/marco/Documenti' }, ctxTool);
        esiti.globSu = await c('Glob', { pattern: '../../**/*.pdf' }, ctxTool);
        esiti.globAssoluto = await c('Glob', { pattern: '/etc/**' }, ctxTool);
      }),
    });
    await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    for (const k of ['grepQui', 'grepSotto', 'globQui']) expect(esiti[k]).toMatchObject({ behavior: 'allow' });
    for (const k of ['grepHome', 'grepFuori', 'globSu', 'globAssoluto']) expect(esiti[k]).toMatchObject({ behavior: 'deny' });
    const richieste = chiedi.mock.calls.map((c) => c[0] as RichiestaPermesso);
    expect(richieste.map((r) => r.strumento)).toEqual(['Grep', 'Grep', 'Glob', 'Glob']);
    expect(richieste[0]?.descrizione).toContain('cercare tra i file');
  });

  it('nega → deny con il motivo', async () => {
    const { broker } = brokerFinto('nega');
    let esito: unknown;
    const agente = crea({ broker, query: conCanUseTool(async (c) => { esito = await c('Bash', { command: 'rm x' }, ctxTool); }) });
    await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    expect(esito).toEqual({ behavior: 'deny', message: 'No, grazie.' });
  });

  it('se la sessione si interrompe mentre si aspetta la conferma, nega e il segnale viaggia nella richiesta', async () => {
    const controller = new AbortController();
    let vista: RichiestaPermesso | undefined;
    // Il canale non risponde mai: senza annullamento la richiesta resterebbe appesa fino al timeout del Broker.
    const chiedi = vi.fn((r: RichiestaPermesso) => { vista = r; return new Promise<DecisionePermesso>(() => undefined); });
    const broker: Broker = { chiedi, registraCanale: vi.fn(), segnaAttivita: vi.fn() };
    let esito: unknown;
    const agente = crea({ broker, query: conCanUseTool(async (c) => {
      const promessa = c('Write', { file_path: '/tmp/fuori.md', content: 'x' }, { ...ctxTool, signal: controller.signal });
      await new Promise((r) => setTimeout(r, 10));
      controller.abort();
      esito = await promessa;
    }) });
    await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    expect(vista?.annullamento).toBe(controller.signal);
    expect(esito).toEqual({ behavior: 'deny', message: expect.stringMatching(/non serve più/) });
  });

  it('riconosce il ruolo che agisce dall\'agentID (hook SubagentStart)', async () => {
    const { broker, chiedi } = brokerFinto();
    const agente = crea({
      broker,
      query: queryFinta(async function* (options) {
        yield init();
        const avvio = options.hooks?.SubagentStart?.[0]?.hooks[0] as HookCallback;
        await avvio({ hook_event_name: 'SubagentStart', agent_id: 'ag-7', agent_type: 'contabile', session_id: S, transcript_path: '', cwd: '/' }, undefined, { signal: new AbortController().signal });
        await (options.canUseTool as CanUseTool)('Write', { file_path: '/tmp/Fatture/nota.md', content: '' }, { ...ctxTool, agentID: 'ag-7' });
        yield risultato();
      }),
    });
    await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    const richiesta = chiedi.mock.calls[0]?.[0] as RichiestaPermesso;
    expect(richiesta.ruolo).toBe('contabile');
    expect(richiesta.descrizione).toBe('Il Contabile vuole scrivere in /tmp/Fatture/nota.md');
  });

  const domande = {
    questions: [
      { question: 'Come ti chiamo?', header: 'Nome', options: [{ label: 'Marco', description: 'per nome' }, { label: 'Sig. Benassi', description: 'formale' }], multiSelect: false },
      { question: 'Quali canali?', header: 'Canali', options: [{ label: 'Telegram' }, { label: 'Voce' }], multiSelect: true },
    ],
  };

  it('AskUserQuestion → chip → risposte nel formato dell\'SDK', async () => {
    const viste: DomandaUtente[] = [];
    const rispondiDomanda = vi.fn(async (d: DomandaUtente) => { viste.push(d); return { id: d.id, risposte: d.multiSelezione ? ['Telegram', 'Voce'] : ['chiamami Marco'] }; });
    let esito: unknown;
    const agente = crea({ query: conCanUseTool(async (c) => { esito = await c('AskUserQuestion', domande, ctxTool); }) });
    const eventi = await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }, { rispondiDomanda }));
    expect(viste[0]).toMatchObject({ testo: 'Come ti chiamo?', intestazione: 'Nome', multiSelezione: false, opzioni: [{ etichetta: 'Marco', descrizione: 'per nome' }, { etichetta: 'Sig. Benassi', descrizione: 'formale' }] });
    expect(viste[1]).toMatchObject({ testo: 'Quali canali?', multiSelezione: true, opzioni: [{ etichetta: 'Telegram' }, { etichetta: 'Voce' }] });
    expect(esito).toEqual({ behavior: 'allow', updatedInput: { questions: domande.questions, answers: { 'Come ti chiamo?': 'chiamami Marco', 'Quali canali?': 'Telegram, Voce' } } });
    expect(eventi.filter((e) => e.tipo === 'domanda')).toHaveLength(2);
  });

  it('«fino a tre» nel testo di una scelta multipla diventa maxSelezioni', () => {
    expect(massimoDalTesto('Quali ti rubano più tempo? Scegline fino a tre, o dimmelo con parole tue.')).toBe(3);
    expect(massimoDalTesto('Al massimo 2, grazie')).toBe(2);
    expect(massimoDalTesto('Che strumenti usi?')).toBeUndefined();
    expect(domandaUtenteDa({ question: 'Scegline fino a tre', multiSelect: true, options: [{ label: 'a' }, { label: 'b' }] }, 'x').maxSelezioni).toBe(3);
    expect(domandaUtenteDa({ question: 'Scegline fino a tre', multiSelect: false, options: [{ label: 'a' }, { label: 'b' }] }, 'x')).not.toHaveProperty('maxSelezioni');
  });

  it('senza interfaccia per le domande risponde "scegli tu"', async () => {
    let esito: unknown;
    const agente = crea({ query: conCanUseTool(async (c) => { esito = await c('AskUserQuestion', domande, ctxTool); }) });
    await raccogli(agente.invia({ testo: 'x', canale: 'sistema' }, { sessione: 'programmata' }));
    expect((esito as { updatedInput: { answers: Record<string, string> } }).updatedInput.answers['Come ti chiamo?']).toMatch(/Scegli tu/);
  });
});

describe('hook', () => {
  const ctxHook = { signal: new AbortController().signal };
  function conHooks(usa: (h: NonNullable<Options['hooks']>) => Promise<unknown>) {
    return queryFinta(async function* (options) {
      yield init();
      await usa(options.hooks as NonNullable<Options['hooks']>);
      yield risultato();
    });
  }

  it('PostToolUse: scrittura sotto profilo/ oltre il tetto → blocco con messaggio in italiano', async () => {
    const { memoria, controllaTetti } = memoriaFinta('UTENTE.md supera 4.000 caratteri: unisci le direttive simili.');
    const file = path.join(percorsi.cartellaLavoro, 'profilo', 'UTENTE.md');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'contenuto scritto');
    // Su Linux "Profilo/UTENTE.md" è un altro file: lo si crea per provare il confronto senza maiuscole (macOS/Windows).
    const fileMaiuscolo = path.join(percorsi.cartellaLavoro, 'Profilo', 'UTENTE.md');
    fs.mkdirSync(path.dirname(fileMaiuscolo), { recursive: true });
    fs.writeFileSync(fileMaiuscolo, 'contenuto maiuscolo');
    const esiti: unknown[] = [];
    const agente = crea({ memoria, query: conHooks(async (h) => {
      const hook = h.PostToolUse?.[0]?.hooks[0] as HookCallback;
      const chiama = (file_path: string) => hook({ hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path, content: 'x' }, tool_response: {}, tool_use_id: 't', session_id: S, transcript_path: '', cwd: percorsi.cartellaLavoro }, 't', ctxHook);
      esiti.push(await chiama(file));
      esiti.push(await chiama(path.join(percorsi.cartellaLavoro, 'lavoro', 'x.md')));
      // percorso relativo: si risolve rispetto alla cartella di lavoro, non al cwd del processo di prova
      esiti.push(await chiama('profilo/UTENTE.md'));
      esiti.push(await chiama('Profilo/UTENTE.md'));
      // fuori dalla cartella di lavoro: non è compito dei tetti
      esiti.push(await chiama('../fuori/profilo/UTENTE.md'));
    }) });
    await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    expect(controllaTetti).toHaveBeenCalledTimes(3);
    expect(controllaTetti).toHaveBeenNthCalledWith(1, 'profilo/UTENTE.md', 'contenuto scritto');
    expect(controllaTetti).toHaveBeenNthCalledWith(2, 'profilo/UTENTE.md', 'contenuto scritto');
    expect(controllaTetti).toHaveBeenNthCalledWith(3, 'Profilo/UTENTE.md', 'contenuto maiuscolo');
    const blocco = { decision: 'block', reason: 'UTENTE.md supera 4.000 caratteri: unisci le direttive simili.' };
    expect(esiti).toEqual([blocco, {}, blocco, blocco, {}]);
  });

  it('PreToolUse: le scritture sui file protetti vengono negate, anche con percorso relativo o maiuscole diverse', async () => {
    const esiti: unknown[] = [];
    const agente = crea({ query: conHooks(async (h) => {
      const hook = h.PreToolUse?.[0]?.hooks[0] as HookCallback;
      const chiama = (tool_name: string, tool_input: Record<string, unknown>) =>
        hook({ hook_event_name: 'PreToolUse', tool_name, tool_input, tool_use_id: 't', session_id: S, transcript_path: '', cwd: percorsi.cartellaLavoro }, 't', ctxHook);
      esiti.push(await chiama('Write', { file_path: path.join(percorsi.cartellaLavoro, '.claude', 'settings.json'), content: '{"apiKeyHelper":"x"}' }));
      esiti.push(await chiama('Edit', { file_path: '.mcp.json', old_string: '', new_string: '' }));
      esiti.push(await chiama('Write', { file_path: '.Claude/Skills/promemoria/SKILL.md', content: '' }));
      esiti.push(await chiama('NotebookEdit', { notebook_path: path.join(percorsi.cartellaLavoro, '.claude', 'hooks', 'x.ipynb') }));
      esiti.push(await chiama('Write', { file_path: path.join(percorsi.cartellaLavoro, '.claude', 'settings.local.json'), content: '' }));
      // permessi: il profilo, i ruoli (l'onboarding li scrive) e un file fuori dalla cartella (ci pensano le regole allow e il Broker)
      esiti.push(await chiama('Write', { file_path: path.join(percorsi.cartellaLavoro, 'profilo', 'UTENTE.md'), content: '' }));
      esiti.push(await chiama('Write', { file_path: '.claude/agents/copywriter.md', content: '' }));
      esiti.push(await chiama('Write', { file_path: path.join(os.tmpdir(), 'altrove', '.claude', 'settings.json'), content: '' }));
    }) });
    await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    const negato = (file: string) => ({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: expect.stringContaining(file) },
    });
    expect(esiti).toEqual([
      negato('.claude/settings.json'),
      negato('.mcp.json'),
      negato('.Claude/Skills/promemoria/SKILL.md'),
      negato('.claude/hooks/x.ipynb'),
      negato('.claude/settings.local.json'),
      {},
      {},
      {},
    ]);
    expect(logger.avviso).toHaveBeenCalledWith('sicurezza.scrittura_negata', { file: '.claude/settings.json', strumento: 'Write' });
  });

  it('Stop: appende la riga meccanica al diario con canale e prima riga', async () => {
    const { memoria, appendiDiario } = memoriaFinta();
    const agente = crea({ memoria, query: conHooks(async (h) => {
      const hook = h.Stop?.[0]?.hooks[0] as HookCallback;
      await hook({ hook_event_name: 'Stop', stop_hook_active: false, session_id: S, transcript_path: '', cwd: '/' }, undefined, ctxHook);
    }) });
    await raccogli(agente.invia({ testo: '  \nricordami di chiamare la Lamberti\nseconda riga', canale: 'telegram' }));
    expect(appendiDiario).toHaveBeenCalledWith('telegram', 'ricordami di chiamare la Lamberti');
  });

  it('Stop: niente riga per i lavori di sistema; la riga passata da chi invia vince sul titolo del messaggio', async () => {
    const { memoria, appendiDiario } = memoriaFinta();
    const agente = crea({ memoria, query: conHooks(async (h) => {
      const hook = h.Stop?.[0]?.hooks[0] as HookCallback;
      await hook({ hook_event_name: 'Stop', stop_hook_active: false, session_id: S, transcript_path: '', cwd: '/' }, undefined, ctxHook);
    }) });
    await raccogli(agente.invia({ testo: 'Riordino notturno della memoria — 2026-10-24', canale: 'sistema' }, { sessione: 'programmata' }));
    expect(appendiDiario).not.toHaveBeenCalled();
    await raccogli(agente.invia({ testo: '# PRIMO AVVIO — rituale, non questionario\n_Ti sei appena acceso._', canale: 'desktop' }, { rigaDiario: 'Presentazioni iniziate' }));
    expect(appendiDiario).toHaveBeenCalledTimes(1);
    expect(appendiDiario).toHaveBeenCalledWith('desktop', 'Presentazioni iniziate');
  });

  it('senza memoria non registra gli hook dei tetti e del diario, ma la protezione dei file resta', async () => {
    const catture: Options[] = [];
    await raccogli(crea({ query: queryFinta(semplice, catture) }).invia({ testo: 'x', canale: 'desktop' }));
    expect(catture[0]?.hooks?.PostToolUse).toBeUndefined();
    expect(catture[0]?.hooks?.Stop).toBeUndefined();
    expect(catture[0]?.hooks?.PreToolUse).toHaveLength(1);
    expect(catture[0]?.mcpServers).toEqual({});
  });
});

describe('errori → codice e messaggio in italiano', () => {
  it('tetto di spesa della chiamata', async () => {
    const eventi = await raccogli(crea({ query: queryFinta(async function* () { yield init(); yield risultatoErrore('error_max_budget_usd'); }) }).invia({ testo: 'x', canale: 'sistema' }, { sessione: 'programmata' }));
    expect(eventi.at(-1)).toMatchObject({ tipo: 'errore', codice: 'budget' });
  });

  it('limite di utilizzo con ora di ripresa', async () => {
    const reset = Math.floor(Date.now() / 1000) + 3600;
    const eventi = await raccogli(crea({ query: queryFinta(async function* () {
      yield init();
      yield { type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: reset }, uuid: 'u', session_id: S } as unknown as SDKMessage;
      yield risultatoErrore('error_during_execution', ['rate limited']);
    }) }).invia({ testo: 'x', canale: 'desktop' }));
    const errore = eventi.at(-1);
    expect(errore).toMatchObject({ tipo: 'errore', codice: 'limite_raggiunto', riprovaAlle: new Date(reset * 1000).toISOString() });
    expect((errore as { messaggio: string }).messaggio).toMatch(/in pausa fino alle \d\d:\d\d/);
  });

  it('credenziali (dal campo error del messaggio assistant)', async () => {
    const eventi = await raccogli(crea({ query: queryFinta(async function* () {
      yield init();
      yield assistente([{ type: 'text', text: 'Not logged in' }], { error: 'authentication_failed' });
      yield risultatoErrore('error_during_execution', []);
    }) }).invia({ testo: 'x', canale: 'desktop' }));
    expect(eventi.at(-1)).toMatchObject({ tipo: 'errore', codice: 'credenziali' });
  });

  it('rete (eccezione dell\'SDK prima di ogni result)', async () => {
    const eventi = await raccogli(crea({ query: queryFinta(async function* () { yield init(); throw new Error('fetch failed: getaddrinfo ENOTFOUND api.anthropic.com'); }) }).invia({ testo: 'x', canale: 'desktop' }));
    expect(eventi.at(-1)).toMatchObject({ tipo: 'errore', codice: 'rete' });
  });

  it('turni esauriti → altro; l\'eccezione dopo un result di errore non raddoppia', async () => {
    const eventi = await raccogli(crea({ query: queryFinta(async function* () { yield init(); yield risultatoErrore('error_max_turns'); throw new Error('Reached maximum number of turns'); }) }).invia({ testo: 'x', canale: 'desktop' }));
    expect(eventi).toHaveLength(1);
    expect(eventi[0]).toMatchObject({ tipo: 'errore', codice: 'altro', messaggio: expect.stringMatching(/passi previsti/) });
  });

  it('tetto mensile raggiunto (chiave API): i lavori di sfondo si fermano senza chiamare il binario, la conversazione continua con un avviso una volta sola', async () => {
    fs.mkdirSync(path.join(percorsi.datiApp, 'usage'), { recursive: true });
    const mese = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    fs.writeFileSync(path.join(percorsi.datiApp, 'usage', `${mese}.json`), JSON.stringify({ mese, totaleUsd: 30, voci: [], totaliPerSessione: {} }));
    const query = vi.fn(queryFinta(semplice));
    const agente = crea({ query }, { cervello: { modalita: 'chiave_api', tetto_mensile_eur: 25 } });

    const programmata = await raccogli(agente.invia({ testo: 'brief', canale: 'sistema' }, { sessione: 'programmata' }));
    const sfondo = await raccogli(agente.invia({ testo: 'lavoro lungo', canale: 'desktop' }, { sessione: 'sfondo' }));
    expect(programmata).toEqual([{ tipo: 'errore', codice: 'budget', messaggio: expect.stringMatching(/tetto di spesa del mese .*25 €.*lavori di sfondo si fermano/) }]);
    expect(sfondo).toEqual(programmata);
    expect(query).not.toHaveBeenCalled();

    const principale = await raccogli(agente.invia({ testo: 'x', canale: 'desktop' }));
    expect(query).toHaveBeenCalledTimes(1);
    expect(principale[0]).toEqual({ tipo: 'testo', testo: expect.stringMatching(/tetto di spesa del mese .*25 €.*fermi .*continuo a risponderti/), parziale: false });
    expect(principale.at(-1)?.tipo).toBe('fine');
    const secondo = await raccogli(agente.invia({ testo: 'y', canale: 'desktop' }));
    expect(query).toHaveBeenCalledTimes(2);
    expect(secondo.some((e) => e.tipo === 'testo' && /tetto di spesa/.test(e.testo))).toBe(false);
    expect((await agente.statoCosti()).sopraTetto).toBe(true);
  });

  it('con l\'abbonamento il tetto mensile non ferma nulla (non c\'è una spesa da contare)', async () => {
    fs.mkdirSync(path.join(percorsi.datiApp, 'usage'), { recursive: true });
    const mese = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    fs.writeFileSync(path.join(percorsi.datiApp, 'usage', `${mese}.json`), JSON.stringify({ mese, totaleUsd: 30, voci: [], totaliPerSessione: {} }));
    const query = vi.fn(queryFinta(semplice));
    const agente = crea({ query, auth: authAbbonamento }, { cervello: { modalita: 'abbonamento', tetto_mensile_eur: 25 } });
    const eventi = await raccogli(agente.invia({ testo: 'brief', canale: 'sistema' }, { sessione: 'programmata' }));
    expect(query).toHaveBeenCalledTimes(1);
    expect(eventi.at(-1)?.tipo).toBe('fine');
  });
});

describe('pezzi singoli', () => {
  it('componiPrompt etichetta il canale e gli allegati', () => {
    expect(componiPrompt({ testo: 'ciao', canale: 'desktop' })).toBe('ciao');
    expect(componiPrompt({ testo: 'guarda', canale: 'telegram', allegati: ['/x/foto.jpg'] })).toBe('[canale: telegram]\nguarda\n\nAllegati:\n- /x/foto.jpg');
  });

  it('descriviStrumento: mai nomi tecnici verso l\'utente, anche per gli strumenti non previsti', () => {
    const cwd = percorsi.cartellaLavoro;
    expect(descriviStrumento('Skill', { skill: 'preventivo' }, cwd)).toBe('Seguo una procedura');
    expect(descriviStrumento('TodoWrite', { todos: [] }, cwd)).toBe('Aggiorno la lista delle cose da fare');
    expect(descriviStrumento('TaskCreate', {}, cwd)).toBe('Aggiorno la lista delle cose da fare');
    expect(descriviStrumento('EndConversation', {}, cwd)).toBe("Chiudo l'argomento");
    expect(descriviStrumento('NotebookEdit', { notebook_path: `${cwd}/lavoro/a.ipynb` }, cwd)).toBe('Modifico lavoro/a.ipynb');
    const sconosciuto = descriviStrumento('ListMcpResourcesTool', {}, cwd);
    expect(sconosciuto).toBe('Uso uno strumento');
    expect(sconosciuto).not.toMatch(/Mcp|Tool/);
  });

  it('memoria_cerca: lo strumento chiama memoria.cerca e formatta i risultati', async () => {
    const { memoria, cerca } = memoriaFinta();
    const strumento = creaStrumentoMemoriaCerca(memoria);
    expect(strumento.name).toBe('memoria_cerca');
    const esito = await strumento.handler({ query: 'Lamberti', k: 3 }, {});
    expect(cerca).toHaveBeenCalledWith('Lamberti', 3);
    const testo = (esito.content[0] as { type: 'text'; text: string }).text;
    expect(testo).toContain('memoria/temi/lamberti.md — Sig.ra Lamberti (modificato 2026-10-20)');
    expect(testo).toContain('Trilocale via Saragozza');
    cerca.mockResolvedValueOnce([]);
    const vuoto = await strumento.handler({ query: 'niente', k: undefined }, {});
    expect((vuoto.content[0] as { text: string }).text).toMatch(/Nessun ricordo/);
    expect(cerca).toHaveBeenLastCalledWith('niente', 6);
  });
});
