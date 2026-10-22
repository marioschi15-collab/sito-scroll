import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { principale } from '@spalla/it-copy';
import { ConfigSchema, MARCATORI_APP } from '@spalla/schema';
import type { NomeInvoke } from '../src/ipc/contratto.js';
import type { ArgomentiDi } from '../src/ipc/schemi.js';
import { creaPonteIpc } from '../src/main/ipc-ponte.js';
import { creaHostNucleo, ErroreUtente, percorsoLeggibile, type DatiEvento, type HostNucleo, type NomeEventoBreve, type PiattaformaShell } from '../src/main/nucleo-host.js';
import type { CanaleConferme, DomandaUtente, EventoAssistente, Logger, MessaggioIn, OpzioniInvio, RichiestaPermesso } from '../src/nucleo/contratti.js';
import type { Nucleo } from '../src/nucleo/index.js';
import { calcolaPercorsi } from '../src/nucleo/percorsi.js';
import { PAIRING_PER_FINESTRA } from './renderer/fixture-telegram.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };

type Consegna = (e: EventoAssistente) => Promise<void>;
type Gestisci = (m: MessaggioIn, consegna: Consegna, opzioni?: OpzioniInvio) => Promise<void>;

/** Un Nucleo finto: solo ciò che l'host usa, con il dispatcher pilotato dalla prova. */
function nucleoFinto(percorsi: ReturnType<typeof calcolaPercorsi>, gestisci: Gestisci) {
  const canali: CanaleConferme[] = [];
  const marcatori = new Map<string, () => void>();
  const visti = new Map<string, () => void>();
  const segreti = new Map<string, string>();
  const nucleo = {
    percorsi,
    config: ConfigSchema.parse({}),
    logger,
    runtimeBinario: { percorsoEseguibile: undefined, configEreditata: false, ambiente: () => ({ CLAUDE_CONFIG_DIR: percorsi.configClaude }) },
    store: {
      leggi: async (n: string) => segreti.get(n),
      scrivi: async (n: string, v: string) => void segreti.set(n, v),
      rimuovi: async (n: string) => void segreti.delete(n),
      elenco: async () => [...segreti.keys()],
    },
    broker: { registraCanale: (c: CanaleConferme) => canali.push(c), segnaAttivita: vi.fn() },
    dispatcher: {
      gestisci: vi.fn(gestisci),
      suMarcatore: (m: string, a: () => void) => {
        marcatori.set(m, a);
        return () => marcatori.delete(m);
      },
      suMarcatoreVisto: (m: string, a: () => void) => {
        visti.set(m, a);
        return () => visti.delete(m);
      },
      dopoScambio: () => () => undefined,
      inCoda: () => 0,
    },
    onboarding: {
      stato: vi.fn(async () => 'da_fare' as const),
      prepara: vi.fn(async () => undefined),
      messaggioIniziale: vi.fn(async () => 'RITUALE DAL NUCLEO'),
      valida: vi.fn(async () => []),
      completa: vi.fn(async () => undefined),
      attivaRuolo: vi.fn(async () => ({ nome: 'x', file: 'x', cambiato: true })),
      disattivaRuolo: vi.fn(async () => ({ nome: 'x', file: 'x', cambiato: true })),
      riepilogoProfilo: vi.fn(async () => 'Sei Marco.'),
    },
    agente: { nuovaSessione: vi.fn(async () => undefined), statoCosti: async () => ({ meseUsd: 1, sopraTetto: false }) },
    controlloTelegram: {
      attivo: () => false,
      username: () => undefined,
      pairingInAttesa: () => [],
      suggerimenti: () => ({ nome: 'Bruno', username: 'bruno_marco_bot', link: 'https://t.me/BotFather', passi: [] }),
      collega: vi.fn(async () => ({ ok: true, messaggio: 'ok', username: 'bruno_marco_bot' })),
      confermaPairing: vi.fn(async () => ({ ok: true, messaggio: 'ok' })),
    },
    telegram: () => undefined,
    voce: { motore: 'nessuno', disponibile: async () => false, scaricaModelli: vi.fn(async () => undefined), motivoNonDisponibile: async () => 'no' },
    memoria: { cerca: vi.fn(async () => []), contatori: vi.fn(), ricostruisciIndice: vi.fn() },
    scheduler: { ripresaDalSonno: vi.fn(async () => undefined) },
    ferma: vi.fn(async () => undefined),
  };
  return { nucleo: nucleo as unknown as Nucleo, finto: nucleo, canali, marcatori, visti, segreti };
}

