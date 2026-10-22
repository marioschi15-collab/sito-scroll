import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Quello che jsdom non ha e la finestra usa: matchMedia (tema), ResizeObserver (terminale), scrollIntoView (chat).
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }),
  });
}
if (!('ResizeObserver' in globalThis)) {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as { spalla?: unknown }).spalla;
});
