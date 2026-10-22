import { useEffect, useState, type ReactNode } from 'react';
import { cervello as testiCervello, finestra } from '@spalla/it-copy';
import type { EsitoCollegamento, Impostazioni, StatoApp, StatoPannelloLogin } from '../../../ipc/contratto.js';
import type { LivelloModello, ModalitaCervello } from '../../../nucleo/contratti.js';
import { Avviso } from '../../componenti/Avviso.js';
import { Pulsante } from '../../componenti/Pulsante.js';
import { Scelte } from '../../componenti/Scelte.js';
import { Terminale } from '../../componenti/Terminale.js';
import { messaggioErrore, spalla } from '../../stato/api.js';
import { formatoChiaveValido } from '../s0/ChiaveApi.js';

interface Props {
  valore: Impostazioni['cervello'];
  statoApp: StatoApp | null;
  onCambia(v: Impostazioni['cervello']): void;
  onAggiornaStato(): void;
}

function LoginAbbonamento({ onFatto }: { onFatto(esito: EsitoCollegamento): void }): ReactNode {
  const [pannello, setPannello] = useState<StatoPannelloLogin | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  useEffect(() => {
    const api = spalla();
    let attivo = true;
    void api.cervello
      .avviaPannelloLogin()
      .then((s) => attivo && setPannello(s))
      .catch((e: unknown) => attivo && setErrore(messaggioErrore(e, testiCervello.abbonamento.nonCollegato)));
    const annulla = api.on.terminaleStato((s) => attivo && setPannello(s));
    return () => {
      attivo = false;
      annulla();
      void api.cervello.chiudiPannelloLogin().catch(() => undefined);
    };
  }, []);
  async function verifica(): Promise<void> {
    try {
      onFatto(await spalla().cervello.verifica());
    } catch (e) {
      onFatto({ ok: false, messaggio: messaggioErrore(e, testiCervello.abbonamento.nonCollegato) });
    }
  }
  return (
    <div style={{ marginTop: 12 }}>
      {errore ? <Avviso livello="errore">{errore}</Avviso> : null}
      {pannello?.attivo ? <Terminale etichetta={testiCervello.abbonamento.etichettaPannello} /> : null}
      {!pannello && !errore ? <p className="attenuato">{finestra.s0.cervello.pannelloInAvvio}</p> : null}
      <Pulsante variante="primario" onClick={() => void verifica()}>
        {finestra.s0.cervello.hoFinitoVerifica}
      </Pulsante>
    </div>
  );
}

