// src/componenti/MenuTelefono.tsx — il menu a schermo pieno sotto i 1024 px.
// Sta in un portale su <body>, sotto la barra in alto (che resta visibile con "Chiudi").
import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, stagger } from 'motion/react';
import type { Variants } from 'motion/react';
import { tipoGalleria } from '../dati/lavori.js';
import { studio, urlWhatsAppRapido } from '../dati/studio.js';
import { EASE_USCITA, EASE_VIA, MEDIA, SPOSTA, STAGGER } from '../movimento/costanti.js';
import { useInterfaccia } from '../stato/StatoPagina.js';
import { useBloccaPagina } from '../utilita/bloccaPagina.js';
import { scorriA } from '../utilita/scorri.js';
import { useMedia } from '../utilita/useMedia.js';
import { useTrappolaFuoco } from '../utilita/useTrappolaFuoco.js';
import { Pulsante } from './Pulsante.js';
import '../stili/navigazione.css';

interface Voce {
  id: string;
  testo: string;
}

/** Le voci del menu, in quest'ordine. */
const VOCI: readonly Voce[] = [
  { id: 'studio', testo: 'Studio' },
  { id: 'stili', testo: 'Stili' },
  { id: 'galleria', testo: tipoGalleria === 'lavori' ? 'Lavori' : 'Disegni' },
  { id: 'come-funziona', testo: 'Come funziona' },
  { id: 'domande', testo: 'Domande' },
  { id: 'contatti', testo: 'Contatti' },
];

/**
 * Il pannello sfuma e guida l'entrata scaglionata delle voci e del blocco azioni
 * (equivale a staggerChildren: STAGGER.menu, delayChildren: 0.08). In uscita sfuma solo il pannello.
 */
const VARIANTI_PANNELLO: Variants = {
  nascosto: { opacity: 0 },
  visibile: {
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: EASE_USCITA,
      delayChildren: stagger(STAGGER.menu, { startDelay: 0.08 }),
    },
  },
  uscita: { opacity: 0, transition: { duration: 0.2, ease: EASE_VIA } },
};

const VARIANTI_VOCE: Variants = {
  nascosto: { opacity: 0, y: SPOSTA.menu },
  visibile: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_USCITA } },
};

const NUOVA_SCHEDA = <span className="sr-only"> (si apre in una nuova scheda)</span>;

export function MenuTelefono(): ReactElement | null {
  const desktop = useMedia(MEDIA.desktop);
  const { menuAperto, impostaMenuAperto, rifPulsanteMenu } = useInterfaccia();
  const rifMenu = useRef<HTMLDivElement | null>(null);
  /** Dove andare dopo la chiusura; null = si torna su "Menu". */
  const rifDestinazione = useRef<string | null>(null);
  /** true dopo un'apertura: distingue la chiusura dal primo disegno. */
  const rifEraAperto = useRef(false);

  const aperto = menuAperto && !desktop;

  const chiudi = useCallback(() => {
    rifDestinazione.current = null;
    impostaMenuAperto(false);
  }, [impostaMenuAperto]);

  useBloccaPagina(aperto);
  useTrappolaFuoco(rifMenu, aperto, { extra: [rifPulsanteMenu], onEsc: chiudi });

  // Se la finestra arriva a 1024 px con il menu aperto, il menu si chiude da solo.
  useEffect(() => {
    if (desktop && menuAperto) impostaMenuAperto(false);
  }, [desktop, menuAperto, impostaMenuAperto]);

  // Dopo la chiusura. Le pulizie degli effetti (blocco della pagina) girano prima di questo effetto,
  // e l'inert della pagina è già stato tolto: si può scorrere e mettere il focus.
  useEffect(() => {
    if (menuAperto) {
      rifEraAperto.current = true;
      return;
    }
    if (!rifEraAperto.current) return;
    rifEraAperto.current = false;
    const destinazione = rifDestinazione.current;
    rifDestinazione.current = null;
    if (destinazione) scorriA(destinazione);
    else rifPulsanteMenu.current?.focus();
  }, [menuAperto, rifPulsanteMenu]);

  const vaiA = (id: string) => (evento: MouseEvent<HTMLAnchorElement>) => {
    evento.preventDefault();
    rifDestinazione.current = id;
    impostaMenuAperto(false);
  };

  if (desktop) return null;

  return createPortal(
    <AnimatePresence>
      {menuAperto ? (
        <motion.div
          key="menu-telefono"
          ref={rifMenu}
          id="menu-telefono"
          className="menu-telefono"
          data-tema="nero"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          variants={VARIANTI_PANNELLO}
          initial="nascosto"
          animate="visibile"
          exit="uscita"
        >
          {/* nav e ul non sono motion: così voci e azioni sono figli diretti del pannello e si scaglionano insieme. */}
          <nav className="menu-telefono__nav" aria-label="Sezioni della pagina">
            <ul className="menu-telefono__elenco">
              {VOCI.map((voce) => (
                <li key={voce.id}>
                  <motion.a
                    className="menu-telefono__voce"
                    href={`#${voce.id}`}
                    variants={VARIANTI_VOCE}
                    onClick={vaiA(voce.id)}
                  >
                    {voce.testo}
                  </motion.a>
                </li>
              ))}
            </ul>
          </nav>
          <motion.div className="menu-telefono__azioni" variants={VARIANTI_VOCE}>
            <Pulsante variante="primario" larga href="#prenota" onClick={vaiA('prenota')}>
              Prenota una consulenza
            </Pulsante>
            <p className="menu-telefono__rapidi t-etichetta">
              <a
                className="menu-telefono__rapido"
                href={urlWhatsAppRapido}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp{NUOVA_SCHEDA}
              </a>
              <span aria-hidden="true"> · </span>
              <a
                className="menu-telefono__rapido"
                href={studio.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram{NUOVA_SCHEDA}
              </a>
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
