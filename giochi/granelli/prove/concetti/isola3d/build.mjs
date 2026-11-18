import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/pagina.html', 'utf8').replace('/*CODICE*/', () => js);
writeFileSync('index.html', html);
console.log('index.html', (html.length / 1024).toFixed(0), 'KB');
