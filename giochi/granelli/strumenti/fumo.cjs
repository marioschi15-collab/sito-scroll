#!/usr/bin/env node
// Giro di fumo: gioca davvero una piccola partita nel browser, su un telefono simulato (390x780, con il tocco),
// e si ferma al primo passo che non va. Esce con codice diverso da zero se qualcosa non torna.
//
//   pnpm build && node strumenti/fumo.cjs
//
// Per aggiungere una prova: un nuovo passo in fondo all'elenco PASSI (o nel punto in cui ha senso). Ogni passo
// riceve lo stato della prova (`s`: pagina, sessione per i tocchi, errori raccolti) e lancia un errore se quello che
// vede non è quello che si aspetta. Dal passo 2 fino alla ricarica della pagina il mondo è in pausa.
// Il mondo nasce sempre dallo stesso seme (come in misura.cjs): il profilo della roccia è lo stesso a ogni giro, e
// un passo che cerca un punto piano dove costruire lo trova sempre lì.
const { apri, chiudiFinestre, quadro, scegli, gesto, tratto, M, C } = require('./comune.cjs');

function pretendi(vero, messaggio) {
  if (!vero) throw new Error(messaggio);
}

/** Quante celle ci sono, in questo momento, di ogni materiale. */
const conta = (page) =>
  page.evaluate(() => {
    const m = window.granelli();
    const n = {};
    for (let i = 0; i < m.tipo.length; i++) n[m.tipo[i]] = (n[m.tipo[i]] || 0) + 1;
    return n;
  });

/** Le voci del Libro già scoperte nel mondo vivo, e quello che dice il tasto del Libro nello stesso istante. */
const libro = (page) =>
  page.evaluate(() => ({
    visti: [...window.granelli().visti].filter((id) => id < 1000000).sort((a, b) => a - b),
    tasto: document.querySelector('.tasto-libro').textContent,
  }));

/** Un dito che versa per un po' quello che è scelto in tavolozza, muovendosi appena, in un punto del cielo. */
async function versa(s, nome, x, y, ms) {
  await scegli(s.page, nome);
  await gesto(s.cdp, tratto([x - 12, y], [x + 12, y], 6), { ms: 40, fermo: ms });
}

/** Due voci scritte come schede (src/contenuti/paese.ts), con i loro numeri di numeri.ts. */
const SCHEDE = { CACCIATORE: 230, ACCAMPAMENTO: 274 };

/** Quanto è larga l'immagine del tondino di una voce del Libro: 7 per la grana di un materiale, di più per un'icona. */
const larghezzaTondino = (page, nome) =>
  page.evaluate(async (nome) => {
    const voce = [...document.querySelectorAll('.scheda.libro .voce')].find((v) => v.querySelector('strong')?.textContent === nome);
    const url = voce?.querySelector('.pallino')?.style.backgroundImage.slice(5, -2);
    if (!url) return 0;
    const img = new Image();
    img.src = url;
    await img.decode();
    return img.naturalWidth;
  }, nome);

