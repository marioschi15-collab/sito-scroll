import { describe, expect, it } from 'vitest';
import { assistente, cervello, cli, comuni, errori, onboarding, permessi, telegram, voce } from './index.js';

/** Parole da addetti ai lavori che non devono mai arrivare all'utente (docs/05 §1.12). */
const GERGO = /\b(agente|agenti|prompt|token|MCP|hook|frontmatter|subagent|sottoagente)\b/i;
const API = /\bAPI\b/;

/** Raccoglie tutte le stringhe di un oggetto, chiamando le funzioni con argomenti di prova. */
function stringhe(valore: unknown, percorso = ''): Array<[string, string]> {
  if (typeof valore === 'string') return [[percorso, valore]];
  if (typeof valore === 'function') {
    const f = valore as (...a: unknown[]) => unknown;
    const prove: unknown[][] = [
      ['Bruno', 'Marco', 'https://esempio.it/privacy'],
      [3, 25, 7],
      [{ pcAcceso: true, ultimoBrief: 'oggi alle 8', spesaMeseEur: 1.5, tettoEur: 25 }],
      ['chiave_api'],
      [12.5, 25, 3],
    ];
    return prove.flatMap((args) => {
      try {
        const r = f(...args);
        return typeof r === 'string' ? ([[percorso, r]] as Array<[string, string]>) : [];
      } catch {
        return [];
      }
    });
  }
  if (Array.isArray(valore)) return valore.flatMap((v, i) => stringhe(v, `${percorso}[${i}]`));
  if (valore && typeof valore === 'object') {
    return Object.entries(valore).flatMap(([k, v]) => stringhe(v, percorso ? `${percorso}.${k}` : k));
  }
  return [];
}

describe('nessun gergo verso l\'utente', () => {
  const moduli = { comuni, errori, permessi, telegram, cli, onboarding, assistente, voce };
  for (const [nome, modulo] of Object.entries(moduli)) {
    it(`${nome}: niente agente/prompt/token/MCP/API`, () => {
      for (const [percorso, s] of stringhe(modulo, nome)) {
        expect(s, percorso).not.toMatch(GERGO);
        // "API" è ammessa solo nelle schermate del cervello e nel nome della modalità "chiave API"
        if (!/chiave API/.test(s)) expect(s, percorso).not.toMatch(API);
      }
    });
  }

  it('cervello: la parola API compare solo spiegata, e il resto è senza gergo', () => {
    for (const [percorso, s] of stringhe(cervello, 'cervello')) expect(s, percorso).not.toMatch(GERGO);
    expect(cervello.chiaveApi.cosE).toMatch(/chiave API/);
  });

  it('le frasi fisse di docs/02 e docs/05 sono esatte', () => {
    expect(telegram.conferme.siFallo).toBe('Sì, fallo');
    expect(telegram.eroSpento(4)).toBe('Ero spento: ho ricevuto 4 messaggi, li leggo ora.');
    expect(cervello.chiaveApi.collegato).toBe('Collegato. Spalla può pensare.');
    expect(cervello.abbonamento.avvisoBeta).toMatch(/^Questa modalità è in beta/);
    expect(errori.limiteRaggiunto('16:30')).toMatch(/^Claude è in pausa fino alle 16:30/);
    expect(onboarding.pulsantiFissi.vaiConsigliati).toBe('Vai con i consigliati');
    expect(telegram.start('Bruno', 'Marco', 'https://esempio.it/privacy')).toMatch(/Informativa: https:\/\/esempio\.it\/privacy/);
    expect(telegram.start('Bruno', 'Marco', 'x')).toMatch(/computer è acceso/);
  });

  it('chi agisce: articolo giusto anche davanti a vocale', () => {
    expect(comuni.chiAgisce.ruolo('Segretaria')).toBe('La Segretaria');
    expect(comuni.chiAgisce.ruolo('Contabile')).toBe('Il Contabile');
    expect(comuni.chiAgisce.ruolo('Analista')).toBe("L'Analista");
    expect(comuni.chiAgisce.a('Segretaria')).toBe('alla Segretaria');
    expect(comuni.chiAgisce.a('Archivista')).toBe("all'Archivista");
    expect(assistente.strumenti.delega('copywriter')).toBe('Passo il lavoro al Copywriter');
    expect(permessi.azioni.eseguire("L'assistente")).toBe("L'assistente vuole eseguire un comando sul computer");
  });
});
