// src/componenti/SaltaAlContenuto.tsx — "Vai al contenuto": il primo elemento raggiungibile con Tab.
// Invisibile finché non riceve il focus; porta il focus su <main>.
import type { MouseEvent, ReactElement } from 'react';
import { movimentoRidottoAttivo } from '../utilita/scorri.js';
import '../stili/navigazione.css';

function vaiAlContenuto(evento: MouseEvent<HTMLAnchorElement>): void {
  evento.preventDefault();
  const contenuto = document.getElementById('contenuto');
  if (!contenuto) return;
  contenuto.focus({ preventScroll: true });
  contenuto.scrollIntoView({ behavior: movimentoRidottoAttivo() ? 'auto' : 'smooth', block: 'start' });
}

export function SaltaAlContenuto(): ReactElement {
  return (
    <a className="salta t-etichetta" href="#contenuto" onClick={vaiAlContenuto}>
      Vai al contenuto
    </a>
  );
}