const PASSI = [
  {
    nome: 'si apre con il benvenuto, e «Inizia» lo chiude',
    fai: async (s) => {
      const inizia = s.page.getByRole('button', { name: 'Inizia' });
      pretendi((await inizia.count()) === 1, 'manca la finestra di benvenuto con il bottone «Inizia»');
      await inizia.tap();
      await s.page.waitForTimeout(200);
      pretendi((await s.page.locator('.velo').count()) === 0, 'la finestra di benvenuto non si è chiusa');
    },
  },
  {
    nome: 'terra e acqua versate col dito fanno il fango, e il Libro lo segna',
    fai: async (s) => {
      const q = await quadro(s.page);
      const x = q.x + q.w / 2;
      const y = q.y + q.h * 0.3;
      await versa(s, 'Terra', x, y, 900);
      await s.page.waitForTimeout(900);
      await versa(s, 'Acqua', x, y, 900);
      await s.page.waitForFunction((fango) => window.granelli().visti.has(fango), M.FANGO, { timeout: 15000 });
      const celle = await conta(s.page);
      pretendi(celle[M.TERRA] > 20 && celle[M.FANGO] > 0, 'nel mondo non ci sono la terra versata e il fango');
      // Il mondo è vivo: insieme al fango può essere già nata un'alga. Il tasto del Libro deve contare tutto quello che c'è.
      const { visti, tasto } = await libro(s.page);
      pretendi(visti.length >= 5 && tasto.startsWith(`Libro ${visti.length}/`), `le scoperte sono ${visti.length}, ma il tasto dice «${tasto}»`);
      // Da qui in poi si provano le finestre: il mondo va in pausa, così nessuna scoperta nuova ci passa davanti.
      await s.page.locator('.barra .tasto', { hasText: 'Pausa' }).tap();
    },
  },
  {
    nome: 'il Libro si apre, mostra il Fango e si chiude',
    fai: async (s) => {
      // Gli avvisi delle scoperte stanno sopra la barra per qualche secondo: si aspetta che se ne vadano.
      await s.page.waitForFunction(() => document.querySelector('.avvisi').childElementCount === 0, null, { timeout: 12000 });
      await s.page.locator('.tasto-libro').tap();
      await s.page.locator('.scheda.libro').waitFor();
      await s.page.locator('.linguetta', { hasText: 'Terra e pietre' }).tap();
      pretendi((await s.page.locator('.scheda.libro .voce strong', { hasText: /^Fango$/ }).count()) === 1, 'nel Libro, tra «Terra e pietre», manca il Fango');
      await s.page.locator('.scheda.libro .scheda-testa .tasto', { hasText: 'Chiudi' }).tap();
      pretendi((await s.page.locator('.velo').count()) === 0, 'il Libro non si è chiuso');
    },
  },
  {
    nome: 'in Unisci terra + acqua dà Fango, e la seconda volta dice che è già fatta',
    fai: async (s) => {
      await s.page.locator('.tasto-unisci').tap();
      await s.page.locator('.scheda.unisci').waitFor();
      const tocca = async (nome) => s.page.locator('.scaffale .gettone', { hasText: new RegExp(`^${nome}$`) }).tap();
      for (const nome of ['Terra', 'Acqua']) await tocca(nome);
      const esito = (await s.page.locator('.esito strong').textContent()) ?? '';
      pretendi(esito === 'Fango', `in Unisci terra + acqua ha dato «${esito}» invece di «Fango»`);
      for (const nome of ['Acqua', 'Terra']) await tocca(nome);
      const titolo = (await s.page.locator('.esito .avviso-sopra').textContent()) ?? '';
      pretendi(titolo === 'Già fatta:', `rifacendo acqua + terra il pannello dice «${titolo}» invece di «Già fatta:»`);
      // Nessun Mestolo, né in tavolozza né nel pannello.
      pretendi((await s.page.getByText(/mestolo/i).count()) === 0, 'da qualche parte c’è ancora scritto «Mestolo»');
      await s.page.locator('.scheda.unisci .scheda-testa .tasto', { hasText: 'Chiudi' }).tap();
      pretendi((await s.page.locator('.velo').count()) === 0, 'Unisci non si è chiuso');
    },
  },
  {
    nome: 'una capanna posata nel mondo resta dove è stata messa',
    fai: async (s) => {
      // Si scopre la capanna (così entra in tavolozza) e la si posa nel primo punto abbastanza piano a destra del
      // centro, dove è caduta la terra del passo 2.
      const posata = await s.page.evaluate((capanna) => {
        const m = window.granelli();
        m.scopri(capanna, m.w >> 1, m.h >> 1);
        for (let x = (m.w >> 1) + 14; x < (m.w >> 1) + 30; x++) if (m.posa(capanna, x, 20)) return true;
        return false;
      }, C.CAPANNA);
      pretendi(posata, 'il mondo ha rifiutato di posare la capanna in tutti i punti provati');
      await chiudiFinestre(s.page);
      const cose = await s.page.evaluate(() => window.granelli().cose.map((c) => c.id));
      pretendi(cose.length === 1 && cose[0] === C.CAPANNA, 'la capanna posata non è tra le cose del mondo');
    },
  },
  {
    nome: 'una costruzione non si posa sopra un’altra (una riga dice perché), e accanto sì',
    fai: async (s) => {
      await s.page.waitForFunction(() => document.querySelector('.avvisi').childElementCount === 0, null, { timeout: 12000 });
      await scegli(s.page, 'Capanna');
      // Dove sta sullo schermo una cella del mondo: il foglio dei granelli è già spostato e ingrandito come la vista.
      const sulloSchermo = (cella) =>
        s.page.evaluate(([x, y]) => {
          const m = window.granelli();
          const r = document.querySelector('.foglio').getBoundingClientRect();
          const scala = r.width / m.w;
          return [r.left + (x + 0.5) * scala, r.top + (y + 0.5) * scala];
        }, cella);
      const capanna = await s.page.evaluate(() => {
        const c = window.granelli().cose[0];
        return [c.x + 5, c.y - 2];
      });
      await gesto(s.cdp, [[await sulloSchermo(capanna)]]);
      await s.page.locator('.riga.su').waitFor({ timeout: 3000 });
      const riga = (await s.page.locator('.riga').textContent()) ?? '';
      pretendi(riga.includes('già una costruzione'), `toccando sopra la capanna la riga dice «${riga}»`);
      pretendi((await s.page.evaluate(() => window.granelli().cose.length)) === 1, 'una seconda capanna è finita sopra la prima');
      // Un punto libero e abbastanza piano, accanto alla prima e ancora in vista (prima a destra, poi a sinistra):
      // lì il tocco la posa. La terra versata col dito non cade mai uguale, e a volte a destra non c'è posto.
      const libero = await s.page.evaluate((id) => {
        const m = window.granelli();
        const prima = m.cose[0].x;
        const punti = [];
        for (let x = prima + 15; x < (m.w >> 1) + 44; x++) punti.push(x);
        for (let x = prima - 6; x > (m.w >> 1) - 44; x--) punti.push(x);
        for (const x of punti) {
          const dove = m.puoPosare(id, x, 20);
          if (dove.si) return [x, dove.y - 2];
        }
        return null;
      }, C.CAPANNA);
      pretendi(libero, 'vicino alla capanna non c’è un punto dove posarne un’altra');
      await gesto(s.cdp, [[await sulloSchermo(libero)]]);
      await s.page.waitForFunction(() => window.granelli().cose.length === 2, null, { timeout: 3000 });
      const sovrapposte = await s.page.evaluate(() => {
        const [a, b] = window.granelli().cose;
        return a.x < b.x + 10 && b.x < a.x + 10;
      });
      pretendi(!sovrapposte, 'le due capanne si sovrappongono');
    },
  },
  {
    nome: 'con la Mano la vista si sposta',
    fai: async (s) => {
      const vista = () => s.page.evaluate(() => document.querySelector('.foglio').style.transform);
      const prima = await vista();
      await scegli(s.page, 'Mano');
      const q = await quadro(s.page);
      await gesto(s.cdp, tratto([q.x + q.w / 2, q.y + q.h / 2], [q.x + q.w / 2 - 120, q.y + q.h / 2 - 30]));
      await s.page.waitForTimeout(100);
      pretendi((await vista()) !== prima, 'trascinando con la Mano la vista non si è mossa');
    },
  },
  {
    nome: 'dopo aver ricaricato la pagina tornano le scoperte e il mondo',
    fai: async (s) => {
      // Dopo la ricarica il mondo riprende a muoversi, ma terra e fango insieme non cambiano di numero: è l'impronta
      // con cui si riconosce che il mondo tornato è quello di prima.
      const foto = () =>
        s.page.evaluate(([terra, fango]) => {
          const m = window.granelli();
          let suolo = 0;
          for (let i = 0; i < m.tipo.length; i++) if (m.tipo[i] === terra || m.tipo[i] === fango) suolo++;
          const visti = [...m.visti].filter((id) => id < 1000000).sort((a, b) => a - b);
          return { visti, suolo, cose: m.cose.map((c) => [c.id, c.x, c.y]), tic: m.tic, misure: [m.w, m.h], tasto: document.querySelector('.tasto-libro').textContent };
        }, [M.TERRA, M.FANGO]);
      const prima = await foto();
      await s.page.reload();
      await s.page.waitForFunction(() => typeof window.granelli === 'function');
      await s.page.evaluate(() => window.__oraVera());
      pretendi((await s.page.getByRole('button', { name: 'Inizia' }).count()) === 0, 'dopo la ricarica è ricomparso il benvenuto: la partita non è stata ritrovata');
      // Dopo la ricarica il mondo riparte subito: può esserci una scoperta in più, mai una in meno.
      const dopo = await foto();
      pretendi(prima.visti.every((id) => dopo.visti.includes(id)), `le scoperte non sono tornate: prima ${prima.visti}, dopo ${dopo.visti}`);
      pretendi(dopo.visti.includes(M.FANGO) && dopo.visti.includes(C.CAPANNA), 'tra le scoperte tornate mancano il fango o la capanna');
      // Una cosa posata può ancora assestarsi di una cella o due sul terreno: contano il tipo e la colonna.
      const stesse = dopo.cose.length === 2 && dopo.cose.length === prima.cose.length && dopo.cose.every((c, n) => c[0] === prima.cose[n][0] && c[1] === prima.cose[n][1] && Math.abs(c[2] - prima.cose[n][2]) <= 3);
      pretendi(stesse, `le cose posate non sono tornate: prima ${JSON.stringify(prima.cose)}, dopo ${JSON.stringify(dopo.cose)}`);
      pretendi(JSON.stringify(dopo.misure) === JSON.stringify(prima.misure) && dopo.tic >= prima.tic, 'il mondo tornato non è quello di prima');
      pretendi(prima.suolo > 20 && dopo.suolo === prima.suolo, `terra e fango non sono tornati: prima ${prima.suolo} celle, dopo ${dopo.suolo}`);
      pretendi(dopo.tasto.startsWith(`Libro ${dopo.visti.length}/`), `il conto del Libro non è tornato: dice «${dopo.tasto}», le scoperte sono ${dopo.visti.length}`);
    },
  },
  {
    nome: 'quando un omino muore di sete, una riga lo dice',
    fai: async (s) => {
      // Dopo la ricarica il mondo ha ripreso a girare: un omino allo stremo, lontano dall'acqua, muore subito.
      const lontano = await s.page.evaluate(() => {
        const m = window.granelli();
        for (let x = m.w - 20; x > 20; x--) {
          const fonte = m.fonti.bere(x);
          if (fonte >= 0 && Math.abs(fonte - x) < 12) continue;
          m.aggiungiOmino(x, m.suolo(x) - 1);
          m.omini[m.omini.length - 1].sete = 899;
          return true;
        }
        return false;
      });
      pretendi(lontano, 'non c’è un punto lontano dall’acqua dove mettere l’omino');
      await s.page.locator('.riga.su').waitFor({ timeout: 5000 });
      const riga = (await s.page.locator('.riga').textContent()) ?? '';
      pretendi(riga.includes('morto di sete'), `alla morte dell’omino la riga dice «${riga}»`);
      pretendi((await s.page.evaluate(() => window.granelli().omini.length)) === 0, 'l’omino allo stremo è ancora vivo');
    },
  },
  {
    nome: 'portare l’acqua sulla terra (window.granelli().porta) fa nascere il fango proprio lì',
    fai: async (s) => {
      // Prima una manciata di terra portata sulla roccia nuda più vicina al mezzo del mondo, lontano dalle capanne
      // e dagli omini (portata su di loro la terra cercherebbe di unirsi): si mette lì e si posa.
      const messa = await s.page.evaluate(([terra, roccia]) => {
        const m = window.granelli();
        // Roccia nuda in tutte le colonne lì intorno, senza niente sopra (acqua, piante, terra) a meno di tre celle.
        const nuda = (x) => {
          for (let k = -5; k <= 5; k++) if (m.leggi(x + k, m.suolo(x + k)) !== roccia || m.leggi(x + k, m.suolo(x + k) - 1) !== 0) return false;
          return true;
        };
        const libera = (x) => m.cose.every((c) => x < c.x - 12 || x > c.x + 24) && m.omini.every((o) => Math.abs(o.x - x) > 10);
        for (let d = 0; d < m.w >> 1; d++) {
          for (const x of [(m.w >> 1) - d, (m.w >> 1) + d]) {
            if (nuda(x) && libera(x)) {
              return { esito: m.porta(terra, x, m.suolo(x) - 1, 'gettone'), x };
            }
          }
        }
        return null;
      }, [M.TERRA, M.ROCCIA]);
      pretendi(messa && messa.esito.genere === 'messa', `la terra portata sulla roccia non si è messa lì: ${JSON.stringify(messa)}`);
      await s.page.waitForTimeout(800);
      // L'acqua si porta sulla terra appena messa: si cerca lì intorno (il punto dipende da dove stanno capanne e
      // omini, che dopo la ricarica possono arrivare da soli, quindi non è sempre vicino al mezzo del mondo).
      const r = await s.page.evaluate(([terra, acqua, fango, cx]) => {
        const m = window.granelli();
        // Il fango intorno a un punto, entro cinque celle: deve crescere proprio dove si è portata l'acqua.
        const fangoVicino = (x, y) => {
          let n = 0;
          for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (m.leggi(x + dx, y + dy) === fango) n++;
          return n;
        };
        // La cella di terra con il cielo libero sopra più vicina a dove è stata messa: lì si porta il gettone dell'acqua.
        for (let d = 0; d < 12; d++) {
          for (const x of [cx - d, cx + d]) {
            const y = m.suolo(x);
            if (m.leggi(x, y) !== terra) continue;
            const prima = fangoVicino(x, y);
            const esito = m.porta(acqua, x, y, 'gettone');
            return { esito, prima, dopo: fangoVicino(x, y), provata: m.giaProvata(terra, acqua) };
          }
        }
        // Niente terra in cima: si dice che cosa c'è, colonna per colonna (numero del materiale in cima / riga).
        const intorno = [];
        for (let x = cx - 12; x <= cx + 12; x++) intorno.push(`${x}:${m.leggi(x, m.suolo(x))}/${m.suolo(x)}`);
        return { intorno: intorno.join(' ') };
      }, [M.TERRA, M.ACQUA, M.FANGO, messa.x]);
      pretendi(r.esito, `vicino alla terra appena messa (colonna ${messa.x}) non c’è terra scoperta su cui portare l’acqua: ${r.intorno}`);
      pretendi(r.esito.genere === 'unione' && r.esito.nato === M.FANGO, `portando l’acqua sulla terra è successo ${JSON.stringify(r.esito)}`);
      pretendi(r.dopo > r.prima, `il fango lì intorno non è cresciuto: prima ${r.prima} celle, dopo ${r.dopo}`);
      pretendi(r.provata, 'la coppia terra e acqua non risulta provata');
    },
  },
  {
    nome: 'le voci scritte come schede hanno nel Libro la loro icona, e una costruzione delle schede si posa col dito',
    fai: async (s) => {
      await s.page.evaluate((ids) => {
        const m = window.granelli();
        for (const id of ids) m.scopri(id, m.w >> 1, m.h >> 1);
      }, [SCHEDE.CACCIATORE, SCHEDE.ACCAMPAMENTO]);
      await chiudiFinestre(s.page);
      await s.page.waitForFunction(() => document.querySelector('.avvisi').childElementCount === 0, null, { timeout: 15000 });
      await s.page.locator('.tasto-libro').tap();
      await s.page.locator('.scheda.libro').waitFor();
      await s.page.locator('.linguetta', { hasText: 'Genti' }).tap();
      const persona = await larghezzaTondino(s.page, 'Cacciatore');
      await s.page.locator('.linguetta', { hasText: 'Invenzioni' }).tap();
      const campo = await larghezzaTondino(s.page, 'Accampamento');
      await s.page.locator('.linguetta', { hasText: 'Terra e pietre' }).tap();
      const fango = await larghezzaTondino(s.page, 'Fango');
      pretendi(persona >= 14 && campo >= 14, `nel Libro Cacciatore e Accampamento non hanno la loro icona (larghe ${persona} e ${campo})`);
      pretendi(fango === 7, `il tondino del Fango è largo ${fango}, non 7`);
      await s.page.locator('.scheda.libro .scheda-testa .tasto', { hasText: 'Chiudi' }).tap();
      await scegli(s.page, 'Accampamento');
      // Il mondo vivo non lascia mai lo stesso terreno in vista (acqua, pendii, la capanna di prima): con il mondo in
      // pausa si spiana un tratto di roccia nuda in mezzo alla vista, e lì un tocco deve posare l'accampamento.
      await s.page.locator('.barra .tasto', { hasText: 'Pausa' }).tap();
      const punto = await s.page.evaluate(([id, roccia]) => {
        const m = window.granelli();
        const r = document.querySelector('.foglio').getBoundingClientRect();
        const q = document.querySelector('.quadro').getBoundingClientRect();
        const scala = r.width / m.w;
        const cx = Math.floor(((q.left + q.right) / 2 - r.left) / scala);
        const cy = Math.floor(((q.top + q.bottom) / 2 - r.top) / scala);
        for (let x = cx - 12; x <= cx + 12; x++) {
          for (let y = cy - 20; y < Math.min(m.h, cy + 6); y++) {
            if (y < cy) m.svuota(y * m.w + x);
            else m.metti(y * m.w + x, roccia);
          }
        }
        m.omini = m.omini.filter((o) => Math.abs(o.x - cx) > 14);
        m.cose = m.cose.filter((c) => c.x > cx + 14 || c.x + 20 < cx - 14);
        const dove = m.puoPosare(id, cx, cy - 3);
        if (!dove.si) return dove.perche;
        return [r.left + (cx + 0.5) * scala, r.top + (cy - 3 + 0.5) * scala];
      }, [SCHEDE.ACCAMPAMENTO, M.ROCCIA]);
      pretendi(Array.isArray(punto), `nella vista spianata l’accampamento non si posa: ${punto}`);
      const prima = await s.page.evaluate(() => window.granelli().cose.length);
      await gesto(s.cdp, [[punto]]);
      await s.page.waitForFunction((n) => window.granelli().cose.length > n, prima, { timeout: 3000 });
      const ultima = await s.page.evaluate(() => window.granelli().cose.at(-1).id);
      pretendi(ultima === SCHEDE.ACCAMPAMENTO, `il tocco ha posato ${ultima} invece dell’accampamento`);
      await s.page.locator('.barra .tasto', { hasText: 'Riprendi' }).tap();
    },
  },
  {
    nome: '«Svuota il mondo» tiene il Libro e le coppie già provate',
    fai: async (s) => {
      await chiudiFinestre(s.page);
      await s.page.locator('button', { hasText: /^Nuovo$/ }).tap();
      await s.page.getByRole('button', { name: 'Svuota il mondo' }).tap();
      await s.page.waitForTimeout(200);
      const r = await s.page.evaluate(([terra, acqua, fango]) => {
        const m = window.granelli();
        return { cose: m.cose.length, fango: m.visti.has(fango), provata: m.giaProvata(acqua, terra) };
      }, [M.TERRA, M.ACQUA, M.FANGO]);
      pretendi(r.cose === 0, `dopo «Svuota il mondo» restano ${r.cose} costruzioni`);
      pretendi(r.fango, 'dopo «Svuota il mondo» il Fango non è più nel Libro');
      pretendi(r.provata, 'dopo «Svuota il mondo» la coppia terra e acqua non risulta più provata');
    },
  },
  {
    nome: 'una partita di prima con il Mestolo si apre con la Mano scelta e un saluto, una volta sola',
    fai: async (s) => {
      // La partita salvata diventa «di prima»: con il Mestolo tra i ricordi. Questa pagina smette di salvare
      // (altrimenti chiudendosi riscriverebbe la partita), e la si riapre in una pagina nuova.
      await s.page.evaluate(() => {
        const chiave = Object.keys(localStorage).find((k) => localStorage.getItem(k).includes('"extra"'));
        const dati = JSON.parse(localStorage.getItem(chiave));
        dati.extra = { ...dati.extra, mestolo: true };
        localStorage.setItem(chiave, JSON.stringify(dati));
        Storage.prototype.setItem = () => {};
      });
      const apri = async () => {
        const pagina = await s.ctx.newPage();
        pagina.on('pageerror', (e) => s.errori.push(`errore nella pagina: ${e.message}`));
        await pagina.goto(s.page.url());
        await pagina.waitForFunction(() => typeof window.granelli === 'function');
        return pagina;
      };
      const vecchia = await apri();
      const saluto = vecchia.locator('.scheda.messaggio', { hasText: 'Il Mestolo non c’è più' });
      pretendi((await saluto.count()) === 1, 'aprendo una partita con il Mestolo non compare il saluto');
      const scelto = await vecchia.locator('.tavolozza .granello.attivo .nome').textContent();
      pretendi(scelto === 'Mano', `aprendo una partita con il Mestolo è scelto «${scelto}» invece della Mano`);
      pretendi((await vecchia.locator('.tavolozza').getByText(/mestolo/i).count()) === 0, 'nella tavolozza c’è ancora il Mestolo');
      await vecchia.getByRole('button', { name: 'Ho capito' }).tap();
      await vecchia.close();
      // Riaperta ancora, il saluto non torna: la partita si è già ricordata senza il Mestolo.
      const dopo = await apri();
      pretendi((await dopo.locator('.scheda.messaggio', { hasText: 'Mestolo' }).count()) === 0, 'il saluto al Mestolo è tornato una seconda volta');
      await dopo.close();
    },
  },
  {
    nome: 'la pagina non ha scritto errori',
    fai: async (s) => {
      pretendi(s.errori.length === 0, s.errori.join('\n'));
    },
  },
];

(async () => {
  const s = await apri({ entra: false, mondoFisso: true });
  let fallito = null;
  try {
    for (const [n, passo] of PASSI.entries()) {
      try {
        await passo.fai(s);
        console.log(`  ok  ${n + 1}. ${passo.nome}`);
      } catch (e) {
        console.log(`  NO  ${n + 1}. ${passo.nome}\n      ${String(e.message).split('\n').join('\n      ')}`);
        fallito = passo.nome;
        break;
      }
    }
  } finally {
    await s.chiudi();
  }
  if (fallito) {
    console.log('\nGiro di fumo: FALLITO');
    process.exit(1);
  }
  console.log(`\nGiro di fumo: tutto bene (${PASSI.length} passi)`);
})().catch((e) => {
  console.error(`fumo.cjs: ${e.message}`);
  process.exit(1);
});
