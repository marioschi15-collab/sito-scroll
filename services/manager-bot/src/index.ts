/**
 * Bot gestore Telegram (docs/02 §8.2, lato server): un Cloudflare Worker che riceve l'update `managed_bot`,
 * restringe il bot al proprietario, preleva il token una volta, lo cifra per la chiave effimera dell'app e lo
 * dimentica. Nessun contenuto delle chat passa di qui: solo id numerico Telegram, id del bot e token cifrato,
 * per al massimo 10 minuti (docs/02 §10.3).
 */
import { chiavePubblicaValida, cifraPerApp, type BustaCifrata } from './crypto.js';
import { ErroreBotApi, prelevaToken, restringiAlProprietario, type UpdateManagedBot } from './telegram.js';

export interface Env {
  /** KV con TTL: richieste in attesa (`richiesta:<nonce>`) e consegne cifrate (`consegna:<nonce>`). */
  COPPIE: KVNamespace;
  /** Token del bot gestore (wrangler secret). */
  BOT_GESTORE_TOKEN: string;
  /** Segreto passato a setWebhook e verificato sull'header X-Telegram-Bot-Api-Secret-Token (wrangler secret). */
  WEBHOOK_SECRET: string;
  /** Prefisso degli username dei bot utente: `<prefisso>_<nonce>_bot` (default "spalla"). */
  PREFISSO_USERNAME?: string;
  /** Durata in secondi di richieste e consegne (default 600). */
  TTL_SECONDI?: string;
}

export interface DipendenzeWorker {
  fetch?: typeof fetch;
  adesso?: () => number;
}

export const REGEX_NONCE = /^[a-z0-9]{8,16}$/;
export const TTL_PREDEFINITO_SECONDI = 600;

interface RichiestaInAttesa {
  chiave_pubblica: string;
  creato: number;
}

const json = (corpo: unknown, status = 200): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const vuoto = (status: number): Response => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

export function nonceDaUsername(username: string | undefined, prefisso: string): string | undefined {
  if (!username) return undefined;
  const m = new RegExp(`^${prefisso}_([a-z0-9]{8,16})_bot$`, 'i').exec(username);
  const nonce = m?.[1]?.toLowerCase();
  return nonce && REGEX_NONCE.test(nonce) ? nonce : undefined;
}

function ttl(env: Env): number {
  const n = Number(env.TTL_SECONDI);
  return Number.isFinite(n) && n >= 60 ? Math.floor(n) : TTL_PREDEFINITO_SECONDI;
}

/** POST /pair {nonce, chiave_pubblica}: l'app registra la richiesta prima di aprire il link t.me/newbot. */
async function registraRichiesta(request: Request, env: Env, adesso: () => number): Promise<Response> {
  let corpo: { nonce?: unknown; chiave_pubblica?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return json({ errore: 'corpo non valido' }, 400);
  }
  const nonce = typeof corpo.nonce === 'string' ? corpo.nonce : '';
  const chiave = typeof corpo.chiave_pubblica === 'string' ? corpo.chiave_pubblica : '';
  if (!REGEX_NONCE.test(nonce)) return json({ errore: 'nonce non valido' }, 400);
  if (!(await chiavePubblicaValida(chiave))) return json({ errore: 'chiave pubblica non valida' }, 400);
  if ((await env.COPPIE.get(`richiesta:${nonce}`)) !== null || (await env.COPPIE.get(`consegna:${nonce}`)) !== null) {
    return json({ errore: 'nonce già in uso' }, 409);
  }
  const richiesta: RichiestaInAttesa = { chiave_pubblica: chiave, creato: adesso() };
  await env.COPPIE.put(`richiesta:${nonce}`, JSON.stringify(richiesta), { expirationTtl: ttl(env) });
  return vuoto(204);
}

/** GET /pair/<nonce>: 200 con la busta (cancellata alla lettura), 202 se in attesa, 404 se sconosciuto o scaduto. */
async function consegna(nonce: string, env: Env): Promise<Response> {
  if (!REGEX_NONCE.test(nonce)) return vuoto(404);
  const busta = await env.COPPIE.get(`consegna:${nonce}`);
  if (busta !== null) {
    await env.COPPIE.delete(`consegna:${nonce}`);
    return new Response(busta, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if ((await env.COPPIE.get(`richiesta:${nonce}`)) !== null) return json({ stato: 'in_attesa' }, 202);
  return vuoto(404);
}

/** Webhook di Telegram per il bot gestore: solo gli update `managed_bot` ci interessano. */
async function webhook(request: Request, env: Env, deps: DipendenzeWorker): Promise<Response> {
  if (!env.WEBHOOK_SECRET || request.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return vuoto(401);
  let update: UpdateManagedBot;
  try {
    update = (await request.json()) as UpdateManagedBot;
  } catch {
    return vuoto(400);
  }
  const evento = update.managed_bot;
  if (!evento) return vuoto(200);

  const prefisso = env.PREFISSO_USERNAME ?? 'spalla';
  const nonce = nonceDaUsername(evento.bot.username, prefisso);
  if (!nonce) return vuoto(200);
  const richiesta = (await env.COPPIE.get(`richiesta:${nonce}`, 'json')) as RichiestaInAttesa | null;
  if (!richiesta) return vuoto(200); // nessuna richiesta (scaduta, già servita o update ripetuto): niente da fare

  try {
    await restringiAlProprietario(env.BOT_GESTORE_TOKEN, evento.bot.id, deps.fetch);
    const token = await prelevaToken(env.BOT_GESTORE_TOKEN, evento.bot.id, deps.fetch);
    const busta: BustaCifrata = await cifraPerApp(
      { token, id_proprietario: evento.user.id, username: evento.bot.username ?? '' },
      richiesta.chiave_pubblica,
      nonce,
    );
    await env.COPPIE.put(`consegna:${nonce}`, JSON.stringify(busta), { expirationTtl: ttl(env) });
    await env.COPPIE.delete(`richiesta:${nonce}`);
    return vuoto(200);
  } catch (errore) {
    // 500 → Telegram ritenta la consegna del webhook più tardi.
    console.error('consegna fallita', errore instanceof ErroreBotApi ? `${errore.metodo} ${errore.codice}` : 'errore interno');
    return vuoto(500);
  }
}

export async function gestisci(request: Request, env: Env, deps: DipendenzeWorker = {}): Promise<Response> {
  const adesso = deps.adesso ?? Date.now;
  const url = new URL(request.url);
  const percorso = url.pathname.replace(/\/+$/g, '') || '/';

  if (request.method === 'GET' && percorso === '/') return new Response('ok', { status: 200 });
  if (request.method === 'POST' && percorso === '/pair') return registraRichiesta(request, env, adesso);
  if (request.method === 'GET' && percorso.startsWith('/pair/')) return consegna(percorso.slice('/pair/'.length), env);
  if (request.method === 'POST' && percorso === '/webhook') return webhook(request, env, deps);
  return vuoto(404);
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> => gestisci(request, env),
} satisfies ExportedHandler<Env>;
