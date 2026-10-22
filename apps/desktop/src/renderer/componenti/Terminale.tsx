import { useEffect, useRef, type ReactNode } from 'react';
import { spalla } from '../stato/api.js';
import '@xterm/xterm/css/xterm.css';

interface Props {
  etichetta: string;
}

/**
 * Pannello terminale per il /login del binario: xterm.js nella finestra, node-pty nel processo principale.
 * I tasti vanno a `terminale.scrivi`, l'uscita arriva da `evento.terminaleDati`; al ridimensionamento si avvisa
 * il processo principale con righe e colonne. Le librerie si caricano solo quando il pannello è montato.
 */
export function Terminale({ etichetta }: Props): ReactNode {
  const contenitore = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodo = contenitore.current;
    if (!nodo) return;
    let smontato = false;
    const pulizie: Array<() => void> = [];

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]);
      if (smontato) return;
      const scuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 13,
        convertEol: false,
        theme: scuro ? { background: '#1b1b1b' } : { background: '#1b1b1b' },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(nodo);
      const api = spalla();

      const adatta = (): void => {
        try {
          fit.fit();
          void api.terminale.ridimensiona(term.cols, term.rows);
        } catch {
          // il contenitore può non avere ancora dimensioni
        }
      };
      adatta();
      term.focus();

      pulizie.push(term.onData((dati) => void api.terminale.scrivi(dati)).dispose);
      pulizie.push(api.on.terminaleDati((dati) => term.write(dati)));
      const osservatore = new ResizeObserver(() => adatta());
      osservatore.observe(nodo);
      pulizie.push(() => osservatore.disconnect());
      pulizie.push(() => term.dispose());
    })();

    return () => {
      smontato = true;
      pulizie.forEach((p) => p());
    };
  }, []);

  return (
    <div className="terminale">
      <div className="terminale__etichetta">{etichetta}</div>
      <div className="terminale__area" ref={contenitore} role="application" aria-label={etichetta} />
    </div>
  );
}
