/** Limite di Telegram per `callback_data` (byte). */
export const MAX_CALLBACK_BYTE = 64;

export type AmpiezzaRicomincia = 'presentazioni' | 'squadra' | 'tutto' | 'annulla';

export type DatiCallback =
  | { tipo: 'permesso'; id: string; esito: 'ok' | 'no' }
  | { tipo: 'domanda'; id: string; scelta: number | 'fine' }
  | { tipo: 'ricomincia'; ampiezza: AmpiezzaRicomincia };

const ID = /^[A-Za-z0-9_-]{1,20}$/;

/** `p:<id>:ok|no`, `d:<id>:<n|fine>`, `r:<ampiezza>`; sempre ≤ 64 byte. */
export function codificaCallback(dati: DatiCallback): string {
  let s: string;
  switch (dati.tipo) {
    case 'permesso':
      if (!ID.test(dati.id)) throw new RangeError('id richiesta non valido per il callback');
      s = `p:${dati.id}:${dati.esito}`;
      break;
    case 'domanda':
      if (!ID.test(dati.id)) throw new RangeError('id domanda non valido per il callback');
      s = `d:${dati.id}:${dati.scelta}`;
      break;
    case 'ricomincia':
      s = `r:${dati.ampiezza}`;
      break;
  }
  if (Buffer.byteLength(s, 'utf8') > MAX_CALLBACK_BYTE) throw new RangeError('callback_data oltre 64 byte');
  return s;
}

export function decodificaCallback(dati: string | undefined): DatiCallback | undefined {
  if (!dati || Buffer.byteLength(dati, 'utf8') > MAX_CALLBACK_BYTE) return undefined;
  const parti = dati.split(':');
  const [tipo, a, b] = parti;
  if (tipo === 'p' && parti.length === 3 && a && ID.test(a) && (b === 'ok' || b === 'no')) return { tipo: 'permesso', id: a, esito: b };
  if (tipo === 'd' && parti.length === 3 && a && ID.test(a) && b !== undefined) {
    if (b === 'fine') return { tipo: 'domanda', id: a, scelta: 'fine' };
    if (/^\d{1,3}$/.test(b)) return { tipo: 'domanda', id: a, scelta: Number(b) };
    return undefined;
  }
  if (tipo === 'r' && parti.length === 2 && (a === 'presentazioni' || a === 'squadra' || a === 'tutto' || a === 'annulla')) {
    return { tipo: 'ricomincia', ampiezza: a };
  }
  return undefined;
}

/** Riserva a testo per le conferme: "sì k7m2xq" / "no k7m2xq" (docs/02 §6). */
export function interpretaConfermaTesto(testo: string): { id: string; esito: 'ok' | 'no' } | undefined {
  const m = /^\s*(s[iì]|no)\s+([A-Za-z0-9_-]{4,20})\s*$/i.exec(testo);
  if (!m) return undefined;
  return { id: m[2] as string, esito: (m[1] as string).toLowerCase().startsWith('s') ? 'ok' : 'no' };
}
