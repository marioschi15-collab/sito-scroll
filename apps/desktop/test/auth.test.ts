import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import {
  classificaErrore,
  creaAuthAbbonamento,
  creaAuthChiaveApi,
  creaStoreSegreti,
  ErroreSegreti,
  formatoChiaveValido,
  provaCollegamento,
  type FunzioneQuery,
} from '../src/nucleo/auth/index.js';

let cartella: string;
beforeEach(() => { cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-auth-')); });
afterEach(() => { fs.rmSync(cartella, { recursive: true, force: true }); });

const CHIAVE = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789';

describe('store dei segreti', () => {
  it('va e torna, e il file non contiene il valore in chiaro', async () => {
    const file = path.join(cartella, 'secrets.bin');
    const store = creaStoreSegreti(file, { identita: 'test@pc' });
    expect(await store.leggi('x')).toBeUndefined();
    await store.scrivi('chiave_api', CHIAVE);
    await store.scrivi('telegram', '123:abc');
    expect(await store.leggi('chiave_api')).toBe(CHIAVE);
    expect(await store.elenco()).toEqual(['chiave_api', 'telegram']);
    const grezzo = fs.readFileSync(file, 'utf8');
    expect(grezzo).not.toContain(CHIAVE);
    expect(grezzo).not.toContain('123:abc');
    await store.rimuovi('telegram');
    expect(await store.leggi('telegram')).toBeUndefined();
    // Riapertura con la stessa identità.
    expect(await creaStoreSegreti(file, { identita: 'test@pc' }).leggi('chiave_api')).toBe(CHIAVE);
  });

  it('un\'altra identità non decifra; un file manomesso dà un errore chiaro', async () => {
    const file = path.join(cartella, 'secrets.bin');
    await creaStoreSegreti(file, { identita: 'a@pc' }).scrivi('k', 'v');
    await expect(creaStoreSegreti(file, { identita: 'b@pc' }).leggi('k')).rejects.toBeInstanceOf(ErroreSegreti);
    fs.writeFileSync(file, 'non json');
    await expect(creaStoreSegreti(file, { identita: 'a@pc' }).leggi('k')).rejects.toBeInstanceOf(ErroreSegreti);
  });

  it('serializza le scritture concorrenti', async () => {
    const store = creaStoreSegreti(path.join(cartella, 's.bin'), { identita: 't@pc' });
    await Promise.all([store.scrivi('a', '1'), store.scrivi('b', '2'), store.scrivi('c', '3')]);
    expect(await store.elenco()).toEqual(['a', 'b', 'c']);
  });
});

function queryFinta(messaggi: SDKMessage[] | (() => never), catturato?: { options?: Options }): FunzioneQuery {
  return ({ options }) => {
    if (catturato) catturato.options = options;
    return (async function* () {
      if (typeof messaggi === 'function') messaggi();
      for (const m of messaggi as SDKMessage[]) yield m;
    })();
  };
}

const risultatoOk = {
  type: 'result', subtype: 'success', is_error: false, result: 'ok', session_id: 's1', duration_ms: 1, duration_api_ms: 1,
  num_turns: 1, stop_reason: 'end_turn', total_cost_usd: 0.001, usage: {}, modelUsage: {}, permission_denials: [], uuid: 'u1',
} as unknown as SDKMessage;

describe('prova di collegamento', () => {
  it('ok quando arriva un result success; passa le variabili e nessuno strumento; non eredita l\'id di sessione esterna', async () => {
    const catturato: { options?: Options } = {};
    const sessionePrima = process.env.CLAUDE_CODE_SESSION_ID;
    process.env.CLAUDE_CODE_SESSION_ID = 'sessione-di-claude-code-esterna';
    let esito;
    try {
      esito = await provaCollegamento({ ANTHROPIC_API_KEY: CHIAVE }, { query: queryFinta([risultatoOk], catturato) });
    } finally {
      if (sessionePrima === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
      else process.env.CLAUDE_CODE_SESSION_ID = sessionePrima;
    }
    expect(esito.ok).toBe(true);
    expect(catturato.options?.env?.ANTHROPIC_API_KEY).toBe(CHIAVE);
    expect(catturato.options?.env?.PATH).toBe(process.env.PATH);
    expect(Object.keys(catturato.options?.env ?? {})).not.toContain('CLAUDE_CODE_SESSION_ID');
    expect(catturato.options?.tools).toEqual([]);
    expect(catturato.options?.settingSources).toEqual([]);
    expect(catturato.options?.persistSession).toBe(false);
    expect(catturato.options?.maxTurns).toBe(1);
  });

  it('classifica gli errori', async () => {
    const assistenteErrore = { type: 'assistant', error: 'authentication_failed', message: { content: [] }, parent_tool_use_id: null, session_id: 's', uuid: 'u' } as unknown as SDKMessage;
    const risultatoErrore = { ...(risultatoOk as object), subtype: 'error_during_execution', is_error: true, errors: ['boom'] } as unknown as SDKMessage;
    expect(await provaCollegamento({}, { query: queryFinta([assistenteErrore, risultatoErrore]) })).toMatchObject({ ok: false, codice: 'credenziali' });
    expect(await provaCollegamento({}, { query: queryFinta(() => { throw new Error('fetch failed ECONNREFUSED'); }) })).toMatchObject({ ok: false, codice: 'rete' });
    expect(classificaErrore('429 rate limit reached')).toBe('limite');
    expect(classificaErrore('qualcosa di strano')).toBe('altro');
  });
});

describe('provider', () => {
  it('chiave API: formato, store, variabili, verifica', async () => {
    const store = creaStoreSegreti(path.join(cartella, 's.bin'), { identita: 't@pc' });
    const auth = creaAuthChiaveApi(store, { query: queryFinta([risultatoOk]) });
    expect(auth.modalita).toBe('chiave_api');
    expect(await auth.haChiave()).toBe(false);
    expect(await auth.variabiliAmbiente()).toEqual({});
    expect((await auth.verifica()).ok).toBe(false);
    await expect(auth.salvaChiave('abc')).rejects.toThrow();
    await auth.salvaChiave(`  ${CHIAVE}\n`);
    expect(await auth.haChiave()).toBe(true);
    expect(await auth.variabiliAmbiente()).toEqual({ ANTHROPIC_API_KEY: CHIAVE });
    const v = await auth.verifica();
    expect(v).toEqual({ ok: true, messaggio: 'Collegato. Spalla può pensare.' });
    await auth.rimuoviChiave();
    expect(await auth.haChiave()).toBe(false);
    expect(formatoChiaveValido('sk-ant-x')).toBe(false);
  });

  it('abbonamento: nessuna variabile, verifica tramite query; una chiave trovata nell\'ambiente non passa al binario', async () => {
    const catturato: { options?: Options } = {};
    const chiavePrima = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-trovata-per-caso-nell-ambiente';
    const auth = creaAuthAbbonamento({ query: queryFinta([risultatoOk], catturato) });
    try {
      expect(auth.modalita).toBe('abbonamento');
      expect(await auth.variabiliAmbiente()).toEqual({});
      expect((await auth.verifica()).ok).toBe(true);
    } finally {
      if (chiavePrima === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = chiavePrima;
    }
    expect(catturato.options?.env?.ANTHROPIC_API_KEY).toBeUndefined();
    const nonLoggato = { type: 'assistant', error: 'authentication_failed', message: { content: [] }, parent_tool_use_id: null, session_id: 's', uuid: 'u' } as unknown as SDKMessage;
    const r = await creaAuthAbbonamento({ query: queryFinta([nonLoggato]) }).verifica();
    expect(r.ok).toBe(false);
    expect(r.messaggio).toMatch(/Collega il tuo Claude/);
  });
});
