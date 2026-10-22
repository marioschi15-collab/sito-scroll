import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';
import type { RuoloVista } from '../../../ipc/contratto.js';
import { Avviso } from '../../componenti/Avviso.js';
import { Interruttore } from '../../componenti/Interruttore.js';
import { Pagina } from '../../componenti/Pagina.js';
import { messaggioErrore, spalla } from '../../stato/api.js';

/** La squadra: una scheda per ruolo con interruttore, cosa fa da solo e per cosa chiede sempre. */
export function Squadra(): ReactNode {
  const [ruoli, setRuoli] = useState<RuoloVista[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCambio, setInCambio] = useState<string | null>(null);

  const carica = useCallback(async () => {
    try {
      setRuoli(await spalla().squadra.elenco());
      setErrore(null);
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    }
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function cambia(ruolo: RuoloVista, acceso: boolean): Promise<void> {
    setInCambio(ruolo.nome);
    try {
      if (acceso) await spalla().squadra.attiva(ruolo.nome);
      else await spalla().squadra.disattiva(ruolo.nome);
      await carica();
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    } finally {
      setInCambio(null);
    }
  }

  return (
    <Pagina titolo={finestra.squadra.titolo} sottotitolo={finestra.squadra.sottotitolo}>
      {errore ? <Avviso livello="errore">{errore}</Avviso> : null}
      {ruoli === null && !errore ? <p className="attenuato">{finestra.generale.caricamento}</p> : null}
      {ruoli && ruoli.length === 0 ? <p className="attenuato">{finestra.squadra.vuoto}</p> : null}
      {ruoli && ruoli.length > 0 ? (
        <ul className="griglia-ruoli" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {ruoli.map((r) => (
            <li key={r.nome} className="scheda">
              <div className="riga-azioni riga-azioni--spazio" style={{ marginTop: 0 }}>
                <h2 style={{ margin: 0 }}>{r.etichetta}</h2>
                <span className={`distintivo${r.attivo ? ' distintivo--ok' : ''}`}>{r.attivo ? finestra.squadra.acceso : finestra.squadra.spento}</span>
              </div>
              <p className="attenuato" style={{ margin: 0 }}>
                {r.spiegazione}
              </p>
              <div className="ruolo__righe">
                <div>
                  <strong>{finestra.squadra.puoDaSola}</strong> {r.puoFareDaSolo}
                </div>
                <div>
                  <strong>{finestra.squadra.chiedeSempre}</strong> {r.chiedeSempre}
                </div>
              </div>
              <Interruttore
                acceso={r.attivo}
                etichetta={r.attivo ? finestra.squadra.acceso : finestra.squadra.spento}
                etichettaAria={finestra.squadra.interruttore(r.etichetta)}
                disabilitato={inCambio === r.nome}
                onCambia={(acceso) => void cambia(r, acceso)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </Pagina>
  );
}
