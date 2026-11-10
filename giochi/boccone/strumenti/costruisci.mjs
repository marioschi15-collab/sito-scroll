#!/usr/bin/env node
/* Unisce i sorgenti di src/ in un solo file: giochi/boccone/index.html
   Uso: node giochi/boccone/strumenti/costruisci.mjs [--esci <file>]
   Ordine di caricamento: i percorsi dei file in ordine alfabetico (per questo hanno un numero davanti).
   Si saltano i file e le cartelle che cominciano con "_" o "." e i file che finiscono con ".prova.js". */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const radice = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function elenca(cartella, estensione) {
  const trovati = [];
  const visita = dir => {
    if (!existsSync(dir)) return;
    for (const voce of readdirSync(dir, { withFileTypes: true })) {
      if (voce.name.startsWith('_') || voce.name.startsWith('.')) continue;
      const p = join(dir, voce.name);
      if (voce.isDirectory()) visita(p);
      else if (voce.name.endsWith(estensione) && !voce.name.endsWith('.prova.js')) trovati.push(p);
    }
  };
  visita(cartella);
  return trovati.sort((a, b) => (relative(cartella, a) < relative(cartella, b) ? -1 : 1));
}

export function scriptIncorporato(percorso, etichetta) {
  const codice = readFileSync(percorso, 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>\n' + codice + '\n//# sourceURL=boccone/' + etichetta.replace(/\\/g, '/') + '\n</script>';
}

export function costruisci(uscita = join(radice, 'index.html')) {
  const pagina = join(radice, 'src', 'pagina.html');
  if (!existsSync(pagina)) throw new Error('Manca src/pagina.html: il gioco non è ancora stato portato nei sorgenti.');
  let html = readFileSync(pagina, 'utf8');
  for (const segno of ['<!-- STILI -->', '<!-- SCRIPT -->']) if (!html.includes(segno)) throw new Error('In src/pagina.html manca il segnaposto ' + segno);
  const css = elenca(join(radice, 'src', 'css'), '.css');
  const js = elenca(join(radice, 'src', 'js'), '.js');
  const stili = css.map(f => '<style>\n/* ' + relative(join(radice, 'src'), f) + ' */\n' + readFileSync(f, 'utf8') + '\n</style>').join('\n');
  const script = js.map(f => scriptIncorporato(f, relative(join(radice, 'src'), f))).join('\n');
  html = html.replace('<!-- STILI -->', () => stili).replace('<!-- SCRIPT -->', () => script);
  mkdirSync(dirname(uscita), { recursive: true });
  writeFileSync(uscita, html);
  return { uscita, css: css.length, js: js.length, byte: Buffer.byteLength(html) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--esci');
  try {
    const r = costruisci(i > 0 ? resolve(process.argv[i + 1]) : undefined);
    console.log('Costruito ' + relative(process.cwd(), r.uscita) + ': ' + r.js + ' script, ' + r.css + ' fogli di stile, ' + Math.round(r.byte / 1024) + ' KB');
  } catch (e) { console.error('ERRORE: ' + e.message); process.exit(1); }
}
