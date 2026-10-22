---
name: preventivo
description: Costruisce un preventivo ordinato partendo dal listino dell'utente o da una descrizione a voce o scritta, con voci, quantità, totali, acconto, tempi, inclusi ed esclusi, e se serve due o tre pacchetti. Usala per "preventivo", "quanto gli chiedo", "fammi due opzioni", "rifai il preventivo", "sopralluogo fatto, ora i prezzi".
---
# Preventivo

## Cosa ti serve prima di scrivere
- Il listino o le tariffe dell'utente: in lavoro/riferimenti/listino.md, in profilo/UTENTE.md, nei preventivi precedenti in lavoro/preventivi/ o nel compito ricevuto. Se manca una cifra, la voce resta "[da definire]": mai inventarla, mai "prezzo di mercato".
- Il cliente (tu o lei, condizioni già concordate) dalla scheda in memoria/temi/.
- Le regole fisse dell'utente: acconto abituale (es. 30%), tempi di pagamento, cosa è sempre incluso ed escluso, IVA applicata o "regime forfettario, IVA non applicata".
- Il tipo di lavoro: a corpo (prezzo chiuso), a misura (quantità × prezzo unitario), a ore (ore stimate × tariffa), con la stima dichiarata come tale.

## Struttura del file (lavoro/preventivi/AAAA-MM-GG-<cliente>-<lavoro>.md)
1. Intestazione: "Preventivo per <cliente> — <lavoro>", data, validità (predefinita 30 giorni), riferimento a un sopralluogo o a una richiesta se c'è.
2. Voci: una riga per voce, con descrizione concreta e verificabile, quantità, unità, prezzo unitario, totale di riga. Niente "varie ed eventuali" senza cifra.
3. Totali: imponibile, IVA se applicabile (aliquota e importo), totale. Due decimali, virgola per i decimali, punto per le migliaia. Rifai la somma a mano prima di consegnare.
4. Condizioni: acconto (importo e quando), saldo (quando), tempi di consegna o di esecuzione, cosa è incluso, cosa è escluso, cosa succede se cambia il lavoro ("le voci aggiuntive si concordano prima").
5. Firma: nome dell'utente e come accettare ("rispondi 'accetto' a questo preventivo o firma e rimanda").

## Pacchetti (quando ha senso)
Due o tre opzioni: Base / Consigliato / Completo, con una riga ciascuna che dice cosa cambia. Il consigliato è il secondo e porta il nome del lavoro vero ("Servizio matrimonio intero"), non "Pacchetto B". Stesso ordine di voci in tutti e tre, così si confrontano.

## Versioni
Un preventivo già consegnato non si sovrascrive: scrivi un file nuovo con suffisso -v2 e una riga "Cosa cambia rispetto alla v1" in cima. Il preventivo accettato si segnala al coordinatore perché lo annoti in memoria (riga [incarico] e scheda del cliente).

## Regole
- Linguaggio che il cliente capisce: niente sigle interne, niente gergo tecnico senza una parola in più.
- Nessuno sconto, bonus o omaggio non dichiarato dall'utente. Se l'utente vuole uno sconto, scrivilo come voce negativa con il motivo in una parola ("sconto cliente abituale").
- Niente pareri fiscali (aliquote, ritenute, bolli): "da chiedere al commercialista".
- Sopra la soglia scelta dall'utente (predefinita 1.000 €) il coordinatore passa il preventivo al critico prima di mostrarlo: segnalalo nel riepilogo.

## Cosa restituisci
Il percorso del file, il totale (o i totali dei pacchetti) in una riga, le voci "[da definire]" e, se serve, un blocco "DOMANDE PER L'UTENTE:" con al massimo 3 domande.
