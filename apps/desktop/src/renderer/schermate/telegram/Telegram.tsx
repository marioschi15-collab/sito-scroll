import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { comuni, finestra, telegram as testiTelegram } from '@spalla/it-copy';
import type { EsitoCollegamento, StatoTelegram, SuggerimentiTelegram } from '../../../ipc/contratto.js';
import { Avviso } from '../../componenti/Avviso.js';
import { Copiabile } from '../../componenti/Copiabile.js';
import { Pagina } from '../../componenti/Pagina.js';
import { Pulsante } from '../../componenti/Pulsante.js';
import { messaggioErrore, spalla } from '../../stato/api.js';

/** Controllo locale della riga di BotFather ("123456789:AA…"), prima di chiedere a Telegram. */
export function formatoTokenValido(riga: string): boolean {
  return /^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(riga.trim());
}

function oraBreve(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Conferma del telefono (docs/02 §8.3): il processo principale NON manda il codice alla finestra (arriva vuoto).
 * L'utente lo legge su Telegram e lo scrive qui: è questo che dimostra che il telefono è suo.
 */
function BoxPairing({ pairing, onFatto }: { pairing: NonNullable<StatoTelegram['pairingInAttesa']>; onFatto(ignorato: boolean): void }): ReactNode {
  const t = finestra.telegram.pairing;
  const [codice, setCodice] = useState('');
  const [esito, setEsito] = useState<EsitoCollegamento | null>(null);
  const [inCorso, setInCorso] = useState(false);
  async function conferma(e: FormEvent): Promise<void> {
    e.preventDefault();
    const digitato = codice.trim();
    if (!digitato) {
      setEsito({ ok: false, messaggio: t.codiceVuoto });
      return;
    }
    setInCorso(true);
    try {
      const r = await spalla().telegram.confermaPairing(digitato);
      setEsito(r);
      if (r.ok) onFatto(false);
    } catch (errore) {
      setEsito({ ok: false, messaggio: messaggioErrore(errore, finestra.generale.errore) });
    } finally {
      setInCorso(false);
    }
  }
  return (
    <form className="scheda-permesso" role="group" aria-labelledby="pairing-titolo" style={{ marginBottom: 20 }} onSubmit={(e) => void conferma(e)} noValidate>
      <div className="scheda-permesso__chi" id="pairing-titolo">
        {t.titolo}
      </div>
      <p style={{ margin: '6px 0 2px', fontWeight: 550 }}>{t.testo(pairing.nome)}</p>
      <p className="attenuato piccolo" style={{ margin: 0 }}>
        {t.scade(oraBreve(pairing.scadeAlle))}
      </p>
      <div className="campo" style={{ marginTop: 10, maxWidth: 260 }}>
        <label className="campo__etichetta" htmlFor="codice-pairing">
          {t.etichettaCodice}
        </label>
        <input
          id="codice-pairing"
          className="ingresso ingresso--mono"
          type="text"
          value={codice}
          onChange={(e) => setCodice(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={32}
          aria-invalid={esito !== null && !esito.ok ? 'true' : undefined}
        />
      </div>
      {esito && !esito.ok ? <Avviso livello="errore">{esito.messaggio}</Avviso> : null}
      <div className="riga-azioni">
        <Pulsante variante="primario" type="submit" disabled={inCorso}>
          {t.conferma}
        </Pulsante>
        <Pulsante onClick={() => onFatto(true)} disabled={inCorso}>
          {t.ignora}
        </Pulsante>
      </div>
    </form>
  );
}

/** Chiave per [No, non sono io]: chi ha scritto e quando scade (il codice non arriva alla finestra). */
export function chiavePairing(p: NonNullable<StatoTelegram['pairingInAttesa']>): string {
  return `${p.nome}|${p.scadeAlle}`;
}

function ProceduraBotFather({ suggerimenti, onCollegato }: { suggerimenti: SuggerimentiTelegram; onCollegato(): void }): ReactNode {
  const t = testiTelegram.botfather;
  const [riga, setRiga] = useState('');
  const [erroreFormato, setErroreFormato] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<EsitoCollegamento | null>(null);

  async function collega(e: FormEvent): Promise<void> {
    e.preventDefault();
    const pulita = riga.trim();
    if (!formatoTokenValido(pulita)) {
      setErroreFormato(t.codiceNonValido);
      return;
    }
    setErroreFormato(null);
    setInCorso(true);
    setEsito(null);
    try {
      const r = await spalla().telegram.collegaConToken(pulita);
      setEsito(r);
      if (r.ok) {
        setRiga('');
        onCollegato();
      }
    } catch (err) {
      setEsito({ ok: false, messaggio: messaggioErrore(err, t.verificaFallita) });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <section className="scheda" aria-labelledby="botfather-titolo">
      <h2 id="botfather-titolo">{t.titolo}</h2>
      <ol className="passi">
        {t.passi.map((passo, i) => (
          <li key={passo}>
            <span className="passi__numero" aria-hidden="true">
              {i + 1}
            </span>
            <span>{passo}</span>
          </li>
        ))}
      </ol>
      <Pulsante onClick={() => void spalla().app.apriLink(suggerimenti.linkBotFather)}>{t.apriBotFather}</Pulsante>
      <div style={{ display: 'grid', gap: 8, margin: '16px 0' }}>
        <Copiabile etichetta={finestra.telegram.comando} valore="/newbot" />
        <Copiabile etichetta={finestra.telegram.nomeSuggerito} valore={suggerimenti.nomeBot} />
        <Copiabile etichetta={finestra.telegram.usernameSuggerito} valore={suggerimenti.usernameSuggerito} />
      </div>
      <form onSubmit={(e) => void collega(e)} noValidate>
        <div className="campo">
          <label className="campo__etichetta" htmlFor="riga-botfather">
            {t.incollaCodice}
          </label>
          <input
            id="riga-botfather"
            className="ingresso ingresso--mono"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={riga}
            onChange={(e) => {
              setRiga(e.target.value);
              if (erroreFormato) setErroreFormato(null);
            }}
            aria-invalid={erroreFormato ? 'true' : undefined}
            aria-describedby={erroreFormato ? 'riga-errore' : undefined}
          />
          {erroreFormato ? (
            <span id="riga-errore" className="campo__errore" role="alert">
              {erroreFormato}
            </span>
          ) : null}
        </div>
        {inCorso ? <Avviso livello="info">{t.verificaInCorso}</Avviso> : null}
        {esito ? <Avviso livello={esito.ok ? 'ok' : 'errore'}>{esito.messaggio}</Avviso> : null}
        <div className="riga-azioni">
          <Pulsante type="submit" variante="primario" disabled={inCorso || !riga.trim()}>
            {finestra.telegram.collega}
          </Pulsante>
        </div>
      </form>
    </section>
  );
}

/** Telegram: stato del collegamento, due tocchi (se disponibili), procedura BotFather, conferma del codice, scollega. */
export function Telegram(): ReactNode {
  const [stato, setStato] = useState<StatoTelegram | null>(null);
  const [suggerimenti, setSuggerimenti] = useState<SuggerimentiTelegram | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [esitoDueTocchi, setEsitoDueTocchi] = useState<EsitoCollegamento | null>(null);
  const [dueTocchiInCorso, setDueTocchiInCorso] = useState(false);
  const [confermaScollega, setConfermaScollega] = useState(false);
  const [pairingIgnorato, setPairingIgnorato] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  const carica = useCallback(async () => {
    try {
      const api = spalla();
      const s = await api.telegram.stato();
      setStato(s);
      if (!s.collegato) setSuggerimenti(await api.telegram.suggerimenti());
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    }
  }, []);

  useEffect(() => {
    void carica();
    const annulla = spalla().on.telegramStato((s) => {
      setStato(s);
      if (!s.collegato) void spalla().telegram.suggerimenti().then(setSuggerimenti).catch(() => undefined);
    });
    return annulla;
  }, [carica]);

  async function dueTocchi(): Promise<void> {
    setDueTocchiInCorso(true);
    setEsitoDueTocchi(null);
    try {
      const r = await spalla().telegram.collegaInDueTocchi();
      setEsitoDueTocchi(r);
      if (r.ok) await carica();
    } catch (e) {
      setEsitoDueTocchi({ ok: false, messaggio: messaggioErrore(e, finestra.generale.errore) });
    } finally {
      setDueTocchiInCorso(false);
    }
  }

  async function scollega(): Promise<void> {
    try {
      await spalla().telegram.scollega();
      setConfermaScollega(false);
      setAvviso(finestra.telegram.scollegato);
      await carica();
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    }
  }

  const pairing = stato?.pairingInAttesa && chiavePairing(stato.pairingInAttesa) !== pairingIgnorato ? stato.pairingInAttesa : undefined;

  return (
    <Pagina titolo={finestra.telegram.titolo} sottotitolo={finestra.telegram.sottotitolo}>
      {errore ? (
        <Avviso livello="errore" onChiudi={() => setErrore(null)}>
          {errore}
        </Avviso>
      ) : null}
      {avviso ? (
        <Avviso livello="ok" onChiudi={() => setAvviso(null)}>
          {avviso}
        </Avviso>
      ) : null}
      {stato === null && !errore ? <p className="attenuato">{finestra.generale.caricamento}</p> : null}

      {pairing ? (
        <BoxPairing
          key={chiavePairing(pairing)}
          pairing={pairing}
          onFatto={(ignorato) => {
            if (ignorato) setPairingIgnorato(chiavePairing(pairing));
            void carica();
          }}
        />
      ) : null}

      {stato?.collegato ? (
        <section className="scheda" aria-labelledby="stato-telegram">
          <h2 id="stato-telegram">
            <span className="distintivo distintivo--ok" style={{ marginRight: 8 }}>
              {finestra.impostazioni.cervello.collegato}
            </span>
            {stato.username ? finestra.telegram.stato.collegato(stato.username) : finestra.telegram.stato.collegatoSenzaNome}
          </h2>
          <p className="attenuato">{stato.proprietarioConfermato ? finestra.telegram.stato.soloTe : finestra.telegram.stato.aspettaCiao}</p>
          {confermaScollega ? (
            <div role="alertdialog" aria-labelledby="scollega-domanda">
              <p id="scollega-domanda">{finestra.telegram.scollegaConferma}</p>
              <div className="riga-azioni">
                <Pulsante variante="pericolo" onClick={() => void scollega()}>
                  {finestra.telegram.scollega}
                </Pulsante>
                <Pulsante onClick={() => setConfermaScollega(false)}>{comuni.pulsanti.annulla}</Pulsante>
              </div>
            </div>
          ) : (
            <Pulsante variante="discreto" onClick={() => setConfermaScollega(true)}>
              {finestra.telegram.scollega}
            </Pulsante>
          )}
        </section>
      ) : null}

      {stato && !stato.collegato ? (
        <>
          <p>
            <span className="distintivo">{finestra.telegram.stato.nonCollegato}</span>
          </p>
          {suggerimenti?.linkDueTocchi ? (
            <section className="scheda" aria-labelledby="due-tocchi">
              <h2 id="due-tocchi">{finestra.telegram.dueTocchi}</h2>
              <p className="attenuato">{finestra.telegram.dueTocchiNota}</p>
              {dueTocchiInCorso ? <Avviso livello="info">{finestra.telegram.dueTocchiAttesa}</Avviso> : null}
              {esitoDueTocchi ? <Avviso livello={esitoDueTocchi.ok ? 'ok' : 'errore'}>{esitoDueTocchi.messaggio}</Avviso> : null}
              <Pulsante variante="primario" grande onClick={() => void dueTocchi()} disabled={dueTocchiInCorso}>
                {finestra.telegram.dueTocchi}
              </Pulsante>
              <h3 style={{ marginTop: 24 }}>{finestra.telegram.oppure}</h3>
            </section>
          ) : null}
          {suggerimenti ? <ProceduraBotFather suggerimenti={suggerimenti} onCollegato={() => void carica()} /> : null}
        </>
      ) : null}
    </Pagina>
  );
}
