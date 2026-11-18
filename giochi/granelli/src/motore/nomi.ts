import type { Firmata } from './firmate.js';
import { doteDi } from './fusione.js';
import { GAS, LIQUIDO, POLVERE, type Sostanza } from './materiali.js';
import { type Carattere, dado, margine, tratti } from './miscele.js';
import { RADICI } from './radici.js';

type Genere = 'm' | 'f';
/** Una forma (il nome di quello che è), il suo genere, e il carattere a cui si addice di più, se ce n'è uno. */
type Forma = readonly [string, Genere, Carattere?];
type Aggettivo = readonly [string, string];

/** Come si può chiamare una miscela, a seconda di cos'è; le forme con un carattere si scelgono per chi lo ha. */
const FORME: Record<number, readonly Forma[]> = {
  [POLVERE]: [
    ['Polvere', 'f'], ['Graniglia', 'f'], ['Rena', 'f'], ['Ghiaia', 'f'], ['Tritume', 'm'], ['Pietrisco', 'm'], ['Gesso', 'm'], ['Talco', 'm'],
    ['Farina', 'f', 'nutre'], ['Crusca', 'f', 'nutre'], ['Brina', 'f', 'freddo'], ['Grandine', 'f', 'freddo'], ['Lapillo', 'm', 'caldo'],
    ['Scaglia', 'f', 'luce'], ['Pagliuzza', 'f', 'luce'], ['Esca', 'f', 'brucia'], ['Segatura', 'f', 'brucia'], ['Polverina', 'f', 'esplode'],
    ['Pulviscolo', 'm', 'vola'], ['Piumino', 'm', 'vola'], ['Pasta', 'f', 'appiccica'], ['Poltiglia', 'f', 'appiccica'],
    ['Fuliggine', 'f', 'veleno'], ['Calce', 'f', 'corrode'], ['Sementa', 'f', 'fertile'], ['Spora', 'f', 'vivo'], ['Polline', 'm', 'fiorisce'],
    ['Cemento', 'm', 'indurisce'],
  ],
  [LIQUIDO]: [
    ['Melma', 'f'], ['Schiuma', 'f'], ['Siero', 'm'], ['Acquetta', 'f'], ['Infuso', 'm'], ['Brodaglia', 'f'],
    ['Sciroppo', 'm', 'nutre'], ['Nettare', 'm', 'nutre'], ['Brodo', 'm', 'nutre'], ['Succo', 'm', 'nutre'], ['Pozione', 'f', 'veleno'],
    ['Intruglio', 'm', 'veleno'], ['Acquaforte', 'f', 'corrode'], ['Colata', 'f', 'caldo'], ['Rugiada', 'f', 'freddo'], ['Elisir', 'm', 'luce'],
    ['Tintura', 'f', 'tinge'], ['Inchiostro', 'm', 'tinge'], ['Colla', 'f', 'appiccica'], ['Resina', 'f', 'appiccica'], ['Balsamo', 'm', 'fertile'],
    ['Linfa', 'f', 'vivo'], ['Gelatina', 'f', 'vivo'], ['Bolla', 'f', 'vola'], ['Essenza', 'f', 'fiorisce'], ['Olio', 'm', 'brucia'],
    ['Stucco', 'm', 'indurisce'],
  ],
  [GAS]: [
    ['Nebbia', 'f'], ['Foschia', 'f'], ['Bruma', 'f'], ['Esalazione', 'f'], ['Caligine', 'f'], ['Nube', 'f'], ['Alito', 'm'], ['Soffio', 'm'],
    ['Sbuffo', 'm'], ['Effluvio', 'm'], ['Miasma', 'm', 'veleno'], ['Vampata', 'f', 'caldo'], ['Brezza', 'f', 'freddo'], ['Aura', 'f', 'luce'],
    ['Etere', 'm', 'luce'], ['Nuvoletta', 'f', 'piove'], ['Profumo', 'm', 'nutre'], ['Fragranza', 'f', 'fiorisce'], ['Grisù', 'm', 'esplode'],
    ['Fumana', 'f', 'corrode'], ['Vampa', 'f', 'brucia'],
  ],
  0: [
    ['Roccia', 'f'], ['Crosta', 'f'], ['Scoria', 'f'], ['Selce', 'f'], ['Blocco', 'm'], ['Minerale', 'm'], ['Granito', 'm'], ['Marmo', 'm'],
    ['Gemma', 'f', 'luce'], ['Cristallo', 'm', 'luce'], ['Quarzo', 'm', 'luce'], ['Torrone', 'm', 'nutre'], ['Croccante', 'm', 'nutre'],
    ['Corallo', 'm', 'vivo'], ['Spugna', 'f', 'vivo'], ['Stalattite', 'f', 'freddo'], ['Tizzone', 'm', 'caldo'], ['Ceppo', 'm', 'brucia'],
    ['Radica', 'f', 'fertile'], ['Ceramica', 'f', 'indurisce'], ['Smalto', 'm', 'indurisce'], ['Bocciolo', 'm', 'fiorisce'],
    ['Spina', 'f', 'veleno'], ['Petardo', 'm', 'esplode'], ['Scheggia', 'f', 'corrode'],
  ],
};

