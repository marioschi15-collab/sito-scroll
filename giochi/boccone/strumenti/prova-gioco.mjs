#!/usr/bin/env node
/* Prova del gioco finito: costruisce index.html, lo apre con Playwright su uno schermo da telefono, controlla la
   console, attraversa le schermate, gioca con un pilota automatico e salva le immagini in anteprime/gioco/.
   Uso: node giochi/boccone/strumenti/prova-gioco.mjs [opzioni]
     --schermo 390x844     misure dello schermo principale (predefinito 390x844)
     --veloce              salta la sopravvivenza e gli schermi di altre misure
     --senza-costruire     usa l'index.html che c'è già
     --esci <cartella>     dove salvare le immagini (predefinito anteprime/gioco)
   Stampa un riepilogo ed esce con codice 1 se trova errori (console, pagina, elementi fuori schermo, testi tagliati).
   Il pilota è lo stesso di prova-mondo.mjs ("attento"): scappa da chi fa male, punta la preda più vicina. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';
import { radice, costruisci } from './costruisci.mjs';

const arg = process.argv.slice(2), ha = nome => arg.includes(nome), dopo = nome => { const i = arg.indexOf(nome); return i >= 0 ? arg[i + 1] : null; };
const [LARGO, ALTO] = (dopo('--schermo') || '390x844').split('x').map(Number);
const cartella = resolve(dopo('--esci') || join(radice, 'anteprime', 'gioco'));
const veloce = ha('--veloce');
mkdirSync(cartella, { recursive: true });

const problemi = [], note = [];
const problema = s => { problemi.push(s); console.log('  ✗ ' + s); };
const nota = s => { note.push(s); console.log('  · ' + s); };

if (!ha('--senza-costruire')) { const r = costruisci(); console.log('Costruito index.html: ' + r.js + ' script, ' + r.css + ' fogli di stile, ' + Math.round(r.byte / 1024) + ' KB'); }
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const indirizzo = 'file://' + join(radice, 'index.html');

async function apri(largo, alto, salvataggio) {
  const contesto = await browser.newContext({ viewport: { width: largo, height: alto }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await contesto.newPage();
  page.on('pageerror', e => problema('errore nella pagina: ' + e.message + (e.stack ? ' @ ' + String(e.stack).split('\n')[1] : '')));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problema('console (' + m.type() + '): ' + m.text().slice(0, 300)); });
  if (salvataggio) await page.addInitScript(s => { try { localStorage.setItem('boccone-salvataggio-3', s); } catch (e) {} }, salvataggio);
  await page.goto(indirizzo);
  await page.waitForFunction('window.__pronto === true', null, { timeout: 60000 });
  await page.waitForTimeout(500);
  return { contesto, page };
}
const foto = async (page, nome) => { await page.screenshot({ path: join(cartella, nome + '.png') }); console.log('  immagine: ' + relative(process.cwd(), join(cartella, nome + '.png'))); };
const tocca = async (page, testo, dentro) => { const b = page.locator((dentro || '.schermata.visibile') + ' button', { hasText: testo }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); await page.waitForTimeout(250); };
const stato = page => page.evaluate(() => B.prova.stato());

/* Controlla la schermata che si vede: niente fuori schermo in orizzontale, bottoni raggiungibili, testi non tagliati. */
async function controlla(page, nome) {
  const guai = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight, guai = [];
    const radici = [...document.querySelectorAll('.schermata.visibile, #cruscotto.visibile')];
    for (const r of radici) {
      const corpo = r.querySelector('.corpo');
      if (corpo && corpo.scrollWidth > corpo.clientWidth + 1) guai.push('la pagina scorre di lato (' + corpo.scrollWidth + ' > ' + corpo.clientWidth + ')');
      for (const e of r.querySelectorAll('button, h1, h2, h3, strong, p, small, span, canvas, li')) {
        if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
        const q = e.getBoundingClientRect();
        if (q.width < 1 || q.height < 1) continue;
        const chi = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' "' + (e.textContent || '').trim().slice(0, 28) + '"';
        if (q.left < -1 || q.right > vw + 1) guai.push('fuori schermo di lato: ' + chi + ' (' + Math.round(q.left) + '…' + Math.round(q.right) + ')');
        if (!corpo && !r.querySelector('.scheda-velo.visibile') && (q.top < -1 || q.bottom > vh + 1)) guai.push('fuori schermo in alto o in basso: ' + chi);
        const st = getComputedStyle(e);
        if ((st.overflow === 'hidden' || st.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1 && e.children.length === 0) guai.push('testo tagliato: ' + chi);
      }
    }
    return [...new Set(guai)].slice(0, 8);
  });
  for (const g of guai) problema(nome + ': ' + g);
}
const fotoControllata = async (page, nome) => { await foto(page, nome); await controlla(page, nome); };

