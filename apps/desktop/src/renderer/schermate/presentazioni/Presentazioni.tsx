import { useEffect, useState, type ReactNode } from 'react';
import { comuni, finestra, onboarding } from '@spalla/it-copy';
import type { RispostaOnboardingVista } from '../../../ipc/contratto.js';
import { Avviso } from '../../componenti/Avviso.js';
import { Pagina } from '../../componenti/Pagina.js';
import { Pulsante } from '../../componenti/Pulsante.js';
import { Scelte } from '../../componenti/Scelte.js';
import { messaggioErrore, spalla } from '../../stato/api.js';
import { useChat } from '../../stato/chatContesto.js';
import { useStore } from '../../stato/store.js';

type Ampiezza = 'presentazioni' | 'squadra' | 'tutto';

/** "Come mi sono presentato": le domande e le risposte del rituale, in sola lettura, e [Ricomincia] a tre ampiezze. */
export function Presentazioni(): ReactNode {
  const t = finestra.presentazioni;
  const r = onboarding.ricomincia;
  const { vai, notifica, aggiornaStato } = useStore();
  const { avviaRituale } = useChat();
  const [voci, setVoci] = useState<RispostaOnboardingVista[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [aperto, setAperto] = useState(false);
  const [ampiezza, setAmpiezza] = useState<Ampiezza>('presentazioni');
  const [conferma, setConferma] = useState('');
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    void spalla()
      .onboarding.risposte()
      .then(setVoci)
      .catch((e: unknown) => setErrore(messaggioErrore(e, finestra.generale.errore)));
  }, []);

  const confermato = ampiezza !== 'tutto' || conferma.trim().toLowerCase() === t.parolaCancella;

  async function ricomincia(): Promise<void> {
    if (!confermato) return;
    setInCorso(true);
    try {
      await spalla().onboarding.ricomincia(ampiezza);
      notifica({ testo: t.avviato, livello: 'ok' });
      await aggiornaStato();
      vai('chat');
      void avviaRituale();
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Pagina
      titolo={onboarding.riepilogo.comeMiSonoPresentato}
      sottotitolo={onboarding.riepilogo.sottotitolo}
      azioni={
        aperto ? null : (
          <Pulsante onClick={() => setAperto(true)} aria-expanded={aperto} aria-controls="ricomincia">
            {t.ricomincia}
          </Pulsante>
        )
      }
    >
      {errore ? (
        <Avviso livello="errore" onChiudi={() => setErrore(null)}>
          {errore}
        </Avviso>
      ) : null}

      {aperto ? (
        <section id="ricomincia" className="scheda" aria-labelledby="ricomincia-titolo">
          <h2 id="ricomincia-titolo">{r.titolo}</h2>
          <Scelte<Ampiezza>
            nome="ampiezza"
            legenda={r.domanda}
            opzioni={[
              { valore: 'presentazioni', etichetta: r.presentazioni.etichetta, nota: r.presentazioni.nota },
              { valore: 'squadra', etichetta: r.squadra.etichetta, nota: r.squadra.nota },
              { valore: 'tutto', etichetta: r.tutto.etichetta, nota: r.tutto.nota },
            ]}
            valore={ampiezza}
            onCambia={setAmpiezza}
          />
          {ampiezza === 'tutto' ? (
            <div className="campo">
              <label className="campo__etichetta" htmlFor="conferma-cancella">
                {t.confermaCancella}
              </label>
              <input id="conferma-cancella" className="ingresso" value={conferma} onChange={(e) => setConferma(e.target.value)} autoComplete="off" style={{ maxWidth: 220 }} />
            </div>
          ) : null}
          <p className="attenuato piccolo">{r.nota}</p>
          <div className="riga-azioni">
            <Pulsante variante={ampiezza === 'tutto' ? 'pericolo' : 'primario'} onClick={() => void ricomincia()} disabled={!confermato || inCorso}>
              {t.avvia}
            </Pulsante>
            <Pulsante onClick={() => setAperto(false)}>{comuni.pulsanti.annulla}</Pulsante>
          </div>
        </section>
      ) : null}

      {voci === null && !errore ? <p className="attenuato">{finestra.generale.caricamento}</p> : null}
      {voci && voci.length === 0 ? <p className="attenuato">{onboarding.riepilogo.vuoto}</p> : null}
      {voci && voci.length > 0 ? (
        <dl className="qa">
          {voci.map((v) => (
            <div key={v.id} className="qa__voce">
              <dt>{v.domanda}</dt>
              <dd>{v.risposta}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Pagina>
  );
}
