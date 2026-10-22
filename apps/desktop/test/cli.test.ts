import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRuntime, Broker, DomandaUtente, EventoAssistente, Logger, MessaggioIn, Onboarding, OpzioniInvio } from '../src/nucleo/contratti.js';
import { creaCli } from '../src/cli/cli.js';
import type { ControlloTelegram } from '../src/nucleo/controllo-telegram.js';
import { creaDispatcher } from '../src/nucleo/dispatcher.js';
import { interpretaConferma, creaCanaleConfermeCli } from '../src/cli/canale-conferme-cli.js';
import { configIniziale, leggiConfig, scriviConfig } from '../src/cli/config-dev.js';
import { creaLoggerFile, oscura } from '../src/cli/logger.js';
import { creaRenderer, creaRispondiDomanda, formattaCosto, interpretaScelta } from '../src/cli/rendering.js';
import { creaTerminale } from '../src/cli/terminale.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };

function terminaleDiProva() {
  const input = new PassThrough();
  const output = new PassThrough();
  let scritto = '';
  output.on('data', (c: Buffer) => { scritto += c.toString(); });
  const t = creaTerminale(input, output);
  return { t, input, uscita: () => scritto, digita: (riga: string) => input.write(riga + '\n'), chiudiIngresso: () => input.end() };
}

async function* eventi(lista: EventoAssistente[]): AsyncGenerator<EventoAssistente> {
  for (const e of lista) yield e;
}

describe('terminale', () => {
  it('consegna le righe in ordine, anche quelle digitate in anticipo', async () => {
    const { t, digita, uscita, chiudiIngresso } = terminaleDiProva();
    digita('prima');
    expect(await t.chiedi('> ')).toBe('prima');
    const attesa = t.chiedi('> ');
    digita('seconda');
    expect(await attesa).toBe('seconda');
    chiudiIngresso();
    await new Promise((r) => setTimeout(r, 10));
    expect(await t.chiedi('> ')).toBeNull();
    expect(t.chiuso).toBe(true);
    expect(uscita()).toContain('> > ');
  });

  it('serve le righe arrivate prima della chiusura dell\'ingresso (input da file)', async () => {
    const { t, digita, chiudiIngresso } = terminaleDiProva();
    digita('uno');
    digita('due');
    chiudiIngresso();
    await new Promise((r) => setTimeout(r, 10));
    expect(await t.chiedi('> ')).toBe('uno');
    expect(await t.chiedi('> ')).toBe('due');
    expect(await t.chiedi('> ')).toBeNull();
  });
});

describe('resa degli eventi', () => {
  it('frammenti, testo completo, strumenti, fine ed errori', () => {
    const { t, uscita } = terminaleDiProva();
    const r = creaRenderer(t);
    r.mostra({ tipo: 'testo', testo: 'Ciao', parziale: true });
    r.mostra({ tipo: 'testo', testo: ' Marco', parziale: true });
    r.mostra({ tipo: 'testo', testo: 'Ciao Marco', parziale: false });
    r.mostra({ tipo: 'strumento', nome: 'Read', descrizione: 'Leggo memoria/agenda.md', ruolo: 'segretaria' });
    r.mostra({ tipo: 'testo', testo: 'Fatto.', parziale: false });
    r.mostra({ tipo: 'fine', sessioneId: 's', durataMs: 3200, costoUsd: 0.0123 });
    r.mostra({ tipo: 'errore', messaggio: 'Qualcosa è andato storto.', codice: 'altro' });
    expect(uscita()).toBe('Ciao Marco\n  · [segretaria] Leggo memoria/agenda.md\nFatto.\n— fatto in 3,2 s · 0,012 $\n! Qualcosa è andato storto.\n');
  });

  it('formatta i costi piccoli con più cifre', () => {
    expect(formattaCosto(0.0042)).toBe('0.0042');
    expect(formattaCosto(0.25)).toBe('0.250');
    expect(formattaCosto(undefined)).toBeUndefined();
  });
});

describe('domande con opzioni numerate', () => {
  const domanda: DomandaUtente = { id: 'd1', testo: 'Come ti chiamo?', intestazione: 'Nome', opzioni: [{ etichetta: 'Marco', descrizione: 'per nome' }, { etichetta: 'Sig. Benassi' }], multiSelezione: false };
  const multipla: DomandaUtente = { ...domanda, id: 'd2', multiSelezione: true };

  it('interpreta numeri, numeri multipli e testo libero', () => {
    expect(interpretaScelta('2', domanda)).toEqual(['Sig. Benassi']);
    expect(interpretaScelta('1, 2', domanda)).toEqual(['Marco']);
    expect(interpretaScelta('1, 2, 1', multipla)).toEqual(['Marco', 'Sig. Benassi']);
    expect(interpretaScelta('chiamami Marchino', domanda)).toEqual(['chiamami Marchino']);
    expect(interpretaScelta('9', domanda)).toEqual(['9']);
    expect(interpretaScelta('   ', domanda)).toEqual([]);
  });

  it('mostra le chip e raccoglie la risposta', async () => {
    const { t, digita, uscita } = terminaleDiProva();
    const rispondi = creaRispondiDomanda(t);
    const promessa = rispondi(domanda);
    digita('');
    digita('1');
    expect(await promessa).toEqual({ id: 'd1', risposte: ['Marco'] });
    expect(uscita()).toContain('Nome: Come ti chiamo?');
    expect(uscita()).toContain('  1) Marco — per nome');
    expect(uscita()).toContain('  2) Sig. Benassi');
  });
});

