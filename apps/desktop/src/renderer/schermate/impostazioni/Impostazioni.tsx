import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';
import type { Impostazioni as ValoriImpostazioni } from '../../../ipc/contratto.js';
import { Avviso } from '../../componenti/Avviso.js';
import { Barra } from '../../componenti/Barra.js';
import { Pagina } from '../../componenti/Pagina.js';
import { Pulsante } from '../../componenti/Pulsante.js';
import { messaggioErrore, spalla } from '../../stato/api.js';
import { useStore } from '../../stato/store.js';
import { PannelloCervello } from './PannelloCervello.js';

type StatoVoce = { disponibile: boolean; motore?: string; inDownload: boolean; frazione?: number };

function Ora({ id, etichetta, valore, onCambia }: { id: string; etichetta: string; valore: string; onCambia(v: string): void }): ReactNode {
  return (
    <div className="campo">
      <label className="campo__etichetta" htmlFor={id}>
        {etichetta}
      </label>
      <input id={id} className="ingresso" type="time" value={valore} onChange={(e) => onCambia(e.target.value)} style={{ maxWidth: 140 }} />
    </div>
  );
}

function Spunta({ etichetta, valore, onCambia }: { etichetta: string; valore: boolean; onCambia(v: boolean): void }): ReactNode {
  return (
    <label className="spunta">
      <input type="checkbox" checked={valore} onChange={(e) => onCambia(e.target.checked)} />
      <span>{etichetta}</span>
    </label>
  );
}

