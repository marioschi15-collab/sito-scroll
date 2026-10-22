import { describe, expect, it } from 'vitest';
import { creaProceduraBotFather, normalizzaToken, REGEX_TOKEN, suggerisciUsername } from '../src/nucleo/telegram/botfather.js';

const TOKEN = '1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1';

describe('procedura BotFather di riserva (docs/02 §8.3)', () => {
  it('riconosce il formato del token e ripulisce ciò che l\'utente incolla', () => {
    expect(REGEX_TOKEN.test(TOKEN)).toBe(true);
    expect(REGEX_TOKEN.test('123:abc')).toBe(false);
    expect(normalizzaToken(`  "${TOKEN}" `)).toBe(TOKEN);
    expect(normalizzaToken(`token: ${TOKEN}`)).toBe(TOKEN);
    expect(normalizzaToken('1234567890: AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1')).toBe(TOKEN);
    const procedura = creaProceduraBotFather();
    expect(procedura.validaFormato(TOKEN)).toBe(true);
    expect(procedura.validaFormato('ciao')).toBe(false);
    expect(procedura.linkBotFather).toBe('https://t.me/BotFather');
  });

  it('suggerisce nome e username validi per Telegram', () => {
    expect(suggerisciUsername('Bruno', 'Marco', '7k3p')).toBe('bruno_di_marco_7k3p_bot');
    const u = suggerisciUsername('Ambra Lucìa', 'Giovanni Battista Verdi-Rossi', 'x9y2');
    expect(u).toMatch(/^[a-z][a-z0-9_]{3,30}bot$/);
    expect(u.length).toBeLessThanOrEqual(32);
    expect(suggerisciUsername('123', '!!!', 'ab12')).toBe('spalla_123_di_ab12_bot');
    const procedura = creaProceduraBotFather({ suffisso: () => 'q1w2' });
    expect(procedura.suggerisci('Bruno', 'Marco')).toEqual({ nome: 'Bruno di Marco', username: 'bruno_di_marco_q1w2_bot' });
  });

  it('verifica con getMe tramite fetch iniettato: ok, 401, formato sbagliato', async () => {
    const chiamate: string[] = [];
    const fetchFinto = (async (input: RequestInfo | URL) => {
      const url = String(input);
      chiamate.push(url);
      if (url.includes(`/bot${TOKEN}/getMe`)) {
        return Response.json({ ok: true, result: { id: 1234567890, is_bot: true, first_name: 'Bruno di Marco', username: 'bruno_di_marco_7k3p_bot' } });
      }
      return Response.json({ ok: false, error_code: 401, description: 'Unauthorized' }, { status: 401 });
    }) as typeof fetch;
    const procedura = creaProceduraBotFather({ fetch: fetchFinto });
    const ok = await procedura.verifica(` ${TOKEN}\n`);
    expect(ok).toEqual({ ok: true, username: 'bruno_di_marco_7k3p_bot', id: 1234567890, messaggio: expect.stringContaining('@bruno_di_marco_7k3p_bot') });
    const sbagliato = await procedura.verifica('1234567890:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    expect(sbagliato.ok).toBe(false);
    expect(sbagliato.messaggio).toMatch(/non riconosce/);
    const formato = await procedura.verifica('non è un token');
    expect(formato.ok).toBe(false);
    expect(formato.messaggio).toMatch(/due punti/);
    expect(chiamate).toHaveLength(2);
  });
});
