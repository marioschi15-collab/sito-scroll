import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Il gioco esce come un solo file (dist/index.html) che si apre con un doppio clic o si pubblica così com'è.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
});
