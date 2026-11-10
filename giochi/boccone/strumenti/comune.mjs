/* Funzioni condivise dagli strumenti di anteprima (galleria.mjs, ambiente.mjs). */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';
import { createRequire } from 'node:module';
import { radice, elenca, scriptIncorporato } from './costruisci.mjs';

export { radice };
export const src = join(radice, 'src', 'js');

export function argomenti(argv) {
  const a = { da: [], solo: null, esci: null, conSrc: false, resto: [] };
  for (let i = 2; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--da') a.da.push(resolve(argv[++i]));
    else if (v === '--solo') a.solo = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (v === '--esci') a.esci = resolve(argv[++i]);
    else if (v === '--con-src') a.conSrc = true;
    else a.resto.push(v);
  }
  return a;
}

/* Sceglie i file da caricare: nucleo e cast sempre; poi la "pittura" (quella trovata in --da, altrimenti quella di src);
   poi i contenuti di src (se non c'è --da, oppure con --con-src) e infine i file delle cartelle --da. */
export function scegliFile(a, cartelleSrc) {
  const file = [join(src, '00-nucleo.js'), join(src, '01-cast.js')];
  const daFile = a.da.flatMap(d => (existsSync(d) && statSync(d).isFile()) ? [d] : elenca(d, '.js'));
  const pitturaLocale = daFile.find(f => basename(f).includes('pittura'));
  const pitturaSrc = join(src, '10-pittura.js');
  if (pitturaLocale) file.push(pitturaLocale); else if (existsSync(pitturaSrc)) file.push(pitturaSrc);
  if (!a.da.length || a.conSrc) for (const c of cartelleSrc) file.push(...elenca(join(src, c), '.js'));
  file.push(...daFile.filter(f => f !== pitturaLocale));
  return [...new Set(file)];
}

export function scriviPagina(uscita, titolo, file, parametri, runtime, stile = '') {
  const cattura = '<script>window.__erroriCaricamento = []; window.addEventListener("error", e => window.__erroriCaricamento.push((e.filename || "") + ":" + e.lineno + " " + e.message)); window.__parametri = ' + JSON.stringify(parametri) + ';</script>';
  const html = '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>' + titolo + '</title><style>body{margin:0;background:#0d1326;color:#e8eefc;font:14px system-ui,sans-serif}' + stile + '</style></head><body>\n'
    + cattura + '\n' + file.map(f => scriptIncorporato(f, relative(radice, f))).join('\n') + '\n' + scriptIncorporato(runtime, relative(radice, runtime)) + '\n</body></html>';
  mkdirSync(resolve(uscita, '..'), { recursive: true });
  writeFileSync(uscita, html);
}

export async function apri(paginaHtml, larghezza, altezza) {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: larghezza, height: altezza }, deviceScaleFactor: 1 });
  const errori = [];
  page.on('pageerror', e => errori.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
  await page.goto('file://' + paginaHtml);
  await page.waitForFunction('window.__pronto === true', null, { timeout: 120000 });
  return { browser, page, errori };
}
