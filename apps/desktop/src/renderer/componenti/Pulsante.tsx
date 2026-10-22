import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'normale' | 'primario' | 'discreto' | 'pericolo';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  grande?: boolean;
  piccolo?: boolean;
  children: ReactNode;
}

/** Pulsante con le quattro varianti; sempre `type="button"` salvo indicazione, così non invia moduli per sbaglio. */
export function Pulsante({ variante = 'normale', grande, piccolo, className, type = 'button', children, ...resto }: Props): ReactNode {
  const classi = ['pulsante'];
  if (variante !== 'normale') classi.push(`pulsante--${variante}`);
  if (grande) classi.push('pulsante--grande');
  if (piccolo) classi.push('pulsante--piccolo');
  if (className) classi.push(className);
  return (
    <button type={type} className={classi.join(' ')} {...resto}>
      {children}
    </button>
  );
}