/** Impostazioni → Il cervello: modalità (con l'avviso di beta per l'abbonamento), qualità, tetto, spesa, prova. */
export function PannelloCervello({ valore, statoApp, onCambia, onAggiornaStato }: Props): ReactNode {
  const t = finestra.impostazioni.cervello;
  const [esito, setEsito] = useState<EsitoCollegamento | null>(null);
  const [verificaInCorso, setVerificaInCorso] = useState(false);
  const [login, setLogin] = useState(false);
  const [nuovaChiave, setNuovaChiave] = useState('');
  const [erroreChiave, setErroreChiave] = useState<string | null>(null);
  const modalita = valore.modalita ?? statoApp?.cervello.modalita;
  const collegato = statoApp?.cervello.collegato ?? false;

  async function cambiaModalita(m: ModalitaCervello): Promise<void> {
    setEsito(null);
    try {
      await spalla().cervello.cambiaModalita(m);
      onCambia({ ...valore, modalita: m });
      onAggiornaStato();
    } catch (e) {
      setEsito({ ok: false, messaggio: messaggioErrore(e, finestra.generale.errore) });
    }
  }

  async function verifica(): Promise<void> {
    setVerificaInCorso(true);
    setEsito(null);
    try {
      setEsito(await spalla().cervello.verifica());
      onAggiornaStato();
    } catch (e) {
      setEsito({ ok: false, messaggio: messaggioErrore(e, finestra.generale.errore) });
    } finally {
      setVerificaInCorso(false);
    }
  }

  async function collegaChiave(): Promise<void> {
    if (!formatoChiaveValido(nuovaChiave)) {
      setErroreChiave(testiCervello.chiaveApi.formatoNonValido);
      return;
    }
    setErroreChiave(null);
    setVerificaInCorso(true);
    try {
      const r = await spalla().cervello.collegaChiaveApi(nuovaChiave.trim(), valore.tettoMensileEur, valore.livello);
      setEsito(r);
      if (r.ok) setNuovaChiave('');
      onAggiornaStato();
    } catch (e) {
      setEsito({ ok: false, messaggio: messaggioErrore(e, finestra.generale.errore) });
    } finally {
      setVerificaInCorso(false);
    }
  }

  async function rimuoviChiave(): Promise<void> {
    try {
      await spalla().cervello.rimuoviChiaveApi();
      onAggiornaStato();
    } catch (e) {
      setEsito({ ok: false, messaggio: messaggioErrore(e, finestra.generale.errore) });
    }
  }

  return (
    <section className="scheda" aria-labelledby="imp-cervello">
      <h2 id="imp-cervello">{t.titolo}</h2>
      <p>
        <span className={`distintivo${collegato ? ' distintivo--ok' : ' distintivo--attenzione'}`}>{collegato ? t.collegato : t.nonCollegato}</span>
      </p>
      <Scelte<ModalitaCervello | null>
        nome="modalita"
        legenda={t.modalita}
        opzioni={[
          { valore: 'chiave_api', etichetta: t.chiaveApi },
          { valore: 'abbonamento', etichetta: t.abbonamento, nota: t.beta },
        ]}
        valore={modalita ?? null}
        onCambia={(m) => {
          if (m && m !== modalita) void cambiaModalita(m);
        }}
      />
      {modalita === 'abbonamento' ? <Avviso livello="attenzione">{testiCervello.abbonamento.avvisoBeta}</Avviso> : null}

      <Scelte<LivelloModello> nome="livello" legenda={t.livello} opzioni={testiCervello.chiaveApi.qualita.opzioni} valore={valore.livello} onCambia={(livello) => onCambia({ ...valore, livello })} />
      {modalita === 'chiave_api' ? (
        <>
          <Scelte<number | null>
            nome="tetto"
            legenda={t.tetto}
            opzioni={testiCervello.chiaveApi.tetto.opzioni}
            valore={valore.tettoMensileEur}
            onCambia={(tettoMensileEur) => onCambia({ ...valore, tettoMensileEur })}
          />
          {statoApp ? <p className="attenuato piccolo">{t.spesa(statoApp.costi.meseEur, valore.tettoMensileEur)}</p> : null}
          {statoApp?.costi.sopraTetto ? <Avviso livello="attenzione">{t.sopraTetto}</Avviso> : null}
        </>
      ) : null}

      {verificaInCorso ? <Avviso livello="info">{t.verificaInCorso}</Avviso> : null}
      {esito ? <Avviso livello={esito.ok ? 'ok' : 'errore'}>{esito.messaggio}</Avviso> : null}

      {modalita === 'chiave_api' && !collegato ? (
        <div className="campo" style={{ marginTop: 12 }}>
          <label className="campo__etichetta" htmlFor="imp-chiave">
            {testiCervello.chiaveApi.incolla}
          </label>
          <div className="riga-azioni" style={{ marginTop: 0, flexWrap: 'nowrap' }}>
            <input
              id="imp-chiave"
              className="ingresso ingresso--mono"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={testiCervello.chiaveApi.segnaposto}
              value={nuovaChiave}
              onChange={(e) => setNuovaChiave(e.target.value)}
              aria-invalid={erroreChiave ? 'true' : undefined}
              aria-describedby={erroreChiave ? 'imp-chiave-errore' : undefined}
            />
            <Pulsante variante="primario" onClick={() => void collegaChiave()} disabled={!nuovaChiave.trim() || verificaInCorso}>
              {finestra.s0.cervello.collega}
            </Pulsante>
          </div>
          {erroreChiave ? (
            <span id="imp-chiave-errore" className="campo__errore" role="alert">
              {erroreChiave}
            </span>
          ) : null}
        </div>
      ) : null}

      {login ? (
        <LoginAbbonamento
          onFatto={(r) => {
            setEsito(r);
            if (r.ok) setLogin(false);
            onAggiornaStato();
          }}
        />
      ) : null}

      <div className="riga-azioni">
        <Pulsante onClick={() => void verifica()} disabled={verificaInCorso || !modalita}>
          {t.verifica}
        </Pulsante>
        {modalita === 'abbonamento' && !login ? <Pulsante onClick={() => setLogin(true)}>{testiCervello.abbonamento.collega}</Pulsante> : null}
        {modalita === 'chiave_api' && collegato ? (
          <Pulsante variante="pericolo" onClick={() => void rimuoviChiave()}>
            {t.rimuoviChiave}
          </Pulsante>
        ) : null}
      </div>
    </section>
  );
}
