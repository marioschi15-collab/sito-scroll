#!/usr/bin/env node
// Quanto costa un fotogramma? Apre il gioco costruito come un telefono (390x780), prepara le scene di riferimento
// con window.granelli() e misura i millesimi di JavaScript per fotogramma a velocità piena e con il processore
// rallentato 4 e 6 volte (un telefono medio e uno economico), più i fotogrammi al secondo.
//
//   pnpm build && node strumenti/misura.cjs                  tutte le scene, una tabella
//   node strumenti/misura.cjs --scene mare,temporale         solo alcune scene
//   node strumenti/misura.cjs --ritmi 6 --giri 3             solo x6, tre giri (vale il migliore)
//   node strumenti/misura.cjs --scrivi "dopo P7"             aggiunge la riga alla tabella storica (misure.md)
//   node strumenti/misura.cjs --gioco /altra/copia/dist/index.html --scene mare
//                                                            misura un'altra copia costruita del gioco (per esempio
//                                                            quella di prima di una modifica), da confrontare con questa
//
// I numeri assoluti dipendono dalla macchina: contano i confronti tra una riga e l'altra di misure.md, fatti sulla
// stessa macchina. Esce con codice diverso da zero se la pagina dà errori o una scena non si riesce a preparare.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { apri, chiudiFinestre, scegli, quadro, chromium } = require('./comune.cjs');

const STORIA = path.join(__dirname, 'misure.md');

/** Le scene di riferimento: ognuna scrive direttamente nel mondo vivo e dice cosa ha preparato. */
const SCENE = {
  vuoto: { nome: 'mondo vuoto', prepara: () => ({}) },
  lago: {
    nome: 'lago (6.000 celle)',
    prepara: () => {
      const m = window.granelli();
      let acqua = 0;
      for (let x = 0; x < m.w; x++) {
        const s = m.suolo(x);
        for (let y = Math.max(0, s - 14); y < s; y++) {
          m.metti(y * m.w + x, 2);
          acqua++;
        }
      }
      return { acqua };
    },
  },
  temporale: {
    nome: 'temporale',
    prepara: () => {
      const m = window.granelli();
      let nuvole = 0;
      for (let y = 2; y < 24; y++) {
        for (let x = 0; x < m.w; x++) {
          if (m.tipo[y * m.w + x] !== 0) continue;
          m.metti(y * m.w + x, 10);
          nuvole++;
        }
      }
      return { nuvole };
    },
  },
  incendio: {
    nome: 'incendio',
    posa: 2500,
    prepara: () => {
      const m = window.granelli();
      let bosco = 0;
      // Un bosco fitto: una fascia di legno e foglie alta 22 celle sopra il suolo, poi il fuoco alla base e in cima.
      for (let x = 0; x < m.w; x++) {
        const s = m.suolo(x);
        for (let y = Math.max(0, s - 22); y < s; y++) {
          const i = y * m.w + x;
          if (m.tipo[i] !== 0) continue;
          m.metti(i, (x + y) % 3 === 0 ? 16 : 15, 0);
          bosco++;
        }
      }
      for (let x = 0; x < m.w; x += 3) {
        const s = m.suolo(x, 0);
        m.accendi((s - 1) * m.w + x);
        const cima = Math.max(0, s - 22);
        if (m.tipo[cima * m.w + x] !== 0) m.accendi(cima * m.w + x);
      }
      return { bosco };
    },
  },
  paese: { nome: 'paese di giorno', prepara: paese },
  paeseNotte: {
    nome: 'paese di notte',
    prepara: paese,
    dopo: () => {
      window.granelli().tic = 9360;
    },
  },
  maturo: { nome: 'mondo maturo', prepara: maturo },
  mare: {
    nome: 'mare (29.000 celle)',
    prepara: () => {
      const m = window.granelli();
      let acqua = 0;
      for (let x = 0; x < m.w; x++) {
        const s = m.suolo(x);
        for (let y = 40; y < s; y++) {
          m.metti(y * m.w + x, 2);
          acqua++;
        }
      }
      return { acqua };
    },
  },
  maturoTrascinato: { nome: 'maturo, vista trascinata', prepara: maturo, trascina: true },
};

/** Venti omini e quindici edifici intorno al centro del mondo. */
function paese() {
  const m = window.granelli();
  const ids = [202, 209, 201, 208, 206, 210, 222, 217, 218, 221, 224, 216, 229, 213, 228, 214];
  for (const id of ids) m.visti.add(id);
  const cx = m.w >> 1;
  for (let k = 0; k < 15; k++) m.posa(ids[k % ids.length], cx - 42 + k * 6, m.suolo(cx - 42 + k * 6) - 1);
  for (let k = 0; k < 20; k++) m.aggiungiOmino(cx - 45 + k * 4, m.suolo(cx - 45 + k * 4) - 1);
  return { omini: m.omini.length, edifici: m.cose.length };
}

