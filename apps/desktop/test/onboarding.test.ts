import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_PREDEFINITA, ConfigSchema, RisposteSchema, StatoOnboardingSchema, parseRuolo } from '@spalla/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger, Percorsi } from '../src/nucleo/contratti.js';
import {
  FILE_ATTESI,
  creaOnboarding,
  dataIso,
  dataOraLunga,
  impostaAttivo,
  istanteConFuso,
  leggiDirettive,
  oraBreve,
  riepilogoProfilo,
  riepilogoRipresa,
  type DipendenzeOnboarding,
} from '../src/nucleo/onboarding/index.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'onboarding-templates');
/** 22 ottobre 2026, 09:41 a Roma. */
const ADESSO = new Date('2026-10-22T07:41:00Z');
const FUSO = 'Europe/Rome';
const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };

let radice: string;
let percorsi: Percorsi;

function onboarding(extra: Partial<DipendenzeOnboarding> = {}) {
  return creaOnboarding({ percorsi, logger, templates: FIXTURE, adesso: () => ADESSO, fuso: FUSO, ...extra });
}
function scrivi(rel: string, contenuto: string): void {
  const file = path.join(percorsi.cartellaLavoro, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contenuto, 'utf8');
}
function leggi(rel: string): string {
  return fs.readFileSync(path.join(percorsi.cartellaLavoro, rel), 'utf8');
}
function esiste(rel: string): boolean {
  return fs.existsSync(path.join(percorsi.cartellaLavoro, rel));
}
function leggiJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
}
function configJson(): string {
  return path.join(percorsi.datiApp, 'config.json');
}

const STATO_IN_CORSO = {
  versione: 1,
  iniziato_il: '2026-10-22T09:30:00+02:00',
  aggiornato_il: '2026-10-22T09:36:10+02:00',
  fase: 'S3',
  ramo: 'venditore',
  prossima_domanda: 'Q6',
  completato: false,
  rinviato: false,
  risposte: [
    { id: 'Q1', testo: 'Marco, del tu', quando: '2026-10-22T09:31:00+02:00' },
    { id: 'Q2', testo: 'Bruno' },
    { id: 'Q3', testo: 'Diretto e pratico' },
    { id: 'Q4', testo: 'Venditore / agente', ramo: 'venditore' },
    { id: 'Q5', testo: ['Rispondere ai contatti/lead', 'Follow-up dopo visite o incontri', 'Documenti da raccogliere'] },
    { id: 'S4', scelta: 1, file: 'lavoro/messaggi/2026-10-22-follow-up-3-contatti.md' },
  ],
  impostazioni: {
    orari: { silenzio_da: '21:00', silenzio_a: '08:00', domenica: 'silenzio' },
    brief: { attivo: false, ora: '08:30', canale: 'telegram' },
    telegram: { richiesto: true },
    voce: { desktop: 'push_to_talk' },
  },
  squadra: { accesi: ['segretaria', 'copywriter', 'cercatore-clienti'], spenti: ['contabile', 'analista', 'preventivista'] },
};

const UTENTE_DI_MARCO = `# UTENTE — direttive stabili su Marco (una per voce, con data e fonte)
<!-- osservato: 2026-10-22 | stato: attivo | fonte: onboarding -->
- Lavoro: agente immobiliare indipendente a Bologna. Collabora con lo Studio Immobiliare Galvani. ~40 contatti attivi, 12 immobili in vendita.
<!-- osservato: 2026-10-22 | stato: attivo | fonte: onboarding -->
- Strumenti: WhatsApp (clienti), Gmail, Google Calendar, Immobiliare.it e Idealista (lead), Excel "Incarichi 2026".
<!-- osservato: 2026-10-24 | stato: attivo | fonte: conversazione -->
- Riepiloghi in massimo 3 punti; il dettaglio in un file in lavoro/.
<!-- osservato: 2026-10-22 | stato: superato il 2026-10-24 | fonte: onboarding -->
- Preferisce riepiloghi completi. (sostituita da: "Riepiloghi in massimo 3 punti")
`;

beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-onboarding-'));
  process.env.SPALLA_HOME = radice;
  percorsi = calcolaPercorsi();
});
afterEach(() => {
  delete process.env.SPALLA_HOME;
  fs.rmSync(radice, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('tempo (fuso dell\'utente, non del processo)', () => {
  it('data, ora e riga lunga in italiano a Roma', () => {
    expect(dataIso(ADESSO, FUSO)).toBe('2026-10-22');
    expect(oraBreve(ADESSO, FUSO)).toBe('09:41');
    expect(dataOraLunga(ADESSO, FUSO)).toBe('giovedì 22 ottobre 2026 alle ore 09:41');
  });
  it('istante ISO con lo scostamento del fuso, accettato dallo schema', () => {
    expect(istanteConFuso(ADESSO, FUSO)).toBe('2026-10-22T09:41:00+02:00');
    expect(istanteConFuso(ADESSO, 'America/New_York')).toBe('2026-10-22T03:41:00-04:00');
    expect(istanteConFuso(ADESSO, 'UTC')).toBe('2026-10-22T07:41:00+00:00');
    expect(StatoOnboardingSchema.shape.iniziato_il.safeParse(istanteConFuso(ADESSO, FUSO)).success).toBe(true);
  });
  it('un fuso sconosciuto ricade su quello del sistema con un avviso', async () => {
    const o = onboarding({ fuso: 'Marte/Olympus' });
    expect(logger.avviso).toHaveBeenCalledWith('onboarding.fuso_non_valido', { fuso: 'Marte/Olympus' });
    await o.prepara();
    expect(esiste('CLAUDE.md')).toBe(true);
  });
});

describe('prepara (semina idempotente)', () => {
  it('copia i modelli, sostituisce i segnaposto dell\'app e crea le cartelle attese', async () => {
    const esito = await onboarding().semina();
    expect(esito.creati).toContain('CLAUDE.md');
    expect(esito.saltati).toEqual([]);
    expect(leggi('CLAUDE.md')).toContain('# Spalla — regole operative');
    expect(leggi('profilo/IDENTITA.md')).toContain('Creato il 2026-10-22.');
    expect(leggi('.claude/settings.json')).toContain('Application Support/Spalla/claude');
    const segretaria = leggi('.claude/agents-spenti/segretaria.md');
    expect(segretaria).toContain('creato_il: "2026-10-22"');
    expect(segretaria).toContain('{{NOME_UTENTE}}'); // quelli dell'assistente restano
    for (const rel of FILE_ATTESI) expect(esiste(rel), rel).toBe(true);
    for (const dir of ['.claude/agents', '.claude/agents-spenti', 'memoria/diario', 'lavoro/cestino', 'onboarding']) {
      expect(fs.statSync(path.join(percorsi.cartellaLavoro, dir)).isDirectory(), dir).toBe(true);
    }
    expect(parseRuolo(segretaria).frontmatter.spalla.creato_il).toBe('2026-10-22');
  });

  it('scrive datiApp/config.json con i predefiniti se manca, e non lo tocca se c\'è', async () => {
    const primo = await onboarding().semina();
    expect(primo.configCreato).toBe(true);
    expect(ConfigSchema.parse(leggiJson(configJson()))).toEqual(CONFIG_PREDEFINITA);

    fs.writeFileSync(configJson(), JSON.stringify({ cervello: { modalita: 'abbonamento', livello: 'equilibrato', tetto_mensile_eur: null } }));
    const secondo = await onboarding().semina();
    expect(secondo.configCreato).toBe(false);
    expect((leggiJson(configJson()) as { cervello: { modalita: string } }).cervello.modalita).toBe('abbonamento');
  });

  it('i modelli assenti diventano stub con un TODO e vengono segnalati', async () => {
    const esito = await onboarding().semina();
    expect(esito.mancanti).toContain('onboarding/domande.md');
    expect(esito.mancanti).toContain('.claude/agents-spenti/copywriter.md');
    expect(esito.mancanti).toContain('.claude/skills/preventivo/SKILL.md');
    expect(esito.mancanti).toContain('lavoro/report/.gitkeep');
    expect(leggi('onboarding/domande.md')).toMatch(/^<!-- TODO: modello mancante nei template \(onboarding\/domande\.md\)/);
    expect(leggi('lavoro/report/.gitkeep')).toBe('');
    expect(logger.avviso).toHaveBeenCalledWith('onboarding.modello_mancante', { file: 'onboarding/domande.md' });
  });

  it('non sovrascrive mai: la seconda semina salta tutto e ricrea solo ciò che manca', async () => {
    await onboarding().prepara();
    scrivi('profilo/IDENTITA.md', '# IDENTITÀ\n- Nome dell\'assistente: Bruno\n');
    fs.unlinkSync(path.join(percorsi.cartellaLavoro, 'memoria/agenda.md'));

    const esito = await onboarding().semina();
    expect(esito.creati).toEqual(['memoria/agenda.md']);
    expect(esito.mancanti).toEqual([]);
    expect(esito.saltati.length).toBeGreaterThan(10);
    expect(leggi('profilo/IDENTITA.md')).toBe('# IDENTITÀ\n- Nome dell\'assistente: Bruno\n');
    expect(leggi('memoria/agenda.md')).toContain('# AGENDA');
  });

  it('a presentazioni finite non fa tornare il rituale', async () => {
    await onboarding().prepara();
    scrivi('onboarding/RISPOSTE.json', '{ "completato_il": "2026-10-22T09:40:00+02:00", "durata_minuti": 10, "risposte": [ { "id": "Q1", "testo": "Marco" } ] }');
    fs.unlinkSync(path.join(percorsi.cartellaLavoro, 'onboarding/PRIMO-AVVIO.md'));
    const esito = await onboarding().semina();
    expect(esiste('onboarding/PRIMO-AVVIO.md')).toBe(false);
    expect(esito.esclusi).toEqual(['onboarding/PRIMO-AVVIO.md']);
  });

  it('con una cartella dei modelli inesistente fallisce con un messaggio chiaro', async () => {
    await expect(onboarding({ templates: path.join(radice, 'non-ci-sono') }).prepara()).rejects.toThrow(/cartella dei modelli non esiste/);
  });
});

describe('stato (transizioni)', () => {
  it('da_fare → in_corso → completato (RISPOSTE.json)', async () => {
    const o = onboarding();
    expect(await o.stato()).toBe('da_fare'); // cartella non ancora seminata
    await o.prepara();
    expect(await o.stato()).toBe('da_fare');
    scrivi('onboarding/stato.json', JSON.stringify(STATO_IN_CORSO));
    expect(await o.stato()).toBe('in_corso');
    // Un RISPOSTE.json vuoto o troncato a metà (scritto male dall'assistente) non chiude le presentazioni.
    scrivi('onboarding/RISPOSTE.json', '{}');
    expect(await o.stato()).toBe('in_corso');
    scrivi('onboarding/RISPOSTE.json', '{ "completato_il": "2026-10-22T09:40:00+02:00", "durata_minuti": 10, "risposte": [ { "id": "Q1", "testo": "Marco" } ] }');
    expect(await o.stato()).toBe('completato');
  });

  it('stato.json con completato: true vale come completato, anche senza RISPOSTE.json', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', JSON.stringify({ ...STATO_IN_CORSO, completato: true }));
    expect(await o.stato()).toBe('completato');
  });

  it('stato.json illeggibile conta comunque come intervista iniziata', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', '{ non è json');
    expect(await o.stato()).toBe('in_corso');
  });

  it('rituale sparito + IDENTITA compilata = completato; rituale sparito + IDENTITA da compilare = da_fare', async () => {
    const o = onboarding();
    await o.prepara();
    fs.unlinkSync(path.join(percorsi.cartellaLavoro, 'onboarding/PRIMO-AVVIO.md'));
    expect(await o.stato()).toBe('da_fare');
    scrivi('profilo/IDENTITA.md', '# IDENTITÀ\n- Nome dell\'assistente: Bruno\n- Utente: Marco, del tu\n');
    expect(await o.stato()).toBe('completato');
  });

  it('il rituale riscritto come "# Presentazioni completate il …" conta come rituale sparito', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/PRIMO-AVVIO.md', '# Presentazioni completate il 2026-10-22\n');
    scrivi('profilo/IDENTITA.md', '# IDENTITÀ\n- Nome dell\'assistente: Bruno\n');
    expect(await o.stato()).toBe('completato');
  });
});

describe('messaggioIniziale', () => {
  it('rituale + riga con data, ora, fuso e lingua', async () => {
    const o = onboarding();
    await o.prepara();
    const m = await o.messaggioIniziale();
    expect(m.startsWith('# PRIMO AVVIO — rituale, non questionario')).toBe(true);
    expect(m).toContain('Prodotto: Spalla; modelli del 2026-10-22.');
    expect(m).toContain('Adesso: giovedì 22 ottobre 2026 alle ore 09:41 (fuso orario Europe/Rome; lingua: italiano). Nei file e nei nomi dei file scrivi la data come 2026-10-22.');
    expect(m).not.toContain('Riprendiamo da dove eravamo');
  });

  it('in corso: riepilogo di ripresa con le risposte date e la prossima domanda', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', JSON.stringify(STATO_IN_CORSO));
    const m = await o.messaggioIniziale();
    expect(m).toContain('Riprendiamo da dove eravamo: fase S3 (La tua giornata), ramo venditore.');
    expect(m).toContain('Risposte già registrate (6): Q1 «Marco, del tu»; Q2 «Bruno»; Q3 «Diretto e pratico»; Q4 «Venditore / agente»; Q5 «Rispondere ai contatti/lead, Follow-up dopo visite o incont…»; S4 (primo colpo 1: lavoro/messaggi/2026-10-22-follow-up-3-contatti.md).');
    expect(m).toContain('Squadra già scelta: segretaria, copywriter, cercatore-clienti.');
    expect(m).toContain('Prossima domanda: Q6. Non rifare le domande già fatte: riparti dalla prossima.');
    expect(m).not.toContain('Hai due minuti');
  });

  it('rinviato: ricorda di chiedere "Hai due minuti…"; senza prossima domanda: chiudere', () => {
    const base = StatoOnboardingSchema.parse(STATO_IN_CORSO);
    expect(riepilogoRipresa({ ...base, rinviato: true })).toContain('chiedi prima «Hai due minuti per finire le presentazioni?»');
    expect(riepilogoRipresa({ ...base, prossima_domanda: null, risposte: [] })).toContain('Nessuna risposta registrata finora.');
    expect(riepilogoRipresa({ ...base, prossima_domanda: null })).toContain('Non resta nessuna domanda: chiudi le presentazioni (S8).');
  });

  it('stato.json illeggibile: lo dice all\'assistente senza fermarsi', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', JSON.stringify({ versione: 1, fase: 'S9' }));
    const m = await o.messaggioIniziale();
    expect(m).toContain('Lo stato salvato in onboarding/stato.json non è leggibile (');
    expect(m).toContain('# PRIMO AVVIO');
  });

  it('rituale cancellato a metà intervista: lo riprende dai modelli senza riscriverlo', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', JSON.stringify(STATO_IN_CORSO));
    fs.unlinkSync(path.join(percorsi.cartellaLavoro, 'onboarding/PRIMO-AVVIO.md'));
    const m = await o.messaggioIniziale();
    expect(m).toContain('# PRIMO AVVIO');
    expect(m).toContain('Prodotto: Spalla; modelli del 2026-10-22.');
    expect(esiste('onboarding/PRIMO-AVVIO.md')).toBe(false);
  });
});

