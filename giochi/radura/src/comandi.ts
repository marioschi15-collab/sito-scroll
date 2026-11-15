/**
 * Raccoglie quello che fa chi gioca (tastiera e mouse, oppure dita sullo schermo)
 * e lo traduce in poche voci semplici: dove andare, dove guardare, lanciare, saltare.
 */
export class Comandi {
  avanti = 0;
  lato = 0;
  corri = false;
  salta = false;
  lancia = false;
  /** Di quanto si è girato lo sguardo dall'ultimo fotogramma. */
  guardaX = 0;
  guardaY = 0;
  attivi = false;
  /**
   * Veri per un solo fotogramma dopo una pressione: così un tocco rapidissimo, iniziato e finito
   * tra un fotogramma e l'altro (capita quando il gioco rallenta), non va perso.
   */
  colpoSingolo = false;
  saltoSingolo = false;
  onScelta: (indice: number) => void = () => undefined;
  onScorri: (verso: number) => void = () => undefined;
  onRicostruisci: () => void = () => undefined;
  onPausa: () => void = () => undefined;
  onOfficina: () => void = () => undefined;
  /** Chiamata una volta, quando si scopre che il mouse non si può "catturare" e si guarda trascinando. */
  onTrascina: () => void = () => undefined;

  private readonly tasti = new Set<string>();
  private agganciato = false;
  /** Se il browser rifiuta di "catturare" il mouse, si guarda trascinando. */
  private trascina = false;
  /** Finché la cattura non è mai riuscita, un rifiuto è definitivo; dopo, è solo un momento sfortunato. */
  private maiAgganciato = true;
  private premuto = false;
  private mosso = 0;
  private levaId = -1;
  private levaX = 0;
  private levaY = 0;
  /** L'ultima posizione di ogni dito che sta girando lo sguardo: ognuno ha la sua, così due dita non si pestano i piedi. */
  private readonly sguardi = new Map<number, { x: number; y: number }>();

  constructor(
    private readonly tela: HTMLElement,
    private readonly leva: HTMLElement,
    private readonly pomello: HTMLElement,
  ) {
    window.addEventListener('keydown', (e) => this.tasto(e, true));
    window.addEventListener('keyup', (e) => this.tasto(e, false));
    window.addEventListener('blur', () => this.rilascia());
    document.addEventListener('pointerlockchange', () => {
      this.agganciato = document.pointerLockElement === tela;
      if (this.agganciato) this.maiAgganciato = false;
      else if (!this.trascina && this.attivi) this.onPausa();
    });
    document.addEventListener('pointerlockerror', () => this.rifiutato());
    tela.addEventListener('contextmenu', (e) => e.preventDefault());
    tela.addEventListener('wheel', (e) => {
      if (this.attivi) this.onScorri(Math.sign(e.deltaY));
    }, { passive: true });
    tela.addEventListener('pointerdown', (e) => this.giu(e));
    tela.addEventListener('pointermove', (e) => this.muovi(e));
    tela.addEventListener('pointerup', (e) => this.su(e));
    tela.addEventListener('pointercancel', (e) => this.su(e));
  }

  /** Lascia andare tutto: pausa, officina, finestra che perde il fuoco. Senza, il personaggio camminerebbe da solo. */
  rilascia(): void {
    this.tasti.clear();
    this.avanti = this.lato = 0;
    this.corri = this.salta = this.lancia = false;
    this.premuto = false;
    this.levaId = -1;
    this.sguardi.clear();
    this.leva.style.display = 'none';
  }

  private rifiutato(): void {
    // Chrome rifiuta anche una cattura chiesta troppo presto dopo Esc: se una volta è riuscita, si riprova al clic dopo.
    if (!this.maiAgganciato || this.trascina) return;
    this.trascina = true;
    this.onTrascina();
  }

  /** Prova a catturare il mouse (solo al computer). Va chiamato dentro un clic. */
  aggancia(): void {
    if (this.trascina) return;
    try {
      const esito = this.tela.requestPointerLock() as unknown;
      if (esito instanceof Promise) esito.catch(() => this.rifiutato());
    } catch {
      this.rifiutato();
    }
  }

