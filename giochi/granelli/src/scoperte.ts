import * as K from './motore/materiali.js';

const { M } = K;

/** Come si arriva a una scoperta: le cose che servono, e se occorre una parola in più. */
export interface Via {
  con: readonly number[];
  nota?: string;
}

/** Una voce del libro delle scoperte. */
export interface Scoperta {
  id: number;
  nome: string;
  sezione: string;
  /** Mostrato finché la voce è ancora da scoprire. */
  indizio: string;
  /** Due righe che raccontano cos'è e cosa fa. */
  descrizione: string;
  /** I modi in cui nasce (vuoto per i quattro elementi). */
  nasce: readonly Via[];
  /** Si può versare col dito una volta scoperta. */
  versabile: boolean;
}

/** I capitoli del libro, nell'ordine in cui si sfogliano. Le miscele hanno un capitolo a parte, senza fine. */
export const SEZIONI: readonly (readonly [string, string])[] = [
  ['elementi', 'I quattro elementi'],
  ['terra', 'Terra e pietre'],
  ['cielo', 'Acqua e cielo'],
  ['fuoco', 'Fuoco e fumo'],
  ['vita', 'Vita'],
  ['genti', 'Genti'],
];

export const INIZIALI: readonly number[] = [M.TERRA, M.ACQUA, M.FUOCO, M.ARIA];

function voce(id: number, nome: string, sezione: string, indizio: string, descrizione: string, nasce: readonly Via[] = [], versabile = true): Scoperta {
  return { id, nome, sezione, indizio, descrizione, nasce, versabile };
}
const con = (...ids: number[]): Via => ({ con: ids });
const nota = (testo: string, ...ids: number[]): Via => ({ con: ids, nota: testo });
/** Un fenomeno o un essere: sta nel libro, ma non si versa. */
const evento = (id: number, nome: string, sezione: string, indizio: string, descrizione: string, nasce: readonly Via[]): Scoperta =>
  voce(id, nome, sezione, indizio, descrizione, nasce, false);

