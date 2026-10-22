import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { principale } from '@spalla/it-copy';
import { allegatiPerNucleo, copiaAllegati, LIMITE_ALLEGATO_BYTE } from '../src/main/allegati.js';
import { autoverificaBinario, dentroAsar, fuoriDaAsar, pacchettiCandidati, trovaBinarioClaude } from '../src/main/binario.js';
import { crc32, scriviZip } from '../src/main/esporta.js';
import { impostazioniDaConfig, modificheConfig } from '../src/main/impostazioni.js';
import { creaPannelloLogin, type PtyMinimo } from '../src/main/pannello-login.js';
import { risolviDentro, comeAprire } from '../src/main/percorsi-sicuri.js';
import { calcolaSchermataIniziale } from '../src/main/stato-finestra.js';
import { ConfigSchema } from '@spalla/schema';
import type { Logger } from '../src/nucleo/contratti.js';

const logger: Logger = { info: vi.fn(), avviso: vi.fn(), errore: vi.fn() };
let radice: string;

beforeEach(() => {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-main-'));
});
afterEach(() => {
  fs.rmSync(radice, { recursive: true, force: true });
});

/** Lettore ZIP minimo per la prova: directory centrale → voci decompresse. */
function leggiZip(file: string): Map<string, Buffer | null> {
  const b = fs.readFileSync(file);
  const fine = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const voci = b.readUInt16LE(fine + 10);
  let p = b.readUInt32LE(fine + 16);
  const esito = new Map<string, Buffer | null>();
  for (let i = 0; i < voci; i++) {
    expect(b.readUInt32LE(p)).toBe(0x02014b50);
    const metodo = b.readUInt16LE(p + 10);
    const crc = b.readUInt32LE(p + 16);
    const compressa = b.readUInt32LE(p + 20);
    const lungNome = b.readUInt16LE(p + 28);
    const offset = b.readUInt32LE(p + 42);
    const nome = b.subarray(p + 46, p + 46 + lungNome).toString('utf8');
    const inizioDati = offset + 30 + b.readUInt16LE(offset + 26) + b.readUInt16LE(offset + 28);
    const grezzi = b.subarray(inizioDati, inizioDati + compressa);
    const dati = nome.endsWith('/') ? null : metodo === 8 ? zlib.inflateRawSync(grezzi) : Buffer.from(grezzi);
    if (dati) expect(crc32(dati)).toBe(crc);
    esito.set(nome, dati);
    p += 46 + lungNome + b.readUInt16LE(p + 30) + b.readUInt16LE(p + 32);
  }
  return esito;
}

describe('esporta: zip della cartella di lavoro', () => {
  it('scrive uno zip valido con cartelle vuote, nomi accentati e file compressi', async () => {
    const cartella = path.join(radice, 'Spalla');
    fs.mkdirSync(path.join(cartella, 'memoria', 'temi'), { recursive: true });
    fs.mkdirSync(path.join(cartella, 'lavoro', 'cestino'), { recursive: true });
    fs.writeFileSync(path.join(cartella, 'CLAUDE.md'), '# Regole\n'.repeat(200));
    fs.writeFileSync(path.join(cartella, 'memoria', 'temi', 'perché-così.md'), 'àèìòù € ✓');
    fs.writeFileSync(path.join(cartella, 'vuoto.txt'), '');
    fs.symlinkSync('/etc', path.join(cartella, 'collegamento'));
    const zip = path.join(radice, 'copia.zip');
    const esito = await scriviZip(cartella, zip);
    expect(esito).toMatchObject({ file: 3, saltati: ['collegamento'] });
    const voci = leggiZip(zip);
    expect(voci.get('Spalla/CLAUDE.md')?.toString()).toBe('# Regole\n'.repeat(200));
    expect(voci.get('Spalla/memoria/temi/perché-così.md')?.toString()).toBe('àèìòù € ✓');
    expect(voci.get('Spalla/vuoto.txt')?.length).toBe(0);
    expect(voci.has('Spalla/lavoro/cestino/')).toBe(true);
    expect([...voci.keys()].some((n) => n.includes('collegamento'))).toBe(false);
    expect(fs.existsSync(`${zip}.parziale`)).toBe(false);
    // Se c'è `unzip` sul sistema, deve trovarlo integro.
    try {
      execFileSync('unzip', ['-tq', zip], { stdio: 'pipe' });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  });

  it('lo zip dentro la cartella stessa non include sé stesso', async () => {
    const cartella = path.join(radice, 'Spalla');
    fs.mkdirSync(cartella);
    fs.writeFileSync(path.join(cartella, 'a.txt'), 'a');
    const zip = path.join(cartella, 'copia.zip');
    await scriviZip(cartella, zip);
    expect([...leggiZip(zip).keys()]).toEqual(['Spalla/', 'Spalla/a.txt']);
  });

  it('crc32 come zlib', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });
});

