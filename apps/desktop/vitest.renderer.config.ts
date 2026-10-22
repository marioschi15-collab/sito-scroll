import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Prove della finestra (renderer React): ambiente jsdom, file `test/renderer*.test.tsx`.
 * Separate da `vitest.config.ts` (Node) perché il DOM finto non serve al Nucleo e lo rallenterebbe.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['test/renderer*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['test/renderer/setup.ts'],
    css: false,
    testTimeout: 30000,
  },
});
