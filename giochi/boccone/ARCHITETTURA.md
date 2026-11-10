# Boccone — architettura e regole di lavoro

Boccone è un gioco per telefono (una sola pagina web, senza dipendenze): guidi un pesciolino, mangi chi è più piccolo
di te, cresci e alla fine affronti un gigante. Questo documento è il **contratto** tra chi scrive il motore, chi disegna
i modelli e chi fa le schermate. Se il codice deve divergere, si aggiorna questo documento nello stesso lavoro.

Il gioco è **originale**: il meccanismo "mangia e cresci" è un genere, ma nomi, personaggi e grafica sono nostri.
Non imitare personaggi, pesci o schermate di giochi o film esistenti. Gli animali veri vanno benissimo.

## 1. Cartelle

```
giochi/boccone/
  index.html            il gioco finito, UN SOLO FILE, generato da strumenti/costruisci.mjs (non si modifica a mano)
  ARCHITETTURA.md       questo documento
  GUIDA-STILE.md        come si disegnano i modelli (scritta dal direttore artistico)
  src/pagina.html       lo scheletro della pagina, con i segnaposto <!-- STILI --> e <!-- SCRIPT -->
  src/css/*.css         fogli di stile (uniti in ordine alfabetico)
  src/js/**/*.js        il codice (unito in ordine alfabetico di percorso: per questo i nomi hanno un numero davanti)
      00-nucleo.js        B.util, B.eventi, registri B.specie / B.eroi / B.ambienti
      01-cast.js          B.cast: l'elenco di tutti gli abitanti con dati di gioco e indicazioni di disegno
      05-progressi.js     B.progressi: salvataggio, perle, potenziamenti, eroi, acquario, traguardi, impostazioni
      10-pittura.js       B.pittura: la cassetta degli attrezzi per disegnare (NON si modifica dopo la scelta dello stile)
      20-specie/<id>.js   i modelli: pesci, giganti, banchi, pericoli — UN FILE PER MODELLO, col nome dell'id
      25-eroi/<id>.js     i protagonisti, un file per eroe
      29-provvisorie.js   modelli e ambienti provvisori per tutto ciò che nel cast non ha ancora un modello vero
      30-ambienti/*.js    gli ambienti (sfondi e scenari)
      40-… 59-…           il motore (figurine, disegno, mondo, livelli, giganti)
      60-audio.js         suoni e musica
      70-… 89-…           interfaccia e schermate
      99-avvio.js         ciclo principale
  strumenti/            strumenti di sviluppo (Node + Playwright, già installati)
  anteprime/            immagini e prove: NON va in git
```

Comandi (dalla radice del repository):

```
node giochi/boccone/strumenti/costruisci.mjs                 # genera index.html
node giochi/boccone/strumenti/galleria.mjs --solo id1,id2    # schede dei modelli → anteprime/galleria/<id>.png
node giochi/boccone/strumenti/ambiente.mjs --solo laguna     # viste di un ambiente → anteprime/ambienti/
```

`galleria.mjs` e `ambiente.mjs` accettano `--da <cartella>` (carica i .js di quella cartella invece di src),
`--con-src` (in aggiunta a src) e `--esci <cartella>`. Stampano un riepilogo con gli avvisi: **vanno portati a zero**.
Le immagini prodotte si guardano con lo strumento Read.

## 2. Regole per tutti

- JavaScript semplice (niente TypeScript, niente moduli ES, niente librerie, niente rete). Ogni file è chiuso in
  `(() => { 'use strict'; const B = window.B; … })();` e comunica solo attraverso `B`.
- Identificatori e commenti in italiano. Testi mostrati al giocatore in italiano semplice, senza gergo tecnico
  (mai "boss", "power-up", "livello di difficoltà", "sprite"…: si dice gigante, aiuto, bolla, cuore, perla).
- Ognuno modifica **solo i file che gli sono stati assegnati**. Niente `git commit`/`push`: ci pensa chi coordina.
- Non scrivere mai `</script>` dentro i file .js.
- Niente `alert/confirm/prompt`, niente download, niente `window.open`. `localStorage` sempre dentro try/catch.
- Il gioco deve restare fluido su un telefono medio: niente lavoro pesante per fotogramma, niente oggetti creati a
  raffica nel ciclo, liste con un tetto.

## 3. I modelli (specie, giganti, banchi, pericoli, eroi)

Un modello è una funzione `disegna(c, o)` che disegna la creatura con Canvas 2D, registrata così:

```js
B.specie.registra({
  id: 'pesce_angelo',              // deve esistere in src/js/01-cast.js: da lì eredita nome, taglia, ambienti, indole…
  descrizione: 'Una o due frasi vere e curiose per l\'acquario, in italiano semplice.',
  forma: { lx: 1.05, ly: 1.1 },    // mezza lunghezza e mezza altezza del CORPO (senza pinne lunghe), in unità
  ingombro: { x0: -1.9, y0: -1.7, x1: 1.2, y1: 1.7 },  // rettangolo che contiene TUTTO il disegno, in ogni posa
  disegna(c, o) { … },
});
```

Gli eroi usano `B.eroi.registra({ id, descrizione, ingombro, disegna })` (nome, costo e vantaggio arrivano dal cast).

### Sistema di coordinate (uguale per tutti)

- L'origine è il centro della creatura. **+x è in avanti (muso), +y è in basso (pancia).** Si disegna sempre rivolti
  a destra, pancia in giù.
- **1 unità = il raggio di contatto.** Il motore scala e ruota prima di chiamare `disegna`. Il cerchio di raggio 1
  attorno all'origine è dove avvengono i morsi: il grosso del corpo deve starci attorno (corpi lunghi possono
  sporgere avanti e dietro; `forma.lx` dice di quanto).
- Quando la creatura nuota verso sinistra il motore la ruota e poi la **specchia in verticale** (`scale(1,-1)`), così la
  pancia resta in giù. Con `assetto: 'dritto'` (cavalluccio, granchi, nautilus…) il motore non ruota: specchia soltanto
  in orizzontale. La galleria mostra entrambi i casi.
