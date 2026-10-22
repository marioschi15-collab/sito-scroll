import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import type { Plugin } from 'vite';

/**
 * Build della finestra (electron-vite 4): tre entrate.
 * - main    → out/main/index.mjs (ESM). Dipendenze esterne (node_modules a runtime), in particolare i moduli nativi
 *             (better-sqlite3, node-pty, sherpa-onnx-node) e l'Agent SDK, che deve trovare il suo binario accanto a sé.
 * - preload → out/preload/index.cjs (CommonJS: un preload in sandbox non può essere un modulo ES; tutto incluso,
 *             importa solo 'electron').
 * - renderer → out/renderer (React), radice src/renderer.
 */
const qui = path.dirname(fileURLToPath(import.meta.url));
const da = (...parti: string[]): string => path.resolve(qui, ...parti);

const ESTERNI_MAIN = [
  'electron',
  'better-sqlite3',
  'node-pty',
  'sherpa-onnx-node',
  '@anthropic-ai/claude-agent-sdk',
  /^@anthropic-ai\/claude-agent-sdk-/,
];

/**
 * Solo con il server di sviluppo: il plugin React inietta uno script in linea (aggiornamento a caldo) e usa un
 * websocket. La CSP della pagina li bloccherebbe; nella build di produzione la CSP resta quella di index.html.
 */
function cspSviluppo(): Plugin {
  return {
    name: 'spalla-csp-sviluppo',
    apply: 'serve',
    transformIndexHtml(html) {
      return html
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace("connect-src 'self'", "connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:*");
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: da('out/main'),
      rollupOptions: {
        input: { index: da('src/main/index.ts') },
        external: ESTERNI_MAIN,
      },
    },
  },
  preload: {
    build: {
      outDir: da('out/preload'),
      rollupOptions: {
        input: { index: da('src/preload/index.ts') },
        external: ['electron'],
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    root: da('src/renderer'),
    plugins: [react(), cspSviluppo()],
    build: {
      outDir: da('out/renderer'),
      rollupOptions: { input: { index: da('src/renderer/index.html') } },
    },
  },
});
