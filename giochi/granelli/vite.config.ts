import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `pnpm build` produce un solo file (dist/index.html): si apre con un doppio clic e si pubblica ovunque.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { outDir: 'dist', emptyOutDir: true },
  // Le prove fanno scorrere il mondo per migliaia di istanti: su una macchina lenta (la CI) servono più dei
  // cinque secondi che il programma di prova concede di suo.
  test: { testTimeout: 60000 },
});