/** Gli aggettivi (maschile, femminile) che raccontano un carattere. */
export const AGGETTIVI: Record<Carattere, readonly Aggettivo[]> = {
  caldo: [['ardente', 'ardente'], ['rovente', 'rovente'], ['bollente', 'bollente'], ['incandescente', 'incandescente'], ['infuocato', 'infuocata'], ['torrido', 'torrida'], ['cocente', 'cocente']],
  freddo: [['gelido', 'gelida'], ['glaciale', 'glaciale'], ['ghiacciato', 'ghiacciata'], ['brinato', 'brinata'], ['polare', 'polare'], ['algido', 'algida']],
  luce: [['lucente', 'lucente'], ['luminoso', 'luminosa'], ['splendente', 'splendente'], ['fosforescente', 'fosforescente'], ['radioso', 'radiosa'], ['brillante', 'brillante'], ['stellato', 'stellata']],
  brucia: [['infiammabile', 'infiammabile'], ['focoso', 'focosa'], ['resinoso', 'resinosa'], ['secco', 'secca'], ['stoppaccioso', 'stoppacciosa']],
  esplode: [['esplosivo', 'esplosiva'], ['tonante', 'tonante'], ['instabile', 'instabile'], ['scoppiettante', 'scoppiettante'], ['irrequieto', 'irrequieta']],
  fertile: [['fertile', 'fertile'], ['fecondo', 'feconda'], ['grasso', 'grassa'], ['rigoglioso', 'rigogliosa'], ['generoso', 'generosa']],
  vivo: [['vivo', 'viva'], ['strisciante', 'strisciante'], ['selvatico', 'selvatica'], ['rampicante', 'rampicante'], ['inquieto', 'inquieta']],
  veleno: [['velenoso', 'velenosa'], ['tossico', 'tossica'], ['amaro', 'amara'], ['funesto', 'funesta'], ['mefitico', 'mefitica']],
  nutre: [['dolce', 'dolce'], ['saporito', 'saporita'], ['nutriente', 'nutriente'], ['goloso', 'golosa'], ['mielato', 'mielata']],
  corrode: [['corrosivo', 'corrosiva'], ['mordente', 'mordente'], ['acido', 'acida'], ['vorace', 'vorace'], ['pungente', 'pungente']],
  vola: [['volante', 'volante'], ['leggero', 'leggera'], ['aereo', 'aerea'], ['sospeso', 'sospesa'], ['volatile', 'volatile']],
  appiccica: [['appiccicoso', 'appiccicosa'], ['colloso', 'collosa'], ['tenace', 'tenace'], ['vischioso', 'vischiosa']],
  fiorisce: [['fiorito', 'fiorita'], ['primaverile', 'primaverile'], ['profumato', 'profumata'], ['in fiore', 'in fiore']],
  tinge: [['colorante', 'colorante'], ['cangiante', 'cangiante'], ['variopinto', 'variopinta']],
  indurisce: [['pietroso', 'pietrosa'], ['duro', 'dura'], ['sodo', 'soda'], ['roccioso', 'rocciosa']],
  piove: [['piovoso', 'piovosa'], ['umido', 'umida'], ['uggioso', 'uggiosa'], ['temporalesco', 'temporalesca']],
};

