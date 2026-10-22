import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

/**
 * Un terminale a righe: una sola domanda alla volta, in ordine. Le righe scritte quando nessuno sta
 * chiedendo restano in attesa e vengono consegnate alla domanda successiva.
 */
export interface Terminale {
  /**
   * Mostra il prompt e attende una riga; null se l'ingresso è stato chiuso o se `annullamento` scatta prima della
   * risposta (la domanda viene ritirata: la prossima riga scritta andrà alla domanda successiva, non a questa).
   */
  chiedi(prompt: string, annullamento?: AbortSignal): Promise<string | null>;
  scrivi(testo: string): void;
  /** Testo attenuato (grigio) se il terminale lo supporta. */
  attenua(testo: string): string;
  evidenzia(testo: string): string;
  readonly chiuso: boolean;
  chiudi(): void;
}

export function creaTerminale(input: Readable, output: Writable): Terminale {
  const colori = Boolean((output as NodeJS.WriteStream).isTTY);
  const rl = readline.createInterface({ input, output, terminal: colori && Boolean((input as NodeJS.ReadStream).isTTY), historySize: 200 });
  const righeInAttesa: string[] = [];
  const domandeInAttesa: Array<(riga: string | null) => void> = [];
  let chiuso = false;

  rl.on('line', (riga) => {
    const domanda = domandeInAttesa.shift();
    if (domanda) domanda(riga);
    else righeInAttesa.push(riga);
  });
  rl.on('close', () => {
    chiuso = true;
    for (const d of domandeInAttesa.splice(0)) d(null);
  });

  return {
    get chiuso() { return chiuso; },
    chiedi(prompt, annullamento) {
      // Le righe arrivate in anticipo (anche da un ingresso già chiuso, es. un file) vengono servite prima.
      const pronta = righeInAttesa.shift();
      if (pronta !== undefined) {
        output.write(prompt);
        return Promise.resolve(pronta);
      }
      if (chiuso || annullamento?.aborted) return Promise.resolve(null);
      output.write(prompt);
      return new Promise((risolvi) => {
        const domanda = (riga: string | null) => {
          annullamento?.removeEventListener('abort', ritira);
          risolvi(riga);
        };
        function ritira(): void {
          const i = domandeInAttesa.indexOf(domanda);
          if (i >= 0) domandeInAttesa.splice(i, 1);
          output.write('\n');
          risolvi(null);
        }
        annullamento?.addEventListener('abort', ritira, { once: true });
        domandeInAttesa.push(domanda);
      });
    },
    scrivi(testo) {
      output.write(testo);
    },
    attenua: (testo) => (colori ? `\u001b[2m${testo}\u001b[0m` : testo),
    evidenzia: (testo) => (colori ? `\u001b[1m${testo}\u001b[0m` : testo),
    chiudi() {
      if (!chiuso) rl.close();
    },
  };
}
