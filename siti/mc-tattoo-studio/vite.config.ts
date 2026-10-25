import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `pnpm build` produce il sito da pubblicare (cartella dist/).
// `pnpm anteprima` produce un unico file HTML (dist-anteprima/index.html) che si apre con un doppio clic.
export default defineConfig(({ mode }) => {
  const anteprima = mode === 'anteprima';
  return {
    base: './',
    plugins: anteprima ? [react(), viteSingleFile()] : [react()],
    build: {
      outDir: anteprima ? 'dist-anteprima' : 'dist',
      emptyOutDir: true,
    },
  };
});
