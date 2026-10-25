import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { studio, indirizzoCompleto } from './src/dati/studio.js';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SEGNI_DI_PROVA = /example\.com|Esempio|000 000|profilo_di_prova|00000000000|Città di prova/;

/**
 * Ferma la build con un messaggio leggibile da chiunque: senza la traccia tecnica dello stack,
 * che Vite altrimenti stamperebbe sotto il testo.
 */
function fermaLaBuild(righe: readonly string[]): never {
  const testo = ['', ...righe, ''].join('\n');
  const errore = new Error(testo);
  errore.stack = testo;
  throw errore;
}

function pluginStudio(mode: string): Plugin {
  const titolo = `${studio.nome} — Tatuaggi su appuntamento a ${studio.citta}`;
  const descrizione =
    `Studio di tatuaggi a ${studio.citta}: disegni su misura in stile tradizionale, fine line, ` +
    `blackwork e lettering. Solo su appuntamento: prenota una consulenza.`;
  return {
    name: 'mc-studio',
    configResolved(config) {
      // L'anteprima (un solo file da mostrare al cliente) si costruisce sempre, anche con i dati di prova.
      if (config.command !== 'build' || mode === 'anteprima') return;
      if (studio.datiDiProva && process.env.PERMETTI_DATI_DI_PROVA !== '1') {
        fermaLaBuild([
          'IL SITO NON È ANCORA PRONTO PER ESSERE PUBBLICATO.',
          '',
          'Nel file src/dati/studio.ts ci sono ancora i dati di prova: indirizzo, telefono,',
          'email, Instagram e orari sono finti (c’è scritto datiDiProva: true).',
          '',
          'Cosa fare per pubblicarlo:',
          '  1. apri src/dati/studio.ts e scrivi i dati veri dello studio al posto di quelli finti;',
          '  2. fai rileggere al titolare le frasi su età, acconto, preavviso e igiene;',
          '  3. cambia «datiDiProva: true» in «datiDiProva: false»;',
          '  4. lancia di nuovo: pnpm build',
          '',
          'Vuoi solo far vedere il sito al cliente? Usa: pnpm anteprima',
          'Crea il file dist-anteprima/index.html, che si apre con un doppio clic.',
          '',
          'Ti serve una build di prova con i dati finti (non da pubblicare)?',
          '  su Windows (PowerShell): $env:PERMETTI_DATI_DI_PROVA="1"; pnpm build',
          '  su Mac o Linux:          PERMETTI_DATI_DI_PROVA=1 pnpm build',
        ]);
      }
      if (!studio.datiDiProva) {
        const rimasti = [...new Set(JSON.stringify(studio).match(new RegExp(SEGNI_DI_PROVA.source, 'g')) ?? [])];
        if (rimasti.length > 0) {
          fermaLaBuild([
            'IL SITO NON È ANCORA PRONTO PER ESSERE PUBBLICATO.',
            '',
            'In src/dati/studio.ts c’è scritto datiDiProva: false, ma restano dei valori finti:',
            ...rimasti.map((valore) => `  - ${valore}`),
            '',
            'Sostituiscili con i dati veri dello studio e lancia di nuovo: pnpm build',
          ]);
        }
      }
    },
    transformIndexHtml(html) {
      const righe = [
        `<title>${esc(titolo)}</title>`,
        `<meta name="description" content="${esc(descrizione)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:locale" content="it_IT" />`,
        `<meta property="og:title" content="${esc(titolo)}" />`,
        `<meta property="og:description" content="${esc(descrizione)}" />`,
      ];
      if (!studio.datiDiProva) {
        righe.push(`<link rel="canonical" href="${esc(studio.urlSito)}" />`);
        righe.push(`<meta property="og:url" content="${esc(studio.urlSito)}" />`);
        const ld = {
          '@context': 'https://schema.org',
          '@type': 'TattooParlor',
          name: studio.nome,
          url: studio.urlSito,
          telephone: studio.telefono.tel,
          email: studio.email,
          address: {
            '@type': 'PostalAddress',
            streetAddress: studio.indirizzo.via,
            postalCode: studio.indirizzo.cap,
            addressLocality: studio.indirizzo.citta,
            addressRegion: studio.indirizzo.provincia,
            addressCountry: 'IT',
          },
          sameAs: [studio.instagram.url],
        };
        righe.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
      }
      const noscript =
        `<noscript><p style="font:16px/1.5 Arial,sans-serif;padding:24px;max-width:40ch">` +
        `${esc(studio.nome)} — ${esc(indirizzoCompleto)}. Per vedere il sito serve JavaScript. ` +
        `Puoi scriverci su WhatsApp al ${esc(studio.telefono.leggibile)} o via email a ${esc(studio.email)}.</p></noscript>`;
      return html
        .replace('<!-- studio:testa -->', righe.join('\n    '))
        .replace('<!-- studio:noscript -->', noscript);
    },
  };
}

// `pnpm build` produce il sito da pubblicare (dist/); `pnpm anteprima` un unico file HTML (dist-anteprima/).
export default defineConfig(({ mode }) => {
  const anteprima = mode === 'anteprima';
  return {
    base: './',
    plugins: anteprima ? [react(), viteSingleFile(), pluginStudio(mode)] : [react(), pluginStudio(mode)],
    build: { outDir: anteprima ? 'dist-anteprima' : 'dist', emptyOutDir: true },
  };
});