/* Il pilota "attento" di prova-mondo.mjs, da installare nella pagina. cattivo = true: va addosso a chi fa male. */
const installaPilota = (page, cattivo) => page.evaluate(cattivo => {
  const cautela = 150, errore = 0.25;
  let rx = 0, ry = 0, quando = 0;
  B.prova.pilota = M => {
    const h = M.eroe;
    if (!h) return { x: 0, y: 0 };
    let fx = 0, fy = 0, pericolo = false;
    if (cattivo) {
      let meta = null, vicino = 1e9;
      for (const e of M.predatori) { if (!e.minaccia) continue; const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < vicino) { vicino = d; meta = e; } }
      return meta ? { x: (meta.x - h.x) / (vicino || 1), y: (meta.y - h.y) / (vicino || 1) } : { x: 1, y: 0 };
    }
    for (const e of M.predatori) {
      if (!e.minaccia) continue;
      const d = Math.hypot(e.x - h.x, e.y - h.y) - e.r - h.r, soglia = e.avviso > 0 ? cautela * 2.2 : e.vAtt > 100 ? cautela : cautela * 0.8;
      if (d < soglia) { const q = Math.max(5, d + 30); fx += (h.x - e.x) / q; fy += (h.y - e.y) / q; pericolo = true; }
    }
    for (const m of M.pericoli) {
      if (m.alfa < 1) continue;
      const dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy) || 1, lato = m.r + h.r + cautela * 0.4;
      let raggio = cautela * 0.6 + h.r + Math.max(0, m.r - 24);
      if (m.zona > 0 && m.attivo > 0.15) raggio = Math.max(raggio, m.zona + h.r + 40);
      if (d < raggio) { fx += dx / d * 3; fy += dy / d * 3; pericolo = true; }
      const sopra = m.altezza > 0 && m.attivo > 0.05 && dy < 0 && dy > -(m.altezza + h.r + 40);
      const sotto = (m.vy > 50 || (m.def.comportamento === 'caduta' && m.attivo > 0.3)) && dy > 0 && dy < 700;
      if ((sopra || sotto) && Math.abs(dx) < lato) { fx += dx >= 0 ? 3 : -3; pericolo = true; }
    }
    for (const q of M.proiettili) { const d = Math.hypot(q.x - h.x, q.y - h.y) || 1; if (d < cautela * 0.8 + h.r + q.r) { fx += (h.x - q.x) / d * 3; fy += (h.y - q.y) / d * 3; pericolo = true; } }
    if (!pericolo) {
      let meta = null, vicino = 1e9;
      const ob = M.obiettivo;
      if (ob && ob.mangiabile && !ob.via && !(ob.intoccabile > 0)) meta = ob;
      if (!meta) for (const e of M.predatori) { if (!e.mangiabile || e.via || e.intoccabile > 0) continue; const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < vicino && d < 900) { vicino = d; meta = e; } }
      if (!meta) for (const b of M.banchi) { const d = Math.hypot(b.x - h.x, b.y - h.y); if (d < vicino) { vicino = d; meta = b; } }
      if (meta) { fx = meta.x - h.x; fy = meta.y - h.y; }
    }
    let m = Math.hypot(fx, fy) || 1; fx /= m; fy /= m;
    if (pericolo) { const b = 250; if (h.x < b) fx += 1; if (h.x > M.largo - b) fx -= 1; if (h.y < b) fy += 1; if (h.y > M.alto - b) fy -= 1; m = Math.hypot(fx, fy) || 1; fx /= m; fy /= m; }
    if (M.t > quando) { quando = M.t + 0.6; rx = (Math.random() - 0.5) * 2 * errore; ry = (Math.random() - 0.5) * 2 * errore; }
    return { x: fx + rx, y: fy + ry };
  };
}, !!cattivo);

/* Fa avanzare il mondo in fretta (senza aspettare lo schermo) finché la partita dura e "finche" lo permette. */
const corri = (page, secondi, fermaA) => page.evaluate(([secondi, fermaA]) => {
  const t0 = performance.now();
  let passi = 0;
  for (let i = 0; i < secondi * 30 && B.partita.stato === 'gioco'; i++) {
    B.prova.passo(1 / 30); passi++;
    const M = B.partita.mondo;
    if (fermaA && M.eroe && M.eroe.p >= fermaA) break;
  }
  const s = B.prova.stato();
  s.msPerPasso = passi ? (performance.now() - t0) / passi : 0;
  return s;
}, [secondi, fermaA || 0]);

