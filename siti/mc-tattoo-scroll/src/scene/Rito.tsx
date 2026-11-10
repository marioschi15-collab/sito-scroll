// src/scene/Rito.tsx — Capitolo VII, "Tre passi": quanto è facile arrivare da noi. Un grande numero
// scorre come un rullino, il passo cambia, una linea si riempie. Alla fine, il pulsante per cominciare.
import type { ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Finestra } from '../movimento/Finestra.js';
import { TestaCapitolo } from './TestaCapitolo.js';
import { useRegia } from '../regia/Regia.js';

const PASSI = [
  { titolo: 'Scrivici', breve: 'Due minuti', testo: 'Due righe su WhatsApp: cosa vorresti e dove. Ti rispondiamo di persona, non con un messaggio automatico.' },
  { titolo: 'Vieni a trovarci', breve: 'Senza impegno', testo: 'La consulenza in studio: guardiamo insieme disegno, misura e posizione. Esci con un preventivo chiaro.' },
  { titolo: 'Il tuo giorno', breve: 'Con calma', testo: 'La seduta, al tuo ritmo. Torni a casa con il tuo segno e con le istruzioni per curarlo.' },
] as const;

const INIZIO = 0.1;
const PASSO = 0.26;

export function Rito(): ReactElement {
  return <Scena id="rito">{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const { vai } = useRegia();
  const n = PASSI.length;
  const rullo = useTransform(p, (v) => {
    const k = Math.min(n - 1, Math.max(0, (v - INIZIO) / PASSO - 0.15));
    // Scatta da un numero all'altro con una breve corsa.
    const intero = Math.floor(k);
    const resto = k - intero;
    const t = resto < 0.7 ? 0 : (resto - 0.7) / 0.3;
    return `${(-(intero + t * t * (3 - 2 * t)) * 100) / n}%`;
  });
  const linea = useTransform(p, [INIZIO, INIZIO + PASSO * n], [0, 1]);
  const giro = useTransform(p, [0, 1], [0, 200]);

  const invito = (
    <button type="button" className="pulsante pulsante--pieno rito__vai" onClick={() => vai('finale')}>
      <span>Comincia dal primo passo</span>
      <span className="pulsante__freccia" aria-hidden="true">→</span>
    </button>
  );

  if (ridotto) {
    return (
      <div className="rito rito--ridotto">
        <TestaCapitolo numero="VII" titolo="Tre passi" p={p} ridotto />
        <ol className="rito__lista">
          {PASSI.map((s, i) => (
            <li key={s.titolo}>
              <span className="rito__mini">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.titolo}</h3>
              <p>{s.testo}</p>
            </li>
          ))}
        </ol>
        {invito}
      </div>
    );
  }

  return (
    <div className="rito">
      <TestaCapitolo numero="VII" titolo="Tre passi e sei da noi" p={p} ridotto={false} className="rito__testa" />
      <div className="rito__numeri" aria-hidden="true">
        <motion.div className="rito__rullo" style={{ y: rullo }}>
          {PASSI.map((_, i) => (
            <span key={i}>{String(i + 1).padStart(2, '0')}</span>
          ))}
        </motion.div>
      </div>
      <ol className="rito__passi">
        {PASSI.map((s, i) => {
          const a = INIZIO + i * PASSO;
          const ultimo = i === n - 1;
          return (
            <Finestra key={s.titolo} as="li" p={p} entra={[a - 0.02, a + 0.05]} esce={ultimo ? undefined : [a + PASSO - 0.05, a + PASSO - 0.01]} sfoca className="rito__passo">
              <p className="rito__breve etichetta">{s.breve}</p>
              <h3 className="rito__titolo">{s.titolo}</h3>
              <p className="rito__descrizione">{s.testo}</p>
              {ultimo ? invito : null}
            </Finestra>
          );
        })}
      </ol>
      <div className="rito__linea" aria-hidden="true">
        <motion.span className="rito__riempi" style={{ scaleX: linea }} />
        {PASSI.map((s, i) => (
          <span key={s.titolo} className="rito__tacca" style={{ left: `${(i / (n - 1)) * 100}%` }}>
            <span className="etichetta">{s.titolo}</span>
          </span>
        ))}
      </div>
      <motion.svg className="rito__timbro" viewBox="0 0 200 200" style={{ rotate: giro }} aria-hidden="true">
        <defs>
          <path id="rito-giro" d="M100 22 A78 78 0 1 1 99.9 22" />
        </defs>
        <text className="rito__giro">
          <textPath href="#rito-giro">Senza impegno · Con calma · Su misura · Solo su appuntamento ·</textPath>
        </text>
        <circle cx="100" cy="100" r="14" className="rito__punto" />
      </motion.svg>
    </div>
  );
}
