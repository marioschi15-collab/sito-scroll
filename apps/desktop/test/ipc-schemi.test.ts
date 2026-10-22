import { describe, expect, expectTypeOf, it } from 'vitest';
import { principale } from '@spalla/it-copy';
import type { ApiSpalla, NomeEvento, NomeInvoke } from '../src/ipc/contratto.js';
import { ErroreIpc, NOMI_EVENTO, NOMI_INVOKE, SCHEMI_INVOKE, validaArgomenti, type ArgomentiDi } from '../src/ipc/schemi.js';
import { creaApiSpalla, pulisciMessaggioErrore, type IpcMinimo } from '../src/preload/api.js';

const testi = principale.errori;

function valida<N extends NomeInvoke>(nome: N, ...argomenti: unknown[]) {
  return validaArgomenti(nome, argomenti, testi);
}

const impostazioniValide = {
  cervello: { livello: 'equilibrato', tettoMensileEur: 25 },
  orari: { silenzioDa: '21:00', silenzioA: '08:00', domenica: 'silenzio' },
  brief: { attivo: false, ora: '08:00', canale: 'desktop' },
  riordinoNotturno: { attivo: true, ora: '03:00' },
  voce: { desktop: 'spento', risposteVocaliTelegram: false },
  avvioAutomatico: true,
};

describe('schemi IPC: accettano i parametri giusti', () => {
  it('chat.invia', () => {
    const [avvio] = valida('chat.invia', { scambioId: 'abc-123', testo: 'ciao', canale: 'desktop', allegati: ['lavoro/in-arrivo/a.pdf'], rituale: false });
    expect(avvio.testo).toBe('ciao');
  });

  it('metodi senza argomenti', () => {
    for (const nome of ['app.stato', 'onboarding.prepara', 'memoria.elenco', 'voce.prepara'] as const) expect(valida(nome)).toEqual([]);
  });

  it('permessi.decidi scarta inputAggiornato (la finestra può solo consentire o negare)', () => {
    const [id, decisione] = valida('permessi.decidi', 'a1b2c3', { esito: 'consenti', inputAggiornato: { file_path: '/etc/passwd' } });
    expect(id).toBe('a1b2c3');
    expect(decisione).toEqual({ esito: 'consenti' });
    expect(valida('permessi.decidi', 'x', { esito: 'nega', motivo: 'no' })[1]).toEqual({ esito: 'nega', motivo: 'no' });
  });

  it('impostazioni complete, tetto null, orari HH:MM', () => {
    expect(valida('impostazioni.salva', impostazioniValide)[0].avvioAutomatico).toBe(true);
    expect(valida('impostazioni.salva', { ...impostazioniValide, cervello: { livello: 'massima', tettoMensileEur: null, modalita: 'abbonamento' } })[0].cervello.tettoMensileEur).toBeNull();
  });

  it('cervello, terminale, telegram, squadra, memoria, allegati', () => {
    expect(valida('cervello.collegaChiaveApi', 'sk-ant-xxx', 10, 'economico')).toHaveLength(3);
    expect(valida('cervello.cambiaModalita', 'abbonamento')).toEqual(['abbonamento']);
    expect(valida('terminale.ridimensiona', 120, 40)).toEqual([120, 40]);
    expect(valida('telegram.confermaPairing', '  K7P2QX ')).toEqual(['K7P2QX']);
    expect(valida('squadra.attiva', 'contabile')).toEqual(['contabile']);
    expect(valida('memoria.leggi', 'memoria/temi/cliente.md')).toEqual(['memoria/temi/cliente.md']);
    expect(valida('allegati.aggiungi', ['/home/marco/Scrivania/preventivo.pdf'])).toHaveLength(1);
    expect(valida('app.apriLink', 'https://console.anthropic.com/')).toHaveLength(1);
  });
});

