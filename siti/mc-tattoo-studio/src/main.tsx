import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './stili/token.css';
import './stili/base.css';
import { App } from './App.js';

const radice = document.getElementById('radice');
if (!radice) throw new Error('Manca l’elemento #radice in index.html');
createRoot(radice).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
