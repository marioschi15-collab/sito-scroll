import { GAS, LIQUIDO, M, POLVERE, SOLIDO, type Sostanza } from './materiali.js';

/**
 * Le miscele d'autore: le coppie più naturali tra i materiali non danno una miscela qualunque ma una cosa con un
 * nome vero, scritto a mano (terra e carbone: la Terra nera), una descrizione e un carattere deciso. Nel Libro
 * hanno la stellina. Restano miscele: occupano un posto di miscela nel mondo solo quando ci sono, come le altre.
 * Il carattere elenca lo stato e i soli tratti che la miscela ha davvero: gli altri restano sotto le soglie.
 */
export interface Firmata {
  nome: string;
  racconto: string;
  carattere: Partial<Sostanza> & { stato: number };
}

const f = (nome: string, stato: number, racconto: string, tratti: Partial<Sostanza> = {}): Firmata => ({ nome, racconto, carattere: { stato, ...tratti } });

/** [primo materiale, secondo materiale, la miscela d'autore che ne nasce]. Ogni coppia una volta sola. */
export const FIRMATE: readonly (readonly [number, number, Firmata])[] = [
  [M.ACQUA, M.SABBIA, f('Sabbie mobili', POLVERE, 'Sabbia così piena d’acqua che non regge più niente: quello che ci finisce dentro resta attaccato.', { appiccica: 0.8, scorre: 0.1 })],
  [M.ACQUA, M.CENERE, f('Liscivia', LIQUIDO, 'L’acqua passata sulla cenere: una volta ci si lavavano i panni. Mangia piano quello che tocca.', { corrode: 0.7 })],
  [M.ACQUA, M.FRUTTO, f('Spremuta', LIQUIDO, 'Frutta schiacciata nell’acqua: dolce, e macchia tutto quello che tocca.', { nutre: 0.85, tinge: 0.7, colore: [236, 120, 70] })],
  [M.ACQUA, M.FUNGO, f('Brodo di funghi', LIQUIDO, 'Funghi lasciati a bagno: un brodo caldo che gli omini bevono volentieri.', { nutre: 0.8, calore: 0.3 })],
  [M.ACQUA, M.CARBONE, f('Inchiostro', LIQUIDO, 'Acqua e polvere di carbone: con questa si scrive. L’acqua che tocca si fa scura.', { tinge: 0.9, colore: [36, 40, 82] })],
  [M.ACQUA, M.RUGGINE, f('Acqua ferrosa', LIQUIDO, 'Acqua che ha riposato sul ferro vecchio: rossa come la ruggine, e rosso si fa il lago in cui finisce.', { tinge: 0.8, colore: [176, 84, 52] })],
  [M.ACQUA, M.MUSCHIO, f('Acquitrino', LIQUIDO, 'Acqua ferma e muschio: una palude piccola che si allarga piano sulla terra.', { vivo: 0.7, fertile: 0.7 })],
  [M.ACQUA, M.GHIACCIO, f('Granita', POLVERE, 'Ghiaccio tritato nell’acqua: fresca, e gli omini la mangiano volentieri.', { calore: -0.7, nutre: 0.75, colore: [200, 236, 250] })],
  [M.ACQUA, M.POLVERE_NERA, f('Polvere bagnata', POLVERE, 'Polvere nera finita nell’acqua: non scoppia più, si appiccica e basta.', { appiccica: 0.75 })],
  [M.ACQUA, M.DIAMANTE, f('Acqua di stelle', LIQUIDO, 'Acqua in cui è caduta polvere di diamante: di notte brilla da sola.', { luce: 0.8, colore: [150, 210, 255] })],
  [M.ACQUA, M.NUVOLA, f('Pioggerella', GAS, 'Una nuvola così carica d’acqua che non sta su: appena sale si fa pioggia.', { piove: 0.9 })],
  [M.ACQUA, M.VAPORE, f('Acqua termale', LIQUIDO, 'Acqua tiepida che sale da sotto terra: dove scorre, l’erba fiorisce.', { calore: 0.4, fiorisce: 0.75 })],
  [M.TERRA, M.CARBONE, f('Terra nera', POLVERE, 'Terra mescolata al carbone: la più fertile che ci sia, e i fiori la adorano.', { fertile: 0.9, fiorisce: 0.6, colore: [52, 40, 34] })],
  [M.TERRA, M.MUSCHIO, f('Torba', POLVERE, 'Muschio e terra pressati per secoli: brucia piano, e intanto nutre le piante.', { brucia: 0.75, fertile: 0.65 })],
  [M.TERRA, M.PIANTA, f('Zolla erbosa', SOLIDO, 'Un pezzo di prato con le sue radici: posato sulla terra, si allarga.', { vivo: 0.75, fertile: 0.65, colore: [96, 150, 70] })],
  [M.TERRA, M.NEVE, f('Fanghiglia', POLVERE, 'Neve sporca di terra: fredda, molle, e si attacca a tutto.', { calore: -0.6, appiccica: 0.6 })],
  [M.TERRA, M.FUNGO, f('Sottobosco', POLVERE, 'La terra sotto gli alberi, piena di funghi: dove la spargi spuntano i fiori.', { fertile: 0.75, fiorisce: 0.7 })],
  [M.TERRA, M.ARGILLA, f('Terra battuta', SOLIDO, 'Terra e argilla pestate insieme: dura come un pavimento, e fa indurire la terra che tocca.', { indurisce: 0.7 })],
  [M.FUOCO, M.SABBIA, f('Vetro fuso', LIQUIDO, 'Sabbia sciolta dal fuoco: scorre lenta e rovente. Non toccarla.', { calore: 0.8, luce: 0.65, scorre: 0.3, colore: [255, 170, 90] })],
  [M.FUOCO, M.METALLO, f('Metallo fuso', LIQUIDO, 'Metallo sciolto nel fuoco: dove cola sulla terra, la terra fa presa e diventa pietra.', { calore: 0.9, luce: 0.7, indurisce: 0.6, colore: [255, 140, 60] })],
  [M.FUOCO, M.ALGA, f('Alga secca', POLVERE, 'Alghe seccate al fuoco: croccanti, si mangiano, e prendono fuoco subito.', { brucia: 0.8, nutre: 0.7 })],
  [M.ARIA, M.DIAMANTE, f('Polvere di stelle', POLVERE, 'Diamante ridotto in polvere finissima: sale verso il cielo e lassù brilla.', { vola: 0.8, luce: 0.85, colore: [232, 232, 255] })],
  [M.ARIA, M.PIANTA, f('Polline', POLVERE, 'Il vento che passa sui prati se lo porta via: dove si posa, l’erba fiorisce.', { vola: 0.7, fiorisce: 0.9, colore: [245, 220, 90] })],
  [M.ARIA, M.FUNGO, f('Spore', POLVERE, 'I semi dei funghi, leggeri come fumo: volano, e dove trovano terra si allargano.', { vola: 0.65, vivo: 0.7 })],
  [M.ARIA, M.ACIDO, f('Vapori acidi', GAS, 'L’acido che si alza nell’aria: rode quello che sfiora. Meglio starne lontani.', { corrode: 0.7, veleno: 0.6 })],
  [M.ARIA, M.ZOLFO, f('Fumi di zolfo', GAS, 'L’odore di uova marce che esce dai vulcani: le piante non lo sopportano.', { veleno: 0.7, colore: [220, 210, 80] })],
  [M.VAPORE, M.PIANTA, f('Tisana', LIQUIDO, 'Foglie nel vapore caldo: una bevanda tiepida che rimette in forze.', { nutre: 0.7, calore: 0.3, colore: [150, 170, 70] })],
  [M.VAPORE, M.NEVE, f('Nevischio', GAS, 'Vapore che incontra la neve: una nuvola gelida che porta pioggia fredda.', { piove: 0.8, calore: -0.6 })],
  [M.VAPORE, M.GHIACCIO, f('Brina', POLVERE, 'Il vapore che si posa sul ghiaccio e diventa aghi bianchi: gela l’acqua che tocca.', { calore: -0.8, colore: [236, 246, 255] })],
  [M.VAPORE, M.ZOLFO, f('Fumarola', GAS, 'Il fiato caldo della terra, che sa di zolfo: scotta e avvelena.', { veleno: 0.7, calore: 0.6 })],
  [M.FANGO, M.CENERE, f('Malta', POLVERE, 'Fango e cenere: la malta che tiene insieme i muri. Dove tocca terra o sabbia fa presa, e diventa pietra.', { appiccica: 0.7, indurisce: 0.85, colore: [190, 185, 170] })],
  [M.FANGO, M.PIANTA, f('Palude', LIQUIDO, 'Fango, acqua ed erba: una palude che cresce, e ai suoi bordi spuntano i fiori.', { vivo: 0.7, fiorisce: 0.6, colore: [70, 110, 60] })],
  [M.SABBIA, M.ARGILLA, f('Arenaria', SOLIDO, 'Sabbia tenuta insieme dall’argilla: una pietra tenera che fa diventare pietra la sabbia intorno.', { indurisce: 0.75 })],
  [M.SABBIA, M.DIAMANTE, f('Sabbia d’oro', POLVERE, 'Granelli che brillano come l’oro: al buio fanno luce.', { luce: 0.8, colore: [250, 215, 100] })],
  [M.LAVA, M.NUVOLA, f('Nube ardente', GAS, 'Una nube rovente che scende dai vulcani: accende tutto quello che sfiora.', { calore: 0.8, luce: 0.6, colore: [255, 130, 80] })],
  [M.PIETRA, M.ALGA, f('Scoglio', SOLIDO, 'Una pietra coperta d’alghe: piano piano si allarga.', { vivo: 0.7, colore: [60, 120, 100] })],
  [M.PIETRA, M.DIAMANTE, f('Geode', SOLIDO, 'Una pietra qualsiasi fuori, e dentro tutta cristalli che brillano.', { luce: 0.8 })],
  [M.NUVOLA, M.FRUTTO, f('Zucchero filato', POLVERE, 'Dolce e leggero come una nuvola: sale verso il cielo, e gli omini lo mangiano volentieri.', { vola: 0.7, nutre: 0.85, colore: [250, 190, 220] })],
  [M.NUVOLA, M.NEVE, f('Nuvola di neve', GAS, 'Una nuvola carica di gelo: ghiaccia l’acqua che sfiora, e salendo porta pioggia.', { piove: 0.8, calore: -0.7 })],
  [M.VETRO, M.DIAMANTE, f('Cristallo puro', SOLIDO, 'Vetro e diamante: limpido come l’acqua ferma, e al buio fa luce.', { luce: 0.9 })],
  [M.PIANTA, M.FRUTTO, f('Marmellata', LIQUIDO, 'Frutta e foglie cotte piano: dolce, e si attacca dappertutto.', { nutre: 0.9, appiccica: 0.7, scorre: 0.2, colore: [200, 40, 60] })],
  [M.LEGNO, M.ZOLFO, f('Zolfanelli', POLVERE, 'Legnetti con la punta di zolfo: basta una scintilla.', { brucia: 0.9 })],
  [M.LEGNO, M.FUNGO, f('Legno marcio', POLVERE, 'Legno vecchio mangiato dai funghi: si sbriciola e fa crescere le piante.', { fertile: 0.75 })],
  [M.NEVE, M.FRUTTO, f('Sorbetto', POLVERE, 'Neve e frutta: un dolce gelato che gli omini adorano.', { calore: -0.65, nutre: 0.85, colore: [250, 170, 190] })],
  [M.GHIACCIO, M.DIAMANTE, f('Ghiaccio eterno', SOLIDO, 'Ghiaccio così duro che non si scioglie mai: gela tutto e brilla al buio.', { calore: -0.9, luce: 0.65 })],
  [M.HUMUS, M.ALGA, f('Concime', POLVERE, 'Terriccio e alghe: il cibo migliore per l’orto, e per i fiori.', { fertile: 0.95, fiorisce: 0.7 })],
  [M.ARGILLA, M.RUGGINE, f('Ocra', LIQUIDO, 'La terra rossa dei pittori, sciolta in un colore denso: tinge l’acqua che tocca.', { tinge: 0.85, appiccica: 0.55, colore: [200, 120, 50] })],
  [M.ACIDO, M.FRUTTO, f('Aceto', LIQUIDO, 'Frutta lasciata a inacidire: corrode piano quello che tocca.', { corrode: 0.62, colore: [200, 170, 120] })],
  [M.DIAMANTE, M.FRUTTO, f('Pomo d’oro', POLVERE, 'Un frutto che brilla come una lampada: chi lo mangia non lo dimentica.', { nutre: 0.9, luce: 0.8, colore: [255, 200, 60] })],
  [M.MUSCHIO, M.ALGA, f('Lichene', SOLIDO, 'Muschio e alga che vivono insieme: si allarga piano, anche dove nient’altro cresce.', { vivo: 0.8 })],
  [M.MUSCHIO, M.FUNGO, f('Muffa', POLVERE, 'Muschio e funghi: una peluria grigia che si allarga, e fa male a chi la mangia.', { vivo: 0.8, veleno: 0.6, colore: [150, 160, 140] })],
  [M.FULMINE, M.VETRO, f('Folgorite', SOLIDO, 'Il segno che lascia un fulmine quando cade: un tubo di vetro che brilla al buio.', { luce: 0.75 })],
];

let indice: Map<string, Firmata> | null = null;

/** La miscela d'autore di due materiali, in qualsiasi ordine; undefined se la coppia non ne ha una. */
export function firmataDi(a: number, b: number): Firmata | undefined {
  if (!indice) {
    indice = new Map();
    for (const [x, y, firmata] of FIRMATE) indice.set(`${Math.min(x, y)}:${Math.max(x, y)}`, firmata);
  }
  return indice.get(`${Math.min(a, b)}:${Math.max(a, b)}`);
}
