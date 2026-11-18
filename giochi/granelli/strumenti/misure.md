# Misure di velocità

Tabella storica di `node strumenti/misura.cjs` (vedi il README). Ogni pacchetto di lavoro aggiunge la sua riga con
`node strumenti/misura.cjs --scrivi "nome della riga"`, dopo `pnpm build`.

In ogni casella: millesimi di JavaScript per fotogramma a velocità piena / con il processore rallentato 4 volte
(telefono medio) / rallentato 6 volte (telefono economico), e tra parentesi i fotogrammi al secondo a x6.
Telefono simulato 390x780. I numeri assoluti dipendono dalla macchina che misura: contano i confronti tra righe
misurate sulla stessa macchina, e differenze sotto il 10-15% sono rumore.

| riga | mondo vuoto | lago (6.000 celle) | temporale | incendio | paese di giorno | paese di notte | mondo maturo | mare (29.000 celle) | maturo, vista trascinata | paese con 30 creature | 40 miscele |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| partenza | 0,65 / 2,56 / 3,50 (60) | 1,27 / 5,18 / 8,16 (60) | 1,91 / 9,18 / 13,11 (51) | 2,87 / 11,85 / 17,56 (43) | 0,90 / 4,18 / 5,10 (60) | 0,92 / 4,69 / 5,58 (60) | 2,55 / 11,29 / 14,48 (47) | 2,89 / 13,54 / 30,69 (28) | 2,85 / 9,85 / 19,91 (31) | – | – |
| dopo P1 | 0,60 / 2,43 / 3,30 (60) | 0,76 / 3,16 / 5,52 (60) | 1,14 / 6,01 / 6,30 (59) | 2,48 / 12,24 / 14,38 (52) | 0,81 / 3,94 / 5,33 (60) | 0,97 / 4,26 / 6,65 (60) | 1,47 / 6,61 / 6,77 (60) | 1,14 / 4,72 / 7,23 (60) | 1,41 / 7,28 / 9,72 (50) | – | – |
| dopo P2 | 0,59 / 1,95 / 2,91 (60) | 0,69 / 2,56 / 4,42 (60) | 0,92 / 3,72 / 5,11 (59) | 2,27 / 8,66 / 12,59 (58) | 0,85 / 3,33 / 4,23 (60) | 0,77 / 3,58 / 5,32 (60) | 1,13 / 4,64 / 6,91 (58) | 1,29 / 4,02 / 5,90 (60) | 1,15 / 5,11 / 8,21 (54) | – | – |
| dopo P3a | 0,47 / 1,89 / 2,86 (60) | 0,71 / 2,63 / 3,83 (60) | 0,77 / 3,24 / 4,79 (59) | 1,86 / 8,04 / 11,80 (59) | 0,60 / 2,50 / 3,57 (60) | 0,76 / 2,69 / 4,37 (60) | 1,06 / 4,20 / 6,03 (59) | 0,86 / 3,75 / 5,48 (60) | 1,08 / 4,58 / 7,48 (57) | – | – |
| dopo P3b | 0,53 / 2,10 / 2,83 (60) | 0,77 / 2,96 / 3,80 (60) | 0,91 / 3,65 / 5,08 (59) | 1,94 / 7,92 / 11,88 (59) | 0,63 / 2,43 / 3,35 (60) | 0,76 / 2,96 / 3,93 (60) | 1,03 / 4,52 / 7,33 (56) | 0,92 / 3,87 / 6,18 (60) | 1,17 / 5,28 / 6,65 (60) | – | – |
| dopo P5a | 0,46 / 2,13 / 3,22 (60) | 0,66 / 3,00 / 3,99 (60) | 0,92 / 3,65 / 4,91 (59) | 2,20 / 8,73 / 12,58 (58) | 0,67 / 2,68 / 4,13 (60) | 0,79 / 3,15 / 4,08 (60) | 1,12 / 4,72 / 5,94 (59) | 0,98 / 4,10 / 5,64 (60) | 1,28 / 4,42 / 7,11 (58) | – | – |
| dopo P5b | 0,48 / 1,78 / 2,45 (60) | 0,57 / 2,34 / 3,24 (60) | 0,80 / 3,01 / 4,74 (59) | 1,86 / 7,36 / 10,81 (60) | 0,60 / 2,11 / 3,28 (60) | 0,62 / 2,50 / 3,94 (60) | 0,86 / 4,01 / 5,59 (59) | 0,91 / 3,51 / 5,14 (60) | 1,04 / 4,06 / 6,53 (59) | 0,67 / 2,58 / 3,81 (60) | – |
| dopo P7 | 0,61 / 2,95 / 3,50 (60) | 0,88 / 3,57 / 5,83 (60) | 1,17 / 4,63 / 7,12 (59) | 2,60 / 10,92 / 15,63 (50) | 0,88 / 3,85 / 5,41 (60) | 1,16 / 4,26 / 5,52 (59) | 1,21 / 5,70 / 7,51 (60) | 1,14 / 5,22 / 7,32 (60) | 1,33 / 5,57 / 8,82 (56) | 1,05 / 4,46 / 5,99 (59) | – |
| dopo P9 | 0,67 / 2,95 / 4,03 (60) | 0,82 / 3,53 / 4,83 (60) | 1,11 / 4,45 / 6,47 (59) | 2,39 / 10,15 / 15,62 (51) | 1,12 / 3,13 / 4,24 (60) | 1,01 / 3,66 / 5,46 (59) | 1,45 / 4,95 / 7,10 (60) | 1,39 / 4,72 / 7,21 (60) | 1,46 / 5,53 / 8,03 (59) | 0,91 / 4,04 / 5,85 (60) | – |
| dopo P10 | 0,82 / 2,77 / 3,90 (60) | 0,85 / 3,42 / 5,09 (60) | 1,33 / 4,65 / 6,89 (59) | 2,85 / 11,24 / 15,14 (53) | 0,84 / 3,38 / 6,11 (60) | 1,14 / 4,42 / 6,26 (59) | 1,35 / 5,69 / 7,32 (59) | 1,21 / 5,30 / 6,68 (60) | 1,30 / 5,92 / 9,06 (55) | 0,91 / 3,76 / 6,42 (59) | 2,28 / 8,31 / 13,85 (53) |

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
- **dopo P5b** (creature, oggetti appoggiati e in mano, mestieri, idee, eventi, reazioni di cortesia): nuova colonna
  «paese con 30 creature» (il paese di giorno, più dieci creature che camminano tra le case, dieci che volano sopra e
  dieci pesci in una vasca scavata accanto). Le creature pensano ogni quattro istanti: provate da sole, trenta costano
  circa 3 milionesimi di secondo per istante. Le pose specchiate si preparano una volta sola, così chi va a sinistra
  si disegna con un'immagine sola come chi va a destra. Confronto alternato con la copia di prima, a x6, due giri per
  parte (prima / dopo): mondo vuoto 2,56-3,08 / 2,71-2,83; paese di giorno 2,94-3,10 / 3,09-3,43; di notte 3,93-4,12
  / 3,48; mondo maturo 5,31-6,03 / 5,56-6,66: nel rumore. Il paese con 30 creature, dopo le pose specchiate, contro il
  paese senza nello stesso giro (tre giri): 3,52-4,30 contro 3,14-3,45, sempre 60 fotogrammi al secondo; la differenza
  sta per lo più nella vasca d'acqua in più e nelle trenta figure da disegnare.
