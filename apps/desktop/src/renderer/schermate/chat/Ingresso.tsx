import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { finestra, onboarding } from '@spalla/it-copy';
import { Pulsante } from '../../componenti/Pulsante.js';

interface Props {
  allegati: string[];
  onTogliAllegato(percorso: string): void;
  /** Testo da mettere nella casella arrivando da un'altra sezione. */
  bozza?: string;
  onBozzaConsumata(): void;
  onInvia(testo: string): Promise<void>;
  onNuovoArgomento(): void;
  inCorso: boolean;
  /** Una domanda dell'assistente aspetta risposta: il testo scritto qui risponde a lei (lo dice il segnaposto). */
  domandaAperta?: boolean;
  onInterrompi(): void;
  mostraConsigliati: boolean;
}

/** Comandi scritti nella casella che la finestra gestisce da sé. */
const COMANDI_NUOVO = new Set(['/nuova', '/nuovo']);

/** Nome del file da un percorso relativo (per i distintivi degli allegati). */
export function nomeFile(percorso: string): string {
  const parti = percorso.split(/[\\/]/);
  return parti[parti.length - 1] || percorso;
}

/**
 * Casella di scrittura: Invio invia, Maiusc+Invio va a capo; "/nuova" apre un nuovo argomento.
 * Accanto, durante le presentazioni, il pulsante fisso [Vai con i consigliati] che invia esattamente quel testo.
 */
export function Ingresso({ allegati, onTogliAllegato, bozza, onBozzaConsumata, onInvia, onNuovoArgomento, inCorso, onInterrompi, mostraConsigliati, domandaAperta }: Props): ReactNode {
  const [testo, setTesto] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (bozza === undefined) return;
    setTesto(bozza);
    onBozzaConsumata();
    area.current?.focus();
  }, [bozza, onBozzaConsumata]);

  async function invia(): Promise<void> {
    const pulito = testo.trim();
    if (COMANDI_NUOVO.has(pulito.toLowerCase())) {
      setTesto('');
      onNuovoArgomento();
      return;
    }
    if (!pulito && allegati.length === 0) return;
    setTesto('');
    await onInvia(pulito);
    area.current?.focus();
  }

  function tasto(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void invia();
  }

  return (
    <div className="chat__ingresso">
      {allegati.length > 0 ? (
        <ul className="chat__allegati" aria-label={finestra.chat.allegati.aggiunti(allegati.length)}>
          {allegati.map((p) => (
            <li key={p} className="distintivo">
              {nomeFile(p)}
              <button type="button" aria-label={`${finestra.chat.allegati.rimuovi}: ${nomeFile(p)}`} onClick={() => onTogliAllegato(p)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="chat__ingresso-interno">
        <label htmlFor="casella-chat" className="solo-lettore">
          {finestra.chat.etichettaCasella}
        </label>
        <textarea
          id="casella-chat"
          ref={area}
          className="area-testo"
          rows={2}
          value={testo}
          placeholder={domandaAperta ? finestra.chat.segnapostoDomanda : finestra.chat.segnaposto}
          maxLength={100_000}
          onChange={(e) => setTesto(e.target.value)}
          onKeyDown={tasto}
        />
        {mostraConsigliati ? (
          <Pulsante onClick={() => void onInvia(onboarding.pulsantiFissi.vaiConsigliati)}>{onboarding.pulsantiFissi.vaiConsigliati}</Pulsante>
        ) : null}
        {inCorso ? <Pulsante onClick={onInterrompi}>{finestra.chat.interrompi}</Pulsante> : null}
        <Pulsante variante="primario" onClick={() => void invia()} disabled={!testo.trim() && allegati.length === 0}>
          {finestra.chat.invia}
        </Pulsante>
      </div>
    </div>
  );
}
