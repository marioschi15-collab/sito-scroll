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
      20-specie/*.js      i modelli: pesci, giganti, banchi, pericoli
      25-eroi/*.js        i protagonisti
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

**Avventura.** 8 ambienti × 5 livelli = 40 livelli (`n` da 1 a 40; ambiente di ordine `ceil(n/5)`).
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
della versione precedente dalla chiave `boccone-salvataggio`: `{ livelloMax, perle, stelle: {n: stelle}, record }`).
Ascolta gli eventi qui sopra e aggiorna da solo statistiche, acquario e traguardi.

```
B.progressi.stato                          l'oggetto salvato (solo lettura per gli altri)
B.progressi.salva() / azzera()
B.progressi.perle()                        quante perle ho
B.progressi.guadagna(n, motivo) / spendi(n) → bool
B.progressi.POTENZIAMENTI                  [{ id, nome, descrizione, costi: [..] }]
B.progressi.livelloPotenziamento(id) → n   compraPotenziamento(id) → bool
B.progressi.eroeScelto() → id              eroePosseduto(id) → bool   compraEroe(id) → bool   scegliEroe(id)
B.progressi.effetti() → { velocita, ricaricaScatto, durataScatto, risucchio, bolle, perle, morso (moltiplicatori, 1 = neutro),
                          cuori, durataCalamita, durataFrenesia, invulnerabile (aggiunte, 0 = neutro), scudoIniziale (bool) }
                                           somma di potenziamenti e vantaggio dell'eroe scelto: la legge il motore a inizio partita
B.progressi.livelloSbloccato(n) → bool     livelloMax() → n   stelle(n) → 0..3   stelleTotali() → n
B.progressi.sopravvivenzaSbloccata() → bool   recordSopravvivenza() → { potenza, tempo }
B.progressi.acquario(id) → { visti, mangiati }   scoperte() → quante specie viste
B.progressi.TRAGUARDI                      [{ id, nome, descrizione, obiettivo, premio }]
B.progressi.traguardo(id) → { valore, fatto, riscosso }   riscuoti(id) → perle   daRiscuotere() → n
B.progressi.regalo() → { disponibile, serie, perle }   riscuotiRegalo() → { perle, serie } | null
B.progressi.impostazione(chiave) → valore   imposta(chiave, valore)
        chiavi: suoni (bool), musica (bool), vibrazione (bool), qualita ('auto'|'alta'|'media'|'bassa'), mano ('destra'|'sinistra')
B.progressi.tutorialFatto() → bool   segnaTutorial()
```

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

(da compilare da chi scrive il motore)