describe('completa', () => {
  it('scrive RISPOSTE.json da stato.json, segna completato, annota il diario, toglie il rituale, applica le impostazioni', async () => {
    const o = onboarding();
    await o.prepara();
    await o.attivaRuolo('segretaria', { nomeUtente: 'Marco', mestiere: 'agente immobiliare a Bologna' });
    scrivi('onboarding/stato.json', JSON.stringify(STATO_IN_CORSO));
    fs.writeFileSync(configJson(), JSON.stringify({ cervello: { modalita: 'abbonamento', livello: 'equilibrato', tetto_mensile_eur: null }, extra: 1 }));

    const esito = await o.completaDettagliato();
    expect(esito).toEqual({ risposteScritte: true, statoAggiornato: true, diarioScritto: true, ritualeRimosso: true, impostazioniApplicate: true, telegramRichiesto: true, ruoliAccesiDallApp: ['critico', 'archivista'] });
    // Critico e archivista non erano stati accesi dal rituale: li accende l'app, senza segnaposto e senza problemi di validazione.
    for (const nome of ['critico', 'archivista']) {
      const ruolo = parseRuolo(leggi(`.claude/agents/${nome}.md`));
      expect(ruolo.frontmatter.spalla.attivo).toBe(true);
      expect(ruolo.corpo).not.toContain('{{');
      expect(esiste(`.claude/agents-spenti/${nome}.md`)).toBe(false);
    }
    expect(o.elencoRuoli().accesi).toEqual(['archivista', 'critico', 'segretaria']);
    expect(await o.valida()).toEqual(expect.not.arrayContaining([expect.stringContaining('archivista')]));

    const risposte = RisposteSchema.parse(leggiJson(path.join(percorsi.cartellaLavoro, 'onboarding/RISPOSTE.json')));
    expect(risposte.completato_il).toBe('2026-10-22T09:41:00+02:00');
    expect(risposte.durata_minuti).toBe(11);
    expect(risposte.ramo).toBe('venditore');
    expect(risposte.risposte.map((r) => r.id)).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'S4']);
    expect(risposte.risposte[0]).not.toHaveProperty('quando');
    expect(risposte.squadra?.accesi).toEqual(['segretaria', 'copywriter', 'cercatore-clienti']);

    const stato = StatoOnboardingSchema.parse(leggiJson(path.join(percorsi.cartellaLavoro, 'onboarding/stato.json')));
    expect(stato.completato).toBe(true);
    expect(stato.fase).toBe('S8');
    expect(stato.prossima_domanda).toBeNull();
    expect(stato.aggiornato_il).toBe('2026-10-22T09:41:00+02:00');
    expect(stato.risposte).toHaveLength(6);

    expect(leggi('memoria/diario/2026-10-22.md')).toBe(
      '# Diario 2026-10-22\n- 09:41 [sistema] Presentazioni completate: profilo, squadra (segretaria), primo lavoro: lavoro/messaggi/2026-10-22-follow-up-3-contatti.md.\n',
    );
    expect(esiste('onboarding/PRIMO-AVVIO.md')).toBe(false);

    const config = leggiJson(configJson()) as Record<string, unknown>;
    const valida = ConfigSchema.parse(config);
    expect(valida.cervello.modalita).toBe('abbonamento');
    expect(valida.orari).toEqual({ silenzio_da: '21:00', silenzio_a: '08:00', domenica: 'silenzio' });
    expect(valida.brief).toEqual({ attivo: false, ora: '08:30', canale: 'telegram' });
    expect(valida.voce.desktop).toBe('push_to_talk');
    expect(config.extra).toBe(1); // le chiavi sconosciute restano
    expect(await o.stato()).toBe('completato');
  });

  it('è idempotente: la seconda chiamata non riscrive niente', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', JSON.stringify(STATO_IN_CORSO));
    await o.completa();
    const diario = leggi('memoria/diario/2026-10-22.md');
    const esito = await o.completaDettagliato();
    expect(esito.risposteScritte).toBe(false);
    expect(esito.statoAggiornato).toBe(false);
    expect(esito.diarioScritto).toBe(false);
    expect(esito.ritualeRimosso).toBe(false);
    expect(esito.ruoliAccesiDallApp).toEqual([]);
    expect(leggi('memoria/diario/2026-10-22.md')).toBe(diario);
  });

  it('non tocca un RISPOSTE.json scritto dall\'assistente e si aggiunge a un diario esistente', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', JSON.stringify(STATO_IN_CORSO));
    scrivi('onboarding/RISPOSTE.json', '{ "completato_il": "2026-10-22T09:40:00+02:00", "durata_minuti": 10, "risposte": [ { "id": "Q1", "testo": "Marco" } ] }');
    scrivi('memoria/diario/2026-10-22.md', '# Diario 2026-10-22\n- 09:35 [desktop] Marco: tre follow-up');
    const esito = await o.completaDettagliato();
    expect(esito.risposteScritte).toBe(false);
    expect(leggi('onboarding/RISPOSTE.json')).toContain('"durata_minuti": 10');
    expect(leggi('memoria/diario/2026-10-22.md')).toBe(
      '# Diario 2026-10-22\n- 09:35 [desktop] Marco: tre follow-up\n- 09:41 [sistema] Presentazioni completate: profilo, squadra (nessun ruolo acceso), primo lavoro: lavoro/messaggi/2026-10-22-follow-up-3-contatti.md.\n',
    );
  });

  it('senza stato.json chiude comunque: stato.json minimo completato, nessun RISPOSTE.json', async () => {
    const o = onboarding();
    await o.prepara();
    const esito = await o.completaDettagliato();
    expect(esito.risposteScritte).toBe(false);
    expect(esito.statoAggiornato).toBe(true);
    expect(esiste('onboarding/RISPOSTE.json')).toBe(false);
    const stato = StatoOnboardingSchema.parse(leggiJson(path.join(percorsi.cartellaLavoro, 'onboarding/stato.json')));
    expect(stato.completato).toBe(true);
    expect(stato.risposte).toEqual([]);
    expect(await o.stato()).toBe('completato');
    expect(logger.avviso).toHaveBeenCalledWith('onboarding.risposte_non_scritte', expect.anything());
  });

  it('con uno stato.json parzialmente valido salva le risposte buone e scarta le altre', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', JSON.stringify({ ...STATO_IN_CORSO, fase: 'S99', risposte: [...STATO_IN_CORSO.risposte, { id: 'Q7' }] }));
    const esito = await o.completaDettagliato();
    expect(esito.risposteScritte).toBe(true);
    const risposte = RisposteSchema.parse(leggiJson(path.join(percorsi.cartellaLavoro, 'onboarding/RISPOSTE.json')));
    expect(risposte.risposte).toHaveLength(6);
    expect((leggiJson(path.join(percorsi.cartellaLavoro, 'onboarding/stato.json')) as { completato: boolean }).completato).toBe(true);
  });

  it('non distrugge un config.json che non rispetta lo schema', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('onboarding/stato.json', JSON.stringify(STATO_IN_CORSO));
    fs.writeFileSync(configJson(), JSON.stringify({ cervello: { modalita: 'telepatia' } }));
    const esito = await o.completaDettagliato();
    expect(esito.impostazioniApplicate).toBe(false);
    expect(fs.readFileSync(configJson(), 'utf8')).toBe(JSON.stringify({ cervello: { modalita: 'telepatia' } }));
  });
});