- **dopo P7** (una finestra alla volta, salvataggio a prova di guasto): a ogni fotogramma si aggiunge solo la domanda
  «c'è una finestra che ferma il mondo?»; i salvataggi passano dal custode (al più uno ogni due secondi, mai durante
  un gesto) invece di uno per ogni scoperta. Confronto alternato con la copia di prima, a x6, due giri per parte
  (prima / dopo): mondo vuoto 3,86-4,01 / 3,71-3,90; paese di giorno 4,95-5,36 / 4,73-5,49; mondo maturo 9,63-9,64
  (53 fotogrammi) / 7,31-7,80 (59): qui le scoperte arrivano a raffica e prima ognuna riscriveva tutta la partita;
  paese con 30 creature 5,10-5,62 / 5,47-5,97; incendio 14,29-16,42 / 14,97-15,92; temporale 6,46-6,92 / 6,67-7,06.
  Oggi la macchina è più lenta per tutte e due le copie (l'incendio a 15 contro l'11 della riga «dopo P5b»): conta il
  confronto nello stesso giro, e fuori dal mondo maturo è tutto nel rumore.
- **dopo P9** (mai un «niente» muto, indizi, puntini sui gettoni): a ogni fotogramma non si aggiunge niente. Il quadro
  dei suggerimenti si calcola solo quando cambiano le scoperte (ridisegno della tavolozza, apertura di Unisci, tasto
  Indizio), in una passata sulle circa 190 coppie scritte, e resta in memoria finché le scoperte non crescono: con 500
  voci finte e 2.000 coppie costa meno di un millesimo (prova in test/suggerimenti.test.ts). Confronto alternato con
  la copia di prima, a x6, due giri per parte (prima / dopo): mondo vuoto 4,09-4,12 / 4,04-4,30; paese di giorno
  5,50-5,54 / 5,41-6,14; mondo maturo 8,28-8,35 / 7,74-8,92; paese con 30 creature 5,89-6,04 / 5,81-6,78: nel rumore.
