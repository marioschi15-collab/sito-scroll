#!/usr/bin/env node
// Controllo statico richiesto da docs/02 §2.3 e §10: il nostro codice non deve mai
// leggere le credenziali del binario, impostare token di abbonamento, usare bypassPermissions,
// né scrivere regole di permesso con percorsi assoluti a una sola barra ("/Users/...").
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const radice = process.cwd();
const cartelle = ['apps', 'packages', 'services', 'plugin'];
const estensioni = new Set(['.ts', '.tsx', '.mts', '.js', '.mjs', '.json', '.md', '.yaml', '.yml']);
const ignora = new Set(['node_modules', 'dist', 'out', 'coverage', '.pnpm']);

const regole = [
  { nome: 'lettura delle credenziali del binario', re: /\.credentials\.json/, eccezioni: [/verifica-sicurezza\.mjs$/, /\.test\.ts$/, /README\.md$/, /docs\//] },
  { nome: 'token di abbonamento passato dal nostro codice', re: /CLAUDE_CODE_OAUTH_TOKEN/, eccezioni: [/verifica-sicurezza\.mjs$/, /\.test\.ts$/, /README\.md$/] },
  { nome: 'setup-token del binario', re: /setup-token/, eccezioni: [/verifica-sicurezza\.mjs$/, /\.test\.ts$/, /README\.md$/] },
  { nome: 'bypassPermissions', re: /bypassPermissions/, eccezioni: [/verifica-sicurezza\.mjs$/, /\.test\.ts$/] },
  { nome: 'regola di permesso con percorso assoluto a una barra', re: /"(Read|Write|Edit)\(\/(Users|home|C:)/, eccezioni: [] },
];

const problemi = [];
function visita(cartella) {
  for (const nome of readdirSync(cartella)) {
    if (ignora.has(nome)) continue;
    const p = join(cartella, nome);
    const s = statSync(p);
    if (s.isDirectory()) { visita(p); continue; }
    if (!estensioni.has(nome.slice(nome.lastIndexOf('.')))) continue;
    const rel = relative(radice, p);
    const testo = readFileSync(p, 'utf8');
    for (const r of regole) {
      if (r.eccezioni.some((e) => e.test(rel))) continue;
      if (r.re.test(testo)) problemi.push(`${rel}: ${r.nome}`);
    }
  }
}
for (const c of cartelle) {
  try { statSync(join(radice, c)); } catch { continue; }
  visita(join(radice, c));
}
if (problemi.length) {
  console.error('Controllo sicurezza FALLITO:\n' + problemi.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log('Controllo sicurezza OK: nessun riferimento vietato.');