export const COLORI: readonly Aggettivo[] = [
  ['rosso', 'rossa'], ['arancione', 'arancione'], ['giallo', 'gialla'], ['verde', 'verde'], ['turchese', 'turchese'], ['azzurro', 'azzurra'],
  ['blu', 'blu'], ['viola', 'viola'], ['rosa', 'rosa'], ['bianco', 'bianca'], ['nero', 'nera'], ['grigio', 'grigia'], ['bruno', 'bruna'], ['dorato', 'dorata'],
];
const NUMERI = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function aggettivoColore(s: Sostanza): Aggettivo {
  const [r, g, b] = s.colore;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx - mn < 28) return mx > 190 ? COLORI[9] : mx < 80 ? COLORI[10] : COLORI[11];
  const d = mx - mn;
  const h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  if (h < 0.11 && mx < 150) return COLORI[12];
  if (h > 0.1 && h < 0.17 && mx > 200) return COLORI[13];
  return COLORI[Math.min(8, Math.floor(((h + 0.04) % 1) * 9))];
}

/** Le forme adatte a uno stato (un solido ha quelle della roccia). */
export function formeDi(stato: number): readonly Forma[] {
  return FORME[stato] ?? FORME[0];
}

/**
 * Il carattere che dà l'aggettivo al nome: il più forte tra quelli che la radice non porta con sé, cioè quello
 * venuto dall'altro genitore («Resina di muschio gelida»: il muschio non gela, la neve sì). null se la radice li
 * porta tutti: allora l'aggettivo è il colore, perché ripetere il carattere della radice non direbbe niente.
 */
export function carattereDelNome(s: Sostanza): Carattere | null {
  const t = tratti(s).sort((x, y) => margine(s, y) - margine(s, x));
  const dellaRadice = doteDi(s.radice);
  return t.find((c) => !dellaRadice.includes(c)) ?? null;
}

/**
 * Il nome di una miscela: la forma (che cos'è, scelta se si può tra quelle che si addicono al suo carattere), la
 * radice del genitore che conta di più e un aggettivo per il carattere venuto dall'altro: «Resina di muschio
 * gelida». Una miscela d'autore ha il suo nome scritto a mano. Se il nome è già preso si aggiunge il colore, e se
 * serve un numero.
 */
export function nomeMiscela(s: Sostanza, id: number, occupato: (nome: string) => boolean, firmata?: Firmata): string {
  const r = dado(id ^ 0x51ed);
  let semplice: string;
  let g = 1;
  let colorato = true;
  if (firmata) semplice = firmata.nome;
  else {
    const spicca = carattereDelNome(s);
    const forme = formeDi(s.stato);
    const adatte = forme.filter(([, , c]) => c !== undefined && c !== spicca && tratti(s).includes(c));
    const generiche = forme.filter(([, , c]) => c === undefined);
    const [forma, genere] = adatte.length > 0 && r() < 0.7 ? adatte[(r() * adatte.length) | 0] : generiche[(r() * generiche.length) | 0];
    g = genere === 'm' ? 0 : 1;
    const radici = RADICI[s.radice] ?? ['misteriosa'];
    // Quasi sempre la prima radice, il nome stesso del materiale; mai una radice che ripete la forma («Gemma di gemma»).
    let radice = radici[r() < 0.75 ? 0 : radici.length - 1];
    if (radice.endsWith(` ${forma.toLowerCase()}`)) radice = radici.find((x) => !x.endsWith(` ${forma.toLowerCase()}`)) ?? radice;
    const aggettivi = spicca ? AGGETTIVI[spicca] : null;
    const aggettivo = aggettivi ? aggettivi[(r() * aggettivi.length) | 0][g] : aggettivoColore(s)[g];
    colorato = aggettivi !== null;
    semplice = `${forma} ${radice} ${aggettivo}`;
  }
  if (!occupato(semplice)) return semplice;
  const conColore = colorato ? `${semplice} ${aggettivoColore(s)[g]}` : semplice;
  if (!occupato(conColore)) return conColore;
  for (const n of NUMERI) if (!occupato(`${conColore} ${n}`)) return `${conColore} ${n}`;
  return `${conColore} ${id % 1000}`;
}

