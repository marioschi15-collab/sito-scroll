import { describe, expect, it, vi } from 'vitest';
import type { CanaleConferme, DecisionePermesso, Logger, RichiestaPermesso } from '../src/nucleo/contratti.js';
import { creaBroker, descriviRichiesta, generaIdRichiesta } from '../src/nucleo/broker/index.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };

function canaleFinto(nome: 'desktop' | 'telegram', disponibile = true, decisione: DecisionePermesso = { esito: 'consenti' }) {
  const chiediConferma = vi.fn(async () => decisione);
  const canale: CanaleConferme = { nome, disponibile: () => disponibile, chiediConferma };
  return { canale, chiediConferma };
}

function richiesta(origine: RichiestaPermesso['canaleOrigine'] = 'desktop', extra: Partial<RichiestaPermesso> = {}): RichiestaPermesso {
  return {
    id: 'abc234',
    strumento: 'Write',
    input: { file_path: '/tmp/x.md', content: 'ciao' },
    descrizione: 'test',
    canaleOrigine: origine,
    creataIl: Date.now(),
    ...extra,
  };
}

describe('instradamento', () => {
  it('origine telegram → canale telegram', async () => {
    const broker = creaBroker({ logger });
    const desktop = canaleFinto('desktop');
    const telegram = canaleFinto('telegram');
    broker.registraCanale(desktop.canale);
    broker.registraCanale(telegram.canale);
    broker.segnaAttivita('desktop');
    await broker.chiedi(richiesta('telegram'));
    expect(telegram.chiediConferma).toHaveBeenCalledTimes(1);
    expect(desktop.chiediConferma).not.toHaveBeenCalled();
  });

  it('utente al PC (attività recente) → desktop', async () => {
    let ora = 1_000_000;
    const broker = creaBroker({ logger, adesso: () => ora });
    const desktop = canaleFinto('desktop');
    const telegram = canaleFinto('telegram');
    broker.registraCanale(desktop.canale);
    broker.registraCanale(telegram.canale);
    broker.segnaAttivita('desktop');
    ora += 60_000;
    await broker.chiedi(richiesta('desktop'));
    expect(desktop.chiediConferma).toHaveBeenCalledTimes(1);
    expect(telegram.chiediConferma).not.toHaveBeenCalled();
  });

  it('desktop inattivo da più di 5 minuti → telegram se disponibile', async () => {
    let ora = 1_000_000;
    const broker = creaBroker({ logger, adesso: () => ora });
    const desktop = canaleFinto('desktop');
    const telegram = canaleFinto('telegram');
    broker.registraCanale(desktop.canale);
    broker.registraCanale(telegram.canale);
    broker.segnaAttivita('desktop');
    ora += 5 * 60_000 + 1;
    expect(broker.canalePer('desktop')).toBe('telegram');
    await broker.chiedi(richiesta('desktop'));
    expect(telegram.chiediConferma).toHaveBeenCalledTimes(1);
  });

  it('desktop inattivo ma telegram non disponibile → desktop', async () => {
    const broker = creaBroker({ logger });
    const desktop = canaleFinto('desktop');
    const telegram = canaleFinto('telegram', false);
    broker.registraCanale(desktop.canale);
    broker.registraCanale(telegram.canale);
    await broker.chiedi(richiesta('sistema'));
    expect(desktop.chiediConferma).toHaveBeenCalledTimes(1);
    expect(telegram.chiediConferma).not.toHaveBeenCalled();
  });

  it('nessun canale → nega con motivo in italiano', async () => {
    const broker = creaBroker({ logger });
    const d = await broker.chiedi(richiesta());
    expect(d.esito).toBe('nega');
    if (d.esito === 'nega') expect(d.motivo).toMatch(/non lo faccio/);
  });

  it('riporta la decisione del canale e svuota il registro', async () => {
    const broker = creaBroker({ logger });
    const desktop = canaleFinto('desktop', true, { esito: 'nega', motivo: 'no' });
    broker.registraCanale(desktop.canale);
    broker.segnaAttivita('desktop');
    const d = await broker.chiedi(richiesta());
    expect(d).toEqual({ esito: 'nega', motivo: 'no' });
    expect(broker.inAttesa()).toEqual([]);
  });
});