describe('ruoli: attivaRuolo / disattivaRuolo', () => {
  it('accende spostando il file, con attivo: true e i segnaposto compilati; il risultato è un ruolo valido', async () => {
    const o = onboarding();
    await o.prepara();
    const esito = await o.attivaRuolo('segretaria', { nomeUtente: 'Marco', mestiere: 'agente immobiliare a Bologna' });
    expect(esito).toEqual({ nome: 'segretaria', file: '.claude/agents/segretaria.md', cambiato: true });
    expect(esiste('.claude/agents-spenti/segretaria.md')).toBe(false);
    const testo = leggi('.claude/agents/segretaria.md');
    const ruolo = parseRuolo(testo);
    expect(ruolo.frontmatter.spalla.attivo).toBe(true);
    expect(ruolo.frontmatter.spalla.creato_il).toBe('2026-10-22');
    expect(ruolo.corpo).toContain('Sei la Segretaria di Marco, agente immobiliare a Bologna.');
    expect(ruolo.corpo).not.toContain('{{');
    expect(testo).toContain('# --- metadati Spalla'); // i commenti dell\'intestazione sopravvivono
    expect(o.elencoRuoli()).toEqual({ accesi: ['segretaria'], spenti: ['archivista', 'critico'] });
  });

  it('è idempotente e spegne riportando il file tra gli spenti con attivo: false', async () => {
    const o = onboarding();
    await o.prepara();
    await o.attivaRuolo('critico');
    expect((await o.attivaRuolo('critico')).cambiato).toBe(false);
    const spento = await o.disattivaRuolo('critico');
    expect(spento).toEqual({ nome: 'critico', file: '.claude/agents-spenti/critico.md', cambiato: true });
    expect(esiste('.claude/agents/critico.md')).toBe(false);
    expect(parseRuolo(leggi('.claude/agents-spenti/critico.md')).frontmatter.spalla.attivo).toBe(false);
    expect((await o.disattivaRuolo('critico')).cambiato).toBe(false);
  });

  it('toglie il segnaposto "spento il …" lasciato dall\'assistente e rifiuta nomi strani o sconosciuti', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('.claude/agents/segretaria.md', 'spento il 2026-10-22\n');
    expect((await o.disattivaRuolo('segretaria')).cambiato).toBe(true);
    expect(esiste('.claude/agents/segretaria.md')).toBe(false);
    await expect(o.attivaRuolo('../CLAUDE')).rejects.toThrow(/Nome di ruolo non valido/);
    await expect(o.attivaRuolo('giardiniere')).rejects.toThrow(/Ruolo sconosciuto: "giardiniere"/);
    await expect(o.disattivaRuolo('giardiniere')).rejects.toThrow(/Ruolo sconosciuto/);
  });

  it('impostaAttivo tocca solo la riga attivo del blocco spalla', () => {
    const md = '---\nname: x\ndescription: attivo: no, questa è la descrizione\nspalla:\n  attivo: false\n  nota: attivo: true\n---\nCorpo attivo: false\n';
    expect(impostaAttivo(md, true)).toBe('---\nname: x\ndescription: attivo: no, questa è la descrizione\nspalla:\n  attivo: true\n  nota: attivo: true\n---\nCorpo attivo: false\n');
    expect(() => impostaAttivo('niente intestazione', true)).toThrow(/non inizia con l'intestazione/);
    expect(() => impostaAttivo('---\nname: x\n---\ncorpo', true)).toThrow(/manca la riga "attivo"/);
  });
});

