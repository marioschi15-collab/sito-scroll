import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import { ambientePerBinario, creaRuntimeBinario, cartelleDaCreare, variabileAmmessa } from '../src/nucleo/runtime/index.js';
import { provaCollegamento } from '../src/nucleo/auth/index.js';
import type { Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';

let radice: string;
beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-runtime-'));
  process.env.SPALLA_HOME = radice;
});
afterEach(() => {
  delete process.env.SPALLA_HOME;
  fs.rmSync(radice, { recursive: true, force: true });
});

describe('creaRuntimeBinario', () => {
  it('crea tutte le cartelle e imposta CLAUDE_CONFIG_DIR isolato', () => {
    const percorsi = calcolaPercorsi();
    const runtime = creaRuntimeBinario(percorsi);
    for (const c of cartelleDaCreare(percorsi)) expect(fs.existsSync(c)).toBe(true);
    const env = runtime.ambiente();
    expect(env.CLAUDE_CONFIG_DIR).toBe(percorsi.configClaude);
    expect(env.DISABLE_AUTOUPDATER).toBe('1');
    expect(env.DISABLE_UPDATES).toBe('1');
    expect(env.CLAUDE_CODE_DISABLE_AUTO_MEMORY).toBe('1');
    expect(env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH).toBe('1');
    expect(env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS).toBe('3');
    expect(Object.keys(env).sort()).toEqual([
      'CLAUDE_CODE_DISABLE_AUTO_MEMORY',
      'CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS',
      'CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH',
      'CLAUDE_CONFIG_DIR',
      'DISABLE_AUTOUPDATER',
      'DISABLE_UPDATES',
    ]);
    expect(runtime.percorsoEseguibile).toBeUndefined();
    expect(runtime.configEreditata).toBe(false);
  });

  it('con usaConfigEreditata non tocca CLAUDE_CONFIG_DIR', () => {
    const runtime = creaRuntimeBinario(calcolaPercorsi(), { usaConfigEreditata: true });
    expect('CLAUDE_CONFIG_DIR' in runtime.ambiente()).toBe(false);
    expect(runtime.configEreditata).toBe(true);
  });

  it('accetta un percorso esplicito del binario (strada C)', () => {
    const runtime = creaRuntimeBinario(calcolaPercorsi(), { percorsoEseguibile: '/opt/spalla/claude' });
    expect(runtime.percorsoEseguibile).toBe('/opt/spalla/claude');
  });
});

describe('ambientePerBinario (docs/02 §2.3.2-2.3.4)', () => {
  const SISTEMA: NodeJS.ProcessEnv = {
    PATH: '/usr/bin', Path: 'C:\\Windows', HOME: '/home/marco', LANG: 'it_IT.UTF-8', LC_ALL: 'it_IT.UTF-8', TMPDIR: '/tmp/x',
    HTTPS_PROXY: 'http://proxy.azienda:8080', NODE_EXTRA_CA_CERTS: '/etc/ca.pem', SystemRoot: 'C:\\Windows',
    CLAUDE_CODE_OAUTH_TOKEN: 'oauth', ANTHROPIC_AUTH_TOKEN: 'auth', ANTHROPIC_BASE_URL: 'https://altro.invalid',
    ANTHROPIC_CUSTOM_HEADERS: 'x: y', CLAUDE_CODE_USE_BEDROCK: '1', CLAUDE_CODE_USE_VERTEX: '1', CLAUDE_CODE_USE_FOUNDRY: '1',
    AWS_BEARER_TOKEN_BEDROCK: 'b', CLAUDE_CONFIG_DIR: '/ereditata', CLAUDECODE: '1', CLAUDE_CODE_ENTRYPOINT: 'cli',
    CLAUDE_CODE_SESSION_ID: 's', ANTHROPIC_API_KEY: 'sk-ant-per-caso', AWS_SECRET_ACCESS_KEY: 'aws', GITHUB_TOKEN: 'gh',
  };
  const VIETATE = Object.keys(SISTEMA).filter((k) => /^(CLAUDE|ANTHROPIC|AWS|GITHUB)/.test(k));

  it('configurazione isolata: solo le variabili di sistema ammesse, più le nostre e l\'accesso scelto', () => {
    const runtime = creaRuntimeBinario(calcolaPercorsi());
    const env = ambientePerBinario(runtime, { ANTHROPIC_API_KEY: 'sk-ant-scelta' }, SISTEMA);
    for (const nome of VIETATE.filter((k) => k !== 'CLAUDE_CONFIG_DIR' && k !== 'ANTHROPIC_API_KEY')) expect(env).not.toHaveProperty(nome);
    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-scelta');
    expect(env.CLAUDE_CONFIG_DIR).toBe(calcolaPercorsi().configClaude);
    expect(env).toMatchObject({ PATH: '/usr/bin', Path: 'C:\\Windows', HOME: '/home/marco', LC_ALL: 'it_IT.UTF-8', HTTPS_PROXY: 'http://proxy.azienda:8080', SystemRoot: 'C:\\Windows', DISABLE_AUTOUPDATER: '1' });
    // Senza runtime (chi chiama per sbaglio): comunque isolato.
    expect(ambientePerBinario(undefined, {}, SISTEMA)).not.toHaveProperty('CLAUDE_CODE_OAUTH_TOKEN');
    expect(variabileAmmessa('lc_messages')).toBe(true);
    expect(variabileAmmessa('ANTHROPIC_BASE_URL')).toBe(false);
  });

  it('solo sviluppo con configurazione ereditata: l\'ambiente passa intero, meno id di sessione e chiave trovata per caso', () => {
    const runtime = creaRuntimeBinario(calcolaPercorsi(), { usaConfigEreditata: true });
    const env = ambientePerBinario(runtime, {}, SISTEMA);
    expect(env.CLAUDE_CONFIG_DIR).toBe('/ereditata');
    expect(env.ANTHROPIC_BASE_URL).toBe('https://altro.invalid');
    expect(env).not.toHaveProperty('CLAUDE_CODE_SESSION_ID');
    expect(env).not.toHaveProperty('ANTHROPIC_API_KEY');
  });

  it('la prova di collegamento non vede accessi né indirizzi ereditati da process.env', async () => {
    const prima = { ...process.env };
    Object.assign(process.env, Object.fromEntries(VIETATE.map((k) => [k, String(SISTEMA[k])])));
    try {
      let opzioni: Options | undefined;
      const esito = await provaCollegamento({}, {
        runtime: creaRuntimeBinario(calcolaPercorsi()),
        query: ({ options }) => {
          opzioni = options;
          return (async function* (): AsyncGenerator<SDKMessage> {
            yield { type: 'result', subtype: 'success', is_error: false, result: 'ok', session_id: 's', uuid: 'r', duration_ms: 1, duration_api_ms: 1, num_turns: 1, stop_reason: 'end_turn', total_cost_usd: 0, usage: {}, modelUsage: {}, permission_denials: [] } as unknown as SDKMessage;
          })();
        },
      });
      expect(esito.ok).toBe(true);
      for (const nome of VIETATE.filter((k) => k !== 'CLAUDE_CONFIG_DIR')) expect(opzioni?.env).not.toHaveProperty(nome);
      expect(opzioni?.env?.CLAUDE_CONFIG_DIR).toBe(calcolaPercorsi().configClaude);
    } finally {
      for (const k of VIETATE) {
        if (prima[k] === undefined) delete process.env[k];
        else process.env[k] = prima[k];
      }
    }
  });
});
