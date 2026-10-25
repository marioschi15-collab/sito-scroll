// src/utilita/useTrappolaFuoco.ts — tiene il focus dentro un pannello aperto (menu, scheda).
// Tab e Maiusc+Tab girano tra gli elementi attivabili del contenitore e quelli in `extra`; Esc chiama onEsc.
// Il focus di partenza lo restituisce il componente che apre, non questo hook.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface OpzioniTrappola {
  /** Elementi fuori dal contenitore che fanno parte del giro (es. il pulsante "Chiudi" nella barra). */
  extra?: readonly RefObject<HTMLElement | null>[];
  /** Dove mettere il focus all'apertura. Predefinito: il primo elemento attivabile. */
  iniziale?: RefObject<HTMLElement | null>;
  /** Chiamata al tasto Esc. */
  onEsc?: () => void;
}

const ATTIVABILI =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibile(el: HTMLElement): boolean {
  if (el.getAttribute('tabindex') === '-1') return false;
  if (el.closest('[inert]')) return false;
  if (el.getClientRects().length === 0) return false;
  return getComputedStyle(el).visibility !== 'hidden';
}

function attivabiliIn(radice: HTMLElement): HTMLElement[] {
  const trovati: HTMLElement[] = [];
  if (radice.matches(ATTIVABILI)) trovati.push(radice);
  radice.querySelectorAll<HTMLElement>(ATTIVABILI).forEach((el) => trovati.push(el));
  return trovati.filter(visibile);
}

/** Ordine del documento: è l'ordine in cui si legge e si tabula. */
function inOrdine(a: HTMLElement, b: HTMLElement): number {
  if (a === b) return 0;
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

export function useTrappolaFuoco(
  contenitore: RefObject<HTMLElement | null>,
  attiva: boolean,
  opzioni?: OpzioniTrappola,
): void {
  // Le opzioni cambiano a ogni disegno (oggetti e funzioni nuovi): si legge sempre l'ultima versione.
  const rifOpzioni = useRef<OpzioniTrappola | undefined>(opzioni);
  useLayoutEffect(() => {
    rifOpzioni.current = opzioni;
  });

  useEffect(() => {
    if (!attiva) return;

    const radici = (): HTMLElement[] => {
      const elenco: HTMLElement[] = [];
      if (contenitore.current) elenco.push(contenitore.current);
      for (const rif of rifOpzioni.current?.extra ?? []) {
        if (rif.current) elenco.push(rif.current);
      }
      return elenco;
    };

    const giro = (): HTMLElement[] => {
      const tutti = new Set<HTMLElement>();
      for (const radice of radici()) attivabiliIn(radice).forEach((el) => tutti.add(el));
      return [...tutti].sort(inOrdine);
    };

    // Focus di partenza: l'elemento indicato, altrimenti il primo attivabile del contenitore.
    const fotogramma = requestAnimationFrame(() => {
      const iniziale = rifOpzioni.current?.iniziale?.current;
      const primo = contenitore.current ? attivabiliIn(contenitore.current)[0] : undefined;
      (iniziale ?? primo)?.focus();
    });

    const suTasto = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape' || evento.key === 'Esc') {
        const onEsc = rifOpzioni.current?.onEsc;
        if (onEsc) {
          evento.preventDefault();
          onEsc();
        }
        return;
      }
      if (evento.key !== 'Tab' || evento.altKey || evento.ctrlKey || evento.metaKey) return;

      const elenco = giro();
      evento.preventDefault();
      if (elenco.length === 0) return;

      const attivo = document.activeElement;
      const indice = attivo instanceof HTMLElement ? elenco.indexOf(attivo) : -1;
      let prossimo: HTMLElement | undefined;

      if (indice >= 0) {
        const passo = evento.shiftKey ? -1 : 1;
        prossimo = elenco[(indice + passo + elenco.length) % elenco.length];
      } else if (attivo instanceof HTMLElement && radici().some((radice) => radice.contains(attivo))) {
        // Il focus è dentro il giro ma su un elemento non tabulabile (es. il titolo della scheda):
        // si va al primo elemento dopo di lui, o all'ultimo prima di lui con Maiusc+Tab.
        prossimo = evento.shiftKey
          ? [...elenco].reverse().find((el) => inOrdine(el, attivo) < 0)
          : elenco.find((el) => inOrdine(attivo, el) < 0);
      }

      prossimo ??= evento.shiftKey ? elenco[elenco.length - 1] : elenco[0];
      prossimo?.focus();
    };

    document.addEventListener('keydown', suTasto);
    return () => {
      cancelAnimationFrame(fotogramma);
      document.removeEventListener('keydown', suTasto);
    };
  }, [attiva, contenitore]);
}
