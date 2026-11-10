// src/App.tsx — l'ordine delle scene e gli strati d'interfaccia sopra la storia.
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { MotionConfig } from 'motion/react';
import { Regia, useRegia } from './regia/Regia.js';
import { ContestoPronto } from './regia/Pronto.js';
import { Precarica } from './interfaccia/Precarica.js';
import { Navigazione } from './interfaccia/Navigazione.js';
import { Hud } from './interfaccia/Hud.js';
import { Cursore } from './interfaccia/Cursore.js';
import { BarraPrenota } from './interfaccia/BarraPrenota.js';
import { Prologo } from './scene/Prologo.js';
import { Dubbi } from './scene/Dubbi.js';
import { Idea } from './scene/Idea.js';
import { Stencil } from './scene/Stencil.js';
import { Ago } from './scene/Ago.js';
import { Rosso } from './scene/Rosso.js';
import { Stili } from './scene/Stili.js';
import { Rito } from './scene/Rito.js';
import { Finale } from './scene/Finale.js';

export function App(): ReactElement {
  return (
    <MotionConfig reducedMotion="user">
      <Regia>
        <Pagina />
      </Regia>
    </MotionConfig>
  );
}

function Pagina(): ReactElement {
  const { ridotto, blocca } = useRegia();
  const [pronto, setPronto] = useState(ridotto);
  const fine = useCallback(() => setPronto(true), []);

  useEffect(() => {
    if (ridotto) setPronto(true);
  }, [ridotto]);

  // Durante il sipario la pagina non scorre; si torna sempre all'inizio della storia.
  useEffect(() => {
    if (pronto) {
      blocca(false);
      return;
    }
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    blocca(true);
  }, [pronto, blocca]);

  return (
    <ContestoPronto.Provider value={pronto}>
      <a className="salta" href="#finale">
        Vai alla prenotazione
      </a>
      <div className="fondale" aria-hidden="true" />
      <Navigazione />
      <main>
        <Prologo />
        <Dubbi />
        <Idea />
        <Stencil />
        <Ago />
        <Rosso />
        <Stili />
        <Rito />
        <Finale />
      </main>
      <Hud />
      {pronto ? <BarraPrenota /> : null}
      <Cursore />
      {!pronto && !ridotto ? <Precarica onFine={fine} /> : null}
    </ContestoPronto.Provider>
  );
}