describe('HostNucleo con un Nucleo finto', () => {
  let radice: string;
  let percorsi: ReturnType<typeof calcolaPercorsi>;
  let eventi: { nome: NomeEventoBreve; dati: unknown }[];
  let finestraAttiva: boolean;
  let piattaforma: PiattaformaShell;
  let gestisci: Gestisci;
  let avvii: number;
  let ultimo: ReturnType<typeof nucleoFinto>;
  let host: HostNucleo;
  const prova = vi.fn(async (variabili: Record<string, string>) => (variabili.ANTHROPIC_API_KEY?.endsWith('buona-buona-buona-buona') ? { ok: true } : { ok: false, codice: 'credenziali' as const }));

  function chiama<N extends NomeInvoke>(nome: N, ...argomenti: ArgomentiDi<N>) {
    return host.chiama(nome, argomenti);
  }
  function eventiDi<E extends NomeEventoBreve>(nome: E): DatiEvento<E>[] {
    return eventi.filter((e) => e.nome === nome).map((e) => e.dati as DatiEvento<E>);
  }

  beforeEach(async () => {
    radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-host-'));
    process.env.SPALLA_HOME = radice;
    percorsi = calcolaPercorsi();
    fs.mkdirSync(path.join(percorsi.cartellaLavoro, 'memoria'), { recursive: true });
    fs.mkdirSync(percorsi.datiApp, { recursive: true });
    eventi = [];
    finestraAttiva = true;
    avvii = 0;
    gestisci = async () => undefined;
    piattaforma = {
      versione: '0.0.1',
      nomeProdotto: 'Spalla',
      finestraAttiva: () => finestraAttiva,
      apriPercorso: vi.fn(async () => ''),
      mostraNellaCartella: vi.fn(),
      apriLink: vi.fn(async () => undefined),
      scegliDestinazioneZip: vi.fn(async () => undefined),
      avvioAutomatico: () => undefined,
      impostaAvvioAutomatico: vi.fn(),
      notificaSistema: vi.fn(),
      nascondiFinestra: vi.fn(),
    };
    host = creaHostNucleo({
      percorsi,
      piattaforma,
      emetti: (nome, dati) => eventi.push({ nome, dati }),
      logger,
      avviaNucleo: async () => {
        avvii++;
        ultimo = nucleoFinto(percorsi, (m, c, o) => gestisci(m, c, o));
        return ultimo.nucleo;
      },
      trovaBinario: () => undefined,
      prova,
      inattivitaMs: 1000,
    });
    await host.avvia();
  });

  afterEach(async () => {
    await host.ferma();
    delete process.env.SPALLA_HOME;
    fs.rmSync(radice, { recursive: true, force: true });
  });

  it('avvio: registra il canale "desktop" e manda lo stato con la schermata iniziale', () => {
    expect(ultimo.canali.map((c) => c.nome)).toEqual(['desktop']);
    const stato = eventiDi('statoApp').at(-1);
    expect(stato?.schermataIniziale).toBe('benvenuto');
    // Mai il percorso assoluto: "~/…" se sta nella home, altrimenti solo il nome della cartella.
    expect(stato?.cartellaLavoro).toBe(percorsoLeggibile(percorsi.cartellaLavoro));
    expect(stato?.cartellaLavoro).not.toContain(os.homedir() === '/' ? '\u0000' : os.homedir());
    expect(stato).not.toHaveProperty('sviluppo');
    expect(stato?.costi.meseEur).toBeCloseTo(0.92);
  });

  it('chat: eventi in streaming e domanda a chip con risposta da chat.rispondi', async () => {
    let fine!: () => void;
    const finito = new Promise<void>((r) => (fine = r));
    gestisci = async (m, consegna, opzioni) => {
      expect(m).toMatchObject({ testo: 'ciao', canale: 'desktop' });
      await consegna({ tipo: 'testo', testo: 'Ciao', parziale: true });
      const domanda: DomandaUtente = { id: 'd1', testo: 'Tu o lei?', opzioni: [{ etichetta: 'Tu' }, { etichetta: 'Lei' }], multiSelezione: false };
      const risposta = await opzioni?.rispondiDomanda?.(domanda);
      await consegna({ tipo: 'testo', testo: `Scelto: ${risposta?.risposte.join(',')}`, parziale: false });
      await consegna({ tipo: 'fine', sessioneId: 's1', durataMs: 10 });
      fine();
    };
    await chiama('chat.invia', { scambioId: 'sc1', testo: 'ciao', canale: 'desktop' });
    await vi.waitFor(() => expect(eventiDi('domanda')).toHaveLength(1));
    expect(eventiDi('domanda')[0]).toMatchObject({ scambioId: 'sc1', domanda: { id: 'd1' } });
    await expect(chiama('chat.rispondi', { scambioId: 'sc1', id: 'nessuna', risposte: ['x'] })).rejects.toBeInstanceOf(ErroreUtente);
    await chiama('chat.rispondi', { scambioId: 'sc1', id: 'd1', risposte: ['Tu'] });
    await finito;
    const flusso = eventiDi('eventoScambio').map((e) => e.evento);
    expect(flusso.map((e) => e.tipo)).toEqual(['testo', 'testo', 'fine']);
    expect(flusso[1]).toMatchObject({ testo: 'Scelto: Tu' });
    await expect(chiama('chat.invia', { scambioId: 'sc1', testo: 'ancora', canale: 'desktop' })).resolves.toBeUndefined();
  });

  it('chat: un id già in corso è rifiutato; il rituale usa il testo del Nucleo, non quello della finestra', async () => {
    let sblocca!: () => void;
    gestisci = (m) => new Promise<void>((r) => (sblocca = r));
    await chiama('chat.invia', { scambioId: 'r1', testo: 'testo inventato dalla finestra', canale: 'desktop', rituale: true });
    await expect(chiama('chat.invia', { scambioId: 'r1', testo: 'x', canale: 'desktop' })).rejects.toThrow(principale.chat.scambioDuplicato);
    const [messaggio, , opzioni] = ultimo.finto.dispatcher.gestisci.mock.calls[0] ?? [];
    expect(messaggio?.testo).toBe('RITUALE DAL NUCLEO');
    expect(opzioni?.rigaDiario).toBe('Presentazioni iniziate');
    expect(ultimo.finto.agente.nuovaSessione).toHaveBeenCalled();
    sblocca();
  });

  it('chat.interrompi: la domanda aperta riceve un "fermati" e gli eventi successivi non arrivano', async () => {
    let risposta: string[] | undefined;
    let fine!: () => void;
    const finito = new Promise<void>((r) => (fine = r));
    gestisci = async (_m, consegna, opzioni) => {
      const r = await opzioni?.rispondiDomanda?.({ id: 'd9', testo: '?', opzioni: [], multiSelezione: false });
      risposta = r?.risposte;
      await consegna({ tipo: 'testo', testo: 'dopo', parziale: false });
      fine();
    };
    await chiama('chat.invia', { scambioId: 'i1', testo: 'vai', canale: 'desktop' });
    await vi.waitFor(() => expect(eventiDi('domanda')).toHaveLength(1));
    await chiama('chat.interrompi', 'i1');
    await finito;
    expect(risposta).toEqual([principale.chat.motivoInterrotto]);
    expect(eventiDi('eventoScambio')).toHaveLength(0);
    // La finestra lo sa: le chip si spengono e il prossimo messaggio non va a questa domanda.
    expect(eventiDi('domandaChiusa')).toEqual([{ scambioId: 'i1', id: 'd9' }]);
  });

  it('[Fermati] ferma davvero: il segnale arriva al Nucleo e nessuna nuova scheda di permesso compare per quel lavoro', async () => {
    let segnale: AbortSignal | undefined;
    let continua!: () => void;
    const ripresa = new Promise<void>((r) => (continua = r));
    let decisioneDopo: unknown;
    let fine!: () => void;
    const finito = new Promise<void>((r) => (fine = r));
    gestisci = async (_m, _consegna, opzioni) => {
      segnale = opzioni?.annullamento;
      await ripresa;
      // L'SDK fa ancora in tempo a chiedere un permesso dopo [Fermati]: si nega senza mostrare nulla.
      const canale = ultimo.canali[0] as CanaleConferme;
      decisioneDopo = await canale.chiediConferma({ id: 'tardi', strumento: 'Bash', input: {}, descrizione: 'tardi', canaleOrigine: 'desktop', creataIl: 0 }, 60_000);
      fine();
    };
    await chiama('chat.invia', { scambioId: 'f1', testo: 'vai', canale: 'desktop' });
    await vi.waitFor(() => expect(segnale).toBeDefined());
    expect(segnale?.aborted).toBe(false);
    await chiama('chat.interrompi', 'f1');
    expect(segnale?.aborted).toBe(true);
    continua();
    await finito;
    expect(decisioneDopo).toEqual({ esito: 'nega', motivo: principale.chat.motivoInterrotto });
    expect(eventiDi('permesso')).toHaveLength(0);
  });

  it('le richieste di permesso nel flusso dello scambio non diventano schede: solo canaleDesktop le mostra', async () => {
    let fine!: () => void;
    const finito = new Promise<void>((r) => (fine = r));
    gestisci = async (_m, consegna) => {
      // Il Broker l'ha mandata su Telegram (desktop inattivo): la finestra non deve offrire un [Consenti] che non decide.
      await consegna({ tipo: 'permesso', richiesta: { id: 'tg1', strumento: 'Bash', input: {}, descrizione: 'su Telegram', canaleOrigine: 'desktop', creataIl: 0 } });
      await consegna({ tipo: 'fine', sessioneId: 's', durataMs: 1 });
      fine();
    };
    await chiama('chat.invia', { scambioId: 'tg', testo: 'vai', canale: 'desktop' });
    await finito;
    expect(eventiDi('eventoScambio').map((e) => e.evento.tipo)).toEqual(['fine']);
    expect(eventiDi('permesso')).toHaveLength(0);
  });

  it('permessi: scheda pulita alla finestra, decisione dalla finestra, chiusura annunciata', async () => {
    const canale = ultimo.canali[0] as CanaleConferme;
    const richiesta: RichiestaPermesso = {
      id: 'p1', strumento: 'Bash', input: { command: 'ls /Users/marco' }, descrizione: 'Vuole usare il terminale', anteprima: 'ls', canaleOrigine: 'desktop', creataIl: Date.now(), annullamento: new AbortController().signal,
    };
    const decisione = canale.chiediConferma(richiesta, 60_000);
    const scheda = eventiDi('permesso')[0]?.richiesta;
    expect(scheda).toMatchObject({ id: 'p1', descrizione: 'Vuole usare il terminale', input: null });
    expect(scheda && 'annullamento' in scheda).toBe(false);
    expect(await chiama('permessi.inAttesa')).toHaveLength(1);
    await chiama('permessi.decidi', 'p1', { esito: 'consenti' });
    await expect(decisione).resolves.toEqual({ esito: 'consenti' });
    expect(eventiDi('permessoChiuso')).toEqual(['p1']);
    expect(await chiama('permessi.inAttesa')).toHaveLength(0);
    // Una decisione tardiva non fa danni: la finestra viene solo avvisata di chiudere la scheda.
    await chiama('permessi.decidi', 'p1', { esito: 'nega', motivo: '' });
    expect(eventiDi('permessoChiuso')).toEqual(['p1', 'p1']);
  });

  it('permessi: annullamento della sessione → nega e scheda ritirata; finestra nascosta → notifica di sistema', async () => {
    finestraAttiva = false;
    const canale = ultimo.canali[0] as CanaleConferme;
    const ac = new AbortController();
    const decisione = canale.chiediConferma({ id: 'p2', strumento: 'Write', input: {}, descrizione: 'scrive', ruolo: 'contabile', canaleOrigine: 'desktop', creataIl: 0, annullamento: ac.signal }, 60_000);
    expect(piattaforma.notificaSistema).toHaveBeenCalledWith(principale.notifiche.permesso.titolo('Contabile'), principale.notifiche.permesso.apri);
    ac.abort();
    await expect(decisione).resolves.toMatchObject({ esito: 'nega' });
    expect(eventiDi('permessoChiuso')).toEqual(['p2']);
  });

  it('permessi: nega con il motivo predefinito se la finestra non ne dà uno; timeout → nega', async () => {
    const canale = ultimo.canali[0] as CanaleConferme;
    const d1 = canale.chiediConferma({ id: 'p3', strumento: 'Bash', input: {}, descrizione: '', canaleOrigine: 'desktop', creataIl: 0 }, 60_000);
    await chiama('permessi.decidi', 'p3', { esito: 'nega', motivo: '  ' });
    await expect(d1).resolves.toEqual({ esito: 'nega', motivo: "L'utente ha detto di no." });
    const d2 = canale.chiediConferma({ id: 'p4', strumento: 'Bash', input: {}, descrizione: '', canaleOrigine: 'desktop', creataIl: 0 }, 5);
    await expect(d2).resolves.toMatchObject({ esito: 'nega' });
  });

  it('disponibile(): finestra in primo piano oppure attività recente', async () => {
    const canale = ultimo.canali[0] as CanaleConferme;
    expect(canale.disponibile()).toBe(true);
    finestraAttiva = false;
    expect(canale.disponibile()).toBe(false);
    host.segnaAttivitaUtente();
    expect(canale.disponibile()).toBe(true);
    expect(ultimo.finto.broker.segnaAttivita).toHaveBeenCalledWith('desktop');
    await new Promise((r) => setTimeout(r, 1100));
    expect(canale.disponibile()).toBe(false);
  });

  it('marcatore [[APRI:TELEGRAM]] → la finestra apre la sezione; collegato → riga di sistema all\'assistente', async () => {
    ultimo.marcatori.get(MARCATORI_APP.APRI_TELEGRAM)?.();
    expect(eventiDi('apriSchermata')).toEqual([{ schermata: 'telegram' }]);
    const esito = await chiama('telegram.collegaConToken', '123456:ABC');
    expect(esito).toEqual({ ok: true, messaggio: 'ok' });
    const [messaggio] = ultimo.finto.dispatcher.gestisci.mock.calls.at(-1) ?? [];
    expect(messaggio).toMatchObject({ canale: 'sistema' });
    expect(messaggio?.testo).toContain('@bruno_marco_bot');
  });

  it('[[FINE:PROFILO]] visto → lo stato dice profiloCompletato (via il pulsante dei consigliati); "ricomincia" lo azzera', async () => {
    expect((await chiama('app.stato')).profiloCompletato).toBeUndefined();
    ultimo.visti.get(MARCATORI_APP.FINE_PROFILO)?.();
    await vi.waitFor(() => expect(eventiDi('statoApp').at(-1)?.profiloCompletato).toBe(true));
    await chiama('onboarding.ricomincia', 'presentazioni');
    expect((await chiama('app.stato')).profiloCompletato).toBeUndefined();
  });

  it('telegram.stato non porta il codice di pairing alla finestra', async () => {
    ultimo.finto.controlloTelegram.pairingInAttesa = () => [{ codice: 'K7P2QX', nomeMostrato: 'Marco', utenteId: 42 }] as never;
    const stato = await chiama('telegram.stato');
    // Stessa forma che usa la prova della finestra (fixture condivisa): codice vuoto, si digita.
    expect(stato.pairingInAttesa).toEqual({ ...PAIRING_PER_FINESTRA, scadeAlle: expect.any(String) });
    expect(JSON.stringify(stato)).not.toContain('K7P2QX');
  });

  it('chi è in abbonamento e prova una chiave sbagliata resta in abbonamento', async () => {
    await chiama('cervello.cambiaModalita', 'abbonamento');
    await vi.waitFor(async () => expect((await chiama('app.stato')).cervello.modalita).toBe('abbonamento'));
    expect(await chiama('cervello.collegaChiaveApi', 'sk-ant-api03-cattiva-cattiva-cattiva', 25, 'equilibrato')).toMatchObject({ ok: false });
    expect((await chiama('app.stato')).cervello.modalita).toBe('abbonamento');
  });

  it('chiave API: formato, prova prima di salvare, poi riavvio del Nucleo con la nuova configurazione', async () => {
    expect(await chiama('cervello.collegaChiaveApi', 'non-una-chiave', 25, 'equilibrato')).toMatchObject({ ok: false, codice: 'formato' });
    expect(await chiama('cervello.collegaChiaveApi', 'sk-ant-api03-cattiva-cattiva-cattiva', 25, 'equilibrato')).toMatchObject({ ok: false, codice: 'credenziali' });
    expect(ultimo.segreti.size).toBe(0);
    const ok = await chiama('cervello.collegaChiaveApi', 'sk-ant-api03-buona-buona-buona-buona', 10, 'economico');
    expect(ok.ok).toBe(true);
    await vi.waitFor(() => expect(avvii).toBe(2));
    const config = JSON.parse(fs.readFileSync(path.join(percorsi.datiApp, 'config.json'), 'utf8'));
    expect(config.cervello).toMatchObject({ modalita: 'chiave_api', livello: 'economico', tetto_mensile_eur: 10 });
    await vi.waitFor(() => expect(eventiDi('statoApp').at(-1)?.schermataIniziale).toBe('cervello'));
    // Il nuovo Nucleo finto ha un deposito vuoto: lo stato lo dice (la chiave non torna mai alla finestra).
    expect(JSON.stringify(eventi)).not.toContain('buona-buona');
  });

  it('cambiaModalita: riavvia il Nucleo solo se la modalità cambia davvero', async () => {
    await chiama('cervello.cambiaModalita', 'chiave_api');
    expect(avvii).toBe(1);
    await chiama('cervello.cambiaModalita', 'abbonamento');
    await vi.waitFor(() => expect(avvii).toBe(2));
    const stato = await chiama('app.stato');
    expect(stato.cervello.modalita).toBe('abbonamento');
    expect(stato.schermataIniziale).toBe('cervello');
  });

  it('apriNelSistema e memoria: solo dentro la cartella (e la memoria solo in profilo/ e memoria/)', async () => {
    fs.writeFileSync(path.join(percorsi.cartellaLavoro, 'memoria', 'MEMORIA.md'), '# Memoria di Marco\n- prima riga\n');
    fs.writeFileSync(path.join(percorsi.cartellaLavoro, 'CLAUDE.md'), '# regole');
    fs.writeFileSync(path.join(percorsi.cartellaLavoro, 'script.command'), 'echo');
    await expect(chiama('app.apriNelSistema', '../fuori')).rejects.toThrow(principale.errori.percorsoNonConsentito);
    await expect(chiama('app.apriNelSistema', 'manca.md')).rejects.toThrow(/Non trovo/);
    await chiama('app.apriNelSistema', 'memoria');
    expect(piattaforma.apriPercorso).toHaveBeenCalledWith(path.join(percorsi.cartellaLavoro, 'memoria'));
    await chiama('app.apriNelSistema', 'script.command');
    expect(piattaforma.mostraNellaCartella).toHaveBeenCalled();
    expect(await chiama('memoria.elenco')).toEqual([expect.objectContaining({ percorso: 'memoria/MEMORIA.md', titolo: 'Memoria di Marco' })]);
    expect(await chiama('memoria.leggi', 'memoria/MEMORIA.md')).toContain('prima riga');
    await expect(chiama('memoria.leggi', 'CLAUDE.md')).rejects.toThrow(principale.errori.percorsoNonConsentito);
  });

  it('impostazioni: si leggono e si salvano in config.json; il cambio riavvia il Nucleo', async () => {
    const attuali = await chiama('impostazioni.leggi');
    expect(attuali.orari).toEqual({ silenzioDa: '21:00', silenzioA: '08:00', domenica: 'silenzio' });
    await chiama('impostazioni.salva', { ...attuali, brief: { attivo: true, ora: '07:30', canale: 'desktop' }, avvioAutomatico: true });
    const config = JSON.parse(fs.readFileSync(path.join(percorsi.datiApp, 'config.json'), 'utf8'));
    expect(config.brief).toEqual({ attivo: true, ora: '07:30', canale: 'desktop' });
    expect(piattaforma.impostaAvvioAutomatico).toHaveBeenCalledWith(true);
    await vi.waitFor(() => expect(avvii).toBe(2));
    expect((await chiama('impostazioni.leggi')).avvioAutomatico).toBe(true);
  });

  it('esportaTutto: annullato → null; scelto → zip e percorso con la home abbreviata', async () => {
    expect(await chiama('app.esportaTutto')).toBeNull();
    const destinazione = path.join(radice, 'copia.zip');
    piattaforma.scegliDestinazioneZip = async () => destinazione;
    const mostrato = await chiama('app.esportaTutto');
    expect(fs.existsSync(destinazione)).toBe(true);
    // Mai un percorso assoluto verso la finestra: "~/…" sotto la home, altrimenti solo il nome del file.
    expect(mostrato === 'copia.zip' || mostrato?.startsWith('~/')).toBe(true);
  });

  it('ponte IPC: parametri non validi, errori per l\'utente e errori interni', async () => {
    const ponte = creaPonteIpc(host, () => logger);
    await expect(ponte('app.boh', [])).rejects.toThrow(/sconosciuta/);
    await expect(ponte('memoria.leggi', ['/etc/passwd'])).rejects.toThrow(/^Richiesta non valida/);
    await expect(ponte('memoria.leggi', ['profilo/manca.md'])).rejects.toThrow('Non trovo profilo/manca.md.');
    ultimo.finto.memoria.cerca.mockRejectedValueOnce(new Error('SQLITE_CORRUPT /home/marco/.local/indice.db'));
    await expect(ponte('memoria.cerca', ['fattura'])).rejects.toThrow(/^Qualcosa è andato storto/);
    expect(await ponte('memoria.riepilogoProfilo', [])).toBe('Sei Marco.');
  });

  it('ferma(): nega i permessi aperti e ferma il Nucleo', async () => {
    const canale = ultimo.canali[0] as CanaleConferme;
    const d = canale.chiediConferma({ id: 'p9', strumento: 'Bash', input: {}, descrizione: '', canaleOrigine: 'desktop', creataIl: 0 }, 60_000);
    const finto = ultimo.finto;
    await host.ferma();
    await expect(d).resolves.toMatchObject({ esito: 'nega' });
    expect(finto.ferma).toHaveBeenCalled();
    await expect(chiama('app.stato')).rejects.toThrow(principale.errori.nucleoNonPronto);
  });
});

