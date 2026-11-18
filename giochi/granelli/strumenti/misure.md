# Misure di velocità

Tabella storica di `node strumenti/misura.cjs` (vedi il README). Ogni pacchetto di lavoro aggiunge la sua riga con
`node strumenti/misura.cjs --scrivi "nome della riga"`, dopo `pnpm build`.

In ogni casella: millesimi di JavaScript per fotogramma a velocità piena / con il processore rallentato 4 volte
(telefono medio) / rallentato 6 volte (telefono economico), e tra parentesi i fotogrammi al secondo a x6.
Telefono simulato 390x780. I numeri assoluti dipendono dalla macchina che misura: contano i confronti tra righe
misurate sulla stessa macchina, e differenze sotto il 10-15% sono rumore.

| riga | mondo vuoto | lago (6.000 celle) | temporale | incendio | paese di giorno | paese di notte | mondo maturo | mare (29.000 celle) | maturo, vista trascinata |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| partenza | 0,65 / 2,56 / 3,50 (60) | 1,27 / 5,18 / 8,16 (60) | 1,91 / 9,18 / 13,11 (51) | 2,87 / 11,85 / 17,56 (43) | 0,90 / 4,18 / 5,10 (60) | 0,92 / 4,69 / 5,58 (60) | 2,55 / 11,29 / 14,48 (47) | 2,89 / 13,54 / 30,69 (28) | 2,85 / 9,85 / 19,91 (31) |
| dopo P1 | 0,60 / 2,43 / 3,30 (60) | 0,76 / 3,16 / 5,52 (60) | 1,14 / 6,01 / 6,30 (59) | 2,48 / 12,24 / 14,38 (52) | 0,81 / 3,94 / 5,33 (60) | 0,97 / 4,26 / 6,65 (60) | 1,47 / 6,61 / 6,77 (60) | 1,14 / 4,72 / 7,23 (60) | 1,41 / 7,28 / 9,72 (50) |
| dopo P2 | 0,59 / 1,95 / 2,91 (60) | 0,69 / 2,56 / 4,42 (60) | 0,92 / 3,72 / 5,11 (59) | 2,27 / 8,66 / 12,59 (58) | 0,85 / 3,33 / 4,23 (60) | 0,77 / 3,58 / 5,32 (60) | 1,13 / 4,64 / 6,91 (58) | 1,29 / 4,02 / 5,90 (60) | 1,15 / 5,11 / 8,21 (54) |
| dopo P3a | 0,47 / 1,89 / 2,86 (60) | 0,71 / 2,63 / 3,83 (60) | 0,77 / 3,24 / 4,79 (59) | 1,86 / 8,04 / 11,80 (59) | 0,60 / 2,50 / 3,57 (60) | 0,76 / 2,69 / 4,37 (60) | 1,06 / 4,20 / 6,03 (59) | 0,86 / 3,75 / 5,48 (60) | 1,08 / 4,58 / 7,48 (57) |
| dopo P3b | 0,53 / 2,10 / 2,83 (60) | 0,77 / 2,96 / 3,80 (60) | 0,91 / 3,65 / 5,08 (59) | 1,94 / 7,92 / 11,88 (59) | 0,63 / 2,43 / 3,35 (60) | 0,76 / 2,96 / 3,93 (60) | 1,03 / 4,52 / 7,33 (56) | 0,92 / 3,87 / 6,18 (60) | 1,17 / 5,28 / 6,65 (60) |
| dopo P5a | 0,46 / 2,13 / 3,22 (60) | 0,66 / 3,00 / 3,99 (60) | 0,92 / 3,65 / 4,91 (59) | 2,20 / 8,73 / 12,58 (58) | 0,67 / 2,68 / 4,13 (60) | 0,79 / 3,15 / 4,08 (60) | 1,12 / 4,72 / 5,94 (59) | 0,98 / 4,10 / 5,64 (60) | 1,28 / 4,42 / 7,11 (58) |

## Note

- **dopo P1** (seme dei numeri casuali in una casella da 32 bit, acqua ferma e polvere sepolta saltate, nuvole che
  tirano meno dadi, fulmini con il freno): migliorano le scene piene di granelli (mare a x6 da 30,7 a 7,2 ms e da 28
  a 60 fotogrammi al secondo; temporale da 13,1 a 6,3; mondo maturo da 14,5 a 6,8; lago da 8,2 a 5,5). Le scene che
  il pacchetto non tocca (mondo vuoto, paese) restano dove erano: le differenze della tabella sono rumore della
  macchina. Controllo fatto alternando la copia di prima e quella di dopo, a x6, due giri per parte: mondo vuoto
  4,47-4,95 prima e 4,05-4,19 dopo; paese di giorno 5,08-6,17 e 5,61-5,66; paese di notte 6,57-6,83 e 5,58-6,12.
  Per rifare un confronto così: `node strumenti/misura.cjs --gioco <copia di prima>/dist/index.html --scene … --ritmi 6`.
