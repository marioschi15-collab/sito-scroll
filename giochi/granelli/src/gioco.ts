import { INIZIALI, eCostruzione, eVoce, ere, tipoDi, voce, voci, vociTrovate } from './contenuti/registro.js';
import { Custode } from './custode.js';
import { apriDeposito } from './deposito.js';
import { Pittore } from './disegno/pittore.js';
import { festaDovuta } from './feste.js';
import { type Finestra, Finestre } from './finestre.js';
import { INDIZIO, type Indizio, Suggeritore, rigaDelNiente } from './indizi.js';
import { apriLibro, nomeDi, tondino } from './libro.js';
import { M, OMINO, PRIMA_ID_MISCELA, VILLAGGIO } from './motore/materiali.js';
import { accade } from './motore/eventi.js';
import { Mondo } from './motore/mondo.js';
import type { EsitoPorta } from './motore/porta.js';
import { type Quadro, quadro } from './motore/suggerimenti.js';
import { SUPERFICIE, terreno } from './motore/terreno.js';
import { apriUnisci } from './unisci.js';
import { costruisciPagina, el, segnaResa, vibra } from './pagina.js';
import {
  ADDIO_MESTOLO,
  ANNUNCIO,
  ARRIVA,
  UNISCI,
  NON_QUI,
  NON_SALVATA,
  NON_SALVATA_BENVENUTO,
  NON_SI_POSA,
  RICOMINCIA,
  annuncioDiLutto,
  perderai,
} from './righe.js';
import { type Ricordi, leggiRicordi } from './ricordi.js';
import { carica, extraDi, fotografa, riprendi, salva, tieniDaParte } from './salvataggio.js';

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
/** Per quanto tempo, dopo «Nuovo», si può ancora tornare indietro (in millesimi di secondo). */
const RIPENSAMENTO = 10000;

/** Un mondo di sola roccia. */
function mondoNuovo(): Mondo {
  const m = new Mondo(LARGO, ALTO, (Date.now() & 0x7fffffff) || 1);
  for (const id of INIZIALI) m.visti.add(id);
  terreno(m);
  return m;
}

/**
 * Costruisce la pagina e fa partire il gioco. `ripresa` è la fotografia di una partita interrotta, se c'è:
 * altrimenti si riprende quella salvata nel browser, e se non c'è nemmeno quella si comincia da capo.
 */
