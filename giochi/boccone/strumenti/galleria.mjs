#!/usr/bin/env node
/* Galleria dei modelli: disegna ogni specie/eroe in tutte le pose e salva un'immagine per modello,
   più un rapporto con costi di disegno, ingombri misurati ed errori.
   Uso:
     node giochi/boccone/strumenti/galleria.mjs                       tutti i modelli di src/
     node giochi/boccone/strumenti/galleria.mjs --solo murena,seppia   solo alcuni
     node giochi/boccone/strumenti/galleria.mjs --da <cartella> [--con-src] [--esci <cartella>]
   Risultato in <esci> (predefinito: giochi/boccone/anteprime/galleria):
     <id>.png          scheda completa (pose, fasi, grandezze di gioco)
     <id>-grande.png   primo piano per controllare i dettagli
     foglio.png        tutti i modelli insieme, per confrontare lo stile
     rapporto.json     numeri (costo, ingombro misurato, avvisi) */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { radice, argomenti, scegliFile, scriviPagina, apri } from './comune.mjs';

const a = argomenti(process.argv);
const esci = a.esci || join(radice, 'anteprime', 'galleria');
mkdirSync(esci, { recursive: true });
const file = scegliFile(a, ['20-specie', '25-eroi']);
const pagina = join(esci, 'galleria.html');
scriviPagina(pagina, 'Galleria Boccone', file, { solo: a.solo }, join(radice, 'strumenti', 'galleria-pagina.js'),
  '.scheda,.grande{margin:14px;background:#151d3a;border-radius:10px;padding:10px;width:1400px}h3{margin:0 0 2px;font-size:17px}p{margin:0 0 8px;opacity:.85}.male{color:#ff8f8f;font-weight:700}canvas{display:block;border-radius:6px}#foglio{margin:14px;width:1400px}');

const { browser, page, errori } = await apri(pagina, 1440, 900);
const rapporto = await page.evaluate('window.__rapporto');
for (const m of rapporto.modelli) {
  const s = await page.$('#scheda-' + m.id); if (s) await s.screenshot({ path: join(esci, m.id + '.png') });
  const g = await page.$('#grande-' + m.id); if (g) await g.screenshot({ path: join(esci, m.id + '-grande.png') });
}
const foglio = await page.$('#foglio'); if (foglio) await foglio.screenshot({ path: join(esci, 'foglio.png') });
await browser.close();
rapporto.erroriPagina = errori;
writeFileSync(join(esci, 'rapporto.json'), JSON.stringify(rapporto, null, 1));

let problemi = 0;
console.log('Galleria in ' + esci + ' — ' + rapporto.modelli.length + ' modelli (costo di riferimento: ' + rapporto.riferimentoMs.toFixed(4) + ' ms)');
for (const e of [...rapporto.errori, ...errori]) { console.log('  ERRORE: ' + e); problemi++; }
for (const m of rapporto.modelli) {
  const righe = [...m.avvisi];
  console.log((righe.length ? '  ✗ ' : '  ✓ ') + m.id.padEnd(22) + ' ' + m.tipo.padEnd(8) + ' costo ×' + m.costo.calmo.toFixed(1) + ' / ×' + m.costo.caccia.toFixed(1)
    + '   ingombro misurato ' + JSON.stringify(m.misurato));
  for (const r of righe) { console.log('      - ' + r); problemi++; }
}
console.log(problemi ? '\n' + problemi + ' cose da sistemare.' : '\nTutto in ordine.');
