import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `pnpm build` produce un solo file (dist/index.html): si apre con un doppio clic e si pubblica ovunque.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { outDir: 'dist', emptyOutDir: true },
});