async function avvia(page, opzioni) {
  await page.evaluate(o => { B.prova.pilota = null; B.interfaccia.gioca(o); }, opzioni);
  await page.waitForFunction('B.partita.stato === "gioco"', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}
/* Quanti fotogrammi al secondo fa il gioco, misurati per un paio di secondi di partita vera. */
async function fluidita(page, nome) {
  const a = await stato(page); await page.waitForTimeout(2000); const b = await stato(page);
  const fps = (b.fotogrammi - a.fotogrammi) / 2;
  nota(nome + ': ' + fps.toFixed(0) + ' fotogrammi al secondo (qualità ' + b.qualita + ', figurine ' + b.figurine.atlanti + ' atlanti, ' + (b.figurine.pixel / 1e6).toFixed(1) + ' milioni di pixel)');
  return fps;
}

// =====================================================================  1. schermate, a salvataggio vuoto
console.log('\n1. Schermate (salvataggio vuoto, ' + LARGO + '×' + ALTO + ')');
let { contesto, page } = await apri(LARGO, ALTO);
await fotoControllata(page, '01-casa');
await tocca(page, 'Gioca'); await page.waitForTimeout(300);
await fotoControllata(page, '02-mappa');
await tocca(page, '‹'); await tocca(page, 'Come si gioca');
await fotoControllata(page, '03-aiuto');
await tocca(page, 'Ho capito'); await tocca(page, 'Impostazioni');
await fotoControllata(page, '04-impostazioni');
await tocca(page, 'A sinistra'); await tocca(page, 'A destra'); await tocca(page, 'Azzera i progressi');
await fotoControllata(page, '04b-impostazioni-conferma');
await tocca(page, 'No, li tengo'); await tocca(page, '‹');
// il regalo del giorno
const prima = (await stato(page)).perle;
await page.locator('.regalo').click(); await page.waitForTimeout(300);
const dopoRegalo = (await stato(page)).perle;
if (dopoRegalo <= prima) problema('il regalo del giorno non ha dato perle'); else nota('regalo del giorno: +' + (dopoRegalo - prima) + ' perle');
await foto(page, '01b-casa-regalo');

// =====================================================================  2. prima partita: livello 1
console.log('\n2. Prima partita (livello 1)');
await tocca(page, 'Gioca'); await tocca(page, 'Gioca il livello 1');
await page.waitForFunction('B.partita.stato === "gioco"', null, { timeout: 30000 });
await page.waitForTimeout(3200);
// i comandi veri: la leva a dito
await page.evaluate(() => { const t = document.getElementById('tela'), ev = (tipo, x, y) => t.dispatchEvent(new PointerEvent(tipo, { pointerId: 7, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true })); ev('pointerdown', 150, 620); ev('pointermove', 205, 590); });
await page.waitForTimeout(1400);
await fotoControllata(page, '05-inizio-partita');
const mosso = await page.evaluate(() => { const h = B.partita.mondo.eroe; return Math.hypot(h.vx, h.vy); });
if (mosso < 40) problema('la leva a dito non muove l\'eroe (velocità ' + mosso.toFixed(0) + ')');
await page.locator('#cr-scatto').dispatchEvent('pointerdown'); await page.waitForTimeout(150);
if (!(await page.evaluate(() => B.partita.mondo.scatto.ricarica > 0))) problema('il tasto Scatto non fa partire lo scatto');
await page.evaluate(() => document.getElementById('tela').dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true })));
await fluidita(page, 'livello 1, appena partito');
// la pausa
await page.locator('#cr-pausa').click(); await page.waitForTimeout(300);
if ((await stato(page)).stato !== 'pausa') problema('il tasto di pausa non mette in pausa');
await fotoControllata(page, '06-pausa');
await tocca(page, 'Riprendi');
// si gioca in fretta fino a metà, poi fino in fondo
await installaPilota(page, false);
let s = await corri(page, 240, 260);
await page.waitForTimeout(900);
await fotoControllata(page, '07-meta-partita');
await fluidita(page, 'livello 1, a metà');
s = await corri(page, 900);
nota('livello 1: ' + s.stato + ' in ' + Math.round(s.tempo) + ' s, potenza ' + Math.round(s.potenza) + ', cuori ' + s.cuori + ', perle della partita ' + s.perlePartita + ' (' + s.msPerPasso.toFixed(2) + ' ms a passo)');
await page.waitForTimeout(2600);
if ((await stato(page)).schermata !== 'risultato') problema('dopo la partita non compare il risultato');
await fotoControllata(page, s.stato === 'vinto' ? '08-vittoria' : '08-sconfitta-livello-1');

