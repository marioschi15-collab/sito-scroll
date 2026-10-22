import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';
import type { FileMemoriaVista } from '../../../ipc/contratto.js';
import type { ContatoriMemoria, RisultatoMemoria } from '../../../nucleo/contratti.js';
import { Avviso } from '../../componenti/Avviso.js';
import { Pagina } from '../../componenti/Pagina.js';
import { Pulsante } from '../../componenti/Pulsante.js';
import { messaggioErrore, spalla } from '../../stato/api.js';
import { useStore } from '../../stato/store.js';

/** Tetti mostrati nei contatori: gli stessi di `TETTI_MEMORIA` in @spalla/schema (docs/03 §6; una prova li confronta). */
export const TETTI_VISTI = { MEMORIA_RIGHE: 200, UTENTE_CARATTERI: 4000 } as const;

export type GruppoMemoria = 'profilo' | 'memoria' | 'temi' | 'diario' | 'altro';
const ORDINE: GruppoMemoria[] = ['profilo', 'memoria', 'temi', 'diario', 'altro'];

/** In che gruppo va un file, dal suo percorso relativo a cartellaLavoro. */
export function gruppoDi(percorso: string): GruppoMemoria {
  const p = percorso.replace(/\\/g, '/');
  if (p.startsWith('profilo/')) return 'profilo';
  if (p.startsWith('memoria/temi/')) return 'temi';
  if (p.startsWith('memoria/diario/')) return 'diario';
  if (p.startsWith('memoria/')) return 'memoria';
  return 'altro';
}

export function raggruppa(file: readonly FileMemoriaVista[]): Array<[GruppoMemoria, FileMemoriaVista[]]> {
  const mappa = new Map<GruppoMemoria, FileMemoriaVista[]>();
  for (const f of file) {
    const g = gruppoDi(f.percorso);
    mappa.set(g, [...(mappa.get(g) ?? []), f]);
  }
  return ORDINE.filter((g) => mappa.has(g)).map((g) => {
    const elenco = mappa.get(g) ?? [];
    // Il diario dal giorno più recente; il resto in ordine di titolo.
    elenco.sort((a, b) => (g === 'diario' ? b.percorso.localeCompare(a.percorso) : a.titolo.localeCompare(b.titolo, 'it')));
    return [g, elenco];
  });
}

