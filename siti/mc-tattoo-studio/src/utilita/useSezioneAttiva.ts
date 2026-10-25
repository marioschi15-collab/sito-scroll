// src/utilita/useSezioneAttiva.ts — quale sezione sta a metà schermo, per segnare la voce attiva della barra.
import { useEffect, useState } from 'react';

/** Una fascia stretta a metà schermo: dal 45% al 50% dell'altezza della finestra. */
const FASCIA = '-45% 0px -50% 0px';

export function useSezioneAttiva(ids: readonly string[]): string | null {
  const [attiva, setAttiva] = useState<string | null>(null);

  // L'elenco può essere un array nuovo a ogni disegno: l'osservatore si ricrea solo se cambiano gli id.
  const chiave = ids.join('\n');

  useEffect(() => {
    const elenco = chiave === '' ? [] : chiave.split('\n');
    const inFascia = new Set<string>();

    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const voce of voci) {
          const id = voce.target.id;
          if (voce.isIntersecting) inFascia.add(id);
          else inFascia.delete(id);
        }
        // L'ultima sezione dell'elenco che tocca la fascia; React ignora lo stesso valore, quindi
        // lo stato cambia solo quando cambia davvero.
        let ultima: string | null = null;
        for (const id of elenco) if (inFascia.has(id)) ultima = id;
        setAttiva(ultima);
      },
      { rootMargin: FASCIA },
    );

    for (const id of elenco) {
      const elemento = document.getElementById(id);
      if (elemento) osservatore.observe(elemento);
    }
    return () => osservatore.disconnect();
  }, [chiave]);

  return attiva;
}
