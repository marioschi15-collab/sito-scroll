#!/usr/bin/env node
/**
 * Prova a fumo della finestra Electron (build di produzione in out/), senza schermo: con Playwright (_electron).
 *
 *   pnpm --filter @spalla/desktop smoke:finestra                    # Benvenuto → Cervello, due schermate
 *   pnpm --filter @spalla/desktop smoke:finestra -- --onboarding    # passaggio VERO: abbonamento, chat, rituale
 *
 * Opzioni: --uscita <cartella> (dove salvare le immagini; predefinita: <tmp>/spalla-finestra-smoke),
 *          --tieni (non cancella la SPALLA_HOME di prova), --senza-build (non lancia electron-vite build).
 * Su Linux senza DISPLAY si rilancia da sola dentro `xvfb-run -a`.
 *
 * --onboarding chiama davvero l'assistente: serve il login di Claude Code della macchina (SPALLA_CONFIG_EREDITATA=1
 * viene impostato qui) e ogni scambio è limitato a SPALLA_MAX_TURNI passi (predefinito 8). Risponde "Marco" e
 * "Del tu" alle prime due domande, salva finestra-chat.png ed esce.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cervello, comuni, finestra, onboarding, permessi } from '@spalla/it-copy';
import { _electron as electron } from 'playwright-core';

const qui = path.dirname(fileURLToPath(import.meta.url));
const cartellaApp = path.resolve(qui, '../..');
const argomenti = process.argv.slice(2);
const conOnboarding = argomenti.includes('--onboarding');
const tieni = argomenti.includes('--tieni');
const iUscita = argomenti.indexOf('--uscita');
const uscita = path.resolve(iUscita >= 0 && argomenti[iUscita + 1] ? argomenti[iUscita + 1] : path.join(os.tmpdir(), 'spalla-finestra-smoke'));

// ----- schermo virtuale -----
if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY && !process.env.SPALLA_SMOKE_DENTRO_XVFB) {
  const r = spawnSync('xvfb-run', ['-a', '-s', '-screen 0 1440x960x24', process.execPath, fileURLToPath(import.meta.url), ...argomenti], {
    stdio: 'inherit',
    env: { ...process.env, SPALLA_SMOKE_DENTRO_XVFB: '1' },
  });
  if (r.error) {
    console.error(`xvfb-run non disponibile (${r.error.message}): installa xvfb oppure lancia con un DISPLAY.`);
    process.exit(2);
  }
  process.exit(r.status ?? 1);
}

// ----- build -----
if (!argomenti.includes('--senza-build') || !fs.existsSync(path.join(cartellaApp, 'out/main/index.js'))) {
  const r = spawnSync('pnpm', ['exec', 'electron-vite', 'build'], { cwd: cartellaApp, stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) {
    console.error('electron-vite build non riuscita');
    process.exit(1);
  }
}

const require = createRequire(import.meta.url);
/** Il pacchetto `electron` esporta il percorso dell'eseguibile. */
const eseguibile = /** @type {string} */ (require('electron'));

const casa = fs.mkdtempSync(path.join(os.tmpdir(), 'spalla-finestra-'));
fs.mkdirSync(uscita, { recursive: true });
const registro = path.join(uscita, conOnboarding ? 'finestra-onboarding.log' : 'finestra-smoke.log');
const ambiente = { ...process.env, SPALLA_HOME: casa, ELECTRON_DISABLE_SANDBOX: '1', ELECTRON_ENABLE_LOGGING: '1' };
// Dentro un'altra sessione di Claude Code il binario erediterebbe l'id della sessione esterna.
delete ambiente.CLAUDE_CODE_SESSION_ID;
delete ambiente.ELECTRON_RUN_AS_NODE;
if (conOnboarding) {
  ambiente.SPALLA_CONFIG_EREDITATA = '1';
  ambiente.SPALLA_MAX_TURNI = process.env.SPALLA_MAX_TURNI ?? '8';
}

const ATTESA = 30_000;
const passo = (testo) => process.stdout.write(`· ${testo}\n`);

