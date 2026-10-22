import os from 'node:os';
import path from 'node:path';
import type { Percorsi } from './contratti.js';

/**
 * Percorsi per utente (docs/02 §5.2-5.3).
 * - Cartella di lavoro nella home, mai in Documenti né sincronizzata (ADR-005).
 * - Stato grande e credenziali del binario fuori dalla cartella di lavoro.
 * In sviluppo si può spostare tutto con SPALLA_HOME=/percorso (crea la struttura lì sotto).
 */
export function calcolaPercorsi(nomeProdotto = 'Spalla'): Percorsi {
  const radiceDev = process.env.SPALLA_HOME;
  if (radiceDev) {
    const r = path.resolve(radiceDev);
    return completa({
      cartellaLavoro: path.join(r, nomeProdotto),
      datiApp: path.join(r, 'dati-app'),
      datiLocali: path.join(r, 'dati-locali'),
    });
  }

  const home = os.homedir();
  const cartellaLavoro = path.join(home, nomeProdotto);

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
    return completa({
      cartellaLavoro,
      datiApp: path.join(appData, nomeProdotto),
      datiLocali: path.join(localAppData, nomeProdotto),
    });
  }

  if (process.platform === 'darwin') {
    const supporto = path.join(home, 'Library', 'Application Support', nomeProdotto);
    return completa({
      cartellaLavoro,
      datiApp: supporto,
      datiLocali: supporto,
      modelliVoce: path.join(home, 'Library', 'Caches', nomeProdotto, 'models'),
    });
  }

  // Linux (solo sviluppo/CI)
  const config = process.env.XDG_CONFIG_HOME ?? path.join(home, '.config');
  const dati = process.env.XDG_DATA_HOME ?? path.join(home, '.local', 'share');
  return completa({
    cartellaLavoro,
    datiApp: path.join(config, nomeProdotto.toLowerCase()),
    datiLocali: path.join(dati, nomeProdotto.toLowerCase()),
  });
}

function completa(base: { cartellaLavoro: string; datiApp: string; datiLocali: string; modelliVoce?: string }): Percorsi {
  return {
    cartellaLavoro: base.cartellaLavoro,
    datiApp: base.datiApp,
    datiLocali: base.datiLocali,
    configClaude: path.join(base.datiLocali, 'claude'),
    indiceMemoria: path.join(base.datiLocali, 'indice', 'memoria.sqlite'),
    modelliVoce: base.modelliVoce ?? path.join(base.datiLocali, 'models'),
    logs: path.join(base.datiLocali, 'logs'),
    segreti: path.join(base.datiLocali, 'secrets.bin'),
  };
}
