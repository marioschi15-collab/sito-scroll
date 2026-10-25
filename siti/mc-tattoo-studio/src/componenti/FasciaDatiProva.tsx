// src/componenti/FasciaDatiProva.tsx — pillola fissa che avvisa che i dati dello studio sono segnaposto.
// Sparisce da sola quando in src/dati/studio.ts si mette datiDiProva: false.
import type { ReactElement } from 'react';
import { studio } from '../dati/studio.js';
import { useInterfaccia } from '../stato/StatoPagina.js';
import '../stili/navigazione.css';

export function FasciaDatiProva(): ReactElement | null {
  const { menuAperto, schedaAperta } = useInterfaccia();
  if (!studio.datiDiProva) return null;
  // Con menu o scheda aperti la pillola coprirebbe la prima voce o il titolo: si nasconde finché restano aperti.
  if (menuAperto || schedaAperta !== null) return null;
  return <p className="fascia-prova t-piccolo">Dati di prova: indirizzo, telefono, email e orari sono finti.</p>;
}
