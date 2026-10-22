import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { comuni } from '@spalla/it-copy';
import { describe, expect, it } from 'vitest';
import {
  cartellaTemplates,
  domandePerRamo,
  haSegnapostoDaCompilare,
  parseDomande,
  parseRuolo,
  RAMI,
  RUOLI_CATALOGO,
  SKILL_CATALOGO,
  separaFrontmatter,
  TETTI_MEMORIA,
} from './index.js';

const T = cartellaTemplates();
const leggi = (...p: string[]) => readFileSync(path.join(T, ...p), 'utf8');
const righe = (testo: string) => testo.split('\n').length;

/** Tutti i file di testo dei modelli, ricorsivamente. */
function tuttiIFile(cartella = T): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(cartella)) {
    const p = path.join(cartella, nome);
    if (statSync(p).isDirectory()) out.push(...tuttiIFile(p));
    else out.push(p);
  }
  return out;
}

/** Gergo vietato verso l'utente; "agente" è ammesso solo come mestiere (agente di commercio / immobiliare / assicurativo). */
const GERGO = /\b(agenti|prompt|token|MCP|hook|frontmatter)\b|(?<!Venditore \/ )\bagente\b(?! (di commercio|immobiliar|assicurativ))/i;

describe('cartella dei modelli', () => {
  it('viene trovata e contiene lo scheletro di ~/Spalla', () => {
    for (const p of [
      'CLAUDE.md',
      '.claude/settings.json',
      '.claude/rules/confini.md',
      '.claude/rules/canali.md',
      '.claude/agents/.gitkeep',
      'profilo/IDENTITA.md',
      'profilo/ANIMA.md',
      'profilo/UTENTE.md',
      'profilo/SQUADRA.md',
      'memoria/MEMORIA.md',
      'memoria/agenda.md',
      'memoria/temi/.gitkeep',
      'memoria/diario/.gitkeep',
      'memoria/archivio/.gitkeep',
      'lavoro/messaggi/.gitkeep',
      'lavoro/riferimenti/.gitkeep',
      'lavoro/preventivi/.gitkeep',
      'lavoro/liste/.gitkeep',
      'lavoro/report/.gitkeep',
      'lavoro/in-arrivo/.gitkeep',
      'lavoro/cestino/.gitkeep',
      'onboarding/PRIMO-AVVIO.md',
      'onboarding/domande.md',
    ]) {
      expect(existsSync(path.join(T, p)), p).toBe(true);
    }
  });

  it('usa solo i quattro segnaposto previsti', () => {
    for (const f of tuttiIFile()) {
      const testo = readFileSync(f, 'utf8');
      for (const m of testo.matchAll(/\{\{([A-Z_]+)\}\}/g)) {
        expect(['DATA_OGGI', 'NOME_PRODOTTO', 'NOME_UTENTE', 'MESTIERE'], `${f}: ${m[0]}`).toContain(m[1]);
      }
    }
  });
});

