# Radura

Un gioco "sandbox del mago" che gira nel browser: un mondo aperto con cinque terre diverse, un bastone,
tredici incantesimi e quasi seimila pezzi da far crollare, bruciare, gelare, sollevare e rimettere a posto.
È tutto codice: nessuna immagine, nessun modello 3D, nessun file audio (anche i suoni sono fabbricati con formule).

## Il mondo

Si parte dalla **Radura**, con il villaggio. Intorno ci sono le **Dune d'Ambra** (piramide, tempio delle colonne,
case di sabbia), le **Terre Gelate** (castello di ghiaccio, igloo, guglia di cristallo), la **Palude dei Lumi**
(palafitte, torre storta, funghi giganti) e il **Monte Brace** (fortezza nera, altare, lava). Nei prati ci sono anche
una fattoria e una torre di vedetta. In alto a sinistra c'è la mappa: i tredici luoghi sono cerchietti, che diventano
pieni quando li si scopre. Ogni zona ha il suo terreno, la sua vegetazione, la sua nebbia e il suo cielo.

## Come si gioca

- **Computer**: `W` `A` `S` `D` per camminare, mouse per guardare, clic per lanciare. Tasti `1`–`0`, `Q`/`E` o la rotella
  per cambiare incantesimo, `Spazio` salta, `Maiusc` corri, `R` ricostruisce tutto.
- **Telefono**: pollice sinistro per camminare, destro per guardarsi intorno; si tocca un incantesimo in basso
  e si tiene premuto ✦ per lanciarlo.

Gli incantesimi: Fuoco, Gelo, Fulmine, Esplosione, Meteore, Terremoto, Tornado, Singolarità, e poi quelli inventati
da noi o più giocosi: **Levitazione** (una bolla dove il peso sparisce), **Presa** (tieni premuto per afferrare i pezzi,
rilascia per scagliarli), **Cristalli** (spuntoni che eruttano dal terreno), Crescita e **Rammendo** (riavvolge il tempo:
ciò che era rotto o bruciato torna al suo posto). Si combinano: il gelo spegne gli incendi, il tornado che passa sul
fuoco diventa di fiamme, la crescita fa nascere l'erba anche nel deserto.

## Comandi per chi sviluppa

```powershell
pnpm install
pnpm dev          # il gioco in sviluppo, si aggiorna a ogni modifica
pnpm typecheck    # controllo dei tipi
pnpm test         # prove senza grafica: le costruzioni stanno in piedi da sole, e una casa rammendata regge
pnpm build        # crea dist/index.html: un solo file, si apre con un doppio clic
```

## Dove sta cosa

- `src/mondo/`: `zone.ts` (le cinque terre e i tredici luoghi), terreno, cielo, erba e fiori, vegetazione, e
  `costruzioni.ts` che disegna ogni luogo pezzo per pezzo.
  `campo.ts` tiene lo stato del prato (bruciato, gelato, rigoglioso, in fiamme) a quadretti.
- `src/fisica/pezzi.ts`: i pezzi delle costruzioni, con peso e attrito (motore fisico Rapier). I luoghi lontani
  restano solo disegnati e "prendono vita" quando ci si avvicina.
- `src/incantesimi/`: un file per incantesimo; `elenco.ts` decide l'ordine nella barra.
- `src/effetti/`: scintille, fumo, anelli, saette, cerchi magici, bagliori.
- `src/giocatore.ts`, `src/bastone.ts`, `src/comandi.ts`, `src/interfaccia.ts`, `src/suoni.ts`: chi gioca e ciò che vede e sente.
- `prove/`: le prove automatiche.

Il gioco è un progetto a sé (come i siti in `siti/`): non fa parte del workspace di Spalla.
