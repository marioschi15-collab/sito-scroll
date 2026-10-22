#!/usr/bin/env node
// Prova che il binario di Claude Code dentro l'app costruita è IDENTICO a quello pubblicato da Anthropic
// nel pacchetto per piattaforma dell'SDK (docs/02 §2.5, strada A: "incluso senza modifiche").
// Confronta lo SHA-256 del binario in node_modules (fonte) con quello trovato nell'app (destinazione):
// una qualsiasi ri-firma, compressione o modifica cambierebbe l'hash.
//
// Uso:
//   node scripts/verifica-hash-binario.mjs <app-costruita> [--piattaforma darwin|win32|linux] [--arch arm64|x64] [--musl]
// <app-costruita> può essere la cartella prodotta da electron-builder (release/mac-arm64/Spalla.app,
// release/win-unpacked, release/linux-unpacked, ...) oppure direttamente il file del binario.
// Esce con 0 se gli hash coincidono, 1 se differiscono, 2 se manca qualcosa o gli argomenti sono sbagliati.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const cartellaDesktop = join(radice, 'apps', 'desktop');
const SDK = '@anthropic-ai/claude-agent-sdk';

function esci(codice, messaggio) {
  (codice === 0 ? console.log : console.error)(messaggio);
  process.exit(codice);
}

function leggiArgomenti(argv) {
  const opzioni = { piattaforma: process.platform, arch: process.arch, musl: false, app: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--piattaforma') opzioni.piattaforma = argv[++i];
    else if (a === '--arch') opzioni.arch = argv[++i];
    else if (a === '--musl') opzioni.musl = true;
    else if (a === '--help' || a === '-h') esci(0, 'Uso: node scripts/verifica-hash-binario.mjs <app-costruita> [--piattaforma darwin|win32|linux] [--arch arm64|x64] [--musl]');
    else if (a.startsWith('--')) esci(2, `Opzione sconosciuta: ${a}`);
    else opzioni.app = a;
  }
  if (!opzioni.app) esci(2, 'Manca il percorso dell\'app costruita (es. apps/desktop/release/mac-arm64/Spalla.app). Usa --help.');
  if (!['darwin', 'win32', 'linux'].includes(opzioni.piattaforma)) esci(2, `Piattaforma non valida: ${opzioni.piattaforma}`);
  if (!['arm64', 'x64'].includes(opzioni.arch)) esci(2, `Architettura non valida: ${opzioni.arch}`);
  return opzioni;
}

function nomePacchetto({ piattaforma, arch, musl }) {
  return `${SDK}-${piattaforma}-${arch}${piattaforma === 'linux' && musl ? '-musl' : ''}`;
}

function nomeBinario(piattaforma) {
  return piattaforma === 'win32' ? 'claude.exe' : 'claude';
}

/** Il binario in node_modules, risolto dal punto di vista dell'SDK (con pnpm è visibile solo da lì). */
function binarioFonte(opzioni) {
  const daDesktop = createRequire(join(cartellaDesktop, 'package.json'));
  let sdk;
  try {
    sdk = daDesktop.resolve(SDK);
  } catch {
    esci(2, `SDK non installato in apps/desktop: esegui pnpm install (manca ${SDK}).`);
  }
  const pacchetto = nomePacchetto(opzioni);
  try {
    return createRequire(sdk).resolve(`${pacchetto}/${nomeBinario(opzioni.piattaforma)}`);
  } catch {
    esci(
      2,
      `Pacchetto ${pacchetto} non installato: pnpm installa solo quello della macchina. ` +
        'Per un\'altra architettura serve supportedArchitectures in pnpm-workspace.yaml (vedi apps/desktop/README-pacchetto.md).',
    );
  }
}