describe('allegati trascinati', () => {
  it('copia in lavoro/in-arrivo, rifiuta cartelle vietate, file troppo grandi e percorsi relativi', async () => {
    const lavoro = path.join(radice, 'Spalla');
    const datiApp = path.join(radice, 'dati-app');
    fs.mkdirSync(lavoro);
    fs.mkdirSync(datiApp);
    const fuori = path.join(radice, 'preventivo finale.pdf');
    fs.writeFileSync(fuori, 'pdf');
    fs.writeFileSync(path.join(datiApp, 'config.json'), '{}');
    const grande = path.join(radice, 'grande.bin');
    fs.writeFileSync(grande, '');
    fs.truncateSync(grande, LIMITE_ALLEGATO_BYTE + 1);
    const esito = await copiaAllegati([fuori, path.join(datiApp, 'config.json'), grande, 'relativo.txt', path.join(radice, 'manca.pdf')], {
      cartellaLavoro: lavoro,
      vietate: [datiApp],
      testi: principale.allegati,
      adesso: () => new Date(2026, 9, 22, 10, 12),
    });
    expect(esito.copiati).toEqual(['lavoro/in-arrivo/2026-10-22_1012_preventivo finale.pdf']);
    expect(esito.saltati).toHaveLength(4);
    expect(esito.saltati[1]).toContain('troppo grande');
    expect(fs.readFileSync(path.join(lavoro, 'lavoro', 'in-arrivo', '2026-10-22_1012_preventivo finale.pdf'), 'utf8')).toBe('pdf');
    expect(await allegatiPerNucleo([...esito.copiati, 'memoria/MEMORIA.md', 'lavoro/in-arrivo/manca.pdf'], lavoro)).toEqual([
      path.join(lavoro, 'lavoro', 'in-arrivo', '2026-10-22_1012_preventivo finale.pdf'),
    ]);
  });

  it('risolviDentro: niente uscite, nemmeno con un collegamento simbolico', () => {
    const lavoro = path.join(radice, 'Spalla');
    fs.mkdirSync(lavoro);
    fs.symlinkSync(radice, path.join(lavoro, 'scappatoia'));
    expect(risolviDentro(lavoro, 'memoria/a.md')).toBe(path.join(lavoro, 'memoria', 'a.md'));
    expect(risolviDentro(lavoro, '../x')).toBeUndefined();
    expect(risolviDentro(lavoro, '/etc/passwd')).toBeUndefined();
    expect(risolviDentro(lavoro, 'scappatoia')).toBeUndefined();
  });
});

