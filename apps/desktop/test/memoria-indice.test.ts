import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger, Percorsi } from '../src/nucleo/contratti.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import {
  CARATTERI_PER_BLOCCO,
  creaMemoryService,
  espressioniFts,
  spezzaInBlocchi,
  type MemoryServiceEsteso,
} from '../src/nucleo/memoria/index.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };
const GIORNO_MS = 86_400_000;

let radice: string;
let percorsi: Percorsi;
let servizi: MemoryServiceEsteso[] = [];

/** Scrive un file relativo alla cartella di lavoro; `etaGiorni` sposta indietro la data di modifica. */
function scrivi(rel: string, contenuto: string, etaGiorni = 0): void {
  const assoluto = path.join(percorsi.cartellaLavoro, rel);
  fs.mkdirSync(path.dirname(assoluto), { recursive: true });
  fs.writeFileSync(assoluto, contenuto, 'utf8');
  if (etaGiorni > 0) {
    const quando = new Date(Date.now() - etaGiorni * GIORNO_MS);
    fs.utimesSync(assoluto, quando, quando);
  }
}

/** La memoria di Marco al 24 ottobre (docs/03 §4), ridotta. */
function semina(): void {
  scrivi('profilo/IDENTITA.md', '# IDENTITÀ\n- Nome dell\'assistente: Bruno\n- Utente: Marco Benassi, dare del tu\n');
  scrivi('profilo/UTENTE.md', '# UTENTE\n- Lavoro: agente immobiliare indipendente a Bologna.\n- Strumenti: WhatsApp, Gmail, Google Calendar.\n');
  scrivi(
    'memoria/MEMORIA.md',
    '# MEMORIA — indice\n- [cliente] Sig.ra Lamberti (acquirente): trilocale via Saragozza → temi/cliente-lamberti.md\n- [incarico] Dott. Ferri, appartamento via Mazzini 14 → temi/incarico-via-mazzini.md\n',
  );
  scrivi('memoria/agenda.md', '# AGENDA\n- [ ] 2026-10-31 10:30 — Seconda visita via Saragozza con la sig.ra Lamberti — per Lamberti\n');
  scrivi(
    'memoria/temi/cliente-lamberti.md',
    [
      '---',
      'type: cliente',
      'modified: 2026-10-24T18:40:00+02:00',
      'tags: [acquirente, saragozza, trilocale]',
      '---',
      '# Sig.ra Lamberti — acquirente, trilocale via Saragozza',
      '- Contatto: WhatsApp. Dare del lei. Decide insieme al marito (Giorgio).',
      '- 2026-10-20 prima visita via Saragozza 41: piaciuto il terrazzo, dubbio sul prezzo e sulle spese condominiali.',
      "- L'autoclave del palazzo è da revisionare: chiedere all'amministratore.",
      '## Prossimi passi',
      '- Portare alla visita: spese condominiali, planimetria, APE.',
      '',
    ].join('\n'),
  );
  scrivi(
    'memoria/temi/incarico-via-mazzini.md',
    '# Dott. Ferri — appartamento via Mazzini 14\n- Proprietario: dott. Ferri, preferisce le telefonate alle 13:00 perché la mattina è in studio.\n',
  );
  scrivi('memoria/diario/2026-10-24.md', '# Diario 2026-10-24\n- 12:41 [telegram] la Lamberti ha richiamato, sabato alle dieci e mezza\n');
  scrivi('memoria/archivio/geometra-sanna.md', '# Geometra Sanna — pratica chiusa\n- Perizia per via Andrea Costa 3, chiusa a marzo.\n', 400);
  scrivi('lavoro/messaggi/bozza.md', '# Bozza\nzebrafantastica non è memoria.\n');
}

function servizio(extra: Partial<Parameters<typeof creaMemoryService>[0]> = {}): MemoryServiceEsteso {
  const s = creaMemoryService({ percorsi, logger, ...extra });
  servizi.push(s);
  return s;
}

beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-memoria-'));
  process.env.SPALLA_HOME = radice;
  percorsi = calcolaPercorsi();
  semina();
});

