# Radura

Un gioco "sandbox del mago" che gira nel browser: un mondo senza confini con cinque tipi di terra, un bastone,
tredici incantesimi e migliaia di pezzi da far crollare, bruciare, gelare, sollevare e rimettere a posto.
È tutto codice: nessuna immagine, nessun modello 3D, nessun file audio (anche i suoni sono fabbricati con formule).

## Il mondo

Il mondo **non ha confini**: terreno, terre e luoghi nascono attorno a chi gioca mentre cammina, in qualunque
direzione, e sono sempre gli stessi ogni volta che ci si torna (la "sorte" dipende solo dal punto della mappa).
Si parte dal villaggio della **Radura**; il clima cambia dolcemente da un posto all'altro e fa nascere le **Dune
d'Ambra** (piramidi, templi, case di sabbia), le **Terre Gelate** (castelli di ghiaccio, igloo, guglie), la **Palude
dei Lumi** (palafitte, torri storte, funghi giganti) e il **Monte Brace** (vulcani con lava, fortezze nere, altari).
Nei prati ci sono borghi, fattorie e torri di vedetta. La mappa in alto a sinistra segue chi gioca: i luoghi vicini
sono cerchietti, che diventano pieni quando li si scopre. Il gioco ricorda le scoperte e il punto in cui si è
arrivati; il pulsante "Al villaggio" riporta alla partenza.

## Come si gioca

- **Computer**: `W` `A` `S` `D` per camminare, mouse per guardare, clic per lanciare. Tasti `1`–`0`, `Q`/`E` o la rotella
  per cambiare incantesimo, `Spazio` salta, `Maiusc` corri, `R` ricostruisce tutto.
- **Telefono**: pollice sinistro per camminare, destro per guardarsi intorno; si tocca un incantesimo in basso
  e si tiene premuto ✦ per lanciarlo.

Con il pulsante **＋** in fondo alla barra (tasto `C` al computer) si apre l'**officina**: lì ognuno inventa i suoi
incantesimi scegliendo come partono (palla, tocco, dal cielo, pioggia, onda), che cosa fanno (fino a tre effetti tra
undici), potenza, ampiezza, nome, simbolo e colore. Ogni incantesimo inventato ha un codice (`RAD1…`) da passare a un
amico, che lo incolla nell'officina e lo ottiene uguale. Restano salvati nel browser di chi gioca.

Gli incantesimi di serie: Fuoco, Gelo, Fulmine, Esplosione, Meteore, Terremoto, Tornado, Singolarità, e poi quelli inventati
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

- `src/mondo/`: `zone.ts` (il clima che decide le terre, e la sorte che decide i luoghi), `terreno.ts` (zolle che
  nascono attorno a chi gioca e vengono riusate), cielo, erba e fiori, vegetazione, e `costruzioni.ts` che disegna
  ogni tipo di luogo pezzo per pezzo.
  `campo.ts` tiene lo stato del prato (bruciato, gelato, rigoglioso, in fiamme) a quadretti.
- `src/fisica/pezzi.ts`: i pezzi delle costruzioni, con peso e attrito (motore fisico Rapier). I luoghi compaiono
  quando entrano in vista, "prendono vita" quando ci si avvicina e vengono tolti quando restano lontani.
- `src/incantesimi/`: un file per incantesimo; `elenco.ts` decide l'ordine nella barra; `officina.ts` trasforma una
  ricetta inventata da chi gioca in un incantesimo vero (e in un codice da condividere). `src/officinaUi.ts` è la schermata.
- `src/base/qualita.ts`: quanto dettaglio mostrare. Si parte alti anche sul telefono; se i fotogrammi scendono, il gioco
  alleggerisce da solo un gradino alla volta (vedi `alleggerimenti` in `main.ts`).
- `src/effetti/`: scintille, fumo, anelli, saette, cerchi magici, bagliori.
- `src/giocatore.ts`, `src/bastone.ts`, `src/comandi.ts`, `src/interfaccia.ts`, `src/suoni.ts`: chi gioca e ciò che vede e sente.
- `prove/`: le prove automatiche.

Il gioco è un progetto a sé (come i siti in `siti/`): non fa parte del workspace di Spalla.
