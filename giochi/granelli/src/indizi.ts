import { voce } from './contenuti/registro.js';
import { type Coppia, chiaveDi, daNominare, quadro, scegliCoppia, voceVicina } from './motore/suggerimenti.js';

/**
 * Le parole degli indizi e chi decide quando darli: il tasto Indizio (al più uno al minuto), l'indizio che arriva da
 * solo dopo tre «niente» di fila, e le righe gentili con cui si dice un «niente». Che cosa suggerire lo decide
 * sempre motore/suggerimenti.ts: qui si sceglie solo il momento e si scrivono le frasi. Niente pagina: si prova da sé.
 */

/** Ogni quanto, al più, il tasto Indizio dà un indizio nuovo (in millesimi di secondo): prima ripete quello di prima. */
export const ATTESA_INDIZIO = 60_000;
/** Dopo quanti «niente» di fila arriva un indizio da solo. */
export const NIENTE_PER_UN_INDIZIO = 3;

/** Un indizio da mostrare. `coppia` e `livello` ci sono quando parla di una coppia da provare; `voce` quando parla del mondo. */
export interface Indizio {
  testo: string;
  coppia?: Coppia;
  livello?: 1 | 2;
  /** La cosa della coppia che l'indizio nomina (l'altra resta da indovinare). */
  nomina?: number;
  voce?: number;
}

/**
 * Le righe con cui si dice che una coppia non ha dato niente: gentili e diverse, perché un «niente» non è mai muto.
 * Vengono dopo il nome delle due cose («Fuoco e Pane: …»), quindi cominciano in minuscolo.
 */
export const NIENTE: readonly string[] = [
  'si guardano, ma non nasce niente.',
  'non hanno niente da dirsi.',
  'nessuna scintilla tra queste due.',
  'restano come sono: prova a cambiarne una.',
  'niente di nuovo, ma ogni prova conta.',
  'per queste due il Libro non ha una pagina.',
];

/** La riga di un «niente»: `n` è quanti «niente» ci sono stati finora, così due di fila non dicono mai la stessa cosa. */
export function rigaDelNiente(n: number): string {
  return NIENTE[((n % NIENTE.length) + NIENTE.length) % NIENTE.length];
}

/** Le frasi fisse degli indizi. */
export const INDIZIO = {
  tasto: 'Indizio',
  tutto: 'Hai scoperto tutto quello che il Libro racconta: ora restano le miscele, che non finiscono mai.',
  attendi: (secondi: number): string => `Un altro indizio tra ${secondi} ${secondi === 1 ? 'secondo' : 'secondi'}.`,
} as const;

/** Come si dice un materiale senza nominarlo, secondo il suo capitolo. */
const MATERIA_DI: Record<string, string> = {
  elementi: 'uno dei quattro elementi',
  terra: 'qualcosa che viene dalla terra',
  cielo: 'qualcosa che sta tra l’acqua e il cielo',
  fuoco: 'qualcosa che nasce dal fuoco',
  vita: 'qualcosa di vivo',
};

/** L'altra cosa della coppia, detta senza il suo nome: fa intuire che cosa cercare. */
export function senzaNome(id: number): string {
  const v = voce(id);
  if (!v) return 'qualcos’altro';
  switch (v.tipo) {
    case 'omino':
      return 'qualcuno che abita il mondo';
    case 'creatura':
      return 'un animale';
    case 'mestiere':
      return 'qualcuno che fa un mestiere';
    case 'costruzione':
      return 'una costruzione';
    case 'oggetto':
      return 'un oggetto';
    case 'idea':
      return 'un’idea';
    case 'evento':
      return 'qualcosa che arriva dal cielo';
    case 'fenomeno':
    case 'luogo':
      return 'qualcosa che si vede nel mondo';
    case 'era':
      return 'un grande passo della storia';
    default:
      return MATERIA_DI[v.famiglia] ?? 'un materiale';
  }
}

/** «il fuoco», «l’argilla», «le mura»: il nome con il suo articolo, tutto minuscolo come in mezzo a una frase. */
export function conArticolo(id: number): string {
  const v = voce(id);
  if (!v) return 'questa cosa';
  const nome = v.nome.toLowerCase();
  return v.articolo === 'l' ? `l’${nome}` : `${v.articolo} ${nome}`;
}

const maiuscola = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const plurale = (id: number): boolean => voce(id)?.numero === 'p';
/** «unirlo», «unirla», «unirli», «unirle». */
function unir(id: number): string {
  const v = voce(id);
  const m = v?.genere !== 'f';
  return plurale(id) ? (m ? 'unirli' : 'unirle') : m ? 'unirlo' : 'unirla';
}
/** La prima lettera del nome, per l'indizio più chiaro. */
const iniziale = (id: number): string => (voce(id)?.nome ?? '?').charAt(0).toUpperCase();

/**
 * Il testo dell'indizio su una coppia: al primo livello nomina una delle due cose e fa intuire l'altra, al secondo
 * dice anche con che lettera comincia l'altra. Mai tutte e due per nome: la soluzione intera resta a chi gioca.
 */