- **dopo P1, controllo indipendente** (la copia di prima ricostruita dall'ultimo commit e misurata sulla stessa
  macchina, a x6, un giro): mare da 25,2 a 6,8 ms (da 35 a 60 fotogrammi al secondo), temporale da 11,6 a 6,6,
  incendio da 15,4 a 14,4, mondo vuoto da 3,9 a 3,7. Il paese, in tre giri alternati, va da 5,1 a 7,3 dopo e da
  5,1 a 6,4 prima (di notte 7,0-7,7 e 6,5-7,7): nessuna differenza che non sia rumore.
- **dopo P2** (omini con un paese e le fonti colonna per colonna, costruzioni che si posano solo dove stanno, muretto
  sotto le costruzioni): le scene «paese» e «mondo maturo» sono cambiate, perché le costruzioni non si posano più una
  sull'altra: ora stanno in fila dove il terreno è piano, e gli alberi del mondo maturo hanno il tronco segnato.
  Nessun costo che si veda: confronto alternato con la copia di prima (stesse scene, a x6, tre giri per parte) per il
  paese di notte 4,33-4,89 prima e 4,34-4,88 dopo; togliendo il muretto sotto le costruzioni 4,28-5,17 (rumore).
  Il ricalcolo delle fonti (ogni 120 istanti) e l'assestarsi delle cose (ogni 4) non si distinguono dal rumore.
- **dopo P2, controllo indipendente** (un giro completo, poi le scene del paese e il mondo maturo ripetute a macchina
  ferma, due giri): paese di giorno 0,68 / 3,84, paese di notte 0,82 / 4,36, mondo maturo 1,03 / 7,08 (pieno / x6),
  sempre 57-60 fotogrammi al secondo. Tutto entro il rumore rispetto alla riga «dopo P2».
- **dopo P3a** (esito unico `esitoDi`, `Mondo.porta`, `cheCosaCe`, coppie provate, ere in ordine): niente di nuovo
  gira a ogni fotogramma (si calcola solo a ogni scoperta nuova o quando si unisce), e infatti non costa niente.
  Confronto alternato con la copia di prima, a x6, due giri per parte: mondo vuoto 2,89 prima e 2,73 dopo; paese di
  giorno 3,84 e 3,78; mondo maturo 7,40 e 6,29 (rumore).
- **dopo P3a, controllo indipendente** (un giro completo dopo le correzioni): x6 vuoto 3,16, lago 3,80, temporale
  5,12, incendio 12,42, paese di giorno 3,89, di notte 4,90, maturo 5,81, mare 5,56, maturo trascinato 6,42, sempre
  58-60 fotogrammi al secondo. Tutto entro il rumore rispetto alle righe «dopo P2» e «dopo P3a».
- **dopo P3b** (trenta e più unioni nuove, i primi omini chiamati da un'unione, Unisci che ricorda le coppie provate,
  via il Mestolo): niente di nuovo gira a ogni fotogramma (si calcola solo quando si unisce), e il dito non passa più
  dal ramo del Mestolo. Confronto con la copia di prima, a x6, due giri per parte: mondo vuoto 2,71 prima e 2,65
  dopo; lago 3,79 e 3,76; temporale 4,68 e 5,07; incendio 11,64 e 11,40; paese di giorno 3,49 e 3,93; di notte 4,27
  e 4,37; mondo maturo 5,78 e 6,37; mare 5,47 e 5,60; maturo trascinato 6,76 e 6,46. Le differenze vanno nei due
  sensi e restano nel rumore della macchina, come il 7,33 del mondo maturo nella riga della tabella.
- **dopo P5a** (schede in `src/contenuti/`, registro unico, controlli automatici, le voci del paese come schede):
  a ogni fotogramma cambia solo come si legge l'ingombro di una cosa posata (`ingombroDi`, una tavola fatta una
  volta sola) e se sta a galla. Confronto alternato con la copia di prima, a x6, due giri per parte (prima / dopo):
  mondo vuoto 3,04-3,10 / 3,20-3,32; lago 4,00-4,12 / 3,89-3,97; temporale 4,99-5,54 / 5,18-5,27; incendio
  12,39-12,96 / 12,94-13,08; paese di giorno 3,73-3,82 / 3,86-4,40; di notte 4,81-4,82 / 4,62-5,06; mondo maturo
  7,12-7,16 / 5,89-7,31; mare 5,63-5,68 / 5,51-5,91; maturo trascinato 8,35-8,83 / 7,78-7,88. Tutto nel rumore.
- **dopo P5a, controllo indipendente** (copia di prima rifatta dall'ultimo commit, a x6, due giri alternati per
  parte, prima / dopo): mondo vuoto 2,87-3,11 / 3,20-3,22; lago 3,89-4,30 / 4,07-4,29 (un giro a 5,38, rifatto);
  temporale 5,27-5,95 / 5,48-5,56; incendio 12,33-12,44 / 12,22-13,40; paese di giorno 4,03 / 3,98-4,36; di notte
  4,30-5,10 / 5,08-5,18; mondo maturo 6,50-7,97 / 6,28-7,41; mare 5,71-5,88 / 6,13-6,14; maturo trascinato
  6,94-8,91 / 8,37-8,61. Nessuna scena oltre il rumore.