describe('canale conferme del terminale', () => {
  it('s → consenti, altro → nega, ingresso chiuso → nega', () => {
    expect(interpretaConferma('s')).toEqual({ esito: 'consenti' });
    expect(interpretaConferma('Sì')).toEqual({ esito: 'consenti' });
    expect(interpretaConferma('n').esito).toBe('nega');
    expect(interpretaConferma('boh').esito).toBe('nega');
    expect(interpretaConferma(null)).toMatchObject({ esito: 'nega', motivo: expect.stringMatching(/chiuso/) });
  });

  it('se la sessione si interrompe ritira la domanda: la riga successiva non è una risposta alla scheda vecchia', async () => {
    const { t, digita, uscita } = terminaleDiProva();
    const canale = creaCanaleConfermeCli(t);
    const controller = new AbortController();
    const promessa = canale.chiediConferma({ id: 'abc234', strumento: 'Bash', input: {}, descrizione: 'x', canaleOrigine: 'desktop', creataIl: Date.now(), annullamento: controller.signal }, 1000);
    await new Promise((r) => setTimeout(r, 5));
    controller.abort();
    expect(await promessa).toEqual({ esito: 'nega', motivo: expect.stringMatching(/non serve più/) });
    expect(uscita()).toContain('Richiesta annullata');
    const dopo = t.chiedi('> ');
    digita('sì, mandalo');
    expect(await dopo).toBe('sì, mandalo');
  });

  it('mostra la scheda con anteprima e chiede s/n', async () => {
    const { t, digita, uscita } = terminaleDiProva();
    const canale = creaCanaleConfermeCli(t);
    expect(canale.nome).toBe('desktop');
    expect(canale.disponibile()).toBe(true);
    const promessa = canale.chiediConferma({ id: 'k7m2xq', strumento: 'Bash', input: {}, descrizione: "L'assistente vuole eseguire un comando sul computer", anteprima: '$ ls', canaleOrigine: 'desktop', creataIl: Date.now() }, 1000);
    digita('s');
    expect(await promessa).toEqual({ esito: 'consenti' });
    expect(uscita()).toContain('Richiesta di permesso [k7m2xq]');
    expect(uscita()).toContain('    $ ls');
    expect(uscita()).toContain('Consenti? [s/n] ');
  });
});