- **dopo P9, controllo indipendente** (copia di prima rifatta dall'ultimo commit, a x6, due giri alternati per
  parte, prima / dopo): mondo vuoto 3,42-3,80 / 3,63-3,66; paese di giorno 4,49-4,98 / 4,40-5,04; mondo maturo
  7,22-7,59 / 6,74-6,95; paese con 30 creature 5,23-5,24 / 5,49-5,65. Nessuna scena oltre il rumore.
- **dopo P10** (miscele con nomi parlanti, sei caratteri nuovi, reazioni tra miscele, rarità, miscele d'autore): nuova
  colonna «40 miscele» (le prime quaranta coppie di materiali che danno una miscela, in mucchietti sul suolo intorno al
  centro, con materiali e fenomeni già nel Libro perché le scoperte e i loro salvataggi non entrino nella misura). Le
  miscele che non fanno niente ai vicini (fanno luce, nutrono, fanno da terreno…) ora non tirano più il dado del vicino
  (`agisce` in miscele-vive.ts): nel profilo la funzione delle miscele passa da 109 a 70 millesimi su cinque secondi a
  x6. Con le stesse miscele di prima nelle due copie (motore in Node, 800 istanti, cinque giri) il passo costa uguale:
  0,605-0,616 contro 0,608-0,615 millesimi. Confronto alternato con la copia di prima, a x6, tre giri per parte (prima /
  dopo): 40 miscele 11,51-12,09 / 11,95-12,75 (57-58 / 56-58 fotogrammi): le miscele nuove sono più vive (fanno piovere,
  fanno crescere alberi, scorrono), e il mondo ne paga un poco, nel rumore. Mondo vuoto 3,70-4,66 / 4,13-4,15; paese di
  giorno 4,87-6,12 / 5,06-5,61; mondo maturo 7,79-8,11 / 8,47-8,68: nel rumore. Nella riga sopra il paese di giorno a
  x6 (6,11) e le 40 miscele (13,85) sono giri disturbati: nei giri alternati stanno a 5,1-5,6 e 12,0-12,8.
- **dopo P10, controllo indipendente** (copia di prima rifatta dall'ultimo commit, a x6, due giri alternati per
  parte, prima / dopo): lago 5,47-5,50 / 5,17-6,09; paese di giorno 4,90-5,37 / 4,83-4,93; mondo maturo 7,84-8,16 /
  7,54-7,66; maturo, vista trascinata 7,74-8,59 / 8,27-8,31; 40 miscele 11,50-11,89 / 11,30-12,43. Nessuna scena
  oltre il rumore. Un giro intero di questa copia, sulla stessa macchina: 0,71 / 2,70 / 3,58 (vuoto), 0,99 / 3,72 /
  5,18 (paese di giorno), 1,23 / 6,18 / 8,78 (maturo), 2,25 / 8,45 / 11,91 (40 miscele).
