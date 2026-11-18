import { INIZIALI, ere, ingombroDi, voce, voci, vociTrovate } from './contenuti/registro.js';
import { Pittore } from './disegno/pittore.js';
import { apriLibro, nomeDi, tondino } from './libro.js';
import { M, OMINO, PRIMA_ID_MISCELA, VILLAGGIO } from './motore/materiali.js';
import { Mondo } from './motore/mondo.js';
import { SUPERFICIE, terreno } from './motore/terreno.js';
import { apriUnisci } from './unisci.js';
import { costruisciPagina, el } from './pagina.js';
import { ADDIO_MESTOLO, ANNUNCIO, NON_SI_POSA, annuncioDiLutto } from './righe.js';
import { type Ricordi, leggiRicordi } from './ricordi.js';
import { carica, extraDi, fotografa, ripristina, salva } from './salvataggio.js';

const GOMMA = -1;
// Il -2 era il Mestolo, che non c'è più: il numero resta libero, così una partita di prima non lo confonde con altro.
const MANO = -3;
const ISTANTE = 1000 / 60;
/** Quanto è grande un mondo nuovo, in celle: molto più della vista, che ci scorre sopra. */
const LARGO = 420;
const ALTO = 190;
/** Quante celle si vedono, più o meno, sul lato corto dello schermo. */
const IN_VISTA = 96;
/** Quante cose stanno nella tavolozza: le ultime usate o scoperte. Tutte le altre si prendono dal Libro. */
const POSTI = 14;

/**
 * Costruisce la pagina e fa partire il gioco. `ripresa` è la fotografia di una partita interrotta, se c'è:
 * altrimenti si riprende quella salvata nel browser, e se non c'è nemmeno quella si comincia da capo.
 */
