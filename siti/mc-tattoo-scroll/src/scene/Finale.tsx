// src/scene/Finale.tsx — Capitolo VIII, "Prenota": tutto quello che serve per fare il passo. Il modulo
// che prepara il messaggio, le promesse dello studio, le recensioni (se ci sono), contatti e orari.
import type { ReactElement } from 'react';
import { motion } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { Rivela } from '../movimento/Rivela.js';
import { Nastro } from '../interfaccia/Nastro.js';
import { Richiesta } from '../interfaccia/Richiesta.js';
import { indirizzoCompleto, studio, urlEmail, urlMappa } from '../dati/studio.js';
import { useRegia } from '../regia/Regia.js';

export function Finale(): ReactElement {
  return <Scena id="finale">{() => <Contenuto />}</Scena>;
}

function Contenuto(): ReactElement {
  const { vai } = useRegia();
  const anno = new Date().getFullYear();
  return (
    <div className="finale">
      <Nastro testo={`${studio.promesse.join(' ● ')} ● `} />

      <div className="finale__invito">
        <div className="finale__parole">
          <p className="etichetta finale__capitolo">Capitolo VIII — Prenota</p>
          <h2 className="finale__titolo">
            <Rivela testo={'Il prossimo segno\nè il tuo.'} rosso={['tuo']} corsivo={['tuo']} />
          </h2>
          <p className="finale__sotto">
            Raccontaci la tua idea qui accanto: bastano trenta secondi. Fissiamo insieme una consulenza, senza impegno.
          </p>
          {studio.primaDataLibera ? (
            <p className="finale__data">
              <span className="finale__data-punto" aria-hidden="true" />
              Prima data libera: <strong>{studio.primaDataLibera}</strong>
            </p>
          ) : null}
          <ul className="finale__promesse">
            {studio.promesse.map((voce) => (
              <li key={voce}>{voce}</li>
            ))}
          </ul>
        </div>
        <Richiesta />
      </div>

      {studio.recensioni.length > 0 ? (
        <section className="finale__recensioni" aria-labelledby="recensioni">
          <h3 id="recensioni" className="etichetta">Chi è già passato da noi</h3>
          <ul>
            {studio.recensioni.map((r) => (
              <li key={r.nome + r.testo}>
                <blockquote>
                  <p className="corsivo">«{r.testo}»</p>
                  <footer>— {r.nome}</footer>
                </blockquote>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
          <h3 id="contatti" className="etichetta">Preferisci parlare?</h3>
          <p>
            <a href={`tel:${studio.telefono.tel}`} className="collegamento">{studio.telefono.leggibile}</a>
          </p>
          <p>
            <a href={urlEmail} className="collegamento">{studio.email}</a>
          </p>
          <p>
            <a href={studio.instagram.url} target="_blank" rel="noopener noreferrer" className="collegamento">
              Guarda i lavori su Instagram @{studio.instagram.utente}
            </a>
          </p>
        </section>
      </div>

      <footer className="piede">
        <motion.p className="piede__marchio" aria-label={studio.nome} initial="nascosto" whileInView="visibile" viewport={{ once: true, amount: 0.25 }}>
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
