import type { ReactNode } from 'react';

export interface Opzione<V extends string | number | null> {
  valore: V;
  etichetta: string;
  nota?: string;
}

interface Props<V extends string | number | null> {
  nome: string;
  legenda: string;
  opzioni: readonly Opzione<V>[];
  valore: V;
  onCambia(valore: V): void;
}

function chiave(v: string | number | null): string {
  return v === null ? 'nessuno' : String(v);
}

/** Gruppo di scelte esclusive reso come pulsanti (radio nativi sotto, per tastiera e lettori di schermo). */
export function Scelte<V extends string | number | null>({ nome, legenda, opzioni, valore, onCambia }: Props<V>): ReactNode {
  return (
    <fieldset className="campo" style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
      <legend className="campo__etichetta">{legenda}</legend>
      <div className="scelte">
        {opzioni.map((o) => (
          <label className="scelta" key={chiave(o.valore)}>
            <input type="radio" name={nome} value={chiave(o.valore)} checked={o.valore === valore} onChange={() => onCambia(o.valore)} />
            <span className="scelta__corpo">
              <span>{o.etichetta}</span>
              {o.nota ? <span className="scelta__nota">{o.nota}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
