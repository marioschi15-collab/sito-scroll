import { spawn as spawnPredefinito } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

/**
 * Dove sta il binario di Claude Code incluso nell'SDK (docs/02 §2.5, strada A del prototipo): il pacchetto
 * facoltativo per piattaforma `@anthropic-ai/claude-agent-sdk-<piattaforma>-<arch>[-musl]`, risolto a partire
 * dall'SDK (con pnpm i pacchetti per piattaforma sono visibili solo dall'SDK, non dalla nostra app).
 * Lo stesso ordine di ricerca dell'SDK: su Linux prima glibc poi musl (o il contrario se il sistema è musl).
 */

export interface OpzioniTrovaBinario {
  piattaforma?: NodeJS.Platform;
  arch?: string;
  /** Linux con musl (Alpine): prima il pacchetto -musl. */
  musl?: boolean;
  /** Risolve un modulo come `require.resolve` dal punto di vista dell'SDK (iniettabile nelle prove). */
  risolvi?: (modulo: string) => string;
  esiste?: (percorso: string) => boolean;
  /** Riserva: il percorso scelto dal runtime del Nucleo (strada C, binario scaricato), se c'è. */
  riserva?: string;
}

const NOME_PACCHETTO = '@anthropic-ai/claude-agent-sdk';

export function pacchettiCandidati(piattaforma: NodeJS.Platform, arch: string, musl: boolean): string[] {
  const estensione = piattaforma === 'win32' ? '.exe' : '';
  const nomi =
    piattaforma === 'linux'
      ? musl
        ? [`${NOME_PACCHETTO}-linux-${arch}-musl`, `${NOME_PACCHETTO}-linux-${arch}`]
        : [`${NOME_PACCHETTO}-linux-${arch}`, `${NOME_PACCHETTO}-linux-${arch}-musl`]
      : [`${NOME_PACCHETTO}-${piattaforma}-${arch}`];
  return nomi.map((n) => `${n}/claude${estensione}`);
}

/** True se il sistema usa musl (nessuna versione glibc nel rapporto di Node). */
export function sistemaMusl(): boolean {
  if (process.platform !== 'linux') return false;
  try {
    const rapporto = process.report?.getReport() as { header?: { glibcVersionRuntime?: string } } | undefined;
    return !rapporto?.header?.glibcVersionRuntime;
  } catch {
    return false;
  }
}

/** Nell'app pacchettizzata un eseguibile non può stare dentro app.asar: si usa la copia in app.asar.unpacked. */
export function fuoriDaAsar(percorso: string): string {
  return percorso.replace(/([\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2');
}

/** True se il percorso sta DENTRO l'archivio app.asar (dove spawn fallisce con ENOTDIR), non in app.asar.unpacked. */
export function dentroAsar(percorso: string): boolean {
  return /[\\/]app\.asar[\\/]/.test(percorso);
}

function risolutorePredefinito(): (modulo: string) => string {
  const nostro = createRequire(import.meta.url);
  const sdk = nostro.resolve(NOME_PACCHETTO);
  return createRequire(sdk).resolve;
}

/** Percorso assoluto del binario, oppure `undefined` se nessun candidato esiste. */
export function trovaBinarioClaude(opzioni: OpzioniTrovaBinario = {}): string | undefined {
  const piattaforma = opzioni.piattaforma ?? process.platform;
  const arch = opzioni.arch ?? process.arch;
  const musl = opzioni.musl ?? sistemaMusl();
  const esiste = opzioni.esiste ?? ((p: string) => fs.existsSync(p));
  let risolvi = opzioni.risolvi;
  if (!risolvi) {
    try {
      risolvi = risolutorePredefinito();
    } catch {
      risolvi = undefined;
    }
  }
  if (risolvi) {
    for (const candidato of pacchettiCandidati(piattaforma, arch, musl)) {
      try {
        const percorso = fuoriDaAsar(risolvi(candidato));
        if (esiste(percorso)) return percorso;
      } catch {
        // pacchetto di un'altra piattaforma: non installato
      }
    }
  }
  if (opzioni.riserva && esiste(opzioni.riserva)) return opzioni.riserva;
  return undefined;
}

export interface EsitoAutoverifica {
  ok: boolean;
  /** Righe per chi lancia la prova (CI, sviluppatore): non arrivano mai all'utente. */
  righe: string[];
}

type SpawnMinimo = (comando: string, argomenti: string[], opzioni: { stdio: ['ignore', 'pipe', 'pipe']; windowsHide: boolean }) => {
  stdout: NodeJS.ReadableStream | null;
  stderr: NodeJS.ReadableStream | null;
  on(evento: 'error', cb: (e: Error) => void): unknown;
  on(evento: 'close', cb: (codice: number | null) => void): unknown;
  kill(): boolean;
};

/**
 * Prova del pacchetto (`Spalla --autoverifica`, release.yml): avvia il binario con lo STESSO percorso che il Nucleo
 * passa all'SDK (`pathToClaudeCodeExecutable`) e con lo stesso `spawn` del processo principale. Se il percorso
 * finisse dentro app.asar, qui si vedrebbe lo stesso ENOTDIR che bloccherebbe ogni richiesta dell'utente.
 */
export function autoverificaBinario(binario: string | undefined, opzioni: { spawn?: SpawnMinimo; tempoMs?: number } = {}): Promise<EsitoAutoverifica> {
  if (!binario) return Promise.resolve({ ok: false, righe: ['autoverifica: binario di Claude Code non trovato'] });
  if (dentroAsar(binario)) return Promise.resolve({ ok: false, righe: [`autoverifica: il binario è dentro app.asar (${binario})`] });
  const lancia = opzioni.spawn ?? (spawnPredefinito as unknown as SpawnMinimo);
  return new Promise((risolvi) => {
    let uscita = '';
    let finito = false;
    const chiudi = (esito: EsitoAutoverifica): void => {
      if (finito) return;
      finito = true;
      clearTimeout(timer);
      risolvi(esito);
    };
    let figlio: ReturnType<SpawnMinimo>;
    try {
      figlio = lancia(binario, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (e) {
      return risolvi({ ok: false, righe: [`autoverifica: avvio fallito: ${e instanceof Error ? e.message : String(e)}`, `binario: ${binario}`] });
    }
    const timer = setTimeout(() => {
      figlio.kill();
      chiudi({ ok: false, righe: ['autoverifica: il binario non ha risposto in tempo', `binario: ${binario}`] });
    }, opzioni.tempoMs ?? 30_000);
    figlio.stdout?.on('data', (d: Buffer | string) => { uscita += d.toString(); });
    figlio.stderr?.on('data', (d: Buffer | string) => { uscita += d.toString(); });
    figlio.on('error', (e) => chiudi({ ok: false, righe: [`autoverifica: avvio fallito: ${e.message}`, `binario: ${binario}`] }));
    figlio.on('close', (codice) => {
      const versione = uscita.trim().split(/\r?\n/)[0] ?? '';
      chiudi(
        codice === 0 && versione
          ? { ok: true, righe: [`autoverifica: ok (${versione})`, `binario: ${binario}`] }
          : { ok: false, righe: [`autoverifica: uscita ${String(codice)}`, uscita.trim().slice(0, 500), `binario: ${binario}`] },
      );
    });
  });
}