describe('riepilogoProfilo ("cosa sai di me?")', () => {
  it('sui modelli appena seminati dice che non sa ancora niente ed elenca cosa manca', async () => {
    await onboarding().prepara();
    const r = await riepilogoProfilo(percorsi.cartellaLavoro);
    expect(r).toBe('Non so ancora niente di te: le presentazioni non sono finite.\nMancano ancora: Lavoro, Strumenti, Orari.');
  });

  it('con il profilo compilato elenca le direttive attive con la provenienza e salta quelle superate', async () => {
    const o = onboarding();
    await o.prepara();
    scrivi('profilo/UTENTE.md', UTENTE_DI_MARCO);
    scrivi('profilo/IDENTITA.md', '# IDENTITÀ\n- Nome dell\'assistente: Bruno\n- Utente: Marco Benassi, da chiamare "Marco", dare del tu\n- Lingua: italiano\n');
    const r = await o.riepilogoProfilo();
    expect(r.split('\n')).toEqual([
      'Mi chiamo Bruno.',
      'Tu: Marco Benassi, da chiamare "Marco", dare del tu.',
      'Ecco cosa so di te:',
      '- Lavoro: agente immobiliare indipendente a Bologna. Collabora con lo Studio Immobiliare Galvani. ~40 contatti attivi, 12 immobili in vendita. (dalle presentazioni, 22/10/2026)',
      '- Strumenti: WhatsApp (clienti), Gmail, Google Calendar, Immobiliare.it e Idealista (lead), Excel "Incarichi 2026". (dalle presentazioni, 22/10/2026)',
      '- Riepiloghi in massimo 3 punti; il dettaglio in un file in lavoro/. (da una conversazione, 24/10/2026)',
      'Nel tempo ho aggiornato una preferenza: la versione vecchia resta segnata come superata.',
    ]);
    expect(r).not.toContain('Preferisce riepiloghi completi');
  });

  it('leggiDirettive capisce commenti su più righe, continuazioni e stato superato', () => {
    const d = leggiDirettive(UTENTE_DI_MARCO + '- Nota senza commento\n  che continua a capo\n');
    expect(d).toHaveLength(5);
    expect(d[3]).toMatchObject({ stato: 'superato', superatoIl: '2026-10-24', fonte: 'onboarding', osservato: '2026-10-22' });
    expect(d[4]).toMatchObject({ testo: 'Nota senza commento che continua a capo', stato: 'attivo', daCompilare: false });
  });
});
