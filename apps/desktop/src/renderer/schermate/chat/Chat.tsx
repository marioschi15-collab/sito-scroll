import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { finestra } from '@spalla/it-copy';
import { Avviso } from '../../componenti/Avviso.js';
import { Pulsante } from '../../componenti/Pulsante.js';
import { apiAllegati, messaggioErrore } from '../../stato/api.js';
import { useChat } from '../../stato/chatContesto.js';
import { useStore } from '../../stato/store.js';
import type { Blocco } from '../../stato/chat.js';
import { Domanda } from './Domanda.js';
import { Ingresso } from './Ingresso.js';
import { MessaggioAssistente, MessaggioUtente, RigaFine, RigaSistema, RigaStrumento } from './Messaggio.js';
import { SchedaPermesso } from './SchedaPermesso.js';

function VoceChat({ blocco, nome }: { blocco: Blocco; nome: string }): ReactNode {
  const { rispondi, decidi, seleziona } = useChat();
  const { stato: statoApp } = useStore();
  switch (blocco.tipo) {
    case 'utente':
      return <MessaggioUtente blocco={blocco} />;
    case 'assistente':
      return <MessaggioAssistente blocco={blocco} nome={nome} />;
    case 'strumento':
      return <RigaStrumento descrizione={blocco.descrizione} ruolo={blocco.ruolo} />;
    case 'domanda':
      return (
        <Domanda
          domanda={blocco.domanda}
          risposta={blocco.risposta}
          chiusa={blocco.chiusa}
          selezione={blocco.selezione}
          onSeleziona={(etichette) => seleziona(blocco.domanda.id, etichette)}
          onRispondi={(r) => void rispondi(blocco.domanda.id, blocco.scambioId, r)}
        />
      );
    case 'permesso':
      return <SchedaPermesso richiesta={blocco.richiesta} esito={blocco.esito} onDecidi={(e) => void decidi(blocco.richiesta.id, e)} />;
    case 'fine':
      return <RigaFine durataMs={blocco.durataMs} costoUsd={blocco.costoUsd} conChiaveApi={statoApp?.cervello.modalita === 'chiave_api'} />;
    case 'errore':
      return (
        <Avviso livello="errore">
          {blocco.messaggio}
        </Avviso>
      );
    case 'sistema':
      return <RigaSistema testo={blocco.testo} dettagli={blocco.dettagli} />;
  }
}

/** La chat (docs/02 §4 "Interfaccia"): messaggi in streaming, attività attenuate, domande a chip, schede di permesso. */
export function Chat(): ReactNode {
  const { stato: statoApp, bozzaChat, bozzaConsumata } = useStore();
  const chat = useChat();
  const nome = statoApp?.nomeAssistente ?? finestra.chat.assistenteSenzaNome;
  const [allegati, setAllegati] = useState<string[]>([]);
  const [trascinamento, setTrascinamento] = useState(false);
  const [avvisoAllegati, setAvvisoAllegati] = useState<string | null>(null);
  const fondo = useRef<HTMLDivElement>(null);

  const blocchi = chat.stato.blocchi;
  const ultimoTesto = blocchi.length > 0 ? JSON.stringify(blocchi[blocchi.length - 1]).length : 0;
  useEffect(() => {
    fondo.current?.scrollIntoView?.({ block: 'end' });
  }, [blocchi.length, ultimoTesto]);

  async function lascia(e: DragEvent<HTMLElement>): Promise<void> {
    e.preventDefault();
    setTrascinamento(false);
    const file = Array.from(e.dataTransfer?.files ?? []);
    if (file.length === 0) return;
    const api = apiAllegati();
    if (!api) {
      setAvvisoAllegati(finestra.chat.allegati.nonDisponibile);
      return;
    }
    try {
      const percorsi = await api.aggiungi(file);
      setAllegati((a) => [...a, ...percorsi.filter((p) => !a.includes(p))]);
      setAvvisoAllegati(null);
    } catch (errore) {
      setAvvisoAllegati(messaggioErrore(errore, finestra.generale.errore));
    }
  }

  const attesaPrimaParola = chat.stato.ritualeInCorso && !blocchi.some((b) => b.tipo === 'assistente');

  return (
    <section
      className={`chat${trascinamento ? ' chat--trascinamento' : ''}`}
      aria-label={finestra.chat.messaggi}
      onDragOver={(e) => {
        e.preventDefault();
        if (!trascinamento) setTrascinamento(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setTrascinamento(false);
      }}
      onDrop={(e) => void lascia(e)}
    >
      <header className="chat__testa">
        <h1>{nome}</h1>
        <Pulsante piccolo variante="discreto" onClick={() => void chat.nuovoArgomento()} title={finestra.chat.nuovoArgomentoNota}>
          {finestra.chat.nuovoArgomento}
        </Pulsante>
      </header>

      <div className="chat__messaggi" role="log" aria-live="polite" aria-relevant="additions" aria-label={finestra.chat.messaggi}>
        <div className="chat__messaggi-interno">
          {blocchi.length === 0 && !attesaPrimaParola ? <p className="riga-sistema">{finestra.chat.vuota(nome)}</p> : null}
          {blocchi.map((b) => (
            <VoceChat key={b.id} blocco={b} nome={nome} />
          ))}
          {attesaPrimaParola ? <p className="riga-sistema">{finestra.chat.presentazioniInCorso}</p> : null}
          {chat.stato.scambioInCorso && !attesaPrimaParola ? (
            <p className="riga-strumento" role="status">
              {finestra.chat.inCorso}
            </p>
          ) : null}
          <div ref={fondo} />
        </div>
      </div>

      {trascinamento ? <div className="chat__trascina">{finestra.chat.allegati.trascina}</div> : null}
      {avvisoAllegati ? (
        <div className="chat__allegati">
          <Avviso livello="attenzione" onChiudi={() => setAvvisoAllegati(null)}>
            {avvisoAllegati}
          </Avviso>
        </div>
      ) : null}

      <Ingresso
        allegati={allegati}
        onTogliAllegato={(p) => setAllegati((a) => a.filter((x) => x !== p))}
        bozza={bozzaChat}
        onBozzaConsumata={bozzaConsumata}
        onInvia={async (testo) => {
          const daInviare = allegati;
          setAllegati([]);
          await chat.invia(testo, daInviare);
        }}
        onNuovoArgomento={() => void chat.nuovoArgomento()}
        inCorso={Boolean(chat.stato.scambioInCorso)}
        onInterrompi={() => void chat.interrompi()}
        mostraConsigliati={chat.mostraConsigliati}
      />
    </section>
  );
}
