// Attrezzi comuni alle prove nel browser (fumo.cjs e misura.cjs): aprono il gioco costruito (dist/index.html)
// come lo vedrebbe un telefono, raccolgono gli errori della pagina e fanno i gesti di un dito vero.
// Non fanno parte del gioco: servono a chi lo sviluppa. Prima di usarli: pnpm build.
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const URL_GIOCO = pathToFileURL(path.resolve(__dirname, '..', 'dist', 'index.html')).href;
const TELEFONO = { width: 390, height: 780 };
const COMPUTER = { width: 1280, height: 720 };

/** I numeri dei materiali e delle cose che servono alle prove (gli stessi di src/motore/materiali.ts e cose.ts). */
const M = { VUOTO: 0, TERRA: 1, ACQUA: 2, FUOCO: 3, ARIA: 4, VAPORE: 5, FANGO: 6, SABBIA: 7, LAVA: 8, PIETRA: 9, NUVOLA: 10, PIANTA: 15, LEGNO: 16, ROCCIA: 24 };
const C = { FALO: 201, CAPANNA: 202, CAMPO: 206, POZZO: 208, CASA: 209, FORNACE: 210, CARRO: 213, BARCA: 214, MURA: 216, TORRE: 217, TEMPIO: 218, MULINO: 221, CASTELLO: 222, MERCATO: 224, PONTE: 228, FARO: 229 };

/**
 * Da far girare prima che la pagina parta. Tiene fermo l'orologio finché il gioco non è nato, così il mondo nuovo
 * nasce sempre dallo stesso seme (stesso profilo di roccia a ogni misura), e cronometra tutto ciò che gira dentro
 * un fotogramma.
 */
function strumentiInPagina() {
  const oraVera = Date.now.bind(Date);
  Date.now = () => 1700000000000;
  window.__oraVera = () => {
    Date.now = oraVera;
  };
  const m = { durate: [], inizi: [], passi: [], attivo: false };
  window.__misura = m;
  const vero = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    vero((t) => {
      const s = performance.now();
      cb(t);
      if (m.attivo) {
        m.durate.push(performance.now() - s);
        m.inizi.push(s);
      }
    });
}

/**
 * Apre il gioco. Restituisce pagina, sessione CDP (per i tocchi veri e per rallentare il processore) e l'elenco
 * degli errori che la pagina scrive: chi prova controlla alla fine che sia vuoto.
 * `mondoFisso` fa nascere il mondo sempre uguale e prepara il cronometro dei fotogrammi (serve a misura.cjs).
 * `gioco` è l'indirizzo di un'altra copia costruita del gioco, per confrontarla con questa.
 */
async function apri({ browser, viewport = TELEFONO, tocco = true, dpr = 2, mondoFisso = false, entra = true, gioco = URL_GIOCO } = {}) {
  const mio = browser ?? (await chromium.launch());
  const ctx = await mio.newContext({ viewport, deviceScaleFactor: dpr, hasTouch: tocco, isMobile: tocco });
  const page = await ctx.newPage();
  const errori = [];
  page.on('pageerror', (e) => errori.push(`errore nella pagina: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errori.push(`errore in console: ${m.text()}`);
  });
  if (mondoFisso) await page.addInitScript(strumentiInPagina);
  await page.goto(gioco);
  await page.waitForFunction(() => typeof window.granelli === 'function');
  if (mondoFisso) await page.evaluate(() => window.__oraVera());
  if (entra) await premiInizia(page);
  const cdp = await ctx.newCDPSession(page);
  return { browser: mio, ctx, page, cdp, errori, chiudi: () => (browser ? ctx.close() : mio.close()) };
}

/** Chiude la finestra di benvenuto, se c'è. */
async function premiInizia(page) {
  const inizia = page.getByRole('button', { name: 'Inizia' });
  if (await inizia.count()) {
    await inizia.click();
    await page.waitForTimeout(200);
  }
}

/** Chiude le finestre rimaste aperte sopra il mondo (l'arrivo del Mestolo, una festa, il Libro). */
async function chiudiFinestre(page) {
  for (let k = 0; k < 4; k++) {
    if ((await page.locator('.velo').count()) === 0) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
  }
}

/** Il rettangolo dello schermo in cui si vede il mondo. */
async function quadro(page) {
  return page.evaluate(() => {
    const r = document.querySelector('.quadro').getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
}

/** Sceglie una voce della tavolozza (Terra, Acqua, Mano, Gomma…) toccandola. */
async function scegli(page, nome) {
  await page.locator('.tavolozza .granello .nome', { hasText: new RegExp(`^${nome}$`) }).first().tap();
}

const punti = (dita) => dita.map(([x, y], id) => ({ x: Math.round(x), y: Math.round(y), id, radiusX: 4, radiusY: 4, force: 1 }));

/**
 * Un gesto di tocco vero: `tappe` è l'elenco delle posizioni successive delle dita (una o due), ognuna
 * [[x, y], [x, y]…]. Le dita si appoggiano sulla prima tappa, passano per le altre e si alzano dall'ultima.
 */
async function gesto(cdp, tappe, { ms = 30, fermo = 0 } = {}) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: punti(tappe[0]) });
  for (const tappa of tappe.slice(1)) {
    await new Promise((r) => setTimeout(r, ms));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: punti(tappa) });
  }
  if (fermo > 0) await new Promise((r) => setTimeout(r, fermo));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** Un dito che va da un punto all'altro in linea retta, a piccoli passi. */
function tratto(da, a, passi = 8) {
  const tappe = [];
  for (let k = 0; k <= passi; k++) tappe.push([[da[0] + ((a[0] - da[0]) * k) / passi, da[1] + ((a[1] - da[1]) * k) / passi]]);
  return tappe;
}

module.exports = { URL_GIOCO, TELEFONO, COMPUTER, M, C, chromium, apri, premiInizia, chiudiFinestre, quadro, scegli, gesto, tratto };
