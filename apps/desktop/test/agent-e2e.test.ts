import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EventoAssistente, Logger } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import { creaRuntimeBinario } from '../src/nucleo/runtime/index.js';
import { creaAuthAbbonamento } from '../src/nucleo/auth/index.js';
import { creaBroker, descriviRichiesta } from '../src/nucleo/broker/index.js';
import { creaAgentRuntime } from '../src/nucleo/agent/index.js';

/**
 * Prova end-to-end con il vero SDK e il binario incluso. Richiede un login già presente sulla macchina
 * (modalità abbonamento con CLAUDE_CONFIG_DIR ereditato) oppure ANTHROPIC_API_KEY nell'ambiente.
 * Si esegue solo con RUN_E2E=1.
 */
const attiva = process.env.RUN_E2E === '1';

describe.skipIf(!attiva)('E2E: una riga attraverso il binario', () => {
  let radice: string;
  const righe: string[] = [];
  const logger: Logger = {
    info: (e, d) => righe.push(`info ${e} ${JSON.stringify(d ?? {})}`),
    avviso: (e, d) => righe.push(`avviso ${e} ${JSON.stringify(d ?? {})}`),
    errore: (e, d) => righe.push(`errore ${e} ${JSON.stringify(d ?? {})}`),
  };

  beforeAll(() => {
    radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-e2e-'));
    process.env.SPALLA_HOME = radice;
  });
  afterAll(() => {
    delete process.env.SPALLA_HOME;
    fs.rmSync(radice, { recursive: true, force: true });
  });

  it('riceve un result e chiude con fine', async () => {
    const percorsi = calcolaPercorsi();
    const runtime = creaRuntimeBinario(percorsi, { usaConfigEreditata: true });
    const broker = creaBroker({ logger, timeoutMs: 1000 });
    const agente = creaAgentRuntime({
      percorsi, runtime, broker, logger,
      auth: creaAuthAbbonamento({ runtime }),
      config: { cervello: { modalita: 'abbonamento' } },
      descriviRichiesta,
    });
    const eventi: EventoAssistente[] = [];
    for await (const e of agente.invia({ testo: 'Rispondi solo con la parola: ok', canale: 'desktop' })) eventi.push(e);
    const ultimo = eventi.at(-1);
    if (ultimo?.tipo !== 'fine') console.error('eventi:', JSON.stringify(eventi, null, 2), '\nlog:', righe.join('\n'));
    expect(ultimo?.tipo).toBe('fine');
    expect(eventi.some((e) => e.tipo === 'testo' && !e.parziale && /ok/i.test(e.testo))).toBe(true);
    expect(agente.sessioneCorrente()).toBeDefined();
    expect(fs.existsSync(path.join(percorsi.datiApp, 'sessione.json'))).toBe(true);
  }, 180_000);
});
