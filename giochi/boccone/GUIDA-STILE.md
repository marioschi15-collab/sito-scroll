# Boccone — guida di stile: «Film d'animazione»

Per chi disegna un modello senza aver visto gli altri. Leggi prima ARCHITETTURA §3 (coordinate, opzioni `o`, regole dure).
Gli attrezzi sono in `src/js/10-pittura.js` (`B.pittura`, qui `P`): **è congelato, non si modifica**; se manca qualcosa
scrivi una funzione locale nel tuo file. Ogni attrezzo ha nel sorgente il commento completo con tutte le opzioni.

## 1. Lo stile in breve
Ogni creatura sembra **uscita da un film d'animazione in 3D**: volumi morbidi modellati dalla luce, non figurine col contorno.
- **Luce** una sola, dall'alto e un po' da sinistra: la cassetta sposta da sé luci, riflessi e linee; tu dai solo il punto più illuminato.
- **Ombra colorata**: fredda e satura (viola, indaco), mai grigia né nera; in fondo schiarisce per la **luce di rimbalzo** color acqua.
- **Controluce**: un filo chiaro color acqua sul bordo in ombra stacca la sagoma dallo sfondo, al posto del vecchio contorno scuro.
- **Linea sottile** del colore del pezzo scurito (`t.linea`), scivolata verso l'ombra: `P.BORDO` = .035, tratti a mano sotto .04.
- **Pelle umida** (riflesso largo e morbido più un puntino netto) e **pinne a membrana** (semitrasparenti, piene all'attaccatura).
- **Occhi da film**: grandi, sclera in ombra sotto la palpebra, iride profonda, due riflessi, palpebre vere. Il **battito di ciglia** è
  `P.battito` (0 aperti … 1 chiusi): lo imposta chi disegna dal vivo prima di `disegna()` e lo rimette a 0; i modelli non ammiccano da soli.
- **Colori saturi**, pochi (3–5 tinte). **Caricatura**: testa e occhi grandi, un tratto esagerato per specie, sagoma riconoscibile al buio.
- **Due facce** (calmo, a caccia) che si distinguono a 30 pixel, su **tre acque**: blu (laguna), verde (alghe), verde petrolio (relitto).

**Esempi di riferimento** (copia la struttura, raggiungi questa qualità): `25-eroi/pallino.js` (eroe: stadi, espressioni, pancia e
sella sfumate), `saetta.js` (azzurro con l'ombra dichiarata), `scoglio.js` (pezzi verdi), `20-specie/sardina.js` (banco, a mano),
`pesce_angelo.js` (pesce), `murena.js` (nastro, fauci), `seppia.js` (cefalopode), `lanterna.js` (gigante), `riccio.js` (pericolo).

## 2. Gli attrezzi di `B.pittura`
Misure in unità del modello, angoli in radianti. `t` = una tinta, `s` = una spina, `p` = punti `[x0,y0, x1,y1, …]`.
```
COLORI
P.tinta(base, ombra?)             → {luce, chiara, base, ombra, scura, rimbalzo, linea, bordo, velo}: i toni di un pezzo da UN colore. Fuori da disegna().
P.mescola(a, b, k)  P.schiarisci(col, q)  P.scurisci(col, q)  P.alfa(col, a)  P.rgb(col)     piccoli aiuti sui colori ('#rrggbb')
TRACCIATI E SPINE
P.profilo(c, p, chiusa = true)     traccia la curva morbida per i punti: sagome libere (corpi tondi, gusci), da dare a P.volume
P.sagoma([[u, larghezza], …])     → funzione u → mezza larghezza del corpo (0 coda, 1 muso). Fuori da disegna().
P.onda(u, fase, {amp, onde, testa, potenza, giri})   → di quanto si sposta di traverso il punto u mentre nuota
P.spinaPesce(n, xCoda, xMuso, fase, onda, su, giu, {testa, coda, y, arco})   → la spina di un corpo disteso che ondeggia
P.spina(n, punto(u, p), su, giu, {testa, coda})      → spina qualsiasi (corpi in posa, a S, arrotolati); P.tracciaSpina(c, s) ne traccia la sagoma
P.spinaAngoli(n, x, y, lung, ang(u), larg, o)        → spina da una radice, per angoli: colli, steli, code a frusta
P.suSpina(s, u, v, q?)            → {x, y, ang}: il punto del corpo a quota u, v (-1 dorso … +1 ventre): per occhi, pinne, macchie
P.puntiSuSpina(s, n, u0, u1, v)   → n punti in fila sul corpo, per P.bozzi, P.lucine, file di aculei
VOLUMI, LUCI, OMBRE
P.volume(c, forma, t, {luce:[x,y,r], colore, bordo, ombra, lume, dentro(c)})   IL MATTONE: un pezzo modellato dalla luce, da una spina o da
                                    una sagoma. `ombra` (.11) regola insieme velo d'ombra e controluce; `bordo` la linea (P.BORDO = .035)
P.sfumatura(c, t, [x,y,r])        → la sfumatura di un volume, come fillStyle di una zona grande dipinta in `dentro`
P.palla(c, x, y, rx, ry, ang, t, o)     volume a ellisse: bulbi, esche, giunture, teste
P.riflesso(c, x, y, lung, ang, curva, forza)   pelle umida: alone morbido più puntino netto; uno per pezzo importante, dopo il volume
P.ombra(c, x, y, rx, ry, ang, forza)    ombra di contatto sfumata: sotto la pettorale, dietro la guancia, sotto un labbro
P.bagliore(c, x, y, r, col, forza)      alone di luce (esche, occhi di brace, lava): al posto di shadowBlur
P.lucine(c, p, r, col, forza)           tante lucine economiche (fotofori) nei punti p
P.guancia(c, x, y, r, col, forza)       velo tondo di colore: gote rosa, rossore, una zona più chiara
P.solco(c, p, t, spess)  P.bozzi(c, p, r, t)   solco inciso (opercolo, cicatrici, pieghe) · bozzi in rilievo (verruche, borchie)
P.tubo(c, p, spess, t)                  tubo lucido di spessore costante: peduncoli degli occhi, steli, catene
P.filo(c, p, spess0, spess1, t, bordo)  filo che si assottiglia: antenne, barbigli, nastri delle pinne, code a frusta
P.corno(c, x, y, ang, lung, larg, t, {curva, gonfio, punta})   cono lucido: aculei, corna, zanne, rostri, becchi
PINNE
P.pinna(c, {x0,y0,x1,y1, a0,a1, lung, profilo, n, onda, fase, passo, piega, smerlo, tinta, orlo, punta, righe, primo, velo})   pinna a raggi
        (membrana: `velo` 0..1 = quanto è piena in punta, .8; P.raggi(o) ne dà la geometria senza disegnarla, per attaccarci un nastro)
P.coda(c, {x, y, ang, tipo, lung, alt, radice, fase, onda, tinta, orlo, smerlo, n})   tipo: ventaglio forca luna tronca punta lira
P.cresta(c, s, {u0, u1, lato, alt, onda, fase, onde, piega, passi, tinta, colore, orlo})   pinna continua lungo il corpo
P.lama(c, {x0,y0, x1,y1, px,py, davanti, dietro, tondo, tinta, punta, quota})   pinna piena: squali, ali di razze, pale, pinne di cetacei
MOTIVI (dentro `dentro`)
P.banda(c, s, ua, ub, colore)  P.bande(c, s, [[ua, ub], …], colore)   bande di traverso (righe, maschere); tante insieme costano meno
P.fianco(c, s, v0, v1, colore, u0, u1)   fascia per il lungo: ventre chiaro (.3 … 1.4), dorso scuro, striscia
P.macchie(c, s, {n, seme, u0,u1, v0,v1, r0,r1, colore, cuore, lungo})   macchie sparse sempre uguali; `cuore` le fa ad anello
P.squame(c, s, {u0,u1, v0,v1, righe, tinta, fitte, forza})   squame bombate (care: una zona, poche file, su tinta unita)
P.anelli(c, s, u0, u1, n, t, {v0, v1, curva, spess})   solchi di traverso: anelli, piastre, pieghe, fessure delle branchie
OCCHI
P.occhio(c, x, y, r, {iride, pelle, bianco, guarda, tipo, palpebra, taglio, sotto, pupilla, raggioIride, grande, brillio, ry, battito})
        tipo: tondo · fessura · barra · w · perla · chiuso · stretto · croce · spirale
P.SGUARDI      normale calmo felice contento spaventato colpito cattivo stordito sconfitto addormentato → Object.assign(opzioni, P.SGUARDI.x)
        (P.sguardo(o.sguardo, x, y) → `guarda`: la pupilla segue il bersaglio, per eroi e giganti)
P.battito      0 aperti … 1 chiusi: fa battere le ciglia a tutti i P.occhio. Lo usa chi disegna dal vivo, mai un modello
P.sopracciglio(c, x, y, lung, ang, col, spess)   ang > 0 cattivo, < 0 spaventato
BOCCHE
P.fauci(c, {x, y, ang, lung, apri, alt, su, tinta, interno, lingua, parte}) → gengive   mandibola incernierata, PRIMA del corpo
P.denti(c, x0, y0, x1, y1, n, lung, verso, {tipo: punta|ago|piatto, curva, arco, varia, seme})   fila di denti lungo un tratto
P.labbra(c, x, y, ang, r, apri, t, {denti})     boccuccia a labbra carnose in punta al muso
P.sorriso(c, x, y, w, {ang, apri, alt, curva, denti, lingua, tinta})   bocca «a lente» per facce di tre quarti
TENTACOLI, ZAMPE, ACCESSORI
P.tentacolo(c, {x, y, ang, lung, spess, punta, curva, onda, fase, clava, tinta, ombra, lume, ventose, lato}) → spina
P.zampa(c, x, y, [[angolo, lunghezza], …], t, {spess, punta}) → {x, y, ang}   zampa articolata
P.chela(c, x, y, ang, m, apri, t, {lato, punta})      chela, in fondo a una zampa
P.corona(c, x, y, m, ang, gemma)  P.stelle(c, x, y, giro, t)  P.goccia(c, x, y, r, ang)   corona, stelline di chi è colpito, sudore
P.statoGigante(o) → {calmo, caccia, avviso, carica, stordito, sconfitto, k, ira, apri, occhi, trema, rincula, lampo, giu}
P.fine(o)      → false quando vanno saltati i particolari minuti (o.dettaglio basso)
```

## 3. La ricetta per una nuova specie
1. **Leggi la scheda** nel cast (`aspetto`, `taglia`, `indole`, `speciale`) e scegli il tratto da esagerare. Guarda foto dell'animale vero.
2. **Colori.** Parti da UN colore base per pezzo, saturo e di media luminosità: `P.tinta` ne ricava luce, ombra e linea. Per i
   colori chiari o caldi dai anche il colore d'ombra: giallo → `'#ff6a14'`, crema → pesca, rosa → magenta, bianco → azzurro,
   bruno → prugna. **Vicino al colore dell'acqua l'ombra va SEMPRE dichiarata**: indaco per blu e azzurri (`'#2a2fc4'`, vedi
   `saetta.js`), blu petrolio per i verdi (`'#0a4a9c'`); senza, il pesce si impasta con lo sfondo. Servono: corpo, ventre, pinne (un
   accento che stacca), iride che contrasta. Niente nero né grigio: una creatura «nera» ha la base viola o blu media (`lanterna.js`).
3. **Sagoma.** Due `P.sagoma` (dorso e ventre) e una `P.spinaPesce` con 12–16 tratti (20–24 per i nastri). Onda: pesce
   `{amp:.11, onde:.5}`, siluro `{amp:.08, potenza:2.4}`, anguilla `{amp:.3, onde:1.3, potenza:.75}`. Il corpo sta attorno al cerchio di raggio 1.
4. **Strati, in quest'ordine:**
   1. *dietro al corpo*: pinna pettorale lontana (tinta scurita), coda, dorsale, anale, ventrali, creste, braccia; la bocca `P.fauci`;
   2. *il corpo*: `P.volume` con `luce: [.3, -.5, 1.8]` (r ≈ 1,5 volte il corpo); in `dentro`: ventre, poi righe e bande, macchie, squame.
      **Ventri e selle sfumano nel fianco**, mai a bordo netto: `P.fianco` fino al filo del ventre sfuma da sé; nei corpi tondi usa una
      zona a sfumatura radiale (`sfumata` in `pallino.js`). Sotto la pancia, un velo color acqua: `P.guancia(cc, x, y, r, '#7fe3ff', .24)`;
   3. *sopra*: `P.solco` dell'opercolo, bozzi, lucine, UN `P.riflesso` in alto verso il muso (lungo .3–.5);
   4. *sul fianco*: `P.ombra` e sopra la pettorale vicina, che rema;
   5. *la faccia*: denti di sopra, occhio, sopracciglio, labbra o sorriso; 6. *accessori*: corona, stelle, bagliori.
5. **Linea.** La fa la cassetta (`P.BORDO`, .035). Nei pezzi fatti a mano usa `t.linea`: un tratto sotto .04, oppure di .05–.06 ma messo
   SOTTO il riempimento (se ne vede metà). Mai `t.bordo` o `P.BORDO * 2` a contornare, mai linee bianche di contorno.
6. **Ombre e luci.** `ombra: .08–.13` per i corpi (velo d'ombra e controluce insieme), 0 per i pezzi lontani. Un'ombra di contatto
   (`P.ombra`) per ogni pezzo appoggiato. I pezzi sottili (nastri, braccia) non hanno `luce`: prendono la lama di luce (`lume`). Sui pezzi
   VERDI con motivi il velo viola ingrigisce: `ombra: 0`, e in `dentro` un velo blu petrolio e i due fili di luce (`velo`, `fili` in `scoglio.js`).
7. **Occhi.** Grandi: raggio ≥ .14, e .2–.36 per pesci piccoli ed eroi. Stanno a `P.suSpina(s, .9, -.35)` circa; `pelle` è la tinta
   della testa. Calmo: `P.SGUARDI.normale` o `calmo`, iride chiara. A caccia: `P.SGUARDI.cattivo`, iride rossa o arancio, pupilla a
   `fessura` per i predatori, e un `P.sopracciglio` grosso (lungo 2 raggi, `ang` ≈ .5, spesso ≥ .1) col colore `tinta.bordo`.
8. **Bocca.** Tre tipi: `P.labbra` (bocca piccola), `P.fauci` + `P.denti` (predatori: denti di sotto subito dopo le fauci, denti di
   sopra dopo il corpo), `P.sorriso` (facce di tre quarti). Calmo: chiusa o appena socchiusa (`apri = bocca · .5`), denti nascosti
   o piccoli. A caccia: `apri = max(bocca, .45)` e denti in vista. Denti: `punta` per zanne, `ago` per denti di vetro, `piatto` per incisivi.
9. **Calmo e a caccia** devono differire per almeno tre segnali: occhio (colore e taglio), sopracciglio, bocca; meglio se cambia
   anche la sagoma (pinne che si drizzano, braccia che si aprono, colori che si accendono). Controlla la riga «grandezze reali».
10. **Nuoto.** `F = o.fase · TAU`. Tutto ciò che si muove usa `sin`/`cos` di `F` per un numero INTERO (così la fase 1 è uguale alla 0):
    corpo `P.onda`; coda `ang + sin(F - 1.1) · .35` e `fase: F - 1.9` (in ritardo sul corpo); pettorale `sin(F·2 + .4)`; pinne
    `onda: .1, fase: F·2`. Mai `o.t` nei pesci, nei banchi e nei pericoli: solo eroi e giganti (respiro, tremito, esca).
11. **Ingombro e costo.** Lancia la galleria, copia l'ingombro misurato allargandolo di .05 per lato. Il costo misurato oscilla
    molto da un lancio all'altro (lancia insieme a un modello noto e confronta): stai sotto ×30 per i pesci, ×35 per gli eroi,
    ×55 per i giganti, ×2,5 per i banchi. Costano: ogni `P.volume` (≈3), `ombra` sulle `P.lama` e sui tentacoli, i gradienti
    grandi, ciò che sta in `dentro`, squame, creste; costano poco: fili, corni, bozzi, zampe.

## 4. Scheletro da copiare (`src/js/20-specie/<id>.js`)
```js
/* Boccone — specie: NOME (taglia N, indole). Due righe su com'è fatto. */
(() => {
'use strict';
const B = window.B, P = B.pittura, TAU = Math.PI * 2, PI = Math.PI, sin = Math.sin;
// tinte e sagome: UNA volta, qui fuori (il corpo è verde acqua: ombra dichiarata, blu petrolio)
const T = { corpo: P.tinta('#2fb8a0', '#0a4a9c'), ventre: P.tinta('#fff0c8', '#e8925c'), pinna: P.tinta('#ffb01f', '#f0641e'), labbra: P.tinta('#ff6f8f') };
const SU = P.sagoma([[0, .1], [.3, .5], [.6, .62], [.85, .5], [1, .3]]), GIU = P.sagoma([[0, .1], [.3, .45], [.6, .55], [.85, .42], [1, .25]]);
const ONDA = { amp: .11, onde: .5, testa: .14 };
B.specie.registra({
  id: 'mio_pesce',                                   // come nel cast
  descrizione: 'Una o due frasi vere e curiose, in italiano semplice.',
  forma: { lx: 1.1, ly: .6 },                        // mezza lunghezza e mezza altezza del corpo
  ingombro: { x0: -1.9, y0: -1.1, x1: 1.3, y1: 1.1 },  // dalla galleria, con .05 di margine
  disegna(c, o) {
    const fase = o.fase || 0, F = fase * TAU, m = !!o.minaccia, b = o.bocca || 0, q = {};
    c.save();
    const s = P.spinaPesce(14, -1, .9, fase, ONDA, SU, GIU, { testa: .2 }), luce = [.3, -.5, 1.8];
    P.suSpina(s, 0, 0, q);                                                             // 1. dietro al corpo
    P.coda(c, { x: q.x + .05, y: q.y, ang: q.ang + PI + sin(F - 1.1) * .35, tipo: 'forca', lung: .6, alt: .55, fase: F - 1.9, tinta: T.pinna });
    const d0 = P.suSpina(s, .65, -.9), d1 = P.suSpina(s, .25, -.8);
    P.pinna(c, { x0: d0.x, y0: d0.y, x1: d1.x, y1: d1.y, a0: -PI / 2 - .4 + (m ? .2 : 0), a1: -PI + .4, lung: .45, profilo: [.6, 1, .7], onda: .08, fase: F * 2, tinta: T.pinna });
    P.volume(c, s, T.corpo, { luce, dentro(cc) {                                       // 2. il corpo e i suoi motivi
      P.fianco(cc, s, .35, 1.4, T.ventre.base);                                        //    il ventre sfuma da sé nel fianco
      P.macchie(cc, s, { n: 8, seme: 2, u0: .15, u1: .8, v0: -.8, v1: .2, colore: P.alfa(T.corpo.bordo, .5) });
    } });
    const g0 = P.suSpina(s, .78, -.5), g1 = P.suSpina(s, .74, 0), g2 = P.suSpina(s, .78, .5);   // 3. sopra il corpo
    P.solco(c, [g0.x, g0.y, g1.x, g1.y, g2.x, g2.y], T.corpo);
    P.riflesso(c, .25, -.4, .4, -.1, .12);
    const pp = P.suSpina(s, .62, .3), rema = sin(F * 2 + .4), ap = PI * .9 + rema * .35;        // 4. la pettorale che rema, con la sua ombra
    P.ombra(c, pp.x - .15, pp.y + .05, .28, .18, -.3, .25);
    P.pinna(c, { x0: pp.x + .03, y0: pp.y - .09, x1: pp.x - .02, y1: pp.y + .09, a0: ap - .45, a1: ap + .5, lung: .42, profilo: [.7, 1, .8], n: 5, tinta: T.pinna, primo: true });
    const e = P.suSpina(s, .9, -.35);                                                   // 5. la faccia: calma oppure a caccia
    P.occhio(c, e.x, e.y, .2, Object.assign({ iride: m ? '#ff3a1e' : '#ffb01f', pelle: T.corpo }, m ? P.SGUARDI.cattivo : P.SGUARDI.normale));
    if (m) P.sopracciglio(c, e.x + .04, e.y - .2, .4, .5, T.corpo.bordo, .11);
    const l = P.suSpina(s, 1, .3);
    P.labbra(c, l.x + .18, l.y, l.ang, .12, m ? Math.max(b, .45) : b * .5, T.labbra, { denti: m ? 3 : 0 });
    c.restore();
  },
});
})();
```

Un eroe usa `B.eroi.registra` e una tabella di misure e tinte per stadio (vedi `pallino.js`): le espressioni cambiano occhio
(`P.SGUARDI`), bocca e un segno (`P.goccia` per `spaventato`, `P.stelle` per `colpito`); `o.t` serve per respiro e tremito, non per
ammiccare. Un gigante legge tutto da `const G = P.statoGigante(o)`: `G.apri` per la bocca, `G.occhi` per lo sguardo, `G.ira` per
sopracciglia e pinne, `G.rincula` e `G.trema` per il corpo, `G.lampo` per accendere il segnale dell'avviso; `stordito` ha `P.stelle`,
`sconfitto` è sbiadito e spento.
Un banco (vedi `sardina.js`) si disegna a mano in una decina di tratti: coda a membrana (linea .035), linea del corpo (tratto di .06
sotto il riempimento, spostato verso l'ombra), UNA sfumatura dall'alto in basso (filo di luce, dorso, fianco, ventre, colore dell'acqua),
riflesso, occhio. Un pericolo usa `o.attivo` come il gigante usa `G.lampo`: il pericolo lo dicono sagoma, punte e luci, non i contorni neri.

## 5. Corpi speciali
- **A nastro** (murene, gronghi, pesce remo, draghi): spina lunga con 20–24 tratti e onda `{amp:.3, onde:1.3, potenza:.75}`;
  `P.volume` senza `luce` (tinta piatta, lama di luce `lume` e falce d'ombra), `P.cresta` sul dorso disegnata prima del corpo, macchie con `P.macchie`.
  La testa è il pezzo più grosso: ingrossa la sagoma a u ≈ .9 e ritira il ventre da lì al muso per far posto a `P.fauci`.
- **Tentacoli e cefalopodi**: mantello rigido su una spina, testa con `P.palla`, braccia con `P.tentacolo` disegnate PRIMA della
  testa che ne copre le radici: prima le lontane (tinta scura, `ombra: 0, lume: 0`), poi le vicine (`lume` solo). Muovile con
  `onda` e `fase: F + i`. `clava` per i tentacoli da preda, `ventose` con `lato`. Occhio `w` (seppie) o `barra` (polpi).
- **Crostacei** (`assetto: 'dritto'`, visti di fronte o di tre quarti): zampe lontane con `P.zampa` e tinta scura, poi il carapace
  (`P.volume` su `P.profilo`), poi zampe vicine e chele (`P.chela` in fondo a una `P.zampa`, alzate e aperte a caccia). Occhi `perla`
  su `P.tubo`, antenne `P.filo`, spine `P.corno`, addome a segmenti con `P.anelli`. Le zampe oscillano sfasate: `sin(F + i·2)`.
- **Squali**: spina affusolata, dorso scuro e ventre chiaro con `P.fianco`, branchie con `P.anelli(c, s, .78, .7, 4, t, {v0:-.4, v1:.3, curva:.012})`,
  tutte le pinne con `P.lama` (dorsale alta, pettorale a falce dopo il corpo), coda con due `P.lama` dall'attacco largo, occhio
  piccolo (.12) ma con sopracciglio, bocca `P.fauci` bassa e arretrata con denti a `punta`. Il muso è il tratto da esagerare.
- **Razze e mante di tre quarti**: corpo centrale su una spina corta; ala LONTANA prima del corpo (tinta scura, più corta), ala
  VICINA dopo: sono due `P.lama` con l'attacco lungo il corpo e la punta che sale e scende con `sin(F)`, sfasate; quando l'ala
  vicina è alzata mostrane il sotto chiaro. Coda `P.filo`, tutti e due gli occhi sul dorso, macchie con `cuore` per gli occhielli.

## 6. Errori da evitare
- Creare tinte, sagome o liste dentro `disegna()`; usare `Math.random`, `Date`, `o.t` in un pesce; `fase` moltiplicata per un numero non intero.
- Dimenticare `c.save()` / `c.restore()`; cambiare `globalAlpha` o `globalCompositeOperation` senza rimetterli a posto; usare
  `shadowBlur`, `filter`, `setTransform`, `clearRect`; scrivere la chiusura del tag script in un commento o in una stringa.
- Radici in vista: pinne dorsali, creste, tentacoli e fauci disegnati DOPO il corpo invece che prima.
- **Contorni scuri spessi** (`t.bordo` o `P.BORDO * 2` attorno a un pezzo, tratti a mano oltre .04): è lo stile vecchio.
- **Motivi a bordo netto su pezzi grandi**: ventre, sella o maschera ritagliati di netto sul fianco invece che sfumati.
- **Corpo blu, azzurro o verde senza ombra dichiarata** nella tinta: su una delle tre acque sparisce.
- **Ammiccare con `o.t`** (`const ammicca = (t % …)`): il battito di ciglia è di `P.battito`, e si vedrebbe doppio.
- Nero e grigio, linee bianche di contorno, ombre senza colore, più di un riflesso grande per pezzo, il velo viola su un pezzo verde.
- Troppi particolari minuti che da piccolo diventano rumore: prima sagoma, occhio e bocca; il resto dentro `if (P.fine(o))`.
- Occhio piccolo «perché è realistico»; faccia a caccia uguale a quella calma con solo la bocca aperta.
- Sprechi: un `P.volume` con `luce` per ogni braccio o zampa (usa tinta piatta, `P.zampa`, `P.filo`, `P.corno`); tante `P.banda`
  dello stesso colore invece di una `P.bande`; `P.sfumatura` per ogni macchiolina; squame su tutto il corpo.
- Ingombro messo a occhio; corpo lontano dall'origine; disegno che esce dall'ingombro quando apre la bocca o drizza le pinne.
- Copiare personaggi di film o giochi: gli animali veri sono il riferimento, il carattere è nostro.

## 7. Lista di controllo finale
1. `node giochi/boccone/strumenti/galleria.mjs --solo <id>` dice «Tutto in ordine» per due lanci di fila (il costo oscilla).
2. Nella riga «grandezze reali» riconosco la specie dalla sola sagoma e vedo l'occhio anche nella grandezza più piccola.
3. Calmo e a caccia si distinguono a colpo d'occhio nelle grandezze reali, non solo nel primo piano.
4. Nel riquadro «verso sinistra e in diagonale» niente si capovolge male; il ciclo delle fasi non ha scatti (fase 0 = fase 1).
5. Nel primo piano ci sono: linea sottile (nessun contorno scuro), volume dalla luce, ombra colorata, filo di controluce, riflesso
   morbido col puntino, un'ombra di contatto, pinne a membrana, ventre che sfuma nel fianco.
6. Accanto agli esempi in `foglio.png` sembra della stessa mano (luce, saturazione, linea, occhi) e si legge su tutte e tre le acque.
7. La `descrizione` è vera, curiosa, in italiano semplice; il file si chiama come l'id; non ho toccato `10-pittura.js` né file altrui.
8. Eroi: tre stadi diversi nella sagoma, quattro espressioni leggibili. Giganti: i sei stati si distinguono, l'avviso si vede arrivare.
