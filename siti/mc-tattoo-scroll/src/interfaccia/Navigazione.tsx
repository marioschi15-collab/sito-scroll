// src/interfaccia/Navigazione.tsx — la barra in alto (marchio, capitolo attuale, Prenota, Indice)
// e l'indice a tutto schermo che porta a ogni capitolo.
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRegia } from '../regia/Regia.js';
import { CAPITOLI } from '../regia/capitoli.js';

const CURVA = [0.76, 0, 0.24, 1] as const;

export function Navigazione(): ReactElement {
  const { attivo, vai, blocca } = useRegia();
  const [aperto, setAperto] = useState(false);
  const bottone = useRef<HTMLButtonElement>(null);
  const primo = useRef<HTMLButtonElement>(null);
  const cap = CAPITOLI[attivo] ?? CAPITOLI[0]!;

  useEffect(() => {
    blocca(aperto);
    if (aperto) primo.current?.focus();
  }, [aperto, blocca]);

  useEffect(() => {
    if (!aperto) return;
    const suTasto = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setAperto(false);
        bottone.current?.focus();
      }
    };
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [aperto]);

  const salta = (id: string): void => {
    setAperto(false);
    blocca(false);
    vai(id);
  };

  return (
    <>
      <header className={`navigazione${aperto ? ' navigazione--aperta' : ''}`}>
        <button type="button" className="navigazione__marchio" onClick={() => salta('prologo')} aria-label="M.C. Tattoo Studio, torna all’inizio">
          <span className="navigazione__mc">M.C.</span>
          <span className="navigazione__sotto etichetta">Tattoo Studio</span>
        </button>

        <div className="navigazione__capitolo etichetta" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={cap.id}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {cap.numero ? `${cap.numero} — ` : ''}
              {cap.titolo}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="navigazione__destra">
          <button type="button" className="navigazione__prenota" onClick={() => salta('finale')}>
            Prenota
          </button>
          <button
            ref={bottone}
            type="button"
            className="navigazione__indice"
            aria-expanded={aperto}
            aria-controls="indice"
            onClick={() => setAperto((a) => !a)}
          >
            <span className="etichetta">{aperto ? 'Chiudi' : 'Indice'}</span>
            <span className="navigazione__righe" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {aperto ? (
          <motion.div
            id="indice"
            className="indice"
            role="dialog"
            aria-modal="true"
            aria-label="Indice dei capitoli"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.8, ease: CURVA }}
          >
            <ol className="indice__lista">
              {CAPITOLI.map((c, i) => (
                <motion.li
                  key={c.id}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.25 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    ref={i === 0 ? primo : undefined}
                    type="button"
                    className={`indice__voce${i === attivo ? ' indice__voce--attiva' : ''}`}
                    onClick={() => salta(c.id)}
                  >
                    <span className="indice__numero etichetta">{c.numero || '—'}</span>
                    <span className="indice__titolo">{c.titolo}</span>
                  </button>
                </motion.li>
              ))}
            </ol>
            <p className="indice__piede etichetta">Storia di un segno — M.C. Tattoo Studio</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
