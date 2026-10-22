import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  titolo: string;
  sottotitolo?: string;
  azioni?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Cornice delle sezioni (Squadra, Memoria, Telegram, ...): titolo che prende il fuoco all'arrivo, sottotitolo, contenuto. */
export function Pagina({ titolo, sottotitolo, azioni, className, children }: Props): ReactNode {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    h1.current?.focus();
  }, []);
  return (
    <div className={`pagina${className ? ` ${className}` : ''}`}>
      <header className="pagina__testa">
        <div className="riga-azioni riga-azioni--spazio" style={{ marginTop: 0 }}>
          <h1 ref={h1} tabIndex={-1}>
            {titolo}
          </h1>
          {azioni}
        </div>
        {sottotitolo ? <p>{sottotitolo}</p> : null}
      </header>
      {children}
    </div>
  );
}
