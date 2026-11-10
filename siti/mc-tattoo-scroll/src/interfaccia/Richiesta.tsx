// src/interfaccia/Richiesta.tsx — il modulo che trasforma chi guarda in chi scrive: poche scelte a
// tocco (stile, zona, misura), due righe sull'idea, e un pulsante che apre WhatsApp con il messaggio
// già pronto. Non spedisce niente da solo: è la persona a premere "invia" dentro WhatsApp.
import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { Magnetico } from './Magnetico.js';
import { studio, urlWhatsAppCon } from '../dati/studio.js';

const STILI = ['Giapponese', 'Fine line', 'Lettering', 'Dotwork', 'Blackwork', 'Non lo so ancora'] as const;
const ZONE = ['Braccio', 'Gamba', 'Schiena', 'Petto', 'Altro'] as const;
const MISURE = ['Piccolo', 'Medio', 'Grande'] as const;

function Scelte({ titolo, voci, valore, onScelta }: { titolo: string; voci: readonly string[]; valore: string; onScelta: (v: string) => void }): ReactElement {
  const nome = useId();
  return (
    <fieldset className="richiesta__gruppo">
      <legend className="etichetta">{titolo}</legend>
      <div className="richiesta__scelte">
        {voci.map((v) => (
          <label key={v} className={`scelta${valore === v ? ' scelta--attiva' : ''}`}>
            <input type="radio" name={nome} value={v} checked={valore === v} onChange={() => onScelta(v)} />
            <span>{v}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Compone il messaggio con quello che la persona ha scelto, saltando ciò che ha lasciato vuoto. */
export function componi(nome: string, idea: string, stile: string, zona: string, misura: string): string {
  const righe = [`Ciao ${studio.nome}${nome.trim() ? `, sono ${nome.trim()}` : ''}. Vorrei prenotare una consulenza per un tatuaggio.`];
  const dettagli: string[] = [];
  if (stile && stile !== 'Non lo so ancora') dettagli.push(`stile ${stile}`);
  if (misura) dettagli.push(`misura: ${misura.toLowerCase()}`);
  if (zona) dettagli.push(`zona: ${zona.toLowerCase()}`);
  if (dettagli.length > 0) righe.push(`Ho in mente: ${dettagli.join(', ')}.`);
  if (idea.trim()) righe.push(`L’idea: ${idea.trim()}`);
  righe.push('Quando posso passare?');
  return righe.join('\n');
}

export function Richiesta(): ReactElement {
  const [nome, setNome] = useState('');
  const [idea, setIdea] = useState('');
  const [stile, setStile] = useState('');
  const [zona, setZona] = useState('');
  const [misura, setMisura] = useState('');
  const idNome = useId();
  const idIdea = useId();
  return (
    <form className="richiesta" onSubmit={(e) => e.preventDefault()} aria-label="Prepara la tua richiesta">
      <div className="richiesta__campo">
        <label className="etichetta" htmlFor={idIdea}>
          Cosa hai in testa?
        </label>
        <textarea
          id={idIdea}
          rows={3}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Due righe bastano: un soggetto, una parola, una data…"
          data-lenis-prevent
        />
      </div>
      <Scelte titolo="Stile" voci={STILI} valore={stile} onScelta={setStile} />
      <Scelte titolo="Dove" voci={ZONE} valore={zona} onScelta={setZona} />
      <Scelte titolo="Misura" voci={MISURE} valore={misura} onScelta={setMisura} />
      <div className="richiesta__campo richiesta__campo--nome">
        <label className="etichetta" htmlFor={idNome}>
          Il tuo nome
        </label>
        <input id={idNome} type="text" autoComplete="given-name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Come ti chiami?" />
      </div>
      <div className="richiesta__invio">
        <Magnetico href={urlWhatsAppCon(componi(nome, idea, stile, zona, misura))} esterno className="pulsante pulsante--pieno pulsante--grande">
          <span>Invia la richiesta su WhatsApp</span>
          <span className="pulsante__freccia" aria-hidden="true">→</span>
        </Magnetico>
        <p className="richiesta__nota">Si apre WhatsApp con il messaggio già scritto: lo rileggi e lo invii tu. Ti rispondiamo di persona.</p>
      </div>
    </form>
  );
}
