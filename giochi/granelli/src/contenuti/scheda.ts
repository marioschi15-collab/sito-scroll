/**
 * Il formato di una scoperta scritta a mano: una scheda. Qui ci sono solo tipi, niente codice e niente import dal
 * motore: le schede sono dati, con le chiavi come testi. Chi le legge e le trasforma in numeri è `registro.ts`.
 */

/**
 * Come vive una scoperta nel mondo.
 * - `materia`: un materiale fatto di granelli (solo quelli che il motore conosce già: una scheda non può inventarne).
 * - `oggetto`: una cosa da tenere in mano o da appoggiare (l'utensile, il pane).
 * - `costruzione`: una figura che si posa a terra (o sull'acqua) e resta lì; il suo ingombro si ricava dalla figura.
 * - `creatura`: un animale che si muove da sé (`muove`).
 * - `mestiere`: portato su un omino, quell'omino lo fa.
 * - `idea`: un sapere (la scrittura): portata su un omino o una costruzione, resta lì.
 * - `luogo`: un posto del mondo (un lago, una città): non si porta, si scopre guardandolo o unendo.
 * - `fenomeno`: qualcosa che succede nel mondo e si scopre vedendolo (la pioggia, l'arcobaleno).
 * - `evento`: portato nel mondo accade lì per qualche secondo, con uno degli `Effetto` pronti.
 * - `era`: un'era o un grande passo della storia; arriva da sola insieme alla scoperta `arrivaCon`, e con `dopo`
 *   prende il suo posto nella fila delle ere.
 */
export type Tipo = 'materia' | 'oggetto' | 'costruzione' | 'creatura' | 'mestiere' | 'idea' | 'luogo' | 'fenomeno' | 'evento' | 'era';

/** Il tipo di una voce qualsiasi del Libro: quelli delle schede, più l'Omino, che vive con regole tutte sue. */
export type TipoVoce = Tipo | 'omino';

export type Genere = 'm' | 'f';
export type Numero = 's' | 'p';
/** L'articolo con cui la si nomina: «la Capanna», «lo Zolfo», «l'Utensile», «le Mura». */
export type Articolo = 'il' | 'lo' | 'la' | 'l' | 'i' | 'gli' | 'le';

/** Come si muove una creatura. */
export type Muove = 'cammina' | 'vola' | 'nuota' | 'sta';
/** Gli effetti pronti di un evento portato nel mondo. */
export type Effetto = 'pioggia' | 'neve' | 'vento' | 'lampi' | 'scossa' | 'luce';

/** Una coppia di chiavi: le due cose che, portate una sopra l'altra, fanno nascere la scheda. */
export type Coppia = readonly [string, string];

export interface Scheda {
  /** Unica e per sempre: le unioni la usano, e in `numeri.ts` ha il suo numero (che finisce nei salvataggi). */
  chiave: string;
  nome: string;
  genere: Genere;
  numero: Numero;
  articolo: Articolo;
  /** Il capitolo del Libro (vedi `famiglie.ts`). */
  famiglia: string;
  tipo: Tipo;
  /**
   * Le coppie da cui nasce. Per un `fenomeno` sono le sue vie nel mondo: Unisci non lo regala, e si scopre quando
   * chi gioca porta una delle due cose sull'altra dentro il mondo.
   */
  unioni: readonly Coppia[];
  /** Mostrato nel Libro finché la voce è ancora da scoprire. */
  indizio: string;
  /** Due righe che raccontano cos'è e cosa fa. Finisce con il punto. */
  descrizione: string;
  /** Una curiosità vera, per la pagina del Libro. */
  sapevi?: string;
  /** L'icona a quadretti, 12 righe di 12 lettere (le lettere sono i colori di `disegno/figure.ts`, il punto è vuoto). */
  icona?: readonly string[];
  /** La figura nel mondo, per costruzioni e creature: due quadretti per cella, ingombro = metà larghezza x metà altezza. */
  figura?: readonly string[];
  /**
   * Per le creature: la seconda posa della figura (le zampe avanti, le ali giù), grande come la prima. La creatura
   * alterna le due mentre si muove; senza, la figura fa un piccolo saltello.
   */
  altraPosa?: readonly string[];
  /** Per i mestieri: il piccolo segno (al più 7 righe da 6 quadretti) che l'omino porta sopra la testa. */
  segno?: readonly string[];
  /** Per le costruzioni: si posa solo sull'acqua e ne segue il pelo, come la barca. */
  aGalla?: true;
  muove?: Muove;
  evento?: Effetto;
  /** La chiave della scoperta con cui arriva da sola (per le ere): diventa una riga delle conseguenze. */
  arrivaCon?: string;
  /** Per le ere: la chiave dell'era che viene subito prima. */
  dopo?: string;
  /** Per luoghi e fenomeni: si scopre quando nel mondo ci sono almeno `quante` celle di quel materiale. */
  siVede?: { materiale: string; quante: number };
  /** Una voce che non serve a farne altre, apposta: non conta come vicolo cieco. */
  finale?: true;
}
