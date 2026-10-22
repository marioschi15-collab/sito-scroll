import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Logger } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import { creaRuntimeBinario } from '../src/nucleo/runtime/index.js';
import { creaAuthAbbonamento, creaAuthChiaveApi, creaStoreSegreti } from '../src/nucleo/auth/index.js';
import { creaBroker, descriviRichiesta } from '../src/nucleo/broker/index.js';
import { creaAgentRuntime } from '../src/nucleo/agent/index.js';
import { creaMemoryService, creaLavoroRiordino, type MemoryServiceEsteso } from '../src/nucleo/memoria/index.js';
import { creaOnboarding } from '../src/nucleo/onboarding/index.js';

/**
 * Prova end-to-end del riordino notturno (docs/03 §8) con il vero SDK e il binario incluso: la cartella viene
 * seminata dai modelli veri, l'archivista acceso come farebbe il rituale, un paio di diari scritti a mano; poi
 * `creaLavoroRiordino` apre la sessione programmata con `options.agent = 'archivista'` e si controlla che
 * memoria/RIORDINO.log abbia una voce datata. Richiede un login già presente (CLAUDE_CONFIG_DIR ereditato) oppure
 * ANTHROPIC_API_KEY nell'ambiente. Si esegue solo con RUN_E2E=1.
 */
const attiva = process.env.RUN_E2E === '1';

describe.skipIf(!attiva)('E2E: il riordino notturno attraverso il binario', () => {
  let radice: string;
  let memoria: MemoryServiceEsteso | undefined;
  const righe: string[] = [];
  const logger: Logger = {
    info: (e, d) => righe.push(`info ${e} ${JSON.stringify(d ?? {})}`),
    avviso: (e, d) => righe.push(`avviso ${e} ${JSON.stringify(d ?? {})}`),
    errore: (e, d) => righe.push(`errore ${e} ${JSON.stringify(d ?? {})}`),
  };

  beforeAll(() => {
    radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-e2e-riordino-'));
    process.env.SPALLA_HOME = radice;
  });
  afterAll(async () => {
    await memoria?.ferma();
    delete process.env.SPALLA_HOME;
    fs.rmSync(radice, { recursive: true, force: true });
  });

  function dataIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  it('apre la sessione con il ruolo archivista e lascia una voce in memoria/RIORDINO.log', async () => {
    const percorsi = calcolaPercorsi();
    const conChiave = Boolean(process.env.ANTHROPIC_API_KEY);
    const runtime = creaRuntimeBinario(percorsi, { usaConfigEreditata: !conChiave });

    // La cartella come la lascia il rituale: modelli veri, archivista acceso con nome e mestiere.
    const onboarding = creaOnboarding({ percorsi, logger });
    await onboarding.prepara();
    await onboarding.attivaRuolo('archivista', { nomeUtente: 'Marco', mestiere: 'agente immobiliare indipendente a Bologna' });
    const oggi = new Date();
    const ieri = new Date(oggi.getTime() - 24 * 60 * 60 * 1000);
    const diari = path.join(percorsi.cartellaLavoro, 'memoria', 'diario');
    fs.writeFileSync(path.join(diari, `${dataIso(ieri)}.md`), `# Diario ${dataIso(ieri)}\n- 09:12 [desktop] Marco: preferisce i messaggi ai proprietari senza cifre per iscritto\n- 11:40 [telegram] ricordami di richiamare la Lamberti domani alle 10\n`);
    fs.writeFileSync(path.join(diari, `${dataIso(oggi)}.md`), `# Diario ${dataIso(oggi)}\n- 08:30 [desktop] Marco: niente cifre per iscritto ai proprietari, mai\n- 15:05 [desktop] follow-up ai Conti → lavoro/messaggi/conti.md\n`);

    let auth = creaAuthAbbonamento({ runtime, cwd: percorsi.cartellaLavoro });
    if (conChiave) {
      const store = creaStoreSegreti(percorsi.segreti);
      const chiave = creaAuthChiaveApi(store, { runtime, cwd: percorsi.cartellaLavoro });
      await chiave.salvaChiave(process.env.ANTHROPIC_API_KEY as string);
      auth = chiave;
    }
    memoria = creaMemoryService({ percorsi, logger });
    await memoria.avvia();
    const broker = creaBroker({ logger, timeoutMs: 1000 }); // nessun canale: ciò che esce dalla cartella viene negato
    const agente = creaAgentRuntime({
      percorsi, runtime, broker, logger, memoria, descriviRichiesta, auth,
      config: { cervello: { modalita: conChiave ? 'chiave_api' : 'abbonamento', tetto_mensile_eur: conChiave ? 25 : null } },
    });

    const lavoro = creaLavoroRiordino({
      runtime: agente, memoria, percorsi, logger, tettoUsd: 0.25,
      config: { riordino_notturno: { attivo: true, ora: '03:00' } },
    });
    await lavoro.esegui();

    const esito = lavoro.ultimoEsito();
    const log = path.join(percorsi.cartellaLavoro, 'memoria', 'RIORDINO.log');
    if (esito?.esito !== 'fatto' || !fs.existsSync(log)) console.error('esito:', JSON.stringify(esito), '\nlog:', righe.join('\n'));
    expect(esito?.esito).toBe('fatto');
    expect(fs.existsSync(log)).toBe(true);
    expect(fs.readFileSync(log, 'utf8')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} —/m);
    // Il ruolo era davvero l'archivista: la sessione programmata non ha toccato quella principale.
    expect(agente.sessioneCorrente()).toBeUndefined();
    expect(righe.some((r) => r.includes('agente.scambio_inizio') && r.includes('"ruolo":"archivista"'))).toBe(true);
  }, 300_000);
});
