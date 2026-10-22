import { describe, expect, it } from 'vitest';
import { decifraBusta, generaCoppiaEffimera, type BustaCifrata } from './crypto.js';
import { gestisci, nonceDaUsername, type Env } from './index.js';

/** KV finto in memoria con TTL. */
function kvFinto(adesso: () => number) {
  const dati = new Map<string, { valore: string; scade?: number }>();
  const vivo = (k: string) => {
    const v = dati.get(k);
    if (!v) return null;
    if (v.scade !== undefined && v.scade <= adesso()) {
      dati.delete(k);
      return null;
    }
    return v.valore;
  };
  const kv = {
    get: async (chiave: string, tipo?: string) => {
      const v = vivo(chiave);
      return v === null ? null : tipo === 'json' ? JSON.parse(v) : v;
    },
    put: async (chiave: string, valore: string, opzioni?: { expirationTtl?: number }) => {
      dati.set(chiave, { valore, scade: opzioni?.expirationTtl ? adesso() + opzioni.expirationTtl * 1000 : undefined });
    },
    delete: async (chiave: string) => {
      dati.delete(chiave);
    },
    chiavi: () => [...dati.keys()],
  };
  return kv;
}

const TOKEN_UTENTE = '7777777777:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1';

function fetchBotApiFinto(chiamate: Array<{ metodo: string; corpo: unknown }>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const metodo = url.slice(url.lastIndexOf('/') + 1);
    chiamate.push({ metodo, corpo: JSON.parse(String(init?.body)) });
    if (!url.startsWith('https://api.telegram.org/botGESTORE/')) return new Response('{"ok":false}', { status: 404 });
    if (metodo === 'setManagedBotAccessSettings') return Response.json({ ok: true, result: true });
    if (metodo === 'getManagedBotToken') return Response.json({ ok: true, result: TOKEN_UTENTE });
    return Response.json({ ok: false, error_code: 404, description: 'metodo sconosciuto' }, { status: 404 });
  }) as typeof fetch;
}

function ambiente(adesso: () => number) {
  const kv = kvFinto(adesso);
  const env = { COPPIE: kv as unknown as KVNamespace, BOT_GESTORE_TOKEN: 'GESTORE', WEBHOOK_SECRET: 'segreto-webhook', TTL_SECONDI: '600' } satisfies Env;
  return { env, kv };
}

const base = 'https://gestore.esempio';