afterEach(async () => {
  for (const s of servizi) await s.ferma();
  servizi = [];
  delete process.env.SPALLA_HOME;
  fs.rmSync(radice, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('indice e ricerca in italiano', () => {
  it('trova Lamberti, autoclave e "via Saragozza" indipendentemente da maiuscole e accenti', async () => {
    const s = servizio();
    await s.avvia();
    expect(fs.existsSync(percorsi.indiceMemoria)).toBe(true);

    const lamberti = await s.cerca('Lamberti');
    expect(lamberti.length).toBeGreaterThan(0);
    expect(lamberti.map((r) => r.file)).toContain('memoria/temi/cliente-lamberti.md');
    expect(lamberti[0]!.modificato).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const autoclave = await s.cerca('AUTOCLAVE');
    expect(autoclave[0]!.file).toBe('memoria/temi/cliente-lamberti.md');
    expect(autoclave[0]!.estratto).toContain('autoclave');
    expect(autoclave[0]!.titolo).toContain('Lamberti');

    const saragozza = await s.cerca('via Saragozza');
    expect(saragozza[0]!.file).toBe('memoria/temi/cliente-lamberti.md');
    expect(saragozza[0]!.estratto).toContain('Saragozza');

    // Accenti: senza e con.
    expect((await s.cerca('perche')).map((r) => r.file)).toContain('memoria/temi/incarico-via-mazzini.md');
    expect((await s.cerca('Perché')).map((r) => r.file)).toContain('memoria/temi/incarico-via-mazzini.md');
  });

  it('spezza per intestazioni: la sotto-sezione ha il suo blocco e porta il titolo del file', async () => {
    const s = servizio();
    const r = await s.cerca('planimetria APE');
    expect(r[0]!.file).toBe('memoria/temi/cliente-lamberti.md');
    expect(r[0]!.titolo).toBe('Sig.ra Lamberti — acquirente, trilocale via Saragozza › Prossimi passi');
    expect(r[0]!.estratto).toContain('planimetria');
  });

  it('le etichette del frontmatter sono cercabili', async () => {
    const s = servizio();
    const r = await s.cerca('trilocale acquirente');
    expect(r.map((x) => x.file)).toContain('memoria/temi/cliente-lamberti.md');
  });

  it('l\'archivio è indicizzato (mai caricato, ma cercabile)', async () => {
    const s = servizio();
    const r = await s.cerca('geometra Sanna');
    expect(r[0]!.file).toBe('memoria/archivio/geometra-sanna.md');
  });

  it('non indicizza lavoro/ né file nascosti', async () => {
    scrivi('memoria/.bozza-nascosta.md', '# Nascosto\nparolasegretissima\n');
    const s = servizio();
    expect(await s.cerca('zebrafantastica')).toEqual([]);
    expect(await s.cerca('parolasegretissima')).toEqual([]);
  });

  it('il contesto del file resta cercabile con peso basso: "Lamberti prossimi passi" trova la sotto-sezione', async () => {
    const s = servizio();
    const r = await s.cerca('Lamberti prossimi passi');
    expect(r[0]!.file).toBe('memoria/temi/cliente-lamberti.md');
    expect(r[0]!.titolo).toContain('Prossimi passi');
  });

  it('precisione prima, richiamo poi: con tutte le parole presenti il risultato è in testa; se una manca si allarga', async () => {
    const s = servizio();
    const r = await s.cerca('Ferri telefonate');
    expect(r[0]!.file).toBe('memoria/temi/incarico-via-mazzini.md');
    const largo = await s.cerca('Ferri parolainesistente');
    expect(largo.map((x) => x.file)).toContain('memoria/temi/incarico-via-mazzini.md');
  });

  it('k limita i risultati e il predefinito è 6', async () => {
    for (let i = 0; i < 8; i++) scrivi(`memoria/temi/caldaia-${i}.md`, `# Caldaia ${i}\nLa caldaia numero ${i} va revisionata.\n`);
    const s = servizio();
    expect(await s.cerca('caldaia')).toHaveLength(6);
    expect(await s.cerca('caldaia', 2)).toHaveLength(2);
    expect(await s.cerca('caldaia', 20)).toHaveLength(8);
  });

  it('domanda vuota o solo simboli → nessun risultato, nessun errore', async () => {
    const s = servizio();
    expect(await s.cerca('')).toEqual([]);
    expect(await s.cerca('*** ( ) : ^')).toEqual([]);
    expect(await s.cerca('"')).toEqual([]);
  });

  it('un file rimosso esce dall\'indice alla sincronizzazione', async () => {
    const s = servizio();
    await s.avvia();
    fs.rmSync(path.join(percorsi.cartellaLavoro, 'memoria/temi/cliente-lamberti.md'));
    await s.sincronizza();
    const r = await s.cerca('autoclave');
    expect(r.every((x) => x.file !== 'memoria/temi/cliente-lamberti.md')).toBe(true);
  });

  it('un file modificato viene re-indicizzato', async () => {
    const s = servizio();
    await s.avvia();
    expect(await s.cerca('gazebo')).toEqual([]);
    scrivi('memoria/temi/incarico-via-mazzini.md', '# Dott. Ferri\n- Ha un gazebo in giardino da vendere a parte.\n');
    await s.sincronizza();
    expect((await s.cerca('gazebo'))[0]!.file).toBe('memoria/temi/incarico-via-mazzini.md');
  });
});

describe('bonus di recenza', () => {
  it('a parità di testo, il ricordo di oggi batte quello di sei mesi fa', async () => {
    const testo = '# Caldaia\nLa caldaia del condominio va revisionata entro novembre.\n';
    scrivi('memoria/temi/caldaia-nuova.md', testo);
    scrivi('memoria/temi/caldaia-vecchia.md', testo, 200);
    const s = servizio();
    const r = await s.cerca('caldaia revisionata');
    expect(r.map((x) => x.file)).toEqual(['memoria/temi/caldaia-nuova.md', 'memoria/temi/caldaia-vecchia.md']);
    expect(r[0]!.punteggio).toBeGreaterThan(r[1]!.punteggio);
    // Oltre i 30 giorni il bonus è zero; dentro i 30 cresce verso oggi.
    expect(r[0]!.punteggio / r[1]!.punteggio).toBeGreaterThan(1.4);
  });

  it('il bonus è lineare nei 30 giorni: 15 giorni fa vale meno di oggi e più di 60 giorni fa', async () => {
    const testo = '# Caldaia\nLa caldaia del condominio va revisionata entro novembre.\n';
    scrivi('memoria/temi/c-oggi.md', testo);
    scrivi('memoria/temi/c-meta.md', testo, 15);
    scrivi('memoria/temi/c-vecchia.md', testo, 60);
    const s = servizio();
    const r = await s.cerca('caldaia');
    expect(r.map((x) => x.file)).toEqual(['memoria/temi/c-oggi.md', 'memoria/temi/c-meta.md', 'memoria/temi/c-vecchia.md']);
  });
});

describe('riparazione e ricostruzione', () => {
  it('ricostruisce da zero dopo la cancellazione del file sqlite', async () => {
    const s = servizio();
    await s.avvia();
    // Windows non cancella un file aperto: lì il file sparisce solo ad app chiusa.
    if (process.platform === 'win32') await s.ferma();
    fs.rmSync(percorsi.indiceMemoria, { force: true });
    expect(fs.existsSync(percorsi.indiceMemoria)).toBe(false);
    await s.ricostruisciIndice();
    expect(fs.existsSync(percorsi.indiceMemoria)).toBe(true);
    expect((await s.cerca('Lamberti')).length).toBeGreaterThan(0);
    const stato = await s.statoIndice();
    expect(stato.file).toBe(8);
    expect(stato.blocchi).toBeGreaterThan(8);
  });

  it('ripara da solo un file sqlite corrotto all\'avvio', async () => {
    fs.mkdirSync(path.dirname(percorsi.indiceMemoria), { recursive: true });
    fs.writeFileSync(percorsi.indiceMemoria, 'questo non è un database sqlite, è spazzatura lunga abbastanza da avere un header\n'.repeat(20));
    const s = servizio();
    await s.avvia();
    expect(logger.avviso).toHaveBeenCalledWith('memoria.indice_riparato', expect.anything());
    expect((await s.cerca('autoclave'))[0]!.file).toBe('memoria/temi/cliente-lamberti.md');
  });

  it('riapre l\'indice esistente senza re-indicizzare i file non cambiati', async () => {
    const primo = servizio();
    await primo.avvia();
    await primo.ferma();
    vi.clearAllMocks();
    const secondo = servizio();
    await secondo.avvia();
    expect(logger.info).not.toHaveBeenCalledWith('memoria.sincronizzata', expect.anything());
    expect((await secondo.cerca('Lamberti')).length).toBeGreaterThan(0);
  });

  it('funziona anche se la cartella di lavoro non esiste ancora', async () => {
    fs.rmSync(percorsi.cartellaLavoro, { recursive: true, force: true });
    const s = servizio();
    await s.avvia();
    expect(await s.cerca('Lamberti')).toEqual([]);
    expect((await s.statoIndice()).file).toBe(0);
  });
});

describe('espressioniFts (sanificazione della domanda)', () => {
  it('quota ogni parola: AND stretto, OR largo con prefisso sulle parole lunghe', () => {
    const e = espressioniFts('Lamberti autoclave via')!;
    expect(e.stretta).toBe('("Lamberti" AND "autoclave" AND "via")');
    expect(e.larga).toBe('("Lamberti"* OR "autoclave"* OR "via")');
    expect(e.termini).toEqual(['Lamberti', 'autoclave', 'via']);
  });

  it('frasi tra virgolette, esclusioni con - e NOT, operatori espliciti', () => {
    expect(espressioniFts('"via Saragozza" -mazzini')!.stretta).toBe('("via Saragozza") NOT "mazzini"');
    expect(espressioniFts('“via Saragozza” NOT mazzini')!.larga).toBe('("via Saragozza") NOT "mazzini"');
    const or = espressioniFts('Lamberti OR Conti')!;
    expect(or.stretta).toBe('("Lamberti" OR "Conti")');
    expect(or.larga).toBe('("Lamberti"* OR "Conti"*)');
    expect(espressioniFts('Lamberti AND Conti')!.larga).toBe('("Lamberti"* AND "Conti"*)');
  });

  it('la sintassi di FTS5 e di SQL non passa', () => {
    const e = espressioniFts(`lamberti* OR (titolo:x) NEAR("a" "b") '; DROP TABLE blocchi; --`)!;
    expect(e.stretta).toBe('("lamberti" OR "titolo" AND "x" AND "NEAR" AND "a" AND "b" AND "DROP" AND "TABLE" AND "blocchi")');
    expect(e.stretta).not.toMatch(/[:*;()]/.source.replace('()', ''));
    expect(e.stretta.includes('--')).toBe(false);
  });

  it('apostrofi e punteggiatura separano le parole come fa unicode61', () => {
    expect(espressioniFts("l'autoclave di Sig.ra Lamberti")!.termini).toEqual(['l', 'autoclave', 'di', 'Sig', 'ra', 'Lamberti']);
  });

  it('null se non c\'è nessuna parola positiva', () => {
    expect(espressioniFts('')).toBeNull();
    expect(espressioniFts('-mazzini')).toBeNull();
    expect(espressioniFts('( ) * : AND OR')).toBeNull();
  });
});

describe('spezzaInBlocchi', () => {
  it('un blocco per sezione, con titolo "File › sezione" per le sotto-sezioni', () => {
    const b = spezzaInBlocchi('---\ntype: cliente\ntags:\n  - a\n  - b\n---\n# Titolo\nintro\n## Parte due\ntesto due\n### Parte tre\ntesto tre\n', 'memoria/temi/x.md');
    expect(b.map((x) => x.titolo)).toEqual(['Titolo', 'Parte due', 'Parte tre']);
    expect(b.map((x) => x.contesto)).toEqual(['', 'Titolo', 'Titolo']);
    expect(b[0]!.etichette).toBe('cliente a b');
    expect(b[1]!.etichette).toBe('');
    expect(b.map((x) => x.ordine)).toEqual([0, 1, 2]);
  });

  it('senza intestazioni usa il nome del file; le intestazioni dentro ``` non contano', () => {
    const b = spezzaInBlocchi('solo testo\n```\n# non è un titolo\n```\n', 'memoria/temi/cliente-conti.md');
    expect(b).toHaveLength(1);
    expect(b[0]!.titolo).toBe('cliente conti');
    expect(b[0]!.contesto).toBe('');
  });

  it('una sezione lunga è spezzata in pezzi ≤ 1.600 caratteri sui confini dei paragrafi', () => {
    const paragrafo = 'Riga di testo abbastanza lunga da contare qualcosa nel blocco. '.repeat(10).trim(); // ~640 caratteri
    const b = spezzaInBlocchi(`# Lungo\n${Array.from({ length: 10 }, () => paragrafo).join('\n\n')}\n`, 'memoria/temi/lungo.md');
    expect(b.length).toBeGreaterThan(3);
    for (const x of b) {
      expect(x.testo.length).toBeLessThanOrEqual(CARATTERI_PER_BLOCCO);
      expect(x.titolo).toBe('Lungo');
    }
    expect(b.map((x) => x.testo).join('\n\n')).toBe(Array.from({ length: 10 }, () => paragrafo).join('\n\n'));
  });

  it('file vuoto → nessun blocco', () => {
    expect(spezzaInBlocchi('', 'memoria/temi/vuoto.md')).toEqual([]);
    expect(spezzaInBlocchi('---\ntype: x\n---\n', 'memoria/temi/vuoto.md')).toEqual([]);
  });
});
