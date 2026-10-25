// src/componenti/BarraPrenota.tsx — la barra in basso del telefono: "Prenota una consulenza" e "WhatsApp".
// Compare quando il pulsante dell'apertura esce dallo schermo; sparisce su Prenota, con il menu e con la scheda.
import type { MouseEvent, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { urlWhatsAppRapido } from '../dati/studio.js';
import { MEDIA, MOLLA_BARRA, T_MICRO } from '../movimento/costanti.js';
import { useMovimentoRidotto } from '../movimento/useMovimentoRidotto.js';
import { useInterfaccia } from '../stato/StatoPagina.js';
import { scorriA } from '../utilita/scorri.js';
import { useMedia } from '../utilita/useMedia.js';
import { Pulsante } from './Pulsante.js';
import '../stili/navigazione.css';

function vaiAPrenota(evento: MouseEvent<HTMLAnchorElement>): void {
  evento.preventDefault();
  scorriA('prenota');
}

export function BarraPrenota(): ReactElement | null {
  const desktop = useMedia(MEDIA.desktop);
  const ridotto = useMovimentoRidotto();
  const { ctaAperturaVisibile, prenotaVisibile, menuAperto, schedaAperta } = useInterfaccia();

  const visibile = !ctaAperturaVisibile && !prenotaVisibile && !menuAperto && schedaAperta === null;

  if (desktop) return null;

  return createPortal(
    <AnimatePresence>
      {visibile ? (
        <motion.div
          key="barra-prenota"
          className="barra-prenota"
          data-tema="nero"
          initial={ridotto ? { opacity: 0 } : { y: '100%' }}
          animate={ridotto ? { opacity: 1 } : { y: 0 }}
          exit={ridotto ? { opacity: 0 } : { y: '100%' }}
          transition={ridotto ? T_MICRO : MOLLA_BARRA}
        >
          <Pulsante variante="primario" href="#prenota" className="barra-prenota__principale" onClick={vaiAPrenota}>
            Prenota una consulenza
          </Pulsante>
          <Pulsante
            variante="secondario"
            href={urlWhatsAppRapido}
            esterno
            iconaPrima="chat"
            className="barra-prenota__whatsapp"
            aria-label="Scrivici su WhatsApp (si apre in una nuova scheda)"
          >
            WhatsApp
          </Pulsante>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
