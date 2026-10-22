# telegram — il canale Telegram (docs/02 §8)

Un bot per utente, di proprietà dell'utente; long polling dal PC con grammY 1.46 (+ `@grammyjs/auto-retry`,
`@grammyjs/files`). Nessun server nostro vede i messaggi.

## Cosa fa

- `creaCanaleTelegram({ token, percorsi, dispatcher, broker, voce?, logger, testi?, profilo?, comandi?, onEvento? })`
  implementa `CanaleMessaggi` + `CanaleConferme` (`nome: 'telegram'`), più `confermaPairing(codice)`,
  `aggiungiProprietario(id)` e `stato()`.
  - **Stato** in `datiApp/telegram/state.json`: allowlist per `from.id` numerico, codici di collegamento in attesa
    (massimo 3, validi un'ora), username del bot, ultimo update elaborato, contatori.
  - **Sconosciuti**: senza proprietario → codice di 6 caratteri (senza l/o/0) da digitare nell'app, insieme alla riga
    sulla privacy (docs/02 §8.4: va mostrata prima del collegamento, `/start` dopo potrebbe non arrivare mai), confermato
    dal desktop con `confermaPairing`; con un proprietario → scartati in silenzio e contati. Nei gruppi non lavora.
  - **Comandi** (`setMyCommands` in italiano): `/start` (privacy e "funziono quando il PC è acceso"), `/aiuto`,
    `/voce on|off`, `/stato`, `/nuova`, `/ricomincia` (tre ampiezze con pulsanti, "tutto" chiede la parola "cancella"),
    `/stop`. I comandi che toccano altri moduli passano per `comandi` (`nuovaSessione`, `stato`, `ricomincia`, `stop`,
    `risposteVocali`); se mancano, il bot risponde "si fa dal computer".
  - **Testo**: "sta scrivendo" ogni 4 s; dopo 20 s "Ci lavoro, circa un minuto" aggiornato con lo strumento in uso;
    risposta finale in HTML (Markdown leggero → `<b> <i> <code> <pre> <a>`, solo `& < >` scappati), spezzata a
    ≤ 4096 sui paragrafi; oltre 3 pezzi anche come documento `.md`. Coda in uscita 1 msg/s per chat; limitatore in
    ingresso 1/s per utente (raffica 3).
  - **Conferme del Permission Broker**: scheda con [Sì, fallo] [No], `callback_data` `p:<id>:ok|no` (≤ 64 byte),
    solo il proprietario può rispondere, callback vecchi ignorati, riserva a testo "sì <id>" / "no <id>" valida solo
    per richieste in attesa. Se la sessione che ha chiesto si interrompe (`richiesta.annullamento`), i pulsanti vengono
    tolti e un tocco tardivo non approva nulla.
  - **Domande dell'assistente** (AskUserQuestion → chip): un pulsante per opzione (`d:<id>:<n>`), risposta libera
    scrivendo, scelta multipla con "Fatto".
  - **Note vocali**: `getFile` (rifiuto oltre 20 MB) → `ogg-opus-decoder` a 16 kHz → `voce.trascrivi` → se la
    confidenza è sotto 0,7 (o ignota) la risposta inizia con "Ho capito: *…*".
  - **Foto e documenti** (≤ 20 MB) in `lavoro/in-arrivo/` con nome sanificato e data, passati come `allegati`.
  - **Ripresa**: al primo lotto dopo l'avvio, se il messaggio più vecchio ha più di 2 ore, "Ero spento: ho ricevuto
    N messaggi"; gli update già elaborati prima di un riavvio vengono scartati. `409 Conflict` → log, evento
    `conflitto` per il desktop e "Un'altra copia di Spalla è attiva".
- `creaProceduraBotFather({ fetch? })`: regex del token `^\d{8,10}:[A-Za-z0-9_-]{35}$`, pulizia di ciò che
  l'utente incolla, suggerimenti nome/username, verifica con `getMe`. I testi predefiniti sono `telegram.botfather` di
  `@spalla/it-copy` (nessuna copia locale); `testi` resta come sovrascrittura per i test.
- `creaClientManagedBots({ urlGestore, botGestore })`: lato app di docs/02 §8.2 (nonce + chiave effimera ECDH
  P-256 con Web Crypto, link `t.me/newbot/<gestore>/<username>?name=…`, sondaggio `GET /pair/<nonce>`,
  decifratura della busta). Il lato server è in `services/manager-bot`.

## Come si collega all'app

```ts
import { testi } from '@spalla/it-copy';
const canale = creaCanaleTelegram({
  token, percorsi, dispatcher, broker, voce, logger,
  testi: { ...testi.telegram, permessi: testi.permessi },
  profilo: () => ({ nomeAssistente: 'Bruno', nomeUtente: 'Marco', linkPrivacy: 'https://…/privacy' }),
  comandi: { nuovaSessione: () => runtime.nuovaSessione(), stato: async () => ({ pcAcceso: true, ... }) },
  onEvento: (e) => { /* pairing_richiesto, collegato, conflitto, sconosciuto_scartato, fermato */ },
});
await canale.avvia();                       // getMe, setMyCommands, registraCanale(broker), long polling
await canale.confermaPairing('k7m2xq');     // dal desktop, quando l'utente digita il codice
```

Nota di progettazione: i gestori grammY non attendono la risposta dell'assistente (`inCoda` senza `await`),
altrimenti il pulsante di conferma non verrebbe mai letto (grammY elabora gli update in sequenza).

## Test

`pnpm --filter @spalla/desktop exec vitest run test/telegram` — tutto offline: il Bot grammY ha l'API
intercettata da un trasformatore (`test/telegram-finto.ts`), gli update sono costruiti a mano, la nota vocale è
generata con ffmpeg. I trasformatori finti vanno installati **prima** di passare il bot al canale.

## Punti aperti

- Tutte le frasi (anche `altro`) vengono da `@spalla/it-copy` (`telegram`, `permessi`): `testiTelegramPredefiniti` è
  `{ ...telegram, permessi }`; `inviaAlProprietario(markdown)` manda un messaggio dell'app al telefono collegato (buongiorno).
- Voce in uscita (`/voce on`) fuori perimetro: senza `comandi.risposteVocali` risponde "non ancora pronta".
- `linkPrivacy` reale e `nomeAssistente` arrivano dall'integratore (profilo/config).
- Secondo utente (allowlist fino a 10): `aggiungiProprietario` c'è, manca la schermata.
- La coda di Telegram a PC spento ha durata non documentata: il messaggio di ripresa non dipende da essa.