- Per i **banchi** (pesciolini) 1 unità = mezza lunghezza del pesciolino. Per i **pericoli** 1 unità = il raggio che fa male.
- Grandezze nel gioco, in pixel di telefono: taglia 1 ≈ 10–24 px di raggio, taglia 5 ≈ 35–84, giganti ≈ 50–90,
  eroe ≈ 22–40, pesciolini dei banchi ≈ 9–12 px di mezza lunghezza. **Il modello deve leggersi bene da piccolo**
  (sagoma chiara, occhio visibile) ed essere ricco da grande (acquario, negozio).

### Le opzioni `o`

| campo | chi lo riceve | significato |
|---|---|---|
| `fase` | tutti | 0..1, ciclo di nuoto che si ripete: `fase = 0` e `fase = 1` devono dare lo stesso disegno. Usa `Math.sin(fase * TAU * n)` con n intero. |
| `bocca` | pesci, giganti, eroi | 0..1, apertura della bocca |
| `minaccia` | pesci, giganti | `true` quando dà la caccia: sopracciglia aggrottate, denti in vista. Da calmo deve sembrare tranquillo, a caccia cattivo: la differenza si deve vedere anche da piccolo. |
| `t` | eroi, giganti | secondi, tempo continuo per animazioni secondarie (respiro, tentacoli, esca che dondola) |
| `stadio` | eroi | 0, 1, 2: cucciolo, adulto, colosso. Cambia l'aspetto, non la scala. |
| `espressione` | eroi | `'normale'`, `'felice'` (ha appena mangiato), `'spaventato'` (inseguito), `'colpito'` |
| `sguardo` | eroi, giganti | `{x, y}` verso cui guardano le pupille, in coordinate del modello |
| `stato` | giganti | `'calmo'`, `'caccia'`, `'avviso'` (sta per attaccare: `o.carica` va da 0 a 1), `'carica'`, `'stordito'`, `'sconfitto'` |
| `attivo` | pericoli | 0..1: a riposo → in azione (mina che lampeggia, sfiatatoio che erutta, stalattite che trema) |
| `dettaglio` | tutti | 0..1, facoltativo: sotto 0.5 si possono saltare i particolari minuti |

Regole dure, controllate dalla galleria:

1. `disegna` è una **funzione pura** di `o`: niente `Math.random`, niente `Date`, niente stato che resta tra una
   chiamata e l'altra. Per variare i particolari usa `B.util.rumore(indice, seme)`.
   I pesci normali, i banchi e i pericoli vengono pre-disegnati in pochi fotogrammi: devono dipendere **solo** da
   `fase`, `bocca`, `minaccia`, `attivo`. Eroi e giganti sono disegnati dal vivo e possono usare anche `t`.
2. Lascia la tela come l'hai trovata: ogni `save()` ha il suo `restore()`, `globalAlpha` torna a 1, niente
   `setTransform`/`resetTransform`/`clearRect`, niente `filter`.
3. `shadowBlur` è vietato in eroi, giganti, pericoli e banchi (sono disegnati dal vivo: costa troppo). Nei pesci
   normali è ammesso con parsimonia per i bagliori. Per la luce preferisci gradienti radiali.
4. Tutto il disegno sta dentro `ingombro`, in ogni fase e posa; e l'ingombro non deve essere molto più largo del
   necessario (la galleria stampa l'ingombro misurato: copialo, arrotondando per eccesso di qualche centesimo).
5. Costo massimo (la galleria lo misura in multipli di un pesce semplice): pesci ×40, eroi ×45, giganti ×70,
   pericoli ×40, banchi ×4.
6. Ogni modello ha `descrizione` (tranne banchi e pericoli).

Lo stile (contorni, ombre, occhi, palette) e gli attrezzi di `B.pittura` sono descritti in **GUIDA-STILE.md**: va
seguita alla lettera perché sessanta modelli fatti da mani diverse sembrino della stessa mano.

### Dati di gioco nel cast (li usa il motore, chi disegna li legge per capire il carattere)

- `taglia` 1..5 → raggio `B.cast.raggi[taglia-1]` e fascia di potenza. I giganti hanno raggio `B.cast.raggioGigante`.
- `indole`: `cacciatore` (ti insegue se è più forte), `timido` (non attacca mai e non fa male: scappa),
  `agguato` (fermo o lento, poi scatto fulmineo da vicino), `scattante` (insegue a strappi veloci),
  `pattuglia` (fa la ronda su un percorso largo, vede lontano), `branco` (gira in gruppi di 3–5), `pigro` (lento, si
  accorge di te solo da vicino).
- `speciale`: `inchiostro` (se inseguito lascia una nuvola che copre la vista), `scossa` (alone elettrico che stordisce),
  `veleno` (si può mangiare solo se sei almeno 2 volte più forte), `corazza` (solo se sei almeno 1,5 volte più forte),
  `luce` (brilla al buio).

## 4. Gli ambienti

```js
B.ambienti.registra({
  id: 'laguna',                    // nel cast: nome, ordine, mondo {w,h}, banchi, pericoli, gigante
  descrizione: 'Una riga per la mappa.',
  colori: { acquaAlta: '#…', acquaBassa: '#…', sabbia: '#…', roccia: '#…', accento: '#…' },   // usati anche dall'interfaccia
  crea(mondo, caso) { … return scena; },   // una volta per livello. mondo = {w, h}; caso() = casuale ripetibile in [0,1)
  sfondo(c, v, scena) { … },   // misure di SCHERMO: riempie tutto 0..v.vw × 0..v.vh (acqua e piani lontani in parallasse)
  dietro(c, v, scena) { … },   // misure di MONDO, dietro alle creature: fondale, superficie o soffitto, pareti, scenario
  davanti(c, v, scena) { … },  // misure di MONDO, davanti alle creature: poche fronde, pulviscolo. Leggero!
  velo(c, v, scena) { … },     // misure di SCHERMO, sopra tutto: riflessi di luce, raggi, foschia, buio, neve marina
});
```

`v = { t, dt, vw, vh, dpr, cam: {x, y, z}, mondo: {w, h}, qualita, visibile(x, y, margine) }`
(`vw`,`vh` in pixel CSS; `cam.z` è lo zoom, da circa 1 a inizio partita a circa 0,45 quando l'eroe è enorme;
`qualita` è 0 bassa, 1 media, 2 alta).

- Il mondo è il rettangolo `0..w × 0..h`: `y = 0` è la superficie (o il soffitto), `y = h` il fondale. L'eroe non esce
  mai, ma la visuale mostra fino a mezzo schermo oltre i bordi: l'ambiente deve dipingere anche lì (sabbia sotto,
  cielo o ghiaccio o roccia sopra, pareti ai lati) per almeno 1500 unità.