describe('pannello di collegamento dall\'host: ambiente vero, cartella dedicata, solo quando serve', () => {
  const INQUINATE: Record<string, string> = {
    CLAUDE_CODE_OAUTH_TOKEN: 'oauth-segreto',
    ANTHROPIC_AUTH_TOKEN: 'auth-segreto',
    ANTHROPIC_BASE_URL: 'https://intermediario.invalid',
    ANTHROPIC_CUSTOM_HEADERS: 'x-chi: altro',
    CLAUDE_CODE_USE_BEDROCK: '1',
    CLAUDE_CODE_USE_VERTEX: '1',
    AWS_BEARER_TOKEN_BEDROCK: 'bedrock-segreto',
    CLAUDE_CONFIG_DIR: '/config-ereditata',
    CLAUDECODE: '1',
    CLAUDE_CODE_ENTRYPOINT: 'cli',
    CLAUDE_CODE_SESSION_ID: 'sessione-ospite',
    ANTHROPIC_API_KEY: 'sk-ant-trovata-per-caso',
  };
  let radice: string;
  let prima: Record<string, string | undefined>;

  beforeEach(() => {
    radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-pannello-'));
    process.env.SPALLA_HOME = radice;
    prima = Object.fromEntries(Object.keys(INQUINATE).map((k) => [k, process.env[k]]));
    Object.assign(process.env, INQUINATE);
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(prima)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    delete process.env.SPALLA_HOME;
    fs.rmSync(radice, { recursive: true, force: true });
  });

  it('rifiuta il pannello fuori dall\'abbonamento o se già collegato; il binario non riceve accessi né indirizzi ereditati', async () => {
    const percorsi = calcolaPercorsi();
    fs.mkdirSync(percorsi.datiApp, { recursive: true });
    const pty = { onData: () => undefined, onExit: () => undefined, write: vi.fn(), resize: vi.fn(), kill: vi.fn() };
    const spawnPty = vi.fn((_f: string, _a: string[], _o: { cwd: string; env: Record<string, string> }) => pty);
    const variabiliProva: Record<string, string>[] = [];
    const host = creaHostNucleo({
      percorsi,
      piattaforma: {
        versione: '0.0.1', nomeProdotto: 'Spalla', finestraAttiva: () => true, apriPercorso: async () => '', mostraNellaCartella: vi.fn(),
        apriLink: async () => undefined, scegliDestinazioneZip: async () => undefined, avvioAutomatico: () => undefined,
        impostaAvvioAutomatico: vi.fn(), notificaSistema: vi.fn(), nascondiFinestra: vi.fn(),
      },
      emetti: () => undefined,
      logger,
      avviaNucleo: async () => nucleoFinto(percorsi, async () => undefined).nucleo,
      trovaBinario: () => '/sdk/claude',
      spawnPty,
      prova: async (variabili, opzioni) => {
        // La prova di collegamento usa lo stesso ambiente del binario: niente accesso trovato nell'ambiente.
        const { ambientePerBinario } = await import('../src/nucleo/runtime/index.js');
        variabiliProva.push(ambientePerBinario(opzioni.runtime, variabili));
        return { ok: true };
      },
    });
    await host.avvia();
    try {
      // Modalità predefinita: chiave API → il pannello (fuori dal Permission Broker) non si apre.
      await expect(host.chiama('cervello.avviaPannelloLogin', [])).rejects.toThrow(principale.pannello.soloAbbonamento);
      expect(spawnPty).not.toHaveBeenCalled();

      await host.chiama('cervello.cambiaModalita', ['abbonamento']);
      expect(await host.chiama('cervello.avviaPannelloLogin', [])).toMatchObject({ attivo: true });
      const opzioni = spawnPty.mock.calls[0]?.[2];
      expect(opzioni?.cwd).toBe(path.join(percorsi.datiLocali, 'collegamento'));
      expect(opzioni?.cwd).not.toBe(percorsi.cartellaLavoro);
      expect(fs.existsSync(opzioni?.cwd ?? '')).toBe(true);
      const env = opzioni?.env ?? {};
      expect(env.CLAUDE_CONFIG_DIR).toBe(percorsi.configClaude);
      for (const nome of Object.keys(INQUINATE).filter((k) => k !== 'CLAUDE_CONFIG_DIR')) expect(env).not.toHaveProperty(nome);
      if (process.env.PATH) expect(env.PATH).toBe(process.env.PATH);

      // Verifica riuscita: il pannello si chiude da solo e non si riapre.
      expect(await host.chiama('cervello.verifica', [])).toMatchObject({ ok: true });
      expect(pty.kill).toHaveBeenCalled();
      for (const v of variabiliProva) for (const nome of Object.keys(INQUINATE).filter((k) => k !== 'CLAUDE_CONFIG_DIR')) expect(v).not.toHaveProperty(nome);
      await expect(host.chiama('cervello.avviaPannelloLogin', [])).rejects.toThrow(principale.pannello.giaCollegato);
      expect(spawnPty).toHaveBeenCalledTimes(1);
    } finally {
      await host.ferma();
    }
  });
});