// =====================================================================  3. negozio, acquario, traguardi (con qualcosa dentro)
console.log('\n3. Negozio, acquario, traguardi');
await page.evaluate(() => { B.progressi.guadagna(700, 'prova'); B.interfaccia.esci('casa'); });
await page.waitForTimeout(300);
await fotoControllata(page, '09-casa-dopo');
await tocca(page, 'Negozio'); await page.waitForTimeout(400);
await fotoControllata(page, '10-negozio');
const perlePrima = (await stato(page)).perle;
await page.locator('.schermata.visibile .voce .compra').first().click(); await page.waitForTimeout(300);
if ((await stato(page)).perle >= perlePrima) problema('comprare un potenziamento non spende perle');
await page.locator('.schermata.visibile .corpo').evaluate(e => { e.scrollTop = e.scrollHeight; }); await page.waitForTimeout(200);
await fotoControllata(page, '10b-negozio-fondo');
await tocca(page, '‹'); await tocca(page, 'Acquario'); await page.waitForTimeout(500);
await fotoControllata(page, '11-acquario');
const vista = page.locator('.schermata.visibile .specie:not(.ignota)').first();
if (await vista.count()) { await vista.click(); await page.waitForTimeout(700); await fotoControllata(page, '11b-acquario-scheda'); await tocca(page, 'Chiudi'); } else problema('dopo una partita l\'acquario è ancora vuoto');
await page.locator('.schermata.visibile .specie.ignota').first().click(); await page.waitForTimeout(400);
await foto(page, '11c-acquario-ignota'); await tocca(page, 'Chiudi');
await tocca(page, '‹'); await tocca(page, 'Traguardi'); await page.waitForTimeout(300);
await fotoControllata(page, '12-traguardi');
const daRitirare = await page.locator('.schermata.visibile .traguardo .compra').count();
if (daRitirare) { await page.locator('.schermata.visibile .traguardo .compra').first().click(); await page.waitForTimeout(300); nota('traguardi da ritirare dopo una partita: ' + daRitirare); }
await tocca(page, '‹');

// =====================================================================  4. un gigante (livello 5)
console.log('\n4. Il gigante (livello 5)');
await page.evaluate(() => { B.progressi.stato.livelloMax = Math.max(B.progressi.stato.livelloMax, 6); B.prova.effetti = { cuori: 4, velocita: 1.25 }; });
await avvia(page, { livello: 5, modalita: 'avventura' });
await installaPilota(page, false);
s = await corri(page, 200, 3000);
// per la foto: il gigante si avvicina all'eroe (che per un attimo non può essere colpito)
await page.evaluate(() => { const M = B.partita.mondo, h = M.eroe, g = M.obiettivo; if (g && h) { h.invul = 6; g.x = Math.min(M.largo - 200, h.x + 250); g.y = Math.max(200, h.y - 190); g.ang = 2.5; g.nasce = 0; g.riposo = 0; } });
await page.waitForTimeout(1300);
await fotoControllata(page, '13-gigante');
await fluidita(page, 'livello 5, con il gigante');
s = await corri(page, 1200);
nota('livello 5 (con aiuti di prova): ' + s.stato + ' in ' + Math.round(s.tempo) + ' s, potenza ' + Math.round(s.potenza) + ', cuori ' + s.cuori);
await page.waitForTimeout(2600);
await fotoControllata(page, '14-risultato-gigante');

// =====================================================================  5. una sconfitta (livello 2, pilota che va addosso ai grossi)
console.log('\n5. Una sconfitta');
await page.evaluate(() => { B.prova.effetti = null; });
await avvia(page, { livello: 2, modalita: 'avventura' });
await installaPilota(page, true);
s = await corri(page, 240);
await page.waitForTimeout(2400);
if (s.stato !== 'perso') problema('il pilota che va addosso ai pesci grossi non ha perso (stato: ' + s.stato + ')');
await fotoControllata(page, '15-sconfitta');
await tocca(page, 'Inizio');

