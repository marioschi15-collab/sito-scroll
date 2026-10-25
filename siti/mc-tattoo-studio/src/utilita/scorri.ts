// src/utilita/scorri.ts — porta la pagina a un'ancora e sposta il focus dove serve.
import { MEDIA } from '../movimento/costanti.js';

export interface OpzioniScorri {
  /** 'titolo' (predefinito): il focus va all'elemento [data-titolo-sezione] dentro la destinazione. */
  fuoco?: 'titolo' | 'nessuno' | HTMLElement | null;
  /** Se il fuoco è un campo di testo, mette il cursore alla fine. */
  cursoreAllaFine?: boolean;
}

export function movimentoRidottoAttivo(): boolean {
  return window.matchMedia(MEDIA.ridotto).matches;
}

/** L'elemento che riceve il focus, oppure null. Un elemento passato ma non trovato (null) vale come 'titolo'. */
function bersaglioDelFuoco(destinazione: HTMLElement, fuoco: OpzioniScorri['fuoco']): HTMLElement | null {
  if (fuoco === 'nessuno') return null;
  if (fuoco instanceof HTMLElement) return fuoco;
  if (destinazione.matches('[data-titolo-sezione]')) return destinazione;
  return destinazione.querySelector<HTMLElement>('[data-titolo-sezione]');
}

export function scorriA(id: string, opzioni: OpzioniScorri = {}): void {
  const destinazione = document.getElementById(id);
  if (!destinazione) return;

  // scrollIntoView rispetta scroll-margin-top, quindi la barra in alto non copre il titolo.
  destinazione.scrollIntoView({ behavior: movimentoRidottoAttivo() ? 'auto' : 'smooth', block: 'start' });

  const bersaglio = bersaglioDelFuoco(destinazione, opzioni.fuoco ?? 'titolo');
  if (bersaglio) {
    bersaglio.focus({ preventScroll: true });
    if (
      opzioni.cursoreAllaFine &&
      (bersaglio instanceof HTMLInputElement || bersaglio instanceof HTMLTextAreaElement)
    ) {
      const fine = bersaglio.value.length;
      try {
        bersaglio.setSelectionRange(fine, fine);
      } catch {
        // Alcuni tipi di campo (es. email) non permettono di spostare il cursore: va bene così.
      }
    }
  }

  history.replaceState(null, '', `#${id}`);
}
