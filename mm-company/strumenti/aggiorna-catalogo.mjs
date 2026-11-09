#!/usr/bin/env node
// Aggiorna il catalogo degli esperti a chiamata partendo da una copia locale di
// https://github.com/msitarzewski/agency-agents (licenza MIT).
// Uso: node strumenti/aggiorna-catalogo.mjs <cartella-di-agency-agents>
// Copia solo i file degli esperti (non script né integrazioni) e riscrive gli indici
// che il selezionatore legge per scegliere chi far lavorare.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const sorgente = process.argv[2];
if (!sorgente) { console.error('Manca la cartella di agency-agents.'); process.exit(1); }
const catalogo = join(dirname(fileURLToPath(import.meta.url)), '..', 'catalogo');

const reparti = {
  academic: 'Studio e cultura (storia, psicologia, narrazione)',
  design: 'Grafica, marchio, interfacce, esperienza d\'uso',
  engineering: 'Programmazione, app, server, dati, intelligenza artificiale',
  finance: 'Conti, analisi finanziaria, tasse, investimenti',
  'game-development': 'Videogiochi',
  gis: 'Mappe e dati geografici',
  healthcare: 'Sanità',
  marketing: 'Marketing, social, contenuti, SEO',
  'paid-media': 'Pubblicità a pagamento',
  product: 'Prodotto: cosa costruire e in che ordine',
  'project-management': 'Gestione dei progetti',
  research: 'Ricerca',
  sales: 'Vendita, trattative, proposte',
  security: 'Sicurezza informatica',
  'spatial-computing': 'Realtà aumentata e virtuale',
  specialized: 'Specialisti vari (affari, legale, risorse umane, settori)',
  support: 'Assistenza clienti e operazioni',
  testing: 'Collaudo e controllo qualità',
};

function fileMd(cartella) {
  const trovati = [];
  for (const nome of readdirSync(cartella).sort()) {
    const p = join(cartella, nome);
    if (statSync(p).isDirectory()) trovati.push(...fileMd(p));
    else if (nome.endsWith('.md')) trovati.push(p);
  }
  return trovati;
}

function intestazione(testo) {
  if (!testo.startsWith('---\n')) return null;
  const fine = testo.indexOf('\n---', 4);
  if (fine < 0) return null;
  const campi = {};
  for (const riga of testo.slice(4, fine).split('\n')) {
    const m = /^(name|description):\s*(.*)$/.exec(riga);
    if (m) campi[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return campi.name && campi.description ? campi : null;
}

rmSync(catalogo, { recursive: true, force: true });
mkdirSync(catalogo, { recursive: true });
cpSync(join(sorgente, 'LICENSE'), join(catalogo, 'LICENZA-agency-agents.txt'));

let totale = 0;
const righeGenerali = [];
for (const [reparto, etichetta] of Object.entries(reparti)) {
  const origine = join(sorgente, reparto);
  const righe = [];
  for (const file of fileMd(origine)) {
    const testo = readFileSync(file, 'utf8');
    const campi = intestazione(testo);
    if (!campi) continue;
    const rel = relative(origine, file);
    const destinazione = join(catalogo, reparto, rel);
    mkdirSync(dirname(destinazione), { recursive: true });
    writeFileSync(destinazione, testo);
    righe.push(`- \`catalogo/${reparto}/${rel.replaceAll('\\', '/')}\` — **${campi.name}**: ${campi.description}`);
  }
  totale += righe.length;
  writeFileSync(join(catalogo, reparto, 'INDICE.md'),
    `# ${etichetta} — ${righe.length} esperti\n\n${righe.join('\n')}\n`);
  righeGenerali.push(`- \`catalogo/${reparto}/INDICE.md\` — ${etichetta} (${righe.length})`);
}

writeFileSync(join(catalogo, 'INDICE.md'), `# Catalogo degli esperti a chiamata — ${totale} esperti

Esperti presi da https://github.com/msitarzewski/agency-agents (licenza MIT, vedi \`LICENZA-agency-agents.txt\`).
I loro file sono in inglese e insegnano il mestiere; le regole di M&M Company (\`azienda/REGOLE.md\`) vincono sempre.
Per scegliere: apri solo gli indici dei reparti che servono al compito.

${righeGenerali.join('\n')}
`);
console.log(`Catalogo aggiornato: ${totale} esperti in ${Object.keys(reparti).length} reparti.`);
