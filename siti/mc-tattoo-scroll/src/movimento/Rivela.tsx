// src/movimento/Rivela.tsx — titoli che salgono da sotto una linea invisibile, parola per parola,
// quando entrano in vista (oppure quando `pronto` diventa vero, con `subito`).
import type { ElementType, ReactElement } from 'react';
import { motion } from 'motion/react';

interface PropsRivela {
  testo: string;
  as?: ElementType;
  className?: string;
  ritardo?: number;
  subito?: boolean;
  pronto?: boolean;
  /** Parole in corsivo (confronto senza punteggiatura). */
  corsivo?: readonly string[];
  /** Parole in rosso. */
  rosso?: readonly string[];
}

const CURVA = [0.22, 1, 0.36, 1] as const;

export function Rivela({ testo, as: Tag = 'span', className, ritardo = 0, subito = false, pronto = true, corsivo = [], rosso = [] }: PropsRivela): ReactElement {
  const righe = testo.split('\n');
  let indice = 0;
  const comandi = subito
    ? { animate: pronto ? 'visibile' : 'nascosto' }
    : { whileInView: 'visibile', viewport: { once: true, amount: 0.35 } };
  return (
    <Tag className={className} aria-label={testo.replace(/\n/g, ' ')}>
      <motion.span className="rivela" initial="nascosto" {...comandi} aria-hidden="true">
        {righe.map((riga, r) => (
          <span className="rivela__riga" key={r}>
            {riga.split(' ').map((w, i) => {
              const k = indice++;
              const pulita = w.replace(/[.,;:!?«»“”]/g, '');
              const classi = ['rivela__parola', corsivo.includes(pulita) ? 'corsivo' : '', rosso.includes(pulita) ? 'in-rosso' : '']
                .filter(Boolean)
                .join(' ');
              return (
                <span className="rivela__maschera" key={i}>
                  <motion.span
                    className={classi}
                    variants={{
                      nascosto: { y: '115%', rotate: 5 },
                      visibile: { y: '0%', rotate: 0, transition: { duration: 1.15, ease: CURVA, delay: ritardo + k * 0.07 } },
                    }}
                  >
                    {w}
                  </motion.span>
                </span>
              );
            })}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
