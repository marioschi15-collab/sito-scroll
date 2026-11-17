import { C, E, G, INGOMBRO, vieDi } from './motore/cose.js';
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
  ['cose', 'Invenzioni'],
  ['ere', 'Ere ed eventi'],
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

export const SCOPERTE: Scoperta[] = [
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
  voce(M.VAPORE, 'Vapore', 'cielo', 'Cosa succede se spegni un fuoco?', 'Acqua scaldata dal fuoco, o asciugata dal vento, che sale. Se arriva in alto diventa nuvola; se resta chiuso torna acqua.', [con(M.ACQUA, M.FUOCO), con(M.ACQUA, M.ARIA)]),
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
  voce(
    K.OMINO,
    'Omino',
    'genti',
    'Arrivano dove c’è da bere, da mangiare e un riparo fatto da te. Oppure: un tetto e un frutto, e arriva qualcuno.',
    'Arriva in due, vicino all’acqua, quando il mondo è pronto o quando una capanna ha qualcosa da offrire. Beve, mangia piante, frutti e funghi, nuota, e dal fuoco scappa a braccia alzate.',
    [nota('tanta acqua, tante piante e un riparo', M.ACQUA, M.PIANTA, M.PIETRA), con(C.CAPANNA, M.FRUTTO)],
  ),
  evento(K.BAMBINO, 'Bambino', 'genti', 'Due omini che stanno bene, vicini.', 'Nasce quando due omini hanno bevuto e mangiato e si trovano vicini. Piccolo all’inizio, poi cresce.', [con(K.OMINO)]),
  evento(K.VILLAGGIO, 'Villaggio', 'genti', 'Sei omini vivi nello stesso momento.', 'Sei omini vivi insieme: da quattro granelli a un paese abitato.', [nota('sei insieme', K.OMINO)]),
];

/**
 * Una voce che nasce da un'unione scritta (cose.ts): le sue vie sono quelle unioni. Se ha un ingombro si può
 * posare nel mondo; altrimenti, per ora, è un gettone che si unisce ad altro.
 */
const unita = (id: number, nome: string, sezione: string, indizio: string, descrizione: string): Scoperta =>
  voce(id, nome, sezione, indizio, descrizione, vieDi(id).map(([a, b]) => con(a, b)), INGOMBRO[id] !== undefined);
/** Un'invenzione: nasce unendo due scoperte. */
const invenzione = (id: number, nome: string, indizio: string, descrizione: string): Scoperta => unita(id, nome, 'cose', indizio, descrizione);
/** Un mestiere, una persona, un popolo: nasce portando qualcosa a un omino. */
const gente = (id: number, nome: string, indizio: string, descrizione: string): Scoperta => unita(id, nome, 'genti', indizio, descrizione);
const era = (id: number, nome: string, indizio: string, descrizione: string, grazie: number): Scoperta =>
  voce(id, nome, 'ere', indizio, descrizione, [con(grazie)], false);

