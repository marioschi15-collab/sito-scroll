import fsp from 'node:fs/promises';
import path from 'node:path';
import { cartellaInArrivo, nomeFileSicuro, percorsoLibero } from '../nucleo/telegram/allegati.js';
import { relativoPosix, risolviDentro, stessoOSotto } from './percorsi-sicuri.js';

/**
 * File trascinati nella finestra (docs/02 §8.4: stessa cartella degli allegati Telegram): il preload ricava il
 * percorso di ogni `File` con `webUtils.getPathForFile`, il processo principale li COPIA in lavoro/in-arrivo/
 * e restituisce i percorsi relativi da passare in `AvvioScambio.allegati`.
 */

/** Limite per file: oltre, il file non viene copiato (l'assistente non saprebbe comunque leggerlo bene). */
export const LIMITE_ALLEGATO_BYTE = 100 * 1024 * 1024;
export const LIMITE_ALLEGATO_MB = LIMITE_ALLEGATO_BYTE / (1024 * 1024);

export interface EsitoAllegati {
  /** Percorsi relativi alla cartella di lavoro (es. "lavoro/in-arrivo/2026-10-22_1012_preventivo.pdf"). */
  copiati: string[];
  /** Frasi in italiano per i file saltati. */
  saltati: string[];
}

export interface OpzioniAllegati {
  cartellaLavoro: string;
  /** Cartelle da cui non si copia mai (dati dell'app, segreti, cartella del binario). */
  vietate: string[];
  testi: { troppoGrande(nome: string, mb: number): string; nonLeggibile(nome: string): string };
  adesso?: () => Date;
}

export async function copiaAllegati(sorgenti: readonly string[], o: OpzioniAllegati): Promise<EsitoAllegati> {
  const adesso = o.adesso ?? (() => new Date());
  const destinazione = cartellaInArrivo(o.cartellaLavoro);
  const esito: EsitoAllegati = { copiati: [], saltati: [] };

  for (const sorgente of sorgenti) {
    const nome = path.basename(sorgente) || 'file';
    try {
      if (!path.isAbsolute(sorgente)) throw new Error('relativo');
      const reale = await fsp.realpath(sorgente);
      if (o.vietate.some((v) => stessoOSotto(v, reale))) throw new Error('vietata');
      const info = await fsp.stat(reale);
      if (!info.isFile()) throw new Error('non è un file');
      if (info.size > LIMITE_ALLEGATO_BYTE) {
        esito.saltati.push(o.testi.troppoGrande(nome, LIMITE_ALLEGATO_MB));
        continue;
      }
      // Già dentro lavoro/in-arrivo (trascinato dalla finestra stessa): nessuna copia.
      if (stessoOSotto(destinazione, reale) && risolviDentro(o.cartellaLavoro, relativoPosix(o.cartellaLavoro, reale))) {
        esito.copiati.push(relativoPosix(o.cartellaLavoro, reale));
        continue;
      }
      const libero = await percorsoLibero(destinazione, nomeFileSicuro(nome, 'file', adesso()));
      await fsp.copyFile(reale, libero);
      esito.copiati.push(relativoPosix(o.cartellaLavoro, libero));
    } catch {
      esito.saltati.push(o.testi.nonLeggibile(nome));
    }
  }
  return esito;
}

/**
 * Gli allegati di `AvvioScambio` tornano percorsi assoluti per il Nucleo, solo se stanno in lavoro/in-arrivo/ ed
 * esistono; gli altri vengono scartati.
 */
export async function allegatiPerNucleo(relativi: readonly string[] | undefined, cartellaLavoro: string): Promise<string[]> {
  if (!relativi || relativi.length === 0) return [];
  const inArrivo = cartellaInArrivo(cartellaLavoro);
  const validi: string[] = [];
  for (const rel of relativi) {
    const assoluto = risolviDentro(cartellaLavoro, rel);
    if (!assoluto || !stessoOSotto(inArrivo, assoluto)) continue;
    try {
      if ((await fsp.stat(assoluto)).isFile()) validi.push(assoluto);
    } catch {
      // sparito nel frattempo
    }
  }
  return validi;
}
