import { useEffect, useRef, useState, type ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';
import { spalla } from '../stato/api.js';
import { Pulsante } from './Pulsante.js';
import '@xterm/xterm/css/xterm.css';

interface Props {
  etichetta: string;
}

/** Sequenze di controllo del terminale (colori, cursore, collegamenti OSC 8): via, per cercare i link nel testo. */
const CONTROLLI = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b[@-Z\\-_]/g;
const URL_IN_TESTO = /https?:\/\/[^\s"'<>\x1b\x07]+/g;
/** Il link del /login: solo i domini di Anthropic (claude.ai, claude.com, anthropic.com). */
const DOMINI_LOGIN = /^https:\/\/([a-z0-9-]+\.)*(claude\.ai|claude\.com|anthropic\.com)(\/|$)/i;
const MEMORIA_USCITA = 16 * 1024;

/** L'ultimo link di accesso comparso nell'uscita del pannello (anche se il terminale l'ha spezzato su più righe). */
export function ultimoLinkDiAccesso(uscita: string): string | undefined {
  const pulita = uscita.replace(CONTROLLI, '').replace(/\r/g, '');
  const trovati = [...pulita.matchAll(URL_IN_TESTO)].map((m) => m[0].replace(/[).,;]+$/, ''));
  return trovati.reverse().find((u) => DOMINI_LOGIN.test(u));
}

/** Ctrl+Maiusc+C (Windows/Linux) o Cmd+C (Mac): copia la selezione. Senza menu Modifica Ctrl+C andrebbe al programma. */
export function eTastoCopia(e: Pick<KeyboardEvent, 'type' | 'key' | 'ctrlKey' | 'shiftKey' | 'metaKey'>): boolean {
  return e.type === 'keydown' && e.key.toLowerCase() === 'c' && ((e.ctrlKey && e.shiftKey) || e.metaKey);
}

/**
 * Pannello terminale per il /login del binario: xterm.js nella finestra, node-pty nel processo principale.
 * I tasti vanno a `terminale.scrivi`, l'uscita arriva da `evento.terminaleDati`; al ridimensionamento si avvisa
 * il processo principale con righe e colonne. Le librerie si caricano solo quando il pannello è montato.
 * I link (anche OSC 8) si aprono nel browser di sistema con `app.apriLink`; il link di accesso si può anche copiare
 * con un pulsante, perché a volte il browser non si apre da solo.
 */
export function Terminale({ etichetta }: Props): ReactNode {
  const contenitore = useRef<HTMLDivElement>(null);
  const [link, setLink] = useState<string | undefined>(undefined);
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    const nodo = contenitore.current;
    if (!nodo) return;
    let smontato = false;
    const pulizie: Array<() => void> = [];
    let uscita = '';

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]);
      if (smontato) return;
      const api = spalla();
      const apri = (url: string): void => {
        if (/^https?:\/\//i.test(url)) void api.app.apriLink(url).catch(() => undefined);
      };
      const scuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 13,
        convertEol: false,
        theme: scuro ? { background: '#161412', foreground: '#f1ece4' } : { background: '#2b2622', foreground: '#faf7f2' },
        // Link OSC 8: niente conferma inglese di xterm né window.open (bloccato): browser di sistema.
        linkHandler: { activate: (_e, uri) => apri(uri) },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      // Link scritti come testo semplice: cliccabili (senza dipendenze in più, con l'API di xterm).
      const fornitore = term.registerLinkProvider({
        provideLinks(riga, callback) {
          const testo = term.buffer.active.getLine(riga - 1)?.translateToString(true) ?? '';
          const links = [...testo.matchAll(URL_IN_TESTO)].map((m) => {
            const x = (m.index ?? 0) + 1;
            return { text: m[0], range: { start: { x, y: riga }, end: { x: x + m[0].length - 1, y: riga } }, activate: (_e: MouseEvent, t: string) => apri(t) };
          });
          callback(links.length > 0 ? links : undefined);
        },
      });
      pulizie.push(() => fornitore.dispose());
      term.attachCustomKeyEventHandler((e) => {
        if (eTastoCopia(e)) {
          const selezione = term.getSelection();
          if (selezione) void navigator.clipboard?.writeText(selezione).catch(() => undefined);
          return false;
        }
        // Ctrl+Maiusc+V: lo gestisce il browser (incolla nel terminale), non il programma.
        if (e.type === 'keydown' && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') return false;
        return true;
      });
      term.open(nodo);

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

      const ascolto = term.onData((dati) => void api.terminale.scrivi(dati));
      pulizie.push(() => ascolto.dispose());
      pulizie.push(
        api.on.terminaleDati((dati) => {
          term.write(dati);
          uscita = (uscita + dati).slice(-MEMORIA_USCITA);
          const trovato = ultimoLinkDiAccesso(uscita);
          if (trovato) setLink((prima) => (prima === trovato ? prima : trovato));
        }),
      );
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

  async function copiaLink(): Promise<void> {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiato(true);
    } catch {
      setCopiato(false);
    }
  }

  return (
    <div className="terminale">
      <div className="terminale__etichetta">{etichetta}</div>
      {link ? (
        <div className="riga-azioni" style={{ marginBottom: 8 }}>
          <Pulsante piccolo onClick={() => void copiaLink()}>
            {finestra.terminale.copiaLink}
          </Pulsante>
          <Pulsante piccolo onClick={() => void spalla().app.apriLink(link).catch(() => undefined)}>
            {finestra.terminale.apriLink}
          </Pulsante>
          {copiato ? (
            <span className="attenuato piccolo" role="status">
              {finestra.terminale.linkCopiato}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="terminale__area" ref={contenitore} role="application" aria-label={etichetta} />
      <p className="attenuato piccolo" style={{ margin: '6px 0 0' }}>
        {finestra.terminale.suggerimentoCopia}
      </p>
    </div>
  );
}
