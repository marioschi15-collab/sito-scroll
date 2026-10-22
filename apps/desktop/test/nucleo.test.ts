import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Options, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { MARCATORI_APP } from '@spalla/schema';
import type { AgentRuntime, Broker, EventoAssistente, Logger, MessaggioIn, OpzioniInvio } from '../src/nucleo/contratti.js';
import type { FunzioneQuery } from '../src/nucleo/agent/index.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import {
  aggiornaConfigurazione,
  avviaNucleo,
  costruisciPromptBrief,
  creaDispatcher,
  creaFiltroMarcatori,
  creaLavoroBrief,
  leggiConfigurazione,
  leggiIdentita,
} from '../src/nucleo/index.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };
const MARCATORE = MARCATORI_APP.APRI_TELEGRAM;

async function* eventi(lista: EventoAssistente[]): AsyncGenerator<EventoAssistente> {
  for (const e of lista) yield e;
}

function runtimeFinto(risposte: EventoAssistente[][]) {
  let i = 0;
  const invia = vi.fn((_m: MessaggioIn, _o?: OpzioniInvio) => eventi(risposte[i++] ?? []));
  const runtime: AgentRuntime = { invia, nuovaSessione: vi.fn(async () => undefined), sessioneCorrente: () => 's', statoCosti: async () => ({ meseUsd: 0, sopraTetto: false }) };
  return { runtime, invia };
}

const brokerFinto = (): Broker => ({ chiedi: vi.fn(), registraCanale: vi.fn(), segnaAttivita: vi.fn() });

describe('filtro dei marcatori', () => {
  it('lascia passare il testo normale e toglie il marcatore con la sua riga', () => {
    const f = creaFiltroMarcatori();
    expect(f.frammento('Ciao Marco, ')).toBe('Ciao Marco, ');
    expect(f.completo(`Perfetto.\n${MARCATORE}\nPoi aspetto.`)).toBe('Perfetto.\nPoi aspetto.');
    expect(f.trovati()).toEqual([MARCATORE]);
  });

  it('in streaming trattiene un possibile inizio di marcatore e lo rilascia se non lo era', () => {
    const f = creaFiltroMarcatori();
    expect(f.frammento('Vado [[')).toBe('Vado ');
    expect(f.frammento('APRI:TELE')).toBe('');
    expect(f.frammento('GRAM]]\nFatto')).toBe('Fatto');
    expect(f.trovati()).toEqual([MARCATORE]);

    const g = creaFiltroMarcatori();
    expect(g.frammento('nota [[')).toBe('nota ');
    expect(g.frammento('tra parentesi]] fine')).toBe('[[tra parentesi]] fine');
    expect(g.svuota()).toBe('');
    expect(g.trovati()).toEqual([]);
  });

  it('svuota restituisce la coda trattenuta a fine blocco', () => {
    const f = creaFiltroMarcatori();
    expect(f.frammento('ok [')).toBe('ok ');
    expect(f.svuota()).toBe('[');
  });
});