describe('timeout e registro', () => {
  it('scaduto il tempo nega e rimuove la richiesta dal registro', async () => {
    const broker = creaBroker({ logger, timeoutMs: 30 });
    const chiediConferma = vi.fn(() => new Promise<DecisionePermesso>(() => undefined));
    broker.registraCanale({ nome: 'desktop', disponibile: () => true, chiediConferma });
    broker.segnaAttivita('desktop');
    const promessa = broker.chiedi(richiesta());
    expect(broker.inAttesa().map((r) => r.id)).toEqual(['abc234']);
    const d = await promessa;
    expect(d.esito).toBe('nega');
    if (d.esito === 'nega') expect(d.motivo).toMatch(/tempo/);
    expect(broker.inAttesa()).toEqual([]);
  });

  it('se la sessione che ha chiesto si interrompe, nega subito e toglie la richiesta dal registro', async () => {
    const broker = creaBroker({ logger, timeoutMs: 60_000 });
    const chiediConferma = vi.fn(() => new Promise<DecisionePermesso>(() => undefined));
    broker.registraCanale({ nome: 'desktop', disponibile: () => true, chiediConferma });
    broker.segnaAttivita('desktop');
    const controller = new AbortController();
    const promessa = broker.chiedi(richiesta('desktop', { annullamento: controller.signal }));
    expect(broker.inAttesa()).toHaveLength(1);
    controller.abort();
    expect(await promessa).toEqual({ esito: 'nega', motivo: expect.stringMatching(/non serve più/) });
    expect(broker.inAttesa()).toEqual([]);
    // il canale ha ricevuto il segnale dentro la richiesta: può ritirare la scheda
    expect((chiediConferma.mock.calls[0] as unknown as [RichiestaPermesso])[0].annullamento).toBe(controller.signal);
  });

  it('un canale che lancia un errore porta a nega', async () => {
    const broker = creaBroker({ logger });
    broker.registraCanale({ nome: 'desktop', disponibile: () => true, chiediConferma: async () => { throw new Error('boom'); } });
    broker.segnaAttivita('desktop');
    const d = await broker.chiedi(richiesta());
    expect(d.esito).toBe('nega');
  });

  it('compila descrizione e id quando mancano', async () => {
    const broker = creaBroker({ logger });
    const chiediConferma = vi.fn(async (r: RichiestaPermesso) => {
      expect(r.id).toMatch(/^[a-km-zA-Z2-9]{6,8}$/);
      expect(r.descrizione).toMatch(/^Il Contabile vuole scrivere in /);
      expect(r.anteprima).toBe('ciao');
      return { esito: 'consenti' } as DecisionePermesso;
    });
    broker.registraCanale({ nome: 'desktop', disponibile: () => true, chiediConferma });
    broker.segnaAttivita('desktop');
    await broker.chiedi(richiesta('desktop', { id: '', descrizione: '', ruolo: 'contabile' }));
    expect(chiediConferma).toHaveBeenCalledTimes(1);
  });
});

describe('id richiesta', () => {
  it('6-8 caratteri, senza l/1/I/O/0, unici', () => {
    const visti = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const id = generaIdRichiesta();
      expect(id).toHaveLength(7);
      expect(id).not.toMatch(/[l1IO0]/);
      visti.add(id);
    }
    expect(visti.size).toBe(2000);
    expect(generaIdRichiesta(6)).toHaveLength(6);
    expect(generaIdRichiesta(8)).toHaveLength(8);
    expect(() => generaIdRichiesta(5)).toThrow();
  });
});

describe('descrizioni in italiano', () => {
  it('Write con percorso e anteprima', () => {
    const d = descriviRichiesta('Write', { file_path: '/tmp/Fatture/nota.md', content: 'riga 1\nriga 2\nriga 3\nriga 4' });
    expect(d.descrizione).toBe("L'assistente vuole scrivere in /tmp/Fatture/nota.md");
    expect(d.anteprima).toBe('riga 1\nriga 2\nriga 3');
  });
  it('nomina il ruolo che agisce', () => {
    expect(descriviRichiesta('Edit', { file_path: '/a.md', old_string: 'x', new_string: 'y' }, 'segretaria').descrizione).toBe('La Segretaria vuole modificare /a.md');
    expect(descriviRichiesta('Read', { file_path: '/a.md' }, 'fornitori').descrizione).toBe('Il ruolo «fornitori» vuole leggere /a.md');
  });
  it('Bash mostra il comando in anteprima', () => {
    const d = descriviRichiesta('Bash', { command: 'ls -la', description: 'Elenca i file' });
    expect(d.descrizione).toBe("L'assistente vuole eseguire un comando sul computer");
    expect(d.anteprima).toBe('Elenca i file\n$ ls -la');
  });
  it('WebFetch e WebSearch', () => {
    expect(descriviRichiesta('WebFetch', { url: 'https://example.it' }).descrizione).toBe("L'assistente vuole aprire la pagina https://example.it");
    expect(descriviRichiesta('WebSearch', { query: 'prezzi case bologna' }).descrizione).toBe("L'assistente vuole cercare sul web: «prezzi case bologna»");
  });
  it('strumenti di servizio e sconosciuti: mai il nome tecnico nella scheda', () => {
    expect(descriviRichiesta('Skill', { skill: 'preventivo' }).descrizione).toBe("L'assistente vuole seguire una procedura");
    expect(descriviRichiesta('TodoWrite', {}).descrizione).toBe("L'assistente vuole aggiornare la lista delle cose da fare");
    expect(descriviRichiesta('EndConversation', {}).descrizione).toBe("L'assistente vuole chiudere l'argomento");
    expect(descriviRichiesta('Boh', {}).descrizione).toBe("L'assistente vuole usare uno strumento");
    expect(descriviRichiesta('ListMcpResourcesTool', {}, 'contabile').descrizione).toBe('Il Contabile vuole usare uno strumento');
  });
});
