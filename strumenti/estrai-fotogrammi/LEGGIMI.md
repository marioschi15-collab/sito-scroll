# Estrai fotogrammi da un video

Una pagina sola (`index.html`) che trasforma un video in immagini. Non serve installare niente:
sul computer si apre con un doppio clic in Chrome, Edge, Firefox o Safari. Il video non lascia il dispositivo.

Dal telefono si usa la stessa pagina pubblicata come pagina privata di Claude (si apre dal link, dal sito
o dall'app di Claude): lì il salvataggio dei file passa dal sistema di Claude, che chiede conferma a ogni file.
La pagina è pensata anche per lo schermo piccolo: una colonna sola, pulsanti grandi, messaggi dentro la pagina.

## Come si usa

1. Doppio clic su `index.html` (o apri il link dal telefono).
2. Premi "Scegli il video" (sul computer puoi anche trascinarlo nella pagina).
3. Scegli **quale parte**: tutto il video, i primi 10/20/30 secondi, il primo minuto, oppure scrivi tu
   da quando a quando (per esempio da `0:15` a `0:45`). Puoi anche mettere in pausa il video e premere
   "Inizia da qui" / "Finisci qui".
4. Scegli **ogni quanto**: ogni ½ secondo, 1, 2, 5, 10, 30 secondi, un valore tuo ("Altro…"),
   oppure **tutti i fotogrammi** (indicando quanti al secondo ha il video, di solito 25 o 30).
5. Scegli formato (JPG, PNG, WebP), qualità e dimensione delle immagini.
6. Premi "Estrai i fotogrammi", poi "Scarica tutto (ZIP)" oppure tocca una singola immagine.

I nomi dei file dicono numero e istante, per esempio `vacanze_007_00m12s000.jpg` = settima immagine, a 12 secondi.

## Limiti

- Legge i formati che il browser sa aprire. Se un video non si apre (capita con alcuni video
  dell'iPhone in formato HEVC su Windows), prova con Chrome o salvalo in MP4.
- Migliaia di immagini a piena risoluzione occupano molta memoria: per video lunghi conviene un intervallo
  più largo o una dimensione più piccola.
