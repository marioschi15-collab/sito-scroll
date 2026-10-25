// src/movimento/useQuotaRaggiungibile.ts — la quota di vista (`amount`) che un elemento può raggiungere davvero.
// IntersectionObserver confronta la parte visibile con l'area INTERA dell'elemento: un blocco più alto di
// innerHeight / amount (es. il modulo intero sul telefono in orizzontale, o un titolo con il testo ingrandito)
// non arriverebbe mai alla soglia e resterebbe invisibile per sempre. Per lui la soglia scende a quella
// possibile; per tutti gli altri resta quella chiesta.
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Parte della finestra che un elemento alto può occupare davvero (le barre fisse ne coprono un po'). */
const FINESTRA_UTILE = 0.8;

export function useQuotaRaggiungibile(amount: number): { rif: (el: Element | null) => void; quota: number } {
  const rifElemento = useRef<Element | null>(null);
  const [quota, setQuota] = useState(amount);
  const rif = useCallback((el: Element | null) => {
    rifElemento.current = el;
  }, []);

  useLayoutEffect(() => {
    const el = rifElemento.current;
    if (!el) return;
    const aggiorna = (): void => {
      const altezza = el.getBoundingClientRect().height;
      const possibile = altezza > 0 ? (FINESTRA_UTILE * window.innerHeight) / altezza : amount;
      // Due decimali: poche soglie diverse, quindi pochi osservatori. Con lo stesso valore React non ridisegna.
      setQuota(Math.min(amount, Math.floor(possibile * 100) / 100));
    };
    aggiorna();
    window.addEventListener('resize', aggiorna);
    const osservatore = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(aggiorna);
    osservatore?.observe(el);
    return () => {
      window.removeEventListener('resize', aggiorna);
      osservatore?.disconnect();
    };
  }, [amount]);

  return { rif, quota };
}