describe('bot gestore: flusso completo', () => {
  it('registrazione → webhook managed_bot → consegna una tantum → decifrabile solo dall\'app', async () => {
    let ora = 1_700_000_000_000;
    const adesso = () => ora;
    const { env, kv } = ambiente(adesso);
    const chiamate: Array<{ metodo: string; corpo: unknown }> = [];
    const deps = { fetch: fetchBotApiFinto(chiamate), adesso };

    const app = await generaCoppiaEffimera();
    const nonce = 'k7m2xq9p4a';
    const registrazione = await gestisci(new Request(`${base}/pair`, { method: 'POST', body: JSON.stringify({ nonce, chiave_pubblica: app.pubblicaBase64url }) }), env, deps);
    expect(registrazione.status).toBe(204);

    // In attesa: 202
    expect((await gestisci(new Request(`${base}/pair/${nonce}`), env, deps)).status).toBe(202);

    // Webhook senza segreto: 401 e nessuna chiamata alla Bot API
    const senzaSegreto = await gestisci(new Request(`${base}/webhook`, { method: 'POST', body: '{}' }), env, deps);
    expect(senzaSegreto.status).toBe(401);

    const update = { update_id: 1, managed_bot: { user: { id: 987654321, first_name: 'Marco' }, bot: { id: 7777777777, is_bot: true, first_name: 'Bruno di Marco', username: `spalla_${nonce}_bot` } } };
    const webhook = await gestisci(
      new Request(`${base}/webhook`, { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'segreto-webhook' }, body: JSON.stringify(update) }),
      env,
      deps,
    );
    expect(webhook.status).toBe(200);
    expect(chiamate.map((c) => c.metodo)).toEqual(['setManagedBotAccessSettings', 'getManagedBotToken']);
    expect(chiamate[0]?.corpo).toEqual({ user_id: 7777777777, is_access_restricted: true });
    // il token in chiaro non è mai in KV
    for (const chiave of kv.chiavi()) expect(await kv.get(chiave)).not.toContain(TOKEN_UTENTE);
    expect(kv.chiavi()).toEqual([`consegna:${nonce}`]);

    const consegna = await gestisci(new Request(`${base}/pair/${nonce}`), env, deps);
    expect(consegna.status).toBe(200);
    const busta = (await consegna.json()) as BustaCifrata;
    const contenuto = await decifraBusta(busta, app.coppia.privateKey, nonce);
    expect(contenuto).toEqual({ token: TOKEN_UTENTE, id_proprietario: 987654321, username: `spalla_${nonce}_bot` });

    // Cancellata alla lettura
    expect((await gestisci(new Request(`${base}/pair/${nonce}`), env, deps)).status).toBe(404);
    expect(kv.chiavi()).toEqual([]);

    // Un update ripetuto non fa nulla (nessuna richiesta pendente)
    chiamate.length = 0;
    const ripetuto = await gestisci(
      new Request(`${base}/webhook`, { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'segreto-webhook' }, body: JSON.stringify(update) }),
      env,
      deps,
    );
    expect(ripetuto.status).toBe(200);
    expect(chiamate).toEqual([]);
  });

  it('la richiesta scade dopo il TTL e il nonce non si può riusare finché è vivo', async () => {
    let ora = 1_700_000_000_000;
    const adesso = () => ora;
    const { env } = ambiente(adesso);
    const app = await generaCoppiaEffimera();
    const corpo = JSON.stringify({ nonce: 'abcdefgh12', chiave_pubblica: app.pubblicaBase64url });
    expect((await gestisci(new Request(`${base}/pair`, { method: 'POST', body: corpo }), env)).status).toBe(204);
    expect((await gestisci(new Request(`${base}/pair`, { method: 'POST', body: corpo }), env)).status).toBe(409);
    ora += 601_000;
    expect((await gestisci(new Request(`${base}/pair/abcdefgh12`), env)).status).toBe(404);
    expect((await gestisci(new Request(`${base}/pair`, { method: 'POST', body: corpo }), env)).status).toBe(204);
  });

  it('rifiuta nonce e chiavi non validi, ignora bot non nostri, 500 se la Bot API fallisce', async () => {
    const adesso = () => 1_700_000_000_000;
    const { env } = ambiente(adesso);
    const app = await generaCoppiaEffimera();
    expect((await gestisci(new Request(`${base}/pair`, { method: 'POST', body: JSON.stringify({ nonce: 'MAIUSCOLO!', chiave_pubblica: app.pubblicaBase64url }) }), env)).status).toBe(400);
    expect((await gestisci(new Request(`${base}/pair`, { method: 'POST', body: JSON.stringify({ nonce: 'abcdefgh12', chiave_pubblica: 'AAAA' }) }), env)).status).toBe(400);
    expect((await gestisci(new Request(`${base}/pair`, { method: 'POST', body: 'non json' }), env)).status).toBe(400);
    expect((await gestisci(new Request(`${base}/altro`), env)).status).toBe(404);
    expect((await gestisci(new Request(`${base}/`), env)).status).toBe(200);

    const intestazioni = { 'x-telegram-bot-api-secret-token': 'segreto-webhook' };
    const estraneo = { update_id: 2, managed_bot: { user: { id: 1 }, bot: { id: 2, is_bot: true, username: 'altro_bot' } } };
    expect((await gestisci(new Request(`${base}/webhook`, { method: 'POST', headers: intestazioni, body: JSON.stringify(estraneo) }), env)).status).toBe(200);

    await gestisci(new Request(`${base}/pair`, { method: 'POST', body: JSON.stringify({ nonce: 'abcdefgh12', chiave_pubblica: app.pubblicaBase64url }) }), env);
    const nostro = { update_id: 3, managed_bot: { user: { id: 1 }, bot: { id: 2, is_bot: true, username: 'spalla_abcdefgh12_bot' } } };
    const fetchRotto = (async () => Response.json({ ok: false, error_code: 400, description: 'Bad Request' }, { status: 400 })) as typeof fetch;
    const esito = await gestisci(new Request(`${base}/webhook`, { method: 'POST', headers: intestazioni, body: JSON.stringify(nostro) }), env, { fetch: fetchRotto });
    expect(esito.status).toBe(500);
    // la richiesta resta: Telegram ritenterà
    expect((await gestisci(new Request(`${base}/pair/abcdefgh12`), env)).status).toBe(202);
  });

  it('riconosce il nonce dallo username, senza distinguere le maiuscole', () => {
    expect(nonceDaUsername('spalla_k7m2xq9p4a_bot', 'spalla')).toBe('k7m2xq9p4a');
    expect(nonceDaUsername('Spalla_K7M2XQ9P4A_Bot', 'spalla')).toBe('k7m2xq9p4a');
    expect(nonceDaUsername('spalla_k7m2xq9p4a', 'spalla')).toBeUndefined();
    expect(nonceDaUsername('altro_k7m2xq9p4a_bot', 'spalla')).toBeUndefined();
    expect(nonceDaUsername(undefined, 'spalla')).toBeUndefined();
  });
});
