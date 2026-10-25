// src/utilita/bloccaPagina.ts — ferma lo scorrimento della pagina mentre menu o scheda sono aperti.
import { useEffect } from 'react';

const CLASSE = 'pagina-bloccata';

/** Quante richieste di blocco sono attive (es. menu e scheda insieme). */
let richieste = 0;

export function useBloccaPagina(attivo: boolean): void {
  useEffect(() => {
    if (!attivo) return;
    richieste += 1;
    document.documentElement.classList.add(CLASSE);
    return () => {
      richieste = Math.max(0, richieste - 1);
      if (richieste === 0) document.documentElement.classList.remove(CLASSE);
    };
  }, [attivo]);
}
