import type { Annuncio } from './motore/mondo.js';
import type { Causa } from './motore/omini.js';
import type { PercheNo } from './motore/porta.js';
import { COSE_MAX, type Divieto } from './motore/posa.js';

/**
 * Le righe brevi con cui il gioco spiega quello che è appena successo: una costruzione che non si è posata, un
 * omino che non c'è più. Una frase, in fondo al cielo, che se ne va da sola. Dove non c'è niente da spiegare,
 * la frase è vuota e non compare niente.
 */

/** Perché una costruzione non si è posata, detto a chi gioca. */
export const NON_SI_POSA: Record<Divieto, string> = {
  ignota: '',
  troppe: `Nel mondo ci sono già ${COSE_MAX} costruzioni: togline una con la Gomma per fare posto.`,
  occupato: 'Qui c’è già una costruzione: cerca un posto libero lì accanto.',
  pende: 'Qui pende troppo: cerca un punto più piano.',
  bagnato: 'Qui si affonda: serve la terra ferma.',
  asciutto: 'Barca e Ponte si posano solo sull’acqua.',
  stretto: 'Qui non c’è abbastanza spazio.',
};

/** Perché una cosa portata nel mondo non si è messa lì: i divieti della posa, e quelli di chi versa o fa nascere. */
export const NON_QUI: Record<PercheNo, string> = {
  ...NON_SI_POSA,
  soloSopra: 'Portala sopra un’altra cosa.',
  pieno: 'Qui non c’è più posto: prova un po’ più in là.',
  troppi: 'Gli omini sono già tanti: per ora non ne arrivano altri.',
  acqua: 'Arriveranno vicino all’acqua.',
  affollato: 'Gli animali qui sono già tanti: per ora non ne nascono altri.',
  senzAcqua: 'Questo animale vive nell’acqua: portalo su un lago o su una pozza.',
};

/** Quello che il pannello Unisci risponde, oltre alle scoperte: le coppie già provate, quelle «per ora», gli omini. */
export const UNISCI = {
  perOra: 'Queste due, per ora, non si uniscono.',
  niente: 'Niente, stavolta',
  giaProvata: 'Già provata: niente',
  giaFatta: 'Già fatta:',
  arrivati: 'Sono arrivati due omini, vicino all’acqua.',
  arriveranno: NON_QUI.acqua,
} as const;

/** Il saluto a chi aveva il Mestolo in una partita di prima: detto una volta sola, alla prima apertura. */
export const ADDIO_MESTOLO = 'Il Mestolo non c’è più. Le cose si uniscono nel pannello Unisci, e presto anche portandole una sopra l’altra nel mondo.';

/** Gli avvisi del mondo, detti una volta sola. */
export const ANNUNCIO: Record<Annuncio, string> = {
  miscele: 'Da adesso anche le cose senza una ricetta si mescolano.',
};

/** Di che cosa è morto un omino, e che cosa si può fare perché non succeda ancora. La vecchiaia non si annuncia. */
export const LUTTO: Record<Causa, string> = {
  sete: 'Un omino è morto di sete: manca l’acqua vicino al paese.',
  fame: 'Un omino è morto di fame: vicino al paese non c’è da mangiare.',
  fuoco: 'Un omino è morto tra le fiamme: tieni il fuoco lontano dal paese.',
  veleno: 'Un omino ha toccato qualcosa che fa male, e non ce l’ha fatta.',
  annegato: 'Un omino è annegato: l’acqua gli è salita sopra la testa.',
  sepolto: 'Un omino è rimasto sepolto: gli è caduto addosso qualcosa.',
  vecchiaia: '',
};

/** Ogni quanto, al più, si annuncia un lutto (in millesimi di secondo): un paese in difficoltà non deve diventare una sirena. */
export const PAUSA_LUTTI = 20000;

/**
 * La frase con cui annunciare una morte, oppure niente se non c'è niente da dire o se un lutto è stato annunciato
 * da poco. `ora` e `ultimo` sono in millesimi di secondo: l'istante di adesso e quello dell'ultimo annuncio.
 */
export function annuncioDiLutto(causa: Causa, ora: number, ultimo: number): string {
  return ora - ultimo < PAUSA_LUTTI ? '' : LUTTO[causa];
}

/** La frase fissa, piccola, che resta sul mondo dove il browser non lascia salvare. */
export const NON_SALVATA = 'Qui la partita non resta salvata';

/** La riga del benvenuto dove il browser non lascia salvare. */
export const NON_SALVATA_BENVENUTO = 'Qui il browser non lascia salvare: puoi giocare lo stesso, ma quando chiudi la pagina il mondo ricomincia da capo.';

/** Le parole della finestra «Nuovo» e della sua seconda domanda. */
export const RICOMINCIA = {
  titolo: 'Ricominciare?',
  spiega: 'Puoi svuotare solo il mondo e tenere il Libro con tutte le scoperte, oppure ripartire dai quattro elementi.',
  svuota: 'Svuota il mondo',
  annulla: 'Annulla',
  daZero: 'Riparti da zero…',
  sicuro: 'Ripartire da zero?',
  tieni: 'No, tieni tutto',
  si: 'Sì, riparti da zero',
  svuotato: 'Il mondo è vuoto. Il Libro è rimasto.',
  ripartito: 'Sei ripartito dai quattro elementi.',
  ripensaci: 'Annulla',
} as const;

/** «1 scoperta», «2 scoperte»: un numero con la parola giusta. */
const conto = (n: number, una: string, tante: string): string => `${n} ${n === 1 ? una : tante}`;

/** La seconda domanda prima di ripartire da zero: dice quanto si perde. */
export function perderai(scoperte: number, miscele: number): string {
  if (scoperte <= 0 && miscele <= 0) return 'Il Libro ha solo i quattro elementi: non perdi niente. Il mondo torna di sola roccia.';
  const cosa = [scoperte > 0 ? conto(scoperte, 'scoperta', 'scoperte') : '', miscele > 0 ? conto(miscele, 'miscela', 'miscele') : ''].filter(Boolean).join(' e ');
  return `Perderai ${cosa}. Sicuro?`;
}

/** Il titolo piccolo sopra il nome, quando arriva un'era della storia o uno dei suoi grandi passi. */
export const ARRIVA = { era: 'Comincia una nuova era', passo: 'Un grande passo' } as const;