describe('creaCli', () => {
  function runtimeFinto(risposte: EventoAssistente[][]) {
    let i = 0;
    const invia = vi.fn((_m: MessaggioIn, _o?: OpzioniInvio) => eventi(risposte[i++] ?? []));
    const runtime: AgentRuntime = { invia, nuovaSessione: vi.fn(async () => undefined), sessioneCorrente: () => 'sess-1', statoCosti: async () => ({ meseUsd: 0.5, tettoEur: 25, sopraTetto: false }) };
    return { runtime, invia };
  }
  const broker: Broker = { chiedi: vi.fn(), registraCanale: vi.fn(), segnaAttivita: vi.fn() };

  it('messaggi, comandi e uscita', async () => {
    const { t, digita, uscita } = terminaleDiProva();
    const { runtime, invia } = runtimeFinto([[{ tipo: 'testo', testo: 'Ciao!', parziale: false }, { tipo: 'fine', sessioneId: 's', durataMs: 1000 }]]);
    const cli = creaCli({ runtime, broker, terminale: t, logger, info: { prodotto: 'Spalla', modalita: 'chiave_api' } });
    const fine = cli.avvia();
    digita('ciao');
    digita('/stato');
    digita('/nuova');
    digita('/boh');
    digita('/aiuto');
    digita('/esci');
    await fine;
    expect(invia).toHaveBeenCalledWith({ testo: 'ciao', canale: 'desktop' }, expect.objectContaining({ rispondiDomanda: expect.any(Function) }));
    expect(runtime.nuovaSessione).toHaveBeenCalledTimes(1);
    expect(broker.registraCanale).toHaveBeenCalledWith(cli.canaleConferme);
    expect(broker.segnaAttivita).toHaveBeenCalledWith('desktop');
    const u = uscita();
    expect(u).toContain('Spalla — terminale di sviluppo · cervello: chiave API');
    expect(u).toContain('Ciao!\n— fatto in 1,0 s\n');
    expect(u).toContain('Argomento in corso: sess-1');
    expect(u).toContain('Spesa del mese: 0,50 $ (tetto 25 €)');
    expect(u).toContain('Argomento chiuso');
    expect(u).toContain('Comando "/boh" sconosciuto');
    expect(u).toContain('/nuova   chiude');
    expect(u).toContain('A presto.');
  });

  it('con l\'onboarding da fare manda il messaggio iniziale in una sessione nuova e poi segnala il completamento', async () => {
    const { t, digita, uscita } = terminaleDiProva();
    const { runtime, invia } = runtimeFinto([[{ tipo: 'testo', testo: 'Ciao, come ti chiamo?', parziale: false }], [{ tipo: 'testo', testo: 'Piacere Marco.', parziale: false }]]);
    let stato: 'da_fare' | 'in_corso' | 'completato' = 'da_fare';
    const onboarding: Onboarding = {
      stato: async () => stato,
      prepara: vi.fn(async () => { stato = 'in_corso'; }),
      messaggioIniziale: async () => 'RITUALE',
      valida: vi.fn(async () => ['manca IDENTITA.md']),
      completa: async () => undefined,
    };
    const cli = creaCli({ runtime, broker, terminale: t, logger, onboarding });
    const fine = cli.avvia();
    await vi.waitFor(() => expect(invia).toHaveBeenCalledTimes(1));
    stato = 'completato';
    digita('Marco');
    digita('/esci');
    await fine;
    expect(onboarding.prepara).toHaveBeenCalledTimes(1);
    expect(runtime.nuovaSessione).toHaveBeenCalledTimes(1);
    expect(invia.mock.calls[0]?.[0]).toEqual({ testo: 'RITUALE', canale: 'desktop' });
    expect(invia.mock.calls[1]?.[0]).toEqual({ testo: 'Marco', canale: 'desktop' });
    expect(uscita()).toContain('Presentazioni concluse.');
    expect(uscita()).toContain('  - manca IDENTITA.md');
  });

  it('con il dispatcher gli scambi passano da lì e il marcatore del rituale apre la procedura Telegram', async () => {
    const { t, digita, uscita } = terminaleDiProva();
    const { runtime, invia } = runtimeFinto([
      [{ tipo: 'testo', testo: 'Apro il collegamento.\n[[APRI:TELEGRAM]]\n', parziale: false }, { tipo: 'fine', sessioneId: 's', durataMs: 1000 }],
      [{ tipo: 'testo', testo: 'Va bene, dopo.', parziale: false }, { tipo: 'fine', sessioneId: 's', durataMs: 500 }],
    ]);
    const dispatcher = creaDispatcher({ runtime, broker, logger });
    const controllo: ControlloTelegram = {
      attivo: () => false, username: () => undefined, pairingInAttesa: () => [], eRigaBotFather: (x) => /^\d{8,10}:/.test(x),
      suggerimenti: () => ({ nome: 'Spalla di me', username: 'spalla_di_me_abcd_bot', link: 'https://t.me/BotFather', passi: ['Apri BotFather.'] }),
      collega: vi.fn(async () => ({ ok: false, messaggio: 'no' })), confermaPairing: vi.fn(async () => ({ ok: false, messaggio: 'no' })),
    };
    const cli = creaCli({ runtime, broker, terminale: t, logger, dispatcher, telegramControllo: controllo, cartellaLavoro: '/nessuna/cartella' });
    const fine = cli.avvia();
    digita('sì, collega Telegram');
    await vi.waitFor(() => expect(uscita()).toContain('Riga di BotFather (Invio per rimandare): '));
    digita('');
    await vi.waitFor(() => expect(invia).toHaveBeenCalledTimes(2));
    digita('/esci');
    await fine;
    const u = uscita();
    expect(u).toContain('Apro il collegamento.\n');
    expect(u).not.toContain('[[APRI:TELEGRAM]]');
    expect(u).toContain('Colleghiamo Telegram in tre minuti');
    expect(u).toContain('spalla_di_me_abcd_bot');
    expect(u).toContain('Va bene, Telegram lo colleghi quando vuoi con /telegram.');
    expect(invia.mock.calls[1]?.[0]).toEqual({ testo: expect.stringMatching(/^Telegram non è stato collegato adesso/), canale: 'sistema' });
    expect(u).toContain('Va bene, dopo.');
  });

  it('/telegram <riga> collega, /telegram <codice> conferma il telefono, /memoria mostra i contatori', async () => {
    const { t, digita, uscita } = terminaleDiProva();
    const { runtime } = runtimeFinto([]);
    let attivo = false;
    const controllo: ControlloTelegram = {
      attivo: () => attivo, username: () => (attivo ? 'spalla_7k3p_bot' : undefined), pairingInAttesa: () => (attivo ? [{ codice: 'k7m2xq', nomeMostrato: 'Marco B.', utenteId: 42 }] : []),
      eRigaBotFather: (x) => /^\d{8,10}:/.test(x),
      suggerimenti: () => ({ nome: 'x', username: 'x_bot', link: 'https://t.me/BotFather', passi: [] }),
      collega: vi.fn(async () => { attivo = true; return { ok: true, username: 'spalla_7k3p_bot', messaggio: 'Collegato a @spalla_7k3p_bot.' }; }),
      confermaPairing: vi.fn(async (codice: string) => ({ ok: codice === 'k7m2xq', messaggio: codice === 'k7m2xq' ? 'ok' : 'Il codice non è giusto.' })),
    };
    const memoria = {
      avvia: async () => undefined, ferma: async () => undefined, cerca: async () => [], ricostruisciIndice: vi.fn(async () => undefined),
      contatori: async () => ({ memoriaRighe: 9, memoriaByte: 400, utenteCaratteri: 1200, schede: 3, diari: 2 }), controllaTetti: () => null, appendiDiario: async () => undefined,
      statoIndice: async () => ({ file: 12, blocchi: 40, osservazione: 'fs.watch' }),
    };
    const cli = creaCli({ runtime, broker, terminale: t, logger, telegramControllo: controllo, memoria, avviaServizi: false });
    const fine = cli.avvia();
    digita('/telegram 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi');
    digita('/stato');
    digita('/telegram zzz999');
    digita('/telegram k7m2xq');
    digita('/memoria ricostruisci');
    digita('/aiuto');
    digita('/esci');
    await fine;
    const u = uscita();
    expect(controllo.collega).toHaveBeenCalledWith('123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi');
    expect(u).toContain('Collegato a @spalla_7k3p_bot.');
    expect(u).toContain('Telegram: collegato come @spalla_7k3p_bot');
    expect(u).toContain('Telegram: 1 telefono aspetta il codice (/telegram <codice>)');
    expect(u).toContain('Il codice non è giusto.');
    expect(u).toContain('Fatto: su Telegram @spalla_7k3p_bot risponde solo a te.');
    expect(memoria.ricostruisciIndice).toHaveBeenCalledTimes(1);
    expect(u).toContain('Ricerca nella memoria rimessa in ordine.');
    expect(u).toContain('Memoria: 9/200 righe');
    expect(u).toContain('Schede: 3 · diari: 2 · profilo utente: 1200/4000 caratteri');
    expect(u).toContain('Ricerca nella memoria: 12 file, 40 passaggi (aggiornamento: fs.watch).');
    expect(u).toContain('/telegram collega Telegram');
    expect(u).toContain('/memoria contatori della memoria');
  });
});

