// Hook afterPack di electron-builder (electron-builder.yml → afterPack).
// electron-builder scarta SEMPRE i file .gitkeep quando copia (anche in extraResources, non è configurabile):
// senza di loro le cartelle vuote dei modelli (lavoro/*, memoria/temi, .claude/agents, ...) sparirebbero
// dall'app installata. Qui li rimettiamo nella copia dei modelli dentro le risorse dell'app, prima della firma.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

/** Cartella delle risorse dell'app impacchettata (process.resourcesPath a runtime). */
function cartellaRisorse(contesto) {
  if (contesto.electronPlatformName === 'darwin' || contesto.electronPlatformName === 'mas') {
    const nomeApp = `${contesto.packager.appInfo.productFilename}.app`;
    return path.join(contesto.appOutDir, nomeApp, 'Contents', 'Resources');
  }
  return path.join(contesto.appOutDir, 'resources');
}

function elencaGitkeep(radice, relativo = '') {
  const trovati = [];
  for (const voce of fs.readdirSync(path.join(radice, relativo), { withFileTypes: true })) {
    const rel = relativo ? path.join(relativo, voce.name) : voce.name;
    if (voce.isDirectory()) trovati.push(...elencaGitkeep(radice, rel));
    else if (voce.isFile() && voce.name === '.gitkeep') trovati.push(rel);
  }
  return trovati;
}

exports.default = async function dopoPacchetto(contesto) {
  const sorgente = path.resolve(contesto.packager.projectDir, '..', '..', 'packages', 'workspace-templates', 'templates');
  const destinazione = path.join(cartellaRisorse(contesto), 'workspace-templates', 'templates');
  if (!fs.existsSync(path.join(destinazione, 'CLAUDE.md'))) {
    throw new Error(`Modelli della cartella di lavoro assenti nel pacchetto: ${destinazione} (controlla extraResources)`);
  }
  const file = elencaGitkeep(sorgente);
  for (const rel of file) {
    const dest = path.join(destinazione, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(sorgente, rel), dest);
  }
  console.log(`  • modelli: ripristinati ${file.length} file .gitkeep in ${path.relative(contesto.appOutDir, destinazione)}`);
};