describe('ruoli in .claude/agents-spenti', () => {
  const cartella = path.join(T, '.claude', 'agents-spenti');
  const file = readdirSync(cartella).filter((f) => f.endsWith('.md')).sort();

  it('contiene esattamente gli 8 ruoli del catalogo', () => {
    expect(file.map((f) => f.replace(/\.md$/, ''))).toEqual([...RUOLI_CATALOGO].sort());
  });

  for (const f of file) {
    it(`${f} è un ruolo valido`, () => {
      const ruolo = parseRuolo(readFileSync(path.join(cartella, f), 'utf8'));
      expect(ruolo.frontmatter.name).toBe(f.replace(/\.md$/, ''));
      expect(ruolo.frontmatter.memory).toBe('project');
      expect(ruolo.frontmatter.model).toBeDefined();
      expect(ruolo.frontmatter.maxTurns).toBeDefined();
      expect(ruolo.frontmatter.spalla.attivo).toBe(false);
      expect(ruolo.frontmatter.spalla.creato_il).toBe('{{DATA_OGGI}}');
      // il corpo è generico: segnaposto da compilare, niente "Marco"
      expect(haSegnapostoDaCompilare(ruolo.corpo)).toBe(true);
      expect(ruolo.corpo).not.toMatch(/\bMarco\b/);
      // i testi mostrati all'utente non hanno gergo
      for (const campo of ['spiegazione_utente', 'puo_fare_da_solo', 'chiede_sempre', 'etichetta'] as const) {
        expect(ruolo.frontmatter.spalla[campo], `${f} spalla.${campo}`).not.toMatch(GERGO);
      }
      // un solo nome per ruolo: quello delle schede di permesso e di SQUADRA.md (comuni.ruoli di @spalla/it-copy)
      expect(ruolo.frontmatter.spalla.etichetta, `${f} etichetta`).toBe(comuni.ruoli[ruolo.frontmatter.name]);
      // le skill citate esistono
      for (const s of ruolo.frontmatter.skills ?? []) {
        expect(existsSync(path.join(T, '.claude', 'skills', s, 'SKILL.md')), `skill ${s}`).toBe(true);
      }
      // ogni ruolo termina con il blocco di ritorno al coordinatore (o il log, per l'archivista)
      expect(ruolo.corpo).toMatch(/DOMANDE PER L'UTENTE|RIORDINO\.log/);
    });
  }

  it('rispetta il catalogo di docs/04 §4 nei punti chiave', () => {
    const leggiRuolo = (n: string) => parseRuolo(readFileSync(path.join(cartella, `${n}.md`), 'utf8')).frontmatter;
    const archivista = leggiRuolo('archivista');
    expect(archivista.model).toBe('haiku');
    expect(archivista.omitClaudeMd).toBe(true);
    expect(archivista.spalla.canali).toEqual(['sistema']);
    const critico = leggiRuolo('critico');
    expect(critico.disallowedTools).toContain('Write');
    expect(critico.tools).not.toContain('Write');
    const copywriter = leggiRuolo('copywriter');
    expect(copywriter.skills).toEqual(['follow-up-post-visita', 'risposta-lead-portale']);
    expect(copywriter.disallowedTools).toEqual(['Bash']);
    const segretaria = leggiRuolo('segretaria');
    expect(segretaria.skills).toEqual(['agenda-giorno', 'promemoria']);
    const analista = leggiRuolo('analista');
    expect(analista.tools).toContain('Bash');
    for (const n of ['segretaria', 'copywriter', 'contabile', 'cercatore-clienti', 'analista', 'critico', 'preventivista']) {
      expect(leggiRuolo(n).model, n).toBe('sonnet');
    }
  });
});

describe('skill in .claude/skills', () => {
  it('ci sono le 6 skill del catalogo, con name e description', () => {
    const cartelle = readdirSync(path.join(T, '.claude', 'skills')).sort();
    expect(cartelle).toEqual([...SKILL_CATALOGO].sort());
    for (const c of cartelle) {
      const parti = separaFrontmatter(leggi('.claude', 'skills', c, 'SKILL.md'));
      expect(parti, c).not.toBeNull();
      expect(parti!.yaml).toMatch(new RegExp(`^name: ${c}$`, 'm'));
      expect(parti!.yaml).toMatch(/^description: .{30,}/m);
      expect(parti!.corpo.length).toBeGreaterThan(300);
    }
  });
});

describe('onboarding/domande.md', () => {
  const banca = parseDomande(leggi('onboarding', 'domande.md'));

  it('ha le domande comuni Q1-Q14 e S4', () => {
    const comuni = banca.domande.filter((d) => d.ramo === 'comune').map((d) => d.id);
    for (const id of ['Q1', 'Q2', 'Q3', 'Q4', 'Q4a', 'Q5', 'Q6', 'S4', 'Q7', 'Q8', 'Q9', 'Q10', 'Q10b', 'Q11', 'Q12', 'Q13', 'Q14']) {
      expect(comuni, id).toContain(id);
    }
  });

  it('ogni ramo ha la sua Q4a e la sua Q5, con chip di ramo', () => {
    for (const ramo of RAMI.filter((r) => r !== 'comune')) {
      const q4a = banca.domande.find((d) => d.ramo === ramo && d.id === 'Q4a');
      const q5 = banca.domande.find((d) => d.ramo === ramo && d.id === 'Q5');
      expect(q4a, `${ramo} Q4a`).toBeDefined();
      expect(q5, `${ramo} Q5`).toBeDefined();
      expect(q5!.tipo).toBe('chip_multiple');
      expect(q5!.chip.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('ha le chip esatte di docs/05 §3.1 per Q1-Q4', () => {
    const q = (id: string) => banca.domande.find((d) => d.ramo === 'comune' && d.id === id)!;
    expect(q('Q1').chip).toEqual(['Del tu', 'Del lei']);
    expect(q('Q2').chip).toEqual(['Suggeriscimi 3 nomi', 'Lo scelgo io']);
    expect(q('Q3').chip).toEqual(['Diretto e pratico', 'Caldo e informale', 'Formale', "Un po' di ironia"]);
    expect(q('Q4').chip[0]).toBe('Freelance / consulente');
    expect(q('Q7').chip).toEqual(['Perfetto', 'Più corto', 'Più formale', 'Riscrivi']);
    expect(q('Q10b').chip).toEqual(['Sì alle 8', 'Sì alle 8:30', 'Orario mio', 'No']);
  });

  it('ha tre primi colpi e una squadra per ogni ramo', () => {
    for (const ramo of RAMI) {
      expect(banca.primi_colpi?.[ramo], `primi colpi ${ramo}`).toHaveLength(3);
      expect(banca.squadre?.[ramo].accesi.length, `squadra ${ramo}`).toBeLessThanOrEqual(3);
    }
    expect(banca.squadre?.venditore.accesi).toEqual(['segretaria', 'copywriter', 'cercatore-clienti']);
    expect(banca.squadre?.freelance.accesi).toEqual(['copywriter', 'preventivista', 'contabile']);
    expect(banca.squadre?.titolare.accesi).toEqual(['segretaria', 'contabile', 'copywriter']);
    expect(banca.squadre?.artigiano.accesi[0]).toBe('preventivista');
    expect(banca.squadre?.dipendente.accesi).toEqual(['segretaria', 'copywriter']);
    expect(banca.squadre?.sempre.map((s) => s.ruolo)).toEqual(['critico', 'archivista']);
  });

  it('le intestazioni dei riquadri stanno in 12 caratteri e le domande sono senza gergo', () => {
    for (const d of banca.domande) {
      if (d.intestazione) expect(d.intestazione.length, d.intestazione).toBeLessThanOrEqual(12);
      expect(d.testo, `${d.ramo}/${d.id}`).not.toMatch(GERGO);
      for (const c of d.chip) expect(c, `${d.ramo}/${d.id} chip`).not.toMatch(GERGO);
    }
  });

  it('domandePerRamo sostituisce le comuni con quelle del ramo', () => {
    const venditore = domandePerRamo(banca, 'venditore');
    expect(venditore.find((d) => d.id === 'Q5')?.ramo).toBe('venditore');
    expect(venditore.find((d) => d.id === 'Q1')?.ramo).toBe('comune');
    expect(venditore.some((d) => d.id === 'Q4b')).toBe(true);
    expect(domandePerRamo(banca, 'dipendente').some((d) => d.id === 'Q4c')).toBe(false);
  });
});

describe('onboarding/PRIMO-AVVIO.md', () => {
  const rituale = leggi('onboarding', 'PRIMO-AVVIO.md');
  it('contiene le istruzioni chiave del rituale', () => {
    for (const frase of [
      'La richiesta dell\'utente viene sempre prima',
      'Massimo sette domande',
      'Vai con i consigliati',
      'onboarding/stato.json',
      'RISPOSTE.json',
      '.claude/agents-spenti/',
      '{{NOME_UTENTE}}',
      '{{MESTIERE}}',
      '# Presentazioni completate il AAAA-MM-GG',
      '[[APRI:TELEGRAM]]',
      'Regola dei tre',
      'Ecco cosa ho scritto di te',
      'come vuoi che ti chiami? E ci diamo del tu? [Del tu] [Del lei]',
    ]) {
      expect(rituale).toContain(frase);
    }
  });

  it('non chiede mai comandi di shell (la chiusura la fa l\'app, non `rm`)', () => {
    expect(rituale).not.toMatch(/\brm\b/);
    expect(rituale).not.toMatch(/comando di shell/);
    expect(rituale).toMatch(/Accendi allo stesso modo .* anche critico\.md e archivista\.md/);
  });
});

describe('CLAUDE.md, settings.json, profilo e memoria', () => {
  it('CLAUDE.md importa i sei file sempre caricati e sta sotto il tetto', () => {
    const claude = leggi('CLAUDE.md');
    for (const imp of ['@profilo/IDENTITA.md', '@profilo/ANIMA.md', '@profilo/UTENTE.md', '@profilo/SQUADRA.md', '@memoria/MEMORIA.md', '@memoria/agenda.md']) {
      expect(claude).toMatch(new RegExp(`^${imp.replace(/[./]/g, '\\$&')}$`, 'm'));
    }
    expect(righe(claude)).toBeLessThanOrEqual(TETTI_MEMORIA.CLAUDE_MD_RIGHE);
    expect(claude).toContain('## Memoria');
    expect(claude).toContain('## Squadra: quando delegare');
    expect(claude).toContain('## Non memorizzare');
  });

  it('settings.json ha le regole con "./**" e mai percorsi assoluti a una barra', () => {
    const s = JSON.parse(leggi('.claude', 'settings.json')) as {
      permissions: { allow: string[]; ask: string[]; deny: string[] };
      env: Record<string, string>;
    };
    expect(s.permissions.allow).toEqual([
      'Read(./**)', 'Write(./**)', 'Edit(./**)', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Agent', 'AskUserQuestion', 'mcp__spalla__memoria_cerca',
    ]);
    expect(s.permissions.ask).toEqual(['Bash']);
    for (const r of [...s.permissions.allow, ...s.permissions.ask, ...s.permissions.deny]) {
      expect(r).not.toMatch(/\((\/Users|\/home|C:)/);
    }
    expect(s.permissions.deny).toContain('Bash(rm -rf*)');
    expect(s.permissions.deny.some((r) => r.includes('/claude/**'))).toBe(true);
    // Le impostazioni che il binario usa anche in una sessione SDK non si riscrivono dalla conversazione (docs/02 §10.2).
    for (const regola of ['Edit(./.claude/settings.json)', 'Edit(./.claude/settings.local.json)', 'Edit(./.mcp.json)', 'Edit(./.claude/skills/**)', 'Edit(./.claude/hooks/**)']) {
      expect(s.permissions.deny, regola).toContain(regola);
    }
    // Una regola Bash con "|" dentro non combacia mai (i comandi composti vengono spezzati): niente regole morte.
    for (const r of s.permissions.deny) expect(r, r).not.toMatch(/\|/);
    // Le regole Write(percorso) vengono accettate ma mai consultate dal binario: si usano solo Edit/Read.
    for (const r of s.permissions.deny) expect(r, r).not.toMatch(/^Write\(/);
    expect(s.env).toEqual({ CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: '1', CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: '3' });
  });

  it('i file di profilo e memoria stanno sotto i tetti', () => {
    expect(righe(leggi('profilo', 'IDENTITA.md'))).toBeLessThanOrEqual(TETTI_MEMORIA.IDENTITA_RIGHE);
    expect(leggi('profilo', 'ANIMA.md').length).toBeLessThanOrEqual(TETTI_MEMORIA.ANIMA_CARATTERI);
    expect(leggi('profilo', 'UTENTE.md').length).toBeLessThanOrEqual(TETTI_MEMORIA.UTENTE_CARATTERI);
    expect(righe(leggi('profilo', 'SQUADRA.md'))).toBeLessThanOrEqual(TETTI_MEMORIA.SQUADRA_RIGHE);
    expect(righe(leggi('memoria', 'MEMORIA.md'))).toBeLessThanOrEqual(TETTI_MEMORIA.MEMORIA_RIGHE);
    expect(righe(leggi('memoria', 'agenda.md'))).toBeLessThanOrEqual(TETTI_MEMORIA.AGENDA_RIGHE);
    expect(separaFrontmatter(leggi('memoria', 'MEMORIA.md'))?.yaml).toContain('type: indice');
  });
});
