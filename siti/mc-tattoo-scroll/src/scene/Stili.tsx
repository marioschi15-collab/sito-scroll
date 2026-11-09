// src/scene/Stili.tsx — Capitolo V, "Gli stili": una panoramica orizzontale. Ogni pannello ha il suo
// colore (la regia lo fonde con il successivo) e il suo disegno che si traccia quando arriva al centro.
import type { ComponentType, ReactElement } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Scena } from '../movimento/Scena.js';
import { DisegnoBlackwork, DisegnoDotwork, DisegnoFineLine, DisegnoGiapponese, DisegnoLettering } from '../arte/disegniStili.js';

interface Stile {
  nome: string;
  testo: string;
  ideale: string;
  Disegno: ComponentType<{ p: MotionValue<number>; className?: string }>;
}

const STILI: readonly Stile[] = [
  {
    nome: 'Giapponese',
    testo: 'Onde, carpe, fiori e vento: grandi composizioni che seguono il corpo e si leggono da lontano.',
    ideale: 'schiena, braccio, gamba',
    Disegno: DisegnoGiapponese,
  },
  {
    nome: 'Blackwork',
    testo: 'Neri pieni e geometrie nette. Contrasto forte, segno deciso, niente di superfluo.',
    ideale: 'avambraccio, polpaccio, coperture',
    Disegno: DisegnoBlackwork,
  },
  {
    nome: 'Fine line',
    testo: 'Linee sottili come un capello, per disegni piccoli, delicati e precisi.',
    ideale: 'polso, caviglia, nuca',
    Disegno: DisegnoFineLine,
  },
  {
    nome: 'Lettering',
    testo: 'Parole, date e nomi scritti a mano, con un carattere disegnato apposta per te.',
    ideale: 'costole, clavicola, avambraccio',
    Disegno: DisegnoLettering,
  },
  {
    nome: 'Dotwork',
    testo: 'Sfumature fatte di migliaia di punti: una profondità morbida, che invecchia con grazia.',
    ideale: 'spalla, coscia, schiena',
    Disegno: DisegnoDotwork,
  },
];

const INIZIO = 0.08;
const FINE = 0.92;
const centro = (i: number): number => INIZIO + (i / (STILI.length - 1)) * (FINE - INIZIO);

export function Stili(): ReactElement {
  return <Scena id="stili">{(p, ridotto) => <Contenuto p={p} ridotto={ridotto} />}</Scena>;
}

function Contenuto({ p, ridotto }: { p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const x = useTransform(p, [INIZIO, FINE], ['0vw', `-${(STILI.length - 1) * 100}vw`]);
  const barra = useTransform(p, [INIZIO, FINE], [0.0001, 1]);
  return (
    <div className="stili">
      <header className="stili__testa">
        <p className="etichetta">Capitolo V</p>
        <h2 className="stili__titolo">Gli stili</h2>
      </header>
      <motion.ol className="stili__binario" style={ridotto ? undefined : { x }}>
        {STILI.map((s, i) => (
          <Pannello key={s.nome} stile={s} i={i} p={p} ridotto={ridotto} />
        ))}
      </motion.ol>
      {!ridotto ? (
        <div className="stili__avanzamento" aria-hidden="true">
          <motion.span style={{ scaleX: barra }} />
        </div>
      ) : null}
    </div>
  );
}

function Pannello({ stile, i, p, ridotto }: { stile: Stile; i: number; p: MotionValue<number>; ridotto: boolean }): ReactElement {
  const c = centro(i);
  const disegno = useTransform(p, [c - 0.17, c + 0.02], [ridotto ? 1 : 0, 1]);
  const parallasse = useTransform(p, [c - 0.21, c + 0.21], ['14vw', '-14vw']);
  const testoY = useTransform(p, [c - 0.21, c, c + 0.21], [60, 0, -60]);
  const { Disegno } = stile;
  return (
    <li className={`stili__pannello stili__pannello--${i + 1}`}>
      <motion.div className="stili__info" style={ridotto ? undefined : { y: testoY }}>
        <p className="stili__indice etichetta">
          {String(i + 1).padStart(2, '0')} / {String(STILI.length).padStart(2, '0')}
        </p>
        <h3 className="stili__nome">{stile.nome}</h3>
        <p className="stili__descrizione">{stile.testo}</p>
        <p className="stili__ideale">
          <span className="etichetta">Ideale per</span> {stile.ideale}
        </p>
      </motion.div>
      <motion.div className="stili__disegno" style={ridotto ? undefined : { x: parallasse }}>
        <Disegno p={disegno} className="stili__svg" />
      </motion.div>
    </li>
  );
}
