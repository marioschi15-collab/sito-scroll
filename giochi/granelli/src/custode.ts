/**
 * Il custode della partita decide QUANDO salvare. Preparare un salvataggio costa (su un telefono lento qualche
 * decina di millesimi), e dieci scoperte in un secondo non devono diventare dieci scritture: chi vuole salvare
 * lo chiede, e il custode scrive al più una volta ogni due secondi, mai mentre un dito sta facendo un gesto (il
 * gesto resterebbe a scatti), e subito quando la pagina va in secondo piano o si chiude.
 */

/** Il tempo minimo tra due scritture, in millesimi di secondo. */
export const OGNI = 2000;

/** Quello che serve al custode dal mondo di fuori: l'orologio, un modo per farsi richiamare, chi scrive davvero. */
export interface PerIlCustode {
  ora: () => number;
  /** Richiama `fai` tra `ms` millesimi (nella pagina è setTimeout). */
  richiama: (fai: () => void, ms: number) => void;
  /** Scrive la partita. */
  scrivi: () => void;
}

export class Custode {
  /** C'è qualcosa di nuovo da scrivere. */
  private sporco = false;
  private ultima = -Infinity;
  private inGesto = false;
  /** Una chiamata è già stata chiesta all'orologio: non se ne chiedono altre. */
  private atteso = false;

  constructor(private readonly fuori: PerIlCustode) {}

  /** Qualcosa è cambiato: va salvato, appena si può. */
  chiedi(): void {
    this.sporco = true;
    this.tenta();
  }

  /** Un dito comincia (vero) o finisce (falso) un gesto: finché dura non si scrive. */
  gesto(inCorso: boolean): void {
    this.inGesto = inCorso;
    if (!inCorso) this.tenta();
  }

  /**
   * La pagina va via (in secondo piano, o si chiude): si scrive adesso, anche a metà di un gesto. Il mondo cambia da
   * solo a ogni istante, quindi si scrive sempre, anche se nessuno l'ha chiesto.
   */
  subito(): void {
    this.scrivi();
  }

  /** Vero se c'è qualcosa che aspetta di essere scritto. */
  get daScrivere(): boolean {
    return this.sporco;
  }

  private tenta(): void {
    if (!this.sporco || this.inGesto || this.atteso) return;
    const manca = this.ultima + OGNI - this.fuori.ora();
    if (manca <= 0) {
      this.scrivi();
      return;
    }
    this.atteso = true;
    this.fuori.richiama(() => {
      this.atteso = false;
      this.tenta();
    }, manca);
  }

  private scrivi(): void {
    this.sporco = false;
    this.ultima = this.fuori.ora();
    this.fuori.scrivi();
  }
}