export const SCOPERTE: readonly Scoperta[] = [
  // ── I quattro elementi ──
  voce(M.TERRA, 'Terra', 'elementi', '', 'Cade, si ammucchia, regge quello che le metti sopra. Quasi tutto comincia da qui.'),
  voce(M.ACQUA, 'Acqua', 'elementi', '', 'Scorre verso il basso e riempie ogni conca. Spegne, bagna, disseta.'),
  voce(M.FUOCO, 'Fuoco', 'elementi', '', 'Sale, dura un attimo e cambia tutto quello che tocca.'),
  voce(M.ARIA, 'Aria', 'elementi', '', 'Un soffio che si sparpaglia ovunque. Asciuga, consuma, attizza.'),

  // ── Terra e pietre ──
  voce(M.FANGO, 'Fango', 'terra', 'La terra ha sete.', 'Terra bagnata: molle, scura, appiccicosa. Lasciata in pace sotto il cielo, è la culla delle piante.', [con(M.TERRA, M.ACQUA)]),
  voce(M.SABBIA, 'Sabbia', 'terra', 'Il vento consuma la terra.', 'Terra sbriciolata dal vento. Scivola dappertutto e non sta mai ferma.', [con(M.TERRA, M.ARIA)]),
  voce(M.ARGILLA, 'Argilla', 'terra', 'Il fango, asciugato dal vento.', 'Fango asciugato dall’aria: compatta, non frana. Aspetta solo di essere cotta.', [con(M.FANGO, M.ARIA)]),
  voce(M.MATTONE, 'Mattone', 'terra', 'L’argilla va cotta.', 'Argilla cotta: dura, rossa, resta dove la metti. Con i mattoni si fanno i ripari.', [con(M.ARGILLA, M.FUOCO), con(M.ARGILLA, M.LAVA)]),
  voce(M.PIETRA, 'Pietra', 'terra', 'La lava si calma con l’acqua. O con la pazienza.', 'Lava raffreddata. Solida e muta, ma dentro nasconde il metallo e sopra, bagnata, si copre di muschio.', [con(M.LAVA, M.ACQUA), nota('lasciata raffreddare', M.LAVA)]),
  voce(M.VETRO, 'Vetro', 'terra', 'Nasce dove il cielo colpisce la spiaggia.', 'Sabbia fusa: trasparente e dura. Nemmeno l’acido riesce a intaccarlo.', [con(M.SABBIA, M.FULMINE), con(M.SABBIA, M.LAVA)]),
  voce(M.OSSIDIANA, 'Ossidiana', 'terra', 'La lava contro il gelo.', 'Lava raffreddata di colpo dal gelo: un vetro nero, lucido, indistruttibile.', [con(M.LAVA, M.NEVE), con(M.LAVA, M.GHIACCIO)]),
  voce(M.HUMUS, 'Terriccio', 'terra', 'La cenere non è la fine: mescolala alla terra.', 'Terra ingrassata dalla cenere. Qui le piante spuntano in fretta, e molte diventano alberi.', [con(M.CENERE, M.TERRA)]),
  voce(M.METALLO, 'Metallo', 'terra', 'La lava sa tirare fuori qualcosa dalla pietra.', 'Fuso fuori dalla pietra dalla lava. Pesante e lucente, non brucia e non si rompe; ma l’acqua lo consuma.', [con(M.PIETRA, M.LAVA)]),
  voce(M.RUGGINE, 'Ruggine', 'terra', 'Il metallo non ama l’acqua.', 'Metallo mangiato dall’acqua: una polvere rossiccia che non torna più indietro.', [con(M.METALLO, M.ACQUA)]),
  voce(M.DIAMANTE, 'Diamante', 'terra', 'Il carbone colpito dal cielo.', 'Carbone trasformato da un fulmine. Brilla anche al buio e niente lo scalfisce.', [con(M.CARBONE, M.FULMINE)]),
  evento(K.DESERTO, 'Deserto', 'terra', 'Sabbia, sabbia e ancora sabbia.', 'Quando la sabbia è tanta da coprire mezzo mondo, il mondo ha il suo deserto.', [nota('tantissima', M.SABBIA)]),

  // ── Acqua e cielo ──
  voce(M.VAPORE, 'Vapore', 'cielo', 'Cosa succede se spegni un fuoco?', 'Acqua scaldata che sale. Se arriva in alto diventa nuvola; se resta chiuso torna acqua.', [con(M.ACQUA, M.FUOCO)]),
  voce(M.NUVOLA, 'Nuvola', 'cielo', 'Il vapore sale, sale… lascialo arrivare in cielo.', 'Vapore raccolto in cielo. Il vento la porta in giro, e goccia dopo goccia si svuota.', [nota('arrivato in alto', M.VAPORE), con(M.VAPORE, M.ARIA)]),
  evento(K.PIOGGIA, 'Pioggia', 'cielo', 'Prima o poi le nuvole restituiscono tutto.', 'L’acqua che torna giù dal cielo. Bagna la terra, riempie le conche, fa crescere.', [con(M.NUVOLA)]),
  voce(M.FULMINE, 'Fulmine', 'cielo', 'Fai crescere una nuvola bella grossa. E aspetta.', 'Si scarica dalle nuvole grandi e fitte. Incendia i boschi, fonde la sabbia, cambia il carbone.', [nota('grande e fitta', M.NUVOLA)]),
  evento(K.TEMPORALE, 'Temporale', 'cielo', 'Pioggia e fulmini, insieme.', 'Quando piove forte e il cielo si scarica: acqua e fuoco nello stesso momento.', [con(K.PIOGGIA, M.FULMINE)]),
  evento(K.ARCOBALENO, 'Arcobaleno', 'cielo', 'Piove, ma c’è il sole.', 'Compare dietro le montagne quando piove di giorno. Non serve a niente, ed è per questo che è bello.', [nota('di giorno', K.PIOGGIA)]),
  voce(M.NEVE, 'Neve', 'cielo', 'Soffia aria dentro una nuvola.', 'Nuvola gelata dal vento. Cade piano, galleggia sull’acqua e la ghiaccia.', [con(M.NUVOLA, M.ARIA)]),
  voce(M.GHIACCIO, 'Ghiaccio', 'cielo', 'Neve e acqua, insieme.', 'Acqua fermata dal gelo. Duro e trasparente, finché non arriva il caldo.', [con(M.NEVE, M.ACQUA)]),
  evento(K.NEVICATA, 'Nevicata', 'cielo', 'Tanta neve da imbiancare tutto.', 'Quando la neve è così tanta che il mondo cambia colore.', [nota('tantissima', M.NEVE)]),
  evento(K.GHIACCIAIO, 'Ghiacciaio', 'cielo', 'Un lago intero, gelato.', 'Una distesa di ghiaccio grande quanto un lago: l’acqua che ha smesso di muoversi.', [nota('tantissimo', M.GHIACCIO)]),
  evento(K.LAGO, 'Lago', 'cielo', 'Riempi una conca fino all’orlo.', 'Tanta acqua ferma nello stesso posto. Sul fondo crescono le alghe, sulle rive arriva la vita.', [nota('tantissima', M.ACQUA)]),
  evento(K.NOTTE, 'Notte', 'cielo', 'Aspetta che il sole tramonti.', 'Il sole scende, escono la luna e le stelle. Il fuoco, di notte, è l’unica luce.', [nota('basta aspettare', M.ARIA)]),
  evento(K.ALBA, 'Alba', 'cielo', 'Dopo la prima notte.', 'Il mondo ha superato la sua prima notte, e il cielo torna chiaro.', [con(K.NOTTE)]),

  // ── Fuoco e fumo ──
  voce(M.LAVA, 'Lava', 'fuoco', 'Scalda la terra finché non cede.', 'Terra fusa dal fuoco. Lenta, luminosa, brucia tutto; ma fonde la sabbia in vetro e la pietra in metallo.', [nota('con insistenza', M.TERRA, M.FUOCO)]),
  voce(M.FUMO, 'Fumo', 'fuoco', 'Dove c’è fuoco…', 'Quello che il fuoco lascia nell’aria. Sale, si allarga, sparisce.', [con(M.FUOCO)]),
  voce(M.CENERE, 'Cenere', 'fuoco', 'Quello che resta di un bosco dopo l’incendio.', 'Ciò che resta di quello che è bruciato. Leggera e grigia: sulla terra la rende fertile, sulla lava diventa zolfo.', [con(M.PIANTA, M.FUOCO), con(M.LEGNO, M.FUOCO)]),
  voce(M.CARBONE, 'Carbone', 'fuoco', 'Legno bruciato senz’aria: prova a soffocare il fuoco.', 'Legno bruciato al chiuso. Nero, arde a lungo, e sotto un fulmine diventa tutt’altro.', [nota('bruciato soffocato', M.LEGNO, M.FUOCO)]),
  voce(M.ZOLFO, 'Zolfo', 'fuoco', 'Fai cadere la cenere sulla lava.', 'Una polvere gialla che nasce dove la cenere tocca la lava. Brucia, e nell’acqua diventa acido.', [con(M.CENERE, M.LAVA)]),
  voce(M.POLVERE_NERA, 'Polvere nera', 'fuoco', 'Il nero e il giallo, insieme, fanno rumore.', 'Carbone e zolfo mescolati. Sembra innocua, finché non la tocca una fiamma.', [con(M.CARBONE, M.ZOLFO)]),
  voce(M.ACIDO, 'Acido', 'fuoco', 'Lo zolfo nell’acqua non resta zolfo.', 'Un liquido verde che mangia terra, pietra, metallo e piante. Solo vetro, ossidiana e diamante gli resistono.', [con(M.ZOLFO, M.ACQUA)]),
  evento(K.ESPLOSIONE, 'Esplosione', 'fuoco', 'Qualcosa, col fuoco, non brucia: salta.', 'Un attimo e intorno non c’è più niente, tranne fuoco e fumo.', [con(M.POLVERE_NERA, M.FUOCO)]),
  evento(K.INCENDIO, 'Incendio', 'fuoco', 'Un bosco intero in fiamme.', 'Quando il fuoco è troppo per spegnerlo con due gocce: brucia finché trova qualcosa da bruciare.', [nota('tanto', M.LEGNO, M.FUOCO)]),
  evento(K.ERUZIONE, 'Eruzione', 'fuoco', 'Un mare di lava.', 'Tanta lava da scorrere a fiumi. Dove passa lascia pietra, vetro e metallo.', [nota('tantissima', M.LAVA)]),

  // ── Vita ──
  voce(M.PIANTA, 'Pianta', 'vita', 'Fango tranquillo, cielo aperto sopra, e un po’ di pazienza.', 'Spunta dal fango lasciato in pace. Erba, steli, fiori; e ogni tanto un germoglio che non si ferma.', [nota('lasciato in pace sotto il cielo', M.FANGO), con(M.HUMUS)]),
  evento(K.FIORE, 'Fiore', 'vita', 'In cima all’erba, ogni tanto, c’è un colore.', 'Sboccia in cima a uno stelo o tra le foglie di un albero. Giallo, rosa, bianco, viola.', [con(M.PIANTA)]),
  voce(M.LEGNO, 'Legno', 'vita', 'Non tutte le piante si fermano all’erba.', 'Il tronco di un albero cresciuto. Brucia a lungo, e dove tocca l’umido fa nascere i funghi.', [nota('un albero cresciuto', M.PIANTA)]),
  voce(M.FRUTTO, 'Frutto', 'vita', 'Sotto le foglie degli alberi, col tempo, matura qualcosa.', 'Matura sotto la chioma, resta appeso un po’ e poi cade. Gli omini ne vanno matti; se nessuno lo mangia, diventa un albero.', [nota('col tempo', M.LEGNO, M.PIANTA)]),
  voce(M.FUNGO, 'Fungo', 'vita', 'Il legno, vicino all’umido, non resta solo.', 'Spunta sul legno che tocca fango o acqua. Piccolo, rosso, buono da mangiare.', [con(M.LEGNO, M.FANGO), con(M.LEGNO, M.ACQUA)]),
  voce(M.MUSCHIO, 'Muschio', 'vita', 'La pietra, bagnata a lungo, cambia colore.', 'Un velo verde che copre la pietra bagnata e piano piano si allarga su quella vicina.', [nota('a lungo', M.PIETRA, M.ACQUA)]),
  voce(M.ALGA, 'Alga', 'vita', 'Sul fondo fangoso di uno stagno.', 'Cresce dal fango sott’acqua e sale verso la luce.', [nota('sott’acqua', M.FANGO, M.ACQUA)]),
  evento(K.FORESTA, 'Foresta', 'vita', 'Un albero è un albero. Tanti alberi…', 'Tanti alberi insieme: ombra, frutti, funghi. E legna per chi sa accendere un fuoco.', [nota('tantissimo', M.LEGNO)]),
  evento(K.LUCCIOLE, 'Lucciole', 'vita', 'Di notte, dove c’è molto verde.', 'Di notte, tra le piante, si accendono piccole luci che vanno e vengono.', [con(K.NOTTE, M.PIANTA)]),

  // ── Genti ──
  voce(K.OMINO, 'Omino', 'genti', 'Arrivano dove c’è da bere, da mangiare e un riparo fatto da te: pietra o mattoni.', 'Arriva da solo quando il mondo è pronto. Beve, mangia piante, frutti e funghi, nuota, e dal fuoco scappa a braccia alzate.', [nota('tanta acqua, tante piante e un riparo', M.ACQUA, M.PIANTA, M.PIETRA)]),
  evento(K.BAMBINO, 'Bambino', 'genti', 'Due omini che stanno bene, vicini.', 'Nasce quando due omini hanno bevuto e mangiato e si trovano vicini. Piccolo all’inizio, poi cresce.', [con(K.OMINO)]),
  evento(K.VILLAGGIO, 'Villaggio', 'genti', 'Sei omini vivi nello stesso momento.', 'Sei omini vivi insieme: da quattro granelli a un paese abitato.', [nota('sei insieme', K.OMINO)]),
];

export const PER_ID = new Map(SCOPERTE.map((s) => [s.id, s]));
