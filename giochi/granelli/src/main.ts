import './stile.css';
import { avvia } from './gioco.js';

/**
 * Chi ospita la pagina può aggiornarla mentre qualcuno sta giocando: in quel caso chiede al gioco una fotografia
 * della partita e gliela restituisce alla ripartenza, così non si perde niente. Dove questo aggancio non c'è
 * (il file aperto con un doppio clic, un sito qualsiasi) si parte normalmente.
 */
interface Ospite {
  snapshot?: (fotografa: () => unknown) => void;
  ready?: (parti: (dati: unknown) => void) => void;
  data?: unknown;
}

const ospite = (window as unknown as { claude?: { hot?: Ospite } }).claude?.hot;

function parti(dati: unknown): void {
  const gioco = avvia(document.getElementById('app')!, dati);
  ospite?.snapshot?.(gioco.fotografa);
}

if (ospite?.ready) ospite.ready(parti);
else parti(ospite?.data ?? {});
