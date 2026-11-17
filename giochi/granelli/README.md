# Granelli

Un mondo di granelli che reagiscono tra loro. Si parte da quattro elementi (terra, acqua, fuoco, aria), si versano
col dito e si fanno incontrare: ogni cosa nuova che nasce entra nella tavolozza e nel Libro delle scoperte.
L'obiettivo è arrivare, da quattro granelli, a un villaggio abitato. Le scoperte sono 24.

Non usa nessun servizio a pagamento: gira tutto nel browser di chi gioca, anche da telefono, e ricorda la partita
sul dispositivo.

## Comandi

```powershell
pnpm install
pnpm dev          # il gioco in sviluppo, si aggiorna mentre si modifica
pnpm test         # le prove del motore (materiali, scoperte, omini, salvataggio)
pnpm typecheck
pnpm build        # produce dist/index.html: un solo file, si apre con un doppio clic
```

## Dove sta cosa

- `src/motore/materiali.ts`: l'elenco dei materiali e le loro proprietà (polvere, liquido, gas, solido).
- `src/motore/mondo.ts`: la griglia e le regole. Ogni materiale ha poche regole; pioggia, incendi, boschi e
  temporali nascono dal loro incontro. Qui si aggiungono materiali e reazioni nuove.
- `src/motore/terreno.ts`: il fondo di roccia nuda con cui nasce ogni mondo (colline e conche, sempre diverse).
- `src/motore/omini.ts`: gli abitanti. Arrivano da soli quando il mondo ha acqua, piante e un riparo di pietra o
  mattoni; bevono, mangiano, nuotano, scappano dal fuoco, fanno figli.
- `src/scoperte.ts`: le voci del Libro: nome, indizio, ricetta. Le frasi mostrate al giocatore stanno qui,
  in `src/gioco.ts` e in `src/pagina.ts`.
- `src/disegno.ts`: i colori dei granelli, il bagliore di ciò che brucia e il disegno degli omini.
- `src/pagina.ts` e `src/stile.css`: lo scheletro e l'aspetto della pagina. `src/gioco.ts`: tavolozza, dito, libro,
  avvisi e il tempo che scorre. `src/main.ts`: la partenza.
- `src/salvataggio.ts`: la partita salvata nel browser (e ripresa se la pagina viene aggiornata mentre si gioca).

Il carattere dei titoli è Pixelify Sans (licenza libera SIL OFL 1.1), preso dal pacchetto
`@fontsource-variable/pixelify-sans` e messo dentro il file del gioco: la pagina non scarica niente da fuori.

## Per aggiungere una scoperta

1. Un numero nuovo in `materiali.ts` (e il suo stato in `STATO`).
2. La regola che la fa nascere in `mondo.ts`, dentro `aggiorna`.
3. La voce in `scoperte.ts` e il colore in `disegno.ts`.
4. Una prova in `test/motore.test.ts` che la fa nascere davvero.