/** Impostazioni: cervello, orari di silenzio, buongiorno, riordino notturno, voce, avvio, dati, versione. */
export function Impostazioni(): ReactNode {
  const t = finestra.impostazioni;
  const { stato, aggiornaStato, notifica } = useStore();
  const [valori, setValori] = useState<ValoriImpostazioni | null>(null);
  const [modificato, setModificato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [voce, setVoce] = useState<StatoVoce | null>(null);
  const [avanzamento, setAvanzamento] = useState<{ frazione: number; messaggio: string } | null>(null);

  const caricaVoce = useCallback(async () => {
    try {
      setVoce(await spalla().voce.stato());
    } catch {
      setVoce(null);
    }
  }, []);

  useEffect(() => {
    const api = spalla();
    void api.impostazioni
      .leggi()
      .then(setValori)
      .catch((e: unknown) => setErrore(messaggioErrore(e, finestra.generale.errore)));
    void caricaVoce();
    return api.on.voceAvanzamento((p) => {
      setAvanzamento(p);
      if (p.frazione >= 1) {
        setAvanzamento(null);
        void caricaVoce();
      }
    });
  }, [caricaVoce]);

  function cambia<K extends keyof ValoriImpostazioni>(chiave: K, v: ValoriImpostazioni[K]): void {
    setValori((s) => (s ? { ...s, [chiave]: v } : s));
    setModificato(true);
  }

  async function salva(): Promise<void> {
    if (!valori) return;
    try {
      await spalla().impostazioni.salva(valori);
      setModificato(false);
      notifica({ testo: t.salvato, livello: 'ok' });
      void aggiornaStato();
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    }
  }

  async function scaricaVoce(): Promise<void> {
    setAvanzamento({ frazione: 0, messaggio: t.voce.inDownload });
    try {
      await spalla().voce.prepara();
      await caricaVoce();
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    } finally {
      setAvanzamento(null);
    }
  }

  async function esporta(): Promise<void> {
    try {
      const percorso = await spalla().app.esportaTutto();
      notifica({ testo: percorso ? t.dati.esportato(percorso) : t.dati.esportaAnnullato, livello: percorso ? 'ok' : 'info' });
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    }
  }

  const pulsanteSalva = (
    <Pulsante variante="primario" onClick={() => void salva()} disabled={!modificato}>
      {t.salva}
    </Pulsante>
  );

  return (
    <Pagina titolo={t.titolo} className="impostazioni" azioni={valori ? pulsanteSalva : undefined}>
      {errore ? (
        <Avviso livello="errore" onChiudi={() => setErrore(null)}>
          {errore}
        </Avviso>
      ) : null}
      {!valori && !errore ? <p className="attenuato">{finestra.generale.caricamento}</p> : null}
      {valori ? (
        <>
          <PannelloCervello valore={valori.cervello} statoApp={stato} onCambia={(c) => cambia('cervello', c)} onAggiornaStato={() => void aggiornaStato()} />

          <section className="scheda" aria-labelledby="imp-orari">
            <h2 id="imp-orari">{t.orari.titolo}</h2>
            <p>{t.orari.nota}</p>
            <div className="riga-campi">
              <Ora id="silenzio-da" etichetta={t.orari.da} valore={valori.orari.silenzioDa} onCambia={(v) => cambia('orari', { ...valori.orari, silenzioDa: v })} />
              <Ora id="silenzio-a" etichetta={t.orari.a} valore={valori.orari.silenzioA} onCambia={(v) => cambia('orari', { ...valori.orari, silenzioA: v })} />
              <div className="campo">
                <label className="campo__etichetta" htmlFor="domenica">
                  {t.orari.domenica}
                </label>
                <select
                  id="domenica"
                  className="selettore"
                  value={valori.orari.domenica}
                  onChange={(e) => cambia('orari', { ...valori.orari, domenica: e.target.value === 'silenzio' ? 'silenzio' : 'normale' })}
                >
                  <option value="silenzio">{t.orari.silenzio}</option>
                  <option value="normale">{t.orari.normale}</option>
                </select>
              </div>
            </div>
          </section>

          <section className="scheda" aria-labelledby="imp-brief">
            <h2 id="imp-brief">{t.brief.titolo}</h2>
            <p>{t.brief.nota}</p>
            <Spunta etichetta={t.brief.attivo} valore={valori.brief.attivo} onCambia={(v) => cambia('brief', { ...valori.brief, attivo: v })} />
            <div className="riga-campi">
              <Ora id="brief-ora" etichetta={t.brief.ora} valore={valori.brief.ora} onCambia={(v) => cambia('brief', { ...valori.brief, ora: v })} />
              <div className="campo">
                <label className="campo__etichetta" htmlFor="brief-canale">
                  {t.brief.canale}
                </label>
                <select
                  id="brief-canale"
                  className="selettore"
                  value={valori.brief.canale}
                  onChange={(e) => cambia('brief', { ...valori.brief, canale: e.target.value === 'telegram' ? 'telegram' : 'desktop' })}
                >
                  <option value="desktop">{t.brief.desktop}</option>
                  <option value="telegram">{t.brief.telegram}</option>
                </select>
              </div>
            </div>
          </section>

          <section className="scheda" aria-labelledby="imp-riordino">
            <h2 id="imp-riordino">{t.riordino.titolo}</h2>
            <p>{t.riordino.nota}</p>
            <Spunta etichetta={t.riordino.attivo} valore={valori.riordinoNotturno.attivo} onCambia={(v) => cambia('riordinoNotturno', { ...valori.riordinoNotturno, attivo: v })} />
            <Ora id="riordino-ora" etichetta={t.riordino.ora} valore={valori.riordinoNotturno.ora} onCambia={(v) => cambia('riordinoNotturno', { ...valori.riordinoNotturno, ora: v })} />
          </section>

          <section className="scheda" aria-labelledby="imp-voce">
            <h2 id="imp-voce">{t.voce.titolo}</h2>
            <div className="campo">
              <label className="campo__etichetta" htmlFor="voce-desktop">
                {t.voce.desktop}
              </label>
              <select
                id="voce-desktop"
                className="selettore"
                value={valori.voce.desktop}
                onChange={(e) => cambia('voce', { ...valori.voce, desktop: e.target.value === 'push_to_talk' ? 'push_to_talk' : 'spento' })}
              >
                <option value="spento">{t.voce.spento}</option>
                <option value="push_to_talk">{t.voce.pushToTalk}</option>
              </select>
            </div>
            <Spunta etichetta={t.voce.telegramVocali} valore={valori.voce.risposteVocaliTelegram} onCambia={(v) => cambia('voce', { ...valori.voce, risposteVocaliTelegram: v })} />
            <p className="attenuato" style={{ marginTop: 12 }}>
              {voce?.disponibile ? t.voce.pronta(voce.motore) : t.voce.nonPronta}
            </p>
            {avanzamento || voce?.inDownload ? (
              <div style={{ display: 'grid', gap: 6 }}>
                <Barra frazione={avanzamento?.frazione ?? voce?.frazione ?? 0} etichetta={t.voce.inDownload} />
                <span className="attenuato piccolo" role="status">
                  {avanzamento?.messaggio ?? t.voce.inDownload}
                </span>
              </div>
            ) : !voce?.disponibile ? (
              <Pulsante onClick={() => void scaricaVoce()}>{t.voce.scarica}</Pulsante>
            ) : null}
          </section>

          <section className="scheda" aria-labelledby="imp-avvio">
            <h2 id="imp-avvio">{t.avvio.titolo}</h2>
            <Spunta etichetta={t.avvio.automatico} valore={valori.avvioAutomatico} onCambia={(v) => cambia('avvioAutomatico', v)} />
          </section>

          <section className="scheda" aria-labelledby="imp-dati">
            <h2 id="imp-dati">{t.dati.titolo}</h2>
            {stato ? (
              <p>
                {t.dati.cartella}: <code>{stato.cartellaLavoro}</code>
              </p>
            ) : null}
            <div className="riga-azioni">
              <Pulsante onClick={() => void spalla().app.apriNelSistema('.')}>{t.dati.apriCartella}</Pulsante>
              <Pulsante onClick={() => void esporta()}>{t.dati.esporta}</Pulsante>
            </div>
          </section>

          <div className="riga-azioni riga-azioni--spazio">
            <span className="attenuato piccolo">{stato ? t.versione(stato.versione) : null}</span>
            {pulsanteSalva}
          </div>
        </>
      ) : null}
    </Pagina>
  );
}