/** Un mondo come dopo una lunga partita: terra e sabbia dappertutto, un mare nelle conche, un bosco, nuvole, un paese. */
function maturo() {
  const m = window.granelli();
  const { w } = m;
  const sup = [];
  for (let x = 0; x < w; x++) sup.push(m.suolo(x));
  for (let x = 0; x < w; x++) for (let k = 1; k <= 12; k++) m.metti((sup[x] - k) * w + x, x % 97 < 28 ? 7 : 1);
  const cime = sup.map((s) => s - 12).sort((a, b) => a - b);
  const mare = cime[Math.floor(cime.length * 0.45)];
  for (let x = 0; x < w; x++) for (let y = mare; y < sup[x] - 12; y++) m.metti(y * w + x, 2);
  for (let x = 3; x < w - 3; x += 5) {
    const cima = sup[x] - 12;
    if (cima <= mare || x % 97 < 28) continue;
    const alto = 6 + (x % 5);
    for (let k = 1; k <= alto; k++) m.metti((cima - k) * w + x, 16);
    for (let dy = -2; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const i = (cima - alto - 1 + dy) * w + x + dx;
        if (m.tipo[i] === 0) m.metti(i, 15, 0);
      }
    }
  }
  for (let y = 4; y < 11; y++) for (let x = 0; x < w; x++) if ((x >> 6) % 2 === 0) m.metti(y * w + x, 10);
  const ids = [202, 209, 201, 208, 206, 210, 222, 217, 218, 221, 224, 216, 229, 213, 228, 214];
  for (const id of ids) m.visti.add(id);
  const cx = w >> 1;
  for (let k = 0; k < 15; k++) m.posa(ids[k % ids.length], cx - 42 + k * 6, m.suolo(cx - 42 + k * 6) - 1);
  for (let k = 0; k < 20; k++) m.aggiungiOmino(cx - 45 + k * 4, m.suolo(cx - 45 + k * 4) - 1);
  return { omini: m.omini.length, edifici: m.cose.length };
}

const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Misura per `ms` millesimi: costo medio di un fotogramma, parte dovuta al passo del mondo, fotogrammi al secondo. */
async function cronometra(page, ms, durante) {
  await page.evaluate(() => {
    const m = window.__misura;
    m.durate.length = 0;
    m.inizi.length = 0;
    m.passi.length = 0;
    m.attivo = true;
  });
  if (durante) await durante(ms);
  else await page.waitForTimeout(ms);
  const r = await page.evaluate(() => {
    const m = window.__misura;
    m.attivo = false;
    return { durate: m.durate.slice(), inizi: m.inizi.slice(), passi: m.passi.slice() };
  });
  if (r.durate.length < 5) throw new Error('il gioco non disegna: nessun fotogramma misurato');
  const durata = r.inizi[r.inizi.length - 1] - r.inizi[0];
  return {
    js: media(r.durate),
    mondo: r.passi.reduce((x, y) => x + y, 0) / r.durate.length,
    fps: (r.inizi.length - 1) / (durata / 1000),
  };
}

async function unaMisura(browser, chiave, ritmo, durata, gioco) {
  const scena = SCENE[chiave];
  const { page, cdp, errori, chiudi } = await apri({ browser, dpr: 3, mondoFisso: true, gioco });
  try {
    if (ritmo > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: ritmo });
    // Cronometra anche il solo passo del mondo, sull'istanza viva.
    await page.evaluate(() => {
      const mondo = window.granelli();
      const m = window.__misura;
      const vero = mondo.passo.bind(mondo);
      mondo.passo = () => {
        const s = performance.now();
        vero();
        if (m.attivo) m.passi.push(performance.now() - s);
      };
    });
    await page.evaluate(scena.prepara);
    if (scena.dopo) await page.evaluate(scena.dopo);
    await page.waitForTimeout(scena.posa ?? 4000);
    await chiudiFinestre(page);
    let durante;
    if (scena.trascina) {
      // Un dito sulla Mano che porta la vista avanti e indietro per tutta la misura.
      await scegli(page, 'Mano');
      const q = await quadro(page);
      const cx = Math.round(q.x + q.w / 2);
      const cy = Math.round(q.y + q.h / 2);
      const dito = (x, y) => [{ x: Math.round(x), y: Math.round(y), id: 0, radiusX: 4, radiusY: 4, force: 1 }];
      durante = async (ms) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: dito(cx, cy) });
        const fine = Date.now() + ms;
        for (let k = 1; Date.now() < fine; k++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: dito(cx + Math.sin(k / 25) * 150, cy + Math.cos(k / 40) * 120) });
          await page.waitForTimeout(8);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };
    }
    const r = await cronometra(page, durata, durante);
    if (errori.length) throw new Error(errori.join('\n'));
    return r;
  } finally {
    await chiudi();
  }
}