export function avvia(app: HTMLElement, ripresa: unknown): { fotografa: () => unknown } {
  const p = costruisciPagina(app);
  // Dove si salva: se il browser non lo permette, si gioca lo stesso e la pagina lo dice.
  const deposito = apriDeposito();

  let foto = ripresa;
  let salvato = riprendi(foto, mondoNuovo)?.mondo ?? null;
  if (!salvato) {
    const trovata = carica(deposito, mondoNuovo);
    foto = trovata.dati;
    salvato = trovata.ripresa?.mondo ?? null;
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

  function granello(id: number, nome: string, q?: Quadro): HTMLButtonElement {
    const b = el('button', 'granello');
    b.dataset.id = String(id);
    let segno: HTMLSpanElement;
    if (id === GOMMA) {
      segno = el('span', 'pallino');
      segno.style.backgroundImage = 'repeating-linear-gradient(45deg,#fff 0 3px,#f48 3px 6px)';
    } else if (id === MANO) segno = el('span', 'pallino mano', '✥');
    else segno = tondino(mondo, id);
    b.append(segno, el('span', 'nome', nome));
    if (q) segnaResa(b, q, id);
    b.addEventListener('click', () => scegli(id));
    return b;
  }

  /** Ridisegna la tavolozza; i granelli appena arrivati (`nuovi`) si fanno notare. */
  function ridisegnaTavolozza(nuovi: readonly number[] = []): void {
    p.tavolozza.innerHTML = '';
    p.tavolozza.append(granello(MANO, 'Mano'), granello(GOMMA, 'Gomma'));
    ricordi.recenti = ricordi.recenti.filter((id) => mondo.visti.has(id) && versabile(id));
    if (ricordi.recenti.length === 0) ricordi.recenti = [...INIZIALI];
    // Il puntino sui gettoni che hanno ancora qualcosa da dare: si ricalcola solo quando cambiano le scoperte.
    const q = quadro(mondo.visti);
    for (const id of ricordi.recenti) {
      const b = granello(id, nomeDi(mondo, id), q);
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
  /** Dove il browser non lascia salvare (o lo spazio è finito), il segno fisso lo ricorda. */
  function segnaSalvabile(): void {
    p.nonSalvata.hidden = deposito.salvabile;
  }
  p.nonSalvata.textContent = NON_SALVATA;
  segnaSalvabile();
  // Chi vuole salvare lo chiede al custode, che scrive al più una volta ogni due secondi e mai durante un gesto.
  const custode = new Custode({
    ora: () => performance.now(),
    richiama: (fai, ms) => window.setTimeout(fai, ms),
    scrivi: () => {
      salva(deposito, mondo, daRicordare());
      segnaSalvabile();
    },
  });
  const salvaTutto = (): void => custode.chiedi();

  // ── Finestre: una alla volta, e i messaggi aspettano il loro turno ─────────────
  const finestre = new Finestre(app, () => fineDeiGesti());

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

  /** Un dito comincia o finisce un gesto sul mondo: finché dura, niente finestre nuove e niente salvataggi. */
  function gesto(inCorso: boolean): void {
    finestre.gesto(inCorso);
    custode.gesto(inCorso);
  }
  /** Tutte le dita si considerano alzate: prima che si apra una finestra, che rende il mondo intoccabile. */
  function fineDeiGesti(): void {
    if (prese.size === 0) return;
    prese.clear();
    dita.clear();
    trascina = null;
    gesto(false);
  }

  p.quadro.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    p.quadro.setPointerCapture(e.pointerId);
    p.suggerimento.classList.add('via');
    if (prese.size === 0) gesto(true);
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
    const tipo = tipoDi(scelto);
    if (tipo === 'oggetto' || tipo === 'creatura' || tipo === 'mestiere' || tipo === 'idea' || tipo === 'evento') {
      // Un tocco porta la cosa lì: un oggetto si appoggia (o lo prende l'omino toccato), una creatura nasce, un
      // mestiere o un'idea vanno a chi li riceve, un evento accade. Se lì non si può, una riga dice perché.
      const esito = mondo.porta(scelto, x, y, 'gettone');
      if (esito.genere === 'nonQui') diRiga(NON_QUI[esito.perche]);
      else if (esito.genere !== 'niente') {
        p.riga.classList.remove('su');
        salvaTutto();
      }
      raccontaPorta(scelto, esito);
      return;
    }
    if (eCostruzione(scelto)) {
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
    if (!prese.delete(e.pointerId)) return;
    if (prese.size === 0) {
      trascina = null;
      gesto(false);
    } else if (trascina) {
      const centro = centroPrese();
      trascina = { x: centro.x, y: centro.y, camX, camY };
    }
  };
  p.quadro.addEventListener('pointerup', alza);
  p.quadro.addEventListener('pointercancel', alza);
  p.quadro.addEventListener('lostpointercapture', alza);
  p.quadro.addEventListener('contextmenu', (e) => e.preventDefault());
  p.quadro.addEventListener('wheel', (e) => {
    e.preventDefault();
    muoviVista(camX + (e.shiftKey ? e.deltaY : e.deltaX) / scala, camY + (e.shiftKey ? 0 : e.deltaY) / scala);
  }, { passive: false });

  /** Una riga breve in fondo al cielo: spiega una posa rifiutata o racconta un lutto, e dopo qualche secondo se ne va. */
  let viaLaRiga = 0;
  function diRiga(testo: string, ms = 4500, indizio = false): void {
    if (!testo) return;
    p.riga.textContent = testo;
    p.riga.classList.add('su');
    p.riga.classList.toggle('indizio', indizio);
    clearTimeout(viaLaRiga);
    viaLaRiga = window.setTimeout(() => p.riga.classList.remove('su'), ms);
  }
  // ── Indizi: il tasto, e quello che arriva da solo dopo tre «niente» di fila ───
  const suggeritore = new Suggeritore();
  /** Un indizio sul mondo: nella riga in fondo al cielo, un po' più a lungo delle altre righe. */
  function mostraIndizio(indizio: Indizio, attendi = 0): void {
    diRiga(`${INDIZIO.tasto}: ${indizio.testo}${attendi > 0 ? ` ${INDIZIO.attendi(attendi)}` : ''}`, 9000, true);
  }
  p.bIndizio.addEventListener('click', () => {
    const { indizio, attendi } = suggeritore.chiedi(mondo.visti, performance.now());
    mostraIndizio(indizio, attendi);
  });
  /** Quando arriva l'indizio dopo un «niente»: lascia leggere prima la riga del «niente». */
  let indizioInArrivo = 0;
  /**
   * Racconta il tentativo di unire una cosa portata nel mondo: un «niente» non è mai muto (una riga gentile, ogni
   * volta diversa), e al terzo di fila arriva un indizio. Ciò che non era un tentativo di unire (posare, versare,
   * un posto che non va) non conta.
   */
  function raccontaPorta(portata: number, esito: EsitoPorta): void {
    if (esito.genere === 'messa' || esito.genere === 'nonQui' || esito.genere === 'torna') return;
    const con = esito.genere === 'dato' ? esito.a : esito.con;
    const niente = esito.genere === 'niente';
    if (niente) diRiga(esito.perOra ? UNISCI.perOra : `${nomeDi(mondo, portata)} e ${nomeDi(mondo, con)}: ${rigaDelNiente(suggeritore.nienteInTutto)}`);
    const indizio = suggeritore.dopo(portata, con, niente, mondo.visti, performance.now());
    clearTimeout(indizioInArrivo);
    if (indizio) indizioInArrivo = window.setTimeout(() => mostraIndizio(indizio), 2600);
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
      messaggio(
        'Troppe miscele insieme',
        [
          'In questo mondo ci sono già 192 miscele diverse, e non c’è posto per un’altra.',
          'Cancellane qualcuna con la Gomma: nel Libro restano tutte, e potrai versarle di nuovo quando vuoi.',
        ],
        'Ho capito',
        { chiave: 'pieno' },
      );
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
    for (const s of mondo.sparite) pittore.sbuffo(s.x, s.y);
    mondo.sparite.length = 0;
    // Finché dura una scossa portata nel mondo, la vista trema.
    const trema = accade(mondo, 'scossa');
    if (trema !== p.quadro.classList.contains('trema')) p.quadro.classList.toggle('trema', trema);
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
      if (tipoDi(n.id) === 'era') annunciaEra(n.id);
    }
    mondo.novita = [];
    vibra(25);
    ridisegnaTavolozza(nuove);
    salvaTutto();
    // Il Libro completo si festeggia una volta sola: quando arriva l'ultima voce, non a ogni miscela dopo.
    const quale = festaDovuta(nuove, quanteVoci(), voci().length, eVoce, VILLAGGIO);
    if (quale) setTimeout(() => festa(quale === 'tutto'), 1500);
  }

  // ── Finestre: libro, messaggi, «Nuovo» ──────────────────────────────────────
  function libro(voce?: number): void {
    apriLibro(
      finestre,
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

  /** Riempie la scheda di un messaggio: un titolo (con sopra, se c'è, una parola piccola), le righe, un tasto. */
  function scriviMessaggio(f: Finestra, titolo: string, righe: readonly string[], tasto: string, sopra?: HTMLElement): void {
    if (sopra) f.scheda.append(sopra);
    f.scheda.append(el('h2', '', titolo), ...righe.map((r) => el('p', '', r)));
    const b = el('button', 'tasto pieno', tasto);
    b.addEventListener('click', f.chiudi);
    f.scheda.append(b);
  }

  /** Un messaggio del gioco: aspetta in fila che si chiuda la finestra aperta e che il dito finisca il suo gesto. */
  function messaggio(titolo: string, righe: readonly string[], tasto: string, opzioni: { chiave?: string; sopra?: () => HTMLElement } = {}): void {
    finestre.aspetta({ classe: 'messaggio', riempi: (f) => scriviMessaggio(f, titolo, righe, tasto, opzioni.sopra?.()) }, opzioni.chiave);
  }

  /** Arriva un'era (o un grande passo della storia): si festeggia con il suo stendardo e due righe. */
  function annunciaEra(id: number): void {
    const v = voce(id);
    if (!v) return;
    const sopra = (): HTMLElement => {
      const testa = el('div', 'messaggio-era');
      testa.append(tondino(mondo, id, 'pallino enorme'), el('span', 'avviso-sopra', ere().includes(id) ? ARRIVA.era : ARRIVA.passo));
      return testa;
    };
    messaggio(v.nome, [v.descrizione], 'Avanti', { chiave: `era-${id}`, sopra });
  }

  function festa(tutto: boolean): void {
    messaggio(
      tutto ? 'Hai scoperto tutto!' : 'È nato un villaggio!',
      [
        tutto
          ? 'Tutte le voci del Libro sono tue. Restano le miscele: quelle non finiscono mai.'
          : 'Da quattro granelli a un paese abitato. Proteggili, oppure no: il mondo è tuo.',
      ],
      'Continua',
      { chiave: tutto ? 'tutto' : 'villaggio' },
    );
  }

  function benvenuto(): void {
    const righe = [
      'Sotto il cielo c’è solo roccia nuda. Tu hai quattro elementi: terra, acqua, fuoco e aria.',
      'Versali col dito e falli incontrare: ogni cosa nuova entra nella tavolozza e nel Libro. Il mondo è grande: con la Mano (o con due dita) sposti la vista.',
      'Con Unisci metti insieme due scoperte e ne nasce una terza: attrezzi, case, e via via le ere della storia.',
      'Se ti blocchi, tocca Indizio: ti dice cosa provare, senza svelarti tutto.',
    ];
    if (!deposito.salvabile) righe.push(NON_SALVATA_BENVENUTO);
    messaggio('Granelli', righe, 'Inizia');
  }

  /** La finestra di «Nuovo»: svuotare il mondo (il tasto grande) o, più in basso e con una seconda domanda, ripartire da zero. */
  function chiediNuovo(): void {
    finestre.apri({
      classe: 'messaggio',
      riempi: ({ scheda, chiudi }) => {
        scheda.append(el('h2', '', RICOMINCIA.titolo), el('p', '', RICOMINCIA.spiega));
        const fila = el('div', 'fila');
        const svuota = el('button', 'tasto pieno', RICOMINCIA.svuota);
        svuota.addEventListener('click', () => {
          chiudi();
          riparti(false);
        });
        const annulla = el('button', 'tasto', RICOMINCIA.annulla);
        annulla.addEventListener('click', chiudi);
        fila.append(svuota, annulla);
        // «Riparti da zero» sta in fondo, piccolo e lontano dal tasto grande: un tocco sbagliato non cancella il Libro.
        const daZero = el('button', 'tasto discreto', RICOMINCIA.daZero);
        daZero.addEventListener('click', () => {
          chiudi();
          chiediDaZero();
        });
        scheda.append(fila, daZero);
      },
    });
  }

  /** La seconda domanda, prima di perdere il Libro: quanto si perde, e il tasto sicuro per primo. */
  function chiediDaZero(): void {
    finestre.apri({
      classe: 'messaggio',
      riempi: ({ scheda, chiudi }) => {
        scheda.append(el('h2', '', RICOMINCIA.sicuro), el('p', '', perderai(quanteVoci() - INIZIALI.length, quanteMiscele())));
        const tieni = el('button', 'tasto pieno', RICOMINCIA.tieni);
        tieni.addEventListener('click', chiudi);
        const si = el('button', 'tasto pericolo', RICOMINCIA.si);
        si.addEventListener('click', () => {
          chiudi();
          riparti(true);
        });
        const fila = el('div', 'fila fila-larga');
        fila.append(tieni, si);
        scheda.append(fila);
      },
    });
  }

  /** Mette in gioco un mondo (nuovo, o quello di prima dopo un ripensamento) con la sua tavolozza e la sua vista. */
  function metti(nuovo: Mondo, recenti: number[], vista?: { x: number; y: number }): void {
    mondo = nuovo;
    ricordi.recenti = recenti;
    pittore = nuovoPittore();
    fineDeiGesti();
    dita.clear();
    // Gli avvisi e la riga parlavano del mondo di prima: dopo «Riparti da zero» un avviso «Nuova scoperta» rimasto lì
    // aprirebbe nel Libro una voce che non c'è più, e la riga starebbe sotto quella con «Annulla».
    inCoda.length = 0;
    p.avvisi.replaceChildren();
    p.riga.classList.remove('su');
    centrata = vista !== undefined;
    adatta();
    if (vista) muoviVista(vista.x, vista.y);
    ridisegnaTavolozza();
    salvaTutto();
  }

  /** Svuota il mondo (e se `daZero` anche il Libro). Prima tiene da parte la partita, e per un po' si può tornare indietro. */
  function riparti(daZero: boolean): void {
    const vecchio = { mondo, recenti: [...ricordi.recenti], vista: { x: camX, y: camY } };
    tieniDaParte(deposito, mondo, daRicordare());
    const nuovo = mondoNuovo();
    if (!daZero) {
      for (const id of mondo.visti) nuovo.visti.add(id);
      for (const [id, ricetta] of mondo.ricettario) nuovo.ricettario.set(id, ricetta);
      // Il Libro resta, e con lui le coppie già provate: Unisci deve continuare a dire «Già fatta» e «Già provata».
      for (const coppia of mondo.provate) nuovo.provate.add(coppia);
    } else finestre.svuota();
    metti(nuovo, daZero ? [...INIZIALI] : vecchio.recenti);
    ripensaci(daZero ? RICOMINCIA.ripartito : RICOMINCIA.svuotato, () => metti(vecchio.mondo, vecchio.recenti, vecchio.vista));
  }

  /** Per qualche secondo, una riga con il tasto per tornare indietro. */
  let viaIlRipensamento = 0;
  function ripensaci(testo: string, indietro: () => void): void {
    clearTimeout(viaIlRipensamento);
    p.ripensa.innerHTML = '';
    const b = el('button', 'tasto pieno', RICOMINCIA.ripensaci);
    const togli = (): void => {
      clearTimeout(viaIlRipensamento);
      p.ripensa.hidden = true;
      p.ripensa.innerHTML = '';
    };
    b.addEventListener('click', () => {
      togli();
      indietro();
    });
    p.ripensa.append(el('span', '', testo), b);
    p.ripensa.hidden = false;
    viaIlRipensamento = window.setTimeout(togli, RIPENSAMENTO);
  }

  function pausa(): void {
    inPausa = !inPausa;
    p.bPausa.textContent = inPausa ? 'Riprendi' : 'Pausa';
    p.bPausa.classList.toggle('attivo', inPausa);
  }

  p.bLibro.addEventListener('click', () => libro());
  // Gli omini chiamati da Unisci arrivano, se possono, vicino a dove sta guardando chi gioca.
  p.bUnisci.addEventListener('click', () => apriUnisci(finestre, mondo, () => camX + vistaW / 2, suggeritore));
  p.bNuovo.addEventListener('click', chiediNuovo);
  p.bPausa.addEventListener('click', pausa);
  addEventListener('keydown', (e) => {
    if (e.key === ' ' && !finestre.aperta && !(e.target instanceof HTMLButtonElement)) pausa();
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
      // Con il Libro o un messaggio aperti il mondo si ferma: niente succede mentre chi gioca sta leggendo.
      if (!inPausa && !finestre.fermaIlMondo) mondo.passo();
    }
    leggiNovita();
    pittore.disegna(Math.min(0.05, passato / 1000), camX, camY);
    requestAnimationFrame(fotogramma);
  }
  requestAnimationFrame(fotogramma);

  // Il mondo cambia da solo: ogni dieci secondi va salvato; e subito, quando la pagina va in secondo piano o si chiude.
  setInterval(salvaTutto, 10000);
  addEventListener('pagehide', () => custode.subito());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) custode.subito();
    else prima = performance.now();
  });

  if (salvato) p.suggerimento.classList.add('via');
  else benvenuto();
  if (avevaIlMestolo) {
    messaggio('Una novità', [ADDIO_MESTOLO], 'Ho capito');
    // Da qui la partita si ricorda senza il Mestolo: il saluto non torna alla prossima apertura.
    salvaTutto();
  }

  // Per le prove automatiche: permette di guardare dentro il mondo dalla console.
  (window as unknown as { granelli: () => Mondo }).granelli = () => mondo;

  return { fotografa: () => fotografa(mondo, daRicordare()) };
}
