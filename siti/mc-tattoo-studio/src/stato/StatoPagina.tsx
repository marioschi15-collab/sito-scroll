// src/stato/StatoPagina.tsx — lo stato che collega le sezioni: indice degli stili → filtro della galleria,
// scheda del disegno → modulo, indice → domanda sui cover-up, visibilità della barra in basso.
// Due contesti separati: chi legge solo l'interfaccia non si ridisegna quando cambia il filtro.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { trovaLavoro } from '../dati/lavori.js';
import type { Stile } from '../dati/lavori.js';

export type Filtro = Stile | 'tutti';
export type SceltaStile = Stile | 'non-so';

export interface StatoRichiesta {
  filtro: Filtro;
  /** Diventa true al primo cambio di filtro: da quel momento i disegni che rientrano non si ritracciano. */
  filtroCambiato: boolean;
  impostaFiltro: (filtro: Filtro) => void;
  stile: SceltaStile | null;
  impostaStile: (stile: SceltaStile | null) => void;
  /** id di un Lavoro, oppure null. */
  disegnoScelto: string | null;
  /** Imposta disegnoScelto e lo stile del disegno. */
  scegliDisegno: (id: string) => void;
  togliDisegno: () => void;
}

export interface StatoInterfaccia {
  menuAperto: boolean;
  impostaMenuAperto: (aperto: boolean) => void;
  /** id del Lavoro mostrato nella scheda, oppure null. */
  schedaAperta: string | null;
  apriScheda: (id: string) => void;
  chiudiScheda: () => void;
  ctaAperturaVisibile: boolean;
  impostaCtaAperturaVisibile: (visibile: boolean) => void;
  prenotaVisibile: boolean;
  impostaPrenotaVisibile: (visibile: boolean) => void;
  domandeAperte: ReadonlySet<string>;
  alternaDomanda: (id: string) => void;
  apriDomanda: (id: string) => void;
  /** Il pulsante "Menu"/"Chiudi" della barra: serve alla trappola del focus del menu. */
  rifPulsanteMenu: RefObject<HTMLButtonElement | null>;
}

const ContestoRichiesta = createContext<StatoRichiesta | null>(null);
const ContestoInterfaccia = createContext<StatoInterfaccia | null>(null);

interface StatoFiltro {
  filtro: Filtro;
  cambiato: boolean;
}

export function StatoPagina({ children }: { children: ReactNode }): ReactElement {
  // ---------- Richiesta ----------
  const [statoFiltro, setStatoFiltro] = useState<StatoFiltro>({ filtro: 'tutti', cambiato: false });
  const [stile, setStile] = useState<SceltaStile | null>(null);
  const [disegnoScelto, setDisegnoScelto] = useState<string | null>(null);

  const impostaFiltro = useCallback((filtro: Filtro) => {
    // Rimettere lo stesso filtro non è un cambio.
    setStatoFiltro((prima) => (prima.filtro === filtro ? prima : { filtro, cambiato: true }));
  }, []);

  const impostaStile = useCallback((valore: SceltaStile | null) => setStile(valore), []);

  const scegliDisegno = useCallback((id: string) => {
    const lavoro = trovaLavoro(id);
    if (!lavoro) return;
    setDisegnoScelto(lavoro.id);
    setStile(lavoro.stile);
  }, []);

  // Lo stile resta: il cliente può volerlo comunque.
  const togliDisegno = useCallback(() => setDisegnoScelto(null), []);

  const richiesta = useMemo<StatoRichiesta>(
    () => ({
      filtro: statoFiltro.filtro,
      filtroCambiato: statoFiltro.cambiato,
      impostaFiltro,
      stile,
      impostaStile,
      disegnoScelto,
      scegliDisegno,
      togliDisegno,
    }),
    [statoFiltro, impostaFiltro, stile, impostaStile, disegnoScelto, scegliDisegno, togliDisegno],
  );

  // ---------- Interfaccia ----------
  const [menuAperto, setMenuAperto] = useState(false);
  const [schedaAperta, setSchedaAperta] = useState<string | null>(null);
  const [ctaAperturaVisibile, setCtaAperturaVisibile] = useState(true);
  const [prenotaVisibile, setPrenotaVisibile] = useState(false);
  const [domandeAperte, setDomandeAperte] = useState<ReadonlySet<string>>(() => new Set());
  const rifPulsanteMenu = useRef<HTMLButtonElement | null>(null);

  const impostaMenuAperto = useCallback((aperto: boolean) => setMenuAperto(aperto), []);
  const apriScheda = useCallback((id: string) => setSchedaAperta(id), []);
  const chiudiScheda = useCallback(() => setSchedaAperta(null), []);
  const impostaCtaAperturaVisibile = useCallback((visibile: boolean) => setCtaAperturaVisibile(visibile), []);
  const impostaPrenotaVisibile = useCallback((visibile: boolean) => setPrenotaVisibile(visibile), []);

  const alternaDomanda = useCallback((id: string) => {
    setDomandeAperte((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(id)) dopo.delete(id);
      else dopo.add(id);
      return dopo;
    });
  }, []);

  const apriDomanda = useCallback((id: string) => {
    setDomandeAperte((prima) => new Set(prima).add(id));
  }, []);

  const interfaccia = useMemo<StatoInterfaccia>(
    () => ({
      menuAperto,
      impostaMenuAperto,
      schedaAperta,
      apriScheda,
      chiudiScheda,
      ctaAperturaVisibile,
      impostaCtaAperturaVisibile,
      prenotaVisibile,
      impostaPrenotaVisibile,
      domandeAperte,
      alternaDomanda,
      apriDomanda,
      rifPulsanteMenu,
    }),
    [
      menuAperto,
      impostaMenuAperto,
      schedaAperta,
      apriScheda,
      chiudiScheda,
      ctaAperturaVisibile,
      impostaCtaAperturaVisibile,
      prenotaVisibile,
      impostaPrenotaVisibile,
      domandeAperte,
      alternaDomanda,
      apriDomanda,
    ],
  );

  return (
    <ContestoRichiesta.Provider value={richiesta}>
      <ContestoInterfaccia.Provider value={interfaccia}>{children}</ContestoInterfaccia.Provider>
    </ContestoRichiesta.Provider>
  );
}

export function useRichiesta(): StatoRichiesta {
  const valore = useContext(ContestoRichiesta);
  if (!valore) throw new Error('useRichiesta va usato dentro <StatoPagina>.');
  return valore;
}

export function useInterfaccia(): StatoInterfaccia {
  const valore = useContext(ContestoInterfaccia);
  if (!valore) throw new Error('useInterfaccia va usato dentro <StatoPagina>.');
  return valore;
}