/** Cerca il binario dentro l'app costruita: …/app.asar.unpacked/node_modules/<pacchetto>/claude[.exe]. */
function binarioNellApp(percorso, opzioni) {
  const assoluto = resolve(percorso);
  if (!existsSync(assoluto)) esci(2, `Percorso dell'app non trovato: ${assoluto}`);
  if (statSync(assoluto).isFile()) return { trovato: assoluto, altri: [] };
  const atteso = `${sep}${nomePacchetto(opzioni).split('/').join(sep)}${sep}${nomeBinario(opzioni.piattaforma)}`;
  const candidati = [];
  const daVisitare = [assoluto];
  while (daVisitare.length > 0) {
    const cartella = daVisitare.pop();
    let voci;
    try {
      voci = readdirSync(cartella, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const voce of voci) {
      const pieno = join(cartella, voce.name);
      if (voce.isDirectory()) daVisitare.push(pieno);
      else if (voce.name === nomeBinario(opzioni.piattaforma) && basename(dirname(pieno)).startsWith('claude-agent-sdk-')) candidati.push(pieno);
    }
  }
  const trovato = candidati.find((c) => c.endsWith(atteso));
  return { trovato, altri: candidati.filter((c) => c !== trovato) };
}

function sha256(file) {
  return new Promise((risolvi, rifiuta) => {
    const hash = createHash('sha256');
    createReadStream(file)
      .on('data', (pezzo) => hash.update(pezzo))
      .on('error', rifiuta)
      .on('end', () => risolvi(hash.digest('hex')));
  });
}

/** Solo su macOS e solo informativo: chi ha firmato il binario (deve restare Anthropic). */
function firmaMac(file) {
  if (process.platform !== 'darwin') return undefined;
  const esito = spawnSync('codesign', ['-dvv', file], { encoding: 'utf8' });
  const righe = `${esito.stdout ?? ''}${esito.stderr ?? ''}`.split('\n');
  const autorita = righe.filter((r) => r.startsWith('Authority=') || r.startsWith('TeamIdentifier='));
  return autorita.length > 0 ? autorita.join('; ') : righe.find((r) => r.trim()) ?? 'nessuna informazione';
}

const opzioni = leggiArgomenti(process.argv.slice(2));
const fonte = binarioFonte(opzioni);
const { trovato, altri } = binarioNellApp(opzioni.app, opzioni);
if (!trovato) {
  const extra = altri.length > 0 ? `\nTrovati invece: ${altri.join(', ')} (piattaforma/arch diverse? usa --piattaforma/--arch)` : '';
  esci(2, `Binario ${nomePacchetto(opzioni)}/${nomeBinario(opzioni.piattaforma)} non trovato in ${resolve(opzioni.app)}.${extra}`);
}

const [hashFonte, hashApp] = await Promise.all([sha256(fonte), sha256(trovato)]);
const dimensioneFonte = statSync(fonte).size;
const dimensioneApp = statSync(trovato).size;
const fuoriDaAsar = trovato.includes(`app.asar.unpacked${sep}`) || statSync(resolve(opzioni.app)).isFile();

console.log(`Pacchetto:            ${nomePacchetto(opzioni)}`);
console.log(`Fonte (node_modules): ${fonte}`);
console.log(`  SHA-256 ${hashFonte}  (${dimensioneFonte} byte)`);
console.log(`Nell'app:             ${trovato}`);
console.log(`  SHA-256 ${hashApp}  (${dimensioneApp} byte)`);
if (!fuoriDaAsar) console.log('ATTENZIONE: il binario non risulta in app.asar.unpacked: spawn() non potrebbe eseguirlo.');
const firma = firmaMac(trovato);
if (firma) console.log(`Firma (codesign):     ${firma}`);
if (altri.length > 0) console.log(`Altri binari di Claude Code nell'app: ${altri.length} (${altri.map((a) => basename(dirname(a))).join(', ')})`);

if (hashFonte === hashApp && fuoriDaAsar) esci(0, 'OK: binario incluso senza modifiche (hash identici).');
if (hashFonte === hashApp) esci(1, 'Hash identici ma il binario è dentro app.asar: va aggiunto ad asarUnpack.');
esci(1, 'ERRORE: il binario nell\'app è stato modificato (hash diversi). Controlla signIgnore/signExts in electron-builder.yml.');