export function testoDellaCoppia(c: Coppia, nomina: number, livello: 1 | 2): string {
  const altra = nomina === c.a ? c.b : c.a;
  const chi = conArticolo(nomina);
  const cosa = senzaNome(altra);
  const lettera = `L’altra cosa comincia per «${iniziale(altra)}».`;
  if (c.nelMondo) {
    if (livello === 1) return `Guarda nel mondo: ${chi} vicino a ${cosa} ${plurale(nomina) ? 'fanno' : 'fa'} succedere qualcosa.`;
    return `Ci sei quasi: nel mondo, ${chi} vicino a ${cosa}. ${lettera}`;
  }
  if (livello === 1) return `${maiuscola(chi)} ${plurale(nomina) ? 'hanno' : 'ha'} ancora qualcosa da dare: prova a ${unir(nomina)} con ${cosa}.`;
  return `Ci sei quasi: ${chi} insieme a ${cosa}. ${lettera}`;
}

/** L'indizio quando con le cose possedute non c'è niente di scritto da provare: quello della voce più vicina nel Libro. */
function indizioDelMondo(visti: ReadonlySet<number>): Indizio {
  const id = voceVicina(visti);
  const v = id >= 0 ? voce(id) : undefined;
  if (!v) return { testo: INDIZIO.tutto };
  return { testo: `Prova nel mondo: «${v.indizio}»`, voce: id };
}

/**
 * Chi dà gli indizi durante una partita. Ricorda di quale coppia ha parlato e a che livello (così il secondo indizio
 * sulla stessa coppia è più chiaro, e il terzo passa a un'altra), quando ha dato l'ultimo al tasto, e quanti «niente»
 * ci sono stati di fila. Non salva niente: dopo una ricarica si ricomincia dal primo livello.
 */
export class Suggeritore {
  private corrente: { chiave: string; livello: 1 | 2; nomina: number } | null = null;
  private ultimo: Indizio | null = null;
  private quando = -Infinity;
  private diFila = 0;
  /** Le cose provate nei «niente» di fila, la più recente per prima: l'indizio che arriva da solo parla di una di loro. */
  private provate: number[] = [];
  /** Quanti «niente» ci sono stati in tutto: sceglie la riga gentile, che così cambia ogni volta. */
  nienteInTutto = 0;

  /**
   * Il tasto Indizio, all'istante `ora` (millesimi). Dà un indizio nuovo al più una volta ogni `ATTESA_INDIZIO`;
   * prima ripete quello di prima e dice fra quanti secondi arriva il prossimo (`attendi`, 0 se l'indizio è nuovo).
   * Se l'indizio di prima è già stato seguito (la cosa è nata, o la voce del mondo si è vista), uno nuovo arriva subito.
   */
  chiedi(visti: ReadonlySet<number>, ora: number): { indizio: Indizio; attendi: number } {
    // Seguito vuol dire: la cosa della coppia è nata, oppure la voce del mondo suggerita si è vista.
    const u = this.ultimo;
    const servito = u !== null && ((u.coppia !== undefined && visti.has(u.coppia.nato)) || (u.voce !== undefined && visti.has(u.voce)));
    if (this.ultimo && !servito && ora - this.quando < ATTESA_INDIZIO) {
      return { indizio: this.ultimo, attendi: Math.max(1, Math.ceil((ATTESA_INDIZIO - (ora - this.quando)) / 1000)) };
    }
    const indizio = this.prossimo(visti, []);
    this.quando = ora;
    return { indizio, attendi: 0 };
  }

  /**
   * Dopo un tentativo di unire `a` e `b`, all'istante `ora`: se `niente`, si conta (e la riga gentile cambia); al terzo
   * «niente» di fila arriva un indizio, su una delle cose appena provate se si può. Conta anche per il tasto: per un
   * minuto, ritoccandolo, si rilegge questo. Qualsiasi esito che non è «niente» azzera il conto.
   */
  dopo(a: number, b: number, niente: boolean, visti: ReadonlySet<number>, ora: number): Indizio | null {
    if (!niente) {
      this.diFila = 0;
      this.provate = [];
      return null;
    }
    this.nienteInTutto++;
    this.diFila++;
    this.provate = [a, b, ...this.provate.filter((id) => id !== a && id !== b)];
    if (this.diFila < NIENTE_PER_UN_INDIZIO) return null;
    const indizio = this.prossimo(visti, this.provate);
    this.quando = ora;
    this.diFila = 0;
    this.provate = [];
    return indizio;
  }

  private prossimo(visti: ReadonlySet<number>, preferite: readonly number[]): Indizio {
    const q = quadro(visti);
    const corrente = this.corrente;
    const attuale = corrente ? (q.daProvare.find((c) => chiaveDi(c) === corrente.chiave) ?? null) : null;
    // La coppia di prima, se è ancora da scoprire e c'entra con quello che si sta provando, sale di livello.
    const continua = attuale !== null && (preferite.length === 0 || preferite.includes(attuale.a) || preferite.includes(attuale.b));
    let coppia: Coppia | null;
    let livello: 1 | 2 = 1;
    if (continua && corrente!.livello === 1) {
      coppia = attuale;
      livello = 2;
    } else {
      // Detto tutto quello che si poteva su una coppia, si passa a un'altra (se non ce n'è un'altra, resta lei).
      coppia = scegliCoppia(q, preferite, continua ? attuale : undefined);
      if (coppia !== null && coppia === attuale) livello = 2;
    }
    let indizio: Indizio;
    if (coppia === null) {
      this.corrente = null;
      indizio = indizioDelMondo(visti);
    } else {
      const nomina = coppia === attuale ? corrente!.nomina : daNominare(q, coppia, preferite, corrente?.nomina);
      this.corrente = { chiave: chiaveDi(coppia), livello, nomina };
      indizio = { testo: testoDellaCoppia(coppia, nomina, livello), coppia, livello, nomina };
    }
    this.ultimo = indizio;
    return indizio;
  }
}