- Il motore imposta la trasformazione prima di ogni passata (schermo: 1 unità = 1 px CSS; mondo: coordinate di mondo).
  Dentro le passate usa solo `save/translate/scale/rotate/restore`, mai `setTransform`. Lascia la tela pulita.
- Per la parallasse in `sfondo` usa `v.cam` (es. spostamento = `-v.cam.x * v.cam.z * 0.2`).
- **Le creature devono risaltare.** Lo scenario è meno saturo e meno contrastato dei pesci, niente contorni netti sui
  piani lontani, niente particolari piccoli e contrastati dove si gioca. `davanti` copre pochissimo (qualche fronda
  ai bordi, pulviscolo) ed è semitrasparente. `velo` non deve mai nascondere numeri ed etichette.
  Nello scenario niente cose che sembrano pesci, bolle-aiuto o pericoli veri.
- Prestazioni: tutto ciò che è costoso si pre-disegna in `crea()` su tele fuori schermo o trame; nel fotogramma si
  copia e si salta ciò che non è visibile (`v.visibile`). Con `v.qualita === 0` si saltano gli effetti di lusso.
  Tetti misurati da `ambiente.mjs`: totale ×16, qualità bassa ×7, `crea()` sotto 1,5 s.
- Elementi di gioco come bolle, conchiglie con le perle e pericoli li disegna il motore, non l'ambiente.

## 5. Il gioco: che cosa deve avere

**Avventura.** Fino a 8 ambienti × 5 livelli. Sono giocabili solo gli ambienti elencati in `B.cast.aperti` (in
quell'ordine: il livello `n` appartiene all'ambiente `aperti[ceil(n/5) − 1]`); gli altri compaiono sulla mappa come
"in arrivo". L'elenco si allunga man mano che i modelli veri di un ambiente sono pronti.
Nei livelli 1–4 di ogni ambiente l'obiettivo è crescere e mangiare il **capobranco** (un esemplare enorme con la
corona di una specie di taglia 5 di quell'ambiente). Il livello 5 è il **gigante** dell'ambiente, con i suoi attacchi:
servono tre morsi, e a ogni morso si infuria. In ogni livello l'eroe riparte da 1.
Ogni livello può avere una **particolarità** (corrente che spinge, buio con la vista ridotta, tanti branchi, sciame di
meduse, banco dorato…) e dà fino a 3 stelle: superato, senza perdere cuori, entro un tempo.

**Sopravvivenza.** Si sblocca dopo il livello 5: senza fine, i pesci crescono con te, conta il record.

**Regole di base (già tarate, da conservare).** Potenza per taglia `t`: da `18·6^(t−1)` a 2,6 volte tanto. Mangi chi ha
potenza più bassa della tua e guadagni il 30% della sua (i moltiplicatori valgono pieni sui pesciolini, radice sui
pesci grossi). I pesciolini dei banchi valgono `[1,1,2,6,25,100]` secondo la tua fascia. Chi è molto più grosso di te
(`potenza > tua·6 + 20`) non ti degna; chi insegue si stanca dopo qualche secondo; dopo un colpo chi è nei paraggi
molla la presa. Il gigante si accorge di te solo quando `tua·40 ≥ sua`. Tre cuori, scatto con ricarica, frenesia
(tutto vale doppio) quando mangi tanto di fila, bolle con gli aiuti (×2, ×5, calamita, scudo, perla, cuore),
conchiglie con le perle sul fondo.

**Novità di questa versione.** Indoli e capacità speciali delle specie (§3). Pericoli con comportamenti diversi:
`deriva` (meduse), `fermo` (ricci), `mina` (scoppia se resti vicino, fa male anche ai pesci), `pendolo` (amo che sale e
scende), `eruzione` (sfiatatoio a intervalli), `caduta` (stalattite che si stacca). Sei eroi con vantaggi diversi, che
cambiano aspetto crescendo (stadio 0 nelle prime due fasce, 1 nelle due centrali, 2 dalla quinta) e hanno espressioni.
Banco dorato raro che vale molto.

**Fuori dalla partita.** Perle come moneta. Negozio: potenziamenti ed eroi. Acquario: la collezione delle specie
incontrate e mangiate, con il modello animato, la descrizione e i conteggi. Traguardi con premi. Regalo del giorno.
Mappa dei livelli per ambiente con le stelle. Impostazioni (suoni, musica, vibrazione, qualità grafica, tasto scatto a
destra o a sinistra, azzera i progressi). Consigli guidati alla prima partita. Tutto salvato sul telefono.

## 6. I moduli e come si parlano

### Eventi (`B.eventi.su(nome, fn)`, `B.eventi.emetti(nome, dati)`)

