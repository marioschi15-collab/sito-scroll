// src/App.tsx — impostazioni globali di Motion, stato condiviso, ordine delle sezioni
// e blocco (inert) della pagina quando menu o scheda sono aperti.
import type { ReactElement } from 'react';
import { MotionConfig } from 'motion/react';
import { T_ENTRA } from './movimento/costanti.js';
import { StatoPagina, useInterfaccia } from './stato/StatoPagina.js';
import { SaltaAlContenuto } from './componenti/SaltaAlContenuto.js';
import { FasciaDatiProva } from './componenti/FasciaDatiProva.js';
import { Navigazione } from './componenti/Navigazione.js';
import { MenuTelefono } from './componenti/MenuTelefono.js';
import { BarraPrenota } from './componenti/BarraPrenota.js';
import { PiePagina } from './componenti/PiePagina.js';
import { Apertura } from './sezioni/Apertura.js';
import { Studio } from './sezioni/Studio.js';
import { Stili } from './sezioni/Stili.js';
import { Galleria } from './sezioni/Galleria.js';
import { ComeFunziona } from './sezioni/ComeFunziona.js';
import { Domande } from './sezioni/Domande.js';
import { Prenota } from './sezioni/Prenota.js';
import { Contatti } from './sezioni/Contatti.js';

export function App(): ReactElement {
  return (
    <MotionConfig reducedMotion="user" transition={T_ENTRA}>
      <StatoPagina>
        <Pagina />
      </StatoPagina>
    </MotionConfig>
  );
}

function Pagina(): ReactElement {
  const { menuAperto, schedaAperta } = useInterfaccia();
  const bloccata = menuAperto || schedaAperta !== null;
  return (
    <>
      <SaltaAlContenuto />
      <FasciaDatiProva />
      <Navigazione inerte={schedaAperta !== null} />
      <div className="pagina" inert={bloccata}>
        <main id="contenuto" tabIndex={-1}>
          <Apertura />
          <Studio />
          <Stili />
          <Galleria />
          <ComeFunziona />
          <Domande />
          <Prenota />
          <Contatti />
        </main>
        <PiePagina />
      </div>
      <MenuTelefono />
      <BarraPrenota />
    </>
  );
}
