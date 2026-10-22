import { errori as testiErrori, principale } from '@spalla/it-copy';
import { eNomeInvoke, validaArgomenti } from '../ipc/schemi.js';
import type { Logger } from '../nucleo/contratti.js';
import { ErroreUtente, type HostNucleo } from './nucleo-host.js';

/**
 * Dal canale IPC al Nucleo: nome noto → argomenti validati con zod → `host.chiama`. Senza Electron (provabile).
 * Alla finestra arrivano solo frasi in italiano: quelle volute (`ErroreUtente`, parametri non validi) così come sono,
 * tutto il resto come errore generico (il dettaglio va nel log, mai alla finestra: può contenere percorsi).
 */
export type PonteIpc = (nome: string, argomenti: readonly unknown[]) => Promise<unknown>;

function descrivi(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function creaPonteIpc(host: Pick<HostNucleo, 'chiama' | 'segnaAttivitaUtente'>, logger: () => Logger): PonteIpc {
  return async (nome, argomenti) => {
    if (!eNomeInvoke(nome)) {
      logger().avviso('ipc.metodo_sconosciuto', { metodo: String(nome).slice(0, 60) });
      throw new Error(principale.errori.metodoSconosciuto(String(nome).slice(0, 60)));
    }
    let validi;
    try {
      validi = validaArgomenti(nome, argomenti, principale.errori);
    } catch (e) {
      logger().avviso('ipc.parametri_non_validi', { metodo: nome });
      throw new Error(descrivi(e));
    }
    try {
      return await host.chiama(nome, validi);
    } catch (e) {
      if (e instanceof ErroreUtente) throw new Error(e.message);
      logger().errore('ipc.errore', { metodo: nome, errore: descrivi(e) });
      throw new Error(testiErrori.altro);
    }
  };
}
