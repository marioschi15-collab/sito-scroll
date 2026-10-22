# manager-bot — bot gestore Telegram (docs/02 §8.2, lato server)

Cloudflare Worker minimo per la creazione del bot utente in due tocchi (Managed Bots, Bot API 9.6). Riceve l'update
`managed_bot`, restringe il bot al proprietario (`setManagedBotAccessSettings`, `is_access_restricted = true`),
preleva il token una volta (`getManagedBotToken`), lo **cifra per la chiave effimera dell'app** (ECDH P-256 +
HKDF-SHA256 + AES-256-GCM) e lo tiene in KV per 10 minuti; `GET /pair/<nonce>` lo cancella alla lettura. Nessun
contenuto delle chat passa di qui: solo id numerico Telegram, id del bot e token cifrato (docs/02 §10.3).

## Percorsi

| Metodo | Percorso | Cosa fa |
|---|---|---|
| `POST` | `/pair` | `{ nonce, chiave_pubblica }` (nonce `[a-z0-9]{8,16}`, chiave P-256 raw base64url) → 204; 409 se il nonce è in uso |
| `GET` | `/pair/<nonce>` | 200 con la busta cifrata (una sola volta), 202 se in attesa, 404 se sconosciuto/scaduto |
| `POST` | `/webhook` | webhook del bot gestore; verifica `X-Telegram-Bot-Api-Secret-Token`; agisce solo su `managed_bot` con username `<prefisso>_<nonce>_bot` e una richiesta in attesa; 500 se la Bot API fallisce (Telegram ritenta) |
| `GET` | `/` | `ok` |

Busta: `{ v: 1, chiave_pubblica_gestore, iv, cifrato }`; contenuto `{ token, id_proprietario, username }`.
Lo stesso schema è in `apps/desktop/src/nucleo/telegram/crypto-coppia.ts` (test di interoperabilità in
`apps/desktop/test/telegram-managed-bots.test.ts`).

## Deploy

1. Creare il bot gestore con BotFather e attivare la "Bot Management Mode" (docs/06 §10, punto 4).
2. `wrangler kv namespace create COPPIE` → copiare l'id in `wrangler.toml`.
3. `wrangler secret put BOT_GESTORE_TOKEN` e `wrangler secret put WEBHOOK_SECRET` (una stringa casuale lunga).
4. `wrangler deploy`.
5. Registrare il webhook, solo per gli update che servono:
   `curl "https://api.telegram.org/bot<TOKEN>/setWebhook" -d url="https://<worker>/webhook" -d secret_token="<WEBHOOK_SECRET>" -d allowed_updates='["managed_bot"]'`
6. Nell'app: `creaClientManagedBots({ urlGestore: 'https://<worker>', botGestore: '<username del gestore>' })`.

Giurisdizione UE (docs/02 §10.3): KV non ha restrizioni di giurisdizione; da valutare prima del lancio se bastano
i dati minimi e il TTL di 10 minuti oppure se passare a Durable Objects con `jurisdiction: 'eu'`.

## Test

`pnpm --filter @spalla/manager-bot test` — vitest in Node (Web Crypto nativo): andata e ritorno della cifratura,
flusso completo con KV e Bot API finti, scadenze, rifiuti.

## Punti aperti

- `wrangler` non è tra le dipendenze (si usa quello globale o `npx wrangler`).
- Verificare sui client Telegram desktop/web la schermata `t.me/newbot/<gestore>/<username>` (spike S-D).
- Dichiarazione obbligatoria in privacy policy: il gestore può tecnicamente rigenerare il token (`replaceManagedBotToken`), lo usa solo per il collegamento e il tasto "Rigenera token".
