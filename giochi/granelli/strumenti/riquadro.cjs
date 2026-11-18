#!/usr/bin/env node
// Il gioco dentro un riquadro chiuso (un <iframe sandbox> senza la stessa origine) in mezzo a una pagina lunga, come
// quando lo si pubblica dentro un'altra pagina. Lì il browser non lascia salvare: il gioco deve partire lo stesso,
// dirlo nel benvenuto e con il segno fisso, e strisciare o girare la rotella sopra una finestra non deve far
// scorrere la pagina che lo ospita. Esce con codice diverso da zero se qualcosa non torna.
//
//   pnpm build && node strumenti/riquadro.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { URL_GIOCO, TELEFONO, chromium, gesto, tratto } = require('./comune.cjs');

function pretendi(vero, messaggio) {
  if (!vero) throw new Error(messaggio);
}

/** La pagina ospite: lunga, con il riquadro del gioco in mezzo. */
function paginaOspite() {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'granelli-riquadro-'));
  const file = path.join(cartella, 'ospite.html');
  fs.writeFileSync(
    file,
    `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">
<body style="margin:0;background:#eee;font:16px sans-serif">
<div style="height:200px;padding:10px">Una pagina che parla d'altro, prima del gioco.</div>
<iframe id="gioco" sandbox="allow-scripts" src="${URL_GIOCO}" style="display:block;width:100%;height:600px;border:0"></iframe>
<div style="height:3000px;padding:10px">E dopo il gioco, ancora tanta pagina.</div>
</body>`,
  );
  return pathToFileURL(file).href;
}

(async () => {
  const browser = await chromium.launch();
  const errori = [];
  let fallito = false;
  try {
    const ctx = await browser.newContext({ viewport: TELEFONO, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errori.push(`errore nella pagina: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errori.push(`errore in console: ${m.text()}`);
    });
    const cdp = await ctx.newCDPSession(page);
    await page.goto(paginaOspite());
    // La pagina ospite si porta in modo che il riquadro riempia lo schermo, come chi ci è arrivato scorrendo.
    await page.evaluate(() => window.scrollTo(0, 190));
    const gioco = page.frameLocator('#gioco');
    const passi = [
      [
        'il gioco parte, e il benvenuto dice che qui la partita non resta salvata',
        async () => {
          await gioco.locator('.scheda.messaggio').waitFor({ timeout: 10000 });
          const testo = await gioco.locator('.scheda.messaggio').textContent();
          pretendi(/non lascia salvare/.test(testo), `il benvenuto non dice che qui non si salva: «${testo}»`);
          pretendi(await gioco.locator('.non-salvata').isVisible(), 'manca il segno fisso «Qui la partita non resta salvata»');
        },
      ],
      [
        'strisciando il dito e girando la rotella sul benvenuto la pagina ospite non scorre',
        async () => {
          const r = await page.locator('#gioco').boundingBox();
          const prima = await page.evaluate(() => window.scrollY);
          const scheda = await gioco.locator('.scheda.messaggio').boundingBox();
          // Il dito va su e giù restando dentro il velo scuro, e poi dentro la scheda del benvenuto.
          const sulVelo = [r.x + 8, r.y + r.height - 20];
          const sullaScheda = [scheda.x + scheda.width / 2, scheda.y + scheda.height - 20];
          for (const punto of [sulVelo, sullaScheda]) {
            const su = [punto[0], punto[1] - 140];
            await gesto(cdp, tratto(punto, su, 10), { ms: 16 });
            await gesto(cdp, tratto(su, punto, 10), { ms: 16 });
            await page.mouse.move(punto[0], punto[1]);
            await page.mouse.wheel(0, 400);
            await page.waitForTimeout(250);
          }
          const dopo = await page.evaluate(() => window.scrollY);
          pretendi(dopo === prima, `la pagina ospite è scorsa da ${prima} a ${dopo}`);
        },
      ],
      [
        'si gioca lo stesso: «Inizia» chiude il benvenuto e il segno resta',
        async () => {
          await gioco.getByRole('button', { name: 'Inizia' }).tap();
          await page.waitForTimeout(300);
          pretendi((await gioco.locator('.velo').count()) === 0, 'il benvenuto non si è chiuso');
          pretendi(await gioco.locator('.non-salvata').isVisible(), 'dopo il benvenuto il segno fisso non c’è più');
        },
      ],
      [
        'la pagina non ha scritto errori (nemmeno per una vibrazione chiesta prima di un tocco)',
        async () => pretendi(errori.length === 0, errori.join('\n')),
      ],
    ];
    for (const [n, [nome, fai]] of passi.entries()) {
      try {
        await fai();
        console.log(`  ok  ${n + 1}. ${nome}`);
      } catch (e) {
        console.log(`  NO  ${n + 1}. ${nome}\n      ${String(e.message).split('\n').join('\n      ')}`);
        fallito = true;
        break;
      }
    }
  } finally {
    await browser.close();
  }
  if (fallito) {
    console.log('\nRiquadro: FALLITO');
    process.exit(1);
  }
  console.log('\nRiquadro: tutto bene');
})().catch((e) => {
  console.error(`riquadro.cjs: ${e.message}`);
  process.exit(1);
});
