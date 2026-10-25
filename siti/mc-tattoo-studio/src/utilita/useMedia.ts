// src/utilita/useMedia.ts — vero/falso per una media query, già giusto al primo disegno della pagina.
import { useCallback, useSyncExternalStore } from 'react';

/** Una sola MediaQueryList per query: getSnapshot viene chiamata a ogni disegno. */
const liste = new Map<string, MediaQueryList>();

function lista(query: string): MediaQueryList {
  let trovata = liste.get(query);
  if (!trovata) {
    trovata = window.matchMedia(query);
    liste.set(query, trovata);
  }
  return trovata;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (avvisa: () => void) => {
      const mql = lista(query);
      mql.addEventListener('change', avvisa);
      return () => mql.removeEventListener('change', avvisa);
    },
    [query],
  );
  const getSnapshot = useCallback(() => lista(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
