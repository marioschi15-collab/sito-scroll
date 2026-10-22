---
name: promemoria
description: Trasforma una frase ("ricordami di chiamare la Lamberti giovedì alle 13", "la proposta Rossi scade il 28") in una riga corretta di memoria/agenda.md, al posto giusto, e aggiorna la scheda della persona se esiste. Usala per "ricordami", "segnati che", "scade il", "appuntamento con", "metti in agenda".
---
# Promemoria e scadenze in agenda

## Il formato, sempre lo stesso
`- [ ] AAAA-MM-GG HH:MM — cosa — per chi — fonte`
- Data completa con l'anno. L'ora si omette se non è stata detta (non inventarla).
- "cosa" inizia con un verbo o con il nome della scadenza: "Richiamare i Conti", "Scade la proposta Rossi su via A. Costa 3".
- "per chi" è la persona, il cliente o l'incarico; se riguarda solo l'utente, il suo nome.
- "fonte": "conversazione AAAA-MM-GG", "telegram AAAA-MM-GG", "onboarding", oppure il nome del file da cui viene.

## Come calcoli la data
- La data di oggi te la dà il coordinatore: "giovedì" è il prossimo giovedì (se oggi è giovedì, quello tra 7 giorni, a meno che ci sia un'ora futura), "fine mese" è l'ultimo giorno del mese corrente, "tra due settimane" è oggi + 14.
- Se la frase è ambigua ("il 3" senza mese, "lunedì prossimo" di domenica), non scegliere: metti la domanda nel blocco DOMANDE PER L'UTENTE e non scrivere la riga finché non c'è la risposta.
- Promemoria "senza data" ("prima o poi devo..."): non vanno in agenda; proponi al coordinatore una riga [decisione] o un "Prossimo passo" nella scheda.

## Dove scrivi
1. memoria/agenda.md: leggila per intero, inserisci la riga nell'ordine di data (le voci spuntate "[x]" stanno in fondo), non duplicare una voce già presente (aggiorna quella).
2. Se la persona o l'incarico ha una scheda in memoria/temi/, aggiungi la stessa cosa nella sezione "Prossimi passi" con la data.
3. Se la riga nasce da un promemoria ripetuto ogni settimana o mese, scrivi una sola riga con "(ogni lunedì)" nel "cosa" e la prossima data: niente dieci righe uguali.

## Orari di silenzio
Un promemoria per le 21:30 o per domenica, se l'utente ha chiesto silenzio in quelle ore, va spostato al primo orario utile (es. lunedì 08:00) con la nota "(spostato per silenzio)" e il coordinatore lo dice all'utente in una riga.

## Cosa non fare
- Non spuntare "[x]" una voce perché l'utente ne parla: solo quando dice che è fatta.
- Non cancellare voci: le voci spuntate le archivia l'archivista di notte.
- Non scrivere su calendari esterni: quando saranno collegati, sarà il coordinatore a chiedere conferma all'utente.
- Agenda oltre le 100 righe: fermati e proponi al coordinatore cosa archiviare.

## Cosa restituisci
La riga scritta esattamente com'è nel file, il file o i file toccati, e la frase da dire all'utente in una riga ("Segnato: giovedì 29 alle 13 telefonata al dott. Ferri.").
