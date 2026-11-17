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
