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
  onScelta: (indice: number) => void = () => undefined;
  onScorri: (verso: number) => void = () => undefined;
  onRicostruisci: () => void = () => undefined;
  onPausa: () => void = () => undefined;

  private readonly tasti = new Set<string>();
  private agganciato = false;
  /** Se il browser rifiuta di "catturare" il mouse, si guarda trascinando. */
  private trascina = false;
  private premuto = false;
  private mosso = 0;
  private levaId = -1;
  private levaX = 0;
  private levaY = 0;
  private sguardoId = -1;
  private ultimoX = 0;
  private ultimoY = 0;

  constructor(
    private readonly tela: HTMLElement,
    private readonly leva: HTMLElement,
    private readonly pomello: HTMLElement,
  ) {
    window.addEventListener('keydown', (e) => this.tasto(e, true));
    window.addEventListener('keyup', (e) => this.tasto(e, false));
    window.addEventListener('blur', () => {
      this.tasti.clear();
      this.lancia = false;
    });
    document.addEventListener('pointerlockchange', () => {
      this.agganciato = document.pointerLockElement === tela;
      if (!this.agganciato && !this.trascina && this.attivi) this.onPausa();
    });
    document.addEventListener('pointerlockerror', () => {
      this.trascina = true;
    });
    tela.addEventListener('contextmenu', (e) => e.preventDefault());
    tela.addEventListener('wheel', (e) => {
      if (this.attivi) this.onScorri(Math.sign(e.deltaY));
    }, { passive: true });
    tela.addEventListener('pointerdown', (e) => this.giu(e));
    tela.addEventListener('pointermove', (e) => this.muovi(e));
    tela.addEventListener('pointerup', (e) => this.su(e));
    tela.addEventListener('pointercancel', (e) => this.su(e));
  }

  /** Prova a catturare il mouse (solo al computer). Va chiamato dentro un clic. */
  aggancia(): void {
    if (this.trascina) return;
    try {
      const esito = this.tela.requestPointerLock() as unknown;
      if (esito instanceof Promise) esito.catch(() => (this.trascina = true));
    } catch {
      this.trascina = true;
    }
  }

  sgancia(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Collega un pulsante a schermo (lancia, salta): mentre lo si tiene premuto, il dito può anche girare lo sguardo. */
  pulsante(el: HTMLElement, premi: (giu: boolean) => void): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      premi(true);
      this.ultimoX = e.clientX;
      this.ultimoY = e.clientY;
    });
    el.addEventListener('pointermove', (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      this.guardaX += (e.clientX - this.ultimoX) * 1.6;
      this.guardaY += (e.clientY - this.ultimoY) * 1.6;
      this.ultimoX = e.clientX;
      this.ultimoY = e.clientY;
    });
    const fine = (): void => premi(false);
    el.addEventListener('pointerup', fine);
    el.addEventListener('pointercancel', fine);
  }

  private tasto(e: KeyboardEvent, giu: boolean): void {
    if (!this.attivi) return;
    if (giu) this.tasti.add(e.code);
    else this.tasti.delete(e.code);
    if (giu && !e.repeat) {
      if (e.code.startsWith('Digit')) this.onScelta((Number(e.code.slice(5)) + 9) % 10);
      if (e.code === 'KeyQ') this.onScorri(-1);
      if (e.code === 'KeyE') this.onScorri(1);
      if (e.code === 'KeyR') this.onRicostruisci();
    }
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
      } else if (this.sguardoId < 0) {
        this.sguardoId = e.pointerId;
        this.ultimoX = e.clientX;
        this.ultimoY = e.clientY;
      }
      return;
    }
    if (this.agganciato) {
      if (e.button === 0) this.lancia = true;
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
        let dx = e.clientX - this.levaX;
        let dy = e.clientY - this.levaY;
        const d = Math.hypot(dx, dy);
        const max = 52;
        if (d > max) {
          dx *= max / d;
          dy *= max / d;
        }
        this.lato = dx / max;
        this.avanti = -dy / max;
        this.corri = d > max * 1.7;
        this.pomello.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      } else if (e.pointerId === this.sguardoId) {
        this.guardaX += (e.clientX - this.ultimoX) * 1.6;
        this.guardaY += (e.clientY - this.ultimoY) * 1.6;
        this.ultimoX = e.clientX;
        this.ultimoY = e.clientY;
      }
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
      } else if (e.pointerId === this.sguardoId) {
        this.sguardoId = -1;
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

  /** Vero per un solo fotogramma dopo un clic "secco" nella modalità a trascinamento. */
  colpoSingolo = false;
}
