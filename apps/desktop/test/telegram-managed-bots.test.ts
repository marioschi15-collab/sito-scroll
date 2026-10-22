import { describe, expect, it } from 'vitest';
import { cifraPerApp, type BustaCifrata } from '../src/nucleo/telegram/crypto-coppia.js';
import { costruisciLink, creaClientManagedBots, ErroreCollegamento, generaNonce, REGEX_NONCE, usernameDaNonce } from '../src/nucleo/telegram/managed-bots.js';
import { cifraPerApp as cifraLatoWorker } from '../../../services/manager-bot/src/crypto.js';

const TOKEN = '7777777777:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1';

/** Un Worker gestore finto dietro `fetch`: registra la chiave, poi consegna la busta dopo N sondaggi. */
function gestoreFinto(opzioni: { sondaggiPrima?: number; cifra?: typeof cifraPerApp } = {}) {
  const richieste = new Map<string, string>();
  const chiamate: string[] = [];
  let sondaggi = 0;
  const cifra = opzioni.cifra ?? cifraPerApp;
  const fetchFinto = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    chiamate.push(`${init?.method ?? 'GET'} ${url.pathname}`);
    if (init?.method === 'POST' && url.pathname === '/pair') {
      const corpo = JSON.parse(String(init.body)) as { nonce: string; chiave_pubblica: string };
      if (!REGEX_NONCE.test(corpo.nonce)) return new Response(null, { status: 400 });
      richieste.set(corpo.nonce, corpo.chiave_pubblica);
      return new Response(null, { status: 204 });
    }
    if (url.pathname.startsWith('/pair/')) {
      const nonce = url.pathname.slice(6);
      const chiave = richieste.get(nonce);
      if (!chiave) return new Response(null, { status: 404 });
      if (sondaggi++ < (opzioni.sondaggiPrima ?? 2)) return Response.json({ stato: 'in_attesa' }, { status: 202 });
      richieste.delete(nonce);
      const busta: BustaCifrata = await cifra({ token: TOKEN, id_proprietario: 987654321, username: usernameDaNonce(nonce) }, chiave, nonce);
      return Response.json(busta);
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  return { fetchFinto, chiamate };
}

describe('creazione del bot in due tocchi, lato app (docs/02 §8.2)', () => {
  it('nonce, username e link', () => {
    const nonce = generaNonce();
    expect(nonce).toMatch(REGEX_NONCE);
    expect(usernameDaNonce('k7m2xq9p4a')).toBe('spalla_k7m2xq9p4a_bot');
    expect(costruisciLink('spalla_gestore_bot', 'spalla_k7m2xq9p4a_bot', 'Bruno di Marco')).toBe('https://t.me/newbot/spalla_gestore_bot/spalla_k7m2xq9p4a_bot?name=Bruno%20di%20Marco');
  });

  it('registra la chiave, sonda finché il gestore consegna, decifra il token', async () => {
    const gestore = gestoreFinto({ sondaggiPrima: 2 });
    const attese: number[] = [];
    const client = creaClientManagedBots({ urlGestore: 'https://gestore.esempio/', botGestore: 'spalla_gestore_bot', fetch: gestore.fetchFinto, attendi: async (ms) => void attese.push(ms), intervalloMs: 2000 });
    const collegamento = await client.avviaCollegamento({ nomeAssistente: 'Bruno', nomeUtente: 'Marco' });
    expect(collegamento.link).toBe(`https://t.me/newbot/spalla_gestore_bot/${collegamento.username}?name=Bruno%20di%20Marco`);
    expect(collegamento.username).toBe(`spalla_${collegamento.nonce}_bot`);
    const esito = await collegamento.attendi();
    expect(esito).toEqual({ token: TOKEN, id_proprietario: 987654321, username: collegamento.username });
    expect(attese).toEqual([2000, 2000]);
    expect(gestore.chiamate[0]).toBe('POST /pair');
    expect(gestore.chiamate.filter((c) => c.startsWith('GET /pair/'))).toHaveLength(3);
  });

  it('interoperabilità: la busta prodotta dal codice del Worker si apre con il codice dell\'app', async () => {
    const gestore = gestoreFinto({ sondaggiPrima: 0, cifra: cifraLatoWorker as unknown as typeof cifraPerApp });
    const client = creaClientManagedBots({ urlGestore: 'https://gestore.esempio', botGestore: 'g', fetch: gestore.fetchFinto, attendi: async () => undefined });
    const collegamento = await client.avviaCollegamento({ nomeAssistente: 'Bruno', nomeUtente: 'Marco' });
    expect((await collegamento.attendi()).token).toBe(TOKEN);
  });

  it('errori: gestore che rifiuta, timeout, annullamento', async () => {
    const rifiuta = (async () => new Response(null, { status: 500 })) as typeof fetch;
    await expect(creaClientManagedBots({ urlGestore: 'https://g', botGestore: 'g', fetch: rifiuta }).avviaCollegamento({ nomeAssistente: 'B', nomeUtente: 'M' })).rejects.toBeInstanceOf(ErroreCollegamento);

    const gestore = gestoreFinto({ sondaggiPrima: 1000 });
    const client = creaClientManagedBots({ urlGestore: 'https://g', botGestore: 'g', fetch: gestore.fetchFinto, attendi: async () => undefined, timeoutMs: 1 });
    const c = await client.avviaCollegamento({ nomeAssistente: 'B', nomeUtente: 'M' });
    await new Promise((ok) => setTimeout(ok, 5));
    await expect(c.attendi()).rejects.toMatchObject({ codice: 'timeout' });

    const c2 = await client.avviaCollegamento({ nomeAssistente: 'B', nomeUtente: 'M' });
    const controller = new AbortController();
    controller.abort();
    await expect(c2.attendi(controller.signal)).rejects.toMatchObject({ codice: 'annullato' });
  });
});
