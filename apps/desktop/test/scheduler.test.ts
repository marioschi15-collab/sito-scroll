import { describe, expect, it, vi } from 'vitest';
import type { LavoroProgrammato, Logger } from '../src/nucleo/contratti.js';
import { creaScheduler, ultimaOccorrenzaTra } from '../src/nucleo/scheduler/index.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };

function lavoro(nome: LavoroProgrammato['nome'], cron: string, attivo = true) {
  const esegui = vi.fn(async () => undefined);
  return { lavoro: { nome, cron, attivo, esegui } as LavoroProgrammato, esegui };
}

/** Data locale: anno, mese (1-12), giorno, ora, minuti. */
function alle(a: number, m: number, g: number, h: number, min = 0) {
  return new Date(a, m - 1, g, h, min, 0, 0);
}

describe('ultimaOccorrenzaTra', () => {
  it('trova il brief delle 08:00 tra le 07:00 e le 09:00', () => {
    const r = ultimaOccorrenzaTra('0 8 * * *', alle(2026, 10, 22, 7), alle(2026, 10, 22, 9));
    expect(r?.getTime()).toBe(alle(2026, 10, 22, 8).getTime());
  });
  it('null se non c\'è nessuna occorrenza nell\'intervallo', () => {
    expect(ultimaOccorrenzaTra('0 8 * * *', alle(2026, 10, 22, 9), alle(2026, 10, 22, 10))).toBeNull();
  });
  it('restituisce l\'ULTIMA occorrenza', () => {
    const r = ultimaOccorrenzaTra('*/15 * * * *', alle(2026, 10, 22, 9), alle(2026, 10, 22, 10, 5));
    expect(r?.getTime()).toBe(alle(2026, 10, 22, 10).getTime());
  });
});

describe('ripresaDalSonno', () => {
  it('esegue una volta il brief saltato se entro 3 ore', async () => {
    let ora = alle(2026, 10, 22, 6);
    const s = creaScheduler({ logger, adesso: () => ora });
    const brief = lavoro('brief_mattino', '0 8 * * *');
    s.registra(brief.lavoro);
    s.avvia();
    ora = alle(2026, 10, 22, 10, 30); // PC riacceso alle 10:30
    await s.ripresaDalSonno();
    expect(brief.esegui).toHaveBeenCalledTimes(1);
    // Una seconda ripresa non lo ripete.
    await s.ripresaDalSonno();
    expect(brief.esegui).toHaveBeenCalledTimes(1);
    s.ferma();
  });

  it('non esegue il brief se è passato troppo tempo', async () => {
    let ora = alle(2026, 10, 22, 6);
    const s = creaScheduler({ logger, adesso: () => ora });
    const brief = lavoro('brief_mattino', '0 8 * * *');
    s.registra(brief.lavoro);
    s.avvia();
    ora = alle(2026, 10, 22, 15);
    await s.ripresaDalSonno();
    expect(brief.esegui).not.toHaveBeenCalled();
    s.ferma();
  });

  it('ignora i lavori spenti e quelli programmati prima dell\'avvio', async () => {
    let ora = alle(2026, 10, 22, 8, 30); // avvio dopo le 08:00: il brief di oggi non è "saltato"
    const s = creaScheduler({ logger, adesso: () => ora });
    const brief = lavoro('brief_mattino', '0 8 * * *');
    const riordino = lavoro('riordino_notturno', '0 3 * * *', false);
    s.registra(brief.lavoro);
    s.registra(riordino.lavoro);
    s.avvia();
    ora = alle(2026, 10, 22, 9);
    await s.ripresaDalSonno();
    expect(brief.esegui).not.toHaveBeenCalled();
    expect(riordino.esegui).not.toHaveBeenCalled();
    s.ferma();
  });

  it('rispetta la finestra del riordino (6 ore) e quella personalizzata', async () => {
    let ora = alle(2026, 10, 22, 1);
    const s = creaScheduler({ logger, adesso: () => ora, finestreUtiliMs: { promemoria: 10 * 60 * 1000 } });
    const riordino = lavoro('riordino_notturno', '0 3 * * *');
    const promemoria = lavoro('promemoria', '0 9 * * *');
    s.registra(riordino.lavoro);
    s.registra(promemoria.lavoro);
    s.avvia();
    ora = alle(2026, 10, 22, 8); // riordino delle 03:00: 5 ore dopo → sì; promemoria non ancora
    await s.ripresaDalSonno();
    expect(riordino.esegui).toHaveBeenCalledTimes(1);
    expect(promemoria.esegui).not.toHaveBeenCalled();
    ora = alle(2026, 10, 22, 9, 30); // promemoria delle 09:00 con finestra 10 minuti → no
    await s.ripresaDalSonno();
    expect(promemoria.esegui).not.toHaveBeenCalled();
    s.ferma();
  });

  it('non fa nulla se lo scheduler non è avviato', async () => {
    const s = creaScheduler({ logger });
    const brief = lavoro('brief_mattino', '0 8 * * *');
    s.registra(brief.lavoro);
    await s.ripresaDalSonno();
    expect(brief.esegui).not.toHaveBeenCalled();
  });
});

describe('ciclo di vita', () => {
  it('registra, elenca, esegue a comando e ferma', async () => {
    const s = creaScheduler({ logger });
    const brief = lavoro('brief_mattino', '0 8 * * *');
    s.registra(brief.lavoro);
    expect(s.lavori()[0]?.prossimaEsecuzione).toBeNull();
    s.avvia();
    expect(s.lavori()[0]?.prossimaEsecuzione).toBeInstanceOf(Date);
    await s.eseguiOra('brief_mattino');
    expect(brief.esegui).toHaveBeenCalledTimes(1);
    expect(s.lavori()[0]?.ultimaEsecuzione).toBeInstanceOf(Date);
    s.ferma();
    expect(s.lavori()[0]?.prossimaEsecuzione).toBeNull();
  });

  it('rifiuta un\'espressione cron non valida', () => {
    const s = creaScheduler({ logger });
    expect(() => s.registra({ nome: 'promemoria', cron: 'ogni tanto', attivo: true, esegui: async () => undefined })).toThrow();
  });

  it('un errore nel lavoro viene registrato e non interrompe lo scheduler', async () => {
    const errore = vi.fn();
    const s = creaScheduler({ logger: { ...logger, errore } });
    s.registra({ nome: 'promemoria', cron: '0 9 * * *', attivo: true, esegui: async () => { throw new Error('boom'); } });
    s.avvia();
    await s.eseguiOra('promemoria');
    expect(errore).toHaveBeenCalledWith('scheduler.lavoro_errore', expect.objectContaining({ nome: 'promemoria', errore: 'boom' }));
    s.ferma();
  });
});
