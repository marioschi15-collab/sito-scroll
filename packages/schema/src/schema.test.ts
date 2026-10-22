import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cartellaTemplates,
  ConfigSchema,
  CONFIG_PREDEFINITA,
  ErroreSchema,
  parseDomande,
  parseRuolo,
  provaParseDomande,
  provaParseRuolo,
  RisposteSchema,
  StatoOnboardingSchema,
} from './index.js';

const RUOLO_OK = `---
name: prova
description: Un ruolo di prova che serve a verificare lo schema, usalo quando serve una prova.
tools: Read, Grep
model: sonnet
maxTurns: 5
memory: project
spalla:
  etichetta: Prova
  ruolo: controllo
  attivo: true
  canali: [desktop]
  costo_stimato: basso
  creato_da: onboarding
  creato_il: 2026-10-22
  spiegazione_utente: "Serve solo per i test automatici."
  puo_fare_da_solo: "leggere"
  chiede_sempre: "tutto il resto"
---
Sei un ruolo di prova. Leggi i file e rispondi al coordinatore con un riepilogo breve, senza preamboli.
`;

describe('parseRuolo', () => {
  it('accetta un ruolo valido e normalizza tools in lista', () => {
    const r = parseRuolo(RUOLO_OK);
    expect(r.frontmatter.tools).toEqual(['Read', 'Grep']);
    expect(r.corpo).toMatch(/^Sei un ruolo di prova/);
  });

  it('rifiuta frontmatter che non inizia alla prima riga', () => {
    const esito = provaParseRuolo(`\n${RUOLO_OK}`);
    expect(esito.ok).toBe(false);
  });

  it('rifiuta strumenti, modelli e campi sconosciuti', () => {
    expect(provaParseRuolo(RUOLO_OK.replace('tools: Read, Grep', 'tools: Read, Shell')).ok).toBe(false);
    expect(provaParseRuolo(RUOLO_OK.replace('model: sonnet', 'model: gpt')).ok).toBe(false);
    const typo = provaParseRuolo(RUOLO_OK.replace('maxTurns: 5', 'maxturns: 5'));
    expect(typo.ok).toBe(false);
    if (!typo.ok) expect(typo.problemi.join(' ')).toMatch(/maxturns/);
  });

  it('lancia ErroreSchema con i problemi in italiano', () => {
    try {
      parseRuolo(RUOLO_OK.replace('name: prova', 'name: Prova Bella'));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErroreSchema);
      expect((e as ErroreSchema).problemi[0]).toMatch(/^name: /);
    }
  });
});

describe('parseDomande', () => {
  it('rifiuta un Markdown senza blocco yaml o con due blocchi', () => {
    expect(provaParseDomande('# niente').ok).toBe(false);
    const due = '```yaml\nversione: 1\ndomande: []\n```\n\n```yaml\nversione: 1\n```\n';
    const esito = provaParseDomande(due);
    expect(esito.ok).toBe(false);
    if (!esito.ok) expect(esito.problemi[0]).toMatch(/trovati 2/);
  });

  it('rifiuta una banca senza le comuni Q1-Q6', () => {
    const md = '```yaml\nversione: 1\ndomande:\n  - id: Q1\n    fase: S1\n    ramo: comune\n    tipo: testo\n    testo: "Come ti chiami?"\n    scrive_in: ["profilo/IDENTITA.md#utente"]\n```\n';
    const esito = provaParseDomande(md);
    expect(esito.ok).toBe(false);
    if (!esito.ok) expect(esito.problemi.some((p) => p.includes('manca la domanda comune Q2'))).toBe(true);
  });

  it('legge la banca vera dei modelli', () => {
    const banca = parseDomande(readFileSync(path.join(cartellaTemplates(), 'onboarding', 'domande.md'), 'utf8'));
    expect(banca.versione).toBe(1);
    expect(banca.domande.length).toBeGreaterThan(20);
  });
});

describe('ConfigSchema', () => {
  it('parse({}) dà la configurazione predefinita completa (docs/05 §4.4)', () => {
    expect(CONFIG_PREDEFINITA).toEqual({
      cervello: { modalita: 'chiave_api', livello: 'equilibrato', tetto_mensile_eur: 25 },
      telegram: { attivo: false, bot: null, risposte_vocali: false },
      voce: { desktop: 'spento', modello_stt: 'da_scaricare', hotkey: 'Alt+Space' },
      orari: { silenzio_da: '21:00', silenzio_a: '08:00', domenica: 'silenzio' },
      brief: { attivo: false, ora: '08:00', canale: 'desktop' },
      riordino_notturno: { attivo: true, ora: '03:00' },
    });
  });

  it('accetta l\'esempio di Marco e rifiuta orari malformati', () => {
    const marco = ConfigSchema.parse({
      cervello: { modalita: 'chiave_api', livello: 'equilibrato', tetto_mensile_eur: 25 },
      telegram: { attivo: true, bot: '@spalla_7k3p_bot', risposte_vocali: false },
      voce: { desktop: 'push_to_talk', modello_stt: 'da_scaricare', hotkey: 'Alt+Space' },
      orari: { silenzio_da: '21:00', silenzio_a: '08:00', domenica: 'silenzio' },
      brief: { attivo: true, ora: '08:00', canale: 'telegram' },
      riordino_notturno: { attivo: true, ora: '03:00' },
    });
    expect(marco.telegram.bot).toBe('@spalla_7k3p_bot');
    expect(ConfigSchema.safeParse({ orari: { silenzio_da: '9pm' } }).success).toBe(false);
    expect(ConfigSchema.safeParse({ cervello: { tetto_mensile_eur: null } }).data?.cervello.tetto_mensile_eur).toBeNull();
  });
});

describe('stato.json e RISPOSTE.json', () => {
  const rituale = readFileSync(path.join(cartellaTemplates(), 'onboarding', 'PRIMO-AVVIO.md'), 'utf8');
  const blocchiJson = [...rituale.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1] ?? ''));

  it('gli esempi scritti nel rituale sono validi per gli schemi', () => {
    expect(blocchiJson).toHaveLength(2);
    const stato = StatoOnboardingSchema.parse(blocchiJson[0]);
    expect(stato.fase).toBe('S3');
    expect(stato.rinviato).toBe(false);
    const risposte = RisposteSchema.parse(blocchiJson[1]);
    expect(risposte.durata_minuti).toBe(11);
    expect(risposte.risposte.find((r) => r.id === 'S4')?.scelta).toBe(1);
  });

  it('una risposta senza testo né scelta è rifiutata', () => {
    const esito = RisposteSchema.safeParse({ completato_il: '2026-10-22T18:41:00+02:00', durata_minuti: 11, risposte: [{ id: 'Q1' }] });
    expect(esito.success).toBe(false);
  });

  it('accetta l\'estratto di docs/05 §4.7', () => {
    const estratto = {
      completato_il: '2026-10-22T18:41:00+02:00',
      durata_minuti: 11,
      risposte: [
        { id: 'Q1', testo: 'Marco, del tu' },
        { id: 'Q4', testo: 'Venditore / agente', ramo: 'venditore' },
        { id: 'Q5', testo: ['Rispondere ai lead', 'Follow-up dopo visite', 'Documenti da raccogliere'] },
        { id: 'S4', scelta: 1, file: 'lavoro/messaggi/2026-10-22-follow-up-3-contatti.md' },
      ],
    };
    expect(RisposteSchema.safeParse(estratto).success).toBe(true);
  });
});