// =====================================================================  6. un ambiente buio, con i pericoli; e la sopravvivenza
if (!veloce) {
  console.log('\n6. Altri ambienti e sopravvivenza');
  for (const [livello, nome] of [[12, '16-relitto-buio'], [22, '17-ghiacci'], [34, '18-vulcano-buio'], [37, '19-abisso']]) {
    const totale = await page.evaluate(() => B.livelli.totale);
    if (livello > totale) continue;
    await page.evaluate(n => { B.progressi.stato.livelloMax = Math.max(B.progressi.stato.livelloMax, n); B.prova.effetti = { cuori: 4 }; }, livello);
    await avvia(page, { livello, modalita: 'avventura' });
    await installaPilota(page, false);
    s = await corri(page, 60, 400);
    await page.waitForTimeout(900);
    await fotoControllata(page, nome);
    s = await corri(page, 120);
    await page.evaluate(() => B.interfaccia.esci('casa'));
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => { B.prova.effetti = null; });
  await avvia(page, { modalita: 'sopravvivenza' });
  await installaPilota(page, false);
  s = await corri(page, 150);
  await page.waitForTimeout(700);
  if (s.stato === 'gioco') await fotoControllata(page, '20-sopravvivenza');
  s = await corri(page, 1500);
  nota('sopravvivenza: ' + s.stato + ' dopo ' + Math.round(s.tempo) + ' s, potenza ' + Math.round(s.potenza));
  await page.waitForTimeout(2400);
  await fotoControllata(page, '21-risultato-sopravvivenza');
  await tocca(page, 'Inizio');
}
const finale = await stato(page);
if (finale.errori) problema('errori contati dal gioco: ' + finale.errori);
if (finale.figurine.errori) problema('modelli che non si disegnano: ' + finale.figurine.errori);
const salvataggio = await page.evaluate(() => { B.progressi.salva(); return localStorage.getItem('boccone-salvataggio-3'); });
if (!salvataggio) problema('il salvataggio non è stato scritto');
await contesto.close();

// =====================================================================  7. altri schermi, riaprendo con il salvataggio
if (!veloce) {
  for (const [w, h] of [[360, 640], [430, 932]]) {
    console.log('\n7. Schermo ' + w + '×' + h + ' (riapre con il salvataggio di prima)');
    ({ contesto, page } = await apri(w, h, salvataggio));
    const pref = w + 'x' + h + '-';
    await fotoControllata(page, pref + 'casa');
    await tocca(page, 'Gioca'); await page.waitForTimeout(300); await fotoControllata(page, pref + 'mappa'); await tocca(page, '‹');
    await tocca(page, 'Negozio'); await page.waitForTimeout(300); await fotoControllata(page, pref + 'negozio'); await tocca(page, '‹');
    await tocca(page, 'Acquario'); await page.waitForTimeout(400); await fotoControllata(page, pref + 'acquario'); await tocca(page, '‹');
    await tocca(page, 'Traguardi'); await page.waitForTimeout(300); await fotoControllata(page, pref + 'traguardi'); await tocca(page, '‹');
    await tocca(page, 'Impostazioni'); await fotoControllata(page, pref + 'impostazioni'); await tocca(page, '‹');
    await tocca(page, 'Come si gioca'); await fotoControllata(page, pref + 'aiuto'); await tocca(page, 'Ho capito');
    await avvia(page, { livello: 3, modalita: 'avventura' });
    await installaPilota(page, false);
    await page.evaluate(() => { B.prova.effetti = { cuori: 4 }; });
    s = await corri(page, 200, 900);
    await page.evaluate(() => { const a = B.partita.mondo.aiuti; a.molt = 5; a.moltT = 8; a.calamitaT = 9; a.scudo = true; a.frenesiaT = 6; });
    await page.waitForTimeout(800);
    await fotoControllata(page, pref + 'partita');
    await page.locator('#cr-pausa').click(); await page.waitForTimeout(300); await fotoControllata(page, pref + 'pausa'); await tocca(page, 'Riprendi');
    s = await corri(page, 900);
    await page.waitForTimeout(2600);
    await fotoControllata(page, pref + 'risultato');
    await contesto.close();
  }
}

await browser.close();
writeFileSync(join(cartella, 'rapporto.json'), JSON.stringify({ problemi, note }, null, 2));
console.log('\n' + (problemi.length ? problemi.length + ' problemi:\n' + [...new Set(problemi)].map(p => '  ✗ ' + p).join('\n') : 'Nessun problema.'));
process.exit(problemi.length ? 1 : 0);
