import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { SchermataIniziale, StatoApp } from '../../ipc/contratto.js';
import { messaggioErrore, spalla, spallaDisponibile } from './api.js';
import { finestra } from '@spalla/it-copy';

/** Sezioni dell'app (dopo S0). */
export type Sezione = 'chat' | 'squadra' | 'memoria' | 'telegram' | 'impostazioni' | 'presentazioni';

export interface Notifica {
  id: number;
  titolo?: string;
  testo: string;
  livello: 'info' | 'avviso' | 'errore' | 'ok';
}

export interface StatoStore {
  /** Stato dell'app dal processo principale; null finché non arriva. */
  stato: StatoApp | null;
  /** True finché la procedura iniziale (S0) non è finita. */
  inProcedura: boolean;
  passoIniziale: SchermataIniziale;
  sezione: Sezione;
  notifiche: Notifica[];
  /** Il rituale delle presentazioni è già stato avviato in questa finestra. */
  ritualeAvviato: boolean;
  /** Testo da mettere nella casella della chat quando ci si arriva da un'altra sezione. */
  bozzaChat?: string;
  erroreAvvio?: string;
}

type Azione =
  | { tipo: 'statoRicevuto'; stato: StatoApp; primaVolta: boolean }
  | { tipo: 'erroreAvvio'; messaggio: string }
  | { tipo: 'proceduraFinita' }
  | { tipo: 'vai'; sezione: Sezione; bozza?: string }
  | { tipo: 'bozzaConsumata' }
  | { tipo: 'notifica'; notifica: Omit<Notifica, 'id'> }
  | { tipo: 'chiudiNotifica'; id: number }
  | { tipo: 'ritualeAvviato'; valore: boolean };

let contatoreNotifiche = 0;

const INIZIALE: StatoStore = {
  stato: null,
  inProcedura: false,
  passoIniziale: 'chat',
  sezione: 'chat',
  notifiche: [],
  ritualeAvviato: false,
};

function riduttore(s: StatoStore, a: Azione): StatoStore {
  switch (a.tipo) {
    case 'statoRicevuto': {
      const base = { ...s, stato: a.stato, erroreAvvio: undefined };
      if (!a.primaVolta) return base;
      return { ...base, inProcedura: a.stato.schermataIniziale !== 'chat', passoIniziale: a.stato.schermataIniziale };
    }
    case 'erroreAvvio':
      return { ...s, erroreAvvio: a.messaggio };
    case 'proceduraFinita':
      return { ...s, inProcedura: false, sezione: 'chat' };
    case 'vai':
      return { ...s, sezione: a.sezione, bozzaChat: a.bozza };
    case 'bozzaConsumata':
      return { ...s, bozzaChat: undefined };
    case 'notifica':
      return { ...s, notifiche: [...s.notifiche.slice(-3), { id: ++contatoreNotifiche, ...a.notifica }] };
    case 'chiudiNotifica':
      return { ...s, notifiche: s.notifiche.filter((n) => n.id !== a.id) };
    case 'ritualeAvviato':
      return { ...s, ritualeAvviato: a.valore };
  }
}

export interface Store extends StatoStore {
  vai(sezione: Sezione, bozza?: string): void;
  bozzaConsumata(): void;
  notifica(n: Omit<Notifica, 'id'>): void;
  chiudiNotifica(id: number): void;
  proceduraFinita(): void;
  /** Rilegge lo stato dal processo principale. */
  aggiornaStato(): Promise<void>;
  segnaRitualeAvviato(valore: boolean): void;
}

const Contesto = createContext<Store | null>(null);

export function FornitoreStore({ children }: { children: ReactNode }): ReactNode {
  const [s, dispatch] = useReducer(riduttore, INIZIALE);

  const aggiornaStato = useCallback(async (primaVolta = false) => {
    if (!spallaDisponibile()) {
      dispatch({ tipo: 'erroreAvvio', messaggio: finestra.generale.senzaCollegamento });
      return;
    }
    try {
      const stato = await spalla().app.stato();
      dispatch({ tipo: 'statoRicevuto', stato, primaVolta });
    } catch (errore) {
      dispatch({ tipo: 'erroreAvvio', messaggio: messaggioErrore(errore, finestra.generale.errore) });
    }
  }, []);

  useEffect(() => {
    void aggiornaStato(true);
    if (!spallaDisponibile()) return;
    const api = spalla();
    const annulla = [
      api.on.statoApp((stato) => dispatch({ tipo: 'statoRicevuto', stato, primaVolta: false })),
      api.on.notifica((n) => dispatch({ tipo: 'notifica', notifica: { titolo: n.titolo, testo: n.testo, livello: n.livello } })),
    ];
    return () => annulla.forEach((f) => f());
  }, [aggiornaStato]);

  const valore = useMemo<Store>(
    () => ({
      ...s,
      vai: (sezione, bozza) => dispatch({ tipo: 'vai', sezione, bozza }),
      bozzaConsumata: () => dispatch({ tipo: 'bozzaConsumata' }),
      notifica: (n) => dispatch({ tipo: 'notifica', notifica: n }),
      chiudiNotifica: (id) => dispatch({ tipo: 'chiudiNotifica', id }),
      proceduraFinita: () => dispatch({ tipo: 'proceduraFinita' }),
      aggiornaStato: () => aggiornaStato(false),
      segnaRitualeAvviato: (valore) => dispatch({ tipo: 'ritualeAvviato', valore }),
    }),
    [s, aggiornaStato],
  );

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useStore(): Store {
  const c = useContext(Contesto);
  if (!c) throw new Error('useStore fuori da FornitoreStore');
  return c;
}
