// src/utilita/useTemaSottoBarra.ts — il tema (chiaro o nero) della sezione che passa sotto la metà della barra in alto.
// La barra cambia colore di colpo, esattamente quando il confine tra due sezioni attraversa la sua metà.
import { useEffect, useState } from 'react';

export type Tema = 'chiaro' | 'nero';

/** Attesa dopo l'ultimo resize prima di ricreare l'osservatore (ms). */
const ATTESA_RESIZE = 150;

export function useTemaSottoBarra(altezzaBarra: number): Tema {
  const [tema, setTema] = useState<Tema>('chiaro');
  const [altezzaFinestra, setAltezzaFinestra] = useState<number>(() => window.innerHeight);

  useEffect(() => {
    let timer = 0;
    const suResize = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setAltezzaFinestra(window.innerHeight), ATTESA_RESIZE);
    };
    window.addEventListener('resize', suResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', suResize);
    };
  }, []);

  useEffect(() => {
    // Solo le sezioni principali e il piè di pagina: i data-tema annidati non contano.
    const sezioni = Array.from(document.querySelectorAll<HTMLElement>('[data-sezione]'));
    if (sezioni.length === 0) return;

    // Una linea di 1 px a metà della barra.
    const meta = Math.round(altezzaBarra / 2);
    const sotto = Math.max(0, altezzaFinestra - meta - 1);
    const sullaLinea = new Set<Element>();

    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const voce of voci) {
          if (voce.isIntersecting) sullaLinea.add(voce.target);
          else sullaLinea.delete(voce.target);
        }
        // Sul confine esatto due sezioni toccano la linea: vince quella che viene dopo nel documento.
        let scelta: HTMLElement | undefined;
        for (const sezione of sezioni) if (sullaLinea.has(sezione)) scelta = sezione;
        setTema(scelta?.dataset.tema === 'nero' ? 'nero' : 'chiaro');
      },
      { rootMargin: `-${meta}px 0px -${sotto}px 0px` },
    );

    for (const sezione of sezioni) osservatore.observe(sezione);
    return () => osservatore.disconnect();
  }, [altezzaBarra, altezzaFinestra]);

  return tema;
}