| evento | dati | quando |
|---|---|---|
| `partita:inizio` | `{ livello, modalita, ambiente, eroe }` | comincia una partita (`modalita`: `'avventura'` o `'sopravvivenza'`) |
| `partita:fine` | `{ esito, livello, modalita, ambiente, tempo, potenza, colpi, perle, stelle, mangiati }` | `esito`: `'vinto'`, `'perso'`, `'abbandonato'`; `mangiati` = `{ idSpecie: quanti }` |
| `mangiato` | `{ id, tipo, taglia, potenza, guadagno }` | mangiato un pesce o un gigante (non i pesciolini) |
| `pesciolini` | `{ quanti, dorati }` | pesciolini dei banchi mangiati, raggruppati ogni mezzo secondo circa |
| `visto` | `{ id }` | una specie entra nello schermo per la prima volta nella partita |
| `cresciuto` | `{ fascia }` | l'eroe sale di fascia |
| `colpito` | `{ da, cuori }` | l'eroe perde un cuore (o lo scudo: `cuori` invariato) |
| `aiuto` | `{ tipo }` | presa una bolla: `x2`, `x5`, `calamita`, `scudo`, `perla`, `cuore` |
| `perle` | `{ quante, motivo }` | guadagnate perle |
| `frenesia` | `{}` | parte la frenesia |
| `gigante:morso` | `{ id, rimasti }` | un morso al gigante |
| `scatto` | `{}` | usato lo scatto |
| `impostazioni` | `{ chiave, valore }` | cambiata un'impostazione |
| `progressi` | `{ motivo }` | il salvataggio è cambiato (per aggiornare le schermate) |

### `B.progressi` (file `05-progressi.js`)

Unica porta verso il salvataggio (`localStorage`, chiave `boccone-salvataggio-3`; importa una volta sola i dati
della versione precedente dalla chiave `boccone-salvataggio`: `{ livelloMax, perle, stelle: {n: stelle}, record, pot,
vestiti, muto }`; le perle spese nei vestiti, che non ci sono più, tornano indietro).
Ascolta gli eventi qui sopra e aggiorna da solo statistiche, acquario e traguardi. Regge dati rovinati o mancanti
(ogni campo torna al suo valore predefinito, i campi che non conosce li conserva) e funziona anche senza pagina e
senza archivio: in quel caso resta tutto in memoria. In partita scrive al massimo una volta ogni 2 secondi; subito
per acquisti, fine partita, impostazioni e quando la pagina va in secondo piano o si chiude.

```
B.progressi.stato                          l'oggetto salvato (solo lettura per gli altri; resta lo stesso anche dopo azzera)
B.progressi.salva() → bool                 azzera()  cancella i progressi e tiene le impostazioni; azzera({ tutto: true }) anche quelle
B.progressi.perle()                        quante perle ho
B.progressi.guadagna(n, motivo) → n        accredita ed emette 'perle'      spendi(n) → bool
B.progressi.POTENZIAMENTI                  [{ id, nome, descrizione, costi: [..], effetto, passo, beneficio(livello) → scritta per il negozio }]
                                           id: pinne, scatto, boccone, generoso, cuori, calamita, frenesia, fiuto, scudo
B.progressi.livelloPotenziamento(id) → n   costoPotenziamento(id) → perle | null (al massimo)   compraPotenziamento(id) → bool
B.progressi.eroeScelto() → id              eroePosseduto(id) → bool   compraEroe(id) → bool (lo sceglie subito)   scegliEroe(id) → bool
B.progressi.effetti() → { velocita, ricaricaScatto, durataScatto, risucchio, bolle, perle, morso (moltiplicatori, 1 = neutro),
                          cuori, durataCalamita, durataFrenesia, invulnerabile (aggiunte, 0 = neutro), scudoIniziale (bool) }
                                           somma di potenziamenti e vantaggio dell'eroe scelto: la legge il motore a inizio partita
B.progressi.totaleLivelli                  i livelli dell'avventura (ambienti di B.cast.aperti × 5)
B.progressi.livelloSbloccato(n) → bool     livelloMax() → n   livelliSuperati() → n   stelle(n) → 0..3   stelleTotali() → n
B.progressi.sopravvivenzaSbloccata() → bool   recordSopravvivenza() → { potenza, tempo }
B.progressi.acquario(id) → { visti, mangiati }
B.progressi.scoperte(gruppo) → quante specie viste      totaleSpecie(gruppo) → quante ce ne sono
        gruppo: niente (pesci e giganti: le specie dell'acquario), 'pesce', 'gigante', 'banco', 'pericolo', 'tutti' o l'id di un ambiente
B.progressi.TRAGUARDI                      [{ id, gruppo, nome, descrizione, obiettivo, premio }]   (71, in 9 gruppi)
B.progressi.traguardo(id) → { valore, fatto, riscosso }   riscuoti(id) → perle   riscuotiTutti() → perle   daRiscuotere() → n
B.progressi.regalo() → { disponibile, serie, perle, giorno (1..7), premi: [7 premi] }   riscuotiRegalo() → { perle, serie } | null
B.progressi.impostazione(chiave) → valore   imposta(chiave, valore) → bool
        chiavi: suoni (bool), musica (bool), vibrazione (bool), qualita ('auto'|'alta'|'media'|'bassa'), mano ('destra'|'sinistra')
B.progressi.tutorialFatto() → bool   segnaTutorial()
```

Emette anche `traguardo` `{ id, nome, premio }` quando un traguardo viene raggiunto (il premio si ritira con
`riscuoti`) e `scoperta` `{ id, nome, tipo }` la prima volta che una specie entra nell'acquario. I traguardi che
dipendono dai contenuti ("tutte le specie", "tutti i giganti", "tutti i livelli") si misurano su ciò che è registrato e
aperto in questa costruzione del gioco. Le prove: `node giochi/boccone/strumenti/prova-progressi.mjs`.

### Motore

- `B.livelli` (`51-livelli.js`): `totale`, `perAmbiente`, `ambienteDi(n)`, `config(n)` → tutto ciò che serve a creare
  il livello (fasce con le specie prese dal cast per ambiente e taglia, capobranco o gigante, pericoli, particolarità,
  tempo per la stella). Deve funzionare con qualunque sottoinsieme di contenuti registrati.
- `B.figurine` (`40-figurine.js`): pre-disegna i modelli in fotogrammi (figurine) alla risoluzione giusta, un po' per
  fotogramma, con un tetto di memoria; finché una figurina non è pronta si disegna il modello dal vivo.