const INVENZIONI: readonly Scoperta[] = [
  invenzione(C.UTENSILE, 'Utensile', 'Una pietra e un bastone, insieme, fanno molto di più.', 'Una pietra legata a un legno: la prima cosa fatta apposta per farne altre. Da qui comincia tutto.'),
  invenzione(C.FALO, 'Falò', 'Il fuoco, dato da mangiare a qualcosa che brucia piano.', 'Un fuoco tenuto vivo. Scalda, fa luce di notte e raduna intorno a sé chi ha freddo.'),
  invenzione(C.CAPANNA, 'Capanna', 'Legno per reggere, foglie per coprire.', 'Rami e frasche: il primo tetto. Ci vivono tre omini, e basta a farli arrivare.'),
  invenzione(C.LANCIA, 'Lancia', 'Un utensile con il manico lungo.', 'Un utensile in cima a un bastone lungo: per cacciare, e per tenere lontano quello che fa paura.'),
  invenzione(C.RUOTA, 'Ruota', 'Con l’utensile giusto, anche la pietra rotola.', 'Una pietra lavorata finché gira. Sembra poco, ma senza di lei niente carri e niente mulini.'),
  invenzione(C.VASO, 'Vaso', 'L’argilla tiene l’acqua, se le dai la forma.', 'Argilla modellata per contenere: acqua, semi, olio. Quello che si conserva si può mettere da parte.'),
  invenzione(C.CAMPO, 'Campo', 'La terra, lavorata con un utensile.', 'Terra smossa e seminata. Il cibo non si cerca più: si aspetta.'),
  invenzione(C.PANE, 'Pane', 'Quello che dà il campo, passato sul fuoco.', 'Il raccolto del campo, macinato e cotto. Si conserva per giorni e sfama molti.'),
  invenzione(C.POZZO, 'Pozzo', 'Pietra intorno all’acqua.', 'Un cerchio di pietre attorno all’acqua: da bere anche lontano dal lago.'),
  invenzione(C.CASA, 'Casa', 'Mattoni per i muri, legno per il tetto.', 'Muri di mattoni e tetto di legno. Ci vivono cinque omini, al riparo da pioggia e vento.'),
  invenzione(C.FORNACE, 'Fornace', 'Un fuoco chiuso tra i mattoni scalda molto di più.', 'Mattoni attorno al fuoco: dentro fa così caldo da fondere quello che il falò non scalfisce.'),
  invenzione(C.BRONZO, 'Bronzo', 'Il metallo, nella fornace, diventa un altro.', 'Metallo fuso nella fornace e colato in forma. Più duro della pietra, e si rifà quando si rompe.'),
  invenzione(C.SPADA, 'Spada', 'Il bronzo lavorato con l’utensile.', 'Bronzo battuto e affilato. Con lei arrivano i guerrieri, e chi comanda.'),
  invenzione(C.CARRO, 'Carro', 'Una ruota ha bisogno di qualcosa da portare.', 'Assi di legno su ruote: quello che prima si portava in spalla ora si porta in dieci volte tanto.'),
  invenzione(C.BARCA, 'Barca', 'Con l’utensile, sull’acqua.', 'Un tronco scavato con l’utensile. L’acqua smette di essere un confine e diventa una strada.'),
  invenzione(C.STRADA, 'Strada', 'Pietra e sabbia, stese per terra.', 'Pietre posate sulla sabbia. Dove c’è una strada, i carri passano anche quando piove.'),
  invenzione(C.MURA, 'Mura', 'Pietra e mattoni, uno sull’altro.', 'Pietre e mattoni uno sull’altro. Dentro le mura si dorme tranquilli.'),
  invenzione(C.TORRE, 'Torre', 'Mura, e ancora pietra sopra.', 'Mura che salgono. Da lassù si vede arrivare chiunque, molto prima.'),
  invenzione(C.TEMPIO, 'Tempio', 'Mura e vetro: un posto che non serve per abitare.', 'Colonne e luce. Il primo edificio costruito non per ripararsi, ma per qualcosa di più grande.'),
  invenzione(C.SCRITTURA, 'Scrittura', 'Un utensile sull’argilla lascia il segno.', 'Segni incisi nell’argilla. Quello che si sa non muore più con chi lo sa.'),
  invenzione(C.MONETA, 'Moneta', 'Il bronzo, ripassato sul fuoco, in pezzi piccoli.', 'Dischetti di bronzo tutti uguali. Non si scambia più una capra con un vaso: si conta.'),
  invenzione(C.MULINO, 'Mulino', 'Una ruota che gira col vento.', 'Una ruota mossa dall’aria. Macina da sola, giorno e notte.'),
  invenzione(C.CASTELLO, 'Castello', 'Una torre con le sue mura.', 'Torri e mura insieme. Ci vivono in dodici, e da lì si governa tutto il paese intorno.'),
  invenzione(C.CITTA, 'Città', 'Un villaggio, cinto di mura.', 'Un villaggio che si è chiuso tra le mura ed è cresciuto. Mestieri, piazze, rumore.'),
  invenzione(C.MERCATO, 'Mercato', 'Monete e carri: qualcuno compra, qualcuno vende.', 'Banchi, carri e monete. Qui arriva quello che il paese non sa fare da sé.'),
  invenzione(C.LIBRO, 'Libro', 'La scrittura, su qualcosa di più leggero dell’argilla.', 'Segni su fogli fatti di piante. Leggero, si porta ovunque: le idee cominciano a viaggiare.'),
  invenzione(C.FERRO, 'Ferro', 'Nella fornace, con il carbone al posto della legna.', 'Con il carbone la fornace scalda ancora di più, e ne esce un metallo che non si piega.'),
  invenzione(C.ARATRO, 'Aratro', 'Il ferro, nel campo.', 'Una lama di ferro che apre la terra. Lo stesso campo dà il doppio.'),
  invenzione(C.PONTE, 'Ponte', 'Una strada che non si ferma davanti all’acqua.', 'Una strada sospesa sull’acqua. Due rive diventano un posto solo.'),
  invenzione(C.FARO, 'Faro', 'Un fuoco in cima a una torre.', 'Un fuoco in cima a una torre: di notte dice alle barche dov’è la terra.'),
  invenzione(C.SECCHIO, 'Secchio', 'Al pozzo serve qualcosa per tirare su l’acqua.', 'Un vaso legato a una corda: scende nel pozzo pieno di niente e risale pieno d’acqua.'),
  invenzione(C.FIACCOLA, 'Fiaccola', 'Un pezzo di legno che si porta via il falò.', 'Un bastone acceso al falò: la luce che cammina con te nel buio.'),
  invenzione(C.MINESTRA, 'Minestra', 'Il vaso, messo sul falò.', 'Acqua, erbe e quello che c’è, nel vaso sul fuoco. Scalda la pancia e mette tutti intorno allo stesso fuoco.'),
  invenzione(C.FARINA, 'Farina', 'Quello che il mulino fa del campo.', 'Il raccolto del campo macinato dal mulino: una polvere bianca che non sembra niente, e invece è il pane di domani.'),
  invenzione(C.FOCACCIA, 'Focaccia', 'La farina, cotta sul falò.', 'Farina e acqua schiacciate e cotte sulle pietre calde del falò. Il pane più antico del mondo.'),
  invenzione(C.VELIERO, 'Veliero', 'Una barca che si fa spingere dal vento.', 'Una barca con una vela: non servono più le braccia, basta il vento.'),
  invenzione(C.FOCOLARE, 'Focolare', 'Il falò, portato dentro casa.', 'Il fuoco dentro casa, nel suo angolo di pietre: cuoce, scalda e la sera tiene tutti vicini.'),
  invenzione(C.FATTORIA, 'Fattoria', 'Una casa in mezzo ai campi.', 'Una casa con i suoi campi intorno: chi ci vive semina, raccoglie e mette da parte per l’inverno.'),
  invenzione(C.PORTO, 'Porto', 'Il faro chiama, le barche arrivano.', 'Moli, barche legate e un faro che le chiama a casa: qui il mare diventa una strada.'),
  invenzione(C.RACCOLTO, 'Raccolto', 'L’aratro nel campo, e poi pazienza.', 'Il campo arato dà spighe alte e piene: un anno di lavoro che si porta a casa in pochi giorni.'),
  invenzione(C.BIBLIOTECA, 'Biblioteca', 'Un posto speciale per tenere i libri.', 'Tanti libri sotto lo stesso tetto: quello che sanno in tanti, a disposizione di uno solo.'),
  invenzione(C.BOTTEGA, 'Bottega', 'Il pane, in cambio di monete.', 'Un banco, un forno e qualcuno che conta le monete: si compra il pane invece di farlo.'),
  invenzione(C.ORTO, 'Orto', 'Un campo vicino all’acqua del pozzo.', 'Un campo piccolo, innaffiato col secchio del pozzo: insalata, fagioli, zucche, tutto l’anno.'),
  invenzione(C.FRUTTETO, 'Frutteto', 'Semina un frutto nel campo.', 'File di alberi piantati apposta: i frutti non si cercano più nel bosco, si raccolgono.'),
  invenzione(C.ACCAMPAMENTO, 'Accampamento', 'Capanne intorno al fuoco.', 'Qualche capanna attorno a un falò: non è ancora un paese, ma ci somiglia.'),
  gente(G.CACCIATORE, 'Cacciatore', 'Dai una lancia a un omino.', 'Un omino con la lancia: esce all’alba, cammina tanto, e torna con la cena.'),
  gente(G.CONTADINO, 'Contadino', 'Un omino e un campo.', 'Un omino che ha scelto il campo: sa quando seminare e quando aspettare.'),
  gente(G.PESCATORE, 'Pescatore', 'Un omino e una barca.', 'Un omino con la barca e tanta pazienza: l’acqua gli dà da mangiare.'),
  gente(G.VASAIO, 'Vasaio', 'Un omino che sa fare vasi.', 'Mani sporche d’argilla e una ruota che gira: da lui escono vasi, piatti e brocche.'),
  gente(G.FORNAIO, 'Fornaio', 'Un omino e il pane.', 'Si alza prima di tutti: quando il paese si sveglia, il pane è già caldo.'),
  gente(G.FABBRO, 'Fabbro', 'Un omino davanti alla fornace.', 'Fuoco, martello e incudine: piega il metallo e ne fa attrezzi, chiodi e ferri.'),
  gente(G.GUERRIERO, 'Guerriero', 'Dai una spada a un omino.', 'Un omino con la spada: difende il paese, e a volte se ne va a cercare guai.'),
  gente(G.MAESTRO, 'Maestro', 'Un omino che ha letto un libro.', 'Ha letto e ricorda, e lo racconta ai più piccoli: così quello che si sa non va perso.'),
  gente(G.MERCANTE, 'Mercante', 'Un omino al mercato.', 'Compra qui e vende là: porta in paese cose che nessuno aveva mai visto.'),
  gente(G.MUGNAIO, 'Mugnaio', 'Un omino e il mulino.', 'Bianco di farina dalla testa ai piedi: guarda il cielo, e quando c’è vento macina.'),
  gente(G.GUARDIANO, 'Guardiano del faro', 'Qualcuno deve tenere acceso il faro.', 'Ogni sera sale le scale e accende il fuoco: le barche tornano a casa grazie a lui.'),
  gente(G.RE, 'Re', 'Un omino nel castello.', 'Un omino con la corona che decide per tutti. Se decide bene, il paese lo ricorda a lungo.'),
  gente(G.ARTIGIANO, 'Artigiano', 'Dai un utensile a un omino.', 'Un omino con l’utensile in mano: aggiusta, intaglia, costruisce. Le cose belle passano dalle sue mani.'),
  gente(G.CARRETTIERE, 'Carrettiere', 'Qualcuno deve guidare il carro.', 'Sempre in strada con il suo carro: porta il grano al mulino e la farina in paese.'),
  gente(G.FAMIGLIA, 'Famiglia', 'Un omino sotto un tetto.', 'Un tetto e chi ci vive sotto: si mangia insieme, si litiga, si fa pace.'),
  gente(G.CANTASTORIE, 'Cantastorie', 'Un omino seduto vicino al falò.', 'La sera, intorno al fuoco, racconta storie vere e storie inventate. Nessuno sa più quali sono quali.'),
  gente(G.VIANDANTE, 'Viandante', 'Un omino che attraversa il ponte.', 'Uno che passa e non si ferma: racconta di paesi lontani, e un giorno riparte.'),
  gente(G.CITTADINO, 'Cittadino', 'Un omino che va a vivere in città.', 'Vive tra le mura, fa un mestiere tra cento, e la sera va in piazza a sentire le novità.'),
  gente(G.CUSTODE, 'Custode del tempio', 'Qualcuno deve aprire il tempio al mattino.', 'Tiene pulite le colonne e accese le lampade, e conosce tutte le storie scritte sui muri.'),
  gente(G.REGNO, 'Regno', 'Una città e un castello, insieme.', 'Tante città sotto lo stesso castello: un paese grande, con i suoi confini e le sue leggi.'),
  era(E.PIETRA, 'Età della pietra', 'Comincia con il primo utensile.', 'Il mondo ha il suo primo utensile. Da adesso le cose non si trovano soltanto: si fanno.', C.UTENSILE),
  era(E.FUOCO_DOMATO, 'Il fuoco domato', 'Quando il fuoco smette di fare paura.', 'Il fuoco non è più solo un pericolo: è calore, luce e compagnia. Le notti non sono più le stesse.', C.FALO),
  era(E.AGRICOLTURA, 'Nasce l’agricoltura', 'Quando si smette di cercare il cibo.', 'Chi semina resta. Intorno ai campi nascono i paesi.', C.CAMPO),
  era(E.BRONZO, 'Età del bronzo', 'Comincia con il primo metallo fuso.', 'Il metallo si fonde e prende la forma che si vuole. Attrezzi migliori, e anche armi.', C.BRONZO),
  era(E.NASCE_SCRITTURA, 'Nasce la scrittura', 'Quando le parole restano.', 'Finisce la preistoria: da qui in poi, quello che succede si può raccontare a chi verrà.', C.SCRITTURA),
  era(E.FERRO, 'Età del ferro', 'Comincia con un metallo più duro del bronzo.', 'Il ferro è dappertutto e costa poco: aratri, chiodi, lame per tutti.', C.FERRO),
  era(E.ANTICA, 'Età antica', 'Comincia con il primo tempio.', 'Templi, città, leggi scritte. Il mondo dei grandi popoli.', C.TEMPIO),
  era(E.COMMERCIO, 'Nasce il commercio', 'Quando le cose cominciano a viaggiare.', 'Monete e mercati: le cose viaggiano più lontano delle persone.', C.MERCATO),
  era(E.MEDIOEVO, 'Medioevo', 'Comincia con il primo castello.', 'Castelli sulle colline e paesi stretti intorno. Un’altra età.', C.CASTELLO),
];
SCOPERTE.push(...INVENZIONI);

export const PER_ID = new Map(SCOPERTE.map((s) => [s.id, s]));

/** Quante voci del Libro sono già state scoperte. Le miscele non sono voci: hanno un capitolo a parte, senza fine. */
export function vociTrovate(visti: ReadonlySet<number>): number {
  let n = 0;
  for (const s of SCOPERTE) if (visti.has(s.id)) n++;
  return n;
}
