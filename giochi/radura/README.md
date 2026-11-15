# Radura

Un piccolo gioco "sandbox del mago" che gira nel browser: un prato, un bastone, sette incantesimi e un villaggio
di circa duemila pezzi da far crollare, bruciare, gelare e far rifiorire. È tutto codice: nessuna immagine,
nessun modello 3D, nessun file audio (anche i suoni sono fabbricati con formule).

## Come si gioca

- **Computer**: `W` `A` `S` `D` per camminare, mouse per guardare, clic per lanciare. Tasti `1`–`7` (o la rotella)
  per cambiare incantesimo, `Spazio` salta, `Maiusc` corri, `R` ricostruisce il villaggio.
- **Telefono**: pollice sinistro per camminare, destro per guardarsi intorno; si tocca un incantesimo in basso
  e si tiene premuto ✦ per lanciarlo.

Gli incantesimi: Fuoco, Gelo, Esplosione, Singolarità, Tornado, Crescita, Fulmine. Si combinano: il gelo spegne
gli incendi, il tornado che passa sul fuoco diventa di fiamme, la crescita fa rinascere il prato bruciato.

## Comandi per chi sviluppa

```powershell
pnpm install
pnpm dev          # il gioco in sviluppo, si aggiorna a ogni modifica
pnpm typecheck    # controllo dei tipi
pnpm test         # prova senza grafica: il villaggio deve stare in piedi da solo
pnpm build        # crea dist/index.html: un solo file, si apre con un doppio clic
```

## Dove sta cosa

- `src/mondo/`: terreno, cielo, erba e fiori, alberi, e `costruzioni.ts` che disegna il villaggio pezzo per pezzo.
  `campo.ts` tiene lo stato del prato (bruciato, gelato, rigoglioso, in fiamme) a quadretti.
- `src/fisica/pezzi.ts`: i pezzi delle costruzioni, con peso e attrito (motore fisico Rapier).
- `src/incantesimi/`: un file per incantesimo; `elenco.ts` decide l'ordine nella barra.
- `src/effetti/`: scintille, fumo, anelli, saette, cerchi magici, bagliori.
- `src/giocatore.ts`, `src/bastone.ts`, `src/comandi.ts`, `src/interfaccia.ts`, `src/suoni.ts`: chi gioca e ciò che vede e sente.
- `prove/stabilita.ts`: la prova automatica.

Il gioco è un progetto a sé (come i siti in `siti/`): non fa parte del workspace di Spalla.
