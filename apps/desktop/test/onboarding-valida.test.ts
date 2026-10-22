import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cartellaTemplates } from '@spalla/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger, Percorsi } from '../src/nucleo/contratti.js';
import { creaOnboarding, estraiImport, type OnboardingEsteso } from '../src/nucleo/onboarding/index.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'onboarding-templates');
const ADESSO = new Date('2026-10-22T07:41:00Z');
const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };

let radice: string;
let percorsi: Percorsi;

function scrivi(rel: string, contenuto: string): void {
  const file = path.join(percorsi.cartellaLavoro, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contenuto, 'utf8');
}
function leggi(rel: string): string {
  return fs.readFileSync(path.join(percorsi.cartellaLavoro, rel), 'utf8');
}
function aggiungi(rel: string, coda: string): void {
  scrivi(rel, leggi(rel) + coda);
}
function rimuovi(rel: string): void {
  fs.rmSync(path.join(percorsi.cartellaLavoro, rel), { force: true });
}

/** Toglie gli stub TODO creati perché la fixture è volutamente incompleta (5 ruoli, 6 skill…). */
function rimuoviStub(cartella = percorsi.cartellaLavoro): void {
  for (const voce of fs.readdirSync(cartella, { withFileTypes: true })) {
    const p = path.join(cartella, voce.name);
    if (voce.isDirectory()) rimuoviStub(p);
    else if (fs.readFileSync(p, 'utf8').includes('TODO: modello mancante')) fs.unlinkSync(p);
  }
}

/** Fixture seminata, stub tolti: un punto di partenza senza problemi. */
async function pronto(): Promise<OnboardingEsteso> {
  const o = creaOnboarding({ percorsi, logger, templates: FIXTURE, adesso: () => ADESSO, fuso: 'Europe/Rome' });
  await o.prepara();
  rimuoviStub();
  return o;
}

beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-onboarding-valida-'));
  process.env.SPALLA_HOME = radice;
  percorsi = calcolaPercorsi();
});
afterEach(() => {
  delete process.env.SPALLA_HOME;
  fs.rmSync(radice, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('estraiImport (regole di memory.md)', () => {
  it('prende le chiocciole a inizio riga o dopo uno spazio, non nel codice, non nelle email', () => {
    const md = [
      '@profilo/IDENTITA.md',
      'Vedi @README e @docs/guida.md.',
      'Scrivi a marco@esempio.it e guarda `@non-import` e @Design\\ Docs/api.md',
      '```',
      '@dentro/codice.md',
      '```',
      '- @~/.claude/mie-regole.md',
    ].join('\n');
    expect(estraiImport(md)).toEqual(['profilo/IDENTITA.md', 'README', 'docs/guida.md', 'Design Docs/api.md', '~/.claude/mie-regole.md']);
    expect(estraiImport(md, true)).toEqual(['profilo/IDENTITA.md', 'docs/guida.md', 'Design Docs/api.md', '~/.claude/mie-regole.md']);
  });
});

describe('valida con la fixture', () => {
  it('appena seminata non ha problemi', async () => {
    const o = await pronto();
    expect(await o.valida()).toEqual([]);
  });

  it('segnala un\'intestazione di ruolo sbagliata (strumento non ammesso, modello sconosciuto, campo scritto male)', async () => {
    const o = await pronto();
    await o.attivaRuolo('segretaria', { nomeUtente: 'Marco', mestiere: 'agente' });
    scrivi('.claude/agents/segretaria.md', leggi('.claude/agents/segretaria.md').replace('tools: Read, Write, Edit, Grep, Glob, mcp__spalla__memoria_cerca', 'tools: Read, Terminal').replace('model: sonnet', 'model: gpt').replace('maxTurns: 10', 'maxturns: 10'));
    const problemi = await o.valida();
    expect(problemi).toHaveLength(1);
    expect(problemi[0]).toMatch(/^\.claude\/agents\/segretaria\.md: /);
    expect(problemi[0]).toContain('tools.1');
    expect(problemi[0]).toContain('model');
    expect(problemi[0]).toContain('maxturns');
  });

  it('segnala un file di ruolo senza intestazione, ma tollera il segnaposto "spento il …"', async () => {
    const o = await pronto();
    scrivi('.claude/agents/copywriter.md', '# Appunti\nnon è un ruolo\n');
    scrivi('.claude/agents/analista.md', 'spento il 2026-10-22\n');
    expect(await o.valida()).toEqual(['.claude/agents/copywriter.md: il file non inizia con l\'intestazione del ruolo ("---")']);
  });

  it('segnala nome diverso dal file, nomi duplicati, attivo incoerente e segnaposto non compilati', async () => {
    const o = await pronto();
    await o.attivaRuolo('segretaria'); // senza nomeUtente/mestiere: i segnaposto restano
    scrivi('.claude/agents/segretaria.md', leggi('.claude/agents/segretaria.md').replace('attivo: true', 'attivo: false'));
    scrivi('.claude/agents/segretaria-bis.md', leggi('.claude/agents/segretaria.md'));
    scrivi('.claude/agents-spenti/critico.md', leggi('.claude/agents-spenti/critico.md').replace('attivo: false', 'attivo: true'));
    const problemi = await o.valida();
    expect(problemi).toEqual(expect.arrayContaining([
      '.claude/agents/segretaria.md: è tra i ruoli accesi ma dentro c\'è "attivo: false"',
      '.claude/agents/segretaria.md: contiene ancora i segnaposto {{NOME_UTENTE}} o {{MESTIERE}} da sostituire',
      '.claude/agents/segretaria-bis.md: il nome scritto dentro ("segretaria") non corrisponde al nome del file',
      '.claude/agents: due ruoli con lo stesso nome "segretaria" (segretaria-bis.md, segretaria.md)',
      '.claude/agents-spenti/critico.md: è tra i ruoli spenti ma dentro c\'è "attivo: true"',
    ]));
  });

  it('segnala un @import di CLAUDE.md che non esiste e ignora quelli tra apici', async () => {
    const o = await pronto();
    aggiungi('CLAUDE.md', '\n@profilo/INESISTENTE.md\n- regole @.claude/rules/confini.md e `@finto.md`\n');
    const problemi = await o.valida();
    expect(problemi).toEqual(['CLAUDE.md: richiama "@profilo/INESISTENTE.md" ma il file profilo/INESISTENTE.md non esiste']);
  });

  it('segue gli import a cascata ma nei file importati considera solo i riferimenti che sembrano file', async () => {
    const o = await pronto();
    aggiungi('profilo/UTENTE.md', '\n- Instagram: @marco_case (profilo pubblico)\n- Vedi anche @memoria/temi/non-esiste.md\n');
    // Come in Claude Code (memory.md), un percorso relativo si risolve rispetto al file che lo contiene, non alla cartella di lavoro.
    expect(await o.valida()).toEqual(['profilo/UTENTE.md: richiama "@memoria/temi/non-esiste.md" ma il file profilo/memoria/temi/non-esiste.md non esiste']);
  });

  it('segnala i tetti superati (UTENTE 4.000 caratteri, CLAUDE.md 150 righe, schede 300 righe) e i file dello scheletro mancanti', async () => {
    const o = await pronto();
    scrivi('profilo/UTENTE.md', `# UTENTE\n- Lavoro: ${'à'.repeat(4000)}\n`);
    scrivi('CLAUDE.md', Array.from({ length: 151 }, (_, i) => `- riga ${i + 1}`).join('\n') + '\n');
    scrivi('memoria/temi/cliente-lamberti.md', Array.from({ length: 301 }, (_, i) => `- fatto ${i + 1}`).join('\n') + '\n');
    rimuovi('memoria/agenda.md');
    const problemi = await o.valida();
    expect(problemi).toEqual(expect.arrayContaining([
      'memoria/agenda.md: il file manca',
      'CLAUDE.md: 151 righe, il tetto è 150',
      'profilo/UTENTE.md: 4.020 caratteri, il tetto è 4.000',
      'memoria/temi/cliente-lamberti.md: 301 righe, il tetto è 300',
    ]));
    expect(problemi).toHaveLength(4);
  });

  it('settings.json: JSON rotto, sezione permissions assente, percorsi assoluti a una barra', async () => {
    const o = await pronto();
    scrivi('.claude/settings.json', '{ "permissions": ');
    expect((await o.valida())[0]).toMatch(/^\.claude\/settings\.json: non è un JSON valido/);
    scrivi('.claude/settings.json', '{ "env": {} }');
    expect(await o.valida()).toEqual(['.claude/settings.json: manca la sezione "permissions"']);
    const assoluta = ['Read(', '/Users/marco/Spalla/**)'].join(''); // composta a pezzi: scripts/verifica-sicurezza.mjs la vieta nel codice
    scrivi('.claude/settings.json', JSON.stringify({ permissions: { allow: ['Read(./**)', assoluta], deny: ['Read(~/Library/Application Support/Spalla/claude/**)'] } }));
    expect(await o.valida()).toEqual([`.claude/settings.json: la regola "${assoluta}" usa un percorso assoluto con una sola barra; dentro la cartella si scrive "./**"`]);
  });

  it('stato.json e RISPOSTE.json devono rispettare gli schemi', async () => {
    const o = await pronto();
    scrivi('onboarding/stato.json', JSON.stringify({ versione: 1, fase: 'S9', completato: false, risposte: [], iniziato_il: '2026-10-22T09:00:00+02:00', aggiornato_il: '2026-10-22T09:00:00+02:00' }));
    scrivi('onboarding/RISPOSTE.json', JSON.stringify({ completato_il: 'ieri', durata_minuti: 3, risposte: [] }));
    const problemi = await o.valida();
    expect(problemi.some((p) => p.startsWith('onboarding/stato.json: fase:'))).toBe(true);
    expect(problemi.some((p) => p.startsWith('onboarding/RISPOSTE.json: ') && p.includes('completato_il') && p.includes('risposte'))).toBe(true);
  });

  it('a presentazioni finite: niente "(da compilare" nel profilo, critico e archivista accesi, massimo tre ruoli', async () => {
    const o = await pronto();
    scrivi('onboarding/RISPOSTE.json', JSON.stringify({ completato_il: '2026-10-22T09:41:00+02:00', durata_minuti: 11, risposte: [{ id: 'Q1', testo: 'Marco' }] }));
    expect(await o.stato()).toBe('completato');
    const problemi = await o.valida();
    expect(problemi).toEqual([
      'profilo/IDENTITA.md: contiene ancora righe "(da compilare durante le presentazioni)"',
      'profilo/ANIMA.md: contiene ancora righe "(da compilare durante le presentazioni)"',
      'profilo/UTENTE.md: contiene ancora righe "(da compilare durante le presentazioni)"',
      'profilo/SQUADRA.md: contiene ancora righe "(da compilare durante le presentazioni)"',
      '.claude/agents/critico.md: manca, ma questo ruolo deve essere sempre acceso',
      '.claude/agents/archivista.md: manca, ma questo ruolo deve essere sempre acceso',
    ]);
  });
});

describe('valida con i modelli veri (packages/workspace-templates)', () => {
  it('la cartella seminata è valida, resta valida con la squadra accesa, e la regola dei tre si fa sentire', async () => {
    const o = creaOnboarding({ percorsi, logger, templates: cartellaTemplates(), adesso: () => ADESSO, fuso: 'Europe/Rome' });
    const esito = await o.semina();
    expect(esito.mancanti).toEqual([]);
    expect(await o.valida()).toEqual([]);

    const compilazione = { nomeUtente: 'Marco', mestiere: 'agente immobiliare indipendente a Bologna' };
    for (const nome of ['segretaria', 'copywriter', 'cercatore-clienti', 'critico', 'archivista']) await o.attivaRuolo(nome, compilazione);
    expect(o.elencoRuoli().accesi).toEqual(['archivista', 'cercatore-clienti', 'copywriter', 'critico', 'segretaria']);
    expect(await o.valida()).toEqual([]);

    await o.attivaRuolo('contabile', compilazione);
    expect(await o.valida()).toEqual(['.claude/agents: 4 ruoli accesi oltre a critico e archivista; il massimo è 3 (regola dei tre)']);
    await o.disattivaRuolo('contabile');
    expect(await o.valida()).toEqual([]);
  });

  it('il messaggio iniziale è il rituale vero con i segnaposto sostituiti', async () => {
    const o = creaOnboarding({ percorsi, logger, templates: cartellaTemplates(), adesso: () => ADESSO, fuso: 'Europe/Rome' });
    await o.prepara();
    const m = await o.messaggioIniziale();
    expect(m).toContain('# PRIMO AVVIO');
    expect(m).toContain('La richiesta dell\'utente viene sempre prima');
    expect(m).not.toContain('{{NOME_PRODOTTO}}');
    expect(m).not.toContain('{{DATA_OGGI}}');
    expect(m).toContain('{{NOME_UTENTE}}'); // istruzione per l\'assistente, resta
    expect(m).toContain('scrivi la data come 2026-10-22');
  });
});