const n2 = (v) => v.toFixed(2).replace('.', ',');

function argomenti() {
  const a = process.argv.slice(2);
  const dopo = (nome) => (a.includes(nome) ? a[a.indexOf(nome) + 1] : undefined);
  const scene = (dopo('--scene') ?? Object.keys(SCENE).join(',')).split(',');
  for (const s of scene) if (!SCENE[s]) throw new Error(`scena sconosciuta: ${s} (ci sono: ${Object.keys(SCENE).join(', ')})`);
  return {
    scene,
    ritmi: (dopo('--ritmi') ?? '1,4,6').split(',').map(Number),
    giri: Number(dopo('--giri') ?? 1),
    durata: Number(dopo('--durata') ?? 5000),
    scrivi: dopo('--scrivi'),
    gioco: dopo('--gioco') ? pathToFileURL(path.resolve(dopo('--gioco'))).href : undefined,
  };
}

/** Aggiunge alla tabella storica la riga di questa misura (solo se sono state misurate tutte le scene e i tre ritmi). */
function scriviRiga(nome, esiti) {
  const celle = Object.keys(SCENE).map((chiave) => {
    const e = esiti[chiave];
    return `${[1, 4, 6].map((r) => n2(e[r].js)).join(' / ')} (${Math.round(e[6].fps)})`;
  });
  // La riga va in fondo alla tabella, non in fondo al file: sotto la tabella ci sono le note.
  const righe = fs.readFileSync(STORIA, 'utf8').split('\n');
  let ultima = -1;
  for (let n = 0; n < righe.length; n++) if (righe[n].startsWith('|')) ultima = n;
  if (ultima < 0) throw new Error(`in ${path.basename(STORIA)} non trovo la tabella a cui aggiungere la riga`);
  righe.splice(ultima + 1, 0, `| ${nome} | ${celle.join(' | ')} |`);
  fs.writeFileSync(STORIA, righe.join('\n'));
  console.log(`\nRiga «${nome}» aggiunta a ${path.relative(process.cwd(), STORIA)}`);
}

(async () => {
  const opz = argomenti();
  const completa = opz.scene.length === Object.keys(SCENE).length && [1, 4, 6].every((r) => opz.ritmi.includes(r));
  if (opz.scrivi && !completa) throw new Error('--scrivi vuole tutte le scene e i ritmi 1, 4 e 6');
  if (opz.scrivi && opz.gioco) throw new Error('--scrivi vale solo per questa copia del gioco, non con --gioco');
  const browser = await chromium.launch();
  const esiti = {};
  try {
    for (const chiave of opz.scene) {
      esiti[chiave] = {};
      for (const ritmo of opz.ritmi) {
        let migliore = null;
        // Su una macchina condivisa un giro può essere disturbato: tra più giri vale il migliore.
        for (let g = 0; g < opz.giri; g++) {
          const r = await unaMisura(browser, chiave, ritmo, opz.durata, opz.gioco);
          if (!migliore || r.js < migliore.js) migliore = r;
        }
        esiti[chiave][ritmo] = migliore;
        console.log(`${SCENE[chiave].nome.padEnd(26)} x${ritmo}  ${n2(migliore.js).padStart(6)} ms a fotogramma (mondo ${n2(migliore.mondo)})  ${migliore.fps.toFixed(1)} al secondo`);
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`\nMillesimi di JavaScript per fotogramma: ${opz.ritmi.map((r) => (r === 1 ? 'pieno' : `x${r}`)).join(' / ')} (fotogrammi al secondo al ritmo più lento)`);
  const lento = opz.ritmi[opz.ritmi.length - 1];
  for (const chiave of opz.scene) {
    const e = esiti[chiave];
    console.log(`  ${SCENE[chiave].nome.padEnd(26)} ${opz.ritmi.map((r) => n2(e[r].js)).join(' / ')} (${Math.round(e[lento].fps)})`);
  }
  if (opz.scrivi) scriviRiga(opz.scrivi, esiti);
})().catch((e) => {
  console.error(`misura.cjs: ${e.message}`);
  process.exit(1);
});
