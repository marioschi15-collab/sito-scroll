// Tutte le stringhe italiane dell'interfaccia (terminale di sviluppo, Telegram, schermate, avvisi).
// Nessun gergo tecnico verso l'utente: mai "agente", "prompt", "token", "MCP"; "API" solo nella schermata della chiave.
export { comuni } from './comuni.js';
export { errori } from './errori.js';
export { permessi } from './permessi.js';
export { telegram } from './telegram.js';
export { cli } from './cli.js';
export { cervello } from './cervello.js';
export { onboarding } from './onboarding.js';
export { assistente, etichettaRuolo } from './assistente.js';
export { voce } from './voce.js';
export { finestra } from './finestra.js';
export { principale } from './principale.js';

import { comuni } from './comuni.js';
import { errori } from './errori.js';
import { permessi } from './permessi.js';
import { telegram } from './telegram.js';
import { cli } from './cli.js';
import { cervello } from './cervello.js';
import { onboarding } from './onboarding.js';
import { assistente } from './assistente.js';
import { voce } from './voce.js';
import { finestra } from './finestra.js';
import { principale } from './principale.js';

/** Un solo oggetto con tutto, per chi preferisce `testi.telegram.start(...)`. */
export const testi = {
  benvenuto: onboarding.benvenuto,
  comuni,
  errori,
  permessi,
  telegram,
  cli,
  cervello,
  onboarding,
  assistente,
  voce,
  finestra,
  principale,
} as const;
