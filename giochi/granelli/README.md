# Granelli

Un mondo di granelli che reagiscono tra loro. Si parte da quattro elementi (terra, acqua, fuoco, aria), si versano
col dito e si fanno incontrare: ogni cosa nuova che nasce entra nella tavolozza e nel Libro delle scoperte.

Il Libro ha più di cento voci scritte a mano (materiali, fenomeni come la pioggia o l'arcobaleno, piante, omini e
mestieri, invenzioni, ere), divise in capitoli, ognuna con la sua pagina: cos'è, come nasce, a cosa porta.

Con **Unisci** si scelgono due scoperte e si guarda cosa ne nasce, come nei giochi di alchimia: prima le unioni
scritte a mano (pietra e legno: l'utensile; un omino con la lancia: il cacciatore), poi le stesse reazioni del mondo
(terra e acqua: fango, anche qui), e solo le coppie di sostanze rimaste senza esito danno una **miscela** nuova, con
nome, colore e comportamento decisi dal carattere dei due ingredienti (e le miscele si uniscono ancora tra loro: non
finiscono mai). Le miscele arrivano solo da quando il Libro ha dodici voci: prima quelle coppie «per ora» non si
uniscono, e alla dodicesima una riga lo annuncia. Ciò che è un fenomeno (un'esplosione, un temporale) Unisci non lo
regala: «succede solo nel mondo». Una coppia già provata lo dice («Già fatta: Fango», «Già provata: niente»).
Una capanna e un frutto chiamano i **primi omini**: ne arrivano due, vicino all'acqua più vicina a dove si sta
guardando (se l'acqua non c'è, «arriveranno vicino all'acqua»). Lo strumento dei primi giorni che rimestava le cose non
c'è più: chi lo aveva in una partita salvata ritrova la Mano e un saluto, una volta sola.

Le unioni scritte a mano sono una tabella che cresce, in `src/motore/cose.ts`:

| Con… | …e… | nasce |
| --- | --- | --- |
| Omino | Lancia, Campo, Barca, Vaso, Pane, Fornace, Spada, Libro | Cacciatore, Contadino, Pescatore, Vasaio, Fornaio, Fabbro, Guerriero, Maestro |
| Omino | Mercato, Mulino, Faro, Castello, Utensile, Carro, Capanna | Mercante, Mugnaio, Guardiano del faro, Re, Artigiano, Carrettiere, Famiglia |
| Omino | Falò, Ponte, Città, Tempio | Cantastorie, Viandante, Cittadino, Custode del tempio |
| Capanna | Frutto · Falò | i primi omini · Accampamento |
| Falò | Legno · Vaso · Farina | Fiaccola · Minestra · Focaccia |
| Campo | Mulino · Casa · Aratro · Pozzo · Frutto | Farina · Fattoria · Raccolto · Orto · Frutteto |
| Pozzo, Barca, Casa | Vaso · Aria · Falò | Secchio · Veliero · Focolare |
| Faro, Libro, Pane, Città | Barca · Tempio · Moneta · Castello | Porto · Biblioteca · Bottega · Regno |

Prima di queste c'erano le trentadue unioni delle invenzioni, dall'utensile al faro; ora ogni invenzione serve a farne
almeno un'altra.

Il motore sa già **portare una cosa sopra un'altra** dentro il mondo (`Mondo.porta`, i gesti arriveranno dopo): con
le stesse regole di Unisci, l'acqua portata sulla terra fa nascere il fango proprio lì, il legno portato su un albero
fa nascere una capanna posata accanto (l'albero resta), una casa portata sulla terra si posa, un omino nasce, e due
cose che non si uniscono lo dicono. Il mondo ricorda quali coppie sono già state provate (solo che sono state
provate: l'esito si ricalcola sempre, così una coppia che oggi non dà niente può dare qualcosa domani).

Le **ere** arrivano in ordine: pietra, bronzo, ferro, età antica, medioevo. Un'invenzione fatta in anticipo (il
castello prima del bronzo) resta, e la sua era aspetta il suo turno; il fuoco domato, l'agricoltura, la scrittura e il
commercio vengono dopo l'Età della pietra.

Gli **omini** arrivano da soli vicino all'acqua e hanno un paese a cui tornare: ognuno ricorda casa sua (dove è
arrivato, poi la casa o il falò dove passa la notte), ci passeggia intorno, e quando ha sete o fame va alla fonte più
vicina (acqua, pozzo, erba, campo) per quanto lontana sia. Davanti ai tronchi degli alberi passano (il legno messo da
chi gioca resta un muro), si arrampicano su sponde fino a cinque celle, e non stanno mai in due nella stessa cella.
Quando uno muore, una riga dice di che cosa.

Le **costruzioni** si posano solo dove possono stare: a terra, sul punto più alto sotto di loro, se il terreno non
sale o scende di più di tre celle (un muretto di pietre copre il dislivello); mai una sull'altra; barca e ponte solo
sull'acqua. Quando non si può, una riga spiega perché. Una volta posate scendono soltanto, se il terreno cede: né la
sabbia né un albero le sollevano, e sotto di loro non cresce niente.

Non usa nessun servizio a pagamento: gira tutto nel browser di chi gioca, anche da telefono, e ricorda la partita
sul dispositivo.

## Comandi

```powershell
pnpm install
pnpm dev          # il gioco in sviluppo, si aggiorna mentre si modifica
pnpm test         # le prove del motore (materiali, acqua, miscele, Unisci, unioni, portare, ere, omini, paesi, costruzioni, salvataggio)
pnpm typecheck
pnpm build        # produce dist/index.html: un solo file, si apre con un doppio clic
node strumenti/fumo.cjs     # giro di fumo nel browser, su un telefono simulato (dopo pnpm build)
node strumenti/misura.cjs   # millesimi per fotogramma nelle scene di riferimento (dopo pnpm build)
```

Le prove nel browser stanno in `strumenti/` e usano il Chromium di Playwright già presente sulla macchina (non è una
dipendenza del gioco). `fumo.cjs` gioca una piccola partita con tocchi veri (in un mondo che nasce sempre uguale) ed
esce con un errore al primo passo che non torna: chi aggiunge una regola che si vede solo nel browser aggiunge lì il
suo passo. `misura.cjs` stampa la
tabella dei costi a velocità piena e con il processore rallentato 4 e 6 volte; con `--scrivi "nome"` aggiunge una
riga alla storia in `strumenti/misure.md`, da confrontare con le righe prima.

## Dove sta cosa

- `src/motore/materiali.ts`: l'elenco dei materiali, dei fenomeni e il carattere di ogni sostanza.
- `src/motore/mondo.ts`: la griglia e le regole. Ogni materiale ha poche regole; pioggia, incendi, boschi e
  temporali nascono dal loro incontro. Qui sta anche il comportamento delle miscele.
- `src/motore/miscele.ts`: come due sostanze si fondono in una terza, e le soglie del loro carattere (le stesse per
  le etichette del Libro e per il comportamento nel mondo). `nomi.ts`: come si chiama e come si racconta una miscela.
- `src/motore/ricette.ts`: le reazioni del mondo, coppia per coppia (cosa diventa ogni cella quando si porta una
  cosa sopra l'altra).
  `esiti.ts`: da quelle e dalle vie a due ingredienti del Libro, l'esito di ogni coppia in Unisci (`esitoNoto`),
  i fenomeni che non si regalano (`fenomenoDi`) e le coppie che non danno mai una miscela (`coppiaDAutore`).
  `esitoDi` decide l'esito di una coppia, uno solo per Unisci e per il mondo, senza toccare niente.
  `cose.ts`: le invenzioni, i mestieri (`G`), tutte le unioni scritte e le ere; `ere.ts`: quale era (o grande evento)
  può scattare adesso.
- `src/motore/bersaglio.ts`: che cosa c'è in un punto del mondo per chi ci porta sopra qualcosa (`cheCosaCe`: un
  omino, una cosa posata, un materiale, un appoggio, il vuoto). `porta.ts`: portare una scoperta sopra quel punto
  (`Mondo.porta`), con le regole in ordine e l'esito da raccontare.
- `src/motore/fenomeni.ts`: le scoperte che non sono materiali (lago, notte, arcobaleno…). `tempo.ts`: il giorno
  e la notte. `terreno.ts`: il fondo di roccia con cui nasce ogni mondo.
- `src/motore/omini.ts`: gli abitanti. Bevono, mangiano piante, frutti e funghi, nuotano, scappano dal fuoco, fanno
  figli, tornano a casa; e lasciano in `Mondo.fatti` nascite e morti con la causa. `cammino.ts`: dove un omino può
  stare e passare (i tronchi degli alberi sì), gradini e dirupi. `fonti.ts`: dove si beve e dove si mangia, colonna
  per colonna (il Mondo lo ricalcola ogni due secondi). `arrivi.ts`: quando e dove arrivano i primi omini (acqua,
  piante e un riparo di pietra o mattoni; vicino all'acqua, in un punto da cui ci si arriva a piedi), e i primi omini
  chiamati da un'unione (`primiOmini`, `cercaApprodo`).
- `src/motore/posa.ts`: dove una costruzione può stare (`puoPosare`, con il perché di ogni rifiuto), le piante che
  toglie quando si posa e come si assesta dopo (scende soltanto; barca e ponte seguono l'acqua).
- `src/scoperte.ts`: le voci del Libro, con capitolo, indizio, descrizione e modi in cui nascono.
  `src/libro.ts`: il Libro sullo schermo (capitoli, voci, pagine collegate tra loro).
- `src/disegno/`: tutto quello che si vede. `pittore.ts` colora i granelli con ombre e luci (di notte un fuoco
  illumina ciò che ha intorno) e rende morbidi nuvole e fumo; `cielo.ts` il cielo con sole, luna, stelle,
  montagne e arcobaleno; `particelle.ts` scintille, lucciole e la festa delle scoperte; `omini.ts` i personaggi
  animati; `colori.ts` i colori di ogni materiale e i tondini della tavolozza.
- `src/pagina.ts` e `src/stile.css`: lo scheletro e l'aspetto della pagina. `src/gioco.ts`: tavolozza, dito,
  avvisi e il tempo che scorre. `src/unisci.ts`: il pannello Unisci; `src/risposta.ts`: che cosa dice dopo
  un'unione. `src/ricordi.ts`: quello che la pagina ricorda con la partita (e il saluto per lo strumento che non c'è più).
  `src/righe.ts`: le frasi brevi in fondo al cielo (una posa rifiutata, un lutto,
  una cosa che lì non si mette, l'annuncio delle miscele).
  `src/main.ts`: la partenza.
- `src/salvataggio.ts`: la partita salvata nel browser, miscele e coppie provate comprese.

Il carattere dei titoli è Pixelify Sans (licenza libera SIL OFL 1.1), preso dal pacchetto
`@fontsource-variable/pixelify-sans` e messo dentro il file del gioco: la pagina non scarica niente da fuori.

## Per aggiungere una scoperta

1. Un numero nuovo in `materiali.ts`, con il suo stato e il suo carattere (`base(...)`).
2. La regola che la fa nascere in `mondo.ts`, dentro `aggiorna`; se nasce da una coppia, anche in `ricette.ts`
   (così Unisci e il mondo la conoscono: le prove in `test/unisci.test.ts` e `test/coppie.test.ts` scorrono tutte
   le coppie). Se è una cosa che nasce unendo (un'invenzione, un mestiere), basta una riga in `UNIONI` di
   `cose.ts` e la voce in `scoperte.ts` con `invenzione(...)` o `gente(...)`: le vie del Libro si scrivono da sole.
3. La voce in `scoperte.ts` e il colore in `disegno/colori.ts`.
4. Una prova in `test/` (un file per argomento, aiuti comuni in `test/aiuti.ts`) che la fa nascere davvero.
