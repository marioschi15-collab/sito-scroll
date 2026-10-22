import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import { creaRuntimeBinario, cartelleDaCreare } from '../src/nucleo/runtime/index.js';

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
