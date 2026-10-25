// src/componenti/PiePagina.tsx — il piè di pagina: marchio gigante a contorno che sale dalla maschera,
// riga legale e "Torna su". Lo spazio in fondo tiene libera la zona della barra "Prenota" del telefono.
import type { MouseEvent, ReactElement } from 'react';
import { motion } from 'motion/react';
import { studio } from '../dati/studio.js';
import { DURATA, EASE_USCITA } from '../movimento/costanti.js';
import { useMovimentoRidotto } from '../movimento/useMovimentoRidotto.js';
import { scorriA } from '../utilita/scorri.js';
import { Icona } from './Icona.js';
import '../stili/pie.css';

function tornaSu(evento: MouseEvent<HTMLAnchorElement>): void {
  evento.preventDefault();
  scorriA('inizio', { fuoco: 'nessuno' });
  // Il focus va al marchio della barra, così chi usa la tastiera riparte dall'inizio.
  document.querySelector<HTMLElement>('.navigazione__marchio')?.focus({ preventScroll: true });
}

export function PiePagina(): ReactElement {
  const ridotto = useMovimentoRidotto();
  const anno = new Date().getFullYear();
  return (
    <footer className="pie" data-sezione data-tema="nero">
      <div className="contenitore">
        <div className="pie__maschera" aria-hidden="true">
          <motion.p
            className="pie__marchio"
            initial={ridotto ? false : { y: '40%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: DURATA.marchio, ease: EASE_USCITA }}
          >
            {studio.marchio}
          </motion.p>
        </div>
        <div className="pie__riga">
          <p className="t-piccolo">{`© ${anno} ${studio.nome} · P. IVA ${studio.partitaIva}`}</p>
          <p className="t-piccolo">Questo sito non usa cookie e non salva i dati che inserisci nel modulo.</p>
          <a className="pie__su t-etichetta" href="#inizio" onClick={tornaSu}>
            Torna su <Icona nome="freccia-su" />
          </a>
        </div>
      </div>
      <div className="pie__spazio" aria-hidden="true" />
    </footer>
  );
}
