# M.C. Tattoo Studio — «Storia di un segno»

Sito a pagina singola che si racconta scorrendo: la nascita di un tatuaggio (una carpa koi che risale
verso il sole rosso) in sette capitoli. Colori: solo nero, grigi, bianco carta e un rosso giapponese.

| Scena | Cosa succede scorrendo | Colore |
| --- | --- | --- |
| Prologo — Il vuoto | il titolo si apre, il sole rosso cresce e dal centro si apre la carta | nero → bianco |
| I — L’idea | la carpa si disegna a pennello; la camera parte dall’occhio e si allontana | bianco carta |
| II — Lo stencil | una barra di luce stampa il disegno a rovescio, poi il foglio si gira | grigio → grafite |
| III — L’ago | bande da cinema; la camera segue la punta dell’ago lungo la linea | nero |
| IV — Il rosso | sorge il sole, le chiazze si colorano, la camera si tuffa nel rosso | nero → rosso |
| Manifesto | le parole si accendono una alla volta | rosso |
| V — Gli stili | panoramica orizzontale su cinque stili, ognuno col suo disegno | bianco, nero, grigio, rosso |
| VI — Il rito | i quattro passi, con il numero che scorre come un rullino | bianco |
| VII — Il tuo segno | invito a prenotare, contatti, orari | nero e rosso |

## Vederlo

- **Con un doppio clic**: dentro questa cartella lancia `pnpm install` (solo la prima volta) e poi
  `pnpm anteprima`. Si crea il file `dist-anteprima/index.html`: aprilo con un doppio clic.
- **Mentre lo modifichi**: `pnpm dev` e apri l’indirizzo che compare.

## Prima di pubblicarlo

Tutti i dati dello studio sono in **un solo file**: `src/dati/studio.ts`. Oggi sono **dati di prova**
(indirizzo, telefono, WhatsApp, email, Instagram, orari, partita IVA). Scrivi quelli veri e cambia
`datiDiProva: true` in `datiDiProva: false`: sparisce anche l’avviso in fondo alla pagina.

## Pubblicarlo

`pnpm build` crea la cartella `dist/`: va caricata così com’è su un qualsiasi hosting di siti statici
(per esempio Netlify, Vercel, Cloudflare Pages o lo spazio web dello studio).

## Note

- Chi ha chiesto al proprio telefono o computer di ridurre le animazioni vede ogni scena già completa e ferma.
- I disegni (carpa, onde, stili) sono originali, calcolati nel codice: non ci sono foto. Le foto vere dei
  lavori dello studio si possono aggiungere in seguito.