- `B.partita` (`50-mondo.js`): `avvia({ livello, modalita })`, `pausa()`, `riprendi()`, `abbandona()`, `scatta()`,
  `stato` (`'ferma' | 'gioco' | 'pausa' | 'vinto' | 'perso'`), `dati` (ciò che serve al cruscotto: potenza, cuori,
  perle della partita, tempo, frenesia, aiuti attivi, ricarica dello scatto, obiettivo e avanzamento).
- `B.giganti` (`52-giganti.js`): comportamento e attacchi dei giganti, per nome (`carica`, `risucchio`, `inchiostro`,
  `tentacoli`, `onda`, `sparo`, `evoca`, `buio`, `morso`, `raffica`, `scia`).
- `B.audio` (`60-audio.js`): `avvia()` (al primo tocco), `effetto(nome, opzioni)`, `musica(idAmbiente | 'menu' | null)`.
  Rispetta le impostazioni. Tutto sintetizzato con WebAudio, niente file.
- `B.schermate` (`70-interfaccia.js`): `registra(id, { crea(radice), mostra(dati), nascondi() })`, `mostra(id, dati)`,
  `indietro()`, `corrente()`. Schermate: `casa`, `mappa`, `negozio`, `acquario`, `traguardi`, `impostazioni`, `aiuto`,
  `pausa`, `risultato`. `B.interfaccia` offre i pezzi comuni (bottoni, gettone delle perle, avvisi a comparsa,
  `modelloVivo(tela, def, opzioni)` per mostrare un modello animato).

Chi scrive il motore documenta qui sotto, nella sezione 8, i dettagli che servono a chi fa le schermate.

## 7. Strumenti di prova

- `galleria.mjs`, `ambiente.mjs`, `costruisci.mjs`: vedi §1.
- `prova-gioco.mjs` (lo scrive chi fa il motore): apre `index.html` su uno schermo da telefono, gioca con un pilota
  automatico, salva immagini in `anteprime/gioco/` e segnala errori.
- Playwright e Chromium sono già installati: `createRequire(import.meta.url)('playwright')`, `chromium.launch()` senza
  opzioni. Non installare nulla.

## 8. Dettagli del motore per chi fa le schermate

Il motore sono tre file senza disegno e senza pagina: `50-mondo.js` (`B.partita`), `51-livelli.js` (`B.livelli`),
`52-giganti.js` (`B.giganti`). La vista legge lo stato e lo disegna; non lo modifica mai.

### 8.1 Il ciclo e i comandi

- A ogni fotogramma (`99-avvio.js`): `B.partita.aggiorna(dt)` e poi `B.disegno.fotogramma()`. `aggiorna` non fa nulla in
  `'pausa'` e taglia `dt` a 0,05 s. Il mondo vive anche a partita finita o senza partita (acquario dietro al menu).
- `B.partita.avvia({ livello, modalita, ambiente })` (`modalita`: `'avventura'` o `'sopravvivenza'`; `ambiente` solo per la
  sopravvivenza, facoltativo), `pausa()`, `riprendi()`, `abbandona()` (il mondo resta, senza eroe, come sfondo),
  `scatta()` → `true` se lo scatto è partito, `sfondoMenu(idAmbiente)` (un mondo senza eroe: `M.eroe` è `null`),
  `stato` (`'ferma' | 'gioco' | 'pausa' | 'vinto' | 'perso'`), `mondo` (= `M`), `dati`.
- La vista fornisce `B.vista = { vw, vh, dpr, qualita }` (il mondo legge `vw`, `vh` per lo zoom; se manca vale 390 × 844)
  e `B.comandi.direzione()` → `{ x, y }` di lunghezza ≤ 1. Per le prove: `B.prova.pilota(M)` → `{ x, y }` sostituisce i
  comandi, `B.prova.effetti` si somma agli effetti di `B.progressi`.
- `B.livelli`: `totale` (ambienti aperti × 5), `perAmbiente`, `aperti` (gli id, in ordine), `primoLivelloDi(idAmbiente)`
  (0 se non è aperto), `ambienteDi(n)`, `config(n)`, `configSopravvivenza(idAmbiente)`, `PARTICOLARITA`.
  Per la mappa: `config(n)` dà `{ n, ambiente, posto (1..5), obiettivo: { tipo: 'capobranco' | 'gigante', nome, def,
  potenza, morsi }, particolarita: { tipo, nome, descrizione } | null, tempoStella, fasce, banchi, pericoli }`.

### 8.2 Lo stato della partita: `M = B.partita.mondo`

Misure in unità di mondo, tempi in secondi, angoli in radianti. Tutte le liste hanno un tetto.