describe('config e log di sviluppo', () => {
  let cartella: string;
  beforeEach(() => { cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-cli-')); });
  afterEach(() => { fs.rmSync(cartella, { recursive: true, force: true }); });

  it('config.json: assente, valida, non valida; conserva le altre sezioni', () => {
    expect(leggiConfig(cartella)).toBeUndefined();
    scriviConfig(cartella, { ...configIniziale('chiave_api'), telegram: { attivo: false } });
    expect(leggiConfig(cartella)).toEqual({ cervello: { modalita: 'chiave_api', livello: 'equilibrato', tetto_mensile_eur: 25 }, telegram: { attivo: false } });
    fs.writeFileSync(path.join(cartella, 'config.json'), JSON.stringify({ cervello: { modalita: 'boh' } }));
    expect(leggiConfig(cartella)).toBeUndefined();
    expect(configIniziale('abbonamento').cervello.tetto_mensile_eur).toBeNull();
  });

  it('il logger scrive righe JSON e oscura le chiavi', () => {
    const adesso = () => new Date('2026-10-22T10:00:00.000Z');
    const log = creaLoggerFile(cartella, { adesso });
    log.info('prova', { chiave: 'sk-ant-api03-abcdefghijklmnop', token: '123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij', n: 1 });
    const righe = fs.readFileSync(path.join(cartella, 'spalla-2026-10-22.log'), 'utf8').trim().split('\n');
    expect(righe).toHaveLength(1);
    const r = JSON.parse(righe[0]!);
    expect(r).toMatchObject({ livello: 'info', evento: 'prova', dati: { chiave: 'sk-ant-…', token: '<token>', n: 1 } });
    expect(oscura(['sk-ant-abcdefghijk'])).toEqual(['sk-ant-…']);
  });
});