describe('dispatcher', () => {
  it('serializza gli scambi sulla sessione principale e consegna gli eventi al canale giusto', async () => {
    const { runtime, invia } = runtimeFinto([
      [{ tipo: 'testo', testo: 'uno', parziale: false }, { tipo: 'fine', sessioneId: 's', durataMs: 10 }],
      [{ tipo: 'testo', testo: 'due', parziale: false }, { tipo: 'fine', sessioneId: 's', durataMs: 10 }],
    ]);
    const broker = brokerFinto();
    const segnale = { segna: vi.fn() };
    const d = creaDispatcher({ runtime, broker, logger, segnaleAttivita: segnale });
    const ricevutiA: EventoAssistente[] = [];
    const ricevutiB: EventoAssistente[] = [];
    const a = d.gestisci({ testo: 'a', canale: 'desktop' }, async (e) => void ricevutiA.push(e));
    const b = d.gestisci({ testo: 'b', canale: 'telegram' }, async (e) => void ricevutiB.push(e));
    expect(d.inCoda()).toBe(2);
    await Promise.all([a, b]);
    expect(d.inCoda()).toBe(0);
    expect(invia.mock.calls.map((c) => c[0].testo)).toEqual(['a', 'b']);
    expect(ricevutiA.map((e) => (e.tipo === 'testo' ? e.testo : e.tipo))).toEqual(['uno', 'fine']);
    expect(ricevutiB.map((e) => (e.tipo === 'testo' ? e.testo : e.tipo))).toEqual(['due', 'fine']);
    expect(broker.segnaAttivita).toHaveBeenCalledWith('desktop');
    expect(broker.segnaAttivita).toHaveBeenCalledWith('telegram');
    expect(segnale.segna).toHaveBeenCalledTimes(2);
  });

  it('toglie il marcatore dal testo (anche spezzato) e avvisa chi lo ascolta a fine scambio', async () => {
    const { runtime } = runtimeFinto([[
      { tipo: 'testo', testo: 'Apro il collegamento.\n[[APRI:', parziale: true },
      { tipo: 'testo', testo: 'TELEGRAM]]\nPoi aspetto.', parziale: true },
      { tipo: 'testo', testo: `Apro il collegamento.\n${MARCATORE}\nPoi aspetto.`, parziale: false },
      { tipo: 'fine', sessioneId: 's', durataMs: 10, costoUsd: 0.01 },
    ]]);
    const d = creaDispatcher({ runtime, broker: brokerFinto(), logger });
    const ordine: string[] = [];
    d.suMarcatore(MARCATORE, async (s) => { ordine.push(`marcatore:${s.marcatori.join(',')}`); });
    d.dopoScambio(async (s) => { ordine.push(`dopo:${s.esito}:${s.costoUsd}`); });
    const testi: string[] = [];
    await d.gestisci({ testo: 'sì', canale: 'desktop' }, async (e) => { if (e.tipo === 'testo') testi.push(`${e.parziale ? 'p' : 'c'}:${e.testo}`); ordine.push(e.tipo); });
    expect(testi).toEqual(['p:Apro il collegamento.\n', 'p:Poi aspetto.', 'c:Apro il collegamento.\nPoi aspetto.']);
    expect(ordine.slice(-2)).toEqual(['dopo:fine:0.01', `marcatore:${MARCATORE}`]);
  });

  it('le sessioni programmate non aspettano la coda principale; un errore non blocca la coda', async () => {
    let sblocca: () => void = () => undefined;
    const lenta = new Promise<void>((r) => { sblocca = r; });
    const invia = vi.fn((m: MessaggioIn, o?: OpzioniInvio) => {
      if (o?.sessione === 'programmata') return eventi([{ tipo: 'fine', sessioneId: 'p', durataMs: 1 }]);
      if (m.testo === 'rotto') return (async function* (): AsyncGenerator<EventoAssistente> { throw new Error('boom'); })();
      return (async function* (): AsyncGenerator<EventoAssistente> { await lenta; yield { tipo: 'fine', sessioneId: 's', durataMs: 1 }; })();
    });
    const runtime: AgentRuntime = { invia, nuovaSessione: async () => undefined, sessioneCorrente: () => undefined, statoCosti: async () => ({ meseUsd: 0, sopraTetto: false }) };
    const d = creaDispatcher({ runtime, broker: brokerFinto(), logger });
    const ordine: string[] = [];
    const principale = d.gestisci({ testo: 'lento', canale: 'desktop' }, async () => void ordine.push('principale'));
    const rotto = d.gestisci({ testo: 'rotto', canale: 'desktop' }, async () => undefined);
    await d.gestisci({ testo: 'brief', canale: 'sistema' }, async () => void ordine.push('programmata'), { sessione: 'programmata' });
    expect(ordine).toEqual(['programmata']);
    sblocca();
    await principale;
    await expect(rotto).rejects.toThrow('boom');
    const dopo = d.gestisci({ testo: 'ancora', canale: 'desktop' }, async () => void ordine.push('ancora'), { sessione: 'programmata' });
    await dopo;
    expect(ordine).toEqual(['programmata', 'principale', 'ancora']);
  });
});

