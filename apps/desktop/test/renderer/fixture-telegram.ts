import type { StatoTelegram } from '../../src/ipc/contratto.js';

/**
 * Il pairing in attesa COME LO MANDA il processo principale (src/main/telegram.ts): il codice è vuoto, l'utente lo
 * digita leggendolo sul telefono. Usato sia dalla prova del processo principale sia da quella della finestra, così
 * i due lati non possono divergere.
 */
export const PAIRING_PER_FINESTRA: NonNullable<StatoTelegram['pairingInAttesa']> = {
  codice: '',
  nome: 'Marco',
  scadeAlle: '2026-10-22T10:30:00.000Z',
};