  sgancia(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Collega un pulsante a schermo (lancia, salta): mentre lo si tiene premuto, il dito può anche girare lo sguardo. */
  pulsante(el: HTMLElement, premi: (giu: boolean) => void): void {
    let ux = 0;
    let uy = 0;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      premi(true);
      ux = e.clientX;
      uy = e.clientY;
    });
    el.addEventListener('pointermove', (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      this.guardaX += (e.clientX - ux) * 1.6;
      this.guardaY += (e.clientY - uy) * 1.6;
      ux = e.clientX;
      uy = e.clientY;
    });
    const fine = (): void => premi(false);
    el.addEventListener('pointerup', fine);
    el.addEventListener('pointercancel', fine);
  }

  private tasto(e: KeyboardEvent, giu: boolean): void {
    // I rilasci si ascoltano sempre: un tasto lasciato mentre l'officina è aperta non deve restare "premuto".
    if (!giu) this.tasti.delete(e.code);
    if (!this.attivi) return;
    if (giu) this.tasti.add(e.code);
    if (giu && !e.repeat) {
      if (e.code.startsWith('Digit')) this.onScelta((Number(e.code.slice(5)) + 9) % 10);
      if (e.code === 'KeyQ') this.onScorri(-1);
      if (e.code === 'KeyE') this.onScorri(1);
      if (e.code === 'KeyR') this.onRicostruisci();
      if (e.code === 'KeyC') this.onOfficina();
      if (e.code === 'Space') this.saltoSingolo = true;
      if (e.code === 'KeyF') this.colpoSingolo = true;
    }
    // L'officina si è appena aperta con questo stesso tasto: non ricalcolare il cammino.
    if (!this.attivi) return;
    if (e.code === 'KeyF') this.lancia = giu;
    if (e.code === 'Space') e.preventDefault();
    const t = this.tasti;
    const su = t.has('KeyW') || t.has('ArrowUp');
    const giuTasto = t.has('KeyS') || t.has('ArrowDown');
    const dx = t.has('KeyD') || t.has('ArrowRight');
    const sx = t.has('KeyA') || t.has('ArrowLeft');
    this.avanti = (su ? 1 : 0) - (giuTasto ? 1 : 0);
    this.lato = (dx ? 1 : 0) - (sx ? 1 : 0);
    this.corri = t.has('ShiftLeft') || t.has('ShiftRight');
    this.salta = t.has('Space');
  }

  private giu(e: PointerEvent): void {
    if (!this.attivi) return;
    if (e.pointerType === 'touch') {
      this.tela.setPointerCapture(e.pointerId);
      if (e.clientX < window.innerWidth * 0.45 && this.levaId < 0) {
        this.levaId = e.pointerId;
        this.levaX = e.clientX;
        this.levaY = e.clientY;
        this.leva.style.display = 'block';
        this.leva.style.left = `${e.clientX}px`;
        this.leva.style.top = `${e.clientY}px`;
        this.pomello.style.transform = 'translate(-50%, -50%)';
        this.pomello.classList.remove('corsa');
      } else {
        this.sguardi.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      return;
    }
    if (this.agganciato) {
      if (e.button === 0) {
        this.lancia = true;
        this.colpoSingolo = true;
      }
      return;
    }
    if (!this.trascina) {
      this.aggancia();
      return;
    }
    this.tela.setPointerCapture(e.pointerId);
    this.premuto = true;
    this.mosso = 0;
  }

  private muovi(e: PointerEvent): void {
    if (!this.attivi) return;
    if (e.pointerType === 'touch') {
      if (e.pointerId === this.levaId) {
        const dx = e.clientX - this.levaX;
        const dy = e.clientY - this.levaY;
        const d = Math.hypot(dx, dy);
        const max = 52;
        // Zona morta: un pollice fermo trema di qualche pixel, e senza di essa il personaggio striscerebbe.
        const spinta = d < 7 ? 0 : Math.min(1, (d - 7) / (max - 7));
        this.lato = d > 0 ? (dx / d) * spinta : 0;
        this.avanti = d > 0 ? (-dy / d) * spinta : 0;
        this.corri = d > max * 1.45;
        this.pomello.classList.toggle('corsa', this.corri);
        const k = d > max ? max / d : 1;
        this.pomello.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
        return;
      }
      const u = this.sguardi.get(e.pointerId);
      if (!u) return;
      this.guardaX += (e.clientX - u.x) * 1.6;
      this.guardaY += (e.clientY - u.y) * 1.6;
      u.x = e.clientX;
      u.y = e.clientY;
      return;
    }
    if (this.agganciato) {
      this.guardaX += e.movementX;
      this.guardaY += e.movementY;
    } else if (this.premuto) {
      this.guardaX += e.movementX;
      this.guardaY += e.movementY;
      this.mosso += Math.abs(e.movementX) + Math.abs(e.movementY);
    }
  }

  private su(e: PointerEvent): void {
    if (e.pointerType === 'touch') {
      if (e.pointerId === this.levaId) {
        this.levaId = -1;
        this.lato = 0;
        this.avanti = 0;
        this.corri = false;
        this.leva.style.display = 'none';
      } else {
        this.sguardi.delete(e.pointerId);
      }
      return;
    }
    if (this.agganciato) {
      if (e.button === 0) this.lancia = false;
    } else if (this.premuto) {
      this.premuto = false;
      // Un clic senza trascinare lancia l'incantesimo una volta.
      if (this.mosso < 6) this.colpoSingolo = true;
    }
  }
}
