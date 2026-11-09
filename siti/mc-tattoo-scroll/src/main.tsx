import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/hanken-grotesk/latin-400.css';
import '@fontsource/hanken-grotesk/latin-500.css';
import '@fontsource/hanken-grotesk/latin-600.css';
import '@fontsource/caveat/latin-500.css';
import './stili/base.css';
import './stili/interfaccia.css';
import './stili/scene.css';
import { App } from './App.js';

const radice = document.getElementById('radice');
if (!radice) throw new Error('Manca l’elemento #radice in index.html');
createRoot(radice).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
