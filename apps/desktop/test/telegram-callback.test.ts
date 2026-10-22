import { describe, expect, it } from 'vitest';
import { codificaCallback, decodificaCallback, interpretaConfermaTesto, MAX_CALLBACK_BYTE } from '../src/nucleo/telegram/callback.js';

describe('callback_data', () => {
  it('permessi: p:<id>:ok|no, andata e ritorno, ≤ 64 byte', () => {
    const s = codificaCallback({ tipo: 'permesso', id: 'k7m2xq', esito: 'ok' });
    expect(s).toBe('p:k7m2xq:ok');
    expect(Buffer.byteLength(s)).toBeLessThanOrEqual(MAX_CALLBACK_BYTE);
    expect(decodificaCallback(s)).toEqual({ tipo: 'permesso', id: 'k7m2xq', esito: 'ok' });
    expect(decodificaCallback('p:k7m2xq:no')).toEqual({ tipo: 'permesso', id: 'k7m2xq', esito: 'no' });
  });

  it('domande e ricomincia', () => {
    expect(decodificaCallback(codificaCallback({ tipo: 'domanda', id: 'abc123', scelta: 2 }))).toEqual({ tipo: 'domanda', id: 'abc123', scelta: 2 });
    expect(decodificaCallback(codificaCallback({ tipo: 'domanda', id: 'abc123', scelta: 'fine' }))).toEqual({ tipo: 'domanda', id: 'abc123', scelta: 'fine' });
    expect(decodificaCallback(codificaCallback({ tipo: 'ricomincia', ampiezza: 'tutto' }))).toEqual({ tipo: 'ricomincia', ampiezza: 'tutto' });
  });

  it('rifiuta dati malformati o troppo lunghi', () => {
    expect(decodificaCallback(undefined)).toBeUndefined();
    expect(decodificaCallback('')).toBeUndefined();
    expect(decodificaCallback('p:k7m2xq:forse')).toBeUndefined();
    expect(decodificaCallback('p::ok')).toBeUndefined();
    expect(decodificaCallback('x:abc')).toBeUndefined();
    expect(decodificaCallback('d:abc:1:2')).toBeUndefined();
    expect(decodificaCallback(`p:${'a'.repeat(70)}:ok`)).toBeUndefined();
    expect(() => codificaCallback({ tipo: 'permesso', id: 'a'.repeat(30), esito: 'ok' })).toThrow();
    expect(() => codificaCallback({ tipo: 'permesso', id: 'con spazio', esito: 'ok' })).toThrow();
  });

  it('riserva a testo "sì <id>" / "no <id>"', () => {
    expect(interpretaConfermaTesto('sì k7m2xq')).toEqual({ id: 'k7m2xq', esito: 'ok' });
    expect(interpretaConfermaTesto('Si  k7m2xq ')).toEqual({ id: 'k7m2xq', esito: 'ok' });
    expect(interpretaConfermaTesto('no k7m2xq')).toEqual({ id: 'k7m2xq', esito: 'no' });
    // il parser è permissivo: è il canale a verificare che l'id sia di una richiesta in attesa
    expect(interpretaConfermaTesto('no grazie')).toEqual({ id: 'grazie', esito: 'no' });
    expect(interpretaConfermaTesto('sì')).toBeUndefined();
    expect(interpretaConfermaTesto('no, non ora')).toBeUndefined();
  });
});