describe('apriNelSistema: solo cartelle e documenti noti si aprono', () => {
  it('eseguibili, collegamenti travestiti, file senza estensione, pacchetti e immagini disco si mostrano nella cartella', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-apri-'));
    try {
      const f = (nome: string, modo = 0o644) => {
        const p = path.join(dir, nome);
        fs.writeFileSync(p, 'x');
        fs.chmodSync(p, modo);
        return p;
      };
      fs.mkdirSync(path.join(dir, 'memoria'));
      fs.mkdirSync(path.join(dir, 'Programma.app'));
      const comando = f('x.command', 0o755);
      expect(await comeAprire(f('nota.md'), 'darwin')).toBe('apri');
      expect(await comeAprire(f('fattura.pdf'), 'linux')).toBe('apri');
      expect(await comeAprire(path.join(dir, 'memoria'), 'darwin')).toBe('apri');
      expect(await comeAprire(path.join(dir, 'Programma.app'), 'darwin')).toBe('mostra');
      expect(await comeAprire(comando, 'darwin')).toBe('mostra');
      expect(await comeAprire(f('senza-estensione', 0o755), 'darwin')).toBe('mostra');
      expect(await comeAprire(f('eseguibile.pdf', 0o755), 'linux')).toBe('mostra');
      for (const e of ['.webloc', '.inetloc', '.fileloc', '.scf', '.library-ms', '.appref-ms', '.iso', '.vhdx', '.chm', '.msp']) {
        expect(await comeAprire(f(`a${e}`), 'win32'), e).toBe('mostra');
      }
      fs.symlinkSync(comando, path.join(dir, 'report.pdf'));
      expect(await comeAprire(path.join(dir, 'report.pdf'), 'darwin')).toBe('mostra');
      await expect(comeAprire(path.join(dir, 'manca.md'))).rejects.toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('binario di Claude Code', () => {
  it('candidati per piattaforma (stesso ordine dell\'SDK)', () => {
    expect(pacchettiCandidati('darwin', 'arm64', false)).toEqual(['@anthropic-ai/claude-agent-sdk-darwin-arm64/claude']);
    expect(pacchettiCandidati('win32', 'x64', false)).toEqual(['@anthropic-ai/claude-agent-sdk-win32-x64/claude.exe']);
    expect(pacchettiCandidati('linux', 'x64', true)[0]).toBe('@anthropic-ai/claude-agent-sdk-linux-x64-musl/claude');
    expect(fuoriDaAsar('/Applications/Spalla.app/Contents/Resources/app.asar/node_modules/x/claude')).toBe(
      '/Applications/Spalla.app/Contents/Resources/app.asar.unpacked/node_modules/x/claude',
    );
  });

  it('usa il primo candidato esistente, poi la riserva del runtime', () => {
    const risolvi = (m: string) => `/nm/${m}`;
    expect(trovaBinarioClaude({ piattaforma: 'linux', arch: 'x64', musl: false, risolvi, esiste: (p) => p.includes('-musl/') })).toBe('/nm/@anthropic-ai/claude-agent-sdk-linux-x64-musl/claude');
    expect(trovaBinarioClaude({ piattaforma: 'darwin', arch: 'arm64', risolvi: () => { throw new Error('assente'); }, esiste: () => true, riserva: '/runtime/claude' })).toBe('/runtime/claude');
    expect(trovaBinarioClaude({ piattaforma: 'darwin', arch: 'arm64', risolvi: () => { throw new Error('assente'); }, esiste: () => false })).toBeUndefined();
  });

  it('nell\'app pacchettizzata il percorso per il Nucleo non sta mai dentro app.asar (solo app.asar.unpacked)', () => {
    const asarMac = (m: string) => `/Applications/Spalla.app/Contents/Resources/app.asar/node_modules/${m}`;
    const asarWin = (m: string) => `C:\\Programmi\\Spalla\\resources\\app.asar\\node_modules\\${m.replace(/\//g, '\\')}`;
    const mac = trovaBinarioClaude({ piattaforma: 'darwin', arch: 'arm64', risolvi: asarMac, esiste: () => true });
    const win = trovaBinarioClaude({ piattaforma: 'win32', arch: 'x64', risolvi: asarWin, esiste: () => true });
    for (const p of [mac, win]) {
      expect(p).toMatch(/app\.asar\.unpacked/);
      expect(dentroAsar(p as string)).toBe(false);
    }
    // La copia dentro l'archivio non conta come trovata: si accetta solo quella estratta.
    expect(trovaBinarioClaude({ piattaforma: 'darwin', arch: 'arm64', risolvi: asarMac, esiste: (p) => !p.includes('unpacked') })).toBeUndefined();
    expect(dentroAsar(asarMac('x/claude'))).toBe(true);
  });

  it('autoverifica del pacchetto: rifiuta app.asar, segnala ENOTDIR e accetta una versione', async () => {
    expect((await autoverificaBinario(undefined)).ok).toBe(false);
    expect((await autoverificaBinario('/R/app.asar/node_modules/x/claude')).ok).toBe(false);
    const { EventEmitter } = await import('node:events');
    const { PassThrough } = await import('node:stream');
    const finto = (esito: { errore?: string; uscita?: string; codice?: number }) =>
      ((comando: string, argomenti: string[]) => {
        expect(argomenti).toEqual(['--version']);
        const figlio = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(), kill: () => true, comando });
        setTimeout(() => {
          if (esito.errore) figlio.emit('error', new Error(esito.errore));
          else {
            figlio.stdout.write(esito.uscita ?? '');
            figlio.emit('close', esito.codice ?? 0);
          }
        }, 1);
        return figlio;
      }) as unknown as NonNullable<Parameters<typeof autoverificaBinario>[1]>['spawn'];
    expect(await autoverificaBinario('/R/app.asar.unpacked/x/claude', { spawn: finto({ errore: 'spawn ENOTDIR' }) })).toMatchObject({ ok: false });
    expect(await autoverificaBinario('/R/app.asar.unpacked/x/claude', { spawn: finto({ uscita: '2.1.0 (Claude Code)\n' }) })).toMatchObject({ ok: true });
    expect(await autoverificaBinario('/R/app.asar.unpacked/x/claude', { spawn: finto({ uscita: '', codice: 1 }) })).toMatchObject({ ok: false });
  });

  it('in questo ambiente trova il binario vero incluso nell\'SDK', () => {
    const trovato = trovaBinarioClaude();
    if (process.platform === 'linux' && process.arch === 'x64') expect(trovato).toMatch(/claude-agent-sdk-linux-x64(-musl)?[\\/]claude$/);
  });
});

describe('pannello di collegamento (node-pty finto)', () => {
  function ptyFinto() {
    let suDati: (d: string) => void = () => undefined;
    let suUscita: (e: { exitCode: number }) => void = () => undefined;
    const pty: PtyMinimo & { scritto: string[]; dimensioni: number[][]; ucciso: boolean } = {
      scritto: [], dimensioni: [], ucciso: false,
      onData: (cb) => (suDati = cb),
      onExit: (cb) => (suUscita = cb),
      write: (d) => pty.scritto.push(d),
      resize: (c, r) => pty.dimensioni.push([c, r]),
      kill: () => { pty.ucciso = true; },
    };
    return { pty, dati: (d: string) => suDati(d), esci: (codice: number) => suUscita({ exitCode: codice }) };
  }

  function crea(binario: string | undefined, verificaOk = true, extra: Partial<Parameters<typeof creaPannelloLogin>[0]> = {}) {
    const f = ptyFinto();
    const dati: string[] = [];
    const stati: { attivo: boolean; collegato: boolean }[] = [];
    const spawn = vi.fn(() => f.pty);
    const verifica = vi.fn(async () => ({ ok: verificaOk, messaggio: verificaOk ? 'Collegato.' : 'Non collegato.' }));
    const pannello = creaPannelloLogin({
      ...extra,
      trovaBinario: () => binario,
      ambiente: () => ({ CLAUDE_CONFIG_DIR: '/isolata', DISABLE_AUTOUPDATER: '1' }),
      cartella: '/dati/collegamento',
      piattaforma: extra.piattaforma ?? 'linux',
      verifica,
      suDati: (d) => dati.push(d),
      suStato: (s) => stati.push(s),
      logger,
      testi: { binarioNonTrovato: principale.pannello.binarioNonTrovato, terminale: principale.pannello.terminale },
      spawn,
    });
    return { pannello, f, dati, stati, spawn, verifica };
  }

  it('senza binario: errore in italiano', async () => {
    await expect(crea(undefined).pannello.avvia()).rejects.toThrow(principale.pannello.binarioNonTrovato);
  });

  it('avvia il binario senza argomenti, nella sua cartella vuota (non quella di lavoro), con l\'ambiente del Nucleo; dati nei due sensi', async () => {
    const { pannello, f, dati, spawn } = crea('/sdk/claude');
    pannello.ridimensiona(120, 40);
    expect(await pannello.avvia()).toEqual({ attivo: true, collegato: false });
    expect(spawn).toHaveBeenCalledWith('/sdk/claude', [], {
      name: 'xterm-256color', cols: 120, rows: 40, cwd: '/dati/collegamento', env: { CLAUDE_CONFIG_DIR: '/isolata', DISABLE_AUTOUPDATER: '1' },
    });
    await pannello.avvia();
    expect(spawn).toHaveBeenCalledTimes(1);
    f.dati('Welcome to Claude Code');
    pannello.scrivi('/login\r');
    pannello.ridimensiona(100, 30);
    expect(dati).toEqual(['Welcome to Claude Code']);
    expect(f.pty.scritto).toEqual(['/login\r']);
    expect(f.pty.dimensioni).toEqual([[100, 30]]);
  });

  it('quando il binario esce, verifica il collegamento', async () => {
    const { pannello, f, stati, verifica } = crea('/sdk/claude');
    await pannello.avvia();
    f.esci(0);
    await vi.waitFor(() => expect(verifica).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(stati.at(-1)).toEqual({ attivo: false, collegato: true }));
  });

  it('su Windows usa il conpty.dll di node-pty (kill senza fork che rilancerebbe Spalla.exe)', async () => {
    const { pannello, spawn } = crea('C:\\sdk\\claude.exe', true, { piattaforma: 'win32' });
    await pannello.avvia();
    expect((spawn.mock.calls[0] as unknown[] | undefined)?.[2]).toMatchObject({ useConptyDll: true });
  });

  it('si chiude da solo appena la verifica riesce, e comunque dopo la durata massima', async () => {
    const primo = crea('/sdk/claude', true);
    await primo.pannello.avvia();
    expect(await primo.pannello.verifica()).toMatchObject({ ok: true });
    expect(primo.f.pty.ucciso).toBe(true);
    expect(primo.pannello.stato()).toEqual({ attivo: false, collegato: true });

    vi.useFakeTimers();
    try {
      const secondo = crea('/sdk/claude', false, { durataMassimaMs: 1000 });
      await secondo.pannello.avvia();
      expect(await secondo.pannello.verifica()).toMatchObject({ ok: false });
      expect(secondo.f.pty.ucciso).toBe(false);
      await vi.advanceTimersByTimeAsync(1001);
      expect(secondo.f.pty.ucciso).toBe(true);
      expect(secondo.pannello.stato().attivo).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('chiudi: termina il processo e verifica; senza pannello aperto non fa prove', async () => {
    const { pannello, f, verifica } = crea('/sdk/claude', false);
    await pannello.chiudi();
    expect(verifica).not.toHaveBeenCalled();
    await pannello.avvia();
    expect(await pannello.chiudi()).toEqual({ attivo: false, collegato: false });
    expect(f.pty.ucciso).toBe(true);
    expect(verifica).toHaveBeenCalledTimes(1);
  });
});

describe('impostazioni e schermata iniziale', () => {
  it('config.json ↔ impostazioni della finestra, andata e ritorno', () => {
    const config = ConfigSchema.parse({ brief: { attivo: true, ora: '07:15' }, telegram: { risposte_vocali: true } });
    const imp = impostazioniDaConfig(config, true, 'abbonamento');
    expect(imp).toMatchObject({ cervello: { modalita: 'abbonamento', livello: 'equilibrato', tettoMensileEur: 25 }, brief: { attivo: true, ora: '07:15' }, voce: { risposteVocaliTelegram: true }, avvioAutomatico: true });
    const ritorno = ConfigSchema.parse({ ...config, ...modificheConfig(imp) });
    expect(ritorno).toEqual(config);
    expect(modificheConfig(imp).cervello).not.toHaveProperty('modalita');
  });

  it('schermata iniziale', () => {
    expect(calcolaSchermataIniziale({ modalitaScelta: false, collegato: false })).toBe('benvenuto');
    expect(calcolaSchermataIniziale({ modalitaScelta: true, collegato: false })).toBe('cervello');
    expect(calcolaSchermataIniziale({ modalitaScelta: true, collegato: true, motorePronto: false })).toBe('motore');
    expect(calcolaSchermataIniziale({ modalitaScelta: true, collegato: true })).toBe('chat');
  });
});
