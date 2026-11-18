/**
 * La fila delle finestre: una sola aperta alla volta. Quelle che chiede chi gioca (il Libro, Unisci, «Nuovo»)
 * si aprono subito se non ce n'è già una; i messaggi che arrivano dal gioco (il villaggio, una nuova era, un saluto)
 * aspettano in fila che quella aperta si chiuda e che il dito abbia finito il suo gesto: un messaggio che salta fuori
 * a metà di un gesto ruba il tocco e copre quello che si stava guardando.
 *
 * Qui non c'è niente della pagina: la fila decide soltanto chi tocca, e chiama `mostra` quando è il suo turno.
 */
export class Coda<T> {
  private readonly attese: { cosa: T; chiave?: string }[] = [];
  private aperta = false;
  private inGesto = false;

  constructor(private readonly mostra: (cosa: T) => void) {}

  /** Vero se una finestra è aperta. */
  get occupata(): boolean {
    return this.aperta;
  }

  /** Quanti messaggi aspettano il loro turno. */
  get inAttesa(): number {
    return this.attese.length;
  }

  /**
   * Una finestra chiesta da chi gioca: si apre subito, anche durante un gesto (l'ha appena chiesta lui), ma non sopra
   * un'altra. Falso se non si è aperta.
   */
  subito(cosa: T): boolean {
    if (this.aperta) return false;
    this.apri(cosa);
    return true;
  }

  /**
   * Un messaggio del gioco: si mostra appena tocca a lui. Con una `chiave`, un messaggio uguale già in fila non si
   * aggiunge una seconda volta.
   */
  aspetta(cosa: T, chiave?: string): void {
    if (chiave !== undefined && this.attese.some((a) => a.chiave === chiave)) return;
    this.attese.push({ cosa, chiave });
  }

  /** Vero se c'è qualcosa in fila e niente lo ferma: chi chiama può mostrarlo con `avanti`. */
  get pronta(): boolean {
    return !this.aperta && !this.inGesto && this.attese.length > 0;
  }

  /** Mostra il primo messaggio della fila, se adesso si può. */
  avanti(): void {
    if (!this.pronta) return;
    this.apri(this.attese.shift()!.cosa);
  }

  /** La finestra aperta si è chiusa. */
  chiusa(): void {
    this.aperta = false;
  }

  /** Un dito comincia (vero) o finisce (falso) un gesto sul mondo. */
  gesto(inCorso: boolean): void {
    this.inGesto = inCorso;
  }

  /** Toglie dalla fila tutti i messaggi in attesa (per esempio quando si riparte da zero). */
  svuota(): void {
    this.attese.length = 0;
  }

  private apri(cosa: T): void {
    this.aperta = true;
    this.mostra(cosa);
  }
}