let app;
let esito = 0;
try {
  app = await electron.launch({
    executablePath: eseguibile,
    args: ['--no-sandbox', cartellaApp],
    cwd: cartellaApp,
    env: ambiente,
    timeout: 60_000,
  });
  const flusso = fs.createWriteStream(registro);
  app.process().stdout?.pipe(flusso);
  app.process().stderr?.pipe(flusso);

  const pagina = await app.firstWindow({ timeout: 60_000 });
  const errori = [];
  pagina.on('pageerror', (e) => errori.push(e.message));
  pagina.on('console', (m) => {
    if (m.type() === 'error') errori.push(m.text());
  });
  await pagina.setViewportSize({ width: 1100, height: 760 }).catch(() => undefined);

  // Sicurezza della pagina: solo window.spalla, niente Node.
  const superficie = await pagina.evaluate(() => ({
    spalla: typeof window.spalla === 'object',
    require: typeof globalThis.require,
    process: typeof globalThis.process,
  }));
  if (!superficie.spalla || superficie.require !== 'undefined' || superficie.process !== 'undefined') {
    throw new Error(`superficie della pagina inattesa: ${JSON.stringify(superficie)}`);
  }
  passo('pagina caricata: window.spalla presente, require/process assenti');

  const titolo = (nome) => pagina.getByRole('heading', { name: nome });
  const pulsante = (nome) => pagina.getByRole('button', { name: nome, exact: true });

  await titolo(onboarding.s0.benvenuto.titolo).waitFor({ timeout: 60_000 });
  passo('schermata Benvenuto');
  await pagina.screenshot({ path: path.join(uscita, 'finestra-benvenuto.png') });

  await pulsante(comuni.pulsanti.continua).click();
  await titolo(onboarding.s0.privacy.titolo).waitFor({ timeout: ATTESA });
  await pulsante(onboarding.s0.privacy.accetto).click();
  await titolo(onboarding.s0.avvioAutomatico.titolo).waitFor({ timeout: ATTESA });
  await pulsante(comuni.pulsanti.continua).click();
  await titolo(cervello.titolo).waitFor({ timeout: ATTESA });
  passo('schermata Cervello');
  await pagina.screenshot({ path: path.join(uscita, 'finestra-cervello.png') });

  if (conOnboarding) await onboardingVero(pagina, titolo, pulsante);

  if (errori.length > 0) passo(`errori della pagina (${errori.length}): ${errori.slice(0, 3).join(' | ')}`);
  passo(`immagini in ${uscita}`);
} catch (errore) {
  esito = 1;
  console.error(`PROVA NON RIUSCITA: ${errore instanceof Error ? errore.message : String(errore)}`);
  console.error(`registro del processo principale: ${registro}`);
  try {
    const pagina = app ? await app.firstWindow({ timeout: 1000 }) : undefined;
    await pagina?.screenshot({ path: path.join(uscita, 'finestra-errore.png') });
  } catch {
    // niente finestra da fotografare
  }
} finally {
  if (app) {
    // L'app resta nella barra quando si chiude la finestra: usciamo davvero (before-quit ferma il Nucleo).
    await Promise.race([app.evaluate(({ app: a }) => a.quit()).catch(() => undefined), new Promise((r) => setTimeout(r, 1000))]);
    await Promise.race([app.close().catch(() => undefined), new Promise((r) => setTimeout(r, 15_000))]);
    try {
      app.process().kill('SIGKILL');
    } catch {
      // già uscita
    }
  }
  if (!tieni) fs.rmSync(casa, { recursive: true, force: true });
  else passo(`SPALLA_HOME di prova: ${casa}`);
}
process.exit(esito);

/**
 * Il passaggio vero: abbonamento (login della macchina, senza pannello), motore pronto, chat, rituale.
 * Risponde alle prime due domande e fotografa la chat.
 */