| campo | che cos'è |
|---|---|
| `livello`, `modalita`, `cfg`, `ambiente`, `scena`, `largo`, `alto` | il livello (0 in sopravvivenza), la sua configurazione, la definizione dell'ambiente, ciò che ha risposto `ambiente.crea(...)`, le misure del mondo |
| `t`, `tempo` | tempo del mondo (scorre sempre) e tempo di gioco (solo in partita) |
| `cam = { x, y, z }` | centro e zoom della visuale (già ammorbiditi). `scossa` = tremolio in pixel, `lampo` 0..1 = lampo rosso dopo un colpo, `pericolo` 0..1 = quanto è vicino chi insegue (bordo rosso) |
| `eroe` | `{ def, x, y, vx, vy, ang, r, p, bocca, attesa, pulsa, invul, vivo, stadio, espressione, stordito }` oppure `null`. `attesa` 0..1 = c'è una preda a portata (bocca socchiusa); `pulsa` 0..1 = ha appena mangiato; `invul` > 0 = lampeggia, non può essere colpito; `stordito` > 0 = scossa: non risponde ai comandi (disegnare scintille) |
| `predatori[]` | pesci, capobranco e gigante: vedi sotto |
| `obiettivo` | il capobranco o il gigante (è anche dentro `predatori`), `null` in sopravvivenza: serve per la freccia |
| `inseguitore` | chi sta inseguendo l'eroe più da vicino, o `null` |
| `pesciolini[]` | `{ def, x, y, ang, fase, morto, dorato, b }`: si disegnano solo quelli con `morto === 0`; `b` è il loro banco. `banchi[]` = `{ def, x, y, raggio, vicino }`: `vicino` è `false` per i banchi lontani dalla visuale (i loro pesciolini si possono saltare: il mondo li muove a scatti, senza girarli) |
| `pericoli[]` | vedi sotto |
| `bolle[]` | `{ tipo, x, y, f }` con `tipo`: `x2`, `x5`, `calamita`, `scudo`, `perla`, `cuore`; `f` = fase per farle ondeggiare |
| `conchiglie[]` | `{ x, y, attesa, apre }`: sul fondale; `apre` > 0 = si sta aprendo; `attesa` > 0 = vuota |
| `particelle[]` | `{ x, y, r, c, eta, vita }` (colore `c`, sfumano con `eta / vita`) |
| `testi[]` | `{ x, y, s, c, eta, grande, perla }`: scritte che salgono, `eta` da 0 a 1 |
| `nuvole[]` | `{ x, y, r, eta, vita, tipo }`: `tipo` `'inchiostro'` (seppie, piovra, kraken: nere, coprono la vista) o `'scia'` (la scia torbida di una carica). Si disegnano **sopra** le creature, sfumando all'inizio e alla fine (`eta / vita`). Al massimo 12 |
| `onde[]` | `{ x, y, r, rMax, eta, vita, tipo }`: anelli che si allargano; `tipo` `'onda'` (attacco di un gigante) o `'scoppio'` (mina). Un cerchio di raggio `r`, sempre più trasparente verso `rMax`. Al massimo 6 |
| `proiettili[]` | `{ x, y, r, ang, eta, vita, tipo, def }`: `tipo` `'sparo'` o `'raffica'`, `def` = il gigante che li ha lanciati (per il colore). Al massimo 20 |
| `buio` | 0..1: quanto è buio (particolarità "Acque buie" = 0,55; attacco `buio` di un gigante = 0,88 per qualche secondo). La vista scurisce tutto tranne un alone attorno all'eroe (e alle specie con `speciale: 'luce'`) |
| `tiro` | `{ x, y, raggio, forza }`: con `forza` > 0 un gigante sta risucchiando verso il punto `x, y` (la sua bocca): disegnare linee d'acqua che convergono |
| `corrente` | `{ x, y, forza }`: la spinta dell'acqua in questo momento (particolarità "Corrente forte"): pulviscolo che scorre |
| `aiuti` | `{ molt, moltT, calamitaT, scudo, frenesia, frenesiaT, frenesiaDurata }` |
| `scatto` | `{ attivo, ricarica, durataRicarica, durata }` (`attivo` > 0 = sta scattando) |
| `cuori`, `cuoriMax`, `perle`, `colpi`, `fascia`, `ottava` | `perle` e `colpi` sono quelli della partita; `fascia` = quante taglie l'eroe ha superato; `ottava` solo in sopravvivenza |
| `dorato` | `{ attivo, banco }` o `null`: il banco dorato quando passa |

**`M.predatori[i]`**: `{ def, gigante, capo, neutro, x, y, ang, r, p, fase, bocca, minaccia, mangiabile, nasce, mangiato, stordito,
avviso, carica, stato, fascia }` più, per chi li ha, `alone`, `aloneR`, `vita`, `morsi`, `morsiTotali`, `furia`, `attaccoNome`.

- `minaccia` = fa male se lo tocchi (etichetta rossa); `mangiabile` = l'eroe può mangiarlo adesso (etichetta verde);
  né l'uno né l'altro = corazza ancora troppo dura o pesce timido (`neutro`: etichetta grigia). `capo` = capobranco:
  la corona la disegna la vista. `nasce` da 1 a 0 = sta comparendo (dissolvenza); `mangiato` > 0 = sta finendo in bocca
  (rimpicciolire); `stordito` > 0 = stelline.
- `stato`: `'calmo'`, `'caccia'`, `'avviso'` (sta per attaccare: `carica` sale da 0 a 1), `'carica'`, `'stordito'`,
  `'sconfitto'`; i pesci normali hanno anche `'fuga'`. Ai giganti si passa così com'è nelle opzioni del modello.
- `alone` 0..1 e `aloneR`: l'alone elettrico (specie con `speciale: 'scossa'`): un cerchio di raggio `aloneR` che
  crepita piano mentre `alone` sale fino a 0,45 e scatta a 1 quando dà la scossa.
- Gigante e capobranco: `vita` 1..0 e `morsi` / `morsiTotali` (barra della vita), `furia` 0..2 (occhi sempre più
  cattivi), `attaccoNome` (`''` oppure `carica`, `morso`, `scia`, `risucchio`, `inchiostro`, `tentacoli`, `onda`, `sparo`,
  `raffica`, `evoca`, `buio`) per chi vuole animazioni diverse. Durante il risucchio `bocca` vale 1.

**`M.pericoli[i]`**: `{ def, x, y, r, ang, fase, attivo, alfa }` più `x0`, `zona`, `colonna`.