describe('schemi IPC: rifiutano', () => {
  const rifiuta = (nome: NomeInvoke, ...argomenti: unknown[]) => expect(() => valida(nome, ...argomenti)).toThrow(ErroreIpc);

  it('percorsi assoluti, con "..", con caratteri di controllo', () => {
    rifiuta('app.apriNelSistema', '/etc/passwd');
    rifiuta('app.apriNelSistema', 'C:\\Windows\\system32');
    rifiuta('app.apriNelSistema', '~/.ssh/id_rsa');
    rifiuta('memoria.leggi', 'memoria/../../segreti');
    rifiuta('memoria.leggi', '..\\fuori.md');
    rifiuta('memoria.leggi', 'memoria/a\u0000.md');
    rifiuta('chat.invia', { scambioId: 'a', testo: 'x', canale: 'desktop', allegati: ['/tmp/x'] });
  });

  it('link non web', () => {
    rifiuta('app.apriLink', 'file:///etc/passwd');
    rifiuta('app.apriLink', 'javascript:alert(1)');
    rifiuta('app.apriLink', 'non è un indirizzo');
  });

  it('canali che la finestra non può usare, id strani, testo enorme', () => {
    rifiuta('chat.invia', { scambioId: 'a', testo: 'x', canale: 'telegram' });
    rifiuta('chat.invia', { scambioId: 'a b', testo: 'x', canale: 'desktop' });
    rifiuta('chat.invia', { scambioId: 'a', testo: 'x'.repeat(100_001), canale: 'desktop' });
    rifiuta('permessi.decidi', 'id-troppo-lungo-per-telegram-1234', { esito: 'consenti' });
    rifiuta('permessi.decidi', 'abc', { esito: 'forse' });
  });

  it('argomenti in più o in meno, tipi sbagliati', () => {
    rifiuta('app.stato', 'in più');
    rifiuta('chat.interrompi');
    rifiuta('terminale.ridimensiona', 1.5, 40);
    rifiuta('terminale.ridimensiona', 120, 100_000);
    rifiuta('cervello.cambiaModalita', 'gratis');
    rifiuta('impostazioni.salva', { ...impostazioniValide, orari: { ...impostazioniValide.orari, silenzioDa: '25:00' } });
    rifiuta('impostazioni.salva', { ...impostazioniValide, cervello: { livello: 'equilibrato', tettoMensileEur: -5 } });
    rifiuta('squadra.attiva', '../agents/x');
    rifiuta('allegati.aggiungi', []);
  });

  it('il motivo arriva in italiano, senza nomi di campi né frasi inglesi della libreria', () => {
    const messaggio = (nome: NomeInvoke, ...argomenti: unknown[]): string => {
      try {
        valida(nome, ...argomenti);
      } catch (e) {
        return (e as Error).message;
      }
      throw new Error('doveva rifiutare');
    };
    expect(messaggio('chat.invia', { scambioId: 'a', testo: 'x'.repeat(100_001), canale: 'desktop' })).toBe(
      principale.errori.parametriNonValidi(principale.errori.validazione.testoTroppoLungo(100_000)),
    );
    expect(messaggio('memoria.cerca', 'x'.repeat(501))).toBe(principale.errori.parametriNonValidi(principale.errori.validazione.testoTroppoLungo(500)));
    expect(messaggio('telegram.confermaPairing', '')).toBe(principale.errori.parametriNonValidi(principale.errori.validazione.testoMancante));
    expect(messaggio('cervello.cambiaModalita', 'gratis')).toBe(principale.errori.parametriNonValidi(principale.errori.validazione.scelta));
    for (const m of [
      messaggio('chat.invia', { scambioId: 'a', testo: 'x'.repeat(100_001), canale: 'desktop' }),
      messaggio('impostazioni.salva', { ...impostazioniValide, orari: { ...impostazioniValide.orari, silenzioDa: '25:00' } }),
      messaggio('allegati.aggiungi', []),
    ]) {
      expect(m).not.toMatch(/Too big|Too small|Invalid|expected|characters|\btesto\b:|\d\.\w+:/);
    }
  });

  it('metodo sconosciuto', () => {
    expect(() => validaArgomenti('app.esegui' as NomeInvoke, [], testi)).toThrow(/sconosciuta/);
  });

  it('il messaggio di errore non contiene i valori (potrebbero essere una chiave)', () => {
    try {
      valida('cervello.collegaChiaveApi', 'sk-ant-SEGRETO', 'non-un-numero', 'equilibrato');
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).not.toContain('SEGRETO');
      expect((e as Error).message).toMatch(/^Richiesta non valida/);
    }
  });
});

