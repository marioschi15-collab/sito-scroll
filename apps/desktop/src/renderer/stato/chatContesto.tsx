import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { finestra, onboarding as testiOnboarding } from '@spalla/it-copy';
import type { RichiestaPermesso } from '../../nucleo/contratti.js';
import { messaggioErrore, nuovoId, spalla, spallaDisponibile } from './api.js';
import { STATO_CHAT_INIZIALE, domandaInAttesa, riduttoreChat, type RichiestaPermessoVista, type StatoChat } from './chat.js';
import { useStore } from './store.js';

/**
 * La chat vive sopra le sezioni: cambiando sezione la conversazione resta e gli eventi continuano ad arrivare.
 * Qui si collegano gli eventi del processo principale al riduttore puro (`chat.ts`) e si guida il rituale delle
 * presentazioni: al primo avvio `onboarding.prepara()` e il messaggio iniziale come scambio `rituale: true`; quando lo
 * stato diventa `completato`, "Presentazioni concluse" e `onboarding.completa()` con gli eventuali problemi.
 */

export interface ApiChat {
  stato: StatoChat;
  /** Invia un messaggio; se c'è una domanda in attesa, il testo libero è la risposta a quella domanda. */
  invia(testo: string, allegati?: string[]): Promise<void>;
  rispondi(domandaId: string, scambioId: string, risposte: string[]): Promise<void>;
  /** Scelte toccate in una domanda a scelta multipla (restano anche se poi si scrive nella casella in fondo). */
  seleziona(domandaId: string, etichette: string[]): void;
  decidi(id: string, esito: 'consenti' | 'nega'): Promise<void>;
  nuovoArgomento(): Promise<void>;
  interrompi(): Promise<void>;
  /** Il pulsante fisso [Vai con i consigliati] è da mostrare (durante le presentazioni, dalla terza domanda). */
  mostraConsigliati: boolean;
  /** Riavvia il rituale delle presentazioni (dopo "Ricomincia"). */
  avviaRituale(): Promise<void>;
}

const Contesto = createContext<ApiChat | null>(null);

/** Solo i campi che servono alla scheda: niente input grezzo né segnali, che restano nel processo principale. */
export function vistaPermesso(r: RichiestaPermesso | RichiestaPermessoVista): RichiestaPermessoVista {
  return {
    id: r.id,
    strumento: r.strumento,
    descrizione: r.descrizione,
    canaleOrigine: r.canaleOrigine,
    creataIl: r.creataIl,
    ...(r.anteprima ? { anteprima: r.anteprima } : {}),
    ...(r.dettaglio ? { dettaglio: { tipo: r.dettaglio.tipo, testo: r.dettaglio.testo, troncato: r.dettaglio.troncato } } : {}),
    ...(r.spiegazione ? { spiegazione: r.spiegazione } : {}),
    ...(r.ruolo ? { ruolo: r.ruolo } : {}),
  };
}

/** Il chip "Vai con i consigliati" è già comparso in una domanda (docs/05 §1.7: da lì resta come pulsante fisso). */
export function consigliatiOfferti(stato: StatoChat): boolean {
  const etichetta = testiOnboarding.pulsantiFissi.vaiConsigliati;
  let risposte = 0;
  for (const b of stato.blocchi) {
    if (b.tipo !== 'domanda') continue;
    if (b.domanda.opzioni.some((o) => o.etichetta === etichetta)) return true;
    if (b.risposta) risposte += 1;
  }
  // Riserva: se l'assistente non lo offre come chip, il pulsante compare comunque dalla terza domanda.
  return risposte >= 2;
}

/** Dopo quante risposte il pulsante sparisce comunque: Q1–Q6, con Q5 e Q6 divise al massimo in tre riquadri ciascuna. */
const RISPOSTE_MASSIME_PROFILO = 10;

/** Il pulsante è già stato usato, oppure si è andati oltre le domande di profilo. */
export function consigliatiUsati(stato: StatoChat): boolean {
  const etichetta = testiOnboarding.pulsantiFissi.vaiConsigliati;
  let risposte = 0;
  for (const b of stato.blocchi) {
    if (b.tipo === 'utente' && b.testo.trim() === etichetta) return true;
    if (b.tipo !== 'domanda' || !b.risposta) continue;
    if (b.risposta.includes(etichetta)) return true;
    risposte += 1;
  }
  return risposte >= RISPOSTE_MASSIME_PROFILO;
}

