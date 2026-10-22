import { useState, type FormEvent, type ReactNode } from 'react';
import { cervello, comuni, finestra } from '@spalla/it-copy';
import type { EsitoCollegamento } from '../../../ipc/contratto.js';
import type { LivelloModello } from '../../../nucleo/contratti.js';
import { Avviso } from '../../componenti/Avviso.js';
import { Pulsante } from '../../componenti/Pulsante.js';
import { Scelte } from '../../componenti/Scelte.js';
import { messaggioErrore, spalla } from '../../stato/api.js';
import { Cornice } from './Cornice.js';

/** Pagina della Console di Anthropic dove si crea la chiave. */
export const LINK_CONSOLE_ANTHROPIC = 'https://console.anthropic.com/settings/keys';

/** Controllo locale del formato, prima di qualunque prova in rete. */
export function formatoChiaveValido(chiave: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{16,}$/.test(chiave.trim());
}

export function ChiaveApi({ onCollegato, onIndietro }: { onCollegato(): void; onIndietro(): void }): ReactNode {
  const t = cervello.chiaveApi;
  const [chiave, setChiave] = useState('');
  const [tetto, setTetto] = useState<number | null>(25);
  const [livello, setLivello] = useState<LivelloModello>('equilibrato');
  const [erroreFormato, setErroreFormato] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<EsitoCollegamento | null>(null);

  async function collega(e: FormEvent): Promise<void> {
    e.preventDefault();
    const pulita = chiave.trim();
    if (!formatoChiaveValido(pulita)) {
      setErroreFormato(t.formatoNonValido);
      setEsito(null);
      return;
    }
    setErroreFormato(null);
    setInCorso(true);
    setEsito(null);
    try {
      const api = spalla();
      await api.cervello.cambiaModalita('chiave_api');
      setEsito(await api.cervello.collegaChiaveApi(pulita, tetto, livello));
    } catch (errore) {
      setEsito({ ok: false, messaggio: messaggioErrore(errore, cervello.verifica.generico('')), codice: 'altro' });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Cornice passo={4} totale={5} titolo={t.titolo}>
      <p>{t.cosE}</p>
      <ul className="passi" aria-label={t.titolo}>
        {t.percheServe.map((frase) => (
          <li key={frase}>
            <span className="passi__numero" aria-hidden="true">
              ·
            </span>
            <span>{frase}</span>
          </li>
        ))}
      </ul>
      <Pulsante onClick={() => void spalla().app.apriLink(LINK_CONSOLE_ANTHROPIC)}>{t.apriPagina}</Pulsante>
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

      <form onSubmit={(e) => void collega(e)} noValidate>
        <div className="campo">
          <label className="campo__etichetta" htmlFor="chiave-api">
            {t.incolla}
          </label>
          <input
            id="chiave-api"
            className="ingresso ingresso--mono"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={t.segnaposto}
            value={chiave}
            onChange={(e) => {
              setChiave(e.target.value);
              if (erroreFormato) setErroreFormato(null);
            }}
            aria-invalid={erroreFormato ? 'true' : undefined}
            aria-describedby={erroreFormato ? 'chiave-errore' : 'chiave-privacy'}
          />
          {erroreFormato ? (
            <span id="chiave-errore" className="campo__errore" role="alert">
              {erroreFormato}
            </span>
          ) : null}
          <span id="chiave-privacy" className="campo__nota">
            {t.dovePrivacy}
          </span>
        </div>

        <Scelte nome="tetto" legenda={t.tetto.domanda} opzioni={t.tetto.opzioni} valore={tetto} onCambia={setTetto} />
        <p className="attenuato piccolo">{t.tetto.nota}</p>
        <Scelte nome="qualita" legenda={t.qualita.domanda} opzioni={t.qualita.opzioni} valore={livello} onCambia={setLivello} />
        <p className="attenuato piccolo">{t.notaMax}</p>

        {inCorso ? <Avviso livello="info">{t.verificaInCorso}</Avviso> : null}
        {esito ? <Avviso livello={esito.ok ? 'ok' : 'errore'}>{esito.messaggio}</Avviso> : null}

        <div className="procedura__piede">
          <Pulsante onClick={onIndietro}>{comuni.pulsanti.indietro}</Pulsante>
          {esito?.ok ? (
            <Pulsante variante="primario" onClick={onCollegato}>
              {comuni.pulsanti.continua}
            </Pulsante>
          ) : (
            <Pulsante type="submit" variante="primario" disabled={inCorso || chiave.trim().length === 0}>
              {finestra.s0.cervello.collega}
            </Pulsante>
          )}
        </div>
      </form>
    </Cornice>
  );
}
