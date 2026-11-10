# M.C. Tattoo Studio — «Dal pensiero alla pelle»

Sito a pagina singola che si racconta scorrendo e ha un solo scopo: **portare chi lo guarda a prenotare
una consulenza**. La storia non parla del tatuaggio ma di chi lo vuole: il desiderio, i dubbi che lo
fermano, la prova che può fidarsi, e la strada più corta per scrivere allo studio.
Colori: solo nero, grigi, bianco carta e un rosso giapponese.

| Scena | A cosa serve | Cosa succede scorrendo |
| --- | --- | --- |
| Apertura | agganciare | «Ce l’hai in testa da anni.» nel buio; il sole rosso riempie lo schermo e arriva «È ora di portarlo sulla pelle.» con il pulsante per prenotare |
| I — I dubbi | togliere le paure | quattro domande (mi stanco? fa male? è sicuro? costa troppo?): una pennellata rossa le cancella, lo schermo passa dal nero al bianco e arriva la risposta |
| II — Su misura | far desiderare | la carpa si disegna a pennello: «lo disegniamo solo per te» |
| III — Lo provi addosso | rassicurare | il disegno si stampa, si gira e si posa sulla pelle: decidi tu prima di cominciare |
| IV — Mano ferma | dare fiducia | stessa inquadratura, senza stacco: la camera segue la punta dell’ago; materiale monouso, pause quando vuoi |
| V — Fatto per durare | chiudere il desiderio | sorge il sole, arriva il rosso, lo schermo si riempie: «E da quel giorno è tuo.» + pulsante |
| VI — Qual è il tuo? | far scegliere | cinque stili in orizzontale, ognuno con «Voglio questo stile» che apre WhatsApp già scritto |
| VII — Tre passi | togliere la fatica | scrivici, vieni a trovarci, il tuo giorno |
| VIII — Prenota | far agire | modulo a tocchi (idea, stile, zona, misura, nome) che prepara il messaggio WhatsApp; promesse, contatti, orari |

In più, da dopo l’apertura fino al modulo resta sempre visibile il pulsante **«Prenota la consulenza»**.

## Vederlo

- **Con un doppio clic**: dentro questa cartella lancia `pnpm install` (solo la prima volta) e poi
  `pnpm anteprima`. Si crea il file `dist-anteprima/index.html`: aprilo con un doppio clic.
- **Mentre lo modifichi**: `pnpm dev` e apri l’indirizzo che compare.

## Prima di pubblicarlo: cosa deve confermare il titolare

Tutto sta in **un solo file**, `src/dati/studio.ts`:

1. **Dati di contatto** (oggi di prova): indirizzo, telefono, WhatsApp, email, Instagram, orari, partita IVA.
   Poi `datiDiProva: true` va cambiato in `datiDiProva: false`: sparisce l’avviso in fondo alla pagina.
2. **Le promesse** (`promesse`): «Consulenza senza impegno», «Preventivo prima di iniziare», «Materiale monouso»,
   «Solo su appuntamento». Il sito le ripete vicino ai pulsanti: devono essere vere. Le stesse promesse sono
   anche nelle risposte ai dubbi (`src/scene/Dubbi.tsx`) e nei tre passi (`src/scene/Rito.tsx`).
3. **Prima data libera** (`primaDataLibera`): se la scrivi (es. `'metà dicembre'`) compare nel pulsante fisso e
   nel modulo. Va tenuta aggiornata; lasciala `null` se non vuoi mostrarla.
4. **Recensioni vere** (`recensioni`): se ne aggiungi, compare la sezione «Chi è già passato da noi». Finché la
   lista è vuota non si vede niente: il sito non inventa recensioni.

Le cose che fanno vendere di più e che oggi mancano sono proprio queste ultime due, insieme alle **foto vere
dei lavori**: i disegni del sito sono originali e calcolati nel codice, non sono tatuaggi fatti dallo studio.

## Pubblicarlo

`pnpm build` crea la cartella `dist/`: va caricata così com’è su un qualsiasi hosting di siti statici
(per esempio Netlify, Vercel, Cloudflare Pages o lo spazio web dello studio).

## Note

- Chi ha chiesto al proprio telefono o computer di ridurre le animazioni vede ogni scena già completa e ferma.
- Il modulo non spedisce niente da solo: apre WhatsApp con il messaggio pronto, e a inviarlo è la persona.
