import { campione } from './disegno/colori.js';
import { Pittore } from './disegno/pittore.js';
import { M, OMINO, VILLAGGIO } from './motore/materiali.js';
import { Mondo } from './motore/mondo.js';
import { terreno } from './motore/terreno.js';
import { costruisciPagina, el } from './pagina.js';
import { carica, fotografa, ripristina, salva } from './salvataggio.js';
import { INIZIALI, PER_ID, SCOPERTE, type Scoperta } from './scoperte.js';

const GOMMA = -1;
const ISTANTE = 1000 / 60;
/** Quante celle ha, più o meno, un mondo nuovo: abbastanza fini da sembrare sabbia, abbastanza poche per un telefono. */
const CELLE = 30000;

/**
 * Costruisce la pagina e fa partire il gioco. `ripresa` è la fotografia di una partita interrotta, se c'è:
 * altrimenti si riprende quella salvata nel browser, e se non c'è nemmeno quella si comincia da capo.
 */
export function avvia(app: HTMLElement, ripresa: unknown): { fotografa: () => unknown } {
  const p = costruisciPagina(app);

  const salvato = ripristina(ripresa) ?? carica();
  /**
   * Le scoperte del giocatore. All'avvio servono prima ancora del mondo: la tavolozza dà alla pagina la sua forma
   * definitiva, e il mondo nuovo prende la forma dello spazio che resta.
   */
  let visti: ReadonlySet<number> = salvato ? salvato.visti : new Set(INIZIALI);
  let scelto: number = M.TERRA;
  let raggio = 3;
  let inPausa = false;

  // ── Tavolozza e pennelli ─────────────────────────────────────────────────────
  function scoperte(): Scoperta[] {
    return SCOPERTE.filter((s) => visti.has(s.id));
  }

  function scegli(id: number): void {
    scelto = id;
    for (const b of p.tavolozza.querySelectorAll<HTMLButtonElement>('.granello')) {
      b.classList.toggle('attivo', b.dataset.id === String(id));
    }
  }

  /** Il tondino con la grana del materiale, uguale a come appare nel mondo. */
  function pallino(id: number, classe = 'pallino'): HTMLSpanElement {
    const e = el('span', classe);
    e.style.backgroundImage = id === GOMMA ? 'repeating-linear-gradient(45deg,#fff 0 3px,#f48 3px 6px)' : `url(${campione(id)})`;
    return e;
  }

  function granello(id: number, nome: string): HTMLButtonElement {
    const b = el('button', 'granello');
    b.dataset.id = String(id);
    b.append(pallino(id), el('span', 'nome', nome));
    b.addEventListener('click', () => scegli(id));
    return b;
  }

  /** Ridisegna la tavolozza; i granelli appena scoperti (`nuovi`) si fanno notare e vengono portati in vista. */
  function ridisegnaTavolozza(nuovi: readonly number[] = []): void {
    const scorrimento = p.tavolozza.scrollLeft;
    p.tavolozza.innerHTML = '';
    p.tavolozza.append(granello(GOMMA, 'Gomma'));
    let daMostrare: HTMLButtonElement | null = null;
    for (const s of scoperte()) {
      if (!s.versabile) continue;
      const b = granello(s.id, s.nome);
      if (nuovi.includes(s.id)) {
        b.classList.add('nuovo');
        daMostrare = b;
      }
      p.tavolozza.append(b);
    }
    p.tavolozza.scrollLeft = scorrimento;
    if (daMostrare) {
      // Scorre solo la tavolozza (mai la pagina che ospita il gioco) quanto basta per mostrare il granello nuovo.
      const g = daMostrare.getBoundingClientRect();
      const t = p.tavolozza.getBoundingClientRect();
      const sposta = g.left < t.left ? g.left - t.left - 8 : g.right > t.right ? g.right - t.right + 8 : 0;
      if (sposta !== 0) p.tavolozza.scrollBy({ left: sposta, behavior: 'smooth' });
    }
    if (scelto !== GOMMA && !visti.has(scelto)) scelto = M.TERRA;
    scegli(scelto);
    p.bLibro.textContent = `Libro ${scoperte().length}/${SCOPERTE.length}`;
  }

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
  ridisegnaTavolozza();

  // ── Il mondo ─────────────────────────────────────────────────────────────────
  /** Un mondo di sola roccia, con la forma dello spazio libero sullo schermo e le scoperte già fatte. */
  function mondoNuovo(giaScoperti: Iterable<number>): Mondo {
    const r = p.cielo.getBoundingClientRect();
    const forma = Math.max(0.4, Math.min(2.5, r.width / Math.max(1, r.height)));
    const w = Math.round(Math.sqrt(CELLE * forma));
    const m = new Mondo(w, Math.round(w / forma), (Date.now() & 0x7fffffff) || 1);
    for (const id of giaScoperti) m.visti.add(id);
    terreno(m);
    return m;
  }

  let mondo = salvato ?? mondoNuovo(visti);
  visti = mondo.visti;
  /** Un fulmine illumina tutto per un istante e fa tremare il mondo. */
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

  /** Fa stare il mondo intero nello spazio libero, senza deformarlo. */
  function adatta(): void {
    const r = p.cielo.getBoundingClientRect();
    const scala = Math.min(r.width / mondo.w, r.height / mondo.h);
    const larghezza = Math.floor(mondo.w * scala);
    const altezza = Math.floor(mondo.h * scala);
    p.quadro.style.width = `${larghezza}px`;
    p.quadro.style.height = `${altezza}px`;
    pittore.adatta(larghezza, altezza);
  }
  new ResizeObserver(adatta).observe(p.cielo);
  adatta();

  // ── Il dito ──────────────────────────────────────────────────────────────────
  interface Dito {
    x: number;
    y: number;
    px: number;
    py: number;
  }
  const dita = new Map<number, Dito>();

  function cella(e: PointerEvent): { x: number; y: number } {
    const r = p.quadro.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * mondo.w),
      y: Math.floor(((e.clientY - r.top) / r.height) * mondo.h),
    };
  }

  p.quadro.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    p.quadro.setPointerCapture(e.pointerId);
    p.suggerimento.classList.add('via');
    const { x, y } = cella(e);
    if (scelto === OMINO) {
      mondo.aggiungiOmino(x, y);
      return;
    }
    if (scelto === M.FULMINE) {
      mondo.fulmine(Math.max(0, Math.min(mondo.w - 1, x)), 0);
      return;
    }
    dita.set(e.pointerId, { x, y, px: x, py: y });
  });
  p.quadro.addEventListener('pointermove', (e) => {
    const d = dita.get(e.pointerId);
    if (!d) return;
    const { x, y } = cella(e);
    d.x = x;
    d.y = y;
  });
  const alza = (e: PointerEvent): void => {
    dita.delete(e.pointerId);
  };
  p.quadro.addEventListener('pointerup', alza);
  p.quadro.addEventListener('pointercancel', alza);
  p.quadro.addEventListener('contextmenu', (e) => e.preventDefault());

  /** Versa sotto ogni dito appoggiato, seguendo il tratto: anche un gesto veloce lascia una scia continua. */
  function versaDita(): void {
    for (const d of dita.values()) {
      const passi = Math.max(1, Math.ceil(Math.hypot(d.x - d.px, d.y - d.py) / Math.max(1, raggio)));
      for (let k = 1; k <= passi; k++) {
        const x = Math.round(d.px + ((d.x - d.px) * k) / passi);
        const y = Math.round(d.py + ((d.y - d.py) * k) / passi);
        if (scelto === GOMMA) mondo.cancella(x, y, raggio + 1);
        else mondo.versa(x, y, raggio, scelto);
      }
      d.px = d.x;
      d.py = d.y;
    }
  }

  // ── Scoperte: scintilla, avviso, libro ───────────────────────────────────────
  /** Gli avvisi escono al massimo due alla volta: gli altri aspettano il loro turno. */
  const inCoda: Scoperta[] = [];
  function prossimoAvviso(): void {
    if (p.avvisi.childElementCount >= 2) return;
    const s = inCoda.shift();
    if (!s) return;
    const a = el('button', 'avviso');
    const testi = el('span', 'avviso-testi');
    testi.append(el('span', 'avviso-sopra', 'Nuova scoperta'), el('strong', '', s.nome), el('span', 'avviso-sotto', s.ricetta));
    a.append(pallino(s.id, 'pallino grande'), testi);
    const togli = (): void => {
      if (!a.isConnected) return;
      a.remove();
      prossimoAvviso();
    };
    a.addEventListener('click', () => {
      togli();
      apriLibro();
    });
    p.avvisi.append(a);
    const fretta = inCoda.length > 0;
    setTimeout(() => a.classList.add('via'), fretta ? 1800 : 3200);
    setTimeout(togli, fretta ? 2200 : 3700);
  }

  function leggiNovita(): void {
    for (const c of mondo.caduti) pittore.sbuffo(c.x, c.y);
    mondo.caduti.length = 0;
    for (const n of mondo.nati) pittore.cuore(n.x, n.y);
    mondo.nati.length = 0;
    if (mondo.novita.length === 0) return;
    const nuove = mondo.novita;
    mondo.novita = [];
    for (const n of nuove) {
      const s = PER_ID.get(n.id);
      if (!s) continue;
      pittore.scoppio(n.x, n.y);
      inCoda.push(s);
      prossimoAvviso();
    }
    navigator.vibrate?.(25);
    ridisegnaTavolozza(nuove.map((n) => n.id));
    salva(mondo);
    if (scoperte().length === SCOPERTE.length || nuove.some((n) => n.id === VILLAGGIO)) setTimeout(festa, 1500);
  }

  // ── Finestre: libro e messaggi ───────────────────────────────────────────────
  function finestra(classe: string): { scheda: HTMLDivElement; chiudi: () => void } {
    const velo = el('div', 'velo');
    const scheda = el('div', `scheda ${classe}`);
    velo.append(scheda);
    const chiudi = (): void => velo.remove();
    velo.addEventListener('click', (e) => {
      if (e.target === velo) chiudi();
    });
    app.append(velo);
    return { scheda, chiudi };
  }

  function apriLibro(): void {
    const { scheda, chiudi } = finestra('libro');
    const testa = el('div', 'scheda-testa');
    const x = el('button', 'tasto', 'Chiudi');
    x.addEventListener('click', chiudi);
    testa.append(el('h2', '', `Libro delle scoperte · ${scoperte().length}/${SCOPERTE.length}`), x);
    const pagine = el('div', 'pagine');
    for (const s of SCOPERTE) {
      const trovata = visti.has(s.id);
      const voce = el('div', trovata ? 'voce' : 'voce ignota');
      const testi = el('div', 'voce-testi');
      testi.append(el('strong', '', trovata ? s.nome : '???'), el('span', '', trovata ? s.ricetta : s.indizio));
      voce.append(trovata ? pallino(s.id, 'pallino grande') : el('span', 'pallino grande', '?'), testi);
      pagine.append(voce);
    }
    scheda.append(testa, pagine);
  }

  function messaggio(titolo: string, righe: readonly string[]): { scheda: HTMLDivElement; chiudi: () => void } {
    const f = finestra('messaggio');
    f.scheda.append(el('h2', '', titolo), ...righe.map((r) => el('p', '', r)));
    return f;
  }

  function festa(): void {
    const tutto = scoperte().length === SCOPERTE.length;
    const { scheda, chiudi } = messaggio(tutto ? 'Hai scoperto tutto!' : 'È nato un villaggio!', [
      tutto
        ? 'Da quattro granelli a un mondo intero. Adesso è tuo: fanne quello che vuoi.'
        : 'Da quattro granelli a un paese abitato. Proteggili, oppure no: il mondo è tuo.',
    ]);
    const b = el('button', 'tasto pieno', 'Continua');
    b.addEventListener('click', chiudi);
    scheda.append(b);
  }

  function benvenuto(): void {
    const { scheda, chiudi } = messaggio('Granelli', [
      'Sotto il cielo c’è solo roccia nuda. Tu hai quattro elementi: terra, acqua, fuoco e aria.',
      'Versali col dito e falli incontrare. Ogni cosa nuova che nasce entra nella tua tavolozza.',
      'Se ti blocchi, apri il Libro: ci sono gli indizi.',
    ]);
    const b = el('button', 'tasto pieno', 'Inizia');
    b.addEventListener('click', chiudi);
    scheda.append(b);
  }

  function chiediNuovo(): void {
    const { scheda, chiudi } = messaggio('Ricominciare?', [
      'Puoi svuotare solo il mondo e tenere le scoperte, oppure ripartire dai quattro elementi.',
    ]);
    const riparti = (daZero: boolean): void => {
      mondo = mondoNuovo(daZero ? INIZIALI : visti);
      visti = mondo.visti;
      pittore = nuovoPittore();
      dita.clear();
      inCoda.length = 0;
      adatta();
      ridisegnaTavolozza();
      salva(mondo);
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

  p.bLibro.addEventListener('click', apriLibro);
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
    pittore.disegna(Math.min(0.05, passato / 1000));
    requestAnimationFrame(fotogramma);
  }
  requestAnimationFrame(fotogramma);

  setInterval(() => salva(mondo), 10000);
  addEventListener('pagehide', () => salva(mondo));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) salva(mondo);
    else prima = performance.now();
  });

  if (salvato) p.suggerimento.classList.add('via');
  else benvenuto();

  // Per le prove automatiche: permette di guardare dentro il mondo dalla console.
  (window as unknown as { granelli: () => Mondo }).granelli = () => mondo;

  return { fotografa: () => fotografa(mondo) };
}
