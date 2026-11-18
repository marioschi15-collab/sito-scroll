// Il controllo delle scoperte: ogni voce si raggiunge dai quattro elementi, nessuna coppia ha due esiti, ogni scheda
// è scritta per intero, le schede nuove non sono vicoli ciechi. Non serve il browser: legge le schede da src/.
//   node strumenti/contenuti.cjs                 tutto il Libro
//   node strumenti/contenuti.cjs --file paese    le schede di un file solo (le chiavi di numeri.ts ancora senza
//                                                scheda contano come esistenti: le scrive qualcun altro)
// Esce con un errore se qualcosa non va.
const path = require('node:path');

const RADICE = path.join(__dirname, '..');

function argomento(nome) {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

(async () => {
  // Vite (già tra gli strumenti del gioco) sa leggere il TypeScript dei sorgenti così com'è.
  const vite = await import(require.resolve('vite', { paths: [RADICE] }));
  const { module: controllo } = await vite.runnerImport(path.join(RADICE, 'src/contenuti/controllo.ts'), {
    root: RADICE,
    configFile: false,
    logLevel: 'silent',
  });
  const file = argomento('--file');
  const { errori, avvisi, conti } = controllo.controlla(file ? { file } : {});
  console.log(`Granelli · controllo delle scoperte${file ? ` (file «${file}»)` : ''}`);
  console.log(`Voci del Libro: ${conti.voci}, di cui ${conti.schede} scritte come schede · unioni scritte: ${conti.unioni} · file: ${conti.file.join(', ')}`);
  if (avvisi.length) {
    console.log('\nDa sapere (non sono errori):');
    for (const a of avvisi) console.log(`  - ${a}`);
  }
  if (errori.length) {
    console.log(`\nDa correggere (${errori.length}):`);
    for (const e of errori) console.log(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log('\nTutto a posto: ogni voce si raggiunge dai quattro elementi, nessuna coppia ha due esiti, nessun doppione.');
})().catch((errore) => {
  console.error(errore);
  process.exit(1);
});
