// src/scene/Finale.tsx — Capitolo VII, "Il tuo segno": l'invito a prenotare, i contatti e il piè di
// pagina con il grande marchio.
import type { ReactElement } from 'react';
import { motion } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Rivela } from '../movimento/Rivela.js';
import { Magnetico } from '../interfaccia/Magnetico.js';
import { Nastro } from '../interfaccia/Nastro.js';
import { indirizzoCompleto, studio, urlEmail, urlMappa, urlWhatsApp } from '../dati/studio.js';
import { useRegia } from '../regia/Regia.js';

export function Finale(): ReactElement {
  return <Scena id="finale">{() => <Contenuto />}</Scena>;
}

function Contenuto(): ReactElement {
  const { vai } = useRegia();
  const anno = new Date().getFullYear();
  return (
    <div className="finale">
      <Nastro testo="Prenota la tua consulenza ● Solo su appuntamento ● Disegni su misura ● " />

      <div className="finale__invito">
        <p className="etichetta finale__capitolo">Capitolo VII — Il tuo segno</p>
        <h2 className="finale__titolo">
          <Rivela testo={'Il prossimo segno\nè il tuo.'} rosso={['tuo']} corsivo={['tuo']} />
        </h2>
        <p className="finale__sotto">
          Raccontaci la tua idea: ti rispondiamo di persona e fissiamo insieme una consulenza, senza impegno.
        </p>
        <div className="finale__pulsanti">
          <Magnetico href={urlWhatsApp} esterno className="pulsante pulsante--pieno">
            <span>Scrivici su WhatsApp</span>
            <span className="pulsante__freccia" aria-hidden="true">→</span>
          </Magnetico>
          <Magnetico href={urlEmail} className="pulsante">
            <span>Mandaci una email</span>
            <span className="pulsante__freccia" aria-hidden="true">→</span>
          </Magnetico>
        </div>
      </div>

      <div className="finale__info">
        <section aria-labelledby="dove">
          <h3 id="dove" className="etichetta">Dove</h3>
          <p>{indirizzoCompleto}</p>
          <a href={urlMappa} target="_blank" rel="noopener noreferrer" className="collegamento">
            Apri la mappa
          </a>
        </section>
        <section aria-labelledby="orari">
          <h3 id="orari" className="etichetta">Orari</h3>
          <dl className="finale__orari">
            {studio.orari.map((o) => (
              <div key={o.giorno}>
                <dt>{o.giorno}</dt>
                <dd>{o.orario}</dd>
              </div>
            ))}
          </dl>
          <p className="finale__nota">Solo su appuntamento.</p>
        </section>
        <section aria-labelledby="contatti">
          <h3 id="contatti" className="etichetta">Contatti</h3>
          <p>
            <a href={`tel:${studio.telefono.tel}`} className="collegamento">{studio.telefono.leggibile}</a>
          </p>
          <p>
            <a href={`mailto:${studio.email}`} className="collegamento">{studio.email}</a>
          </p>
          <p>
            <a href={studio.instagram.url} target="_blank" rel="noopener noreferrer" className="collegamento">
              Instagram @{studio.instagram.utente}
            </a>
          </p>
        </section>
      </div>

      <footer className="piede">
        <motion.p
          className="piede__marchio"
          aria-label={studio.nome}
          initial="nascosto"
          whileInView="visibile"
          viewport={{ once: true, amount: 0.25 }}
        >
          {['M', '.', 'C', '.'].map((c, i) => (
            <span key={i} className="piede__maschera" aria-hidden="true">
              <motion.span
                className={i % 2 ? 'piede__punto' : undefined}
                variants={{
                  nascosto: { y: '105%' },
                  visibile: { y: '0%', transition: { duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 } },
                }}
              >
                {c}
              </motion.span>
            </span>
          ))}
        </motion.p>
        <div className="piede__riga">
          <p>© {anno} {studio.nome} · P. IVA {studio.partitaIva}</p>
          {studio.datiDiProva ? <p className="piede__prova">Indirizzo, contatti e orari sono dati di prova.</p> : null}
          <button type="button" className="collegamento" onClick={() => vai('prologo')}>
            Torna all’inizio ↑
          </button>
        </div>
      </footer>
    </div>
  );
}