async function onboardingVero(pagina, titolo, pulsante) {
  await pulsante(cervello.scelta.abbonamento).click();
  await pulsante(finestra.s0.cervello.giaCollegatoSviluppo).click({ timeout: ATTESA });
  passo('abbonamento: verifica del collegamento (login della macchina)…');
  await titolo(onboarding.s0.pronto.titolo).waitFor({ timeout: 180_000 });
  passo('motore pronto');
  await pulsante(finestra.s0.motore.continua).click();

  const casella = pagina.getByRole('textbox', { name: finestra.chat.etichettaCasella });
  await casella.waitFor({ timeout: ATTESA });
  passo('chat aperta: il rituale parte…');

  // Il rituale può chiedere permessi (es. un comando per leggere un file della cartella): si consentono, come
  // farebbe Marco. Si risponde alle prime due domande CONTROLLANDO che siano quelle attese (Q1 nome + tu/lei, Q2 il
  // nome dell'assistente): testo nella casella del riquadro + chip, che arrivano insieme. Una domanda diversa, o una
  // chip attesa che manca, fa fallire la prova (prima rispondeva a caso per posizione).
  const attese = [
    { id: 'Q1', domanda: /chiami|del tu/i, testo: 'Marco', chip: /^Del tu/i },
    { id: 'Q2', domanda: /come mi chiamo|mio nome|chiamarmi/i, testo: 'Bruno', chip: /^Lo scelgo io/i },
  ];
  const chipAperti = '.blocco-domanda button.chip:not([disabled])';
  const consentiAperti = `.scheda-permesso button:text-is("${permessi.pulsanti.consenti}")`;
  let date = 0;
  let permessiDati = 0;
  const limite = Date.now() + 8 * 60_000;
  while (date < attese.length) {
    if (Date.now() > limite) throw new Error(`il rituale non ha fatto ${attese.length} domande in tempo (risposte date: ${date})`);
    const prossimo = await Promise.race([
      pagina.locator(chipAperti).first().waitFor({ timeout: 300_000 }).then(() => 'domanda', () => 'nulla'),
      pagina.locator(consentiAperti).first().waitFor({ timeout: 300_000 }).then(() => 'permesso', () => 'nulla'),
    ]);
    if (prossimo === 'nulla') continue;
    if (prossimo === 'permesso') {
      const scheda = (await pagina.locator('.scheda-permesso').last().innerText()).replace(/\s+/g, ' ').slice(0, 140);
      await pagina.locator(consentiAperti).first().click();
      permessiDati += 1;
      passo(`permesso consentito: ${scheda}`);
      continue;
    }
    const attesa = attese[date];
    const riquadro = pagina.locator('.blocco-domanda', { has: pagina.locator('button.chip:not([disabled])') }).last();
    const testoDomanda = (await riquadro.innerText()).replace(/\s+/g, ' ');
    passo(`domanda ${date + 1}: ${testoDomanda.slice(0, 160)}`);
    if (!attesa.domanda.test(testoDomanda)) throw new Error(`attesa ${attesa.id} (${attesa.domanda}), arrivata: «${testoDomanda.slice(0, 200)}»`);
    const chip = riquadro.locator('button.chip:not([disabled])', { hasText: attesa.chip });
    if ((await chip.count()) === 0) throw new Error(`${attesa.id}: manca la chip ${attesa.chip} in «${testoDomanda.slice(0, 200)}»`);
    await riquadro.getByLabel(finestra.chat.domanda.campo).fill(attesa.testo);
    await chip.first().click();
    passo(`  → "${attesa.testo}" + chip ${attesa.chip}`);
    const conferma = riquadro.getByText(finestra.chat.domanda.rispostaData([]).replace(/:\s*$/, ''), { exact: false });
    await conferma.waitFor({ timeout: ATTESA });
    const data = await conferma.innerText();
    if (!data.includes(attesa.testo)) throw new Error(`${attesa.id}: la risposta mostrata non contiene «${attesa.testo}»: ${data}`);
    date += 1;
    await pagina.waitForFunction((sel) => document.querySelectorAll(sel).length === 0, chipAperti, { timeout: ATTESA }).catch(() => undefined);
  }
  passo(`risposte date: ${date}, permessi consentiti: ${permessiDati}`);

  // Lascia arrivare la risposta dopo la seconda domanda (o la domanda successiva).
  await pagina
    .waitForFunction(() => document.querySelectorAll('.blocco-domanda button.chip:not([disabled])').length > 0, undefined, { timeout: 120_000 })
    .catch(() => undefined);
  await pagina.waitForTimeout(1500);
  await pagina.screenshot({ path: path.join(uscita, 'finestra-chat.png') });
  passo('schermata della chat salvata');
}
