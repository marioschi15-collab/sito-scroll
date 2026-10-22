import { useEffect, useState, type ReactNode } from 'react';
import { cervello, comuni, finestra } from '@spalla/it-copy';
import type { EsitoCollegamento, StatoPannelloLogin } from '../../../ipc/contratto.js';
import { Avviso } from '../../componenti/Avviso.js';
import { Pulsante } from '../../componenti/Pulsante.js';
import { Terminale } from '../../componenti/Terminale.js';
import { messaggioErrore, spalla } from '../../stato/api.js';
import { useStore } from '../../stato/store.js';
import { Cornice } from './Cornice.js';

interface Props {
  onCollegato(): void;
  onPreferiscoChiave(): void;
  onIndietro(): void;
}

/** Avviso di beta, poi il pannello terminale con il binario per /login e la prova di collegamento. */
export function Abbonamento({ onCollegato, onPreferiscoChiave, onIndietro }: Props): ReactNode {
  const t = cervello.abbonamento;
  const [fase, setFase] = useState<'avviso' | 'pannello'>('avviso');
  const [pannello, setPannello] = useState<StatoPannelloLogin | null>(null);
  const [errorePannello, setErrorePannello] = useState<string | null>(null);
  const [verifica, setVerifica] = useState<'ferma' | 'inCorso'>('ferma');
  const [esito, setEsito] = useState<EsitoCollegamento | null>(null);
  // Solo sviluppo: con il login della macchina ereditato (SPALLA_CONFIG_EREDITATA=1) il pannello non serve.
  const accessoEreditato = useStore().stato?.sviluppo?.accessoEreditato === true;

  useEffect(() => {
    if (fase !== 'pannello') return;
    const api = spalla();
    let attivo = true;
    void (async () => {
      try {
        await api.cervello.cambiaModalita('abbonamento');
        const s = await api.cervello.avviaPannelloLogin();
        if (attivo) setPannello(s);
      } catch (errore) {
        if (attivo) setErrorePannello(messaggioErrore(errore, t.nonCollegato));
      }
    })();
    const annulla = api.on.terminaleStato((s) => {
      if (attivo) setPannello(s);
    });
    return () => {
      attivo = false;
      annulla();
      void api.cervello.chiudiPannelloLogin().catch(() => undefined);
    };
  }, [fase, t.nonCollegato]);

  async function verificaOra(saltaPannello = false): Promise<void> {
    setVerifica('inCorso');
    setEsito(null);
    try {
      if (saltaPannello) await spalla().cervello.cambiaModalita('abbonamento');
      const r = await spalla().cervello.verifica();
      setEsito(r);
      if (saltaPannello && r.ok) onCollegato();
    } catch (errore) {
      setEsito({ ok: false, messaggio: messaggioErrore(errore, t.nonCollegato), codice: 'altro' });
    } finally {
      setVerifica('ferma');
    }
  }

  if (fase === 'avviso') {
    return (
      <Cornice passo={4} totale={5} titolo={t.titolo}>
        <Avviso livello="attenzione">{t.avvisoBeta}</Avviso>
        <p className="attenuato">{t.limiti}</p>
        {verifica === 'inCorso' ? <Avviso livello="info">{t.verificaInCorso}</Avviso> : null}
        {esito && !esito.ok ? <Avviso livello="errore">{esito.messaggio}</Avviso> : null}
        <div className="procedura__piede">
          <Pulsante onClick={onIndietro}>{comuni.pulsanti.indietro}</Pulsante>
          <div className="riga-azioni" style={{ marginTop: 0 }}>
            {accessoEreditato ? (
              <Pulsante onClick={() => void verificaOra(true)} disabled={verifica === 'inCorso'}>
                {finestra.s0.cervello.giaCollegatoSviluppo}
              </Pulsante>
            ) : null}
            <Pulsante onClick={onPreferiscoChiave}>{t.preferiscoChiave}</Pulsante>
            <Pulsante variante="primario" onClick={() => setFase('pannello')}>
              {t.continuo}
            </Pulsante>
          </div>
        </div>
      </Cornice>
    );
  }

  return (
    <Cornice passo={4} totale={5} titolo={t.collega}>
      {errorePannello ? <Avviso livello="errore">{errorePannello}</Avviso> : null}
      {!pannello && !errorePannello ? <p className="attenuato">{finestra.s0.cervello.pannelloInAvvio}</p> : null}
      {pannello?.attivo ? <Terminale etichetta={t.etichettaPannello} /> : null}
      {pannello && !pannello.attivo && !pannello.collegato ? <p className="attenuato">{finestra.s0.cervello.pannelloChiuso}</p> : null}
      {pannello?.collegato && !esito ? <Avviso livello="ok">{t.collegato}</Avviso> : null}
      {verifica === 'inCorso' ? <Avviso livello="info">{t.verificaInCorso}</Avviso> : null}
      {esito ? <Avviso livello={esito.ok ? 'ok' : 'errore'}>{esito.messaggio}</Avviso> : null}
      <div className="procedura__piede">
        <Pulsante onClick={onPreferiscoChiave}>{t.preferiscoChiave}</Pulsante>
        {esito?.ok ? (
          <Pulsante variante="primario" onClick={onCollegato}>
            {comuni.pulsanti.continua}
          </Pulsante>
        ) : (
          <Pulsante variante="primario" onClick={() => void verificaOra()} disabled={verifica === 'inCorso'}>
            {finestra.s0.cervello.hoFinitoVerifica}
          </Pulsante>
        )}
      </div>
    </Cornice>
  );
}
