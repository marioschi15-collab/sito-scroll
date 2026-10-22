import crypto from 'node:crypto';

/**
 * Alfabeto senza caratteri confondibili (niente l, 1, I, O, 0): l'id viene letto e a volte
 * digitato dall'utente ("sì k7m2xq" su Telegram, docs/02 §6).
 */
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Id breve e casuale (6-8 caratteri) per una richiesta di permesso; sta nei 64 byte del callback_data. */
export function generaIdRichiesta(lunghezza = 7): string {
  if (lunghezza < 6 || lunghezza > 8) throw new RangeError('lunghezza id tra 6 e 8');
  let id = '';
  // Campionamento con rifiuto: nessuna distorsione da modulo.
  const limite = 256 - (256 % ALFABETO.length);
  while (id.length < lunghezza) {
    const byte = crypto.randomBytes(1)[0] as number;
    if (byte >= limite) continue;
    id += ALFABETO[byte % ALFABETO.length];
  }
  return id;
}