export function avvia(app: HTMLElement, ripresa: unknown): { fotografa: () => unknown } {
  const p = costruisciPagina(app);

  let foto = ripresa;
  let salvato = ripristina(foto);
  if (!salvato) {
    foto = carica();
    salvato = ripristina(foto);
  }
  const { ricordi, avevaIlMestolo } = leggiRicordi(salvato ? extraDi(foto) : null);
  // Chi aveva il Mestolo in mano ritrova la Mano: lo strumento che sposta la vista, che non fa danni.
  let scelto: number = avevaIlMestolo ? MANO : M.TERRA;
  let raggio = 3;
  let inPausa = false;

  // ── Pennelli (danno alla pagina la sua forma definitiva, insieme alla tavolozza) ─────────────────
  for (const [nome, r, lato] of [
    ['fine', 1, 6],
    ['medio', 3, 11],
    ['grosso', 6, 17],
  ] as const) {
    const b = el('button', 'pennello');
    b.setAttribute('aria-label', `Pennello ${nome}`);
    const punto = el('span', 'punto');
    punto.style.width = punto.style.height = `${lato}px`;
    b.append(punto);
    b.classList.toggle('attivo', r === raggio);
    b.addEventListener('click', () => {
      raggio = r;
      for (const altro of p.pennelli.children) altro.classList.toggle('attivo', altro === b);
    });
    p.pennelli.append(b);
  }
  // Due file di granelli finti, solo per dare al piede la sua altezza vera prima di misurare lo spazio del mondo.
  for (let n = 0; n < 4; n++) {
    const finto = el('button', 'granello');
    finto.append(el('span', 'pallino'), el('span', 'nome', '…'));
    p.tavolozza.append(finto);
  }

  // ── Il mondo ─────────────────────────────────────────────────────────────────
  /** Un mondo di sola roccia. */
  function mondoNuovo(): Mondo {
    const m = new Mondo(LARGO, ALTO, (Date.now() & 0x7fffffff) || 1);
    for (const id of INIZIALI) m.visti.add(id);
    terreno(m);
    return m;
  }

  let mondo = salvato ?? mondoNuovo();

  /** Un fulmine o un'esplosione: tutto si schiarisce per un istante e il mondo trema. */
  function lampo(): void {
    p.quadro.classList.remove('lampo');
    void p.quadro.offsetWidth;
    p.quadro.classList.add('lampo');
  }
  function nuovoPittore(): Pittore {
    const nuovo = new Pittore(p.tele, mondo);
    nuovo.suLampo = lampo;
    return nuovo;
  }
  let pittore = nuovoPittore();

  // ── La vista: una finestra che scorre sul mondo ───────────────────────────────
  /** Quanti pixel della pagina è grande una cella, e dove guarda la vista (in celle, dall'angolo in alto a sinistra). */
  let scala = 4;
  let vistaW = 1;
  let vistaH = 1;
  let camX = 0;
  let camY = 0;
  let centrata = false;

  function muoviVista(x: number, y: number): void {
    camX = Math.max(0, Math.min(mondo.w - vistaW, x));
    camY = Math.max(0, Math.min(mondo.h - vistaH, y));
    p.foglio.style.transform = `translate(${-Math.round(camX * scala)}px, ${-Math.round(camY * scala)}px)`;
  }

  /** Mette la vista al centro del mondo, con la superficie a due terzi dell'altezza. */
  function centra(): void {
    centrata = true;
    muoviVista((mondo.w - vistaW) / 2, mondo.h * SUPERFICIE - vistaH * 0.66);
  }

  function adatta(): void {
    const r = p.cielo.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    scala = Math.max(3, Math.round(Math.min(r.width, r.height) / IN_VISTA));
    vistaW = Math.min(mondo.w, r.width / scala);
    vistaH = Math.min(mondo.h, r.height / scala);
    p.foglio.style.width = `${mondo.w * scala}px`;
    p.foglio.style.height = `${mondo.h * scala}px`;
    pittore.adatta(vistaW, vistaH);
    if (centrata) muoviVista(camX, camY);
    else centra();
  }
  new ResizeObserver(adatta).observe(p.cielo);
  adatta();

  // ── Tavolozza ────────────────────────────────────────────────────────────────
  const eMiscela = (id: number): boolean => id >= PRIMA_ID_MISCELA;
  /** Si può mettere nel mondo col dito: i materiali e le invenzioni che lo permettono, e tutte le miscele. */
  const versabile = (id: number): boolean => (eMiscela(id) ? mondo.ricettario.has(id) : voce(id)?.versabile === true);
  const quanteVoci = (): number => vociTrovate(mondo.visti);
  const quanteMiscele = (): number => [...mondo.visti].filter(eMiscela).length;

  function scegli(id: number): void {
    scelto = id;
    for (const b of p.tavolozza.querySelectorAll<HTMLButtonElement>('.granello')) {
      b.classList.toggle('attivo', b.dataset.id === String(id));
    }
  }

  /** Porta una cosa in cima alla tavolozza: la più recente sta davanti, la più vecchia esce. */
  function inTavolozza(id: number): void {
    ricordi.recenti = [id, ...ricordi.recenti.filter((altro) => altro !== id)].slice(0, POSTI);
  }

  function granello(id: number, nome: string): HTMLButtonElement {
    const b = el('button', 'granello');
    b.dataset.id = String(id);
    let segno: HTMLSpanElement;
    if (id === GOMMA) {
      segno = el('span', 'pallino');
      segno.style.backgroundImage = 'repeating-linear-gradient(45deg,#fff 0 3px,#f48 3px 6px)';
    } else if (id === MANO) segno = el('span', 'pallino mano', '✥');
    else segno = tondino(mondo, id);
    b.append(segno, el('span', 'nome', nome));
    b.addEventListener('click', () => scegli(id));
    return b;
  }

  /** Ridisegna la tavolozza; i granelli appena arrivati (`nuovi`) si fanno notare. */
  function ridisegnaTavolozza(nuovi: readonly number[] = []): void {
    p.tavolozza.innerHTML = '';
    p.tavolozza.append(granello(MANO, 'Mano'), granello(GOMMA, 'Gomma'));
    ricordi.recenti = ricordi.recenti.filter((id) => mondo.visti.has(id) && versabile(id));
    if (ricordi.recenti.length === 0) ricordi.recenti = [...INIZIALI];
    for (const id of ricordi.recenti) {
      const b = granello(id, nomeDi(mondo, id));
      if (nuovi.includes(id)) b.classList.add('nuovo');
      p.tavolozza.append(b);
    }
    p.tavolozza.scrollLeft = 0;
    if (scelto >= 0 && !ricordi.recenti.includes(scelto)) scelto = ricordi.recenti[0];
    scegli(scelto);
    const miscele = quanteMiscele();
    p.bLibro.textContent = `Libro ${quanteVoci()}/${voci().length}${miscele ? ` +${miscele}` : ''}`;
    const eraDiOra = [...ere()].reverse().find((id) => mondo.visti.has(id));
    p.era.textContent = eraDiOra ? (voce(eraDiOra)?.nome ?? '') : 'Prima di tutto';
  }
  ridisegnaTavolozza();

  const daRicordare = (): Ricordi => ({ recenti: ricordi.recenti });
  const salvaTutto = (): void => salva(mondo, daRicordare());

  // ── Il dito ──────────────────────────────────────────────────────────────────
  interface Dito {
    x: number;
    y: number;
    px: number;
    py: number;
  }
  const dita = new Map<number, Dito>();

  function cella(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = p.quadro.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / scala + camX),
      y: Math.floor((e.clientY - r.top) / scala + camY),
    };
  }

  /** Chi sta trascinando la vista: con la Mano basta un dito, altrimenti ne servono due (o il tasto destro). */
  const prese = new Map<number, { x: number; y: number }>();
  let trascina: { x: number; y: number; camX: number; camY: number } | null = null;
  const centroPrese = (): { x: number; y: number } => {
    let x = 0;
    let y = 0;
    for (const q of prese.values()) {
      x += q.x;
      y += q.y;
    }
    return { x: x / prese.size, y: y / prese.size };
  };

  p.quadro.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    p.quadro.setPointerCapture(e.pointerId);
    p.suggerimento.classList.add('via');
    prese.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (scelto === MANO || e.button === 2 || prese.size >= 2) {
      // Due dita (o la Mano) spostano la vista: quello che si stava versando si ferma.
      dita.clear();
      const centro = centroPrese();
      trascina = { x: centro.x, y: centro.y, camX, camY };
      return;
    }
    const { x, y } = cella(e);
    if (scelto === OMINO) {
      mondo.aggiungiOmino(x, y);
      return;
    }
    if (scelto === M.FULMINE) {
      mondo.fulmine(Math.max(0, Math.min(mondo.w - 1, x)), 0);
      return;
    }
    if (ingombroDi(scelto)) {
      // Una costruzione si posa solo dove può stare: se no, una riga dice perché.
      const dove = mondo.puoPosare(scelto, x, y);
      if (!dove.si) diRiga(NON_SI_POSA[dove.perche]);
      else if (mondo.posa(scelto, x, y)) {
        // Posata: la spiegazione di un rifiuto di prima, se è ancora lì, non serve più.
        p.riga.classList.remove('su');
        salvaTutto();
      }
      return;
    }
    dita.set(e.pointerId, { x, y, px: x, py: y });
  });
  p.quadro.addEventListener('pointermove', (e) => {
    const presa = prese.get(e.pointerId);
    if (presa) {
      presa.x = e.clientX;
      presa.y = e.clientY;
    }
    if (trascina) {
      const centro = centroPrese();
      muoviVista(trascina.camX - (centro.x - trascina.x) / scala, trascina.camY - (centro.y - trascina.y) / scala);
      return;
    }
    const d = dita.get(e.pointerId);
    if (!d) return;
    const { x, y } = cella(e);
    d.x = x;
    d.y = y;
  });
  const alza = (e: PointerEvent): void => {
    dita.delete(e.pointerId);
    prese.delete(e.pointerId);
    if (prese.size === 0) trascina = null;
    else if (trascina) {
      const centro = centroPrese();
      trascina = { x: centro.x, y: centro.y, camX, camY };
    }
  };
  p.quadro.addEventListener('pointerup', alza);
  p.quadro.addEventListener('pointercancel', alza);
  p.quadro.addEventListener('contextmenu', (e) => e.preventDefault());
  p.quadro.addEventListener('wheel', (e) => {
    e.preventDefault();
    muoviVista(camX + (e.shiftKey ? e.deltaY : e.deltaX) / scala, camY + (e.shiftKey ? 0 : e.deltaY) / scala);
  }, { passive: false });

  /** Una riga breve in fondo al cielo: spiega una posa rifiutata o racconta un lutto, e dopo qualche secondo se ne va. */
  let viaLaRiga = 0;
  function diRiga(testo: string): void {
    if (!testo) return;
    p.riga.textContent = testo;
    p.riga.classList.add('su');
    clearTimeout(viaLaRiga);
    viaLaRiga = window.setTimeout(() => p.riga.classList.remove('su'), 4500);
  }
  /** Quando è stato annunciato l'ultimo lutto: se ne dice al più uno ogni tanto. */
  let ultimoLutto = -Infinity;

  let avvisatoPieno = false;
  /** Versa (o cancella) sotto ogni dito appoggiato, seguendo il tratto: anche un gesto veloce lascia una scia continua. */
  function versaDita(): void {
    if (dita.size === 0) return;
    const tipo = scelto > 0 ? mondo.tipoPer(scelto) : -1;
    for (const d of dita.values()) {
      const passi = Math.max(1, Math.ceil(Math.hypot(d.x - d.px, d.y - d.py) / Math.max(1, raggio)));
      for (let k = 1; k <= passi; k++) {
        const x = Math.round(d.px + ((d.x - d.px) * k) / passi);
        const y = Math.round(d.py + ((d.y - d.py) * k) / passi);
        if (scelto === GOMMA) mondo.cancella(x, y, raggio + 1);
        else if (tipo > 0) mondo.versa(x, y, raggio, tipo);
      }
      d.px = d.x;
      d.py = d.y;
    }
    if (mondo.pieno && !avvisatoPieno) {
      avvisatoPieno = true;
      const { scheda, chiudi } = messaggio('Troppe miscele insieme', [
        'In questo mondo ci sono già 192 miscele diverse, e non c’è posto per un’altra.',
        'Cancellane qualcuna con la Gomma: nel Libro restano tutte, e potrai versarle di nuovo quando vuoi.',
      ]);
      const b = el('button', 'tasto pieno', 'Ho capito');
      b.addEventListener('click', chiudi);
      scheda.append(b);
    }
    if (!mondo.pieno) avvisatoPieno = false;
  }

  // ── Scoperte: festa nel mondo, avviso, tavolozza ─────────────────────────────
  /** Come è nata una scoperta, in poche parole: per l'avviso che compare in alto. */
  function comeNasce(id: number): string {
    const ricetta = mondo.ricettario.get(id);
    if (ricetta) return `${nomeDi(mondo, ricetta.a)} + ${nomeDi(mondo, ricetta.b)}`;
    const via = voce(id)?.nasce[0];
    if (!via) return '';
    return via.con.map((ingrediente) => nomeDi(mondo, ingrediente)).join(' + ') + (via.nota ? `, ${via.nota}` : '');
  }

  /** Gli avvisi escono al massimo due alla volta: gli altri aspettano il loro turno. */
  const inCoda: number[] = [];
  function prossimoAvviso(): void {
    if (p.avvisi.childElementCount >= 2) return;
    const id = inCoda.shift();
    if (id === undefined) return;
    const a = el('button', 'avviso');
    const testi = el('span', 'avviso-testi');
    testi.append(
      el('span', 'avviso-sopra', eMiscela(id) ? 'Nuova miscela' : 'Nuova scoperta'),
      el('strong', '', nomeDi(mondo, id)),
      el('span', 'avviso-sotto', comeNasce(id)),
    );
    a.append(tondino(mondo, id, 'pallino grande'), testi);
    const togli = (): void => {
      if (!a.isConnected) return;
      a.remove();
      prossimoAvviso();
    };
    a.addEventListener('click', () => {
      togli();
      libro(id);
    });
    p.avvisi.append(a);
    const fretta = inCoda.length > 0;
    setTimeout(() => a.classList.add('via'), fretta ? 1800 : 3200);
    setTimeout(togli, fretta ? 2200 : 3700);
  }

  function leggiNovita(): void {
    for (const f of mondo.fatti) {
      if (f.cosa === 'nato') pittore.cuore(f.x, f.y);
      else {
        pittore.sbuffo(f.x, f.y);
        const frase = annuncioDiLutto(f.causa, performance.now(), ultimoLutto);
        if (frase) {
          ultimoLutto = performance.now();
          diRiga(frase);
        }
      }
    }
    mondo.fatti.length = 0;
    for (const a of mondo.annunci) diRiga(ANNUNCIO[a]);
    mondo.annunci.length = 0;
    for (const b of mondo.botti) pittore.botto(b.x, b.y, b.r);
    if (mondo.botti.length > 0) lampo();
    mondo.botti.length = 0;
    if (mondo.novita.length === 0) return;
    const nuove = mondo.novita.map((n) => n.id);
    for (const n of mondo.novita) {
      pittore.scoppio(n.x, n.y);
      inCoda.push(n.id);
      prossimoAvviso();
      if (versabile(n.id)) inTavolozza(n.id);
    }
    mondo.novita = [];
    navigator.vibrate?.(25);
    ridisegnaTavolozza(nuove);
    salvaTutto();
    if (quanteVoci() === voci().length || nuove.includes(VILLAGGIO)) setTimeout(festa, 1500);
  }

  // ── Finestre: libro e messaggi ───────────────────────────────────────────────
  function libro(voce?: number): void {
    apriLibro(
      app,
      {
        mondo,
        usa: (id) => {
          inTavolozza(id);
          scelto = id;
          ridisegnaTavolozza();
          salvaTutto();
        },
      },
      voce,
    );
  }

  function messaggio(titolo: string, righe: readonly string[]): { scheda: HTMLDivElement; chiudi: () => void } {
    const velo = el('div', 'velo');
    const scheda = el('div', 'scheda messaggio');
    velo.append(scheda);
    const chiudi = (): void => velo.remove();
    velo.addEventListener('click', (e) => {
      if (e.target === velo) chiudi();
    });
    scheda.append(el('h2', '', titolo), ...righe.map((r) => el('p', '', r)));
    app.append(velo);
    return { scheda, chiudi };
  }

  function festa(): void {
    const tutto = quanteVoci() === voci().length;
    const { scheda, chiudi } = messaggio(tutto ? 'Hai scoperto tutto!' : 'È nato un villaggio!', [
      tutto
        ? 'Tutte le voci del Libro sono tue. Restano le miscele: quelle non finiscono mai.'
        : 'Da quattro granelli a un paese abitato. Proteggili, oppure no: il mondo è tuo.',
    ]);
    const b = el('button', 'tasto pieno', 'Continua');
    b.addEventListener('click', chiudi);
    scheda.append(b);
  }

  function benvenuto(): void {
    const { scheda, chiudi } = messaggio('Granelli', [
      'Sotto il cielo c’è solo roccia nuda. Tu hai quattro elementi: terra, acqua, fuoco e aria.',
      'Versali col dito e falli incontrare: ogni cosa nuova entra nella tavolozza e nel Libro. Il mondo è grande: con la Mano (o con due dita) sposti la vista.',
      'Con Unisci metti insieme due scoperte e ne nasce una terza: attrezzi, case, e via via le ere della storia.',
      'Se ti blocchi, apri il Libro: ci sono gli indizi.',
    ]);
    const b = el('button', 'tasto pieno', 'Inizia');
    b.addEventListener('click', chiudi);
    scheda.append(b);
  }

  function chiediNuovo(): void {
    const { scheda, chiudi } = messaggio('Ricominciare?', [
      'Puoi svuotare solo il mondo e tenere il Libro con tutte le scoperte, oppure ripartire dai quattro elementi.',
    ]);
    const riparti = (daZero: boolean): void => {
      const vecchio = mondo;
      mondo = mondoNuovo();
      if (daZero) ricordi.recenti = [...INIZIALI];
      else {
        for (const id of vecchio.visti) mondo.visti.add(id);
        for (const [id, ricetta] of vecchio.ricettario) mondo.ricettario.set(id, ricetta);
        // Il Libro resta, e con lui le coppie già provate: Unisci deve continuare a dire «Già fatta» e «Già provata».
        for (const coppia of vecchio.provate) mondo.provate.add(coppia);
      }
      pittore = nuovoPittore();
      dita.clear();
      inCoda.length = 0;
      centrata = false;
      adatta();
      ridisegnaTavolozza();
      salvaTutto();
      chiudi();
    };
    const fila = el('div', 'fila');
    for (const [testo, classe, azione] of [
      ['Svuota il mondo', 'tasto pieno', () => riparti(false)],
      ['Riparti da zero', 'tasto', () => riparti(true)],
      ['Annulla', 'tasto', chiudi],
    ] as const) {
      const b = el('button', classe, testo);
      b.addEventListener('click', azione);
      fila.append(b);
    }
    scheda.append(fila);
  }

  function pausa(): void {
    inPausa = !inPausa;
    p.bPausa.textContent = inPausa ? 'Riprendi' : 'Pausa';
    p.bPausa.classList.toggle('attivo', inPausa);
  }

  p.bLibro.addEventListener('click', () => libro());
  // Gli omini chiamati da Unisci arrivano, se possono, vicino a dove sta guardando chi gioca.
  p.bUnisci.addEventListener('click', () => apriUnisci(app, mondo, () => camX + vistaW / 2));
  p.bNuovo.addEventListener('click', chiediNuovo);
  p.bPausa.addEventListener('click', pausa);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') app.querySelector('.velo:last-of-type')?.remove();
    else if (e.key === ' ' && !app.querySelector('.velo') && !(e.target instanceof HTMLButtonElement)) pausa();
  });

  // ── Il tempo ─────────────────────────────────────────────────────────────────
  let prima = performance.now();
  let arretrato = 0;
  function fotogramma(ora: number): void {
    // Su un dispositivo lento il mondo rallenta un poco, ma il dito resta sempre pronto: mai più di due istanti per fotogramma.
    const passato = ora - prima;
    arretrato = Math.min(arretrato + passato, ISTANTE * 2);
    prima = ora;
    versaDita();
    while (arretrato >= ISTANTE) {
      arretrato -= ISTANTE;
      if (!inPausa) mondo.passo();
    }
    leggiNovita();
    pittore.disegna(Math.min(0.05, passato / 1000), camX, camY);
    requestAnimationFrame(fotogramma);
  }
  requestAnimationFrame(fotogramma);

  setInterval(salvaTutto, 10000);
  addEventListener('pagehide', salvaTutto);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) salvaTutto();
    else prima = performance.now();
  });

  if (salvato) p.suggerimento.classList.add('via');
  else benvenuto();
  if (avevaIlMestolo) {
    const { scheda, chiudi } = messaggio('Una novità', [ADDIO_MESTOLO]);
    const b = el('button', 'tasto pieno', 'Ho capito');
    b.addEventListener('click', chiudi);
    scheda.append(b);
    // Da qui la partita si ricorda senza il Mestolo: il saluto non torna alla prossima apertura.
    salvaTutto();
  }

  // Per le prove automatiche: permette di guardare dentro il mondo dalla console.
  (window as unknown as { granelli: () => Mondo }).granelli = () => mondo;

  return { fotografa: () => fotografa(mondo, daRicordare()) };
}
