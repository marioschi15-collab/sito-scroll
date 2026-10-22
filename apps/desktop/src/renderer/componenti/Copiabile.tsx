import { useEffect, useState, type ReactNode } from 'react';
import { comuni, finestra } from '@spalla/it-copy';
import { Pulsante } from './Pulsante.js';

interface Props {
  etichetta: string;
  valore: string;
}

async function copia(testo: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(testo);
      return true;
    }
  } catch {
    // si prova la via vecchia qui sotto
  }
  try {
    const area = document.createElement('textarea');
    area.value = testo;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Una riga con un valore da copiare e il pulsante "Copia" (conferma "Copiato." per due secondi). */
export function Copiabile({ etichetta, valore }: Props): ReactNode {
  const [copiato, setCopiato] = useState(false);
  useEffect(() => {
    if (!copiato) return;
    const t = setTimeout(() => setCopiato(false), 2000);
    return () => clearTimeout(t);
  }, [copiato]);
  return (
    <div className="copiabile">
      <span className="attenuato piccolo">{etichetta}</span>
      <code>{valore}</code>
      <Pulsante
        piccolo
        aria-label={finestra.telegram.copia(etichetta.toLowerCase())}
        onClick={async () => {
          if (await copia(valore)) setCopiato(true);
        }}
      >
        {copiato ? comuni.pulsanti.copiato : comuni.pulsanti.copia}
      </Pulsante>
      <span className="solo-lettore" role="status">
        {copiato ? comuni.pulsanti.copiato : ''}
      </span>
    </div>
  );
}
