// src/regia/Regia.tsx — il "regista": scorrimento morbido (Lenis), colori della pagina che cambiano
// con la storia, bande da cinema, capitolo attivo e salti da un capitolo all'altro.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import Lenis from 'lenis';
import { motionValue, useReducedMotion } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { CAPITOLI } from './capitoli.js';
import { daEsadecimale, fondi } from './colore.js';
import type { Rgb } from './colore.js';
import { morbido } from '../arte/geometria.js';

interface ValoreRegia {
  registra: (id: string, el: HTMLElement | null) => void;
  /** Indice in CAPITOLI della scena che occupa lo schermo. */
  attivo: number;
  vai: (id: string) => void;
  blocca: (bloccato: boolean) => void;
  ridotto: boolean;
  /** Avanzamento dell'intera storia, da 0 a 1. */
  avanzamento: MotionValue<number>;
}

const ContestoRegia = createContext<ValoreRegia | null>(null);

export function useRegia(): ValoreRegia {
  const v = useContext(ContestoRegia);
  if (!v) throw new Error('useRegia va usato dentro <Regia>');
  return v;
}

interface Fermata {
  y: number;
  sfondo: Rgb;
  testo: Rgb;
  accento: Rgb;
  bande: number;
}

export function Regia({ children }: { children: ReactNode }): ReactElement {
  const ridotto = useReducedMotion() ?? false;
  const elementi = useRef(new Map<string, HTMLElement>());
  const fermate = useRef<Fermata[]>([]);
  const inizi = useRef<number[]>([]);
  const lenis = useRef<Lenis | null>(null);
  const [attivo, setAttivo] = useState(0);
  const attivoRef = useRef(0);
  const avanzamento = useMemo(() => motionValue(0), []);

  const misura = useCallback(() => {
    const vh = window.innerHeight;
    const lista: Fermata[] = [];
    const tops: number[] = [];
    for (const cap of CAPITOLI) {
      const el = elementi.current.get(cap.id);
      if (!el) {
        tops.push(Number.POSITIVE_INFINITY);
        continue;
      }
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const corsa = Math.max(1, r.height - vh);
      tops.push(top);
      for (const t of cap.tappe) {
        lista.push({
          // La prima tappa arriva poco prima che la scena copra lo schermo: il colore cambia mentre entra.
          y: t.p === 0 ? top - vh * 0.35 : top + t.p * corsa,
          sfondo: daEsadecimale(t.sfondo),
          testo: daEsadecimale(t.testo),
          accento: daEsadecimale(t.accento),
          bande: t.bande ?? 0,
        });
      }
    }
    lista.sort((a, b) => a.y - b.y);
    fermate.current = lista;
    inizi.current = tops;
  }, []);

  const aggiorna = useCallback(() => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    avanzamento.set(Math.min(1, Math.max(0, y / max)));

    const f = fermate.current;
    if (f.length > 0) {
      let i = 0;
      while (i < f.length - 1 && f[i + 1]!.y <= y) i++;
      const a = f[i]!;
      const b = f[i + 1] ?? a;
      const t = b === a || y <= a.y ? 0 : morbido((y - a.y) / Math.max(1, b.y - a.y));
      const s = document.documentElement.style;
      s.setProperty('--sfondo', fondi(a.sfondo, b.sfondo, t));
      s.setProperty('--testo', fondi(a.testo, b.testo, t));
      s.setProperty('--accento', fondi(a.accento, b.accento, t));
      s.setProperty('--bande', (a.bande + (b.bande - a.bande) * t).toFixed(3));
    }

    const tops = inizi.current;
    let k = 0;
    for (let j = 0; j < tops.length; j++) if (tops[j]! - vh * 0.5 <= y) k = j;
    if (k !== attivoRef.current) {
      attivoRef.current = k;
      setAttivo(k);
    }
  }, [avanzamento]);

  useEffect(() => {
    let rif = 0;
    const suScorri = (): void => {
      if (rif) return;
      rif = requestAnimationFrame(() => {
        rif = 0;
        aggiorna();
      });
    };
    const suMisura = (): void => {
      misura();
      aggiorna();
    };
    suMisura();
    const ro = new ResizeObserver(suMisura);
    ro.observe(document.body);
    window.addEventListener('scroll', suScorri, { passive: true });
    window.addEventListener('resize', suMisura);
    void document.fonts?.ready.then(suMisura);
    return () => {
      cancelAnimationFrame(rif);
      ro.disconnect();
      window.removeEventListener('scroll', suScorri);
      window.removeEventListener('resize', suMisura);
    };
  }, [aggiorna, misura]);

  useEffect(() => {
    if (ridotto) return;
    const l = new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.current = l;
    return () => {
      l.destroy();
      lenis.current = null;
    };
  }, [ridotto]);

  const registra = useCallback((id: string, el: HTMLElement | null) => {
    if (el) elementi.current.set(id, el);
    else elementi.current.delete(id);
  }, []);

  const vai = useCallback(
    (id: string) => {
      const el = elementi.current.get(id);
      if (!el) return;
      const l = lenis.current;
      if (l) {
        l.start();
        l.scrollTo(el, { duration: 2, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
      } else {
        el.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth' });
      }
    },
    [ridotto],
  );

  const blocca = useCallback((b: boolean) => {
    const l = lenis.current;
    if (l) {
      if (b) l.stop();
      else l.start();
    }
    document.documentElement.classList.toggle('bloccata', b);
  }, []);

  const valore = useMemo<ValoreRegia>(
    () => ({ registra, attivo, vai, blocca, ridotto, avanzamento }),
    [registra, attivo, vai, blocca, ridotto, avanzamento],
  );

  return <ContestoRegia.Provider value={valore}>{children}</ContestoRegia.Provider>;
}
