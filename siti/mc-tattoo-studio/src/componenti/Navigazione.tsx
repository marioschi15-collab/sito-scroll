// src/componenti/Navigazione.tsx — la barra in alto: marchio, voci (desktop), "Prenota" o "Menu",
// linea di avanzamento. Altezza fissa, non si nasconde mai; il tema segue la sezione che le passa sotto.
import type { MouseEvent, ReactElement } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { tipoGalleria } from '../dati/lavori.js';
import { studio } from '../dati/studio.js';
import { EASE_RAPIDA, MEDIA, MOLLA_LAYOUT, SEGUI_AVANZAMENTO } from '../movimento/costanti.js';
import { useMovimentoRidotto } from '../movimento/useMovimentoRidotto.js';
import { useInterfaccia } from '../stato/StatoPagina.js';
import { scorriA } from '../utilita/scorri.js';
import { useMedia } from '../utilita/useMedia.js';
import { useSezioneAttiva } from '../utilita/useSezioneAttiva.js';
import { useTemaSottoBarra } from '../utilita/useTemaSottoBarra.js';
import { Pulsante } from './Pulsante.js';
import '../stili/navigazione.css';

export interface PropsNavigazione {
  /** true quando la scheda di un disegno è aperta. */
  inerte: boolean;
}

interface Voce {
  id: string;
  testo: string;
}

/** Le voci della barra su desktop, in quest'ordine. */
const VOCI: readonly Voce[] = [
  { id: 'studio', testo: 'Studio' },
  { id: 'galleria', testo: tipoGalleria === 'lavori' ? 'Lavori' : 'Disegni' },
  { id: 'come-funziona', testo: 'Come funziona' },
  { id: 'domande', testo: 'Domande' },
  { id: 'contatti', testo: 'Contatti' },
];

/** Tutte le sezioni osservate: con "stili" e "prenota" attive non c'è nessun indicatore. */
const SEZIONI_OSSERVATE: readonly string[] = [
  'studio',
  'stili',
  'galleria',
  'come-funziona',
  'domande',
  'prenota',
  'contatti',
];

/** Altezze della barra in px (le stesse di --altezza-barra in token.css). */
const ALTEZZA_BARRA = { telefono: 56, desktop: 64 } as const;

export function Navigazione({ inerte }: PropsNavigazione): ReactElement {
  const desktop = useMedia(MEDIA.desktop);
  const ridotto = useMovimentoRidotto();
  const { menuAperto, impostaMenuAperto, rifPulsanteMenu } = useInterfaccia();
  const attiva = useSezioneAttiva(SEZIONI_OSSERVATE);
  const tema = useTemaSottoBarra(desktop ? ALTEZZA_BARRA.desktop : ALTEZZA_BARRA.telefono);

  const { scrollYProgress } = useScroll();
  const avanzamentoMorbido = useSpring(scrollYProgress, SEGUI_AVANZAMENTO);
  const avanzamento = ridotto ? scrollYProgress : avanzamentoMorbido;

  const vaiA = (id: string) => (evento: MouseEvent<HTMLAnchorElement>) => {
    evento.preventDefault();
    scorriA(id);
  };

  const tornaAllInizio = (evento: MouseEvent<HTMLAnchorElement>): void => {
    evento.preventDefault();
    if (menuAperto) {
      // Con il menu aperto la pagina è bloccata: prima si chiude, poi si scorre.
      impostaMenuAperto(false);
      requestAnimationFrame(() => scorriA('inizio', { fuoco: 'nessuno' }));
      return;
    }
    scorriA('inizio', { fuoco: 'nessuno' });
  };

  const testoMenu = menuAperto ? 'Chiudi' : 'Menu';

  return (
    // layoutRoot: l'indicatore della voce attiva si misura rispetto alla barra fissa, non alla pagina che scorre.
    <motion.header
      className="navigazione"
      data-tema={menuAperto ? 'nero' : tema}
      inert={inerte}
      layoutRoot
    >
      <div className="navigazione__interno contenitore">
        <a
          className="navigazione__marchio"
          href="#inizio"
          aria-label={`${studio.nome}, torna all'inizio`}
          onClick={tornaAllInizio}
        >
          <span className="navigazione__mc">{studio.marchio}</span>
          <span className="navigazione__sotto t-etichetta">{studio.sottomarchio}</span>
        </a>

        {desktop ? (
          <nav className="navigazione__voci" aria-label="Sezioni della pagina">
            <ul className="navigazione__elenco">
              {VOCI.map((voce) => {
                const corrente = attiva === voce.id;
                return (
                  <li key={voce.id} className="navigazione__elemento">
                    <a
                      href={`#${voce.id}`}
                      className="navigazione__voce t-etichetta"
                      aria-current={corrente ? 'true' : undefined}
                      onClick={vaiA(voce.id)}
                    >
                      {voce.testo}
                      {corrente ? (
                        <motion.span
                          layoutId="voce-attiva"
                          className="navigazione__indicatore"
                          transition={MOLLA_LAYOUT}
                        />
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        {desktop ? (
          <Pulsante
            variante="primario"
            dimensione="piccola"
            href="#prenota"
            icona="freccia-destra"
            className="navigazione__prenota"
            onClick={vaiA('prenota')}
          >
            Prenota
          </Pulsante>
        ) : (
          <button
            ref={rifPulsanteMenu}
            type="button"
            className="navigazione__menu t-etichetta"
            aria-expanded={menuAperto}
            aria-controls="menu-telefono"
            onClick={() => impostaMenuAperto(!menuAperto)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={testoMenu}
                className="navigazione__menu-testo"
                initial={{ opacity: 0, y: ridotto ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: ridotto ? 0 : -8 }}
                transition={{ duration: 0.15, ease: EASE_RAPIDA }}
              >
                {testoMenu}
              </motion.span>
            </AnimatePresence>
          </button>
        )}
      </div>
      <motion.div className="navigazione__avanzamento" style={{ scaleX: avanzamento }} aria-hidden="true" />
    </motion.header>
  );
}