describe('configurazione e identità', () => {
  let cartella: string;
  beforeEach(() => { cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-nucleo-')); });
  afterEach(() => { fs.rmSync(cartella, { recursive: true, force: true }); });

  it('config.json assente → predefiniti; solo cervello → il resto predefinito; rotto → problemi', () => {
    const vuota = leggiConfigurazione(cartella, logger);
    expect(vuota.presente).toBe(false);
    expect(vuota.config.riordino_notturno).toEqual({ attivo: true, ora: '03:00' });

    fs.writeFileSync(path.join(cartella, 'config.json'), JSON.stringify({ cervello: { modalita: 'abbonamento', livello: 'equilibrato', tetto_mensile_eur: null } }));
    const parziale = leggiConfigurazione(cartella, logger);
    expect(parziale.presente).toBe(true);
    expect(parziale.problemi).toEqual([]);
    expect(parziale.config.cervello.modalita).toBe('abbonamento');
    expect(parziale.config.brief.attivo).toBe(false);

    fs.writeFileSync(path.join(cartella, 'config.json'), JSON.stringify({ cervello: { modalita: 'abbonamento' }, brief: { ora: 'boh' } }));
    const rotta = leggiConfigurazione(cartella, logger);
    expect(rotta.problemi.length).toBeGreaterThan(0);
    expect(rotta.config.cervello.modalita).toBe('abbonamento');
    expect(rotta.config.brief.ora).toBe('08:00');

    fs.writeFileSync(path.join(cartella, 'config.json'), '{ non json');
    expect(leggiConfigurazione(cartella, logger).problemi).toEqual(['config.json non è un JSON valido']);
  });

  it('aggiornaConfigurazione unisce una sezione e conserva le altre', () => {
    fs.writeFileSync(path.join(cartella, 'config.json'), JSON.stringify({ cervello: { modalita: 'abbonamento', tetto_mensile_eur: null } }));
    const c = aggiornaConfigurazione(cartella, { telegram: { attivo: true, bot: '@spalla_7k3p_bot' } }, logger);
    expect(c.telegram).toEqual({ attivo: true, bot: '@spalla_7k3p_bot', risposte_vocali: false });
    expect(c.cervello.modalita).toBe('abbonamento');
    expect(JSON.parse(fs.readFileSync(path.join(cartella, 'config.json'), 'utf8')).telegram.bot).toBe('@spalla_7k3p_bot');
  });

  it('leggiIdentita: nomi compilati, segnaposto ignorati, file assente', () => {
    fs.mkdirSync(path.join(cartella, 'profilo'));
    fs.writeFileSync(path.join(cartella, 'profilo', 'IDENTITA.md'), "# IDENTITÀ\n- Nome dell'assistente: Bruno\n- Utente: Marco, del tu\n- Lingua: italiano\n");
    expect(leggiIdentita(cartella)).toEqual({ nomeAssistente: 'Bruno', nomeUtente: 'Marco' });
    fs.writeFileSync(path.join(cartella, 'profilo', 'IDENTITA.md'), "- Nome dell'assistente: (da compilare durante le presentazioni)\n- Utente: (da compilare durante le presentazioni)\n");
    expect(leggiIdentita(cartella)).toEqual({});
    expect(leggiIdentita(path.join(cartella, 'altrove'))).toEqual({});
  });
});

describe('lavoro brief_mattino (base spenta nel prototipo)', () => {
  it('spento: non chiama il runtime; acceso: sessione programmata sul canale sistema e consegna del testo', async () => {
    const { runtime, invia } = runtimeFinto([[
      { tipo: 'testo', testo: 'Buongiorno Marco. Tre cose: ...', parziale: false },
      { tipo: 'fine', sessioneId: 'p', durataMs: 900, costoUsd: 0.004 },
    ]]);
    const consegna = vi.fn(async () => undefined);
    const spento = creaLavoroBrief({ runtime, config: { brief: { attivo: false, ora: '08:00', canale: 'desktop' } }, logger, consegna });
    expect(spento.attivo).toBe(false);
    expect(spento.cron).toBe('0 8 * * *');
    await spento.esegui();
    expect(invia).not.toHaveBeenCalled();
    expect(spento.ultimoEsito()?.esito).toBe('spento');

    const acceso = creaLavoroBrief({ runtime, config: { brief: { attivo: true, ora: '08:30', canale: 'telegram' } }, logger, consegna, adesso: () => new Date('2026-10-22T06:30:00Z') });
    expect(acceso.cron).toBe('30 8 * * *');
    await acceso.esegui();
    expect(invia).toHaveBeenCalledWith({ testo: expect.stringContaining('Buongiorno del mattino — 2026-10-22'), canale: 'sistema' }, { sessione: 'programmata', tettoUsd: 0.05 });
    expect(consegna).toHaveBeenCalledWith('Buongiorno Marco. Tre cose: ...', 'telegram');
    expect(acceso.ultimoEsito()).toMatchObject({ esito: 'fatto', canale: 'telegram', costoUsd: 0.004 });
    expect(costruisciPromptBrief(new Date('2026-10-22T06:30:00Z'))).not.toMatch(/\b(agente|prompt|token)\b/i);
  });
});

describe('avviaNucleo', () => {
  let radice: string;
  beforeEach(() => {
    radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-nucleo-'));
    process.env.SPALLA_HOME = radice;
  });
  afterEach(() => {
    delete process.env.SPALLA_HOME;
    fs.rmSync(radice, { recursive: true, force: true });
  });

  const S = 'sess-nucleo';
  function copione(testo: string): FunzioneQuery {
    return ({ options }) => {
      catture.push(options as Options);
      return (async function* (): AsyncGenerator<SDKMessage> {
        yield { type: 'system', subtype: 'init', session_id: S, uuid: 'u', apiKeySource: 'none', claude_code_version: 't', cwd: '/', tools: [], mcp_servers: [], model: 'sonnet', permissionMode: 'default', slash_commands: [], output_style: 'default', skills: [], plugins: [] } as unknown as SDKMessage;
        yield { type: 'assistant', message: { id: 'm', type: 'message', role: 'assistant', model: 'sonnet', content: [{ type: 'text', text: testo }], stop_reason: 'end_turn', stop_sequence: null, usage: {} }, parent_tool_use_id: null, uuid: 'a', session_id: S } as unknown as SDKMessage;
        yield { type: 'result', subtype: 'success', is_error: false, result: testo, session_id: S, uuid: 'r', duration_ms: 50, duration_api_ms: 40, num_turns: 1, stop_reason: 'end_turn', total_cost_usd: 0.002, usage: {}, modelUsage: {}, permission_denials: [] } as unknown as SDKMessage;
      })();
    };
  }
  const catture: Options[] = [];

  it('costruisce tutto, semina la cartella e fa passare uno scambio dal dispatcher al vero runtime', async () => {
    const percorsi = calcolaPercorsi();
    fs.mkdirSync(percorsi.datiApp, { recursive: true });
    fs.writeFileSync(path.join(percorsi.datiApp, 'config.json'), JSON.stringify({ cervello: { modalita: 'abbonamento', livello: 'equilibrato', tetto_mensile_eur: null } }));

    // Sentinella: con usaConfigEreditata il binario deve ricevere proprio la cartella di configurazione ereditata.
    const configPrima = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = path.join(radice, 'config-claude-ereditata');
    const nucleo = await avviaNucleo({
      percorsi, modalitaDev: true, usaConfigEreditata: true, logger, avviaTelegram: false, motoreVoce: 'nessuno',
      query: copione(`Ciao! Apro il collegamento.\n${MARCATORE}\n`),
    });
    try {
      expect(nucleo.config.cervello.modalita).toBe('abbonamento');
      expect(nucleo.auth.modalita).toBe('abbonamento');
      expect(nucleo.telegram()).toBeUndefined();
      expect(nucleo.controlloTelegram.attivo()).toBe(false);
      expect(nucleo.scheduler.lavori().map((l) => [l.nome, l.attivo])).toEqual([['riordino_notturno', true], ['brief_mattino', false]]);
      expect(await nucleo.onboarding.stato()).toBe('da_fare');

      await nucleo.onboarding.prepara();
      expect(fs.existsSync(path.join(percorsi.cartellaLavoro, 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(percorsi.cartellaLavoro, 'onboarding', 'PRIMO-AVVIO.md'))).toBe(true);
      // Resta "da fare" finché l'assistente non scrive onboarding/stato.json dopo la prima risposta.
      expect(await nucleo.onboarding.stato()).toBe('da_fare');

      const marcatori: string[] = [];
      nucleo.dispatcher.suMarcatore(MARCATORE, async (s) => { marcatori.push(...s.marcatori); });
      const ricevuti: EventoAssistente[] = [];
      await nucleo.dispatcher.gestisci({ testo: 'ciao', canale: 'desktop' }, async (e) => void ricevuti.push(e));
      expect(ricevuti.map((e) => e.tipo)).toEqual(['testo', 'fine']);
      expect(ricevuti[0]).toEqual({ tipo: 'testo', testo: 'Ciao! Apro il collegamento.\n', parziale: false });
      expect(marcatori).toEqual([MARCATORE]);
      expect(nucleo.agente.sessioneCorrente()).toBe(S);
      expect(catture.at(-1)?.cwd).toBe(percorsi.cartellaLavoro);
      expect(catture.at(-1)?.env?.CLAUDE_CONFIG_DIR).toBe(path.join(radice, 'config-claude-ereditata'));
      expect(catture.at(-1)?.disallowedTools).toContain('Edit(./.claude/settings.json)');
      expect(fs.existsSync(path.join(percorsi.datiLocali, 'runtime', 'sessione-principale.attiva'))).toBe(true);
      await nucleo.memoria.sincronizza(); // l'osservatore ha un debounce: qui si forza
      expect((await nucleo.memoria.statoIndice()).file).toBeGreaterThan(0);
    } finally {
      await nucleo.ferma();
      if (configPrima === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = configPrima;
    }
  });

  it('senza config.json parte con i predefiniti (chiave API) e il controllo Telegram rifiuta codici senza canale', async () => {
    const percorsi = calcolaPercorsi();
    const nucleo = await avviaNucleo({ percorsi, logger, avviaTelegram: false, motoreVoce: 'nessuno', query: copione('ok') });
    try {
      expect(nucleo.config.cervello.modalita).toBe('chiave_api');
      expect(nucleo.config.cervello.tetto_mensile_eur).toBe(25);
      expect(await nucleo.controlloTelegram.confermaPairing('abc123')).toMatchObject({ ok: false });
      expect(nucleo.controlloTelegram.eRigaBotFather('123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi')).toBe(true);
      expect(nucleo.controlloTelegram.eRigaBotFather('k7m2xq')).toBe(false);
      const s = nucleo.controlloTelegram.suggerimenti('Bruno', 'Marco');
      expect(s.nome).toBe('Bruno di Marco');
      expect(s.username).toMatch(/^bruno_di_marco_[a-z0-9]{4}_bot$/);
      expect(s.link).toBe('https://t.me/BotFather');
    } finally {
      await nucleo.ferma();
    }
  });
});
