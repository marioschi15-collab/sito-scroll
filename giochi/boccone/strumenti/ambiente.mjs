#!/usr/bin/env node
/* Anteprima degli ambienti: disegna ogni ambiente da sei punti di vista su uno schermo da telefono
   (390×844), con qualche pesce di prova, e misura il costo di ogni passata.
   Uso:
     node giochi/boccone/strumenti/ambiente.mjs [--solo laguna] [--da <cartella>] [--con-src] [--esci <cartella>]
   Risultato in <esci> (predefinito: giochi/boccone/anteprime/ambienti):
     <id>-<vista>.png   centro, superficie, fondale, angolo, largo, economico
     <id>-foglio.png    le sei viste affiancate
     rapporto.json */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { radice, argomenti, scegliFile, scriviPagina, apri } from './comune.mjs';

const a = argomenti(process.argv);
const esci = a.esci || join(radice, 'anteprime', 'ambienti');
mkdirSync(esci, { recursive: true });
const file = scegliFile(a, ['20-specie', '25-eroi', '30-ambienti']);
const pagina = join(esci, 'ambienti.html');
scriviPagina(pagina, 'Ambienti Boccone', file, { solo: a.solo }, join(radice, 'strumenti', 'ambiente-pagina.js'),
  '.fila{display:flex;gap:8px;padding:10px;width:max-content}.vista{position:relative}.vista span{position:absolute;left:6px;bottom:6px;background:rgba(0,0,0,.55);padding:2px 6px;border-radius:6px;font-size:12px}h3{margin:10px 10px 0}p{margin:2px 10px}.male{color:#ff8f8f;font-weight:700}canvas{display:block}');

const { browser, page, errori } = await apri(pagina, 2500, 1000);
const rapporto = await page.evaluate('window.__rapporto');
for (const m of rapporto.ambienti) {
  for (const v of m.viste) { const el = await page.$('#vista-' + m.id + '-' + v); if (el) await el.screenshot({ path: join(esci, m.id + '-' + v + '.png') }); }
  const f = await page.$('#fila-' + m.id); if (f) await f.screenshot({ path: join(esci, m.id + '-foglio.png') });
}
await browser.close();
rapporto.erroriPagina = errori;
writeFileSync(join(esci, 'rapporto.json'), JSON.stringify(rapporto, null, 1));

let problemi = 0;
console.log('Ambienti in ' + esci + ' (unità di costo: un riempimento a tutto schermo = ' + rapporto.riferimentoMs.toFixed(3) + ' ms)');
for (const e of [...rapporto.errori, ...errori]) { console.log('  ERRORE: ' + e); problemi++; }
for (const m of rapporto.ambienti) {
  console.log((m.avvisi.length ? '  ✗ ' : '  ✓ ') + m.id.padEnd(14) + ' costo per fotogramma: sfondo ×' + m.costo.sfondo.toFixed(1) + ', dietro ×' + m.costo.dietro.toFixed(1) + ', davanti ×' + m.costo.davanti.toFixed(1) + ', velo ×' + m.costo.velo.toFixed(1) + '  (totale ×' + m.costo.totale.toFixed(1) + ', economico ×' + m.costo.economico.toFixed(1) + ') · crea ' + m.creaMs.toFixed(0) + ' ms');
  for (const r of m.avvisi) { console.log('      - ' + r); problemi++; }
}
console.log(problemi ? '\n' + problemi + ' cose da sistemare.' : '\nTutto in ordine.');