const COSA: Record<number, string> = {
  [POLVERE]: 'Polvere',
  [LIQUIDO]: 'Liquido',
  [GAS]: 'Gas',
  0: 'Solido',
};

/** Le parole brevi dei caratteri: le stesse nel Libro e nelle prove, e ognuna è un effetto vero nel mondo. */
export const PAROLE: Record<Carattere, string> = {
  caldo: 'Scotta',
  freddo: 'Gela',
  luce: 'Fa luce',
  brucia: 'Brucia',
  esplode: 'Esplode',
  fertile: 'Fertile',
  vivo: 'Si allarga',
  veleno: 'Velenosa',
  nutre: 'Si mangia',
  corrode: 'Corrode',
  vola: 'Vola',
  appiccica: 'Si attacca',
  fiorisce: 'Fa fiorire',
  tinge: 'Tinge l’acqua',
  indurisce: 'Fa pietra',
  piove: 'Fa piovere',
};

/** Le parole brevi che riassumono una sostanza nel libro: cos'è e che carattere ha. */
export function etichette(s: Sostanza): string[] {
  return [COSA[s.stato] ?? COSA[0], ...tratti(s).map((t) => PAROLE[t])];
}

const RACCONTI: Record<Carattere, string> = {
  caldo: 'Scotta: accende quello che può bruciare e fa evaporare l’acqua.',
  freddo: 'È gelida: ghiaccia l’acqua che tocca e spegne il fuoco.',
  luce: 'Al buio fa luce da sola.',
  brucia: 'Prende fuoco facilmente.',
  esplode: 'Attenzione: col fuoco esplode.',
  fertile: 'Dove si posa, le piante spuntano volentieri.',
  vivo: 'Sembra viva: si allarga piano piano su quello che ha intorno.',
  veleno: 'È velenosa: le piante che la toccano muoiono, e gli omini le stanno alla larga.',
  nutre: 'Gli omini la mangiano volentieri.',
  corrode: 'Corrode quello che tocca, finché non si consuma.',
  vola: 'È più leggera dell’aria: sale verso il cielo, e lassù resta sospesa.',
  appiccica: 'È appiccicosa: si attacca alle pareti e ai soffitti, e lì resta.',
  fiorisce: 'Fa sbocciare i fiori sull’erba che tocca.',
  tinge: 'Tinge l’acqua che tocca: un po’ alla volta, la pozza prende il suo colore.',
  indurisce: 'Fa presa: la terra, la sabbia e il fango che tocca diventano pietra, e lei con loro.',
  piove: 'Salendo si fa nuvola, e la nuvola porta pioggia.',
};

/**
 * Due o tre frasi che raccontano come si comporta una miscela, scritte a partire dal suo carattere. Una miscela
 * d'autore ha il suo racconto scritto a mano (i caratteri li dicono già le etichette).
 */
export function descriviMiscela(s: Sostanza, firmata?: Firmata): string {
  if (firmata) return firmata.racconto;
  const frasi: string[] = [];
  if (s.stato === POLVERE) frasi.push(s.scorre > 0.6 ? 'Una polvere fine, che scivola come sabbia.' : s.scorre < 0.2 ? 'Una polvere che resta dove la metti, quasi un impasto.' : 'Una polvere che si ammucchia in piccoli cumuli.');
  else if (s.stato === LIQUIDO) frasi.push(s.scorre > 0.6 ? 'Un liquido svelto, che cerca subito il punto più basso.' : 'Un liquido denso, che scorre senza fretta.');
  else if (s.stato === GAS) frasi.push('Un gas: sale, si sparpaglia e dopo un po’ si dissolve.');
  else frasi.push('Un solido: resta dove lo metti, anche a mezz’aria.');
  const forti = tratti(s);
  for (const t of forti) frasi.push(RACCONTI[t]);
  // Galleggia solo ciò che può muoversi e non vola già via: un solido resta dov'è, leggero o no.
  if ((s.stato === POLVERE || s.stato === LIQUIDO) && s.peso < 0.42 && !forti.includes('vola')) frasi.push('È leggera: galleggia sull’acqua.');
  return frasi.join(' ');
}