export function FornitoreChat({ children }: { children: ReactNode }): ReactNode {
  const store = useStore();
  const [stato, dispatch] = useReducer(riduttoreChat, STATO_CHAT_INIZIALE);
  const statoRef = useRef(stato);
  statoRef.current = stato;
  const ritualeAvviato = useRef(false);
  const presentazioniChiuse = useRef(false);
  const onboardingStato = store.stato?.onboarding;
  const onboardingRef = useRef(onboardingStato);
  onboardingRef.current = onboardingStato;
  const { notifica, aggiornaStato, segnaRitualeAvviato } = store;

  const chiudiPresentazioni = useCallback(async () => {
    if (presentazioniChiuse.current) return;
    presentazioniChiuse.current = true;
    let problemi: string[] = [];
    try {
      problemi = await spalla().onboarding.completa();
    } catch (errore) {
      problemi = [messaggioErrore(errore, finestra.generale.errore)];
    }
    dispatch({
      tipo: 'sistema',
      testo: problemi.length > 0 ? `${finestra.chat.presentazioniConcluse} ${finestra.chat.presentazioniProblemi(problemi.length)}` : finestra.chat.presentazioniConcluse,
      ...(problemi.length > 0 ? { dettagli: problemi } : {}),
    });
    void aggiornaStato();
  }, [aggiornaStato]);

  // Eventi dal processo principale.
  useEffect(() => {
    if (!spallaDisponibile()) return;
    const api = spalla();
    const annulla = [
      api.on.eventoScambio(({ scambioId, evento }) => {
        if (evento.tipo === 'permesso') {
          dispatch({ tipo: 'permesso', richiesta: vistaPermesso(evento.richiesta) });
          return;
        }
        dispatch({ tipo: 'evento', scambioId, evento });
        if (evento.tipo === 'fine' && onboardingRef.current !== 'completato' && ritualeAvviato.current) {
          void api.onboarding
            .stato()
            .then((s) => {
              if (s === 'completato') void chiudiPresentazioni();
            })
            .catch(() => undefined);
        }
      }),
      api.on.domanda(({ scambioId, domanda }) => dispatch({ tipo: 'domanda', scambioId, domanda })),
      api.on.permesso(({ richiesta }) => dispatch({ tipo: 'permesso', richiesta: vistaPermesso(richiesta) })),
      api.on.permessoChiuso((id) => dispatch({ tipo: 'permessoChiuso', id })),
      api.on.domandaChiusa?.(({ id }) => dispatch({ tipo: 'domandaChiusa', domandaId: id })) ?? (() => undefined),
    ];
    void api.permessi
      .inAttesa()
      .then((elenco) => elenco.forEach((p) => dispatch({ tipo: 'permesso', richiesta: vistaPermesso(p.richiesta) })))
      .catch(() => undefined);
    return () => annulla.forEach((f) => f());
  }, [chiudiPresentazioni]);

  /** Avvia il rituale: `onboarding.prepara()` e il messaggio iniziale come scambio `rituale: true`. */
  const avviaRituale = useCallback(async () => {
    ritualeAvviato.current = true;
    presentazioniChiuse.current = false;
    segnaRitualeAvviato(true);
    const api = spalla();
    const scambioId = nuovoId();
    try {
      const { messaggioIniziale } = await api.onboarding.prepara();
      dispatch({ tipo: 'invia', scambioId, testo: messaggioIniziale, rituale: true });
      await api.chat.invia({ scambioId, testo: messaggioIniziale, canale: 'desktop', rituale: true });
    } catch (errore) {
      dispatch({ tipo: 'evento', scambioId, evento: { tipo: 'errore', messaggio: messaggioErrore(errore, finestra.generale.errore) } });
    }
  }, [segnaRitualeAvviato]);

  // Primo avvio: il rituale delle presentazioni parte da solo, una volta per finestra.
  const prontoPerRituale = !store.inProcedura && store.stato !== null && store.stato.onboarding !== 'completato';
  useEffect(() => {
    if (!prontoPerRituale || ritualeAvviato.current) return;
    ritualeAvviato.current = true;
    void avviaRituale();
  }, [prontoPerRituale, avviaRituale]);

  // Lo stato dell'app dice "completato" (per esempio dopo l'ultimo scambio del rituale).
  useEffect(() => {
    if (onboardingStato === 'completato' && ritualeAvviato.current) void chiudiPresentazioni();
  }, [onboardingStato, chiudiPresentazioni]);

  const rispondi = useCallback(
    async (domandaId: string, scambioId: string, risposte: string[]) => {
      dispatch({ tipo: 'rispostaData', domandaId, risposte });
      try {
        await spalla().chat.rispondi({ id: domandaId, scambioId, risposte });
      } catch (errore) {
        notifica({ testo: messaggioErrore(errore, finestra.generale.errore), livello: 'errore' });
      }
    },
    [notifica],
  );

  const invia = useCallback(
    async (testo: string, allegati?: string[]) => {
      const pulito = testo.trim();
      if (!pulito && !(allegati && allegati.length > 0)) return;
      const inAttesa = domandaInAttesa(statoRef.current);
      if (inAttesa && pulito) {
        // Le chip già toccate vanno insieme al testo: non si perdono scrivendo.
        await rispondi(inAttesa.domanda.id, inAttesa.scambioId, [...(inAttesa.selezione ?? []), pulito]);
        return;
      }
      const scambioId = nuovoId();
      dispatch({ tipo: 'invia', scambioId, testo: pulito, ...(allegati && allegati.length > 0 ? { allegati } : {}) });
      try {
        await spalla().chat.invia({ scambioId, testo: pulito, canale: 'desktop', ...(allegati && allegati.length > 0 ? { allegati } : {}) });
      } catch (errore) {
        dispatch({ tipo: 'evento', scambioId, evento: { tipo: 'errore', messaggio: messaggioErrore(errore, finestra.generale.errore) } });
      }
    },
    [rispondi],
  );

  const seleziona = useCallback((domandaId: string, etichette: string[]) => {
    dispatch({ tipo: 'selezione', domandaId, etichette });
  }, []);

  const decidi = useCallback(
    async (id: string, esito: 'consenti' | 'nega') => {
      dispatch({ tipo: 'decisionePresa', id, esito });
      try {
        await spalla().permessi.decidi(id, esito === 'consenti' ? { esito: 'consenti' } : { esito: 'nega', motivo: finestra.chat.permesso.motivoNegato });
      } catch (errore) {
        notifica({ testo: messaggioErrore(errore, finestra.generale.errore), livello: 'errore' });
      }
    },
    [notifica],
  );

  const nuovoArgomento = useCallback(async () => {
    try {
      await spalla().chat.nuovaSessione();
      dispatch({ tipo: 'nuovoArgomento', testo: finestra.chat.argomentoChiuso });
    } catch (errore) {
      notifica({ testo: messaggioErrore(errore, finestra.generale.errore), livello: 'errore' });
    }
  }, [notifica]);

  const interrompi = useCallback(async () => {
    const id = statoRef.current.scambioInCorso;
    if (!id) return;
    try {
      await spalla().chat.interrompi(id);
    } finally {
      dispatch({ tipo: 'interrotto', scambioId: id });
    }
  }, []);

  // Solo durante le domande di profilo (docs/05 §1.7, fino a Q6): via quando il rituale scrive [[FINE:PROFILO]],
  // quando il pulsante è già stato usato, o comunque dopo molte risposte (se l'assistente si scorda il marcatore).
  const mostraConsigliati =
    onboardingStato !== undefined &&
    onboardingStato !== 'completato' &&
    !presentazioniChiuse.current &&
    store.stato?.profiloCompletato !== true &&
    consigliatiOfferti(stato) &&
    !consigliatiUsati(stato);

  const valore = useMemo<ApiChat>(
    () => ({ stato, invia, rispondi, seleziona, decidi, nuovoArgomento, interrompi, mostraConsigliati, avviaRituale }),
    [stato, invia, rispondi, seleziona, decidi, nuovoArgomento, interrompi, mostraConsigliati, avviaRituale],
  );
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useChat(): ApiChat {
  const c = useContext(Contesto);
  if (!c) throw new Error('useChat fuori da FornitoreChat');
  return c;
}