- `alfa` 0..1 = quanto si vede: 0 = non c'è (mina scoppiata, stalattite in frantumi), poi ricompare in dissolvenza.
- `deriva` (meduse): `attivo` = la spinta dell'ombrello. `fermo` (ricci): `attivo` sale quando l'eroe si avvicina.
- `mina`: `attivo` sale mentre si arma (lampeggiare sempre più in fretta); `zona` = raggio dello scoppio (si può
  disegnare un cerchio d'allarme). Lo scoppio lascia un'onda in `M.onde`.
- `pendolo` (amo): la lenza va da `(x0, 0)` a `(x, y)`; `ang` = quanto dondola.
- `eruzione` (sfiatatoio): `attivo` fino a 0,5 = borbotta (sta per eruttare), 1 = erutta; `colonna` = altezza della
  colonna rovente sopra di lui in questo momento (larga circa `r × 1,4`): è lei che fa male.
- `caduta` (stalattite): `attivo` sale mentre trema, poi cade (`y` aumenta) e va in frantumi.

### 8.3 Il cruscotto: `B.partita.dati`

Sempre lo stesso oggetto, aggiornato a ogni passo: `{ livello, modalita, nomeAmbiente, potenza, obiettivo: { nome,
potenza, morsi, morsiTotali } | null, avanzamento (0..1), cuori, cuoriMax, perle, tempo, frenesia (0..1: la barra; se
frenesiaT > 0 è il tempo che resta), frenesiaT, molt, moltT, calamitaT, scudo, scatto (0..1: 1 = pronto), fascia, ottava }`.
In sopravvivenza `obiettivo` è `null` e `avanzamento` misura la strada verso la prossima "ottava" (quando il mare
cresce); la potenza lì si moltiplica per 6 a ogni ottava e diventa presto un numero enorme: conviene mostrarla
abbreviata, o mostrare l'ottava.

### 8.4 Eventi, suoni, annunci

- Tutti quelli della tabella del §6, più: `annuncio` `{ titolo, sotto, durata }` (una scritta grande in mezzo allo
  schermo), `vibra` `{ ms }`, `traguardo` `{ id, nome, premio }` e `scoperta` `{ id, nome, tipo }` (da `B.progressi`).
- `partita:fine` con esito `'vinto'` porta anche `senzaColpi`, `inTempo`, `tempoStella` (per spiegare le stelle);
  `pesciolini` porta anche `id` (la specie del banco); `colpito.da` è l'id di chi ha colpito (specie, pericolo o gigante).
- `visto` arriva anche per i banchi e i pericoli.
- Suoni: il mondo chiama `B.audio.effetto(nome)` se esiste, con i nomi `gnam`, `gnamGrosso`, `bolla`, `perla`, `cuore`,
  `scudo`, `colpo`, `sconfitta`, `vittoria`, `frenesia`, `cresciuto`, `scatto`, `conchiglia`, `avviso`, `carica`, `morso`,
  `inchiostro`, `scossa`, `scoppio`.
- Perle: il mondo le consegna a `B.progressi.guadagna(n, motivo)` (motivi: `pesce`, `conchiglia`, `bolla`, `dorato`,
  `capobranco`, `gigante`, `livello`) e le somma in `M.perle`. Un livello vinto ne rende di solito da 75 a 125 (i livelli dei giganti, più lunghi, fino a 145).
- Stelle: una per aver superato il livello, una senza perdere cuori (lo scudo non conta), una entro `cfg.tempoStella`
  (200 s al livello 1, 300 s con il capobranco, 420 s con il gigante).

### 8.5 Le regole nuove, in breve

- **Indoli** (`B.partita.indoli`, tabella nome → comportamento): `cacciatore`, `timido` (neutro: scappa, non fa male),
  `pigro`, `scattante` (insegue a strappi), `agguato` (fermo, ti segue con lo sguardo; da vicino avviso e scatto),
  `pattuglia` (ronda larga, vede lontano, si stanca prima), `branco` (gruppi da 3 a 5 dietro a una guida).
- **Capacità** (`B.partita.speciali`): `veleno` (si mangia solo con potenza ≥ 2 volte la sua; prima punge), `corazza`
  (1,5 volte; prima ci si rimbalza: "Troppo duro!"), `inchiostro` (inseguito lascia una nuvola), `scossa` (alone che
  stordisce per 0,75 s senza togliere cuori), `luce` (solo aspetto).
- **Pericoli** (`B.partita.comportamenti`): `deriva`, `fermo`, `mina`, `pendolo`, `eruzione`, `caduta` (vedi 8.2).
  Ricci e sfiatatoi stanno sul fondale; se lo scenario offre `scena.appoggi = [{ x, y }]` (punti su scogli e rocce)
  una parte di loro si posa lì.
- **Giganti** (`B.giganti.attacchi`, tabella nome → attacco): tre morsi, e si può mordere solo dopo averne superato la
  potenza; a ogni morso resta stordito, viene respinto e si infuria (più svelto, attacchi più frequenti, un po' più
  forte). Finché l'eroe è più debole usa a turno gli attacchi del cast, sempre dopo un avviso. Il capobranco si mangia
  con un morso solo e sa fare la carica. Tutti e due si accorgono dell'eroe solo quando questo arriva a un
  quarantesimo della loro potenza (al primo livello a un dodicesimo); chi ha appena colpito l'eroe lo lascia stare per
  qualche secondo.
- **Sopravvivenza**: nessun obiettivo; quando l'eroe supera l'ultima fascia il mare "cresce" (potenze × 6, pesci più
  svelti) e si ricomincia a salire; ogni 40 secondi arriva un pericolo in più; finisce con i cuori.
- Per aggiungere un'indole, una capacità, un comportamento o un attacco basta una voce nella tabella giusta e il nome
  nel cast. Gli attrezzi per scriverli sono in `B.partita.attrezzi` (`suono`, `scoppio`, `testo`, `nuvola`, `onda`,
  `proiettile`, `tira`, `oscura`, `evoca`, `preparaCarica`, `preparaAvviso`, `colpito`…).

### 8.6 La prova del mondo e la taratura

`node giochi/boccone/strumenti/prova-mondo.mjs` gioca senza browser (node:vm, comparse finte per ogni voce del cast) con
due piloti automatici: "attento" e "distratto". Opzioni principali: `--livelli 1,5,12` (o `1-10`, o `tutti`), `--giri n`,
`--piloti attento`, `--negozio` (potenziamenti a metà strada), `--sopravvivenza`, `--colpi`, `--diario`, `--seme n`.
`--fumo` fa girare tutti i livelli per 30 secondi, i menu, la sopravvivenza e le prove mirate di ogni regola (anche con
`--sottoinsieme`: una parte sola dei contenuti): **deve dire "Nessun problema."** dopo ogni modifica al motore.
`node giochi/boccone/strumenti/prova-progressi.mjs` prova `B.progressi`.

Il pilota è poco furbo (non usa lo scatto, non cerca bolle né conchiglie, non segue la freccia): una persona gioca
meglio. Serve a confrontare i livelli fra loro. Dove si tara: `difficolta(n)`, `AFFOLLAMENTO`, `GENTILE`, `CALENDARIO` e
`creaObiettivo` in `51-livelli.js`; le costanti in testa a `50-mondo.js` e a `52-giganti.js`.

Ultima taratura ("attento": partite vinte, tempo medio e perle medie delle vinte; poi le vinte del "distratto" e
dell'"attento" con `--negozio`):

| livello | attento | tempo | perle | distratto | attento con il negozio |
|---|---|---|---|---|---|
| 1 Laguna corallina | 16/16 | 2:49 | 75 | 5/6 | 6/6 |
| 2 Laguna corallina | 12/16 | 4:18 | 99 | 4/6 | 6/6 |
| 3 Laguna corallina [dorato] | 8/16 | 3:38 | 91 | 4/6 | 4/6 |
| 4 Laguna corallina [sciame] | 8/16 | 4:00 | 81 | 2/6 | 5/6 |
| 5 Laguna corallina ♛ | 8/16 | 6:37 | 133 | 2/6 | 6/6 |
| 6 Foresta di alghe | 9/16 | 4:49 | 83 | 3/6 | 6/6 |
| 7 Foresta di alghe [corrente] | 6/16 | 4:11 | 84 | 6/6 | 5/6 |
| 8 Foresta di alghe [dorato] | 12/16 | 3:59 | 88 | 5/6 | 5/6 |
| 9 Foresta di alghe [sciame] | 8/16 | 5:04 | 97 | 2/6 | 5/6 |
| 10 Foresta di alghe ♛ | 9/16 | 4:60 | 98 | 2/6 | 6/6 |
| 11 Il relitto | 8/12 | 4:56 | 100 | 1/6 | 6/6 |
| 12 Il relitto [buio] | 8/12 | 4:06 | 85 | 2/6 | 3/6 |
| 13 Il relitto [branchi] | 6/12 | 3:41 | 88 | 1/6 | 5/6 |
| 14 Il relitto [sciame] | 8/12 | 5:18 | 101 | 0/6 | 5/6 |
| 15 Il relitto ♛ | 5/12 | 6:16 | 129 | 1/6 | 6/6 |
| 16 Mare aperto | 11/12 | 4:35 | 108 | 1/6 | 6/6 |
| 17 Mare aperto [corrente] | 6/12 | 4:57 | 105 | 0/6 | 4/6 |
| 18 Mare aperto [dorato] | 5/12 | 4:46 | 123 | 2/6 | 6/6 |
| 19 Mare aperto [branchi] | 8/12 | 3:45 | 98 | 2/6 | 6/6 |
| 20 Mare aperto ♛ | 5/12 | 5:32 | 145 | 0/6 | 6/6 |
| 21 Mari ghiacciati | 5/12 | 3:10 | 83 | 3/6 | 4/6 |
| 22 Mari ghiacciati [sciame] | 5/12 | 5:19 | 114 | 1/6 | 6/6 |
| 23 Mari ghiacciati [corrente] | 4/12 | 6:12 | 110 | 0/6 | 3/6 |
| 24 Mari ghiacciati [dorato] | 3/12 | 4:60 | 100 | 0/6 | 3/6 |
| 25 Mari ghiacciati ♛ | 4/12 | 7:20 | 141 | 1/6 | 5/6 |
| 26 Rovine sommerse | 9/12 | 4:55 | 94 | 1/6 | 5/6 |
| 27 Rovine sommerse [branchi] | 7/12 | 3:53 | 95 | 0/6 | 5/6 |
| 28 Rovine sommerse [buio] | 10/12 | 4:51 | 84 | 3/6 | 6/6 |
| 29 Rovine sommerse [corrente] | 7/12 | 5:19 | 100 | 1/6 | 4/6 |
| 30 Rovine sommerse ♛ | 4/12 | 8:08 | 146 | 1/6 | 6/6 |
| 31 Camini vulcanici | 9/12 | 4:16 | 89 | 3/6 | 6/6 |
| 32 Camini vulcanici [sciame] | 3/12 | 3:57 | 88 | 0/6 | 5/6 |
| 33 Camini vulcanici [dorato] | 6/12 | 4:21 | 80 | 0/6 | 4/6 |
| 34 Camini vulcanici [buio] | 8/12 | 4:42 | 81 | 1/6 | 6/6 |
| 35 Camini vulcanici ♛ | 4/12 | 5:25 | 86 | 2/6 | 6/6 |
| 36 L'abisso | 5/12 | 5:55 | 101 | 0/6 | 4/6 |
| 37 L'abisso [buio] | 9/12 | 6:01 | 83 | 2/6 | 6/6 |
| 38 L'abisso [sciame] | 4/12 | 4:28 | 87 | 2/6 | 6/6 |
| 39 L'abisso [corrente] | 4/12 | 7:02 | 101 | 0/6 | 6/6 |
| 40 L'abisso ♛ | 3/12 | 6:07 | 92 | 1/6 | 6/6 |

In breve: livello 1 vinto 16 volte su 16 in 2:49; livelli 2–10 vinti 80 volte su 144 (56%); 11–20: 70 su 120 (58%);
21–30: 58 su 120 (48%); 31–40: 55 su 120 (46%). Con dodici o sedici partite per livello ogni riga può sbagliare di 15
punti: contano le medie. Con i potenziamenti a metà strada (`--negozio`) l'attento vince fra l'80 e il 90% delle partite;
il distratto, senza potenziamenti, più della metà nei primi dieci livelli e poco meno di una su cinque dopo.
La sopravvivenza dura al pilota da 4 a 7 minuti (fino a una quindicina di "ottave").
♛ = livello del gigante; fra parentesi quadre la particolarità del livello.