function dataBreve(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

type Visore = { tipo: 'nessuno' } | { tipo: 'file'; file: FileMemoriaVista | { percorso: string; titolo: string; modificato?: string }; testo: string | null } | { tipo: 'riepilogo'; testo: string | null };

/** Memoria: elenco a sinistra (profilo, memoria, schede, diario), lettura a destra, ricerca e contatori. */
export function Memoria(): ReactNode {
  const { vai, notifica, stato } = useStore();
  const [file, setFile] = useState<FileMemoriaVista[] | null>(null);
  const [contatori, setContatori] = useState<ContatoriMemoria | null>(null);
  const [visore, setVisore] = useState<Visore>({ tipo: 'nessuno' });
  const [query, setQuery] = useState('');
  const [risultati, setRisultati] = useState<RisultatoMemoria[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const nome = stato?.nomeAssistente ?? finestra.chat.assistenteSenzaNome;

  const carica = useCallback(async () => {
    try {
      const api = spalla();
      const [elenco, conta] = await Promise.all([api.memoria.elenco(), api.memoria.contatori()]);
      setFile(elenco);
      setContatori(conta);
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    }
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function apri(f: FileMemoriaVista | { percorso: string; titolo: string; modificato?: string }): Promise<void> {
    setVisore({ tipo: 'file', file: f, testo: null });
    try {
      const testo = await spalla().memoria.leggi(f.percorso);
      setVisore({ tipo: 'file', file: f, testo });
    } catch (e) {
      setVisore({ tipo: 'nessuno' });
      setErrore(messaggioErrore(e, finestra.generale.errore));
    }
  }

  async function cerca(e: FormEvent): Promise<void> {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    try {
      setRisultati(await spalla().memoria.cerca(q));
    } catch (err) {
      setErrore(messaggioErrore(err, finestra.generale.errore));
    }
  }

  async function ricostruisci(): Promise<void> {
    setOccupato(true);
    try {
      await spalla().memoria.ricostruisciIndice();
      notifica({ testo: finestra.memoria.ricostruito, livello: 'ok' });
      await carica();
    } catch (e) {
      setErrore(messaggioErrore(e, finestra.generale.errore));
    } finally {
      setOccupato(false);
    }
  }

  async function riepilogo(): Promise<void> {
    setVisore({ tipo: 'riepilogo', testo: null });
    try {
      setVisore({ tipo: 'riepilogo', testo: await spalla().memoria.riepilogoProfilo() });
    } catch (e) {
      setVisore({ tipo: 'nessuno' });
      setErrore(messaggioErrore(e, finestra.generale.errore));
    }
  }

  const selezionato = visore.tipo === 'file' ? visore.file.percorso : undefined;

  return (
    <Pagina
      titolo={finestra.memoria.titolo}
      sottotitolo={finestra.memoria.sottotitolo}
      azioni={
        <div className="riga-azioni" style={{ marginTop: 0 }}>
          <Pulsante onClick={() => void riepilogo()}>{finestra.memoria.cosaSai}</Pulsante>
          <Pulsante variante="discreto" onClick={() => void ricostruisci()} disabled={occupato}>
            {finestra.memoria.ricostruisci}
          </Pulsante>
        </div>
      }
    >
      {errore ? (
        <Avviso livello="errore" onChiudi={() => setErrore(null)}>
          {errore}
        </Avviso>
      ) : null}
      {contatori ? (
        <div className="memoria__contatori" aria-label={finestra.memoria.contatori.etichetta} style={{ marginBottom: 16 }}>
          <span className="distintivo">{finestra.memoria.contatori.memoria(contatori.memoriaRighe, TETTI_VISTI.MEMORIA_RIGHE)}</span>
          <span className="distintivo">{finestra.memoria.contatori.profilo(contatori.utenteCaratteri, TETTI_VISTI.UTENTE_CARATTERI)}</span>
          <span className="distintivo">{finestra.memoria.contatori.schede(contatori.schede)}</span>
          <span className="distintivo">{finestra.memoria.contatori.diari(contatori.diari)}</span>
        </div>
      ) : null}

      <div className="memoria">
        <div className="memoria__sinistra">
          <form role="search" onSubmit={(e) => void cerca(e)} className="campo" style={{ margin: 0 }}>
            <label className="campo__etichetta" htmlFor="cerca-memoria">
              {finestra.memoria.cerca}
            </label>
            <div className="riga-azioni" style={{ marginTop: 0, flexWrap: 'nowrap' }}>
              <input
                id="cerca-memoria"
                className="ingresso"
                type="search"
                value={query}
                placeholder={finestra.memoria.cercaSegnaposto}
                maxLength={500}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Pulsante type="submit" piccolo disabled={!query.trim()}>
                {finestra.memoria.cercaPulsante}
              </Pulsante>
            </div>
          </form>

          {risultati ? (
            <div role="region" aria-label={finestra.memoria.risultati(risultati.length)}>
              <div className="riga-azioni riga-azioni--spazio" style={{ marginTop: 0 }}>
                <span className="attenuato piccolo" role="status">
                  {finestra.memoria.risultati(risultati.length)}
                </span>
                <Pulsante piccolo variante="discreto" onClick={() => setRisultati(null)}>
                  {finestra.memoria.chiudiRicerca}
                </Pulsante>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 8 }}>
                {risultati.map((r) => (
                  <li key={`${r.file}-${r.estratto.slice(0, 20)}`}>
                    <button type="button" className="risultato" onClick={() => void apri({ percorso: r.file, titolo: r.titolo, modificato: r.modificato })}>
                      <strong>{r.titolo}</strong>
                      <small>{r.estratto}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <nav aria-label={finestra.memoria.elenco}>
            {file === null && !errore ? <p className="attenuato">{finestra.generale.caricamento}</p> : null}
            {file && file.length === 0 ? <p className="attenuato">{finestra.memoria.vuoto}</p> : null}
            {file
              ? raggruppa(file).map(([gruppo, voci]) => (
                  <div key={gruppo} className="memoria__gruppo">
                    <h3>{finestra.memoria.gruppi[gruppo]}</h3>
                    <ul>
                      {voci.map((f) => (
                        <li key={f.percorso}>
                          <button type="button" className="memoria__file" aria-current={selezionato === f.percorso ? 'true' : undefined} onClick={() => void apri(f)}>
                            <span>{f.titolo}</span>
                            <small>{dataBreve(f.modificato)}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              : null}
          </nav>
        </div>

        <section className="scheda memoria__visore" aria-live="polite" aria-label={visore.tipo === 'file' ? visore.file.titolo : finestra.memoria.visore}>
          {visore.tipo === 'nessuno' ? <p className="attenuato">{finestra.memoria.scegliFile}</p> : null}
          {visore.tipo === 'riepilogo' ? (
            <>
              <h2>{finestra.memoria.cosaSai}</h2>
              {visore.testo === null ? <p className="attenuato">{finestra.generale.caricamento}</p> : <p style={{ whiteSpace: 'pre-wrap' }}>{visore.testo}</p>}
            </>
          ) : null}
          {visore.tipo === 'file' ? (
            <>
              <h2>{visore.file.titolo}</h2>
              <p className="attenuato piccolo">
                <code>{visore.file.percorso}</code>
                {visore.file.modificato ? ` · ${finestra.memoria.modificato(dataBreve(visore.file.modificato))}` : null}
              </p>
              {visore.testo === null ? <p className="attenuato">{finestra.generale.caricamento}</p> : <pre>{visore.testo}</pre>}
              <div className="riga-azioni">
                <Pulsante piccolo onClick={() => vai('chat', finestra.memoria.testoCorrezione(visore.file.percorso))}>
                  {finestra.memoria.chiediCorrezione(nome)}
                </Pulsante>
                <Pulsante piccolo variante="discreto" onClick={() => void spalla().app.apriNelSistema(visore.file.percorso)}>
                  {finestra.memoria.apriNelSistema}
                </Pulsante>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </Pagina>
  );
}
