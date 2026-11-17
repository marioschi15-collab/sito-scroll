# Granelli

Un mondo di granelli che reagiscono tra loro. Si parte da quattro elementi (terra, acqua, fuoco, aria), si versano
col dito e si fanno incontrare: ogni cosa nuova che nasce entra nella tavolozza e nel Libro delle scoperte.

Il Libro ha 51 voci scritte a mano (materiali, fenomeni come la pioggia o l'arcobaleno, piante, omini), divise in
capitoli, ognuna con la sua pagina: cos'è, come nasce, a cosa porta. Dopo le prime scoperte arriva il **Mestolo**,
che fonde due cose qualsiasi: se la coppia ha già un risultato scritto succede quello, altrimenti nasce una
**miscela** nuova, con nome, colore e comportamento decisi dal carattere dei due ingredienti. Le miscele si fondono
ancora tra loro: non finiscono mai.

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

- `src/motore/materiali.ts`: l'elenco dei materiali, dei fenomeni e il carattere di ogni sostanza.
- `src/motore/mondo.ts`: la griglia e le regole. Ogni materiale ha poche regole; pioggia, incendi, boschi e
  temporali nascono dal loro incontro. Qui stanno anche il Mestolo e il comportamento delle miscele.
- `src/motore/miscele.ts`: come due sostanze si fondono in una terza. `nomi.ts`: come si chiama e come si racconta
  una miscela. `ricette.ts`: le coppie che hanno già un risultato scritto a mano.
- `src/motore/fenomeni.ts`: le scoperte che non sono materiali (lago, notte, arcobaleno…). `tempo.ts`: il giorno
  e la notte. `terreno.ts`: il fondo di roccia con cui nasce ogni mondo.
- `src/motore/omini.ts`: gli abitanti. Arrivano da soli quando il mondo ha acqua, piante e un riparo di pietra o
  mattoni; bevono, mangiano piante, frutti e funghi, nuotano, scappano dal fuoco, fanno figli.
- `src/scoperte.ts`: le voci del Libro, con capitolo, indizio, descrizione e modi in cui nascono.
  `src/libro.ts`: il Libro sullo schermo (capitoli, voci, pagine collegate tra loro).
- `src/disegno/`: tutto quello che si vede. `pittore.ts` colora i granelli con ombre e luci (di notte un fuoco
  illumina ciò che ha intorno) e rende morbidi nuvole e fumo; `cielo.ts` il cielo con sole, luna, stelle,
  montagne e arcobaleno; `particelle.ts` scintille, lucciole e la festa delle scoperte; `omini.ts` i personaggi
  animati; `colori.ts` i colori di ogni materiale e i tondini della tavolozza.
- `src/pagina.ts` e `src/stile.css`: lo scheletro e l'aspetto della pagina. `src/gioco.ts`: tavolozza, dito,
  avvisi e il tempo che scorre. `src/main.ts`: la partenza.
- `src/salvataggio.ts`: la partita salvata nel browser, miscele comprese.

Il carattere dei titoli è Pixelify Sans (licenza libera SIL OFL 1.1), preso dal pacchetto
`@fontsource-variable/pixelify-sans` e messo dentro il file del gioco: la pagina non scarica niente da fuori.

## Per aggiungere una scoperta

1. Un numero nuovo in `materiali.ts`, con il suo stato e il suo carattere (`base(...)`).
2. La regola che la fa nascere in `mondo.ts`, dentro `aggiorna`; se nasce da una coppia, anche in `ricette.ts`.
3. La voce in `scoperte.ts` e il colore in `disegno/colori.ts`.
4. Una prova in `test/motore.test.ts` che la fa nascere davvero.