describe('superficie dell\'API: preload ↔ contratto ↔ schemi', () => {
  function ipcFinto() {
    const chiamate: { canale: string; argomenti: unknown[] }[] = [];
    const ascoltatori = new Map<string, Set<(e: unknown, ...a: unknown[]) => void>>();
    const ipc: IpcMinimo = {
      invoke: async (canale, ...argomenti) => {
        chiamate.push({ canale, argomenti });
        return canale === 'allegati.aggiungi' ? ['lavoro/in-arrivo/x.pdf'] : undefined;
      },
      on: (canale, a) => {
        if (!ascoltatori.has(canale)) ascoltatori.set(canale, new Set());
        ascoltatori.get(canale)?.add(a);
      },
      removeListener: (canale, a) => ascoltatori.get(canale)?.delete(a),
    };
    return { ipc, chiamate, ascoltatori };
  }

  it('il tipo del preload è esattamente ApiSpalla', () => {
    const { ipc } = ipcFinto();
    expectTypeOf(creaApiSpalla(ipc, () => '')).toEqualTypeOf<ApiSpalla>();
    // Ogni metodo dell'API ha il suo schema: il tipo dei nomi coincide con le chiavi della tabella.
    expectTypeOf<keyof typeof SCHEMI_INVOKE>().toEqualTypeOf<NomeInvoke>();
    expectTypeOf<(typeof NOMI_EVENTO)[number]>().toEqualTypeOf<NomeEvento>();
    expectTypeOf<ArgomentiDi<'chat.interrompi'>>().toEqualTypeOf<[string]>();
  });

  it('ogni metodo del preload chiama il canale con il suo nome, e ce ne sono tanti quanti gli schemi', async () => {
    const { ipc, chiamate } = ipcFinto();
    const api = creaApiSpalla(ipc, () => '/percorso/file.pdf') as unknown as Record<string, Record<string, (...a: unknown[]) => Promise<unknown>>>;
    for (const [gruppo, metodi] of Object.entries(api)) {
      if (gruppo === 'on') continue;
      for (const [metodo, f] of Object.entries(metodi)) {
        await f(gruppo === 'allegati' ? [{ name: 'file.pdf' }] : 'x', 1, 2);
        expect(chiamate.at(-1)?.canale).toBe(`${gruppo}.${metodo}`);
      }
    }
    expect(new Set(chiamate.map((c) => c.canale))).toEqual(new Set(NOMI_INVOKE));
  });

  it('gli eventi passano solo i dati e si possono annullare', () => {
    const { ipc, ascoltatori } = ipcFinto();
    const api = creaApiSpalla(ipc, () => '');
    const ricevuti: unknown[] = [];
    const annulla = Object.entries(api.on).map(([, iscriviti]) => (iscriviti as (cb: (d: unknown) => void) => () => void)((d) => ricevuti.push(d)));
    expect(new Set(ascoltatori.keys())).toEqual(new Set(NOMI_EVENTO));
    for (const a of ascoltatori.get('evento.statoApp') ?? []) a({ sender: 'segreto' }, { prodotto: 'Spalla' });
    expect(ricevuti).toEqual([{ prodotto: 'Spalla' }]);
    for (const f of annulla) f();
    expect([...ascoltatori.values()].every((s) => s.size === 0)).toBe(true);
  });

  it('allegati: percorsi da webUtils, file senza percorso scartati', async () => {
    const { ipc, chiamate } = ipcFinto();
    const api = creaApiSpalla(ipc, (f) => ((f as { name: string }).name === 'vero.pdf' ? '/home/m/vero.pdf' : ''));
    expect(await api.allegati?.aggiungi([{ name: 'finto' }])).toEqual([]);
    expect(chiamate).toHaveLength(0);
    expect(await api.allegati?.aggiungi([{ name: 'vero.pdf' }, { name: 'finto' }])).toEqual(['lavoro/in-arrivo/x.pdf']);
    expect(chiamate[0]).toEqual({ canale: 'allegati.aggiungi', argomenti: [['/home/m/vero.pdf']] });
  });

  it('gli errori arrivano alla finestra senza il prefisso di Electron', async () => {
    expect(pulisciMessaggioErrore("Error invoking remote method 'chat.invia': Error: Questo messaggio è già in corso.")).toBe('Questo messaggio è già in corso.');
    const ipc: IpcMinimo = {
      invoke: async () => {
        throw new Error("Error invoking remote method 'app.stato': Error: Spalla sta ancora partendo: riprova tra un momento.");
      },
      on: () => undefined,
      removeListener: () => undefined,
    };
    await expect(creaApiSpalla(ipc, () => '').app.stato()).rejects.toThrow(/^Spalla sta ancora partendo/);
  });
});
