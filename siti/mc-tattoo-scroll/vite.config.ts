import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `pnpm build` produce il sito da pubblicare (cartella dist/);
// `pnpm anteprima` un unico file HTML che si apre con un doppio clic (dist-anteprima/index.html).
export default defineConfig(({ mode }) => {
  const anteprima = mode === 'anteprima';
  return {
    base: './',
    plugins: anteprima ? [react(), viteSingleFile()] : [react()],
    build: { outDir: anteprima ? 'dist-anteprima' : 'dist', emptyOutDir: true, target: 'es2022' },
  };
});
