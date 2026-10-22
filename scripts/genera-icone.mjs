#!/usr/bin/env node
// Genera l'icona segnaposto dell'app (apps/desktop/resources/icon.png, 1024x1024, PNG con trasparenza)
// usando ffmpeg. electron-builder ne ricava da solo .icns (macOS), .ico (Windows) e le misure Linux.
// Idempotente: se l'icona esiste già con la misura giusta non fa nulla; `--forza` la rigenera.
// Uso: node scripts/genera-icone.mjs [--forza]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const destinazione = join(radice, 'apps', 'desktop', 'resources', 'icon.png');
const LATO = 1024;
const forza = process.argv.includes('--forza');

/** Larghezza e altezza lette dall'intestazione IHDR del PNG (null se non è un PNG). */
function misuraPng(file) {
  const dati = readFileSync(file);
  const firma = '89504e470d0a1a0a';
  if (dati.length < 24 || dati.subarray(0, 8).toString('hex') !== firma) return null;
  return { larghezza: dati.readUInt32BE(16), altezza: dati.readUInt32BE(20) };
}

if (!forza && existsSync(destinazione)) {
  const misura = misuraPng(destinazione);
  if (misura && misura.larghezza === LATO && misura.altezza === LATO) {
    console.log(`Icona già presente (${LATO}x${LATO}): ${relative(radice, destinazione)}. Usa --forza per rigenerarla.`);
    process.exit(0);
  }
}

// Disegno segnaposto: quadrato arrotondato (margine 100 px, raggio 180 px, come la griglia delle icone macOS)
// color petrolio con un cerchio color crema al centro; fuori dal quadrato è trasparente.
const MEZZO = (LATO - 1) / 2;
const SEMILATO = 412; // (1024 - 2*100) / 2
const RAGGIO = 180;
const dentroQuadrato = `lte(hypot(max(abs(X-${MEZZO})-${SEMILATO - RAGGIO},0),max(abs(Y-${MEZZO})-${SEMILATO - RAGGIO},0)),${RAGGIO})`;
const dentroCerchio = `lte(hypot(X-${MEZZO},Y-${MEZZO}),230)`;
const canale = (sfondo, cerchio) => `if(${dentroCerchio},${cerchio},${sfondo})`;
const filtro = [
  'format=rgba',
  `geq=r='${canale(31, 247)}':g='${canale(98, 236)}':b='${canale(109, 214)}':a='if(${dentroQuadrato},255,0)'`,
].join(',');

mkdirSync(dirname(destinazione), { recursive: true });
try {
  execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black:s=${LATO}x${LATO}:d=1`, '-vf', filtro, '-frames:v', '1', destinazione],
    { stdio: 'inherit' },
  );
} catch (errore) {
  console.error("Impossibile generare l'icona: serve ffmpeg nel PATH.", errore instanceof Error ? errore.message : errore);
  process.exit(1);
}

const misura = misuraPng(destinazione);
if (!misura || misura.larghezza !== LATO || misura.altezza !== LATO) {
  console.error(`Icona generata con misura inattesa: ${JSON.stringify(misura)}`);
  process.exit(1);
}
console.log(`Icona generata: ${relative(radice, destinazione)} (${LATO}x${LATO}).`);
